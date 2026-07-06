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
  const orderId = '89c6ea80-f732-4c4a-aee0-61254dc8eaf8';
  console.log(`Testing direct update on order: ${orderId}...`);
  
  const { data, error } = await supabase
    .from('lims_lab_orders')
    .update({
      accepted_by: '9185e6a4-8ae8-4c60-b3c7-793d89b4700e',
      received_by: '9185e6a4-8ae8-4c60-b3c7-793d89b4700e',
      status: 'Accepted'
    })
    .eq('id', orderId);

  if (error) {
    console.error('Update Error:', error.message);
  } else {
    console.log('Update Succeeded!');
  }
}
test();
