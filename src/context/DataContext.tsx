import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Patient, Employee, Department, Unit, ServiceCentre, 
  DoctorAvailability, Appointment, ToastMessage, Bill, Payment,
  VitalSign, Diagnosis, ClinicalNote, Allergy, NarrativeDiagnosis, MasterDiagnosis, ServiceDefinition, AppUser, ServiceTariff, ServiceOrder, VitalSignGroup, VitalSignParameter
} from '../types';
import { 
    getSupabase, 
    checkConfigured, 
    saveCredentialsToStorage, 
    clearCredentialsFromStorage 
} from '../services/supabaseClient';

interface DataContextType {
  user: AppUser | null;
  login: (u: string, p: string) => Promise<boolean>;
  loginDemo: () => boolean;
  logout: () => void;

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

  masterDiagnoses: MasterDiagnosis[];
  uploadMasterDiagnoses: (data: MasterDiagnosis[]) => Promise<void>;

  serviceDefinitions: ServiceDefinition[];
  serviceTariffs: ServiceTariff[];
  saveServiceDefinition: (service: ServiceDefinition) => void;
  uploadServiceDefinitions: (services: ServiceDefinition[]) => Promise<void>;
  
  availabilities: DoctorAvailability[];
  saveAvailability: (avail: DoctorAvailability) => void;
  deleteAvailability: (id: string) => void;
  
  appointments: Appointment[];
  bookAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;

  bills: Bill[];
  createBill: (bill: Bill, linkedOrderIds?: string[]) => Promise<boolean>;
  cancelBill: (id: string) => Promise<boolean>;
  addPayment: (payment: Payment, billId: string) => void;

  vitals: VitalSign[];
  diagnoses: Diagnosis[];
  narrativeDiagnoses: NarrativeDiagnosis[];
  clinicalNotes: ClinicalNote[];
  allergies: Allergy[];
  serviceOrders: ServiceOrder[]; // NEW
  vitalSignGroups: VitalSignGroup[];
  vitalSignParameters: VitalSignParameter[];

  addVitalSignGroup: (group: VitalSignGroup) => void;
  saveVitalSignParameter: (parameter: VitalSignParameter) => void;
  deleteVitalSignParameter: (id: string) => void;
  
