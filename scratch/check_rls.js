import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function checkRLS() {
  console.log("Checking if RLS is active on doctor_schedules...");
  // We can query pg_tables or run a custom raw query if we have an RPC,
  // or we can try to call a simple select.
  // Wait! Let's run a select on pg_class or check it.
  // Actually, we can run a query using PostgREST to see pg_tables if we have access,
  // but if not, let's write a simple query using the postgres client or check RLS status.
  // Wait, does the client have access to query system catalogs?
  // Let's test if we can select from pg_tables.
  const { data, error } = await supabase
    .from('doctor_schedules')
    .insert({
       doctor_id: '1769694978243',
       day_of_week: 1,
       start_time: '10:00:00',
       end_time: '10:30:00',
       slot_type: 'available',
       slot_duration: 30
    });

  if (error) {
     console.log("Direct INSERT failed. Error details:", error);
  } else {
     console.log("Direct INSERT succeeded! Data:", data);
  }
}

checkRLS();
