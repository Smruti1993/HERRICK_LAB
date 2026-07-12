import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// DB Credentials
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err: any) {
    console.error('Failed to initialize supabaseAdmin:', err.message);
  }
}

// Eka Care Credentials
const EKA_CLIENT_ID = (process.env.EKA_CARE_CLIENT_ID || '').trim();
const EKA_CLIENT_SECRET = (process.env.EKA_CARE_CLIENT_SECRET || '').trim();
const EKA_BASE_URL = (process.env.EKA_CARE_BASE_URL || 'https://api.eka.care').trim();

// Token caching variables
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number | null = null; // Timestamp in milliseconds
let lastLoginError: string | null = null; // Captures last authentication failure reason

// Generate or retrieve Eka Care Access Token (cached for 30 minutes)
async function getEkaAccessToken(): Promise<string | null> {
  if (cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 120000) {
    return cachedAccessToken;
  }

  console.log('Generating fresh Eka Care access token...');
  try {
    const loginUrl = `${EKA_BASE_URL}/connect-auth/v1/account/login`;
    const response = await fetch(loginUrl, {
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

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Failed to fetch Eka Care access token:', responseText);
      lastLoginError = `HTTP ${response.status} - ${responseText.slice(0, 200)}`;
      return null;
    }

    const data = JSON.parse(responseText);
    // Eka Care returns snake_case: access_token, expires_in
    cachedAccessToken = data.access_token || data.accessToken || data.token || null;
    
    if (!cachedAccessToken) {
      console.error('Eka Care login succeeded but no token found in response:', responseText.slice(0, 200));
      lastLoginError = 'Login OK but no access_token in response';
      return null;
    }

    // Default expiration is 30 minutes (1800 seconds)
    const expiresSec = data.expires_in || data.expiresIn || 1800;
    tokenExpiryTime = Date.now() + expiresSec * 1000;
    console.log('Eka Care access token successfully generated and cached.');
    return cachedAccessToken;
  } catch (err) {
    console.error('Exception during Eka Care token generation:', err);
    return null;
  }
}

// 10-Minute Session Storage for mapping client requests to Eka transaction IDs
const otpSessions = new Map<string, { txnId: string; createdAt: number }>();

// Clean up expired sessions periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of otpSessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      otpSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

// 1. Initiate Aadhaar Verification (Sprout OTP)
router.post('/init-auth', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body; // Aadhaar Number (12 digits)

    if (!id || !id.trim()) {
      res.status(400).json({ error: 'Missing Aadhaar number' });
      return;
    }

    console.log(`ABDM Aadhaar Init Auth requested for identifier: ${id.replace(/./g, '*')}`);

    // If Eka Care credentials are configured, execute live request
    if (EKA_CLIENT_ID && EKA_CLIENT_SECRET) {
      const token = await getEkaAccessToken();
      if (!token) {
        res.status(502).json({ 
          error: `Failed to authenticate with Eka Care auth server. Eka Care responded: ${lastLoginError || 'Access Denied'}` 
        });
        return;
      }

      const initUrl = `${EKA_BASE_URL}/abdm/na/v1/registration/aadhaar/init`;
      console.log('Sending Aadhaar init request to Eka Care API:', initUrl);
      try {
        const response = await fetch(initUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-Id': EKA_CLIENT_ID,
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'identity'
          },
          body: JSON.stringify({ aadhaar_number: id })
        });

        const responseText = await response.text();
        console.log(`Eka Care Init Response Status: ${response.status}`);
        
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          res.status(502).json({ 
            error: `Eka Care returned invalid format (Status ${response.status}): ${responseText.slice(0, 150)}...` 
          });
          return;
        }

        if (!response.ok) {
          console.error('Eka Care API returned error during Aadhaar init:', data);
          res.status(502).json({ error: data.message || `Aadhaar verification initialization failed: status ${response.status}` });
          return;
        }

        // Eka Care returns txn_id (snake_case)
        const txnId = data.txn_id || data.txnId;
        const hint = data.hint || 'OTP sent to Aadhaar registered mobile!';

        if (!txnId) {
          console.error('Eka Care init succeeded but no txn_id in response:', responseText);
          res.status(502).json({ error: 'Eka Care did not return a transaction ID. Response: ' + responseText.slice(0, 200) });
          return;
        }

        otpSessions.set(id, { txnId, createdAt: Date.now() });
        console.log(`OTP session stored. txnId: ${txnId}`);

        res.json({
          success: true,
          txnId,
          message: hint
        });
        return;
      } catch (err: any) {
        console.error('Failed to contact Eka Care API:', err);
        res.status(500).json({ error: `Connection to Eka Care failed: ${err.message}` });
        return;
      }
    }

    // Demo / Simulation Mode fallback
    console.log('Eka Care credentials not fully set. Running in Demo Simulation Mode.');
    const generatedTxnId = `txn_demo_${Math.random().toString(36).substr(2, 9)}`;
    otpSessions.set(id, { txnId: generatedTxnId, createdAt: Date.now() });
    
    res.json({
      success: true,
      txnId: generatedTxnId,
      message: 'Demo OTP sent successfully (use code 482012 to verify)'
    });
  } catch (err: any) {
    console.error('ABDM Aadhaar Init Auth error:', err);
    res.status(500).json({ error: 'Internal server error during verification initialization' });
  }
});

