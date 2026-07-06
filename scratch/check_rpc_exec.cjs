const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const sql = `ALTER TABLE lims_lab_orders DROP CONSTRAINT IF EXISTS lims_lab_orders_collected_by_fkey;`;
  
  // Try exec_sql
  console.log('Trying RPC exec_sql...');
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { sql });
  console.log('exec_sql:', d1, e1?.message);

  // Try run_sql
  console.log('Trying RPC run_sql...');
  const { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql });
  console.log('run_sql:', d2, e2?.message);
}
test();
