import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Undo, CheckCircle
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
};

export const DrugReturn: React.FC = () => {
    const { patients, bills, stores, showToast, processPharmacyReturn, fetchBillItems } = useData();
    
    const [searchMRN, setSearchMRN] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
    const [liveItems, setLiveItems] = useState<LiveBillItem[]>([]);
    const [isFetchingItems, setIsFetchingItems] = useState(false);
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedReturnInvoiceId, setGeneratedReturnInvoiceId] = useState<string | null>(null);

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

    const handleReturnQtyChange = (itemId: string, qty: number, maxQty: number) => {
        if (qty < 0) qty = 0;
        if (qty > maxQty) qty = maxQty;
        setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
    };

    const totalReturnAmount = useMemo(() => {
        return liveItems.reduce((sum, item) => {
            const qty = returnQuantities[item.id] || 0;
            return sum + (qty * item.unitPrice);
        }, 0);
    }, [liveItems, returnQuantities]);

    const handleProcessReturn = async () => {
        if (!selectedBillId || !selectedStoreId) {
            showToast('error', 'Please select a store and an invoice.');
            return;
        }

        const itemsToReturn = Object.entries(returnQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, qty]) => {
                const item = liveItems.find(i => i.id === itemId);
                return {
                    itemId: item?.itemId || '',
                    batchNo: item?.batchNo || '',
                    description: item?.description || '',
                    qty,
                    rate: item?.unitPrice || 0
                };
            });

        if (itemsToReturn.length === 0) {
            showToast('error', 'Please enter a return quantity for at least one item.');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processPharmacyReturn(selectedBillId, selectedStoreId, itemsToReturn);
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

    return (
        <div className="flex flex-col h-full gap-6">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Drug Return</h1>
                <p className="text-slate-500 text-sm font-medium">Process medication returns and generate credit notes</p>
            </div>

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
                                    {s.storeName || s.name || 'Unnamed Store'}
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
                                        <div className="text-xs text-slate-500 font-medium">SAR {Number(bill.totalAmount || 0).toFixed(2)}</div>
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
                                    <div className="text-2xl font-black text-blue-600">SAR {totalReturnAmount.toFixed(2)}</div>
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
                                        <p className="text-xs mt-2 text-slate-300">Run this SQL in Supabase to fix missing columns:</p>
                                        <code className="text-[10px] bg-slate-100 px-2 py-1 rounded block mt-2 text-left max-w-sm mx-auto text-slate-600">
                                            ALTER TABLE bill_items<br/>
                                            ADD COLUMN IF NOT EXISTS item_id TEXT,<br/>
                                            ADD COLUMN IF NOT EXISTS batch_no TEXT;
                                        </code>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                <th className="pb-4">Item Description</th>
                                                <th className="pb-4 text-center">Dispensed</th>
                                                <th className="pb-4 text-center text-orange-500">Already Returned</th>
                                                <th className="pb-4 text-center">Return Qty</th>
                                                <th className="pb-4 text-right">Unit Rate</th>
                                                <th className="pb-4 text-right">Credit</th>
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
                                                    <td className="py-4 text-right font-medium text-slate-500">SAR {item.unitPrice.toFixed(2)}</td>
                                                    <td className="py-4 text-right font-black text-slate-800">
                                                        SAR {((returnQuantities[item.id] || 0) * item.unitPrice).toFixed(2)}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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
