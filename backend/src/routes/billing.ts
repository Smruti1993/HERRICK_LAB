import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. Create Bill
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bill, linkedOrderIds } = req.body;

    if (!bill || !bill.id || !bill.patientId || !bill.items) {
      res.status(400).json({ error: 'Missing required bill information' });
      return;
    }

    // Insert bill
    const { error: billError } = await supabase.from('bills').insert({
      id: bill.id,
      patient_id: bill.patientId,
      appointment_id: bill.appointmentId || null,
      date: bill.date,
      status: bill.status,
      total_amount: bill.totalAmount,
      paid_amount: bill.paidAmount,
      invoice_no: bill.invoiceNo || null,
      discount_amount: bill.discountAmount || 0,
      tax_amount: bill.taxAmount || 0,
      round_off: bill.roundOff || 0,
      doctor_id: bill.doctorId || null,
      department_id: bill.departmentId || null,
      payment_mode: bill.paymentMode || null,
      amount_received: bill.amountReceived || 0,
      reference_no: bill.referenceNo || null,
      notes: bill.notes || null,
      created_by: bill.createdBy || 'admin',
      is_pharmacy: bill.isPharmacy || false,
      prescription_id: bill.prescriptionId || null,
      cancelled_at: bill.cancelledAt || null
    });

    if (billError) {
      console.error('Failed to create bill:', billError);
      res.status(500).json({ error: 'Failed to create bill in database: ' + billError.message });
      return;
    }

    // Insert bill items
    const itemsDb = bill.items.map((i: any) => ({
      id: i.id,
      bill_id: bill.id,
      item_id: i.itemId || null,
      batch_no: i.batchNo || null,
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unitPrice),
      total: Number(i.total),
      item_type: i.itemType || null,
      discount_percentage: Number(i.discountPercentage || 0),
      discount_amount: Number(i.discountAmount || 0),
      tax_percentage: Number(i.taxPercentage || 0),
      tax_amount: Number(i.taxAmount || 0)
    }));

    const { error: itemsError } = await supabase.from('bill_items').insert(itemsDb);

    if (itemsError) {
      console.error('Failed to insert bill items:', itemsError);
      // Clean up bill to avoid orphan rows if items fail
      await supabase.from('bills').delete().eq('id', bill.id);
      res.status(500).json({ error: 'Failed to save bill items: ' + itemsError.message });
      return;
    }

    // Insert payments
    if (bill.payments && bill.payments.length > 0) {
      const paymentsDb = bill.payments.map((p: any) => ({
        id: p.id,
        bill_id: bill.id,
        date: p.date,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference || null
      }));
      const { error: payError } = await supabase.from('payments').insert(paymentsDb);
      if (payError) {
        console.error('Failed to insert payments:', payError);
      }
    }

    // Update status of linked service orders (and trigger auto-creates lims_lab_orders via DB trigger)
    if (linkedOrderIds && linkedOrderIds.length > 0) {
      const { error: orderError } = await supabase
        .from('service_orders')
        .update({ billing_status: 'Billed', status: 'Billed' })
        .in('id', linkedOrderIds);
      if (orderError) {
        console.error('Failed to update service orders:', orderError);
      }
    }

    // --- Direct Billing Path ---
    // If the bill has Lab Test items but NO linked service_orders,
    // the DB trigger on service_orders will never fire.
    // In this case we create lims_lab_orders directly here.
    const labItems = bill.items?.filter((i: any) => 
      i.itemType === 'Lab Test' || i.itemType === 'Laboratory' || i.itemType === 'lab_test'
    ) || [];

    if (labItems.length > 0 && (!linkedOrderIds || linkedOrderIds.length === 0)) {
      // 1. Resolve or create a stub appointment for direct billing
      let appointmentId = bill.appointmentId || null;
      if (!appointmentId && bill.patientId) {
        try {
          // Check if there is an existing appointment for this patient today
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: existingApp } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', bill.patientId)
            .eq('date', todayStr)
            .limit(1);

          if (existingApp && existingApp.length > 0) {
            appointmentId = existingApp[0].id;
          } else {
            // Create a stub appointment for direct billing
            const newAppId = crypto.randomUUID();
            const { error: appErr } = await supabase.from('appointments').insert({
              id: newAppId,
              patient_id: bill.patientId,
              date: todayStr,
              time: new Date().toTimeString().slice(0, 5),
              status: 'Completed',
              visit_type: 'Direct Billing',
              doctor_id: bill.doctorId || null,
              department_id: bill.departmentId || null
            });
            if (!appErr) {
              appointmentId = newAppId;
            }
          }
        } catch (appQueryErr) {
          console.error('Failed to resolve/create stub appointment for direct billing:', appQueryErr);
        }
      }

      for (const labItem of labItems) {
        // Resolve service_id by name if not provided by the frontend
        let resolvedServiceId = labItem.itemId || null;
        if (!resolvedServiceId && labItem.description) {
          const { data: svcMatch } = await supabase
            .from('service_definitions')
            .select('id')
            .ilike('name', labItem.description)
            .limit(1);
          if (svcMatch && svcMatch.length > 0) {
            resolvedServiceId = svcMatch[0].id;
          }
        }

        // Create a service_order row first (so lims_lab_orders can reference it)
        const serviceOrderId = crypto.randomUUID();
        await supabase.from('service_orders').insert({
          id: serviceOrderId,
          appointment_id: appointmentId,
          service_id: resolvedServiceId,
          service_name: labItem.description,
          cpt_code: labItem.cptCode || null,
          quantity: labItem.quantity || 1,
          unit_price: labItem.unitPrice || 0,
          total_price: labItem.total || 0,
          status: 'Billed',
          billing_status: 'Billed',
          priority: 'Routine',
          order_date: new Date().toISOString(),
          ordering_doctor_id: bill.doctorId || null,
          service_center: bill.departmentId || null
        });
      }
    }

    res.json({ success: true, message: 'Bill created successfully', billId: bill.id });
  } catch (err: any) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Internal server error while creating bill' });
  }
});

