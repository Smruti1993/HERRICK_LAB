import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { PurchaseOrder, PurchaseOrderItem, POAddressDetails, POOtherDetails, POTerm, InventoryItem } from '../types';
import { Pagination } from '../components/Pagination';
import { 
  Plus, Search, Edit2, Trash2, ShieldCheck, Check, Info, FileText, 
  MapPin, Landmark, Award, Globe, User, Percent, AlertTriangle, ArrowLeft,
  DollarSign, ShoppingCart, ShoppingBag, Calendar, Layers, Activity
} from 'lucide-react';

export const PurchaseOrderPage: React.FC = () => {
  const { 
    purchaseOrders, savePurchaseOrder, deletePurchaseOrder,
    vendors, stores, taxMasters, inventoryItems, itemTaxMappings, showToast,
    formatCurrency, selectedCurrency
  } = useData();

  const decimals = selectedCurrency === 'BHD' ? 3 : 2;

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Header Form States
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [poNo, setPONo] = useState('');
  const [poType, setPOType] = useState('Direct Purchase Order');
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [refDocDate, setRefDocDate] = useState('');
  const [refDocNo, setRefDocNo] = useState('');
  const [purchaseOrganisation, setPurchaseOrganisation] = useState('Pharmacy');
  const [currencyCode, setCurrencyCode] = useState('Saudi Riyal');
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState(1.0);
  const [validTill, setValidTill] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxCode, setTaxCode] = useState('');
  const [isNonStock, setIsNonStock] = useState(false);
  const [accountCode, setAccountCode] = useState('');
  const [netAmount, setNetAmount] = useState(0);

  // Middle Tabs state
  const [middleTab, setMiddleTab] = useState<'address' | 'other' | 'imported'>('address');
  const [addressDetails, setAddressDetails] = useState<POAddressDetails>({ billingAddress: '', shippingAddress: '' });
  const [otherDetails, setOtherDetails] = useState<POOtherDetails>({ deliveryTerms: '', shipmentMode: '', paymentMethod: 'Net 30' });
  const [importedItems, setImportedItems] = useState('');

  // Bottom Tabs state
  const [bottomTab, setBottomTab] = useState<'items' | 'billing' | 'terms' | 'advance'>('items');

  // Items tab states
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // New Purchase Order Terms State
  const [poTerms, setPoTerms] = useState<POTerm[]>([]);

  // Add Item Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalItemId, setModalItemId] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [modalIsFoc, setModalIsFoc] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalUnit, setModalUnit] = useState('Box');
  const [modalCurrentStock, setModalCurrentStock] = useState(0);
  const [modalPriceType, setModalPriceType] = useState('PUBLIC PRICE');
  const [modalPublicPrice, setModalPublicPrice] = useState(0);
  const [modalDiscount, setModalDiscount] = useState(0.0);

  // Sync selected modal item's details (stock, rate, purchase UOM)
  useEffect(() => {
    if (modalItemId) {
      const selectedItem = inventoryItems.find(i => i.id === modalItemId);
      if (selectedItem) {
        setModalCurrentStock(selectedItem.stock?.reservedQty || 0);
        setModalPublicPrice(selectedItem.stock?.itemRate || 0);
        setModalUnit(selectedItem.purchaseUom || 'BOX');
      }
    } else {
      setModalCurrentStock(0);
      setModalPublicPrice(0);
      setModalUnit('BOX');
    }
  }, [modalItemId, inventoryItems]);

  const matchedInventoryItems = inventoryItems.filter(i => 
    i.itemName.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    i.itemCode.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  // Selected Line Item Detail Panel fields (binds to active item row)
  const [sourceDocNum, setSourceDocNum] = useState('');
  const [sourceDocDate, setSourceDocDate] = useState('');
  const [sourceQuantity, setSourceQuantity] = useState(0);
  const [pendingQuantity, setPendingQuantity] = useState(0);
  const [shortCloseQuantity, setShortCloseQuantity] = useState(0);

  // Auto-generate PO Number
  useEffect(() => {
    if (viewMode === 'form' && !editingPOId) {
      setPONo(`PO-${Date.now().toString().slice(-8)}`);
    }
  }, [viewMode, editingPOId]);

  // Recalculate Net Amount dynamically
  useEffect(() => {
    let subtotal = 0;
    items.forEach(i => {
      const itemCost = i.unitCost || 0;
      const qty = i.quantity || 0;
      const discPercent = i.discountPercentage || 0;
      const itemSub = qty * itemCost;
      const itemDisc = itemSub * (discPercent / 100);
      subtotal += (itemSub - itemDisc);
    });

    // Apply header discount
    let totalDisc = discountAmount;
    if (discountPercentage > 0) {
      totalDisc += (subtotal * (discountPercentage / 100));
    }
    let afterDisc = Math.max(0, subtotal - totalDisc);

    // Apply tax if selected: only calculate tax for items mapped with tax
    let taxAmt = 0;
    if (taxCode) {
      const selectedTax = taxMasters.find(t => t.id === taxCode);
      if (selectedTax) {
        let taxableSubtotal = 0;
        items.forEach(i => {
          const isTaxed = itemTaxMappings.some(m => m.itemId === i.itemId);
          if (isTaxed) {
            const itemCost = i.unitCost || 0;
            const qty = i.quantity || 0;
            const discPercent = i.discountPercentage || 0;
            const itemSub = qty * itemCost;
            const itemDisc = itemSub * (discPercent / 100);
            taxableSubtotal += (itemSub - itemDisc);
          }
        });

        if (subtotal > 0) {
          const ratio = taxableSubtotal / subtotal;
          const proportionalAfterDisc = Math.max(0, taxableSubtotal - (totalDisc * ratio));
          taxAmt = proportionalAfterDisc * (selectedTax.percentage / 100);
        }
      }
    }

    setNetAmount(Number((afterDisc + taxAmt).toFixed(decimals)));
  }, [items, discountAmount, discountPercentage, taxCode, taxMasters, itemTaxMappings]);

  // Sync right-hand detail panel fields when activeItemIndex changes
  useEffect(() => {
    if (activeItemIndex !== null && items[activeItemIndex]) {
      const active = items[activeItemIndex];
      setSourceDocNum(active.sourceDocNum || '');
      setSourceDocDate(active.sourceDocDate || '');
      setSourceQuantity(active.sourceQuantity || 0);
      setPendingQuantity(active.pendingQuantity || 0);
      setShortCloseQuantity(active.shortCloseQuantity || 0);
    } else {
      setSourceDocNum('');
      setSourceDocDate('');
      setSourceQuantity(0);
      setPendingQuantity(0);
      setShortCloseQuantity(0);
    }
  }, [activeItemIndex]);

  // Update right-hand fields back to active item
  const updateActiveItemDetails = (field: string, value: any) => {
    if (activeItemIndex === null) return;
    setItems(prev => prev.map((item, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...item,
          [field]: value
        };
      }
      return item;
    }));
  };

  const resetForm = () => {
    setEditingPOId(null);
    setPONo('');
    setPOType('Direct Purchase Order');
    setVendorId('');
    setStoreId('');
    setRefDocDate('');
    setRefDocNo('');
    setPurchaseOrganisation('Pharmacy');
    setCurrencyCode('Saudi Riyal');
    setCurrencyExchangeRate(1.0);
    setValidTill('');
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setTaxCode('');
    setIsNonStock(false);
    setAccountCode('');
    setNetAmount(0);

    setAddressDetails({ billingAddress: '', shippingAddress: '' });
    setOtherDetails({ deliveryTerms: '', shipmentMode: '', paymentMethod: 'Net 30' });
    setImportedItems('');
    setItems([]);
    setActiveItemIndex(null);
    setPoTerms([]);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPOId(po.id);
    setPONo(po.poNo);
    setPOType(po.poType);
    setVendorId(po.vendorId);
    setStoreId(po.storeId);
    setRefDocDate(po.refDocDate || '');
    setRefDocNo(po.refDocNo || '');
    setPurchaseOrganisation(po.purchaseOrganisation);
    setCurrencyCode(po.currencyCode);
    setCurrencyExchangeRate(po.currencyExchangeRate || 1.0);
    setValidTill(po.validTill || '');
    setDiscountAmount(po.discountAmount || 0);
    setDiscountPercentage(po.discountPercentage || 0);
    setTaxCode(po.taxCode || '');
    setIsNonStock(po.isNonStock);
    setAccountCode(po.accountCode || '');
    setNetAmount(po.netAmount);

    setAddressDetails(po.addressDetails || { billingAddress: '', shippingAddress: '' });
    setOtherDetails(po.otherDetails || { deliveryTerms: '', shipmentMode: '', paymentMethod: 'Net 30' });
    setImportedItems(po.importedItems || '');
    setPoTerms(po.terms || []);
    
    // Process PO Items
    const rawItems = po.items || [];
    setItems(rawItems);
    if (rawItems.length > 0) {
      setActiveItemIndex(0);
    } else {
      setActiveItemIndex(null);
    }

    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !storeId) {
      showToast('error', 'Vendor and Store are required.');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Please add at least one line item to the purchase order.');
      return;
    }

    const poToSave: PurchaseOrder = {
      id: editingPOId || crypto.randomUUID(),
      poNo,
      poType,
      vendorId,
      storeId,
      refDocDate,
      refDocNo,
      purchaseOrganisation,
      currencyCode,
      currencyExchangeRate,
      validTill,
      discountAmount,
      discountPercentage,
      taxCode,
      isNonStock,
      accountCode,
      netAmount,
      addressDetails,
      otherDetails,
      importedItems,
      terms: poTerms,
      status: 'Approved',
      items,
      createdAt: new Date().toISOString()
    };

    const success = await savePurchaseOrder(poToSave);
    if (success) {
      setViewMode('list');
      resetForm();
    }
  };

  // Add Item Modal Submit Action
  const handleAddModalItem = () => {
    if (!modalItemId) {
      showToast('error', 'Please select an item.');
      return;
    }
    const selectedItem = inventoryItems.find(i => i.id === modalItemId);
    if (!selectedItem) return;

    // Resolve tax for the item: if item not mapped with tax, no need to put tax or calculate
    const taxMapping = itemTaxMappings.find(m => m.itemId === modalItemId);
    const activeTax = taxMapping ? taxMasters.find(t => t.id === taxMapping.taxId && t.status === 'Active') : null;
    const taxStructure = activeTax ? `${activeTax.taxName} (${activeTax.percentage}%)` : '';

    const newItem: PurchaseOrderItem = {
      itemId: modalItemId,
      itemName: selectedItem.itemName,
      itemCode: selectedItem.itemCode,
      quantity: modalQuantity,
      publicPrice: modalPublicPrice,
      discountPercentage: modalDiscount,
      unitCost: modalIsFoc ? 0 : (selectedItem.stock?.itemRate || 10),
      isBulk: false,
      taxStructure: taxStructure,
      remarks: modalIsFoc ? 'FOC' : '',
      sourceDocNum: '',
      sourceDocDate: '',
      sourceQuantity: 0,
      pendingQuantity: 0,
      shortCloseQuantity: 0,
      isFoc: modalIsFoc,
      unit: modalUnit
    };

    setItems(prev => [...prev, newItem]);
    setActiveItemIndex(items.length);
    setShowAddModal(false);

    // Reset Modal States
    setModalItemId('');
    setItemSearchQuery('');
    setModalIsFoc(false);
    setModalQuantity(1);
    setModalUnit('Box');
    setModalCurrentStock(0);
    setModalPriceType('PUBLIC PRICE');
    setModalPublicPrice(0);
    setModalDiscount(0.0);

    showToast('success', `${selectedItem.itemName} added to order list.`);
  };

  // Vendor Terms Helpers
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const vendorTerms = selectedVendor?.terms || [];

  const handleSelectTerm = (termCode: string) => {
    if (!termCode) return;
    
    // Check if term already added
    if (poTerms.some(t => t.termCode === termCode)) {
      showToast('info', 'This term is already added.');
      return;
    }

    const termTemplate = vendorTerms.find(t => t.termCode === termCode) || 
      [
        { termCode: 'T001', termDesc: 'Deliver in 15 days.' },
        { termCode: 'T002', termDesc: 'Credit Period 30 Days.' },
        { termCode: 'T003', termDesc: 'Subject to QA Clearance.' }
      ].find(t => t.termCode === termCode);
      
    if (!termTemplate) return;
    
    setPoTerms(prev => [...prev, {
      termCode: termTemplate.termCode,
      termDesc: termTemplate.termDesc
    }]);
  };

  const updateTermDesc = (code: string, newDesc: string) => {
    setPoTerms(prev => prev.map(t => t.termCode === code ? { ...t, termDesc: newDesc } : t));
  };

  const handleRemoveTerm = (code: string) => {
    setPoTerms(prev => prev.filter(t => t.termCode !== code));
  };

  // Update item field inside table row
  const updateItemRow = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        let updated = { ...item, [field]: value };
        if (field === 'itemId') {
          const matched = inventoryItems.find(i => i.id === value);
          if (matched) {
            updated.itemName = matched.itemName;
            updated.itemCode = matched.itemCode;
            updated.unitCost = matched.stock?.itemRate || 10;
            
            // Resolve tax for the item: if item not mapped with tax, no need to put tax or calculate
            const taxMapping = itemTaxMappings.find(m => m.itemId === value);
            const activeTax = taxMapping ? taxMasters.find(t => t.id === taxMapping.taxId && t.status === 'Active') : null;
            updated.taxStructure = activeTax ? `${activeTax.taxName} (${activeTax.percentage}%)` : '';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  // Remove Item row from Line Grid
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
    if (activeItemIndex === index) {
      setActiveItemIndex(items.length > 1 ? 0 : null);
    } else if (activeItemIndex !== null && activeItemIndex > index) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  const filteredPOs = purchaseOrders.filter(po => 
    po.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.poType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.purchaseOrganisation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedPOs = filteredPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            Purchase Order
          </h1>
          <p className="text-sm text-slate-500">Formulate order sheets, negotiate discount structures, and link vendors</p>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'list' ? (
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </button>
          ) : (
            <button 
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              View All Orders
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
                placeholder="Search by order number or type..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-auto">
            {filteredPOs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-4">PO Number</th>
                    <th className="px-8 py-4">Vendor Details</th>
                    <th className="px-8 py-4">Store Reference</th>
                    <th className="px-8 py-4">Net Amount</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedPOs.map(po => {
                    const matchedVendor = vendors.find(v => v.id === po.vendorId);
                    const matchedStore = stores.find(s => s.id === po.storeId);
                    return (
                      <tr key={po.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="font-bold text-slate-800 text-sm">{po.poNo}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{po.poType}</div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="font-semibold text-slate-700 text-sm">{matchedVendor?.name || 'Unknown Vendor'}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">CODE: {matchedVendor?.code || 'UNK'}</div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="font-semibold text-slate-700 text-sm">{matchedStore?.storeName || 'Pharmacy Store'}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Code: {matchedStore?.storeCode || 'UNK'}</div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="font-black text-blue-600 text-sm">{formatCurrency(po.netAmount)}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(po)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit PO"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { if (confirm(`Are you sure you want to delete PO "${po.poNo}"?`)) deletePurchaseOrder(po.id); }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete PO"
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
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Info className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-700">No Purchase Orders Found</h3>
                <p className="text-sm text-slate-500">Create a purchase order or refine your search query.</p>
              </div>
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredPOs.length / itemsPerPage)}
            totalItems={filteredPOs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            colorTheme="blue"
          />
        </div>
      ) : (
        /* ================== FORM VIEW ================== */
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
            
            {/* Header section title */}
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Order Details Header
              </h2>
              <p className="text-xs text-slate-500">Set PO number, store targets, tax configurations, and linked supplier</p>
            </div>

            {/* Forms Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PO Type <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={poType}
                    onChange={(e) => setPOType(e.target.value)}
                  >
                    <option value="Direct Purchase Order">Direct Purchase Order</option>
                    <option value="Standard Purchase Order">Standard Purchase Order</option>
                    <option value="Consignment Purchase Order">Consignment Purchase Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.filter(v => v.active).map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ref Doc Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={refDocDate}
                      onChange={(e) => setRefDocDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valid Till</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={validTill}
                      onChange={(e) => setValidTill(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount Amt</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount %</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={discountPercentage || ''}
                      onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tax Code</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                  >
                    <option value="">-- Select Tax Code --</option>
                    {taxMasters.filter(t => t.status === 'Active').map(t => (
                      <option key={t.id} value={t.id}>{t.taxName} ({t.percentage}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Store <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                  >
                    <option value="">-- Select Store --</option>
                    {stores.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>{s.storeName} ({s.storeCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ref Doc No</label>
                  <input 
                    type="text" 
                    placeholder="Reference document number"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                    value={refDocNo}
                    onChange={(e) => setRefDocNo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Purchase Organisation <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={purchaseOrganisation}
                    onChange={(e) => setPurchaseOrganisation(e.target.value)}
                  >
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="General Inventory">General Inventory</option>
                    <option value="Medical Central">Medical Central</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currency Code</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                    >
                      <option value="Saudi Riyal">Saudi Riyal</option>
                      <option value="US Dollar">US Dollar</option>
                      <option value="Euro">Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exchange Rate</label>
                    <input 
                      type="number"
                      step="0.0001"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                      value={currencyExchangeRate || ''}
                      onChange={(e) => setCurrencyExchangeRate(parseFloat(e.target.value) || 1.0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isNonStock}
                      onChange={(e) => setIsNonStock(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Is NonStock</span>
                  </label>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account Code</label>
                    <input 
                      type="text" 
                      placeholder="Account code link"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Readonly Net Amount Banner */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Total Estimated Purchase Value</h4>
                  <p className="text-xs text-slate-500">Auto calculated sum based on items, tax rates, and header discounts</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600">{formatCurrency(netAmount)}</span>
              </div>
            </div>

          </div>

          {/* Middle Address Details tabs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200/60 flex gap-2 p-2">
              <button 
                type="button"
                onClick={() => setMiddleTab('address')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  middleTab === 'address' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Address
              </button>

              <button 
                type="button"
                onClick={() => setMiddleTab('other')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  middleTab === 'other' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Other Details
              </button>

              <button 
                type="button"
                onClick={() => setMiddleTab('imported')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  middleTab === 'imported' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Imported Items
              </button>
            </div>

            <div className="p-8">
              {middleTab === 'address' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Billing Address</label>
                    <textarea 
                      placeholder="Enter hospital billing address details..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                      value={addressDetails.billingAddress || ''}
                      onChange={(e) => setAddressDetails({ ...addressDetails, billingAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Shipping Address</label>
                    <textarea 
                      placeholder="Enter warehouse shipping address details..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                      value={addressDetails.shippingAddress || ''}
                      onChange={(e) => setAddressDetails({ ...addressDetails, shippingAddress: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {middleTab === 'other' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Delivery Terms</label>
                    <input 
                      type="text"
                      placeholder="e.g. Within 10 working days"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={otherDetails.deliveryTerms || ''}
                      onChange={(e) => setOtherDetails({ ...otherDetails, deliveryTerms: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Shipment Mode</label>
                    <input 
                      type="text"
                      placeholder="e.g. Air Freight, Road Cargo"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={otherDetails.shipmentMode || ''}
                      onChange={(e) => setOtherDetails({ ...otherDetails, shipmentMode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Payment Method</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={otherDetails.paymentMethod || 'Net 30'}
                      onChange={(e) => setOtherDetails({ ...otherDetails, paymentMethod: e.target.value })}
                    >
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Cash">Cash</option>
                      <option value="LC">Letter of Credit</option>
                    </select>
                  </div>
                </div>
              )}

              {middleTab === 'imported' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Imported Items Declaration</label>
                  <textarea 
                    placeholder="Custom clearance notes, export tags, import licenses..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                    value={importedItems}
                    onChange={(e) => setImportedItems(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Line Items grid tab section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Left Hand Table Section (spanning 2 cols on xl) */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-slate-50 border-b border-slate-200/60 flex items-center justify-between p-2">
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setBottomTab('items')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                      bottomTab === 'items' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Items
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBottomTab('billing')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                      bottomTab === 'billing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Billing Structure
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBottomTab('terms')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                      bottomTab === 'terms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Terms and Conditions
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBottomTab('advance')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                      bottomTab === 'advance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Advance Request
                  </button>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              {/* Tab Content Panels */}
              {bottomTab === 'items' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Public Price</th>
                        <th className="px-4 py-3">Discount %</th>
                        <th className="px-4 py-3">Unit Cost</th>
                        <th className="px-4 py-3">Is Bulk</th>
                        <th className="px-4 py-3">Tax Struct</th>
                        <th className="px-4 py-3">Remarks</th>
                        <th className="px-4 py-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.length > 0 ? (
                        items.map((i, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => setActiveItemIndex(idx)}
                            className={`text-xs cursor-pointer hover:bg-slate-50/30 transition-all ${
                              activeItemIndex === idx ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <select
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none max-w-[150px] text-xs font-semibold text-slate-700"
                                value={i.itemId}
                                onChange={(e) => updateItemRow(idx, 'itemId', e.target.value)}
                              >
                                {inventoryItems.map(item => (
                                  <option key={item.id} value={item.id}>{item.itemName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number"
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                                value={i.quantity}
                                min="1"
                                onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number"
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                                value={i.publicPrice || 0}
                                onChange={(e) => updateItemRow(idx, 'publicPrice', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number"
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                                value={i.discountPercentage || 0}
                                onChange={(e) => updateItemRow(idx, 'discountPercentage', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number"
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                                value={i.unitCost}
                                onChange={(e) => updateItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                checked={i.isBulk}
                                onChange={(e) => updateItemRow(idx, 'isBulk', e.target.checked)}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              <input 
                                type="text" 
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                                value={i.taxStructure || ''}
                                onChange={(e) => updateItemRow(idx, 'taxStructure', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" 
                                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                                placeholder="Notes"
                                value={i.remarks || ''}
                                onChange={(e) => updateItemRow(idx, 'remarks', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-xs text-slate-400 font-bold uppercase">
                            No items loaded in the order sheet. Press "+ Add Line Item" to begin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomTab === 'billing' && (
                <div className="p-8 space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Billing Link Details</h4>
                    <p className="text-xs text-slate-500 mb-4">Integrate automatic voucher bookings and verify active financial account mappings.</p>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <div>Purchase Organisation: <span className="text-slate-800 font-bold">{purchaseOrganisation}</span></div>
                      <div>Currency Code: <span className="text-slate-800 font-bold">{currencyCode}</span></div>
                      <div>Exchange Rate: <span className="text-slate-800 font-bold">{currencyExchangeRate}</span></div>
                      <div>Account Code: <span className="text-slate-800 font-bold">{accountCode || 'Not Mapped'}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {bottomTab === 'terms' && (
                <div className="p-6 space-y-6">
                  {/* Select Terms template */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Terms</h4>
                      <p className="text-[10px] text-slate-500">Pick pre-defined vendor terms or write standard directives</p>
                    </div>
                    <div>
                      <select 
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 transition-colors"
                        value=""
                        onChange={(e) => handleSelectTerm(e.target.value)}
                      >
                        <option value="">-- Select --</option>
                        {vendorTerms.map(t => (
                          <option key={t.id} value={t.termCode}>{t.termCode} - {t.termDesc.slice(0, 35)}...</option>
                        ))}
                        {vendorTerms.length === 0 && (
                          <>
                            <option value="T001">T001 - Deliver in 15 days.</option>
                            <option value="T002">T002 - Credit Period 30 Days.</option>
                            <option value="T003">T003 - Subject to QA Clearance.</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Terms Table Grid */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3 w-1/4">Code</th>
                          <th className="px-4 py-3 w-2/3">Description</th>
                          <th className="px-4 py-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {poTerms.length > 0 ? (
                          poTerms.map((term, index) => (
                            <tr key={index} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 font-bold text-slate-700 align-top pt-4">{term.termCode}</td>
                              <td className="px-4 py-3">
                                <textarea 
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700 resize-y min-h-[60px]"
                                  value={term.termDesc}
                                  onChange={(e) => updateTermDesc(term.termCode, e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-3 text-right align-top pt-3">
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveTerm(term.termCode)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-8 text-slate-400 font-bold uppercase tracking-tight text-[10px]">
                              No terms selected. Please select a template term from the dropdown above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bottomTab === 'advance' && (
                <div className="p-8 space-y-6 text-center">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Advance Payment Request</h4>
                    <p className="text-xs text-slate-500 mb-4">Request advance release percentages for international orders.</p>
                    <div className="flex gap-3">
                      <input 
                        type="number" 
                        placeholder={`Request Amount (${selectedCurrency})`} 
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700" 
                      />
                      <button 
                        type="button" 
                        onClick={() => showToast('success', 'Advance payment request queued.')}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
                      >
                        Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Hand Selected Line Item Detail Panel */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-slate-50 border-b border-slate-200/60 p-4">
                <h3 className="text-xs font-black text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                  Selected Line Item Details
                </h3>
              </div>

              {activeItemIndex !== null && items[activeItemIndex] ? (
                <div className="p-6 space-y-6">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Item Title</span>
                    <span className="font-bold text-slate-700 text-sm">{items[activeItemIndex].itemName}</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tight">Code: {items[activeItemIndex].itemCode}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Document Num</label>
                      <input 
                        type="text" 
                        placeholder="e.g. DOC-990-2"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                        value={sourceDocNum}
                        onChange={(e) => { setSourceDocNum(e.target.value); updateActiveItemDetails('sourceDocNum', e.target.value); }}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Document Date</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                        value={sourceDocDate}
                        onChange={(e) => { setSourceDocDate(e.target.value); updateActiveItemDetails('sourceDocDate', e.target.value); }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Qty</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                          value={sourceQuantity || ''}
                          onChange={(e) => { const v = parseFloat(e.target.value) || 0; setSourceQuantity(v); updateActiveItemDetails('sourceQuantity', v); }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pending Qty</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                          value={pendingQuantity || ''}
                          onChange={(e) => { const v = parseFloat(e.target.value) || 0; setPendingQuantity(v); updateActiveItemDetails('pendingQuantity', v); }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Short Close Quantity</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold text-slate-700"
                        value={shortCloseQuantity || ''}
                        onChange={(e) => { const v = parseFloat(e.target.value) || 0; setShortCloseQuantity(v); updateActiveItemDetails('shortCloseQuantity', v); }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Select a row from the items grid to view source documentation details.
                </div>
              )}

            </div>

          </div>

          {/* Form controls */}
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex-1 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all text-sm active:scale-98 shadow-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all text-sm active:scale-98"
            >
              Save Purchase Order
            </button>
          </div>

        </form>
      )}

      {/* ================== ADD ITEM MODAL WINDOW ================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-blue-600 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 text-white flex justify-between items-center shadow-sm">
              <h3 className="font-extrabold text-sm tracking-wide uppercase">Add Purchase Order Item</h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddModal(false);
                  setItemSearchQuery('');
                  setModalItemId('');
                }}
                className="text-white/80 hover:text-white font-bold text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Form */}
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Item Field */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Item <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      placeholder="Search item code or name..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                      value={itemSearchQuery}
                      onChange={(e) => {
                        setItemSearchQuery(e.target.value);
                        if (modalItemId) setModalItemId('');
                      }}
                    />
                    {/* Suggestion list overlay */}
                    {itemSearchQuery && !modalItemId && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {matchedInventoryItems.length > 0 ? (
                          matchedInventoryItems.map((item: InventoryItem) => (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => {
                                setModalItemId(item.id);
                                setItemSearchQuery(item.itemName);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="font-bold text-slate-800 text-xs">{item.itemName}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">CODE: {item.itemCode}</div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-tight">
                            No matching items found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (inventoryItems.length > 0) {
                        setModalItemId(inventoryItems[0].id);
                        setItemSearchQuery(inventoryItems[0].itemName);
                      }
                    }}
                    className="px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-colors flex items-center justify-center shadow-xs active:scale-95 animate-in fade-in"
                    title="Quick Select First Item"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    className="text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                    title="Item Master Help info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* FOC Checkbox */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">FOC:</span>
                <input 
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={modalIsFoc}
                  onChange={(e) => setModalIsFoc(e.target.checked)}
                />
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantity <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={modalQuantity}
                    onChange={(e) => setModalQuantity(parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Unit <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={modalUnit}
                    onChange={(e) => setModalUnit(e.target.value)}
                  >
                    <option value="EACH">EACH</option>
                    <option value="BOX">BOX</option>
                    <option value="PACK">PACK</option>
                    <option value="STRIP">STRIP</option>
                    <option value="TABLET">TABLET</option>
                    <option value="CAPSULE">CAPSULE</option>
                    <option value="VIAL">VIAL</option>
                    <option value="AMPOULE">AMPOULE</option>
                    <option value="BOTTLE">BOTTLE</option>
                    <option value="ML">ML</option>
                  </select>
                </div>
              </div>

              {/* Current Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Stock <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  readOnly
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-500 cursor-not-allowed"
                  value={modalCurrentStock}
                />
              </div>

              {/* Price Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Price Type <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={modalPriceType}
                  onChange={(e) => setModalPriceType(e.target.value)}
                >
                  <option value="PUBLIC PRICE">PUBLIC PRICE</option>
                  <option value="COST PRICE">COST PRICE</option>
                </select>
              </div>

              {/* Public Price and Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Public Price <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={modalPublicPrice}
                    onChange={(e) => setModalPublicPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Discount</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                    value={modalDiscount}
                    onChange={(e) => setModalDiscount(parseFloat(e.target.value) || 0.0)}
                  />
                </div>
              </div>

            </div>

            {/* Modal Action Buttons */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddModal(false);
                  setModalItemId('');
                  setItemSearchQuery('');
                  setModalIsFoc(false);
                  setModalQuantity(1);
                  setModalUnit('Box');
                  setModalCurrentStock(0);
                  setModalPriceType('PUBLIC PRICE');
                  setModalPublicPrice(0);
                  setModalDiscount(0.0);
                }}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all text-xs active:scale-95 shadow-xs"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={handleAddModalItem}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all text-xs active:scale-95"
              >
                Add Item
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