// 2. Verify Aadhaar OTP (Returns linked ABHA addresses if any)
router.post('/verify-otp', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { txnId, otp, mobile } = req.body;

    if (!txnId || !otp) {
      res.status(400).json({ error: 'Missing txnId or otp code' });
      return;
    }

    if (!mobile) {
      res.status(400).json({ error: 'Missing mobile number. Please enter the mobile number to link with ABHA.' });
      return;
    }

    console.log(`ABDM Aadhaar Verify OTP requested for txnId: ${txnId}`);

    // If Eka Care credentials are configured, execute live request
    if (EKA_CLIENT_ID && EKA_CLIENT_SECRET) {
      const token = await getEkaAccessToken();
      if (!token) {
        res.status(502).json({ 
          error: `Failed to authenticate with Eka Care auth server. Eka Care responded: ${lastLoginError || 'Access Denied'}` 
        });
        return;
      }

      const verifyUrl = `${EKA_BASE_URL}/abdm/na/v1/registration/aadhaar/verify`;
      console.log('Sending Aadhaar verification request to Eka Care API:', verifyUrl);
      try {
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-Id': EKA_CLIENT_ID,
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'identity'
          },
          // Eka Care expects txn_id (snake_case), otp, and mobile
          body: JSON.stringify({ txn_id: txnId, otp, mobile })
        });

        const responseText = await response.text();
        console.log(`Eka Care Verify Response Status: ${response.status}`);
        
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          res.status(502).json({ 
            error: `Eka Care returned invalid format (Status ${response.status}): ${responseText.slice(0, 150)}...` 
          });
          return;
        }

        if (!response.ok) {
          const errMsg = data.error || data.message || data.detail || data.msg || responseText.slice(0, 300);
          console.error(`Eka Care verify failed [${response.status}]:`, responseText);
          res.status(502).json({ 
            error: `OTP verification failed: ${errMsg}`,
            ekaStatus: response.status,
            ekaBody: data
          });
          return;
        }

        console.log('Eka Care Verify Body:', responseText.slice(0, 400));

        // Eka Care returns txn_id (snake_case). PHR addresses may come in multiple shapes:
        const newTxnId = data.txn_id || data.txnId || txnId;
        const phrList: string[] = (
          data.phrAddresses ||
          data.phr_addresses ||
          (data.profile && (data.profile.abha_address || data.profile.abhaAddress) ? [data.profile.abha_address || data.profile.abhaAddress] : null) ||
          (data.phrAddress ? [data.phrAddress] : null) ||
          (data.phr_address ? [data.phr_address] : null) ||
          (data.accounts ? data.accounts.map((a: any) => a.phrAddress || a.phr_address) : null) ||
          []
        );

        res.json({
          success: true,
          txnId: newTxnId,
          phrAddresses: phrList
        });
        return;
      } catch (err: any) {
        console.error('Failed to verify via Eka Care API:', err);
        res.status(500).json({ error: `Connection to Eka Care failed: ${err.message}` });
        return;
      }
    }

    // Demo / Simulation Mode fallback
    console.log('Eka Care credentials not fully set. Running in Demo Simulation Mode.');
    if (otp !== '482012') {
      res.status(400).json({ error: 'Invalid OTP code. For demo, use 482012.' });
      return;
    }

    res.json({
      success: true,
      txnId: `txn_demo_verified_${Math.random().toString(36).substr(2, 9)}`,
      phrAddresses: ['rahul123@abdm', 'rahul.sharma@abdm']
    });
  } catch (err: any) {
    console.error('ABDM Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error during OTP verification' });
  }
});

