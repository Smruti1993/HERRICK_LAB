
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { analyzeSymptoms } from '../services/geminiService';
import { Sparkles, Loader2, Calendar as CalendarIcon, Clock, Filter, RefreshCw, XCircle, AlertTriangle, ChevronLeft, ChevronRight, User, Search, X, Plus } from 'lucide-react';

const getTodayStr = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
};

// --- Mini Calendar Component ---
const MiniCalendar = ({ selectedDate, onDateSelect }: { selectedDate: Date, onDateSelect: (d: Date) => void }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    useEffect(() => {
        setViewDate(new Date(selectedDate));
    }, [selectedDate]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d));
    }

    const isSameDate = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

    const changeMonth = (delta: number) => {
        setViewDate(new Date(year, month + delta, 1));
    };

    return (
        <div className="bg-white border border-slate-300 shadow-sm text-xs select-none">
            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-1 flex justify-between items-center">
                <button onClick={() => changeMonth(-1)} className="hover:bg-white/20 rounded p-0.5"><ChevronLeft className="w-3 h-3" /></button>
                <span className="font-bold">
                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="hover:bg-white/20 rounded p-0.5"><ChevronRight className="w-3 h-3" /></button>
            </div>
            
            {/* Days Header */}
            <div className="grid grid-cols-7 text-center bg-slate-100 border-b border-slate-200">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="py-1 font-semibold text-slate-500">{d}</div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 bg-white">
                {days.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="h-6 border-b border-r border-slate-100 bg-slate-50/50"></div>;
                    
                    const isSelected = isSameDate(date, selectedDate);
                    const isToday = isSameDate(date, new Date());
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                        <div 
                            key={i}
                            onClick={() => onDateSelect(date)}
                            className={`
                                h-6 flex items-center justify-center cursor-pointer border-b border-r border-slate-100 transition-colors
                                ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50'}
                                ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}
                                ${isWeekend && !isSelected ? 'text-red-400' : ''}
                            `}
                        >
                            {date.getDate()}
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-slate-100 p-1 text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-200 px-2">
                <span>{selectedDate.toLocaleDateString()}</span>
                <button onClick={() => onDateSelect(new Date())} className="text-blue-600 hover:underline">Today</button>
            </div>
        </div>
    );
};

