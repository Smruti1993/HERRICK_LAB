import { createClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://wbjtdhtvzlefzjvwhkui.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(HARDCODED_URL, HARDCODED_KEY);

async function checkRecentInvoices() {
  console.log("Fetching recent bills from the database...");

  const { data: bills, error: billError } = await supabase
    .from('bills')
    .select('*')
    .order('date', { ascending: false })
    .limit(5);

  if (billError) {
    console.error("Error fetching recent bills:", billError);
    return;
  }

  for (const bill of bills) {
    console.log(`\n========================================`);
    console.log(`Invoice No: ${bill.invoice_no}`);
    console.log(`ID: ${bill.id}`);
    console.log(`Date: ${bill.date}`);
    console.log(`Status: ${bill.status}`);
    console.log(`Total Amount: ${bill.total_amount}`);

    // Query items
    const { data: items } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', bill.id);

    console.log("Bill Items:");
    items?.forEach((item, index) => {
      console.log(`  Item ${index + 1}: ${item.description} | Type: ${item.item_type} | ID: ${item.item_id}`);
    });

    // Query service orders
    const { data: serviceOrders } = await supabase
      .from('service_orders')
      .select('*')
      .eq('appointment_id', bill.appointment_id || '');

    console.log(`Service Orders linked to appointment: ${bill.appointment_id}`);
    if (!serviceOrders || serviceOrders.length === 0) {
      console.log("  None found.");
    } else {
      serviceOrders.forEach((so) => {
        console.log(`  Order: ${so.service_name} | Billing Status: ${so.billing_status} | Status: ${so.status}`);
      });
    }
  }
}

checkRecentInvoices();
