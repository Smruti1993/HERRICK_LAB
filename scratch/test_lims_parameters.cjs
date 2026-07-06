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
  console.log('Querying lims_service_parameters...');
  const { data: params, error: err1 } = await supabase.from('lims_service_parameters').select('*');
  console.log('Parameters found:', params?.length);
  console.log('Parameters:', JSON.stringify(params, null, 2));

  console.log('Querying service_definitions...');
  const { data: services, error: err2 } = await supabase.from('service_definitions').select('id, name, service_type');
  console.log('Services count:', services?.length);
  console.log('Services list:', JSON.stringify(services, null, 2));
}
test();
