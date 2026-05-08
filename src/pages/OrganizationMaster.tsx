import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Organization, OrganizationContact } from '../types';
import { 
  Search, Plus, Trash2, Building, Landmark, Mail, Phone, MapPin, 
  User, Layers, Percent, ClipboardList, Check, ToggleLeft, ToggleRight, X
} from 'lucide-react';

export const OrganizationMaster: React.FC = () => {
    const { 
        organizations, saveOrganization, deleteOrganization, 
        branches, showToast 
    } = useData();

    const [activeTab, setActiveTab] = useState<'overview' | 'tariff' | 'sponsor'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

    // Form fields
    const [orgCode, setOrgCode] = useState(() => `ORG-${Math.floor(1000000 + Math.random() * 9000000)}`);
    const [sponsorType, setSponsorType] = useState('Corporate');
    const [payerId, setPayerId] = useState('');
    const [vatNotRequired, setVatNotRequired] = useState(false);
    const [contractCreatedBy, setContractCreatedBy] = useState('SMRUTI RANJAN MISHRA');
    const [organizationType, setOrganizationType] = useState<'With MOU' | 'Without MOU'>('With MOU');
    const [accountNo, setAccountNo] = useState(`ORG-${Math.floor(100000 + Math.random() * 900000)}`);
    const [organizationGroup, setOrganizationGroup] = useState('');
    const [receiverId, setReceiverId] = useState('');
    const [gatewayConfiguration, setGatewayConfiguration] = useState('--Select--');
    const [vatNo, setVatNo] = useState('');
    const [name, setName] = useState('');
    const [active, setActive] = useState(true);
    const [isDamanOrThiqa, setIsDamanOrThiqa] = useState(false);
    const [maxApprovalTime, setMaxApprovalTime] = useState<number>(0);

    // Address Details
    const [addressDetails, setAddressDetails] = useState('');
    const [buildingNo, setBuildingNo] = useState('');
    const [city, setCity] = useState('RIYADH');
    const [country, setCountry] = useState('Saudi Arabia');
    const [postalCode, setPostalCode] = useState('');
    const [state, setState] = useState('ar-Riyad');
    const [dist, setDist] = useState('ar-Riyad');

    // Contacts state
    const [contacts, setContacts] = useState<OrganizationContact[]>([
        {
            id: crypto.randomUUID(),
            firstName: 'Abduallah Ahmed Albriki cuns',
            middleName: '',
            lastName: '',
            designation: 'Executive',
            contactType: 'Mobile',
            value: '0546899641',
            mobile: '0546899641',
            idType: 'Primary ID',
            idNo: '0546899641',
            primaryId: true
        }
    ]);

    // Temp inputs for adding a contact
    const [newContactFirstName, setNewContactFirstName] = useState('');
    const [newContactMiddleName, setNewContactMiddleName] = useState('');
    const [newContactLastName, setNewContactLastName] = useState('');
    const [newContactDesignation, setNewContactDesignation] = useState('Executive');
    const [newContactType, setNewContactType] = useState('Mobile');
    const [newContactValue, setNewContactValue] = useState('');
    const [newContactMobile, setNewContactMobile] = useState('');
    const [newContactIdType, setNewContactIdType] = useState('Primary ID');
    const [newContactIdNo, setNewContactIdNo] = useState('');
    const [newContactPrimaryId, setNewContactPrimaryId] = useState(false);

    // Insurance mapping
    const [selectedInsurance, setSelectedInsurance] = useState('');
    const [mappedInsurances, setMappedInsurances] = useState<string[]>(['AL KADI MEDICAL']);

    // Class wise tariff
    const [selectedBranch, setSelectedBranch] = useState('');

    const filteredOrgs = useMemo(() => {
        return organizations.filter(o => 
            o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [organizations, searchQuery]);

    const handleAddContact = () => {
        if (!newContactFirstName) {
            showToast('error', 'Contact First Name is required');
            return;
        }
        const contact: OrganizationContact = {
            id: crypto.randomUUID(),
            firstName: newContactFirstName,
            middleName: newContactMiddleName,
            lastName: newContactLastName,
            designation: newContactDesignation,
            contactType: newContactType,
            value: newContactValue,
            mobile: newContactMobile,
            idType: newContactIdType,
            idNo: newContactIdNo,
            primaryId: newContactPrimaryId
        };
        setContacts(prev => [...prev, contact]);
        
        // Reset temp
        setNewContactFirstName('');
        setNewContactMiddleName('');
        setNewContactLastName('');
        setNewContactValue('');
        setNewContactMobile('');
        setNewContactIdNo('');
        setNewContactPrimaryId(false);
        showToast('success', 'Contact added successfully');
    };

    const handleRemoveContact = (id: string) => {
        setContacts(prev => prev.filter(c => c.id !== id));
        showToast('info', 'Contact removed');
    };

    const handleAddInsurance = () => {
        if (!selectedInsurance) return;
        if (mappedInsurances.includes(selectedInsurance)) {
            showToast('info', 'Insurance already mapped');
            return;
        }
        setMappedInsurances(prev => [...prev, selectedInsurance]);
        setSelectedInsurance('');
        showToast('success', 'Insurance mapped successfully');
    };

    const handleRemoveInsurance = (insName: string) => {
        setMappedInsurances(prev => prev.filter(i => i !== insName));
        showToast('info', 'Insurance mapping removed');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            showToast('error', 'Organization Name is required');
            return;
        }

        const orgToSave: Organization = {
            id: selectedOrgId || crypto.randomUUID(),
            code: orgCode,
            sponsorType,
            payerId,
            vatNotRequired,
            contractCreatedBy,
            organizationType,
            accountNo,
            organizationGroup,
            receiverId,
            gatewayConfiguration,
            vatNo,
            name,
            active,
            isDamanOrThiqa,
            maxApprovalTime: Number(maxApprovalTime),
            addressDetails,
            buildingNo,
            city,
            country,
            postalCode,
            state,
            dist,
            contacts,
            insuranceId: mappedInsurances.join(','),
            branchId: selectedBranch
        };

        await saveOrganization(orgToSave);
        showToast('success', 'Organization saved successfully');
        resetForm();
    };

    const handleEdit = (org: Organization) => {
        setSelectedOrgId(org.id);
        setOrgCode(org.code);
        setSponsorType(org.sponsorType);
        setPayerId(org.payerId || '');
        setVatNotRequired(org.vatNotRequired);
        setContractCreatedBy(org.contractCreatedBy || '');
        setOrganizationType(org.organizationType);
        setAccountNo(org.accountNo || '');
        setOrganizationGroup(org.organizationGroup || '');
        setReceiverId(org.receiverId || '');
        setGatewayConfiguration(org.gatewayConfiguration || '--Select--');
        setVatNo(org.vatNo || '');
        setName(org.name);
        setActive(org.active);
        setIsDamanOrThiqa(org.isDamanOrThiqa);
        setMaxApprovalTime(org.maxApprovalTime || 0);
        setAddressDetails(org.addressDetails || '');
        setBuildingNo(org.buildingNo || '');
        setCity(org.city || '');
        setCountry(org.country || '');
        setPostalCode(org.postalCode || '');
        setState(org.state || '');
        setDist(org.dist || '');
        setContacts(org.contacts || []);
        setMappedInsurances(org.insuranceId ? org.insuranceId.split(',') : []);
        setSelectedBranch(org.branchId || '');
        setIsCreateMode(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this Organization?')) {
            await deleteOrganization(id);
            showToast('info', 'Organization deleted');
        }
    };

    const resetForm = () => {
        setSelectedOrgId(null);
        setOrgCode(`ORG-${Math.floor(1000000 + Math.random() * 9000000)}`);
        setSponsorType('Corporate');
        setPayerId('');
        setVatNotRequired(false);
        setContractCreatedBy('SMRUTI RANJAN MISHRA');
        setOrganizationType('With MOU');
        setAccountNo(`ORG-${Math.floor(100000 + Math.random() * 900000)}`);
        setOrganizationGroup('');
        setReceiverId('');
        setGatewayConfiguration('--Select--');
        setVatNo('');
        setName('');
        setActive(true);
        setIsDamanOrThiqa(false);
        setMaxApprovalTime(0);
        setAddressDetails('');
        setBuildingNo('');
        setCity('RIYADH');
        setCountry('Saudi Arabia');
        setPostalCode('');
        setState('ar-Riyad');
        setDist('ar-Riyad');
        setContacts([
            {
                id: crypto.randomUUID(),
                firstName: 'Abduallah Ahmed Albriki cuns',
                middleName: '',
                lastName: '',
                designation: 'Executive',
                contactType: 'Mobile',
                value: '0546899641',
                mobile: '0546899641',
                idType: 'Primary ID',
                idNo: '0546899641',
                primaryId: true
            }
        ]);
        setMappedInsurances(['AL KADI MEDICAL']);
        setSelectedBranch('');
        setIsCreateMode(false);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-blue-600" />
                        Organization Master
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage sponsors, insurance companies, corporate tariffs, and MOU mappings</p>
                </div>
                {!isCreateMode ? (
                    <button 
                        onClick={() => setIsCreateMode(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create Organization
                    </button>
                ) : (
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                    >
                        <X className="w-5 h-5" />
                        Back to List
                    </button>
                )}
            </div>

            {/* Custom Tab Ribbon */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Building className="w-4 h-4" />
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('tariff')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'tariff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Percent className="w-4 h-4" />
                    Tariff
                </button>
                <button 
                    onClick={() => setActiveTab('sponsor')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'sponsor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    Sponsor Contract Details
                </button>
            </div>

            {!isCreateMode ? (
                /* LIST VIEW */
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search organizations by name or code..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {filteredOrgs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Building className="w-16 h-16 text-slate-300 mb-2" />
                                <p className="font-bold text-slate-500">No organizations found</p>
                                <p className="text-xs text-slate-400 mt-1">Get started by creating a new corporate sponsor organization.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-8 py-4">Code</th>
                                        <th className="px-8 py-4">Organization Name</th>
                                        <th className="px-8 py-4">Sponsor Type</th>
                                        <th className="px-8 py-4">Vat No</th>
                                        <th className="px-8 py-4">MOU Status</th>
                                        <th className="px-8 py-4">Active</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrgs.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-8 py-5 text-sm font-bold text-blue-600">{org.code}</td>
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-slate-800">{org.name}</div>
                                                <div className="text-xs text-slate-500">{org.city}, {org.country}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{org.sponsorType}</span>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-mono text-slate-600">{org.vatNo || '-'}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    org.organizationType === 'With MOU' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}>
                                                    {org.organizationType}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${org.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {org.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(org)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">Edit</button>
                                                    <button onClick={() => handleDelete(org.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : (
                /* CREATE / EDIT FORM */
                <form onSubmit={handleSave} className="flex flex-col gap-6">
                    {activeTab === 'overview' && (
                        <>
                        {/* Organisation Details Panel */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-500" />
                                Organisation Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Code <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={orgCode} 
                                    onChange={(e) => setOrgCode(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sponsor Type <span className="text-red-500">*</span></label>
                                <select 
                                    value={sponsorType} 
                                    onChange={(e) => setSponsorType(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                >
                                    <option value="Corporate">Corporate</option>
                                    <option value="Self">Self</option>
                                    <option value="Insurance">Insurance</option>
                                    <option value="PED">PED</option>
                                    <option value="TPA">TPA</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                    placeholder="Enter full organization name"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Payer Id</label>
                                <input 
                                    type="text" 
                                    value={payerId} 
                                    onChange={(e) => setPayerId(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account No</label>
                                <input 
                                    type="text" 
                                    value={accountNo} 
                                    onChange={(e) => setAccountNo(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-600"
                                    readOnly 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Group</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={organizationGroup} 
                                        onChange={(e) => setOrganizationGroup(e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Lookup group"
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Receiver Id</label>
                                <input 
                                    type="text" 
                                    value={receiverId} 
                                    onChange={(e) => setReceiverId(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gateway Configuration</label>
                                <select 
                                    value={gatewayConfiguration} 
                                    onChange={(e) => setGatewayConfiguration(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="--Select--">--Select--</option>
                                    <option value="Gateway 1">Gateway 1</option>
                                    <option value="Gateway 2">Gateway 2</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">VAT No</label>
                                <input 
                                    type="text" 
                                    value={vatNo} 
                                    onChange={(e) => setVatNo(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    placeholder="310125019100003"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maximum Approval Time (Mins)</label>
                                <input 
                                    type="number" 
                                    value={maxApprovalTime} 
                                    onChange={(e) => setMaxApprovalTime(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex gap-6 items-center pt-4 md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={vatNotRequired} 
                                        onChange={(e) => setVatNotRequired(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                                    />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">VAT Not Required</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={active} 
                                        onChange={(e) => setActive(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                                    />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Active</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isDamanOrThiqa} 
                                        onChange={(e) => setIsDamanOrThiqa(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                                    />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Is Daman or Thiqa</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contract Created By</label>
                                <input 
                                    type="text" 
                                    value={contractCreatedBy} 
                                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                                    readOnly 
                                />
                            </div>
                        </div>

                        {/* Organization MOU Type radio */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mt-4">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Organization Type</span>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="mou_type"
                                        checked={organizationType === 'With MOU'} 
                                        onChange={() => setOrganizationType('With MOU')}
                                        className="text-blue-600 focus:ring-blue-500" 
                                    />
                                    <span className="text-sm font-bold text-slate-700">With MOU</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="mou_type"
                                        checked={organizationType === 'Without MOU'} 
                                        onChange={() => setOrganizationType('Without MOU')}
                                        className="text-blue-600 focus:ring-blue-500" 
                                    />
                                    <span className="text-sm font-bold text-slate-700">Without MOU</span>
                                </label>
                        </div>
                    </div>
                </div>

                    {/* Address Details Panel */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4 mt-6">
                        <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            Address Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address details</label>
                                <input 
                                    type="text" 
                                    value={addressDetails} 
                                    onChange={(e) => setAddressDetails(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter street, road or district"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Building No</label>
                                <input 
                                    type="text" 
                                    value={buildingNo} 
                                    onChange={(e) => setBuildingNo(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="4830"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Country <span className="text-red-500">*</span></label>
                                <select 
                                    value={country} 
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Saudi Arabia">Saudi Arabia</option>
                                    <option value="United Arab Emirates">United Arab Emirates</option>
                                    <option value="Oman">Oman</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">State <span className="text-red-500">*</span></label>
                                <select 
                                    value={state} 
                                    onChange={(e) => setState(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ar-Riyad">ar-Riyad</option>
                                    <option value="Makkah">Makkah</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City <span className="text-red-500">*</span></label>
                                <select 
                                    value={city} 
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="RIYADH">RIYADH</option>
                                    <option value="JEDDAH">JEDDAH</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Postal Code</label>
                                <input 
                                    type="text" 
                                    value={postalCode} 
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="14267"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dist <span className="text-red-500">*</span></label>
                                <select 
                                    value={dist} 
                                    onChange={(e) => setDist(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ar-Riyad">ar-Riyad</option>
                                    <option value="as-Suwaidi">as-Suwaidi</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Insurance Mapping Panel */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4 mt-6">
                        <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-blue-500" />
                            Insurance Mapping
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance <span className="text-red-500">*</span></label>
                                <select 
                                    value={selectedInsurance} 
                                    onChange={(e) => setSelectedInsurance(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                >
                                    <option value="">-- Select Insurance --</option>
                                    <option value="AL KADI MEDICAL">AL KADI MEDICAL</option>
                                    <option value="BUPA INSURANCE">BUPA INSURANCE</option>
                                    <option value="MEDGULF INSURANCE">MEDGULF INSURANCE</option>
                                </select>
                            </div>
                            <div>
                                <button 
                                    type="button"
                                    onClick={handleAddInsurance}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Map Insurance
                                </button>
                            </div>
                        </div>

                        {/* Mapped list table */}
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl max-w-xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-6 py-3">Mapped Insurance</th>
                                        <th className="px-6 py-3 text-right">Remove</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {mappedInsurances.map((ins) => (
                                        <tr key={ins} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-slate-700">{ins}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveInsurance(ins)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                    </>
                    )}

                    {activeTab === 'sponsor' && (
                        <>
                        {/* Contacts Table Panel */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
                        <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" />
                            Contacts
                        </h3>
                        
                        {/* Dynamic contact inputs to add */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={newContactFirstName}
                                    onChange={(e) => setNewContactFirstName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="First Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Middle Name</label>
                                <input 
                                    type="text" 
                                    value={newContactMiddleName}
                                    onChange={(e) => setNewContactMiddleName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Middle Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                                <input 
                                    type="text" 
                                    value={newContactLastName}
                                    onChange={(e) => setNewContactLastName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Last Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Designation</label>
                                <select 
                                    value={newContactDesignation}
                                    onChange={(e) => setNewContactDesignation(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Executive">Executive</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Director">Director</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Type</label>
                                <select 
                                    value={newContactType}
                                    onChange={(e) => setNewContactType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Mobile">Mobile</option>
                                    <option value="Email">Email</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Value</label>
                                <input 
                                    type="text" 
                                    value={newContactValue}
                                    onChange={(e) => setNewContactValue(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Value"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile</label>
                                <input 
                                    type="text" 
                                    value={newContactMobile}
                                    onChange={(e) => setNewContactMobile(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Mobile No"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ID Type</label>
                                <select 
                                    value={newContactIdType}
                                    onChange={(e) => setNewContactIdType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Primary ID">Primary ID</option>
                                    <option value="National ID">National ID</option>
                                    <option value="Passport">Passport</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ID No</label>
                                <input 
                                    type="text" 
                                    value={newContactIdNo}
                                    onChange={(e) => setNewContactIdNo(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="ID No"
                                />
                            </div>
                            <div className="flex gap-4 items-center">
                                <label className="flex items-center gap-2 cursor-pointer py-2">
                                    <input 
                                        type="checkbox" 
                                        checked={newContactPrimaryId}
                                        onChange={(e) => setNewContactPrimaryId(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 h-4 w-4"
                                    />
                                    <span className="text-xs font-bold text-slate-600">Primary ID</span>
                                </label>
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button 
                                    type="button"
                                    onClick={handleAddContact}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs"
                                >
                                    <Plus className="w-4 h-4" /> Add Contact Row
                                </button>
                            </div>
                        </div>

                        {/* Contacts Table list */}
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-6 py-3">Full Name</th>
                                        <th className="px-6 py-3">Designation</th>
                                        <th className="px-6 py-3">Contact Info</th>
                                        <th className="px-6 py-3">ID Details</th>
                                        <th className="px-6 py-3">Primary</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {contacts.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-slate-800">{`${c.firstName} ${c.middleName || ''} ${c.lastName || ''}`.trim()}</td>
                                            <td className="px-6 py-4 text-slate-600">{c.designation}</td>
                                            <td className="px-6 py-4">
                                                <div><span className="text-[10px] font-semibold text-slate-400 uppercase">{c.contactType}:</span> {c.value}</div>
                                                <div><span className="text-[10px] font-semibold text-slate-400 uppercase">Mob:</span> {c.mobile}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div><span className="text-[10px] font-semibold text-slate-400 uppercase">{c.idType}:</span> {c.idNo}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.primaryId ? (
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-bold border border-green-100 uppercase text-[9px] tracking-wide">Yes</span>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveContact(c.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                    </>
                    )}

                    {activeTab === 'tariff' && (
                        /* Class Wise Tariff Panel */
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
                        <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Percent className="w-5 h-5 text-blue-500" />
                            Is Class Wise Tariff Required
                        </h3>
                        <div className="max-w-md">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch <span className="text-red-500">*</span></label>
                            <select 
                                value={selectedBranch} 
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">-- Select Branch --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}

                    {/* Submit Bar */}
                    <div className="flex gap-4 justify-end p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <button 
                            type="button" 
                            onClick={resetForm}
                            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            Save Organization
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
