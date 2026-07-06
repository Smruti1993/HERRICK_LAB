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

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function test() {
  const r1 = await supabase.from('appointments').select('*').limit(1);
  console.log('Sample appointments:', r1.data, r1.error);

  const r2 = await supabase.from('service_orders').select('*').limit(1);
  console.log('Sample service_orders:', r2.data, r2.error);

  const r3 = await supabase.from('lims_lab_orders').select('*').limit(1);
  console.log('Sample lims_lab_orders:', r3.data, r3.error);
}
test();
