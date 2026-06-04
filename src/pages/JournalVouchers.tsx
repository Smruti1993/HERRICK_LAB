import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { JournalVoucher, JournalVoucherItem, ChartOfAccount } from '../types';
import { getSupabase } from '../services/supabaseClient';
import { 
  Plus, Search, Check, AlertCircle, Calendar, ArrowLeft, Info, 
  FileText, ExternalLink, RefreshCw, X, Trash2, Tag, Landmark, BookOpen
} from 'lucide-react';

export const JournalVouchers: React.FC = () => {
  const { 
    journalVouchers, saveJournalVoucher, deleteJournalVoucher, 
    chartOfAccounts, vendors, grns, bills, patients, showToast, isDbConnected 
  } = useData();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null);
  
  // Source Document Detail Modals
  const [sourceDocDetails, setSourceDocDetails] = useState<any>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  // Form States
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [formItems, setFormItems] = useState<Partial<JournalVoucherItem>[]>([
    { id: crypto.randomUUID(), accountId: '', postingNature: 'Debit', amount: 0, description: '' },
    { id: crypto.randomUUID(), accountId: '', postingNature: 'Credit', amount: 0, description: '' }
  ]);

  // Set default selected voucher on load if list has vouchers
  useEffect(() => {
    if (journalVouchers.length > 0 && !selectedVoucher) {
      setSelectedVoucher(journalVouchers[0]);
    }
  }, [journalVouchers, selectedVoucher]);

  // Filtered JVs list
  const filteredVouchers = useMemo(() => {
    return journalVouchers.filter(v => {
      const matchesSearch = 
        v.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.refDocNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.narration || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
      const matchesSource = sourceFilter === 'All' || v.refType === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [journalVouchers, searchQuery, statusFilter, sourceFilter]);

  // Calculate manual form totals
  const formTotals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    formItems.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.postingNature === 'Debit') {
        debits += amt;
      } else {
        credits += amt;
      }
    });
    return {
      debits: Number(debits.toFixed(2)),
      credits: Number(credits.toFixed(2)),
      difference: Number((debits - credits).toFixed(2)),
      isBalanced: Number(debits.toFixed(2)) === Number(credits.toFixed(2)) && debits > 0
    };
  }, [formItems]);

  // Filter out group accounts for selection (only active posting ledgers allowed)
  const postingAccounts = useMemo(() => {
    return chartOfAccounts
      .filter(acc => !acc.isGroup && acc.status === 'Active')
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [chartOfAccounts]);

  const resetForm = () => {
    setVoucherDate(new Date().toISOString().split('T')[0]);
    setNarration('');
    setFormItems([
      { id: crypto.randomUUID(), accountId: '', postingNature: 'Debit', amount: 0, description: '' },
      { id: crypto.randomUUID(), accountId: '', postingNature: 'Credit', amount: 0, description: '' }
    ]);
  };

  const handleAddRow = () => {
    setFormItems([
      ...formItems,
      { id: crypto.randomUUID(), accountId: '', postingNature: 'Debit', amount: 0, description: '' }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (formItems.length <= 2) {
      showToast('error', 'A journal voucher must have at least 2 lines.');
      return;
    }
    setFormItems(formItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof JournalVoucherItem, value: any) => {
    setFormItems(formItems.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!narration.trim()) {
      showToast('error', 'Narration is required.');
      return;
    }

    if (!formTotals.isBalanced) {
      showToast('error', 'The journal voucher is unbalanced. Debits must equal Credits.');
      return;
    }

    // Verify all rows have an account selected and positive amount
    const invalidRow = formItems.some(i => !i.accountId || (i.amount || 0) <= 0);
    if (invalidRow) {
      showToast('error', 'All rows must have a valid account selected and an amount greater than 0.');
      return;
    }

    // Map form items to clean JournalVoucherItem payload
    const finalItems: JournalVoucherItem[] = formItems.map(i => ({
      id: i.id!,
      accountId: i.accountId!,
      postingNature: i.postingNature!,
      amount: Number(i.amount!)
    }));

    const dateStr = voucherDate.replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const newVoucherNo = `JV-${dateStr}-${randSuffix}`;

    const newJV: JournalVoucher = {
      id: crypto.randomUUID(),
      voucherNo: newVoucherNo,
      voucherDate,
      refType: 'MANUAL',
      narration: narration.trim(),
      totalDebit: formTotals.debits,
      totalCredit: formTotals.credits,
      status: 'Posted', // Post immediately in this workflow
      items: finalItems
    };

    const success = await saveJournalVoucher(newJV);
    if (success) {
      resetForm();
      setViewMode('list');
      setSelectedVoucher(newJV);
    }
  };

  // Map account details for selected voucher items
  const selectedVoucherItemsMapped = useMemo(() => {
    if (!selectedVoucher || !selectedVoucher.items) return [];
    return selectedVoucher.items.map(item => {
      const coa = chartOfAccounts.find(c => c.id === item.accountId);
      return {
        ...item,
        accountCode: coa?.code || 'N/A',
        accountName: coa?.name || 'Unknown Account'
      };
    });
  }, [selectedVoucher, chartOfAccounts]);

  // Load details of the source document
  const handleViewSourceDoc = async () => {
    if (!selectedVoucher || selectedVoucher.refType === 'MANUAL') return;
    
    setLoadingSource(true);
    setSourceDocDetails(null);
    setShowSourceModal(true);

    try {
      const refId = selectedVoucher.refDocId;
      const refNo = selectedVoucher.refDocNo;

      if (selectedVoucher.refType === 'GRN') {
        // Find GRN in context or database
        let grn = grns.find(g => g.id === refId || g.grnNo === refNo);
        if (!grn && isDbConnected) {
          const supabase = getSupabase();
          const { data } = await supabase.from('procurement_grns').select('*, items:procurement_grn_items(*)').eq('id', refId).single();
          grn = data;
        }
        if (grn) {
          const vendor = vendors.find(v => v.id === grn.vendorId);
          setSourceDocDetails({
            type: 'GRN',
            no: grn.grnNo,
            date: grn.gateEntryDate,
            partyName: vendor?.name || 'Unknown Vendor',
            status: grn.status,
            netAmount: grn.netAmount,
            grossAmount: grn.grossAmount,
            items: grn.items || []
          });
        }
      } else if (selectedVoucher.refType === 'PHARMACY_SALE') {
        // Fetch from Supabase
        if (isDbConnected) {
          const supabase = getSupabase();
          const { data: sale } = await supabase.from('pharmacy_direct_sales').select('*').eq('id', refId).single();
          const { data: items } = await supabase.from('pharmacy_direct_sale_items').select('*').eq('sale_id', refId);
          if (sale) {
            setSourceDocDetails({
              type: 'Pharmacy Sale',
              no: sale.sale_no,
              date: sale.sale_date,
              partyName: `${sale.first_name} ${sale.last_name || ''}`.trim() || 'Cash Patient',
              status: 'Completed',
              netAmount: sale.total_amount,
              grossAmount: Number((sale.total_amount - (sale.tax_amount || 0)).toFixed(2)),
              taxAmount: sale.tax_amount,
              items: items?.map((i: any) => {
                const inv = chartOfAccounts.find(c => c.id === i.item_id); // wait, inventory items resolve
                return {
                  name: i.description || `Drug Item (ID: ${i.item_id})`,
                  qty: i.quantity,
                  price: i.unit_price,
                  tax: i.tax_amount,
                  total: i.total_price
                };
              }) || []
            });
          }
        } else {
          // Mock display if database connection is down
          setSourceDocDetails({
            type: 'Pharmacy Sale (Local Offline)',
            no: refNo || 'N/A',
            date: selectedVoucher.voucherDate,
            partyName: 'Cash Patient',
            netAmount: selectedVoucher.totalDebit,
            items: []
          });
        }
      } else if (selectedVoucher.refType === 'OP_DISPENSE') {
        // Find Bill in context or DB
        let bill = bills.find(b => b.id === refId || b.invoiceNo === refNo);
        if (!bill && isDbConnected) {
          const supabase = getSupabase();
          const { data } = await supabase.from('bills').select('*, items:bill_items(*)').eq('id', refId).single();
          bill = data;
        }
        if (bill) {
          const pat = patients.find(p => p.id === bill.patientId);
          setSourceDocDetails({
            type: 'OP Dispense Invoice',
            no: bill.invoiceNo,
            date: bill.date,
            partyName: pat ? `${pat.firstName} ${pat.lastName || ''}`.trim() : 'Patient',
            status: bill.status,
            netAmount: bill.totalAmount,
            grossAmount: Number((bill.totalAmount - (bill.taxAmount || 0)).toFixed(2)),
            taxAmount: bill.taxAmount,
            items: bill.items?.map(i => ({
              name: i.description,
              qty: i.quantity,
              price: i.unitPrice,
              tax: i.taxAmount || 0,
              total: i.total
            })) || []
          });
        }
      }
    } catch (error) {
      console.error("Error loading source document details:", error);
      showToast('error', 'Failed to retrieve source document details.');
    } finally {
      setLoadingSource(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Title Header */}
      <div className="flex items-center justify-between flex-shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Journal Voucher Transactions</h1>
            <p className="text-xs text-slate-400">Review double-entry ledgers and manual postings</p>
          </div>
        </div>
        {viewMode === 'list' ? (
          <button 
            onClick={() => { resetForm(); setViewMode('form'); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create Manual JV
          </button>
        ) : (
          <button 
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Vouchers Grid List */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filters Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white placeholder-slate-400 font-medium"
                  placeholder="Search voucher, doc ref..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Source:</span>
                  <select 
                    className="text-xs font-semibold text-slate-600 bg-transparent outline-none cursor-pointer"
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                  >
                    <option value="All">All Sources</option>
                    <option value="GRN">Goods Receipt (GRN)</option>
                    <option value="PHARMACY_SALE">Pharmacy Sale</option>
                    <option value="OP_DISPENSE">OP Dispense</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                  <select 
                    className="text-xs font-semibold text-slate-600 bg-transparent outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Posted">Posted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Voucher No</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Date</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px]">Source</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px] w-1/3">Narration</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px] text-right">Debit / Credit</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 uppercase text-[10px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto opacity-20 mb-2" />
                        <p className="font-semibold text-xs">No journal vouchers found</p>
                      </td>
                    </tr>
                  ) : filteredVouchers.map(v => (
                    <tr 
                      key={v.id} 
                      onClick={() => setSelectedVoucher(v)}
                      className={`cursor-pointer hover:bg-indigo-50/20 transition-all ${selectedVoucher?.id === v.id ? 'bg-indigo-50/50 font-medium' : ''}`}
                    >
                      <td className="px-4 py-3 font-bold text-indigo-600">{v.voucherNo}</td>
                      <td className="px-4 py-3 text-slate-600">{v.voucherDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          v.refType === 'GRN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          v.refType === 'PHARMACY_SALE' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                          v.refType === 'OP_DISPENSE' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {v.refType === 'PHARMACY_SALE' ? 'Retail Sale' : v.refType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{v.narration}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        INR {v.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'Posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Double Entry Side Detail Panel */}
          <div className="w-96 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
            {selectedVoucher ? (
              <div className="flex flex-col h-full min-h-0">
                {/* Panel Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voucher Details</p>
                      <h2 className="text-sm font-black text-slate-800">{selectedVoucher.voucherNo}</h2>
                    </div>
                    {selectedVoucher.refType !== 'MANUAL' && (
                      <button 
                        onClick={handleViewSourceDoc}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                      >
                        <ExternalLink className="w-3 h-3" /> View Source
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100/50 pt-2 mt-2">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Post Date:</span>
                      <span className="text-slate-700 font-medium">{selectedVoucher.voucherDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Ref Doc:</span>
                      <span className="text-slate-700 font-medium truncate block">{selectedVoucher.refDocNo || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Narration</h3>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                      {selectedVoucher.narration}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ledger Postings</h3>
                    <div className="divide-y divide-slate-100 bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                      {selectedVoucherItemsMapped.map((item, idx) => (
                        <div key={item.id || idx} className="p-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <div>
                              <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1 py-0.5 rounded mr-1">
                                {item.accountCode}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{item.accountName}</span>
                            </div>
                            <span className={`text-xs font-black shrink-0 ${
                              item.postingNature === 'Debit' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {item.postingNature === 'Debit' ? 'Dr' : 'Cr'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500">
                            <span className="italic">{item.description || 'Auto-posting line'}</span>
                            <span className="font-semibold text-slate-800">
                              INR {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Balanced Footer Check */}
                <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Total Balanced Amount</p>
                    <p className="text-base font-black text-slate-800">
                      INR {selectedVoucher.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                    <Check className="w-3.5 h-3.5 font-bold" /> Double-Entry OK
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Info className="w-8 h-8 opacity-25 mb-2" />
                <p className="text-xs font-medium">Select a journal voucher from the list to review details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Manual JV Form View */
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
            {/* Form Fields Header */}
            <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-wrap gap-4 flex-shrink-0">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Voucher Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    value={voucherDate}
                    onChange={e => setVoucherDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-[3] min-w-[300px] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Narration / Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter main narration detailing this journal voucher posting..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Items Table */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[10px] w-2/5">Ledger Account (Posting Code - Name)</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[10px] w-28">Nature</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[10px] w-36 text-right">Amount (INR)</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[10px]">Description Remarks</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[10px] w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/20">
                      <td className="px-4 py-3">
                        <select 
                          required
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={item.accountId}
                          onChange={e => handleItemChange(item.id!, 'accountId', e.target.value)}
                        >
                          <option value="">-- Choose Account --</option>
                          {postingAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.accountType})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          required
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                          value={item.postingNature}
                          onChange={e => handleItemChange(item.id!, 'postingNature', e.target.value)}
                        >
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0.01" 
                          required
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                          value={item.amount || ''}
                          onChange={e => handleItemChange(item.id!, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          placeholder="Optional description for this posting row..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={item.description || ''}
                          onChange={e => handleItemChange(item.id!, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          type="button"
                          onClick={() => handleRemoveRow(item.id!)}
                          className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button 
                type="button" 
                onClick={handleAddRow}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold rounded-lg transition-colors border border-indigo-150"
              >
                <Plus className="w-4 h-4" /> Add Ledger Row
              </button>
            </div>

            {/* Balancing Indicator and Submit Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-6">
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Total Debits</span>
                  <span className="text-slate-800 font-extrabold text-sm">INR {formTotals.debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Total Credits</span>
                  <span className="text-slate-800 font-extrabold text-sm">INR {formTotals.credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Difference</span>
                  <span className={`font-extrabold text-sm ${formTotals.difference === 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    INR {formTotals.difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center">
                  {formTotals.isBalanced ? (
                    <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-full text-[10px] font-bold">
                      <Check className="w-3.5 h-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[10px] font-bold">
                      <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Unbalanced Difference
                    </span>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!formTotals.isBalanced}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Journal Voucher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Source Document Details Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Source Document: {sourceDocDetails?.type} ({sourceDocDetails?.no})
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Reference Explorer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSourceModal(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {loadingSource ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs font-semibold">Loading source data details...</p>
                </div>
              ) : sourceDocDetails ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">Date / Time</span>
                      <span className="text-slate-700 text-xs font-bold">{new Date(sourceDocDetails.date).toLocaleDateString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">Party / Reference</span>
                      <span className="text-slate-700 text-xs font-bold truncate block">{sourceDocDetails.partyName}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase mb-0.5">Net Invoice Total</span>
                      <span className="text-indigo-600 text-xs font-extrabold">INR {sourceDocDetails.netAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Transaction Items Breakdown</h4>
                    <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-150">
                          <tr>
                            <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px]">Item Name / Description</th>
                            <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] text-center w-16">Qty</th>
                            <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] text-right w-24">Price</th>
                            <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] text-right w-24">Tax</th>
                            <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] text-right w-28">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sourceDocDetails.items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                                Item details not stored in this transaction record
                              </td>
                            </tr>
                          ) : sourceDocDetails.items.map((item: any, idx: number) => {
                            // Support mapping for GRN items or Direct Sale items
                            const name = item.itemName || item.name || `Item (ID: ${item.item_id})`;
                            const qty = item.acceptedQuantity || item.qty || item.quantity || 0;
                            const price = item.rate || item.unit_price || item.price || 0;
                            const tax = item.vatAmount || item.cgstAmount + item.sgstAmount + item.igstAmount || item.tax_amount || item.tax || 0;
                            const total = item.totalAmount || item.total_price || item.total || 0;
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-medium text-slate-700">{name}</td>
                                <td className="px-4 py-2.5 text-center font-bold text-slate-600">{qty}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">INR {price.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">INR {tax.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-slate-800">INR {total.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 italic">No source data found.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 text-right rounded-b-2xl flex-shrink-0">
              <button 
                onClick={() => setShowSourceModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