// Helper function to save demographic profile to Supabase database
async function saveProfileToDatabase(profile: any): Promise<any> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized.');
  }

  // Map gender string to CHAR(1)
  let genderChar = 'O';
  if (profile.gender === 'Male' || profile.gender === 'M') {
    genderChar = 'M';
  } else if (profile.gender === 'Female' || profile.gender === 'F') {
    genderChar = 'F';
  }

  // Step A: Upsert into patient_demographics table
  const { data: demData, error: demError } = await supabaseAdmin
    .from('patient_demographics')
    .upsert({
      abha_number: profile.abhaNumber,
      abha_address: profile.abhaAddress,
      eka_oid: profile.ekaOid,
      eka_uuid: profile.ekaUuid,
      first_name: profile.firstName,
      middle_name: profile.middleName || '',
      last_name: profile.lastName,
      full_name: profile.fullName,
      gender: genderChar,
      year_of_birth: profile.yearOfBirth || null,
      month_of_birth: profile.monthOfBirth || null,
      day_of_birth: profile.dayOfBirth || null,
      mobile: profile.mobile,
      address: profile.address,
      pincode: profile.pincode,
      state_name: profile.stateName,
      district_name: profile.districtName,
      kyc_verified: profile.kycVerified ?? false,
      profile_photo_b64: profile.profilePhotoB64 || '',
      source: 'abdm',
      updated_at: new Date().toISOString()
    }, { onConflict: 'abha_number' })
    .select();

  if (demError) {
    console.error('Failed to upsert patient_demographics:', demError);
    throw new Error(`Database save failed (demographics): ${demError.message}`);
  }

  return { demographics: demData?.[0] };
}

// 3. Aadhaar Auto-Login (Fetches patient demographics and directly saves to the tables)
router.post('/phr-login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phrAddress, txnId, patientId } = req.body;

    if (!phrAddress || !txnId) {
      res.status(400).json({ error: 'Missing phrAddress or txnId parameters' });
      return;
    }

    console.log(`ABDM Aadhaar Auto-Login requested for PHR Address: ${phrAddress}, txnId: ${txnId}, patientId: ${patientId || 'none'}`);

    // If Eka Care credentials are configured, execute live request
    if (EKA_CLIENT_ID && EKA_CLIENT_SECRET) {
      const token = await getEkaAccessToken();
      if (!token) {
        res.status(502).json({ 
          error: `Failed to authenticate with Eka Care auth server. Eka Care responded: ${lastLoginError || 'Access Denied'}` 
        });
        return;
      }

      const loginUrl = `${EKA_BASE_URL}/abdm/na/v1/registration/aadhaar/auto-login`;
      console.log('Sending auto-login request to Eka Care API:', loginUrl);
      try {
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-Id': EKA_CLIENT_ID,
            'User-Agent': 'Mozilla/5.0',
            'Accept-Encoding': 'identity'
          },
          body: JSON.stringify({ 
            phr_address: phrAddress,
            phrAddress: phrAddress,
            abha_address: phrAddress,
            abhaAddress: phrAddress,
            txn_id: txnId,
            txnId: txnId
          })
        });

        const responseText = await response.text();
        console.log(`Eka Care Login Response Status: ${response.status}`);
        
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          res.status(502).json({ 
            error: `Eka Care returned invalid format (Status ${response.status}): ${responseText.slice(0, 150)}...` 
          });
          return;
        }

        if (!response.ok) {
          const errMsg = data.error || data.message || data.detail || data.msg || responseText.slice(0, 300);
          console.error(`Eka Care auto-login failed [${response.status}]:`, responseText);
          res.status(502).json({ 
            error: `Auto-login failed: ${errMsg}`,
            ekaStatus: response.status,
            ekaBody: data
          });
          return;
        }

        console.log('Eka Care Auto-Login Full Response Body:', responseText);

        // Read profile data which can be at root level or nested inside profile object
        const p = data.profile || {};
        const profile = {
          abhaNumber: p.abha_number || p.abhaNumber || p.healthIdNumber || p.health_id_number || data.abha_number || data.abhaNumber || data.healthIdNumber || data.health_id_number || '',
          abhaAddress: phrAddress || p.abha_address || p.abhaAddress || data.abha_address || data.abhaAddress || '',
          ekaOid: p.eka_oid || p.ekaOid || p.oid || p.eka_id || p.ekaId || p.patient_id || p.patientId || p.pt_id || p.ptId || data.eka_oid || data.ekaOid || data.oid || data.eka_id || data.ekaId || data.patient_id || data.patientId || data.pt_id || data.ptId || '',
          ekaUuid: p.eka_uuid || p.ekaUuid || p.uuid || data.eka_uuid || data.ekaUuid || data.uuid || '',
          firstName: p.first_name || p.firstName || data.first_name || data.firstName || '',
          middleName: p.middle_name || p.middleName || data.middle_name || data.middleName || '',
          lastName: p.last_name || p.lastName || data.last_name || data.lastName || '',
          fullName: p.full_name || p.fullName || data.full_name || data.fullName || `${p.first_name || p.firstName || data.first_name || data.firstName || ''} ${p.last_name || p.lastName || data.last_name || data.lastName || ''}`.trim(),
          gender: p.gender === 'M' || p.gender === 'Male' || data.gender === 'M' || data.gender === 'Male' ? 'Male' : (p.gender === 'F' || p.gender === 'Female' || data.gender === 'F' || data.gender === 'Female' ? 'Female' : 'Other'),
          yearOfBirth: Number(p.year_of_birth || p.yearOfBirth || p.birthYear || data.year_of_birth || data.yearOfBirth || data.birthYear || 0),
          monthOfBirth: Number(p.month_of_birth || p.monthOfBirth || p.birthMonth || data.month_of_birth || data.monthOfBirth || data.birthMonth || 0),
          dayOfBirth: Number(p.day_of_birth || p.dayOfBirth || p.birthDay || data.day_of_birth || data.dayOfBirth || data.birthDay || 0),
          mobile: p.mobile || p.phone || p.phoneNumber || p.phone_number || data.mobile || data.phone || data.phoneNumber || data.phone_number || '',
          address: p.address || data.address || '',
          pincode: p.pincode || p.pin_code || data.pincode || data.pin_code || '',
          stateName: p.state_name || p.stateName || data.state_name || data.stateName || '',
          districtName: p.district_name || p.districtName || data.district_name || data.districtName || '',
          kycVerified: p.kyc_verified ?? p.kycVerified ?? data.kyc_verified ?? data.kycVerified ?? true,
          profilePhotoB64: p.profile_photo || p.profilePhoto || p.photo || data.profile_photo || data.profilePhoto || data.photo || ''
        };

        // Direct DB Insertion
        const dbResult = await saveProfileToDatabase(profile);

        res.json({
          success: true,
          profile,
          demographics: dbResult.demographics,
          patient: dbResult.demographics
        });
        return;
      } catch (err: any) {
        console.error('Failed to log in via Eka Care API:', err);
        res.status(500).json({ error: `Connection to Eka Care failed: ${err.message}` });
        return;
      }
    }

    // Demo / Simulation Mode fallback
    console.log('Eka Care credentials not fully set. Running in Demo Simulation Mode.');
    const profile = {
      abhaNumber: '91-2751-8266-5651',
      abhaAddress: phrAddress,
      ekaOid: 'eka_oid_demo_9901',
      ekaUuid: 'eka_uuid_demo_9901',
      firstName: 'Rahul',
      middleName: '',
      lastName: 'Sharma',
      fullName: 'Rahul Sharma',
      gender: 'Male',
      yearOfBirth: 1990,
      monthOfBirth: 8,
      dayOfBirth: 15,
      mobile: '+919876543210',
      address: 'Flat 101, B-Block, Green Valley Apartments, Sector 15, Dwarka, New Delhi',
      pincode: '110075',
      stateName: 'Delhi',
      districtName: 'South West Delhi',
      kycVerified: true,
      profilePhotoB64: ''
    };

    const dbResult = await saveProfileToDatabase(profile);

    res.json({
      success: true,
      profile,
      demographics: dbResult.demographics,
      patient: dbResult.demographics
    });
  } catch (err: any) {
    console.error('ABDM Phr Login error:', err);
    res.status(500).json({ error: 'Internal server error during PHR auto-login' });
  }
});

