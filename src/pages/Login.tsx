import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { KeyRound, User, Loader2, HeartPulse, Settings, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, loginDemo, isDbConnected, branches } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    
    if (success) {
      navigate('/');
    }
  };

  const handleDemoLogin = () => {
      loginDemo();
      navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden max-w-[1100px] w-full flex flex-col md:flex-row min-h-[680px] animate-in fade-in zoom-in-95 duration-500 border border-slate-100">
        
        {/* Left Side - Hero / Branding */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Elements - Subtle gradients and shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>
          
          <div className="relative z-10 mt-4">
            {branches[0]?.logoUrl ? (
              <div className="w-36 h-36 bg-white rounded-[2rem] flex items-center justify-center mb-8 border border-white/20 shadow-2xl p-3.5 overflow-hidden">
                <img src={branches[0].logoUrl} alt="Hospital Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                <HeartPulse className="w-9 h-9 text-white" strokeWidth={1.5} />
              </div>
            )}
            <h1 className="text-4xl font-extrabold mb-3 tracking-tight">{branches[0]?.name || 'MediCore HMS'}</h1>
            <p className="text-blue-100 text-lg font-medium opacity-90">Next-Gen Healthcare Management</p>
          </div>

          <div className="relative z-10 space-y-8 mb-4">
            <p className="text-blue-50/80 leading-relaxed text-base font-light">
              Streamline your hospital operations with our comprehensive, AI-powered platform. Designed for efficiency, built for care.
            </p>
            
            <div className="flex items-center gap-3">
                <div className="h-1.5 w-8 bg-white rounded-full opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                <div className="h-1.5 w-2 bg-white/30 rounded-full"></div>
                <div className="h-1.5 w-2 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-7/12 p-8 md:p-14 lg:p-20 flex flex-col justify-center bg-white relative">
          
          {/* Settings Button */}
          {!isDbConnected && (
              <div className="absolute top-8 right-8">
                  <button 
                    onClick={() => navigate('/connection')} 
                    className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-4 py-2 rounded-full hover:bg-red-100 transition-colors border border-red-100"
                  >
                      <Settings className="w-3.5 h-3.5" /> Configure DB
                  </button>
              </div>
          )}

          <div className="w-full max-w-[420px] mx-auto">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Please enter your credentials to access the system.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                    <User className="h-5 w-5 text-slate-400 transition-colors" strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-[3px] focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                    <KeyRound className="h-5 w-5 text-slate-400 transition-colors" strokeWidth={1.5} />
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-[3px] focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-[0.99] focus:ring-4 focus:ring-blue-200 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Sign In <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="w-full bg-white text-slate-500 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                >
                    Enter Demo Mode (No DB)
                </button>
              </div>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    By accessing this system, you agree to comply with all hospital data privacy policies and HIPAA regulations.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-50 py-1 px-3 rounded-full w-fit mx-auto">
                    <span>MediCore v2.4.0</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>Support: it@medicore.com</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};