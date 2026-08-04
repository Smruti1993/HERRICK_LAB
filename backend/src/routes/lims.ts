import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to write audit trail entries
async function logAuditTrail(
  labOrderId: string,
  fromStatus: string | null,
  toStatus: string,
  actionTaken: string,
  performedBy: string,
  comments?: string
) {
  let { error } = await supabase.from('lims_audit_trail').insert({
    lab_order_id: labOrderId,
    from_status: fromStatus,
    to_status: toStatus,
    action_taken: actionTaken,
    performed_by: performedBy,
    comments: comments || null
  });
  
  if (error && error.code === '23503') {
    const { error: retryErr } = await supabase.from('lims_audit_trail').insert({
      lab_order_id: labOrderId,
      from_status: fromStatus,
      to_status: toStatus,
      action_taken: actionTaken,
      performed_by: null,
      comments: comments || null
    });
    error = retryErr;
  }

  if (error) {
    console.error('Audit trail logging failed:', error);
  }
}

// 1. Get patient age & gender helper
async function getPatientContext(labOrderId: string) {
  // Fetch patient details through lab order -> service_order -> patient
  const { data: orderData, error: orderError } = await supabase
    .from('lims_lab_orders')
    .select(`
      id,
      service_order:service_order_id (
        id,
        appointment:appointment_id (
          id,
          patient:patient_id (
            id,
            first_name,
            last_name,
            gender,
            dob
          )
        )
      )
    `)
    .eq('id', labOrderId)
    .single();

  if (orderError || !orderData) {
    return { gender: 'All', ageYears: 30 }; // Fallback defaults
  }

  const patient = (orderData as any).service_order?.appointment?.patient;
  if (!patient) return { gender: 'All', ageYears: 30 };

  const gender = patient.gender || 'All';
  let ageYears = 30;
  if (patient.dob) {
    const dob = new Date(patient.dob);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    ageYears = Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  return { gender, ageYears };
}

// 2. Fetch LIMS active lab orders queue
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('lims_lab_orders')
      .select(`
        *,
        service_order:service_order_id (
          id,
          service_name,
          cpt_code,
          priority,
          appointment:appointment_id (
            id,
            patient:patient_id (
              id,
              first_name,
              last_name,
              gender,
              dob
            )
          )
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Format UI-friendly records
    const formatted = (data || []).map((o: any) => {
      const patient = o.service_order?.appointment?.patient || {};
      let ageText = 'N/A';
      if (patient.dob) {
        const dob = new Date(patient.dob);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        ageText = `${age} Y`;
      }

      return {
        id: o.id,
        serviceOrderId: o.service_order_id,
        barcodeNo: o.barcode_no,
        priority: o.priority || o.service_order?.priority || 'Routine',
        status: o.status,
        orderedAt: o.ordered_at,
        collectedAt: o.collected_at,
        collectedBy: o.collected_by,
        acceptedAt: o.accepted_at,
        acceptedBy: o.accepted_by,
        resultCapturedAt: o.result_captured_at,
        resultCapturedBy: o.result_captured_by,
        certifiedAt: o.certified_at,
        certifiedBy: o.certified_by,
        patientName: patient.first_name ? `${patient.first_name} ${patient.last_name || ''}`.trim() : 'Walk-in Patient',
        patientAge: ageText,
        patientGender: patient.gender || 'Unknown',
        serviceName: o.service_order?.service_name || 'Lab Service'
      };
    });

    res.json(formatted);
  } catch (err: any) {
    console.error('Fetch LIMS orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Status Transition Endpoint
router.post('/transition', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { labOrderId, targetStatus, userId, comments, overrideReason } = req.body;

    if (!labOrderId || !targetStatus || !userId) {
      res.status(400).json({ error: 'Missing labOrderId, targetStatus or userId' });
      return;
    }

    // --- OVERRIDE REASON VALIDATION ---
    // If an override reason is provided, enforce minimum length (5 non-whitespace chars).
    // This prevents empty/whitespace/placeholder reasons from bypassing the mandatory stock check.
    if (overrideReason !== undefined && overrideReason !== null) {
      const trimmed = String(overrideReason).trim();
      if (trimmed.length < 5) {
        res.status(400).json({ error: 'An override reason of at least 5 characters is required to certify without sufficient stock.' });
        return;
      }
    }

    // Get current order status
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('lims_lab_orders')
      .select('status')
      .eq('id', labOrderId)
      .single();

    if (fetchErr || !currentOrder) {
      res.status(404).json({ error: 'Lab order not found' });
      return;
    }

    const fromStatus = currentOrder.status;

    // --- REAGENT DEDUCTION & REVERSAL LOGIC ---
    if (targetStatus === 'Certified') {
      // p_override is ONLY true when a dedicated, validated overrideReason is present.
      // The old 'comments' field is intentionally NOT used to trigger overrides.
      const validatedOverrideReason = overrideReason ? String(overrideReason).trim() : null;
      const isOverride = validatedOverrideReason !== null && validatedOverrideReason.length >= 5;

      const { data: deductResult, error: deductError } = await supabase.rpc('process_reagent_deduction', {
        p_lab_order_id: labOrderId,
        p_performed_by: userId,
        p_override: isOverride,
        p_override_reason: isOverride ? validatedOverrideReason : null
      });
      
      if (deductError) {
        console.error('Reagent deduction failed:', deductError);
        res.status(400).json({ 
          error: deductError.message, 
          code: 'SHORTFALL', 
          details: deductError.details 
        });
        return;
      }
    }

    if (fromStatus === 'Certified' && targetStatus !== 'Certified') {
      const { data: reverseResult, error: reverseError } = await supabase.rpc('process_reagent_reversal', {
        p_lab_order_id: labOrderId,
        p_performed_by: userId
      });
      
      if (reverseError) {
        console.error('Reagent reversal failed:', reverseError);
        res.status(400).json({ error: `Reagent reversal failed: ${reverseError.message}` });
        return;
      }
    }

    // Prep update fields depending on transition target
    const updateFields: any = { status: targetStatus };
    const now = new Date().toISOString();

    if (targetStatus === 'Collected') {
      updateFields.collected_at = now;
      updateFields.collected_by = userId;
    } else if (targetStatus === 'Accepted') {
      updateFields.accepted_at = now;
      updateFields.accepted_by = userId;
    } else if (targetStatus === 'In Process') {
      // Transitioning into execution
    } else if (targetStatus === 'Result') {
      updateFields.result_captured_at = now;
      updateFields.result_captured_by = userId;
    } else if (targetStatus === 'Certified') {
      updateFields.certified_at = now;
      updateFields.certified_by = userId;
    }

    // Update order
    let { error: updateErr } = await supabase
      .from('lims_lab_orders')
      .update(updateFields)
      .eq('id', labOrderId);

    if (updateErr && updateErr.code === '23503') {
      const cleanFields = { ...updateFields };
      delete cleanFields.collected_by;
      delete cleanFields.accepted_by;
      delete cleanFields.result_captured_by;
      delete cleanFields.certified_by;
      
      const { error: retryErr } = await supabase
        .from('lims_lab_orders')
        .update(cleanFields)
        .eq('id', labOrderId);
      updateErr = retryErr;
    }

    if (updateErr) throw updateErr;

    // Audit Log Row — use comments for non-certify transitions; for certify use overrideReason if provided
    const auditNote = targetStatus === 'Certified' && overrideReason
      ? `Certified with supervisor override: ${String(overrideReason).trim()}`
      : comments;

    await logAuditTrail(
      labOrderId,
      fromStatus,
      targetStatus,
      `Transition to ${targetStatus}`,
      userId,
      auditNote
    );

    res.json({ success: true, fromStatus, toStatus: targetStatus });
  } catch (err: any) {
    console.error('Transition error:', err);
    res.status(500).json({ error: err.message });
  }
});


// 4. Save test results & Auto-flagging ranges engine
router.post('/results/save', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      labOrderId,
      userId,
      results,
      instrumentRunId,
      rackPosition,
      equipmentId,
      testNotes,
      clinicalComments,
      resultStatus,
      qcPassed,
      reagentInDate,
      calibrationVerified,
      maintenanceOk,
      duplicateRunRequired,
      controlLotNo,
      reagentLotNo,
      calibrationDate,
      expiryDate,
      testMethod,
      analyzerChannel
    } = req.body;

    // results is array of { parameterId: string, value: string }
    if (!labOrderId || !userId || !Array.isArray(results)) {
      res.status(400).json({ error: 'Missing labOrderId, userId, or results list' });
      return;
    }

    // Fetch patient age & gender
    const { gender, ageYears } = await getPatientContext(labOrderId);

    // Save results one-by-one with range calculations
    for (const r of results) {
      // 1. Fetch matching reference ranges
      const { data: rangeData } = await supabase
        .from('lims_reference_ranges')
        .select('*')
        .eq('parameter_id', r.parameterId)
        .eq('status', 'Active');

      let flag: 'Normal' | 'High' | 'Low' | 'Critical' = 'Normal';
      
      if (rangeData && rangeData.length > 0) {
        // Find best match for gender and age range
        const matchingRange = rangeData.find((rg: any) => {
          const genderMatch = rg.gender === 'All' || rg.gender === gender;
          const ageMatch = ageYears >= Number(rg.age_min) && ageYears <= Number(rg.age_max);
          return genderMatch && ageMatch;
        }) || rangeData[0]; // fallback to first range if no absolute match

        const valNum = Number(r.value);
        if (!isNaN(valNum)) {
          // Verify Critical ranges first
          if (matchingRange.critical_min && valNum < Number(matchingRange.critical_min)) {
            flag = 'Critical';
          } else if (matchingRange.critical_max && valNum > Number(matchingRange.critical_max)) {
            flag = 'Critical';
          } else if (matchingRange.ref_min && valNum < Number(matchingRange.ref_min)) {
            flag = 'Low';
          } else if (matchingRange.ref_max && valNum > Number(matchingRange.ref_max)) {
            flag = 'High';
          }
        }
      }

      // 2. Upsert results values
      const { data: existing } = await supabase
        .from('lims_results')
        .select('id')
        .eq('lab_order_id', labOrderId)
        .eq('parameter_id', r.parameterId)
        .single();

      const resultData = {
        value: r.value,
        flag,
        captured_by: userId,
        captured_at: new Date().toISOString(),
        equipment_id: equipmentId || null
      };

      let { error: saveErr } = existing
        ? await supabase.from('lims_results').update(resultData).eq('id', existing.id)
        : await supabase.from('lims_results').insert({
            id: crypto.randomUUID(),
            lab_order_id: labOrderId,
            parameter_id: r.parameterId,
            ...resultData
          });

      if (saveErr && saveErr.code === '23503') {
        const cleanResultData = { ...resultData, captured_by: null };
        if (existing) {
          await supabase.from('lims_results').update(cleanResultData).eq('id', existing.id);
        } else {
          await supabase.from('lims_results').insert({
            id: crypto.randomUUID(),
            lab_order_id: labOrderId,
            parameter_id: r.parameterId,
            ...cleanResultData
          });
        }
      }
    }

    // Auto transition status to 'Result'
    const now = new Date().toISOString();
    const updateFields = {
      status: 'Result',
      result_captured_at: now,
      result_captured_by: userId,
      instrument_run_id: instrumentRunId || null,
      rack_position: rackPosition || null,
      test_notes: testNotes || null,
      clinical_comments: clinicalComments || null,
      result_status: resultStatus || 'Preliminary',
      qc_passed: qcPassed || false,
      reagent_in_date: reagentInDate || false,
      calibration_verified: calibrationVerified || false,
      maintenance_ok: maintenanceOk || false,
      duplicate_run_required: duplicateRunRequired || false,
      control_lot_no: controlLotNo || null,
      reagent_lot_no: reagentLotNo || null,
      calibration_date: calibrationDate || null,
      expiry_date: expiryDate || null,
      test_method: testMethod || null,
      analyzer_channel: analyzerChannel || null
    };

    let { error: orderErr } = await supabase
      .from('lims_lab_orders')
      .update(updateFields)
      .eq('id', labOrderId);

    if (orderErr && orderErr.code === '23503') {
      const cleanFields = { ...updateFields, result_captured_by: null };
      await supabase
        .from('lims_lab_orders')
        .update(cleanFields)
        .eq('id', labOrderId);
    }

    await logAuditTrail(
      labOrderId,
      'In Process',
      'Result',
      'Captured Results',
      userId,
      'Results entered manually/simulated with quality check configurations'
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Save results error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Amend Verified Results
router.post('/results/amend', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { labOrderId, parameterId, newValue, userId, reason } = req.body;

    if (!labOrderId || !parameterId || !newValue || !userId || !reason) {
      res.status(400).json({ error: 'Missing labOrderId, parameterId, newValue, userId or amendment reason' });
      return;
    }

    // Update result value & mark amended
    const { error: updateErr } = await supabase
      .from('lims_results')
      .update({
        value: newValue,
        is_amended: true,
        amended_reason: reason,
        captured_by: userId,
        captured_at: new Date().toISOString()
      })
      .eq('lab_order_id', labOrderId)
      .eq('parameter_id', parameterId);

    if (updateErr) throw updateErr;

    // Log the amendment trigger to Audit Trail
    await logAuditTrail(
      labOrderId,
      'Certified',
      'Certified',
      'Result Amendment',
      userId,
      `Amended parameter: ${parameterId}. Reason: ${reason}`
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Amend results error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Single Order detailed context
router.get('/orders/:orderId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order with deep relationships
    const { data: order, error: orderErr } = await supabase
      .from('lims_lab_orders')
      .select(`
        *,
        service_order:service_order_id (
          id,
          service_name,
          cpt_code,
          priority,
          service_id,
          appointment:appointment_id (
            id,
            patient:patient_id (
              id,
              first_name,
              last_name,
              gender,
              dob
            )
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      res.status(404).json({ error: 'Lab order not found' });
      return;
    }

    // Fetch parameters
    const serviceId = (order as any).service_order?.service_id;
    let parameters: any[] = [];
    if (serviceId) {
      const { data: paramsData } = await supabase
        .from('lims_service_parameters')
        .select(`
          *,
          lims_reference_ranges (
            *
          )
        `)
        .eq('service_id', serviceId)
        .eq('status', 'Active')
        .order('sort_order');
      parameters = paramsData || [];
    }

    // Fetch existing samples
    const { data: samples } = await supabase
      .from('lims_samples')
      .select(`
        *,
        specimen:specimen_id (
          id,
          name,
          code
        ),
        container:container_id (
          id,
          name,
          code
        )
      `)
      .eq('lab_order_id', orderId);

    // Fetch results
    const { data: results } = await supabase
      .from('lims_results')
      .select('*')
      .eq('lab_order_id', orderId);

    res.json({
      order,
      parameters,
      samples: samples || [],
      results: results || []
    });
  } catch (err: any) {
    console.error('Get single order detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Save Collection Details
router.post('/orders/collect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      labOrderId,
      labOrderIds,
      userId,
      collectorBadge,
      collectionRemarks,
      identityVerified,
      consentObtained,
      samples
    } = req.body;

    const ids = Array.isArray(labOrderIds) ? labOrderIds : (labOrderId ? [labOrderId] : []);

    if (ids.length === 0 || !userId || !Array.isArray(samples)) {
      res.status(400).json({ error: 'Missing labOrderId/labOrderIds, userId, or samples list' });
      return;
    }

    const now = new Date().toISOString();

    for (const targetOrderId of ids) {
      const collectFields = {
        status: 'Collected',
        collected_at: now,
        collected_by: userId,
        collector_badge: collectorBadge || null,
        collection_remarks: collectionRemarks || null,
        identity_verified: identityVerified || false,
        consent_obtained: consentObtained || false
      };

      let { error: orderErr } = await supabase
        .from('lims_lab_orders')
        .update(collectFields)
        .eq('id', targetOrderId);

      if (orderErr && orderErr.code === '23503') {
        const cleanFields = { ...collectFields, collected_by: null };
        const { error: retryErr } = await supabase
          .from('lims_lab_orders')
          .update(cleanFields)
          .eq('id', targetOrderId);
        orderErr = retryErr;
      }

      if (orderErr) throw orderErr;

      // Filter samples belonging to this specific order ID
      const orderSamples = samples.filter(s => !s.orderId || s.orderId === targetOrderId);
      
      for (const s of orderSamples) {
        const { data: existing } = await supabase
          .from('lims_samples')
          .select('id')
          .eq('lab_order_id', targetOrderId)
          .eq('sample_no', s.sampleNo)
          .single();

        const sampleData = {
          lab_order_id: targetOrderId,
          specimen_id: s.specimenId || null,
          container_id: s.containerId || null,
          sample_no: s.sampleNo,
          status: 'Collected',
          collection_site: s.collectionSite || null,
          volume_ml: s.volumeMl ? parseFloat(s.volumeMl) : null,
          temp_req: s.tempReq || null
        };

        if (existing) {
          await supabase
            .from('lims_samples')
            .update(sampleData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('lims_samples')
            .insert({
              id: crypto.randomUUID(),
              ...sampleData
            });
        }
      }

      await logAuditTrail(
        targetOrderId,
        'Ordered',
        'Collected',
        'Registered Collection',
        userId,
        `Registered collection for ${orderSamples.length} specimen tubes.`
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Save collection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Save Accession / Acceptance details
router.post('/orders/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      labOrderId,
      userId,
      receivedBy,
      labSection,
      rejectionReason,
      rejectionComments,
      notifyPhysician,
      requestResample,
      samples
    } = req.body;

    if (!labOrderId || !userId || !Array.isArray(samples)) {
      res.status(400).json({ error: 'Missing labOrderId, userId, or samples list' });
      return;
    }

    const now = new Date().toISOString();
    let allAccepted = true;

    // Update samples status
    for (const s of samples) {
      const isAccepted = s.status === 'Accepted';
      if (!isAccepted) allAccepted = false;

      const sampleUpdate: any = {
        status: s.status,
        condition: s.condition || 'Good',
        section: s.section || null,
        rejection_reason: isAccepted ? null : rejectionReason || rejectionComments || null,
        rejected_by: isAccepted ? null : userId,
        received_at: now,
        received_by: userId
      };

      const { error: updErr } = await supabase
        .from('lims_samples')
        .update(sampleUpdate)
        .eq('id', s.id);

      if (updErr && updErr.code === '23503') {
        // Fallback: retry without employee IDs to bypass foreign key constraint violations
        await supabase
          .from('lims_samples')
          .update({
            status: s.status,
            condition: s.condition || 'Good',
            section: s.section || null,
            rejection_reason: isAccepted ? null : rejectionReason || rejectionComments || null,
            rejected_by: null,
            received_at: now,
            received_by: null
          })
          .eq('id', s.id);
      }
    }

    // Determine target status
    const targetStatus = allAccepted ? 'Accepted' : (requestResample ? 'Ordered' : 'Collected');

    const acceptFields = {
      status: targetStatus,
      accepted_at: allAccepted ? now : null,
      accepted_by: allAccepted ? userId : null,
      received_at: now,
      received_by: userId,
      lab_section: labSection || null
    };

    let { error: orderErr } = await supabase
      .from('lims_lab_orders')
      .update(acceptFields)
      .eq('id', labOrderId);

    if (orderErr && orderErr.code === '23503') {
      const cleanFields = {
        ...acceptFields,
        accepted_by: null,
        received_by: null
      };
      const { error: retryErr } = await supabase
        .from('lims_lab_orders')
        .update(cleanFields)
        .eq('id', labOrderId);
      orderErr = retryErr;
    }

    if (orderErr) throw orderErr;

    await logAuditTrail(
      labOrderId,
      'Collected',
      targetStatus,
      allAccepted ? 'QA Accession Accepted' : 'QA Accession Rejected Samples',
      userId,
      allAccepted 
        ? `Accepted all samples for lab section: ${labSection}`
        : `Accession Rejected some samples. Reason: ${rejectionReason || rejectionComments}`
    );

    res.json({ success: true, targetStatus });
  } catch (err: any) {
    console.error('Save accession error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
