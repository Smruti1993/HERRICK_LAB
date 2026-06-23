import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const newUrl = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

const oldSupabase = createClient(oldUrl, oldKey);
const newSupabase = createClient(newUrl, newKey);

async function main() {
  const tableName = 'inventory_opening_stock_items';
  console.log(`Reading ${tableName} from old database...`);
  const { data: rows, error: readError } = await oldSupabase.from(tableName).select('*');
  if (readError) {
    console.error("Error reading from old database:", readError);
    return;
  }
  
  console.log(`Found ${rows.length} rows. Writing to new database...`);
  const { error: writeError } = await newSupabase.from(tableName).insert(rows);
  if (writeError) {
    console.error("Error writing to new database:", writeError);
    return;
  }
  
  console.log("Sync complete!");
}

main().catch(console.error);