  saveVitalSign: (vital: VitalSign) => void;
  saveDiagnosis: (diagnosis: Diagnosis) => void;
  deleteDiagnosis: (id: string) => void;
  saveNarrativeDiagnosis: (nd: NarrativeDiagnosis) => void;
  saveClinicalNote: (note: ClinicalNote) => void;
  saveAllergy: (allergy: Allergy) => void;
  saveServiceOrders: (orders: ServiceOrder[]) => void; // NEW
  
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
  isLoading: boolean;
  isDbConnected: boolean;
  updateDbConnection: (url: string, key: string) => void;
  disconnectDb: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [user, setUser] = useState<AppUser | null>(() => {
      const saved = localStorage.getItem('medicore_user');
      return saved ? JSON.parse(saved) : null;
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [serviceCentres, setServiceCentres] = useState<ServiceCentre[]>([]);
  const [masterDiagnoses, setMasterDiagnoses] = useState<MasterDiagnosis[]>([]);
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>([]);
  const [serviceTariffs, setServiceTariffs] = useState<ServiceTariff[]>([]);
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [narrativeDiagnoses, setNarrativeDiagnoses] = useState<NarrativeDiagnosis[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [vitalSignGroups, setVitalSignGroups] = useState<VitalSignGroup[]>([
    { id: 'vsg-1', name: 'Vital Sign', status: 'Active' }
  ]);
  const [vitalSignParameters, setVitalSignParameters] = useState<VitalSignParameter[]>([
    { id: 'vsp-1', groupId: 'vsg-1', name: 'Weight', controlType: 'Text', referenceRangeMin: '15.0', referenceRangeMax: '50.0', isActive: true },
    { id: 'vsp-2', groupId: 'vsg-1', name: 'BMI', controlType: 'Formula', referenceRangeMin: '18.5', referenceRangeMax: '24.9', isActive: true },
    { id: 'vsp-3', groupId: 'vsg-1', name: 'Pulse', controlType: 'Text', referenceRangeMin: '50.0', referenceRangeMax: '80.0', isActive: true },
    { id: 'vsp-4', groupId: 'vsg-1', name: 'RR', controlType: 'Text', referenceRangeMin: '12.0', referenceRangeMax: '20.0', isActive: true },
    { id: 'vsp-5', groupId: 'vsg-1', name: 'Intravascular diastolic', controlType: 'Text', referenceRangeMin: '60.0', referenceRangeMax: '90.0', isActive: true },
    { id: 'vsp-6', groupId: 'vsg-1', name: 'MAP', controlType: 'Formula', referenceRangeMin: '60.0', referenceRangeMax: '110.0', isActive: true },
    { id: 'vsp-7', groupId: 'vsg-1', name: 'Oxygen Saturation', controlType: 'Text', referenceRangeMin: '94.0', referenceRangeMax: '100.0', isActive: true },
    { id: 'vsp-8', groupId: 'vsg-1', name: 'Height', controlType: 'Text', referenceRangeMin: '100.0', referenceRangeMax: '270.0', isActive: true },
    { id: 'vsp-9', groupId: 'vsg-1', name: 'Temperature', controlType: 'Text', referenceRangeMin: '36.5', referenceRangeMax: '37.4', isActive: true },
    { id: 'vsp-10', groupId: 'vsg-1', name: 'Intravascular systolic', controlType: 'Text', referenceRangeMin: '95.0', referenceRangeMax: '140.0', isActive: true },
  ]);

  const addVitalSignGroup = async (group: VitalSignGroup) => {
    if (!requireDb()) return;
    setVitalSignGroups(prev => [...prev, group]);
    const { error } = await getSupabase().from('vital_sign_groups').insert(mapVitalSignGroupToDb(group));
    if (error) {
        showToast('error', `Failed to save group: ${error.message}`);
        setVitalSignGroups(prev => prev.filter(g => g.id !== group.id));
    } else {
        showToast('success', 'Vital Sign Group added.');
    }
  };

  const saveVitalSignParameter = async (parameter: VitalSignParameter) => {
    if (!requireDb()) return;
    const originalParameters = [...vitalSignParameters];
    
    setVitalSignParameters(prev => {
        const exists = prev.find(p => p.id === parameter.id);
        if (exists) return prev.map(p => p.id === parameter.id ? parameter : p);
        return [...prev, parameter];
    });

    const { error } = await getSupabase().from('vital_sign_parameters').upsert(mapVitalSignParameterToDb(parameter));
    
    if (error) {
        showToast('error', `Failed to save parameter: ${error.message}`);
        setVitalSignParameters(originalParameters);
    } else {
        showToast('success', 'Vital Sign Parameter saved.');
    }
  };

  const deleteVitalSignParameter = async (id: string) => {
    if (!requireDb()) return;
    const original = vitalSignParameters.find(p => p.id === id);
    setVitalSignParameters(prev => prev.filter(p => p.id !== id));
    
    const { error } = await getSupabase().from('vital_sign_parameters').delete().eq('id', id);
    
    if (error) {
        showToast('error', `Failed to remove parameter: ${error.message}`);
        if (original) setVitalSignParameters(prev => [...prev, original]);
    } else {
        showToast('info', 'Vital Sign Parameter removed.');
    }
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(checkConfigured());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Mappers ---
  const mapDeptFromDb = (d: any): Department => ({ id: d.id, name: d.name, code: d.code, status: d.status });
  
  const mapEmpFromDb = (e: any): Employee => ({
    id: e.id, firstName: e.first_name, lastName: e.last_name, email: e.email, phone: e.phone,
    role: e.role, departmentId: e.department_id, specialization: e.specialization, status: e.status
  });
  const mapEmpToDb = (e: any) => ({
    id: e.id, first_name: e.firstName, last_name: e.lastName, email: e.email, phone: e.phone,
    role: e.role, department_id: e.departmentId, specialization: e.specialization, status: e.status
  });

  const mapPatientFromDb = (p: any): Patient => ({
    id: p.id, firstName: p.first_name, lastName: p.last_name, dob: p.dob, gender: p.gender,
    phone: p.phone, email: p.email, address: p.address, registrationDate: p.registration_date
  });
  const mapPatientToDb = (p: any) => ({
    id: p.id, first_name: p.firstName, last_name: p.lastName, dob: p.dob, gender: p.gender,
    phone: p.phone, email: p.email, address: p.address, registration_date: p.registrationDate
  });

  const mapAvailFromDb = (a: any): DoctorAvailability => ({
    id: a.id, doctorId: a.doctor_id, dayOfWeek: a.day_of_week, startTime: a.start_time,
    endTime: a.end_time, slotDurationMinutes: a.slot_duration_minutes
  });
  const mapAvailToDb = (a: any) => ({
    id: a.id, doctor_id: a.doctorId, day_of_week: a.dayOfWeek, start_time: a.startTime,
    end_time: a.endTime, slot_duration_minutes: a.slot_duration_minutes
  });

  const mapAptFromDb = (a: any): Appointment => ({
    id: a.id, patientId: a.patient_id, doctorId: a.doctor_id, departmentId: a.department_id,
    date: a.date, time: a.time, status: a.status, symptoms: a.symptoms, notes: a.notes,
    visitType: a.visit_type, paymentMode: a.payment_mode, checkInTime: a.check_in_time, checkOutTime: a.check_out_time
  });
  const mapAptToDb = (a: any) => ({
    id: a.id, patient_id: a.patientId, doctor_id: a.doctorId, department_id: a.departmentId,
    date: a.date, time: a.time, status: a.status, symptoms: a.symptoms, notes: a.notes,
    visit_type: a.visitType, payment_mode: a.paymentMode, check_in_time: a.checkInTime, check_out_time: a.checkOutTime
  });

  const mapBillFromDb = (b: any, items: any[], payments: any[]): Bill => ({
    id: b.id, patientId: b.patient_id, appointmentId: b.appointment_id, date: b.date,
    status: b.status, totalAmount: b.total_amount, paidAmount: b.paid_amount,
    items: items.map(i => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total })),
    payments: payments.map(p => ({ id: p.id, date: p.date, amount: p.amount, method: p.method, reference: p.reference }))
  });

  const mapVitalFromDb = (v: any): VitalSign => ({
    id: v.id, appointmentId: v.appointment_id, recordedAt: v.recorded_at,
    bpSystolic: v.bp_systolic, bpDiastolic: v.bp_diastolic, temperature: v.temperature,
    pulse: v.pulse, respiratoryRate: v.respiratory_rate, weight: v.weight, height: v.height,
    bmi: v.bmi, spo2: v.spo2, map: v.map, tobaccoUse: v.tobacco_use, rowRemarks: v.row_remarks
  });
  const mapVitalToDb = (v: any) => ({
    id: v.id, appointment_id: v.appointmentId, recorded_at: v.recordedAt,
    bp_systolic: v.bpSystolic, bp_diastolic: v.bpDiastolic, temperature: v.temperature,
    pulse: v.pulse, respiratory_rate: v.respiratoryRate, weight: v.weight, height: v.height,
    bmi: v.bmi, spo2: v.spo2, map: v.map, tobacco_use: v.tobaccoUse, row_remarks: v.rowRemarks
  });

  const mapDiagnosisFromDb = (d: any): Diagnosis => ({
    id: d.id, appointmentId: d.appointment_id, code: d.code, icdCode: d.icd_code, description: d.description,
    type: d.type, isPoa: d.is_poa, addedAt: d.added_at
  });
  const mapDiagnosisToDb = (d: any) => ({
    id: d.id, appointment_id: d.appointmentId, code: d.code, icd_code: d.icdCode, description: d.description,
    type: d.type, is_poa: d.isPoa, added_at: d.addedAt
  });

  const mapNarrativeFromDb = (n: any): NarrativeDiagnosis => ({
    id: n.id, appointmentId: n.appointment_id, illness: n.illness, illnessDurationValue: n.illness_duration_value,
    illnessDurationUnit: n.illness_duration_unit, behaviouralActivity: n.behavioural_activity, narrative: n.narrative, recordedAt: n.recorded_at
  });
  const mapNarrativeToDb = (n: any) => ({
    id: n.id, appointment_id: n.appointmentId, illness: n.illness, illness_duration_value: n.illnessDurationValue,
    illness_duration_unit: n.illnessDurationUnit, behavioural_activity: n.behaviouralActivity, narrative: n.narrative, recorded_at: n.recordedAt
  });

  const mapNoteFromDb = (n: any): ClinicalNote => ({
    id: n.id, appointmentId: n.appointment_id, noteType: n.note_type, description: n.description, recordedAt: n.recorded_at
  });
  const mapNoteToDb = (n: any) => ({
    id: n.id, appointment_id: n.appointmentId, note_type: n.noteType, description: n.description, recorded_at: n.recordedAt
  });

  const mapAllergyFromDb = (a: any): Allergy => ({
    id: a.id, patientId: a.patient_id, allergen: a.allergen, severity: a.severity, reaction: a.reaction, status: a.status,
    allergyType: a.allergy_type, onsetDate: a.onset_date, resolvedDate: a.resolved_date, remarks: a.remarks
  });
  const mapAllergyToDb = (a: any) => ({
    id: a.id, patient_id: a.patientId, allergen: a.allergen, severity: a.severity, reaction: a.reaction, status: a.status,
    allergy_type: a.allergyType, 
    onset_date: a.onsetDate || null, 
    resolved_date: a.resolvedDate || null, 
    remarks: a.remarks
  });

  const mapMasterDiagFromDb = (m: any): MasterDiagnosis => ({
      id: m.id, code: m.code, description: m.description, status: m.status
  });

  const mapServiceDefFromDb = (s: any): ServiceDefinition => ({
      id: s.id, code: s.code, name: s.name, alternateName: s.alternate_name, 
      serviceType: s.service_type, serviceCategory: s.service_category, estDuration: s.est_duration,
      status: s.status, chargeable: s.chargeable, applicableVisitType: s.applicable_visit_type,
      applicableGender: s.applicable_gender, reOrderDuration: s.re_order_duration,
      autoCancellationDays: s.auto_cancellation_days, minTimeBilling: s.min_time_billing,
      maxTimeBilling: s.max_time_billing, maxOrderableQty: s.max_orderable_qty,
      cptCode: s.cpt_code, nphiesCode: s.nphies_code, nphiesDesc: s.nphies_desc,
      schedulable: s.schedulable, surgicalService: s.surgical_service, individuallyOrderable: s.individually_orderable,
      autoProcessable: s.auto_processable, consentRequired: s.consent_required, isRestricted: s.is_restricted,
      isExternal: s.is_external, isPercentageTariff: s.is_percentage_tariff, isToothMandatory: s.is_tooth_mandatory,
      isAuthRequired: s.is_auth_required, groupName: s.group_name, billingGroupName: s.billing_group_name,
      financialGroup: s.financial_group, cptDescription: s.cpt_description, specialInstructions: s.special_instructions
  });
  const mapServiceDefToDb = (s: any) => ({
      id: s.id, code: s.code, name: s.name, alternate_name: s.alternateName,
      service_type: s.serviceType, service_category: s.serviceCategory, est_duration: s.estDuration,
      status: s.status, chargeable: s.chargeable, applicable_visit_type: s.applicableVisitType,
      applicable_gender: s.applicableGender, re_order_duration: s.reOrderDuration,
      auto_cancellation_days: s.autoCancellationDays, min_time_billing: s.minTimeBilling,
      max_time_billing: s.maxTimeBilling, max_orderable_qty: s.maxOrderableQty,
      cpt_code: s.cptCode, nphies_code: s.nphiesCode, nphies_desc: s.nphies_desc,
      schedulable: s.schedulable, surgical_service: s.surgicalService, individually_orderable: s.individuallyOrderable,
      auto_processable: s.autoProcessable, consent_required: s.consentRequired, is_restricted: s.isRestricted,
      is_external: s.isExternal, is_percentage_tariff: s.isPercentageTariff, is_tooth_mandatory: s.isToothMandatory,
      is_auth_required: s.isAuthRequired, group_name: s.groupName, billing_group_name: s.billingGroupName,
      financial_group: s.financialGroup, cpt_description: s.cptDescription, special_instructions: s.special_instructions
  });

  const mapTariffFromDb = (t: any): ServiceTariff => ({
      id: t.id, serviceId: t.service_id, tariffName: t.tariff_name, price: t.price, effectiveDate: t.effective_date, status: t.status
  });
  const mapTariffToDb = (t: any) => ({
      id: t.id, service_id: t.serviceId, tariff_name: t.tariffName, price: t.price, effective_date: t.effectiveDate, status: t.status
  });

  const mapOrderFromDb = (o: any): ServiceOrder => ({
      id: o.id, appointmentId: o.appointment_id, serviceId: o.service_id, serviceName: o.service_name,
      cptCode: o.cpt_code, quantity: o.quantity, unitPrice: o.unit_price, discountAmount: o.discount_amount,
      totalPrice: o.total_price, orderDate: o.order_date, status: o.status, billingStatus: o.billing_status,
      priority: o.priority, orderingDoctorId: o.ordering_doctor_id, instructions: o.instructions, serviceCenter: o.service_center
  });
  const mapOrderToDb = (o: any) => ({
      id: o.id, appointment_id: o.appointmentId, service_id: o.serviceId, service_name: o.serviceName,
      cpt_code: o.cptCode, quantity: o.quantity, unit_price: o.unitPrice, discount_amount: o.discountAmount,
      total_price: o.totalPrice, order_date: o.orderDate, status: o.status, billing_status: o.billingStatus,
      priority: o.priority, ordering_doctor_id: o.orderingDoctorId, instructions: o.instructions, service_center: o.serviceCenter
  });


  const mapVitalSignGroupFromDb = (g: any): VitalSignGroup => ({
    id: g.id, name: g.name, status: g.status
  });
  const mapVitalSignGroupToDb = (g: VitalSignGroup) => ({
    id: g.id, name: g.name, status: g.status
  });

  const mapVitalSignParameterFromDb = (p: any): VitalSignParameter => ({
    id: p.id, groupId: p.group_id, name: p.name, controlType: p.control_type,
    referenceRangeMin: p.reference_range_min, referenceRangeMax: p.reference_range_max,
    unit: p.unit, isActive: p.is_active, formula: p.formula
  });
  const mapVitalSignParameterToDb = (p: VitalSignParameter) => ({
    id: p.id, group_id: p.groupId, name: p.name, control_type: p.controlType,
    reference_range_min: p.referenceRangeMin, reference_range_max: p.referenceRangeMax,
    unit: p.unit, is_active: p.isActive, formula: p.formula
  });

  // --- Initial Fetch ---

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      if (!checkConfigured()) {
        setIsDbConnected(false);
        // Only show info toast on initial load, not subsequent refresh
        if (refreshTrigger === 0) {
            // showToast('info', 'Please configure Database Connection in the menu.');
        }
        setIsLoading(false);
        return;
      }

      setIsDbConnected(true);
      const supabase = getSupabase();

      // Only fetch data if user is logged in
      if (!user) {
          setIsLoading(false);
          return;
      }

      try {
        // Create a timeout promise (15 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Data sync timed out. Check your connection.')), 15000)
        );

        const fetchPromise = Promise.all([
          supabase.from('patients').select('*'),
          supabase.from('employees').select('*'),
          supabase.from('departments').select('*'),
          supabase.from('units').select('*'),
          supabase.from('service_centres').select('*'),
          supabase.from('doctor_availability').select('*'),
          supabase.from('appointments').select('*'),
          supabase.from('bills').select('*'),
          supabase.from('bill_items').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('clinical_vitals').select('*'),
          supabase.from('clinical_diagnoses').select('*'),
          supabase.from('clinical_notes').select('*'),
          supabase.from('clinical_allergies').select('*'),
          supabase.from('clinical_narrative_diagnoses').select('*'),
          supabase.from('master_diagnoses').select('*'),
          supabase.from('service_definitions').select('*'),
          supabase.from('service_tariffs').select('*'),
          supabase.from('service_orders').select('*'),
          supabase.from('vital_sign_groups').select('*'),
          supabase.from('vital_sign_parameters').select('*'),
        ]);

        const [pRes, eRes, dRes, uRes, sRes, avRes, apRes, bRes, biRes, payRes, vRes, diRes, notRes, alRes, narRes, mdRes, sdRes, stRes, ordRes, vsgRes, vspRes] = 
            await Promise.race([fetchPromise, timeoutPromise]) as any[];

        if (pRes.error) throw pRes.error;

        if (pRes.data) setPatients(pRes.data.map(mapPatientFromDb));
        if (eRes.data) setEmployees(eRes.data.map(mapEmpFromDb));
        if (dRes.data) setDepartments(dRes.data.map(mapDeptFromDb));
        if (uRes.data) setUnits(uRes.data.map(mapDeptFromDb)); 
        if (sRes.data) setServiceCentres(sRes.data.map(mapDeptFromDb));
        if (avRes.data) setAvailabilities(avRes.data.map(mapAvailFromDb));
        if (apRes.data) setAppointments(apRes.data.map(mapAptFromDb));
        if (vRes.data) setVitals(vRes.data.map(mapVitalFromDb));
        if (diRes.data) setDiagnoses(diRes.data.map(mapDiagnosisFromDb));
        if (notRes.data) setClinicalNotes(notRes.data.map(mapNoteFromDb));
        if (alRes.data) setAllergies(alRes.data.map(mapAllergyFromDb));
        if (narRes.data) setNarrativeDiagnoses(narRes.data.map(mapNarrativeFromDb));
        if (mdRes.data) setMasterDiagnoses(mdRes.data.map(mapMasterDiagFromDb));
        if (sdRes.data) setServiceDefinitions(sdRes.data.map(mapServiceDefFromDb));
        if (stRes.data) setServiceTariffs(stRes.data.map(mapTariffFromDb));
        if (ordRes.data) setServiceOrders(ordRes.data.map(mapOrderFromDb));
        if (vsgRes.data && vsgRes.data.length > 0) setVitalSignGroups(vsgRes.data.map(mapVitalSignGroupFromDb));
        if (vspRes.data && vspRes.data.length > 0) setVitalSignParameters(vspRes.data.map(mapVitalSignParameterFromDb));

        if (bRes.data) {
            const rawBills = bRes.data;
            const rawItems = biRes.data || [];
            const rawPayments = payRes.data || [];

            const structuredBills = rawBills.map((b: any) => {
                const myItems = rawItems.filter((i: any) => i.bill_id === b.id);
                const myPayments = rawPayments.filter((p: any) => p.bill_id === b.id);
                return mapBillFromDb(b, myItems, myPayments);
            });
            setBills(structuredBills);
        }
        
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
  }, [refreshTrigger, user]); // Refetch on login

