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
  console.log('Querying app_users...');
  const { data, error } = await supabase.from('app_users').select('*');
  console.log('Users found:', data?.length);
  console.log('Users:', JSON.stringify(data, null, 2));
}
test();
