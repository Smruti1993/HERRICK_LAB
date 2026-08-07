import { createClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://wbjtdhtvzlefzjvwhkui.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(HARDCODED_URL, HARDCODED_KEY);

async function checkUreaOrders() {
  console.log("Searching for service orders with service_name = UREA...");

  const { data: serviceOrders } = await supabase
    .from('service_orders')
    .select('*')
    .eq('service_name', 'UREA')
    .order('order_date', { ascending: false });

  console.log("\n--- UREA Service Orders ---");
  console.log(serviceOrders);
}

checkUreaOrders();
