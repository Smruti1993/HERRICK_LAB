const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co/rest/v1/';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg4NjAzNSwiZXhwIjoyMDk3NDYyMDM1fQ.dZTgVrHQZ0V22iwZCDWS60OsK68LetsA7xd5d3FsCo0';

async function test() {
  const response = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await response.json();
  // Filter for service_orders schema
  console.log('service_orders columns/properties:', Object.keys(data.definitions.service_orders.properties));
}
test();
