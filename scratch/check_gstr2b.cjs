const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGSTR2B() {
  try {
    const { data: uploads, error: uploadErr } = await supabase.from('procurement_gstr2b_uploads').select('*');
    if (uploadErr) throw uploadErr;
    console.log(`Found ${uploads.length} uploads:`);
    uploads.forEach(u => {
      console.log(`- Upload ID: ${u.id}, Period: ${u.period}, Reconciled: ${u.is_reconciled}, File: ${u.file_name}`);
    });

    const { data: invoices, error: invoiceErr } = await supabase.from('procurement_gstr2b_invoices').select('*');
    if (invoiceErr) throw invoiceErr;
    console.log(`\nFound ${invoices.length} invoices across uploads:`);
    invoices.forEach(i => {
      console.log(`- Invoice No: ${i.invoice_no}, Upload ID: ${i.upload_id}, Tax: ${i.tax_amount}, Supplier: ${i.supplier_name}`);
    });

    const { data: accounts, error: coaErr } = await supabase.from('finance_chart_of_accounts').select('*').in('code', ['133000', '134000', '131000', '132000']);
    if (coaErr) throw coaErr;
    console.log(`\nChart of Accounts:`);
    accounts.forEach(a => {
      console.log(`- ID: ${a.id}, Code: ${a.code}, Name: ${a.name}`);
    });

    const { data: grns, error: grnErr } = await supabase.from('procurement_grns').select('*');
    if (grnErr) throw grnErr;
    console.log(`\nFound ${grns.length} GRNs in DB:`);
    grns.forEach(g => {
      console.log(`- GRN ID: ${g.id}, GRN No: ${g.grn_no}, Invoice No: ${g.invoice_no}, Net: ${g.net_amount}`);
    });

  } catch (err) {
    console.error(err);
  }
}

checkGSTR2B();
