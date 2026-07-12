
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  User, Info, Save, FileText, Bell, Activity, Briefcase, 
  Pill, Clock, XCircle, CheckCircle, Trash2, Search, AlertTriangle, ArrowLeft, Calendar, Edit, X, Plus, Printer
} from 'lucide-react';
import { ServiceDefinition, ServiceOrder, PatientDocument } from '../types';
import { DentalChart } from '../components/DentalChart';
import { PharmacyOrderingModal } from '../components/doctor/PharmacyOrderingModal';
import { PrescriptionPrintout } from '../components/doctor/PrescriptionPrintout';
import { Prescription } from '../types';

// --- Static Configs ---
const SIDEBAR_ITEMS = [
    { id: 'Visit History', label: 'Visit History' },
    { id: 'Chief Complaint', label: 'Chief Complaint' },
    { id: 'History of Present Illness', label: 'History of Present Illness' },
    { id: 'Past History', label: 'Past History' },
    { id: 'Family History', label: 'Family History' },
    { id: 'Medication History', label: 'Medication History' },
    { id: 'Allergies', label: 'Allergies & Intolerances' },
    { id: 'Review of Systems', label: 'Review of Systems' },
    { id: 'Physical Examination', label: 'Physical Examination' },
    { id: 'Significant Sign', label: 'Significant Signs' },
    { id: 'Diagnosis', label: 'Provisional Diagnosis' },
    { id: 'Treatment Plan', label: 'Treatment Plan' },
    { id: 'Treatment Desc', label: 'Prescription Notes' },
    { id: 'Remark', label: 'Doctor Remarks' },
];

const TOP_TOOLS = [
    { id: 'Vitals', label: 'Vitals (F7)', icon: Activity, color: 'text-blue-600' },
    { id: 'Allergy', label: 'Allergy (F8)', icon: Bell, color: 'text-red-600' },
    { id: 'Diagnosis', label: 'Diagnosis (F5)', icon: Info, color: 'text-amber-600' },
    { id: 'Orders', label: 'CPOE Orders (F3)', icon: Pill, color: 'text-emerald-600' },
    { id: 'Documents', label: 'Documents', icon: FileText, color: 'text-slate-600' },
    { id: 'Referral', label: 'Referral', icon: Briefcase, color: 'text-purple-600' },
];

const ALLERGY_REACTIONS = [
    'Cough', 'Dermatographism', 'Diarrhea', 'Dizziness', 'Headache', 
    'Nausea', 'Running Nose', 'Skin Rash', 'Sneezing', 'Swelling', 'Vomiting'
];

const ALLERGY_TYPES = ['Drug', 'Environmental', 'Food', 'NonFormulaDrug'];

