import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ChartOfAccount } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Folder, FileText, 
  ChevronRight, ChevronDown, Check, Info, ArrowLeft, Layers, Landmark
} from 'lucide-react';

export const ChartOfAccounts: React.FC = () => {
  const { 
    chartOfAccounts, saveChartOfAccount, deleteChartOfAccount, showToast
  } = useData();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<ChartOfAccount['accountType']>('Asset');
  const [accountGroup, setAccountGroup] = useState('');
  const [balanceNature, setBalanceNature] = useState<'Debit' | 'Credit'>('Debit');
  const [systemPurpose, setSystemPurpose] = useState('');
  const [parentId, setParentId] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '100000': true,
    '200000': true,
    '400000': true,
    '500000': true,
    '110000': true,
    '130000': true,
    '220000': true
  });

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setAccountType('Asset');
    setAccountGroup('');
    setBalanceNature('Debit');
    setSystemPurpose('');
    setParentId('');
    setIsGroup(false);
    setDescription('');
    setStatus('Active');
  };

  const handleEdit = (coa: ChartOfAccount) => {
    setEditingId(coa.id);
    setCode(coa.code);
    setName(coa.name);
    setAccountType(coa.accountType);
    setAccountGroup(coa.accountGroup || '');
    setBalanceNature(coa.balanceNature);
    setSystemPurpose(coa.systemPurpose || '');
    setParentId(coa.parentId || '');
    setIsGroup(coa.isGroup);
    setDescription(coa.description || '');
    setStatus(coa.status);
    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('error', 'Account Code and Name are required.');
      return;
    }

    // Check code uniqueness
    const duplicate = chartOfAccounts.find(c => c.code === code.trim() && c.id !== editingId);
    if (duplicate) {
      showToast('error', `An account with code "${code.trim()}" already exists.`);
      return;
    }

    // Check parent loop
    if (parentId && parentId === editingId) {
      showToast('error', 'An account cannot be its own parent.');
      return;
    }

    const coaToSave: ChartOfAccount = {
      id: editingId || crypto.randomUUID(),
      code: code.trim(),
      name: name.trim(),
      accountType,
      accountGroup: accountGroup.trim() || undefined,
      balanceNature,
      systemPurpose: systemPurpose.trim() || undefined,
      parentId: parentId || undefined,
      isGroup,
      description: description.trim() || undefined,
      status,
      createdAt: new Date().toISOString()
    };

    const success = await saveChartOfAccount(coaToSave);
    if (success) {
      setViewMode('list');
      resetForm();
      showToast('success', 'Chart of Account saved successfully.');
    }
  };

  // Helper to build hierarchy
  const getNestedAccounts = () => {
    let filtered = chartOfAccounts;
    
    // Apply type filter
    if (typeFilter !== 'All') {
      filtered = chartOfAccounts.filter(c => c.accountType === typeFilter);
    }

    // Apply search filter (forces a flat view so matches aren't hidden by collapsed parents)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.code.includes(q) || 
        (c.systemPurpose && c.systemPurpose.toLowerCase().includes(q))
      );
      return filtered.map(c => ({ account: c, depth: 0 })).sort((a, b) => a.account.code.localeCompare(b.account.code));
    }

    // Tree generation logic
    const sorted = [...filtered].sort((a, b) => a.code.localeCompare(b.code));
    const roots = sorted.filter(c => !c.parentId);

    const result: { account: ChartOfAccount; depth: number }[] = [];
    const traverse = (node: ChartOfAccount, depth: number) => {
      result.push({ account: node, depth });
      if (node.isGroup && expandedNodes[node.id]) {
        const children = sorted.filter(c => c.parentId === node.id);
        children.forEach(c => traverse(c, depth + 1));
      }
    };

    // Order by major accounting types
    const types: ChartOfAccount['accountType'][] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    types.forEach(t => {
      const typeRoots = roots.filter(r => r.accountType === t);
      typeRoots.forEach(r => traverse(r, 0));
    });

    return result;
  };

  const listItems = getNestedAccounts();
  const parentCandidates = chartOfAccounts.filter(c => c.isGroup && c.id !== editingId);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full gap-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Chart of Accounts</h1>
              <p className="text-xs text-slate-500 font-medium">Define, structure, and manage pharmacy accounting ledger nodes</p>
            </div>
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <button
            onClick={() => { resetForm(); setViewMode('form'); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Account
          </button>
        ) : (
          <button
            onClick={() => { resetForm(); setViewMode('list'); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        /* ================== LIST VIEW ================== */
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Filters Area */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, name, purpose..."
                className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter Type:</span>
              <select
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Classifications</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Income (Revenue)</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
          </div>

          {/* Accounts Grid Table */}
          <div className="flex-1 overflow-auto">
            {listItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm shadow-slate-100/50">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-3.5">Account Code & Name</th>
                    <th className="px-6 py-3.5">Classification</th>
                    <th className="px-6 py-3.5">Balance Nature</th>
                    <th className="px-6 py-3.5">Purpose / Function</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-8 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {listItems.map(({ account, depth }) => {
                    const hasChildren = chartOfAccounts.some(c => c.parentId === account.id);
                    const isExpanded = expandedNodes[account.id];

                    return (
                      <tr 
                        key={account.id} 
                        className={`group hover:bg-slate-50/50 transition-colors ${account.isGroup ? 'bg-slate-50/10 font-bold' : ''}`}
                      >
                        <td className="px-8 py-4.5">
                          <div className="flex items-center" style={{ paddingLeft: `${depth * 1.75}rem` }}>
                            
                            {/* Expand/Collapse Button */}
                            {account.isGroup ? (
                              <button 
                                onClick={() => toggleExpand(account.id)}
                                className="p-1 hover:bg-slate-200/60 rounded text-slate-500 mr-1.5 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-6.5" />
                            )}

                            {/* Node Icon */}
                            <span className={`mr-2.5 p-1.5 rounded-lg ${
                              account.isGroup 
                                ? 'bg-amber-50 text-amber-600' 
                                : 'bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                            } transition-colors`}>
                              {account.isGroup ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </span>

                            {/* Code and Name */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {account.code}
                              </span>
                              <span className="text-slate-800 text-sm font-semibold tracking-tight">
                                {account.name}
                              </span>
                            </div>

                          </div>
                        </td>
                        
                        <td className="px-6 py-4.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            account.accountType === 'Asset' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                            account.accountType === 'Liability' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            account.accountType === 'Revenue' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            account.accountType === 'Expense' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {account.accountType === 'Revenue' ? 'Income' : account.accountType}
                          </span>
                        </td>

                        <td className="px-6 py-4.5">
                          <span className={`text-xs font-bold ${
                            account.balanceNature === 'Debit' ? 'text-blue-600' : 'text-emerald-600'
                          }`}>
                            {account.balanceNature}
                          </span>
                        </td>

                        <td className="px-6 py-4.5 max-w-xs truncate">
                          <span 
                            title={account.systemPurpose || account.description || 'N/A'}
                            className="text-xs text-slate-500 font-medium"
                          >
                            {account.systemPurpose || account.description || '--'}
                          </span>
                        </td>

                        <td className="px-6 py-4.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            account.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {account.status}
                          </span>
                        </td>

                        <td className="px-8 py-4.5 text-right">
                          <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEdit(account)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit Account"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (hasChildren) {
                                  showToast('error', 'Cannot delete a parent account that contains sub-accounts.');
                                  return;
                                }
                                if (confirm(`Are you sure you want to delete account "${account.name}"?`)) {
                                  deleteChartOfAccount(account.id);
                                  showToast('info', 'Account deleted.');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                <div className="bg-slate-50 p-4 rounded-full">
                  <Layers className="w-12 h-12 text-slate-300" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-700">No Ledger Accounts Found</h3>
                  <p className="text-xs text-slate-500 mt-1">Add accounting codes to establish the chart of accounts structure</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== FORM VIEW ================== */
        <form onSubmit={handleSave} className="flex-1 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8 overflow-auto">
          
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? 'Modify Ledger Node' : 'Register New Ledger Node'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Configure ledger classification, nature, system purpose and groupings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Code <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                placeholder="e.g. 510000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                placeholder="e.g. Medicine Purchase A/C"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Type (Classification) <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 transition-all"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Income (Revenue)</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Balance Nature <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 transition-all"
                value={balanceNature}
                onChange={(e) => setBalanceNature(e.target.value as any)}
              >
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parent Group Account</label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 transition-all"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">-- No Parent (Root Account) --</option>
                {parentCandidates.map(c => (
                  <option key={c.id} value={c.id}>[{c.code}] {c.name} ({c.accountType})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Group Name (Classification Category)</label>
              <input 
                type="text" 
                placeholder="e.g. Current Assets, Operating Cost"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all"
                value={accountGroup}
                onChange={(e) => setAccountGroup(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Functional System Purpose (Enterprise Mapping)</label>
              <input 
                type="text" 
                placeholder="Describe what automated ledger transactions flow into this bucket"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all"
                value={systemPurpose}
                onChange={(e) => setSystemPurpose(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Description</label>
              <textarea 
                placeholder="Account notes and instructions..."
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 transition-all"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 transition-all"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center mt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Is Group Account</span>
                  <p className="text-[10px] text-slate-400 font-medium">Mark true if this acts as a category/folder for other accounts rather than a posting ledger</p>
                </div>
              </label>
            </div>

          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-100 pt-6 flex justify-end gap-3.5">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
            >
              {editingId ? 'Update Account' : 'Save Account'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
