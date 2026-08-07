import { 
  calculateItem, 
  calculateSummary, 
  validateSplitPayments 
} from './billingCalculations';

// A simple custom test assertion suite
const assertions = {
  equal: (actual: any, expected: any, message?: string) => {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
  },
  deepEqual: (actual: any, expected: any, message?: string) => {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
      throw new Error(`${message || 'Assertion failed'}: expected ${expStr}, got ${actStr}`);
    }
  },
  truthy: (val: any, message?: string) => {
    if (!val) {
      throw new Error(`${message || 'Assertion failed'}: expected truthy value`);
    }
  },
  falsy: (val: any, message?: string) => {
    if (val) {
      throw new Error(`${message || 'Assertion failed'}: expected falsy value`);
    }
  }
};

const runTests = () => {
  console.log("=== RUNNING BILLING CALCULATIONS UNIT TESTS ===");
  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  // --- 1. Item Level Calculations ---
  test("calculateItem: Zero discount and Zero tax", () => {
    const res = calculateItem({
      quantity: 2,
      unitPrice: 150,
      discountPercentage: 0,
      taxPercentage: 0
    });
    assertions.equal(res.discountAmount, 0);
    assertions.equal(res.taxAmount, 0);
    assertions.equal(res.total, 300);
  });

  test("calculateItem: Item level discount only", () => {
    const res = calculateItem({
      quantity: 1,
      unitPrice: 100,
      discountPercentage: 10,
      taxPercentage: 0
    });
    assertions.equal(res.discountAmount, 10);
    assertions.equal(res.taxAmount, 0);
    assertions.equal(res.total, 90);
  });

  test("calculateItem: Item level discount and tax combined", () => {
    const res = calculateItem({
      quantity: 2,
      unitPrice: 100, // base sub = 200
      discountPercentage: 10, // disc = 20, subAfterDisc = 180
      taxPercentage: 5 // tax = 9
    });
    assertions.equal(res.discountAmount, 20);
    assertions.equal(res.taxAmount, 9);
    assertions.equal(res.total, 189);
  });

  test("calculateItem: Rounding edge case", () => {
    // Total sub = 2.055 -> rounded to 2 decimals
    const res = calculateItem({
      quantity: 1,
      unitPrice: 2.055,
      discountPercentage: 0,
      taxPercentage: 0
    });
    assertions.equal(res.total, 2.06);
  });

  test("calculateItem: BHD Currency with 3 decimals", () => {
    const res = calculateItem({
      quantity: 1,
      unitPrice: 2.055,
      discountPercentage: 10, // base = 2.055, disc = 0.2055 -> 0.206
      taxPercentage: 5 // sub = 1.8495, tax = 0.092475 -> 0.092
    }, 3);
    assertions.equal(res.discountAmount, 0.206);
    assertions.equal(res.taxAmount, 0.092);
    assertions.equal(res.total, 1.942); // subAfterDisc (1.8495) + tax (0.092475) = 1.941975 -> 1.942
  });

  // --- 2. Invoice Summary Calculations ---
  test("calculateSummary: Multi-item summary totals", () => {
    const items = [
      { quantity: 2, unitPrice: 50, discountAmount: 10, taxAmount: 9, total: 99 },
      { quantity: 1, unitPrice: 100, discountAmount: 0, taxAmount: 15, total: 115 }
    ];
    const summary = calculateSummary(items);
    assertions.equal(summary.grossAmount, 200); // 2*50 + 1*100
    assertions.equal(summary.discountAmount, 10);
    assertions.equal(summary.taxAmount, 24); // 9 + 15
    assertions.equal(summary.netAmount, 214); // 200 - 10 + 24
    assertions.equal(summary.totalAmount, 214); // Math.ceil(214) = 214
    assertions.equal(summary.roundOff, 0);
  });

  test("calculateSummary: Rounding-edge summary totals", () => {
    const items = [
      { quantity: 1, unitPrice: 20.35, discountAmount: 0, taxAmount: 0, total: 20.35 }
    ];
    const summary = calculateSummary(items);
    assertions.equal(summary.grossAmount, 20.35);
    assertions.equal(summary.netAmount, 20.35);
    assertions.equal(summary.totalAmount, 21); // Math.ceil(20.35) = 21
    assertions.equal(summary.roundOff, 0.65); // 21 - 20.35 = 0.65
  });

  // --- 3. Split Payment Verification ---
  test("validateSplitPayments: Accepts when equal", () => {
    const payments = [
      { amount: 150 },
      { amount: 50 }
    ];
    const isValid = validateSplitPayments(payments, 200);
    assertions.truthy(isValid);
  });

  test("validateSplitPayments: Rejects when not equal", () => {
    const payments = [
      { amount: 150 },
      { amount: 40 }
    ];
    const isValid = validateSplitPayments(payments, 200);
    assertions.falsy(isValid);
  });

  console.log("\n=== TEST RUN RESULTS ===");
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Check if run directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
} else {
  // ESM or direct execution fallback
  runTests();
}
