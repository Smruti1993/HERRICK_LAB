import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Bill } from '../../types';
import { X, RotateCcw, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { BACKEND_URL, getAuthToken } from '../../services/supabaseClient';

interface CreditMemoRow {
  id: string;
  credit_memo_no: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  refund_id?: string;
}

interface Props {
  bill: Bill;
  onClose: () => void;
  onSuccess: () => void;
}

export const RefundScreen: React.FC<Props> = ({ bill, onClose, onSuccess }) => {
  const { formatCurrency, showToast, user } = useData();
  const [creditMemos, setCreditMemos] = useState<CreditMemoRow[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load approved credit memos for this bill
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = await getAuthToken();
        const resp = await fetch(`${BACKEND_URL}/api/billing/${bill.id}/credit-memo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const approved = (data.creditMemos || []).filter((m: CreditMemoRow) =>
            m.status === 'Approved' && !m.refund_id
          );
          setCreditMemos(approved);
        }
      } catch (err) {
        // Silently degrade — user can still see the form, just without pre-loaded memos
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bill.id]);

  const selectedMemo = creditMemos.find(m => m.id === selectedMemoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemoId) { setError('Select an approved credit memo to refund against'); return; }
    if (!selectedMemo) { setError('Credit memo not found'); return; }
    setSaving(true);
    setError('');

    try {
      const token = await getAuthToken();
      const resp = await fetch(`${BACKEND_URL}/api/billing/${bill.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billId: bill.id,
          creditMemoId: selectedMemoId,
          patientId: bill.patientId,
          totalAmount: selectedMemo.amount,
          paymentMethod,
          remarks: remarks.trim() || null,
          createdBy: user?.username || 'admin',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to process refund');
      showToast('success', `Refund ${data.refundNo} processed successfully`);
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
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Process Refund</h2>
              <p className="text-xs text-slate-400">{bill.invoiceNo || `Invoice #${bill.id.slice(-8).toUpperCase()}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Credit Memo Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Authorizing Credit Memo <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm p-3 border border-slate-200 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading credit memos…
              </div>
            ) : creditMemos.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                No approved credit memos found for this invoice. Issue a credit memo first.
              </div>
            ) : (
              <select
                id="refund-memo-select"
                value={selectedMemoId}
                onChange={e => { setSelectedMemoId(e.target.value); setError(''); }}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">Select credit memo…</option>
                {creditMemos.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.credit_memo_no} — {formatCurrency(m.amount)} — {m.reason.slice(0, 40)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected memo summary */}
          {selectedMemo && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>Refund Amount</span>
                <span className="font-bold text-violet-700">{formatCurrency(selectedMemo.amount)}</span>
              </div>
              <p className="text-xs text-slate-500">Reason: {selectedMemo.reason}</p>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Refund Method <span className="text-red-500">*</span>
            </label>
            <select
              id="refund-payment-method"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            >
              {['Cash', 'Card', 'Bank Transfer', 'UPI', 'Cheque'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks (optional)</label>
            <textarea
              id="refund-remarks"
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              placeholder="Additional notes for this refund…"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || creditMemos.length === 0}
              id="btn-submit-refund"
              className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><CheckCircle className="w-4 h-4" /> Process Refund</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
