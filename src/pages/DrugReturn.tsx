import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Undo, CheckCircle, History, ArrowLeft, Calendar, Hash, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { PharmacyInvoiceReport } from '../components/pharmacy/PharmacyInvoiceReport';

type LiveBillItem = {
  id: string;
  description: string;
  quantity: number;       // originally dispensed
  unitPrice: number;
  total: number;
  itemId?: string;
  batchNo?: string;
  returnedQty: number;    // already returned in prior transactions
  taxPercentage: number;
  taxAmount: number;      // total tax originally charged for the full qty
  itemType?: string;      // UOM
};

type ActiveTab = 'process' | 'history';

export const DrugReturn: React.FC = () => {
    const { patients, bills, stores, showToast, processPharmacyReturn, fetchBillItems, formatCurrency, selectedCurrency } = useData();
    const decimals = selectedCurrency === 'BHD' ? 3 : 2;

    // ─── Tab State ───────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ActiveTab>('process');

    // ─── Process Return State ────────────────────────────────────────────────
    const [searchMRN, setSearchMRN] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
    const [liveItems, setLiveItems] = useState<LiveBillItem[]>([]);
    const [isFetchingItems, setIsFetchingItems] = useState(false);
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedReturnInvoiceId, setGeneratedReturnInvoiceId] = useState<string | null>(null);
    const [reason, setReason] = useState('Doctor changed prescription');

    // ─── History Tab State ────────────────────────────────────────────────────
    const [histSearchNo, setHistSearchNo] = useState('');
    const [histFromDate, setHistFromDate] = useState('');
    const [histToDate, setHistToDate] = useState('');
    const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

    // Auto-select first store
    useEffect(() => {
        if (stores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(stores[0].id);
        }
    }, [stores, selectedStoreId]);

    // When a bill is selected, fetch its items LIVE from the database
    useEffect(() => {
        if (!selectedBillId) {
            setLiveItems([]);
            setReturnQuantities({});
            return;
        }
        setIsFetchingItems(true);
        setLiveItems([]);
        setReturnQuantities({});
        fetchBillItems(selectedBillId).then(items => {
            setLiveItems(items);
            setIsFetchingItems(false);
        });
    }, [selectedBillId]);

    // Filter pharmacy bills for the searched patient - comprehensive search
    const filteredBills = useMemo(() => {
        if (!searchMRN) return [];
        const query = searchMRN.toLowerCase().trim();
        
        return bills.filter(b => {
            if (!b.isPharmacy || b.status === 'Cancelled') return false;
            if (b.totalAmount < 0) return false; // exclude returns from the invoice list

            const patient = patients.find(p => 
                p.id.toLowerCase().includes(query) || 
                (p.phone && p.phone.includes(query)) ||
                (`${p.firstName} ${p.lastName}`.toLowerCase().includes(query))
            );
            
            const patientMatch = patient && b.patientId === patient.id;
            const directMrnMatch = b.patientId && b.patientId.toLowerCase().includes(query);
            const invMatch = b.invoiceNo && b.invoiceNo.toLowerCase().includes(query);
            
            return patientMatch || directMrnMatch || invMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [searchMRN, bills, patients]);

    const selectedBill = useMemo(() => 
        bills.find(b => b.id === selectedBillId), [selectedBillId, bills]);

    // ─── History: filter drug returns from bills ──────────────────────────────
    const drugReturnHistory = useMemo(() => {
        return bills.filter(b => {
            if (!b.isPharmacy) return false;
            if ((b.totalAmount || 0) >= 0) return false; // only negative = returns
            if (!b.invoiceNo) return false;

            // Filter by return number
            if (histSearchNo) {
                const q = histSearchNo.toLowerCase().trim();
                const noMatch = b.invoiceNo.toLowerCase().includes(q);
                if (!noMatch) return false;
            }

            // Filter by date range
            const returnDate = new Date(b.date);
            if (histFromDate) {
                const from = new Date(histFromDate);
                from.setHours(0, 0, 0, 0);
                if (returnDate < from) return false;
            }
            if (histToDate) {
                const to = new Date(histToDate);
                to.setHours(23, 59, 59, 999);
                if (returnDate > to) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bills, histSearchNo, histFromDate, histToDate]);

    const handleReturnQtyChange = (itemId: string, qty: number, maxQty: number) => {
        if (qty < 0) qty = 0;
        if (qty > maxQty) qty = maxQty;
        setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
    };

    const totalReturnAmount = useMemo(() => {
        return liveItems.reduce((sum, item) => {
            const qty = returnQuantities[item.id] || 0;
            const total = Number((qty * item.unitPrice).toFixed(decimals));
            return sum + total;
        }, 0);
    }, [liveItems, returnQuantities, decimals]);

    const handleProcessReturn = async () => {
        if (!selectedBillId || !selectedStoreId) {
            showToast('error', 'Please select a store and an invoice.');
            return;
        }

        const itemsToReturn = Object.entries(returnQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, qty]) => {
                const item = liveItems.find(li => li.id === itemId);
                return {
                    itemId: item?.itemId || '',
                    batchNo: item?.batchNo || '',
                    qty: qty,
                    rate: item?.unitPrice || 0,
                    description: item?.description || '',
                    taxPercentage: item?.taxPercentage || 0,
                    itemType: item?.itemType || ''
                };
            });

        if (itemsToReturn.length === 0) {
            showToast('error', 'Please enter a return quantity for at least one item.');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processPharmacyReturn(selectedBillId, selectedStoreId, itemsToReturn, reason);
            if (result.success) {
                showToast('success', 'Return processed successfully.');
                setGeneratedReturnInvoiceId(result.invoiceId || null);
                setReturnQuantities({});
                setSelectedBillId(null);
                setLiveItems([]);
            }
        } catch (err: any) {
            console.error('Return error:', err);
            showToast('error', 'Unexpected error: ' + (err.message || 'Please try again.'));
        } finally {
            setIsProcessing(false);
        }
    };

    const clearHistoryFilters = () => {
        setHistSearchNo('');
        setHistFromDate('');
        setHistToDate('');
    };

    const hasHistoryFilters = histSearchNo || histFromDate || histToDate;

    return (
        <div className="flex flex-col h-full gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Drug Return</h1>
                    <p className="text-slate-500 text-sm font-medium">Process medication returns and generate credit notes</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('process')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'process'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Undo className="w-4 h-4" />
                    Process Return
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'history'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History className="w-4 h-4" />
                    Return History
                    {drugReturnHistory.length > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {drugReturnHistory.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── PROCESS RETURN TAB ─── */}
            {activeTab === 'process' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                    {/* Left: Search & Invoice List */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Find Patient / Invoice</label>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search Invoice, MRN or Phone..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchMRN}
                                    onChange={(e) => setSearchMRN(e.target.value)}
                                />
                            </div>

                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Store</label>
                            <select 
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none mb-5"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                            >
                                <option value="">Select Store</option>
                                {stores.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.storeName || 'Unnamed Store'}
                                    </option>
                                ))}
                            </select>

                            <div className="space-y-2 max-h-[450px] overflow-y-auto">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Recent Invoices {filteredBills.length > 0 && <span className="text-blue-500">({filteredBills.length})</span>}
                                </h3>
                                {!searchMRN ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">Enter Invoice or MRN to search</div>
                                ) : filteredBills.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 italic text-sm">No pharmacy invoices found</div>
                                ) : (
                                    filteredBills.map(bill => (
                                        <button
                                            key={bill.id}
                                            onClick={() => setSelectedBillId(bill.id)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                                                selectedBillId === bill.id 
                                                ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-slate-800 text-sm">{bill.invoiceNo || 'INV-' + bill.id.slice(0,8)}</span>
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
                                                    {new Date(bill.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">{formatCurrency(bill.totalAmount || 0)}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Return Details */}
                    <div className="lg:col-span-2 flex flex-col overflow-hidden">
                        {selectedBill ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Return Items</h2>
                                        <p className="text-xs text-slate-500 font-medium">Original Invoice: {selectedBill.invoiceNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Total Credit</div>
                                        <div className="text-2xl font-black text-blue-600">{formatCurrency(totalReturnAmount)}</div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {isFetchingItems ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                                            <span className="text-slate-500">Loading items from database...</span>
                                        </div>
                                    ) : liveItems.length === 0 ? (
                                        <div className="text-center py-20 text-slate-400">
                                            <p className="font-medium">No items found for this invoice.</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                    <th className="pb-4">Item Description</th>
                                                    <th className="pb-4 text-center">Dispensed</th>
                                                    <th className="pb-4 text-center text-orange-500">Already Returned</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Return Qty</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Unit Rate</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Tax</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase">Credit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {liveItems.map(item => {
                                                    const maxReturnable = item.quantity - (item.returnedQty || 0);
                                                    const isFullyReturned = maxReturnable <= 0;
                                                    return (
                                                    <tr key={item.id} className={`group transition-colors ${isFullyReturned ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50'}`}>
                                                        <td className="py-4">
                                                            <div className="font-bold text-slate-700">{item.description}</div>
                                                            <div className="text-[10px] text-slate-400 uppercase font-bold">
                                                                Batch: {item.batchNo || 'N/A'}
                                                            </div>
                                                            {isFullyReturned && (
                                                                <span className="inline-block mt-1 text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full uppercase">
                                                                    Fully Returned
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                                                        <td className="py-4 text-center">
                                                            {(item.returnedQty || 0) > 0 ? (
                                                                <span className="font-bold text-orange-500">{item.returnedQty}</span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <input 
                                                                type="number"
                                                                className={`w-20 px-3 py-1.5 border rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                                                                    isFullyReturned 
                                                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                                                    : 'bg-slate-50 border-slate-200 text-blue-600'
                                                                }`}
                                                                value={returnQuantities[item.id] || ''}
                                                                onChange={(e) => handleReturnQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)}
                                                                min="0"
                                                                max={maxReturnable}
                                                                placeholder="0"
                                                                disabled={isFullyReturned}
                                                            />
                                                            {!isFullyReturned && (
                                                                <div className="text-[10px] text-slate-400 mt-1">max {maxReturnable}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className="text-xs font-bold text-slate-600">{formatCurrency(item.unitPrice)}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-orange-600">
                                                                    {formatCurrency(
                                                                        ((returnQuantities[item.id] || 0) * item.unitPrice * item.taxPercentage) / 
                                                                        (100 + item.taxPercentage)
                                                                    )}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">({item.taxPercentage}%)</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className="text-sm font-black text-slate-800">
                                                                {formatCurrency((returnQuantities[item.id] || 0) * item.unitPrice)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1 max-w-xs">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Return</label>
                                        <select
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="Doctor changed prescription">Doctor changed prescription</option>
                                            <option value="Patient discharged">Patient discharged</option>
                                            <option value="Medicine not required">Medicine not required</option>
                                            <option value="Wrong medicine dispensed">Wrong medicine dispensed</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-100/50 border-t border-slate-100 flex justify-end gap-3">
                                    <button 
                                        onClick={() => { setSelectedBillId(null); setLiveItems([]); }}
                                        className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-bold border border-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleProcessReturn}
                                        disabled={isProcessing || totalReturnAmount === 0 || isFetchingItems}
                                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                    >
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <CheckCircle className="w-5 h-5" />
                                        )}
                                        Confirm Return & Print
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                                <div className="p-4 bg-slate-50 rounded-full mb-4">
                                    <Undo className="w-12 h-12 text-slate-300" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-700 mb-2">Select an Invoice</h2>
                                <p className="text-sm text-slate-500">Search for a patient and select an invoice to process returns</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── RETURN HISTORY TAB ─── */}
            {activeTab === 'history' && (
                <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Return Number Search */}
                            <div className="flex flex-col gap-1 min-w-[220px] flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> Return Number
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search return no. e.g. RET-..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={histSearchNo}
                                        onChange={e => setHistSearchNo(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* From Date */}
                            <div className="flex flex-col gap-1 min-w-[160px]">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> From Date
                                </label>
                                <input
                                    type="date"
                                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={histFromDate}
                                    onChange={e => setHistFromDate(e.target.value)}
                                />
                            </div>

                            {/* To Date */}
                            <div className="flex flex-col gap-1 min-w-[160px]">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> To Date
                                </label>
                                <input
                                    type="date"
                                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={histToDate}
                                    onChange={e => setHistToDate(e.target.value)}
                                />
                            </div>

                            {/* Clear filters */}
                            {hasHistoryFilters && (
                                <button
                                    onClick={clearHistoryFilters}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold border border-red-100 transition-all"
                                >
                                    <X className="w-4 h-4" /> Clear
                                </button>
                            )}

                            {/* Summary badge */}
                            <div className="ml-auto flex items-center gap-2">
                                <div className="bg-blue-50 text-blue-700 text-xs font-black px-3 py-2 rounded-xl border border-blue-100">
                                    {drugReturnHistory.length} Return{drugReturnHistory.length !== 1 ? 's' : ''} Found
                                </div>
                                <div className="bg-rose-50 text-rose-700 text-xs font-black px-3 py-2 rounded-xl border border-rose-100">
                                    Total Credit: {formatCurrency(Math.abs(drugReturnHistory.reduce((s, r) => s + (r.totalAmount || 0), 0)))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-y-auto">
                        {drugReturnHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                <div className="p-5 bg-slate-50 rounded-full mb-4">
                                    <History className="w-12 h-12 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-600 mb-1">No Returns Found</h3>
                                <p className="text-sm text-slate-400">
                                    {hasHistoryFilters ? 'Try adjusting your filters.' : 'No drug returns have been processed yet.'}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-100">
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="px-5 py-3">Return No.</th>
                                        <th className="px-3 py-3">Return Date</th>
                                        <th className="px-3 py-3">Original Invoice</th>
                                        <th className="px-3 py-3">Patient</th>
                                        <th className="px-3 py-3 text-right">Credit Amount</th>
                                        <th className="px-3 py-3 text-center">Items</th>
                                        <th className="px-3 py-3 text-center">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {drugReturnHistory.map(ret => {
                                        const patient = patients.find(p => p.id === ret.patientId);
                                        const patientName = patient
                                            ? `${patient.firstName} ${patient.lastName}`.trim()
                                            : ret.patientId || '—';
                                        const isExpanded = expandedReturnId === ret.id;
                                        const creditAmt = Math.abs(ret.totalAmount || 0);
                                        // Determine original invoice from items description
                                        const origInvoice = ret.items?.[0]?.description?.match(/From (.+)\)/)
                                            ?.[1] || '—';

                                        return (
                                            <React.Fragment key={ret.id}>
                                                <tr
                                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : ''}`}
                                                    onClick={() => setExpandedReturnId(isExpanded ? null : ret.id)}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                            <ArrowLeft className="w-3 h-3" />
                                                            {ret.invoiceNo}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-sm text-slate-600 font-medium">
                                                        {new Date(ret.date).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                            {new Date(ret.date).toLocaleTimeString('en-GB', {
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-sm font-semibold text-slate-600">
                                                        {origInvoice}
                                                    </td>
                                                    <td className="px-3 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                                                                {patientName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-700">{patientName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-right">
                                                        <span className="text-sm font-black text-rose-600">
                                                            −{formatCurrency(creditAmt)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                                            {ret.items?.length || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <button className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-lg hover:bg-blue-50">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded item details */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={7} className="px-5 py-0 bg-blue-50/30">
                                                            <div className="py-3">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="text-[9px] font-bold text-slate-400 uppercase">
                                                                            <th className="pb-2 text-left">Item</th>
                                                                            <th className="pb-2 text-center">Qty Returned</th>
                                                                            <th className="pb-2 text-right">Unit Price</th>
                                                                            <th className="pb-2 text-right">Total Credit</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-blue-100">
                                                                        {(ret.items || []).map(item => (
                                                                            <tr key={item.id}>
                                                                                <td className="py-2 font-semibold text-slate-700 pr-4">
                                                                                    {item.description?.replace(/^RETURN: /, '').split(' (From')[0]}
                                                                                    {item.batchNo && (
                                                                                        <span className="ml-2 text-[9px] font-bold text-slate-400 uppercase">
                                                                                            Batch: {item.batchNo}
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-2 text-center font-bold text-slate-600">
                                                                                    {Math.abs(item.quantity)}
                                                                                </td>
                                                                                <td className="py-2 text-right font-medium text-slate-600">
                                                                                    {formatCurrency(item.unitPrice)}
                                                                                </td>
                                                                                <td className="py-2 text-right font-bold text-rose-600">
                                                                                    −{formatCurrency(Math.abs(item.total))}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr className="border-t border-blue-200">
                                                                            <td colSpan={3} className="pt-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                                                Total Credit
                                                                            </td>
                                                                            <td className="pt-2 text-right text-sm font-black text-rose-600">
                                                                                −{formatCurrency(creditAmt)}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Invoice Report Modal */}
            {generatedReturnInvoiceId && bills.find(b => b.id === generatedReturnInvoiceId) && (
                <PharmacyInvoiceReport 
                    bill={bills.find(b => b.id === generatedReturnInvoiceId)!}
                    patient={patients.find(p => p.id === bills.find(b => b.id === generatedReturnInvoiceId)?.patientId)}
                    onClose={() => setGeneratedReturnInvoiceId(null)}
                />
            )}
        </div>
    );
};
