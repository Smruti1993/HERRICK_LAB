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
  console.log(`Checking database for order: ${orderId}`);
  
  const { data: order, error: oErr } = await supabase
    .from('lims_lab_orders')
    .select('*')
    .eq('id', orderId)
    .single();
    
  console.log('Order status:', order?.status);
  console.log('Order:', JSON.stringify(order, null, 2));

  const { data: samples, error: sErr } = await supabase
    .from('lims_samples')
    .select('*')
    .eq('lab_order_id', orderId);

  console.log('Samples count:', samples?.length);
  console.log('Samples:', JSON.stringify(samples, null, 2));
}
test();
