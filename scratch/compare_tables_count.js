import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const newUrl = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

const oldSupabase = createClient(oldUrl, oldKey);
const newSupabase = createClient(newUrl, newKey);

const tableNames = [
    'branches',
    'departments',
    'units',
    'service_centres',
    'employees',
    'app_users',
    'patients',
    'doctor_availability',
    'appointments',
    'clinical_vitals',
    'clinical_diagnoses',
    'clinical_notes',
    'clinical_allergies',
    'clinical_narrative_diagnoses',
    'master_diagnoses',
    'service_definitions',
    'service_tariffs',
    'service_orders',
    'vital_sign_groups',
    'vital_sign_parameters',
    'patient_documents',
    'dental_icd_master',
    'inventory_items',
    'inventory_item_stocks',
    'inventory_item_pricing',
    'stores',
    'store_item_mappings',
    'inventory_opening_stocks',
    'inventory_opening_stock_items',
    'inventory_stock_ledger',
    'pharmacy_drug_generics',
    'pharmacy_drug_master',
    'pharmacy_direct_sales',
    'pharmacy_direct_sale_items',
    'prescriptions',
    'prescription_items',
    'tax_masters',
    'item_tax_mappings',
    'pharmacy_returns',
    'pharmacy_return_items',
    'finance_organizations',
    'insurance_policies',
    'policy_mapped_branches',
    'policy_rules',
    'policy_patient_max_amounts',
    'sponsor_tariffs',
    'procurement_vendors',
    'procurement_vendor_terms',
    'procurement_vendor_compliances',
    'procurement_purchase_orders',
    'procurement_purchase_order_items',
    'procurement_grns',
    'procurement_grn_items',
    'procurement_purchase_receipts',
    'procurement_purchase_receipt_items',
    'procurement_purchase_returns',
    'procurement_purchase_return_items',
    'procurement_expiry_returns',
    'procurement_expiry_return_items',
    'finance_chart_of_accounts',
    'finance_journal_vouchers',
    'finance_journal_voucher_items',
    'procurement_gstr2b_uploads',
    'procurement_gstr2b_invoices',
    'currency_master',
    'bills',
    'bill_items',
    'payments'
];

async function main() {
  console.log("Comparing table counts...");
  console.log("Table Name | Old Count | New Count");
  console.log("-------------------------------------");
  
  for (const name of tableNames) {
    let oldCount = 'N/A';
    let newCount = 'N/A';
    
    try {
      const { count, error } = await oldSupabase.from(name).select('*', { count: 'exact', head: true });
      if (!error) oldCount = count;
    } catch(e) {}
    
    try {
      const { count, error } = await newSupabase.from(name).select('*', { count: 'exact', head: true });
      if (!error) newCount = count;
    } catch(e) {}
    
    console.log(`${name.padEnd(35)} | ${String(oldCount).padStart(9)} | ${String(newCount).padStart(9)}`);
  }
}

main().catch(console.error);
