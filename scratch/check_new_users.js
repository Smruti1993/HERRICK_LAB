import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

const supabase = createClient(url, key);

async function main() {
  const { data: users, error } = await supabase.from('app_users').select('*');
  if (error) {
    console.error("Error reading app_users:", error);
  } else {
    console.log("=== NEW DATABASE APP USERS ===");
    console.log(users);
  }
}

main().catch(console.error);
