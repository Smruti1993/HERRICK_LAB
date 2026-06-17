import { createClient } from '@supabase/supabase-js';

const url = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(url, key);

async function main() {
  console.log("=== INSPECTING BATCH B-7647 ===");

  // 1. Query opening stock items
  const { data: openingItems, error: opErr } = await supabase
    .from('inventory_opening_stock_items')
    .select('*, inventory_opening_stocks(store_id, stores(store_name))')
    .ilike('batch_no', 'B-7647');

  if (opErr) console.error("Opening Items Error:", opErr);
  else {
    console.log("\n--- Opening Stock Items ---");
    console.log(JSON.stringify(openingItems, null, 2));
  }

  // 2. Query GRN items
  const { data: grnItems, error: grnErr } = await supabase
    .from('procurement_grn_items')
    .select('*, procurement_grns(store_id, stores(store_name))')
    .ilike('batch_code', 'B-7647');

  if (grnErr) console.error("GRN Items Error:", grnErr);
  else {
    console.log("\n--- GRN Items ---");
    console.log(JSON.stringify(grnItems, null, 2));
  }

  // 3. Query Stock Ledger entries
  const { data: ledgerEntries, error: ledgerErr } = await supabase
    .from('inventory_stock_ledger')
    .select('*, stores(store_name)')
    .ilike('batch_no', 'B-7647');

  if (ledgerErr) console.error("Ledger Error:", ledgerErr);
  else {
    console.log("\n--- Stock Ledger Entries ---");
    console.log(JSON.stringify(ledgerEntries, null, 2));
  }
}

main().catch(console.error);
