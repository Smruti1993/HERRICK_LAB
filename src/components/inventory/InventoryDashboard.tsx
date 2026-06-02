import React, { useEffect, useState, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { DashboardMetrics } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, AlertTriangle, XCircle, TrendingUp, RefreshCw, ChevronDown } from 'lucide-react';

const BANNER_URL = 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1200&auto=format&fit=crop';

const STOCK_COLORS = {
    inStock: '#22c55e',
    lowStock: '#f59e0b',
    outOfStock: '#ef4444'
};

const StockBar = ({ current, restock }: { current: number; restock: number }) => {
    const pct = restock > 0 ? Math.min(100, Math.round((current / restock) * 100)) : 100;
    let color = '#22c55e';
    if (current <= 0) color = '#ef4444';
    else if (restock > 0 && current < restock) color = '#f59e0b';
    return (
        <div className="flex items-center gap-1.5 w-28">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, iconBg, suffix = '', onClick, isActive }: {
    label: string; value: string | number; icon: React.ElementType; iconBg: string; suffix?: string;
    onClick?: () => void; isActive?: boolean;
}) => (
    <div 
        onClick={onClick}
        className={`bg-white border rounded-xl p-3 flex items-center gap-3 shadow-sm transition-all duration-200 select-none ${
            onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
    >
        <div className={`p-2 rounded-lg ${iconBg} flex-shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
            <p className="text-lg font-bold text-slate-800 leading-tight truncate">{suffix}{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
    </div>
);

export const InventoryDashboard: React.FC = () => {
    const { stores, fetchDashboardMetrics } = useData();
    const activeStores = stores.filter(s => s.status === 'Active');

    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');

    const load = useCallback(async (storeId: string) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const m = await fetchDashboardMetrics(storeId);
            setMetrics(m);
        } finally {
            setLoading(false);
        }
    }, [fetchDashboardMetrics]);

    useEffect(() => {
        if (activeStores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(activeStores[0].id);
        }
    }, [activeStores]);

    useEffect(() => {
        if (selectedStoreId) load(selectedStoreId);
    }, [selectedStoreId, load]);

    const getItemStatus = (item: any) => {
        if (item.currentStock <= 0) return 'out';
        if (item.restockLevel > 0 && item.currentStock < item.restockLevel) return 'low';
        return 'ok';
    };

    const inStockCount  = metrics ? metrics.itemsDetails.filter(i => getItemStatus(i) === 'ok').length : 0;
    const lowStockCount = metrics ? metrics.itemsDetails.filter(i => getItemStatus(i) === 'low').length : 0;
    const outCount      = metrics ? metrics.itemsDetails.filter(i => getItemStatus(i) === 'out').length : 0;
    const total         = metrics ? metrics.totalProducts : 1;

    const pieData = [
        { name: 'In Stock',     value: inStockCount,  color: STOCK_COLORS.inStock },
        { name: 'Low Stock',    value: lowStockCount,  color: STOCK_COLORS.lowStock },
        { name: 'Out of Stock', value: outCount,       color: STOCK_COLORS.outOfStock },
    ];

    const inStockPct = total > 0 ? Math.round(((total - lowStockCount - outCount) / total) * 100) : 0;
    const categories = Array.from(new Set((metrics?.itemsDetails || []).map(i => i.itemCategory)));
    const filteredItems = (metrics?.itemsDetails || [])
        .filter(i => !categoryFilter || i.itemCategory === categoryFilter)
        .filter(i => {
            if (statusFilter === 'all') return true;
            return getItemStatus(i) === statusFilter;
        })
        .sort((a, b) => a.currentStock - b.currentStock);
    const storeName = activeStores.find(s => s.id === selectedStoreId)?.storeName || '—';

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-base font-bold text-slate-800">Inventory Overview</h1>
                    <p className="text-xs text-slate-400">Real-time stock tracking — {storeName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white shadow-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedStoreId}
                        onChange={e => setSelectedStoreId(e.target.value)}
                    >
                        <option value="">Select Store…</option>
                        {activeStores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                    <button
                        onClick={() => load(selectedStoreId)}
                        disabled={loading || !selectedStoreId}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard 
                    label="Total Products" 
                    value={metrics?.totalProducts ?? '—'} 
                    icon={Package} 
                    iconBg="bg-blue-500" 
                    onClick={() => setStatusFilter('all')}
                    isActive={statusFilter === 'all'}
                />
                <MetricCard 
                    label="Low Stock Items" 
                    value={metrics?.lowStockItems ?? '—'} 
                    icon={AlertTriangle} 
                    iconBg="bg-amber-400" 
                    onClick={() => setStatusFilter(prev => prev === 'low' ? 'all' : 'low')}
                    isActive={statusFilter === 'low'}
                />
                <MetricCard 
                    label="Out of Stock" 
                    value={metrics?.outOfStock    ?? '—'} 
                    icon={XCircle} 
                    iconBg="bg-red-400" 
                    onClick={() => setStatusFilter(prev => prev === 'out' ? 'all' : 'out')}
                    isActive={statusFilter === 'out'}
                />
                <MetricCard 
                    label="Total Value" 
                    value={metrics ? Number(metrics.totalValue).toFixed(0) : '—'} 
                    icon={TrendingUp} 
                    iconBg="bg-green-500" 
                    suffix="$" 
                />
            </div>

            {/* Body: table + chart side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Inventory Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Card header */}
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">Store Inventory</span>
                            {statusFilter !== 'all' && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    statusFilter === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    Filtered by: {statusFilter === 'low' ? 'Low Stock' : 'Out of Stock'}
                                    <button 
                                        onClick={() => setStatusFilter('all')}
                                        className="hover:text-black font-bold ml-0.5 text-[8px] focus:outline-none"
                                        title="Clear Filter"
                                    >
                                        ✕
                                    </button>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {categories.length > 0 && (
                                <div className="relative">
                                    <select
                                        className="text-[11px] border border-slate-200 rounded-md pl-2 pr-5 py-1 bg-white appearance-none outline-none focus:ring-1 focus:ring-blue-500"
                                        value={categoryFilter}
                                        onChange={e => setCategoryFilter(e.target.value)}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-1 top-1.5 w-3 h-3 text-slate-400" />
                                </div>
                            )}

                            <div className="relative">
                                <select
                                    className="text-[11px] border border-slate-200 rounded-md pl-2 pr-5 py-1 bg-white appearance-none outline-none focus:ring-1 focus:ring-blue-500"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="low">Low Stock</option>
                                    <option value="out">Out of Stock</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-1 top-1.5 w-3 h-3 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Banner — compact */}
                    <div className="w-full h-28 overflow-hidden flex-shrink-0">
                        <img
                            src={BANNER_URL}
                            alt="Store Inventory"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                                        <div className="flex items-center gap-1">Category <ChevronDown className="w-2.5 h-2.5" /></div>
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Product Name</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Stock</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                                        <div className="flex items-center justify-end gap-1">Restock Lvl <ChevronDown className="w-2.5 h-2.5" /></div>
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {!selectedStoreId ? (
                                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-xs">Select a store to view inventory.</td></tr>
                                ) : loading ? (
                                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-xs">
                                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-400" />Loading…
                                    </td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-10 text-center text-slate-400 text-xs">
                                            {statusFilter === 'low' ? (
                                                <div className="flex flex-col items-center gap-1.5 py-4">
                                                    <span className="text-emerald-500 font-semibold text-sm">🎉 All items are fully stocked!</span>
                                                    <span className="text-slate-400">No low stock items found in this store.</span>
                                                </div>
                                            ) : statusFilter === 'out' ? (
                                                <div className="flex flex-col items-center gap-1.5 py-4">
                                                    <span className="text-emerald-500 font-semibold text-sm">👍 No out-of-stock items!</span>
                                                    <span className="text-slate-400">Every item has active inventory in this store.</span>
                                                </div>
                                            ) : categoryFilter ? (
                                                <div className="py-4">No items found in category "{categoryFilter}".</div>
                                            ) : (
                                                <div className="py-4">No stock movements found. Save an Opening Stock entry first.</div>
                                            )}
                                        </td>
                                    </tr>
                                ) : filteredItems.map((item, i) => {
                                    let badge = 'bg-green-100 text-green-700';
                                    let label = 'In Stock';
                                    if (item.currentStock <= 0) { badge = 'bg-red-100 text-red-700'; label = 'Out of Stock'; }
                                    else if (item.restockLevel > 0 && item.currentStock < item.restockLevel) { badge = 'bg-amber-100 text-amber-700'; label = 'Low Stock'; }

                                    return (
                                        <tr key={item.itemId || i} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                    <span className="text-slate-600">{item.itemCategory}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-2.5 h-2.5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 leading-none">{item.itemName}</p>
                                                        <p className="text-slate-400 text-[9px] mt-0.5">{item.itemCode}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-700">{item.currentStock}</td>
                                            <td className="px-3 py-2 text-right text-slate-400">{item.restockLevel || '—'}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${badge}`}>{label}</span>
                                                    <StockBar current={item.currentStock} restock={item.restockLevel} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stock Status Chart */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 mb-3">Stock Status</span>

                    {/* Donut */}
                    <div className="relative flex items-center justify-center" style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={82}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={false}
                                >
                                    {pieData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: 6 }}
                                    formatter={(v: number) => [`${v} items`, '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-slate-800 leading-none">{inStockPct}%</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">In Stock</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 space-y-2">
                        {pieData.map(item => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-slate-600">{item.name}</span>
                                </div>
                                <span className="text-xs font-semibold text-slate-700">
                                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Summary numbers */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-sm font-bold text-green-600">{inStockCount}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">OK</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-500">{lowStockCount}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Low</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-500">{outCount}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Out</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboard;