// Mock ICD Data fallback if DB is empty
const FALLBACK_ICD_CODES = [
    { code: 'A00', description: 'Cholera' },
    { code: 'A01', description: 'Typhoid and paratyphoid fevers' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
    { code: 'I10', description: 'Essential (primary) hypertension' },
];

// --- CPOE Components (New) ---

const ServiceOrderingModal = ({ 
    appointmentId, 
    doctorId, 
    onClose 
}: { 
    appointmentId: string, 
    doctorId: string, 
    onClose: () => void 
}) => {
    const { serviceDefinitions, serviceTariffs, departments, saveServiceOrders, showToast } = useData();
    
    // Filters
    const [filterServiceType, setFilterServiceType] = useState('All');
    const [filterDept, setFilterDept] = useState('All');
    const [searchName, setSearchName] = useState('');
    const [showOnlyCash, setShowOnlyCash] = useState(false);

    // Selection
    const [selectedServices, setSelectedServices] = useState<ServiceOrder[]>([]);

    // Dental Chart Modal State
    const [showToothModal, setShowToothModal] = useState(false);
    const [pendingDentalService, setPendingDentalService] = useState<ServiceDefinition | null>(null);

    const filteredServices = serviceDefinitions.filter(s => {
        const typeMatch = filterServiceType === 'All' || s.serviceType === filterServiceType;
        const nameMatch = s.name.toLowerCase().includes(searchName.toLowerCase()) || s.code.toLowerCase().includes(searchName.toLowerCase());
        // Simple dept matching logic (assuming groupName might map to dept for demo, or all if All)
        const deptMatch = true; 
        return typeMatch && nameMatch && deptMatch && s.status === 'Active';
    });

    const getPrice = (serviceId: string) => {
        const t = serviceTariffs.find(t => t.serviceId === serviceId && t.status === 'Active');
        return t ? t.price : 0;
    };

    const toggleService = (s: ServiceDefinition) => {
        const exists = selectedServices.find(order => order.serviceId === s.id);
        
        if (exists) {
            setSelectedServices(prev => prev.filter(o => o.serviceId !== s.id));
        } else {
            // Check for Tooth Mandatory
            if (s.isToothMandatory) {
                setPendingDentalService(s);
                setShowToothModal(true);
                return;
            }
            addService(s, ''); // Normal add
        }
    };

    const addService = (s: ServiceDefinition, toothNumbers: string, dentalSelections?: { tooth: string, icd: string }[]) => {
        const price = getPrice(s.id);
        const newOrder: ServiceOrder = {
            id: crypto.randomUUID(),
            appointmentId,
            serviceId: s.id,
            serviceName: s.name,
            cptCode: s.cptCode,
            quantity: 1,
            unitPrice: price,
            discountAmount: 0,
            totalPrice: price, // initial
            orderDate: new Date().toISOString(),
            status: 'Ordered',
            billingStatus: 'Pending',
            priority: 'Routine',
            orderingDoctorId: doctorId,
            instructions: '',
            serviceCenter: 'General',
            toothNumbers: toothNumbers,
            dentalSelections: dentalSelections
        };
        setSelectedServices(prev => [...prev, newOrder]);
    };

    const handleToothSelection = (selections: { tooth: string, icd: string }[]) => {
        if (pendingDentalService) {
            const toothNums = selections.map(s => s.tooth).join(', ');
            addService(pendingDentalService, toothNums, selections);
            setPendingDentalService(null);
            setShowToothModal(false);
        }
    };

    const updateOrder = (id: string, field: keyof ServiceOrder, val: any) => {
        setSelectedServices(prev => prev.map(o => {
            if (o.id !== id) return o;
            
            const updated = { ...o, [field]: val };
            
            // Recalc total if qty/price/discount changes
            if (field === 'quantity' || field === 'unitPrice' || field === 'discountAmount') {
                const q = field === 'quantity' ? Number(val) : o.quantity;
                const p = field === 'unitPrice' ? Number(val) : o.unitPrice;
                const d = field === 'discountAmount' ? Number(val) : o.discountAmount;
                updated.totalPrice = (q * p) - d;
            }
            return updated;
        }));
    };

    const handleSave = () => {
        if (selectedServices.length === 0) {
            showToast('info', 'No services selected.');
            return;
        }
        saveServiceOrders(selectedServices);
        onClose();
    };

    const totalServiceAmount = selectedServices.reduce((sum, o) => sum + o.totalPrice, 0);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {showToothModal && (
                <DentalChart 
                    onSave={handleToothSelection} 
                    onClose={() => { setShowToothModal(false); setPendingDentalService(null); }} 
                />
            )}

            <div className="bg-white w-full max-w-[95vw] h-[90vh] rounded-lg shadow-2xl flex flex-col border border-slate-300 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-800 text-sm">Ordering Services</h3>
                    <div className="flex gap-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Previous</button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors">MI</button>
                        <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"><X className="w-4 h-4"/></button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-3 bg-blue-50/50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-end shrink-0">
                    <div>
                        <label className="block font-bold text-slate-600 mb-1">Service Type</label>
                        <select className="w-full border border-slate-300 rounded p-1" value={filterServiceType} onChange={e => setFilterServiceType(e.target.value)}>
                            <option value="All">-- Select --</option>
                            <option value="Single service">Single Service</option>
                            <option value="Package">Package</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-600 mb-1">Department</label>
                        <select className="w-full border border-slate-300 rounded p-1" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="All">-- Select --</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-600 mb-1">Service Center</label>
                        <select className="w-full border border-slate-300 rounded p-1">
                            <option value="All">All</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-slate-600 mb-1">Service Name</label>
                        <input className="w-full border border-slate-300 rounded p-1" value={searchName} onChange={e => setSearchName(e.target.value)} />
                    </div>
                    <div className="md:col-span-4 flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" /> <span className="font-bold text-slate-600">Favourites</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" checked={showOnlyCash} onChange={e => setShowOnlyCash(e.target.checked)} /> <span className="font-bold text-slate-600">Only Cash Service</span>
                        </label>
                        <div className="ml-auto flex gap-2">
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs">Sponsor Price</button>
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs">Base Price</button>
                        </div>
                    </div>
                </div>

                {/* Service Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-white border-b border-slate-200 min-h-[200px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
                        {filteredServices.map(s => (
                            <label key={s.id} className={`flex items-center gap-2 p-1 hover:bg-blue-50 cursor-pointer rounded border border-transparent hover:border-blue-100 ${selectedServices.some(o => o.serviceId === s.id) ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedServices.some(o => o.serviceId === s.id)}
                                    onChange={() => toggleService(s)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate" title={s.name}>{s.code} - {s.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Added Orders Table (Bottom) */}
                <div className="h-64 flex flex-col bg-slate-50 shrink-0">
                    <div className="bg-white border-b border-slate-200 px-4 py-1 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-xs">Added Service Order</h4>
                        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Add Service</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-2 border-r border-slate-300">Service Name</th>
                                    <th className="p-2 border-r border-slate-300 w-16">CPT</th>
                                    <th className="p-2 border-r border-slate-300 w-16">Portable</th>
                                    <th className="p-2 border-r border-slate-300 w-12 text-center">Qty</th>
                                    <th className="p-2 border-r border-slate-300 w-24">Approval Req</th>
                                    <th className="p-2 border-r border-slate-300 w-20 text-right">Unit Price</th>
                                    <th className="p-2 border-r border-slate-300 w-20 text-right">Max Disc</th>
                                    <th className="p-2 border-r border-slate-300 w-20 text-right">Discount</th>
                                    <th className="p-2 border-r border-slate-300 w-20 text-right">Disc %</th>
                                    <th className="p-2 border-r border-slate-300 w-24 text-right">Total Price</th>
                                    <th className="p-2 border-r border-slate-300 w-10 text-center">FC</th>
                                    <th className="p-2 border-r border-slate-300 w-16">Pkg Cover</th>
                                    <th className="p-2 border-r border-slate-300 w-24">Service Center</th>
                                    <th className="p-2 border-r border-slate-300 w-16">Policy</th>
                                    <th className="p-2 border-r border-slate-300">ICD-Tooth</th>
                                    <th className="p-2 border-r border-slate-300">Order Remarks</th>
                                    <th className="p-2 w-16 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {selectedServices.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="p-1 border-r border-slate-200 truncate max-w-[200px]">{order.serviceName}</td>
                                        <td className="p-1 border-r border-slate-200">{order.cptCode}</td>
                                        <td className="p-1 border-r border-slate-200 text-center"><input type="checkbox" /></td>
                                        <td className="p-1 border-r border-slate-200">
                                            <input 
                                                type="number" className="w-full bg-yellow-50 border border-yellow-200 text-center rounded px-1"
                                                value={order.quantity} onChange={e => updateOrder(order.id, 'quantity', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-1 border-r border-slate-200 text-center"><input type="checkbox" /></td>
                                        <td className="p-1 border-r border-slate-200 text-right">{order.unitPrice.toFixed(2)}</td>
                                        <td className="p-1 border-r border-slate-200 text-right">0.00</td>
                                        <td className="p-1 border-r border-slate-200">
                                            <input 
                                                type="number" className="w-full bg-white border border-slate-200 text-right rounded px-1"
                                                value={order.discountAmount} onChange={e => updateOrder(order.id, 'discountAmount', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-1 border-r border-slate-200 text-right">0.00</td>
                                        <td className="p-1 border-r border-slate-200 text-right font-bold">{order.totalPrice.toFixed(2)}</td>
                                        <td className="p-1 border-r border-slate-200 text-center"><input type="checkbox" /></td>
                                        <td className="p-1 border-r border-slate-200 text-center">No</td>
                                        <td className="p-1 border-r border-slate-200">{order.serviceCenter || 'General'}</td>
                                        <td className="p-1 border-r border-slate-200"></td>
                                        <td className="p-1 border-r border-slate-200 text-center font-mono text-[10px] leading-tight">
                                            {order.dentalSelections && order.dentalSelections.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {order.dentalSelections.map((ds, idx) => (
                                                        <div key={idx} className="bg-blue-50 px-1 rounded border border-blue-100 flex justify-between gap-1">
                                                            <span className="font-bold text-blue-800">T{ds.tooth}:</span>
                                                            <span className="text-red-600 font-bold">{ds.icd || '?'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-1 border-r border-slate-200">
                                            <input 
                                                className="w-full bg-white border border-slate-200 rounded px-1"
                                                value={order.instructions || ''} onChange={e => updateOrder(order.id, 'instructions', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-1 text-center">
                                            <button onClick={() => setSelectedServices(prev => prev.filter(o => o.id !== order.id))} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-3 h-3 mx-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-100 p-2 border-t border-slate-300 text-xs font-bold text-blue-800 flex gap-4">
                        <span>Total Service Amount : {totalServiceAmount.toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-red-600">Doctor Sugg. Amount</span>
                            <input className="border border-slate-300 w-24 px-1" value="0.0" readOnly />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
const CPOEView = ({ 
    appointmentId, 
    patientId,
    doctorId, 
    onClose 
}: { 
    appointmentId: string, 
    patientId: string,
    doctorId: string,
    onClose: () => void 
}) => {
    const { serviceOrders, prescriptions, employees, cancelServiceOrder, patients, vitals, diagnoses, allergies } = useData();
    const [activeTab, setActiveTab] = useState<'Services' | 'Pharmacy'>('Services');
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [showNewPharmacyOrder, setShowNewPharmacyOrder] = useState(false);
    const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null);
    
    // Filters
    const [orderDateFrom, setOrderDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [orderDateTo, setOrderDateTo] = useState(new Date().toISOString().split('T')[0]);

    const appointmentOrders = serviceOrders.filter(o => o.appointmentId === appointmentId);

    const getDocName = (id: string) => {
        const d = employees.find(e => e.id === id);
        return d ? `Dr. ${d.firstName} ${d.lastName}` : '';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {showNewOrder && <ServiceOrderingModal appointmentId={appointmentId} doctorId={doctorId} onClose={() => setShowNewOrder(false)} />}
            
            <div className="bg-white w-full max-w-[95vw] h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header Tabs */}
                <div className="flex border-b border-slate-300 bg-slate-100 px-2 pt-2 gap-1 shrink-0">
                    <button 
                        onClick={() => setActiveTab('Services')}
                        className={`px-4 py-1.5 rounded-t-lg text-sm font-bold border-t border-l border-r border-slate-300 transition-colors ${activeTab === 'Services' ? 'bg-white text-slate-800' : 'bg-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                        Services
                    </button>
                    <button 
                        onClick={() => setActiveTab('Pharmacy')}
                        className={`px-4 py-1.5 rounded-t-lg text-sm font-bold flex items-center gap-2 border-t border-l border-r transition-colors ${activeTab === 'Pharmacy' ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-slate-200 text-slate-500 hover:bg-slate-100 border-slate-300'}`}
                    >
                        <Pill className="w-3 h-3"/> Pharmacy
                    </button>
                    <div className="bg-teal-600 px-4 py-1.5 rounded-t-lg text-sm font-bold text-white flex items-center gap-2 opacity-50 cursor-not-allowed"><Briefcase className="w-3 h-3"/> Package</div>
                    <div className="bg-blue-500 px-4 py-1.5 rounded-t-lg text-sm font-bold text-white flex items-center gap-2 opacity-50 cursor-not-allowed"><FileText className="w-3 h-3"/> Patient Contract</div>
                    <button onClick={onClose} className="ml-auto text-slate-500 hover:text-red-500 p-1"><XCircle className="w-5 h-5"/></button>
                </div>

                {activeTab === 'Services' ? (
                    <>
                        {/* Filter Bar for Services */}
                        <div className="bg-blue-50/50 p-3 border-b border-slate-200 text-xs shrink-0">
                            <div className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1 flex justify-between items-center">
                                <span>Existing Service Order</span>
                                <button 
                                    onClick={() => setShowNewOrder(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-sm transition-colors"
                                >
                                    New Orders
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-28 font-bold text-slate-600">Ordered Date From</span>
                                        <input type="date" className="border border-slate-300 rounded px-1" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} />
                                        <span className="font-bold text-slate-600">To</span>
                                        <input type="date" className="border border-slate-300 rounded px-1" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-28 font-bold text-slate-600">Ordered From</span>
                                        <input className="border border-slate-300 rounded px-1 flex-1" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="w-28 font-bold text-slate-600">Visit</span>
                                        <label className="flex items-center gap-1"><input type="radio" name="visit" defaultChecked /> Current</label>
                                        <label className="flex items-center gap-1"><input type="radio" name="visit" /> All</label>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-24 font-bold text-slate-600">Status</span>
                                        <select className="border border-slate-300 rounded px-1 flex-1">
                                            <option>-- Select --</option>
                                            <option>Ordered</option>
                                            <option>Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 font-bold text-slate-600">Ordered By</span>
                                        <select className="border border-slate-300 rounded px-1 flex-1">
                                            <option>-- Select --</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="w-24 font-bold text-slate-600">ServiceOrder No</span>
                                        <input className="border border-slate-300 rounded px-1 flex-1" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-24 font-bold text-slate-600">Service Name</span>
                                        <input className="border border-slate-300 rounded px-1 flex-1" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 font-bold text-slate-600">Order Type</span>
                                        <select className="border border-slate-300 rounded px-1 flex-1">
                                            <option>-- Select --</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold shadow-sm">Search</button>
                                </div>
                            </div>
                        </div>

                        {/* Data Grid for Services */}
                        <div className="flex-1 overflow-auto bg-white border-b border-slate-200">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-200 text-slate-700 font-bold sticky top-0 z-10 whitespace-nowrap">
                                    <tr>
                                        <th className="p-2 border-r border-slate-300">Service Name</th>
                                        <th className="p-2 border-r border-slate-300">CPT Code</th>
                                        <th className="p-2 border-r border-slate-300">Order No</th>
                                        <th className="p-2 border-r border-slate-300">Portable</th>
                                        <th className="p-2 border-r border-slate-300">Qty</th>
                                        <th className="p-2 border-r border-slate-300 text-right">Unit Price</th>
                                        <th className="p-2 border-r border-slate-300 text-right">ContractAmt</th>
                                        <th className="p-2 border-r border-slate-300 text-right">Discount Amount</th>
                                        <th className="p-2 border-r border-slate-300 text-right">Total Price</th>
                                        <th className="p-2 border-r border-slate-300">Ordered Date</th>
                                        <th className="p-2 border-r border-slate-300">Status</th>
                                        <th className="p-2 border-r border-slate-300">Result Status</th>
                                        <th className="p-2 border-r border-slate-300">Package Cover</th>
                                        <th className="p-2 border-r border-slate-300">Billing Status</th>
                                        <th className="p-2 border-r border-slate-300">Priority</th>
                                        <th className="p-2 border-r border-slate-300">Service Center</th>
                                        <th className="p-2 border-r border-slate-300">Consulting Doctor</th>
                                        <th className="p-2 border-r border-slate-300">Ordered Doctor</th>
                                        <th className="p-2 border-r border-slate-300">Plan</th>
                                        <th className="p-2 border-r border-slate-300">Patient Form</th>
                                        <th className="p-2 border-r border-slate-300">Appr. Sts.</th>
                                        <th className="p-2 border-r border-slate-300">ICD-Tooth</th>
                                        <th className="p-2 border-r border-slate-300">Done/Not Done</th>
                                        <th className="p-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {appointmentOrders.length === 0 ? (
                                        <tr><td colSpan={24} className="p-12 text-center text-slate-400 italic">No services ordered for this visit.</td></tr>
                                    ) : (
                                        appointmentOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50 whitespace-nowrap">
                                                <td className="p-2 border-r border-slate-200 font-medium">{order.serviceName}</td>
                                                <td className="p-2 border-r border-slate-200">{order.cptCode}</td>
                                                <td className="p-2 border-r border-slate-200 text-blue-600 font-medium">ORD-{order.id.slice(-6)}</td>
                                                <td className="p-2 border-r border-slate-200">No</td>
                                                <td className="p-2 border-r border-slate-200 text-center">{order.quantity}</td>
                                                <td className="p-2 border-r border-slate-200 text-right font-bold">{order.unitPrice.toFixed(2)}</td>
                                                <td className="p-2 border-r border-slate-200 text-right">0.00</td>
                                                <td className="p-2 border-r border-slate-200 text-right">{order.discountAmount.toFixed(2)}</td>
                                                <td className="p-2 border-r border-slate-200 text-right font-bold">{order.totalPrice.toFixed(2)}</td>
                                                <td className="p-2 border-r border-slate-200">{new Date(order.orderDate).toLocaleString()}</td>
                                                <td className="p-2 border-r border-slate-200">
                                                    <span className={`px-1 py-0.5 rounded text-[10px] ${order.status === 'Ordered' ? 'text-red-500' : 'text-green-500'}`}>{order.status}</span>
                                                </td>
                                                <td className="p-2 border-r border-slate-200"></td>
                                                <td className="p-2 border-r border-slate-200">No</td>
                                                <td className="p-2 border-r border-slate-200 text-red-500">{order.billingStatus}</td>
                                                <td className="p-2 border-r border-slate-200 text-red-500">{order.priority}</td>
                                                <td className="p-2 border-r border-slate-200">{order.serviceCenter || 'General'}</td>
                                                <td className="p-2 border-r border-slate-200">{getDocName(doctorId)}</td>
                                                <td className="p-2 border-r border-slate-200">{getDocName(order.orderingDoctorId)}</td>
                                                <td className="p-2 border-r border-slate-200">C001/Cash</td>
                                                <td className="p-2 border-r border-slate-200"></td>
                                                <td className="p-2 border-r border-slate-200"></td>
                                                <td className="p-2 border-r border-slate-200 text-center font-mono text-[10px]">
                                                    {order.dentalSelections && order.dentalSelections.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {order.dentalSelections.map((ds, idx) => (
                                                                <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`Tooth ${ds.tooth}: ${ds.icd}`}>
                                                                    <b className="text-blue-700">T{ds.tooth}</b>:<b className="text-red-600">{ds.icd}</b>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">{order.toothNumbers || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 border-r border-slate-200">
                                                    <select className="border border-slate-300 rounded text-[10px]">
                                                        <option>Not Done</option>
                                                        <option>Done</option>
                                                    </select>
                                                    <button className="bg-blue-500 text-white px-1 ml-1 rounded text-[10px]">Update</button>
                                                </td>
                                                <td className="p-2 text-center flex items-center justify-center gap-1">
                                                    <button className="text-blue-600" title="Edit Order"><Edit className="w-3 h-3" /></button>
                                                    
                                                    {order.billingStatus === 'Pending' && order.status !== 'Cancelled' && (
                                                        <button 
                                                            className="text-orange-500 hover:text-orange-700" 
                                                            title="Cancel Order"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to cancel this service order?')) {
                                                                    cancelServiceOrder(order.id);
                                                                }
                                                            }}
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    <button className="text-red-500" title="Delete Order"><Trash2 className="w-3 h-3" /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {showNewPharmacyOrder && (
                            <PharmacyOrderingModal 
                                appointmentId={appointmentId} 
                                patientId={patientId} 
                                onClose={() => setShowNewPharmacyOrder(false)} 
                            />
                        )}
                        
                        {/* Prescription Toolbar */}
                        <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <h4 className="font-bold text-slate-700 text-sm">Existing Prescriptions</h4>
                            <button 
                                onClick={() => setShowNewPharmacyOrder(true)}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Medications Order
                            </button>
                        </div>

                        {/* Prescriptions List */}
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 whitespace-nowrap border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 border-r border-slate-200">Order Date</th>
                                        <th className="p-3 border-r border-slate-200">Order No</th>
                                        <th className="p-3 border-r border-slate-200">Type</th>
                                        <th className="p-3 border-r border-slate-200">Items Count</th>
                                        <th className="p-3 border-r border-slate-200">Doctor</th>
                                        <th className="p-3 border-r border-slate-200">Status</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {prescriptions.filter(p => p.appointmentId === appointmentId).length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No prescriptions found for this visit.</td></tr>
                                    ) : (
                                        prescriptions.filter(p => p.appointmentId === appointmentId).map(p => (
                                            <tr key={p.id} className="hover:bg-cyan-50/30 transition-colors">
                                                <td className="p-3 border-r border-slate-100">{new Date(p.orderDate).toLocaleString()}</td>
                                                <td className="p-3 border-r border-slate-100 font-bold text-cyan-700 uppercase">PR-{p.id.slice(-6)}</td>
                                                <td className="p-3 border-r border-slate-100">{p.orderType}</td>
                                                <td className="p-3 border-r border-slate-100 font-medium">{(p.items || []).length} Drug(s)</td>
                                                <td className="p-3 border-r border-slate-100">{getDocName(p.doctorId)}</td>
                                                <td className="p-3 border-r border-slate-100">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        p.status === 'Dispensed' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>{p.status}</span>
                                                </td>
                                                <td className="p-3 text-center flex items-center justify-center gap-2">
                                                    <button className="text-blue-500 hover:text-blue-700" title="View Details"><Search className="w-3.5 h-3.5" /></button>
                                                    <button 
                                                        onClick={() => setPrintingPrescription(p)}
                                                        className="text-emerald-600 hover:text-emerald-800" 
                                                        title="Print Prescription"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button className="text-slate-400 hover:text-red-500" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {printingPrescription && (
                            <PrescriptionPrintout 
                                prescription={printingPrescription}
                                patient={patients.find(pt => pt.id === printingPrescription.patientId)!}
                                doctor={employees.find(e => e.id === printingPrescription.doctorId)}
                                diagnoses={diagnoses.filter(d => d.appointmentId === appointmentId)}
                                allergies={allergies.filter(a => a.patientId === patientId)}
                                vitals={vitals.find(v => v.appointmentId === appointmentId)}
                                onClose={() => setPrintingPrescription(null)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// VitalsEntryModal
const VitalsEntryModal = ({ appointmentId, onClose }: { appointmentId: string, onClose: () => void }) => {
    const { saveVitalSign, showToast } = useData();
    const [form, setForm] = useState({
        bpSystolic: '', bpDiastolic: '', temperature: '', pulse: '', weight: '', height: '', spo2: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveVitalSign({
            id: Date.now().toString(),
            appointmentId,
            recordedAt: new Date().toISOString(),
            bpSystolic: Number(form.bpSystolic),
            bpDiastolic: Number(form.bpDiastolic),
            temperature: Number(form.temperature),
            pulse: Number(form.pulse),
            weight: Number(form.weight),
            height: Number(form.height),
            spo2: Number(form.spo2)
        });
        showToast('success', 'Vitals saved.');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" /> Capture Vitals
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                    {/* Simplified fields similar to DoctorWorkbench */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">BP Systolic</label>
                        <input type="number" className="form-input" value={form.bpSystolic} onChange={e => setForm({...form, bpSystolic: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">BP Diastolic</label>
                        <input type="number" className="form-input" value={form.bpDiastolic} onChange={e => setForm({...form, bpDiastolic: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Temperature</label>
                        <input type="number" step="0.1" className="form-input" value={form.temperature} onChange={e => setForm({...form, temperature: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Pulse</label>
                        <input type="number" className="form-input" value={form.pulse} onChange={e => setForm({...form, pulse: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Height (cm)</label>
                        <input type="number" className="form-input" value={form.height} onChange={e => setForm({...form, height: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Weight (kg)</label>
                        <input type="number" className="form-input" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">SpO2 (%)</label>
                        <input type="number" className="form-input" value={form.spo2} onChange={e => setForm({...form, spo2: e.target.value})} />
                    </div>
                    <div className="col-span-2 pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2 text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-bold hover:bg-blue-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// AllergyEntryModal
const AllergyEntryModal = ({ patientId, onClose }: { patientId: string, onClose: () => void }) => {
    const { saveAllergy } = useData();
    const [form, setForm] = useState({
        allergen: '', severity: 'Mild', reaction: '', status: 'Active', allergyType: 'Drug'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveAllergy({
            id: Date.now().toString(),
            patientId,
            ...form as any
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-red-600" /> Add Allergy
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label">Allergen</label>
                        <input className="form-input" required value={form.allergen} onChange={e => setForm({...form, allergen: e.target.value})} />
                    </div>
                    <div>
                        <label className="form-label">Type</label>
                        <select className="form-input" value={form.allergyType} onChange={e => setForm({...form, allergyType: e.target.value})}>
                            {ALLERGY_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Severity</label>
                        <select className="form-input" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                            <option>Mild</option>
                            <option>Moderate</option>
                            <option>Severe</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Reaction</label>
                        <select className="form-input" value={form.reaction} onChange={e => setForm({...form, reaction: e.target.value})}>
                            <option value="">-- Select --</option>
                            {ALLERGY_REACTIONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2 text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="flex-1 bg-red-600 text-white rounded-lg py-2 font-bold hover:bg-red-700">Save Alert</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// DiagnosisEntryModal
const DiagnosisEntryModal = ({ appointmentId, onClose }: { appointmentId: string, onClose: () => void }) => {
    const { saveDiagnosis, masterDiagnoses } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<{code: string, description: string} | null>(null);
    const [type, setType] = useState('Provisional');

    // Use fallback if masterDiagnoses is empty
    const sourceData = masterDiagnoses.length > 0 ? masterDiagnoses : FALLBACK_ICD_CODES;

    const filtered = sourceData.filter(d => 
        d.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    const handleSave = () => {
        if(!selectedDiagnosis) return;
        saveDiagnosis({
            id: Date.now().toString(),
            appointmentId,
            code: selectedDiagnosis.code,
            description: selectedDiagnosis.description,
            type: type as any,
            addedAt: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 animate-in zoom-in-95 h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-4 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-5 h-5 text-amber-600" /> Add Diagnosis
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    <div>
                        <label className="form-label">Search ICD-10</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                className="form-input pl-9" 
                                autoFocus
                                placeholder="Type code or description..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                        {filtered.map(d => (
                            <div 
                                key={d.code} 
                                onClick={() => setSelectedDiagnosis(d)}
                                className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-blue-50 text-sm ${selectedDiagnosis?.code === d.code ? 'bg-blue-100' : ''}`}
                            >
                                <div className="font-bold text-slate-700">{d.code}</div>
                                <div className="text-slate-600">{d.description}</div>
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">No matches found.</div>}
                    </div>

                    <div>
                        <label className="form-label">Type</label>
                        <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                            <option>Provisional</option>
                            <option>Final</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2 text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} disabled={!selectedDiagnosis} className="flex-1 bg-amber-600 text-white rounded-lg py-2 font-bold hover:bg-amber-700 disabled:opacity-50">Add Diagnosis</button>
                </div>
            </div>
        </div>
    );
};

// DocumentsModal
const DocumentsModal = ({ 
    patientId, 
    appointmentId,
    onClose 
}: { 
    patientId: string, 
    appointmentId?: string,
    onClose: () => void 
}) => {
    const { patientDocuments, savePatientDocument, deletePatientDocument, user, showToast } = useData();
    const [uploading, setUploading] = useState(false);
    
    const myDocs = patientDocuments.filter(d => d.patientId === patientId);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();

                const fileData = await new Promise<string>((resolve) => {
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.readAsDataURL(file);
                });

                const newDoc: PatientDocument = {
                    id: Date.now().toString() + '-' + i,
                    patientId,
                    appointmentId,
                    name: file.name,
                    fileType: file.type,
                    fileData,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: user?.id || 'unknown',
                    size: file.size
                };

                await savePatientDocument(newDoc);
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to upload one or more files.');
        } finally {
            setUploading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="flex justify-between items-center p-4 border-b shrink-0 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-600" /> Patient Documents
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-all group shrink-0">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <Save className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="font-bold text-slate-700 mb-1">Click to upload or drag and drop</h4>
                        <p className="text-xs text-slate-500 mb-4">PDF, JPG, PNG (Max. 10MB per file)</p>
                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm cursor-pointer transition-colors shadow-md shadow-blue-200">
                            Select Files
                            <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
                        </label>
                        {uploading && <div className="mt-4 text-sm text-blue-600 font-medium animate-pulse">Uploading...</div>}
                    </div>

                    {/* Document List */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 px-1">Recent Documents</h4>
                        <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg bg-white">
                            {myDocs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <FileText className="w-12 h-12 mb-2" />
                                    <p className="text-sm">No documents found for this patient.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b">
                                        <tr>
                                            <th className="p-3">File Name</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Size</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {myDocs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()).map(doc => (
                                            <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-3 font-medium text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-blue-400" />
                                                        <span className="truncate max-w-[200px]">{doc.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-slate-500 text-xs">
                                                    {doc.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                                                </td>
                                                <td className="p-3 text-slate-500 text-xs">{formatSize(doc.size)}</td>
                                                <td className="p-3 text-slate-500 text-xs">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <div className="flex justify-center gap-2">
                                                        <a 
                                                            href={doc.fileData} 
                                                            download={doc.name}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                            title="Download"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </a>
                                                        <button 
                                                            onClick={() => deletePatientDocument(doc.id)}
                                                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold text-sm transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

const getNoteLabel = (noteType: string) => {
  const mapping: Record<string, string> = {
    'Visit History': 'Visit History',
    'Chief Complaint': 'Chief Complaint',
    'History of Present Illness': 'History of Present Illness',
    'Past History': 'Past History',
    'Family History': 'Family History',
    'Medication History': 'Medication History',
    'Allergies': 'Allergies & Intolerances',
    'Review of Systems': 'Review of Systems',
    'Physical Examination': 'Physical Examination',
    'Significant Sign': 'Significant Signs',
    'Diagnosis': 'Provisional Diagnosis',
    'Treatment Plan': 'Treatment Plan',
    'Treatment Desc': 'Prescription Notes',
    'Remark': 'Doctor Remarks'
  };
  return mapping[noteType] || noteType;
};

export const Consultation = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { 
    appointments, patients, vitals, updateAppointment, employees, 
    departments, allergies, diagnoses, clinicalNotes, saveClinicalNote 
  } = useData();
  
  const [activeSection, setActiveSection] = useState('Chief Complaint');
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  // Allow context time to load demographics before hard-failing
  const [dataReady, setDataReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDataReady(true), 4000);
    return () => clearTimeout(t);
  }, []);
  
  // Modal states
  const [showVitals, setShowVitals] = useState(false);
  const [showAllergy, setShowAllergy] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showCPOE, setShowCPOE] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  
  const appointment = appointments.find(a => a.id === appointmentId);
  const patient = patients.find(p => p.id === appointment?.patientId);
  
  // Derived data
  const employee = employees.find(e => e.id === appointment?.doctorId);
  const department = departments.find(d => d.id === appointment?.departmentId);
  const activeAllergiesCount = allergies.filter(a => a.patientId === patient?.id && a.status === 'Active').length;

  // If not found, handle gracefully (redirect or show error)
  if (!appointment || !patient) {
      if (!dataReady) {
          return (
              <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-slate-500">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium">Loading patient data...</p>
              </div>
          );
      }
      return (
          <div className="p-10 text-center">
              <p className="text-slate-500 font-medium">Appointment or patient not found.</p>
              <button
                  onClick={() => navigate('/doctor-workbench')}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                  Back to Workbench
              </button>
          </div>
      );
  }

  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

  // Keyboard shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'F7') { e.preventDefault(); setShowVitals(true); }
          if (e.key === 'F8') { e.preventDefault(); setShowAllergy(true); }
          if (e.key === 'F5') { e.preventDefault(); setShowDiagnosis(true); }
          if (e.key === 'F3') { e.preventDefault(); setShowCPOE(true); }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load notes once from DB when component mounts or appointment changes
  useEffect(() => {
    if (appointmentId && clinicalNotes.length > 0 && !isNotesLoaded) {
      const notesForApt = clinicalNotes.filter(n => n.appointmentId === appointmentId);
      const notesMap: Record<string, string> = {};
      notesForApt.forEach(n => {
        notesMap[n.noteType] = n.description;
      });
      setEditedNotes(notesMap);
      setIsNotesLoaded(true);
    }
  }, [appointmentId, clinicalNotes, isNotesLoaded]);

  // Reset loaded status and state when appointment changes
  useEffect(() => {
    setIsNotesLoaded(false);
    setEditedNotes({});
  }, [appointmentId]);

  const handleClearNotes = () => {
    setEditedNotes(prev => ({
      ...prev,
      [activeSection]: ''
    }));
  };

  const handleSaveNote = async () => {
    const text = editedNotes[activeSection] || '';
    const existing = clinicalNotes.find(
      n => n.appointmentId === appointmentId && n.noteType === activeSection
    );
    const newNote = {
      id: existing?.id || crypto.randomUUID(),
      appointmentId: appointmentId || '',
      noteType: activeSection,
      description: text,
      recordedAt: existing?.recordedAt || new Date().toISOString()
    };
    await saveClinicalNote(newNote);
  };

  const handleComplete = () => {
      updateAppointment(appointment.id, { status: 'Completed', checkOutTime: new Date().toISOString() });
      navigate('/doctor-workbench');
  };

  const getPatientHistory = () => {
    return appointments
        .filter(a => a.patientId === patient.id && a.id !== appointment.id && a.status !== 'Cancelled')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getPastNotesForSection = () => {
    const history = getPatientHistory();
    const historyIds = history.map(h => h.id);
    return clinicalNotes
        .filter(n => historyIds.includes(n.appointmentId) && n.noteType === activeSection && n.description.trim() !== '')
        .map(n => {
            const apt = history.find(h => h.id === n.appointmentId);
            return {
                date: apt ? new Date(apt.date).toLocaleDateString() : 'Unknown Date',
                time: apt?.time || '',
                doctorId: apt?.doctorId || '',
                description: n.description
            };
        });
  };

  const renderVisitHistory = () => {
    const history = getPatientHistory();
    if (history.length === 0) return <div className="p-8 text-center text-slate-400 italic">No past visit history found for this patient.</div>;

    return (
        <div className="space-y-4">
            {history.map(apt => {
                const doc = employees.find(e => e.id === apt.doctorId);
                const dept = departments.find(d => d.id === apt.departmentId);
                const aptDiagnoses = diagnoses.filter(d => d.appointmentId === apt.id);
                const aptVitals = vitals.find(v => v.appointmentId === apt.id);
                const aptNotes = clinicalNotes.filter(n => n.appointmentId === apt.id && n.description.trim() !== '');

                return (
                    <div key={apt.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors bg-slate-50/50">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {new Date(apt.date).toLocaleDateString()} 
                                    <span className="text-slate-400 font-normal text-xs">at {apt.time}</span>
                                </div>
                                <div className="text-xs text-slate-600 mt-1 ml-6">
                                    Dr. {doc?.firstName} {doc?.lastName} <span className="text-slate-300 mx-1">|</span> {dept?.name}
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                apt.status === 'Completed' 
                                ? 'bg-green-50 text-green-700 border-green-100' 
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                                {apt.status}
                            </span>
                        </div>
                        {aptDiagnoses.length > 0 && (
                            <div className="mb-3 ml-6">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Diagnosis
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {aptDiagnoses.map(d => (
                                        <span key={d.id} className="bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded text-xs">
                                            {d.description}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {aptVitals && (
                            <div className="ml-6 mb-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> Vitals
                                </div>
                                <div className="text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                                    {aptVitals.bpSystolic && <div><span className="font-semibold text-slate-500">BP:</span> {aptVitals.bpSystolic}/{aptVitals.bpDiastolic}</div>}
                                    {aptVitals.temperature && <div><span className="font-semibold text-slate-500">Temp:</span> {aptVitals.temperature}°C</div>}
                                    {aptVitals.pulse && <div><span className="font-semibold text-slate-500">HR:</span> {aptVitals.pulse}</div>}
                                </div>
                            </div>
                        )}
                        {aptNotes.length > 0 && (
                            <div className="ml-6 mb-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Clinical Notes
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-slate-100 rounded-xl p-3.5 shadow-inner">
                                    {aptNotes.map(n => (
                                        <div key={n.id} className="text-xs border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                            <div className="font-bold text-blue-600 mb-0.5">{getNoteLabel(n.noteType)}</div>
                                            <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">{n.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-slate-100 overflow-hidden relative">
        {/* Modals */}
        {showVitals && <VitalsEntryModal appointmentId={appointment.id} onClose={() => setShowVitals(false)} />}
        {showAllergy && <AllergyEntryModal patientId={patient.id} onClose={() => setShowAllergy(false)} />}
        {showDiagnosis && <DiagnosisEntryModal appointmentId={appointment.id} onClose={() => setShowDiagnosis(false)} />}
        {showCPOE && <CPOEView appointmentId={appointment.id} patientId={patient.id} doctorId={employee?.id || ''} onClose={() => setShowCPOE(false)} />}
        {showDocuments && <DocumentsModal patientId={patient.id} appointmentId={appointment.id} onClose={() => setShowDocuments(false)} />}

        {/* 1. Sub-Header (White) */}
        <div className="bg-white px-6 py-2 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-20 h-14">
            <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">EMR</span>
                <h1 className="text-lg font-bold text-slate-800">Consultation Room</h1>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
                <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Dr. {employee?.lastName || 'RR'}</div>
                <div className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> {(department?.name || 'General').toUpperCase()}</div>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" /> Started: {new Date(appointment.checkInTime || Date.now()).toLocaleTimeString()}
                </div>
            </div>
        </div>

        {/* 2. Patient Banner (Dark Blue) */}
        <div className="bg-slate-900 text-white p-4 shrink-0 shadow-md z-10">
            <div className="flex items-center justify-between">
                <div className="flex gap-6 items-center flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-600 shadow-inner">
                        {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-5 gap-8 flex-1">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Patient Name</p>
                            <h2 className="text-base font-bold text-white uppercase tracking-tight truncate">{patient.firstName} {patient.lastName}</h2>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">MRN / ID</p>
                            <p className="text-yellow-400 font-mono font-bold text-sm">{patient.id.slice(-8).toUpperCase()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Demographics</p>
                            <p className="font-medium text-slate-100 text-sm">{age} Y / {patient.gender}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Contact</p>
                            <p className="font-medium text-slate-100 text-sm">{patient.phone}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Active Package</p>
                            <p className="text-slate-400 italic text-xs">No active insurance</p>
                        </div>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-6 w-32 shrink-0">
                        <button 
                        onClick={() => setShowAllergy(true)} 
                        className={`flex items-center justify-center gap-2 border px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${
                            activeAllergiesCount > 0 
                            ? 'bg-[#3f191b] hover:bg-[#5c2427] border-red-900/50 text-red-200' 
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                        >
                        <Bell className={`w-3.5 h-3.5 ${activeAllergiesCount > 0 ? 'text-red-400' : 'text-slate-400'}`} /> 
                        Allergies {activeAllergiesCount > 0 && `(${activeAllergiesCount})`}
                        </button>
                        <button className="flex items-center justify-center gap-2 bg-[#172554] hover:bg-[#1e3a8a] border border-blue-900/50 text-blue-100 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm">
                        <Info className="w-3.5 h-3.5 text-blue-400" /> Alerts
                        </button>
                </div>
            </div>
        </div>

        {/* 3. Toolbar (White) */}
        <div className="bg-white border-b border-slate-200 shadow-sm shrink-0 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {TOP_TOOLS.map(tool => {
                    const Icon = tool.icon;
                    return (
                        <button 
                            key={tool.id}
                            onClick={() => {
                                if(tool.id === 'Vitals') setShowVitals(true);
                                if(tool.id === 'Allergy') setShowAllergy(true);
                                if(tool.id === 'Diagnosis') setShowDiagnosis(true);
                                if(tool.id === 'Orders') setShowCPOE(true);
                                if(tool.id === 'Documents') setShowDocuments(true);
                            }}
                            className="flex flex-col items-center justify-center min-w-[70px] p-2 hover:bg-slate-50 rounded-lg transition-all group"
                        >
                            <Icon className={`w-5 h-5 mb-1.5 ${tool.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{tool.label.split(' ')[0]}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{tool.label.split(' ')[1] || ''}</span>
                        </button>
                    )
                })}
            </div>
            
            <div className="flex items-center gap-3">
                <button onClick={handleComplete} className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm flex items-center gap-2 transition-transform active:scale-95">
                    <CheckCircle className="w-4 h-4" /> Complete Consult
                </button>
            </div>
        </div>

        {/* 4. Workspace (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {SIDEBAR_ITEMS.map(item => {
                        const isSelected = activeSection === item.id;
                        const isSaved = item.id !== 'Visit History' && clinicalNotes.some(
                            n => n.appointmentId === appointmentId && n.noteType === item.id && n.description.trim() !== ''
                        );
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 relative flex items-center justify-between group ${
                                    isSelected 
                                    ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className="truncate pr-6">{item.label}</span>
                                {isSaved && (
                                    <CheckCircle className={`w-4 h-4 shrink-0 transition-colors ${
                                        isSelected ? 'text-blue-600' : 'text-emerald-500'
                                    }`} />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white">
                    <button 
                        onClick={() => navigate('/doctor-workbench')} 
                        className="flex items-center justify-center w-full py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to List
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {activeSection === 'Visit History' ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-full animate-in fade-in duration-300">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            Visit History
                        </h3>
                        {renderVisitHistory()}
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto min-h-full flex flex-col gap-6 animate-in fade-in duration-300">
                        {/* Split Editor + History */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch flex-1">
                            {/* Editor card (2 cols) */}
                            <div className="lg:col-span-2 flex flex-col">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-800">
                                                    {SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Record clinical findings for the current visit</p>
                                            </div>
                                        </div>
                                        {/* Saved/Unsaved Status Badge */}
                                        {(() => {
                                            const dbNote = clinicalNotes.find(
                                                n => n.appointmentId === appointmentId && n.noteType === activeSection
                                            );
                                            const dbText = dbNote?.description || '';
                                            const currentText = editedNotes[activeSection] || '';
                                            const hasUnsaved = currentText !== dbText;
                                            
                                            if (dbText && !hasUnsaved) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Saved
                                                    </span>
                                                );
                                            } else if (currentText) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-100 animate-pulse">
                                                        <Edit className="w-3.5 h-3.5" /> Unsaved Changes
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div className="flex-1 flex flex-col gap-4">
                                        <div className="relative flex-1 flex flex-col">
                                            <textarea 
                                                value={editedNotes[activeSection] || ''}
                                                onChange={(e) => setEditedNotes(prev => ({ ...prev, [activeSection]: e.target.value }))}
                                                className="w-full flex-1 min-h-[350px] p-5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-slate-700 leading-relaxed text-sm bg-slate-50/20 shadow-inner"
                                                placeholder={`Enter clinical details for ${SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label} here...`}
                                            ></textarea>
                                            <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                                Markdown Supported
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                                            <button 
                                                onClick={handleClearNotes}
                                                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors uppercase tracking-wider"
                                            >
                                                Clear Notes
                                            </button>
                                            <button 
                                                onClick={handleSaveNote}
                                                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2 uppercase tracking-wider hover:translate-y-[-1px] active:translate-y-0"
                                            >
                                                <Save className="w-4 h-4" /> Save {SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* History context (1 col) */}
                            <div className="lg:col-span-1 flex flex-col">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1 max-h-[550px] lg:max-h-none">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        Previous Records
                                    </h4>
                                    
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                                        {getPastNotesForSection().length === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400 flex-1 h-full">
                                                <Clock className="w-8 h-8 opacity-25 mb-2" />
                                                <p className="text-xs italic">No previous records found for this section.</p>
                                            </div>
                                        ) : (
                                            getPastNotesForSection().map((pastNote, idx) => (
                                                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3 text-blue-500" />
                                                            {pastNote.date} {pastNote.time}
                                                        </span>
                                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                            {employees.find(e => e.id === pastNote.doctorId)?.lastName ? `Dr. ${employees.find(e => e.id === pastNote.doctorId)?.lastName}` : 'Doctor'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border-t border-slate-100/50 pt-2">
                                                        {pastNote.description}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
