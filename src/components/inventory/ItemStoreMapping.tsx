import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { StoreItemMapping } from '../../types';
import { Search, Building2, Package, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export const ItemStoreMapping = () => {
    const { 
        stores, 
        inventoryItems, 
        storeItemMappings, 
        saveStoreItemMapping, 
        deleteStoreItemMapping,
        showToast
    } = useData();

    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const selectedStore = useMemo(() => 
        stores.find(s => s.id === selectedStoreId),
    [stores, selectedStoreId]);

    const mappedItemIds = useMemo(() => {
        if (!selectedStoreId) return new Set<string>();
        return new Set(
            storeItemMappings
                .filter(m => m.storeId === selectedStoreId)
                .map(m => m.itemId)
        );
    }, [storeItemMappings, selectedStoreId]);

    const filteredItems = useMemo(() => {
        return inventoryItems.filter(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventoryItems, searchTerm]);

    const handleToggleMapping = async (itemId: string) => {
        if (!selectedStoreId) {
            showToast('info', 'Please select a store first.');
            return;
        }

        const existingMapping = storeItemMappings.find(
            m => m.storeId === selectedStoreId && m.itemId === itemId
        );

        if (existingMapping) {
            await deleteStoreItemMapping(existingMapping.id);
            showToast('info', 'Item unmapped from store.');
        } else {
            const newMapping: StoreItemMapping = {
                id: crypto.randomUUID(),
                storeId: selectedStoreId,
                itemId: itemId
            };
            await saveStoreItemMapping(newMapping);
            showToast('success', 'Item mapped to store successfully.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Selection Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Store Selection */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 text-left">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Select Store</h3>
                            <p className="text-xs text-slate-500">Pick a storage location to manage mappings</p>
                        </div>
                    </div>
                    <select 
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                        value={selectedStoreId}
                        onChange={e => setSelectedStoreId(e.target.value)}
                    >
                        <option value="">-- Choose a Store --</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>
                                {store.storeName} ({store.storeCode}) - {store.branchName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Summary */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-lg shadow-blue-100 text-white flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Mapping Status</p>
                        <h4 className="text-2xl font-bold">
                            {selectedStoreId ? `${mappedItemIds.size} Items Mapped` : 'Select a Store'}
                        </h4>
                        {selectedStore && (
                            <p className="text-blue-200 text-xs mt-2 flex items-center gap-1 uppercase tracking-wider font-bold">
                                {selectedStore.storeName} <ArrowRight className="w-3 h-3" /> {selectedStore.branchName}
                            </p>
                        )}
                    </div>
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                        <Package className="w-8 h-8 text-white/80" />
                    </div>
                </div>
            </div>

            {/* Mapping Interface */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Search Bar */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="relative">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Search items by name or code..."
                            className="w-full h-12 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-100 sticky top-0 z-10 text-left">
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category / Group</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Mapping Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!selectedStoreId ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Building2 className="w-12 h-12 opacity-20" />
                                            <p className="italic">Please select a store from the dropdown above to manage item mappings.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic font-medium text-left">
                                        No items found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const isMapped = mappedItemIds.has(item.id);
                                    return (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-blue-500 mb-1 tracking-wider uppercase">{item.itemCode}</span>
                                                    <span className="text-sm font-bold text-slate-700">{item.itemName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-medium text-slate-500">{item.itemCategory}</span>
                                                    <span className="text-[10px] text-slate-400">{item.itemGroup}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => handleToggleMapping(item.id)}
                                                    className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                                                        isMapped 
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 shadow-sm shadow-emerald-100' 
                                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                                                    }`}
                                                >
                                                    {isMapped ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Mapped
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle className="w-4 h-4 opacity-30" />
                                                            Unmapped
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
