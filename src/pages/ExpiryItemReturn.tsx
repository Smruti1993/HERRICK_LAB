import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { ExpiryReturn, ExpiryReturnItem } from '../types';
import {
  CalendarDays, Search, Edit2, Trash2, CheckCircle, FileText, 
  MapPin, User, ArrowLeft, RotateCcw, AlertTriangle, Package, 
  X, Hash, BarChart2, ShieldAlert, Plus, Layers
} from 'lucide-react';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

const today = () => new Date().toISOString().split('T')[0];
const genDocNo = () => `EXP-RTN-${Date.now().toString().slice(-8)}`;

export const ExpiryItemReturnPage: React.FC = () => {
  const {
    expiryReturns, saveExpiryReturn, deleteExpiryReturn, fetchExpiryItems,
    vendors, stores, showToast
  } = useData();

  // ── View Mode ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Form State ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState(today());
  const [storeId, setStoreId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [noOfDays, setNoOfDays] = useState<number>(30);
  const [purchaseOrganisation, setPurchaseOrganisation] = useState('Pharmacy');
  const [remarks, setRemarks] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');
  
  // ── Items Grid State ─────────────────────────────────────────────────────────
  const [items, setItems] = useState<ExpiryReturnItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // ── Derived State ────────────────────────────────────────────────────────────
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedStore = stores.find(s => s.id === storeId);
  const activeItem = activeItemIndex !== null ? items[activeItemIndex] : null;

  // ── Auto-generate return number ──────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'form' && !editingId) {
      setDocNo(genDocNo());
      setDocDate(today());
    }
  }, [viewMode, editingId]);

  // ── Recalculate net amount ───────────────────────────────────────────────────
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    setNetAmount(Number(total.toFixed(2)));
  }, [items]);

  // ── Reset Form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setDocNo('');
    setDocDate(today());
    setStoreId('');
    setVendorId('');
    setNoOfDays(30);
    setPurchaseOrganisation('Pharmacy');
    setRemarks('');
    setNetAmount(0);
    setStatus('Draft');
    setItems([]);
    setActiveItemIndex(null);
  };

  // ── Edit Record ──────────────────────────────────────────────────────────────
  const handleEdit = (ret: ExpiryReturn) => {
    if (ret.status === 'Submitted') {
      showToast('info', 'Submitted Expiry Returns cannot be edited.');
      return;
    }
    setEditingId(ret.id);
    setDocNo(ret.docNo);
    setDocDate(ret.docDate);
    setStoreId(ret.storeId);
    setVendorId(ret.vendorId);
    setNoOfDays(ret.noOfDays);
    setPurchaseOrganisation(ret.purchaseOrganisation);
    setRemarks(ret.remarks || '');
    setNetAmount(ret.netAmount);
    setStatus(ret.status);
    setItems(ret.items || []);
    if ((ret.items || []).length > 0) setActiveItemIndex(0);
    setViewMode('form');
  };

  // ── Scan/Fetch Expiring Items ───────────────────────────────────────────────
  const handleScanExpiringItems = async () => {
    if (!storeId) {
      showToast('error', 'Please select a Store first.');
      return;
    }
    setIsScanning(true);
    try {
      const candidates = await fetchExpiryItems(storeId, noOfDays);
      if (candidates.length === 0) {
        showToast('info', `No expired or expiring batches found within ${noOfDays} days for the selected store.`);
        setItems([]);
        setActiveItemIndex(null);
        return;
      }
      
      const imported: ExpiryReturnItem[] = candidates.map(c => ({
        itemId: c.itemId,
        itemCode: c.itemCode,
        itemName: c.itemName,
        batchCode: c.batchCode,
        expiryDate: c.expiryDate,
        currentStock: c.currentStock,
        quantity: c.currentStock, // Default return quantity to the full expired batch stock
        rate: c.rate,
        value: Number((c.currentStock * c.rate).toFixed(2)),
        remarks: ''
      }));

      setItems(imported);
      setActiveItemIndex(0);
      showToast('success', `Found and loaded ${imported.length} expiring items.`);
    } catch (err) {
      showToast('error', 'Failed to fetch expiring items.');
    } finally {
      setIsScanning(false);
    }
  };

  // ── Update Item Row ──────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof ExpiryReturnItem, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      
      const qty = Number(field === 'quantity' ? value : updated.quantity || 0);
      const rate = Number(field === 'rate' ? value : updated.rate || 0);
      
      updated.value = Number((qty * rate).toFixed(2));
      return updated;
    }));
  };

  // ── Remove Item Row ──────────────────────────────────────────────────────────
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (activeItemIndex === index) {
      setActiveItemIndex(items.length > 1 ? 0 : null);
    } else if (activeItemIndex !== null && activeItemIndex > index) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  // ── Save/Submit Document ─────────────────────────────────────────────────────
  const handleSave = async (finalStatus: 'Draft' | 'Submitted') => {
    if (!storeId || !vendorId) {
      showToast('error', 'Store and Vendor are required.');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Grid cannot be empty. Fetch expiring items first.');
      return;
    }

    // Validations
    for (const item of items) {
      if (item.quantity <= 0) {
        showToast('error', `Return quantity for ${item.itemName} must be greater than zero.`);
        return;
      }
      if (item.quantity > item.currentStock) {
        showToast('error', `Return quantity for ${item.itemName} cannot exceed current stock (${item.currentStock}).`);
        return;
      }
    }

    if (finalStatus === 'Submitted') {
      const ok = window.confirm('Submitting will finalize this Expiry Return. Expired stock will be removed from inventory. Proceed?');
      if (!ok) return;
    }

    const retDoc: ExpiryReturn = {
      id: editingId || crypto.randomUUID(),
      docNo,
      docDate,
      storeId,
      vendorId,
      noOfDays,
      netAmount,
      purchaseOrganisation,
      remarks: remarks || undefined,
      status: finalStatus,
      items,
      createdAt: new Date().toISOString()
    };

    const ok = await saveExpiryReturn(retDoc);
    if (ok) {
      setViewMode('list');
      resetForm();
    }
  };

  // ── Filtered Records ─────────────────────────────────────────────────────────
  const filtered = expiryReturns.filter(r =>
    r.docNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendors.find(v => v.id === r.vendorId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (stores.find(s => s.id === r.storeId)?.storeName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            Expiry Item Return
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Return short-dated and expired batches to vendor</p>
        </div>
        <div>
          {viewMode === 'list' ? (
            <button
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" /> New Expiry Return
            </button>
          ) : (
            <button
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> All Documents
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════ LIST VIEW ════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by doc no., vendor, or store..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs font-bold text-slate-400">{filtered.length} record(s)</div>
          </div>

          <div className="flex-1 overflow-auto">
            {filtered.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Doc No.</th>
                    <th className="px-6 py-4">Doc Date</th>
                    <th className="px-6 py-4">Store</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Organisation</th>
                    <th className="px-6 py-4">Net Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map(ret => {
                    const vendor = vendors.find(v => v.id === ret.vendorId);
                    const store = stores.find(s => s.id === ret.storeId);
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-800">{ret.docNo}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{ret.docDate}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{store?.storeName || '—'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{vendor?.name || '—'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-500">{ret.purchaseOrganisation}</td>
                        <td className="px-6 py-4 font-black text-slate-800">{fmtCurrency(ret.netAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${
                            ret.status === 'Submitted'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {ret.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEdit(ret)}
                              disabled={ret.status === 'Submitted'}
                              className={`p-2 rounded-lg transition-all ${
                                ret.status === 'Submitted' 
                                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteExpiryReturn(ret.id)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
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
                <ShieldAlert className="w-16 h-16 text-slate-200 stroke-[1.5]" />
                <div className="font-semibold text-slate-500">No Expiry Returns recorded</div>
                <div className="text-xs text-slate-400">Click "New Expiry Return" to get started</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ FORM VIEW ════════════════════════════════ */}
      {viewMode === 'form' && (
        <div className="flex-1 flex flex-col gap-5">

          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleSave('Draft')}
              className="flex items-center gap-2 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              <FileText className="w-4 h-4" /> Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave('Submitted')}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-amber-200"
            >
              <CheckCircle className="w-4 h-4" /> Submit & Remove Stock
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-slate-700 font-extrabold">{docNo}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Hash className="w-3.5 h-3.5" />
              Net Return: <span className="text-amber-700 font-extrabold text-sm">{fmtCurrency(netAmount)}</span>
            </div>
            <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${
              status === 'Submitted' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {status}
            </div>
          </div>

          <div className="flex-1 flex gap-5 items-start">
            
            {/* Left Column: Form Header & Items Table */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              
              {/* Document Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5">
                <h2 className="text-sm font-extrabold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="w-4 h-4 text-amber-500" /> Return Document Details
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doc No.</label>
                    <input
                      type="text"
                      readOnly
                      value={docNo}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doc Date</label>
                    <input
                      type="date"
                      value={docDate}
                      onChange={e => setDocDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Org *</label>
                    <select
                      value={purchaseOrganisation}
                      onChange={e => setPurchaseOrganisation(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Consumables">Consumables</option>
                      <option value="General Store">General Store</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store *</label>
                    <select
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                      <option value="">-- Choose Store --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor *</label>
                    <select
                      value={vendorId}
                      onChange={e => setVendorId(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</label>
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Expiry scanner block */}
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap mt-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" /> Scan Store For Expiry
                    </div>
                    <div className="text-xs text-amber-600 font-medium">Load stock batches expiring within the specified days below.</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200/80">
                      <span className="text-xs font-bold text-slate-400">Expiring in</span>
                      <input
                        type="number"
                        min={1}
                        value={noOfDays}
                        onChange={e => setNoOfDays(Number(e.target.value))}
                        className="w-16 text-center font-bold text-amber-700 outline-none text-sm"
                      />
                      <span className="text-xs font-bold text-slate-400">Days</span>
                    </div>
                    <button
                      type="button"
                      disabled={isScanning || !storeId}
                      onClick={handleScanExpiringItems}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-100 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <RotateCcw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                      {isScanning ? 'Scanning...' : 'Scan Expiring Items'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Grid Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Expiry Return Items ({items.length})</span>
                </div>
                
                <div className="overflow-x-auto">
                  {items.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Item Code</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3">Batch Code</th>
                          <th className="px-4 py-3">Expiry Date</th>
                          <th className="px-4 py-3">Current Stock</th>
                          <th className="px-4 py-3">Return Qty</th>
                          <th className="px-4 py-3">Rate (SAR)</th>
                          <th className="px-4 py-3">Value</th>
                          <th className="px-4 py-3">Remarks</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setActiveItemIndex(idx)}
                            className={`cursor-pointer transition-all ${activeItemIndex === idx ? 'bg-amber-50/60 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                          >
                            <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{item.itemCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700 max-w-[120px] truncate">{item.itemName}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">{item.batchCode}</span></td>
                            <td className="px-4 py-3 font-semibold text-rose-600">{item.expiryDate}</td>
                            <td className="px-4 py-3 font-bold text-slate-600">{item.currentStock}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={item.currentStock}
                                value={item.quantity}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                value={item.rate}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 font-black text-amber-700">SAR {item.value.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="note..."
                                value={item.remarks || ''}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateItem(idx, 'remarks', e.target.value)}
                                className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none animate-in fade-in"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); removeItem(idx); }}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                      <AlertTriangle className="w-12 h-12 text-slate-200 stroke-[1.5]" />
                      <div className="text-sm font-semibold text-slate-400">Expiry items list is empty</div>
                      <div className="text-xs text-slate-400">Select store and click "Scan Expiring Items" to load batches</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Selected Item Detail & Vendor Card */}
            <div className="w-72 flex-shrink-0 sticky top-0 flex flex-col gap-4">
              
              {/* Vendor Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                {selectedVendor ? (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Vendor Card</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 text-amber-700 flex items-center justify-center rounded-xl font-black text-sm">
                        {selectedVendor.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-700 text-sm">{selectedVendor.name}</div>
                        <div className="text-xs font-bold text-slate-400">{selectedVendor.code}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-col gap-1.5 bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-400" />{selectedVendor.contactDetails?.contactPerson || 'Primary Contact'}</div>
                      {selectedStore && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{selectedStore.storeName}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
                    <User className="w-10 h-10" />
                    <div className="text-xs font-bold text-slate-400">Select Vendor in Header</div>
                  </div>
                )}
              </div>

              {/* Selected Item Detail */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-500" /> Selected Item
                </h3>
                {activeItem ? (
                  <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/60">
                      <div className="font-extrabold text-amber-800 text-sm">{activeItem.itemName}</div>
                      <div className="text-xs text-amber-500 font-bold">{activeItem.itemCode}</div>
                    </div>
                    {[
                      { label: 'Batch Code', value: activeItem.batchCode },
                      { label: 'Expiry Date', value: activeItem.expiryDate },
                      { label: 'Current Stock', value: activeItem.currentStock },
                      { label: 'Return Qty', value: activeItem.quantity, highlight: true },
                      { label: 'Rate (SAR)', value: `${activeItem.rate.toFixed(2)} SAR` },
                      { label: 'Line Value', value: `${activeItem.value.toFixed(2)} SAR` }
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{row.label}</span>
                        <span className={`font-extrabold ${'highlight' in row && row.highlight ? 'text-amber-600' : 'text-slate-700'}`}>{row.value}</span>
                      </div>
                    ))}
                    {activeItem.remarks && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs">
                        <div className="font-bold text-amber-700">Note: {activeItem.remarks}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                    <AlertTriangle className="w-10 h-10" />
                    <div className="text-xs font-bold text-slate-400 text-center">Click any item row to view details</div>
                  </div>
                )}
              </div>

              {/* Summary widget */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg shadow-amber-200">
                <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-3">Return Summary</div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-200">Total Batches</span>
                    <span className="font-bold">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-200">Total Items Qty</span>
                    <span className="font-bold">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  <div className="border-t border-amber-400 pt-2 flex justify-between">
                    <span className="text-amber-100 font-bold">Net Return Value</span>
                    <span className="font-extrabold text-lg">{fmtCurrency(netAmount)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