// --- Booking Modal Component ---
const BookingModal = ({ 
    isOpen, 
    onClose, 
    initialData,
    prefillProfile,
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    initialData: { date: string, time: string, doctorId: string, departmentId: string },
    prefillProfile?: any,
}) => {
    const { patients, departments, employees, appointments, bookAppointment, showToast } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    
    // Form State
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [formData, setFormData] = useState({
        date: initialData.date,
        doctorId: initialData.doctorId,
        departmentId: initialData.departmentId,
        fromTime: initialData.time,
        toTime: '', // Will calc
        visitType: 'New Visit',
        status: 'Scheduled',
        remarks: '',
        isWalkIn: false,
        sendSms: false,
        refSource: 'Self',
        promotion: ''
    });

    // Calc To Time on Init
    useEffect(() => {
        if(initialData.time) {
            const [h, m] = initialData.time.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m + 30); // Default 30 min
            const toStr = date.toTimeString().substring(0,5);
            setFormData(prev => ({...prev, toTime: toStr, doctorId: initialData.doctorId, departmentId: initialData.departmentId, date: initialData.date, fromTime: initialData.time }));
        }
    }, [initialData]);

    // Auto-select ABDM demographic patient when prefillProfile is provided
    useEffect(() => {
        if (isOpen && prefillProfile) {
            const demographicId = String(prefillProfile.id);
            const match = patients.find(p => p.id === demographicId);
            if (match) {
                setSelectedPatient(match.id);
                setSearchTerm(`${match.firstName} ${match.lastName}`);
                setShowPatientDropdown(false);
            } else {
                // Fallback: use name directly even if not in synced list yet
                setSearchTerm(prefillProfile.fullName || `${prefillProfile.firstName || ''} ${prefillProfile.lastName || ''}`.trim());
                setSelectedPatient(demographicId);
            }
        }
    }, [isOpen, prefillProfile, patients]);

    if (!isOpen) return null;

    const filteredPatients = patients.filter(p => 
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.includes(searchTerm) ||
        p.phone.includes(searchTerm)
    );

    const handlePatientSelect = (p: any) => {
        setSelectedPatient(p.id);
        setSearchTerm(`${p.firstName} ${p.lastName}`);
        setShowPatientDropdown(false);
    };

    const handleSchedule = () => {
        if (!selectedPatient) {
            showToast('error', 'Please select a patient');
            return;
        }
        
        if (formData.date < getTodayStr()) {
            showToast('error', 'Cannot book appointments on past dates');
            return;
        }
        
        bookAppointment({
            id: Date.now().toString(),
            patientId: selectedPatient,
            doctorId: formData.doctorId,
            departmentId: formData.departmentId,
            date: formData.date,
            time: formData.fromTime,
            status: 'Scheduled',
            visitType: formData.visitType as any,
            notes: formData.remarks
        });
        onClose();
    };

    // Patient History
    const patientHistory = selectedPatient 
        ? appointments.filter(a => a.patientId === selectedPatient).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden border border-slate-400 flex flex-col max-h-[90vh]">
                
                {/* Header (Blue) */}
                <div className="bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2 flex justify-between items-center text-white shrink-0">
                    <span className="font-bold text-sm">Appointment Booking</span>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                </div>

                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-800 text-sm">Schedule Details</h3>
                    <button className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-1 rounded border border-green-300 transition-colors">
                        <Plus className="w-3 h-3" /> New Registration
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {/* Patient Search Section */}
                    <div className="flex gap-4 mb-6 bg-sky-50 p-4 rounded-lg border border-sky-100 items-start">
                        <div className="w-16 h-16 bg-white border border-slate-300 rounded shadow-sm flex items-center justify-center shrink-0">
                            <User className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="flex-1 relative">
                            <div className="relative">
                                <input 
                                    className="w-full h-10 pl-10 pr-4 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 shadow-inner"
                                    placeholder="Search Patient by Name, MRN or Phone..."
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setShowPatientDropdown(true); }}
                                    onFocus={() => setShowPatientDropdown(true)}
                                />
                                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            
                            {showPatientDropdown && searchTerm && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 shadow-xl rounded-b-lg max-h-60 overflow-y-auto z-50">
                                    {filteredPatients.length === 0 ? (
                                        <div className="p-3 text-sm text-slate-500 italic">No patients found.</div>
                                    ) : (
                                        filteredPatients.map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => handlePatientSelect(p)}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center group"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-800 group-hover:text-blue-700">{p.firstName} {p.lastName}</div>
                                                    <div className="text-xs text-slate-500">MRN: {p.id.slice(-8).toUpperCase()} | {p.phone}</div>
                                                </div>
                                                <div className="text-xs font-medium text-slate-400 group-hover:text-blue-500">Select</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium text-slate-700">
                        
                        <div className="space-y-1">
                            <label className="block text-slate-600">Appointment Date</label>
                            <div className="flex gap-1">
                                <input 
                                    type="date" 
                                    className="form-input py-1" 
                                    value={formData.date} 
                                    min={getTodayStr()} 
                                    onChange={e => setFormData({...formData, date: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">Unit *</label>
                            <select className="form-input py-1" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                                <option value="">-- Select --</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600">Visit Type <span className="text-red-500">*</span></label>
                            <select className="form-input py-1" value={formData.visitType} onChange={e => setFormData({...formData, visitType: e.target.value})}>
                                <option>New Visit</option>
                                <option>Follow-up</option>
                                <option>Consultation</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">Doctor *</label>
                            <select className="form-input py-1" value={formData.doctorId} onChange={e => setFormData({...formData, doctorId: e.target.value})}>
                                {employees.filter(e => e.role === 'Doctor').map(d => (
                                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">From *</label>
                            <div className="flex items-center gap-1">
                                <input type="time" className="form-input py-1" value={formData.fromTime} onChange={e => setFormData({...formData, fromTime: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">To *</label>
                            <div className="flex items-center gap-1">
                                <input type="time" className="form-input py-1" value={formData.toTime} onChange={e => setFormData({...formData, toTime: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600">Repeat</label>
                            <select className="form-input py-1 text-slate-400">
                                <option>Does not Repeat</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">Appointment Status *</label>
                            <select className="form-input py-1" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option>Scheduled</option>
                                <option>Confirmed</option>
                                <option>Tentative</option>
                            </select>
                        </div>

                        <div className="flex items-end h-full pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded" checked={formData.isWalkIn} onChange={e => setFormData({...formData, isWalkIn: e.target.checked})} />
                                Is walk-in ?
                            </label>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1">
                            <label className="block text-slate-600">Remarks</label>
                            <textarea 
                                className="form-input py-1 h-16 resize-none" 
                                value={formData.remarks} 
                                onChange={e => setFormData({...formData, remarks: e.target.value})}
                            ></textarea>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" checked={formData.sendSms} onChange={e => setFormData({...formData, sendSms: e.target.checked})} />
                            <label className="text-slate-600">Send Sms</label>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">Reference Source *</label>
                            <select className="form-input py-1" value={formData.refSource} onChange={e => setFormData({...formData, refSource: e.target.value})}>
                                <option>Self</option>
                                <option>Referral</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-slate-600 text-red-500">CX_Promotion *</label>
                            <select className="form-input py-1" value={formData.promotion} onChange={e => setFormData({...formData, promotion: e.target.value})}>
                                <option value="">-- Select --</option>
                                <option>General 2026</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3 border-t border-slate-200 pt-4">
                        <button onClick={handleSchedule} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm font-bold text-sm transition-colors">
                            Schedule
                        </button>
                        <button onClick={onClose} className="bg-slate-500 hover:bg-slate-600 text-white px-6 py-2 rounded shadow-sm font-bold text-sm transition-colors">
                            Close
                        </button>
                    </div>

                    {/* Historical Records */}
                    <div className="mt-6 border border-slate-300 rounded bg-white overflow-hidden flex flex-col h-40">
                        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 font-bold text-slate-700 text-xs">
                            Appointment Records
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                    <tr>
                                        <th className="p-2 border-r border-slate-200">Appointment Date</th>
                                        <th className="p-2 border-r border-slate-200">Time Slot</th>
                                        <th className="p-2 border-r border-slate-200">Consultant</th>
                                        <th className="p-2 border-r border-slate-200">Department</th>
                                        <th className="p-2 border-r border-slate-200">Status</th>
                                        <th className="p-2">Go To</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {patientHistory.length === 0 ? (
                                        <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">No previous records.</td></tr>
                                    ) : (
                                        patientHistory.map(apt => {
                                            const doc = employees.find(e => e.id === apt.doctorId);
                                            const dept = departments.find(d => d.id === apt.departmentId);
                                            return (
                                                <tr key={apt.id} className="hover:bg-slate-50">
                                                    <td className="p-2 border-r border-slate-100">{new Date(apt.date).toLocaleDateString()}</td>
                                                    <td className="p-2 border-r border-slate-100">{apt.time}</td>
                                                    <td className="p-2 border-r border-slate-100">{doc?.lastName}</td>
                                                    <td className="p-2 border-r border-slate-100">{dept?.name}</td>
                                                    <td className="p-2 border-r border-slate-100">{apt.status}</td>
                                                    <td className="p-2 text-blue-600 cursor-pointer hover:underline">View</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Appointments = () => {
  const { 
    departments, employees, doctorSchedules, appointments, 
    cancelAppointment, patients, showToast
  } = useData();

  // --- Booking State ---
  const [symptoms, setSymptoms] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<{departmentName: string | null, urgency: string, reasoning: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDateObj, setSelectedDateObj] = useState(new Date()); // Using Date Object for calendar

  // --- Modal Booking State ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSlotDetails, setBookingSlotDetails] = useState({ date: '', time: '', doctorId: '', departmentId: '' });
  const [pendingPrefillProfile, setPendingPrefillProfile] = useState<any>(null);

  // --- Filter State ---
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Read location state — from ABDM Profiles page: store profile, wait for user to pick a slot
  const location = useLocation();
  useEffect(() => {
    const profile = (location.state as any)?.prefillProfile;
    if (profile) {
      setPendingPrefillProfile(profile);
      // Clear the state so a refresh doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, []);

  // --- Modal State ---
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // --- Derived Data ---
  const bookingDoctors = employees.filter(e => e.role === 'Doctor' && e.departmentId === selectedDept);
  const allDoctors = employees.filter(e => e.role === 'Doctor');
  
  // Format selected date string YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
      const offset = selectedDateObj.getTimezoneOffset();
      const date = new Date(selectedDateObj.getTime() - (offset*60*1000));
      return date.toISOString().split('T')[0];
  }, [selectedDateObj]);

  // --- Scheduler Logic ---
  const schedulerData = useMemo(() => {
      if (!selectedDoctor) return null;

      const dayOfWeek = selectedDateObj.getDay();
      
      // Filter slots for this doctor and day of week
      const daySlots = (doctorSchedules || []).filter(s => 
          s.doctorId === selectedDoctor && 
          s.dayOfWeek === dayOfWeek && 
          s.isActive
      );

      // Determine View Range
      let startHour = 8; // Default 08:00
      let endHour = 20;  // Default 20:00
      const duration = daySlots.length ? daySlots[0].slotDuration : 30;

      if (daySlots.length) {
          let minMins = 24 * 60;
          let maxMins = 0;
          daySlots.forEach(s => {
              const [sH, sM] = s.startTime.split(':').map(Number);
              const [eH, eM] = s.endTime.split(':').map(Number);
              const sTotal = sH * 60 + sM;
              const eTotal = eH * 60 + eM;
              if (sTotal < minMins) minMins = sTotal;
              if (eTotal > maxMins) maxMins = eTotal;
          });

          const defaultStartMins = 8 * 60;
          const defaultEndMins = 20 * 60;
          const finalStartMins = Math.min(defaultStartMins, minMins);
          const finalEndMins = Math.max(defaultEndMins, maxMins);

          startHour = Math.floor(finalStartMins / 60);
          endHour = Math.ceil(finalEndMins / 60);
      }

      let current = new Date(selectedDateObj);
      current.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(selectedDateObj);
      endTime.setHours(endHour, 0, 0, 0);

      const slots = [];
      while (current < endTime) {
          const timeStr = current.toTimeString().substring(0, 5);
          current.setMinutes(current.getMinutes() + duration);
          const nextTimeStr = current.toTimeString().substring(0, 5);

          const dbSlot = daySlots.find(s => s.startTime === timeStr);

          const bookedApt = appointments.find(a => 
              a.doctorId === selectedDoctor && 
              a.date === selectedDateStr && 
              a.time === timeStr &&
              a.status !== 'Cancelled'
          );

          slots.push({
              time: timeStr,
              endTime: nextTimeStr,
              isWorkingHour: dbSlot !== undefined,
              slotType: dbSlot ? dbSlot.slotType : 'off',
              bookedApt
          });
      }

      return { slots, hasSchedule: daySlots.length > 0 };
  }, [selectedDoctor, selectedDateObj, doctorSchedules, appointments, selectedDateStr]);


  // --- Handlers ---
  const handleAiTriage = async () => {
    if (!symptoms.trim()) {
        showToast('info', 'Please describe the symptoms first.');
        return;
    }
    
    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    let patientContext: { age?: number; gender?: string; allergies?: string[] } = {};
    
    /* No patient context as selectedPatient was removed */

    try {
        const result = await analyzeSymptoms(symptoms, departments.map(d => d.name), patientContext);
        
        if (result) {
            if (result.departmentName) {
                setAiAnalysis(result);
                const dept = departments.find(d => d.name === result.departmentName);
                if (dept) {
                    setSelectedDept(dept.id);
                    showToast('success', `Suggesting ${dept.name}`);
                } else {
                    showToast('info', `Suggested department '${result.departmentName}' not found.`);
                }
            } else {
                showToast('error', result.reasoning || 'AI analysis failed.');
            }
        } else {
            showToast('error', 'AI Service is currently unavailable.');
        }
    } catch (error) {
        console.error(error);
        showToast('error', 'An unexpected error occurred.');
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSlotClick = (time: string) => {
      if (selectedDateStr < getTodayStr()) {
          showToast('error', 'Cannot book appointments on past dates');
          return;
      }
      // Open modal
      setBookingSlotDetails({
          date: selectedDateStr,
          time: time,
          doctorId: selectedDoctor,
          departmentId: selectedDept || employees.find(e => e.id === selectedDoctor)?.departmentId || ''
      });
      setIsBookingModalOpen(true);
  };

  const handleCancelClick = (id: string) => {
    setAppointmentToCancel(id);
    setIsCancelModalOpen(true);
  };

  const confirmCancel = () => {
    if (appointmentToCancel) {
        cancelAppointment(appointmentToCancel);
        setIsCancelModalOpen(false);
        setAppointmentToCancel(null);
    }
  };

  // --- Filter Logic ---
  const filteredAppointments = appointments.filter(apt => {
    const matchDoc = filterDoctorId ? apt.doctorId === filterDoctorId : true;
    const matchStatus = filterStatus !== 'All' ? apt.status === filterStatus : true;
    const matchStart = filterStartDate ? apt.date >= filterStartDate : true;
    const matchEnd = filterEndDate ? apt.date <= filterEndDate : true;
    return matchDoc && matchStatus && matchStart && matchEnd;
  }).sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  // Get current doc info
  const selectedDocInfo = employees.find(e => e.id === selectedDoctor);

  return (
    <div className="space-y-8">
      
      {/* SECTION 1: BOOKING INTERFACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[600px]">
        
        {/* Left Col: AI Triage & Configuration (3 Columns) */}
        <div className="xl:col-span-3 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* ABDM Patient Banner — shown when coming from ABDM Profiles page */}
          {pendingPrefillProfile && (
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-4 text-white shadow-lg shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-sm font-bold">
                    {(pendingPrefillProfile.fullName || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">ABHA Patient</p>
                    <p className="font-bold text-sm truncate">{pendingPrefillProfile.fullName}</p>
                    <p className="text-[10px] text-cyan-200 font-mono truncate">{pendingPrefillProfile.abhaNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingPrefillProfile(null)}
                  className="text-white/60 hover:text-white shrink-0 mt-0.5"
                  title="Clear prefill"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-cyan-100 mt-2.5 leading-relaxed">
                ↓ Select a doctor below, then click a <span className="font-bold text-yellow-300">yellow slot</span> on the calendar to book.
              </p>
            </div>
          )}
          
          {/* AI Symptom Checker */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white shadow-lg shrink-0">
              <div className="flex items-center mb-3 justify-between">
                  <div className="flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                      <h3 className="font-bold text-base">AI Smart Triage</h3>
                  </div>
              </div>
              <textarea 
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white placeholder-indigo-200 text-xs focus:outline-none focus:ring-1 focus:ring-white/50"
                  rows={3}
                  placeholder="Describe symptoms..."
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
              ></textarea>
              
              <button 
                  onClick={handleAiTriage}
                  disabled={isAnalyzing}
                  className="mt-2 w-full bg-white text-indigo-700 font-bold py-1.5 rounded-lg text-xs hover:bg-indigo-50 transition-colors flex justify-center items-center shadow-sm"
              >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : 'Analyze'}
              </button>

              {aiAnalysis && (
                  <div className="mt-3 bg-white/10 rounded-lg p-2 border border-white/20 animate-in fade-in slide-in-from-top-2 text-xs">
                      <p className="font-bold text-yellow-300 uppercase tracking-wide text-[10px]">Suggestion</p>
                      <p className="font-semibold">{aiAnalysis.departmentName || 'N/A'}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                              aiAnalysis.urgency === 'High' ? 'bg-red-500 text-white' : 
                              aiAnalysis.urgency === 'Medium' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                          }`}>{aiAnalysis.urgency}</span>
                      </div>
                  </div>
              )}
          </div>

          {/* Booking Config Form - Simplified acting as Filter for Scheduler */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">Schedule Viewer</h3>
              
              <div className="space-y-3">
                  <div>
                      <label className="form-label text-xs">Department</label>
                      <select className="form-input text-sm py-1.5" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                          <option value="">Select Department</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                  </div>

                  <div>
                      <label className="form-label text-xs">Doctor</label>
                      <select 
                          className="form-input text-sm py-1.5" 
                          value={selectedDoctor} 
                          onChange={e => setSelectedDoctor(e.target.value)}
                          disabled={!selectedDept}
                      >
                          <option value="">Select Doctor</option>
                          {bookingDoctors.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                      </select>
                  </div>
                  
                  <div className="pt-2 text-xs text-slate-500 italic">
                      Select a doctor to view availability. Click on a yellow slot to book.
                  </div>
              </div>
          </div>
        </div>

        {/* Right Col: Scheduler (9 Columns) */}
        <div className="xl:col-span-9 flex flex-col bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
            
            {/* 1. Scheduler Toolbar */}
            <div className="flex justify-between items-center p-2 bg-slate-100 border-b border-slate-300 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-300 rounded shadow-sm">
                        <button onClick={() => setSelectedDateObj(new Date(selectedDateObj.setDate(selectedDateObj.getDate() - 1)))} className="p-1 hover:bg-slate-50 border-r border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
                        <button onClick={() => setSelectedDateObj(new Date(selectedDateObj.setDate(selectedDateObj.getDate() + 1)))} className="p-1 hover:bg-slate-50"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
                    </div>
                    <button 
                        onClick={() => setSelectedDateObj(new Date())}
                        className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                        today
                    </button>
                </div>
                
                <div className="text-lg font-bold text-slate-800">
                    {selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                <div className="flex bg-slate-200 rounded p-0.5">
                    {['month', 'week', 'day'].map(v => (
                        <button key={v} className={`px-3 py-0.5 text-xs font-medium rounded ${v === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Main Content Area (Split) */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* Left: Day View Scheduler */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Doctor Header */}
                    <div className="h-10 bg-slate-100 border-b border-slate-300 flex items-center justify-center font-bold text-sm text-slate-800">
                        {selectedDocInfo ? `Dr ${selectedDocInfo.firstName} ${selectedDocInfo.lastName} (${selectedDocInfo.specialization || 'General'})` : <span className="text-slate-400 italic font-normal">Select a Doctor</span>}
                    </div>

                    {/* Scrollable Slots */}
                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                        {!selectedDoctor ? (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-semibold">Select a Doctor to view schedule</p>
                                </div>
                            </div>
                        ) : schedulerData ? (
                            <div className="divide-y divide-slate-100">
                                {schedulerData.slots.map((slot) => (
                                    <div key={slot.time} className="flex h-10 border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <div className="w-20 border-r border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 select-none shrink-0 font-mono leading-tight">
                                            <span>{slot.time}</span>
                                            <span className="text-[8px] text-slate-400 font-normal">to {slot.endTime}</span>
                                        </div>
                                        <div className="flex-1 relative p-0.5">
                                            {/* Available Slot */}
                                            {slot.isWorkingHour && slot.slotType === 'available' && !slot.bookedApt && (
                                                selectedDateStr < getTodayStr() ? (
                                                    <div 
                                                        className="w-full h-full border border-slate-100 bg-slate-100/50 rounded-sm cursor-not-allowed"
                                                        title="Cannot book past slots"
                                                    ></div>
                                                ) : (
                                                    <div 
                                                        onClick={() => handleSlotClick(slot.time)}
                                                        className="w-full h-full border border-yellow-200/50 cursor-pointer transition-all bg-[#fffbeb] hover:bg-[#fef3c7] rounded-sm"
                                                        title="Click to Book"
                                                    ></div>
                                                )
                                            )}
                                            
                                            {/* Break Slot */}
                                            {slot.isWorkingHour && slot.slotType === 'break' && (
                                                <div className="w-full h-full bg-amber-50 border border-amber-200/50 opacity-80 px-2 flex items-center gap-2 rounded-sm cursor-not-allowed select-none">
                                                    <span className="text-[10px] font-bold text-amber-800">Break</span>
                                                </div>
                                            )}

                                            {/* Blocked Slot */}
                                            {slot.isWorkingHour && slot.slotType === 'blocked' && (
                                                <div className="w-full h-full bg-rose-50 border border-rose-200/50 opacity-80 px-2 flex items-center gap-2 rounded-sm cursor-not-allowed select-none">
                                                    <span className="text-[10px] font-bold text-rose-800">Blocked</span>
                                                </div>
                                            )}

                                            {/* Unavailable / Off-time */}
                                            {!slot.isWorkingHour && (
                                                <div className="w-full h-full repeating-diagonal-stripes"></div>
                                            )}
      
                                            {/* Booked Appointment */}
                                            {slot.isWorkingHour && slot.slotType === 'available' && slot.bookedApt && (
                                                <div className="absolute inset-0.5 bg-blue-50 border-l-4 border-blue-500 rounded-sm px-2 flex items-center gap-2 overflow-hidden shadow-sm z-10 cursor-not-allowed">
                                                    <span className="text-[10px] font-bold text-blue-900 truncate">
                                                        {patients.find(p => p.id === slot.bookedApt?.patientId)?.firstName} {patients.find(p => p.id === slot.bookedApt?.patientId)?.lastName}
                                                    </span>
                                                    <span className="text-[9px] text-blue-700 bg-blue-100 px-1 rounded truncate">
                                                        {slot.bookedApt.visitType || 'New Visit'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-64 border-l border-slate-300 bg-slate-50 flex flex-col shrink-0">
                    
                    {/* Clock / Time */}
                    <div className="bg-white border-b border-slate-200 p-2 text-center text-xs font-bold text-slate-700 font-mono shadow-sm">
                        {new Date().toLocaleString()}
                    </div>

                    {/* Mini Calendar */}
                    <div className="p-2">
                        <MiniCalendar selectedDate={selectedDateObj} onDateSelect={setSelectedDateObj} />
                    </div>

                    {/* Stats */}
                    <div className="px-2 mt-2">
                        <div className="bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-t">
                            Appointment Statistics
                        </div>
                        <div className="bg-white border border-slate-300 border-t-0 p-2 text-xs text-slate-600 rounded-b shadow-sm space-y-1">
                            <div className="font-bold border-b border-slate-100 pb-1 mb-1 text-slate-800 truncate">
                                {selectedDocInfo ? `Dr ${selectedDocInfo.lastName}` : 'No Doctor'}
                            </div>
                            <div className="flex justify-between"><span>Booked:</span> <span>{schedulerData?.slots.filter(s => s.bookedApt).length || 0}</span></div>
                            <div className="flex justify-between"><span>Available:</span> <span>{schedulerData?.slots.filter(s => s.slotType === 'available' && !s.bookedApt).length || 0}</span></div>
                        </div>
                    </div>

                    {/* Waiting List */}
                    <div className="px-2 mt-4 flex-1 flex flex-col min-h-0 mb-2">
                        <div className="bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-t">
                            Waiting List
                        </div>
                        <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-300 border-t-0 p-2 flex-1 rounded-b shadow-sm">
                            <div className="flex gap-1 mb-2">
                                <button className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold transition-colors">Clear</button>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold transition-colors">Search</button>
                            </div>
                            <div className="text-center text-[10px] text-slate-400 italic mt-4">
                                No patients waiting
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

      </div>

      {/* SECTION 2: APPOINTMENT LIST & FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
           <div>
               <h3 className="font-bold text-slate-800 text-lg">Scheduled Appointments</h3>
               <p className="text-slate-500 text-sm">Manage and track patient visits</p>
           </div>
           
           {/* Filters Toolbar */}
           <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
                   <CalendarIcon className="w-4 h-4 text-slate-400 mr-2" />
                   <input 
                        type="date" 
                        className="text-sm outline-none text-slate-600 w-32"
                        placeholder="Start Date"
                        value={filterStartDate}
                        onChange={e => setFilterStartDate(e.target.value)}
                   />
                   <span className="text-slate-300 mx-2">to</span>
                   <input 
                        type="date" 
                        className="text-sm outline-none text-slate-600 w-32"
                        value={filterEndDate}
                        onChange={e => setFilterEndDate(e.target.value)}
                   />
               </div>

               <select 
                    className="bg-white border border-slate-300 text-slate-600 text-sm rounded-lg px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterDoctorId}
                    onChange={e => setFilterDoctorId(e.target.value)}
               >
                   <option value="">All Doctors</option>
                   {allDoctors.map(doc => <option key={doc.id} value={doc.id}>Dr. {doc.lastName}</option>)}
               </select>

               <select 
                    className="bg-white border border-slate-300 text-slate-600 text-sm rounded-lg px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
               >
                   <option value="All">All Status</option>
                   <option value="Scheduled">Scheduled</option>
                   <option value="Completed">Completed</option>
                   <option value="Cancelled">Cancelled</option>
               </select>

               <button 
                  onClick={() => {
                      setFilterStartDate(''); setFilterEndDate(''); setFilterDoctorId(''); setFilterStatus('All');
                  }}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Reset Filters"
               >
                   <RefreshCw className="w-4 h-4" />
               </button>
           </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Date & Time</th>
                        <th className="px-6 py-4 font-semibold">Patient</th>
                        <th className="px-6 py-4 font-semibold">Doctor</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Symptoms/Notes</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                    <Filter className="w-8 h-8 mb-2 opacity-30" />
                                    No appointments found matching your filters.
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredAppointments.map(apt => {
                            const patient = patients.find(p => p.id === apt.patientId);
                            const doctor = employees.find(e => e.id === apt.doctorId);
                            const dept = departments.find(d => d.id === apt.departmentId);
                            
                            return (
                                <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{new Date(apt.date).toLocaleDateString()}</div>
                                        <div className="text-slate-500 flex items-center text-xs mt-0.5">
                                            <Clock className="w-3 h-3 mr-1" /> {apt.time}
                                        </div>
                                        <div className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wide">
                                            {apt.visitType || 'New Visit'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{patient?.firstName} {patient?.lastName}</div>
                                        <div className="text-xs text-slate-400">{patient?.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        Dr. {doctor?.firstName} {doctor?.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs">
                                            {dept?.name || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            apt.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                            apt.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                 apt.status === 'Scheduled' ? 'bg-blue-600' :
                                                 apt.status === 'Completed' ? 'bg-green-600' :
                                                 'bg-red-600'
                                            }`}></span>
                                            {apt.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate text-slate-500" title={apt.symptoms}>
                                        {apt.symptoms || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {apt.status === 'Scheduled' && (
                                            <button 
                                                onClick={() => handleCancelClick(apt.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                                                title="Cancel Appointment"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => { setIsBookingModalOpen(false); setPendingPrefillProfile(null); }} 
        initialData={bookingSlotDetails}
        prefillProfile={pendingPrefillProfile}
      />

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 m-4 scale-100 animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-900">Cancel Appointment</h3>
                          <p className="text-sm text-slate-500">Are you sure you want to cancel?</p>
                      </div>
                  </div>
                  
                  <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                      This action will change the appointment status to 'Cancelled'. This action cannot be undone immediately unless re-booked.
                  </p>
                  
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => { setIsCancelModalOpen(false); setAppointmentToCancel(null); }}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                      >
                          No, Keep it
                      </button>
                      <button 
                          onClick={confirmCancel}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg shadow-red-200 transition-colors"
                      >
                          Yes, Cancel Appointment
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
