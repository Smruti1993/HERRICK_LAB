import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function checkDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, code, status');

  if (error) {
    console.error("Error reading departments:", error);
    return;
  }

  console.log(`Success! Found ${data.length} departments:`);
  console.log(JSON.stringify(data, null, 2));
}

checkDepartments();
