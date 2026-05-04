import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TaxMaster, ItemTaxMapping } from '../types';
import { Search, Plus, Trash2, Tag, Percent, Link as LinkIcon, FileText } from 'lucide-react';

export const Tax: React.FC = () => {
    const { 
        taxMasters, saveTaxMaster, deleteTaxMaster, 
        itemTaxMappings, saveItemTaxMapping, deleteItemTaxMapping,
        inventoryItems, showToast
    } = useData();

    const [activeTab, setActiveTab] = useState<'master' | 'mapping'>('master');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Tax Master State
    const [editingTax, setEditingTax] = useState<Partial<TaxMaster> | null>(null);
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

    // Mapping State
    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedTaxId, setSelectedTaxId] = useState('');

    const filteredTaxes = taxMasters.filter(t => 
        t.taxName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredMappings = itemTaxMappings.map(m => {
        const item = inventoryItems.find(i => i.id === m.itemId);
        const tax = taxMasters.find(t => t.id === m.taxId);
        return { ...m, itemName: item?.itemName, itemCode: item?.itemCode, taxName: tax?.taxName, percentage: tax?.percentage };
    }).filter(m => 
        (m.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         m.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         m.taxName?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSaveTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTax?.taxName || editingTax.percentage === undefined) {
            showToast('error', 'Please fill all required fields');
            return;
        }

        const taxToSave: TaxMaster = {
            id: editingTax.id || crypto.randomUUID(),
            taxName: editingTax.taxName,
            percentage: Number(editingTax.percentage),
            status: editingTax.status || 'Active',
            createdAt: editingTax.createdAt || new Date().toISOString()
        };

        await saveTaxMaster(taxToSave);
        setIsTaxModalOpen(false);
        setEditingTax(null);
        showToast('success', 'Tax definition saved');
    };

    const handleSaveMapping = async () => {
        if (!selectedItemId || !selectedTaxId) {
            showToast('error', 'Select both an item and a tax');
            return;
        }

        // Check if mapping already exists
        const exists = itemTaxMappings.find(m => m.itemId === selectedItemId && m.taxId === selectedTaxId);
        if (exists) {
            showToast('info', 'This mapping already exists');
            return;
        }

        const newMapping: ItemTaxMapping = {
            id: crypto.randomUUID(),
            itemId: selectedItemId,
            taxId: selectedTaxId,
            createdAt: new Date().toISOString()
        };

        await saveItemTaxMapping(newMapping);
        setSelectedItemId('');
        showToast('success', 'Item-Tax mapping saved');
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tax Management</h1>
                    <p className="text-sm text-slate-500">Define tax formulas and map items to VAT categories</p>
                </div>
                {activeTab === 'master' && (
                    <button 
                        onClick={() => { setEditingTax({ status: 'Active' }); setIsTaxModalOpen(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Define New Tax
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('master')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'master' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Percent className="w-4 h-4" />
                    Tax Masters
                </button>
                <button 
                    onClick={() => setActiveTab('mapping')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'mapping' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <LinkIcon className="w-4 h-4" />
                    Item-Tax Mapping
                </button>
            </div>

            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Search Bar */}
                <div className="p-6 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder={activeTab === 'master' ? "Search tax names..." : "Search items or taxes..."}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {activeTab === 'master' ? (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-8 py-4">Tax Name</th>
                                    <th className="px-8 py-4">Percentage</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTaxes.map(tax => (
                                    <tr key={tax.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-slate-700">{tax.taxName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-black text-blue-600">{tax.percentage}%</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                tax.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {tax.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => { setEditingTax(tax); setIsTaxModalOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => { if(confirm('Delete tax?')) deleteTaxMaster(tax.id); }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Mapping Input Area */}
                            <div className="p-8 bg-slate-50 border-b border-slate-100">
                                <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inventory Item</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={selectedItemId}
                                            onChange={(e) => setSelectedItemId(e.target.value)}
                                        >
                                            <option value="">Select Item...</option>
                                            {inventoryItems.map(item => (
                                                <option key={item.id} value={item.id}>{item.itemName} ({item.itemCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Apply Tax</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={selectedTaxId}
                                            onChange={(e) => setSelectedTaxId(e.target.value)}
                                        >
                                            <option value="">Select Tax...</option>
                                            {taxMasters.filter(t => t.status === 'Active').map(tax => (
                                                <option key={tax.id} value={tax.id}>{tax.taxName} ({tax.percentage}%)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleSaveMapping}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <LinkIcon className="w-5 h-5" />
                                        Map Item
                                    </button>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-8 py-4">Item Details</th>
                                        <th className="px-8 py-4">Tax Category</th>
                                        <th className="px-8 py-4">Applied Percentage</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredMappings.map(mapping => (
                                        <tr key={mapping.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-slate-700">{mapping.itemName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{mapping.itemCode}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 font-medium text-slate-600">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                    {mapping.taxName}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-black text-slate-700">{mapping.percentage}%</td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => deleteItemTaxMapping(mapping.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Tax Master */}
            {isTaxModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {editingTax?.id ? 'Edit Tax Definition' : 'New Tax Definition'}
                            </h2>
                            <p className="text-sm text-slate-500">Set the name and percentage for this tax formula</p>
                        </div>
                        <form onSubmit={handleSaveTax} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tax Name</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. VAT 15%"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingTax?.taxName || ''}
                                    onChange={(e) => setEditingTax({ ...editingTax, taxName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Percentage (%)</label>
                                <div className="relative">
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="number"
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingTax?.percentage || ''}
                                        onChange={(e) => setEditingTax({ ...editingTax, percentage: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingTax?.status || 'Active'}
                                    onChange={(e) => setEditingTax({ ...editingTax, status: e.target.value as 'Active' | 'Inactive' })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => { setIsTaxModalOpen(false); setEditingTax(null); }}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
                                >
                                    Save Tax
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tax;
