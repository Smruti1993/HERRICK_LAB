import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Calculator, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { BACKEND_URL, getAuthToken } from '../../services/supabaseClient';

interface ReconciliationRow {
  method: string;
  amount: number;
}

export const CashierReconciliation: React.FC = () => {
  const { formatCurrency, user } = useData();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashierId, setCashierId] = useState(user?.username || '');
  const [systemTotals, setSystemTotals] = useState<Record<string, number> | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  const fetchReconciliation = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({ date });
      if (cashierId) params.append('cashierId', cashierId);
      const resp = await fetch(`${BACKEND_URL}/api/billing/reconciliation?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to load reconciliation data');
      const data = await resp.json();
      setSystemTotals(data.totals || {});
      // Pre-populate physical counts with system values so cashier edits only variances
      const initial: Record<string, string> = {};
      Object.keys(data.totals || {}).forEach(method => {
        initial[method] = (data.totals[method] || 0).toFixed(2);
      });
      setPhysicalCounts(initial);
      setFetched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const methods = systemTotals ? Object.keys(systemTotals) : [];
  const grandSystemTotal = methods.reduce((s, m) => s + (systemTotals?.[m] || 0), 0);
  const grandPhysicalTotal = methods.reduce((s, m) => s + (parseFloat(physicalCounts[m] || '0') || 0), 0);
  const grandVariance = grandPhysicalTotal - grandSystemTotal;

  const exportCSV = () => {
    const rows = [['Method', 'System Total', 'Physical Count', 'Variance']];
    methods.forEach(m => {
      const sys = (systemTotals?.[m] || 0).toFixed(2);
      const phy = (parseFloat(physicalCounts[m] || '0') || 0).toFixed(2);
      const vari = (parseFloat(phy) - parseFloat(sys)).toFixed(2);
      rows.push([m, sys, phy, vari]);
    });
    rows.push(['TOTAL', grandSystemTotal.toFixed(2), grandPhysicalTotal.toFixed(2), grandVariance.toFixed(2)]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${date}-${cashierId || 'all'}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cashier Reconciliation</h2>
          <p className="text-slate-500 text-sm mt-0.5">End-of-shift cash count vs system totals</p>
        </div>
        {fetched && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Shift Date</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setFetched(false); }}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cashier ID (optional)</label>
            <input
              type="text"
              value={cashierId}
              onChange={e => { setCashierId(e.target.value); setFetched(false); }}
              placeholder="All cashiers"
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 w-40"
            />
          </div>
          <button
            id="btn-fetch-reconciliation"
            onClick={fetchReconciliation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {loading ? 'Loading…' : 'Load Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Reconciliation Table */}
      {fetched && systemTotals && (
        <>
          {/* Variance summary banner */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
            Math.abs(grandVariance) < 0.01
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            {Math.abs(grandVariance) < 0.01
              ? <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              : <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />}
            <div>
              <p className={`font-semibold ${Math.abs(grandVariance) < 0.01 ? 'text-emerald-800' : 'text-amber-800'}`}>
                {Math.abs(grandVariance) < 0.01
                  ? 'Balanced — No variance detected'
                  : `Variance of ${formatCurrency(Math.abs(grandVariance))} ${grandVariance > 0 ? 'surplus' : 'shortage'}`}
              </p>
              <p className={`text-xs mt-0.5 ${Math.abs(grandVariance) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                System total: {formatCurrency(grandSystemTotal)} · Physical count: {formatCurrency(grandPhysicalTotal)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="font-semibold text-slate-700 text-sm">
                Reconciliation — {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                {cashierId ? ` · ${cashierId}` : ' · All Cashiers'}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Payment Method</th>
                  <th className="px-5 py-3 text-right font-semibold">System Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Physical Count</th>
                  <th className="px-5 py-3 text-right font-semibold">Variance</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {methods.map(method => {
                  const sys = systemTotals[method] || 0;
                  const phy = parseFloat(physicalCounts[method] || '0') || 0;
                  const variance = phy - sys;
                  const balanced = Math.abs(variance) < 0.01;
                  return (
                    <tr key={method} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{method}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(sys)}</td>
                      <td className="px-5 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={physicalCounts[method] || ''}
                          onChange={e => setPhysicalCounts(prev => ({ ...prev, [method]: e.target.value }))}
                          className="text-right border border-slate-200 rounded-lg px-2 py-1 w-28 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${balanced ? 'text-emerald-600' : variance > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {balanced ? '—' : `${variance > 0 ? '+' : ''}${formatCurrency(variance)}`}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {balanced
                          ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td className="px-5 py-3 text-slate-800">TOTAL</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatCurrency(grandSystemTotal)}</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatCurrency(grandPhysicalTotal)}</td>
                  <td className={`px-5 py-3 text-right ${Math.abs(grandVariance) < 0.01 ? 'text-emerald-600' : grandVariance > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {Math.abs(grandVariance) < 0.01 ? '—' : `${grandVariance > 0 ? '+' : ''}${formatCurrency(grandVariance)}`}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {Math.abs(grandVariance) < 0.01
                      ? <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                      : <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