// 2. Cancel Bill
router.post('/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, cancelledAt } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Missing bill ID' });
      return;
    }

    const dateStr = cancelledAt || new Date().toISOString();

    const { error } = await supabase
      .from('bills')
      .update({ status: 'Cancelled', refund_status: 'Pending', cancelled_at: dateStr })
      .eq('id', id);

    if (error) {
      console.error('Failed to cancel bill:', error);
      res.status(500).json({ error: 'Failed to cancel bill in database: ' + error.message });
      return;
    }

    res.json({ success: true, message: 'Bill cancelled successfully', cancelledAt: dateStr });
  } catch (err: any) {
    console.error('Cancel bill error:', err);
    res.status(500).json({ error: 'Internal server error while cancelling bill' });
  }
});

// 3. Add Payment
router.post('/add-payment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { payment, billId, newPaidAmount, newStatus } = req.body;

    if (!payment || !billId || newPaidAmount === undefined || !newStatus) {
      res.status(400).json({ error: 'Missing payment details' });
      return;
    }

    // Insert payment receipt
    const { error: payError } = await supabase.from('payments').insert({
      id: payment.id,
      bill_id: billId,
      date: payment.date,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference || null
    });

    if (payError) {
      console.error('Failed to insert payment:', payError);
      res.status(500).json({ error: 'Failed to insert payment receipt: ' + payError.message });
      return;
    }

    // Update bill paid amount and status
    const { error: billError } = await supabase
      .from('bills')
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq('id', billId);

    if (billError) {
      console.error('Failed to update bill payment details:', billError);
      res.status(500).json({ error: 'Failed to update bill payment details: ' + billError.message });
      return;
    }

    res.json({ success: true, message: 'Payment added successfully' });
  } catch (err: any) {
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Internal server error while adding payment' });
  }
});

export default router;
