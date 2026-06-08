const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGrnStatus() {
  try {
    const { data: grns, error } = await supabase
      .from('procurement_grns')
      .select('*')
      .in('invoice_no', ['7900', '1000']);

    if (error) throw error;
    console.log(`Found ${grns.length} target GRNs:`);
    grns.forEach(g => {
      console.log(`- ID: ${g.id}, GRN No: ${g.grn_no}, Invoice No: ${g.invoice_no}, Status: ${g.status}, Net: ${g.net_amount}`);
    });
  } catch (err) {
    console.error(err);
  }
}

checkGrnStatus();
