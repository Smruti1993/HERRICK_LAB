
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReturns() {
    const invoiceNo = 'INV-D-HUMC-26262626000004';
    
    // Find bill ID
    const { data: bills } = await supabase.from('bills').select('id').eq('invoiceNo', invoiceNo);
    if (!bills || bills.length === 0) {
        console.log("Bill not found");
        return;
    }
    const billId = bills[0].id;
    console.log("Bill ID:", billId);

    // Find returns
    const { data: returns } = await supabase.from('pharmacy_returns').select('*').eq('original_bill_id', billId);
    console.log("Returns count:", returns?.length);
    
    if (returns) {
        for (const r of returns) {
            const { data: items } = await supabase.from('pharmacy_return_items').select('*').eq('return_id', r.id);
            console.log(`Return ${r.return_no}:`, items?.length, "items");
            items?.forEach(i => console.log(` - Item ${i.item_id}: Qty ${i.quantity}`));
        }
    }
}

checkReturns();
