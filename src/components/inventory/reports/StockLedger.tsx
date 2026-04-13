import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { StockLedgerEntry } from '../../../types';
import { Search, Download, Printer } from 'lucide-react';

export const StockLedgerReport: React.FC = () => {
    const { stores, fetchStockLedger } = useData();
    
    const [storeId, setStoreId] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [itemCategory, setItemCategory] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    const [reportData, setReportData] = useState<StockLedgerEntry[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const activeStores = stores.filter(s => s.status === 'Active');

    const handleSearch = async () => {
        if (!storeId) return; // Store is mandatory
        
        setIsSearching(true);
        setHasSearched(true);
        try {
            const data = await fetchStockLedger({
                storeId,
                fromDate,
                toDate,
                itemCategory,
                searchQuery
            });
            setReportData(data);
        } catch (error) {
            console.error('Failed to fetch report');
        } finally {
            setIsSearching(false);
        }
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-600 px-4 py-3 text-white rounded-t-lg shadow-sm">
                <h2 className="text-lg font-semibold">Item Ledger and Tracking Report</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Criteria Box */}
            <div className="bg-white border border-slate-300 shadow-sm text-sm">
                <div className="bg-slate-200 px-3 py-1 font-bold text-slate-800 border-b border-slate-300">Criteria</div>
                
                <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
                    <div className="bg-slate-200/50 p-2 font-semibold text-slate-700 border-r border-slate-200">From Date</div>
                    <div className="p-1"><input type="date" className="p-1 border border-slate-300 outline-none focus:border-blue-400 w-48 text-xs" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                </div>
                
                <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
                    <div className="bg-slate-200/50 p-2 font-semibold text-slate-700 border-r border-slate-200">To Date</div>
                    <div className="p-1"><input type="date" className="p-1 border border-slate-300 outline-none focus:border-blue-400 w-48 text-xs" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
                </div>
                
                <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
                    <div className="bg-slate-200/50 p-2 font-semibold text-slate-700 border-r border-slate-200">Item Category</div>
                    <div className="p-1">
                        <select className="p-1 border border-slate-300 outline-none focus:border-blue-400 w-64 text-xs" value={itemCategory} onChange={e => setItemCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            <option value="General">General</option>
                            <option value="Pharmaceutical">Pharmaceutical</option>
                            <option value="Consumables">Consumables</option>
                            <option value="Equipment">Equipment</option>
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-[150px_1fr] border-b border-slate-200">
                    <div className="bg-slate-200/50 p-2 font-semibold text-slate-700 border-r border-slate-200">Item Code/Name</div>
                    <div className="p-1">
                        <input type="text" className="p-1 border border-slate-300 outline-none focus:border-blue-400 w-64 text-xs" placeholder="Search by Code or Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                
                <div className="grid grid-cols-[150px_1fr]">
                    <div className="bg-slate-200/50 p-2 font-semibold text-slate-700 border-r border-slate-200">
                        Store <span className="text-red-500">*</span>
                    </div>
                    <div className="p-1 flex justify-between items-center">
                        <select className="p-1 border border-slate-300 outline-none focus:border-blue-400 w-64 text-xs" value={storeId} onChange={e => setStoreId(e.target.value)}>
                            <option value="">Select Store...</option>
                            {activeStores.map(s => (
                                <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>
                            ))}
                        </select>
                        <button 
                            disabled={!storeId || isSearching}
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-1 mx-2 rounded flex items-center gap-2 transition-colors font-medium"
                        >
                            <Search className="w-4 h-4" />
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Data Matrix */}
            <div className="bg-white border border-slate-300 shadow-sm mt-6">
                <div className="bg-slate-200 px-3 py-1 font-bold text-slate-800 border-b border-slate-300">Report Data</div>
                
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="bg-slate-200 text-slate-600 font-semibold border-b-2 border-slate-300">
                            <tr>
                                <th className="p-2 border-r border-slate-300">Store</th>
                                <th className="p-2 border-r border-slate-300">Item Category</th>
                                <th className="p-2 border-r border-slate-300">Item Code</th>
                                <th className="p-2 border-r border-slate-300">Item Name</th>
                                <th className="p-2 border-r border-slate-300">UOM</th>
                                <th className="p-2 border-r border-slate-300">Transaction Type</th>
                                <th className="p-2 border-r border-slate-300">Ref Type</th>
                                <th className="p-2 border-r border-slate-300">Ref Doc No.</th>
                                <th className="p-2 border-r border-slate-300">Ref Doc Date</th>
                                <th className="p-2 border-r border-slate-300">Stock In Quantity</th>
                                <th className="p-2 border-r border-slate-300">Stock Out Quantity</th>
                                <th className="p-2 border-r border-slate-300">Closing Stock</th>
                                <th className="p-2 border-r border-slate-300">Closing Stock Rate</th>
                                <th className="p-2 border-r border-slate-300">Closing Stock Value</th>
                                <th className="p-2 border-r border-slate-300">Currency</th>
                                <th className="p-2 border-r border-slate-300">Batch Code</th>
                                <th className="p-2 border-r border-slate-300">Batch Date</th>
                                <th className="p-2">Expiry Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {!hasSearched ? (
                                <tr><td colSpan={18} className="p-6 text-center text-slate-400 font-medium">Select a Store and click Search to view the report.</td></tr>
                            ) : reportData.length === 0 ? (
                                <tr><td colSpan={18} className="p-6 text-center text-slate-500 font-medium bg-slate-50">No stock movements found matching the criteria.</td></tr>
                            ) : (
                                reportData.map((row, idx) => (
                                    <tr key={row.id || idx} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="p-2 border-r border-slate-200 text-slate-700">{row.store?.storeName}</td>
                                        <td className="p-2 border-r border-slate-200">{row.item?.itemCategory}</td>
                                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{row.item?.itemCode}</td>
                                        <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{row.item?.itemName}</td>
                                        <td className="p-2 border-r border-slate-200">{row.item?.baseUom}</td>
                                        <td className="p-2 border-r border-slate-200">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.transactionType === 'STOCKIN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {row.transactionType}
                                            </span>
                                        </td>
                                        <td className="p-2 border-r border-slate-200 text-slate-500">{row.refType}</td>
                                        <td className="p-2 border-r border-slate-200 font-mono text-slate-500">{row.refDocNo}</td>
                                        <td className="p-2 border-r border-slate-200 text-slate-500 text-right">{formatDateTime(row.refDocDate)}</td>
                                        <td className="p-2 border-r border-slate-200 text-right font-medium text-green-600">{row.stockInQuantity > 0 ? row.stockInQuantity : ''}</td>
                                        <td className="p-2 border-r border-slate-200 text-right font-medium text-red-600">{row.stockOutQuantity > 0 ? row.stockOutQuantity : ''}</td>
                                        <td className="p-2 border-r border-slate-200 text-right font-bold text-slate-800">{row.closingStock}</td>
                                        <td className="p-2 border-r border-slate-200 text-right">{row.closingStockRate?.toFixed(2)}</td>
                                        <td className="p-2 border-r border-slate-200 text-right font-medium">{row.closingStockValue?.toFixed(2)}</td>
                                        <td className="p-2 border-r border-slate-200 text-slate-500">{row.currency}</td>
                                        <td className="p-2 border-r border-slate-200 font-mono">{row.batchNo}</td>
                                        <td className="p-2 border-r border-slate-200 text-slate-500 text-right">{formatDateTime(row.batchDate)}</td>
                                        <td className="p-2 text-slate-500 text-right">{formatDateTime(row.expiryDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default StockLedgerReport;
