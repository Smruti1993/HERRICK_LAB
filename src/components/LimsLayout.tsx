import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getSupabase } from '../services/supabaseClient';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  FlaskConical, 
  FileText, 
  Settings, 
  Sliders, 
  Grid, 
  LogOut,
  ArrowLeft,
  Beaker
} from 'lucide-react';

export default function LimsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useData();
  const [labCount, setLabCount] = useState(0);
  const [mastersCount, setMastersCount] = useState(0);
  const [reportsExpanded, setReportsExpanded] = useState(
    location.pathname.includes('/lims/analytics') ||
    location.pathname.includes('/lims/reports-profiles') ||
    location.pathname.includes('/lims/lab-register')
  );
  const supabase = getSupabase();

  useEffect(() => {
    if (
      location.pathname.includes('/lims/analytics') ||
      location.pathname.includes('/lims/reports-profiles') ||
      location.pathname.includes('/lims/lab-register')
    ) {
      setReportsExpanded(true);
    }
  }, [location.pathname]);

  const isAdmin = user?.username.toLowerCase() === 'admin' || 
                  user?.role?.toLowerCase() === 'administrator' || 
                  user?.role?.toLowerCase() === 'admin';

  const hasAccess = (screenCode: string) => {
    if (isAdmin) return true;
    return !!user?.privileges?.[screenCode]?.can_view;
  };

  const fetchRealtimeCounts = async () => {
    try {
      // 1. Get Laboratory count (Ordered status)
      const { count: ordCount, error: ordErr } = await supabase
        .from('lims_lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ordered');

      if (!ordErr && ordCount !== null) {
        setLabCount(ordCount);
      }

      // 2. Get Masters count (Specimens + Containers + Equipment total)
      const { count: specCount } = await supabase
        .from('lims_specimens')
        .select('*', { count: 'exact', head: true });
      
      const { count: contCount } = await supabase
        .from('lims_containers')
        .select('*', { count: 'exact', head: true });

      const { count: equipCount } = await supabase
        .from('lims_equipment')
        .select('*', { count: 'exact', head: true });

      const totalMasters = (specCount || 0) + (contCount || 0) + (equipCount || 0);
      setMastersCount(totalMasters || 12); // Fallback to 12 if none
    } catch (err) {
      console.error('Error fetching LIMS layout counts:', err);
    }
  };

  useEffect(() => {
    fetchRealtimeCounts();
    // Poll every 10 seconds for real-time badge updates
    const interval = setInterval(fetchRealtimeCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get avatar initials
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AT';

  return (
    <div className="flex flex-col h-screen bg-[#F4F6F9] overflow-hidden font-sans">
      {/* Top Header - Dark Navy Blue */}
      <header className="h-[72px] bg-[#0B2252] flex justify-between items-center px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          {/* Switcher Button - Switch back to HMS Dashboard */}
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 border border-white/20 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-all group"
            title="Back to HMS main dashboard"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-bold tracking-wide flex items-center gap-2">
              MediCore LIMS
            </h1>
            <p className="text-slate-300 text-xs font-light">
              Manage laboratory orders from sample collection to result certification
            </p>
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-5">
          {/* Search box */}
          <div className="relative w-64 hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-[#183670] text-slate-200 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Bell Notification */}
          <button className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full relative transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#0B2252]"></span>
          </button>

          {/* Avatar User initials (AT) */}
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-inner border border-emerald-500">
            {initials}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="py-4 px-6">
            <h4 className="text-xxs font-bold text-slate-450 uppercase tracking-widest text-slate-400">
              NAVIGATION
            </h4>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {/* Laboratory Dashboard link */}
            {hasAccess('LIMS_DASHBOARD') && (
              <NavLink
                to="/lims/dashboard"
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#1C58D9] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FlaskConical className={`w-5 h-5 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Laboratory</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {labCount > 0 && (
                        <span className={`text-xxs px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-[#1C58D9] text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {labCount}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 opacity-50 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400'}`} />
                    </div>
                  </>
                )}
              </NavLink>
            )}

            {/* Reports Link with Submenu */}
            {hasAccess('LIMS_ANALYTICS') && (
              <div className="flex flex-col">
                <button
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group w-full text-left ${
                    location.pathname.includes('/lims/analytics') || location.pathname.includes('/lims/reports-profiles') || location.pathname.includes('/lims/lab-register')
                      ? 'bg-slate-50 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${
                      location.pathname.includes('/lims/analytics') || location.pathname.includes('/lims/reports-profiles') || location.pathname.includes('/lims/lab-register')
                        ? 'text-[#1C58D9]'
                        : 'text-slate-400 group-hover:text-slate-650'
                    }`} />
                    <span>Report</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 ${reportsExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {reportsExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    <NavLink
                      to="/lims/analytics"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive 
                            ? 'text-[#1C58D9] font-bold bg-[#EAF2FF]' 
                            : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>TAT & Compliance</span>
                    </NavLink>
                    <NavLink
                      to="/lims/reports-profiles"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive 
                            ? 'text-[#1C58D9] font-bold bg-[#EAF2FF]' 
                            : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>Lab Report (Profiles)</span>
                    </NavLink>
                    <NavLink
                      to="/lims/lab-register"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive 
                            ? 'text-[#1C58D9] font-bold bg-[#EAF2FF]' 
                            : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>Lab Register</span>
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* Reagent Inventory Dashboard Link */}
            {hasAccess('LIMS_ANALYTICS') && (
              <NavLink
                to="/lims/reagents-dashboard"
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#1C58D9] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Beaker className={`w-5 h-5 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Reagent Inventory</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 text-slate-400" />
                  </>
                )}
              </NavLink>
            )}

            {/* Masters Link */}
            {hasAccess('LIMS_MASTERS') && (
              <NavLink
                to="/lims/masters"
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#1C58D9] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Settings className={`w-5 h-5 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Masters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {mastersCount > 0 && (
                        <span className={`text-xxs px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-[#1C58D9]/20 text-[#1C58D9]' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {mastersCount}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 text-slate-400" />
                    </div>
                  </>
                )}
              </NavLink>
            )}

            {/* Configurations Link */}
            {hasAccess('LIMS_AMENDMENTS') && (
              <NavLink
                to="/lims/amendments"
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#1C58D9] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Sliders className={`w-5 h-5 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Configurations</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 text-slate-400" />
                  </>
                )}
              </NavLink>
            )}

            {/* Transactions Link */}
            {hasAccess('LIMS_AMENDMENTS') && (
              <NavLink
                to="/lims/amendments" // Pointing to Amendments as transaction desk
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#1C58D9] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Grid className={`w-5 h-5 ${isActive ? 'text-[#1C58D9]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Transactions</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 text-slate-400" />
                  </>
                )}
              </NavLink>
            )}
          </nav>

          {/* User Profile Block at the Bottom */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100 relative group justify-between">
              <div className="flex items-center overflow-hidden">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                  {initials}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.fullName || 'Admin Tech'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {user?.role || 'Lab Administrator'}
                  </p>
                </div>
              </div>
              
              {/* Logout button */}
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                title="Logout from system"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Viewport for LIMS content pages */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F4F6F9]">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
