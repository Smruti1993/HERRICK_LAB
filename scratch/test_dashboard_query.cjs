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
  const { data, error } = await supabase
    .from('lims_lab_orders')
    .select(`
      *,
      service_order:service_order_id (
        id,
        service_name,
        cpt_code,
        appointment:appointment_id (
          id,
          patient:patient_id (
            id, first_name, last_name, gender, date_of_birth
          )
        )
      )
    `);
  console.log('Dashboard query error:', error);
  console.log('Dashboard query data count:', data ? data.length : 0);
}
test();
