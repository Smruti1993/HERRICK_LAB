import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { getSupabase } from '../../services/supabaseClient';
import { Store, InventoryItem } from '../../types';
import { ArrowLeftRight, Save, Play, Plus, Trash2, Hash, Calendar, Layers, ShieldCheck } from 'lucide-react';

interface TransferItem {
  item: InventoryItem;
  selectedBatch: string;
  expiryDate?: string;
  availableQty: number;
  transferQty: number;
  rate: number;
}

export const StockTransfer = () => {
  const { stores, inventoryItems, showToast, user } = useData();

  const [sourceStoreId, setSourceStoreId] = useState('');
  const [destStoreId, setDestStoreId] = useState('');
  const [transferNo, setTransferNo] = useState('');
  
  const [selectedItemId, setSelectedItemId] = useState('');
  const [availableLots, setAvailableLots] = useState<Array<{ batchNo: string, expiryDate?: string, quantity: number, rate: number }>>([]);
  const [lotSelection, setLotSelection] = useState('');
  const [transferQtyInput, setTransferQtyInput] = useState('');
  
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all active stores from master
  const activeStores = stores.filter(s => s.status === 'Active');

  useEffect(() => {
    // Generate a unique transfer code
    setTransferNo('TRF-' + Date.now().toString().slice(-8));
  }, []);

  // Fetch batches when item is selected
  useEffect(() => {
    if (!sourceStoreId || !selectedItemId) {
      setAvailableLots([]);
      setLotSelection('');
      return;
    }

    const loadLots = async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('inventory_stock_ledger')
          .select('batch_no, expiry_date, stock_in_quantity, stock_out_quantity, closing_stock_rate')
          .eq('store_id', sourceStoreId)
          .eq('item_id', selectedItemId);

        if (error) throw error;

        // Group and calculate balance per batch
        const batchBalances: Record<string, { batchNo: string, expiryDate?: string, quantity: number, rate: number }> = {};
        for (const row of data || []) {
          const key = `${row.batch_no}-${row.expiry_date || ''}`;
          if (!batchBalances[key]) {
            batchBalances[key] = {
              batchNo: row.batch_no,
              expiryDate: row.expiry_date || undefined,
              quantity: 0,
              rate: Number(row.closing_stock_rate || 0)
            };
          }
          batchBalances[key].quantity += Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0);
        }

        // Filter out zero or negative balances
        const validLots = Object.values(batchBalances).filter(b => b.quantity > 0);
        setAvailableLots(validLots);
        if (validLots.length > 0) {
          setLotSelection(JSON.stringify(validLots[0]));
        }
      } catch (err: any) {
        showToast('error', `Failed to load batches: ${err.message}`);
      }
    };

    loadLots();
  }, [sourceStoreId, selectedItemId]);

  const handleAddItem = () => {
    if (!selectedItemId || !lotSelection || !transferQtyInput) {
      showToast('error', 'Please select an item, a batch, and enter a valid quantity.');
      return;
    }

    const item = inventoryItems.find(i => i.id === selectedItemId);
    if (!item) return;

    const lot = JSON.parse(lotSelection);
    const qty = parseFloat(transferQtyInput);

    if (isNaN(qty) || qty <= 0) {
      showToast('error', 'Quantity must be a positive number.');
      return;
    }

    if (qty > lot.quantity) {
      showToast('error', 'Transfer quantity cannot exceed available lot balance.');
      return;
    }

    // Check duplicate
    const exists = transferItems.some(i => i.item.id === selectedItemId && i.selectedBatch === lot.batchNo);
    if (exists) {
      showToast('error', 'This item and batch combination is already added.');
      return;
    }

    const newItem: TransferItem = {
      item,
      selectedBatch: lot.batchNo,
      expiryDate: lot.expiryDate,
      availableQty: lot.quantity,
      transferQty: qty,
      rate: lot.rate
    };

    setTransferItems(prev => [...prev, newItem]);
    
    // Clear item inputs
    setSelectedItemId('');
    setLotSelection('');
    setTransferQtyInput('');
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const executeTransfer = async () => {
    if (!sourceStoreId || !destStoreId) {
      showToast('error', 'Please select both source and destination stores.');
      return;
    }

    if (sourceStoreId === destStoreId) {
      showToast('error', 'Source and destination stores cannot be the same.');
      return;
    }

    if (transferItems.length === 0) {
      showToast('error', 'Please add at least one item to transfer.');
      return;
    }

    setIsSubmitting(true);
    const supabase = getSupabase();

    try {
      // 1. Create Stock Transfer Header Record
      const { data: headerData, error: headerErr } = await supabase
        .from('stock_transfers')
        .insert({
          transfer_no: transferNo,
          source_store_id: sourceStoreId,
          destination_store_id: destStoreId,
          status: 'Completed',
          requested_by: user?.id || null,
          approved_by: user?.id || null,
          approved_at: new Date().toISOString(),
          notes: 'Automatic transfer executed via StockTransfer screen'
        })
        .select('id')
        .single();

      if (headerErr) throw headerErr;
      const transferId = headerData.id;

      // Loop through items and post STOCKOUT and STOCKIN ledger records
      for (const t of transferItems) {
        // --- 1. POST STOCKOUT FOR SOURCE CENTRAL STORE ---
        // 1a. Mathematically sum the ledger to get deterministic current stock balance
        const { data: sumSrcData } = await supabase
          .from('inventory_stock_ledger')
          .select('stock_in_quantity, stock_out_quantity')
          .eq('store_id', sourceStoreId)
          .eq('item_id', t.item.id);

        const currentSrcStock = (sumSrcData || []).reduce(
          (acc, row) => acc + (Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0)),
          0
        );

        // 1b. Fetch last closing_stock_rate for WAC
        const { data: srcRateData } = await supabase
          .from('inventory_stock_ledger')
          .select('closing_stock_rate')
          .eq('store_id', sourceStoreId)
          .eq('item_id', t.item.id)
          .order('created_at', { ascending: false })
          .order('ref_doc_date', { ascending: false })
          .limit(1);

        const currentSrcRate = srcRateData && srcRateData.length > 0 ? Number(srcRateData[0].closing_stock_rate || 0) : t.rate;
        const newSrcStock = Math.max(0, currentSrcStock - t.transferQty);

        const { data: stockoutData, error: stockoutErr } = await supabase
          .from('inventory_stock_ledger')
          .insert({
            store_id: sourceStoreId,
            item_id: t.item.id,
            transaction_type: 'STOCKOUT',
            ref_type: 'STOCK TRANSFER',
            ref_doc_no: transferNo,
            ref_doc_date: new Date().toISOString(),
            stock_in_quantity: 0,
            stock_out_quantity: t.transferQty,
            closing_stock: newSrcStock,
            closing_stock_rate: currentSrcRate,
            closing_stock_value: newSrcStock * currentSrcRate,
            currency: 'SAR',
            batch_no: t.selectedBatch,
            expiry_date: t.expiryDate || null
          })
          .select('id')
          .single();

        if (stockoutErr) throw stockoutErr;
        const sourceLedgerId = stockoutData?.id;

        // --- 2. POST STOCKIN FOR DESTINATION SUB STORE ---
        // 2a. Mathematically sum the ledger to get deterministic current stock balance
        const { data: sumDestData } = await supabase
          .from('inventory_stock_ledger')
          .select('stock_in_quantity, stock_out_quantity')
          .eq('store_id', destStoreId)
          .eq('item_id', t.item.id);

        const currentDestStock = (sumDestData || []).reduce(
          (acc, row) => acc + (Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0)),
          0
        );

        // 2b. Fetch last WAC rate for destination
        const { data: destRateData } = await supabase
          .from('inventory_stock_ledger')
          .select('closing_stock_rate')
          .eq('store_id', destStoreId)
          .eq('item_id', t.item.id)
          .order('created_at', { ascending: false })
          .order('ref_doc_date', { ascending: false })
          .limit(1);

        const currentDestRate = destRateData && destRateData.length > 0 ? Number(destRateData[0].closing_stock_rate || 0) : 0;

        const newDestStock = currentDestStock + t.transferQty;

        // Calculate WAC for destination store
        const prevValue = currentDestStock * currentDestRate;
        const incomingValue = t.transferQty * t.rate;
        const newAverageRate = newDestStock > 0 ? (prevValue + incomingValue) / newDestStock : t.rate;
        const finalDestRate = Number(newAverageRate.toFixed(2));

        const { data: stockinData, error: stockinErr } = await supabase
          .from('inventory_stock_ledger')
          .insert({
            store_id: destStoreId,
            item_id: t.item.id,
            transaction_type: 'STOCKIN',
            ref_type: 'STOCK TRANSFER',
            ref_doc_no: transferNo,
            ref_doc_date: new Date().toISOString(),
            stock_in_quantity: t.transferQty,
            stock_out_quantity: 0,
            closing_stock: newDestStock,
            closing_stock_rate: finalDestRate,
            closing_stock_value: newDestStock * finalDestRate,
            currency: 'SAR',
            batch_no: t.selectedBatch,
            expiry_date: t.expiryDate || null
          })
          .select('id')
          .single();

        if (stockinErr) throw stockinErr;
        const destinationLedgerId = stockinData?.id;

        // --- 3. CREATE STOCK TRANSFER ITEM ---
        const { error: lineErr } = await supabase
          .from('stock_transfer_items')
          .insert({
            transfer_id: transferId,
            item_id: t.item.id,
            batch_no: t.selectedBatch,
            expiry_date: t.expiryDate || null,
            quantity: t.transferQty,
            unit_id: t.item.baseUom || 'ML',
            source_ledger_id: sourceLedgerId,
            destination_ledger_id: destinationLedgerId
          });

        if (lineErr) throw lineErr;
      }

      showToast('success', `Stock Transfer ${transferNo} executed successfully.`);
      // Reset form
      setTransferItems([]);
      setSourceStoreId('');
      setDestStoreId('');
      setTransferNo('TRF-' + Date.now().toString().slice(-8));
    } catch (err: any) {
      showToast('error', `Failed to execute stock transfer: ${err.message}`);
      setTransferNo('TRF-' + Date.now().toString().slice(-8));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Configuration Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transfer Voucher #</label>
          <input 
            type="text" 
            readOnly 
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-600 outline-none"
            value={transferNo}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source Store *</label>
          <select
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={sourceStoreId}
            onChange={e => {
              setSourceStoreId(e.target.value);
              setTransferItems([]);
            }}
          >
            <option value="">Select Source Store</option>
            {activeStores.map(s => (
              <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destination Store *</label>
          <select
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={destStoreId}
            onChange={e => setDestStoreId(e.target.value)}
          >
            <option value="">Select Destination Store</option>
            {activeStores.map(s => (
              <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Items Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add Reagents to Transfer</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Reagent *</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              disabled={!sourceStoreId}
            >
              <option value="">Select Item</option>
              {inventoryItems.map(i => (
                <option key={i.id} value={i.id}>{i.itemName} ({i.itemCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Available Batch/Lot *</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={lotSelection}
              onChange={e => setLotSelection(e.target.value)}
              disabled={availableLots.length === 0}
            >
              {availableLots.length === 0 ? (
                <option value="">No batches available</option>
              ) : (
                availableLots.map((l, idx) => (
                  <option key={idx} value={JSON.stringify(l)}>
                    Batch {l.batchNo} (Qty: {l.quantity} | Exp: {l.expiryDate || 'N/A'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transfer Quantity *</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Enter Qty"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={transferQtyInput}
              onChange={e => setTransferQtyInput(e.target.value)}
            />
          </div>

          <button
            onClick={handleAddItem}
            className="h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100 transition-all"
          >
            <Plus className="w-5 h-5" /> Add Reagent
          </button>
        </div>
      </div>

      {/* Selected Items List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transfer Items List</h3>
          <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
            {transferItems.length} Reagents Mapped
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"><span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Batch Code</span></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Expiry Date</span></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Transfer Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {transferItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Add reagents from the form above to prepare the transfer.
                  </td>
                </tr>
              ) : (
                transferItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{item.item.itemCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{item.item.itemName}</td>
                    <td className="px-6 py-4"><span className="bg-amber-50 text-amber-700 font-extrabold px-2 py-0.5 rounded-lg border border-amber-100">{item.selectedBatch}</span></td>
                    <td className="px-6 py-4 text-slate-500">{item.expiryDate || 'N/A'}</td>
                    <td className="px-6 py-4 text-center font-black text-blue-700">{item.transferQty}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {transferItems.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={executeTransfer}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-400 disabled:shadow-none"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Transferring Reagents...' : 'Execute Stock Transfer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
