import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { DatePicker } from '../components/DatePicker';
import { User, Activity, FileText, FlaskConical, Stethoscope, Microscope, X, Calendar, AlertTriangle, ChevronRight, Bell } from 'lucide-react';
import { Appointment } from '../types';
import { useNavigate } from 'react-router-dom';

const EMRModal = ({ patientId, onClose }: { patientId: string, onClose: () => void }) => {
    const { patients, appointments, vitals, diagnoses, clinicalNotes, allergies, employees, departments } = useData();
    const [activeTab, setActiveTab] = useState('Overview');

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return null;

    // Filter Data
    const patientApts = appointments.filter(a => a.patientId === patientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const aptIds = patientApts.map(a => a.id);
    
    const patientVitals = vitals.filter(v => aptIds.includes(v.appointmentId)).sort((a,b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const patientDiagnoses = diagnoses.filter(d => aptIds.includes(d.appointmentId)).sort((a,b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    const patientNotes = clinicalNotes.filter(n => aptIds.includes(n.appointmentId)).sort((a,b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const patientAllergies = allergies.filter(a => a.patientId === patientId);

    const getDocName = (id: string) => {
        const doc = employees.find(e => e.id === id);
        return doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'Unknown';
    };

    const getDeptName = (id: string) => {
        const d = departments.find(dept => dept.id === id);
        return d ? d.name : '-';
    };

    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                    {/* Patient Info */}
                    <div className="p-6 border-b border-slate-200 bg-white">
                         <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center text-blue-600 border-2 border-blue-50">
                            <User className="w-8 h-8" />
                         </div>
                         <h3 className="text-center font-bold text-slate-800 text-lg">{patient.firstName} {patient.lastName}</h3>
                         <div className="text-center text-xs text-slate-500 mt-1">{patient.gender.toUpperCase()} • {age} Years</div>
                         <div className="text-center text-xs text-slate-400 mt-1 font-mono">ID: {patient.id.slice(-6).toUpperCase()}</div>
                    </div>
                    {/* Nav */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {['Overview', 'Clinical Notes', 'Vitals History', 'Visit History', 'Allergies'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setActiveTab(t)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                                    activeTab === t 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {t}
                                {activeTab === t && <ChevronRight className="w-4 h-4 opacity-75" />}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-bold text-slate-800">Electronic Medical Record</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {/* OVERVIEW TAB */}
                        {activeTab === 'Overview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Last Visit</div>
                                        <div className="font-bold text-slate-800 text-lg">
                                            {patientApts[0] ? new Date(patientApts[0].date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Visits</div>
                                        <div className="font-bold text-slate-800 text-lg">{patientApts.length}</div>
                                    </div>
                                    <div className={`p-4 rounded-xl shadow-sm border ${patientAllergies.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${patientAllergies.length > 0 ? 'text-red-600' : 'text-green-600'}`}>Active Allergies</div>
                                        <div className={`font-bold text-lg ${patientAllergies.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{patientAllergies.length}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Last BP</div>
                                        <div className="font-bold text-slate-800 text-lg">
                                            {patientVitals[0] ? `${patientVitals[0].bpSystolic}/${patientVitals[0].bpDiastolic}` : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-500" /> Recent Vitals
                                        </h4>
                                        {patientVitals.length > 0 ? (
                                            <div className="space-y-3">
                                                {patientVitals.slice(0, 3).map((v, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                                                        <span className="text-slate-500">{new Date(v.recordedAt).toLocaleDateString()}</span>
                                                        <span className="font-medium">BP: {v.bpSystolic}/{v.bpDiastolic} &bull; HR: {v.pulse} &bull; T: {v.temperature}°C</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="text-slate-400 text-sm italic">No vitals recorded.</div>}
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" /> Recent Diagnosis
                                        </h4>
                                        {patientDiagnoses.length > 0 ? (
                                            <div className="space-y-3">
                                                {patientDiagnoses.slice(0, 3).map((d, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                                                        <span className="font-medium text-slate-800">{d.description}</span>
                                                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500">{d.type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="text-slate-400 text-sm italic">No diagnosis recorded.</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CLINICAL NOTES TAB */}
                        {activeTab === 'Clinical Notes' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                {patientNotes.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">No clinical notes found.</div>
                                ) : (
                                    patientNotes.map((note, idx) => {
                                        const apt = patientApts.find(a => a.id === note.appointmentId);
                                        return (
                                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        <span className="text-xs font-bold text-slate-600">
                                                            {new Date(note.recordedAt).toLocaleString()}
                                                        </span>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="text-xs font-medium text-blue-600">{note.noteType}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{getDocName(apt?.doctorId || '')}</span>
                                                </div>
                                                <div className="p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: note.description}} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* VITALS HISTORY TAB */}
                        {activeTab === 'Vitals History' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Date & Time</th>
                                            <th className="px-6 py-3 font-semibold">BP (mmHg)</th>
                                            <th className="px-6 py-3 font-semibold">Pulse (bpm)</th>
                                            <th className="px-6 py-3 font-semibold">Temp (°C)</th>
                                            <th className="px-6 py-3 font-semibold">SpO2 (%)</th>
                                            <th className="px-6 py-3 font-semibold">Weight (kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patientVitals.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No vitals recorded.</td></tr>
                                        ) : (
                                            patientVitals.map(v => (
                                                <tr key={v.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">{new Date(v.recordedAt).toLocaleString()}</td>
                                                    <td className="px-6 py-4">{v.bpSystolic}/{v.bpDiastolic}</td>
                                                    <td className="px-6 py-4">{v.pulse}</td>
                                                    <td className="px-6 py-4">{v.temperature}</td>
                                                    <td className="px-6 py-4">{v.spo2}%</td>
                                                    <td className="px-6 py-4">{v.weight}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* VISIT HISTORY TAB */}
                        {activeTab === 'Visit History' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Date</th>
                                            <th className="px-6 py-3 font-semibold">Doctor</th>
                                            <th className="px-6 py-3 font-semibold">Department</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                            <th className="px-6 py-3 font-semibold">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patientApts.map(apt => (
                                            <tr key={apt.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium">{new Date(apt.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">{getDocName(apt.doctorId)}</td>
                                                <td className="px-6 py-4">{getDeptName(apt.departmentId)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                        apt.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                                        apt.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {apt.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{apt.visitType || 'New Visit'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ALLERGIES TAB */}
                        {activeTab === 'Allergies' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Allergen</th>
                                            <th className="px-6 py-3 font-semibold">Severity</th>
                                            <th className="px-6 py-3 font-semibold">Reaction</th>
                                            <th className="px-6 py-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patientAllergies.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No allergies recorded.</td></tr>
                                        ) : (
                                            patientAllergies.map(al => (
                                                <tr key={al.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-bold text-slate-700">{al.allergen}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                            al.severity === 'Severe' ? 'bg-red-100 text-red-700' :
                                                            al.severity === 'Moderate' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {al.severity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">{al.reaction}</td>
                                                    <td className="px-6 py-4 text-slate-500">{al.status}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </div>
    );
};export const DoctorWorkbench = () => {
  const { appointments, patients, vitals, diagnoses, allergies, saveVitalSign, updateAppointment, bills } = useData();
  const navigate = useNavigate();

  // --- EMR State ---
  const [showEMR, setShowEMR] = useState(false);
  const [emrPatientId, setEmrPatientId] = useState<string | null>(null);

  // --- Filter State ---
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'Outpatient' | 'Referral' | 'My Appointments'>('Outpatient');
  const [subTab, setSubTab] = useState<'Checked-In' | 'Checked-Out' | 'All'>('Checked-In');

  // --- Vitals Modal ---
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [vitalsForm, setVitalsForm] = useState({
      bpSystolic: '', bpDiastolic: '', temperature: '', pulse: '', weight: '', height: '', spo2: ''
  });

  // --- Filtering Logic ---
  const filteredAppointments = appointments.filter(apt => {
      const isDateMatch = apt.date === visitDate;
      
      // Sub-tab logic based on status
      let isStatusMatch = true;
      if (subTab === 'Checked-In') isStatusMatch = ['Checked-In', 'In-Consultation', 'Scheduled'].includes(apt.status);
      else if (subTab === 'Checked-Out') isStatusMatch = ['Completed', 'Checked-Out'].includes(apt.status);
      
      return isDateMatch && isStatusMatch;
  });

  const getPatientBalance = (patientId: string) => {
      const patientBills = bills.filter(b => b.patientId === patientId);
      const total = patientBills.reduce((acc, b) => acc + b.totalAmount, 0);
      const paid = patientBills.reduce((acc, b) => acc + b.paidAmount, 0);
      return total - paid;
  };

  const getLatestVitals = (aptId: string) => {
      return vitals.filter(v => v.appointmentId === aptId).sort((a,b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  };

  const getDiagnoses = (aptId: string) => {
      return diagnoses.filter(d => d.appointmentId === aptId).map(d => d.description).join(', ');
  };

  const handleCaptureVitals = (apt: Appointment) => {
      setSelectedAppointment(apt);
      setVitalsForm({ bpSystolic: '', bpDiastolic: '', temperature: '', pulse: '', weight: '', height: '', spo2: '' });
      setShowVitalsModal(true);
  };

  const submitVitals = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAppointment) return;

      saveVitalSign({
          id: Date.now().toString(),
          appointmentId: selectedAppointment.id,
          recordedAt: new Date().toISOString(),
          bpSystolic: Number(vitalsForm.bpSystolic),
          bpDiastolic: Number(vitalsForm.bpDiastolic),
          temperature: Number(vitalsForm.temperature),
          pulse: Number(vitalsForm.pulse),
          weight: Number(vitalsForm.weight),
          height: Number(vitalsForm.height),
          spo2: Number(vitalsForm.spo2)
      });
      
      // Auto update status to In-Consultation if strictly Checked-In
      if (selectedAppointment.status === 'Checked-In' || selectedAppointment.status === 'Scheduled') {
          updateAppointment(selectedAppointment.id, { status: 'In-Consultation' });
      }

      setShowVitalsModal(false);
  };

  const handleSelectPatient = (apt: Appointment) => {
      if (apt.status === 'Scheduled') {
          updateAppointment(apt.id, { status: 'Checked-In', checkInTime: new Date().toISOString() });
      }
      navigate(`/consultation/${apt.id}`);
  };

  const handleOpenEMR = (patientId: string) => {
      setEmrPatientId(patientId);
      setShowEMR(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] -m-6 p-6 overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Workbench</h1>
            <p className="text-sm text-slate-500 font-medium">Manage patient appointments and clinical records</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              {['Outpatient', 'Referral', 'My Appointments'].map(tab => (
                  <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                          activeTab === tab 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 shrink-0">
          <div className="flex items-end gap-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Search Criteria</label>
                      <select className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                          <option>Visit Date</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Condition</label>
                      <select className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                          <option>Equal to</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Value</label>
                      <DatePicker value={visitDate} onChange={setVisitDate} />
                  </div>
              </div>
              
              <div className="flex gap-3">
                  <button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Search
                  </button>
                  <button className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 rounded-xl text-sm font-bold transition-all active:scale-95">
                      Clear
                  </button>
              </div>

              <div className="h-10 w-px bg-slate-200 mx-2"></div>
              
              <div className="flex items-end gap-3">
                  <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Save Search</label>
                        <input placeholder="Search Name..." className="h-10 border border-slate-200 rounded-xl px-4 text-sm w-40 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                  </div>
                  <button className="h-10 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 rounded-xl text-sm font-bold transition-all">Save</button>
              </div>
          </div>
      </div>

      {/* Stats Summary & Sub-Tabs */}
      <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex gap-2">
              {['Checked-In', 'Checked-Out', 'All'].map(st => (
                  <button 
                      key={st} 
                      onClick={() => setSubTab(st as any)}
                      className={`px-5 py-2 text-xs font-bold rounded-xl border transition-all ${
                          subTab === st 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                  >
                      {st === 'All' ? 'ALL PATIENTS' : st.toUpperCase()}
                  </button>
              ))}
          </div>

          <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Checked-In: {filteredAppointments.filter(a => a.status === 'Checked-In').length}
              </div>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  In-Consultation: {filteredAppointments.filter(a => a.status === 'In-Consultation').length}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                  Date: <span className="text-slate-600 font-bold">{new Date(visitDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>
          </div>
      </div>

      {/* Patient List (The Table) */}
      <div className="flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Photo</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Details</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center whitespace-nowrap">EMR</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Remarks</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Status</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-28 text-right">Balance</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20 text-center whitespace-nowrap">Vitals</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">LAB</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">RAD</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">PROC</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredAppointments.length === 0 ? (
                          <tr>
                              <td colSpan={12} className="p-20 text-center">
                                  <div className="flex flex-col items-center justify-center text-slate-400">
                                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                          <User className="w-8 h-8 opacity-20" />
                                      </div>
                                      <p className="text-sm font-medium italic">No matches found for the current filters.</p>
                                  </div>
                              </td>
                          </tr>
                      ) : (
                          filteredAppointments.map((apt) => {
                              const patient = patients.find(p => p.id === apt.patientId);
                              const balance = getPatientBalance(apt.patientId);
                              const latestVitals = getLatestVitals(apt.id);
                              const diagnosisText = getDiagnoses(apt.id);
                              const age = patient ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 0;
                              const activeAllergies = allergies.filter(a => a.patientId === apt.patientId && a.status === 'Active');
                              
                              return (
                                  <tr key={apt.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                      <td className="px-4 py-4 align-top">
                                          <div className="relative group/photo">
                                              <div className="w-12 h-12 bg-indigo-50 rounded-xl mx-auto flex items-center justify-center text-indigo-400 border border-indigo-100 shadow-sm overflow-hidden transition-transform group-hover/photo:scale-110">
                                                  {patient?.gender === 'Female' ? <User className="w-6 h-6 opacity-60" /> : <User className="w-6 h-6 opacity-60" />}
                                              </div>
                                              {activeAllergies.length > 0 && (
                                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-ping"></div>
                                              )}
                                              {activeAllergies.length > 0 && (
                                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-4 py-4 align-top">
                                          <div className="font-bold text-slate-800 text-[14px] leading-tight group-hover:text-indigo-600 transition-colors">{patient?.firstName} {patient?.lastName}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">ID: {patient?.id.slice(-6)}</span>
                                              <span className="text-[11px] font-bold text-slate-500 uppercase">{patient?.gender.charAt(0)} • {age}Y</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-2">
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${apt.paymentMode === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                  {apt.paymentMode || 'CASH'}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-medium">{apt.visitType || 'General'}</span>
                                          </div>
                                          
                                          {activeAllergies.length > 0 && (
                                              <div className="mt-2.5 flex items-center gap-1.5 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-lg border border-red-100 font-bold animate-pulse">
                                                  <Bell className="w-3 h-3 fill-red-500" />
                                                  <span>ALLERGY ALERT</span>
                                              </div>
                                          )}
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <button 
                                              onClick={() => handleOpenEMR(apt.patientId)}
                                              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                                              title="Open Electronic Medical Record"
                                          >
                                              <FileText className="w-5 h-5" />
                                          </button>
                                      </td>
                                      <td className="px-4 py-4 align-top text-[12px] text-slate-500 font-medium italic leading-relaxed">
                                          {apt.notes || '---'}
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                              apt.status === 'In-Consultation' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                              apt.status === 'Checked-In' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                              apt.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
                                          }`}>
                                              {apt.status}
                                          </span>
                                      </td>
                                      <td className="px-4 py-4 text-right align-middle font-mono font-bold text-sm">
                                          {balance > 0 ? (
                                              <span className="text-red-500 bg-red-50 px-2 py-1 rounded-lg">-{balance.toFixed(2)}</span>
                                          ) : (
                                              <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">0.00</span>
                                          )}
                                      </td>
                                      <td className="px-4 py-4 align-top text-[12px] max-w-[200px]">
                                          {diagnosisText ? (
                                              <div className="flex flex-wrap gap-1">
                                                  {diagnosisText.split(',').map((d, i) => (
                                                      <span key={i} className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100 leading-tight block">{d.trim()}</span>
                                                  ))}
                                              </div>
                                          ) : <span className="text-slate-300 italic">None recorded</span>}
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <div className="flex flex-col items-center gap-1.5">
                                              {latestVitals ? (
                                                  <div className="group/vitals relative">
                                                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-lg border border-emerald-100 cursor-pointer shadow-sm hover:scale-105 transition-transform">
                                                          <Activity className="w-3.5 h-3.5" />
                                                          <span className="text-[10px] font-bold">STABLE</span>
                                                      </div>
                                                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block">
                                                          {new Date(latestVitals.recordedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                      </span>
                                                      
                                                      {/* Floating Tooltip Card */}
                                                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover/vitals:block w-48 bg-slate-900 text-white rounded-xl p-3 z-50 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                                                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-white/10 pb-1">Latest Reading</div>
                                                          <div className="space-y-1.5">
                                                              <div className="flex justify-between text-xs font-bold">
                                                                  <span className="text-slate-400">BP:</span>
                                                                  <span>{latestVitals.bpSystolic}/{latestVitals.bpDiastolic}</span>
                                                              </div>
                                                              <div className="flex justify-between text-xs font-bold">
                                                                  <span className="text-slate-400">Temp:</span>
                                                                  <span>{latestVitals.temperature}°C</span>
                                                              </div>
                                                              <div className="flex justify-between text-xs font-bold">
                                                                  <span className="text-slate-400">Pulse:</span>
                                                                  <span>{latestVitals.pulse} bpm</span>
                                                              </div>
                                                              <div className="flex justify-between text-xs font-bold">
                                                                  <span className="text-slate-400">SpO2:</span>
                                                                  <span>{latestVitals.spo2}%</span>
                                                              </div>
                                                          </div>
                                                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <button 
                                                      onClick={() => handleCaptureVitals(apt)}
                                                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100 group/capture animate-pulse shadow-sm"
                                                      title="Capture Critical Vitals"
                                                  >
                                                      <Activity className="w-5 h-5" />
                                                  </button>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <button className="w-10 h-10 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-indigo-400 transition-colors flex items-center justify-center">
                                              <FlaskConical className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                          </button>
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <button className="w-10 h-10 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-purple-400 transition-colors flex items-center justify-center">
                                              <Microscope className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                          </button>
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <button className="w-10 h-10 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-teal-400 transition-colors flex items-center justify-center">
                                              <Stethoscope className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                          </button>
                                      </td>
                                      <td className="px-4 py-4 text-center align-middle">
                                          <button 
                                              onClick={() => handleSelectPatient(apt)}
                                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                          >
                                              SELECT
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
          
          {/* Legend Footer */}
          <div className="bg-slate-50/50 px-8 py-3 border-t border-slate-100 flex gap-6 text-[11px] shrink-0">
              <div className="flex items-center gap-2 font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                  <span>VITALS CAPTURED</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse"></div>
                  <span>VITALS PENDING</span>
              </div>
              <div className="ml-auto text-slate-400 font-medium">
                  Showing {filteredAppointments.length} patients for {visitDate}
              </div>
          </div>
      </div>

      {/* Vitals Modal */}
      {showVitalsModal && selectedAppointment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                              <div className="p-2 bg-red-100 rounded-xl"><Activity className="w-5 h-5 text-red-600" /></div>
                              Capture Vitals
                          </h3>
                          <p className="text-xs text-slate-500 font-bold uppercase mt-1.5 tracking-wider">Patient: {patients.find(p => p.id === selectedAppointment.patientId)?.firstName} {patients.find(p => p.id === selectedAppointment.patientId)?.lastName}</p>
                      </div>
                      <button onClick={() => setShowVitalsModal(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <form onSubmit={submitVitals} className="p-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2 grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-inner">
                              <div>
                                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-1">BP Systolic</label>
                                  <div className="flex items-center h-12 bg-white rounded-xl border border-indigo-200 mt-1 px-4 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                                    <input type="number" required className="w-full text-sm font-bold bg-transparent outline-none" placeholder="120"
                                        value={vitalsForm.bpSystolic} onChange={e => setVitalsForm({...vitalsForm, bpSystolic: e.target.value})}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 ml-2">mmHg</span>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-1">BP Diastolic</label>
                                  <div className="flex items-center h-12 bg-white rounded-xl border border-indigo-200 mt-1 px-4 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                                    <input type="number" required className="w-full text-sm font-bold bg-transparent outline-none" placeholder="80"
                                        value={vitalsForm.bpDiastolic} onChange={e => setVitalsForm({...vitalsForm, bpDiastolic: e.target.value})}
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 ml-2">mmHg</span>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Temperature</label>
                              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl mt-1 px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <input type="number" step="0.1" required className="w-full text-sm font-bold bg-transparent outline-none" placeholder="37.0"
                                    value={vitalsForm.temperature} onChange={e => setVitalsForm({...vitalsForm, temperature: e.target.value})}
                                />
                                <span className="text-[10px] font-bold text-slate-400 ml-2">°C</span>
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pulse Rate</label>
                              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl mt-1 px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <input type="number" required className="w-full text-sm font-bold bg-transparent outline-none" placeholder="72"
                                    value={vitalsForm.pulse} onChange={e => setVitalsForm({...vitalsForm, pulse: e.target.value})}
                                />
                                <span className="text-[10px] font-bold text-slate-400 ml-2">bpm</span>
                              </div>
                          </div>

                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">SpO2 Level</label>
                              <div className="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl mt-1 px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <input type="number" required className="w-full text-sm font-bold bg-transparent outline-none" placeholder="98"
                                    value={vitalsForm.spo2} onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})}
                                />
                                <span className="text-[10px] font-bold text-slate-400 ml-2">%</span>
                              </div>
                          </div>

                          <div className="col-span-1 grid grid-cols-2 gap-3">
                               <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height</label>
                                  <input type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl mt-1 px-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="cm"
                                      value={vitalsForm.height} onChange={e => setVitalsForm({...vitalsForm, height: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weight</label>
                                  <input type="number" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl mt-1 px-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="kg"
                                      value={vitalsForm.weight} onChange={e => setVitalsForm({...vitalsForm, weight: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="col-span-2 pt-6 flex gap-4">
                              <button type="button" onClick={() => setShowVitalsModal(false)} className="flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95">Discard</button>
                              <button type="submit" className="flex-1 h-12 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">Save Vitals</button>
                          </div>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* EMR Modal */}
      {showEMR && emrPatientId && (
          <EMRModal patientId={emrPatientId} onClose={() => setShowEMR(false)} />
      )}
    </div>
  );
};