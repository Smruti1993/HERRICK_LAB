import React, { useState, useEffect, useRef } from 'react';
import { X, Dna, Network, User, Shield, Check, Video, RefreshCw, AlertCircle, Fingerprint, LogIn, ChevronRight } from 'lucide-react';
import { 
  initAbdmAuth, 
  verifyAbdmOtp, 
  fetchAbdmPhrProfile, 
  saveAbdmDemographics, 
  AbdmProfile 
} from '../../services/abdmService';

interface AbdmVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: any) => void;
  initialPatient?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    nationalId?: string;
    sponsorName?: string;
    policyNo?: string;
  };
}

export const AbdmVerificationModal: React.FC<AbdmVerificationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPatient
}) => {
  const [idInput, setIdInput] = useState(initialPatient?.nationalId || '');
  const [otpInput, setOtpInput] = useState<string[]>(Array(6).fill(''));
  const [txnId, setTxnId] = useState<string | null>(null);
  const [mobileInput, setMobileInput] = useState(initialPatient?.phone || '');
  
  // Timer States - ABDM OTPs are valid for 10 minutes
  const [timer, setTimer] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Status States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PHR selection list
  const [phrAddressesList, setPhrAddressesList] = useState<string[]>([]);
  const [selectedPhrAddress, setSelectedPhrAddress] = useState<string>('');
  const [manualPhrAddress, setManualPhrAddress] = useState('');

  // Profile fields (locked once verified)
  const [profile, setProfile] = useState<AbdmProfile | null>(null);

  // Manually fillable fields
  const [manualAadhaar, setManualAadhaar] = useState(initialPatient?.nationalId || '');
  const [manualEmail, setManualEmail] = useState(initialPatient?.email || '');
  const [manualAddress, setManualAddress] = useState(initialPatient?.address || '');
  const [manualSponsor, setManualSponsor] = useState(initialPatient?.sponsorName || '');
  const [manualPolicy, setManualPolicy] = useState(initialPatient?.policyNo || '');

  // QR Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Focus transition for OTP fields
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  if (!isOpen) return null;

  // Handle Sprout OTP trigger (Aadhaar registration init)
  const handleSproutOtp = async () => {
    if (!idInput.trim() || idInput.trim().length < 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await initAbdmAuth(idInput.trim());
    setLoading(false);

    if (result.success && result.txnId) {
      setTxnId(result.txnId);
      setIsOtpSent(true);
      setTimer(600); // 10 minutes - real ABDM OTP validity
      setIsTimerActive(true);
      setSuccessMsg(result.message || 'Aadhaar registration OTP sprouted successfully!');
      
      // Pre-fill mock OTP for easy test drive in Demo Mode
      if (result.txnId.startsWith('txn_demo_')) {
        setOtpInput(['4', '8', '2', '0', '1', '2']);
      }
    } else {
      setErrorMsg(result.error || 'Failed to request OTP');
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpInput];
    newOtp[index] = value.substring(value.length - 1);
    setOtpInput(newOtp);

    // Auto-focus next field
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key on OTP fields
  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Aadhaar OTP verification
  const handleVerifyOtp = async () => {
    const enteredOtp = otpInput.join('');
    if (enteredOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP code.');
      return;
    }

    if (!txnId) {
      setErrorMsg('Transaction session expired. Please request a new OTP.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await verifyAbdmOtp(txnId, enteredOtp, mobileInput.trim());
    setLoading(false);

    if (result.success && result.txnId) {
      setTxnId(result.txnId);
      setIsOtpVerified(true);
      setSuccessMsg('Aadhaar verified successfully! Please select or enter your ABHA address.');

      // Load linked PHR list
      const list = result.phrAddresses || [];
      setPhrAddressesList(list);
      if (list.length > 0) {
        setSelectedPhrAddress(list[0]);
      } else {
        // Pre-fill a suggestion based on their initial inputs
        setManualPhrAddress('');
      }
    } else {
      // Show Eka Care's full error detail if available
      const detail = (result as any).ekaBody;
      const detailStr = detail ? ` (Eka: ${JSON.stringify(detail)})` : '';
      setErrorMsg((result.error || 'OTP verification failed') + detailStr);
    }
  };

  // Handle PHR Login/Auto-Login
  const handlePhrLogin = async () => {
    const activePhr = phrAddressesList.length > 0 ? selectedPhrAddress : manualPhrAddress.trim();
    if (!activePhr) {
      setErrorMsg('Please select or input an ABHA Address (PHR address).');
      return;
    }

    if (!txnId) {
      setErrorMsg('Aadhaar verification transaction expired. Please retry.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await fetchAbdmPhrProfile(activePhr, txnId, initialPatient?.id);
    setLoading(false);

    if (result.success && (result as any).patient) {
      setSuccessMsg('Patient profile successfully fetched and saved!');
      onSave((result as any).patient);
    } else {
      const detail = (result as any).ekaBody;
      const detailStr = detail ? ` (Eka: ${JSON.stringify(detail)})` : '';
      setErrorMsg((result.error || 'Failed to retrieve and save profile demographics') + detailStr);
    }
  };

  // Start Live HTML5 Camera Video stream for QR scanner mock
  async function startScanner() {
    setErrorMsg(null);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setErrorMsg('Could not access camera. Please check your browser permissions.');
      setIsScanning(false);
    }
  }

  // Stop camera stream
  function stopScanner() {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  // Save the record to the parent database state
  const handleSaveRecord = async () => {
    if (!isVerified || !profile) {
      setErrorMsg('You must verify a patient identity via ABHA before saving.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    
    const result = await saveAbdmDemographics(
      profile, 
      initialPatient?.id, 
      {
        email: manualEmail,
        nationalId: manualAadhaar,
        sponsorName: manualSponsor || 'CASH',
        policyNo: manualPolicy
      }
    );
    setLoading(false);

    if (result.success && result.patient) {
      onSave(result.patient);
      onClose();
    } else {
      setErrorMsg(result.error || 'Failed to save patient records to database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4 md:p-6">
      <div 
        className="bg-gradient-to-br from-slate-100 via-emerald-50/20 to-blue-50/30 w-full max-w-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(4, 47, 31, 0.25)'
        }}
      >
        {/* Background Leaf Details */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200/60 flex flex-col items-center relative bg-white/40 backdrop-blur-md">
          <button 
            onClick={onClose} 
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200/50 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Styled ABDM Pill Logo */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-slate-200 to-slate-100 px-6 py-2 rounded-full border border-slate-300/80 shadow-inner">
            <Network className="w-5 h-5 text-blue-600" />
            <span className="text-xl font-black bg-gradient-to-r from-teal-700 to-blue-800 bg-clip-text text-transparent tracking-tight">ABDM</span>
            <Dna className="w-5 h-5 text-emerald-500 animate-pulse" />
          </div>

          <p className="text-xs font-bold text-slate-500 mt-3 uppercase tracking-wider">
            Verify Identity through nano banana digital protocol
          </p>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Aadhaar entry */}
          <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Aadhaar Verification 👤🍌</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">12-digit Aadhaar number</label>
              <div className="flex gap-2">
                <input 
                  disabled={isOtpSent}
                  type="text" 
                  maxLength={12}
                  className="flex-1 px-4 py-2.5 border border-cyan-200 focus:border-cyan-500 bg-white rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 outline-none transition-all"
                  placeholder="Enter 12-digit Aadhaar number"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  disabled={loading || isOtpSent}
                  onClick={handleSproutOtp}
                  className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 rounded-xl text-sm font-semibold shadow-md shadow-blue-200/50 hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Sprout OTP'}
                </button>
              </div>
            </div>

            {/* QR Scanner Part */}
            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-xs font-bold text-slate-500">Scan ABHA QR</span>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-20 h-20 border-2 border-slate-300 rounded-xl overflow-hidden flex items-center justify-center bg-slate-100 relative shrink-0">
                  {isScanning ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c0 .621.504 1.125 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 12v3.75m0 0v3.75m0-3.75H13.5m3.75 0h3.75" />
                    </svg>
                  )}
                </div>

                <button 
                  onClick={isScanning ? stopScanner : startScanner}
                  className={`flex-1 md:flex-none text-xs font-semibold px-4 py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all ${
                    isScanning 
                      ? 'bg-red-500 text-white shadow-red-200' 
                      : 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-blue-200/50'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  {isScanning ? 'Close scanner' : 'Open scanner'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Aadhaar OTP Verification */}
          {isOtpSent && !isOtpVerified && (
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 animate-in slide-in-from-bottom-3 duration-250">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <span>Harvest OTP 🍌</span>
              </div>

              {/* OTP digits + Timer row */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex gap-2">
                  {otpInput.map((digit, idx) => (
                    <input 
                      key={idx}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      type="text"
                      className="w-10 h-10 text-center border-2 border-slate-200 focus:border-cyan-500 bg-white rounded-full text-lg font-bold outline-none transition-all focus:ring-2 focus:ring-cyan-100"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="bg-slate-900 border-2 border-slate-700 text-cyan-400 font-mono text-lg px-4 py-1.5 rounded-xl shadow-inner tracking-widest flex items-center justify-center select-none min-w-[70px]">
                    {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* Mobile number field - required by Eka Care verify endpoint */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  📱 Mobile number to link with ABHA <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  className="w-full px-4 py-2.5 border border-cyan-200 focus:border-cyan-500 bg-white rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 outline-none transition-all"
                  placeholder="10-digit mobile number (e.g. 9876543210)"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-[10px] text-slate-400">This mobile number will be linked to your ABHA account.</p>
              </div>

              {/* Verify button */}
              <button 
                disabled={loading || mobileInput.trim().length < 10}
                onClick={handleVerifyOtp}
                className="w-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-200/50 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify OTP <Check className="w-4 h-4" />
              </button>
            </div>
          )}


          {/* Section 3: ABHA Address Selection (Auto-Login Phase) */}
          {isOtpVerified && !isVerified && (
            <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 animate-in slide-in-from-bottom-3 duration-250">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <LogIn className="w-3.5 h-3.5" />
                <span>ABHA Address Login 🍌</span>
              </div>

              <div className="space-y-3">
                {phrAddressesList.length > 0 ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Select linked ABHA address (PHR address)</label>
                    <select
                      className="w-full px-4 py-2.5 border border-cyan-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 outline-none"
                      value={selectedPhrAddress}
                      onChange={(e) => setSelectedPhrAddress(e.target.value)}
                    >
                      {phrAddressesList.map((addr) => (
                        <option key={addr} value={addr}>{addr}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">No linked ABHA addresses. Create/Input manually:</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 border border-cyan-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 outline-none"
                      placeholder="e.g. yourname@abdm"
                      value={manualPhrAddress}
                      onChange={(e) => setManualPhrAddress(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    disabled={loading}
                    onClick={handlePhrLogin}
                    className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-200/50 hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Login / Fetch Profile'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Demographic profile fetched */}
          {isVerified && profile && (
            <div className="bg-emerald-950 p-6 rounded-3xl text-emerald-100 border border-emerald-900/60 shadow-xl space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-250">
              <div className="absolute top-2 right-2 opacity-25 select-none pointer-events-none text-2xl">
                🍌
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-emerald-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-700">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Identity rooted 🌳🍌</span>
                </div>
                <p className="text-[10px] text-emerald-400 leading-normal">
                  Locked fields are sourced from ABHA and should not be changed by human or banana.
                </p>
              </div>

              {/* Locked Profile Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">First name</span>
                  <div className="bg-emerald-900/80 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-xl font-medium select-all">
                    {profile.firstName}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">Last name</span>
                  <div className="bg-emerald-900/80 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-xl font-medium select-all">
                    {profile.lastName}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">Date of birth</span>
                  <div className="bg-emerald-900/80 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-xl font-medium select-all">
                    {profile.dayOfBirth}/{profile.monthOfBirth}/{profile.yearOfBirth}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">Gender</span>
                  <div className="bg-emerald-900/80 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-xl font-medium select-all">
                    {profile.gender}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">ABHA address</span>
                  <div className="bg-emerald-900/80 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-xl font-medium select-all">
                    {profile.abhaAddress}
                  </div>
                </div>
              </div>

              {/* Manually Editable Part */}
              <div className="pt-4 border-t border-emerald-800/80 space-y-4">
                <span className="text-emerald-400 font-bold text-[10px] uppercase block">
                  Fill in manually – not sourced from ABDM
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1">
                      National ID (Aadhaar) 🍌
                    </label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                      <input 
                        type="text" 
                        className="w-full pl-9 pr-3 py-2 bg-emerald-900 border border-emerald-800 text-white rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="XXXX-XXXX-9012"
                        value={manualAadhaar}
                        onChange={(e) => setManualAadhaar(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-emerald-400 font-bold text-[10px] uppercase block">Email address</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 bg-emerald-900 border border-emerald-800 text-white rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="rahul.sharma@example.in"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-emerald-400 font-bold text-[10px] uppercase block">Full address</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-emerald-900 border border-emerald-800 text-white rounded-xl text-xs h-16 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    placeholder="Address details"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Sponsor Details */}
              <div className="pt-4 border-t border-emerald-800/80 space-y-4">
                <span className="text-emerald-400 font-bold text-[10px] uppercase block">
                  Insurance / sponsor details
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-emerald-400 font-bold text-[10px] uppercase block">Sponsor type</label>
                    <select 
                      className="w-full px-3 py-2 bg-emerald-900 border border-emerald-800 text-white rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={manualSponsor}
                      onChange={(e) => setManualSponsor(e.target.value)}
                    >
                      <option value="">(Keep blank)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-emerald-400 font-bold text-[10px] uppercase block">Policy number</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-emerald-900 border border-emerald-800 text-white rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Optional"
                      value={manualPolicy}
                      onChange={(e) => setManualPolicy(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200/60 flex justify-between gap-4 bg-white/40 backdrop-blur-md">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 bg-gradient-to-b from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-800 py-3 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1"
          >
            Cancel X
          </button>
          
          <button 
            type="button" 
            disabled={!isVerified || loading}
            onClick={handleSaveRecord}
            className="flex-1 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-full text-sm font-bold shadow-md shadow-blue-200/50 hover:shadow-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save path-record'}
          </button>
        </div>
      </div>
    </div>
  );
};
