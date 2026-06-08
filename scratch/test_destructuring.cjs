const fetchPromiseKeys = [
  "patients",
  "employees",
  "departments",
  "units",
  "service_centres",
  "doctor_availability",
  "appointments",
  "bills",
  "bill_items",
  "payments",
  "clinical_vitals",
  "clinical_diagnoses",
  "clinical_notes",
  "clinical_allergies",
  "clinical_narrative_diagnoses",
  "master_diagnoses",
  "service_definitions",
  "service_tariffs",
  "service_orders",
  "vital_sign_groups",
  "vital_sign_parameters",
  "patient_documents",
  "dental_icd_master",
  "inventory_items",
  "branches",
  "stores",
  "store_item_mappings",
  "inventory_opening_stocks",
  "prescriptions",
  "prescription_items",
  "pharmacy_drug_generics",
  "pharmacy_drug_master",
  "tax_masters",
  "item_tax_mappings",
  "pharmacy_returns",
  "pharmacy_return_items",
  "procurement_vendors",
  "procurement_vendor_terms",
  "procurement_purchase_orders",
  "procurement_purchase_order_items",
  "procurement_grns",
  "procurement_grn_items",
  "procurement_purchase_receipts",
  "procurement_purchase_receipt_items",
  "procurement_purchase_returns",
  "procurement_purchase_return_items",
  "procurement_expiry_returns",
  "procurement_expiry_return_items",
  "finance_chart_of_accounts",
  "finance_journal_vouchers",
  "finance_journal_voucher_items"
];

const destructuringKeys = [
  "patients", // pRes
  "employees", // eRes
  "departments", // dRes
  "units", // uRes
  "service_centres", // sRes
  "doctor_availability", // avRes
  "appointments", // apRes
  "bills", // bRes
  "bill_items", // biRes
  "payments", // payRes
  "clinical_vitals", // vRes
  "clinical_diagnoses", // diRes
  "clinical_notes", // notRes
  "clinical_allergies", // alRes
  "clinical_narrative_diagnoses", // narRes
  "master_diagnoses", // mdRes
  "service_definitions", // sdRes
  "service_tariffs", // stRes
  "service_orders", // ordRes
  "vital_sign_groups", // vsgRes
  "vital_sign_parameters", // vspRes
  "patient_documents", // docRes
  "dental_icd_master", // denRes
  "inventory_items", // invRes
  "branches", // brRes
  "stores", // stRes2
  "store_item_mappings", // mRes
  "inventory_opening_stocks", // osRes
  "prescriptions", // prRes
  "prescription_items", // piRes
  "pharmacy_drug_generics", // dgRes
  "pharmacy_drug_master", // dmRes
  "tax_masters", // tmRes
  "item_tax_mappings", // itmRes
  "pharmacy_returns", // retRes
  "pharmacy_return_items", // retiRes
  "procurement_vendors", // pvRes
  "procurement_vendor_terms", // pvtRes
  "procurement_purchase_orders", // poRes
  "procurement_purchase_order_items", // poiRes
  "procurement_grns", // grnRes
  "procurement_grn_items", // grniRes
  "procurement_purchase_receipts", // prnRes
  "procurement_purchase_receipt_items", // prniRes
  "procurement_purchase_returns", // prtnRes
  "procurement_purchase_return_items", // prtniRes
  "procurement_expiry_returns", // exprRes
  "procurement_expiry_return_items", // expriRes
  "finance_chart_of_accounts", // coaRes
  "finance_journal_vouchers", // jvRes
  "finance_journal_voucher_items" // jviRes
];

console.log("Comparing lengths:", fetchPromiseKeys.length, "vs", destructuringKeys.length);
for (let i = 0; i < Math.max(fetchPromiseKeys.length, destructuringKeys.length); i++) {
  const fKey = fetchPromiseKeys[i];
  const dKey = destructuringKeys[i];
  if (fKey !== dKey) {
    console.log(`Mismatch at index ${i}: fetch=${fKey}, destructure=${dKey}`);
  }
}