  // --- Actions ---

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      showToast(type, message);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateDbConnection = (url: string, key: string) => {
      saveCredentialsToStorage(url, key);
      setIsDbConnected(true);
      setRefreshTrigger(prev => prev + 1);
  };

  const disconnectDb = () => {
      clearCredentialsFromStorage();
      setIsDbConnected(false);
      logout();
      showToast('info', 'Disconnected from database.');
  };

  const requireDb = (): boolean => {
      if (!checkConfigured()) {
          showToast('error', 'Database not connected.');
          return false;
      }
      return true;
  };

  // --- Auth Actions ---

  const login = async (username: string, password: string): Promise<boolean> => {
      if (!checkConfigured()) {
          showToast('error', 'Please configure database connection first');
          return false;
      }

      setIsLoading(true);
      const supabase = getSupabase();
      
      try {
          // Add 10s timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out. Check your internet or DB URL.')), 10000)
          );

          const { data, error } = await Promise.race([
              supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single(),
              timeoutPromise
          ]) as any;

          if (error || !data) {
              console.error("Login error:", error);
              showToast('error', error?.message || 'Invalid username or password');
              setIsLoading(false);
              return false;
          }

          const loggedUser: AppUser = {
              id: data.id,
              username: data.username,
              role: data.role,
              fullName: data.full_name || 'User',
              employeeId: data.employee_id
          };

          setUser(loggedUser);
          localStorage.setItem('medicore_user', JSON.stringify(loggedUser));
          showToast('success', `Welcome back, ${loggedUser.fullName}`);
          return true;
      } catch (e: any) {
          console.error("Login exception:", e);
          showToast('error', e.message || 'Login failed');
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  const loginDemo = () => {
      const demoUser: AppUser = {
          id: 'demo-user',
          username: 'demo',
          role: 'Administrator',
          fullName: 'Demo Admin',
          employeeId: 'DEMO-001'
      };
      setUser(demoUser);
      localStorage.setItem('medicore_user', JSON.stringify(demoUser));
      showToast('success', 'Logged in to Demo Mode');
      return true;
  };

  const logout = () => {
      setUser(null);
      localStorage.removeItem('medicore_user');
      
      // Clear data states
      setPatients([]); setEmployees([]); setDepartments([]); setAppointments([]); setAvailabilities([]); setBills([]); setVitals([]); setDiagnoses([]); setClinicalNotes([]); setAllergies([]); setNarrativeDiagnoses([]); setMasterDiagnoses([]); setServiceDefinitions([]); setServiceTariffs([]); setVitalSignGroups([]); setVitalSignParameters([]);
  };

  // ... (Keep existing ADD/UPDATE functions - Ensure they check requireDb)
  const addPatient = async (p: Patient) => {
    if (!requireDb()) return;
    setPatients(prev => [...prev, p]);
    const { error } = await getSupabase().from('patients').insert(mapPatientToDb(p));
    if (error) { showToast('error', `DB Error: ${error.message}`); setPatients(prev => prev.filter(pat => pat.id !== p.id)); } 
    else showToast('success', `Patient ${p.firstName} registered.`);
  };

  const updatePatient = async (id: string, data: Partial<Patient>) => {
    if (!requireDb()) return;
    const original = patients.find(p => p.id === id);
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
    if (error) { showToast('error', `Update failed: ${error.message}`); if (original) setPatients(prev => prev.map(p => p.id === id ? original : p)); } 
    else showToast('success', 'Patient updated successfully.');
  };

  const addEmployee = async (e: Employee) => {
    if (!requireDb()) return;
    setEmployees(prev => [...prev, e]);
    const { error } = await getSupabase().from('employees').insert(mapEmpToDb(e));
    if (error) { showToast('error', `Failed to save: ${error.message}`); setEmployees(prev => prev.filter(emp => emp.id !== e.id)); }
    else showToast('success', `${e.role} added.`);
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    if (!requireDb()) return;
    const original = employees.find(e => e.id === id);
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...data } : emp));
    const updatedEmp = employees.find(e => e.id === id);
    if(updatedEmp) {
        const fullNewData = { ...updatedEmp, ...data };
        const { error } = await getSupabase().from('employees').update(mapEmpToDb(fullNewData)).eq('id', id);
        if (error) { showToast('error', `Update failed: ${error.message}`); if (original) setEmployees(prev => prev.map(emp => emp.id === id ? original : emp)); }
        else showToast('success', 'Employee updated.');
    }
  };

  const addDepartment = async (d: Department) => {
    if (!requireDb()) return;
    setDepartments(prev => [...prev, d]);
    const { error } = await getSupabase().from('departments').insert(d);
    if(error) { showToast('error', error.message); setDepartments(prev => prev.filter(dept => dept.id !== d.id)); }
    else showToast('success', 'Department added.');
  };

  const addUnit = async (u: Unit) => {
    if (!requireDb()) return;
    setUnits(prev => [...prev, u]);
    const { error } = await getSupabase().from('units').insert(u);
    if(error) { showToast('error', error.message); setUnits(prev => prev.filter(unit => unit.id !== u.id)); }
    else showToast('success', 'Unit added.');
  };

  const addServiceCentre = async (s: ServiceCentre) => {
    if (!requireDb()) return;
    setServiceCentres(prev => [...prev, s]);
    const { error } = await getSupabase().from('service_centres').insert(s);
    if(error) { showToast('error', error.message); setServiceCentres(prev => prev.filter(sc => sc.id !== s.id)); }
    else showToast('success', 'Service Centre added.');
  };

  const uploadMasterDiagnoses = async (data: MasterDiagnosis[]) => {
      if (!requireDb()) return;
      
      setMasterDiagnoses(prev => [...prev, ...data]); 
      const dbData = data.map(d => ({
          id: d.id,
          code: d.code,
          description: d.description,
          status: d.status
      }));

      const { error } = await getSupabase().from('master_diagnoses').insert(dbData);
      
      if (error) {
          showToast('error', `Bulk upload failed: ${error.message}`);
          setRefreshTrigger(prev => prev + 1);
      } else {
          showToast('success', `${data.length} diagnoses imported successfully.`);
      }
  };

  const saveServiceDefinition = async (service: ServiceDefinition) => {
      if (!requireDb()) return;
      
      // Optimistic update for Service Definition
      setServiceDefinitions(prev => {
          const exists = prev.find(s => s.id === service.id);
          if (exists) return prev.map(s => s.id === service.id ? service : s);
          return [...prev, service];
      });

      // Save Service
      const { error } = await getSupabase().from('service_definitions').upsert(mapServiceDefToDb(service));
      
      if (error) { 
          showToast('error', `Failed to save service: ${error.message}`); 
          setServiceDefinitions(prev => prev.filter(s => s.id !== service.id));
          return;
      }

      // Handle Tariffs if provided
      if (service.tariffs && service.tariffs.length > 0) {
          // Remove tariffs for this service first (simple replacement strategy) or upsert
          // For now, let's just upsert
          const tariffPayload = service.tariffs.map(t => mapTariffToDb(t));
          
          const { error: tariffError } = await getSupabase().from('service_tariffs').upsert(tariffPayload);
          
          if (tariffError) {
              console.error(tariffError);
              showToast('error', 'Service saved, but failed to save tariffs.');
          } else {
              // Update local tariff state
              setServiceTariffs(prev => {
                  const others = prev.filter(t => t.serviceId !== service.id);
                  return [...others, ...service.tariffs!];
              });
          }
      }

      showToast('success', 'Service saved successfully.');
  };

  const uploadServiceDefinitions = async (incomingServices: ServiceDefinition[]) => {
      if (!requireDb()) return;
      
      // We need to check if services already exist by CODE.
      // If yes -> Update (preserve ID)
      // If no -> Insert (use new ID)
      
      const upsertPayload: any[] = [];
      const tariffsToInsert: any[] = [];
      const serviceIdsToCleanTariffs: string[] = [];
      
      // Create a map of current services for fast lookup
      const currentServiceMap = new Map(serviceDefinitions.map(s => [s.code, s]));
      
      // We will perform local state update at end or via refresh
      
      for (const incoming of incomingServices) {
          const existing = currentServiceMap.get(incoming.code);
          
          let finalId = incoming.id;
          
          if (existing) {
              // Code exists: Use existing ID to update, but take other fields from incoming
              finalId = existing.id;
          }
          
          // Prepare DB Object
          const mergedService = { ...incoming, id: finalId };
          upsertPayload.push(mapServiceDefToDb(mergedService));
          
          // Identify IDs for tariff cleanup (we will replace tariffs for these services)
          serviceIdsToCleanTariffs.push(finalId);
          
          // Prepare Tariffs
          if (incoming.tariffs) {
              incoming.tariffs.forEach(t => {
                  // Ensure the tariff points to the correct Service ID (existing or new)
                  // Note: The tariff ID itself was generated in frontend parser, which is fine for new insert.
                  tariffsToInsert.push(mapTariffToDb({
                      ...t,
                      serviceId: finalId
                  }));
              });
          }
      }

      // 1. Upsert Services
      const { error: serviceError } = await getSupabase().from('service_definitions').upsert(upsertPayload);
      
      if (serviceError) {
          showToast('error', `Bulk upload failed: ${serviceError.message}`);
          setRefreshTrigger(prev => prev + 1); // Revert local state
          return;
      }

      // 2. Handle Tariffs (Delete old for these services, insert new)
      if (serviceIdsToCleanTariffs.length > 0) {
          // Delete existing tariffs for the services we just updated/inserted
          await getSupabase().from('service_tariffs').delete().in('service_id', serviceIdsToCleanTariffs);
          
          // Insert the new tariffs from the Excel file
          if (tariffsToInsert.length > 0) {
              const { error: tariffError } = await getSupabase().from('service_tariffs').insert(tariffsToInsert);
              if (tariffError) {
                  console.error("Tariff upload error", tariffError);
                  showToast('error', `Services uploaded, but tariff update failed: ${tariffError.message}`);
              }
          }
      }

      showToast('success', `${incomingServices.length} services processed successfully.`);
      setRefreshTrigger(prev => prev + 1); // Refresh local state to reflect updates
  };

  const saveAvailability = async (avail: DoctorAvailability) => {
    if (!requireDb()) return;
    setAvailabilities(prev => {
      const filtered = prev.filter(a => !(a.doctorId === avail.doctorId && a.dayOfWeek === avail.dayOfWeek));
      return [...filtered, avail];
    });
    const { error } = await getSupabase().from('doctor_availability').insert(mapAvailToDb(avail));
    if(error) { showToast('error', `Failed to save schedule: ${error.message}`); }
    else showToast('success', 'Schedule updated.');
  };

  const deleteAvailability = async (id: string) => {
    if (!requireDb()) return;
    const original = availabilities.find(a => a.id === id);
    setAvailabilities(prev => prev.filter(a => a.id !== id));
    const { error } = await getSupabase().from('doctor_availability').delete().eq('id', id);
    if (error) { showToast('error', 'Failed to delete schedule.'); if (original) setAvailabilities(prev => [...prev, original]); }
  };

  const bookAppointment = async (apt: Appointment) => {
    if (!requireDb()) return;
    setAppointments(prev => [...prev, apt]);
    const { error } = await getSupabase().from('appointments').insert(mapAptToDb(apt));
    if (error) { showToast('error', `Failed to book: ${error.message}`); setAppointments(prev => prev.filter(a => a.id !== apt.id)); }
    else showToast('success', 'Appointment booked successfully!');
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    if (!requireDb()) return;
    const original = appointments.find(a => a.id === id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    const fullData = { ...original, ...data };
    const { error } = await getSupabase().from('appointments').update(mapAptToDb(fullData)).eq('id', id);
    if (error) { showToast('error', `Failed to update: ${error.message}`); if (original) setAppointments(prev => prev.map(a => a.id === id ? original : a)); }
    else showToast('success', 'Appointment updated.');
  };

  const cancelAppointment = async (id: string) => {
    if (!requireDb()) return;
    const original = appointments.find(a => a.id === id);
    if (!original) return;
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    const { error } = await getSupabase().from('appointments').update({ status: 'Cancelled' }).eq('id', id);
    if (error) { showToast('error', 'Failed to cancel.'); setAppointments(prev => prev.map(a => a.id === id ? original : a)); }
    else showToast('success', 'Appointment cancelled.');
  };

  const createBill = async (bill: Bill, linkedOrderIds?: string[]): Promise<boolean> => {
      if (!requireDb()) return false;
      
      // Optimistic update
      setBills(prev => [bill, ...prev]);

      const { error: billError } = await getSupabase().from('bills').insert({
          id: bill.id, 
          patient_id: bill.patientId, 
          appointment_id: bill.appointmentId || null, 
          date: bill.date,
          status: bill.status, 
          total_amount: bill.totalAmount, 
          paid_amount: bill.paidAmount
      });

      if (billError) { 
          showToast('error', 'Failed to create bill: ' + billError.message); 
          setBills(prev => prev.filter(b => b.id !== bill.id)); 
          return false; 
      }

      const itemsDb = bill.items.map(i => ({ 
          id: i.id, 
          bill_id: bill.id, 
          description: i.description, 
          quantity: Number(i.quantity), 
          unit_price: Number(i.unitPrice), 
          total: Number(i.total) 
      }));
      
      const { error: itemsError } = await getSupabase().from('bill_items').insert(itemsDb);
      
      if (itemsError) { 
          showToast('error', 'Failed to save bill items: ' + itemsError.message);
          // Optional: Delete the bill if items failed? For now, keep it as it might be manually fixable or retryable logic could be added.
          return false;
      } 

      // NEW: Update status of linked service orders
      if (linkedOrderIds && linkedOrderIds.length > 0) {
          const { error: orderError } = await getSupabase()
              .from('service_orders')
              .update({ billing_status: 'Invoiced' })
              .in('id', linkedOrderIds);
          
          if (orderError) {
              console.error("Failed to update order status", orderError);
              showToast('info', 'Bill created, but failed to update order status.');
          } else {
              // Update local state for immediate UI reflection
              setServiceOrders(prev => prev.map(o => 
                  linkedOrderIds.includes(o.id) ? { ...o, billingStatus: 'Invoiced' } : o
              ));
          }
      }
      
      showToast('success', 'Invoice generated successfully.');
      return true;
  };

  const cancelBill = async (id: string): Promise<boolean> => {
      if (!requireDb()) return false;
      
      const original = bills.find(b => b.id === id);
      if (!original) return false;

      // Optimistic update
      setBills(prev => prev.map(b => b.id === id ? { ...b, status: 'Cancelled' } : b));

      const { error } = await getSupabase().from('bills').update({ status: 'Cancelled' }).eq('id', id);
      
      if (error) {
          showToast('error', 'Failed to cancel bill: ' + error.message);
          // Revert
          setBills(prev => prev.map(b => b.id === id ? original : b));
          return false;
      }
      
      showToast('success', 'Invoice cancelled.');
      return true;
  };

  const addPayment = async (payment: Payment, billId: string) => {
      if (!requireDb()) return;
      setBills(prev => prev.map(b => {
          if (b.id !== billId) return b;
          const newPaidAmount = Number(b.paidAmount) + Number(payment.amount);
          let newStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Partial';
          if (newPaidAmount >= b.totalAmount) newStatus = 'Paid';
          return { ...b, paidAmount: newPaidAmount, status: newStatus, payments: [...b.payments, payment] };
      }));
      const { error: payError } = await getSupabase().from('payments').insert({
          id: payment.id, bill_id: billId, date: payment.date, amount: payment.amount, method: payment.method, reference: payment.reference
      });
      if (payError) { showToast('error', 'Failed to record payment.'); return; }
      
      const bill = bills.find(b => b.id === billId);
      if (bill) {
          const newTotalPaid = Number(bill.paidAmount) + Number(payment.amount);
          let newStatus = 'Partial';
          if (newTotalPaid >= bill.totalAmount) newStatus = 'Paid';
          await getSupabase().from('bills').update({ paid_amount: newTotalPaid, status: newStatus }).eq('id', billId);
      }
      showToast('success', 'Payment recorded.');
  };

  const saveVitalSign = async (vital: VitalSign) => {
      if (!requireDb()) return;
      setVitals(prev => {
          const exists = prev.find(v => v.id === vital.id);
          if (exists) return prev.map(v => v.id === vital.id ? vital : v);
          return [...prev, vital];
      });
      const { error } = await getSupabase().from('clinical_vitals').upsert(mapVitalToDb(vital));
      if (error) { showToast('error', 'Failed to save vitals: ' + error.message); }
      else showToast('success', 'Vitals captured.');
  };

  const saveDiagnosis = async (diagnosis: Diagnosis) => {
      if (!requireDb()) return;
      setDiagnoses(prev => [...prev, diagnosis]);
      const { error } = await getSupabase().from('clinical_diagnoses').insert(mapDiagnosisToDb(diagnosis));
      if (error) { 
          let msg = error.message;
          if (msg.includes('icd_code') || msg.includes('is_poa')) msg += " (Please run migration SQL)";
          showToast('error', `Failed to save diagnosis: ${msg}`); 
          setDiagnoses(prev => prev.filter(d => d.id !== diagnosis.id)); 
      }
  };

  const deleteDiagnosis = async (id: string) => {
      if (!requireDb()) return;
      const original = diagnoses.find(d => d.id === id);
      setDiagnoses(prev => prev.filter(d => d.id !== id));
      const { error } = await getSupabase().from('clinical_diagnoses').delete().eq('id', id);
      if (error) { 
          showToast('error', 'Failed to delete diagnosis');
          if (original) setDiagnoses(prev => [...prev, original]);
      }
  };

  const saveNarrativeDiagnosis = async (nd: NarrativeDiagnosis) => {
      if (!requireDb()) return;
      setNarrativeDiagnoses(prev => {
          const exists = prev.find(n => n.id === nd.id || n.appointmentId === nd.appointmentId);
          if (exists) return prev.map(n => n.appointmentId === nd.appointmentId ? nd : n);
          return [...prev, nd];
      });
      const { error } = await getSupabase().from('clinical_narrative_diagnoses').upsert(mapNarrativeToDb(nd));
      if (error) { showToast('error', 'Failed to save narrative: ' + error.message); }
  };

  const saveClinicalNote = async (note: ClinicalNote) => {
      if (!requireDb()) return;
      setClinicalNotes(prev => {
          const existing = prev.find(n => n.appointmentId === note.appointmentId && n.noteType === note.noteType);
          if (existing) { return prev.map(n => n.id === existing.id ? note : n); }
          return [...prev, note];
      });
      const { error } = await getSupabase().from('clinical_notes').upsert(mapNoteToDb(note));
      if (error) showToast('error', 'Failed to save note.');
      else showToast('success', 'Note saved.');
  };

  const saveAllergy = async (allergy: Allergy) => {
      if (!requireDb()) return;
      setAllergies(prev => [...prev, allergy]);
      const { error } = await getSupabase().from('clinical_allergies').insert(mapAllergyToDb(allergy));
      if (error) { 
          let userMsg = error.message;
          if (userMsg.includes('allergy_type')) userMsg += " (Please run migration SQL)";
          showToast('error', `Failed: ${userMsg}`); 
          setAllergies(prev => prev.filter(a => a.id !== allergy.id)); 
      }
      else showToast('success', 'Allergy recorded.');
  };

  const saveServiceOrders = async (orders: ServiceOrder[]) => {
      if (!requireDb()) return;
      
      setServiceOrders(prev => [...prev, ...orders]);
      const dbPayload = orders.map(o => mapOrderToDb(o));
      
      const { error } = await getSupabase().from('service_orders').insert(dbPayload);
      if (error) {
          showToast('error', `Failed to save orders: ${error.message}`);
          // Fix: use Set to safely check IDs and avoid type errors
          const orderIds = new Set(orders.map(o => o.id));
          setServiceOrders(prev => prev.filter(p => !orderIds.has(p.id))); 
      } else {
          showToast('success', `${orders.length} service(s) ordered.`);
      }
  };

  return (
    <DataContext.Provider value={{
      user, login, loginDemo, logout,
      patients, addPatient, updatePatient,
      employees, addEmployee, updateEmployee,
      departments, addDepartment,
      units, addUnit,
      serviceCentres, addServiceCentre,
      masterDiagnoses, uploadMasterDiagnoses,
      serviceDefinitions, serviceTariffs, saveServiceDefinition, uploadServiceDefinitions,
      availabilities, saveAvailability, deleteAvailability,
      appointments, bookAppointment, updateAppointment, cancelAppointment,
      bills, createBill, cancelBill, addPayment,
      vitals, diagnoses, narrativeDiagnoses, clinicalNotes, allergies, 
      saveVitalSign, saveDiagnosis, deleteDiagnosis, saveNarrativeDiagnosis, saveClinicalNote, saveAllergy,
      serviceOrders, saveServiceOrders,
      vitalSignGroups, vitalSignParameters, addVitalSignGroup, saveVitalSignParameter, deleteVitalSignParameter,
      toasts, showToast, addToast, removeToast,
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