import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { MasterEntity, ServiceDefinition, ServiceTariff, VitalSignParameter, Currency, Branch, ServiceLocationMapping } from '../types';
import { Plus, Search, X, FileSpreadsheet, FileDown, Activity, DollarSign, Edit, Trash2, Building, Upload, Image } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Pagination } from '../components/Pagination';

// --- Helper for Downloads ---
const downloadTemplate = (type: 'diagnosis' | 'service' | 'dental_icd') => {
    let data: any[] = [];
    if (type === 'diagnosis') {
        data = [{ 'ICD Code': 'A00.0', 'Description': 'Cholera due to Vibrio cholerae 01, biovar cholerae' }];
    } else if (type === 'dental_icd') {
        data = [{ 'ICD Code': 'K02.0', 'Description': 'Caries limited to enamel' }];
    } else {
        data = [{ 
            'Code': 'SVC001', 
            'Name': 'General Consultation', 
            'Category': 'Consultation', 
            'Type': 'Single service', 
            'Price': 50.00,
            'Schedulable': true,
            'Surgical': false 
        }];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type}_upload_template.xlsx`);
};

// --- Generic Component for Simple Masters ---
const MasterList = <T extends MasterEntity>({ 
  title, 
  data, 
  onAdd 
}: { 
  title: string, 
  data: T[], 
  onAdd: (item: any) => void 
}) => {
  const { departments } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; code: string; status: string; vatRegNo?: string; departmentId?: string }>({
    name: '',
    code: '',
    status: 'Active',
    vatRegNo: '',
    departmentId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.code) return;
    if (title === 'Service Location' && !newItem.departmentId) return;
    
    const payload: any = {
      id: crypto.randomUUID(),
      name: newItem.name,
      code: newItem.code,
      status: newItem.status
    };

    if (title === 'Hospital') {
      payload.vatRegNo = newItem.vatRegNo;
    }
    if (title === 'Service Location') {
      payload.departmentId = newItem.departmentId;
    }
    
    onAdd(payload);
    setNewItem({ name: '', code: '', status: 'Active', vatRegNo: '', departmentId: '' });
    setIsAdding(false);
  };

  const showExtra = title === 'Hospital' || title === 'Service Location';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add New
        </button>
      </div>
      
      {isAdding && (
        <form onSubmit={handleSubmit} className={`p-4 bg-blue-50/50 border-b border-blue-100 grid grid-cols-1 ${showExtra ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 animate-in slide-in-from-top-2`}>
          <input 
            required
            placeholder={`${title} Name`} 
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={newItem.name}
            onChange={e => setNewItem({...newItem, name: e.target.value})}
          />
          <input 
            required
            placeholder="Code (e.g. DEPT-01)" 
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={newItem.code}
            onChange={e => setNewItem({...newItem, code: e.target.value})}
          />
          {title === 'Hospital' && (
            <input 
              placeholder="VAT Registration Number" 
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.vatRegNo || ''}
              onChange={e => setNewItem({...newItem, vatRegNo: e.target.value})}
            />
          )}
          {title === 'Service Location' && (
            <select 
              required
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.departmentId || ''}
              onChange={e => setNewItem({...newItem, departmentId: e.target.value})}
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Code</th>
              {showExtra && (
                <th className="px-6 py-3 font-semibold">
                  {title === 'Hospital' ? 'VAT Reg No' : 'Department'}
                </th>
              )}
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
               <tr><td colSpan={showExtra ? 4 : 3} className="px-6 py-4 text-center text-slate-400">No records found.</td></tr>
            ) : (
               data.map((item) => (
                <tr key={item.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{item.code}</td>
                  {showExtra && (
                    <td className={`px-6 py-3 text-slate-700 ${title === 'Hospital' ? 'font-mono text-slate-500' : ''}`}>
                      {title === 'Hospital' 
                        ? ((item as any).vatRegNo || '-')
                        : (departments.find(d => d.id === (item as any).departmentId)?.name || '-')}
                    </td>
                  )}
                  <td className="px-6 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Active</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Hospital Master Component ---
const HospitalMaster = () => {
  const { branches, saveBranch, deleteBranch } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [vatRegNo, setVatRegNo] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoError, setLogoError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setCode('');
    setVatRegNo('');
    setStatus('Active');
    setLogoUrl(undefined);
    setLogoError(null);
    setEditingBranch(null);
  };

  const handleEdit = (b: Branch) => {
    setEditingBranch(b);
    setName(b.name);
    setCode(b.code);
    setVatRegNo(b.vatRegNo || '');
    setStatus(b.status);
    setLogoUrl(b.logoUrl);
    setLogoError(null);
    setShowForm(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: must be jpg/jpeg
    const isValidJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    if (!isValidJpg) {
      setLogoError('Only JPG/JPEG files are accepted.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Recommended size check: 250KB limit
    if (file.size > 250 * 1024) {
      setLogoError('Recommended file size is under 250KB for optimal performance.');
    } else {
      setLogoError(null);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setLogoUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(undefined);
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const payload: Branch = {
      id: editingBranch?.id || crypto.randomUUID(),
      name,
      code,
      vatRegNo: vatRegNo || undefined,
      status,
      logoUrl
    };

    saveBranch(payload);
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete hospital "${name}"?`);
    if (confirmDelete) {
      deleteBranch(id);
      if (editingBranch?.id === id) {
        resetForm();
        setShowForm(false);
      }
    }
  };

  const toggleStatus = (b: Branch, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = b.status === 'Active' ? 'Inactive' : 'Active';
    saveBranch({
      ...b,
      status: newStatus
    });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* List Section */}
      <div className={`flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col min-h-0 ${showForm ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 border-b border-blue-400 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-md tracking-tight">Hospitals</h3>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">Hospital Master Registry</p>
            </div>
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 border-r border-slate-100 w-24 text-center">Logo</th>
                <th className="px-6 py-3 border-r border-slate-100">Hospital Name</th>
                <th className="px-6 py-3 border-r border-slate-100 w-36">Code</th>
                <th className="px-6 py-3 border-r border-slate-100 w-44">VAT Reg No</th>
                <th className="px-6 py-3 border-r border-slate-100 w-32 text-center">Status</th>
                <th className="px-6 py-3 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No hospitals found.</td></tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/40 transition-colors group h-14">
                    <td className="px-6 py-2 border-r border-slate-50 text-center">
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-slate-50 mx-auto" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50 mx-auto">
                          <Building className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-2 font-medium text-slate-800 border-r border-slate-50">{b.name}</td>
                    <td className="px-6 py-2 font-mono font-bold text-blue-600 border-r border-slate-50 text-[12px]">{b.code}</td>
                    <td className="px-6 py-2 font-mono text-slate-500 border-r border-slate-50 text-[12px]">{b.vatRegNo || '-'}</td>
                    <td className="px-6 py-2 border-r border-slate-50 text-center">
                      <button
                        onClick={(e) => toggleStatus(b, e)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                          b.status === 'Active'
                            ? 'bg-green-50 text-green-700 border-green-150 hover:bg-green-100/70'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Click to toggle status"
                      >
                        {b.status}
                      </button>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                          title="Edit Hospital Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id, b.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                          title="Delete Hospital"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="w-full md:w-[450px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col animate-in slide-in-from-right-10 duration-300">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 className="font-bold text-slate-800">
              {editingBranch ? 'Edit Hospital' : 'New Hospital'}
            </h3>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Hospital Name *</label>
              <input 
                className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. MediCore - HIMS"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Hospital Code *</label>
              <input 
                className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-blue-600"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. HOSP-001"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">VAT Registration Number</label>
              <input 
                className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                value={vatRegNo}
                onChange={e => setVatRegNo(e.target.value)}
                placeholder="e.g. 300012345600003"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Status</label>
              <select 
                className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold appearance-none bg-slate-50/50 cursor-pointer"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Logo Upload Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Logo (JPG)</label>
              
              {logoUrl ? (
                <div className="relative w-24 h-24 border border-slate-200 rounded-xl bg-white p-1 shadow-inner group">
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-all active:scale-90"
                    title="Remove Logo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-white transition-all hover:bg-blue-50/20 flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-600">Click to upload organization logo</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">JPG / JPEG formats only</p>
                  </div>
                </div>
              )}
              
              <input 
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logoError && (
                <p className="text-[10px] font-bold text-rose-600 leading-normal">{logoError}</p>
              )}
            </div>
            
            <div className="pt-2 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => { resetForm(); setShowForm(false); }} 
                className="px-5 py-2 text-slate-650 text-xs font-bold hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all active:scale-95"
              >
                Save Hospital
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Diagnosis Master Component ---
const DiagnosisMaster = () => {
    const { masterDiagnoses, uploadMasterDiagnoses, isLoading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];
            
            const mapped = data.map((row: any) => ({
                id: crypto.randomUUID(),
                code: row['ICD Code'] || row['Code'] || '',
                description: row['Description'] || row['Diagnosis'] || '',
                status: 'Active' as const
            })).filter(d => d.code && d.description);

            if (mapped.length > 0) {
                uploadMasterDiagnoses(mapped);
            }
        };
        reader.readAsBinaryString(file);
    };

    const filtered = masterDiagnoses.filter(d => 
        d.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedDiagnoses = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
            {/* Action Bar */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 border-b border-blue-400 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-md tracking-tight">Diagnosis (ICD-10) Master</h3>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">Global Knowledge Base</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto text-white">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-3.5 h-3.5 text-blue-200 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            placeholder="Search ICD code or name..." 
                            className="w-full h-9 pl-9 pr-4 bg-white/10 text-white placeholder:text-blue-100/50 text-xs rounded-lg border border-white/20 focus:ring-2 focus:ring-white/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        {isLoading ? 'Uploading...' : <><Plus className="w-3.5 h-3.5" /> Upload Excel</>}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                    
                    <button 
                        onClick={() => downloadTemplate('diagnosis')}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/20 transition-all active:scale-95 shadow-sm"
                        title="Download Template"
                    >
                        <FileDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Table Content */}
            <div className="flex-1 overflow-auto bg-white scrollbar-thin">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 border-r border-slate-100 w-32">ICD Code</th>
                            <th className="px-6 py-3 border-r border-slate-100">Description</th>
                            <th className="px-6 py-3 text-center w-32">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No diagnosis found. Match your search or upload Excel.</td></tr>
                        ) : (
                            paginatedDiagnoses.map((d) => (
                                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group h-10">
                                    <td className="px-6 py-2 font-mono font-bold text-blue-600 border-r border-slate-50">{d.code}</td>
                                    <td className="px-6 py-2 font-medium text-slate-700 border-r border-slate-50">{d.description}</td>
                                    <td className="px-6 py-2 text-center">
                                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100">Active</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filtered.length / itemsPerPage)}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                colorTheme="blue"
            />
        </div>
    );
};


// --- Dental ICD Master Component ---
const DentalICDMaster = () => {
    const { dentalICDs, uploadDentalICDs, saveDentalICD, isLoading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newICD, setNewICD] = useState({ code: '', description: '', status: 'Active' as const });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];
            
            const mapped = data.map((row: any) => ({
                id: crypto.randomUUID(),
                code: row['ICD Code'] || row['Code'] || '',
                description: row['Description'] || row['Diagnosis'] || '',
                status: 'Active' as const
            })).filter(d => d.code && d.description);

            if (mapped.length > 0) {
                uploadDentalICDs(mapped);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleAddManual = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newICD.code || !newICD.description) return;
        saveDentalICD({
            id: crypto.randomUUID(),
            ...newICD
        });
        setNewICD({ code: '', description: '', status: 'Active' });
        setShowAddForm(false);
    };

    const filtered = dentalICDs.filter(d => 
        d.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedDental = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
            {/* Action Bar */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-3 border-b border-teal-400 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-md tracking-tight">Dental ICD Master</h3>
                        <p className="text-teal-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">Dental Diagnosis Codes</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto text-white">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-3.5 h-3.5 text-teal-200 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            placeholder="Search code or diagnosis..." 
                            className="w-full h-9 pl-9 pr-4 bg-white/10 text-white placeholder:text-teal-100/50 text-xs rounded-lg border border-white/20 focus:ring-2 focus:ring-white/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-white text-teal-700 hover:bg-teal-50 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add New
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-teal-800/40 hover:bg-teal-800/60 text-white px-4 py-1.5 rounded-lg text-xs font-bold border border-white/20 shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        {isLoading ? 'Uploading...' : <><FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel</>}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                    
                    <button 
                        onClick={() => downloadTemplate('dental_icd')}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/20 transition-all active:scale-95 shadow-sm"
                        title="Download Template"
                    >
                        <FileDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showAddForm && (
                <form onSubmit={handleAddManual} className="p-4 bg-teal-50/50 border-b border-teal-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                    <input 
                        placeholder="ICD Code (e.g. K02.0)" 
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={newICD.code}
                        onChange={e => setNewICD({...newICD, code: e.target.value})}
                    />
                    <input 
                        placeholder="Description / Diagnosis" 
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={newICD.description}
                        onChange={e => setNewICD({...newICD, description: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-teal-200">Save ICD</button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-3 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-bold">Cancel</button>
                    </div>
                </form>
            )}

            {/* Scrollable Table Content */}
            <div className="flex-1 overflow-auto bg-white scrollbar-thin">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 border-r border-slate-100 w-32">ICD Code</th>
                            <th className="px-6 py-3 border-r border-slate-100">Description</th>
                            <th className="px-6 py-3 text-center w-32">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No dental codes found. Add manually or upload Excel.</td></tr>
                        ) : (
                            paginatedDental.map((d) => (
                                <tr key={d.id} className="hover:bg-teal-50/30 transition-colors group h-10">
                                    <td className="px-6 py-2 font-mono font-bold text-teal-600 border-r border-slate-50">{d.code}</td>
                                    <td className="px-6 py-2 font-medium text-slate-700 border-r border-slate-50">{d.description}</td>
                                    <td className="px-6 py-2 text-center">
                                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100">Active</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filtered.length / itemsPerPage)}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                colorTheme="teal"
            />
        </div>
    );
};


// --- Service Master Component ---
const ServiceMaster = () => {
    const { 
        serviceDefinitions, 
        serviceTariffs, 
        saveServiceDefinition, 
        uploadServiceDefinitions, 
        isLoading,
        branches,
        departments,
        serviceCentres,
        serviceLocationMappings,
        saveServiceLocationMappings
    } = useData();

    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // UI Tab State inside the Edit Form
    const [activeFormTab, setActiveFormTab] = useState<'locations' | 'namespace' | 'mandatory' | 'report' | 'consumable' | 'tariff' | 'revenue' | 'parameters'>('locations');

    // Initial Form State
    const initialForm: ServiceDefinition = {
        id: '',
        code: '',
        name: '',
        alternateName: '',
        serviceType: 'Single service',
        serviceCategory: 'General',
        status: 'Active',
        chargeable: true,
        applicableVisitType: 'Both',
        applicableGender: 'Both',
        schedulable: false,
        surgicalService: false,
        individuallyOrderable: true,
        autoProcessable: false,
        consentRequired: false,
        isRestricted: false,
        isExternal: false,
        isPercentageTariff: false,
        isToothMandatory: false,
        isAuthRequired: false,
        estDuration: 0,
        reOrderDuration: 0,
        autoCancellationDays: 0,
        minTimeBilling: 0,
        maxTimeBilling: 0,
        maxOrderableQty: 0,
        cptCode: '',
        groupName: '',
        billingGroupName: '',
        financialGroup: '',
        cptDescription: '',
        specialInstructions: '',
        tariffs: []
    };

    const [form, setForm] = useState<ServiceDefinition>(initialForm);
    const [price, setPrice] = useState<string>('');

    // Local Assigned Locations state
    const [localMappings, setLocalMappings] = useState<ServiceLocationMapping[]>([]);
    
    // Assigned locations form inputs
    const [locBranchId, setLocBranchId] = useState('');
    const [locDeptId, setLocDeptId] = useState('');
    const [locCentreId, setLocCentreId] = useState('');

    useEffect(() => {
        if (branches.length > 0) setLocBranchId(branches[0].id);
        if (departments.length > 0) setLocDeptId(departments[0].id);
        if (serviceCentres.length > 0) setLocCentreId(serviceCentres[0].id);
    }, [branches, departments, serviceCentres]);

    const handleEdit = (s: ServiceDefinition) => {
        setForm(s);
        // Load price
        const tariff = serviceTariffs.find(t => t.serviceId === s.id);
        setPrice(tariff ? tariff.price.toString() : '');

        // Load location mappings
        const mappings = serviceLocationMappings.filter(m => m.serviceId === s.id);
        setLocalMappings(mappings);

        setShowForm(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code || !form.name) return;

        const newId = form.id || crypto.randomUUID();
        
        // Setup Self Pay Tariff
        const tariff: ServiceTariff = {
            id: crypto.randomUUID(),
            serviceId: newId,
            tariffName: 'Self Pay',
            price: parseFloat(price) || 0,
            effectiveDate: new Date().toISOString(),
            status: 'Active'
        };

        const payload: ServiceDefinition = {
            ...form,
            id: newId,
            tariffs: [tariff]
        };

        // Save service definition
        saveServiceDefinition(payload);
        
        // Save location mappings (with correct service ID for new entries)
        const updatedMappings = localMappings.map(m => ({
            ...m,
            serviceId: newId
        }));
        saveServiceLocationMappings(newId, updatedMappings);

        setShowForm(false);
        setForm(initialForm);
        setPrice('');
        setLocalMappings([]);
    };

    const handleAddLocation = () => {
        if (!locBranchId || !locCentreId) return;

        // Check if mapping already exists locally
        const exists = localMappings.some(m => m.branchId === locBranchId && m.serviceCentreId === locCentreId);
        if (exists) {
            alert('This location mapping is already assigned.');
            return;
        }

        const newMapping: ServiceLocationMapping = {
            id: crypto.randomUUID(),
            serviceId: form.id || '',
            branchId: locBranchId,
            departmentId: locDeptId || undefined,
            serviceCentreId: locCentreId,
            isPrimary: localMappings.length === 0 // Default true for first location
        };

        setLocalMappings(prev => [...prev, newMapping]);
    };

    const handleRemoveLocation = (id: string) => {
        setLocalMappings(prev => prev.filter(m => m.id !== id));
    };

    const handleTogglePrimary = (id: string) => {
        setLocalMappings(prev => prev.map(m => ({
            ...m,
            isPrimary: m.id === id
        })));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];
            
            const mapped: ServiceDefinition[] = data.map((row: any) => ({
                id: crypto.randomUUID(),
                code: row['Code'] || '',
                name: row['Name'] || '',
                serviceType: row['Type'] || 'Single service',
                serviceCategory: row['Category'] || 'General',
                status: 'Active' as const,
                chargeable: true,
                applicableVisitType: 'Both' as const,
                applicableGender: 'Both' as const,
                schedulable: !!row['Schedulable'],
                surgicalService: !!row['Surgical'],
                individuallyOrderable: true,
                autoProcessable: false,
                consentRequired: false,
                isRestricted: false,
                isExternal: false,
                isPercentageTariff: false,
                isToothMandatory: false,
                isAuthRequired: false,
                tariffs: [{
                    id: crypto.randomUUID(),
                    serviceId: '', 
                    tariffName: 'Self Pay',
                    price: parseFloat(row['Price']) || 0,
                    effectiveDate: new Date().toISOString(),
                    status: 'Active' as const
                }]
            })).filter(s => s.code && s.name);

            if (mapped.length > 0) {
                uploadServiceDefinitions(mapped);
            }
        };
        reader.readAsBinaryString(file);
    };

    const filtered = serviceDefinitions.filter(s => 
        s.serviceType?.toLowerCase() !== 'laboratory' && (
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const paginatedServices = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
            {!showForm ? (
                /* List Section */
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col flex-1 min-h-0">
                    {/* Compact Header */}
                    <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 border-b border-blue-400 flex flex-col lg:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-md tracking-tight">Service Master</h3>
                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">Inventory & Tariffs</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-48">
                                <Search className="w-3.5 h-3.5 text-blue-200 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    placeholder="Search..." 
                                    className="w-full h-8 pl-9 pr-3 bg-white/10 text-white placeholder:text-blue-100/50 text-xs rounded-lg border border-white/20 focus:ring-2 focus:ring-white/20 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            
                            <button 
                                onClick={() => downloadTemplate('service')}
                                className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg border border-white/20 transition-all active:scale-95 text-[10px] font-bold flex items-center gap-1.5"
                                title="Download Template"
                            >
                                <FileDown className="w-3.5 h-3.5" /> Template
                            </button>
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> {isLoading ? '...' : 'Import'}
                            </button>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                            
                            <button 
                                onClick={() => { setForm(initialForm); setPrice(''); setLocalMappings([]); setShowForm(true); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-md shadow-green-900/20 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Service
                            </button>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto scrollbar-thin">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 border-r border-slate-100">Code</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Service Name</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Category</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Type</th>
                                    <th className="px-6 py-3 text-right">Price (Est.)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No services found.</td></tr>
                                ) : (
                                    paginatedServices.map((s, i) => {
                                        const tariff = serviceTariffs.find(t => t.serviceId === s.id);
                                        const displayPrice = tariff ? tariff.price.toFixed(2) : '-';

                                        return (
                                        <tr key={i} onClick={() => handleEdit(s)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group h-10">
                                            <td className="px-6 py-2 font-mono font-bold text-blue-600 border-r border-slate-50">{s.code}</td>
                                            <td className="px-6 py-2 font-medium text-slate-800 border-r border-slate-50">{s.name}</td>
                                            <td className="px-6 py-2 text-slate-500 text-[11px] font-bold uppercase border-r border-slate-50">{s.serviceCategory}</td>
                                            <td className="px-6 py-2 text-slate-400 text-[11px] border-r border-slate-50">{s.serviceType}</td>
                                            <td className="px-6 py-2 text-right font-mono font-bold text-green-600">
                                                {displayPrice}
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filtered.length / itemsPerPage)}
                        totalItems={filtered.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        colorTheme="blue"
                    />
                </div>
            ) : (
                /* Full-Screen Advanced Form Panel */
                <form onSubmit={handleSave} className="flex-1 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col min-h-0 animate-in fade-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 border-b border-blue-400 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white">
                            <Activity className="w-5 h-5" />
                            <h3 className="font-bold text-md">{form.id ? 'Edit Service Definition' : 'New Service Definition'}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                type="submit" 
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                            >
                                Save
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { setShowForm(false); setForm(initialForm); setLocalMappings([]); }}
                                className="bg-white/10 hover:bg-white/20 text-white px-5 py-1.5 rounded-lg text-xs font-bold border border-white/20 transition-all active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Form Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                        
                        {/* 1. Core Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Code *</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-blue-600"
                                    value={form.code}
                                    onChange={e => setForm({...form, code: e.target.value})}
                                    placeholder="e.g. TMC-101"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Name *</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    placeholder="e.g. Filler 1 ML - Pluryal"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Type *</label>
                                <select 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold appearance-none bg-slate-50/50 cursor-pointer"
                                    value={form.serviceType}
                                    onChange={e => setForm({...form, serviceType: e.target.value})}
                                    required
                                >
                                    <option value="Single service">Single service</option>
                                    <option value="Package">Package</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Category *</label>
                                <select 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold appearance-none bg-slate-50/50 cursor-pointer"
                                    value={form.serviceCategory}
                                    onChange={e => setForm({...form, serviceCategory: e.target.value})}
                                    required
                                >
                                    <option value="General">General</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Laboratory">Laboratory</option>
                                    <option value="Radiology">Radiology</option>
                                    <option value="Procedure">Procedure</option>
                                    <option value="Dermatology">Dermatology</option>
                                    <option value="Dental">Dental</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Base Price (Self Pay) *</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold text-green-600 text-right"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Est. Duration (Minutes)</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.estDuration || 0}
                                    onChange={e => setForm({...form, estDuration: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Re-Order Duration</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.reOrderDuration || 0}
                                    onChange={e => setForm({...form, reOrderDuration: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Auto Cancellation (Days)</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.autoCancellationDays || 0}
                                    onChange={e => setForm({...form, autoCancellationDays: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Min Time For Billing (Mins)</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.minTimeBilling || 0}
                                    onChange={e => setForm({...form, minTimeBilling: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Max Time For Hourly Billing (Hrs)</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.maxTimeBilling || 0}
                                    onChange={e => setForm({...form, maxTimeBilling: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Max Orderable Qty</label>
                                <input 
                                    type="number"
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.maxOrderableQty || 0}
                                    onChange={e => setForm({...form, maxOrderableQty: parseInt(e.target.value) || 0})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Mnemonics</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.alternateName || ''}
                                    onChange={e => setForm({...form, alternateName: e.target.value})}
                                    placeholder="Mnemonics"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Applicable Gender</label>
                                <select 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold bg-slate-50/50 cursor-pointer"
                                    value={form.applicableGender}
                                    onChange={e => setForm({...form, applicableGender: e.target.value as any})}
                                >
                                    <option value="Both">Both</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Applicable Visit Type</label>
                                <select 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold bg-slate-50/50 cursor-pointer"
                                    value={form.applicableVisitType}
                                    onChange={e => setForm({...form, applicableVisitType: e.target.value as any})}
                                >
                                    <option value="Both">Both</option>
                                    <option value="New">New</option>
                                    <option value="Follow-up">Follow-up</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">CPT Code</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-bold"
                                    value={form.cptCode || ''}
                                    onChange={e => setForm({...form, cptCode: e.target.value})}
                                    placeholder="CPT Code"
                                />
                            </div>

                            <div className="flex items-center gap-6 h-9 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={form.status === 'Active'} 
                                        onChange={e => setForm({...form, status: e.target.checked ? 'Active' : 'Inactive'})}
                                        className="rounded text-blue-600 w-4 h-4 focus:ring-0"
                                    /> 
                                    <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Active</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={form.chargeable} 
                                        onChange={e => setForm({...form, chargeable: e.target.checked})}
                                        className="rounded text-blue-600 w-4 h-4 focus:ring-0"
                                    /> 
                                    <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Chargeable</span>
                                </label>
                            </div>
                        </div>

                        {/* 2. Checkboxes Grid Section */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Service Settings</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-3 gap-x-4">
                                {[
                                    { k: 'schedulable', l: 'Schedulable' },
                                    { k: 'surgicalService', l: 'Surgical Service' },
                                    { k: 'individuallyOrderable', l: 'Individually Orderable' },
                                    { k: 'autoProcessable', l: 'Auto Processable' },
                                    { k: 'consentRequired', l: 'Consent Required' },
                                    { k: 'isRestricted', l: 'Is Restricted' },
                                    { k: 'isExternal', l: 'Is External Service' },
                                    { k: 'isPercentageTariff', l: 'Is Percentage Tariff' },
                                    { k: 'isToothMandatory', l: 'Is Tooth No Mandatory' },
                                    { k: 'isAuthRequired', l: 'Is Authorization Required' },
                                ].map(c => (
                                    <label key={c.k} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={(form as any)[c.k]} 
                                            onChange={e => setForm({...form, [c.k]: e.target.checked})}
                                            className="rounded text-blue-600 w-3.5 h-3.5 focus:ring-0"
                                        /> 
                                        <span className="text-xs text-slate-650 font-medium">{c.l}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 3. Group and Billing Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-semibold">Group Name</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.groupName || ''}
                                    onChange={e => setForm({...form, groupName: e.target.value})}
                                    placeholder="e.g. SERVICE_GROUPS/Dermatology/Filler"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-semibold">Billing Group Name</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.billingGroupName || ''}
                                    onChange={e => setForm({...form, billingGroupName: e.target.value})}
                                    placeholder="e.g. Services/Dermatology"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-semibold">Financial Group</label>
                                <input 
                                    className="w-full h-9 border border-slate-250 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={form.financialGroup || ''}
                                    onChange={e => setForm({...form, financialGroup: e.target.value})}
                                    placeholder="e.g. ERP Finance1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">CPT Description</label>
                                <textarea 
                                    className="w-full h-16 border border-slate-250 rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    value={form.cptDescription || ''}
                                    onChange={e => setForm({...form, cptDescription: e.target.value})}
                                    placeholder="Enter CPT Description details..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Special Instruction</label>
                                <textarea 
                                    className="w-full h-16 border border-slate-250 rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    value={form.specialInstructions || ''}
                                    onChange={e => setForm({...form, specialInstructions: e.target.value})}
                                    placeholder="Enter Special Instructions..."
                                />
                            </div>
                        </div>

                        {/* 4. Tabbed Sub-panel Section */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
                            
                            {/* Horizontal Tabs List */}
                            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-none">
                                {[
                                    { id: 'locations', label: 'Location Specific Details' },
                                    { id: 'namespace', label: 'Namespace Mapping' },
                                    { id: 'mandatory', label: 'Mandatory Information' },
                                    { id: 'report', label: 'Report Form' },
                                    { id: 'consumable', label: 'Item Consumable Service Map' },
                                    { id: 'tariff', label: 'Service Tariff' },
                                    { id: 'revenue', label: 'Revenue Details' },
                                    { id: 'parameters', label: 'Service Parameter Config' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveFormTab(tab.id as any)}
                                        className={`px-5 py-2.5 text-xs font-bold tracking-wide border-r border-slate-200 transition-colors whitespace-nowrap outline-none ${
                                            activeFormTab === tab.id 
                                                ? 'bg-blue-600 text-white border-b-2 border-b-blue-700' 
                                                : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900 bg-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Active Tab Panel Body */}
                            <div className="p-5 min-h-[220px]">
                                {activeFormTab === 'locations' && (
                                    <div className="space-y-4">
                                        
                                        {/* Input fields to add location mapping */}
                                        <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Hospital *</label>
                                                <select
                                                    className="w-full h-8 border border-slate-250 rounded-lg px-2 text-xs focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                                                    value={locBranchId}
                                                    onChange={e => setLocBranchId(e.target.value)}
                                                >
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Department</label>
                                                <select
                                                    className="w-full h-8 border border-slate-250 rounded-lg px-2 text-xs focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                                                    value={locDeptId}
                                                    onChange={e => setLocDeptId(e.target.value)}
                                                >
                                                    <option value="">-- Select --</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Service Center *</label>
                                                <select
                                                    className="w-full h-8 border border-slate-250 rounded-lg px-2 text-xs focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                                                    value={locCentreId}
                                                    onChange={e => setLocCentreId(e.target.value)}
                                                >
                                                    {serviceCentres.map(sc => (
                                                        <option key={sc.id} value={sc.id}>{sc.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleAddLocation}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 h-8 rounded-lg text-xs transition-all active:scale-95 shadow-sm shadow-blue-200"
                                            >
                                                Add Location
                                            </button>
                                        </div>

                                        {/* Grid Table of Assigned Locations */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-55 border-b border-slate-200 font-bold uppercase text-[9px] text-slate-600 tracking-wider">
                                                    <tr>
                                                        <th className="px-5 py-2.5 border-r border-slate-100">Hospital</th>
                                                        <th className="px-5 py-2.5 border-r border-slate-100">Department</th>
                                                        <th className="px-5 py-2.5 border-r border-slate-100">Service Center Name</th>
                                                        <th className="px-5 py-2.5 border-r border-slate-100 text-center w-36">Primary Location</th>
                                                        <th className="px-5 py-2.5 text-center w-24">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {localMappings.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-5 py-6 text-center text-slate-400 italic">No locations assigned yet. Click Add Location to map.</td>
                                                        </tr>
                                                    ) : (
                                                        localMappings.map((m) => {
                                                            const hName = branches.find(b => b.id === m.branchId)?.name || 'Unknown';
                                                            const dName = departments.find(d => d.id === m.departmentId)?.name || '-';
                                                            const cName = serviceCentres.find(c => c.id === m.serviceCentreId)?.name || 'Unknown';

                                                            return (
                                                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors h-10">
                                                                    <td className="px-5 py-2 font-medium text-slate-700 border-r border-slate-50">{hName}</td>
                                                                    <td className="px-5 py-2 text-slate-600 border-r border-slate-50">{dName}</td>
                                                                    <td className="px-5 py-2 font-mono text-[11px] text-blue-650 border-r border-slate-50">{cName}</td>
                                                                    <td className="px-5 py-2 border-r border-slate-50 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={m.isPrimary}
                                                                            onChange={() => handleTogglePrimary(m.id)}
                                                                            className="rounded text-blue-650 w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                                                                            title="Mark as primary location"
                                                                        />
                                                                    </td>
                                                                    <td className="px-5 py-2 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveLocation(m.id)}
                                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-colors"
                                                                            title="Delete assigned location"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeFormTab !== 'locations' && (
                                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 border border-dashed border-slate-200 rounded-xl min-h-[160px]">
                                        <Image className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{activeFormTab} CONFIGURATION PANEL</p>
                                        <p className="text-[10px] text-slate-450 mt-1 max-w-sm leading-normal">
                                            This panel handles the configuration parameters for {activeFormTab.replace(/^\w/, c => c.toUpperCase())}. Mappings configured here are bound to the service record.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </form>
            )}
        </div>
    );
};

// --- Vital Sign Master Component ---
const VitalSignMaster = () => {
    const { vitalSignGroups, vitalSignParameters, saveVitalSignParameter, deleteVitalSignParameter } = useData();
    const [selectedGroupId, setSelectedGroupId] = useState(vitalSignGroups[0]?.id || '');
    const [showForm, setShowForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const initialForm: VitalSignParameter = {
        id: '',
        groupId: '',
        name: '',
        controlType: 'Numeric',
        referenceRangeMin: '',
        referenceRangeMax: '',
        unit: '',
        isActive: true
    };
    const [form, setForm] = useState<VitalSignParameter>(initialForm);

    const groupParameters = vitalSignParameters.filter(p => p.groupId === selectedGroupId);

    const paginatedParameters = groupParameters.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleEdit = (p: VitalSignParameter) => {
        setForm(p);
        setShowForm(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !selectedGroupId) return;

        saveVitalSignParameter({
            ...form,
            id: form.id || Date.now().toString(),
            groupId: selectedGroupId
        });
        setShowForm(false);
        setForm(initialForm);
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* List Section */}
            <div className={`flex-1 flex flex-col gap-4 ${showForm ? 'hidden lg:flex' : ''}`}>
                {/* Compact Configuration Bar */}
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Master</span>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Vital Group:</label>
                                <div className="relative">
                                    <select 
                                        className="h-9 border border-slate-200 rounded-lg px-3 pr-8 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none font-bold text-blue-700 min-w-[180px]"
                                        value={selectedGroupId}
                                        onChange={e => { setSelectedGroupId(e.target.value); setCurrentPage(1); }}
                                    >
                                        {vitalSignGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setForm(initialForm); setShowForm(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> New Parameter
                    </button>
                </div>

                {/* Parameter Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 border-b border-blue-400 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-bold text-white text-md tracking-tight">Sign Group Parameter Mapping</h3>
                        </div>
                        <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 uppercase tracking-widest">
                            {groupParameters.length} Parameters
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 border-r border-slate-100">Parameter Name</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Control Type</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Reference Range</th>
                                    <th className="px-6 py-3 border-r border-slate-100">Active</th>
                                    <th className="px-6 py-3 text-center">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupParameters.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-slate-400 italic font-medium">No parameters mapped to this group.</td>
                                    </tr>
                                ) : (
                                    paginatedParameters.map((p) => (
                                        <tr key={p.id} onClick={() => handleEdit(p)} className="hover:bg-blue-50/40 transition-colors group cursor-pointer h-12">
                                            <td className="px-6 py-2 font-bold text-slate-800 border-r border-slate-50">{p.name}</td>
                                            <td className="px-6 py-2 border-r border-slate-50">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                    p.controlType === 'Formula' 
                                                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                    {p.controlType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 font-mono font-bold text-slate-500 border-r border-slate-50">
                                                <span className="text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded-lg border border-blue-100/50">
                                                    {p.referenceRangeMin} - {p.referenceRangeMax} <span className="text-[10px] text-slate-400 ml-1 uppercase">{p.unit}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 border-r border-slate-50">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
                                                    <span className={`text-[11px] font-bold uppercase transition-colors ${p.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {p.isActive ? 'true' : 'false'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteVitalSignParameter(p.id); }}
                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all active:scale-90"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(groupParameters.length / itemsPerPage)}
                        totalItems={groupParameters.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        colorTheme="blue"
                    />
                </div>
            </div>

            {/* Form Section */}
            {showForm && (
                <div className="w-full md:w-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in slide-in-from-right-10 duration-300 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">
                            {form.id ? 'Edit Parameter' : 'Add New Parameter'}
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parameter Name</label>
                            <input 
                                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                value={form.name}
                                onChange={e => setForm({...form, name: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Control Type</label>
                                <select 
                                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none bg-slate-50/50"
                                    value={form.controlType}
                                    onChange={e => setForm({...form, controlType: e.target.value as any})}
                                >
                                    <option>Numeric</option>
                                    <option>Text</option>
                                    <option>Formula</option>
                                    <option>Dropdown</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</label>
                                <input 
                                    className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                    value={form.unit || ''}
                                    onChange={e => setForm({...form, unit: e.target.value})}
                                    placeholder="e.g. kg, cm"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normal Reference Range</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600">Minimum</label>
                                    <input 
                                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
                                        value={form.referenceRangeMin || ''}
                                        onChange={e => setForm({...form, referenceRangeMin: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600">Maximum</label>
                                    <input 
                                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
                                        value={form.referenceRangeMax || ''}
                                        onChange={e => setForm({...form, referenceRangeMax: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {form.controlType === 'Formula' && (
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Formula Definition</label>
                              <textarea 
                                  className="w-full h-24 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                                  value={form.formula || ''}
                                  onChange={e => setForm({...form, formula: e.target.value})}
                                  placeholder="[Weight] / ([Height]/100 * [Height]/100)"
                              />
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-1">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={form.isActive} 
                                    onChange={e => setForm({...form, isActive: e.target.checked})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className="text-sm font-bold text-slate-700">Parameter is Active</span>
                        </div>
                    </form>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                        <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-600 text-xs font-bold hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200">Cancel</button>
                        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all active:scale-95">Save Parameter</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Currency Master Component ---
const CurrencyMaster = () => {
  const { currencies, selectedCurrency, setSelectedCurrency, saveCurrency, deleteCurrency } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', isActive: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) return;
    
    const success = await saveCurrency({
      id: crypto.randomUUID(),
      code: newCurrency.code.toUpperCase().trim(),
      name: newCurrency.name.trim(),
      symbol: newCurrency.symbol.trim(),
      isActive: newCurrency.isActive,
      isDefault: false
    });
    
    if (success) {
      setNewCurrency({ code: '', name: '', symbol: '', isActive: true });
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* Action Bar */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 px-6 py-4 border-b border-blue-400 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">Currency Master</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-80">Global System Currencies</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> Add Currency
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency Code</label>
            <input 
              placeholder="e.g. INR, SAR, USD" 
              maxLength={3}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
              value={newCurrency.code}
              onChange={e => setNewCurrency({...newCurrency, code: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency Name</label>
            <input 
              placeholder="e.g. Saudi Riyal" 
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newCurrency.name}
              onChange={e => setNewCurrency({...newCurrency, name: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Symbol</label>
            <input 
              placeholder="e.g. ₹, SAR, $" 
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newCurrency.symbol}
              onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})}
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="flex-1 h-[38px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
              Save Currency
            </button>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="h-[38px] px-3 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 w-32">Code</th>
              <th className="px-6 py-4">Currency Name</th>
              <th className="px-6 py-4 w-32 text-center">Symbol</th>
              <th className="px-6 py-4 w-32 text-center">Status</th>
              <th className="px-6 py-4 w-48 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currencies.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No currencies found. Add custom currencies above.</td></tr>
            ) : (
              currencies.map((curr: Currency) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <tr key={curr.id} className={`hover:bg-slate-50/50 transition-colors group h-12 ${isSelected ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-6 py-3 font-mono font-bold text-blue-600">{curr.code}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{curr.name}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-600">{curr.symbol}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        curr.isActive 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {curr.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {isSelected ? (
                          <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-blue-600">
                            Active Currency
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedCurrency(curr.code)}
                            className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                          >
                            Set Active
                          </button>
                        )}
                        {!isSelected && curr.id !== 'c1' && curr.id !== 'c2' && curr.id !== 'c3' && curr.id !== 'c4' && curr.id !== 'c5' && (
                          <button
                            onClick={() => deleteCurrency(curr.id)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete Currency"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const Masters = () => {
  const { 
    departments, addDepartment, 
    units, addUnit, 
    serviceCentres, addServiceCentre,
    branches, saveBranch
  } = useData();

  const [activeTab, setActiveTab] = useState<'hospitals' | 'departments' | 'units' | 'services' | 'diagnosis' | 'dental_icd' | 'service_defs' | 'vitals' | 'currencies'>('hospitals');

  const tabs = [
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'departments', label: 'Departments' },
    { id: 'units', label: 'Medical Units' },
    { id: 'services', label: 'Service Locations' },
    { id: 'diagnosis', label: 'Diagnosis (ICD)' },
    { id: 'dental_icd', label: 'Dental ICD' },
    { id: 'service_defs', label: 'Service Master' },
    { id: 'vitals', label: 'Vital Signs' },
    { id: 'currencies', label: 'Currency Master' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl w-fit shadow-sm border border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'hospitals' && (
          <HospitalMaster />
        )}
        {activeTab === 'departments' && (
          <MasterList title="Department" data={departments} onAdd={addDepartment} />
        )}
        {activeTab === 'units' && (
          <MasterList title="Medical Unit" data={units} onAdd={addUnit} />
        )}
        {activeTab === 'services' && (
          <MasterList title="Service Location" data={serviceCentres} onAdd={addServiceCentre} />
        )}
        {activeTab === 'diagnosis' && (
            <DiagnosisMaster />
        )}
        {activeTab === 'dental_icd' && (
            <DentalICDMaster />
        )}
        {activeTab === 'service_defs' && (
            <ServiceMaster />
        )}
        {activeTab === 'vitals' && (
            <VitalSignMaster />
        )}
        {activeTab === 'currencies' && (
            <CurrencyMaster />
        )}
      </div>
    </div>
  );
};