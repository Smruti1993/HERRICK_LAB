import React, { useState, useMemo } from 'react';
import { Search, Undo, DollarSign, FileText, CheckCircle, RotateCcw, AlertCircle, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';

interface EligibleRefundItem {
    id: string; // The ID of the pharmacy_return or bill
    refNo: string; // return_no or invoice_no
    originalInvoice: string; // original bill invoice_no or invoice_no itself
    serviceName: string; // 'DEF' or name of services in the invoice
    date: string; // return_date or bill date
    type: 'RETURN' | 'CANCELLED BILL';
    amount: number; // total return amount or bill paid amount
    status: 'Pending refund';
}

export const Refund: React.FC = () => {
    const { patients, bills, processPatientRefund, showToast, formatCurrency } = useData();

    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [remarks, setRemarks] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successDetails, setSuccessDetails] = useState<{ refundNo: string; amount: number } | null>(null);

    // Selected Patient details
    const selectedPatient = useMemo(() => {
        if (!selectedPatientId) return null;
        return patients.find(p => p.id === selectedPatientId) || null;
    }, [selectedPatientId, patients]);

    // Perform patient search (matching ID, Name, Phone, MRN)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return patients.filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const mrNo = p.id.slice(-8).toUpperCase();
            return (
                fullName.includes(q) ||
                mrNo.includes(q) ||
                (p.phone && p.phone.includes(q))
            );
        }).slice(0, 5); // Limit search results for dropdown
    }, [searchQuery, patients]);

    // Build the list of eligible refunds for the selected patient
    const eligibleRefundItems = useMemo((): EligibleRefundItem[] => {
        if (!selectedPatientId) return [];

        const items: EligibleRefundItem[] = [];

        // 1. Process Virtual Return Bills (Pharmacy returns) in the bills state that are pending refund
        bills.forEach(bill => {
            if (bill.patientId === selectedPatientId && bill.totalAmount < 0 && bill.refundStatus === 'Pending') {
                // Find original bill invoice no for label
                let origInv = 'Unknown';
                const firstItemDesc = bill.items?.[0]?.description || '';
                const match = firstItemDesc.match(/\(From (.*?)\)/);
                if (match && match[1]) {
                    origInv = match[1];
                }

                // Service Name extraction
                let service = 'DEF';
                if (bill.items && bill.items.length > 0) {
                    const cleanDesc = bill.items[0].description
                        .replace(/^RETURN:\s*/, '')
                        .replace(/\s*\(From.*?\)$/, '');
                    service = cleanDesc.length > 25 ? cleanDesc.slice(0, 25) + '...' : cleanDesc;
                }

                items.push({
                    id: bill.id,
                    refNo: bill.invoiceNo || 'RET-REF',
                    originalInvoice: origInv,
                    serviceName: service,
                    date: bill.date,
                    type: 'RETURN',
                    amount: Math.abs(bill.totalAmount),
                    status: 'Pending refund'
                });
            }
        });

        // 2. Process Cancelled Service Invoices (standard bills that are Cancelled, paidAmount > 0, and Pending refund)
        bills.forEach(bill => {
            const isPharmacy = bill.isPharmacy || (bill.invoiceNo && (bill.invoiceNo.startsWith('PH-') || bill.invoiceNo.startsWith('INV-D-')));
            if (
                bill.patientId === selectedPatientId &&
                !isPharmacy &&
                bill.status === 'Cancelled' &&
                bill.paidAmount > 0 &&
                bill.refundStatus === 'Pending'
            ) {
                // Service Name representation
                let service = 'Billing Services';
                if (bill.items && bill.items.length > 0) {
                    const firstItem = bill.items[0].description;
                    service = firstItem.length > 30 ? firstItem.slice(0, 30) + '...' : firstItem;
                    if (bill.items.length > 1) {
                        service += ` (+${bill.items.length - 1} items)`;
                    }
                }

                items.push({
                    id: bill.id,
                    refNo: bill.invoiceNo || `INV-${bill.id.slice(-8).toUpperCase()}`,
                    originalInvoice: bill.invoiceNo || `INV-${bill.id.slice(-8).toUpperCase()}`,
                    serviceName: service,
                    date: bill.date,
                    type: 'CANCELLED BILL',
                    amount: bill.paidAmount,
                    status: 'Pending refund'
                });
            }
        });

        return items;
    }, [selectedPatientId, bills]);

    // Calculations
    const totalCreditBalance = useMemo(() => {
        return eligibleRefundItems.reduce((sum, item) => sum + item.amount, 0);
    }, [eligibleRefundItems]);

    const selectedRefundAmount = useMemo(() => {
        return eligibleRefundItems.reduce((sum, item) => {
            if (selectedItemIds.has(item.id)) {
                return sum + item.amount;
            }
            return sum;
        }, 0);
    }, [eligibleRefundItems, selectedItemIds]);

    const remainingBalance = totalCreditBalance - selectedRefundAmount;

    // Checkbox toggles
    const handleToggleItem = (id: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItemIds(new Set(eligibleRefundItems.map(item => item.id)));
        } else {
            setSelectedItemIds(new Set());
        }
    };

    const isAllSelected = eligibleRefundItems.length > 0 && selectedItemIds.size === eligibleRefundItems.length;

    // Reset everything
    const handleClear = () => {
        setSearchQuery('');
        setSelectedPatientId(null);
        setSelectedItemIds(new Set());
        setRemarks('');
        setSuccessDetails(null);
    };

    // Submit refund transaction
    const handleProcessRefund = async () => {
        if (!selectedPatientId) {
            showToast('error', 'Please search and select a patient.');
            return;
        }
        if (selectedItemIds.size === 0) {
            showToast('error', 'Please select at least one eligible return/bill to refund.');
            return;
        }

        setIsProcessing(true);
        try {
            const listToRefund = eligibleRefundItems
                .filter(item => selectedItemIds.has(item.id))
                .map(item => ({
                    type: (item.type === 'RETURN' ? 'Return' : 'ServiceInvoice') as 'Return' | 'ServiceInvoice',
                    id: item.id,
                    amount: item.amount
                }));

            const result = await processPatientRefund(
                selectedPatientId,
                listToRefund,
                selectedRefundAmount,
                remarks
            );

            if (result.success && result.refundNo) {
                showToast('success', `Refund processed successfully: ${result.refundNo}`);
                setSuccessDetails({
                    refundNo: result.refundNo,
                    amount: selectedRefundAmount
                });
                setSelectedItemIds(new Set());
                setRemarks('');
            }
        } catch (err: any) {
            console.error('Refund execution error:', err);
            showToast('error', 'Unexpected error: ' + (err.message || 'Please try again.'));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header & Subtitle */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Undo className="w-5 h-5 text-blue-600" /> Process refund
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Search patient → select eligible returns → issue cash refund
                    </p>
                </div>
            </div>

            {/* Main Content White Card (Matches billing pages layout) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                
                {/* 1. Patient Search Panel */}
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 space-y-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        PATIENT SEARCH
                    </label>
                    
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search by Patient Name, MRN or Phone..."
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 placeholder-slate-400 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedPatientId) {
                                            setSelectedPatientId(null);
                                            setSelectedItemIds(new Set());
                                            setSuccessDetails(null);
                                        }
                                    }}
                                />
                                
                                {/* Search Results Dropdown */}
                                {searchQuery && !selectedPatientId && searchResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                        {searchResults.map(p => {
                                            const mrNo = p.id.slice(-8).toUpperCase();
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedPatientId(p.id);
                                                        setSearchQuery(`${p.firstName} ${p.lastName}`);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex justify-between items-center text-sm"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-700">{p.firstName} {p.lastName}</div>
                                                        <div className="text-xs text-slate-400">{p.phone || 'No phone'}</div>
                                                    </div>
                                                    <div className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">
                                                        {mrNo}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                                onClick={() => {
                                    if (searchResults.length > 0) {
                                        setSelectedPatientId(searchResults[0].id);
                                        setSearchQuery(`${searchResults[0].firstName} ${searchResults[0].lastName}`);
                                    } else {
                                        showToast('info', 'No matching patient found.');
                                    }
                                }}
                            >
                                <Search className="w-4 h-4" /> Search
                            </button>
                        </div>
                    </div>

                    {/* Patient info details */}
                    {selectedPatient && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200/60 text-xs">
                            <div className="space-y-0.5">
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Patient name</div>
                                <div className="font-bold text-slate-700 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">MR no</div>
                                <div className="font-mono font-bold text-blue-600 text-sm">
                                    {selectedPatient.id.slice(-8).toUpperCase()}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Date</div>
                                <div className="font-bold text-slate-700 text-sm">
                                    {new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Credit balance</div>
                                <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg font-extrabold text-sm w-fit">
                                    {formatCurrency(totalCreditBalance)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Eligible Returns Panel */}
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 space-y-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        ELIGIBLE RETURNS — SELECT TO REFUND
                    </label>

                    {!selectedPatientId ? (
                        <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-200/50">
                            <AlertCircle className="w-8 h-8 opacity-40 text-slate-400" />
                            <span className="font-medium">Please search and select a patient to fetch eligible returns.</span>
                        </div>
                    ) : eligibleRefundItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-200/50">
                            <CheckCircle className="w-8 h-8 opacity-40 text-emerald-500" />
                            <span className="font-bold text-slate-500">No eligible returns found. Credit balance is zero.</span>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                            <th className="py-3 px-3 w-8"></th>
                                            <th className="py-3 px-3">Return ref / Invoice</th>
                                            <th className="py-3 px-3">Original invoice</th>
                                            <th className="py-3 px-3">Service</th>
                                            <th className="py-3 px-3">Return date</th>
                                            <th className="py-3 px-3">Type</th>
                                            <th className="py-3 px-3 text-right">Return amount</th>
                                            <th className="py-3 px-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-600">
                                        {eligibleRefundItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3.5 px-3">
                                                    <input 
                                                        type="checkbox"
                                                        className="w-4 h-4 bg-white border-slate-300 rounded text-blue-600 focus:ring-blue-500 outline-none cursor-pointer"
                                                        checked={selectedItemIds.has(item.id)}
                                                        onChange={() => handleToggleItem(item.id)}
                                                    />
                                                </td>
                                                <td className="py-3.5 px-3 font-mono font-bold text-slate-700 truncate max-w-[120px]" title={item.refNo}>
                                                    {item.refNo}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-slate-500">
                                                    {item.originalInvoice}
                                                </td>
                                                <td className="py-3.5 px-3 text-slate-600 font-bold max-w-[140px] truncate" title={item.serviceName}>
                                                    {item.serviceName}
                                                </td>
                                                <td className="py-3.5 px-3 text-slate-500">
                                                    {new Date(item.date).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] border ${
                                                        item.type === 'RETURN' 
                                                        ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                                        : 'bg-purple-50 text-purple-700 border-purple-100'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                                                    {formatCurrency(item.amount)}
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                        Pending refund
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Eligible returns totals bar */}
                    {eligibleRefundItems.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-200 text-xs bg-slate-100/50 p-4 rounded-xl items-center mt-2">
                            <div>
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Total credit balance</div>
                                <div className="font-extrabold text-emerald-600 text-sm">{formatCurrency(totalCreditBalance)}</div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Selected for refund</div>
                                <div className="font-bold text-blue-600 text-sm">{selectedItemIds.size} returns</div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Refund amount</div>
                                <div className="font-extrabold text-blue-600 text-sm">{formatCurrency(selectedRefundAmount)}</div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Remaining balance</div>
                                <div className="font-extrabold text-slate-700 text-sm">{formatCurrency(remainingBalance)}</div>
                            </div>
                            <div className="flex justify-end pr-2">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-500 hover:text-slate-800 select-none">
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 bg-white border-slate-300 rounded text-blue-600 focus:ring-blue-500 outline-none"
                                        checked={isAllSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                    Select all
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Refund Method Panel */}
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 space-y-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        REFUND METHOD
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-blue-500 bg-blue-50/20 rounded-xl p-4 flex gap-3.5 items-center relative shadow-sm">
                            <div className="absolute top-4 right-4 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white border border-blue-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">Cash</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Hand cash to patient at counter</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Remarks Panel */}
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Remarks (optional)
                    </label>
                    <textarea 
                        rows={3}
                        placeholder="e.g. Patient requested refund for cancelled services..."
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-4 text-sm outline-none text-slate-800 placeholder-slate-400 transition-all resize-none shadow-sm"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>

                {/* 5. Success Details Card (Receipt info) */}
                {successDetails && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3.5 items-start shadow-sm">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <div className="font-bold text-emerald-800 text-sm">Refund Successful</div>
                            <div className="text-xs text-emerald-700 leading-relaxed font-medium">
                                Refund voucher <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{successDetails.refundNo}</span> has been processed for <span className="font-extrabold text-slate-800">{formatCurrency(successDetails.amount)}</span>. 
                                Transactions are fully recorded and mapped in the Patient Ledger report.
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions Bar */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={handleClear}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-4 h-4 text-slate-500" /> Clear
                    </button>
                    <button
                        onClick={handleProcessRefund}
                        disabled={isProcessing || selectedItemIds.size === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <DollarSign className="w-4 h-4" /> Process refund
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
