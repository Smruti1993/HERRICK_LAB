import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function main() {
  console.log("Querying app_users...");
  const { data: users, error: userErr } = await supabase.from('app_users').select('*');
  console.log("Users Error:", userErr);
  console.log("Users Count:", users ? users.length : null);

  console.log("Querying finance_chart_of_accounts...");
  const { data: coa, error: coaErr } = await supabase.from('finance_chart_of_accounts').select('*');
  console.log("COA Error:", coaErr);
  console.log("COA Count:", coa ? coa.length : null);
  
  console.log("Querying finance_journal_vouchers...");
  const { data: jvs, error: jvErr } = await supabase.from('finance_journal_vouchers').select('*');
  console.log("JV Error:", jvErr);
  console.log("JV Count:", jvs ? jvs.length : null);
}

main().catch(console.error);
