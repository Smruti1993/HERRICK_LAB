const { createClient } = require('@supabase/supabase-js');
const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';
const supabase = createClient(url, key);

async function test() {
  // Query foreign keys from pg_catalog
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql_text: `
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = 'service_orders';
    `
  });

  if (error) {
    // If execute_sql_query RPC doesn't exist, let's query via standard query if possible
    console.log('RPC error:', error);
    // Let's run a generic select on pg_catalog if we can
    const { data: tables, error: err2 } = await supabase
      .from('service_orders')
      .select('appointment_id')
      .limit(1);
    console.log('Query test:', tables, err2);
  } else {
    console.log('Foreign keys on service_orders:', data);
  }
}
test();
