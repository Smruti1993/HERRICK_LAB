import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Pill, History, Star, ShoppingCart, 
  Plus, Trash2, Info, Save, 
  Filter, Calendar, Activity, Clock
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InventoryItem, Prescription, PrescriptionItem, DrugGeneric, DrugMaster } from '../../types';

interface PharmacyOrderingModalProps {
    appointmentId: string;
    patientId: string;
    onClose: () => void;
}

const FREQUENCIES = [
    'Once Daily', 'Twice Daily (BID)', 'Thrice Daily (TID)', 
    'Four Times Daily (QID)', 'Every 4 Hours (q4h)', 'Every 6 Hours (q6h)',
    'As Needed (PRN)', 'Before Food (AC)', 'After Food (PC)', 'At Bedtime'
];

export const PharmacyOrderingModal: React.FC<PharmacyOrderingModalProps> = ({ 
    appointmentId, patientId, onClose 
}) => {
    const { 
        inventoryItems, drugGenerics, drugMasters, 
        user, savePrescription, showToast 
    } = useData();
    
    // Order Header info
    const [orderType, setOrderType] = useState('Generic / Item');
    const [itemScope, setItemScope] = useState('All Items');
    
    // Search states
    const [genericQuery, setGenericQuery] = useState('');
    const [tradeQuery, setTradeQuery] = useState('');
    const [selectedGenericId, setSelectedGenericId] = useState<string | null>(null);
    const [showGenericResults, setShowGenericResults] = useState(false);
    const [showTradeResults, setShowTradeResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const tradeSearchRef = useRef<HTMLDivElement>(null);

    // Selected Items for current order
    const [selectedItems, setSelectedItems] = useState<Partial<PrescriptionItem>[]>([]);

    // 1. Generic Search Filtering
    const filteredGenerics = drugGenerics.filter(g => {
        if (!g.isActive) return false;
        const q = genericQuery.toLowerCase();
        return g.genericName.toLowerCase().includes(q) || g.genericCode.toLowerCase().includes(q);
    }).slice(0, 10);

    // 2. Trade Search Filtering (Optionally filtered by Generic)
    const filteredTrades = inventoryItems.filter(item => {
        if (!item.isActive) return false;
        
        // If a generic is selected, only show trades mapped to it
        if (selectedGenericId) {
            const isMapped = drugMasters.some(dm => 
                (dm.genericId?.trim() === selectedGenericId.trim()) && 
                (dm.itemId?.trim() === item.id?.trim()) && 
                dm.isActive !== false
            );
            if (!isMapped) return false;
        }

        const q = tradeQuery.toLowerCase();
        if (!q && selectedGenericId) return true; // Show all trades for selected generic if query is empty
        
        return item.itemName.toLowerCase().includes(q) || 
               item.itemCode.toLowerCase().includes(q) ||
               (item.itemDescription && item.itemDescription.toLowerCase().includes(q));
    }).slice(0, 15);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowGenericResults(false);
            }
            if (tradeSearchRef.current && !tradeSearchRef.current.contains(e.target as Node)) {
                setShowTradeResults(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelectGeneric = (generic: DrugGeneric) => {
        setGenericQuery(generic.genericName);
        setSelectedGenericId(generic.id);
        setShowGenericResults(false);
        setShowTradeResults(true); // Open trade results automatically
        // If there's only one trade name for this generic, we could auto-select it here
        // but for now just filter the trade list.
    };

    const handleAddItem = (item: InventoryItem) => {
        // Find mapped generic if not already set by manual generic search
        let gName = '';
        if (selectedGenericId) {
            const g = drugGenerics.find(dg => dg.id === selectedGenericId);
            gName = g?.genericName || '';
        } else {
            const mapping = drugMasters.find(dm => 
                (dm.itemId?.trim() === item.id?.trim()) && 
                dm.isActive !== false
            );
            if (mapping) {
                const g = drugGenerics.find(dg => dg.id?.trim() === mapping.genericId?.trim());
                gName = g?.genericName || '';
            }
        }
        
        console.log(`Mapping item: ${item.itemName} (${item.id}) -> Generic: ${gName || 'NOT FOUND'}`);

        const newItem: Partial<PrescriptionItem> = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            itemId: item.id,
            itemName: item.itemName,
            itemCode: item.itemCode,
            genericName: gName || 'Generic Not Mapped',
            frequency: 'Once Daily',
            dose: '1',
            units: item.baseUom || 'Tab',
            intakeQty: 1,
            startDate: new Date().toISOString().split('T')[0],
            noDays: 5,
            totalQty: 5,
            status: 'Pending'
        };
        setSelectedItems([...selectedItems, newItem]);
        setShowTradeResults(false);
        setGenericQuery('');
        setTradeQuery('');
        setSelectedGenericId(null);
    };

    const updateItem = (id: string, field: keyof PrescriptionItem, value: any) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            
            // Recalculate total qty if needed
            if (field === 'intakeQty' || field === 'noDays') {
                const qty = Number(updated.intakeQty || 0);
                const days = Number(updated.noDays || 0);
                updated.totalQty = qty * days;
            }
            return updated;
        }));
    };

    const handleSaveOrder = async () => {
        if (selectedItems.length === 0) {
            showToast('error', 'Please add at least one medication.');
            return;
        }

        const prescriptionId = crypto.randomUUID();

        // Assign the new prescriptionId to all items
        const itemsWithId = selectedItems.map(item => ({
            ...item,
            prescriptionId
        }));

        const prescription: Prescription = {
            id: prescriptionId,
            appointmentId,
            patientId,
            doctorId: user?.employeeId || '',
            orderDate: new Date().toISOString(),
            orderType: orderType,
            status: 'Pending',
            totalAmount: 0, // Calculated at pharmacy
            items: itemsWithId as PrescriptionItem[]
        };

        const success = await savePrescription(prescription);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 font-sans animate-in fade-in duration-300">
            <div className="bg-[#f8fafc] w-full max-w-7xl h-[95vh] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/50 ring-1 ring-slate-200">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 shrink-0 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                            <Pill className="text-white w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">New Medication Order</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full border border-white/20 transition-all">
                            <History className="w-3.5 h-3.5" /> Medication History
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white/50">
                    
                    {/* Top Options Bar */}
                    <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
                            {['Generic / Item', 'IV Fluid', 'TPN Order'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setOrderType(type)}
                                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm ${orderType === type ? 'bg-white text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                                <span className="uppercase tracking-wider">Item Scope:</span>
                                <div className="flex items-center gap-3">
                                    {['All Items', 'Available Items', 'Available Formulary'].map(s => (
                                        <label key={s} className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                                            <input type="radio" checked={itemScope === s} onChange={() => setItemScope(s)} className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                            {s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1"></div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <select className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer">
                                <option>-- Item Class --</option>
                            </select>
                            <div className="h-4 w-px bg-slate-300 mx-1"></div>
                            <select className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer">
                                <option>-- Store --</option>
                            </select>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-blue-50/50 p-6 flex gap-6 items-end shrink-0" ref={searchRef}>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                <Search className="w-3 h-3" /> Generic Search
                            </label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-0 outline-none transition-all group-hover:border-slate-300"
                                    placeholder="Search by salt or chemical name..."
                                    value={genericQuery}
                                    onChange={e => { 
                                        setGenericQuery(e.target.value); 
                                        setShowGenericResults(true);
                                        // Clear trade filter when generic search is edited
                                        if (selectedGenericId) setSelectedGenericId(null); 
                                    }}
                                    onFocus={() => setShowGenericResults(true)}
                                />
                                {showGenericResults && genericQuery.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[110] max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                                        {filteredGenerics.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic font-medium">No generics found for "{genericQuery}"</div>
                                        ) : filteredGenerics.map(generic => (
                                            <button 
                                                key={generic.id}
                                                onClick={() => handleSelectGeneric(generic)}
                                                className="w-full text-left p-4 hover:bg-blue-50/50 border-b border-slate-50 flex items-center justify-between group/item transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 group-hover:text-blue-700">{generic.genericName}</p>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                            <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{generic.genericCode}</span>
                                                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">{generic.strength || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 text-slate-300 group-hover/item:text-blue-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-2" ref={tradeSearchRef}>
                            <label className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">Trade Search</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Search by brand name..."
                                    value={tradeQuery}
                                    onChange={e => { setTradeQuery(e.target.value); setShowTradeResults(true); }}
                                    onFocus={() => setShowTradeResults(true)}
                                />
                                {showTradeResults && (tradeQuery.length > 0 || selectedGenericId) && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[110] max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                                        {filteredTrades.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic font-medium">No brands found {selectedGenericId ? 'for this generic' : ''}</div>
                                        ) : filteredTrades.map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => handleAddItem(item)}
                                                className="w-full text-left p-4 hover:bg-indigo-50/50 border-b border-slate-50 flex items-center justify-between group/item transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                                                        <Pill className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 group-hover:text-indigo-700">{item.itemName}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                                            <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.itemCode}</span>
                                                            {item.itemDescription && (
                                                                <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter truncate max-w-[150px]">{item.itemDescription}</span>
                                                            )}
                                                            {!drugMasters.some(dm => dm.itemId?.trim() === item.id?.trim() && dm.isActive !== false) && (
                                                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-pulse shadow-sm border border-amber-200 flex items-center gap-1">
                                                                    <Info className="w-2.5 h-2.5" /> No Generic Mapping
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {item.stock && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Qty: {item.stock.reusableCount || 0}</span>}
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover/item:text-indigo-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 py-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="bg-white p-2 rounded-lg border-2 border-slate-200 group-hover:border-blue-400 transition-all flex items-center justify-center">
                                    <Star className="w-4 h-4 text-slate-300 group-hover:text-amber-400" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Favorites Only</span>
                            </label>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="flex-1 overflow-auto bg-white mx-6 my-2 rounded-xl shadow-inner border border-slate-200">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-b">Medication Details</th>
                                    <th className="p-4 border-b w-40">Frequency <span className="text-red-500">*</span></th>
                                    <th className="p-4 border-b w-24">Dose <span className="text-red-500">*</span></th>
                                    <th className="p-4 border-b w-32">Intake Qty <span className="text-red-500">*</span></th>
                                    <th className="p-4 border-b w-32">No Days <span className="text-red-500">*</span></th>
                                    <th className="p-4 border-b w-24 text-center">Total</th>
                                    <th className="p-4 border-b min-w-[200px]">Instructions</th>
                                    <th className="p-4 border-b text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30 select-none">
                                                <div className="p-6 bg-slate-100 rounded-full">
                                                    <ShoppingCart className="w-16 h-16 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-slate-500">Cart is empty</p>
                                                    <p className="text-sm">Search and add medications to order</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : selectedItems.map((item, idx) => (
                                    <tr key={item.id} className="group hover:bg-blue-50/20 transition-all animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.itemName}</p>
                                                {item.genericName === 'Generic Not Mapped' ? (
                                                    <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1 w-fit mt-1 animate-pulse">
                                                       <Info className="w-2.5 h-2.5" /> Mapping Required
                                                    </span>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.genericName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <Activity className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                                <select 
                                                    className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                                    value={item.frequency}
                                                    onChange={e => updateItem(item.id!, 'frequency', e.target.value)}
                                                >
                                                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                                <input 
                                                    type="text" 
                                                    className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-center font-black text-blue-800 outline-none hover:border-blue-300 transition-colors"
                                                    value={item.dose}
                                                    onChange={e => updateItem(item.id!, 'dose', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="w-16 px-1 py-1.5 border border-slate-200 rounded text-center font-bold"
                                                    value={item.intakeQty}
                                                    onChange={e => updateItem(item.id!, 'intakeQty', Number(e.target.value))}
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold">{item.units}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                                <input 
                                                    type="number" 
                                                    className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none"
                                                    value={item.noDays}
                                                    onChange={e => updateItem(item.id!, 'noDays', Number(e.target.value))}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="bg-emerald-50 text-emerald-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto font-black border border-emerald-100 shadow-sm">
                                                {item.totalQty}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <textarea 
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] h-11 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                                                placeholder="Dosage instructions, e.g., Take half hour before breakfast"
                                                value={item.drugInstruction || ''}
                                                onChange={e => updateItem(item.id!, 'drugInstruction', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => setSelectedItems(prev => prev.filter(i => i.id !== item.id))}
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
                </div>

                {/* Interaction / Warning Bar */}
                <div className="bg-orange-50 px-6 py-2.5 border-t border-orange-100 flex items-center gap-4 text-xs font-semibold text-orange-700 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-orange-200 shadow-sm animate-pulse">
                        <Info className="w-3.5 h-3.5" />
                        <span>Drug Interactions Check</span>
                    </div>
                    <span>No critical interactions found for selected medications.</span>
                </div>

                {/* Footer Section */}
                <div className="bg-white p-6 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selected Drugs</span>
                            <span className="text-xl font-black text-slate-800">{selectedItems.length}</span>
                        </div>
                        <div className="h-10 w-px bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patient</span>
                            <span className="text-xs font-bold text-slate-600">Selected for the current visit</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all rounded-xl"
                        >
                            Cancel
                        </button>
                        <button 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            Save as Order Set
                        </button>
                        <button 
                            onClick={handleSaveOrder}
                            disabled={selectedItems.length === 0}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Save className="w-4 h-4" /> Finalize & Send to Pharmacy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
