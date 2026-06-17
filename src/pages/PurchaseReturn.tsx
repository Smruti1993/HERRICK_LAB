import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { PurchaseReturn, PurchaseReturnItem, PurchaseReturnType } from '../types';
import {
  Plus, Search, Edit2, Trash2, Check, FileText, MapPin, User, Award,
  ArrowLeft, DollarSign, Grid, BookOpen, RotateCcw, ChevronDown,
  AlertTriangle, Package, X, CheckCircle, Hash, BarChart2, Truck,
  FileCheck, Eye, Layers, ClipboardList
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];
const genReturnNo = () => `RTN-${Date.now().toString().slice(-8)}`;

const RETURN_TYPES: { value: PurchaseReturnType; label: string; icon: any; desc: string; color: string }[] = [
  {
    value: 'From Purchase Receipt',
    label: 'Convert from Purchase Receipt',
    icon: FileCheck,
    desc: 'Return items that were received via a Purchase Receipt Note (PRN)',
    color: 'violet'
  },
  {
    value: 'From GRN',
    label: 'Convert from Goods Receipt Note',
    icon: Truck,
    desc: 'Return items directly from a Goods Receipt Note (GRN)',
    color: 'emerald'
  },
  {
    value: 'From Consignment',
    label: 'Convert from Consignment',
    icon: Package,
    desc: 'Return consignment items back to vendor',
    color: 'amber'
  }
];

