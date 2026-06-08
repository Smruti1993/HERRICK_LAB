const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVendorsAndGrns() {
  try {
    const { data: vendors, error: vErr } = await supabase.from('procurement_vendors').select('id, name, code, active');
    if (vErr) throw vErr;
    console.log("Vendors in DB:");
    vendors.forEach(v => {
      console.log(`- ID: ${v.id}, Name: ${v.name}, Code: ${v.code}, Active: ${v.active}`);
    });

    const { data: grns, error: gErr } = await supabase.from('procurement_grns').select('id, grn_no, invoice_no, vendor_id');
    if (gErr) throw gErr;
    console.log("\nGRNs in DB:");
    grns.forEach(g => {
      console.log(`- ID: ${g.id}, GRN No: ${g.grn_no}, Invoice No: ${g.invoice_no}, Vendor ID: ${g.vendor_id}`);
    });

  } catch (err) {
    console.error(err);
  }
}

checkVendorsAndGrns();
