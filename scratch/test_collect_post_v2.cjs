const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  console.log('Sending POST collect request with real user ID...');
  try {
    const payload = {
      labOrderIds: ['89c6ea80-f732-4c4a-aee0-61254dc8eaf8'],
      userId: '9185e6a4-8ae8-4c60-b3c7-793d89b4700e', // Real admin ID
      collectorBadge: 'TECH100',
      collectionRemarks: 'Test remarks',
      identityVerified: true,
      consentObtained: true,
      samples: []
    };

    const response = await fetch('http://localhost:5005/api/lims/orders/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token:admin:Admin'
      },
      body: JSON.stringify(payload)
    });
    console.log('HTTP Status:', response.status);
    const body = await response.text();
    console.log('Response Body:', body);
  } catch (err) {
    console.error('Request Error:', err);
  }
}
test();
