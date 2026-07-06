const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  console.log('Sending GET request to local backend...');
  try {
    const response = await fetch('http://localhost:5005/api/lims/orders/89c6ea80-f732-4c4a-aee0-61254dc8eaf8', {
      headers: {
        'Authorization': 'Bearer demo-token:admin:Admin'
      }
    });
    console.log('HTTP Status:', response.status);
    const body = await response.json();
    console.log('Response:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Request Error:', err);
  }
}
test();
