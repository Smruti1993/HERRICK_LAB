import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { PurchaseReceipt, PurchaseReceiptItem } from '../types';
import {
  Plus, Search, Edit2, Trash2, Check, FileText, MapPin, User, Award,
  ArrowLeft, DollarSign, Grid, BookOpen, Percent, ShoppingBag, Layers,
  ChevronDown, Eye, BarChart2, AlertTriangle, ClipboardList, Package,
  FileCheck, Calendar, Hash, CreditCard, Truck, X, CheckCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TopTab = 'address' | 'reference' | 'lc' | 'other';
type BottomTab = 'items' | 'batch' | 'billing' | 'terms' | 'advance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

const today = () => new Date().toISOString().split('T')[0];

const genReceiptNo = () => `PRN-${Date.now().toString().slice(-8)}`;

// ─── Component ────────────────────────────────────────────────────────────────

export const PurchaseReceiptPage: React.FC = () => {
  const {
    purchaseReceipts, savePurchaseReceipt, deletePurchaseReceipt,
    grns, vendors, stores, inventoryItems, showToast,
    purchaseOrders, storeItemMappings
  } = useData();

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Header fields ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(today());
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [grnId, setGrnId] = useState('');
  const [taxProfile, setTaxProfile] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');

  // ── Top Tabs ───────────────────────────────────────────────────────────────
  const [topTab, setTopTab] = useState<TopTab>('address');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');
  const [lcNo, setLcNo] = useState('');
  const [lcDate, setLcDate] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('Net 30');
  const [remarks, setRemarks] = useState('');

  // ── Bottom Tabs ────────────────────────────────────────────────────────────
  const [bottomTab, setBottomTab] = useState<BottomTab>('items');

  // ── Items grid ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<PurchaseReceiptItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // ── Add-item modal ─────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalItemSearch, setModalItemSearch] = useState('');
  const [modalItemId, setModalItemId] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalRate, setModalRate] = useState(0);
  const [modalDiscount, setModalDiscount] = useState(0);
  const [modalBatch, setModalBatch] = useState('');
  const [modalExpiry, setModalExpiry] = useState('');
  const [modalLocator, setModalLocator] = useState('MAIN-01');
  const [modalRemarks, setModalRemarks] = useState('');

  // ── Terms rows ─────────────────────────────────────────────────────────────
  const [terms, setTerms] = useState<{ id: string; description: string }[]>([]);

  // ── Advance rows ───────────────────────────────────────────────────────────
  const [advances, setAdvances] = useState<{ id: string; amount: number; bank: string; refNo: string }[]>([]);

  // ─── Derived helpers ────────────────────────────────────────────────────────
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedStore = stores.find(s => s.id === storeId);
  const selectedGRN = grns.find(g => g.id === grnId);
  const activeItem = activeItemIndex !== null ? items[activeItemIndex] : null;

  const filteredModalItems = inventoryItems.filter(i => {
    if (storeId) {
      const isMapped = storeItemMappings.some(m => m.storeId === storeId && m.itemId === i.id);
      if (!isMapped) return false;
    }
    return (i.itemName || '').toLowerCase().includes(modalItemSearch.toLowerCase()) ||
           (i.itemCode || '').toLowerCase().includes(modalItemSearch.toLowerCase());
  });

  // ─── Auto-generate receipt number ───────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'form' && !editingId) {
      setReceiptNo(genReceiptNo());
      setReceiptDate(today());
    }
  }, [viewMode, editingId]);

  // ─── Auto-update modal rate when item changes ────────────────────────────────
  useEffect(() => {
    if (modalItemId) {
      const inv = inventoryItems.find(i => i.id === modalItemId);
      setModalRate(inv?.stock?.itemRate || 0);
    }
  }, [modalItemId, inventoryItems]);

  // ─── Recalculate net amount ──────────────────────────────────────────────────
  useEffect(() => {
    const total = items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const disc = Number(item.discountAmount || 0);
      return sum + Math.max(0, qty * rate - disc);
    }, 0);
    setNetAmount(Number(total.toFixed(2)));
  }, [items]);

  // ─── GRN selection: auto-fill vendor, store & items ─────────────────────────
  const handleGRNChange = useCallback((selectedGrnId: string) => {
    setGrnId(selectedGrnId);
    if (!selectedGrnId) return;

    const grn = grns.find(g => g.id === selectedGrnId);
    if (!grn) return;

    setVendorId(grn.vendorId);
    setStoreId(grn.storeId);

    // Calculate already converted quantities for items from this GRN
    const alreadyConverted: Record<string, number> = {};
    purchaseReceipts
      .filter(pr => pr.grnId === selectedGrnId && pr.id !== editingId)
      .forEach(pr => {
        (pr.items || []).forEach(pi => {
          alreadyConverted[pi.itemId] = (alreadyConverted[pi.itemId] || 0) + pi.quantity;
        });
      });

    const imported: PurchaseReceiptItem[] = (grn.items || []).map(gi => {
      const inv = inventoryItems.find(i => i.id === gi.itemId);
      const srcQty = gi.acceptedQuantity || gi.receivedQuantity || 0;
      const converted = alreadyConverted[gi.itemId] || 0;
      const pending = Math.max(0, srcQty - converted);
      const discAmt = Number((pending * gi.rate * ((gi.discountPercentage || 0) / 100)).toFixed(2));
      return {
        itemId: gi.itemId,
        itemName: gi.itemName || inv?.itemName || 'Unknown',
        itemCode: gi.itemCode || inv?.itemCode || 'UNK',
        sourceQuantity: srcQty,
        alreadyConvertedQuantity: converted,
        pendingQuantity: pending,
        quantity: pending,
        rate: gi.rate,
        discountPercentage: gi.discountPercentage || 0,
        discountAmount: discAmt,
        remarks: gi.remarks || '',
        batchDetails: {
          batchCode: gi.batchCode || '',
          expiryDate: gi.expiryDate || '',
          locator: gi.locator || 'MAIN-01'
        }
      };
    });

    setItems(imported);
    if (imported.length > 0) setActiveItemIndex(0);
    showToast('success', `Imported ${imported.length} items from GRN ${grn.grnNo}`);
  }, [grns, purchaseReceipts, inventoryItems, editingId, showToast]);

  // ─── Reset form ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setReceiptNo('');
    setReceiptDate(today());
    setVendorId('');
    setStoreId('');
    setGrnId('');
    setTaxProfile('');
    setNetAmount(0);
    setStatus('Draft');
    setTopTab('address');
    setBottomTab('items');
    setBillingAddress('');
    setShippingAddress('');
    setRefNo('');
    setRefDate('');
    setLcNo('');
    setLcDate('');
    setPaymentTerm('Net 30');
    setRemarks('');
    setItems([]);
    setActiveItemIndex(null);
    setTerms([]);
    setAdvances([]);
  };

  // ─── Edit handler ────────────────────────────────────────────────────────────
  const handleEdit = (pr: PurchaseReceipt) => {
    if (pr.status === 'Submitted') {
      showToast('info', 'Submitted Purchase Receipts cannot be edited.');
      return;
    }
    setEditingId(pr.id);
    setReceiptNo(pr.receiptNo);
    setReceiptDate(pr.receiptDate);
    setVendorId(pr.vendorId);
    setStoreId(pr.storeId);
    setGrnId(pr.grnId || '');
    setTaxProfile(pr.taxProfile || '');
    setNetAmount(pr.netAmount);
    setStatus(pr.status);
    setBillingAddress(pr.addressDetails?.billingAddress || '');
    setShippingAddress(pr.addressDetails?.shippingAddress || '');
    setRefNo(pr.referenceDetails?.refNo || '');
    setRefDate(pr.referenceDetails?.refDate || '');
    setLcNo(pr.lcDetails?.lcNo || '');
    setLcDate(pr.lcDetails?.lcDate || '');
    setPaymentTerm(pr.otherDetails?.paymentTerm || 'Net 30');
    setRemarks(pr.otherDetails?.remarks || '');
    setItems(pr.items || []);
    if ((pr.items || []).length > 0) setActiveItemIndex(0);
    setViewMode('form');
  };

  // ─── Update item row ─────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof PurchaseReceiptItem, value: any) => {
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

  // ─── Remove item ─────────────────────────────────────────────────────────────
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (activeItemIndex === index) setActiveItemIndex(items.length > 1 ? 0 : null);
    else if (activeItemIndex !== null && activeItemIndex > index) setActiveItemIndex(activeItemIndex - 1);
  };

  // ─── Add item from modal ─────────────────────────────────────────────────────
  const handleAddModalItem = () => {
    if (!modalItemId) { showToast('error', 'Please select an item.'); return; }
    const inv = inventoryItems.find(i => i.id === modalItemId);
    if (!inv) return;
    const qty = modalQuantity;
    const rate = modalRate;
    const discAmt = Number((qty * rate * (modalDiscount / 100)).toFixed(2));
    const newItem: PurchaseReceiptItem = {
      itemId: modalItemId,
      itemName: inv.itemName,
      itemCode: inv.itemCode,
      quantity: qty,
      sourceQuantity: qty,
      alreadyConvertedQuantity: 0,
      pendingQuantity: qty,
      rate,
      discountPercentage: modalDiscount,
      discountAmount: discAmt,
      remarks: modalRemarks,
      batchDetails: { batchCode: modalBatch, expiryDate: modalExpiry, locator: modalLocator }
    };
    setItems(prev => [...prev, newItem]);
    setActiveItemIndex(items.length);
    setShowAddModal(false);
    setModalItemId(''); setModalItemSearch(''); setModalQuantity(1); setModalRate(0);
    setModalDiscount(0); setModalBatch(''); setModalExpiry(''); setModalRemarks('');
    showToast('success', `${inv.itemName} added to receipt.`);
  };

  // ─── Save handler ────────────────────────────────────────────────────────────
  const handleSave = async (finalStatus: 'Draft' | 'Submitted') => {
    if (!vendorId || !storeId) { showToast('error', 'Vendor and Store are required.'); return; }
    if (items.length === 0) { showToast('error', 'Please add at least one item.'); return; }
    if (finalStatus === 'Submitted') {
      const ok = window.confirm('Submitting will finalize this Purchase Receipt Note. Proceed?');
      if (!ok) return;
    }
    const pr: PurchaseReceipt = {
      id: editingId || crypto.randomUUID(),
      receiptNo,
      receiptDate,
      vendorId,
      storeId,
      grnId: grnId || undefined,
      taxProfile: taxProfile || undefined,
      netAmount,
      addressDetails: { billingAddress, shippingAddress },
      referenceDetails: { refNo, refDate },
      lcDetails: { lcNo, lcDate },
      otherDetails: { paymentTerm, remarks },
      status: finalStatus,
      items,
      createdAt: new Date().toISOString()
    };
    const ok = await savePurchaseReceipt(pr);
    if (ok) { setViewMode('list'); resetForm(); }
  };

  const filtered = purchaseReceipts.filter(p =>
    p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendors.find(v => v.id === p.vendorId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">

      {/* ── Top Page Header ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-violet-600" />
            Purchase Receipt Note (PRN)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Convert GRNs into formal purchase receipts and track billing details</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'list' ? (
            <>
              <button
                onClick={() => { resetForm(); setViewMode('form'); }}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 transition-all active:scale-95 text-sm"
              >
                <Plus className="w-4 h-4" /> Create Purchase Receipt
              </button>
            </>
          ) : (
            <button
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> All Receipts
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════ LIST VIEW ════════════════════════════════ */}
      {viewMode === 'list' ? (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by receipt no or vendor..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-400 text-sm"
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
                    <th className="px-6 py-4">Receipt No</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Store</th>
                    <th className="px-6 py-4">GRN Ref</th>
                    <th className="px-6 py-4">Net Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map(pr => {
                    const vendor = vendors.find(v => v.id === pr.vendorId);
                    const store = stores.find(s => s.id === pr.storeId);
                    const grn = grns.find(g => g.id === pr.grnId);
                    return (
                      <tr key={pr.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-800">{pr.receiptNo}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{pr.receiptDate}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{vendor?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{vendor?.code || ''}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{store?.storeName || '—'}</td>
                        <td className="px-6 py-4">
                          {grn ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-100">
                              {grn.grnNo}
                            </span>
                          ) : <span className="text-slate-400 text-xs">Direct</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{fmtCurrency(pr.netAmount)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${
                            pr.status === 'Submitted'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleEdit(pr)}
                              disabled={pr.status === 'Submitted'}
                              className={`p-2 rounded-lg transition-all ${pr.status === 'Submitted' ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`}
                              title={pr.status === 'Submitted' ? 'Cannot edit submitted receipt' : 'Edit'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePurchaseReceipt(pr.id)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600 transition-all"
                              title="Delete"
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
                <FileCheck className="w-16 h-16 text-slate-200 stroke-[1.5]" />
                <div className="font-semibold text-slate-500">No Purchase Receipt Notes yet</div>
                <div className="text-xs text-slate-400">Click "Create Purchase Receipt" to get started</div>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ══════════════════════════ FORM VIEW ════════════════════════════════ */
        <div className="flex-1 flex flex-col gap-5">

          {/* ── Top Action Bar ──────────────────────────────────────────────── */}
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
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-violet-200"
            >
              <CheckCircle className="w-4 h-4" /> Submit Receipt
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-slate-700 font-extrabold">{receiptNo}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <DollarSign className="w-3.5 h-3.5" />
              Net: <span className="text-violet-700 font-extrabold text-sm">{fmtCurrency(netAmount)}</span>
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

              {/* ── Header Fields Card ────────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5">
                <h2 className="text-sm font-extrabold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="w-4 h-4 text-violet-600" /> Receipt Header
                </h2>

                {/* GRN Selection highlight block */}
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex flex-col gap-3">
                  <label className="text-xs font-extrabold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Select Source GRN (optional)
                  </label>
                  <select
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    value={grnId}
                    onChange={e => handleGRNChange(e.target.value)}
                  >
                    <option value="">-- Select GRN to import items --</option>
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
                    <div className="flex gap-4 text-xs text-violet-700 font-semibold flex-wrap">
                      <span>Type: <strong>{selectedGRN.grnType}</strong></span>
                      <span>Gate: <strong>{selectedGRN.gateEntryNo}</strong></span>
                      <span>Items: <strong>{(selectedGRN.items || []).length}</strong></span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt No.</label>
                    <input
                      type="text"
                      readOnly
                      value={receiptNo}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt Date</label>
                    <input
                      type="date"
                      value={receiptDate}
                      onChange={e => setReceiptDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Profile</label>
                    <select
                      value={taxProfile}
                      onChange={e => setTaxProfile(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                      <option value="">-- None --</option>
                      <option value="VAT-15%">VAT 15%</option>
                      <option value="VAT-5%">VAT 5%</option>
                      <option value="Zero-Rated">Zero-Rated</option>
                      <option value="Exempt">Exempt</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</label>
                    <select
                      disabled={!!grnId}
                      value={vendorId}
                      onChange={e => setVendorId(e.target.value)}
                      className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store</label>
                    <select
                      disabled={!!grnId}
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                      <option value="">-- Choose Store --</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Amount</label>
                    <div className="px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-violet-700 font-extrabold text-sm">
                      {fmtCurrency(netAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Top Tabs: Address / Reference / LC / Other ────────────── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="flex bg-slate-50 border-b border-slate-100 gap-1 p-2">
                  {([
                    { id: 'address', label: 'Address Details', icon: MapPin },
                    { id: 'reference', label: 'Reference Details', icon: Hash },
                    { id: 'lc', label: 'LC Details', icon: CreditCard },
                    { id: 'other', label: 'Other Details', icon: BookOpen }
                  ] as { id: TopTab; label: string; icon: any }[]).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTopTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        topTab === tab.id ? 'bg-white text-violet-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {topTab === 'address' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billing Address</label>
                        <textarea
                          rows={3}
                          value={billingAddress}
                          onChange={e => setBillingAddress(e.target.value)}
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                          placeholder="Enter billing address..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shipping Address</label>
                        <textarea
                          rows={3}
                          value={shippingAddress}
                          onChange={e => setShippingAddress(e.target.value)}
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                          placeholder="Enter shipping address..."
                        />
                      </div>
                    </div>
                  )}

                  {topTab === 'reference' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reference Number</label>
                        <input
                          type="text"
                          value={refNo}
                          onChange={e => setRefNo(e.target.value)}
                          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          placeholder="e.g. REF-001"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reference Date</label>
                        <input
                          type="date"
                          value={refDate}
                          onChange={e => setRefDate(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {topTab === 'lc' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LC Number</label>
                        <input
                          type="text"
                          value={lcNo}
                          onChange={e => setLcNo(e.target.value)}
                          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          placeholder="e.g. LC-2024-001"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LC Date</label>
                        <input
                          type="date"
                          value={lcDate}
                          onChange={e => setLcDate(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {topTab === 'other' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Term</label>
                        <select
                          value={paymentTerm}
                          onChange={e => setPaymentTerm(e.target.value)}
                          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        >
                          <option>Net 30</option>
                          <option>Net 60</option>
                          <option>Net 90</option>
                          <option>COD</option>
                          <option>Advance</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</label>
                        <textarea
                          rows={2}
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                          placeholder="Add any notes or remarks..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom Tabs: Items / Batch / Billing / Terms / Advance ── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="flex bg-slate-50 border-b border-slate-100 gap-1 p-2 flex-wrap">
                  {([
                    { id: 'items', label: `Items (${items.length})`, icon: Grid },
                    { id: 'batch', label: 'Batch Details', icon: Package },
                    { id: 'billing', label: 'Billing Details', icon: DollarSign },
                    { id: 'terms', label: 'Terms & Conditions', icon: ClipboardList },
                    { id: 'advance', label: 'Advance Request', icon: CreditCard }
                  ] as { id: BottomTab; label: string; icon: any }[]).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBottomTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        bottomTab === tab.id ? 'bg-white text-violet-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
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
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  )}
                </div>

                {/* ── Items Tab ────────────────────────────────────────────── */}
                {bottomTab === 'items' && (
                  <div className="overflow-auto">
                    {items.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Item Code</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Rate</th>
                            <th className="px-4 py-3">Disc %</th>
                            <th className="px-4 py-3">Disc Amt</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Remarks</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const lineAmt = Math.max(0, (item.quantity * item.rate) - (item.discountAmount || 0));
                            return (
                              <tr
                                key={idx}
                                onClick={() => setActiveItemIndex(idx)}
                                className={`cursor-pointer transition-all ${activeItemIndex === idx ? 'bg-violet-50 ring-1 ring-inset ring-violet-200' : 'hover:bg-slate-50/60'}`}
                              >
                                <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{item.itemCode}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700 max-w-40 truncate">{item.itemName}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.pendingQuantity ?? 9999}
                                    value={item.quantity}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.rate}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                                    className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
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
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold text-rose-600">{(item.discountAmount || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 font-bold text-violet-700">{lineAmt.toFixed(2)}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={item.remarks || ''}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => updateItem(idx, 'remarks', e.target.value)}
                                    className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-slate-600 text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                    placeholder="notes..."
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
                        <ShoppingBag className="w-12 h-12 text-slate-200 stroke-[1.5]" />
                        <div className="text-sm font-semibold text-slate-400">No items added yet</div>
                        <div className="text-xs text-slate-400">Select a GRN above or click "Add Item" to start</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Batch Details Tab ─────────────────────────────────────── */}
                {bottomTab === 'batch' && (
                  <div className="overflow-auto p-4">
                    {items.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Batch Code</th>
                            <th className="px-4 py-3">Expiry Date</th>
                            <th className="px-4 py-3">Locator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-all">
                              <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-700">{item.itemName}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.batchDetails?.batchCode || ''}
                                  onChange={e => updateItem(idx, 'batchDetails', { ...item.batchDetails, batchCode: e.target.value })}
                                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none w-32"
                                  placeholder="BATCH-001"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  value={item.batchDetails?.expiryDate || ''}
                                  onChange={e => updateItem(idx, 'batchDetails', { ...item.batchDetails, expiryDate: e.target.value })}
                                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.batchDetails?.locator || ''}
                                  onChange={e => updateItem(idx, 'batchDetails', { ...item.batchDetails, locator: e.target.value })}
                                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none w-28"
                                  placeholder="MAIN-01"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                        Add items first to manage batch details.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Billing Details Tab ───────────────────────────────────── */}
                {bottomTab === 'billing' && (
                  <div className="p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Gross Amount', value: items.reduce((s, i) => s + i.quantity * i.rate, 0) },
                        { label: 'Total Discount', value: items.reduce((s, i) => s + (i.discountAmount || 0), 0) },
                        { label: 'Net Amount', value: netAmount }
                      ].map(row => (
                        <div key={row.label} className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{row.label}</span>
                          <span className="text-lg font-extrabold text-slate-800">{fmtCurrency(row.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                      <div className="text-xs font-bold text-violet-600 mb-2">Item Breakdown</div>
                      <table className="w-full text-xs">
                        <thead><tr className="text-violet-400 font-bold uppercase">
                          <th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th>
                          <th className="text-right py-1">Rate</th><th className="text-right py-1">Disc</th><th className="text-right py-1">Amount</th>
                        </tr></thead>
                        <tbody className="divide-y divide-violet-100">
                          {items.map((item, idx) => (
                            <tr key={idx} className="text-violet-800">
                              <td className="py-1.5 font-semibold">{item.itemName}</td>
                              <td className="py-1.5 text-right">{item.quantity}</td>
                              <td className="py-1.5 text-right">{item.rate.toFixed(2)}</td>
                              <td className="py-1.5 text-right text-rose-500">{(item.discountAmount || 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-bold">{Math.max(0, item.quantity * item.rate - (item.discountAmount || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Terms & Conditions Tab ────────────────────────────────── */}
                {bottomTab === 'terms' && (
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setTerms(prev => [...prev, { id: crypto.randomUUID(), description: '' }])}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Term
                      </button>
                    </div>
                    {terms.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {terms.map((term, idx) => (
                          <div key={term.id} className="flex items-start gap-3">
                            <span className="mt-2.5 text-xs font-bold text-slate-400 min-w-6">{idx + 1}.</span>
                            <input
                              type="text"
                              value={term.description}
                              onChange={e => setTerms(prev => prev.map(t => t.id === term.id ? { ...t, description: e.target.value } : t))}
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                              placeholder="Enter term or condition..."
                            />
                            <button
                              type="button"
                              onClick={() => setTerms(prev => prev.filter(t => t.id !== term.id))}
                              className="mt-1 p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                        No terms added. Click "Add Term" to begin.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Advance Request Tab ───────────────────────────────────── */}
                {bottomTab === 'advance' && (
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setAdvances(prev => [...prev, { id: crypto.randomUUID(), amount: 0, bank: '', refNo: '' }])}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Advance
                      </button>
                    </div>
                    {advances.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-xs font-bold text-slate-400 uppercase bg-slate-50">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Amount (SAR)</th>
                            <th className="px-4 py-3">Bank / Payment Mode</th>
                            <th className="px-4 py-3">Reference No.</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {advances.map((adv, idx) => (
                            <tr key={adv.id}>
                              <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={adv.amount}
                                  onChange={e => setAdvances(prev => prev.map(a => a.id === adv.id ? { ...a, amount: Number(e.target.value) } : a))}
                                  className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={adv.bank}
                                  onChange={e => setAdvances(prev => prev.map(a => a.id === adv.id ? { ...a, bank: e.target.value } : a))}
                                  className="w-36 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                  placeholder="e.g. Bank Transfer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={adv.refNo}
                                  onChange={e => setAdvances(prev => prev.map(a => a.id === adv.id ? { ...a, refNo: e.target.value } : a))}
                                  className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-violet-400 outline-none"
                                  placeholder="REF-001"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => setAdvances(prev => prev.filter(a => a.id !== adv.id))}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                        No advance requests. Click "Add Advance" to begin.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Selected Item Details Drawer ─────────────────────── */}
            <div className="w-72 flex-shrink-0 sticky top-0 flex flex-col gap-4">
              {/* Vendor Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                {selectedVendor ? (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Vendor Card</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 text-violet-700 flex items-center justify-center rounded-xl font-black text-sm">
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
                    <div className="text-xs font-bold text-slate-400">Select Vendor</div>
                  </div>
                )}
              </div>

              {/* Item Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-violet-500" /> Selected Item Details
                </h3>
                {activeItem ? (
                  <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                      <div className="font-extrabold text-violet-800 text-sm">{activeItem.itemName}</div>
                      <div className="text-xs text-violet-500 font-bold">{activeItem.itemCode}</div>
                    </div>

                    {[
                      { label: 'Source Qty (GRN)', value: activeItem.sourceQuantity ?? activeItem.quantity, highlight: false },
                      { label: 'Already Converted', value: activeItem.alreadyConvertedQuantity ?? 0, highlight: false },
                      { label: 'Pending Qty', value: activeItem.pendingQuantity ?? activeItem.quantity, highlight: true },
                      { label: 'Accepted Qty', value: activeItem.quantity, highlight: false },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{row.label}</span>
                        <span className={`font-extrabold ${row.highlight ? 'text-violet-700' : 'text-slate-700'}`}>{row.value}</span>
                      </div>
                    ))}

                    <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5">
                      {[
                        { label: 'Unit Rate', value: `${activeItem.rate.toFixed(2)} SAR` },
                        { label: 'Basic Amount', value: `${(activeItem.quantity * activeItem.rate).toFixed(2)} SAR` },
                        { label: 'Discount %', value: `${(activeItem.discountPercentage || 0).toFixed(2)}%` },
                        { label: 'Discount Amt', value: `${(activeItem.discountAmount || 0).toFixed(2)} SAR` },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">{row.label}</span>
                          <span className="font-bold text-slate-700">{row.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs mt-1 p-2 bg-violet-50 rounded-xl border border-violet-100">
                        <span className="text-violet-600 font-extrabold">Net Line Amount</span>
                        <span className="font-extrabold text-violet-700">
                          {fmtCurrency(Math.max(0, activeItem.quantity * activeItem.rate - (activeItem.discountAmount || 0)))}
                        </span>
                      </div>
                    </div>

                    {activeItem.batchDetails?.batchCode && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs flex flex-col gap-1">
                        <div className="font-bold text-emerald-700">Batch: {activeItem.batchDetails.batchCode}</div>
                        {activeItem.batchDetails.expiryDate && (
                          <div className="text-emerald-600">Expiry: {activeItem.batchDetails.expiryDate}</div>
                        )}
                        {activeItem.batchDetails.locator && (
                          <div className="text-emerald-600">Locator: {activeItem.batchDetails.locator}</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                    <Eye className="w-10 h-10" />
                    <div className="text-xs font-bold text-slate-400 text-center">Click any item row to view its details here</div>
                  </div>
                )}
              </div>

              {/* Summary totals */}
              <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl p-5 text-white shadow-lg shadow-violet-200">
                <div className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-3">Receipt Summary</div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-violet-200">Total Items</span>
                    <span className="font-bold">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-violet-200">Gross Amount</span>
                    <span className="font-bold">{fmtCurrency(items.reduce((s, i) => s + i.quantity * i.rate, 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-violet-200">Total Discount</span>
                    <span className="font-bold text-rose-300">-{fmtCurrency(items.reduce((s, i) => s + (i.discountAmount || 0), 0))}</span>
                  </div>
                  <div className="border-t border-violet-500 pt-2 flex justify-between">
                    <span className="text-violet-100 font-bold">Net Amount</span>
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
                <ShoppingBag className="w-5 h-5 text-violet-600" /> Add Item
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Item Search */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search & Select Item</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={modalItemSearch}
                    onChange={e => { setModalItemSearch(e.target.value); setModalItemId(''); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                {modalItemSearch && !modalItemId && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-slate-100 shadow-lg">
                    {filteredModalItems.length > 0 ? filteredModalItems.slice(0, 15).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setModalItemId(item.id); setModalItemSearch(item.itemName); }}
                        className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-700 text-sm">{item.itemName}</div>
                          <div className="text-xs text-slate-400">{item.itemCode}</div>
                        </div>
                        <div className="text-xs font-bold text-violet-600">SAR {item.stock?.itemRate?.toFixed(2) || '0.00'}</div>
                      </button>
                    )) : (
                      <div className="px-4 py-4 text-sm text-slate-400 text-center">No items found</div>
                    )}
                  </div>
                )}
                {modalItemId && (
                  <div className="px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-700 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" /> {inventoryItems.find(i => i.id === modalItemId)?.itemCode} selected
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={modalQuantity}
                    onChange={e => setModalQuantity(Number(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Rate (SAR)</label>
                  <input
                    type="number"
                    min={0}
                    value={modalRate}
                    onChange={e => setModalRate(Number(e.target.value))}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
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
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locator</label>
                  <input
                    type="text"
                    value={modalLocator}
                    onChange={e => setModalLocator(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="MAIN-01"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Code</label>
                  <input
                    type="text"
                    value={modalBatch}
                    onChange={e => setModalBatch(e.target.value.toUpperCase())}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="e.g. BATCH-001"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={modalExpiry}
                    onChange={e => setModalExpiry(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</label>
                  <input
                    type="text"
                    value={modalRemarks}
                    onChange={e => setModalRemarks(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              {/* Preview */}
              {modalItemId && (
                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl flex flex-col gap-1.5 text-xs">
                  <div className="font-bold text-violet-700 mb-1">Line Preview</div>
                  <div className="flex justify-between"><span className="text-violet-500">Basic Amount</span><span className="font-bold text-violet-800">{fmtCurrency(modalQuantity * modalRate)}</span></div>
                  <div className="flex justify-between"><span className="text-violet-500">Discount</span><span className="font-bold text-rose-500">-{fmtCurrency(modalQuantity * modalRate * (modalDiscount / 100))}</span></div>
                  <div className="flex justify-between border-t border-violet-200 pt-1.5 mt-1"><span className="text-violet-700 font-bold">Net</span><span className="font-extrabold text-violet-800">{fmtCurrency(Math.max(0, modalQuantity * modalRate * (1 - modalDiscount / 100)))}</span></div>
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
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 transition-all"
              >
                Add to Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
