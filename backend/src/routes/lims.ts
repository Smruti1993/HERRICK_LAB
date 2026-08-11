import { Router, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Multer in-memory storage for Excel file uploads (max 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are accepted'));
    }
  }
});

// Allowed enum values for import validation
const ALLOWED_SERVICE_TYPES = ['LABORATORY', 'RADIOLOGY', 'CARDIOLOGY', 'PROCEDURE', 'CONSULTATION'];
const ALLOWED_SERVICE_CATEGORIES = ['Single service', 'Profile/Package', 'Outsourced service', 'Special test'];
const ALLOWED_RESULT_TYPES = ['Numeric', 'Alphanumeric', 'Template', 'Parameter', 'Form'];
const ALLOWED_VISIT_TYPES = ['IP', 'OP', 'Both'];
const ALLOWED_GENDERS = ['Both', 'Male', 'Female'];

// Required headers for a valid import file
const REQUIRED_HEADERS = ['Service Code', 'Service Name', 'Service Type'];

// Map of Excel header names to internal payload field names
const HEADER_MAP: Record<string, string> = {
  'Service Code': 'code',
  'Service Name': 'name',
  'Service Type': 'serviceType',
  'Service Category': 'serviceCategory',
  'Result Type': 'resultType',
  'Alternate Name': 'alternateName',
  'Applicable Visit': 'applicableVisitType',
  'Applicable Gender': 'applicableGender',
  'Standard Price': 'price',
  'CPT Code': 'cptCode',
  'Group Name': 'groupName',
  'Billing Group Name': 'billingGroupName',
  'Financial Group': 'financialGroup',
  'Est Duration (Min)': 'estDuration',
  'Max Orderable Qty': 'maxOrderableQty',
  'CPT Description': 'cptDescription',
  'Special Instructions': 'specialInstructions',
  'Is Active': 'isActive',
  'Chargeable': 'chargeable',
  'Schedulable': 'schedulable',
  'Individually Orderable': 'individuallyOrderable',
  'Consent Required': 'consentRequired',
  'Is External': 'isExternal',
  'Is Auth Required': 'isAuthRequired'
};

type RowResult = {
  rowNumber: number;
  serviceCode: string;
  serviceName: string;
  action: 'create' | 'update' | 'blocked' | 'error';
  reason?: string;
};

// Converts "Yes"/"No" to boolean - strict, rejects anything else
function parseBool(val: any): boolean | null {
  if (val === 'Yes' || val === 'YES' || val === 'yes') return true;
  if (val === 'No' || val === 'NO' || val === 'no') return false;
  return null;
}

