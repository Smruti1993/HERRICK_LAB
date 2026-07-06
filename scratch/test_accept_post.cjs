const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  console.log('Sending POST accept request...');
  try {
    const payload = {
      labOrderId: '89c6ea80-f732-4c4a-aee0-61254dc8eaf8',
      userId: '9185e6a4-8ae8-4c60-b3c7-793d89b4700e', // admin user ID
      receivedBy: 'Admin Tech',
      labSection: 'Biochemistry',
      rejectionReason: null,
      rejectionComments: null,
      notifyPhysician: true,
      requestResample: true,
      samples: [
        {
          id: 'e53265d5-6a5b-49f8-baca-b0568743f0da',
          status: 'Accepted',
          condition: 'Good',
          section: 'Biochemistry'
        }
      ]
    };

    const response = await fetch('http://localhost:5005/api/lims/orders/accept', {
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
