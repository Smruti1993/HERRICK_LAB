import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCw, Calendar, CreditCard, FolderOpen, ShieldCheck, UserCheck, Smartphone } from 'lucide-react';
import { useData } from '../context/DataContext';
import { fetchAbdmDemographics } from '../services/abdmService';

const GENDER_LABELS: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

function calcAge(year?: number, month?: number, day?: number) {
  if (!year) return null;
  const dob = new Date(year, (month || 1) - 1, day || 1);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDob(year?: number, month?: number, day?: number) {
  if (!year) return "Not recorded";
  const dob = new Date(year, (month || 1) - 1, day || 1);
  return dob.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMobile(mobile?: string) {
  if (!mobile) return "Not recorded";
  return mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile;
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function Avatar({ photoBase64, name, size = 76, radius = 16 }: { photoBase64?: string; name: string; size?: number; radius?: number }) {
  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    objectFit: "cover" as const,
    border: "3px solid #ffffff",
    boxShadow: "0 4px 12px rgba(15, 33, 56, 0.08)",
    background: "#f0f3f7",
  };
  if (photoBase64 && photoBase64.trim().length > 10) {
    const src = photoBase64.startsWith('data:') ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;
    return <img style={style} src={src} alt={name} />;
  }
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#8493a8",
        fontWeight: 600,
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </div>
  );
}

export const AbdmProfiles = () => {
  const { showToast } = useData();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDemographics = async () => {
    setLoading(true);
    const result = await fetchAbdmDemographics();
    if (result.success && result.demographics) {
      setProfiles(result.demographics);
      if (result.demographics.length > 0 && !selectedProfile) {
        setSelectedProfile(result.demographics[0]);
      }
    } else {
      showToast('error', result.error || 'Failed to load ABDM profiles');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDemographics();
  }, []);

  const filtered = profiles.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.abhaNumber.includes(searchQuery) ||
    p.abhaAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden animate-in fade-in duration-300">
      {/* Sidebar - Profile list */}
      <div className="w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            🪪 Saved Demographics
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or ABHA..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-blue-500 bg-white rounded-xl text-xs outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RotateCw className="w-5 h-5 animate-spin text-slate-300" />
              <span>Loading saved ABHA records...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No demographics records found.
            </div>
          ) : (
            filtered.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
                  selectedProfile?.id === profile.id 
                    ? 'bg-blue-50/80 border-l-4 border-blue-600' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <Avatar photoBase64={profile.profilePhotoB64} name={profile.fullName} size={44} radius={10} />
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm truncate">{profile.fullName}</h4>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{profile.abhaAddress}</p>
                  <p className="text-slate-500 text-[10px] font-mono mt-1">{profile.abhaNumber}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Details Pane */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {selectedProfile ? (
          <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 uppercase tracking-wider">
              <span>Patients</span>
              <span>/</span>
              <span className="text-slate-700 font-bold">{selectedProfile.fullName}</span>
              <span>/</span>
              <span>ABHA Profile</span>
            </div>

            {/* Header Identity Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <Avatar photoBase64={selectedProfile.profilePhotoB64} name={selectedProfile.fullName} size={76} radius={16} />
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedProfile.fullName}</h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {selectedProfile.kycVerified && (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200/60 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        KYC verified
                      </span>
                    )}
                    <span className="bg-cyan-50 border border-cyan-200/60 text-cyan-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">{selectedProfile.abhaNumber}</span>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium font-mono">source: {selectedProfile.source}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    showToast('info', 'Init Verification OTP request sent.');
                  }}
                  className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  ↻ Re-sync from ABDM
                </button>
                <button 
                  onClick={() => {
                    if (!selectedProfile) return;
                    navigate('/appointments', {
                      state: { prefillProfile: selectedProfile }
                    });
                  }}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-blue-200 transition-all"
                >
                  ＋ Start appointment
                </button>
              </div>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Left Column - ABHA Card & Sync Status */}
              <div className="md:col-span-2 space-y-4">
                {/* Premium ABHA Card Mock */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  {/* Top Bar Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-4 text-white flex items-center justify-between">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-xs tracking-wide">Ayushman Bharat Health Account</span>
                      <span className="text-[9px] opacity-75 font-hindi tracking-widest mt-0.5">आयुष्मान भारत स्वास्थ्य खाता (आभा)</span>
                    </div>
                    <span className="text-lg">🩺</span>
                  </div>
                  {/* Card Body */}
                  <div className="p-4 flex gap-4 items-start">
                    <Avatar photoBase64={selectedProfile.profilePhotoB64} name={selectedProfile.fullName} size={64} radius={8} />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Name</div>
                        <div className="font-bold text-slate-800 text-sm truncate">{selectedProfile.fullName}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">ABHA Number</div>
                        <div className="font-mono text-slate-800 font-semibold text-xs">{selectedProfile.abhaNumber}</div>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Gender</div>
                          <div className="text-slate-800 text-xs font-semibold">{GENDER_LABELS[selectedProfile.gender] || selectedProfile.gender}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">DOB</div>
                          <div className="text-slate-800 text-xs font-semibold">{selectedProfile.dayOfBirth}-{selectedProfile.monthOfBirth}-{selectedProfile.yearOfBirth}</div>
                        </div>
                      </div>
                    </div>
                    {/* QR Code Placeholder */}
                    <div className="w-16 h-16 border border-slate-200/80 rounded-lg bg-gradient-to-br from-slate-900/10 via-slate-900/20 to-slate-900/10 flex items-center justify-center select-none flex-shrink-0">
                      <span className="text-[8px] font-bold text-slate-500 font-mono">ABHA QR</span>
                    </div>
                  </div>
                  {/* Card Footer */}
                  <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-700 font-bold">{selectedProfile.abhaAddress}</span>
                    <span className="text-slate-400">Helpline: 1800 114 477</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => showToast('success', 'ABHA card PDF downloaded successfully!')}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    ⬇ Download card
                  </button>
                  <button 
                    onClick={() => showToast('info', 'Card shared successfully!')}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    ⇪ Share
                  </button>
                </div>

                {/* Stored Status Card */}
                <div className="bg-cyan-50/50 border border-cyan-100 p-4 rounded-xl flex gap-3 text-xs text-cyan-800">
                  <span className="text-lg">ⓘ</span>
                  <div className="space-y-1">
                    <b className="text-cyan-900 block font-semibold">Stored locally</b>
                    <p className="leading-relaxed">
                      Fetched from ABDM on {new Date(selectedProfile.updatedAt || selectedProfile.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })} and cached in patient demographics database. Use &quot;Re-sync&quot; to refresh from national portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Demographic Grid details */}
              <div className="md:col-span-3 space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Demographic details</h3>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      ABDM RECORD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    {/* Col 1 */}
                    <div className="divide-y divide-slate-100">
                      <DetailCell label="Mobile" value={formatMobile(selectedProfile.mobile)} />
                      <DetailCell label="Date of birth" value={
                        `${formatDob(selectedProfile.yearOfBirth, selectedProfile.monthOfBirth, selectedProfile.dayOfBirth)}` +
                        (calcAge(selectedProfile.yearOfBirth, selectedProfile.monthOfBirth, selectedProfile.dayOfBirth) 
                          ? ` · ${calcAge(selectedProfile.yearOfBirth, selectedProfile.monthOfBirth, selectedProfile.dayOfBirth)} yrs` 
                          : '')
                      } />
                      <DetailCell label="Address" value={selectedProfile.address} />
                      <DetailCell label="Pincode" value={selectedProfile.pincode} />
                    </div>
                    {/* Col 2 */}
                    <div className="divide-y divide-slate-100">
                      <DetailCell label="Email" value="" fallback="Not linked" />
                      <DetailCell label="Gender" value={GENDER_LABELS[selectedProfile.gender] || selectedProfile.gender} />
                      <DetailCell label="State / District" value={
                        selectedProfile.stateName || selectedProfile.districtName
                          ? `${selectedProfile.stateName || '-'} · ${selectedProfile.districtName || '-'}`
                          : ''
                      } />
                      <DetailCell label="Blood Group" value="" fallback="Not recorded" />
                    </div>
                  </div>

                  {/* Metadata Chips strip */}
                  <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex gap-2 flex-wrap items-center">
                    <span className="bg-white border border-slate-200/80 text-slate-500 font-mono text-[10px] px-2.5 py-1 rounded-lg">ABHA <b>{selectedProfile.abhaNumber}</b></span>
                    <span className="bg-white border border-slate-200/80 text-slate-500 font-mono text-[10px] px-2.5 py-1 rounded-lg">Address <b>{selectedProfile.abhaAddress}</b></span>
                    {selectedProfile.ekaOid && (
                      <span className="bg-white border border-slate-200/80 text-slate-500 font-mono text-[10px] px-2.5 py-1 rounded-lg">Eka OID <b>{selectedProfile.ekaOid}</b></span>
                    )}
                    {selectedProfile.ekaUuid && (
                      <span className="bg-white border border-slate-200/80 text-slate-500 font-mono text-[10px] px-2.5 py-1 rounded-lg">Eka UUID <b>{selectedProfile.ekaUuid}</b></span>
                    )}
                  </div>
                </div>

                {/* Use this record for card list */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Use this record for</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ActionBox 
                      icon="📅" 
                      title="Book appointment" 
                      desc="Pre-fill patient identity for a new visit or follow-up." 
                      onClick={() => {
                        if (!selectedProfile) return;
                        navigate('/appointments', {
                          state: { prefillProfile: selectedProfile }
                        });
                      }}
                    />
                    <ActionBox 
                      icon="🧾" 
                      title="Create invoice" 
                      desc="Bill against this patient's saved demographic record." 
                      onClick={() => showToast('success', 'Generating new billing invoice...')}
                    />
                    <ActionBox 
                      icon="📁" 
                      title="Link health records" 
                      desc="Pull consented care contexts from ABDM (M2/M3 flow)." 
                      onClick={() => showToast('info', 'Consenting health locker sync...')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
            <div className="bg-slate-100 p-5 rounded-full mb-4">
              <ShieldCheck className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No profile selected</h3>
            <p className="text-sm text-slate-500 mt-1">Please select an ABHA profile from the left sidebar to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

function DetailCell({ label, value, fallback }: { label: string; value: string; fallback?: string }) {
  const hasVal = value && value.trim().length > 0;
  return (
    <div className="p-4 space-y-1">
      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{label}</div>
      <div className={`text-xs ${hasVal ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}`}>
        {hasVal ? value : (fallback || 'Not recorded')}
      </div>
    </div>
  );
}

function ActionBox({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-4 text-left border border-slate-200/80 hover:border-blue-400 rounded-xl bg-slate-50/50 hover:bg-blue-50/10 flex flex-col gap-2 transition-all outline-none group"
    >
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm text-sm group-hover:scale-105 transition-transform">{icon}</div>
      <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{title}</h4>
      <p className="text-[10px] text-slate-400 leading-normal">{desc}</p>
      <span className="inline-flex self-start border border-slate-200 bg-white text-[9px] font-bold font-mono px-2 py-0.5 rounded-md mt-2 text-slate-500">OPEN</span>
    </button>
  );
}
