import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { 
  ShoppingCart, Plus, Trash2, Search, Save, 
  User, Store, Pill, Calendar, Globe, Hash,
  AlertCircle, Barcode
} from 'lucide-react';
import { DirectSale as DirectSaleType, DirectSaleItem } from '../../types';
import { parseGS1 } from '../../utils/gs1Parser';

const INITIAL_PATIENT = {
  firstName: '',
  middleName: '',
  lastName: '',
  phoneNo: '',
  externalNo: 'CASH',
  dob: '',
  age: 0,
  ageUnit: 'Years',
  gender: '',
  referredDoctor: '',
  licenseNo: '',
  nationality: 'SAUDI',
  isInsured: false,
  isNewExternalPatient: true
};

export const DirectSale: React.FC = () => {
  const { stores, inventoryItems, storeItemMappings, saveDirectSale, fetchBatchDetails, itemTaxMappings, taxMasters } = useData();
  
  const [patient, setPatient] = useState(INITIAL_PATIENT);
  const [selectedStore, setSelectedStore] = useState('');
  const [items, setItems] = useState<DirectSaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scanner state
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [autoFocusScanner, setAutoFocusScanner] = useState(true);
  const [incrementOnRescan, setIncrementOnRescan] = useState(true);
  const [scannerFocused, setScannerFocused] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [lastGS1Scan, setLastGS1Scan] = useState<{ gtin?: string; batch?: string; expiry?: string } | null>(null);

  // Search references for items
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [itemQuery, setItemQuery] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);

  // Batch data for each row
  const [rowBatches, setRowBatches] = useState<Record<number, any[]>>({});

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus barcode scanner
  useEffect(() => {
    if (autoFocusScanner && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [selectedStore, items.length, autoFocusScanner]);

  // Global blur listener to restore focus to scanner if checked
  useEffect(() => {
    if (!autoFocusScanner) return;
    const handleBlur = (e: FocusEvent) => {
      const target = e.relatedTarget as HTMLElement;
      if (
        scannerInputRef.current &&
        (!target ||
          (target.tagName !== 'INPUT' &&
            target.tagName !== 'SELECT' &&
            target.tagName !== 'TEXTAREA'))
      ) {
        setTimeout(() => {
          if (scannerInputRef.current) {
            scannerInputRef.current.focus();
          }
        }, 150);
      }
    };
    document.addEventListener('focusout', handleBlur);
    return () => document.removeEventListener('focusout', handleBlur);
  }, [autoFocusScanner]);

  const addItemRow = () => {
    const newItem: DirectSaleItem = {
      itemId: '',
      itemCode: '',
      itemName: '',
      batchNo: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setItems([...items, newItem]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    const newRowBatches = { ...rowBatches };
    delete newRowBatches[index];
    setRowBatches(newRowBatches);
  };

  const handleSelectItem = async (index: number, item: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      batchNo: '', // Reset batch
      unit: item.salesUom || item.baseUom || 'EACH', // Default to sales UOM if configured
      unitPrice: 0,
      totalPrice: 0
    };
    setItems(newItems);
    setShowItemDropdown(false);
    setItemQuery('');
    setActiveSearchIndex(null);

    // Fetch batches if store is selected
    if (selectedStore) {
      const batches = await fetchBatchDetails(selectedStore, item.id);
      setRowBatches(prev => ({ ...prev, [index]: batches }));
    }
  };

  const handleSelectBatch = (index: number, batchNo: string) => {
    const batchData = rowBatches[index]?.find(b => b.batchNo === batchNo);
    if (!batchData) return;

    const newItems = [...items];
    const itemDef = inventoryItems.find(inv => inv.id === newItems[index].itemId);
    const isSalesUom = newItems[index].unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
    const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

    const mapping = itemTaxMappings.find(m => m.itemId === newItems[index].itemId);
    const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
    const taxPercent = tax?.percentage || 0;

    const unitPrice = batchData.mrp * salesCF;
    const totalPrice = Number((unitPrice * newItems[index].quantity).toFixed(2));

    newItems[index] = {
      ...newItems[index],
      batchNo: batchNo,
      batchDate: batchData.batchDate,
      unitPrice: unitPrice,
      costRate: batchData.rate,
      expiryDate: batchData.expiryDate,
      totalPrice: totalPrice
    };
    setItems(newItems);
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeQuery.trim();
    if (!query) return;

    if (!selectedStore) {
      setError('Please select a store first.');
      setBarcodeQuery('');
      return;
    }

    setError('');
    console.log("GS1 Debug - Scanned Query:", query);
    console.log("GS1 Debug - Parsed GS1 (JSON):", JSON.stringify(parseGS1(query)));
    console.log("GS1 Debug - Database Inventory Items (JSON):", JSON.stringify(inventoryItems.map(i => ({ code: i.itemCode, name: i.itemName, gtin: i.gtin }))));

    // Parse query with GS1 parser
    const parsedGS1 = parseGS1(query);
    const hasParsedGtin = !!parsedGS1.gtin;
    const searchGtin = parsedGS1.gtin || query;
    const searchBatchNo = parsedGS1.batch;

    // A query is considered a valid standard barcode if:
    // - it was successfully parsed by GS1 (meaning it had AI 01/02 and a 14-digit GTIN)
    // - OR if it is a standard EAN/UPC/GS1 numeric barcode: strictly numeric with length between 8 and 14 digits.
    const isStandardBarcode = hasParsedGtin || (/^\d+$/.test(query) && query.length >= 8 && query.length <= 14);

    // Find item matching GTIN or Item Code
    const cleanQuery = searchGtin.replace(/^0+/, '');
    const matchedItem = inventoryItems.find(
      i => {
        if (i.isActive === false) return false;

        // 1. Check direct item code match (case-insensitive)
        if (i.itemCode?.toLowerCase() === query.toLowerCase() || i.itemCode?.toLowerCase() === searchGtin.toLowerCase()) {
          return true;
        }

        // 2. Check GTIN match (ONLY if the scanned query is a valid standard barcode format)
        if (isStandardBarcode && i.gtin) {
          const cleanItemGtin = i.gtin.replace(/^0+/, '');
          if (cleanItemGtin === cleanQuery) {
            return true;
          }
        }

        return false;
      }
    );

    if (matchedItem) {
      // Verify store item mapping
      const isMapped = storeItemMappings.some(
        m => m.storeId === selectedStore && m.itemId === matchedItem.id
      );
      if (!isMapped) {
        setError(`Item "${matchedItem.itemName}" is not mapped to the selected store.`);
        setLastGS1Scan(null);
        setBarcodeQuery('');
        return;
      }

      // Set last GS1 scan state for UI display if GS1 data parsed successfully and contains batch/expiry info
      if (parsedGS1.gtin && (parsedGS1.batch || parsedGS1.expiry)) {
        setLastGS1Scan({
          gtin: parsedGS1.gtin,
          batch: parsedGS1.batch,
          expiry: parsedGS1.expiry
        });
      } else {
        setLastGS1Scan(null);
      }

      // Check if item is already present in current list
      const existingIndex = items.findIndex(item => item.itemId === matchedItem.id);
      if (existingIndex > -1 && incrementOnRescan) {
        // Increment quantity
        updateItemQty(existingIndex, items[existingIndex].quantity + 1);
        setBarcodeQuery('');
        return;
      }

      // Fetch batches
      const batches = await fetchBatchDetails(selectedStore, matchedItem.id);
      
      // Auto-select FIFO batch (first batch with stock, or first batch if all empty)
      const sortedBatches = [...batches].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });

      // Try to match parsed GS1 batch number first
      let activeBatch = null;
      if (searchBatchNo) {
        activeBatch = sortedBatches.find(
          b => b.batchNo.toLowerCase() === searchBatchNo.toLowerCase() && b.currentStock > 0
        );
        if (!activeBatch) {
          const batchExists = sortedBatches.some(b => b.batchNo.toLowerCase() === searchBatchNo.toLowerCase());
          if (batchExists) {
            setError(`Parsed batch "${searchBatchNo}" has no stock. Selecting FIFO batch.`);
          } else {
            setError(`Parsed batch "${searchBatchNo}" not found. Selecting FIFO batch.`);
          }
        }
      }

      if (!activeBatch) {
        activeBatch = sortedBatches.find(b => b.currentStock > 0) || sortedBatches[0];
      }

      const batchNo = activeBatch ? activeBatch.batchNo : '';

      // Find an empty row or append
      const emptyRowIndex = items.findIndex(item => !item.itemId);
      const targetIndex = emptyRowIndex > -1 ? emptyRowIndex : items.length;

      const newItem: DirectSaleItem = {
        itemId: matchedItem.id,
        itemCode: matchedItem.itemCode,
        itemName: matchedItem.itemName,
        batchNo: batchNo,
        quantity: 1,
        unit: matchedItem.salesUom || matchedItem.baseUom || 'EACH',
        unitPrice: 0,
        totalPrice: 0
      };

      let updatedItems = [...items];
      if (emptyRowIndex > -1) {
        updatedItems[emptyRowIndex] = newItem;
      } else {
        updatedItems.push(newItem);
      }

      setRowBatches(prev => ({ ...prev, [targetIndex]: batches }));

      if (activeBatch) {
        const isSalesUom = newItem.unit?.toUpperCase() === matchedItem.salesUom?.toUpperCase();
        const salesCF = isSalesUom ? Number(matchedItem.salesConversionFactor || 1) : 1;

        const mapping = itemTaxMappings.find(m => m.itemId === matchedItem.id);
        const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
        const taxPercent = tax?.percentage || 0;

        const unitPrice = activeBatch.mrp * salesCF;
        const totalPrice = Number((unitPrice * 1).toFixed(2));

        updatedItems[targetIndex] = {
          ...newItem,
          batchNo: batchNo,
          batchDate: activeBatch.batchDate,
          unitPrice: unitPrice,
          costRate: activeBatch.rate,
          expiryDate: activeBatch.expiryDate,
          totalPrice: totalPrice
        };
      }
      setItems(updatedItems);
      setActiveSearchIndex(null);
      setItemQuery('');
      setShowItemDropdown(false);
    } else {
      // Check if it's a batch number scanned directly for any item already selected
      let batchMatched = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.itemId && !item.batchNo) {
          const batches = rowBatches[i] || [];
          const foundBatch = batches.find(b => b.batchNo === query);
          if (foundBatch) {
            handleSelectBatch(i, query);
            batchMatched = true;
            break;
          }
        }
      }

      if (!batchMatched) {
        setError(`No active item matches barcode/code "${query}".`);
      }
      setLastGS1Scan(null);
    }

    setBarcodeQuery('');
  };

  const handleSelectUom = (index: number, unit: string) => {
    const newItems = [...items];
    const itemDef = inventoryItems.find(inv => inv.id === newItems[index].itemId);
    const isSalesUom = unit.toUpperCase() === itemDef?.salesUom?.toUpperCase();
    const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

    const batchData = rowBatches[index]?.find(b => b.batchNo === newItems[index].batchNo);
    const baseRate = batchData ? batchData.mrp : 0;
    const unitPrice = baseRate * salesCF;

    const mapping = itemTaxMappings.find(m => m.itemId === newItems[index].itemId);
    const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
    const taxPercent = tax?.percentage || 0;

    const totalPrice = Number((newItems[index].quantity * unitPrice).toFixed(2));

    newItems[index] = {
      ...newItems[index],
      unit: unit,
      unitPrice: unitPrice,
      totalPrice: totalPrice
    };
    setItems(newItems);
  };

  const updateItemQty = (index: number, qty: number) => {
    const newItems = [...items];
    const mapping = itemTaxMappings.find(m => m.itemId === newItems[index].itemId);
    const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
    const taxPercent = tax?.percentage || 0;
    const totalPrice = Number((qty * newItems[index].unitPrice).toFixed(2));

    newItems[index] = {
      ...newItems[index],
      quantity: qty,
      totalPrice: totalPrice
    };
    setItems(newItems);
  };

    const totalSaleAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalTaxAmount = items.reduce((sum, item) => {
        const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
        const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
        if (tax && item.unitPrice > 0) {
            const totalPrice = item.quantity * item.unitPrice;
            const taxAmount = totalPrice * tax.percentage / (100 + tax.percentage);
            return sum + taxAmount;
        }
        return sum;
    }, 0);

  const handleDispense = async () => {
    if (!patient.firstName) { setError('First name is required.'); return; }
    if (!selectedStore) { setError('Please select a store.'); return; }
    if (items.length === 0) { setError('Please add at least one item.'); return; }
    if (items.some(i => !i.itemId || !i.batchNo || i.quantity <= 0)) { setError('Please complete all item details.'); return; }

    setLoading(true);
    setError('');

    const saleNo = `DSALE-${Date.now().toString().slice(-6)}`;
    const salePayload: DirectSaleType = {
      ...patient,
      saleNo,
      saleDate: new Date().toISOString(),
      storeId: selectedStore,
      totalAmount: totalSaleAmount,
      items: items
    };

    const success = await saveDirectSale(salePayload);
    if (success) {
      // Reset form
      setPatient(INITIAL_PATIENT);
      setSelectedStore('');
      setItems([]);
      setRowBatches({});
    }
    setLoading(false);
  };

  // Filter items by store mapping and query
  const mappedItemIds = new Set(storeItemMappings.filter(m => m.storeId === selectedStore).map(m => m.itemId));
  const itemOptions = inventoryItems.filter(i => 
    i.isActive !== false && 
    mappedItemIds.has(i.id) &&
    (i.itemCode.toLowerCase().includes(itemQuery.toLowerCase()) || 
     i.itemName.toLowerCase().includes(itemQuery.toLowerCase()))
  ).slice(0, 10);


  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Pharmacy Direct Sale</h1>
            <p className="text-xs text-slate-400">Issue drugs to external or cash patients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleDispense}
             disabled={loading}
             className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
           >
             {loading ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Confirm Dispense
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Patient Details Selection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-violet-500" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Information</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={patient.isNewExternalPatient}
                onChange={e => setPatient({...patient, isNewExternalPatient: e.target.checked})}
              />
              <span className="text-[11px] font-semibold text-slate-600">New External Patient</span>
            </label>
          </div>
          
          <div className="p-4 grid grid-cols-4 gap-x-4 gap-y-3">
            {/* Row 1 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">First Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                placeholder="Required"
                value={patient.firstName}
                onChange={e => setPatient({...patient, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Middle Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.middleName}
                onChange={e => setPatient({...patient, middleName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Last Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.lastName}
                onChange={e => setPatient({...patient, lastName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Phone No.</label>
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                  value={patient.phoneNo}
                  onChange={e => setPatient({...patient, phoneNo: e.target.value})}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">External No. (ID)</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.externalNo}
                onChange={e => setPatient({...patient, externalNo: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">DOB (dd-MM-YYYY)</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none italic text-slate-500"
                  value={patient.dob}
                  onChange={e => setPatient({...patient, dob: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Age</label>
              <div className="flex gap-1">
                <input 
                  type="number" 
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                  value={patient.age || ''}
                  onChange={e => setPatient({...patient, age: Number(e.target.value)})}
                />
                <select 
                  className="w-24 px-1 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-violet-500 outline-none"
                  value={patient.ageUnit}
                  onChange={e => setPatient({...patient, ageUnit: e.target.value})}
                >
                  <option>Years</option>
                  <option>Months</option>
                  <option>Days</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
              <select 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.gender}
                onChange={e => setPatient({...patient, gender: e.target.value})}
              >
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Row 3 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Referred Doctor</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.referredDoctor}
                onChange={e => setPatient({...patient, referredDoctor: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">License No</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                value={patient.licenseNo}
                onChange={e => setPatient({...patient, licenseNo: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase text-slate-500">Nationality</label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none"
                  value={patient.nationality}
                  onChange={e => setPatient({...patient, nationality: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={patient.isInsured}
                  onChange={e => setPatient({...patient, isInsured: e.target.checked})}
                />
                <span className="text-xs font-semibold text-slate-700">Insured Patent?</span>
              </label>
            </div>
          </div>
        </div>

        {/* Store & Items Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <Store className="w-4 h-4 text-violet-500" />
                 <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sale Details</h2>
               </div>
               <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Dispensing Store:</span>
                 <select 
                   className="text-xs font-bold text-violet-700 bg-transparent outline-none cursor-pointer"
                   value={selectedStore}
                   onChange={e => { setSelectedStore(e.target.value); setItems([]); setRowBatches({}); }}
                 >
                   <option value="">-- Select Store --</option>
                   {stores.filter(s => s.isActive).map(s => (
                     <option key={s.id} value={s.id}>{s.storeName}</option>
                   ))}
                 </select>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-right flex gap-6 items-center border-r border-slate-100 pr-6 mr-6">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Total Tax</p>
                    <p className="text-sm font-bold text-slate-500 leading-none">SAR {totalTaxAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Total Payable</p>
                    <p className="text-lg font-black text-violet-600 leading-none">SAR {totalSaleAmount.toFixed(2)}</p>
                  </div>
               </div>
               <button 
                 onClick={addItemRow}
                 disabled={!selectedStore}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-40"
               >
                 <Plus className="w-3.5 h-3.5" /> Add Drug Row
               </button>
            </div>
          </div>

          {/* Barcode Scanner Bar */}
          {selectedStore && (
            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <form onSubmit={handleBarcodeScan} className="flex-1 max-w-md">
                  <div className="relative group">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 group-hover:text-violet-600 transition-colors" />
                    <input
                      ref={scannerInputRef}
                      id="direct-sale-barcode-input"
                      type="text"
                      className="w-full pl-9 pr-24 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500 bg-white placeholder-slate-400 font-medium"
                      placeholder="Scan drug barcode (GTIN) or item code..."
                      value={barcodeQuery}
                      onChange={e => setBarcodeQuery(e.target.value)}
                      onFocus={() => setScannerFocused(true)}
                      onBlur={() => setScannerFocused(false)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${scannerFocused ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        {scannerFocused ? 'Ready' : 'Click to Scan'}
                      </span>
                    </div>
                  </div>
                </form>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3 h-3 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={autoFocusScanner}
                      onChange={e => setAutoFocusScanner(e.target.checked)}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">Auto-Focus</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3 h-3 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={incrementOnRescan}
                      onChange={e => setIncrementOnRescan(e.target.checked)}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">Increment Qty on Rescan</span>
                  </label>
                </div>
              </div>

              {lastGS1Scan && (
                <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 flex items-center gap-4 max-w-md animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded text-[9px]">GS1 Parsed</span>
                  {lastGS1Scan.gtin && (
                    <span>GTIN: <span className="font-bold text-emerald-900">{lastGS1Scan.gtin}</span></span>
                  )}
                  {lastGS1Scan.batch && (
                    <span>Batch: <span className="font-bold text-emerald-900">{lastGS1Scan.batch}</span></span>
                  )}
                  {lastGS1Scan.expiry && (
                    <span>Expiry: <span className="font-bold text-emerald-900">{lastGS1Scan.expiry}</span></span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setLastGS1Scan(null)} 
                    className="ml-auto hover:text-emerald-950 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto">
             <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                   <tr>
                      <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">#</th>
                      <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase text-[10px] w-1/3">Drug / Description</th>
                      <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">UOM</th>
                      <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Batch No.</th>
                      <th className="px-4 py-2 text-center font-bold text-slate-500 uppercase text-[10px]">Available</th>
                      <th className="px-4 py-2 text-center font-bold text-slate-500 uppercase text-[10px] w-20">Qty</th>
                      <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Unit MRP</th>
                      <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Tax</th>
                      <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Subtotal</th>
                      <th className="px-4 py-2 text-center font-bold text-slate-500 uppercase text-[10px]"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {items.length === 0 ? (
                     <tr>
                        <td colSpan={10} className="py-20 text-center">
                           <div className="flex flex-col items-center gap-2 text-slate-300">
                             <Pill className="w-10 h-10 opacity-20" />
                             <p className="font-medium text-xs">No drugs added. Select a store and click "Add Drug Row".</p>
                           </div>
                        </td>
                     </tr>
                   ) : items.map((item, idx) => (
                     <tr key={idx} className="hover:bg-violet-50/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                           <div className="relative" ref={idx === activeSearchIndex ? itemSearchRef : null}>
                              <div className="relative group">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 transition-colors" />
                                <input 
                                  type="text" 
                                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-500 outline-none"
                                  placeholder="Search drug name or code…"
                                  value={idx === activeSearchIndex ? itemQuery : item.itemName ? `${item.itemName} (${item.itemCode})` : ''}
                                  onFocus={() => { setActiveSearchIndex(idx); setItemQuery(''); setShowItemDropdown(true); }}
                                  onChange={e => { setItemQuery(e.target.value); setShowItemDropdown(true); }}
                                />
                              </div>
                              {showItemDropdown && activeSearchIndex === idx && itemQuery.length >= 1 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                   {itemOptions.length === 0 ? (
                                      <div className="p-3 text-center text-[10px] text-slate-400 italic">No matching drugs found</div>
                                   ) : itemOptions.map(opt => (
                                     <button 
                                       key={opt.id}
                                       onClick={() => handleSelectItem(idx, opt)}
                                       className="w-full text-left px-3 py-2 hover:bg-violet-50 border-b border-slate-50 last:border-0"
                                     >
                                        <p className="text-xs font-bold text-slate-800">{opt.itemName}</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase">{opt.itemCode}</span>
                                          <span className="text-[9px] text-slate-300">·</span>
                                          <span className="text-[9px] text-slate-400 uppercase font-medium">{opt.itemCategory}</span>
                                          {opt.gtin && (
                                            <>
                                              <span className="text-[9px] text-slate-300">·</span>
                                              <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">GTIN: {opt.gtin}</span>
                                            </>
                                          )}
                                        </div>
                                     </button>
                                   ))}
                                </div>
                              )}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           {(() => {
                                const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                                const options: string[] = [];
                                
                                let base = (itemDef?.baseUom || '').trim().toUpperCase();
                                let sales = (itemDef?.salesUom || '').trim().toUpperCase();
                                
                                // Sensible fallbacks if data is missing or mismatched
                                if (!base) {
                                    if (sales === 'STRIP') base = 'TABLET';
                                    else if (sales === 'BOX' || sales === 'PACK') base = 'EACH';
                                    else base = 'EACH';
                                }
                                if (!sales) {
                                    sales = base;
                                }
                                if (base === sales && Number(itemDef?.salesConversionFactor || 1) > 1) {
                                    if (sales === 'STRIP') base = 'TABLET';
                                    else if (sales === 'BOX' || sales === 'PACK') base = 'EACH';
                                    else base = 'EACH';
                                }

                                if (base) options.push(base);
                                if (sales && sales !== base) options.push(sales);
                                return (
                                    <select
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500 bg-white font-bold text-slate-700"
                                        value={item.unit || ''}
                                        disabled={!item.itemId}
                                        onChange={e => handleSelectUom(idx, e.target.value)}
                                    >
                                        {options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                );
                           })()}
                        </td>
                        <td className="px-4 py-3">
                           <select 
                             className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500 bg-white"
                             value={item.batchNo}
                             disabled={!item.itemId}
                             onChange={e => handleSelectBatch(idx, e.target.value)}
                           >
                             <option value="">-- Batch --</option>
                             {rowBatches[idx]?.map(b => (
                               <option key={b.batchNo} value={b.batchNo}>{b.batchNo} (MRP: {b.mrp})</option>
                             ))}
                           </select>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                           {item.batchNo ? (
                             (() => {
                                 const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                                 const isSalesUom = item.unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                                 const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;
                                 const rawStock = rowBatches[idx]?.find(b => b.batchNo === item.batchNo)?.currentStock || 0;
                                 const displayStock = Math.floor(rawStock / salesCF);
                                 return (
                                     <span className="text-violet-600 bg-violet-50 px-2 py-1 rounded text-[10px]">
                                         {displayStock}
                                     </span>
                                 );
                             })()
                           ) : <span className="text-slate-200">-</span>}
                        </td>
                        <td className="px-4 py-3">
                           <input 
                              type="number" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-bold outline-none focus:ring-1 focus:ring-violet-500"
                              value={item.quantity}
                              onChange={e => updateItemQty(idx, Number(e.target.value))}
                              min="1"
                           />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600 italic">
                           {item.unitPrice > 0 ? item.unitPrice.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                           {(() => {
                               const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                               const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                               if (tax && item.unitPrice > 0) {
                                   const totalPrice = item.quantity * item.unitPrice;
                                   const amt = totalPrice * tax.percentage / (100 + tax.percentage);
                                   return (
                                       <div className="flex flex-col">
                                           <span className="text-violet-600 font-bold">{amt.toFixed(2)}</span>
                                           <span className="text-[9px] text-slate-400 font-bold uppercase">({tax.percentage}%)</span>
                                       </div>
                                   );
                               }
                               return <span className="text-slate-200">0.00</span>;
                           })()}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-800">
                           {item.totalPrice > 0 ? item.totalPrice.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <button 
                             onClick={() => removeItemRow(idx)}
                             className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
           <AlertCircle className="w-4 h-4" />
           {error}
        </div>
      )}
    </div>
  );
};
