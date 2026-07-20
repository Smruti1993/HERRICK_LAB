import React, { useState, useEffect } from 'react';
import { X, Search, Package, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InventoryBatchLocation } from '../../types';

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
    const { fetchBatchDetails, fetchBatchLocation, itemTaxMappings, taxMasters, inventoryItems } = useData();
    const [batches, setBatches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showExpired, setShowExpired] = useState(false);
    // Map batchNo → location (null = unassigned)
    const [locationMap, setLocationMap] = useState<Record<string, InventoryBatchLocation | null>>({});

    useEffect(() => {
        const loadBatches = async () => {
            setLoading(true);
            const batchData = await fetchBatchDetails(storeId, itemId);
            // Sort: sufficient stock first, then by expiry FEFO (earliest first)
            const sorted = batchData.sort((a, b) => {
                const aHas = a.currentStock > 0 ? 1 : 0;
                const bHas = b.currentStock > 0 ? 1 : 0;
                if (bHas !== aHas) return bHas - aHas;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            });
            setBatches(sorted);
            setLoading(false);

            // Fetch locations in parallel for all batches
            const locs = await Promise.allSettled(
                sorted.map(b => fetchBatchLocation(storeId, itemId, b.batchNo))
            );
            const map: Record<string, InventoryBatchLocation | null> = {};
            sorted.forEach((b, i) => {
                const r = locs[i];
                map[b.batchNo] = r.status === 'fulfilled' ? r.value : null;
            });
            setLocationMap(map);
        };
        loadBatches();
    }, [storeId, itemId, fetchBatchDetails]);

    const filteredBatches = batches.filter(b => {
        const matchesSearch = b.batchNo.toLowerCase().includes(searchQuery.toLowerCase());
        const isExpired = b.expiryDate && new Date(b.expiryDate) < new Date();
        return matchesSearch && (showExpired || !isExpired);
    });

    // Tax calculation
    const itemMapping = itemTaxMappings.find(m => m.itemId === itemId);
    const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
    const taxPercent = taxMaster?.percentage || 0;

    const handleSelect = (batch: any, baseQtyRequired: number) => {
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
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-4 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Package className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Select Dispensing Batch</h2>
                            <p className="text-blue-100 text-xs font-semibold">{itemName} - Req: {requiredQty} {unit || ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 max-h-[60vh] overflow-auto bg-slate-50">
                    {/* Search & Toggle */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center justify-between">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Batch No..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={showExpired}
                                onChange={e => setShowExpired(e.target.checked)}
                            />
                            <span className="text-xs font-bold text-slate-600">Show Expired Batches</span>
                        </label>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Loading batches...</span>
                            </div>
                        </div>
                    ) : filteredBatches.length > 0 ? (
                        <div className="grid gap-3">
                            {filteredBatches.map(batch => {
                                const itemDef = inventoryItems.find(inv => inv.id === itemId);
                                const isSalesUom = unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                                const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;
                                const baseQtyRequired = requiredQty * salesCF;

                                const hasFullStock = batch.currentStock >= baseQtyRequired;
                                const hasPartialStock = batch.currentStock > 0 && batch.currentStock < baseQtyRequired;
                                const hasNoStock = batch.currentStock <= 0;

                                const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                const isDisabled = isExpired || hasNoStock;

                                return (
                                    <button
                                        key={batch.batchNo}
                                        onClick={() => handleSelect(batch, baseQtyRequired)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                                            isExpired
                                                ? 'bg-red-100 border-red-300 text-red-800 opacity-80 cursor-not-allowed'
                                                : hasNoStock
                                                ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                                : hasFullStock
                                                ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-md cursor-pointer'
                                                : 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
                                        }`}
                                        disabled={isDisabled}
                                        title={
                                            isExpired
                                                ? 'This batch is expired and cannot be dispensed'
                                                : hasNoStock
                                                ? 'This batch is out of stock and cannot be dispensed'
                                                : 'Click to select this batch'
                                        }
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-bold text-sm ${isExpired ? 'text-red-950' : isDisabled ? 'text-slate-500' : 'text-slate-800'}`}>Batch: {batch.batchNo}</span>
                                                {isExpired && (
                                                    <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded uppercase shadow-sm">Expired</span>
                                                )}
                                                {!isExpired && hasNoStock && (
                                                    <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Out Of Stock</span>
                                                )}
                                                {!isExpired && hasPartialStock && (
                                                    <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase">Partial</span>
                                                )}
                                                {/* FEFO badge — only for the first valid batch */}
                                                {!isExpired && !hasNoStock && filteredBatches.findIndex(fb => !fb.expiryDate || new Date(fb.expiryDate) >= new Date()) === filteredBatches.indexOf(batch) && (
                                                    <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase">🥇 Dispense First</span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold ${isExpired ? 'text-red-500' : isDisabled ? 'text-slate-400/70' : 'text-slate-400'}`}>
                                                Expiry: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                            </span>
                                            {/* Location badge */}
                                            {locationMap[batch.batchNo] ? (
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                    📍 {locationMap[batch.batchNo]!.locationDisplay}
                                                    {locationMap[batch.batchNo]!.temperature !== 'Ambient' && (
                                                        <span className="ml-1 text-[9px] font-black bg-blue-100 text-blue-700 px-1 rounded uppercase">
                                                            {locationMap[batch.batchNo]!.temperature}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic">📍 No location assigned</span>
                                            )}
                                            {isExpired && (
                                                <span className="text-[9px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                                                    🚫 Expired drug — do not dispense
                                                </span>
                                            )}
                                            {!isExpired && hasNoStock && (
                                                <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 mt-0.5">
                                                    🚫 Out of Stock — cannot dispense
                                                </span>
                                            )}
                                            {!isExpired && hasPartialStock && (
                                                <span className="text-[9px] text-orange-600 font-semibold">
                                                    Partial stock: {batch.currentStock} available, {baseQtyRequired} needed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1.5">
                                                {hasFullStock && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                {hasPartialStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                                {isDisabled && !isExpired && <AlertCircle className="w-4 h-4 text-red-400" />}
                                                {isExpired && <AlertCircle className="w-4 h-4 text-red-600" />}
                                                <span className={`text-lg font-black ${
                                                    isExpired ? 'text-red-700' :
                                                    hasFullStock ? 'text-emerald-600' :
                                                    hasPartialStock ? 'text-orange-500' : 'text-red-400'
                                                }`}>
                                                    {batch.currentStock}
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Available</span>
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                MRP: {batch.mrp || batch.rate} {taxPercent > 0 && <span className="text-violet-500">(+{taxPercent}% Tax)</span>}
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
                            <p className="text-slate-400 text-xs mt-1">No GRN or opening stock recorded for this item</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
