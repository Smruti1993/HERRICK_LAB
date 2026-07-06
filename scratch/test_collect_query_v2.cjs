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
  const queries = [
    // 1. Try appointment:appointment_id (original)
    `id, service_order:service_order_id ( service_name, appointment:appointment_id ( id ) )`,
    // 2. Try appointment:appointments (standard)
    `id, service_order:service_order_id ( service_name, appointment:appointments ( id ) )`,
    // 3. Try appointment_id (column name only)
    `id, service_order:service_order_id ( service_name, appointment_id )`,
    // 4. Try appointment (table singular name)
    `id, service_order:service_order_id ( service_name, appointment ( id ) )`
  ];

  for (let q of queries) {
    const { data, error } = await supabase
      .from('lims_lab_orders')
      .select(q)
      .limit(1);
    console.log(`Query: [${q}]`);
    console.log('  Data:', data);
    console.log('  Error:', error ? error.message : 'None');
  }
}
test();
