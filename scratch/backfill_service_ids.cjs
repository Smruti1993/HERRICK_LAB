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
  console.log('Updating service_orders to backfill service_id...');
  
  // We perform the update by querying the service definitions first, then updating matches
  const { data: services, error: sErr } = await supabase
    .from('service_definitions')
    .select('id, name');
    
  if (sErr) {
    console.error('Error fetching service definitions:', sErr);
    return;
  }

  console.log(`Fetched ${services.length} service definitions.`);

  for (const s of services) {
    const { data: updated, error: uErr } = await supabase
      .from('service_orders')
      .update({ service_id: s.id })
      .is('service_id', null)
      .ilike('service_name', s.name);

    if (uErr) {
      console.error(`Error updating for service ${s.name}:`, uErr);
    } else {
      console.log(`Backfilled service_id for service: ${s.name}`);
    }
  }

  console.log('Backfill completed.');
}
test();
