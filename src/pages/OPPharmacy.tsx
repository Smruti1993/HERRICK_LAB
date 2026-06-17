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
import { playSuccessBeep, playErrorBeep } from '../utils/audio';
import { InventoryItem } from '../types';

export const OPPharmacy: React.FC = () => {
    const { 
        prescriptions, inventoryItems, patients, showToast, stores, 
        dispensePrescription, employees, bills, appointments,
        itemTaxMappings, taxMasters, fetchBatchDetails,
        formatCurrency, selectedCurrency, saveInventoryItem
    } = useData();

    const decimals = selectedCurrency === 'BHD' ? 3 : 2;
    
    const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
        return localStorage.getItem('selected_pharmacy_store_id') || '';
    });
    useEffect(() => {
        if (stores.length > 0 && !selectedStoreId) {
            const defaultId = stores[0].id;
            setSelectedStoreId(defaultId);
            localStorage.setItem('selected_pharmacy_store_id', defaultId);
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
    const [dispensingUom, setDispensingUom] = useState<Record<string, string>>({}); // itemRecId -> selected UOM
    const [activeBatchItem, setActiveBatchItem] = useState<{ id: string, itemId: string, itemName: string, reqQty: number, unit?: string } | null>(null);
    const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);
    const [storeBatches, setStoreBatches] = useState<Record<string, any[]>>({});
    const [batchesLoading, setBatchesLoading] = useState<boolean>(false);
    const [issueQty, setIssueQty] = useState<Record<string, number>>({});

    const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
    const [referenceNo, setReferenceNo] = useState('');
    const [showUpiModal, setShowUpiModal] = useState(false);
    const [upiLink, setUpiLink] = useState('');
    const [upiOrderId, setUpiOrderId] = useState('');
    const [loading, setLoading] = useState(false);

    const getExchangeRateToINR = (code: string) => {
        switch(code) {
            case 'SAR': return 22.20;
            case 'USD': return 83.00;
            case 'BHD': return 220.00;
            case 'QAR': return 22.80;
            case 'INR': default: return 1.00;
        }
    };

    // Barcode scanner state
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [autoFocusScanner, setAutoFocusScanner] = useState(true);
    const [scannerFocused, setScannerFocused] = useState(false);
    const scannerInputRef = React.useRef<HTMLInputElement>(null);
    const [lastGS1Scan, setLastGS1Scan] = useState<{ gtin?: string; batch?: string; expiry?: string } | null>(null);

    // Unrecognized Barcode Mapping Dialog state
    const [unrecognizedScan, setUnrecognizedScan] = useState<{ gtin: string; batch?: string; expiry?: string } | null>(null);
    const [mappingItemId, setMappingItemId] = useState('');
    const [mappingSearchQuery, setMappingSearchQuery] = useState('');
    const [supervisorPin, setSupervisorPin] = useState('');
    const [pinError, setPinError] = useState('');

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
        // Clear batches and UOM selections when prescription changes
        setSelectedBatches({});
        setPaymentMode('Cash');
        setReferenceNo('');
        setShowUpiModal(false);
        setUpiLink('');
        setUpiOrderId('');
        // Reset issue qty to remaining qty for each item
        if (selectedPrescription) {
            const defaultQtys: Record<string, number> = {};
            const defaultUoms: Record<string, string> = {};
            selectedPrescription.items.forEach(item => {
                const invItem = inventoryItems.find(i => i.id === item.itemId);
                const prescriptionBills = bills.filter(b => b.prescriptionId === selectedPrescription.id);
                const dispensedQty = prescriptionBills.reduce((sum, b) => {
                    const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                    return sum + matchingItems.reduce((acc, curr) => {
                        const isSales = curr.itemType?.toUpperCase() === invItem?.salesUom?.toUpperCase();
                        const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                        return acc + (curr.quantity * cf);
                    }, 0);
                }, 0);
                const remainingQty = Math.max(0, item.totalQty - dispensedQty);

                const prescUom = (item.units || 'EACH').trim().toUpperCase();
                defaultUoms[item.id] = prescUom;

                const isSales = prescUom === (invItem?.salesUom || '').trim().toUpperCase();
                const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;

                defaultQtys[item.id] = remainingQty / cf;
            });
            setDispensingUom(defaultUoms);
            setIssueQty(defaultQtys);
        } else {
            setDispensingUom({});
            setIssueQty({});
        }
    }, [selectedPrescriptionId, bills, inventoryItems]);

    useEffect(() => {
        if (!selectedPrescription || !selectedStoreId) {
            setStoreBatches({});
            return;
        }

        let isMounted = true;
        const loadAllBatches = async () => {
            setBatchesLoading(true);
            try {
                const batchPromises = selectedPrescription.items.map(async (item) => {
                    const batches = await fetchBatchDetails(selectedStoreId, item.itemId);
                    return { itemId: item.itemId, batches };
                });

                const results = await Promise.all(batchPromises);
                if (isMounted) {
                    const batchMap: Record<string, any[]> = {};
                    results.forEach(res => {
                        batchMap[res.itemId] = res.batches;
                    });
                    setStoreBatches(batchMap);
                }
            } catch (error) {
                console.error("Error fetching batches for prescription items:", error);
            } finally {
                if (isMounted) {
                    setBatchesLoading(false);
                }
            }
        };

        loadAllBatches();
        return () => {
            isMounted = false;
        };
    }, [selectedPrescription, selectedStoreId, fetchBatchDetails]);

    const patient = useMemo(() =>  
        selectedPrescription ? patients.find(pat => pat.id === selectedPrescription.patientId) : null,
    [selectedPrescription, patients]);

    const totals = useMemo(() => {
        if (!selectedPrescription) return { tax: 0, total: 0 };
        
        let totalBillable = 0;
        let totalTax = 0;
        
        selectedPrescription.items.forEach(item => {
            const allocation = selectedBatches[item.id];
            if (allocation) {
                const invItem = inventoryItems.find(i => i.id === item.itemId);
                const prescriptionBills = bills.filter(b => b.prescriptionId === selectedPrescription.id);
                const dispensedQty = prescriptionBills.reduce((sum, b) => {
                    const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                    return sum + matchingItems.reduce((acc, curr) => {
                        const isSales = curr.itemType?.toUpperCase() === invItem?.salesUom?.toUpperCase();
                        const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                        return acc + (curr.quantity * cf);
                    }, 0);
                }, 0);
                const remainingQty = Math.max(0, item.totalQty - dispensedQty);
                
                const selectedUom = dispensingUom[item.id] || item.units || 'EACH';
                const isSalesUom = selectedUom.toUpperCase() === (invItem?.salesUom || '').toUpperCase();
                const salesCF = isSalesUom ? Number(invItem?.salesConversionFactor || 1) : 1;
                
                const iqty = issueQty[item.id] ?? (remainingQty / salesCF);
                const itemPrice = allocation.rate * salesCF;
                const total = Number((iqty * itemPrice).toFixed(decimals));
                
                const itemMapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
                const taxPercent = taxMaster?.percentage || 0;
                
                const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(decimals));
                
                totalBillable += total;
                totalTax += taxAmt;
            }
        });
        
        return { tax: totalTax, total: totalBillable };
    }, [selectedPrescription, selectedBatches, dispensingUom, issueQty, bills, inventoryItems, itemTaxMappings, taxMasters, decimals]);

    const getPrescriptionStatus = (p: typeof prescriptions[0]) => {
        let hasDispensedAny = false;
        let allItemsDispensed = true;
        
        p.items.forEach(item => {
            const invItem = inventoryItems.find(i => i.id === item.itemId);
            const prescriptionBills = bills.filter(b => b.prescriptionId === p.id && b.status !== 'Cancelled');
            const dispensedQty = prescriptionBills.reduce((sum, b) => {
                const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                return sum + matchingItems.reduce((acc, curr) => {
                    const isSales = curr.itemType?.toUpperCase() === invItem?.salesUom?.toUpperCase();
                    const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                    return acc + (curr.quantity * cf);
                }, 0);
            }, 0);
            
            if (dispensedQty > 0) {
                hasDispensedAny = true;
            }
            if (dispensedQty < item.totalQty) {
                allItemsDispensed = false;
            }
        });
        
        if (allItemsDispensed) return 'Dispensed';
        if (hasDispensedAny) return 'Partially Dispensed';
        return 'Pending';
    };

    const isSelectedPrescriptionFullyDispensed = useMemo(() => {
        if (!selectedPrescription) return false;
        return getPrescriptionStatus(selectedPrescription) === 'Dispensed';
    }, [selectedPrescription, bills, inventoryItems]);

    const filteredPrescriptions = useMemo(() => {
        return prescriptions.filter(p => {
            // 1. Robust Search Match
            const pat = patients.find(pat => pat.id === p.patientId);
            const patName = pat ? `${pat.firstName || ''} ${pat.lastName || ''}`.toLowerCase() : '';
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                                p.id.toLowerCase().includes(query) || 
                                patName.includes(query);
            
            // 2. Robust Status Match based on actual dispensed quantities
            const computedStatus = getPrescriptionStatus(p).toLowerCase();
            const filterValue = (statusFilter || 'Pending').toLowerCase();
            const matchesStatus = filterValue === 'all' || 
                                (filterValue === 'pending' && (computedStatus === 'pending' || computedStatus === 'partially dispensed')) ||
                                (filterValue === 'dispensed' && (computedStatus === 'dispensed' || computedStatus === 'partially dispensed'));
            
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
    }, [prescriptions, searchQuery, statusFilter, patients, fromDate, toDate, bills, inventoryItems]);

    const handleDispenseItem = (itemId: string, itemRecId: string, itemName: string, reqQty: number, defaultUnit?: string) => {
        if (!selectedStoreId) {
            showToast('error', 'Please select a store first.');
            return;
        }
        // Use the user-selected UOM if available, fallback to prescription unit
        const unit = dispensingUom[itemRecId] || defaultUnit;
        setActiveBatchItem({ id: itemRecId, itemId, itemName, reqQty, unit });
    };

    const handleBatchSelected = (batchInfo: any) => {
        if (activeBatchItem) {
            setSelectedBatches(prev => ({ ...prev, [activeBatchItem.id]: batchInfo }));
        }
        setActiveBatchItem(null);
    };

    const processMatchedOPItem = async (matchedItem: InventoryItem, scannedBatch?: string, scannedExpiry?: string) => {
        if (!selectedPrescription) {
            playErrorBeep();
            showToast('error', 'No prescription selected.');
            return;
        }
        // Find prescription item in pending state
        const prescItem = selectedPrescription.items.find(
            item => item.itemId === matchedItem.id && item.status !== 'Dispensed'
        );

        if (!prescItem) {
            playErrorBeep();
            showToast(
                'error',
                `Item "${matchedItem.itemName}" is not part of this pending prescription.`
            );
            return;
        }

        // Calculate remaining quantity
        const prescriptionBills = bills.filter(b => b.prescriptionId === selectedPrescription.id);
        const dispensedQty = prescriptionBills.reduce((sum, b) => {
            const matchingItems = b.items.filter(bi => bi.itemId === prescItem.itemId);
            return sum + matchingItems.reduce((acc, curr) => {
                const isSales = curr.itemType?.toUpperCase() === matchedItem.salesUom?.toUpperCase();
                const cf = isSales ? Number(matchedItem.salesConversionFactor || 1) : 1;
                return acc + (curr.quantity * cf);
            }, 0);
        }, 0);
        const remainingQty = Math.max(0, prescItem.totalQty - dispensedQty);

        if (remainingQty <= 0) {
            playErrorBeep();
            showToast('error', `Item "${matchedItem.itemName}" has already been fully dispensed.`);
            return;
        }

        // Fetch batches
        const batches = await fetchBatchDetails(selectedStoreId, matchedItem.id);

        // Sort by expiry (FIFO)
        const sortedBatches = [...batches].sort((a, b) => {
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });

        // Exclude expired batches from auto-selection via barcode scanner
        const nonExpiredBatches = sortedBatches.filter(b => !b.expiryDate || new Date(b.expiryDate) >= new Date());

        if (nonExpiredBatches.length === 0) {
            playErrorBeep();
            showToast('error', `No non-expired stock batches available for "${matchedItem.itemName}" in store.`);
            return;
        }

        // Conversion factors
        const selectedUom = dispensingUom[prescItem.id] || prescItem.units || 'EACH';
        const isSalesUom = selectedUom.toUpperCase() === matchedItem.salesUom?.toUpperCase();
        const salesCF = isSalesUom ? Number(matchedItem.salesConversionFactor || 1) : 1;
        const maxQty = remainingQty / salesCF;

        // Tax calculation parameters
        const itemMapping = itemTaxMappings.find(m => m.itemId === matchedItem.id);
        const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
        const taxPercent = taxMaster?.percentage || 0;

        const currentSelectedBatch = selectedBatches[prescItem.id];

        if (!currentSelectedBatch) {
            // Case A: First Scan of Item (Quantity starts at 1)
            const targetQty = 1;
            const baseQtyRequired = targetQty * salesCF;

            let chosenBatch = null;
            let matchedByGS1Batch = false;

            if (scannedBatch) {
                chosenBatch = nonExpiredBatches.find(
                    b => b.batchNo.toLowerCase() === scannedBatch.toLowerCase() && b.currentStock >= baseQtyRequired
                );
                if (chosenBatch) {
                    matchedByGS1Batch = true;
                } else {
                    const batchExists = nonExpiredBatches.some(b => b.batchNo.toLowerCase() === scannedBatch.toLowerCase());
                    if (batchExists) {
                        showToast('info', `Parsed batch "${scannedBatch}" has insufficient stock in store. Selecting FIFO batch.`);
                    } else {
                        showToast('info', `Parsed batch "${scannedBatch}" not found in stock. Selecting FIFO batch.`);
                    }
                }
            }

            if (!chosenBatch) {
                chosenBatch = nonExpiredBatches.find(b => b.currentStock >= baseQtyRequired);
            }

            if (!chosenBatch) {
                playErrorBeep();
                showToast(
                    'error',
                    `Insufficient stock for "${matchedItem.itemName}". Required: ${baseQtyRequired} in store.`
                );
                return;
            }

            const itemPrice = chosenBatch.rate * salesCF;
            const total = Number((targetQty * itemPrice).toFixed(decimals));
            const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(decimals));
            const baseAmount = Number((total - taxAmt).toFixed(decimals));

            setIssueQty(prev => ({ ...prev, [prescItem.id]: targetQty }));
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

            showToast('success', `${successMessage} (Added 1 unit)`);
            playSuccessBeep();

        } else {
            // Check if scanned batch is different
            const isDifferentBatch = scannedBatch && currentSelectedBatch.batchNo.toLowerCase() !== scannedBatch.toLowerCase();

            if (isDifferentBatch) {
                // Case C: Scan of a Different Batch (Switch and reset quantity to 1)
                const targetQty = 1;
                const baseQtyRequired = targetQty * salesCF;

                let chosenBatch = nonExpiredBatches.find(
                    b => b.batchNo.toLowerCase() === scannedBatch.toLowerCase() && b.currentStock >= baseQtyRequired
                );
                let matchedByGS1Batch = false;

                if (chosenBatch) {
                    matchedByGS1Batch = true;
                } else {
                    const batchExists = nonExpiredBatches.some(b => b.batchNo.toLowerCase() === scannedBatch.toLowerCase());
                    if (batchExists) {
                        showToast('info', `Parsed batch "${scannedBatch}" has insufficient stock in store. Selecting FIFO batch.`);
                    } else {
                        showToast('info', `Parsed batch "${scannedBatch}" not found in stock. Selecting FIFO batch.`);
                    }
                    chosenBatch = nonExpiredBatches.find(b => b.currentStock >= baseQtyRequired);
                }

                if (!chosenBatch) {
                    playErrorBeep();
                    showToast(
                        'error',
                        `Insufficient stock for "${matchedItem.itemName}". Required: ${baseQtyRequired} in store.`
                    );
                    return;
                }

                const itemPrice = chosenBatch.rate * salesCF;
                const total = Number((targetQty * itemPrice).toFixed(decimals));
                const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(decimals));
                const baseAmount = Number((total - taxAmt).toFixed(decimals));

                setIssueQty(prev => ({ ...prev, [prescItem.id]: targetQty }));
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

                showToast('success', `Switched allocation to Batch "${chosenBatch.batchNo}" for "${matchedItem.itemName}" (Quantity reset to 1)`);
                playSuccessBeep();

            } else {
                // Case B: Subsequent Scan (Same Batch) - Increment quantity by 1
                const currentQty = issueQty[prescItem.id] ?? 1;

                if (currentQty + 1 <= maxQty) {
                    const nextQty = currentQty + 1;
                    const baseQtyRequired = nextQty * salesCF;

                    // Verify the selected batch has enough stock
                    const chosenBatch = nonExpiredBatches.find(b => b.batchNo === currentSelectedBatch.batchNo);
                    if (chosenBatch && chosenBatch.currentStock < baseQtyRequired) {
                        playErrorBeep();
                        showToast('error', `Cannot increment. Insufficient stock in Batch "${currentSelectedBatch.batchNo}". Stock: ${chosenBatch.currentStock}, Required: ${baseQtyRequired}.`);
                        return;
                    }

                    const itemPrice = currentSelectedBatch.rate * salesCF;
                    const total = Number((nextQty * itemPrice).toFixed(decimals));
                    const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(decimals));
                    const baseAmount = Number((total - taxAmt).toFixed(decimals));

                    setIssueQty(prev => ({ ...prev, [prescItem.id]: nextQty }));
                    setSelectedBatches(prev => ({
                        ...prev,
                        [prescItem.id]: {
                            ...currentSelectedBatch,
                            baseAmount: baseAmount,
                            taxAmount: taxAmt,
                            amount: total
                        }
                    }));

                    showToast('success', `Incremented "${matchedItem.itemName}" to ${nextQty} units.`);
                    playSuccessBeep();

                } else {
                    playErrorBeep();
                    showToast('error', `Required quantity of ${maxQty} already fully scanned.`);
                }
            }
        }
    };

    const handleBarcodeScan = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        const query = barcodeQuery.trim();
        if (!query) return;

        if (!selectedStoreId) {
            playErrorBeep();
            showToast('error', 'Please select a store first.');
            setBarcodeQuery('');
            return;
        }

        if (!selectedPrescription) {
            playErrorBeep();
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
            playErrorBeep();
            setUnrecognizedScan({
                gtin: searchGtin,
                batch: searchBatchNo,
                expiry: parsedGS1.expiry
            });
            setMappingItemId('');
            setMappingSearchQuery('');
            setSupervisorPin('');
            setPinError('');
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

        await processMatchedOPItem(matchedItem, searchBatchNo, parsedGS1.expiry);
        setBarcodeQuery('');
    };

    const handleConfirmMapping = async () => {
        if (!unrecognizedScan || !mappingItemId) {
            showToast('error', 'Please select an item to link.');
            playErrorBeep();
            return;
        }

        if (supervisorPin !== '4321' && supervisorPin !== '1234') {
            setPinError('Invalid Supervisor PIN. Access denied.');
            playErrorBeep();
            return;
        }

        const selectedItem = inventoryItems.find(i => i.id === mappingItemId);
        if (!selectedItem) return;

        try {
            const updatedItem = {
                ...selectedItem,
                gtin: unrecognizedScan.gtin
            };

            await saveInventoryItem(updatedItem);
            showToast('success', `Linked barcode ${unrecognizedScan.gtin} to item "${selectedItem.itemName}" successfully.`);
            
            await processMatchedOPItem(selectedItem, unrecognizedScan.batch, unrecognizedScan.expiry);

            setUnrecognizedScan(null);
            setMappingItemId('');
            setMappingSearchQuery('');
            setSupervisorPin('');
            setPinError('');
        } catch (err: any) {
            showToast('error', `Mapping failed: ${err.message}`);
            playErrorBeep();
        }
    };

    const executeDispensation = async (payMode: string, refNo: string, amount: number, status: string) => {
        setLoading(true);
        const result = await dispensePrescription(
            selectedPrescription!.id, 
            selectedStoreId, 
            selectedBatches, 
            issueQty, 
            dispensingUom,
            payMode,
            refNo,
            amount,
            status
        );
        setLoading(false);
        if (result.success) {
            setSelectedBatches({});
            setPaymentMode('Cash');
            setReferenceNo('');
            setShowUpiModal(false);
            if (result.invoiceId) {
                setGeneratedInvoiceId(result.invoiceId);
            }
        }
    };

    const handleFinalDispense = async () => {
        if (!selectedPrescription || !selectedStoreId) return;
        
        // Ensure all pending items have a batch selected
        // Pending = items that are not yet fully Dispensed (includes Partially Dispensed)
        const pendingItems = selectedPrescription.items.filter(item => {
            const invItem = inventoryItems.find(i => i.id === item.itemId);
            const prescriptionBills = bills.filter(b => b.prescriptionId === selectedPrescription.id);
            const dispensedQty = prescriptionBills.reduce((sum, b) => {
                const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                return sum + matchingItems.reduce((acc, curr) => {
                    const isSales = curr.itemType?.toUpperCase() === invItem?.salesUom?.toUpperCase();
                    const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                    return acc + (curr.quantity * cf);
                }, 0);
            }, 0);
            const remainingQty = Math.max(0, item.totalQty - dispensedQty);
            return item.status !== 'Dispensed' && remainingQty > 0;
        });
        if (pendingItems.length > 0 && Object.keys(selectedBatches).filter(id => pendingItems.some(i => i.id === id)).length === 0) {
            showToast('error', 'Please select batches for the items before dispensing.');
            return;
        }

        if (paymentMode === 'UPI') {
            const orderId = `order_UPI_OP_${Date.now().toString().slice(-6)}`;
            setUpiOrderId(orderId);
            const inrRate = getExchangeRateToINR(selectedCurrency);
            const link = `upi://pay?pa=medicorepharmacy@hdfcbank&pn=MediCore%20Pharmacy&tr=${orderId}&am=${(totals.total * inrRate).toFixed(2)}&cu=INR&tn=Presc-${selectedPrescription.id.slice(-6)}`;
            setUpiLink(link);
            setShowUpiModal(true);
            return;
        }

        await executeDispensation(paymentMode, referenceNo, totals.total, 'Paid');
    };

    const handleUpiPaymentSuccess = async () => {
        const paymentId = `pay_UPI_OP_${Date.now().toString().slice(-6)}`;
        await executeDispensation('UPI', paymentId, totals.total, 'Paid');
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
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedStoreId(val);
                                localStorage.setItem('selected_pharmacy_store_id', val);
                            }}
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
                                        {(() => {
                                            const computedDispStatus = getPrescriptionStatus(p);
                                            return (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    computedDispStatus === 'Dispensed' ? 'bg-emerald-100 text-emerald-700' : 
                                                    computedDispStatus === 'Partially Dispensed' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {computedDispStatus}
                                                </span>
                                            );
                                        })()}
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
                                {isSelectedPrescriptionFullyDispensed && (
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
                                    disabled={isSelectedPrescriptionFullyDispensed || Object.keys(selectedBatches).length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    <CheckCircle className="w-5 h-5" /> Confirm Dispensing
                                </button>
                            </div>
                        </div>

                        {/* Barcode Scanner Bar */}
                        <div className="px-6 py-3 bg-slate-100/50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 max-w-md">
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
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleBarcodeScan(e);
                                                }
                                            }}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${scannerFocused ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                {scannerFocused ? 'Ready' : 'Click to Scan'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
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
                                            <th className="p-4 text-center w-32">Issue Qty</th>
                                            <th className="p-4 text-center w-28">UOM</th>
                                            <th className="p-4">Stock Status</th>
                                            <th className="p-4 text-center">Batch / Dispense</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedPrescription.items.map((item, idx) => {
                                             const invItem = inventoryItems.find(i => i.id === item.itemId);
                                             const totalStock = invItem?.stock?.reusableCount || 0;
                                             
                                             const prescriptionBills = bills.filter(b => b.prescriptionId === selectedPrescription.id);
                                             const dispensedQty = prescriptionBills.reduce((sum, b) => {
                                                 const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                                                 return sum + matchingItems.reduce((acc, curr) => {
                                                     const isSales = curr.itemType?.toUpperCase() === invItem?.salesUom?.toUpperCase();
                                                     const cf = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                                                     return acc + (curr.quantity * cf);
                                                 }, 0);
                                             }, 0);
                                             const remainingQty = Math.max(0, item.totalQty - dispensedQty);

                                             const selectedUom = dispensingUom[item.id] || item.units || 'EACH';
                                             const isSales = selectedUom.toUpperCase() === (invItem?.salesUom || '').toUpperCase();
                                             const salesCF = isSales ? Number(invItem?.salesConversionFactor || 1) : 1;

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
                                                          {(() => {
                                                              const prescUom = (item.units || 'EACH').trim().toUpperCase();
                                                              const baseUom = (invItem?.baseUom || 'EACH').trim().toUpperCase();
                                                              const prescIsSales = prescUom === (invItem?.salesUom || '').trim().toUpperCase();
                                                              const prescCF = prescIsSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                                                              
                                                              const prescribedQtyVal = item.totalQty / prescCF;
                                                              
                                                              return (
                                                                  <div className="flex flex-col items-center">
                                                                      <div className="font-black text-slate-700 text-lg">
                                                                          {prescribedQtyVal} {prescUom}
                                                                      </div>
                                                                      {prescCF > 1 && (
                                                                          <div className="text-[10px] text-slate-400 font-bold">
                                                                              ({item.totalQty} {baseUom})
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              );
                                                          })()}
                                                          {dispensedQty > 0 && (
                                                              <div className="text-[10px] flex flex-col gap-0.5 mt-0.5 font-bold">
                                                                  <span className="text-emerald-600">Dispensed: {dispensedQty} {invItem?.baseUom}</span>
                                                                  <span className="text-amber-600">Remaining: {remainingQty} {invItem?.baseUom}</span>
                                                              </div>
                                                          )}
                                                          <div className="text-[9px] text-slate-400 font-bold uppercase">Days: {item.noDays}</div>
                                                     </td>
                                                     <td className="p-4 text-center">
                                                         <input
                                                             type="number"
                                                             min={1}
                                                             max={remainingQty / salesCF}
                                                             value={remainingQty <= 0 ? 0 : (issueQty[item.id] ?? (remainingQty / salesCF))}
                                                             disabled={selectedPrescription.status === 'Dispensed' || item.status === 'Dispensed' || remainingQty <= 0}
                                                             onChange={e => {
                                                                 const maxVal = remainingQty / salesCF;
                                                                 const newQty = Math.max(1, Math.min(maxVal, Number(e.target.value)));
                                                                 setIssueQty(prev => ({ ...prev, [item.id]: newQty }));

                                                                 // Synchronize manual spinner change to selectedBatches helpers
                                                                 if (selectedBatches[item.id]) {
                                                                     const allocation = selectedBatches[item.id];
                                                                     const itemPrice = allocation.rate * salesCF;
                                                                     const total = Number((newQty * itemPrice).toFixed(decimals));
                                                                     const itemMapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                                                                     const taxMaster = itemMapping ? taxMasters.find(t => t.id === itemMapping.taxId && t.status === 'Active') : null;
                                                                     const taxPercent = taxMaster?.percentage || 0;
                                                                     const taxAmt = Number((total * taxPercent / (100 + taxPercent)).toFixed(decimals));
                                                                     const baseAmount = Number((total - taxAmt).toFixed(decimals));

                                                                     setSelectedBatches(prev => ({
                                                                         ...prev,
                                                                         [item.id]: {
                                                                             ...allocation,
                                                                             amount: total,
                                                                             taxAmount: taxAmt,
                                                                             baseAmount: baseAmount
                                                                         }
                                                                     }));
                                                                 }
                                                             }}
                                                             className={`w-20 text-center px-2 py-1.5 border rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                                                 (issueQty[item.id] ?? (remainingQty / salesCF)) < (remainingQty / salesCF)
                                                                     ? 'border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-400'
                                                                     : 'border-slate-200 bg-white text-slate-800'
                                                             } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                         />
                                                     </td>
                                                     <td className="p-4 text-center">
                                                         <select
                                                             className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white font-bold text-slate-700"
                                                             value={dispensingUom[item.id] || item.units || 'EACH'}
                                                             onChange={e => {
                                                                 const oldUom = dispensingUom[item.id] || item.units || 'EACH';
                                                                 const newUom = e.target.value;
                                                                 
                                                                 const oldIsSales = oldUom.toUpperCase() === (invItem?.salesUom || '').toUpperCase();
                                                                 const oldCF = oldIsSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                                                                 
                                                                 const newIsSales = newUom.toUpperCase() === (invItem?.salesUom || '').toUpperCase();
                                                                 const newCF = newIsSales ? Number(invItem?.salesConversionFactor || 1) : 1;
                                                                 
                                                                 const currentVal = issueQty[item.id] ?? (remainingQty / oldCF);
                                                                 const qtyInBase = currentVal * oldCF;
                                                                 const qtyInNew = Number((qtyInBase / newCF).toFixed(2));
                                                                 
                                                                 setDispensingUom(prev => ({ ...prev, [item.id]: newUom }));
                                                                 setIssueQty(prev => ({ ...prev, [item.id]: qtyInNew }));
                                                             }}
                                                             disabled={selectedPrescription.status === 'Dispensed' || item.status === 'Dispensed' || remainingQty <= 0}
                                                         >
                                                             {[(invItem?.baseUom || item.units || 'EACH').trim().toUpperCase(), 
                                                               (invItem?.salesUom || '').trim().toUpperCase()]
                                                               .filter((v, i, a) => v && a.indexOf(v) === i)
                                                               .map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                         </select>
                                                     </td>
                                                     <td className="p-4">
                                                          {batchesLoading ? (
                                                              <div className="text-xs text-slate-400 animate-pulse font-semibold">Checking stock...</div>
                                                          ) : (
                                                              (() => {
                                                                  if (remainingQty <= 0) return <span className="text-xs text-slate-400 font-semibold">-</span>;
                                                                  const itemBatches = storeBatches[item.itemId] || [];
                                                                  const nonExpiredBatches = itemBatches.filter(b => !b.expiryDate || new Date(b.expiryDate) >= new Date());
                                                                  const totalStoreStock = nonExpiredBatches.reduce((sum, b) => sum + (b.currentStock || 0), 0);
                                                                  const iqty = issueQty[item.id] ?? (remainingQty / salesCF);
                                                                  const baseQtyRequired = iqty * salesCF;
                                                                  const stockInSelectedUom = Number((totalStoreStock / salesCF).toFixed(2));
                                                                  
                                                                  if (!selectedStoreId) return <span className="text-xs font-semibold text-slate-400">Select store</span>;
                                                                  if (totalStoreStock === 0) return <span className="text-xs font-bold text-red-500">Out of Stock</span>;
                                                                  if (totalStoreStock < baseQtyRequired) return <span className="text-xs font-bold text-orange-500">Partial: {stockInSelectedUom} {selectedUom}</span>;
                                                                  return <span className="text-xs font-bold text-emerald-600">Available ({stockInSelectedUom} {selectedUom})</span>;
                                                              })()
                                                          )}
                                                     </td>
                                                     <td className="p-4">
                                                         <div className="flex items-center justify-center gap-2">
                                                             {selectedPrescription.status === 'Dispensed' || item.status === 'Dispensed' || remainingQty <= 0 ? (
                                                                 <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5">
                                                                     <CheckCircle className="w-3.5 h-3.5" /> Dispensed
                                                                 </span>
                                                             ) : (
                                                                 <button 
                                                                     onClick={() => {
                                                                         const reqQtyInSelectedUom = issueQty[item.id] ?? (remainingQty / salesCF);
                                                                         handleDispenseItem(item.itemId, item.id, item.itemName || 'Unknown', reqQtyInSelectedUom, selectedUom);
                                                                     }}
                                                                     className="px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                                                 >
                                                                     <Package className="w-4 h-4" /> {selectedBatches[item.id] ? (() => {
                                                                         const allocation = selectedBatches[item.id];
                                                                         const iqty = issueQty[item.id] ?? (remainingQty / salesCF);
                                                                         const itemPrice = allocation.rate * salesCF;
                                                                         const total = Number((iqty * itemPrice).toFixed(2));
                                                                         return `Batch ${allocation.batchNo} (${formatCurrency(total)})`;
                                                                     })() : 'Select Batch'}
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
                                            {formatCurrency(isSelectedPrescriptionFullyDispensed 
                                                ? (selectedPrescription.taxAmount || 0)
                                                : totals.tax)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Billable</span>
                                        <span className="text-2xl font-black text-slate-800">
                                            {formatCurrency(isSelectedPrescriptionFullyDispensed 
                                                ? selectedPrescription.totalAmount
                                                : totals.total)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Items Status</span>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">All Items Available</span>
                                </div>

                                {!isSelectedPrescriptionFullyDispensed && (
                                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode:</span>
                                            <select 
                                                className="text-xs font-bold text-blue-700 bg-transparent outline-none cursor-pointer"
                                                value={paymentMode}
                                                onChange={e => {
                                                    setPaymentMode(e.target.value as any);
                                                    setReferenceNo('');
                                                }}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="UPI">UPI</option>
                                            </select>
                                        </div>
                                        {paymentMode === 'Card' && (
                                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Ref No:</span>
                                                <input
                                                    type="text"
                                                    placeholder="Enter Ref No"
                                                    className="text-xs font-bold text-slate-700 bg-transparent outline-none w-28 placeholder-slate-300"
                                                    value={referenceNo}
                                                    onChange={e => setReferenceNo(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                    disabled={isSelectedPrescriptionFullyDispensed || Object.keys(selectedBatches).length === 0 || loading}
                                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-xl text-sm shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Dispensing...
                                        </>
                                    ) : 'Dispense & Print Label'}
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

            {showUpiModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 flex flex-col space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">UPI Dynamic QR Payment</h3>
                            <p className="text-xs text-slate-400 mt-1">Scan the QR code below using any UPI App (BHIM, Google Pay, PhonePe, Paytm)</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex justify-center items-center">
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center gap-2">
                                <svg className="w-48 h-48" viewBox="0 0 100 100">
                                    <rect x="2" y="2" width="96" height="96" rx="8" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                                    
                                    <rect x="8" y="8" width="20" height="20" fill="none" stroke="#6d28d9" strokeWidth="4" />
                                    <rect x="14" y="14" width="8" height="8" fill="#6d28d9" />
                                    
                                    <rect x="72" y="8" width="20" height="20" fill="none" stroke="#6d28d9" strokeWidth="4" />
                                    <rect x="78" y="14" width="8" height="8" fill="#6d28d9" />
                                    
                                    <rect x="8" y="72" width="20" height="20" fill="none" stroke="#6d28d9" strokeWidth="4" />
                                    <rect x="14" y="78" width="8" height="8" fill="#6d28d9" />
                                    
                                    <g fill="#1e293b">
                                        <rect x="36" y="8" width="4" height="8" />
                                        <rect x="44" y="12" width="8" height="4" />
                                        <rect x="56" y="8" width="12" height="4" />
                                        <rect x="8" y="36" width="8" height="4" />
                                        <rect x="16" y="44" width="4" height="8" />
                                        <rect x="8" y="56" width="4" height="12" />
                                        
                                        <rect x="40" y="40" width="20" height="20" rx="4" fill="#6d28d9" />
                                        
                                        <rect x="32" y="32" width="8" height="4" />
                                        <rect x="60" y="32" width="4" height="8" />
                                        <rect x="32" y="60" width="4" height="8" />
                                        <rect x="60" y="60" width="8" height="4" />
                                        <rect x="44" y="72" width="12" height="4" />
                                        <rect x="36" y="84" width="8" height="8" />
                                        <rect x="72" y="44" width="8" height="8" />
                                        <rect x="80" y="56" width="12" height="4" />
                                        <rect x="72" y="72" width="20" height="4" />
                                        <rect x="84" y="80" width="8" height="8" />
                                    </g>
                                    <text x="50" y="52" fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">UPI</text>
                                </svg>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded tracking-wide max-w-[200px] truncate select-all" title={upiLink}>
                                    {upiOrderId}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-semibold text-slate-600">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span className="font-mono text-slate-800">{formatCurrency(totals.total)}</span>
                            </div>
                            {selectedCurrency !== 'INR' && (
                                <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-extrabold text-violet-700">
                                    <span>INR Equivalent (1 {selectedCurrency} = ₹{getExchangeRateToINR(selectedCurrency).toFixed(2)}):</span>
                                    <span className="font-mono text-base">₹{(totals.total * getExchangeRateToINR(selectedCurrency)).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleUpiPaymentSuccess}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Bypass & Simulate Webhook Success (Local Dev)
                            </button>
                            <button
                                onClick={() => { setShowUpiModal(false); setUpiOrderId(''); setUpiLink(''); }}
                                className="w-full px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                            >
                                Cancel UPI Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unrecognized Barcode Mapping Modal with Supervisor Bypass */}
            {unrecognizedScan && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="p-6 bg-amber-50 border-b border-amber-100">
                            <h3 className="text-base font-black text-amber-800 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                ⚠️ UNRECOGNIZED BARCODE DETECTED
                            </h3>
                            <p className="text-[11px] text-amber-600 mt-1 font-semibold">Link this barcode to a drug in the catalog to proceed dispensing.</p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex flex-col gap-4 overflow-auto max-h-[380px]">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs flex flex-col gap-1.5 font-semibold text-slate-600">
                                <div>Scanned GTIN: <span className="font-mono font-bold text-slate-800">{unrecognizedScan.gtin}</span></div>
                                <div className="grid grid-cols-2 gap-4 mt-0.5">
                                    <div>Parsed Batch: <span className="font-bold text-slate-800">{unrecognizedScan.batch || 'N/A'}</span></div>
                                    <div>Parsed Expiry: <span className="font-bold text-slate-800">{unrecognizedScan.expiry || 'N/A'}</span></div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Catalog to Link this Barcode</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by drug name or code..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400 font-medium"
                                        value={mappingSearchQuery}
                                        onChange={e => setMappingSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Matching items selector */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Matching Items Found:</span>
                                <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                                    {inventoryItems
                                        .filter(i => 
                                            i.isActive && 
                                            (i.itemName.toLowerCase().includes(mappingSearchQuery.toLowerCase()) || 
                                             i.itemCode.toLowerCase().includes(mappingSearchQuery.toLowerCase()))
                                        )
                                        .slice(0, 15)
                                        .map(item => (
                                            <label 
                                                key={item.id} 
                                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                                                    mappingItemId === item.id ? 'bg-blue-50/50' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="mappingItem"
                                                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                                                    checked={mappingItemId === item.id}
                                                    onChange={() => setMappingItemId(item.id)}
                                                />
                                                <div className="text-xs">
                                                    <p className="font-bold text-slate-800">{item.itemName}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{item.itemCode} · {item.itemCategory}</p>
                                                </div>
                                            </label>
                                        ))}
                                    {inventoryItems.filter(i => 
                                        i.isActive && 
                                        (i.itemName.toLowerCase().includes(mappingSearchQuery.toLowerCase()) || 
                                         i.itemCode.toLowerCase().includes(mappingSearchQuery.toLowerCase()))
                                    ).length === 0 && (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">No items match your search.</div>
                                    )}
                                </div>
                            </div>

                            {/* Supervisor Approval Bypass */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">🔒 Supervisor Approval Required</label>
                                <input
                                    type="password"
                                    placeholder="Enter Supervisor PIN (Demo: 4321)"
                                    className={`w-full px-3 py-1.5 border ${pinError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'} rounded-lg text-xs outline-none bg-white placeholder-slate-300 font-bold tracking-widest text-center`}
                                    value={supervisorPin}
                                    onChange={e => { setSupervisorPin(e.target.value); setPinError(''); }}
                                />
                                {pinError && <p className="text-[10px] text-red-500 font-bold text-center mt-0.5">{pinError}</p>}
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setUnrecognizedScan(null)}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-95"
                            >
                                CANCEL
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmMapping}
                                disabled={!mappingItemId || !supervisorPin}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                CONFIRM & BIND BARCODE
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

// Internal icon proxy for shopping cart
const ShoppingCart = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);
