import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getSupabase } from '../services/supabaseClient';
import { Role, Screen, Privilege, AppUser } from '../types';
import { 
  Shield, Users, Search, Plus, Trash2, Edit3, 
  CheckSquare, Square, Save, RotateCcw, AlertTriangle, 
  UserCheck, ShieldAlert, ChevronRight, X, UserPlus, Key, Eye, EyeOff, LayoutGrid
} from 'lucide-react';

const SCREEN_PRESETS = [
  // LIMS (Lab) Module Screens
  { module: 'Lab', screen_code: 'LIMS_DASHBOARD', screen_name: 'LIMS Dashboard / Lab Menu', screen_url: '/lims/dashboard', display_order: 1 },
  { module: 'Lab', screen_code: 'LIMS_COLLECT', screen_name: 'Collect Sample', screen_url: '/lims/collect', display_order: 2 },
  { module: 'Lab', screen_code: 'LIMS_ACCEPT', screen_name: 'Accept Sample', screen_url: '/lims/accept', display_order: 3 },
  { module: 'Lab', screen_code: 'LIMS_PERFORM', screen_name: 'Perform Test', screen_url: '/lims/perform', display_order: 4 },
  { module: 'Lab', screen_code: 'LIMS_AMENDMENTS', screen_name: 'Pathology Amendments', screen_url: '/lims/amendments', display_order: 5 },
  { module: 'Lab', screen_code: 'LIMS_ANALYTICS', screen_name: 'Compliance & Analytics', screen_url: '/lims/analytics', display_order: 6 },
  { module: 'Lab', screen_code: 'LIMS_MASTERS', screen_name: 'LIMS Masters Configuration', screen_url: '/lims/masters', display_order: 7 },
  
  // Finance Module Screens
  { module: 'Finance', screen_code: 'FIN_BILLING', screen_name: 'Billing Workbench', screen_url: '/finance/billing', display_order: 1 },
  { module: 'Finance', screen_code: 'FIN_REFUND', screen_name: 'Refund Workbench', screen_url: '/finance/transactions/refund', display_order: 2 },
  { module: 'Finance', screen_code: 'FIN_COA', screen_name: 'Chart of Accounts', screen_url: '/finance/masters/chart-of-accounts', display_order: 3 },
  { module: 'Finance', screen_code: 'FIN_JV', screen_name: 'Journal Vouchers', screen_url: '/finance/transactions/journal-vouchers', display_order: 4 },
  { module: 'Finance', screen_code: 'FIN_ORG', screen_name: 'Organization Master', screen_url: '/finance/masters/organization', display_order: 5 },
  { module: 'Finance', screen_code: 'FIN_PLAN', screen_name: 'Plan Definition', screen_url: '/finance/masters/plan-definition', display_order: 6 },
  { module: 'Finance', screen_code: 'FIN_TARIFF', screen_name: 'Sponsor Tariff', screen_url: '/finance/masters/sponsor-tariff', display_order: 7 },

  // Main System / Administration Module Screens
  { module: 'System', screen_code: 'DASHBOARD', screen_name: 'Main Dashboard', screen_url: '/', display_order: 1 },
  { module: 'System', screen_code: 'APPOINTMENTS', screen_name: 'Appointments Page', screen_url: '/appointments', display_order: 2 },
  { module: 'System', screen_code: 'PATIENTS', screen_name: 'Patients Registration', screen_url: '/patients', display_order: 3 },
  { module: 'System', screen_code: 'DOCTOR_WORKBENCH', screen_name: 'Doctor Workbench', screen_url: '/doctor-workbench', display_order: 4 },
  { module: 'System', screen_code: 'ABDM_PROFILES', screen_name: 'ABDM Profiles', screen_url: '/abdm-profiles', display_order: 5 },
  { module: 'System', screen_code: 'REPORTS', screen_name: 'System Reports', screen_url: '/reports', display_order: 6 },
  { module: 'System', screen_code: 'EMPLOYEES', screen_name: 'Doctors & Staff Management', screen_url: '/employees', display_order: 7 },
  { module: 'System', screen_code: 'AVAILABILITY', screen_name: 'Availability Scheduler', screen_url: '/availability', display_order: 8 },
  { module: 'System', screen_code: 'MASTERS', screen_name: 'Administration Masters', screen_url: '/masters', display_order: 9 },
  { module: 'System', screen_code: 'RBAC_CONFIG', screen_name: 'RBAC Control Center', screen_url: '/rbac', display_order: 10 },

  // Inventory Module Screens
  { module: 'Inventory', screen_code: 'INVENTORY_DASHBOARD', screen_name: 'Inventory Module Access', screen_url: '/inventory', display_order: 1 },

  // Pharmacy Module Screens
  { module: 'Pharmacy', screen_code: 'PHARMACY_DASHBOARD', screen_name: 'Pharmacy Module Access', screen_url: '/pharmacy', display_order: 1 },

  // Procurement Module Screens
  { module: 'Procurement', screen_code: 'PROCUREMENT_DASHBOARD', screen_name: 'Procurement Module Access', screen_url: '/procurement', display_order: 1 }
];