// Validates a single Excel row and returns parsed payload or error
function validateExcelRow(row: Record<string, any>, rowNumber: number): { valid: true; payload: any } | { valid: false; reason: string } {
  const code = (row['code'] || '').toString().trim().toUpperCase();
  const name = (row['name'] || '').toString().trim();
  const serviceType = (row['serviceType'] || '').toString().trim().toUpperCase();
  const serviceCategory = (row['serviceCategory'] || 'Single service').toString().trim();
  const resultType = (row['resultType'] || 'Numeric').toString().trim();
  const applicableVisit = (row['applicableVisitType'] || 'Both').toString().trim();
  const applicableGender = (row['applicableGender'] || 'Both').toString().trim();

  if (!code) return { valid: false, reason: 'Service Code is required' };
  if (!name) return { valid: false, reason: 'Service Name is required' };
  if (!ALLOWED_SERVICE_TYPES.includes(serviceType)) return { valid: false, reason: `Invalid Service Type "${serviceType}". Allowed: ${ALLOWED_SERVICE_TYPES.join(', ')}` };
  if (!ALLOWED_SERVICE_CATEGORIES.includes(serviceCategory)) return { valid: false, reason: `Invalid Service Category "${serviceCategory}"` };
  if (!ALLOWED_RESULT_TYPES.includes(resultType)) return { valid: false, reason: `Invalid Result Type "${resultType}"` };
  if (!ALLOWED_VISIT_TYPES.includes(applicableVisit)) return { valid: false, reason: `Invalid Applicable Visit "${applicableVisit}"` };
  if (!ALLOWED_GENDERS.includes(applicableGender)) return { valid: false, reason: `Invalid Applicable Gender "${applicableGender}"` };

  const priceRaw = row['price'];
  let price: number | null = null;
  if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
    price = parseFloat(priceRaw);
    if (isNaN(price)) return { valid: false, reason: `Invalid price value "${priceRaw}" - must be a number` };
  }

  // Parse boolean fields - must be strict Yes/No only
  const boolFields = ['isActive', 'chargeable', 'schedulable', 'individuallyOrderable', 'consentRequired', 'isExternal', 'isAuthRequired'];
  const boolValues: Record<string, boolean> = {};
  const boolDefaults: Record<string, boolean> = {
    isActive: true, chargeable: true, schedulable: false,
    individuallyOrderable: true, consentRequired: false, isExternal: false, isAuthRequired: false
  };
  for (const field of boolFields) {
    const rawVal = row[field];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      boolValues[field] = boolDefaults[field];
    } else {
      const parsed = parseBool(rawVal);
      if (parsed === null) return { valid: false, reason: `Invalid value "${rawVal}" for "${field}" - must be exactly "Yes" or "No"` };
      boolValues[field] = parsed;
    }
  }

  return {
    valid: true,
    payload: {
      code,
      name,
      serviceType: serviceType,
      serviceCategory,
      resultType,
      alternateName: (row['alternateName'] || '').toString().trim() || null,
      applicableVisitType: applicableVisit,
      applicableGender,
      price,
      cptCode: (row['cptCode'] || '').toString().trim() || null,
      groupName: (row['groupName'] || 'SERVICE_GROUPS/Lab').toString().trim(),
      billingGroupName: (row['billingGroupName'] || 'Services/Lab').toString().trim(),
      financialGroup: (row['financialGroup'] || 'ERP Finance1').toString().trim(),
      estDuration: parseInt(row['estDuration'] || '0') || 0,
      maxOrderableQty: parseInt(row['maxOrderableQty'] || '1') || 1,
      cptDescription: (row['cptDescription'] || '').toString().trim() || null,
      specialInstructions: (row['specialInstructions'] || '').toString().trim() || null,
      ...boolValues
    }
  };
}

// Checks if a category change would break existing dependencies
async function checkCategoryConflict(code: string, existingRecord: any, newCategory: string): Promise<string | null> {
  if (!existingRecord || existingRecord.service_category === newCategory) return null;

  // Check reagent mappings
  const { data: reagents } = await supabase
    .from('lims_service_reagents')
    .select('id')
    .eq('service_id', existingRecord.id)
    .limit(1);

  if (reagents && reagents.length > 0) {
    return `Cannot change category: service has ${reagents.length} active reagent mapping(s). Remove reagents first.`;
  }

  // Check profile component links (service is a component of a profile, or is a profile with components)
  const { data: components } = await supabase
    .from('lims_service_profile_components')
    .select('id')
    .or(`profile_service_id.eq.${existingRecord.id},component_service_id.eq.${existingRecord.id}`)
    .limit(1);

  if (components && components.length > 0) {
    return `Cannot change category: service is linked to ${components.length} profile component(s). Remove profile links first.`;
  }

  return null;
}

// Parses an uploaded Excel buffer into an array of row objects keyed by header names
async function parseExcelBuffer(buffer: Buffer): Promise<{ headers: string[]; rows: Record<string, any>[] } | { error: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { error: 'No worksheets found in the uploaded file' };

    // Read headers from row 1
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString().trim() || '');
    });

    // Check all required headers are present
    const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return { error: `Missing required column(s): ${missingHeaders.join(', ')}` };
    }

    // Parse data rows
    const rows: Record<string, any>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const rowData: Record<string, any> = {};
      let hasData = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header && HEADER_MAP[header]) {
          const fieldKey = HEADER_MAP[header];
          rowData[fieldKey] = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
          if (rowData[fieldKey]) hasData = true;
        }
      });
      if (hasData) rows.push({ ...rowData, _rowNumber: rowNumber });
    });

    return { headers, rows };
  } catch (err: any) {
    return { error: `Failed to parse Excel file: ${err.message}` };
  }
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Lab Service Bulk Import — Validate & Commit endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Helper to run full file validation (shared by both validate and commit)
async function runFullValidation(buffer: Buffer): Promise<
  | { ok: false; fileError: string }
  | { ok: true; rowResults: RowResult[]; parsedRows: Array<{ rowData: Record<string, any>; payload: any }> }
