import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { GRN, GRNItem, PurchaseOrder, InventoryItem } from '../types';
import { Pagination } from '../components/Pagination';
import { 
  Plus, Search, Edit2, Trash2, ShieldCheck, Check, Info, FileText, 
  MapPin, Landmark, Award, Globe, User, Percent, AlertTriangle, ArrowLeft,
  DollarSign, ShoppingCart, ShoppingBag, Calendar, Layers, Activity, Truck, Grid, BookOpen, Barcode
} from 'lucide-react';
import { parseGS1 } from '../utils/gs1Parser';
import { playSuccessBeep, playErrorBeep } from '../utils/audio';

const STATE_CODES: { [key: string]: string } = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '19': 'West Bengal',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

const getVendorGstDetails = (vendor: any) => {
  const gstin = vendor.registrationDetails?.vatNumber || '';
  const stateCode = gstin ? gstin.slice(0, 2) : '';
  const state = STATE_CODES[stateCode] || 'N/A';
  const address = vendor.address || '';
  const hasGst = !!gstin || vendor.isVat;
  
  return {
    gstin,
    stateCode,
    state,
    address,
    hasGst
  };
};

export const GRNPage: React.FC = () => {
  const { 
    grns, saveGRN, deleteGRN,
    purchaseOrders, vendors, stores, inventoryItems, showToast, storeItemMappings,
    taxMasters, itemTaxMappings, saveInventoryItem
  } = useData();

  const resolveItemTaxPercentage = (itemId: string): number => {
    const mapping = itemTaxMappings.find(m => m.itemId === itemId);
    if (!mapping) return 0;
    const tax = taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active');
    return tax ? Number(tax.percentage || 0) : 0;
  };

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Header Form States
  const [editingGRNId, setEditingGRNId] = useState<string | null>(null);
  const [grnNo, setGRNNo] = useState('');
  const [grnType, setGRNType] = useState<'Direct' | 'From Purchase Order' | 'From Letter of Indent' | 'From Expiry Item Return' | 'From Consignment'>('Direct');
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [poId, setPOId] = useState('');
  const [gateEntryDate, setGateEntryDate] = useState('');
  const [gateEntryNo, setGateEntryNo] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [grossAmount, setGrossAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [vendorTab, setVendorTab] = useState<'gst' | 'location'>('gst');

  // Bottom Tabs state
  const [bottomTab, setBottomTab] = useState<'items' | 'billing' | 'other'>('items');

  // Items grid state
  const [items, setItems] = useState<GRNItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

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

  // Add Item Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalItemId, setModalItemId] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalRate, setModalRate] = useState(0);
  const [modalBatchCode, setModalBatchCode] = useState('');
  const [modalExpiryDate, setModalExpiryDate] = useState('');
  const [modalLocator, setModalLocator] = useState('MAIN-01');

  // Selected Vendor Detail Panel helper
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '', gstin: '', state: '', address: '', hasGst: false };
  const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';
  const currencySymbol = 'INR';

  // Sync selected modal item's price
  useEffect(() => {
    if (modalItemId) {
      const selectedItem = inventoryItems.find(i => i.id === modalItemId);
      if (selectedItem) {
        setModalRate(selectedItem.stock?.itemRate || 10);
      }
    } else {
      setModalRate(0);
    }
  }, [modalItemId, inventoryItems]);

  const matchedInventoryItems = inventoryItems.filter(i => {
    if (storeId) {
      const isMapped = storeItemMappings.some(m => m.storeId === storeId && m.itemId === i.id);
      if (!isMapped) return false;
    }
    return (i.itemName || '').toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
           (i.itemCode || '').toLowerCase().includes(itemSearchQuery.toLowerCase());
  });

  // Auto-generate GRN Number
  useEffect(() => {
    if (viewMode === 'form' && !editingGRNId) {
      setGRNNo(`GRN-${Date.now().toString().slice(-8)}`);
      setGateEntryDate(new Date().toISOString().split('T')[0]);
    }
  }, [viewMode, editingGRNId]);

  // Auto-focus barcode scanner
  useEffect(() => {
    if (viewMode === 'form' && autoFocusScanner && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [viewMode, autoFocusScanner, items.length]);

  // Global blur listener to restore focus to scanner if checked
  useEffect(() => {
    if (!autoFocusScanner || viewMode !== 'form') return;
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
  }, [autoFocusScanner, viewMode]);

  // Recalculate Line and Header totals dynamically
  useEffect(() => {
    let rawGross = 0;
    let rawVatTotal = 0;
    
    items.forEach(i => {
      const lineCost = Number(i.acceptedQuantity || 0) * Number(i.rate || 0);
      const lineDisc = Number(i.discountAmount || 0);
      const vatPct = Number(i.vatPercentage ?? 0);
      const afterDisc = Math.max(0, lineCost - lineDisc);
      const calculatedVat = afterDisc * (vatPct / 100);
      
      rawGross += lineCost;
      rawVatTotal += calculatedVat;
    });

    setGrossAmount(Number(rawGross.toFixed(2)));

    // Calculate header level adjustments
    let headerDisc = discountAmount;
    if (discountPercentage > 0) {
      headerDisc += (rawGross * (discountPercentage / 100));
    }
    
    const finalNet = Math.max(0, (rawGross - headerDisc) + rawVatTotal);
    setNetAmount(Number(finalNet.toFixed(2)));
  }, [items, discountAmount, discountPercentage]);

  // React to vendor change to update GST breakdown on all items
  useEffect(() => {
    if (items.length === 0) return;
    const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '' };
    const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';

    setItems(prev => prev.map(item => {
      const lineCost = Number(item.acceptedQuantity || 0) * Number(item.rate || 0);
      const lineDisc = Number(item.discountAmount || 0);
      const afterDisc = Math.max(0, lineCost - lineDisc);
      const vatPct = Number(item.vatPercentage ?? 0);
      const vatAmt = afterDisc * (vatPct / 100);
      
      const cgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const sgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const igstAmount = isIntrastate ? 0 : Number(vatAmt.toFixed(2));
      
      return {
        ...item,
        cgstAmount,
        sgstAmount,
        igstAmount
      };
    }));
  }, [vendorId]);

  // React to GRN Type change
  useEffect(() => {
    if (grnType !== 'From Purchase Order') {
      setPOId('');
    }
  }, [grnType]);

  // React to PO selection
  const handlePOChange = (selectedPoId: string) => {
    setPOId(selectedPoId);
    if (!selectedPoId) return;

    const po = purchaseOrders.find(p => p.id === selectedPoId);
    if (po) {
      setVendorId(po.vendorId);
      setStoreId(po.storeId);
      
      const vendor = vendors.find(v => v.id === po.vendorId);
      const vendorGst = vendor ? getVendorGstDetails(vendor) : { stateCode: '' };
      const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';

      // Import items from PO
      const imported = (po.items || []).map(pi => {
        const item = inventoryItems.find(inv => inv.id === pi.itemId);
        const qty = pi.quantity || 0;
        const rate = pi.unitCost || 0;
        const discPercent = pi.discountPercentage || 0;
        const discAmt = (qty * rate) * (discPercent / 100);
        const vatPct = resolveItemTaxPercentage(pi.itemId);
        const vatAmt = ((qty * rate) - discAmt) * (vatPct / 100);
        const total = (qty * rate) - discAmt + vatAmt;

        const cgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
        const sgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
        const igstAmount = isIntrastate ? 0 : Number(vatAmt.toFixed(2));

        return {
          itemId: pi.itemId,
          itemCode: pi.itemCode || item?.itemCode || 'UNK',
          itemName: pi.itemName || item?.itemName || 'Unknown Item',
          locator: 'MAIN-01',
          batchCode: `B-${Date.now().toString().slice(-4)}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          poQuantity: qty,
          receivedQuantity: qty,
          acceptedQuantity: qty,
          rate: rate,
          publicPrice: pi.publicPrice || rate * 1.25,
          unitCost: Number((total / (qty || 1)).toFixed(2)),
          discountPercentage: discPercent,
          discountAmount: Number(discAmt.toFixed(2)),
          vatPercentage: vatPct,
          vatAmount: Number(vatAmt.toFixed(2)),
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalAmount: Number(total.toFixed(2)),
          remarks: pi.remarks || '',
          isBulky: pi.isBulk || false
        };
      });

      setItems(imported);
      if (imported.length > 0) {
        setActiveItemIndex(0);
      }
      showToast('success', `Imported ${imported.length} items from PO ${po.poNo}`);
    }
  };

  // Reset form helper
  const resetForm = () => {
    setEditingGRNId(null);
    setGRNNo('');
    setGRNType('Direct');
    setVendorId('');
    setStoreId('');
    setPOId('');
    setGateEntryDate('');
    setGateEntryNo('');
    setDiscountPercentage(0);
    setDiscountAmount(0);
    setGrossAmount(0);
    setNetAmount(0);
    setStatus('Draft');
    setInvoiceNo('');
    setItems([]);
    setActiveItemIndex(null);
  };

  // Trigger grid edits
  const updateItemRow = (index: number, field: keyof GRNItem, value: any) => {
    const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '' };
    const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';

    setItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        let updated = { ...item, [field]: value };
        
        // If received qty or accepted qty or rate changes, recalculate values
        if (field === 'acceptedQuantity' || field === 'rate' || field === 'discountPercentage' || field === 'discountAmount' || field === 'vatPercentage') {
          const qty = Number(field === 'acceptedQuantity' ? value : updated.acceptedQuantity || 0);
          const rate = Number(field === 'rate' ? value : updated.rate || 0);
          const discPct = Number(field === 'discountPercentage' ? value : updated.discountPercentage || 0);
          const vatPct = Number(field === 'vatPercentage' ? value : updated.vatPercentage ?? 0);

          const cost = qty * rate;
          let discAmt = updated.discountAmount;
          
          if (field === 'discountPercentage') {
            discAmt = cost * (discPct / 100);
            updated.discountAmount = Number(discAmt.toFixed(2));
          } else if (field === 'discountAmount') {
            discAmt = Number(value);
            updated.discountPercentage = cost > 0 ? Number(((discAmt / cost) * 100).toFixed(2)) : 0;
          } else {
            // Recalculate disc amount based on percent
            discAmt = cost * (discPct / 100);
            updated.discountAmount = Number(discAmt.toFixed(2));
          }

          const taxable = Math.max(0, cost - discAmt);
          const vatAmt = taxable * (vatPct / 100);
          const total = taxable + vatAmt;
          const unitCost = qty > 0 ? total / qty : rate;

          updated.vatAmount = Number(vatAmt.toFixed(2));
          updated.totalAmount = Number(total.toFixed(2));
          updated.unitCost = Number(unitCost.toFixed(2));

          // GST breakdown
          if (isIntrastate) {
            updated.cgstAmount = Number((vatAmt / 2).toFixed(2));
            updated.sgstAmount = Number((vatAmt / 2).toFixed(2));
            updated.igstAmount = 0;
          } else {
            updated.cgstAmount = 0;
            updated.sgstAmount = 0;
            updated.igstAmount = Number(vatAmt.toFixed(2));
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
    if (activeItemIndex === index) {
      setActiveItemIndex(items.length > 1 ? 0 : null);
    } else if (activeItemIndex !== null && activeItemIndex > index) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  // Add Item to grid from search modal
  const handleAddModalItem = () => {
    if (!modalItemId) {
      showToast('error', 'Please select an item.');
      return;
    }
    const selectedItem = inventoryItems.find(i => i.id === modalItemId);
    if (!selectedItem) return;

    if (!modalBatchCode || !modalExpiryDate) {
      showToast('error', 'Batch Code and Expiry Date are required.');
      return;
    }

    const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '' };
    const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';

    const qty = modalQuantity;
    const rate = modalRate;
    const vatPct = resolveItemTaxPercentage(modalItemId);
    const cost = qty * rate;
    const vatAmt = cost * (vatPct / 100);
    const total = cost + vatAmt;

    const newItem: GRNItem = {
      itemId: modalItemId,
      itemName: selectedItem.itemName,
      itemCode: selectedItem.itemCode,
      locator: modalLocator,
      batchCode: modalBatchCode.toUpperCase(),
      expiryDate: modalExpiryDate,
      poQuantity: 0,
      receivedQuantity: qty,
      acceptedQuantity: qty,
      rate: rate,
      publicPrice: rate * 1.25,
      unitCost: Number((total / qty).toFixed(2)),
      discountPercentage: 0,
      discountAmount: 0,
      vatPercentage: vatPct,
      vatAmount: Number(vatAmt.toFixed(2)),
      cgstAmount: isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0,
      sgstAmount: isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0,
      igstAmount: isIntrastate ? 0 : Number(vatAmt.toFixed(2)),
      totalAmount: Number(total.toFixed(2)),
      remarks: '',
      isBulky: false
    };

    setItems(prev => [...prev, newItem]);
    setActiveItemIndex(items.length);
    setShowAddModal(false);
    
    // reset modal fields
    setModalItemId('');
    setItemSearchQuery('');
    setModalBatchCode('');
    setModalExpiryDate('');
    
    showToast('success', `${selectedItem.itemName} added to GRN list.`);
  };

  const processGRNBarcodeItem = (matchedItem: InventoryItem, scannedBatch?: string, scannedExpiry?: string) => {
    const isMapped = storeItemMappings.some(m => m.storeId === storeId && m.itemId === matchedItem.id);
    if (!isMapped) {
      showToast('error', `Item "${matchedItem.itemName}" is not mapped to the selected store.`);
      playErrorBeep();
      setBarcodeQuery('');
      return;
    }

    const batchCode = scannedBatch ? scannedBatch.toUpperCase() : `B-${Date.now().toString().slice(-4)}`;
    const expiryDate = scannedExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check if item is already in GRN list with the same batch
    const existingIndex = items.findIndex(item => item.itemId === matchedItem.id && item.batchCode === batchCode);

    const po = grnType === 'From Purchase Order' ? purchaseOrders.find(p => p.id === poId) : null;
    const poItem = po?.items?.find(pi => pi.itemId === matchedItem.id);

    if (grnType === 'From Purchase Order' && !poItem) {
      showToast('error', `Item "${matchedItem.itemName}" is not part of Purchase Order ${po?.poNo || ''}.`);
      playErrorBeep();
      setBarcodeQuery('');
      return;
    }

    if (existingIndex > -1) {
      // Increment quantity atomically
      const existingItem = items[existingIndex];
      const newQty = (existingItem.receivedQuantity || 0) + 1;
      
      const qty = newQty;
      const rate = existingItem.rate || 0;
      const discPct = existingItem.discountPercentage || 0;
      const vatPct = existingItem.vatPercentage ?? 0;
      
      const cost = qty * rate;
      const discAmt = cost * (discPct / 100);
      const taxable = Math.max(0, cost - discAmt);
      const vatAmt = taxable * (vatPct / 100);
      const total = taxable + vatAmt;
      const unitCost = qty > 0 ? total / qty : rate;
      
      const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '' };
      const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';
      
      const cgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const sgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const igstAmount = isIntrastate ? 0 : Number(vatAmt.toFixed(2));
      
      setItems(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          return {
            ...item,
            receivedQuantity: qty,
            acceptedQuantity: qty,
            discountAmount: Number(discAmt.toFixed(2)),
            vatAmount: Number(vatAmt.toFixed(2)),
            totalAmount: Number(total.toFixed(2)),
            unitCost: Number(unitCost.toFixed(2)),
            cgstAmount,
            sgstAmount,
            igstAmount
          };
        }
        return item;
      }));
      
      showToast('success', `Incremented quantity for "${matchedItem.itemName}" (Batch: ${batchCode})`);
      playSuccessBeep();
    } else {
      // Direct receipt or new PO item - add directly
      const qty = 1;
      const rate = poItem ? poItem.unitCost || 0 : (matchedItem.stock?.itemRate || 10);
      const discPct = poItem ? poItem.discountPercentage || 0 : 0;
      const vatPct = resolveItemTaxPercentage(matchedItem.id);
      
      const cost = qty * rate;
      const discAmt = cost * (discPct / 100);
      const taxable = Math.max(0, cost - discAmt);
      const vatAmt = taxable * (vatPct / 100);
      const total = taxable + vatAmt;
      
      const vendorGst = selectedVendor ? getVendorGstDetails(selectedVendor) : { stateCode: '' };
      const isIntrastate = !vendorGst.stateCode || vendorGst.stateCode === '07';
      
      const cgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const sgstAmount = isIntrastate ? Number((vatAmt / 2).toFixed(2)) : 0;
      const igstAmount = isIntrastate ? 0 : Number(vatAmt.toFixed(2));
      
      const newItem: GRNItem = {
        itemId: matchedItem.id,
        itemName: matchedItem.itemName,
        itemCode: matchedItem.itemCode,
        locator: 'MAIN-01',
        batchCode,
        expiryDate,
        poQuantity: poItem ? poItem.quantity || 0 : 0,
        receivedQuantity: qty,
        acceptedQuantity: qty,
        rate: rate,
        publicPrice: poItem ? poItem.publicPrice || rate * 1.25 : rate * 1.25,
        unitCost: Number((total / qty).toFixed(2)),
        discountPercentage: discPct,
        discountAmount: Number(discAmt.toFixed(2)),
        vatPercentage: vatPct,
        vatAmount: Number(vatAmt.toFixed(2)),
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount: Number(total.toFixed(2)),
        remarks: '',
        isBulky: poItem ? poItem.isBulk || false : false
      };
      
      setItems(prev => [...prev, newItem]);
      setActiveItemIndex(items.length);
      showToast('success', `Added "${matchedItem.itemName}" to GRN.`);
      playSuccessBeep();
    }

    setLastGS1Scan({
      gtin: matchedItem.gtin || '',
      batch: scannedBatch,
      expiry: scannedExpiry
    });
    setBarcodeQuery('');
  };

  const handleBarcodeScan = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const query = barcodeQuery.trim();
    if (!query) return;

    if (!storeId) {
      showToast('error', 'Please select a store first.');
      playErrorBeep();
      setBarcodeQuery('');
      return;
    }

    const parsedGS1 = parseGS1(query);
    const hasParsedGtin = !!parsedGS1.gtin;
    const searchGtin = parsedGS1.gtin || query;
    const searchBatchNo = parsedGS1.batch;
    const searchExpiry = parsedGS1.expiry;

    const isStandardBarcode = hasParsedGtin || (/^\d+$/.test(query) && query.length >= 8 && query.length <= 14);

    const cleanQuery = searchGtin.replace(/^0+/, '');
    const matchedItem = inventoryItems.find(i => {
      if (!i.isActive) return false;
      if (i.itemCode?.toLowerCase() === query.toLowerCase() || i.itemCode?.toLowerCase() === searchGtin.toLowerCase()) {
        return true;
      }
      if (isStandardBarcode && i.gtin) {
        const cleanItemGtin = i.gtin.replace(/^0+/, '');
        if (cleanItemGtin === cleanQuery) return true;
      }
      return false;
    });

    if (!matchedItem) {
      playErrorBeep();
      setUnrecognizedScan({
        gtin: searchGtin,
        batch: searchBatchNo,
        expiry: searchExpiry
      });
      setMappingItemId('');
      setMappingSearchQuery('');
      setBarcodeQuery('');
      return;
    }

    processGRNBarcodeItem(matchedItem, searchBatchNo, searchExpiry);
  };

  const handleConfirmMapping = async () => {
    if (!unrecognizedScan || !mappingItemId) {
      showToast('error', 'Please select an item to link.');
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
      playSuccessBeep();

      processGRNBarcodeItem(updatedItem, unrecognizedScan.batch, unrecognizedScan.expiry);

      setUnrecognizedScan(null);
      setMappingItemId('');
      setMappingSearchQuery('');
    } catch (err: any) {
      showToast('error', `Mapping failed: ${err.message}`);
      playErrorBeep();
    }
  };

  // Save GRN action
  const handleSave = async (e: React.FormEvent, finalStatus: 'Draft' | 'Submitted') => {
    e.preventDefault();
    if (!vendorId || !storeId) {
      showToast('error', 'Vendor and Store are required.');
      return;
    }
    if (!gateEntryDate || !gateEntryNo) {
      showToast('error', 'Gate Entry Date and Gate Entry No are required.');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Please add at least one item.');
      return;
    }

    // Validate batch/expiry for all items
    const invalidItem = items.find(i => !i.batchCode || !i.expiryDate || i.acceptedQuantity <= 0);
    if (invalidItem) {
      showToast('error', `Please make sure all items have batch code, expiry date, and accepted qty > 0. (${invalidItem.itemName})`);
      return;
    }

    // GST slab change confirmation check
    for (const item of items) {
      const selectedVat = Number(item.vatPercentage || 0);
      const existingMapping = itemTaxMappings.find(m => m.itemId === item.itemId);
      if (existingMapping) {
        const tax = taxMasters.find(t => t.id === existingMapping.taxId && t.status === 'Active');
        const existingVat = tax ? Number(tax.percentage || 0) : 0;
        if (existingVat !== selectedVat) {
          const confirmShift = window.confirm(
            `Item "${item.itemName}" was previously mapped to GST ${existingVat}%. Do you want to proceed and shift this item to the new ${selectedVat}% slab?`
          );
          if (!confirmShift) {
            return; // Abort saving the GRN
          }
        }
      }
    }

    // WAC posting confirmation warning
    if (finalStatus === 'Submitted') {
      const confirmSubmit = window.confirm(
        "Submitting this Goods Receipt Note is a FINAL transaction. This will automatically post STOCKIN entries to the stock ledger and recalculate moving Weighted Average Cost (WAC) valuation reactively. Do you wish to finalize and submit?"
      );
      if (!confirmSubmit) return;
    }

    const grnToSave: GRN = {
      id: editingGRNId || crypto.randomUUID(),
      grnNo,
      grnType,
      vendorId,
      storeId,
      poId: poId || undefined,
      gateEntryDate,
      gateEntryNo,
      discountPercentage,
      discountAmount,
      netAmount,
      grossAmount,
      status: finalStatus,
      items,
      invoiceNo: invoiceNo || undefined,
      createdAt: new Date().toISOString()
    };

    const success = await saveGRN(grnToSave);
    if (success) {
      setViewMode('list');
      resetForm();
    }
  };

  // Load GRN for editing
  const handleEdit = (grn: GRN) => {
    if (grn.status === 'Submitted') {
      showToast('info', 'Submitted GRNs cannot be edited as they have already posted stock movements.');
      return;
    }
    setEditingGRNId(grn.id);
    setGRNNo(grn.grnNo);
    setGRNType(grn.grnType);
    setVendorId(grn.vendorId);
    setStoreId(grn.storeId);
    setPOId(grn.poId || '');
    setGateEntryDate(grn.gateEntryDate);
    setGateEntryNo(grn.gateEntryNo);
    setDiscountPercentage(grn.discountPercentage || 0);
    setDiscountAmount(grn.discountAmount || 0);
    setGrossAmount(grn.grossAmount);
    setNetAmount(grn.netAmount);
    setStatus(grn.status);
    setInvoiceNo(grn.invoiceNo || '');
    setItems(grn.items || []);
    if (grn.items && grn.items.length > 0) {
      setActiveItemIndex(0);
    } else {
      setActiveItemIndex(null);
    }
    setViewMode('form');
  };

  const filteredGRNs = grns.filter(g => 
    g.grnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.grnType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.gateEntryNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedGRNs = filteredGRNs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            Goods Receipt Note (GRN)
          </h1>
          <p className="text-sm text-slate-500">Record incoming goods, track batch details, check accepted margins, and update moving WAC valuations reactively</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'list' ? (
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Goods Receipt (GRN)
            </button>
          ) : (
            <button 
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              View Receipts List
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        /* ================== LIST VIEW ================== */
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          
          {/* Search bar */}
          <div className="p-6 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by receipt no, type, or gate entry..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-auto">
            {filteredGRNs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-4">GRN Number</th>
                    <th className="px-8 py-4">Receipt Type</th>
                    <th className="px-8 py-4">Vendor Details</th>
                    <th className="px-8 py-4">Store Reference</th>
                    <th className="px-8 py-4">Gate Details</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Net Amount</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedGRNs.map((g) => {
                    const vendor = vendors.find(v => v.id === g.vendorId);
                    const store = stores.find(s => s.id === g.storeId);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-4.5 font-bold text-slate-800 tracking-tight">{g.grnNo}</td>
                        <td className="px-8 py-4.5">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-100">
                            {g.grnType}
                          </span>
                        </td>
                        <td className="px-8 py-4.5">
                          <div className="font-bold text-slate-700">{vendor?.name || 'Direct / Local'}</div>
                          <div className="text-xs text-slate-400 font-medium">{vendor?.code || 'L-001'}</div>
                        </td>
                        <td className="px-8 py-4.5 font-semibold text-slate-600">{store?.storeName || 'Pharmacy Store'}</td>
                        <td className="px-8 py-4.5">
                          <div className="text-slate-700 font-medium">Gate No: <span className="font-bold text-slate-800">{g.gateEntryNo}</span></div>
                          <div className="text-xs text-slate-400 font-semibold">{g.gateEntryDate}</div>
                        </td>
                        <td className="px-8 py-4.5">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${
                            g.status === 'Submitted' 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {g.status}
                          </span>
                        </td>
                        <td className="px-8 py-4.5 font-bold text-slate-800">{g.netAmount} INR</td>
                        <td className="px-8 py-4.5 text-right">
                          <div className="flex justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEdit(g)}
                              disabled={g.status === 'Submitted'}
                              title={g.status === 'Submitted' ? 'Submitted GRNs cannot be edited' : 'Edit GRN'}
                              className={`p-2 rounded-lg transition-all ${
                                g.status === 'Submitted' 
                                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteGRN(g.id)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 rounded-lg text-slate-600 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <Truck className="w-16 h-16 text-slate-300 stroke-[1.5]" />
                <div className="font-semibold text-slate-500">No Goods Receipt Notes registered</div>
                <div className="text-xs text-slate-400">Click "Create Goods Receipt (GRN)" to begin receiving items.</div>
              </div>
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredGRNs.length / itemsPerPage)}
            totalItems={filteredGRNs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            colorTheme="emerald"
          />
        </div>
      ) : (
        /* ================== FORM VIEW ================== */
        <form onSubmit={(e) => handleSave(e, 'Draft')} className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Header Panel Info */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-5 h-5 text-emerald-600" />
                Receipt Header Credentials
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GRN Number</label>
                  <input 
                    type="text" 
                    readOnly
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm outline-none" 
                    value={grnNo} 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt Type</label>
                  <select 
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={grnType}
                    onChange={(e) => setGRNType(e.target.value as any)}
                  >
                    <option value="Direct">Direct Receipt</option>
                    <option value="From Purchase Order">From Purchase Order</option>
                    <option value="From Letter of Indent">From Letter of Indent</option>
                    <option value="From Expiry Item Return">From Expiry Item Return</option>
                    <option value="From Consignment">From Consignment</option>
                  </select>
                </div>

                {grnType === 'From Purchase Order' && (
                  <div className="flex flex-col gap-2 md:col-span-2 bg-emerald-50/50 p-4.5 rounded-2xl border border-emerald-100/50">
                    <label className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      Select Approved Purchase Order
                    </label>
                    <select 
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={poId}
                      onChange={(e) => handlePOChange(e.target.value)}
                    >
                      <option value="">-- Choose Purchase Order --</option>
                      {purchaseOrders.filter(p => 
                        p.status === 'Approved' && 
                        (!vendorId || p.vendorId === vendorId) && 
                        (!storeId || p.storeId === storeId) &&
                        (!grns.some(g => g.poId === p.id && g.id !== editingGRNId))
                      ).map(p => (
                        <option key={p.id} value={p.id}>{p.poNo} - Net: {p.netAmount} {currencySymbol} ({vendors.find(v => v.id === p.vendorId)?.name})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</label>
                  <select 
                    disabled={grnType === 'From Purchase Order'}
                    className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store (Warehouse Location)</label>
                  <select 
                    disabled={grnType === 'From Purchase Order'}
                    className="px-4 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                  >
                    <option value="">-- Choose Store --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Entry Date</label>
                  <input 
                    type="date"
                    required
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={gateEntryDate}
                    onChange={(e) => setGateEntryDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Entry Number</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. GT-88421"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    value={gateEntryNo}
                    onChange={(e) => setGateEntryNo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel Vendor/Store Overlay Information */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              {selectedVendor ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Active Vendor Contact Card</h3>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-xl font-bold">
                        {selectedVendor.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-700 text-sm">{selectedVendor.name}</div>
                        <div className="text-xs font-bold text-slate-400">{selectedVendor.code}</div>
                      </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-slate-100 text-xs mt-1">
                      <button 
                        type="button"
                        onClick={() => setVendorTab('gst')}
                        className={`flex-1 py-1.5 font-bold text-center border-b-2 transition-all ${
                          vendorTab === 'gst' 
                            ? 'border-emerald-600 text-emerald-700' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        GST Details
                      </button>
                      <button 
                        type="button"
                        onClick={() => setVendorTab('location')}
                        className={`flex-1 py-1.5 font-bold text-center border-b-2 transition-all ${
                          vendorTab === 'location' 
                            ? 'border-emerald-600 text-emerald-700' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Location
                      </button>
                    </div>

                    {vendorTab === 'gst' ? (
                      <div className="text-xs text-slate-500 flex flex-col gap-1.5 mt-2">
                        {(() => {
                          const gstDetails = getVendorGstDetails(selectedVendor);
                          return (
                            <>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Vendor Address</span>
                                <div className="text-slate-700 font-semibold mt-0.5">{gstDetails.address}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">State Code</span>
                                <div className="text-slate-700 font-semibold mt-0.5">{gstDetails.stateCode ? `${gstDetails.stateCode} (${gstDetails.state})` : 'N/A'}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">State</span>
                                <div className="text-slate-700 font-semibold mt-0.5">{gstDetails.state}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">GSTIN Registered</span>
                                <div className="text-slate-700 font-bold mt-0.5">{gstDetails.hasGst ? 'Yes' : 'No'}</div>
                              </div>
                              {gstDetails.gstin && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">GSTIN</span>
                                  <div className="text-slate-800 font-mono font-black tracking-wider mt-0.5">{gstDetails.gstin}</div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 flex flex-col gap-1.5 mt-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Address</span>
                          <div className="text-slate-700 font-semibold mt-0.5">{getVendorGstDetails(selectedVendor).address}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Contact Agent</span>
                          <div className="text-slate-700 font-semibold mt-0.5">{selectedVendor.contactDetails?.contactPerson || 'Primary Agent'}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Country</span>
                          <div className="text-slate-700 font-semibold mt-0.5">India</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-3xl">
                  <User className="w-12 h-12 text-slate-200" />
                  <div className="text-xs font-bold text-slate-400">Select Vendor to display primary info card panel</div>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Tabs & Receipts Item Grid Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
            
            {/* Tab switch panel */}
            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center gap-4 flex-wrap">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setBottomTab('items')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    bottomTab === 'items' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid className="w-4 h-4 text-emerald-600" />
                  Line Items ({items.length})
                </button>
                <button 
                  type="button"
                  onClick={() => setBottomTab('billing')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    bottomTab === 'billing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Billing Structure
                </button>
                <button 
                  type="button"
                  onClick={() => setBottomTab('other')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    bottomTab === 'other' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Other Details
                </button>
              </div>

              {bottomTab === 'items' && grnType !== 'From Purchase Order' && (
                <button 
                  type="button"
                  onClick={() => { setItemSearchQuery(''); setShowAddModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Direct Line Item
                </button>
              )}
            </div>

            {/* Dynamic Content Panel */}
            <div className="p-6">
              
              {bottomTab === 'items' && (
                <div className="flex flex-col gap-4">
                  {/* Barcode Scanner Bar */}
                  {storeId && (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col gap-2 shrink-0 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[280px] max-w-md">
                          <div className="relative group">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                            <input
                              ref={scannerInputRef}
                              id="grn-barcode-input"
                              type="text"
                              className="w-full pl-9 pr-24 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 font-medium transition-all"
                              placeholder="Scan item barcode (GTIN) or code to receive..."
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
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
                  )}

                  <div className="overflow-x-auto">
                  {items.length > 0 ? (
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                      <thead>
                        <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-3">
                          <th className="py-2.5 px-3">Item Code</th>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">Locator</th>
                          <th className="py-2.5 px-3">Batch Code</th>
                          <th className="py-2.5 px-3">Batch Date</th>
                          <th className="py-2.5 px-3">Expiry Date</th>
                          <th className="py-2.5 px-3 text-center">PO Qty</th>
                          <th className="py-2.5 px-3 text-center">Received Qty</th>
                          <th className="py-2.5 px-3 text-center">Accepted Qty</th>
                          <th className="py-2.5 px-3">Rate</th>
                          <th className="py-2.5 px-3">Public Price</th>
                          <th className="py-2.5 px-3">Unit Cost</th>
                          <th className="py-2.5 px-3">Discount %</th>
                          <th className="py-2.5 px-3">Discount Amt</th>
                          <th className="py-2.5 px-3">GST Slab %</th>
                          {isIntrastate ? (
                            <>
                              <th className="py-2.5 px-3">SGST Amt</th>
                              <th className="py-2.5 px-3">CGST Amt</th>
                            </>
                          ) : (
                            <th className="py-2.5 px-3">IGST Amt</th>
                          )}
                          <th className="py-2.5 px-3 font-bold text-slate-800">Total Amt ({currencySymbol})</th>
                          <th className="py-2.5 px-3">Remarks</th>
                          <th className="py-2.5 px-3 text-center">Bulky</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {items.map((i, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="py-3 px-3 font-bold text-slate-800">{i.itemCode}</td>
                            <td className="py-3 px-3 font-semibold text-slate-600 max-w-[200px] truncate" title={i.itemName}>{i.itemName}</td>
                            <td className="py-3 px-3">
                              <input 
                                type="text"
                                className="w-18 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-semibold"
                                value={i.locator || ''}
                                onChange={(e) => updateItemRow(idx, 'locator', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-3 font-bold">
                              <input 
                                type="text"
                                placeholder="BATCH"
                                className="w-20 px-2 py-1 bg-amber-50/50 border border-amber-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-extrabold uppercase"
                                value={i.batchCode}
                                onChange={(e) => updateItemRow(idx, 'batchCode', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input 
                                type="date"
                                className="px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500"
                                value={i.batchDate || ''}
                                onChange={(e) => updateItemRow(idx, 'batchDate', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input 
                                type="date"
                                required
                                className="px-2 py-1 bg-rose-50/30 border border-rose-200 rounded-lg outline-none text-xs focus:border-rose-500 font-bold"
                                value={i.expiryDate}
                                onChange={(e) => updateItemRow(idx, 'expiryDate', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-500">{i.poQuantity || 0}</td>
                            <td className="py-3 px-3 text-center">
                              <input 
                                type="number"
                                min="0"
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 text-center font-semibold"
                                value={i.receivedQuantity}
                                onChange={(e) => updateItemRow(idx, 'receivedQuantity', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3 text-center font-black">
                              <input 
                                type="number"
                                min="0"
                                className="w-16 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg outline-none text-xs focus:border-emerald-500 text-center font-extrabold text-emerald-800"
                                value={i.acceptedQuantity}
                                onChange={(e) => updateItemRow(idx, 'acceptedQuantity', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-700">
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-bold"
                                value={i.rate}
                                onChange={(e) => updateItemRow(idx, 'rate', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              <input 
                                type="number"
                                min="0"
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-medium"
                                value={i.publicPrice || 0}
                                onChange={(e) => updateItemRow(idx, 'publicPrice', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-500">{i.unitCost} {currencySymbol}</td>
                            <td className="py-3 px-3">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                className="w-12 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-semibold"
                                value={i.discountPercentage || 0}
                                onChange={(e) => updateItemRow(idx, 'discountPercentage', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-16 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-semibold"
                                value={i.discountAmount || 0}
                                onChange={(e) => updateItemRow(idx, 'discountAmount', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <select 
                                className="w-16 px-1 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500 font-bold"
                                value={i.vatPercentage ?? 0}
                                onChange={(e) => updateItemRow(idx, 'vatPercentage', Number(e.target.value))}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            {isIntrastate ? (
                              <>
                                <td className="py-3 px-3 text-slate-500">{i.sgstAmount ?? 0} {currencySymbol}</td>
                                <td className="py-3 px-3 text-slate-500">{i.cgstAmount ?? 0} {currencySymbol}</td>
                              </>
                            ) : (
                              <td className="py-3 px-3 text-slate-500">{i.igstAmount ?? 0} {currencySymbol}</td>
                            )}
                            <td className="py-3 px-3 font-extrabold text-slate-800">{i.totalAmount} {currencySymbol}</td>
                            <td className="py-3 px-3">
                              <input 
                                type="text"
                                placeholder="..."
                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg outline-none text-xs focus:border-emerald-500"
                                value={i.remarks || ''}
                                onChange={(e) => updateItemRow(idx, 'remarks', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input 
                                type="checkbox"
                                className="rounded text-emerald-600 outline-none focus:ring-0"
                                checked={i.isBulky}
                                onChange={(e) => updateItemRow(idx, 'isBulky', e.target.checked)}
                              />
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 border border-dashed border-slate-200 rounded-2xl">
                      <Layers className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                      <div className="text-xs font-extrabold text-slate-500">No items added to Goods Receipt</div>
                      {grnType === 'From Purchase Order' ? (
                        <div className="text-xs text-slate-400">Select an approved Purchase Order above to auto-import line items</div>
                      ) : (
                        <div className="text-xs text-slate-400">Click "Add Direct Line Item" to begin registering items</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}

              {bottomTab === 'billing' && (
                <div className="max-w-md flex flex-col gap-4 animate-in fade-in duration-200">
                  <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Receipt Financial Margins</h3>
                  
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                    <span>Gross Material Amount:</span>
                    <span className="font-bold text-slate-800">{grossAmount} {currencySymbol}</span>
                  </div>
 
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase">Discount Percentage %</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        className="px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase">Discount Amount</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        className="px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      />
                    </div>
                  </div>
 
                  <div className="p-4.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex justify-between items-center mt-3">
                    <div>
                      <div className="font-bold text-emerald-800 text-sm">Receipt Net Total (after GST)</div>
                      <div className="text-xs text-emerald-500 font-semibold mt-0.5">Adjusted valuation calculated dynamically</div>
                    </div>
                    <div className="text-2xl font-black text-emerald-700 tracking-tight">{netAmount} {currencySymbol}</div>
                  </div>
                </div>
              )}
 
              {bottomTab === 'other' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Transit / Delivery Particulars</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Number</label>
                      <input 
                        type="text"
                        placeholder="e.g. INV-2026-DL789"
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal font-semibold"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Checkpoint / Security Remarks</label>
                    <textarea 
                      placeholder="Enter gate inspection observations, vehicle plate number, or consignment notes..."
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
                    ></textarea>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Form Actions footer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center gap-4">
            <button 
              type="button"
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-all text-sm active:scale-95"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button 
                type="submit"
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm active:scale-95"
              >
                Save Draft
              </button>
              <button 
                type="button"
                onClick={(e) => handleSave(e, 'Submitted')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all text-sm active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4.5 h-4.5" />
                Post & Finalize GRN
              </button>
            </div>
          </div>

        </form>
      )}

      {/* Add Direct Line Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Grid className="w-5.5 h-5.5 text-emerald-600" />
                  Add Direct Line Item Lookup
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Search catalog and input batch receipts details</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 hover:bg-slate-100 rounded-lg font-bold text-slate-400 hover:text-slate-700 text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 overflow-auto max-h-[500px]">
              
              {/* Lookup Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Type code or item name to filter catalog..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                />
              </div>

              {/* Item selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Item</label>
                <select 
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={modalItemId}
                  onChange={(e) => setModalItemId(e.target.value)}
                >
                  <option value="">-- Choose Item --</option>
                  {matchedInventoryItems.map(i => (
                    <option key={i.id} value={i.id}>{i.itemCode} - {i.itemName} ({i.baseUom})</option>
                  ))}
                </select>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity Received</label>
                  <input 
                    type="number"
                    min="1"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={modalQuantity}
                    onChange={(e) => setModalQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Cost Rate ({currencySymbol})</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                    value={modalRate}
                    onChange={(e) => setModalRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-amber-50/20 p-4.5 rounded-2xl border border-amber-100/50">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Batch Code</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. B-993A"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-extrabold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all uppercase"
                    value={modalBatchCode}
                    onChange={(e) => setModalBatchCode(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Expiry Date</label>
                  <input 
                    type="date"
                    required
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    value={modalExpiryDate}
                    onChange={(e) => setModalExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Warehouse Locator</label>
                  <input 
                    type="text"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={modalLocator}
                    onChange={(e) => setModalLocator(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleAddModalItem}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 transition-all active:scale-95"
              >
                Append to Receipts Grid
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Unrecognized Barcode Mapping Modal */}
      {unrecognizedScan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-amber-50 border-b border-amber-100">
              <h3 className="text-lg font-black text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5.5 h-5.5 text-amber-600" />
                ⚠️ UNRECOGNIZED BARCODE DETECTED
              </h3>
              <p className="text-xs text-amber-600 mt-1 font-semibold">This barcode is not linked to any item in the catalog. Link it now to proceed.</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 overflow-auto max-h-[400px]">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs flex flex-col gap-2 font-semibold text-slate-600">
                <div>Scanned GTIN: <span className="font-mono font-bold text-slate-800">{unrecognizedScan.gtin}</span></div>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>Parsed Batch: <span className="font-bold text-slate-800">{unrecognizedScan.batch || 'N/A'}</span></div>
                  <div>Parsed Expiry: <span className="font-bold text-slate-800">{unrecognizedScan.expiry || 'N/A'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Catalog to Link this Barcode</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by item name or code..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white placeholder-slate-400 font-medium"
                    value={mappingSearchQuery}
                    onChange={e => setMappingSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Matching items selector */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 font-semibold">Matching Items Found:</span>
                <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                  {inventoryItems
                    .filter(i => 
                      i.isActive && 
                      (!storeId || storeItemMappings.some(m => m.storeId === storeId && m.itemId === i.id)) &&
                      (i.itemName.toLowerCase().includes(mappingSearchQuery.toLowerCase()) || 
                       i.itemCode.toLowerCase().includes(mappingSearchQuery.toLowerCase()))
                    )
                    .slice(0, 15)
                    .map(item => (
                      <label 
                        key={item.id} 
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                          mappingItemId === item.id ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="mappingItem"
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                          checked={mappingItemId === item.id}
                          onChange={() => setMappingItemId(item.id)}
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">{item.itemName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.itemCode} · {item.itemCategory}</p>
                        </div>
                      </label>
                    ))}
                  {inventoryItems.filter(i => 
                    i.isActive && 
                    (!storeId || storeItemMappings.some(m => m.storeId === storeId && m.itemId === i.id)) &&
                    (i.itemName.toLowerCase().includes(mappingSearchQuery.toLowerCase()) || 
                     i.itemCode.toLowerCase().includes(mappingSearchQuery.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 italic">No store-mapped items match your search.</div>
                  )}
                </div>
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
                disabled={!mappingItemId}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
