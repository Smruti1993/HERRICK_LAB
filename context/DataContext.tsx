import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Patient, Employee, Department, Unit, ServiceCentre, 
  DoctorAvailability, Appointment, ToastMessage 
} from '../types';
import { 
    getSupabase, 
    checkConfigured, 
    saveCredentialsToStorage, 
    clearCredentialsFromStorage 
} from '../services/supabaseClient';

interface DataContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  
  employees: Employee[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  
  departments: Department[];
  addDepartment: (dept: Department) => void;
  
  units: Unit[];
  addUnit: (unit: Unit) => void;
  
  serviceCentres: ServiceCentre[];
  addServiceCentre: (sc: ServiceCentre) => void;
  
  availabilities: DoctorAvailability[];
  saveAvailability: (avail: DoctorAvailability) => void;
  deleteAvailability: (id: string) => void;
  
  appointments: Appointment[];
  bookAppointment: (apt: Appointment) => void;
  cancelAppointment: (id: string) => void;
  
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  
  isLoading: boolean;
  isDbConnected: boolean;
  updateDbConnection: (url: string, key: string) => void;
  disconnectDb: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [serviceCentres, setServiceCentres] = useState<ServiceCentre[]>([]);
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(checkConfigured());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Helpers for Snake Case (DB) <-> Camel Case (App) Mapping ---
  const mapDeptFromDb = (d: any): Department => ({ id: d.id, name: d.name, code: d.code, status: d.status });
  const mapServiceCentreFromDb = (d: any): ServiceCentre => ({ id: d.id, name: d.name, code: d.code, status: d.status, departmentId: d.department_id });
  
  const mapEmpFromDb = (e: any): Employee => ({
    id: e.id,
    firstName: e.first_name,
    lastName: e.last_name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    departmentId: e.department_id,
    specialization: e.specialization,
    status: e.status
  });

  const mapEmpToDb = (e: any) => ({
    id: e.id,
    first_name: e.firstName,
    last_name: e.lastName,
    email: e.email,
    phone: e.phone,
    role: e.role,
    department_id: e.departmentId,
    specialization: e.specialization,
    status: e.status
  });

  const mapPatientFromDb = (p: any): Patient => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    dob: p.dob,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    address: p.address,
    registrationDate: p.registration_date
  });

  const mapPatientToDb = (p: any) => ({
    id: p.id,
    first_name: p.firstName,
    last_name: p.lastName,
    dob: p.dob,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    address: p.address,
    registration_date: p.registrationDate
  });

  const mapAvailFromDb = (a: any): DoctorAvailability => ({
    id: a.id,
    doctorId: a.doctor_id,
    dayOfWeek: a.day_of_week,
    startTime: a.start_time,
    endTime: a.end_time,
    slotDurationMinutes: a.slot_duration_minutes
  });

  const mapAvailToDb = (a: any) => ({
    id: a.id,
    doctor_id: a.doctorId,
    day_of_week: a.dayOfWeek,
    start_time: a.startTime,
    end_time: a.endTime,
    slot_duration_minutes: a.slotDurationMinutes
  });

  const mapAptFromDb = (a: any): Appointment => ({
    id: a.id,
    patientId: a.patient_id,
    doctorId: a.doctor_id,
    departmentId: a.department_id,
    date: a.date,
    time: a.time,
    status: a.status,
    symptoms: a.symptoms,
    notes: a.notes
  });

  const mapAptToDb = (a: any) => ({
    id: a.id,
    patient_id: a.patientId,
    doctor_id: a.doctorId,
    department_id: a.departmentId,
    date: a.date,
    time: a.time,
    status: a.status,
    symptoms: a.symptoms,
    notes: a.notes
  });

  // --- Initial Fetch ---

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      if (!checkConfigured()) {
        setIsDbConnected(false);
        // Only show info toast on initial load, not subsequent refresh
        if (refreshTrigger === 0) {
            showToast('info', 'Please configure Database Connection in the menu.');
        }
        setIsLoading(false);
        return;
      }

      setIsDbConnected(true);
      const supabase = getSupabase();

      try {
        const [pRes, eRes, dRes, uRes, sRes, avRes, apRes] = await Promise.all([
          supabase.from('patients').select('*'),
          supabase.from('employees').select('*'),
          supabase.from('departments').select('*'),
          supabase.from('units').select('*'),
          supabase.from('service_centres').select('*'),
          supabase.from('doctor_availability').select('*'),
          supabase.from('appointments').select('*'),
        ]);

        if (pRes.error) throw pRes.error;

        if (pRes.data) setPatients(pRes.data.map(mapPatientFromDb));
        if (eRes.data) setEmployees(eRes.data.map(mapEmpFromDb));
        if (dRes.data) setDepartments(dRes.data.map(mapDeptFromDb));
        if (uRes.data) setUnits(uRes.data.map(mapDeptFromDb)); 
        if (sRes.data) setServiceCentres(sRes.data.map(mapServiceCentreFromDb));
        if (avRes.data) setAvailabilities(avRes.data.map(mapAvailFromDb));
        if (apRes.data) setAppointments(apRes.data.map(mapAptFromDb));
        
        showToast('success', 'Data synced with database.');
      } catch (error: any) {
        console.error("Error fetching data:", error);
        // Better error message
        let msg = 'Failed to connect to database.';
        if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
            msg = 'Connected, but tables are missing. Please check your DB schema.';
        } else if (error.message?.includes('FetchError')) {
             msg = 'Network error or invalid URL.';
        }
        showToast('error', msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [refreshTrigger]);

  // --- Actions ---

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateDbConnection = (url: string, key: string) => {
      saveCredentialsToStorage(url, key);
      setIsDbConnected(true);
      setRefreshTrigger(prev => prev + 1); // Trigger re-fetch
  };

  const disconnectDb = () => {
      clearCredentialsFromStorage();
      setIsDbConnected(false);
      setPatients([]);
      setEmployees([]);
      setDepartments([]);
      setAppointments([]);
      setAvailabilities([]);
      showToast('info', 'Disconnected from database.');
  };

  const addPatient = async (p: Patient) => {
    setPatients(prev => [...prev, p]);
    const { error } = await getSupabase().from('patients').insert(mapPatientToDb(p));
    if (error) {
      console.error(error);
      showToast('error', 'Failed to save patient to DB');
    } else {
      showToast('success', `Patient ${p.firstName} registered.`);
    }
  };

  const updatePatient = async (id: string, data: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    
    const dbData: any = {};
    if (data.firstName) dbData.first_name = data.firstName;
    if (data.lastName) dbData.last_name = data.lastName;
    if (data.dob) dbData.dob = data.dob;
    if (data.gender) dbData.gender = data.gender;
    if (data.phone) dbData.phone = data.phone;
    if (data.email) dbData.email = data.email;
    if (data.address) dbData.address = data.address;
    
    const { error } = await getSupabase().from('patients').update(dbData).eq('id', id);
    if (error) {
      console.error(error);
      showToast('error', 'Failed to update patient details.');
    } else {
      showToast('success', 'Patient updated successfully.');
    }
  };

  const addEmployee = async (e: Employee) => {
    setEmployees(prev => [...prev, e]);
    const { error } = await getSupabase().from('employees').insert(mapEmpToDb(e));
    if (error) {
       console.error(error);
       showToast('error', 'Failed to save employee.');
    } else {
       showToast('success', `${e.role} added.`);
    }
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    const original = employees.find(e => e.id === id);
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...data } : emp));
    
    if(original) {
        const fullNewData = { ...original, ...data };
        const { error } = await getSupabase().from('employees').update(mapEmpToDb(fullNewData)).eq('id', id);
        if (error) {
            console.error(error);
            showToast('error', 'Failed to update employee in DB.');
        } else {
            showToast('success', 'Employee updated.');
        }
    }
  };

  const addDepartment = async (d: Department) => {
    setDepartments(prev => [...prev, d]);
    const { error } = await getSupabase().from('departments').insert(d);
    if(error) showToast('error', error.message);
    else showToast('success', 'Department added.');
  };

  const addUnit = async (u: Unit) => {
    setUnits(prev => [...prev, u]);
    const { error } = await getSupabase().from('units').insert(u);
    if(error) showToast('error', error.message);
    else showToast('success', 'Unit added.');
  };

  const addServiceCentre = async (s: ServiceCentre) => {
    setServiceCentres(prev => [...prev, s]);
    const { id, name, code, status, departmentId } = s;
    const { error } = await getSupabase().from('service_centres').insert({ id, name, code, status, department_id: departmentId });
    if(error) showToast('error', error.message);
    else showToast('success', 'Service Centre added.');
  };

  const saveAvailability = async (avail: DoctorAvailability) => {
    setAvailabilities(prev => {
      const filtered = prev.filter(a => !(a.doctorId === avail.doctorId && a.dayOfWeek === avail.dayOfWeek));
      return [...filtered, avail];
    });

    const { error } = await getSupabase().from('doctor_availability').insert(mapAvailToDb(avail));
    if(error) showToast('error', 'Failed to save schedule.');
    else showToast('success', 'Schedule updated.');
  };

  const deleteAvailability = async (id: string) => {
    setAvailabilities(prev => prev.filter(a => a.id !== id));
    const { error } = await getSupabase().from('doctor_availability').delete().eq('id', id);
    if (error) showToast('error', 'Failed to delete schedule from DB.');
  };

  const bookAppointment = async (apt: Appointment) => {
    setAppointments(prev => [...prev, apt]);
    const { error } = await getSupabase().from('appointments').insert(mapAptToDb(apt));
    if (error) {
        console.error(error);
        showToast('error', 'Failed to book appointment.');
    } else {
        showToast('success', 'Appointment booked successfully!');
    }
  };

  const cancelAppointment = async (id: string) => {
    const original = appointments.find(a => a.id === id);
    if (!original) return;

    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));

    const { error } = await getSupabase().from('appointments').update({ status: 'Cancelled' }).eq('id', id);
    
    if (error) {
        console.error("Cancel error:", error);
        showToast('error', 'Failed to cancel appointment. Reverting...');
        setAppointments(prev => prev.map(a => a.id === id ? original : a));
    } else {
        showToast('success', 'Appointment cancelled successfully.');
    }
  };

  return (
    <DataContext.Provider value={{
      patients, addPatient, updatePatient,
      employees, addEmployee, updateEmployee,
      departments, addDepartment,
      units, addUnit,
      serviceCentres, addServiceCentre,
      availabilities, saveAvailability, deleteAvailability,
      appointments, bookAppointment, cancelAppointment,
      toasts, showToast, removeToast,
      isLoading, isDbConnected, updateDbConnection, disconnectDb
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};