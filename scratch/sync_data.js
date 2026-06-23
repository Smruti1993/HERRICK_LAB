import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI / 20849961190.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

// Use the service_role key to bypass RLS
const newUrl = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

const oldSupabase = createClient(oldUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4');
const newSupabase = createClient(newUrl, newKey);

// Ordered topological sort of tables to avoid foreign key violations
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
    'stores',
    'store_item_mappings',
    'inventory_opening_stocks',
    'prescriptions',
    'prescription_items',
    'pharmacy_drug_generics',
    'pharmacy_drug_master',
    'tax_masters',
    'item_tax_mappings',
    'pharmacy_returns',
    'pharmacy_return_items',
    'procurement_vendors',
    'procurement_vendor_terms',
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
    'currency_master',
    'bills',
    'bill_items',
    'payments'
];

async function main() {
  console.log("Starting database clean up in reverse topological order...");
  const reverseTableNames = [...tableNames].reverse();
  for (const name of reverseTableNames) {
    process.stdout.write(`  Clearing ${name}... `);
    const { error } = await newSupabase.from(name).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.log(`[Error: ${error.message}]`);
    } else {
      console.log("[Cleared]");
    }
  }

  console.log("\nStarting data migration from old to new database...");
  for (const name of tableNames) {
    console.log(`[Sync] Reading ${name}...`);
    const { data: rows, error: readError } = await oldSupabase.from(name).select('*');
    
    if (readError) {
      console.error(`  [ERROR] Failed to read ${name}:`, readError.message);
      continue;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`  [Skip] ${name} has 0 rows.`);
      continue;
    }
    
    console.log(`  [Sync] Writing ${rows.length} rows to new database...`);
    const { error: writeError } = await newSupabase.from(name).insert(rows);
    if (writeError) {
      console.error(`  [ERROR] Failed to write ${name}:`, writeError.message);
    } else {
      console.log(`  [SUCCESS] Synced ${name}.`);
    }
  }
  console.log("\nMigration complete!");
}

main().catch(console.error);
