import { z } from 'zod';

// ─── Bill Item ──────────────────────────────────────────────────────────────
export const BillItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  total: z.number(),
  itemId: z.string().optional().nullable(),
  batchNo: z.string().optional().nullable(),
  itemType: z.string().optional().nullable(),
  discountPercentage: z.number().nonnegative().max(100).default(0),
  discountAmount: z.number().nonnegative().default(0),
  taxPercentage: z.number().nonnegative().max(100).default(0),
  taxAmount: z.number().nonnegative().default(0),
});

// ─── Payment (tender) ────────────────────────────────────────────────────────
export const PaymentSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().nonnegative('Payment amount cannot be negative'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional().nullable(),
});

// ─── Create Bill ─────────────────────────────────────────────────────────────
export const CreateBillSchema = z.object({
  bill: z.object({
    id: z.string().min(1),
    patientId: z.string().min(1, 'Patient ID is required'),
    appointmentId: z.string().optional().nullable(),
    date: z.string().min(1, 'Bill date is required'),
    status: z.enum(['Unpaid', 'Paid', 'Partial', 'Cancelled']),
    totalAmount: z.number().nonnegative(),
    paidAmount: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().default(0),
    taxAmount: z.number().nonnegative().default(0),
    roundOff: z.number().default(0),
    invoiceNo: z.string().optional().nullable(),
    doctorId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    paymentMode: z.string().optional().nullable(),
    amountReceived: z.number().nonnegative().default(0),
    referenceNo: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    createdBy: z.string().default('system'),
    isPharmacy: z.boolean().default(false),
    prescriptionId: z.string().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    // Payer split
    payerType: z.enum(['Self', 'Sponsor']).default('Self'),
    sponsorId: z.string().uuid().optional().nullable(),
    patientDueAmount: z.number().nonnegative().default(0),
    sponsorDueAmount: z.number().nonnegative().default(0),
    items: z.array(BillItemSchema).min(1, 'At least one item is required'),
    payments: z.array(PaymentSchema).default([]),
  }),
  linkedOrderIds: z.array(z.string()).optional().default([]),
});

export type CreateBillInput = z.infer<typeof CreateBillSchema>;

// ─── Add Payment ─────────────────────────────────────────────────────────────
export const AddPaymentSchema = z.object({
  billId: z.string().min(1),
  payment: PaymentSchema,
  newPaidAmount: z.number().nonnegative(),
  newStatus: z.enum(['Unpaid', 'Paid', 'Partial', 'Cancelled']),
});

export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;

// ─── Credit Memo ──────────────────────────────────────────────────────────────
export const CreditMemoSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Credit memo amount must be positive'),
  reason: z.string().min(3, 'A reason of at least 3 characters is required'),
  createdBy: z.string().min(1),
  status: z.enum(['Pending_Approval', 'Approved']).default('Approved'),
});

export type CreditMemoInput = z.infer<typeof CreditMemoSchema>;

// ─── Refund ───────────────────────────────────────────────────────────────────
export const RefundSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  creditMemoId: z.string().uuid('Valid credit memo UUID required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  totalAmount: z.number().positive('Refund amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  remarks: z.string().optional().nullable(),
  createdBy: z.string().min(1),
});

export type RefundInput = z.infer<typeof RefundSchema>;

// ─── Cancel Bill ──────────────────────────────────────────────────────────────
export const CancelBillSchema = z.object({
  id: z.string().min(1, 'Bill ID is required'),
  cancelledAt: z.string().optional(),
  reason: z.string().optional(),
  cancelledBy: z.string().default('system'),
});

export type CancelBillInput = z.infer<typeof CancelBillSchema>;

// ─── List Filters ─────────────────────────────────────────────────────────────
export const ListBillsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().optional(),
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  branchId: z.string().uuid().optional(),
  payerType: z.enum(['Self', 'Sponsor']).optional(),
});

export type ListBillsInput = z.infer<typeof ListBillsSchema>;
