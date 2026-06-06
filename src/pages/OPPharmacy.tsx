import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Clock, CheckCircle, AlertCircle, Pill, 
  Calendar, User, ShoppingBag,
  Printer, Package, History, Barcode
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { BatchSelectionModal } from '../components/pharmacy/BatchSelectionModal';
import { PharmacyInvoiceReport } from '../components/pharmacy/PharmacyInvoiceReport';
import { parseGS1 } from '../utils/gs1Parser';

export const OPPharmacy: React.FC = () => {
    const { 
        prescriptions, inventoryItems, patients, showToast, stores, 
        dispensePrescription, employees, bills, appointments,
        itemTaxMappings, taxMasters, fetchBatchDetails
    } = useData();
    
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    useEffect(() => {
        if (stores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(stores[0].id);
        }
    }, [stores, selectedStoreId]);

    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Dispensed'>('Pending');
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Default to last 30 days
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [selectedBatches, setSelectedBatches] = useState<Record<string, { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount: number, taxAmount?: number, baseAmount?: number }>>({});
    const [activeBatchItem, setActiveBatchItem] = useState<{ id: string, itemId: string, itemName: string, reqQty: number, unit?: string } | null>(null);
    const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);

    // Barcode scanner state
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [autoFocusScanner, setAutoFocusScanner] = useState(true);
    const [scannerFocused, setScannerFocused] = useState(false);
    const scannerInputRef = React.useRef<HTMLInputElement>(null);
    const [lastGS1Scan, setLastGS1Scan] = useState<{ gtin?: string; batch?: string; expiry?: string } | null>(null);

    // Auto-focus barcode scanner
    useEffect(() => {
        if (autoFocusScanner && scannerInputRef.current) {
            scannerInputRef.current.focus();
        }
    }, [selectedPrescriptionId, autoFocusScanner]);

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

    const selectedPrescription = useMemo(() => 
        prescriptions.find(p => p.id === selectedPrescriptionId), 
    [prescriptions, selectedPrescriptionId]);

    useEffect(() => {
        // Clear batches when prescription changes
        setSelectedBatches({});
    }, [selectedPrescriptionId]);

    const patient = useMemo(() =>  
        selectedPrescription ? patients.find(pat => pat.id === selectedPrescription.patientId) : null,
    [selectedPrescription, patients]);

    const filteredPrescriptions = useMemo(() => {
        return prescriptions.filter(p => {
            // 1. Robust Search Match
            const pat = patients.find(pat => pat.id === p.patientId);
            const patName = pat ? `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase() : '';
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                                p.id.toLowerCase().includes(query) || 
                                patName.includes(query);
            
            // 2. Robust Status Match
            const status = (p.status || '').toLowerCase().trim();
            const filterValue = (statusFilter || 'Pending').toLowerCase();
            const matchesStatus = filterValue === 'all' || 
                                (filterValue === 'pending' && (status === 'pending' || status === 'partially dispensed')) ||
                                (filterValue === 'dispensed' && (status === 'dispensed' || status === 'partially dispensed'));
            
            // 3. Robust Date Range Match (Handles both "T" and space separators)
            if (!p.orderDate) return false;
            const orderDateStr = p.orderDate.substring(0, 10); // Safely get YYYY-MM-DD
            const matchesDate = (!fromDate || orderDateStr >= fromDate) && 
                                (!toDate || orderDateStr <= toDate);

            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a, b) => {
            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [prescriptions, searchQuery, statusFilter, patients, fromDate, toDate]);

    const handleDispenseItem = (itemId: string, itemRecId: string, itemName: string, reqQty: number, unit?: string) => {
        if (!selectedStoreId) {
            showToast('error', 'Please select a store first.');
            return;
        }
        setActiveBatchItem({ id: itemRecId, itemId, itemName, reqQty, unit });
    };

    const handleBatchSelected = (batchInfo: any) => {
        if (activeBatchItem) {
            setSelectedBatches(prev => ({ ...prev, [activeBatchItem.id]: batchInfo }));
        }
        setActiveBatchItem(null);
    };

    const handleBarcodeScan = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = barcodeQuery.trim();
        if (!query) return;

        if (!selectedStoreId) {
            showToast('error', 'Please select a store first.');
            setBarcodeQuery('');
            return;
        }

        if (!selectedPrescription) {
            showToast('error', 'Please select a prescription order first.');
            setBarcodeQuery('');
            return;
        }

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

        // Find item matching scanned code (GTIN or itemCode)
        // Clean leading zeros from GTIN for robust comparison
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

        if (!matchedItem) {
            showToast('error', `No active item found matching barcode/code "${query}".`);
            setLastGS1Scan(null);
            setBarcodeQuery('');
            return;
        }

        // Find prescription item in pending state
        const prescItem = selectedPrescription.items.find(
            item => item.itemId === matchedItem.id && item.status !== 'Dispensed'
        );

        if (!prescItem) {
            showToast(
                'error',
                `Item "${matchedItem.itemName}" is not part of this pending prescription.`
            );
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

        // Fetch batches
        const batches = await fetchBatchDetails(selectedStoreId, matchedItem.id);

        // Sort by expiry (FIFO)
        const sortedBatches = [...batches].sort((a, b) => {
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });

        // Conversion factors
        const isSalesUom = prescItem.units?.toUpperCase() === matchedItem.salesUom?.toUpperCase();
        const salesCF = isSalesUom ? Number(matchedItem.salesConversionFactor || 1) : 1;
        const baseQtyRequired = prescItem.totalQty * salesCF;

        // Try to match parsed GS1 batch number first
        let chosenBatch = null;
        let matchedByGS1Batch = false;

        if (searchBatchNo) {
            chosenBatch = sortedBatches.find(
                b => b.batchNo.toLowerCase() === searchBatchNo.toLowerCase() && b.currentStock >= baseQtyRequired
            );
            if (chosenBatch) {
                matchedByGS1Batch = true;
            } else {
                const batchExists = sortedBatches.some(b => b.batchNo.toLowerCase() === searchBatchNo.toLowerCase());
                if (batchExists) {
                    showToast('info', `Parsed batch "${searchBatchNo}" has insufficient stock in store. Selecting FIFO batch.`);
                } else {
                    showToast('info', `Parsed batch "${searchBatchNo}" not found in stock. Selecting FIFO batch.`);
                }
            }
        }

        // Fallback to FIFO
        if (!chosenBatch) {
            chosenBatch = sortedBatches.find(b => b.currentStock >= baseQtyRequired);
        }

        if (!chosenBatch) {
            showToast(
                'error',
                `Insufficient stock for "${matchedItem.itemName}". Required: ${baseQtyRequired} in store.`
            );
            setBarcodeQuery('');
            return;
        }

        // Tax calculation
        const itemMapping = itemTaxMappings.find(m => m.itemId === matchedItem.id);
        const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
        const taxPercent = taxMaster?.percentage || 0;

        const total = Number((chosenBatch.rate * baseQtyRequired).toFixed(2));
        const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(2));
        const baseAmount = Number((total - taxAmt).toFixed(2));

        setSelectedBatches(prev => ({
            ...prev,
            [prescItem.id]: {
                batchNo: chosenBatch.batchNo,
                rate: chosenBatch.rate,
                batchDate: chosenBatch.batchDate,
                expiryDate: chosenBatch.expiryDate,
                baseAmount: baseAmount,
                taxAmount: taxAmt,
                amount: total
            }
        }));

        const successMessage = matchedByGS1Batch 
            ? `Successfully matched Batch "${chosenBatch.batchNo}" for "${matchedItem.itemName}"`
            : `Auto-selected FIFO Batch "${chosenBatch.batchNo}" for "${matchedItem.itemName}"`;

        showToast('success', successMessage);
        setBarcodeQuery('');
    };

    const handleFinalDispense = async () => {
        if (!selectedPrescription || !selectedStoreId) return;
        
        // Ensure all pending items have a batch selected
        const pendingItems = selectedPrescription.items.filter(i => i.status !== 'Dispensed');
        if (pendingItems.length > 0 && Object.keys(selectedBatches).length === 0) {
            showToast('error', 'Please select batches for the items before dispensing.');
            return;
        }

        const result = await dispensePrescription(selectedPrescription.id, selectedStoreId, selectedBatches);
        if (result.success) {
            setSelectedBatches({});
            if (result.invoiceId) {
                setGeneratedInvoiceId(result.invoiceId);
            }
        }
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Sidebar - Prescriptions List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-blue-600" /> 
                        {statusFilter === 'All' ? 'All Orders' : statusFilter === 'Dispensed' ? 'Dispensed Orders' : 'Pending Orders'}
                    </h2>
                    
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 mb-1">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-tighter">From Date</label>
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="w-full p-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-tighter">To Date</label>
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="w-full p-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-600"
                                />
                            </div>
                        </div>
                        <select 
                            className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                        >
                            <option value="">Select Dispensary Store...</option>
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.storeName}</option>
                            ))}
                        </select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search Patient/Order..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['Pending', 'Dispensed', 'All'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${statusFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                            {filteredPrescriptions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic text-sm">
                            No prescriptions found in this view.
                        </div>
                    ) : (
                        filteredPrescriptions.map(p => {
                            const pat = patients.find(pat => pat.id === p.patientId);
                            const isActive = selectedPrescriptionId === p.id;
                            return (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedPrescriptionId(p.id)}
                                    className={`w-full text-left p-4 border-b border-slate-50 transition-all hover:bg-blue-50/50 group ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded uppercase">PR-{p.id.slice(-6)}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{new Date(p.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm truncate">{pat?.firstName} {pat?.lastName}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                            p.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-700' : 
                                            p.status === 'Partially Dispensed' ? 'bg-indigo-100 text-indigo-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {p.status}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">{p.items.length} Items</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Content - Dispensing Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedPrescription ? (
                    <>
                        {/* Selected Order Header */}
                        <div className="bg-white p-6 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <User className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-xl font-black text-slate-800">{patient?.firstName} {patient?.lastName}</h1>
                                        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest">PID: {patient?.id.slice(-8)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Order: {new Date(selectedPrescription.orderDate).toLocaleString()}</span>
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                        <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Ordered by: {selectedPrescription.doctorName}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedPrescription.status === 'Dispensed' && (
                                    <button 
                                        onClick={() => {
                                            // 1. Try direct link
                                            let bill = bills.find(b => b.prescriptionId === selectedPrescription.id);
                                            
                                            // 2. Fallback for older data: match by patient and pharmacy flag
                                            if (!bill) {
                                                bill = bills.find(b => b.isPharmacy && b.patientId === selectedPrescription.patientId);
                                            }

                                            if (bill) setGeneratedInvoiceId(bill.id);
                                            else showToast('info', 'No invoice found for this dispensed order.');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                        title="Reprint Invoice"
                                    >
                                        <Printer className="w-4 h-4" /> Print Invoice
                                    </button>
                                )}
                                <button className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all" title="Print Prescription">
                                    <Printer className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleFinalDispense}
                                    disabled={selectedPrescription.status === 'Dispensed' || Object.keys(selectedBatches).length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    <CheckCircle className="w-5 h-5" /> Confirm Dispensing
                                </button>
                            </div>
                        </div>

                        {/* Barcode Scanner Bar */}
                        <div className="px-6 py-3 bg-slate-100/50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
                            <div className="flex items-center justify-between gap-4">
                                <form onSubmit={handleBarcodeScan} className="flex-1 max-w-md">
                                    <div className="relative group">
                                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
                                        <input
                                            ref={scannerInputRef}
                                            id="op-pharmacy-barcode-input"
                                            type="text"
                                            className="w-full pl-9 pr-24 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium transition-all"
                                            placeholder="Scan drug barcode (GTIN) or item code..."
                                            value={barcodeQuery}
                                            onChange={e => setBarcodeQuery(e.target.value)}
                                            onFocus={() => setScannerFocused(true)}
                                            onBlur={() => setScannerFocused(false)}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
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
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={autoFocusScanner}
                                            onChange={e => setAutoFocusScanner(e.target.checked)}
                                        />
                                        <span className="text-xs font-semibold text-slate-500">Auto-Focus Scanner</span>
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

                        {/* Order Items Table */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 bg-slate-50/50">#</th>
                                            <th className="p-4">Drug Information</th>
                                            <th className="p-4 text-center">Dosage / Frequency</th>
                                            <th className="p-4 text-center w-32">Req. Qty</th>
                                            <th className="p-4">Stock Status</th>
                                            <th className="p-4 text-center">Batch / Dispense</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedPrescription.items.map((item, idx) => {
                                            const invItem = inventoryItems.find(i => i.id === item.itemId);
                                            const totalStock = invItem?.stock?.reusableCount || 0;
                                            const hasStock = totalStock >= item.totalQty;

                                            return (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-slate-300 font-black">{idx + 1}</td>
                                                    <td className="p-4">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{item.itemName}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.genericName}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] mb-1">{item.dose} {item.units}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.frequency}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="font-black text-slate-700 text-lg">{item.totalQty}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase">Days: {item.noDays}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${hasStock ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                                <span className={`font-bold text-xs ${hasStock ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {hasStock ? 'Available' : 'Low Stock'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-bold">Total Physical: {totalStock}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {selectedPrescription.status === 'Dispensed' || item.status === 'Dispensed' ? (
                                                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Dispensed
                                                                </span>
                                                            ) : selectedBatches[item.id] ? (
                                                                <button 
                                                                    onClick={() => handleDispenseItem(item.itemId, item.id, item.itemName || 'Unknown', item.totalQty, item.units)}
                                                                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition-colors border border-blue-200"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Batch {selectedBatches[item.id].batchNo}
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleDispenseItem(item.itemId, item.id, item.itemName || 'Unknown', item.totalQty, item.units)}
                                                                    className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                                                >
                                                                    <Package className="w-4 h-4" /> Select Batch
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Remarks / Interactions Section */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                    <h3 className="text-amber-800 font-bold text-sm mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Doctor Instructions
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedPrescription.items.map(item => item.drugInstruction && (
                                            <div key={item.id} className="bg-white/60 p-3 rounded-xl border border-amber-200 shadow-sm">
                                                <p className="text-[10px] font-black text-amber-900 uppercase mb-1">{item.itemName}</p>
                                                <p className="text-xs text-amber-700 leading-relaxed font-medium italic">"{item.drugInstruction}"</p>
                                            </div>
                                        ))}
                                        {!selectedPrescription.items.some(i => i.drugInstruction) && (
                                            <p className="text-xs text-amber-600 italic">No specific handling instructions provided.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                    <h3 className="text-blue-800 font-bold text-sm mb-4 flex items-center gap-2">
                                        <History className="w-4 h-4" /> dispensing history
                                    </h3>
                                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                                        <ShoppingCart className="w-12 h-12 text-blue-300 mb-2" />
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">No previous dispensing history found</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dispensing Footer / Summary */}
                        <div className="bg-white p-6 border-t border-slate-200 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-12">
                                <div className="flex items-center gap-10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tax Amount</span>
                                        <span className="text-sm font-bold text-slate-500">
                                            SAR {selectedPrescription.status === 'Dispensed' 
                                                ? (selectedPrescription.taxAmount || 0).toFixed(2)
                                                : Object.values(selectedBatches).reduce((sum, b) => sum + (b.taxAmount || 0), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Billable</span>
                                        <span className="text-2xl font-black text-slate-800">
                                            SAR {selectedPrescription.status === 'Dispensed' 
                                                ? selectedPrescription.totalAmount.toFixed(2)
                                                : Object.values(selectedBatches).reduce((sum, b) => sum + (b.amount || 0), 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Items Status</span>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">All Items Available</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">
                                    Hold Order
                                </button>
                                <button className="px-6 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-all">
                                    Reject Presc.
                                </button>
                                <button 
                                    onClick={handleFinalDispense}
                                    disabled={selectedPrescription.status === 'Dispensed' || Object.keys(selectedBatches).length === 0}
                                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-xl text-sm shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                >
                                    Dispense & Print Label
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-500">
                        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Pill className="w-16 h-16 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-600">Select an Order to Dispense</h2>
                        <p className="text-sm">Click on a pending prescription from the left sidebar to start processing.</p>
                    </div>
                )}
            </div>

            {activeBatchItem && (
                <BatchSelectionModal 
                    itemId={activeBatchItem.itemId}
                    itemName={activeBatchItem.itemName}
                    requiredQty={activeBatchItem.reqQty}
                    unit={activeBatchItem.unit}
                    storeId={selectedStoreId}
                    onClose={() => setActiveBatchItem(null)}
                    onSelect={handleBatchSelected}
                />
            )}

            {generatedInvoiceId && bills.find(b => b.id === generatedInvoiceId) && (
                <PharmacyInvoiceReport 
                    bill={bills.find(b => b.id === generatedInvoiceId)!}
                    patient={patients.find(p => p.id === (bills.find(b => b.id === generatedInvoiceId)?.patientId || selectedPrescription?.patientId))}
                    doctor={(() => {
                        const bill = bills.find(b => b.id === generatedInvoiceId);
                        const docId = bill?.doctorId || 
                                     selectedPrescription?.doctorId || 
                                     appointments.find(a => a.id === bill?.appointmentId)?.doctorId;
                        return employees.find(e => e.id === docId);
                    })()}
                    onClose={() => setGeneratedInvoiceId(null)}
                />
            )}
        </div>
    );
};

// Internal icon proxy for shopping cart
const ShoppingCart = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);
