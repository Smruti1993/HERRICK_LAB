const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount130000() {
  try {
    const { data: accounts, error } = await supabase
      .from('finance_chart_of_accounts')
      .select('*')
      .or('code.eq.130000,code.eq.131000,code.eq.132000,code.eq.133000,code.eq.134000,code.eq.135000,code.eq.136000');

    if (error) throw error;
    console.log(`Found ${accounts.length} accounts:`);
    accounts.forEach(a => {
      console.log(`- ID: ${a.id}, Code: ${a.code}, Name: ${a.name}, ParentID: ${a.parent_id}`);
    });
  } catch (err) {
    console.error(err);
  }
}

checkAccount130000();
