import type {
  CreateBillInput,
  AddPaymentInput,
  CreditMemoInput,
  RefundInput,
  CancelBillInput,
  ListBillsInput,
} from './billing.validation';
import * as repo from './billing.repository';

// ─── Payer-split validation ───────────────────────────────────────────────────
function validatePayerSplit(bill: CreateBillInput['bill']) {
  if (bill.payerType === 'Sponsor') {
    const splitSum = bill.patientDueAmount + bill.sponsorDueAmount;
    // Allow small float rounding tolerance
    if (Math.abs(splitSum - bill.totalAmount) > 0.02) {
      throw new Error(
        `Payer split mismatch: patient_due (${bill.patientDueAmount}) + sponsor_due (${bill.sponsorDueAmount}) = ${splitSum} ≠ total (${bill.totalAmount})`
      );
    }
    if (!bill.sponsorId) {
      throw new Error('sponsor_id is required when payer_type is Sponsor');
    }
  }
}

function validateTenderSplit(bill: CreateBillInput['bill']) {
  if (bill.payments.length > 1) {
    const tenderTotal = bill.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    // Tender amounts must match paid_amount, not necessarily total_amount (for partial pays)
    if (Math.abs(tenderTotal - bill.paidAmount) > 0.02) {
      throw new Error(
        `Tender split mismatch: sum of payments (${tenderTotal}) ≠ paid_amount (${bill.paidAmount})`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function listBillsService(input: ListBillsInput) {
  return repo.listBills(input);
}

export async function getPendingOrdersService(branchId?: string) {
  return repo.getPendingOrders(branchId);
}

export async function createBillService(input: CreateBillInput) {
  // Business rule validations
  validatePayerSplit(input.bill);
  validateTenderSplit(input.bill);

  if (input.bill.totalAmount < 0) {
    throw new Error('Total amount cannot be negative');
  }

  return repo.createBill(input);
}

export async function cancelBillService(input: CancelBillInput) {
  return repo.cancelBill(input);
}

export async function addPaymentService(input: AddPaymentInput) {
  if (input.newPaidAmount < 0) {
    throw new Error('Paid amount cannot be negative');
  }
  return repo.addPayment(input);
}

export async function createCreditMemoService(billId: string, input: CreditMemoInput) {
  if (input.amount <= 0) {
    throw new Error('Credit memo amount must be greater than zero');
  }
  return repo.createCreditMemo(billId, input);
}

export async function createRefundService(billId: string, input: RefundInput) {
  if (input.totalAmount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }
  return repo.createRefund(billId, input);
}



export async function getReconciliationService(date: string, cashierId?: string) {
  if (!date) throw new Error('Date is required for reconciliation');
  return repo.getReconciliation(date, cashierId);
}