export const RbacConfig: React.FC = () => {
  const {
    roles,
    screens,
    departments,
    serviceCentres,
    saveRole,
    deleteRole,
    saveScreen,
    deleteScreen,
    saveRolePrivileges,
    saveUserOverrides,
    saveAppUser,
    deleteAppUser,
    showToast,
    user: currentUser
  } = useData();

  // Tabs
  const [activeTab, setActiveTab] = useState<'roles' | 'screens' | 'users'>('roles');

  // Role Management State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePrivileges, setRolePrivileges] = useState<Record<string, Omit<Privilege, 'screen_code'|'screen_name'|'module'>> >({});
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [selectedRoleModule, setSelectedRoleModule] = useState<string>('Lab');
  
  // Screen Registry Management State
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Partial<Screen> | null>(null);
  const [screenSearchQuery, setScreenSearchQuery] = useState('');
  const [screenForm, setScreenForm] = useState({
    module: 'Lab',
    screen_code: '',
    screen_name: '',
    screen_url: '',
    display_order: 1
  });

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<any | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, Omit<Privilege, 'screen_code'|'screen_name'|'module'>>>({});
  const [selectedOverrideModule, setSelectedOverrideModule] = useState<string>('Lab');
  
  // User Form Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    user_code: '',
    email: '',
    mobile: '',
    role_id: '',
    department_id: '',
    location_id: '',
    is_active: true
  });

  // Load selected role privileges
  useEffect(() => {
    if (selectedRole) {
      loadRolePrivileges(selectedRole.id);
    } else {
      setRolePrivileges({});
    }
  }, [selectedRole]);

  // Load all users on tab activation
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Auto-select first role on load
  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      setSelectedRole(roles[0]);
    }
  }, [roles]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('username');
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      showToast('error', `Failed to load users: ${e.message}`);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadRolePrivileges = async (roleId: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('role_privileges')
        .select('*')
        .eq('role_id', roleId);
      
      if (error) throw error;
      
      const privMap: Record<string, Omit<Privilege, 'screen_code'|'screen_name'|'module'>> = {};
      
      // Initialize all screens as false
      screens.forEach(s => {
        privMap[s.id] = {
          screen_id: s.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_export: false
        };
      });

      // Overlay database results
      if (data) {
        data.forEach((rp: any) => {
          if (privMap[rp.screen_id]) {
            privMap[rp.screen_id] = {
              screen_id: rp.screen_id,
              can_view: !!rp.can_view,
              can_create: !!rp.can_create,
              can_edit: !!rp.can_edit,
              can_delete: !!rp.can_delete,
              can_export: !!rp.can_export
            };
          }
        });
      }
      setRolePrivileges(privMap);
    } catch (e: any) {
      showToast('error', `Failed to load privileges: ${e.message}`);
    }
  };

  const loadUserOverrides = async (userRow: any) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_privilege_overrides')
        .select('*')
        .eq('user_id', userRow.id);
      
      if (error) throw error;

      const overrideMap: Record<string, Omit<Privilege, 'screen_code'|'screen_name'|'module'>> = {};
      
      // Initialize with user's current role privileges as default
      let baseRolePrivs: Record<string, any> = {};
      if (userRow.role_id) {
        const { data: rpList } = await supabase
          .from('role_privileges')
          .select('*')
          .eq('role_id', userRow.role_id);
        if (rpList) {
          rpList.forEach(rp => {
            baseRolePrivs[rp.screen_id] = rp;
          });
        }
      }

      screens.forEach(s => {
        const base = baseRolePrivs[s.id] || {};
        overrideMap[s.id] = {
          screen_id: s.id,
          can_view: base.can_view ?? false,
          can_create: base.can_create ?? false,
          can_edit: base.can_edit ?? false,
          can_delete: base.can_delete ?? false,
          can_export: base.can_export ?? false
        };
      });

      // Overlay explicit overrides from user_privilege_overrides
      if (data) {
        data.forEach((up: any) => {
          overrideMap[up.screen_id] = {
            screen_id: up.screen_id,
            can_view: !!up.can_view,
            can_create: !!up.can_create,
            can_edit: !!up.can_edit,
            can_delete: !!up.can_delete,
            can_export: !!up.can_export
          };
        });
      }

      setUserOverrides(overrideMap);
      setSelectedUserForOverride(userRow);
    } catch (e: any) {
      showToast('error', `Failed to load overrides: ${e.message}`);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole?.role_code || !editingRole?.role_name) return;
    
    const success = await saveRole({
      id: editingRole.id || '',
      role_code: editingRole.role_code.trim().toUpperCase(),
      role_name: editingRole.role_name.trim(),
      description: editingRole.description?.trim() || ''
    });

    if (success) {
      setIsRoleModalOpen(false);
      setEditingRole(null);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this role? All users assigned to this role will lose their default privileges.")) {
      const success = await deleteRole(id);
      if (success && selectedRole?.id === id) {
        setSelectedRole(roles.find(r => r.id !== id) || null);
      }
    }
  };

  // Screen Actions
  const handleAddScreenClick = () => {
    setScreenForm({
      module: 'Lab',
      screen_code: '',
      screen_name: '',
      screen_url: '',
      display_order: screens.length + 1
    });
    setEditingScreen(null);
    setIsScreenModalOpen(true);
  };

  const handleEditScreenClick = (screen: Screen) => {
    setEditingScreen(screen);
    setScreenForm({
      module: screen.module || 'Lab',
      screen_code: screen.screen_code || '',
      screen_name: screen.screen_name || '',
      screen_url: screen.screen_url || '',
      display_order: screen.display_order || 1
    });
    setIsScreenModalOpen(true);
  };

  const handleScreenFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenForm.screen_code.trim() || !screenForm.screen_name.trim() || !screenForm.screen_url.trim()) {
      showToast('error', 'All screen fields are required.');
      return;
    }

    const payload: any = {
      module: screenForm.module,
      screen_code: screenForm.screen_code.trim().toUpperCase(),
      screen_name: screenForm.screen_name.trim(),
      screen_url: screenForm.screen_url.trim(),
      display_order: Number(screenForm.display_order) || 1
    };

    if (editingScreen?.id) {
      payload.id = editingScreen.id;
    }

    const success = await saveScreen(payload);
    if (success) {
      setIsScreenModalOpen(false);
    }
  };

  const handleDeleteScreen = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete screen registration for "${name}"? This will drop all associated role and user overrides.`)) {
      await deleteScreen(id);
    }
  };

  const handleSeedDefaultScreens = async () => {
    try {
      let successCount = 0;
      for (const preset of SCREEN_PRESETS) {
        const success = await saveScreen(preset);
        if (success) successCount++;
      }
      showToast('success', `Successfully seeded ${successCount} screens.`);
    } catch (err: any) {
      console.error("Error seeding screens:", err);
      showToast('error', `Failed to seed screens: ${err.message}`);
    }
  };

  const handleTogglePrivilege = (screenId: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export') => {
    if (!selectedRole) return;
    
    setRolePrivileges(prev => {
      const current = prev[screenId] || {
        screen_id: screenId,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_export: false
      };
      
      const updated = {
        ...current,
        [field]: !current[field]
      };

      // Auto-enable can_view if any write operation is enabled
      if (field !== 'can_view' && updated[field] === true) {
        updated.can_view = true;
      }
      
      return {
        ...prev,
        [screenId]: updated
      };
    });
  };

  const handleToggleOverride = (screenId: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export') => {
    setUserOverrides(prev => {
      const current = prev[screenId] || {
        screen_id: screenId,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_export: false
      };
      const updated = {
        ...current,
        [field]: !current[field]
      };
      if (field !== 'can_view' && updated[field] === true) {
        updated.can_view = true;
      }
      return {
        ...prev,
        [screenId]: updated
      };
    });
  };

  const handleSavePrivileges = async () => {
    if (!selectedRole) return;
    const list = Object.values(rolePrivileges);
    const success = await saveRolePrivileges(selectedRole.id, list);
    if (success) {
      showToast('success', 'Privileges applied to role.');
    }
  };

  const handleSaveOverrides = async () => {
    if (!selectedUserForOverride) return;
    const list = Object.values(userOverrides);
    const success = await saveUserOverrides(selectedUserForOverride.id, list);
    if (success) {
      setSelectedUserForOverride(null);
      fetchUsers();
    }
  };

  // User Actions
  const handleAddUserClick = () => {
    setUserForm({
      username: '',
      password: '',
      full_name: '',
      user_code: '',
      email: '',
      mobile: '',
      role_id: '',
      department_id: '',
      location_id: '',
      is_active: true
    });
    setEditingUser(null);
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (userRow: any) => {
    setEditingUser(userRow);
    setUserForm({
      username: userRow.username || '',
      password: '', // leave empty to keep password
      full_name: userRow.full_name || '',
      user_code: userRow.user_code || '',
      email: userRow.email || '',
      mobile: userRow.mobile || '',
      role_id: userRow.role_id || '',
      department_id: userRow.department_id || '',
      location_id: userRow.location_id || '',
      is_active: userRow.is_active ?? true
    });
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.full_name.trim()) {
      showToast('error', 'Username and Full Name are required.');
      return;
    }
    if (!editingUser && !userForm.password) {
      showToast('error', 'Password is required for new users.');
      return;
    }

    const payload: any = {
      username: userForm.username.trim(),
      fullName: userForm.full_name.trim(),
      user_code: userForm.user_code.trim(),
      email: userForm.email.trim(),
      mobile: userForm.mobile.trim(),
      role_id: userForm.role_id || null,
      department_id: userForm.department_id || null,
      location_id: userForm.location_id || null,
      is_active: userForm.is_active
    };

    if (userForm.password) {
      payload.password = userForm.password;
    }

    if (editingUser) {
      payload.id = editingUser.id;
    }

    const success = await saveAppUser(payload);
    if (success) {
      setIsUserModalOpen(false);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (currentUser?.id === userId) {
      showToast('error', 'You cannot delete your own user account.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user @${username}?`)) {
      const success = await deleteAppUser(userId);
      if (success) {
        fetchUsers();
      }
    }
  };

  const getRoleName = (roleId: string) => {
    const r = roles.find(x => x.id === roleId);
    return r ? r.role_name : 'No Role Assigned';
  };

  const getDepartmentName = (deptId: string) => {
    const d = departments.find(x => x.id === deptId);
    return d ? d.name : '---';
  };

  const getLocationName = (locId: string) => {
    const l = serviceCentres.find(x => x.id === locId);
    return l ? l.name : '---';
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.user_code || '').toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredScreens = screens.filter(s => 
    s.screen_name.toLowerCase().includes(screenSearchQuery.toLowerCase()) ||
    s.screen_code.toLowerCase().includes(screenSearchQuery.toLowerCase()) ||
    s.module.toLowerCase().includes(screenSearchQuery.toLowerCase())
  );

  const filteredRoleScreens = screens.filter(s => s.module === selectedRoleModule);
  const filteredOverrideScreens = screens.filter(s => s.module === selectedOverrideModule);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
            <Shield className="w-7 h-7 mr-2.5 text-blue-600" />
            User Master, Roles & Privileges Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure access control, screen-level granular permissions, and administrator overrides.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1 self-start md:self-auto border border-slate-300/30">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'roles'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" /> Role Matrix
          </button>
          <button
            onClick={() => setActiveTab('screens')}
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'screens'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Screen Registry
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> User Control
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'roles' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          {/* Roles List Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">System Roles</h3>
              <button
                onClick={() => {
                  setEditingRole({ role_code: '', role_name: '', description: '' });
                  setIsRoleModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                title="Create New Role"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {roles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  No roles defined. Click + to add.
                </div>
              ) : (
                roles.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r)}
                    className={`p-4 cursor-pointer transition-all flex items-center justify-between border-l-4 ${
                      selectedRole?.id === r.id
                        ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-medium'
                        : 'border-transparent hover:bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate uppercase">{r.role_code}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{r.role_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 group-hover:opacity-100 md:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRole(r);
                          setIsRoleModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-white border border-transparent hover:border-slate-100 transition-colors"
                        title="Edit Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(r.id);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white border border-transparent hover:border-slate-100 transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Role Screen Privileges Matrix */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[calc(100vh-220px)] min-h-[500px] overflow-hidden">
            {selectedRole ? (
              <>
                {/* Header info */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider border border-blue-200">
                        {selectedRole.role_code}
                      </span>
                      <h2 className="text-lg font-bold text-slate-800">{selectedRole.role_name}</h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedRole.description || 'No description available.'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Module Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Module Category:</span>
                      <select
                        value={selectedRoleModule}
                        onChange={e => setSelectedRoleModule(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                      >
                        <option value="Lab">Lab (LIMS)</option>
                        <option value="Finance">Finance</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Procurement">Procurement</option>
                        <option value="System">System</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRole.role_code === 'ADMIN' || selectedRole.role_code === 'ADMINISTRATOR' ? (
                        <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-semibold">
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Admin Role has full system bypass
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => loadRolePrivileges(selectedRole.id)}
                            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors flex items-center"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                          </button>
                          <button
                            onClick={handleSavePrivileges}
                            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Apply Matrix
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privileges Matrix Grid */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(226,232,240,0.8)] z-10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Module & Screen</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Create</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Edit</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Delete</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {screens.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">
                            <p className="mb-3">No screen definitions found in screens database.</p>
                            <button
                              type="button"
                              onClick={handleSeedDefaultScreens}
                              className="bg-blue-600 hover:bg-blue-750 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              Seed Default LIMS & Finance Screens
                            </button>
                          </td>
                        </tr>
                      ) : filteredRoleScreens.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">
                            <p className="mb-2">No screens registered under the "{selectedRoleModule}" module category.</p>
                            <button
                              onClick={() => {
                                setScreenForm({
                                  module: selectedRoleModule,
                                  screen_code: '',
                                  screen_name: '',
                                  screen_url: '',
                                  display_order: 1
                                });
                                setIsScreenModalOpen(true);
                              }}
                              className="text-xs font-bold text-blue-600 underline"
                            >
                              Register a Screen for {selectedRoleModule} now
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredRoleScreens.map(s => {
                          const priv = rolePrivileges[s.id] || {
                            can_view: false,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                            can_export: false
                          };
                          const isAdminBypass = selectedRole.role_code === 'ADMIN' || selectedRole.role_code === 'ADMINISTRATOR';

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-800 text-sm">{s.screen_name}</div>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono font-medium">{s.module}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono text-slate-400">{s.screen_url}</span>
                                </div>
                              </td>

                              {/* Permission Checkboxes */}
                              {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map(field => (
                                <td key={field} className="px-6 py-4 text-center">
                                  <button
                                    disabled={isAdminBypass}
                                    onClick={() => handleTogglePrivilege(s.id, field)}
                                    className={`inline-flex items-center justify-center p-1 rounded-md transition-colors ${
                                      isAdminBypass
                                        ? 'text-green-500 cursor-not-allowed bg-green-50/50'
                                        : priv[field]
                                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100/80'
                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isAdminBypass || priv[field] ? (
                                      <CheckSquare className="w-5 h-5" />
                                    ) : (
                                      <Square className="w-5 h-5" />
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ShieldAlert className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No role selected</p>
                <p className="text-xs text-slate-400 mt-1">Please select or create a role to display the privileges matrix.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'screens' ? (
        /* Screen Registry Management Tab */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300 flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search screens by name, code or module..."
                value={screenSearchQuery}
                onChange={e => setScreenSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider text-slate-400">
                Total Screens: {screens.length}
              </span>
              <button
                type="button"
                onClick={handleSeedDefaultScreens}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Seed Defaults
              </button>
              <button
                onClick={handleAddScreenClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Register Screen
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(226,232,240,0.8)] z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Screen Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Screen Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Relative Path / URL</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Display Order</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScreens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">
                      No screens registered in registry. Click "+ Register Screen" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredScreens.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border">
                          {s.module}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-xs text-blue-900 uppercase">
                        {s.screen_code}
                      </td>
                      <td className="px-6 py-4 font-semibold text-sm">
                        {s.screen_name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {s.screen_url}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-xs">
                        {s.display_order}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditScreenClick(s)}
                            className="text-slate-450 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                            title="Edit Route"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteScreen(s.id, s.screen_name)}
                            className="text-slate-450 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                            title="Delete Route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* User List and Access Settings Tab */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300 flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          {/* List Search Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search username, email, full name, code..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider text-slate-400">
                Total Users: {users.length}
              </span>
              <button
                onClick={handleAddUserClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(226,232,240,0.8)] z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Username & Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dept & Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 italic text-sm">
                      Retrieving credentials data...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">
                      No user matched.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isSelf = currentUser?.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm flex items-center">
                            {u.full_name || 'User'}
                            {isSelf && (
                              <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-extrabold uppercase border">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
                            <span className="font-mono font-medium">@{u.username}</span>
                            <span>&bull;</span>
                            <span>{u.email || 'No email'}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-semibold text-xs text-slate-600">
                          {u.user_code || '---'}
                        </td>

                        <td className="px-6 py-4 font-semibold text-xs text-slate-700">
                          {getRoleName(u.role_id)}
                        </td>

                        <td className="px-6 py-4 text-xs">
                          <div className="font-medium text-slate-700">Dept: {getDepartmentName(u.department_id)}</div>
                          <div className="text-slate-400 mt-0.5">Loc: {getLocationName(u.location_id)}</div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-bold uppercase tracking-wider border ${
                            u.is_active
                              ? 'bg-green-55/10 text-green-700 border-green-200/50'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.is_active ? 'bg-green-600' : 'bg-slate-400'}`}></span>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditUserClick(u)}
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                              title="Edit User Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => loadUserOverrides(u)}
                              className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                              title="Manage Granular Overrides"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isSelf}
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isSelf 
                                  ? 'text-slate-200 cursor-not-allowed' 
                                  : 'text-slate-350 hover:text-red-500 hover:bg-red-50'
                              }`}
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role details modal */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingRole.id ? 'Edit Role Details' : 'Create System Role'}
              </h3>
              <button
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setEditingRole(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CLINICAL_DIRECTOR"
                  disabled={!!editingRole.id} // Code is read-only on edit
                  value={editingRole.role_code || ''}
                  onChange={e => setEditingRole({ ...editingRole, role_code: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-semibold text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Clinical Director"
                  value={editingRole.role_name || ''}
                  onChange={e => setEditingRole({ ...editingRole, role_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Provide details about scope of access..."
                  value={editingRole.description || ''}
                  onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {editingRole.id ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screen definition modal */}
      {isScreenModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingScreen ? 'Edit Screen Route Registration' : 'Register New Screen / Privilege Scope'}
              </h3>
              <button
                onClick={() => setIsScreenModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScreenFormSubmit} className="p-6 space-y-4 font-semibold">
              {/* Optional Quick Preset Selector */}
              {!editingScreen && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-250/60 mb-2">
                  <label className="block text-xxs font-extrabold text-blue-600 uppercase tracking-wider mb-1">Quick Register Preset (Autofills below)</label>
                  <select
                    onChange={e => {
                      const idx = parseInt(e.target.value);
                      if (!isNaN(idx) && SCREEN_PRESETS[idx]) {
                        const preset = SCREEN_PRESETS[idx];
                        setScreenForm({
                          module: preset.module,
                          screen_code: preset.screen_code,
                          screen_name: preset.screen_name,
                          screen_url: preset.screen_url,
                          display_order: preset.display_order
                        });
                      }
                    }}
                    className="w-full h-8 px-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white text-slate-700 font-medium"
                  >
                    <option value="">-- Choose Preset Screen --</option>
                    {SCREEN_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.module} - {p.screen_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Module Category</label>
                <select
                  value={screenForm.module}
                  onChange={e => setScreenForm({ ...screenForm, module: e.target.value })}
                  className="w-full h-10 px-3.5 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
                >
                  <option value="Lab">Lab (LIMS)</option>
                  <option value="Finance">Finance</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Procurement">Procurement</option>
                  <option value="System">System</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Screen Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. LIMS_DASHBOARD"
                  disabled={!!editingScreen}
                  value={screenForm.screen_code}
                  onChange={e => setScreenForm({ ...screenForm, screen_code: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-semibold text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Screen Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. LIMS Dashboard"
                  value={screenForm.screen_name}
                  onChange={e => setScreenForm({ ...screenForm, screen_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Screen Relative Route (URL)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. /lims/dashboard"
                  value={screenForm.screen_url}
                  onChange={e => setScreenForm({ ...screenForm, screen_url: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Order Weight</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={screenForm.display_order}
                  onChange={e => setScreenForm({ ...screenForm, display_order: parseInt(e.target.value) || 1 })}
                  className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScreenModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {editingScreen ? 'Save Changes' : 'Register Screen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser ? `Edit User Credentials: @${editingUser.username}` : 'Register New User Credentials'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username (Login ID)</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. jdoe"
                    disabled={!!editingUser}
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password (Login Secret)'}
                  </label>
                  <div className="relative">
                    <input
                      required={!editingUser}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingUser ? '••••••••' : 'Enter login password'}
                      value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3.5 py-2 pr-10 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={userForm.full_name}
                    onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-semibold"
                  />
                </div>

                {/* User Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">User Code / Employee ID</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP1024"
                    value={userForm.user_code}
                    onChange={e => setUserForm({ ...userForm, user_code: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-semibold"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. jdoe@medicore.com"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 99999 99999"
                    value={userForm.mobile}
                    onChange={e => setUserForm({ ...userForm, mobile: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                  />
                </div>

                {/* Role ID Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign System Role</label>
                  <select
                    value={userForm.role_id}
                    onChange={e => setUserForm({ ...userForm, role_id: e.target.value })}
                    className="w-full h-[38px] px-3 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-semibold"
                  >
                    <option value="">No Role Assigned</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.role_name}</option>
                    ))}
                  </select>
                </div>

                {/* Department Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Map Department</label>
                  <select
                    value={userForm.department_id}
                    onChange={e => setUserForm({ ...userForm, department_id: e.target.value })}
                    className="w-full h-[38px] px-3 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-semibold"
                  >
                    <option value="">No Department Mapped</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Service Location Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Map Service Location (Center)</label>
                  <select
                    value={userForm.location_id}
                    onChange={e => setUserForm({ ...userForm, location_id: e.target.value })}
                    className="w-full h-[38px] px-3 border border-slate-300/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-semibold"
                  >
                    <option value="">No Location Mapped</option>
                    {serviceCentres.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Is Active Status checkbox/toggle */}
                <div className="flex items-center pt-6">
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, is_active: !userForm.is_active })}
                    className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider transition-colors"
                  >
                    {userForm.is_active ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 mr-2" />
                    )}
                    Enable User Account (Active Status)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Privilege overrides drawer/modal */}
      {selectedUserForOverride && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
                  Granular Overrides: {selectedUserForOverride.full_name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Specific privileges here override the base settings assigned via role mapping.
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForOverride(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Module selection header for overrides */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/20 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Module Category:</span>
              <select
                value={selectedOverrideModule}
                onChange={e => setSelectedOverrideModule(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
              >
                <option value="Lab">Lab (LIMS)</option>
                <option value="Finance">Finance</option>
                <option value="Inventory">Inventory</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Procurement">Procurement</option>
                <option value="System">System</option>
              </select>
            </div>

            {/* Overrides Privileges list */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(226,232,240,0.8)] z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Screen Name</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Create</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Edit</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Delete</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOverrideScreens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">
                        No screens registered under the "{selectedOverrideModule}" module category.
                      </td>
                    </tr>
                  ) : (
                    filteredOverrideScreens.map(s => {
                      const priv = userOverrides[s.id] || {
                        can_view: false,
                        can_create: false,
                        can_edit: false,
                        can_delete: false,
                        can_export: false
                      };

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/40">
                          <td className="px-6 py-3">
                            <div className="font-semibold text-slate-700 text-xs">{s.screen_name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{s.module} &bull; {s.screen_code}</div>
                          </td>

                          {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map(field => (
                            <td key={field} className="px-6 py-3 text-center">
                              <button
                                onClick={() => handleToggleOverride(s.id, field)}
                                  className={`inline-flex items-center justify-center p-1 rounded-md transition-colors ${
                                  priv[field]
                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                    : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {priv[field] ? (
                                  <CheckSquare className="w-4.5 h-4.5" />
                                ) : (
                                  <Square className="w-4.5 h-4.5" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserForOverride(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveOverrides}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" /> Save Override Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
