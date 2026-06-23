import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

const supabase = createClient(url, key);

async function main() {
  console.log("Testing join query: stores -> branches...");
  const { data, error } = await supabase
    .from('stores')
    .select('*, branches(name)');
    
  if (error) {
    console.error("Query Failed:", error);
  } else {
    console.log("Query Succeeded! Stores list:", data);
  }
}

main().catch(console.error);
