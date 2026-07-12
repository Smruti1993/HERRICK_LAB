import { BACKEND_URL, getAuthToken } from './supabaseClient';

export interface AbdmProfile {
  abhaNumber: string;
  abhaAddress: string;
  ekaOid: string;
  ekaUuid: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: string;
  yearOfBirth: number;
  monthOfBirth: number;
  dayOfBirth: number;
  mobile: string;
  address: string;
  pincode: string;
  stateName: string;
  districtName: string;
  kycVerified: boolean;
  profilePhotoB64: string;
  email?: string;
}

export interface InitAuthResponse {
  success: boolean;
  txnId?: string;
  message?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  txnId?: string;
  phrAddresses?: string[];
  error?: string;
}

export interface ConfirmAuthResponse {
  success: boolean;
  profile?: AbdmProfile;
  error?: string;
}

export interface SaveDemographicsResponse {
  success: boolean;
  demographics?: any;
  patient?: any;
  error?: string;
}

/**
 * Request Eka Care API to initialize authentication (send OTP to Aadhaar linked mobile)
 * @param aadhaar 12-digit Aadhaar Number
 */
export const initAbdmAuth = async (aadhaar: string): Promise<InitAuthResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/init-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: aadhaar })
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
 * Request Eka Care API to verify the Aadhaar OTP
 * @param txnId The transaction ID returned by init-auth
 * @param otp The 6-digit OTP code entered by the user
 */
export const verifyAbdmOtp = async (txnId: string, otp: string, mobile: string): Promise<VerifyOtpResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ txnId, otp, mobile })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend ABDM Verify OTP failed:', data);
      return { success: false, error: data.error || 'OTP verification failed', ekaBody: data.ekaBody, ekaStatus: data.ekaStatus } as any;
    }

    return {
      success: true,
      txnId: data.txnId,
      phrAddresses: data.phrAddresses
    };
  } catch (err: any) {
    console.error('verifyAbdmOtp error:', err);
    return { success: false, error: err.message || 'Network error while verifying OTP' };
  }
};

/**
 * Request Eka Care API to perform Aadhaar Auto-Login (retrieve full demographic profile)
 * @param phrAddress The selected ABHA Address
 * @param txnId The transaction ID returned from OTP verification
 */
export const fetchAbdmPhrProfile = async (phrAddress: string, txnId: string, patientId?: string): Promise<ConfirmAuthResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/phr-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phrAddress, txnId, patientId })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend ABDM Auto-Login failed:', data);
      return { success: false, error: data.error || 'Aadhaar auto-login failed', ekaBody: data.ekaBody, ekaStatus: data.ekaStatus } as any;
    }

    return {
      success: true,
      profile: data.profile,
      patient: data.patient
    } as any;
  } catch (err: any) {
    console.error('fetchAbdmPhrProfile error:', err);
    return { success: false, error: err.message || 'Network error during auto-login' };
  }
};

/**
 * Save the verified demographics to the patient database tables
 * @param profile The verified ABHA Profile object
 * @param patientId Optional ID of the existing patient to update/link
 * @param manualDetails Extra manual fields (Email, Aadhaar/National ID, Sponsor, Policy)
 */
export const saveAbdmDemographics = async (
  profile: AbdmProfile, 
  patientId?: string, 
  manualDetails?: {
    email?: string;
    nationalId?: string;
    sponsorName?: string;
    policyNo?: string;
  }
): Promise<SaveDemographicsResponse> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/save-demographics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ profile, patientId, manualDetails })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend save-demographics failed:', data);
      return { success: false, error: data.error || 'Failed to save demographics' };
    }

    return {
      success: true,
      demographics: data.demographics,
      patient: data.patient
    };
  } catch (err: any) {
    console.error('saveAbdmDemographics error:', err);
    return { success: false, error: err.message || 'Network error while saving demographics' };
  }
};

/**
 * Retrieve all saved patient demographics from the backend
 */
export const fetchAbdmDemographics = async (): Promise<{ success: boolean; error?: string; demographics?: any[] }> => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/abdm/demographics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frontend fetch-demographics failed:', data);
      return { success: false, error: data.error || 'Failed to fetch saved demographics' };
    }

    return {
      success: true,
      demographics: data.demographics
    };
  } catch (err: any) {
    console.error('fetchAbdmDemographics error:', err);
    return { success: false, error: err.message || 'Network error while fetching saved demographics' };
  }
};