// 4. Save Patient Demographics (Stores to both patient_demographics and patients tables) - Fallback
router.post('/save-demographics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { profile } = req.body;

    if (!profile || !profile.abhaNumber) {
      res.status(400).json({ error: 'Missing profile demographics details' });
      return;
    }

    const dbResult = await saveProfileToDatabase(profile);

    res.json({
      success: true,
      demographics: dbResult.demographics,
      patient: dbResult.demographics
    });
  } catch (err: any) {
    console.error('ABDM Save Demographics error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during demographics save' });
  }
});

// 5. Get All Saved Patient Demographics
router.get('/demographics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Supabase admin client is not initialized.' });
      return;
    }

    console.log('Fetching saved demographics...');
    const { data, error } = await supabaseAdmin
      .from('patient_demographics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to select patient_demographics:', error);
      res.status(502).json({ error: `Database fetch failed: ${error.message}` });
      return;
    }

    // Map columns from snake_case to frontend camelCase expectations
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      abhaNumber: row.abha_number,
      abhaAddress: row.abha_address,
      ekaOid: row.eka_oid || '',
      ekaUuid: row.eka_uuid || '',
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      fullName: row.full_name,
      gender: row.gender === 'M' ? 'M' : (row.gender === 'F' ? 'F' : 'O'), // Keep as DB code for frontend labels
      yearOfBirth: row.year_of_birth,
      monthOfBirth: row.month_of_birth,
      dayOfBirth: row.day_of_birth,
      mobile: row.mobile,
      address: row.address,
      pincode: row.pincode,
      stateName: row.state_name,
      districtName: row.district_name,
      kycVerified: row.kyc_verified,
      profilePhotoB64: row.profile_photo_b64,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      demographics: mapped
    });
  } catch (err: any) {
    console.error('ABDM Get Demographics error:', err);
    res.status(500).json({ error: 'Internal server error during demographics retrieve' });
  }
});

export default router;
