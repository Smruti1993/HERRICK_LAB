import { createClient } from '@supabase/supabase-js';

const url = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(url, key);

async function fetchBatchDetails(storeId, itemId) {
  // 1. Get MRP and Batch Date from opening stock
  const { data: openingData } = await supabase
    .from('inventory_opening_stock_items')
    .select('batch_no, mrp, rate, batch_start_date, batch_end_date')
    .eq('item_id', itemId);
    
  const mrpMap = new Map();
  const rateMap = new Map();
  const expiryMap = new Map();
  const batchDateMap = new Map();
  openingData?.forEach(i => {
    const b = (i.batch_no || '').trim().toUpperCase();
    mrpMap.set(b, i.mrp);
    rateMap.set(b, i.rate);
    expiryMap.set(b, i.batch_end_date);
    batchDateMap.set(b, i.batch_start_date);
  });

  // 1b. Get MRP (public_price) and Batch Date from GRN items
  const { data: grnData } = await supabase
    .from('procurement_grn_items')
    .select('batch_code, public_price, rate, batch_date, expiry_date')
    .eq('item_id', itemId);

  grnData?.forEach(i => {
    const b = (i.batch_code || '').trim().toUpperCase();
    if (b) {
      mrpMap.set(b, Number(i.public_price || 0));
      rateMap.set(b, Number(i.rate || 0));
      if (i.expiry_date) expiryMap.set(b, i.expiry_date);
      if (i.batch_date) batchDateMap.set(b, i.batch_date);
    }
  });

  // 2. Aggregate current stock from ledger
  const { data: ledgerData } = await supabase
    .from('inventory_stock_ledger')
    .select('batch_no, stock_in_quantity, stock_out_quantity')
    .eq('store_id', storeId)
    .eq('item_id', itemId);

  console.log("ledgerData retrieved:", ledgerData);

  const stockMap = new Map();
  ledgerData?.forEach(row => {
    const b = (row.batch_no || '').trim().toUpperCase();
    const current = stockMap.get(b) || 0;
    stockMap.set(b, current + Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0));
  });

  console.log("stockMap calculated:", Array.from(stockMap.entries()));

  // Build full batch list: union of ledger + opening stock/GRN batches
  const allBatchNos = new Set([
    ...Array.from(stockMap.keys()),
    ...Array.from(mrpMap.keys())
  ]);

  return Array.from(allBatchNos).map(batchNo => {
    const mrp = mrpMap.get(batchNo) || 0;
    const rate = rateMap.get(batchNo) || 0;
    const currentStock = stockMap.get(batchNo) || 0;
    return {
      batchNo,
      currentStock,
      mrp,
      rate: mrp > 0 ? mrp : rate,
      batchDate: batchDateMap.get(batchNo),
      expiryDate: expiryMap.get(batchNo)
    };
  }).filter(b => b.currentStock > 0 || mrpMap.has(b.batchNo));
}

async function main() {
  const storeId = 'ab178124-1c16-4386-948f-974a2dd5852c'; // CENTRAL WAREHOUSE
  const itemId = 'd145e6ae-bfd7-4101-a1ff-f35b13b53b2b';   // DEF
  
  const result = await fetchBatchDetails(storeId, itemId);
  console.log("\n=== RESULT ===");
  console.log(result);
}

main().catch(console.error);
