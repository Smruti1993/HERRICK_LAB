import { createClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://wbjtdhtvzlefzjvwhkui.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(HARDCODED_URL, HARDCODED_KEY);

async function checkTriggers() {
  console.log("Querying database triggers and functions on service_orders table...");

  // Query triggers on service_orders
  const queryTriggers = `
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement,
      action_orientation
    FROM information_schema.triggers
    WHERE event_object_table = 'service_orders';
  `;

  // Query functions related to triggers
  const queryFunctions = `
    SELECT 
      proname,
      prosrc
    FROM pg_proc
    WHERE proname ILIKE '%service_order%' OR proname ILIKE '%lab_order%';
  `;

  const { data: triggerData, error: triggerError } = await supabase.rpc('execute_sql', { sql_query: queryTriggers });
  if (triggerError) {
    // If execute_sql RPC doesn't exist, we can use a select query or we might not have RPC. Let's try running a direct query via a custom SQL executor if available.
    console.error("RPC execute_sql failed:", triggerError);
    return;
  }
  
  console.log("\n--- Triggers ---");
  console.log(triggerData);

  const { data: functionData } = await supabase.rpc('execute_sql', { sql_query: queryFunctions });
  console.log("\n--- Functions ---");
  console.log(functionData);
}

// Wait! If RPC execute_sql is not available on Supabase anon role, let's check what RPCs are available.
checkTriggers();
