import React, { useState, useMemo } from 'react';
import { useData, getCurrencySymbol } from '../../context/DataContext';
import { Pagination } from '../Pagination';
import {
  Search, FileText, History, Printer, Ban, Plus, Eye,
  TrendingUp, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Bill } from '../../types';

interface Props {
  onNewInvoice: () => void;
  onViewDetail: (bill: Bill) => void;
  onRecordPayment: (bill: Bill) => void;
  onPrint: (bill: Bill) => void;
  onPrintReceipt: (bill: Bill, payment?: any) => void;
  onCancel: (billId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Partial: 'bg-amber-100 text-amber-800 border-amber-200',
  Partial_Return: 'bg-orange-100 text-orange-800 border-orange-200',
  Unpaid: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  Receipt: 'bg-purple-100 text-purple-800 border-purple-200',
};

export const InvoiceList: React.FC<Props> = ({
  onNewInvoice, onViewDetail, onRecordPayment, onPrint, onPrintReceipt, onCancel
}) => {
  const { bills, patients, formatCurrency, selectedCurrency } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [payerFilter, setPayerFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ── Summary stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = bills.filter(b => !b.isPharmacy && b.status !== 'Cancelled').length;
    const unpaid = bills.filter(b => b.status === 'Unpaid').reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRevenue = bills
      .filter(b => b.date?.startsWith(todayStr) && b.status !== 'Cancelled')
      .reduce((s, b) => s + b.paidAmount, 0);
    const overdue = bills.filter(b => b.status === 'Unpaid' &&
      new Date(b.date) < new Date(Date.now() - 30 * 86_400_000)).length;
    return { total, unpaid, todayRevenue, overdue };
  }, [bills]);

  // ── Flatten bills + receipts ──────────────────────────────────────────────
  const rows = useMemo(() => {
    const result: any[] = [];
    bills.forEach(bill => {
      const p = patients.find(pt => pt.id === bill.patientId);
      const patientName = bill.patientName || (p ? `${p.firstName} ${p.lastName}` : 'Walk-in Patient');
      result.push({
        keyId: `${bill.id}-inv`, id: bill.id,
        invoiceNo: bill.invoiceNo || `#${bill.id.slice(-6)}`,
        date: bill.date, patientName,
        totalAmount: bill.totalAmount, paidAmount: bill.paidAmount,
        status: bill.status, isReceipt: false,
        payerType: bill.payerType || 'Self',
        parentBill: bill, payment: undefined,
      });
      (bill.payments || []).forEach(pay => {
        result.push({
          keyId: `${pay.id}-rcp`, id: pay.id,
          invoiceNo: `RCP-${pay.id.slice(-8).toUpperCase()}`,
          date: pay.date, patientName,
          totalAmount: pay.amount, paidAmount: pay.amount,
          status: 'Receipt', isReceipt: true,
          payerType: bill.payerType || 'Self',
          parentBill: bill, payment: pay,
        });
      });
    });
    return result;
  }, [bills, patients]);

  const filtered = useMemo(() => {
    return rows
      .filter(row => {
        const nameMatch = row.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
        const statusOk = statusFilter === 'All' ? true
          : statusFilter === 'Receipt' ? row.isReceipt
          : !row.isReceipt && row.status === statusFilter;
        const payerOk = payerFilter === 'All' ? true : row.payerType === payerFilter;
        return nameMatch && statusOk && payerOk;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rows, searchTerm, statusFilter, payerFilter]);

  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Billing &amp; Invoices</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage patient invoices, payments and receipts</p>
        </div>
        <button
          id="btn-new-invoice"
          onClick={onNewInvoice}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow-md w-fit font-medium"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total, icon: FileText, color: 'blue', format: 'number' },
          { label: "Today's Revenue", value: stats.todayRevenue, icon: TrendingUp, color: 'emerald', format: 'currency' },
          { label: 'Outstanding AR', value: stats.unpaid, icon: Clock, color: 'amber', format: 'currency' },
          { label: 'Overdue (30d+)', value: stats.overdue, icon: XCircle, color: 'red', format: 'number' },
        ].map(({ label, value, icon: Icon, color, format }) => (
          <div key={label} className={`bg-white rounded-xl border border-${color}-100 p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
              <div className={`w-8 h-8 bg-${color}-50 rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
            </div>
            <p className={`text-xl font-bold text-${color}-700`}>
              {format === 'currency' ? formatCurrency(value as number) : (value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/50 rounded-t-2xl">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              id="invoice-search"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              placeholder="Search patient, invoice #…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            id="invoice-status-filter"
            className="bg-white border border-slate-300 text-slate-600 text-sm rounded-lg px-3 py-2 outline-none"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            {['All', 'Unpaid', 'Partial', 'Paid', 'Cancelled', 'Receipt'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>
            ))}
          </select>
          <select
            id="invoice-payer-filter"
            className="bg-white border border-slate-300 text-slate-600 text-sm rounded-lg px-3 py-2 outline-none"
            value={payerFilter}
            onChange={e => { setPayerFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Payers</option>
            <option value="Self">Self Pay</option>
            <option value="Sponsor">Sponsor / TPA</option>
          </select>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice #</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Payer</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-right">Paid</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No invoices found</p>
                    <p className="text-slate-300 text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : paginated.map(row => (
                <tr key={row.keyId} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {row.invoiceNo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{row.patientName}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      row.payerType === 'Sponsor'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {row.payerType === 'Sponsor' ? 'Sponsor' : 'Self'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                    {formatCurrency(row.totalAmount)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">
                    {row.isReceipt ? '' : formatCurrency(row.paidAmount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_STYLES[row.status] || STATUS_STYLES.Unpaid
                    }`}>
                      {row.status === 'Partial_Return' ? 'Partial Return' : row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* View Detail */}
                      {!row.isReceipt && (
                        <button
                          id={`btn-view-${row.id}`}
                          onClick={() => onViewDetail(row.parentBill)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {/* Record Payment */}
                      {!row.isReceipt && row.status !== 'Cancelled' && row.status !== 'Paid' && (
                        <button
                          id={`btn-pay-${row.id}`}
                          onClick={() => onRecordPayment(row.parentBill)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <span className="text-[10px] font-black leading-none w-4 h-4 flex items-center justify-center">
                            {getCurrencySymbol(selectedCurrency)}
                          </span>
                        </button>
                      )}
                      {/* History (paid) */}
                      {!row.isReceipt && row.status === 'Paid' && (
                        <button
                          onClick={() => onViewDetail(row.parentBill)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                      {/* Cancel */}
                      {!row.isReceipt && row.status !== 'Cancelled' && (
                        <button
                          id={`btn-cancel-${row.id}`}
                          onClick={() => onCancel(row.parentBill.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel Invoice"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {/* Print Receipt */}
                      {(row.isReceipt || ['Paid', 'Partial', 'Partial_Return'].includes(row.status)) && (
                        <button
                          onClick={() => onPrintReceipt(row.parentBill, row.payment)}
                          className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Print Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      {/* Print Invoice */}
                      {!row.isReceipt && (
                        <button
                          onClick={() => onPrint(row.parentBill)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          colorTheme="blue"
        />
      </div>
    </div>
  );
};
