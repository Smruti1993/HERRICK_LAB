import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Vendor, VendorTerm, VendorBankInfo, VendorRegistration, VendorBusinessInfo, VendorContact } from '../types';
import { 
  Plus, Search, Edit2, Trash2, ShieldCheck, Check, Info, FileText, 
  MapPin, Landmark, Award, Globe, User, Percent, AlertTriangle, ArrowLeft
} from 'lucide-react';

export const VendorMaster: React.FC = () => {
  const { 
    vendors, saveVendor, deleteVendor, showToast, inventoryItems
  } = useData();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form States
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [vendorType, setVendorType] = useState('Local');
  const [billingStructure, setBillingStructure] = useState('Direct');
  const [currency, setCurrency] = useState('SAR');
  const [creditPeriod, setCreditPeriod] = useState('');
  const [rating, setRating] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('Net 30');
  const [supplierSubType, setSupplierSubType] = useState('Distributor');
  const [panNo, setPanNo] = useState('');
  const [regstStatus, setRegstStatus] = useState('Registered');
  const [accountGroup, setAccountGroup] = useState('Accounts Payable');
  const [tdsType, setTdsType] = useState('Standard');
  const [exportLicense, setExportLicense] = useState('');
  const [account, setAccount] = useState('');
  const [remarks, setRemarks] = useState('');

  // Checkboxes
  const [active, setActive] = useState(true);
  const [qualityCheckRequired, setQualityCheckRequired] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [isoCertified, setIsoCertified] = useState(false);
  const [isVat, setIsVat] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'terms' | 'link' | 'bank' | 'registration' | 'rating' | 'business' | 'contact'>('terms');

  // Stateful Sub-tabs data
  const [terms, setTerms] = useState<VendorTerm[]>([]);
  const [bankInfo, setBankInfo] = useState<VendorBankInfo>({});
  const [registrationDetails, setRegistrationDetails] = useState<VendorRegistration>({});
  const [businessInfo, setBusinessInfo] = useState<VendorBusinessInfo>({});
  const [contactDetails, setContactDetails] = useState<VendorContact>({});

  // Supplier Distributor Link State
  const [linkedItems, setLinkedItems] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');

  // Terms and Condition Sub-tab states
  const [newTermCode, setNewTermCode] = useState('');
  const [newTermDesc, setNewTermDesc] = useState('');

  const resetForm = () => {
    setEditingVendorId(null);
    setCode('');
    setName('');
    setVendorType('Local');
    setBillingStructure('Direct');
    setCurrency('SAR');
    setCreditPeriod('');
    setRating('');
    setPaymentTerm('Net 30');
    setSupplierSubType('Distributor');
    setPanNo('');
    setRegstStatus('Registered');
    setAccountGroup('Accounts Payable');
    setTdsType('Standard');
    setExportLicense('');
    setAccount('');
    setRemarks('');
    setActive(true);
    setQualityCheckRequired(false);
    setSuspended(false);
    setIsoCertified(false);
    setIsVat(false);

    setTerms([]);
    setBankInfo({});
    setRegistrationDetails({});
    setBusinessInfo({});
    setContactDetails({});
    setLinkedItems([]);
    setNewTermCode('');
    setNewTermDesc('');
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setCode(vendor.code);
    setName(vendor.name);
    setVendorType(vendor.vendorType);
    setBillingStructure(vendor.billingStructure || 'Direct');
    setCurrency(vendor.currency);
    setCreditPeriod(vendor.creditPeriod || '');
    setRating(vendor.rating || '');
    setPaymentTerm(vendor.paymentTerm || 'Net 30');
    setSupplierSubType(vendor.supplierSubType || 'Distributor');
    setPanNo(vendor.panNo || '');
    setRegstStatus(vendor.regstStatus);
    setAccountGroup(vendor.accountGroup);
    setTdsType(vendor.tdsType || 'Standard');
    setExportLicense(vendor.exportLicense || '');
    setAccount(vendor.account || '');
    setRemarks(vendor.remarks || '');
    setActive(vendor.active);
    setQualityCheckRequired(vendor.qualityCheckRequired);
    setSuspended(vendor.suspended);
    setIsoCertified(vendor.isoCertified);
    setIsVat(vendor.isVat);

    setTerms(vendor.terms || []);
    setBankInfo(vendor.bankInfo || {});
    setRegistrationDetails(vendor.registrationDetails || {});
    setBusinessInfo(vendor.businessInfo || {});
    setContactDetails(vendor.contactDetails || {});
    setLinkedItems(vendor.businessInfo?.distributorLink ? JSON.parse(vendor.businessInfo.distributorLink) : []);
    
    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('error', 'Vendor Code and Name are required fields.');
      return;
    }

    const updatedBusinessInfo = {
      ...businessInfo,
      distributorLink: JSON.stringify(linkedItems)
    };

    const vendorToSave: Vendor = {
      id: editingVendorId || crypto.randomUUID(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      vendorType,
      billingStructure,
      currency,
      creditPeriod,
      rating,
      paymentTerm,
      supplierSubType,
      panNo,
      regstStatus,
      accountGroup,
      tdsType,
      exportLicense,
      account,
      remarks,
      active,
      qualityCheckRequired,
      suspended,
      isoCertified,
      isVat,
      terms,
      bankInfo,
      registrationDetails,
      businessInfo: updatedBusinessInfo,
      contactDetails,
      createdAt: new Date().toISOString()
    };

    const success = await saveVendor(vendorToSave);
    if (success) {
      setViewMode('list');
      resetForm();
    }
  };

  // Add Term Code Handler
  const handleAddTerm = () => {
    if (!newTermCode.trim() || !newTermDesc.trim()) {
      showToast('error', 'Term Code and Term Description are required to add a term.');
      return;
    }
    const newTerm: VendorTerm = {
      termCode: newTermCode.trim().toUpperCase(),
      termDesc: newTermDesc.trim()
    };
    setTerms(prev => [...prev, newTerm]);
    setNewTermCode('');
    setNewTermDesc('');
  };

  // Remove Term Code Handler
  const handleRemoveTerm = (index: number) => {
    setTerms(prev => prev.filter((_, idx) => idx !== index));
  };

  // Add Link Item Handler
  const handleAddLinkItem = () => {
    if (!selectedItemId) return;
    if (linkedItems.includes(selectedItemId)) {
      showToast('info', 'Item is already linked to this vendor.');
      return;
    }
    setLinkedItems(prev => [...prev, selectedItemId]);
    setSelectedItemId('');
  };

  // Remove Link Item Handler
  const handleRemoveLinkItem = (itemId: string) => {
    setLinkedItems(prev => prev.filter(id => id !== itemId));
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vendorType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Vendor Master
          </h1>
          <p className="text-sm text-slate-500">Manage procurement vendors, payment terms, and billing configurations</p>
        </div>
        <div>
          {viewMode === 'list' ? (
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          ) : (
            <button 
              onClick={() => { setViewMode('list'); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              View All Vendors
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
                placeholder="Search by vendor name, code, or type..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Vendors Table */}
          <div className="flex-1 overflow-auto">
            {filteredVendors.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-4">Vendor Details</th>
                    <th className="px-8 py-4">Type / Currency</th>
                    <th className="px-8 py-4">Regst Status</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVendors.map(vendor => (
                    <tr key={vendor.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="font-bold text-slate-800 text-sm">{vendor.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{vendor.code}</div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="font-semibold text-slate-700 text-sm">{vendor.vendorType}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Currency: {vendor.currency}</div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          vendor.regstStatus === 'Registered' ? 'bg-green-50 text-green-600 border border-green-100' :
                          vendor.regstStatus === 'Suspended' ? 'bg-red-50 text-red-600 border border-red-100' :
                          'bg-orange-50 text-orange-600 border border-orange-100'
                        }`}>
                          {vendor.regstStatus}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          vendor.active ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {vendor.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(vendor)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Vendor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if (confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) deleteVendor(vendor.id); }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Info className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-700">No Vendors Found</h3>
                <p className="text-sm text-slate-500">Add a vendor or refine your search filters.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== FORM VIEW ================== */
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
            
            {/* Form Section Header */}
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingVendorId ? 'Modify Vendor Record' : 'Create New Vendor Record'}
              </h2>
              <p className="text-xs text-slate-500">Provide registration codes, billing models, and currency parameters</p>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Code <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. VEND001"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Riyadh Medical Suppliers Ltd."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Type <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={vendorType}
                  onChange={(e) => setVendorType(e.target.value)}
                >
                  <option value="Local">Local</option>
                  <option value="International">International</option>
                  <option value="Importer">Importer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Billing Structure</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={billingStructure}
                  onChange={(e) => setBillingStructure(e.target.value)}
                >
                  <option value="Direct">Direct</option>
                  <option value="Group">Group</option>
                  <option value="Consignee">Consignee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currency <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Credit Period</label>
                <input 
                  type="text" 
                  placeholder="e.g. 30 Days"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={creditPeriod}
                  onChange={(e) => setCreditPeriod(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rating</label>
                <input 
                  type="text" 
                  placeholder="e.g. A+"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Term</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Net 90">Net 90</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Post Dated Cheque">Post Dated Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Supplier Sub Type</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={supplierSubType}
                  onChange={(e) => setSupplierSubType(e.target.value)}
                >
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pan No</label>
                <input 
                  type="text" 
                  placeholder="e.g. PAN123456"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Regst Status <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={regstStatus}
                  onChange={(e) => setRegstStatus(e.target.value)}
                >
                  <option value="Registered">Registered</option>
                  <option value="Unregistered">Unregistered</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Group <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={accountGroup}
                  onChange={(e) => setAccountGroup(e.target.value)}
                >
                  <option value="Accounts Payable">Accounts Payable</option>
                  <option value="Trade Creditors">Trade Creditors</option>
                  <option value="Sundry Creditors">Sundry Creditors</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tds Type</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                  value={tdsType}
                  onChange={(e) => setTdsType(e.target.value)}
                >
                  <option value="Standard">Standard Rate</option>
                  <option value="Zero Rate">Zero Rate</option>
                  <option value="Exempt">Exempt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Export License</label>
                <input 
                  type="text" 
                  placeholder="e.g. LIC-EXP-990"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={exportLicense}
                  onChange={(e) => setExportLicense(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account</label>
                <input 
                  type="text" 
                  placeholder="Account Description"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Remarks</label>
                <textarea 
                  placeholder="Internal audit notes..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

            </div>

            {/* Checkboxes Grid */}
            <div className="border-t border-slate-100 pt-6 flex flex-wrap gap-x-8 gap-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Active</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={qualityCheckRequired}
                  onChange={(e) => setQualityCheckRequired(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Quality Check Required</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={suspended}
                  onChange={(e) => setSuspended(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Suspended</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={isoCertified}
                  onChange={(e) => setIsoCertified(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">ISO Certified</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={isVat}
                  onChange={(e) => setIsVat(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Is VAT Applicable</span>
              </label>
            </div>

          </div>

          {/* Stateful Sub-tabs Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            
            {/* Tabs List */}
            <div className="bg-slate-50 border-b border-slate-200/60 flex flex-wrap gap-1 p-2">
              <button 
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'terms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Terms and Condition
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('link')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Supplier Distributor Link
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'bank' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Bank Information
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('registration')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'registration' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                Registration Details
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('rating')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'rating' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Rating Details
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('business')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'business' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Business Information
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'contact' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Contact Detail
              </button>
            </div>

            {/* Stateful Tab Panels */}
            <div className="p-8">
              
              {/* TAB 1: Terms and Condition */}
              {activeTab === 'terms' && (
                <div className="space-y-6">
                  {/* Inline adding form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Term Code</label>
                      <input 
                        type="text"
                        placeholder="e.g. TC01"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
                        value={newTermCode}
                        onChange={(e) => setNewTermCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Term Description</label>
                      <input 
                        type="text"
                        placeholder="e.g. 50% advance, remaining on delivery"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
                        value={newTermDesc}
                        onChange={(e) => setNewTermDesc(e.target.value)}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddTerm}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow transition-all"
                    >
                      Add Term
                    </button>
                  </div>

                  {/* Inline Terms Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-3">Term Code</th>
                          <th className="px-6 py-3">Term Description</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {terms.length > 0 ? (
                          terms.map((t, idx) => (
                            <tr key={idx} className="text-xs">
                              <td className="px-6 py-3 font-bold text-slate-700">{t.termCode}</td>
                              <td className="px-6 py-3 font-semibold text-slate-600">{t.termDesc}</td>
                              <td className="px-6 py-3 text-right">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveTerm(idx)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-xs text-slate-400 font-medium">
                              No Terms and Conditions added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Supplier Distributor Link */}
              {activeTab === 'link' && (
                <div className="space-y-6">
                  {/* Inline Link Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Item to Link</label>
                      <select
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                      >
                        <option value="">Select Item...</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>{item.itemName} ({item.itemCode})</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddLinkItem}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow transition-all w-fit"
                    >
                      Link Item
                    </button>
                  </div>

                  {/* Linked Items List */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-3">Linked Item</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {linkedItems.length > 0 ? (
                          linkedItems.map((id, idx) => {
                            const matched = inventoryItems.find(item => item.id === id);
                            return (
                              <tr key={idx} className="text-xs">
                                <td className="px-6 py-3 font-bold text-slate-700">
                                  {matched?.itemName || 'Unknown Item'}
                                  <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase">({matched?.itemCode || id})</span>
                                </td>
                                <td className="px-6 py-3 font-semibold text-slate-600">{matched?.itemCategory || 'General'}</td>
                                <td className="px-6 py-3 text-right">
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveLinkItem(id)}
                                    className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-xs text-slate-400 font-medium">
                              No items linked to this supplier.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Bank Information */}
              {activeTab === 'bank' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Bank Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Al Rajhi Bank"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={bankInfo.bankName || ''}
                      onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Account Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 1209384756"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={bankInfo.accountNumber || ''}
                      onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">IBAN</label>
                    <input 
                      type="text"
                      placeholder="e.g. SA80 8000 0000..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={bankInfo.iban || ''}
                      onChange={(e) => setBankInfo({ ...bankInfo, iban: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">SWIFT Code</label>
                    <input 
                      type="text"
                      placeholder="e.g. RAJHSARIXXXX"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={bankInfo.swiftCode || ''}
                      onChange={(e) => setBankInfo({ ...bankInfo, swiftCode: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: Registration Details */}
              {activeTab === 'registration' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Commercial Registration (CR) No</label>
                    <input 
                      type="text"
                      placeholder="e.g. 1010002938"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={registrationDetails.crNumber || ''}
                      onChange={(e) => setRegistrationDetails({ ...registrationDetails, crNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">CR Expiry Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={registrationDetails.crExpiry || ''}
                      onChange={(e) => setRegistrationDetails({ ...registrationDetails, crExpiry: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">VAT Registration Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 300002983700003"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={registrationDetails.vatNumber || ''}
                      onChange={(e) => setRegistrationDetails({ ...registrationDetails, vatNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">VAT Expiry Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={registrationDetails.vatExpiry || ''}
                      onChange={(e) => setRegistrationDetails({ ...registrationDetails, vatExpiry: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: Rating Details */}
              {activeTab === 'rating' && (
                <div className="max-w-xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-yellow-50 text-yellow-600 p-3 rounded-full">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Quality and Score Rating</h4>
                      <p className="text-xs text-slate-500">Provide qualitative details about vendor deliverables</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Audit Score (1-100)</label>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        placeholder="95"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Performance Class</label>
                      <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700">
                        <option>Excellent</option>
                        <option>Good</option>
                        <option>Adequate</option>
                        <option>Substandard</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: Business Information */}
              {activeTab === 'business' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Website URL</label>
                    <input 
                      type="url"
                      placeholder="https://example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={businessInfo.website || ''}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Annual Turnover</label>
                    <input 
                      type="text"
                      placeholder="e.g. SAR 5,000,000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={businessInfo.annualTurnover || ''}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, annualTurnover: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 7: Contact Detail */}
              {activeTab === 'contact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Primary Contact Person</label>
                    <input 
                      type="text"
                      placeholder="e.g. Abdullah bin Fahd"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={contactDetails.contactPerson || ''}
                      onChange={(e) => setContactDetails({ ...contactDetails, contactPerson: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Designation</label>
                    <input 
                      type="text"
                      placeholder="e.g. Sales Director"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={contactDetails.designation || ''}
                      onChange={(e) => setContactDetails({ ...contactDetails, designation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Email Address</label>
                    <input 
                      type="email"
                      placeholder="e.g. contact@vendors.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={contactDetails.email || ''}
                      onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Mobile Number</label>
                    <input 
                      type="tel"
                      placeholder="e.g. +966 50 123 4567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-700"
                      value={contactDetails.mobile || ''}
                      onChange={(e) => setContactDetails({ ...contactDetails, mobile: e.target.value })}
                    />
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Form Actions */}
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
              Save Vendor Record
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
