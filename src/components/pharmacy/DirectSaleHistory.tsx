import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { DirectSale } from '../../types';
import { DirectSaleInvoiceReport } from './DirectSaleInvoiceReport';
import { Calendar, Filter, Eye, Search, FileText } from 'lucide-react';

export const DirectSaleHistory: React.FC = () => {
  const { stores, fetchDirectSales } = useData();
  const [sales, setSales] = useState<DirectSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<DirectSale[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [selectedStore, setSelectedStore] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected sale for invoice preview
  const [selectedSale, setSelectedSale] = useState<DirectSale | null>(null);

  const loadSales = async () => {
    setLoading(true);
    const data = await fetchDirectSales();
    setSales(data);
    setFilteredSales(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    let result = sales;

    if (selectedStore) {
      result = result.filter(s => s.storeId === selectedStore);
    }
    if (fromDate) {
      result = result.filter(s => new Date(s.saleDate) >= new Date(fromDate));
    }
    if (toDate) {
      // Add one day to toDate to make it inclusive
      const end = new Date(toDate);
      end.setDate(end.getDate() + 1);
      result = result.filter(s => new Date(s.saleDate) < end);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
        (s.saleNo && s.saleNo.toLowerCase().includes(q)) ||
        (s.firstName && s.firstName.toLowerCase().includes(q)) ||
        (s.lastName && s.lastName.toLowerCase().includes(q))
      );
    }

    setFilteredSales(result);
  }, [selectedStore, fromDate, toDate, searchQuery, sales]);

  return (
    <div className="space-y-6 p-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Direct Sale History</h1>
            <p className="text-sm text-slate-500">Track and manage past pharmacy direct sales and invoices</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-blue-600" /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Store Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pharmacy Store</label>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
            >
              <option value="">All Stores</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.storeName}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 pr-8 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search Invoice or Patient..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/50"
              />
            </div>
          </div>

        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Invoice / Bill No</th>
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-6">Patient Name</th>
                <th className="py-3 px-6">Store</th>
                <th className="py-3 px-6 text-right">VAT (SAR)</th>
                <th className="py-3 px-6 text-right">Total Amount (SAR)</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading sales history...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">No sales found matching the filters.</td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const store = stores.find(s => s.id === sale.storeId);
                  const patientName = [sale.firstName, sale.middleName, sale.lastName].filter(Boolean).join(' ');
                  
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-blue-700 font-mono">
                        {sale.invoiceNo || sale.saleNo}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {new Date(sale.saleDate).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {patientName}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-500">
                        {store?.storeName || 'Unknown Store'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-500">
                        {(sale.taxAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-extrabold text-slate-900">
                        {sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Invoice
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

      {/* Invoice Report Modal Overlay */}
      {selectedSale && (
        <DirectSaleInvoiceReport 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
        />
      )}

    </div>
  );
};
