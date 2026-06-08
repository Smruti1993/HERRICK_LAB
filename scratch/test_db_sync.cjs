const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

const tableNames = [
    'patients', 'employees', 'departments', 'units', 'service_centres', 'doctor_availability', 'appointments', 
    'bills', 'bill_items', 'payments', 'clinical_vitals', 'clinical_diagnoses', 'clinical_notes', 
    'clinical_allergies', 'clinical_narrative_diagnoses', 'master_diagnoses', 'service_definitions', 
    'service_tariffs', 'service_orders', 'vital_sign_groups', 'vital_sign_parameters', 'patient_documents', 
    'dental_icd_master', 'inventory_items', 'branches', 'stores', 'store_item_mappings', 
    'inventory_opening_stocks', 'prescriptions', 'prescription_items', 'pharmacy_drug_generics', 'pharmacy_drug_master',
    'tax_masters', 'item_tax_mappings', 'pharmacy_returns', 'pharmacy_return_items',
    'procurement_vendors', 'procurement_vendor_terms',
    'procurement_purchase_orders', 'procurement_purchase_order_items',
    'procurement_grns', 'procurement_grn_items',
    'procurement_purchase_receipts', 'procurement_purchase_receipt_items',
    'procurement_purchase_returns', 'procurement_purchase_return_items',
    'procurement_expiry_returns', 'procurement_expiry_return_items',
    'finance_chart_of_accounts',
    'finance_journal_vouchers',
    'finance_journal_voucher_items'
];

async function testSync() {
  try {
    const promises = [
      supabase.from('patients').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('units').select('*'),
      supabase.from('service_centres').select('*'),
      supabase.from('doctor_availability').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('bills').select('*').order('date', { ascending: false }).limit(5000),
      supabase.from('bill_items').select('*').limit(10000),
      supabase.from('payments').select('*').limit(5000),
      supabase.from('clinical_vitals').select('*').limit(2000),
      supabase.from('clinical_diagnoses').select('*').limit(2000),
      supabase.from('clinical_notes').select('*').limit(2000),
      supabase.from('clinical_allergies').select('*').limit(1000),
      supabase.from('clinical_narrative_diagnoses').select('*').limit(1000),
      supabase.from('master_diagnoses').select('*').limit(1000),
      supabase.from('service_definitions').select('*').limit(2000),
      supabase.from('service_tariffs').select('*').limit(5000),
      supabase.from('service_orders').select('*').limit(5000),
      supabase.from('vital_sign_groups').select('*'),
      supabase.from('vital_sign_parameters').select('*'),
      supabase.from('patient_documents').select('*'),
      supabase.from('dental_icd_master').select('*'),
      supabase.from('inventory_items').select('*, stock:inventory_item_stocks(*), pricing:inventory_item_pricing(*)'),
      supabase.from('branches').select('*'),
      supabase.from('stores').select('*, branches(name)'),
      supabase.from('store_item_mappings').select('*'),
      supabase.from('inventory_opening_stocks').select('*, items:inventory_opening_stock_items(*)'),
      supabase.from('prescriptions').select('*').order('order_date', { ascending: false }).limit(2000),
      supabase.from('prescription_items').select('*').limit(10000),
      supabase.from('pharmacy_drug_generics').select('*'),
      supabase.from('pharmacy_drug_master').select('*'),
      supabase.from('tax_masters').select('*'),
      supabase.from('item_tax_mappings').select('*'),
      supabase.from('pharmacy_returns').select('*').order('return_date', { ascending: false }).limit(2000),
      supabase.from('pharmacy_return_items').select('*').limit(10000),
      supabase.from('procurement_vendors').select('*'),
      supabase.from('procurement_vendor_terms').select('*'),
      supabase.from('procurement_purchase_orders').select('*'),
      supabase.from('procurement_purchase_order_items').select('*'),
      supabase.from('procurement_grns').select('*'),
      supabase.from('procurement_grn_items').select('*'),
      supabase.from('procurement_purchase_receipts').select('*'),
      supabase.from('procurement_purchase_receipt_items').select('*'),
      supabase.from('procurement_purchase_returns').select('*'),
      supabase.from('procurement_purchase_return_items').select('*'),
      supabase.from('procurement_expiry_returns').select('*'),
      supabase.from('procurement_expiry_return_items').select('*'),
      supabase.from('finance_chart_of_accounts').select('*'),
      supabase.from('finance_journal_vouchers').select('*'),
      supabase.from('finance_journal_voucher_items').select('*')
    ];

    const results = await Promise.all(promises);
    
    console.log("Sync Results:");
    results.forEach((r, idx) => {
      if (r.error) {
        console.error(`- Table [${tableNames[idx]}] failed:`, r.error.message);
      } else {
        console.log(`- Table [${tableNames[idx]}] loaded ${r.data ? r.data.length : 0} rows.`);
      }
    });

  } catch (err) {
    console.error("Critical error in testSync:", err);
  }
}

testSync();
