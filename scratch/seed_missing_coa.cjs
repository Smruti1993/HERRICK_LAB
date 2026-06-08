const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedMissingAccounts() {
  try {
    // Find Duties & Taxes Receivable account (code 130000)
    const { data: parentAccs, error: parentErr } = await supabase
      .from('finance_chart_of_accounts')
      .select('id')
      .eq('code', '130000');
    
    if (parentErr) throw parentErr;
    if (!parentAccs || parentAccs.length === 0) {
      console.error("Parent account 130000 not found!");
      return;
    }
    const parentId = parentAccs[0].id;
    console.log(`Found parent ID: ${parentId}`);

    const newAccounts = [
      {
        code: '133000',
        name: 'Input CGST (Approved)',
        account_type: 'Asset',
        account_group: 'Assets',
        balance_nature: 'Debit',
        is_group: false,
        system_purpose: 'The verified central tax vault. Unlocked by matching excel files to reduce tax liabilities.',
        parent_id: parentId,
        status: 'Active'
      },
      {
        code: '134000',
        name: 'Input SGST (Approved)',
        account_type: 'Asset',
        account_group: 'Assets',
        balance_nature: 'Debit',
        is_group: false,
        system_purpose: 'The verified state tax vault. Unlocked by matching excel files to reduce tax liabilities.',
        parent_id: parentId,
        status: 'Active'
      }
    ];

    const { data, error } = await supabase
      .from('finance_chart_of_accounts')
      .upsert(newAccounts, { onConflict: 'code' })
      .select();

    if (error) throw error;
    console.log("Seeded successfully:", data);

  } catch (err) {
    console.error("Error seeding missing accounts:", err);
  }
}

seedMissingAccounts();
