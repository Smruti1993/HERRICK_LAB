import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Endpoint URLs can be configured dynamically in environment variables
const EKA_CLIENT_ID = (process.env.EKA_CARE_CLIENT_ID || '').trim();
const EKA_CLIENT_SECRET = (process.env.EKA_CARE_CLIENT_SECRET || '').trim();
const EKA_BASE_URL = (process.env.EKA_CARE_BASE_URL || 'https://api.eka.care').trim();

// Dynamic URLs for Eka Care APIs
const EKA_INIT_URL = (process.env.EKA_CARE_INIT_AUTH_URL || `${EKA_BASE_URL}/v1/auth/init`).trim();
const EKA_CONFIRM_URL = (process.env.EKA_CARE_CONFIRM_AUTH_URL || `${EKA_BASE_URL}/v1/auth/confirm`).trim();

// 1. Initialize Authentication (Request OTP)
router.post('/init-auth', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body; // Can be ABHA Address, ABHA Number, or Mobile Number

    if (!id || !id.trim()) {
      res.status(400).json({ error: 'Missing ABHA ID or mobile number' });
      return;
    }

    console.log(`ABDM Init Auth requested for: ${id}`);

    // If Eka Care credentials are configured, execute live request
    if (EKA_CLIENT_ID && EKA_CLIENT_SECRET) {
      console.log('Sending OTP request to Eka Care API:', EKA_INIT_URL);
      try {
        const response = await fetch(EKA_INIT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EKA_CLIENT_SECRET}`,
            'X-Client-Id': EKA_CLIENT_ID
          },
          body: JSON.stringify({ abhaAddressOrPhone: id })
        });

        const responseText = await response.text();
        console.log(`Eka Care Response Status: ${response.status}`);
        console.log(`Eka Care Response Body: ${responseText.slice(0, 500)}`);

        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          console.error('Failed to parse Eka Care response as JSON:', responseText.slice(0, 1000));
          res.status(502).json({ 
            error: `Eka Care returned invalid format (Status ${response.status}): ${responseText.slice(0, 150)}...` 
          });
          return;
        }

        if (!response.ok) {
          console.error('Eka Care API returned error during init:', data);
          res.status(502).json({ error: data.message || `Eka Care API failed with status ${response.status}` });
          return;
        }

        res.json({
          success: true,
          txnId: data.txnId || `live_${Date.now()}`,
          message: 'OTP sent successfully via Eka Care'
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
    res.json({
      success: true,
      txnId: generatedTxnId,
      message: 'Demo OTP sent successfully (use any code e.g. 482012 to verify)'
    });
  } catch (err: any) {
    console.error('ABDM Init Auth error:', err);
    res.status(500).json({ error: 'Internal server error during verification initialization' });
  }
});

// 2. Confirm Authentication (Verify OTP and return profile)
router.post('/confirm-auth', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { txnId, otp } = req.body;

    if (!txnId || !otp) {
      res.status(400).json({ error: 'Missing txnId or otp code' });
      return;
    }

    console.log(`ABDM Confirm Auth requested for txnId: ${txnId}, OTP: ${otp}`);

    // If Eka Care credentials are configured, execute live request
    if (EKA_CLIENT_ID && EKA_CLIENT_SECRET) {
      console.log('Sending verification request to Eka Care API:', EKA_CONFIRM_URL);
      try {
        const response = await fetch(EKA_CONFIRM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EKA_CLIENT_SECRET}`,
            'X-Client-Id': EKA_CLIENT_ID
          },
          body: JSON.stringify({ txnId, otp })
        });

        const responseText = await response.text();
        console.log(`Eka Care Response Status: ${response.status}`);
        console.log(`Eka Care Response Body: ${responseText.slice(0, 500)}`);

        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch (jsonErr) {
          console.error('Failed to parse Eka Care response as JSON:', responseText.slice(0, 1000));
          res.status(502).json({ 
            error: `Eka Care returned invalid format (Status ${response.status}): ${responseText.slice(0, 150)}...` 
          });
          return;
        }

        if (!response.ok) {
          console.error('Eka Care API returned error during confirm:', data);
          res.status(502).json({ error: data.message || `Eka Care API failed with status ${response.status}` });
          return;
        }

        res.json({
          success: true,
          profile: {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            dob: data.dob || '',
            gender: data.gender || 'Male',
            abhaAddress: data.abhaAddress || '',
            phone: data.phone || '',
            address: data.address || '',
            email: data.email || '',
            nationalId: data.nationalId || ''
          }
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
    
    // Accept any 6-digit OTP code to verify successfully
    if (otp.length !== 6 || isNaN(Number(otp))) {
      res.status(400).json({ error: 'Invalid OTP format. Must be a 6-digit number.' });
      return;
    }

    // Return the profile of Rahul Sharma matching the mockup screenshot details
    res.json({
      success: true,
      profile: {
        firstName: 'Rahul',
        lastName: 'Sharma',
        dob: '1990-08-15',
        gender: 'Male',
        abhaAddress: 'rahul123@abdm',
        phone: '+919876543210',
        address: 'Flat 101, B-Block, Green Valley Apartments, Sector 15, Dwarka, New Delhi - 110075',
        email: 'rahul.sharma@example.in',
        nationalId: 'XXXX-XXXX-9012'
      }
    });
  } catch (err: any) {
    console.error('ABDM Confirm Auth error:', err);
    res.status(500).json({ error: 'Internal server error during verification confirmation' });
  }
});

export default router;
