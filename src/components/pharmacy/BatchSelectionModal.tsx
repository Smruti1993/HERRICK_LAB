import React, { useState, useEffect } from 'react';
import { X, Search, Package, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface BatchSelectionModalProps {
    storeId: string;
    itemId: string;
    itemName: string;
    requiredQty: number;
    unit?: string;
    onClose: () => void;
    onSelect: (batch: { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount: number, taxAmount?: number, baseAmount?: number }) => void;
}

export const BatchSelectionModal: React.FC<BatchSelectionModalProps> = ({
    storeId,
    itemId,
    itemName,
    requiredQty,
    unit,
    onClose,
    onSelect
}) => {
    const { fetchBatchDetails, itemTaxMappings, taxMasters, inventoryItems } = useData();
    const [batches, setBatches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBatches = async () => {
            setLoading(true);
            const batchData = await fetchBatchDetails(storeId, itemId);
            // Sort by expiry date (FIFO)
            setBatches(batchData.sort((a, b) => {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            }));
            setLoading(false);
        };
        loadBatches();
    }, [storeId, itemId, fetchBatchDetails]);

    const filteredBatches = batches.filter(b => 
        b.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Tax calculation
    const itemMapping = itemTaxMappings.find(m => m.itemId === itemId);
    const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
    const taxPercent = taxMaster?.percentage || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-blue-600 p-4 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Package className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Select Dispensing Batch</h2>
                            <p className="text-blue-100 text-xs font-semibold">{itemName} - Req: {requiredQty}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 flex-1 max-h-[60vh] overflow-auto bg-slate-50">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by Batch No..."
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center p-8 text-slate-400">Loading batches...</div>
                    ) : filteredBatches.length > 0 ? (
                        <div className="grid gap-3">
                             {filteredBatches.map(batch => {
                                const itemDef = inventoryItems.find(inv => inv.id === itemId);
                                const isSalesUom = unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                                const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

                                const baseQtyRequired = requiredQty * salesCF;
                                const isInsufficient = batch.currentStock < baseQtyRequired;
                                return (
                                    <button 
                                        key={batch.batchNo}
                                        onClick={() => {
                                            const totalAmount = Number((batch.rate * baseQtyRequired).toFixed(2));
                                            const taxAmt = Number((totalAmount * taxPercent / (100 + taxPercent)).toFixed(2));
                                            const baseAmount = Number((totalAmount - taxAmt).toFixed(2));
                                            onSelect({ 
                                                batchNo: batch.batchNo, 
                                                rate: batch.rate, 
                                                batchDate: batch.batchDate, 
                                                expiryDate: batch.expiryDate, 
                                                baseAmount: baseAmount,
                                                taxAmount: taxAmt,
                                                amount: totalAmount 
                                            });
                                        }}
                                        disabled={isInsufficient}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                                            isInsufficient 
                                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-sm">Batch: {batch.batchNo}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                Expiry: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-lg font-black ${isInsufficient ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {batch.currentStock} <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                MRP: {batch.mrp || batch.rate} SAR {taxPercent > 0 && <span className="text-violet-500">(+{taxPercent}% Tax)</span>}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="font-bold text-slate-500 uppercase text-xs">No batches found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
