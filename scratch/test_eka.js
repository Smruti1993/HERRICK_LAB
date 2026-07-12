const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const EKA_CLIENT_ID = process.env.EKA_CARE_CLIENT_ID;
const EKA_CLIENT_SECRET = process.env.EKA_CARE_CLIENT_SECRET;
const EKA_BASE_URL = process.env.EKA_CARE_BASE_URL || 'https://api.eka.care';

async function runTest() {
  console.log('--- Eka Care Live Connection Test ---');
  console.log(`Base URL: ${EKA_BASE_URL}`);
  console.log(`Client ID: ${EKA_CLIENT_ID}`);
  console.log(`Client Secret: ${EKA_CLIENT_SECRET ? EKA_CLIENT_SECRET.substring(0, 8) + '...' : 'undefined'}`);

  if (!EKA_CLIENT_ID || !EKA_CLIENT_SECRET) {
    console.error('Error: Eka Care credentials are not set in backend/.env');
    return;
  }

  // 1. Authenticate / Login
  let token = null;
  try {
    const loginUrl = `${EKA_BASE_URL}/connect-auth/v1/account/login`;
    console.log(`\n1. Posting to Eka Login: ${loginUrl}`);
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        client_id: EKA_CLIENT_ID,
        client_secret: EKA_CLIENT_SECRET
      })
    });

    const bodyText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${bodyText}`);

    if (response.ok) {
      const data = JSON.parse(bodyText);
      token = data.accessToken || data.token;
      console.log('Login Succeeded! Token obtained.');
    } else {
      console.error('Login Failed.');
      return;
    }
  } catch (err) {
    console.error('Login Exception:', err);
    return;
  }

  // 2. Initiate Aadhaar
  try {
    const initUrl = `${EKA_BASE_URL}/abdm/na/v1/registration/aadhaar/init`;
    console.log(`\n2. Posting to Aadhaar Init: ${initUrl}`);
    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Id': EKA_CLIENT_ID,
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        aadhaar: '975382191745'
      })
    });

    const bodyText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${bodyText}`);
  } catch (err) {
    console.error('Aadhaar Init Exception:', err);
  }
}

runTest();
