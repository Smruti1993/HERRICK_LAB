const EKA_CLIENT_ID = 'EC_1783574081564';
const EKA_CLIENT_SECRET = 'eka_1c033f264ba8448a88846618';
const EKA_BASE_URL = 'https://api.eka.care';

async function runTest() {
  // 1. Authenticate / Login
  let token = null;
  try {
    const response = await fetch(`${EKA_BASE_URL}/connect-auth/v1/account/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Accept-Encoding': 'identity'
      },
      body: JSON.stringify({
        client_id: EKA_CLIENT_ID,
        client_secret: EKA_CLIENT_SECRET
      })
    });

    const bodyText = await response.text();
    if (response.ok) {
      token = JSON.parse(bodyText).accessToken;
    } else {
      console.error('Login Failed:', bodyText);
      return;
    }
  } catch (err) {
    console.error('Login Exception:', err);
    return;
  }

  // 2. Try variations of the Aadhaar field
  const variations = [
    { aadhaar_number: '975382191745' },
    { aadhaarNumber: '975382191745' },
    { AadhaarNumber: '975382191745' },
    { aadhaar: '975382191745' }
  ];

  for (const payload of variations) {
    const keyUsed = Object.keys(payload)[0];
    console.log(`\nTesting payload with key: "${keyUsed}"`);
    try {
      const response = await fetch(`${EKA_BASE_URL}/abdm/na/v1/registration/aadhaar/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-Id': EKA_CLIENT_ID,
          'User-Agent': 'Mozilla/5.0',
          'Accept-Encoding': 'identity'
        },
        body: JSON.stringify(payload)
      });

      const bodyText = await response.text();
      console.log(`Response Status: ${response.status}`);
      console.log(`Response Body: ${bodyText}`);
    } catch (err) {
      console.error(`Exception with "${keyUsed}":`, err.message);
    }
  }
}

runTest();
