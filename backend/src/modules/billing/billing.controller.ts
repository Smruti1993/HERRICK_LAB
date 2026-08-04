import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import {
  CreateBillSchema,
  AddPaymentSchema,
  CreditMemoSchema,
  RefundSchema,
  CancelBillSchema,
  ListBillsSchema,
  CreateBillInput,
  AddPaymentInput,
  CreditMemoInput,
  RefundInput,
  CancelBillInput,
  ListBillsInput,
} from './billing.validation';
import * as service from './billing.service';

const router = Router();

// ─── Helper: validate with Zod and return 400 on failure ─────────────────────
function parseOrFail<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: any } }, data: unknown, res: Response): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error?.flatten() });
    return null;
  }
  return result.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing — paginated list with search & filters
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<ListBillsInput>(ListBillsSchema, req.query, res);
    if (!input) return;
    const result = await service.listBillsService(input);
    res.json(result);
  } catch (err: any) {
    console.error('GET /billing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing/pending-orders
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending-orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const result = await service.getPendingOrdersService(branchId);
    res.json({ orders: result });
  } catch (err: any) {
    console.error('GET /billing/pending-orders error:', err.message);
    res.status(500).json({ error: err.message });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// GET /api/billing/reconciliation?date=YYYY-MM-DD&cashierId=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reconciliation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = req.query.date as string;
    const cashierId = req.query.cashierId as string | undefined;
    if (!date) {
      res.status(400).json({ error: 'Query parameter "date" is required' });
      return;
    }
    const result = await service.getReconciliationService(date, cashierId);
    res.json(result);
  } catch (err: any) {
    console.error('GET /billing/reconciliation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing — create invoice
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<CreateBillInput>(CreateBillSchema, req.body, res);
    if (!input) return;
    const result = await service.createBillService(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('POST /billing error:', err.message);
    res.status(err.message.includes('Validation') || err.message.includes('mismatch') ? 422 : 500)
      .json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/cancel  (legacy path — kept for DataContext compatibility)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<CancelBillInput>(CancelBillSchema, req.body, res);
    if (!input) return;
    const result = await service.cancelBillService(input);
    res.json(result);
  } catch (err: any) {
    console.error('POST /billing/cancel error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/add-payment  (legacy path — kept for DataContext compatibility)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/add-payment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<AddPaymentInput>(AddPaymentSchema, req.body, res);
    if (!input) return;
    const result = await service.addPaymentService(input);
    res.json(result);
  } catch (err: any) {
    console.error('POST /billing/add-payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/:id/payments
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<AddPaymentInput>(AddPaymentSchema, { ...req.body, billId: req.params.id }, res);
    if (!input) return;
    const result = await service.addPaymentService(input);
    res.json(result);
  } catch (err: any) {
    console.error('POST /billing/:id/payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/:id/credit-memo
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/credit-memo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<CreditMemoInput>(CreditMemoSchema, req.body, res);
    if (!input) return;
    const result = await service.createCreditMemoService(req.params.id, input);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('POST /billing/:id/credit-memo error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/:id/refund
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/refund', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<RefundInput>(RefundSchema, req.body, res);
    if (!input) return;
    const result = await service.createRefundService(req.params.id, input);
    res.status(201).json(result);
  } catch (err: any) {
    const isClient = ['not found', 'not yet approved', 'must be greater'].some(
      (s) => err.message.includes(s)
    );
    console.error('POST /billing/:id/refund error:', err.message);
    res.status(isClient ? 422 : 500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/create  (legacy path — kept for DataContext compatibility)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = parseOrFail<CreateBillInput>(CreateBillSchema, req.body, res);
    if (!input) return;
    const result = await service.createBillService(input);
    res.status(201).json({ ...result, message: 'Bill created successfully', billId: input.bill.id });
  } catch (err: any) {
    console.error('POST /billing/create error:', err.message);
    res.status(err.message.includes('mismatch') ? 422 : 500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/send-whatsapp  (WhatsApp dispatch — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
import whatsappHandler from './billing.whatsapp';
router.post('/send-whatsapp', whatsappHandler);

export default router;
