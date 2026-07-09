import { BACKEND_URL, getAuthToken } from './supabaseClient';

export interface AbdmProfile {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  abhaAddress: string;
  phone: string;
  address: string;
  email: string;
  nationalId: string;
}

export interface InitAuthResponse {
  success: boolean;
  txnId?: string;
  message?: string;
  error?: string;
}

export interface ConfirmAuthResponse {
  success: boolean;
  profile?: AbdmProfile;
  error?: string;
}

/**
 * Request Eka Care API to initialize authentication (send OTP)
 * @param id ABHA ID/Address or Mobile number
 */
export const initAbdmAuth = async (id: string): Promise<InitAuthResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/init-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend ABDM Init Auth failed:', data);
      return { success: false, error: data.error || 'Failed to send OTP verification' };
    }

    return {
      success: true,
      txnId: data.txnId,
      message: data.message
    };
  } catch (err: any) {
    console.error('initAbdmAuth error:', err);
    return { success: false, error: err.message || 'Network error while initiating ABDM auth' };
  }
};

/**
 * Request Eka Care API to confirm authentication (verify OTP)
 * @param txnId The transaction ID returned by init-auth
 * @param otp The 6-digit OTP code entered by the user
 */
export const confirmAbdmAuth = async (txnId: string, otp: string): Promise<ConfirmAuthResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/confirm-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ txnId, otp })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend ABDM Confirm Auth failed:', data);
      return { success: false, error: data.error || 'OTP verification failed' };
    }

    return {
      success: true,
      profile: data.profile
    };
  } catch (err: any) {
    console.error('confirmAbdmAuth error:', err);
    return { success: false, error: err.message || 'Network error while verifying OTP' };
  }
};
