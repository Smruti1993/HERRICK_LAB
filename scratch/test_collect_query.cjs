const { createClient } = require('@supabase/supabase-js');
const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase
    .from('lims_lab_orders')
    .select(`
      id,
      barcode_no,
      priority,
      status,
      ordered_at,
      service_order:service_order_id (
        id,
        service_name,
        cpt_code,
        appointment:appointments (
          id,
          patient:patients ( id, first_name, last_name, gender, date_of_birth )
        )
      )
    `)
    .eq('status', 'Ordered');
  console.log('Result data:', JSON.stringify(data, null, 2));
  console.log('Result error:', error);
}
test();
