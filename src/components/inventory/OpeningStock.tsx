import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { InventoryItem, OpeningStock, OpeningStockItem } from '../../types';
import { Save, Plus, Trash2, ChevronDown } from 'lucide-react';

const ItemSearchCell = ({ 
    item, 
    inventoryItems, 
    onChange 
}: { 
    item: Partial<OpeningStockItem>; 
    inventoryItems: InventoryItem[]; 
    onChange: (itemId: string) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update search term when item changes externally
    useEffect(() => {
        if (item.itemId) {
            const definedItem = inventoryItems.find(i => i.id === item.itemId);
            if (definedItem) {
                setSearchTerm(`${definedItem.itemName} (${definedItem.itemCode})`);
            }
        }
    }, [item.itemId, inventoryItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredItems = inventoryItems.filter(i => 
        i.isActive && 
        ((i.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
         (i.itemCode || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div ref={wrapperRef} className="relative w-full min-w-[200px]">
            <div className="relative">
                <input 
                    type="text" 
                    className="w-full pl-2 pr-6 py-1 border border-slate-300 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        // Clear selection if they start typing a different name manually
                        if (item.itemId) onChange(''); 
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search Item Name or Code..."
                />
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {isOpen && (
                <ul className="absolute z-50 w-[300px] max-h-48 overflow-y-auto bg-white border border-slate-300 shadow-xl top-full left-0 mt-1 rounded-sm">
                    {filteredItems.length === 0 ? (
                        <li className="p-2 text-xs text-slate-500 text-center">No items found</li>
                    ) : (
                        filteredItems.map(i => (
                            <li 
                                key={i.id} 
                                className="px-3 py-2 text-xs hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-50 last:border-0 truncate"
                                onClick={() => {
                                    setSearchTerm(`${i.itemName} (${i.itemCode})`);
                                    onChange(i.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="font-medium">{i.itemName}</span> <span className="opacity-80">({i.itemCode})</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export const OpeningStockPage: React.FC = () => {
    const { stores, inventoryItems, openingStocks, saveOpeningStock, addToast } = useData();
    
    const [viewMode, setViewMode] = useState<'form' | 'list'>('form');
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [viewingStockId, setViewingStockId] = useState<string | null>(null);
    
    // Grid items state
    const [items, setItems] = useState<Partial<OpeningStockItem>[]>([]);
    
    const activeStores = stores.filter(s => s.status === 'Active');

    const handleAddItem = () => {
        setItems(prev => [...prev, {
            itemId: '',
            itemCode: '',
            itemName: '',
            itemCategory: '',
            batchNo: '',
            batchStartDate: '',
            batchEndDate: '',
            quantity: 0,
            rate: 0,
            amount: 0,
            mrp: 0
        }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, itemId: string) => {
        const itemDef = inventoryItems.find(i => i.id === itemId);
        if (itemDef) {
            setItems(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    itemId: itemDef.id,
                    itemCode: itemDef.itemCode,
                    itemName: itemDef.itemName,
                    itemCategory: itemDef.itemCategory,
                    rate: itemDef.pricing?.[0]?.price || 0,
                    mrp: itemDef.pricing?.[0]?.price || 0,
                    amount: (updated[index].quantity || 0) * (itemDef.pricing?.[0]?.price || 0)
                };
                return updated;
            });
        }
    };

    const handleFieldChange = (index: number, field: keyof OpeningStockItem, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            
            // Auto-calculate amount
            if (field === 'quantity' || field === 'rate') {
                const qty = field === 'quantity' ? Number(value) : updated[index].quantity || 0;
                const rate = field === 'rate' ? Number(value) : updated[index].rate || 0;
                updated[index].amount = qty * rate;
            }
            
            return updated;
        });
    };

    const handleSave = async () => {
        if (!selectedStore) {
            addToast('Please select a Store', 'error');
            return;
        }
        
        if (items.length === 0) {
            addToast('Please add at least one item', 'error');
            return;
        }

        // Validate items
        const invalid = items.some(i => !i.itemId || !i.quantity || i.quantity <= 0);
        if (invalid) {
            addToast('Please select items and ensure valid quantities for all rows', 'error');
            return;
        }

        try {
            const openingStock: OpeningStock = {
                storeId: selectedStore,
                entryDate,
                status: 'Submitted',
                items: items as OpeningStockItem[]
            };
            
            await saveOpeningStock(openingStock);
            // Reset after save
            setItems([]);
            setSelectedStore('');
            setViewMode('list');
            setViewingStockId(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleViewSaved = (os: OpeningStock) => {
        setSelectedStore(os.storeId);
        setEntryDate(os.entryDate);
        setItems(os.items as any || []);
        setViewingStockId(os.id || null);
        setViewMode('form');
    };

    const handleAddNew = () => {
        setSelectedStore('');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setItems([]);
        setViewingStockId(null);
        setViewMode('form');
    };

    const isReadOnly = viewingStockId !== null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-600 px-4 py-2 text-white">
                <h2 className="text-lg font-semibold">Opening Stock {viewMode === 'list' && 'List'}</h2>
                <div 
                    className="text-sm cursor-pointer hover:underline flex items-center gap-1"
                    onClick={() => viewMode === 'form' ? setViewMode('list') : handleAddNew()}
                >
                    {viewMode === 'form' ? 'View All' : <><Plus className="w-4 h-4" /> Add New</>}
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-300">
                                <tr>
                                    <th className="p-3 border-r border-slate-200">Date</th>
                                    <th className="p-3 border-r border-slate-200">Store</th>
                                    <th className="p-3 border-r border-slate-200">Ref ID</th>
                                    <th className="p-3 border-r border-slate-200 text-right">Total Items</th>
                                    <th className="p-3 border-r border-slate-200 text-right">Total Value</th>
                                    <th className="p-3 text-center border-r border-slate-200">Status</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {openingStocks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-slate-500">
                                            No Opening Stock records found.
                                        </td>
                                    </tr>
                                ) : openingStocks.map((os, i) => {
                                    const storeName = stores.find(s => s.id === os.storeId)?.storeName || 'Unknown Store';
                                    const totalItems = os.items?.length || 0;
                                    const totalValue = os.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
                                    return (
                                        <tr key={os.id || i} className="hover:bg-slate-50">
                                            <td className="p-3 border-r border-slate-200">{os.entryDate}</td>
                                            <td className="p-3 border-r border-slate-200 font-medium text-slate-700">{storeName}</td>
                                            <td className="p-3 border-r border-slate-200 font-mono text-slate-500">{os.id?.substring(0, 8) || 'Draft'}</td>
                                            <td className="p-3 border-r border-slate-200 text-right">{totalItems}</td>
                                            <td className="p-3 border-r border-slate-200 text-right font-medium">{totalValue.toFixed(2)}</td>
                                            <td className="p-3 text-center border-r border-slate-200">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${os.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {os.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => handleViewSaved(os)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2"
                                                >
                                                    View Items
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex gap-6 mb-6">
                    <div className="w-64">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Store <span className="text-red-500">*</span>
                        </label>
                        <select 
                            className={`w-full p-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm ${isReadOnly ? 'bg-slate-100' : ''}`}
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            disabled={isReadOnly}
                        >
                            <option value="">Select Store</option>
                            {activeStores.map(s => (
                                <option key={s.id} value={s.id}>{s.storeName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="border border-slate-300">
                    <div className="flex items-center gap-2 p-2 bg-slate-100 border-b border-slate-300 justify-between">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleAddItem} 
                                disabled={isReadOnly}
                                className={`flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 text-sm transition-colors ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                            >
                                <Plus className={`w-4 h-4 ${isReadOnly ? 'text-slate-400' : 'text-blue-500'}`} />
                                <span className={`font-medium ${isReadOnly ? 'text-slate-400' : 'text-slate-800'}`}>Add</span>
                            </button>
                        </div>
                        {isReadOnly && (
                            <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                                Read Only View (Submitted)
                            </span>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-700 bg-slate-50 border-b border-slate-300 uppercase tracking-tight">
                                <tr>
                                    <th className="px-3 py-2 whitespace-nowrap min-w-[200px] border-r border-slate-300">Item Name</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 hidden md:table-cell">Item Code</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 hidden md:table-cell">Category</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Batch No</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Batch Start</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Batch End</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Quantity</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Rate</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Amount</th>
                                    <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">MRP</th>
                                    <th className="px-3 py-2 whitespace-nowrap text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-3 py-4 text-center text-slate-500">
                                            No items added. Click Add to begin.
                                        </td>
                                    </tr>
                                ) : items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 hover:bg-slate-50/50">
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <ItemSearchCell 
                                                item={item} 
                                                inventoryItems={inventoryItems} 
                                                onChange={(itemId) => handleItemChange(index, itemId)} 
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200 text-slate-500 hidden md:table-cell">{item.itemCode}</td>
                                        <td className="px-2 py-1.5 border-r border-slate-200 text-slate-500 hidden md:table-cell">{item.itemCategory}</td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="text" className="w-full p-1 border border-slate-300 text-xs" value={item.batchNo || ''} onChange={e => handleFieldChange(index, 'batchNo', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="date" className="w-full p-1 border border-slate-300 text-xs" value={item.batchStartDate || ''} onChange={e => handleFieldChange(index, 'batchStartDate', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="date" className="w-full p-1 border border-slate-300 text-xs" value={item.batchEndDate || ''} onChange={e => handleFieldChange(index, 'batchEndDate', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            {isReadOnly ? (
                                                <div className="w-full p-1 text-sm bg-transparent">{item.itemName || 'N/A'}</div>
                                            ) : (
                                                <ItemSearchCell 
                                                    item={item}
                                                    inventoryItems={inventoryItems}
                                                    onChange={(itemId) => handleItemChange(index, itemId)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200 hidden md:table-cell text-slate-500">{item.itemCode}</td>
                                        <td className="px-2 py-1.5 border-r border-slate-200 hidden md:table-cell text-slate-500">{item.itemCategory}</td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="text" className={`w-24 p-1 border border-slate-300 rounded ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.batchNo || ''} onChange={(e) => handleFieldChange(index, 'batchNo', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="date" className={`w-[110px] p-1 border border-slate-300 rounded text-xs ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.batchStartDate || ''} onChange={(e) => handleFieldChange(index, 'batchStartDate', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="date" className={`w-[110px] p-1 border border-slate-300 rounded text-xs ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.batchEndDate || ''} onChange={(e) => handleFieldChange(index, 'batchEndDate', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="number" className={`w-20 p-1 border border-slate-300 rounded text-right ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.quantity || ''} onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="number" className={`w-20 p-1 border border-slate-300 rounded text-right ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.rate || ''} onChange={(e) => handleFieldChange(index, 'rate', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200 font-medium text-right">
                                            {item.amount?.toFixed(2)}
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-slate-200">
                                            <input type="number" className={`w-20 p-1 border border-slate-300 rounded text-right ${isReadOnly ? 'bg-slate-50' : ''}`} value={item.mrp || ''} onChange={(e) => handleFieldChange(index, 'mrp', e.target.value)} disabled={isReadOnly} />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button 
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={isReadOnly}
                                                className={`p-1 rounded transition-colors ${isReadOnly ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
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

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={() => handleAddNew()}
                        className="px-6 py-2 border border-slate-300 text-slate-700 font-medium rounded hover:bg-slate-50 transition-colors"
                    >
                        {isReadOnly ? 'Add New Opening Stock' : 'Clear Form'}
                    </button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Entry
                        </button>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};
export default OpeningStockPage;