> {
  const parsed = await parseExcelBuffer(buffer);
  if ('error' in parsed) return { ok: false, fileError: parsed.error };

  const { rows } = parsed;
  const rowResults: RowResult[] = [];
  const parsedRows: Array<{ rowData: Record<string, any>; payload: any }> = [];
  const seenCodes = new Set<string>();

  for (const rowData of rows) {
    const rowNumber = rowData._rowNumber as number;
    const validation = validateExcelRow(rowData, rowNumber);
    const rawCode = (rowData['code'] || '').toString().trim().toUpperCase();
    const rawName = (rowData['name'] || '').toString().trim();

    if (!validation.valid) {
      rowResults.push({ rowNumber, serviceCode: rawCode, serviceName: rawName, action: 'error', reason: validation.reason });
      parsedRows.push({ rowData, payload: null });
      continue;
    }

    const { payload } = validation;

    // Duplicate within file check
    if (seenCodes.has(payload.code)) {
      rowResults.push({ rowNumber, serviceCode: payload.code, serviceName: payload.name, action: 'error', reason: `Duplicate Service Code "${payload.code}" within this file — only the first occurrence is processed` });
      parsedRows.push({ rowData, payload: null });
      continue;
    }
    seenCodes.add(payload.code);

    // Check if service already exists
    const { data: existing } = await supabase
      .from('service_definitions')
      .select('id, service_category, code, name')
      .eq('code', payload.code)
      .maybeSingle();

    const action: 'create' | 'update' = existing ? 'update' : 'create';

    // Category conflict check on existing services
    if (existing) {
      const conflict = await checkCategoryConflict(payload.code, existing, payload.serviceCategory);
      if (conflict) {
        rowResults.push({ rowNumber, serviceCode: payload.code, serviceName: payload.name, action: 'blocked', reason: conflict });
        parsedRows.push({ rowData, payload: null });
        continue;
      }
    }

    let reason: string | undefined;
    if (action === 'create' && payload.serviceCategory === 'Profile/Package') {
      reason = 'Will be created as Profile/Package shell — map components manually in the Components tab';
    }

    rowResults.push({ rowNumber, serviceCode: payload.code, serviceName: payload.name, action, reason });
    parsedRows.push({ rowData, payload: { ...payload, existingId: existing?.id || null } });
  }

  return { ok: true, rowResults, parsedRows };
}

