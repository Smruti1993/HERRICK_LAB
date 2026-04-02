import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, NavItem } from '../constants';
import { useData } from '../context/DataContext';
import { Bell, Search, UserCircle, X, LogOut } from 'lucide-react';

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toasts, removeToast, user, logout, branches } = useData();

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(n => n.path === location.pathname);
    return item ? item.label : 'MediCore HMS';
  };

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  // Group items by category
  const groupedNav = NAV_ITEMS.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const categories = ['Main', 'Patient Care', 'Administration', 'Inventory', 'System'];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight truncate">{branches[0]?.name || 'MediCore'}</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-8 px-4">
            {categories.map(cat => {
                const items = groupedNav[cat];
                if (!items || items.length === 0) return null;
                
                return (
                    <div key={cat}>
                        {cat !== 'Main' && (
                            <h4 className="px-3 mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{cat}</h4>
                        )}
                        <ul className="space-y-1">
                            {items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <li key={item.path}>
                                  <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                      `flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                        isActive
                                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                      }`
                                    }
                                  >
                                    <Icon className={`w-5 h-5 mr-3 transition-opacity ${
                                        location.pathname === item.path ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                                    }`} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                  </NavLink>
                                </li>
                              );
                            })}
                        </ul>
                    </div>
                );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
            <UserCircle className="w-9 h-9 text-slate-400" />
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-700 truncate">{user?.fullName || 'Guest'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role || 'Viewer'}</p>
            </div>
            <button 
                onClick={handleLogout}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                title="Logout"
            >
                <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <h1 className="text-xl font-bold text-slate-800">{getPageTitle()}</h1>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-64 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-50/50">
          <Outlet />
        </main>

        {/* Toast Container */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-xl border-l-4 min-w-[320px] animate-in slide-in-from-right-full fade-in duration-300 ${
                toast.type === 'success' ? 'bg-white border-green-500 text-slate-800' :
                toast.type === 'error' ? 'bg-white border-red-500 text-slate-800' :
                'bg-white border-blue-500 text-slate-800'
              }`}
            >
              <div className={`mr-3 rounded-full p-1.5 ${
                 toast.type === 'success' ? 'bg-green-100 text-green-600' :
                 toast.type === 'error' ? 'bg-red-100 text-red-600' :
                 'bg-blue-100 text-blue-600'
              }`}>
                {toast.type === 'success' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                {toast.type === 'error' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {toast.type === 'info' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="ml-3 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};