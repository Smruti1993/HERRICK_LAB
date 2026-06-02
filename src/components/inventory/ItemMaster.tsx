import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { InventoryItem, InventoryItemStock } from '../../types';
import { Plus, Search, X, FileSpreadsheet, FileDown, Edit2, Trash2, Save, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ItemMaster = () => {
    const { inventoryItems, saveInventoryItem, uploadInventoryItems, branches, showToast } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [branchSearch, setBranchSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('Accounts and Sales Info.');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialItem: InventoryItem = {
        id: '',
        itemCode: '',
        itemName: '',
        itemDescription: '',
        arabicName: '',
        itemType: 'NON-MEDICAL',
        itemCategory: '',
        itemGroup: 'Pharmacy',
        itemClass: '',
        stockType: 'Stock',
        procurementType: 'Local',
        baseUom: 'EACH',
        trackUom: 'EACH',
        distributionCategory: 'Unit',
        purchaseOrganisation: 'Pharmacy',
        shelfLifeLimit: 0.0,
        itemSpecification: '',
        sfda: '',
        gtin: '',
        nphiesDrugType: '',
        isInventorised: true,
        isBatchTracked: true,
        isExpiryDateRequired: true,
        isSerialized: false,
        isActive: true,
        isApprovalRequired: true,
        isInsuranceCover: true,
        drugSubGroups: '',
        purchaseUom: 'EACH',
        salesUom: 'EACH',
        purchaseConversionFactor: 1,
        salesConversionFactor: 1,
        defaultPricingMethod: 'MRP',
        defaultMarkupPercentage: 0.0,
        branch: '',
        purchaseInventoryAcc: '',
        costOfSalesAcc: '',
        saleAccount: '',
        stock: {
            id: '',
            itemId: '',
            vedCategory: '',
            isReusable: false,
            itemRate: 1.0,
            fsnType: '',
            isBulky: false,
            cycleCountFrequency: '',
            reusableCount: 0,
            reservedQty: 0.0,
            manufacturerName: ''
        },
        pricing: []
    };

    const [form, setForm] = useState<InventoryItem>(initialItem);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const itemId = form.id || crypto.randomUUID();
        const payload: InventoryItem = {
            ...form,
            id: itemId,
            stock: form.stock ? {
                ...form.stock,
                id: form.stock.id || crypto.randomUUID(),
                itemId: itemId
            } : undefined,
            pricing: form.pricing?.map(p => ({
                ...p,
                itemId: itemId
            })) || []
        };
        await saveInventoryItem(payload);
        setShowForm(false);
        setForm(initialItem);
    };

    const handleEdit = (item: InventoryItem) => {
        setForm({
            ...item,
            stock: item.stock || { 
                ...(initialItem.stock as InventoryItemStock), 
                itemId: item.id 
            }
        });
        setShowForm(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            const mapped: InventoryItem[] = data.map(row => ({
                ...initialItem,
                id: crypto.randomUUID(),
                itemCode: row['Item Code'] || '',
                itemName: row['Item Name'] || '',
                itemDescription: row['Item Description'] || row['Item Name'] || '',
                arabicName: row['Arabic Name'] || '',
                itemType: row['Item Type'] || 'NON-MEDICAL',
                itemCategory: row['Item Category'] || '',
                itemGroup: row['Item Group'] || 'Pharmacy',
                purchaseInventoryAcc: row['Purchase/Inventory Acc'] || 'Default Acc',
                costOfSalesAcc: row['Cost Of Sales Acc'] || 'Default Acc',
                saleAccount: row['Sale Account'] || 'Default Acc',
            })).filter(i => i.itemCode && i.itemName);

            if (mapped.length > 0) {
                uploadInventoryItems(mapped);
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const data = [{
            'Item Code': 'ITEM001',
            'Item Name': 'Sample Item',
            'Arabic Name': 'عنصر عينة',
            'Item Type': 'NON-MEDICAL',
            'Item Category': 'General',
            'Item Group': 'Pharmacy',
            'Purchase/Inventory Acc': 'ACC-001',
            'Cost Of Sales Acc': 'ACC-002',
            'Sale Account': 'ACC-003'
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "item_master_template.xlsx");
    };

    const filtered = inventoryItems.filter(i =>
        i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Action Bar */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Item Master</h2>
                        <p className="text-xs text-slate-500 font-medium">Manage hospital inventory and assets</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            placeholder="Search by code or name..."
                            className="w-full h-10 pl-10 pr-4 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => { setForm(initialItem); setShowForm(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Item
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" /> Bulk Import
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />

                    <button
                        onClick={downloadTemplate}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                        title="Download Template"
                    >
                        <FileDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
                {showForm ? (
                    <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">
                                {form.id ? 'Edit Item Details' : 'Create New Inventory Item'}
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Row 1 */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Code <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                        value={form.itemCode}
                                        onChange={e => setForm({ ...form, itemCode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemName}
                                        onChange={e => setForm({ ...form, itemName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Description <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemDescription}
                                        onChange={e => setForm({ ...form, itemDescription: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Arabic Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-right font-arabic"
                                        value={form.arabicName}
                                        onChange={e => setForm({ ...form, arabicName: e.target.value })}
                                    />
                                </div>

                                {/* Row 2 */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Type <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemType}
                                        onChange={e => setForm({ ...form, itemType: e.target.value })}
                                    >
                                        <option>NON-MEDICAL</option>
                                        <option>MEDICAL</option>
                                        <option>CONSUMABLE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Category <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemCategory}
                                        onChange={e => setForm({ ...form, itemCategory: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Group <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemGroup}
                                        onChange={e => setForm({ ...form, itemGroup: e.target.value })}
                                    >
                                        <option>Pharmacy</option>
                                        <option>Laboratory</option>
                                        <option>General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Class</label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.itemClass}
                                        onChange={e => setForm({ ...form, itemClass: e.target.value })}
                                    >
                                        <option value="">-- Select --</option>
                                        <option>Class A</option>
                                        <option>Class B</option>
                                    </select>
                                </div>

                                {/* Row 3 */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock Type</label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.stockType}
                                        onChange={e => setForm({ ...form, stockType: e.target.value })}
                                    >
                                        <option>Stock</option>
                                        <option>Non-Stock</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Procurement Type</label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.procurementType}
                                        onChange={e => setForm({ ...form, procurementType: e.target.value })}
                                    >
                                        <option>Local</option>
                                        <option>Import</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base UOM</label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.baseUom}
                                        onChange={e => setForm({ ...form, baseUom: e.target.value })}
                                    >
                                        <option value="EACH">EACH</option>
                                        <option value="BOX">BOX</option>
                                        <option value="PACK">PACK</option>
                                        <option value="STRIP">STRIP</option>
                                        <option value="TABLET">TABLET</option>
                                        <option value="CAPSULE">CAPSULE</option>
                                        <option value="VIAL">VIAL</option>
                                        <option value="AMPOULE">AMPOULE</option>
                                        <option value="BOTTLE">BOTTLE</option>
                                        <option value="ML">ML</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Track UOM</label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.trackUom}
                                        onChange={e => setForm({ ...form, trackUom: e.target.value })}
                                    >
                                        <option value="EACH">EACH</option>
                                        <option value="BOX">BOX</option>
                                        <option value="PACK">PACK</option>
                                        <option value="STRIP">STRIP</option>
                                        <option value="TABLET">TABLET</option>
                                        <option value="CAPSULE">CAPSULE</option>
                                        <option value="VIAL">VIAL</option>
                                        <option value="AMPOULE">AMPOULE</option>
                                        <option value="BOTTLE">BOTTLE</option>
                                        <option value="ML">ML</option>
                                    </select>
                                </div>

                                {/* Row 4 */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distribution Category <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.distributionCategory}
                                        onChange={e => setForm({ ...form, distributionCategory: e.target.value })}
                                    >
                                        <option>Unit</option>
                                        <option>Box</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase Organisation <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.purchaseOrganisation}
                                        onChange={e => setForm({ ...form, purchaseOrganisation: e.target.value })}
                                    >
                                        <option>Pharmacy</option>
                                        <option>Laboratory</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Shelf Life Limit</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.shelfLifeLimit}
                                        onChange={e => setForm({ ...form, shelfLifeLimit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GTIN</label>
                                    <input
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={form.gtin}
                                        onChange={e => setForm({ ...form, gtin: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="mt-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {[
                                    { k: 'isInventorised', l: 'Inventorised' },
                                    { k: 'isBatchTracked', l: 'Is batch tracked' },
                                    { k: 'isExpiryDateRequired', l: 'Is expiry date required' },
                                    { k: 'isSerialized', l: 'Is serialized' },
                                    { k: 'isActive', l: 'Active' },
                                    { k: 'isApprovalRequired', l: 'Is Approval Required' },
                                    { k: 'isInsuranceCover', l: 'Is Insurance Cover' },
                                ].map(cb => (
                                    <label key={cb.k} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 transition-all border-slate-300"
                                            checked={(form as any)[cb.k]}
                                            onChange={e => setForm({ ...form, [cb.k]: e.target.checked })}
                                        />
                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{cb.l}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Sub-tabs */}
                            <div className="mt-10">
                                <div className="flex border-b border-slate-200 gap-4">
                                    {['Accounts and Sales Info.', 'Stock', 'Stores', 'Alternate Items', 'Upload', 'Pricing Method', 'Remarks'].map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveSubTab(tab)}
                                            className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
                                                activeSubTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            {tab}
                                            {activeSubTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-in fade-in duration-300" />}
                                        </button>
                                    ))}
                                </div>

                                <div className="py-8 animate-in fade-in duration-500">
                                    {activeSubTab === 'Accounts and Sales Info.' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            <div className="space-y-6">
                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase UOM <span className="text-red-500">*</span></label>
                                                    <select
                                                        className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.purchaseUom}
                                                        onChange={e => setForm({ ...form, purchaseUom: e.target.value })}
                                                    >
                                                        <option value="EACH">EACH</option>
                                                        <option value="BOX">BOX</option>
                                                        <option value="PACK">PACK</option>
                                                        <option value="STRIP">STRIP</option>
                                                        <option value="TABLET">TABLET</option>
                                                        <option value="CAPSULE">CAPSULE</option>
                                                        <option value="VIAL">VIAL</option>
                                                        <option value="AMPOULE">AMPOULE</option>
                                                        <option value="BOTTLE">BOTTLE</option>
                                                        <option value="ML">ML</option>
                                                    </select>
                                                </div>
                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase Conversion Factor <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.purchaseConversionFactor || ''}
                                                        onChange={e => setForm({ ...form, purchaseConversionFactor: parseFloat(e.target.value) || 1 })}
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1.5 italic">
                                                        * 1 {form.purchaseUom || 'BOX'} = {form.purchaseConversionFactor || 1} {form.baseUom || 'EACH'}(s)
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Pricing Method</label>
                                                    <select
                                                        className="w-full h-10 px-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.defaultPricingMethod}
                                                        onChange={e => setForm({ ...form, defaultPricingMethod: e.target.value })}
                                                    >
                                                        <option>MRP</option>
                                                        <option>Cost Plus</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sales UOM <span className="text-red-500">*</span></label>
                                                    <select
                                                        className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.salesUom}
                                                        onChange={e => setForm({ ...form, salesUom: e.target.value })}
                                                    >
                                                        <option value="EACH">EACH</option>
                                                        <option value="BOX">BOX</option>
                                                        <option value="PACK">PACK</option>
                                                        <option value="STRIP">STRIP</option>
                                                        <option value="TABLET">TABLET</option>
                                                        <option value="CAPSULE">CAPSULE</option>
                                                        <option value="VIAL">VIAL</option>
                                                        <option value="AMPOULE">AMPOULE</option>
                                                        <option value="BOTTLE">BOTTLE</option>
                                                        <option value="ML">ML</option>
                                                    </select>
                                                </div>
                                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sales Conversion Factor <span className="text-red-500">*</span></label>
                                                    <input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.salesConversionFactor || ''}
                                                        onChange={e => setForm({ ...form, salesConversionFactor: parseFloat(e.target.value) || 1 })}
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1.5 italic">
                                                        * 1 {form.salesUom || 'STRIP'} = {form.salesConversionFactor || 1} {form.baseUom || 'EACH'}(s)
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Markup Percentage</label>
                                                    <input
                                                        type="number"
                                                        className="w-full h-10 px-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={form.defaultMarkupPercentage}
                                                        onChange={e => setForm({ ...form, defaultMarkupPercentage: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">Account Mapping</h4>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Purchase/Inventory Acc. <span className="text-red-500">*</span></label>
                                                    <select required className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs" value={form.purchaseInventoryAcc} onChange={e => setForm({ ...form, purchaseInventoryAcc: e.target.value })}>
                                                        <option value="">-- Select --</option>
                                                        <option>INV-001 - Main Pharmacy</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cost Of Sales Acc. <span className="text-red-500">*</span></label>
                                                    <select required className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs" value={form.costOfSalesAcc} onChange={e => setForm({ ...form, costOfSalesAcc: e.target.value })}>
                                                        <option value="">-- Select --</option>
                                                        <option>COS-001 - Cost Of Sales</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sale Account <span className="text-red-500">*</span></label>
                                                    <select required className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs" value={form.saleAccount} onChange={e => setForm({ ...form, saleAccount: e.target.value })}>
                                                        <option value="">-- Select --</option>
                                                        <option>SAL-001 - Sales Revenue</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSubTab === 'Stock' && form.stock && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
                                            {/* Left Column */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <label className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">VED Category</label>
                                                    <select 
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.vedCategory}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, vedCategory: e.target.value } })}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        <option>Vital</option>
                                                        <option>Essential</option>
                                                        <option>Desirable</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider uppercase">Reusable</label>
                                                    <input 
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 transition-all border-slate-300"
                                                        checked={form.stock.isReusable}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, isReusable: e.target.checked } })}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Item rate <span className="text-red-500">*</span></label>
                                                    <input 
                                                        type="number"
                                                        required
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.itemRate}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, itemRate: Number(e.target.value) } })}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">FSN Type</label>
                                                    <select 
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.fsnType}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, fsnType: e.target.value } })}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        <option>Fast</option>
                                                        <option>Slow</option>
                                                        <option>Non-moving</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Bulky</label>
                                                    <input 
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 transition-all border-slate-300"
                                                        checked={form.stock.isBulky}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, isBulky: e.target.checked } })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <label className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">Cycle Count Frequency</label>
                                                    <select 
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.cycleCountFrequency}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, cycleCountFrequency: e.target.value } })}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        <option>Monthly</option>
                                                        <option>Quarterly</option>
                                                        <option>Annually</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">Reusable Count</label>
                                                    <input 
                                                        type="number"
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.reusableCount}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, reusableCount: Number(e.target.value) } })}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">Reserved Qty</label>
                                                    <input 
                                                        type="number"
                                                        step="0.1"
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.reservedQty}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, reservedQty: Number(e.target.value) } })}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="w-40 text-xs font-bold text-slate-500 uppercase tracking-wider">Manufacturer Name</label>
                                                    <input 
                                                        className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={form.stock.manufacturerName}
                                                        onChange={e => setForm({ ...form, stock: { ...form.stock!, manufacturerName: e.target.value } })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSubTab === 'Pricing Method' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="relative w-72">
                                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input 
                                                        placeholder="Search Hospital/Branch..." 
                                                        className="w-full h-9 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        value={branchSearch}
                                                        onChange={e => setBranchSearch(e.target.value)}
                                                    />
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (branches.length === 0) {
                                                            showToast('info', 'No hospitals/branches configured. Please add them in the Hospital Master first.');
                                                            return;
                                                        }
                                                        const existingBranchIds = new Set(form.pricing?.map(p => p.branchId) || []);
                                                        const missingBranches = branches.filter(b => !existingBranchIds.has(b.id));
                                                        const newPricing = missingBranches.map(b => ({
                                                            id: crypto.randomUUID(),
                                                            itemId: form.id,
                                                            branchId: b.id,
                                                            branchName: b.name,
                                                            pricingMethod: 'MRP',
                                                            price: 0,
                                                            markupPercentage: 0
                                                        }));
                                                        setForm({ ...form, pricing: [...(form.pricing || []), ...newPricing] });
                                                    }}
                                                    className="text-blue-600 text-xs font-bold hover:underline"
                                                >
                                                    + Add All Branches
                                                </button>
                                            </div>

                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100">
                                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hospital/Branch Name</th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Default Pricing Method</th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Markup Percentage</th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {(form.pricing || [])
                                                            .filter(p => p.branchName.toLowerCase().includes(branchSearch.toLowerCase()))
                                                            .map((p, idx) => (
                                                            <tr key={p.branchId} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <span className="text-sm font-semibold text-slate-700">{p.branchName}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <select 
                                                                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        value={p.pricingMethod}
                                                                        onChange={e => {
                                                                            const newPricing = [...(form.pricing || [])];
                                                                            newPricing[idx] = { ...p, pricingMethod: e.target.value };
                                                                            setForm({ ...form, pricing: newPricing });
                                                                        }}
                                                                    >
                                                                        <option>MRP</option>
                                                                        <option>Cost Plus</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <input 
                                                                        type="number"
                                                                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none text-right"
                                                                        value={p.price}
                                                                        onChange={e => {
                                                                            const newPricing = [...(form.pricing || [])];
                                                                            newPricing[idx] = { ...p, price: Number(e.target.value) };
                                                                            setForm({ ...form, pricing: newPricing });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <input 
                                                                        type="number"
                                                                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none text-right"
                                                                        value={p.markupPercentage}
                                                                        onChange={e => {
                                                                            const newPricing = [...(form.pricing || [])];
                                                                            newPricing[idx] = { ...p, markupPercentage: Number(e.target.value) };
                                                                            setForm({ ...form, pricing: newPricing });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm({ ...form, pricing: form.pricing?.filter(item => item.branchId !== p.branchId) });
                                                                        }}
                                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(form.pricing || []).filter(p => p.branchName.toLowerCase().includes(branchSearch.toLowerCase())).length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                                                                    No branches configured. Click "+ Add All Branches" to initialize.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeSubTab !== 'Accounts and Sales Info.' && activeSubTab !== 'Stock' && activeSubTab !== 'Pricing Method' && (
                                        <div className="h-48 flex items-center justify-center text-slate-400 italic text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            Section details for {activeSubTab} will be implemented in the next phase.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2"
                                >
                                    <Save className="w-5 h-5" /> Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item Detail</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type / Group</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">UOM Mapping</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="bg-slate-50 p-4 rounded-full">
                                                        <Search className="w-10 h-10 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-400 font-medium italic">No items found matching your search.</p>
                                                    {!searchTerm && (
                                                        <button
                                                            onClick={() => setShowForm(true)}
                                                            className="text-blue-600 text-sm font-bold hover:underline"
                                                        >
                                                            Create your first item
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map(item => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{item.itemName}</span>
                                                        <span className="text-[10px] font-mono text-blue-600 mt-0.5">{item.itemCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-600">{item.itemType}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-tight">{item.itemGroup}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-bold text-slate-700">Base: {item.baseUom}</span>
                                                        <span className="text-[10px] font-medium text-slate-500">Pur: {item.purchaseUom} (1={item.purchaseConversionFactor || 1})</span>
                                                        <span className="text-[10px] font-medium text-slate-500">Sal: {item.salesUom} (1={item.salesConversionFactor || 1})</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600 text-xs">{item.itemCategory}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        item.isActive
                                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit Details"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete Item"
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
                )}
            </div>
        </div>
    );
};
