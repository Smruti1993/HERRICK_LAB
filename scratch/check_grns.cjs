const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJVs() {
  try {
    const { data: jvs, error } = await supabase
      .from('finance_journal_vouchers')
      .select('*');
    if (error) throw error;

    console.log(`Found ${jvs.length} Journal Vouchers:`);
    jvs.forEach(j => {
      console.log(`- ID: ${j.id}, Voucher No: ${j.voucher_no}, Narration: ${j.narration}, Ref No: ${j.ref_doc_no}, Total Debit: ${j.total_debit}`);
    });

  } catch (err) {
    console.error(err);
  }
}

checkJVs();