// ─── Component ─────────────────────────────────────────────────────────────────
export const PurchaseReturnPage: React.FC = () => {
  const {
    purchaseReturns, savePurchaseReturn, deletePurchaseReturn,
    purchaseReceipts, grns, vendors, stores, inventoryItems, showToast, storeItemMappings,
    formatCurrency, selectedCurrency
  } = useData();

  const fmtCurrency = formatCurrency;

  // ── View ────────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'select-type' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Type-selection dropdown ──────────────────────────────────────────────────
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(today());
  const [returnType, setReturnType] = useState<PurchaseReturnType>('From Purchase Receipt');
  const [sourceGrnId, setSourceGrnId] = useState('');
  const [sourcePrnId, setSourcePrnId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');

  // ── Bottom tab ───────────────────────────────────────────────────────────────
  const [bottomTab, setBottomTab] = useState<'items' | 'billing' | 'remarks'>('items');

  // ── Items ────────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<PurchaseReturnItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // ── Add item modal ────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalItemSearch, setModalItemSearch] = useState('');
  const [modalItemId, setModalItemId] = useState('');
  const [modalQty, setModalQty] = useState(1);
  const [modalRate, setModalRate] = useState(0);
  const [modalDiscount, setModalDiscount] = useState(0);
  const [modalReason, setModalReason] = useState('');

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedStore = stores.find(s => s.id === storeId);
  const activeItem = activeItemIndex !== null ? items[activeItemIndex] : null;
  const selectedGRN = grns.find(g => g.id === sourceGrnId);
  const selectedPRN = purchaseReceipts.find(p => p.id === sourcePrnId);

  const filteredModalItems = inventoryItems.filter(i => {
    if (storeId) {
      const isMapped = storeItemMappings.some(m => m.storeId === storeId && m.itemId === i.id);
      if (!isMapped) return false;
    }
    return (i.itemName || '').toLowerCase().includes(modalItemSearch.toLowerCase()) ||
           (i.itemCode || '').toLowerCase().includes(modalItemSearch.toLowerCase());
  });

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-generate return number ───────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'form' && !editingId) {
      setReturnNo(genReturnNo());
      setReturnDate(today());
    }
  }, [viewMode, editingId]);

  // ── Sync modal rate ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (modalItemId) {
      const inv = inventoryItems.find(i => i.id === modalItemId);
      setModalRate(inv?.stock?.itemRate || 0);
    }
  }, [modalItemId, inventoryItems]);

  // ── Recalculate net ───────────────────────────────────────────────────────────
  useEffect(() => {
    const total = items.reduce((sum, i) => {
      return sum + Math.max(0, i.quantity * i.rate - (i.discountAmount || 0));
    }, 0);
    setNetAmount(Number(total.toFixed(2)));
  }, [items]);

  // ── Source selection: import items from GRN ───────────────────────────────────
  const handleGRNSourceChange = useCallback((grnId: string) => {
    setSourceGrnId(grnId);
    if (!grnId) return;
    const grn = grns.find(g => g.id === grnId);
    if (!grn) return;
    setVendorId(grn.vendorId);
    setStoreId(grn.storeId);
    const imported: PurchaseReturnItem[] = (grn.items || []).map(gi => {
      const alreadyReturned = purchaseReturns
        .filter(pr => pr.status === 'Submitted' && pr.sourceGrnId === grnId)
        .reduce((sum, pr) => {
          const matchingItem = (pr.items || []).find(pi => 
            pi.itemId === gi.itemId && 
            (pi.batchDetails?.batchCode === gi.batchCode)
          );
          return sum + (matchingItem ? matchingItem.quantity : 0);
        }, 0);

      const availableQty = Math.max(0, (gi.acceptedQuantity || 0) - alreadyReturned);

      return {
        itemId: gi.itemId,
        itemName: gi.itemName || inventoryItems.find(i => i.id === gi.itemId)?.itemName || 'Unknown',
        itemCode: gi.itemCode || inventoryItems.find(i => i.id === gi.itemId)?.itemCode || 'UNK',
        quantity: availableQty,
        sourceQuantity: availableQty,
        rate: gi.rate,
        discountPercentage: gi.discountPercentage || 0,
        discountAmount: gi.discountAmount || 0,
        returnReason: '',
        batchDetails: { batchCode: gi.batchCode, expiryDate: gi.expiryDate, locator: gi.locator }
      };
    });
    setItems(imported);
    if (imported.length > 0) setActiveItemIndex(0);
    showToast('success', `Imported ${imported.length} items from GRN ${grn.grnNo}`);
  }, [grns, inventoryItems, showToast, purchaseReturns]);

  // ── Source selection: import items from PRN ───────────────────────────────────
  const handlePRNSourceChange = useCallback((prnId: string) => {
    setSourcePrnId(prnId);
    if (!prnId) return;
    const prn = purchaseReceipts.find(p => p.id === prnId);
    if (!prn) return;
    setVendorId(prn.vendorId);
    setStoreId(prn.storeId);
    const imported: PurchaseReturnItem[] = (prn.items || []).map(pi => {
      const alreadyReturned = purchaseReturns
        .filter(pr => pr.status === 'Submitted' && pr.sourcePrnId === prnId)
        .reduce((sum, pr) => {
          const matchingItem = (pr.items || []).find(item => 
            item.itemId === pi.itemId && 
            (item.batchDetails?.batchCode === pi.batchDetails?.batchCode)
          );
          return sum + (matchingItem ? matchingItem.quantity : 0);
        }, 0);

      const availableQty = Math.max(0, (pi.quantity || 0) - alreadyReturned);

      return {
        itemId: pi.itemId,
        itemName: pi.itemName || inventoryItems.find(i => i.id === pi.itemId)?.itemName || 'Unknown',
        itemCode: pi.itemCode || inventoryItems.find(i => i.id === pi.itemId)?.itemCode || 'UNK',
        quantity: availableQty,
        sourceQuantity: availableQty,
        rate: pi.rate,
        discountPercentage: pi.discountPercentage || 0,
        discountAmount: pi.discountAmount || 0,
        returnReason: '',
        batchDetails: pi.batchDetails || {}
      };
    });
    setItems(imported);
    if (imported.length > 0) setActiveItemIndex(0);
    showToast('success', `Imported ${imported.length} items from PRN ${prn.receiptNo}`);
  }, [purchaseReceipts, inventoryItems, showToast, purchaseReturns]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setReturnNo('');
    setReturnDate(today());
    setReturnType('From Purchase Receipt');
    setSourceGrnId('');
    setSourcePrnId('');
    setVendorId('');
    setStoreId('');
    setRemarks('');
    setNetAmount(0);
    setStatus('Draft');
    setBottomTab('items');
    setItems([]);
    setActiveItemIndex(null);
  };

  // ── Start new return with type ────────────────────────────────────────────────
  const handleSelectType = (type: PurchaseReturnType) => {
    resetForm();
    setReturnType(type);
    setShowTypeMenu(false);
    setViewMode('form');
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (ret: PurchaseReturn) => {
    if (ret.status === 'Submitted') {
      showToast('info', 'Submitted Purchase Returns cannot be edited.');
      return;
    }
    setEditingId(ret.id);
    setReturnNo(ret.returnNo);
    setReturnDate(ret.returnDate);
    setReturnType(ret.returnType);
    setSourceGrnId(ret.sourceGrnId || '');
    setSourcePrnId(ret.sourcePrnId || '');
    setVendorId(ret.vendorId);
    setStoreId(ret.storeId);
    setRemarks(ret.remarks || '');
    setNetAmount(ret.netAmount);
    setStatus(ret.status);
    setItems(ret.items || []);
    if ((ret.items || []).length > 0) setActiveItemIndex(0);
    setViewMode('form');
  };

  // ── Update item row ───────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof PurchaseReturnItem, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      const qty = Number(field === 'quantity' ? value : updated.quantity || 0);
      const rate = Number(field === 'rate' ? value : updated.rate || 0);
      const cost = qty * rate;
      if (field === 'discountPercentage') {
        updated.discountAmount = Number((cost * (Number(value) / 100)).toFixed(2));
      } else if (field === 'discountAmount') {
        updated.discountPercentage = cost > 0 ? Number(((Number(value) / cost) * 100).toFixed(2)) : 0;
      }
      return updated;
    }));
  };

  // ── Remove item ───────────────────────────────────────────────────────────────
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (activeItemIndex === index) setActiveItemIndex(items.length > 1 ? 0 : null);
    else if (activeItemIndex !== null && activeItemIndex > index) setActiveItemIndex(activeItemIndex - 1);
  };

  // ── Add item from modal ───────────────────────────────────────────────────────
  const handleAddModalItem = () => {
    if (!modalItemId) { showToast('error', 'Please select an item.'); return; }
    const inv = inventoryItems.find(i => i.id === modalItemId);
    if (!inv) return;
    const discAmt = Number((modalQty * modalRate * (modalDiscount / 100)).toFixed(2));
    const newItem: PurchaseReturnItem = {
      itemId: modalItemId,
      itemName: inv.itemName,
      itemCode: inv.itemCode,
      quantity: modalQty,
      sourceQuantity: modalQty,
      rate: modalRate,
      discountPercentage: modalDiscount,
      discountAmount: discAmt,
      returnReason: modalReason
    };
    setItems(prev => [...prev, newItem]);
    setActiveItemIndex(items.length);
    setShowAddModal(false);
    setModalItemId(''); setModalItemSearch(''); setModalQty(1); setModalRate(0);
    setModalDiscount(0); setModalReason('');
    showToast('success', `${inv.itemName} added.`);
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async (finalStatus: 'Draft' | 'Submitted') => {
    if (!vendorId || !storeId) { showToast('error', 'Vendor and Store are required.'); return; }
    if (items.length === 0) { showToast('error', 'Please add at least one item.'); return; }
    
    // Validate quantity doesn't exceed available remaining quantity
    for (const item of items) {
      if (item.sourceQuantity !== undefined && item.quantity > item.sourceQuantity) {
        showToast('error', `Return quantity for ${item.itemName} cannot exceed available quantity (${item.sourceQuantity}).`);
        return;
      }
    }

    if (finalStatus === 'Submitted') {
      const ok = window.confirm('Submitting will finalize this Purchase Return. Stock-out transactions will be posted to the stock ledger. Proceed?');
      if (!ok) return;
    }
    const ret: PurchaseReturn = {
      id: editingId || crypto.randomUUID(),
      returnNo,
      returnDate,
      returnType,
      sourceGrnId: sourceGrnId || undefined,
      sourcePrnId: sourcePrnId || undefined,
      vendorId,
      storeId,
      netAmount,
      remarks: remarks || undefined,
      status: finalStatus,
      items,
      createdAt: new Date().toISOString()
    };
    const ok = await savePurchaseReturn(ret);
    if (ok) { setViewMode('list'); resetForm(); }
  };

  const filtered = purchaseReturns.filter(r =>
    r.returnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.returnType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendors.find(v => v.id === r.vendorId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeConfig = RETURN_TYPES.find(t => t.value === returnType);
  const typeColor = typeConfig?.color || 'slate';
  const colorMap: Record<string, { bg: string; text: string; border: string; ring: string; shadow: string; badge: string; badgeText: string }> = {
    violet: { bg: 'bg-violet-600', text: 'text-violet-700', border: 'border-violet-200', ring: 'focus:ring-violet-500', shadow: 'shadow-violet-200', badge: 'bg-violet-100', badgeText: 'text-violet-700' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'focus:ring-emerald-500', shadow: 'shadow-emerald-200', badge: 'bg-emerald-100', badgeText: 'text-emerald-700' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', ring: 'focus:ring-amber-500', shadow: 'shadow-amber-200', badge: 'bg-amber-100', badgeText: 'text-amber-700' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-700', border: 'border-slate-200', ring: 'focus:ring-slate-500', shadow: 'shadow-slate-200', badge: 'bg-slate-100', badgeText: 'text-slate-700' },
  };
  const c = colorMap[typeColor];

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-rose-600" />
            Purchase Return
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Return goods to vendor — from Purchase Receipt, GRN, or Consignment</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'list' ? (
            /* ── "New" button with dropdown ─────────────────────────────── */
            <div className="relative" ref={typeMenuRef}>
              <button
                onClick={() => setShowTypeMenu(prev => !prev)}
                className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-200 transition-all active:scale-95 text-sm"
              >
                <Plus className="w-4 h-4" /> New Return
                <ChevronDown className={`w-4 h-4 transition-transform ${showTypeMenu ? 'rotate-180' : ''}`} />
              </button>
              {showTypeMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Select Return Type</div>
                  </div>
                  {RETURN_TYPES.map(rt => {
                    const Icon = rt.icon;
                    const colors = colorMap[rt.color];
                    return (
                      <button
                        key={rt.value}
                        onClick={() => handleSelectType(rt.value)}
                        className="w-full text-left px-4 py-4 hover:bg-slate-50 transition-all flex items-start gap-3 border-b border-slate-50 last:border-0"
                      >
                        <div className={`w-9 h-9 rounded-xl ${colors.badge} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${colors.badgeText}`} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-700 text-sm">{rt.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{rt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> All Returns
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
                placeholder="Search by return no., type, or vendor..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-400 text-sm"
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
                    <th className="px-6 py-4">Document No.</th>
                    <th className="px-6 py-4">Document Date</th>
                    <th className="px-6 py-4">Return Type</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Store</th>
                    <th className="px-6 py-4">Net Amount</th>
                    <th className="px-6 py-4">Document Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map(ret => {
                    const vendor = vendors.find(v => v.id === ret.vendorId);
                    const store = stores.find(s => s.id === ret.storeId);
                    const rt = RETURN_TYPES.find(t => t.value === ret.returnType);
                    const rColors = colorMap[rt?.color || 'slate'];
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-800">{ret.returnNo}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{ret.returnDate}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 ${rColors.badge} ${rColors.badgeText} font-bold rounded-lg text-xs border ${rColors.border}`}>
                            {ret.returnType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{vendor?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{vendor?.code || ''}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{store?.storeName || '—'}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{fmtCurrency(ret.netAmount)}</td>
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
                              className={`p-2 rounded-lg transition-all ${ret.status === 'Submitted' ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePurchaseReturn(ret.id)}
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
                <RotateCcw className="w-16 h-16 text-slate-200 stroke-[1.5]" />
                <div className="font-semibold text-slate-500">No Purchase Returns yet</div>
                <div className="text-xs text-slate-400">Click "New Return" and choose a type to get started</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ FORM VIEW ════════════════════════════════ */}
      {viewMode === 'form' && (
        <div className="flex-1 flex flex-col gap-5">

          {/* ── Action Bar ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-3 flex items-center gap-3 flex-wrap">
            {/* Return Type Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${c.badge} border ${c.border}`}>
              {typeConfig && <typeConfig.icon className={`w-4 h-4 ${c.text}`} />}
              <span className={`text-xs font-extrabold ${c.text}`}>{returnType}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
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
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-200"
            >
              <CheckCircle className="w-4 h-4" /> Submit Return
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-slate-700 font-extrabold">{returnNo}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <DollarSign className="w-3.5 h-3.5" />
              Net: <span className="text-rose-700 font-extrabold text-sm">{fmtCurrency(netAmount)}</span>
            </div>
            <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${
              status === 'Submitted' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {status}
            </div>
          </div>

          <div className="flex-1 flex gap-5 items-start">
            {/* ── Left: Main Form ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">

              {/* ── Header Card ──────────────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5">
                <h2 className="text-sm font-extrabold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="w-4 h-4 text-rose-600" /> Return Header
                </h2>

                {/* Source Selection Block */}
                {returnType === 'From GRN' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3">
                    <label className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> Select Source GRN
                    </label>
                    <select
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={sourceGrnId}
                      onChange={e => handleGRNSourceChange(e.target.value)}
                    >
                      <option value="">-- Select Submitted GRN --</option>
                      {grns.filter(g => g.status === 'Submitted').map(g => {
                        const v = vendors.find(vv => vv.id === g.vendorId);
                        return (
                          <option key={g.id} value={g.id}>
                            {g.grnNo} | {v?.name || 'Vendor'} | {g.gateEntryDate}
                          </option>
                        );
                      })}
                    </select>
                    {selectedGRN && (
                      <div className="flex gap-4 text-xs text-emerald-700 font-semibold flex-wrap">
                        <span>Type: <strong>{selectedGRN.grnType}</strong></span>
                        <span>Gate: <strong>{selectedGRN.gateEntryNo}</strong></span>
                        <span>Items: <strong>{(selectedGRN.items || []).length}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {returnType === 'From Purchase Receipt' && (
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex flex-col gap-3">
                    <label className="text-xs font-extrabold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> Select Source Purchase Receipt (PRN)
                    </label>
                    <select
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      value={sourcePrnId}
                      onChange={e => handlePRNSourceChange(e.target.value)}
                    >
                      <option value="">-- Select Submitted PRN --</option>
                      {purchaseReceipts.filter(p => p.status === 'Submitted').map(p => {
                        const v = vendors.find(vv => vv.id === p.vendorId);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.receiptNo} | {v?.name || 'Vendor'} | {p.receiptDate}
                          </option>
                        );
                      })}
                    </select>
                    {selectedPRN && (
                      <div className="flex gap-4 text-xs text-violet-700 font-semibold flex-wrap">
                        <span>Date: <strong>{selectedPRN.receiptDate}</strong></span>
                        <span>Items: <strong>{(selectedPRN.items || []).length}</strong></span>
                        <span>Net: <strong>{fmtCurrency(selectedPRN.netAmount)}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {returnType === 'From Consignment' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-bold">Consignment Return — Add items manually below</span>
                    </div>
                  </div>
                )}

                {/* Core fields */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Return No.</label>
                    <input
                      type="text"
                      readOnly
                      value={returnNo}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Return Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={e => setReturnDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Amount</label>
                    <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-extrabold text-sm">
                      {fmtCurrency(netAmount)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</label>
                    <select
                      disabled={returnType !== 'From Consignment'}
                      value={vendorId}
                      onChange={e => setVendorId(e.target.value)}
                      className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store</label>
                    <select
                      disabled={returnType !== 'From Consignment'}
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    >
                      <option value="">-- Choose Store --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Bottom Tabs ────────────────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="flex bg-slate-50 border-b border-slate-100 gap-1 p-2 flex-wrap">
                  {([
                    { id: 'items', label: `Return Items (${items.length})`, icon: Grid },
                    { id: 'billing', label: 'Billing Summary', icon: DollarSign },
                    { id: 'remarks', label: 'Remarks', icon: BookOpen }
                  ] as { id: 'items' | 'billing' | 'remarks'; label: string; icon: any }[]).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBottomTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        bottomTab === tab.id ? 'bg-white text-rose-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                  {bottomTab === 'items' && (
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  )}
                </div>

                {/* Items tab */}
                {bottomTab === 'items' && (
                  <div className="overflow-auto">
                    {items.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Item Code</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3">Return Qty</th>
                            <th className="px-4 py-3">Rate</th>
                            <th className="px-4 py-3">Disc %</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Return Reason</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const lineAmt = Math.max(0, item.quantity * item.rate - (item.discountAmount || 0));
                            return (
                              <tr
                                key={idx}
                                onClick={() => setActiveItemIndex(idx)}
                                className={`cursor-pointer transition-all ${activeItemIndex === idx ? 'bg-rose-50 ring-1 ring-inset ring-rose-200' : 'hover:bg-slate-50/60'}`}
                              >
                                <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{item.itemCode}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700 max-w-36 truncate">{item.itemName}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.sourceQuantity ?? 9999}
                                    value={item.quantity}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.rate}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                                    className="w-24 px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={item.discountPercentage || 0}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'discountPercentage', Number(e.target.value))}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3 font-bold text-rose-700">{lineAmt.toFixed(2)}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={item.returnReason || ''}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'returnReason', e.target.value)}
                                    className="w-32 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                                    placeholder="reason..."
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); removeItem(idx); }}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <RotateCcw className="w-12 h-12 text-slate-200 stroke-[1.5]" />
                        <div className="text-sm font-semibold text-slate-400">No items added</div>
                        <div className="text-xs text-slate-400">
                          {returnType === 'From Consignment' ? 'Click "Add Item" to begin' : 'Select a source document above to import items'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Billing Summary tab */}
                {bottomTab === 'billing' && (
                  <div className="p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Gross Amount', value: items.reduce((s, i) => s + i.quantity * i.rate, 0) },
                        { label: 'Total Discount', value: items.reduce((s, i) => s + (i.discountAmount || 0), 0) },
                        { label: 'Net Return Value', value: netAmount }
                      ].map(row => (
                        <div key={row.label} className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{row.label}</span>
                          <span className="text-lg font-extrabold text-slate-800">{fmtCurrency(row.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                      <div className="text-xs font-bold text-rose-600 mb-2">Item Breakdown</div>
                      <table className="w-full text-xs">
                        <thead><tr className="text-rose-400 font-bold uppercase">
                          <th className="text-left py-1">Item</th>
                          <th className="text-right py-1">Return Qty</th>
                          <th className="text-right py-1">Rate</th>
                          <th className="text-right py-1">Disc</th>
                          <th className="text-right py-1">Amount</th>
                        </tr></thead>
                        <tbody className="divide-y divide-rose-100">
                          {items.map((item, idx) => (
                            <tr key={idx} className="text-rose-800">
                              <td className="py-1.5 font-semibold">{item.itemName}</td>
                              <td className="py-1.5 text-right">{item.quantity}</td>
                              <td className="py-1.5 text-right">{item.rate.toFixed(2)}</td>
                              <td className="py-1.5 text-right">{(item.discountAmount || 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-bold">{Math.max(0, item.quantity * item.rate - (item.discountAmount || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Remarks tab */}
                {bottomTab === 'remarks' && (
                  <div className="p-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">General Remarks / Notes</label>
                    <textarea
                      rows={5}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
                      placeholder="Add any notes about this purchase return..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Item Details Drawer ─────────────────────────────── */}
            <div className="w-72 flex-shrink-0 sticky top-0 flex flex-col gap-4">
              {/* Vendor Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                {selectedVendor ? (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Vendor Card</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 text-rose-700 flex items-center justify-center rounded-xl font-black text-sm">
                        {selectedVendor.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-700 text-sm">{selectedVendor.name}</div>
                        <div className="text-xs font-bold text-slate-400">{selectedVendor.code}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-col gap-1.5 bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-400" />{selectedVendor.contactDetails?.contactPerson || 'Primary Contact'}</div>
                      <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-slate-400" />VAT: <strong className="text-slate-700">{selectedVendor.isVat ? 'Yes' : 'No'}</strong></div>
                      {selectedStore && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{selectedStore.storeName}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
                    <User className="w-10 h-10" />
                    <div className="text-xs font-bold text-slate-400">Select Source Document</div>
                  </div>
                )}
              </div>

              {/* Active Item Detail */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-rose-500" /> Selected Item
                </h3>
                {activeItem ? (
                  <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="font-extrabold text-rose-800 text-sm">{activeItem.itemName}</div>
                      <div className="text-xs text-rose-500 font-bold">{activeItem.itemCode}</div>
                    </div>
                    {[
                      { label: 'Source Qty', value: activeItem.sourceQuantity ?? activeItem.quantity },
                      { label: 'Return Qty', value: activeItem.quantity, highlight: true },
                      { label: 'Unit Rate', value: formatCurrency(activeItem.rate) },
                      { label: 'Basic Amount', value: formatCurrency(activeItem.quantity * activeItem.rate) },
                      { label: 'Discount %', value: `${(activeItem.discountPercentage || 0).toFixed(2)}%` },
                      { label: 'Discount Amt', value: formatCurrency(activeItem.discountAmount || 0) },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{row.label}</span>
                        <span className={`font-extrabold ${'highlight' in row && row.highlight ? 'text-rose-700' : 'text-slate-700'}`}>{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-xs mt-1 p-2 bg-rose-50 rounded-xl border border-rose-100">
                      <span className="text-rose-600 font-extrabold">Net Return</span>
                      <span className="font-extrabold text-rose-700">
                        {fmtCurrency(Math.max(0, activeItem.quantity * activeItem.rate - (activeItem.discountAmount || 0)))}
                      </span>
                    </div>
                    {activeItem.returnReason && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs">
                        <div className="font-bold text-amber-700">Reason: {activeItem.returnReason}</div>
                      </div>
                    )}
                    {activeItem.batchDetails?.batchCode && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs flex flex-col gap-1">
                        <div className="font-bold text-emerald-700">Batch: {activeItem.batchDetails.batchCode}</div>
                        {activeItem.batchDetails.expiryDate && <div className="text-emerald-600">Expiry: {activeItem.batchDetails.expiryDate}</div>}
                        {activeItem.batchDetails.locator && <div className="text-emerald-600">Locator: {activeItem.batchDetails.locator}</div>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                    <Eye className="w-10 h-10" />
                    <div className="text-xs font-bold text-slate-400 text-center">Click any item row to view details</div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-rose-600 to-rose-800 rounded-3xl p-5 text-white shadow-lg shadow-rose-200">
                <div className="text-xs font-bold text-rose-200 uppercase tracking-wider mb-3">Return Summary</div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-200">Total Items</span>
                    <span className="font-bold">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-200">Gross Return</span>
                    <span className="font-bold">{fmtCurrency(items.reduce((s, i) => s + i.quantity * i.rate, 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-200">Total Discount</span>
                    <span className="font-bold text-rose-300">-{fmtCurrency(items.reduce((s, i) => s + (i.discountAmount || 0), 0))}</span>
                  </div>
                  <div className="border-t border-rose-500 pt-2 flex justify-between">
                    <span className="text-rose-100 font-bold">Net Return Value</span>
                    <span className="font-extrabold text-lg">{fmtCurrency(netAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ ADD ITEM MODAL ═════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" /> Add Return Item
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search & Select Item</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={modalItemSearch}
                    onChange={e => { setModalItemSearch(e.target.value); setModalItemId(''); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                {modalItemSearch && !modalItemId && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-slate-100 shadow-lg">
                    {filteredModalItems.length > 0 ? filteredModalItems.slice(0, 15).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setModalItemId(item.id); setModalItemSearch(item.itemName); }}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-700 text-sm">{item.itemName}</div>
                          <div className="text-xs text-slate-400">{item.itemCode}</div>
                        </div>
                        <div className="text-xs font-bold text-rose-600">{formatCurrency(item.stock?.itemRate || 0)}</div>
                      </button>
                    )) : (
                      <div className="px-4 py-4 text-sm text-slate-400 text-center">No items found</div>
                    )}
                  </div>
                )}
                {modalItemId && (
                  <div className="px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" /> {inventoryItems.find(i => i.id === modalItemId)?.itemCode} selected
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Return Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={modalQty}
                    onChange={e => setModalQty(Number(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Rate ({selectedCurrency})</label>
                  <input
                    type="number"
                    min={0}
                    value={modalRate}
                    onChange={e => setModalRate(Number(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={modalDiscount}
                    onChange={e => setModalDiscount(Number(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Return Reason</label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={e => setModalReason(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="e.g. Damaged, Expired, Wrong item..."
                  />
                </div>
              </div>

              {modalItemId && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-1.5 text-xs">
                  <div className="font-bold text-rose-700 mb-1">Return Line Preview</div>
                  <div className="flex justify-between"><span className="text-rose-500">Basic Amount</span><span className="font-bold text-rose-800">{fmtCurrency(modalQty * modalRate)}</span></div>
                  <div className="flex justify-between"><span className="text-rose-500">Discount</span><span className="font-bold text-rose-400">-{fmtCurrency(modalQty * modalRate * (modalDiscount / 100))}</span></div>
                  <div className="flex justify-between border-t border-rose-200 pt-1.5 mt-1">
                    <span className="text-rose-700 font-bold">Net Return</span>
                    <span className="font-extrabold text-rose-800">{fmtCurrency(Math.max(0, modalQty * modalRate * (1 - modalDiscount / 100)))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddModalItem}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-200 transition-all"
              >
                Add to Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
