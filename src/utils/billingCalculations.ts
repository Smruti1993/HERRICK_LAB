export interface CalculateItemInput {
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  taxPercentage: number;
}

export interface CalculateItemResult {
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export const calculateItem = (
  input: CalculateItemInput,
  decimals: number = 2
): CalculateItemResult => {
  const qty = Number(input.quantity || 1);
  const price = Number(input.unitPrice || 0);
  const discPercent = Number(input.discountPercentage || 0);
  const taxPercent = Number(input.taxPercentage || 0);

  const baseSub = qty * price;
  const discountAmount = baseSub * (discPercent / 100);
  const subAfterDisc = baseSub - discountAmount;
  const taxAmount = subAfterDisc * (taxPercent / 100);
  const total = subAfterDisc + taxAmount;

  return {
    discountAmount: Number(discountAmount.toFixed(decimals)),
    taxAmount: Number(taxAmount.toFixed(decimals)),
    total: Number(total.toFixed(decimals))
  };
};

export interface InvoiceItem {
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface CalculateSummaryResult {
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  roundOff: number;
  totalAmount: number;
}

export const calculateSummary = (
  items: InvoiceItem[],
  decimals: number = 2
): CalculateSummaryResult => {
  const grossAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const discountAmount = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  const taxAmount = items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
  
  const netAmount = grossAmount - discountAmount + taxAmount;
  const totalAmount = Math.ceil(netAmount);
  const roundOff = Number((totalAmount - netAmount).toFixed(decimals));

  return {
    grossAmount,
    discountAmount,
    taxAmount,
    netAmount,
    roundOff,
    totalAmount
  };
};

export const validateSplitPayments = (
  payments: Array<{ amount: number }>,
  totalAmount: number
): boolean => {
  const sum = payments.reduce((s, p) => s + p.amount, 0);
  return Math.abs(sum - totalAmount) <= 0.01;
};