// POST /service-import/validate — dry-run preview, no writes
router.post('/service-import/validate', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ fileError: 'No file uploaded. Send the Excel file as multipart/form-data with field name "file".' });
      return;
    }

    const result = await runFullValidation(req.file.buffer);
    if (!result.ok) {
      res.status(422).json({ fileError: result.fileError });
      return;
    }

    const { rowResults } = result;
    const summary = {
      total: rowResults.length,
      toCreate: rowResults.filter(r => r.action === 'create').length,
      toUpdate: rowResults.filter(r => r.action === 'update').length,
      blocked: rowResults.filter(r => r.action === 'blocked').length,
      errors: rowResults.filter(r => r.action === 'error').length,
    };

    res.json({ rows: rowResults, summary });
  } catch (err: any) {
    console.error('Service import validate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /service-import/commit — writes valid rows per-row transactionally
router.post('/service-import/commit', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ fileError: 'No file uploaded.' });
      return;
    }

    const fileName = req.file.originalname;
    
    // Resolve performedBy to a valid app_users.id to prevent FK violations
    let performedBy = (req as any).user?.id || null;
    if (performedBy) {
      const { data: userExists } = await supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('id', performedBy)
        .maybeSingle();
      if (!userExists) {
        // Try fallback search by username (in case of demo token where req.user.email is the username)
        const username = (req as any).user?.email || '';
        const { data: userByUsername } = await supabaseAdmin
          .from('app_users')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (userByUsername) {
          performedBy = userByUsername.id;
        } else {
          performedBy = null;
        }
      }
    }

    // Re-run full validation server-side — never trust a stale client preview
    const validation = await runFullValidation(req.file.buffer);
    if (!validation.ok) {
      res.status(422).json({ fileError: validation.fileError });
      return;
    }

    const { rowResults, parsedRows } = validation;
    const finalResults: RowResult[] = [];
    let createdCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;

    for (let i = 0; i < rowResults.length; i++) {
      const preResult = rowResults[i];
      const { payload } = parsedRows[i];

      // Blocked or validation-error rows — skip, don't attempt writes
      if (preResult.action === 'blocked' || preResult.action === 'error') {
        finalResults.push(preResult);
        preResult.action === 'blocked' ? skippedCount++ : errorCount++;
        continue;
      }

      if (!payload) {
        finalResults.push({ ...preResult, action: 'error', reason: 'Internal: parsed payload missing' });
        errorCount++;
        continue;
      }

      // Per-row write attempt (simulated transaction via sequential upserts)
      try {
        const serviceId = payload.existingId || Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);

        const dbPayload = {
          id: serviceId,
          code: payload.code,
          name: payload.name,
          alternate_name: payload.alternateName,
          service_type: payload.serviceType,
          service_category: payload.serviceCategory,
          status: payload.isActive ? 'Active' : 'Inactive',
          chargeable: payload.chargeable,
          applicable_visit_type: payload.applicableVisitType === 'IP' ? 'New' : payload.applicableVisitType === 'OP' ? 'Follow-up' : 'Both',
          applicable_gender: payload.applicableGender,
          est_duration: payload.estDuration,
          max_orderable_qty: payload.maxOrderableQty,
          cpt_code: payload.cptCode,
          schedulable: payload.schedulable,
          individually_orderable: payload.individuallyOrderable,
          consent_required: payload.consentRequired,
          is_external: payload.isExternal,
          is_auth_required: payload.isAuthRequired,
          group_name: payload.groupName,
          billing_group_name: payload.billingGroupName,
          financial_group: payload.financialGroup,
          cpt_description: payload.cptDescription,
          special_instructions: payload.specialInstructions
        };

        // Upsert service_definitions
        const { error: sdError } = payload.existingId
          ? await supabaseAdmin.from('service_definitions').update(dbPayload).eq('id', serviceId)
          : await supabaseAdmin.from('service_definitions').insert(dbPayload);

        if (sdError) throw new Error(`service_definitions: ${sdError.message}`);

        // Upsert lims_service_configs
        const { error: configError } = await supabaseAdmin.from('lims_service_configs').upsert({
          service_id: serviceId,
          result_type: payload.resultType
        }, { onConflict: 'service_id' });
        if (configError) throw new Error(`lims_service_configs: ${configError.message}`);

        // Upsert Self Pay tariff if price is provided
        if (payload.price !== null) {
          const { data: existingTariff } = await supabaseAdmin
            .from('service_tariffs')
            .select('id')
            .eq('service_id', serviceId)
            .eq('tariff_name', 'Self Pay')
            .maybeSingle();

          if (existingTariff) {
            await supabaseAdmin.from('service_tariffs').update({ price: payload.price }).eq('id', existingTariff.id);
          } else {
            await supabaseAdmin.from('service_tariffs').insert({
              id: crypto.randomUUID(),
              service_id: serviceId,
              tariff_name: 'Self Pay',
              price: payload.price,
              effective_date: new Date().toISOString(),
              status: 'Active'
            });
          }
        }

        const outcome = payload.existingId ? 'update' : 'create';
        let rowNote = preResult.reason;
        finalResults.push({ ...preResult, action: outcome as 'create' | 'update', reason: rowNote });
        outcome === 'create' ? createdCount++ : updatedCount++;

      } catch (rowErr: any) {
        console.error(`Import row ${preResult.rowNumber} failed:`, rowErr.message);
        finalResults.push({ ...preResult, action: 'error', reason: rowErr.message });
        errorCount++;
      }
    }

    // Write audit log (service role — bypasses RLS)
    try {
      await supabaseAdmin.from('lab_service_import_log').insert({
        performed_by: performedBy,
        file_name: fileName,
        total_rows: finalResults.length,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        row_results: finalResults
      });
    } catch (logErr: any) {
      console.error('Import audit log write failed:', logErr.message);
    }

    res.json({
      summary: { total: finalResults.length, created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      rows: finalResults
    });

  } catch (err: any) {
    console.error('Service import commit error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

