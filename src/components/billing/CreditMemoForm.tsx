import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Bill } from '../../types';
import { X, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { BACKEND_URL, getAuthToken } from '../../services/supabaseClient';

interface Props {
  bill: Bill;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreditMemoForm: React.FC<Props> = ({ bill, onClose, onSuccess }) => {
  const { formatCurrency, showToast, user } = useData();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const maxAmount = bill.totalAmount;

  const validate = () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) return 'Enter a valid positive amount';
    if (num > maxAmount) return `Amount cannot exceed invoice total (${formatCurrency(maxAmount)})`;
    if (!reason.trim() || reason.trim().length < 3) return 'Provide a reason (at least 3 characters)';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');

    try {
      const token = await getAuthToken();
      const resp = await fetch(`${BACKEND_URL}/api/billing/${bill.id}/credit-memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billId: bill.id,
          amount: parseFloat(amount),
          reason: reason.trim(),
          createdBy: user?.username || 'admin',
          status: 'Approved',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to create credit memo');
      showToast('success', `Credit memo ${data.creditMemo?.credit_memo_no} created`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Issue Credit Memo</h2>
              <p className="text-xs text-slate-400">{bill.invoiceNo || `Invoice #${bill.id.slice(-8).toUpperCase()}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Invoice summary */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Invoice Total</span>
              <span className="font-semibold">{formatCurrency(bill.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 mt-1">
              <span>Amount Paid</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(bill.paidAmount)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Credit Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="credit-memo-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); }}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              placeholder={`Max ${formatCurrency(maxAmount)}`}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="credit-memo-reason"
              rows={3}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Billing error, service not rendered, patient request…"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Important note */}
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
            ⚠️ Credit memos are permanent audit records. The original invoice total_amount remains unchanged.
            Adjustments are tracked in the credit_memos ledger.
          </p>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              id="btn-submit-credit-memo"
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Issue Credit Memo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
