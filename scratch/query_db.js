import { createClient } from '@supabase/supabase-js';

const url = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(url, key);

async function main() {
  const { data: vendors, error: vErr } = await supabase.from('procurement_vendors').select('*');
  if (vErr) {
    console.error('Vendors error:', vErr);
    return;
  }
  console.log('Vendors:', vendors.map(v => ({ id: v.id, name: v.name, code: v.code })));

  const { data: grns, error: gErr } = await supabase.from('procurement_grns').select('*');
  if (gErr) {
    console.error('GRNs error:', gErr);
    return;
  }
  console.log('GRNs:', grns.map(g => ({ id: g.id, grn_no: g.grn_no, vendor_id: g.vendor_id, invoice_no: g.invoice_no, net_amount: g.net_amount, gross_amount: g.gross_amount, status: g.status })));
}

main().catch(console.error);
