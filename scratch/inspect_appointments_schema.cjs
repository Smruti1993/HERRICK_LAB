const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

const url = env.SUPABASE_URL + '/rest/v1/';
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  const response = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await response.json();
  console.log('appointments properties:', data.definitions.appointments.properties);
  console.log('appointments required keys:', data.definitions.appointments.required);
}
test();
