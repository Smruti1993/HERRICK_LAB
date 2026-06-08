const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countCOA() {
  try {
    const { data: accounts, error } = await supabase
      .from('finance_chart_of_accounts')
      .select('code, name, parent_id')
      .order('code');

    if (error) throw error;
    console.log(`Total Chart of Accounts in DB: ${accounts.length}`);
    accounts.forEach((a, idx) => {
      console.log(`[${idx+1}] Code: ${a.code}, Name: ${a.name}, ParentID: ${a.parent_id}`);
    });
  } catch (err) {
    console.error(err);
  }
}

countCOA();
