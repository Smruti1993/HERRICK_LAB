import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Bill, CreditMemo, PatientRefund } from '../../types';
import {
  X, Printer, FileText, CreditCard, RotateCcw, Clock,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Receipt
} from 'lucide-react';

interface Props {
  bill: Bill;
  onClose: () => void;
  onRecordPayment: (bill: Bill) => void;
  onIssueCreditMemo: (bill: Bill) => void;
  onInitiateRefund: (bill: Bill) => void;
  onPrint: (bill: Bill) => void;
  onPrintReceipt: (bill: Bill, payment?: any) => void;
  onCancel: (billId: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Partial: 'bg-amber-100 text-amber-800 border-amber-200',
  Unpaid: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  Partial_Return: 'bg-orange-100 text-orange-800 border-orange-200',
};

export const InvoiceDetail: React.FC<Props> = ({
  bill, onClose, onRecordPayment, onIssueCreditMemo, onInitiateRefund,
  onPrint, onPrintReceipt, onCancel
}) => {
  const { patients, formatCurrency, organizations } = useData();
  const [showItems, setShowItems] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  const patient = patients.find(p => p.id === bill.patientId);
  const patientName = bill.patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient');
  const sponsor = organizations?.find((o: any) => o.id === bill.sponsorId);
  const balance = bill.totalAmount - bill.paidAmount;
  const isPaid = bill.status === 'Paid';
  const isCancelled = bill.status === 'Cancelled';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">
                {bill.invoiceNo || `Invoice #${bill.id.slice(-8).toUpperCase()}`}
              </h2>
              <p className="text-xs text-slate-400">
                {new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[bill.status] || STATUS_BADGE.Unpaid}`}>
              {bill.status === 'Partial_Return' ? 'Partial Return' : bill.status}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Patient + Payer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Patient</p>
              <p className="font-semibold text-slate-800">{patientName}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">MR: {patient?.id?.slice(-8).toUpperCase() || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payer</p>
              <p className="font-semibold text-slate-800">
                {bill.payerType === 'Sponsor' && sponsor ? sponsor.name : 'Self Pay'}
              </p>
              {bill.payerType === 'Sponsor' && (
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {bill.sponsorDueAmount != null && (
                    <p>Sponsor covers: <span className="font-medium">{formatCurrency(bill.sponsorDueAmount)}</span></p>
                  )}
                  {bill.patientDueAmount != null && (
                    <p>Patient co-pay: <span className="font-medium">{formatCurrency(bill.patientDueAmount)}</span></p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-4 border border-blue-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(bill.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Balance Due</p>
                <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.max(0, balance))}
                </p>
              </div>
            </div>
            {(bill.discountAmount ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between text-xs text-slate-500">
                <span>Discount Applied</span>
                <span className="font-medium text-orange-600">-{formatCurrency(bill.discountAmount ?? 0)}</span>
              </div>
            )}
            {(bill.taxAmount ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Tax</span>
                <span className="font-medium">{formatCurrency(bill.taxAmount ?? 0)}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700"
              onClick={() => setShowItems(v => !v)}
            >
              <span>Bill Items ({bill.items?.length || 0})</span>
              {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showItems && (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-white">
                  <tr className="text-slate-500 text-xs">
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-center font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Discount</th>
                    <th className="px-4 py-2 text-right font-medium">Tax</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(bill.items || []).map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-800">{item.description}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-500 text-xs">
                        {item.discountAmount ? `-${formatCurrency(item.discountAmount)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                        {item.taxAmount ? formatCurrency(item.taxAmount) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payments */}
          {(bill.payments?.length ?? 0) > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700"
                onClick={() => setShowPayments(v => !v)}
              >
                <span>Payment History ({bill.payments?.length || 0})</span>
                {showPayments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPayments && (
                <div className="divide-y divide-slate-50">
                  {(bill.payments || []).map((pay, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{pay.method}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(pay.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {pay.reference ? ` · Ref: ${pay.reference}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">+{formatCurrency(pay.amount)}</span>
                        <button
                          onClick={() => onPrintReceipt(bill, pay)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Print Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 justify-between rounded-b-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => onPrint(bill)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            {!isCancelled && (
              <button
                id={`btn-detail-cancel-${bill.id}`}
                onClick={() => onCancel(bill.id)}
                className="px-3 py-2 border border-red-200 bg-white text-red-500 rounded-xl text-sm flex items-center gap-1.5 hover:bg-red-50 transition-colors"
              >
                Cancel Invoice
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {!isPaid && !isCancelled && (
              <button
                id={`btn-detail-pay-${bill.id}`}
                onClick={() => onRecordPayment(bill)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center gap-1.5 font-medium transition-colors"
              >
                <CreditCard className="w-4 h-4" /> Record Payment
              </button>
            )}
            {!isCancelled && (
              <button
                id={`btn-credit-memo-${bill.id}`}
                onClick={() => onIssueCreditMemo(bill)}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm flex items-center gap-1.5 font-medium transition-colors"
              >
                <FileText className="w-4 h-4" /> Credit Memo
              </button>
            )}
            {!isCancelled && bill.refundStatus !== 'Refunded' && (
              <button
                id={`btn-refund-${bill.id}`}
                onClick={() => onInitiateRefund(bill)}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm flex items-center gap-1.5 font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Refund
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
