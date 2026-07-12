import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Pencil, X, UserPlus, Filter, Network } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { Patient } from '../types';
import { AbdmVerificationModal } from '../components/patient/AbdmVerificationModal';

export const Patients = () => {
  const { patients, addPatient, updatePatient, organizations, showToast } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAbdmModal, setShowAbdmModal] = useState(false);
  const [selectedAbdmPatient, setSelectedAbdmPatient] = useState<Patient | undefined>(undefined);

  const initialFormState = {
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    arabicName: '',
    nationalId: '',
    sponsorName: 'CASH',
    policyNo: '',
    cardNo: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormState);
    } else {
      setShowForm(true);
    }
  };

  const handleEdit = (p: Patient) => {
    setFormData({
        firstName: p.firstName,
        lastName: p.lastName,
        dob: p.dob,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        address: p.address,
        arabicName: p.arabicName || '',
        nationalId: p.nationalId || '',
        sponsorName: p.sponsorName || 'CASH',
        policyNo: p.policyNo || '',
        cardNo: p.cardNo || ''
    });
    setEditingId(p.id);
    setShowForm(true);
    // Smooth scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updatePatient(editingId, formData as any);
    } else {
        addPatient({
          id: Date.now().toString(),
          registrationDate: new Date().toISOString(),
          ...formData
        } as any);
    }
    
    // Close and reset
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(term) || p.phone.includes(term);
  });

  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Patients</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => { setSelectedAbdmPatient(undefined); setShowAbdmModal(true); }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <Network className="w-4 h-4 text-blue-600" />
            <span>ABDM</span>
          </button>
          <button 
            onClick={toggleForm}
            className={`${showForm ? 'bg-slate-500 hover:bg-slate-600' : 'bg-teal-600 hover:bg-teal-700'} text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2`}
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Patient Registration'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-teal-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
                {editingId ? 'Edit Patient Details' : 'New Patient Registration'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <label className="form-label">First Name</label>
                    <input required className="form-input" value={formData.firstName} 
                        onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Last Name</label>
                    <input required className="form-input" value={formData.lastName} 
                        onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Date of Birth</label>
                    <input required type="date" className="form-input" value={formData.dob} 
                        onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Gender</label>
                    <select className="form-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                        <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Phone</label>
                    <input required type="tel" className="form-input" value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Arabic Name</label>
                    <input className="form-input" value={formData.arabicName} 
                        onChange={e => setFormData({...formData, arabicName: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">National ID / Iqama</label>
                    <input className="form-input" value={formData.nationalId} 
                        onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Sponsor</label>
                    <select className="form-input" value={formData.sponsorName} onChange={e => setFormData({...formData, sponsorName: e.target.value})}>
                        <option value="CASH">CASH</option>
                        {organizations.map(org => (
                            <option key={org.id} value={org.name}>{org.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="form-label">Policy No.</label>
                    <input className="form-input" value={formData.policyNo} 
                        onChange={e => setFormData({...formData, policyNo: e.target.value})} />
                </div>
                <div>
                    <label className="form-label">Card No.</label>
                    <input className="form-input" value={formData.cardNo} 
                        onChange={e => setFormData({...formData, cardNo: e.target.value})} />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    <label className="form-label">Address</label>
                    <textarea className="form-input h-20" value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={toggleForm} 
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="bg-teal-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-teal-700 shadow-lg shadow-teal-200">
                        {editingId ? 'Save Changes' : 'Register Patient'}
                    </button>
                </div>
            </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all" 
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
                {searchTerm && (
                    <button 
                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                    <tr>
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Age/Gender</th>
                        <th className="px-6 py-3 font-semibold">Contact</th>
                        <th className="px-6 py-3 font-semibold">Registration Date</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                    <Filter className="w-8 h-8 mb-2 opacity-30" />
                                    No patients found matching "{searchTerm}"
                                </div>
                            </td>
                        </tr>
                    ) : (
                        paginatedPatients.map(p => {
                            const age = new Date().getFullYear() - new Date(p.dob).getFullYear();
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-900">{p.firstName} {p.lastName}</td>
                                    <td className="px-6 py-4 text-slate-600">{age} Y / {p.gender}</td>
                                    <td className="px-6 py-4 text-slate-600">{p.phone}</td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(p.registrationDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                                        <button 
                                            onClick={() => { setSelectedAbdmPatient(p); setShowAbdmModal(true); }}
                                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="Verify Identity / Link ABHA"
                                        >
                                            ABDM
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(p)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Edit Patient Details"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
        <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredPatients.length / itemsPerPage)}
            totalItems={filteredPatients.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            colorTheme="teal"
        />
      </div>

      <AbdmVerificationModal 
        isOpen={showAbdmModal}
        onClose={() => { setShowAbdmModal(false); setSelectedAbdmPatient(undefined); }}
        onSave={(savedPatient) => {
          showToast('success', 'ABDM demographics saved successfully!');
          setShowAbdmModal(false);
          setSelectedAbdmPatient(undefined);
        }}
        initialPatient={selectedAbdmPatient}
      />
    </div>
  );
};