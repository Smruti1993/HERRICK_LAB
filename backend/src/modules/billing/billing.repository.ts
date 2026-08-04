import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type {
  CreateBillInput,
  AddPaymentInput,
  CreditMemoInput,
  RefundInput,
  CancelBillInput,
  ListBillsInput,
} from './billing.validation';

dotenv.config();

// ─── Admin client — uses service_role key → bypasses RLS ────────────────────
// All billing writes MUST go through this client, not the anon client.
function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || '';
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nextCreditMemoNo(): string {
  return `CM-${Date.now()}`;
}

function nextRefundNo(): string {
  return `RFD-${Date.now()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST BILLS (paginated, branch-filtered, legacy + canonical search)
// ─────────────────────────────────────────────────────────────────────────────
export async function listBills(input: ListBillsInput) {
  const db = getAdminClient();
  const { page, limit, search, status, fromDate, toDate, branchId, payerType } = input;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .from('bills')
    .select('*, bill_items(*), payments(*)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, to);

  if (search) {
    // Match canonical (INV-*, PH-*) AND legacy (RCP-*) invoice numbers
    query = query.or(`invoice_no.ilike.%${search}%,id.ilike.%${search}%`);
  }
  if (status) query = query.eq('status', status);
  if (fromDate) query = query.gte('date', fromDate);
  if (toDate) query = query.lte('date', toDate);
  if (branchId) query = query.eq('branch_id', branchId);
  if (payerType) query = query.eq('payer_type', payerType);

  const { data, error, count } = await query;
  if (error) throw new Error(`listBills: ${error.message}`);
  return { bills: data ?? [], total: count ?? 0, page, limit };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PENDING ORDERS (service_orders not yet billed)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPendingOrders(branchId?: string) {
  const db = getAdminClient();
  let query = db
    .from('service_orders')
    .select('*, service_definitions(name, service_type), appointments(patient_id, date)')
    .eq('billing_status', 'Pending')
    .order('order_date', { ascending: false })
    .limit(500);

  const { data, error } = await query;
  if (error) throw new Error(`getPendingOrders: ${error.message}`);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE BILL (atomic: bill + items + payments + order status update)
// ─────────────────────────────────────────────────────────────────────────────
export async function createBill(input: CreateBillInput) {
  const db = getAdminClient();
  const { bill, linkedOrderIds } = input;

  // 1. Insert bill header
  const { error: billError } = await db.from('bills').insert({
    id: bill.id,
    patient_id: bill.patientId,
    appointment_id: bill.appointmentId ?? null,
    date: bill.date,
    status: bill.status,
    total_amount: bill.totalAmount,
    paid_amount: bill.paidAmount,
    invoice_no: bill.invoiceNo ?? null,
    discount_amount: bill.discountAmount,
    tax_amount: bill.taxAmount,
    round_off: bill.roundOff,
    doctor_id: bill.doctorId ?? null,
    department_id: bill.departmentId ?? null,
    payment_mode: bill.paymentMode ?? null,
    amount_received: bill.amountReceived,
    reference_no: bill.referenceNo ?? null,
    notes: bill.notes ?? null,
    created_by: bill.createdBy,
    is_pharmacy: bill.isPharmacy,
    prescription_id: bill.prescriptionId ?? null,
    branch_id: bill.branchId ?? null,
    payer_type: bill.payerType,
    sponsor_id: bill.sponsorId ?? null,
    patient_due_amount: bill.patientDueAmount,
    sponsor_due_amount: bill.sponsorDueAmount,
  });
  if (billError) throw new Error(`createBill.bill: ${billError.message}`);

  // 2. Insert bill items
  const itemsDb = bill.items.map((i: any) => ({
    id: i.id,
    bill_id: bill.id,
    item_id: i.itemId ?? null,
    batch_no: i.batchNo ?? null,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total: i.total,
    item_type: i.itemType ?? null,
    discount_percentage: i.discountPercentage,
    discount_amount: i.discountAmount,
    tax_percentage: i.taxPercentage,
    tax_amount: i.taxAmount,
  }));
  const { error: itemsError } = await db.from('bill_items').insert(itemsDb);
  if (itemsError) {
    // Rollback bill to avoid orphans (best-effort)
    await db.from('bills').delete().eq('id', bill.id);
    throw new Error(`createBill.items: ${itemsError.message}`);
  }

  // 3. Insert payments (tender splits)
  if (bill.payments.length > 0) {
    const paymentsDb = bill.payments.map((p: any) => ({
      id: p.id,
      bill_id: bill.id,
      date: p.date,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? null,
    }));
    const { error: payError } = await db.from('payments').insert(paymentsDb);
    if (payError) throw new Error(`createBill.payments: ${payError.message}`);
  }

  // 4. Mark linked service orders as Billed (triggers lims_lab_orders creation)
  if (linkedOrderIds && linkedOrderIds.length > 0) {
    const { error: orderError } = await db
      .from('service_orders')
      .update({ billing_status: 'Billed', status: 'Billed' })
      .in('id', linkedOrderIds);
    if (orderError) {
      console.error('createBill: failed to update service orders', orderError.message);
    }
  }

  const labItems = bill.items.filter((i: any) =>
    ['Lab Test', 'Laboratory', 'lab_test'].includes(i.itemType ?? '')
  );
  if (labItems.length > 0 && (!linkedOrderIds || linkedOrderIds.length === 0)) {
    await _createDirectBillingLabOrders(db, bill, labItems);
  }

  return { success: true, billId: bill.id };
}

async function _createDirectBillingLabOrders(
  db: SupabaseClient,
  bill: CreateBillInput['bill'],
  labItems: CreateBillInput['bill']['items']
) {
  let appointmentId = bill.appointmentId ?? null;

  if (!appointmentId && bill.patientId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: existingApp } = await db
      .from('appointments')
      .select('id')
      .eq('patient_id', bill.patientId)
      .eq('date', todayStr)
      .limit(1);

    if (existingApp && existingApp.length > 0) {
      appointmentId = existingApp[0].id;
    } else {
      const newAppId = crypto.randomUUID();
      await db.from('appointments').insert({
        id: newAppId,
        patient_id: bill.patientId,
        date: todayStr,
        time: new Date().toTimeString().slice(0, 5),
        status: 'Completed',
        visit_type: 'Direct Billing',
        doctor_id: bill.doctorId ?? null,
        department_id: bill.departmentId ?? null,
      });
      appointmentId = newAppId;
    }
  }

  for (const labItem of labItems) {
    let resolvedServiceId = labItem.itemId ?? null;
    if (!resolvedServiceId && labItem.description) {
      const { data: svcMatch } = await db
        .from('service_definitions')
        .select('id')
        .ilike('name', labItem.description)
        .limit(1);
      if (svcMatch && svcMatch.length > 0) resolvedServiceId = svcMatch[0].id;
    }

    await db.from('service_orders').insert({
      id: crypto.randomUUID(),
      appointment_id: appointmentId,
      service_id: resolvedServiceId,
      service_name: labItem.description,
      quantity: labItem.quantity,
      unit_price: labItem.unitPrice,
      total_price: labItem.total,
      status: 'Billed',
      billing_status: 'Billed',
      priority: 'Routine',
      order_date: new Date().toISOString(),
      ordering_doctor_id: bill.doctorId ?? null,
      service_center: bill.departmentId ?? null,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL BILL
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelBill(input: CancelBillInput) {
  const db = getAdminClient();
  const cancelledAt = input.cancelledAt ?? new Date().toISOString();
  const { error } = await db
    .from('bills')
    .update({
      status: 'Cancelled',
      refund_status: 'Pending',
      cancelled_at: cancelledAt,
    })
    .eq('id', input.id);
  if (error) throw new Error(`cancelBill: ${error.message}`);
  return { success: true, cancelledAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PAYMENT (tender split — supports multiple payments per bill)
// ─────────────────────────────────────────────────────────────────────────────
export async function addPayment(input: AddPaymentInput) {
  const db = getAdminClient();
  const { payment, billId, newPaidAmount, newStatus } = input;

  const { error: payError } = await db.from('payments').insert({
    id: payment.id,
    bill_id: billId,
    date: payment.date,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference ?? null,
  });
  if (payError) throw new Error(`addPayment.insert: ${payError.message}`);

  const { error: billError } = await db
    .from('bills')
    .update({ paid_amount: newPaidAmount, status: newStatus })
    .eq('id', billId);
  if (billError) throw new Error(`addPayment.update: ${billError.message}`);

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT MEMO
// ─────────────────────────────────────────────────────────────────────────────
export async function createCreditMemo(billId: string, input: CreditMemoInput) {
  const db = getAdminClient();
  const creditMemoNo = nextCreditMemoNo();

  const { data, error } = await db
    .from('credit_memos')
    .insert({
      bill_id: billId,
      credit_memo_no: creditMemoNo,
      amount: input.amount,
      reason: input.reason,
      created_by: input.createdBy,
      status: input.status,
    })
    .select()
    .single();

  if (error) throw new Error(`createCreditMemo: ${error.message}`);
  return { success: true, creditMemo: data };
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUND (linked to an approved credit memo)
// ─────────────────────────────────────────────────────────────────────────────
export async function createRefund(billId: string, input: RefundInput) {
  const db = getAdminClient();

  // 1. Verify credit memo exists and is Approved
  const { data: memo, error: memoErr } = await db
    .from('credit_memos')
    .select('*')
    .eq('id', input.creditMemoId)
    .eq('bill_id', billId)
    .eq('status', 'Approved')
    .single();
  if (memoErr || !memo) {
    throw new Error('Credit memo not found or not yet approved for this bill');
  }

  // 2. Create refund header
  const refundNo = nextRefundNo();
  const { data: refund, error: refundErr } = await db
    .from('patient_refunds')
    .insert({
      refund_no: refundNo,
      patient_id: input.patientId,
      total_amount: input.totalAmount,
      payment_method: input.paymentMethod,
      remarks: input.remarks ?? null,
      created_by: input.createdBy,
      status: 'Processed',
    })
    .select()
    .single();
  if (refundErr || !refund) throw new Error(`createRefund.refund: ${refundErr?.message}`);

  // 3. Link credit memo to refund
  await db.from('credit_memos').update({ refund_id: refund.id }).eq('id', input.creditMemoId);

  // 4. Update bill refund status
  await db.from('bills').update({ refund_status: 'Refunded' }).eq('id', billId);

  return { success: true, refundNo, refundId: refund.id };
}



// ─────────────────────────────────────────────────────────────────────────────
// CASHIER RECONCILIATION (totals by payment mode for a given date/cashier)
// ─────────────────────────────────────────────────────────────────────────────
export async function getReconciliation(date: string, cashierId?: string) {
  const db = getAdminClient();
  let query = db
    .from('payments')
    .select('method, amount, bills!inner(created_by, date)')
    .eq('bills.date', date); // join filter

  if (cashierId) {
    query = query.eq('bills.created_by', cashierId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getReconciliation: ${error.message}`);

  // Aggregate by method
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    const method = (row.method ?? 'Unknown') as string;
    totals[method] = (totals[method] ?? 0) + Number(row.amount);
  }
  return { date, cashierId, totals, rows: data ?? [] };
}
