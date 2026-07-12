const dotenv = require('dotenv');
const ws = require('ws');
global.WebSocket = ws;

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function clearTable() {
  console.log('Connecting to Supabase:', supabaseUrl);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('Deleting all records from patient_demographics...');
  const { data, error } = await supabaseAdmin
    .from('patient_demographics')
    .delete()
    .neq('id', 0); // Delete all rows where id != 0
    
  if (error) {
    console.error('Failed to clear patient_demographics:', error);
  } else {
    console.log('Successfully cleared patient_demographics table.');
  }
}

clearTable();
