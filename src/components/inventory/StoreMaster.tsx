import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Store } from '../../types';
import { Plus, Search, X, Edit2, Trash2, Save, Building2 } from 'lucide-react';

export const StoreMaster = () => {
    const { stores, saveStore, deleteStore, branches, showToast, departments } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    
    const initialForm: Store = {
        id: '',
        storeCode: '',
        storeName: '',
        branchId: '',
        status: 'Active',
        isActive: true,
        storeType: 'CENTRAL',
        departmentId: ''
    };

    const [form, setForm] = useState<Store>(initialForm);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.storeCode || !form.storeName || !form.branchId) {
            showToast('error', 'Please fill in all required fields.');
            return;
        }

        const branch = branches.find(b => b.id === form.branchId);
        const payload: Store = {
            ...form,
            id: form.id || crypto.randomUUID(),
            branchName: branch?.name
        };

        await saveStore(payload);
        setShowForm(false);
        setForm(initialForm);
    };

    const handleEdit = (store: Store) => {
        setForm(store);
        setShowForm(true);
    };

    const filteredStores = stores.filter(s => 
        s.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.storeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="Search stores by name, code or branch..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => {
                        setForm(initialForm);
                        setShowForm(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    Add Store
                </button>
            </div>

            {/* Store List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-bottom border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Store Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Store Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital / Branch</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Store Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStores.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                        No stores found. Get started by adding your first store!
                                    </td>
                                </tr>
                            ) : (
                                filteredStores.map((store) => (
                                    <tr key={store.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                {store.storeCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-700">{store.storeName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                {store.branchName || 'Not Assigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                store.storeType === 'CENTRAL' 
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                    : store.storeType === 'SUB_STORE'
                                                    ? 'bg-violet-50 text-violet-600 border border-violet-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                                {store.storeType || 'CENTRAL'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {departments.find(d => d.id === store.departmentId)?.name || 'Not Applicable'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                store.status === 'Active' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    store.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                                                }`}></span>
                                                {store.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(store)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this store?')) {
                                                            deleteStore(store.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
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

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{form.id ? 'Edit Store' : 'Add New Store'}</h3>
                                <p className="text-sm text-slate-500">Configure storage location details</p>
                            </div>
                            <button 
                                onClick={() => setShowForm(false)}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                {/* Store Code */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Store Code *</label>
                                    <input 
                                        type="text"
                                        required
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                        placeholder="e.g. MAIN-WH-01"
                                        value={form.storeCode}
                                        onChange={e => setForm({ ...form, storeCode: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                {/* Store Name */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Store Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. Main Warehouse"
                                        value={form.storeName}
                                        onChange={e => setForm({ ...form, storeName: e.target.value })}
                                    />
                                </div>

                                {/* Branch Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Hospital / Branch *</label>
                                    <select 
                                        required
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                        value={form.branchId || ''}
                                        onChange={e => setForm({ ...form, branchId: e.target.value })}
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Store Type & Department selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Store Type *</label>
                                        <select 
                                            required
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                            value={form.storeType || 'CENTRAL'}
                                            onChange={e => setForm({ ...form, storeType: e.target.value as any })}
                                        >
                                            <option value="CENTRAL">Central</option>
                                            <option value="SUB_STORE">Sub-Store</option>
                                            <option value="PHARMACY">Pharmacy</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                                        <select 
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                            value={form.departmentId || ''}
                                            onChange={e => setForm({ ...form, departmentId: e.target.value })}
                                        >
                                            <option value="">Select Department (Optional)</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                                        <select 
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={form.status}
                                            onChange={e => setForm({ ...form, status: e.target.value as any })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="flex flex-col justify-center">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Internal Status</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={form.isActive}
                                                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            <span className="ml-3 text-sm font-medium text-slate-600">{form.isActive ? 'Active' : 'Locked'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Store
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
