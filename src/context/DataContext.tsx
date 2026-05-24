import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Patient, Employee, Department, Unit, ServiceCentre, 
  DoctorAvailability, Appointment, ToastMessage, Bill, Payment,
  VitalSign, Diagnosis, ClinicalNote, Allergy, NarrativeDiagnosis, MasterDiagnosis, DentalICD, ServiceDefinition, AppUser, ServiceTariff, ServiceOrder, VitalSignGroup, VitalSignParameter, PatientDocument, InventoryItem, InventoryItemStock, InventoryItemPricing, Branch, Store, StoreItemMapping, OpeningStock, StockLedgerEntry, DashboardMetrics, DirectSale, Prescription, PrescriptionItem, DrugGeneric, DrugMaster, TaxMaster, ItemTaxMapping, Organization, OrganizationContact, SponsorTariff
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

  dentalICDs: DentalICD[];
  saveDentalICD: (icd: DentalICD) => void;
  uploadDentalICDs: (icds: DentalICD[]) => Promise<void>;
  deleteDentalICD: (id: string) => void;
  
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
  prescriptions: Prescription[]; // NEW
  serviceOrders: ServiceOrder[]; 
  vitalSignGroups: VitalSignGroup[];
  vitalSignParameters: VitalSignParameter[];
  patientDocuments: PatientDocument[];
  inventoryItems: InventoryItem[];
  branches: Branch[];
  saveBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;

  stores: Store[];
  saveStore: (store: Store) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;

  storeItemMappings: StoreItemMapping[];
  saveStoreItemMapping: (mapping: StoreItemMapping) => Promise<void>;
  deleteStoreItemMapping: (id: string) => Promise<void>;

  openingStocks: OpeningStock[];
  saveOpeningStock: (stock: OpeningStock) => Promise<void>;
  
  saveDirectSale: (sale: DirectSale) => Promise<boolean>;
  fetchBatchDetails: (storeId: string, itemId: string) => Promise<Array<{ batchNo: string, currentStock: number, mrp: number, expiryDate?: string }>>;
  
  fetchStockLedger: (filters: { storeId: string; fromDate?: string; toDate?: string; itemCategory?: string; searchQuery?: string }) => Promise<StockLedgerEntry[]>;
  fetchDashboardMetrics: (storeId: string) => Promise<DashboardMetrics | null>;
  repairPh000006: (storeId: string) => Promise<void>;
  dispensePrescription: (prescriptionId: string, storeId: string, allocatedBatches: Record<string, { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount?: number }>) => Promise<{ success: boolean; invoiceId?: string }>;
  processPharmacyReturn: (originalBillId: string, storeId: string, returns: Array<{ itemId: string, batchNo: string, qty: number, rate: number, description: string, taxPercentage?: number }>) => Promise<{ success: boolean; invoiceId?: string }>;
  fetchBillItems: (billId: string) => Promise<Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number; itemId?: string; batchNo?: string; returnedQty: number; taxPercentage: number; taxAmount: number; }>>;
  addVitalSignGroup: (group: VitalSignGroup) => void;
  saveVitalSignParameter: (parameter: VitalSignParameter) => void;
  deleteVitalSignParameter: (id: string) => void;
  
  saveInventoryItem: (item: InventoryItem) => Promise<void>;
  uploadInventoryItems: (items: InventoryItem[]) => Promise<void>;

  saveVitalSign: (vital: VitalSign) => void;
  saveDiagnosis: (diagnosis: Diagnosis) => void;
  deleteDiagnosis: (id: string) => void;
  saveNarrativeDiagnosis: (nd: NarrativeDiagnosis) => void;
  saveClinicalNote: (note: ClinicalNote) => void;
  saveAllergy: (allergy: Allergy) => void;
  savePrescription: (prescription: Prescription) => Promise<boolean>; // NEW
  saveServiceOrders: (orders: ServiceOrder[]) => Promise<void>;
  cancelServiceOrder: (orderId: string) => Promise<void>;
  drugGenerics: DrugGeneric[];
  drugMasters: DrugMaster[];
  saveDrugMaster: (mapping: DrugMaster) => Promise<boolean>;
  deleteDrugMaster: (id: string) => Promise<boolean>;
  savePatientDocument: (doc: PatientDocument) => Promise<void>;
  deletePatientDocument: (id: string) => Promise<void>;
  
  taxMasters: TaxMaster[];
  saveTaxMaster: (tax: TaxMaster) => Promise<void>;
  deleteTaxMaster: (id: string) => Promise<void>;
  itemTaxMappings: ItemTaxMapping[];
  saveItemTaxMapping: (mapping: ItemTaxMapping) => Promise<void>;
  deleteItemTaxMapping: (id: string) => Promise<void>;

  organizations: Organization[];
  saveOrganization: (org: Organization) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
  sponsorTariffs: SponsorTariff[];
  saveSponsorTariff: (tariff: SponsorTariff) => Promise<void>;
  saveSponsorTariffBatch: (tariffs: SponsorTariff[]) => Promise<void>;
  deleteSponsorTariff: (id: string) => Promise<void>;
  resolveNegotiatedPrice: (sponsorId: string | undefined | null, itemType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES', itemCodeOrId: string, className?: string) => number;
  getBasePrice: (itemType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES', itemCodeOrId: string) => number;
  
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
  const [taxMasters, setTaxMasters] = useState<TaxMaster[]>([]);
  const [itemTaxMappings, setItemTaxMappings] = useState<ItemTaxMapping[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dentalICDs, setDentalICDs] = useState<DentalICD[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [narrativeDiagnoses, setNarrativeDiagnoses] = useState<NarrativeDiagnosis[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]); // NEW
  const [drugGenerics, setDrugGenerics] = useState<DrugGeneric[]>([]);
  const [drugMasters, setDrugMasters] = useState<DrugMaster[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeItemMappings, setStoreItemMappings] = useState<StoreItemMapping[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStock[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sponsorTariffs, setSponsorTariffs] = useState<SponsorTariff[]>(() => {
      const saved = localStorage.getItem('medicore_sponsor_tariffs');
      return saved ? JSON.parse(saved) : [];
  });


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
  const mapBranchFromDb = (b: any): Branch => ({ id: b.id, name: b.name, code: b.code, status: b.status });
  const mapBranchToDb = (b: Branch) => ({ id: b.id, name: b.name, code: b.code, status: b.status });
  
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
    id: b.id, 
    invoiceNo: b.invoice_no,
    patientId: b.patient_id, 
    appointmentId: b.appointment_id, 
    date: b.date,
    status: b.status, 
    totalAmount: Number(b.total_amount || 0), 
    paidAmount: Number(b.paid_amount || 0),
    discountAmount: Number(b.discount_amount || 0),
    taxAmount: Number(b.tax_amount || 0),
    roundOff: Number(b.round_off || 0),
    paymentMode: b.payment_mode,
    amountReceived: Number(b.amount_received || 0),
    referenceNo: b.reference_no,
    notes: b.notes,
    departmentId: b.department_id,
    isPharmacy: !!(b.is_pharmacy || (b.invoice_no && (b.invoice_no.startsWith('PH-') || b.invoice_no.startsWith('INV-D-')))),
    prescriptionId: b.prescription_id,
    doctorId: b.doctor_id,
    createdBy: b.created_by,
    items: items.map(i => ({ 
        id: i.id, 
        description: i.description, 
        quantity: Number(i.quantity || 0), 
        unitPrice: Number(i.unit_price || 0), 
        total: Number(i.total || 0),
        itemId: i.item_id,
        batchNo: i.batch_no,
        discountAmount: Number(i.discount_amount || 0),
        discountPercentage: Number(i.discount_percentage || 0),
        taxAmount: Number(i.tax_amount || 0),
        taxPercentage: Number(i.tax_percentage || 0),
        itemType: i.item_type
    })),
    payments: payments.map(p => ({ id: p.id, date: p.date, amount: Number(p.amount || 0), method: p.method, reference: p.reference }))
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
      priority: o.priority, orderingDoctorId: o.ordering_doctor_id, instructions: o.instructions, serviceCenter: o.service_center,
      toothNumbers: o.tooth_numbers, dentalSelections: o.dental_selections || []
  });
  const mapOrderToDb = (o: any) => ({
      id: o.id, appointment_id: o.appointmentId, service_id: o.serviceId, service_name: o.serviceName,
      cpt_code: o.cptCode, quantity: o.quantity, unit_price: o.unitPrice, discount_amount: o.discountAmount,
      total_price: o.totalPrice, order_date: o.orderDate, status: o.status, billing_status: o.billingStatus,
      priority: o.priority, ordering_doctor_id: o.orderingDoctorId, instructions: o.instructions, service_center: o.serviceCenter,
      tooth_numbers: o.toothNumbers, dental_selections: o.dentalSelections || []
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

  const mapDocumentFromDb = (d: any): PatientDocument => ({
    id: d.id, patientId: d.patient_id, appointmentId: d.appointment_id, name: d.name,
    fileType: d.file_type, fileData: d.file_data, uploadedAt: d.uploaded_at,
    uploadedBy: d.uploaded_by, size: d.size
  });
  const mapDocumentToDb = (d: PatientDocument) => ({
    id: d.id, patient_id: d.patientId, appointment_id: d.appointmentId, name: d.name,
    file_type: d.fileType, file_data: d.fileData, uploaded_at: d.uploadedAt,
    uploaded_by: d.uploadedBy, size: d.size
  });

  const mapInventoryStockFromDb = (s: any): InventoryItemStock => ({
    id: s.id,
    itemId: s.item_id,
    vedCategory: s.ved_category,
    isReusable: s.is_reusable,
    itemRate: s.item_rate,
    fsnType: s.fsn_type,
    isBulky: s.is_bulky,
    cycleCountFrequency: s.cycle_count_frequency,
    reusableCount: s.reusable_count,
    reservedQty: s.reserved_qty,
    manufacturerName: s.manufacturer_name
  });

  const mapInventoryStockToDb = (s: InventoryItemStock) => ({
    id: s.id,
    item_id: s.itemId,
    ved_category: s.vedCategory,
    is_reusable: s.isReusable,
    item_rate: s.itemRate,
    fsn_type: s.fsnType,
    is_bulky: s.isBulky,
    cycle_count_frequency: s.cycleCountFrequency,
    reusable_count: s.reusableCount,
    reserved_qty: s.reservedQty,
    manufacturer_name: s.manufacturerName
  });

  const mapInventoryPricingFromDb = (p: any): InventoryItemPricing => ({
    id: p.id,
    itemId: p.item_id,
    branchId: p.branch_id,
    branchName: p.branch_name,
    pricingMethod: p.pricing_method,
    price: p.price,
    markupPercentage: p.markup_percentage
  });

  const mapInventoryPricingToDb = (p: InventoryItemPricing) => ({
    id: p.id,
    item_id: p.itemId,
    branch_id: p.branchId,
    branch_name: p.branchName,
    pricing_method: p.pricingMethod,
    price: p.price,
    markup_percentage: p.markupPercentage
  });

  const mapTaxMasterFromDb = (t: any): TaxMaster => ({
    id: t.id,
    taxName: t.tax_name,
    percentage: Number(t.percentage),
    status: t.status,
    createdAt: t.created_at
  });

  const mapTaxMasterToDb = (t: TaxMaster) => ({
    id: t.id,
    tax_name: t.taxName,
    percentage: t.percentage,
    status: t.status
  });

  const mapItemTaxMappingFromDb = (m: any): ItemTaxMapping => ({
    id: m.id,
    itemId: m.item_id,
    taxId: m.tax_id,
    createdAt: m.created_at
  });

  const mapItemTaxMappingToDb = (m: ItemTaxMapping) => ({
    id: m.id,
    item_id: m.itemId,
    tax_id: m.taxId
  });

  const mapInventoryItemFromDb = (i: any): InventoryItem => ({
    id: i.id,
    itemCode: i.item_code,
    itemName: i.item_name,
    itemDescription: i.item_description,
    arabicName: i.arabic_name,
    itemType: i.item_type,
    itemCategory: i.item_category,
    itemGroup: i.item_group,
    itemClass: i.item_class,
    stockType: i.stock_type,
    procurementType: i.procurement_type,
    baseUom: i.base_uom,
    trackUom: i.track_uom,
    distributionCategory: i.distribution_category,
    purchaseOrganisation: i.purchase_organisation,
    shelfLifeLimit: i.shelf_life_limit,
    itemSpecification: i.item_specification,
    sfda: i.sfda,
    gtin: i.gtin,
    nphiesDrugType: i.nphies_drug_type,
    isInventorised: i.is_inventorised,
    isBatchTracked: i.is_batch_tracked,
    isExpiryDateRequired: i.is_expiry_date_required,
    isSerialized: i.is_serialized,
    isActive: i.is_active,
    isApprovalRequired: i.is_approval_required,
    isInsuranceCover: i.is_insurance_cover,
    drugSubGroups: i.drug_sub_groups,
    purchaseUom: i.purchase_uom,
    salesUom: i.sales_uom,
    defaultPricingMethod: i.default_pricing_method,
    defaultMarkupPercentage: i.default_markup_percentage,
    branch: i.branch,
    purchaseInventoryAcc: i.purchase_inventory_acc,
    costOfSalesAcc: i.cost_of_sales_acc,
    saleAccount: i.sale_account,
    reorderLevel: i.reorder_level ?? undefined,
    minStockLevel: i.min_stock_level ?? undefined,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    stock: (i.stock && i.stock.length > 0) ? mapInventoryStockFromDb(i.stock[0]) : (i.stock && !Array.isArray(i.stock) ? mapInventoryStockFromDb(i.stock) : undefined),
    pricing: i.pricing ? (Array.isArray(i.pricing) ? i.pricing.map(mapInventoryPricingFromDb) : [mapInventoryPricingFromDb(i.pricing)]) : []
  });

  const mapStoreFromDb = (s: any): Store => ({
    id: s.id,
    storeCode: s.store_code,
    storeName: s.store_name,
    branchId: s.branch_id,
    branchName: s.branches?.name || s.branch_name, // Support join or denormalized
    status: s.status,
    isActive: s.is_active,
    createdAt: s.created_at
  });

  const mapStoreToDb = (s: Store) => ({
    id: s.id,
    store_code: s.storeCode,
    store_name: s.storeName,
    branch_id: s.branchId,
    status: s.status,
    is_active: s.isActive
  });

  const mapStoreMappingFromDb = (m: any): StoreItemMapping => ({
    id: m.id,
    storeId: m.store_id,
    itemId: m.item_id
  });

  const mapStoreMappingToDb = (m: StoreItemMapping) => ({
    id: m.id,
    store_id: m.storeId,
    item_id: m.itemId
  });

  const mapInventoryItemToDb = (i: InventoryItem) => ({
    id: i.id,
    item_code: i.itemCode,
    item_name: i.itemName,
    item_description: i.itemDescription,
    arabic_name: i.arabicName,
    item_type: i.itemType,
    item_category: i.itemCategory,
    item_group: i.itemGroup,
    item_class: i.itemClass,
    stock_type: i.stockType,
    procurement_type: i.procurementType,
    base_uom: i.baseUom,
    track_uom: i.trackUom,
    distribution_category: i.distributionCategory,
    purchase_organisation: i.purchaseOrganisation,
    shelf_life_limit: i.shelfLifeLimit,
    item_specification: i.itemSpecification,
    sfda: i.sfda,
    gtin: i.gtin,
    nphies_drug_type: i.nphiesDrugType,
    is_inventorised: i.isInventorised,
    is_batch_tracked: i.isBatchTracked,
    is_expiry_date_required: i.isExpiryDateRequired,
    is_serialized: i.isSerialized,
    is_active: i.isActive,
    is_approval_required: i.isApprovalRequired,
    is_insurance_cover: i.isInsuranceCover,
    drug_sub_groups: i.drugSubGroups,
    purchase_uom: i.purchaseUom,
    sales_uom: i.salesUom,
    default_pricing_method: i.defaultPricingMethod,
    default_markup_percentage: i.defaultMarkupPercentage,
    branch: i.branch,
    purchase_inventory_acc: i.purchaseInventoryAcc,
    cost_of_sales_acc: i.costOfSalesAcc,
    sale_account: i.saleAccount,
    reorder_level: i.reorderLevel,
    min_stock_level: i.minStockLevel
  });

  const mapPrescriptionItemFromDb = (i: any): PrescriptionItem => ({
      id: i.id,
      prescriptionId: i.prescription_id,
      genericName: i.generic_name,
      itemId: i.item_id,
      itemName: i.inventory_items?.item_name || '',
      itemCode: i.inventory_items?.item_code || '',
      frequency: i.frequency,
      dose: i.dose,
      units: i.units,
      intakeQty: Number(i.intake_qty),
      startDate: i.start_date,
      noDays: i.no_days,
      totalQty: Number(i.total_qty),
      drugInstruction: i.drug_instruction,
      remarks: i.remarks,
      status: i.status
  });

  const mapPrescriptionFromDb = (p: any): Prescription => ({
      id: p.id,
      appointmentId: p.appointment_id,
      patientId: p.patient_id,
      doctorId: p.doctor_id,
      doctorName: p.employees ? `Dr. ${p.employees.first_name} ${p.employees.last_name}` : 'Unknown Doctor',
      orderDate: p.order_date,
      orderType: p.order_type,
      status: p.status,
      totalAmount: Number(p.total_amount),
      items: p.prescription_items ? p.prescription_items.map(mapPrescriptionItemFromDb) : []
  });

  const mapPrescriptionToDb = (p: Prescription) => ({
      id: p.id,
      appointment_id: p.appointmentId,
      patient_id: p.patientId,
      doctor_id: p.doctorId || null,
      order_date: p.orderDate,
      order_type: p.orderType,
      status: p.status,
      total_amount: p.totalAmount
  });

  const mapPrescriptionItemToDb = (i: any) => ({
      id: i.id,
      prescription_id: i.prescriptionId,
      generic_name: i.genericName,
      item_id: i.itemId,
      frequency: i.frequency,
      dose: i.dose,
      units: i.units,
      intake_qty: i.intakeQty,
      start_date: i.startDate,
      no_days: i.noDays,
      total_qty: i.totalQty,
      drug_instruction: i.drugInstruction,
      remarks: i.remarks,
      status: i.status
  });

  const mapDrugGenericFromDb = (r: any): DrugGeneric => ({
    id: r.id,
    genericCode: r.generic_code,
    genericName: r.generic_name,
    groupName: r.group_name,
    strength: r.strength,
    availableForms: r.available_forms,
    formOfAdministration: r.form_of_administration,
    routeOfAdministration: r.route_of_administration,
    isDrugGeneric: r.is_drug_generic,
    isAntibiotic: r.is_antibiotic,
    isNarcotic: r.is_narcotic,
    isActive: r.is_active,
  });

  const mapDrugMasterFromDb = (r: any): DrugMaster => ({
    id: r.id,
    itemId: r.item_id,
    itemCode: r.item_code,
    drugName: r.drug_name,
    genericId: r.generic_id,
    isActive: r.is_active,
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
          supabase.from('bills').select('*').order('date', { ascending: false }).limit(5000),
          supabase.from('bill_items').select('*').limit(10000),
          supabase.from('payments').select('*').limit(5000),
          supabase.from('clinical_vitals').select('*').limit(2000),
          supabase.from('clinical_diagnoses').select('*').limit(2000),
          supabase.from('clinical_notes').select('*').limit(2000),
          supabase.from('clinical_allergies').select('*').limit(1000),
          supabase.from('clinical_narrative_diagnoses').select('*').limit(1000),
          supabase.from('master_diagnoses').select('*').limit(1000),
          supabase.from('service_definitions').select('*').limit(2000),
          supabase.from('service_tariffs').select('*').limit(5000),
          supabase.from('service_orders').select('*').limit(5000),
          supabase.from('vital_sign_groups').select('*'),
          supabase.from('vital_sign_parameters').select('*'),
          supabase.from('patient_documents').select('*'),
          supabase.from('dental_icd_master').select('*'),
          supabase.from('inventory_items').select('*, stock:inventory_item_stocks(*), pricing:inventory_item_pricing(*)'),
          supabase.from('branches').select('*'),
          supabase.from('stores').select('*, branches(name)'),
          supabase.from('store_item_mappings').select('*'),
          supabase.from('inventory_opening_stocks').select('*, items:inventory_opening_stock_items(*)'),
          supabase.from('prescriptions').select('*').order('order_date', { ascending: false }).limit(2000),
          supabase.from('prescription_items').select('*').limit(10000),
          supabase.from('pharmacy_drug_generics').select('*'),
          supabase.from('pharmacy_drug_master').select('*'),
          supabase.from('tax_masters').select('*'),
          supabase.from('item_tax_mappings').select('*'),
          supabase.from('pharmacy_returns').select('*').order('return_date', { ascending: false }).limit(2000),
          supabase.from('pharmacy_return_items').select('*').limit(10000)
        ]);

        const results = await Promise.race([fetchPromise, timeoutPromise]) as any[];
        
        // Detailed error logging
        const tableNames = [
            'patients', 'employees', 'departments', 'units', 'service_centres', 'doctor_availability', 'appointments', 
            'bills', 'bill_items', 'payments', 'clinical_vitals', 'clinical_diagnoses', 'clinical_notes', 
            'clinical_allergies', 'clinical_narrative_diagnoses', 'master_diagnoses', 'service_definitions', 
            'service_tariffs', 'service_orders', 'vital_sign_groups', 'vital_sign_parameters', 'patient_documents', 
            'dental_icd_master', 'inventory_items', 'branches', 'stores', 'store_item_mappings', 
            'inventory_opening_stocks', 'prescriptions', 'prescription_items', 'pharmacy_drug_generics', 'pharmacy_drug_master',
            'tax_masters', 'item_tax_mappings', 'pharmacy_returns', 'pharmacy_return_items'
        ];

        const [
            pRes, eRes, dRes, uRes, sRes, avRes, apRes, bRes, biRes, payRes, 
            vRes, diRes, notRes, alRes, narRes, mdRes, sdRes, stRes, ordRes, 
            vsgRes, vspRes, docRes, denRes, invRes, brRes, stRes2, mRes, osRes, 
            prRes, piRes, dgRes, dmRes, tmRes, itmRes, retRes, retiRes
        ] = results;

        console.log(`Sync: Fetched ${bRes.data?.length || 0} raw bills from DB.`);
        console.log(`Sync complete. Results: ${results.length} tables.`);
        results.forEach((r, idx) => {
            if (r && r.error) {
                console.error(`Sync Failure on table [${tableNames[idx]}]:`, r.error);
                showToast('error', `Sync Error [${tableNames[idx]}]: ${r.error.message}`);
            }
        });
        
        if (retRes && retRes.data) console.log(`Fetched ${retRes.data.length} pharmacy returns.`);

        if (pRes && pRes.data) setPatients(pRes.data.map(mapPatientFromDb));
        if (eRes && eRes.data) setEmployees(eRes.data.map(mapEmpFromDb));
        if (dRes && dRes.data) setDepartments(dRes.data.map(mapDeptFromDb));
        if (uRes && uRes.data) setUnits(uRes.data.map(mapDeptFromDb)); 
        if (sRes && sRes.data) setServiceCentres(sRes.data.map(mapDeptFromDb));
        if (avRes && avRes.data) setAvailabilities(avRes.data.map(mapAvailFromDb));
        if (apRes && apRes.data) setAppointments(apRes.data.map(mapAptFromDb));
        if (vRes && vRes.data) setVitals(vRes.data.map(mapVitalFromDb));
        if (diRes && diRes.data) setDiagnoses(diRes.data.map(mapDiagnosisFromDb));
        if (notRes && notRes.data) setClinicalNotes(notRes.data.map(mapNoteFromDb));
        if (alRes && alRes.data) setAllergies(alRes.data.map(mapAllergyFromDb));
        if (narRes && narRes.data) setNarrativeDiagnoses(narRes.data.map(mapNarrativeFromDb));
        if (mdRes && mdRes.data) setMasterDiagnoses(mdRes.data.map(mapMasterDiagFromDb));
        if (sdRes && sdRes.data) setServiceDefinitions(sdRes.data.map(mapServiceDefFromDb));
        if (stRes && stRes.data) setServiceTariffs(stRes.data.map(mapTariffFromDb));
        if (ordRes && ordRes.data) setServiceOrders(ordRes.data.map(mapOrderFromDb));
        if (vsgRes && vsgRes.data && vsgRes.data.length > 0) setVitalSignGroups(vsgRes.data.map(mapVitalSignGroupFromDb));
        if (vspRes && vspRes.data && vspRes.data.length > 0) setVitalSignParameters(vspRes.data.map(mapVitalSignParameterFromDb));
        if (docRes && docRes.data) setPatientDocuments(docRes.data.map(mapDocumentFromDb));
        if (denRes && denRes.data) setDentalICDs(denRes.data.map(mapMasterDiagFromDb));
        if (invRes && invRes.data) setInventoryItems(invRes.data.map(mapInventoryItemFromDb));
        if (brRes && brRes.data) setBranches(brRes.data.map(mapBranchFromDb));
        if (stRes2 && stRes2.data) setStores(stRes2.data.map(mapStoreFromDb));
        if (mRes && mRes.data) setStoreItemMappings(mRes.data.map(mapStoreMappingFromDb));
        
         if (dgRes && dgRes.data) setDrugGenerics(dgRes.data.map(mapDrugGenericFromDb));
         if (dmRes && dmRes.data) setDrugMasters(dmRes.data.map(mapDrugMasterFromDb));
         if (tmRes && tmRes.data) setTaxMasters(tmRes.data.map(mapTaxMasterFromDb));
         if (itmRes && itmRes.data) setItemTaxMappings(itmRes.data.map(mapItemTaxMappingFromDb));
         if (osRes && osRes.data) {
            const mappedOS = osRes.data.map((os: any) => ({
             id: os.id, storeId: os.store_id, entryDate: os.entry_date, status: os.status,
             items: os.items ? os.items.map((i: any) => ({
               id: i.id, openingStockId: i.opening_stock_id, itemId: i.item_id, itemCode: i.item_code, itemName: i.item_name, itemCategory: i.item_category,
               batchNo: i.batch_no, batchStartDate: i.batch_start_date, batchEndDate: i.batch_end_date, quantity: i.quantity, rate: i.rate, amount: i.amount, mrp: i.mrp
             })) : []
           }));
           setOpeningStocks(mappedOS);
        }

        if (prRes && prRes.data) {
            console.log(`Fetched ${prRes.data.length} prescriptions`);
            const rawPrescriptions = prRes.data;
            const rawItems = piRes?.data || [];
            const mappedInvItems = invRes?.data ? invRes.data.map(mapInventoryItemFromDb) : [];
            
            const structuredPrescriptions = rawPrescriptions.map((p: any) => {
                const myItems = rawItems.filter((i: any) => i.prescription_id === p.id).map((i: any) => {
                    const inv = mappedInvItems.find((item: InventoryItem) => item.id === i.item_id);
                    return {
                        ...i,
                        inventory_items: inv ? { item_name: inv.itemName, item_code: inv.itemCode } : null
                    };
                });

                return mapPrescriptionFromDb({ 
                    ...p, 
                    prescription_items: myItems,
                    total_amount: Number(p.total_amount) || 0 
                });
            });
            
            setPrescriptions(structuredPrescriptions);
        } else if (prRes && prRes.error) {
            console.error("Prescriptions Fetch Error:", prRes.error);
        }

        if (dgRes && dgRes.data) setDrugGenerics(dgRes.data.map(mapDrugGenericFromDb));
        if (dmRes && dmRes.data) setDrugMasters(dmRes.data.map(mapDrugMasterFromDb));

        if (bRes && bRes.data) {
            const rawBills = bRes.data;
            const rawItems = biRes.data || [];
            const rawPayments = payRes.data || [];

            const structuredBills = rawBills.map((b: any) => {
                const myItems = rawItems.filter((i: any) => i.bill_id === b.id);
                const myPayments = rawPayments.filter((p: any) => p.bill_id === b.id);
                return mapBillFromDb(b, myItems, myPayments);
            });

            // Merge Pharmacy Returns as "Bills" for the ledger
            if (retRes && retRes.data) {
                const rawReturns = retRes.data;
                const rawReturnItems = retiRes.data || [];
                console.log(`Mapping ${rawReturns.length} returns and ${rawReturnItems.length} return items`);
                
                rawReturns.forEach((r: any) => {
                    const myReturnItems = rawReturnItems.filter((ri: any) => ri.return_id === r.id);
                    
                    // Critical Fix: Always use the patient from the original bill if possible to ensure ledger consistency
                    let mappedPatientId = r.patient_id;
                    if (r.original_bill_id) {
                        const origBill = structuredBills.find((b: Bill) => b.id === r.original_bill_id);
                        if (origBill) {
                            mappedPatientId = origBill.patientId;
                        }
                    }
                    
                    const returnBill: Bill = {
                        id: r.id,
                        invoiceNo: r.return_no,
                        patientId: mappedPatientId,
                        appointmentId: r.appointment_id,
                        date: r.return_date || r.created_at,
                        status: 'Paid',
                        totalAmount: -Number(r.total_amount || 0),
                        paidAmount: -Number(r.total_amount || 0),
                        taxAmount: -Number(r.tax_amount || 0),
                        isPharmacy: true,
                        items: myReturnItems.map((ri: any) => {
                            const origBill = structuredBills.find((b: Bill) => b.id === r.original_bill_id);
                            const origNo = origBill?.invoiceNo || 'Unknown';
                            return {
                                id: ri.id,
                                description: `RETURN: ${ri.description || 'Unknown Item'} (From ${origNo})`,
                            quantity: -Number(ri.quantity || 0),
                            unitPrice: Number(ri.unit_price || 0),
                            total: -Number(ri.total_amount || 0),
                            itemId: ri.item_id,
                            batchNo: ri.batch_no,
                            taxPercentage: Number(ri.tax_percentage || 0),
                            taxAmount: -Number(ri.tax_amount || 0)
                            };
                        }),
                        payments: []
                    };
                    structuredBills.push(returnBill);
                });
            }

            setBills(structuredBills.sort((a: Bill, b: Bill) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        // Load organizations gracefully
        let orgsData = [];
        try {
            const { data, error } = await supabase.from('finance_organizations').select('*');
            if (data && !error) {
                orgsData = data.map((o: any) => ({
                    id: o.id,
                    code: o.code,
                    sponsorType: o.sponsor_type,
                    payerId: o.payer_id,
                    vatNotRequired: !!o.vat_not_required,
                    contractCreatedBy: o.contract_created_by,
                    organizationType: o.organization_type,
                    accountNo: o.account_no,
                    organizationGroup: o.organization_group,
                    receiverId: o.receiver_id,
                    gatewayConfiguration: o.gateway_configuration,
                    vatNo: o.vat_no,
                    name: o.name,
                    active: !!o.active,
                    isDamanOrThiqa: !!o.is_daman_or_thiqa,
                    maxApprovalTime: o.max_approval_time,
                    addressDetails: o.address_details,
                    buildingNo: o.building_no,
                    city: o.city,
                    country: o.country,
                    postalCode: o.postal_code,
                    state: o.state,
                    dist: o.dist,
                    contacts: o.contacts || [],
                    insuranceId: o.insurance_id,
                    branchId: o.branch_id,
                    createdAt: o.created_at
                }));
            } else {
                const local = localStorage.getItem('medicore_organizations');
                if (local) orgsData = JSON.parse(local);
            }
        } catch (err) {
            const local = localStorage.getItem('medicore_organizations');
            if (local) orgsData = JSON.parse(local);
        }
        setOrganizations(orgsData);

        // Load sponsor tariffs gracefully
        let tariffsData = [];
        try {
            const { data, error } = await supabase.from('sponsor_tariffs').select('*');
            if (data && !error) {
                tariffsData = data.map((t: any) => ({
                    id: t.id,
                    sponsorId: t.sponsor_id,
                    itemType: t.item_type,
                    itemCode: t.item_code,
                    itemName: t.item_name,
                    cptCode: t.cpt_code,
                    groupName: t.group_name,
                    baseTariff: Number(t.base_tariff || 0),
                    contractType: t.contract_type,
                    tariffAmount: Number(t.tariff_amount || 0),
                    sponsorCode: t.sponsor_code,
                    sponsorDescription: t.sponsor_description,
                    className: t.class_name,
                    nphiesCode: t.nphies_code,
                    nphiesDesc: t.nphies_desc,
                    active: !!t.active,
                    createdAt: t.created_at
                }));
            } else {
                const local = localStorage.getItem('medicore_sponsor_tariffs');
                if (local) tariffsData = JSON.parse(local);
            }
        } catch (err) {
            const local = localStorage.getItem('medicore_sponsor_tariffs');
            if (local) tariffsData = JSON.parse(local);
        }
        setSponsorTariffs(tariffsData);
        
        showToast('success', 'Data synced with database.');

      } catch (error: any) {
        console.error("Critical Sync Error:", error);
        let msg = 'Failed to connect to database.';
        if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
            msg = 'Connected, but tables are missing. Please check your DB schema.';
        } else if (error.message?.includes('FetchError')) {
            msg = 'Connection refused. Is the database server running?';
        }
        showToast('error', msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [user, refreshTrigger]);

  // --- Actions ---

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const getBatchStockBalance = async (storeId: string, itemId: string, batchNo: string): Promise<number> => {
    const supabase = getSupabase();
    const cleanBatch = (batchNo || '').trim().toUpperCase();
    let balance = 0;
    
    const { data } = await supabase
      .from('inventory_stock_ledger')
      .select('stock_in_quantity, stock_out_quantity')
      .eq('store_id', storeId)
      .eq('item_id', itemId)
      .eq('batch_no', cleanBatch);
      
    data?.forEach(row => {
      balance += (Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0));
    });
    
    return balance;
  };

  const getItemValuation = async (storeId: string, itemId: string): Promise<{ quantity: number, rate: number }> => {
    const supabase = getSupabase();
    
    // Get the latest ledger entry for this item in this store
    // This row contains the most up-to-date cumulative closing stock and average rate
    const { data, error } = await supabase
      .from('inventory_stock_ledger')
      .select('closing_stock, closing_stock_rate')
      .eq('store_id', storeId)
      .eq('item_id', itemId)
      .order('ref_doc_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
        return { quantity: 0, rate: 0 };
    }

    return { 
        quantity: Number(data[0].closing_stock || 0), 
        rate: Number(data[0].closing_stock_rate || 0) 
    };
  };

  const saveOpeningStock = async (stock: OpeningStock) => {
    if (!requireDb()) return;
    try {
      const dbStock: any = {
        store_id: stock.storeId,
        entry_date: stock.entryDate,
        status: stock.status
      };
      if (stock.id) dbStock.id = stock.id;
      
      const { data, error } = await getSupabase().from('inventory_opening_stocks').upsert(dbStock).select().single();
      if (error) throw error;
      
      const savedStockId = data.id;
      
      if (stock.items && stock.items.length > 0) {
          const dbItems = stock.items.map(i => {
             const rowInfo: any = {
                 opening_stock_id: savedStockId,
                 item_id: i.itemId,
                 item_code: i.itemCode,
                 item_name: i.itemName,
                 item_category: i.itemCategory,
                 batch_no: (i.batchNo || '').trim().toUpperCase(),
                 batch_start_date: i.batchStartDate || null,
                 batch_end_date: i.batchEndDate || null,
                 quantity: i.quantity,
                 rate: i.rate,
                 amount: i.amount,
                 mrp: i.mrp
             };
             if (i.id && i.id.length > 20) rowInfo.id = i.id; // Basic UUID length check
             return rowInfo;
          });
          const { error: itemsError } = await getSupabase().from('inventory_opening_stock_items').upsert(dbItems);
          if (itemsError) throw itemsError;

          // Write to Stock Ledger
          for (const i of stock.items) {
              const cleanBatch = (i.batchNo || '').trim().toUpperCase();
              
              // Get current store-wide item balance and rate for WAC
              const { quantity: prevQty, rate: prevRate } = await getItemValuation(stock.storeId, i.itemId);
              
              const qtyIn = Number(i.quantity || 0);
              const inRate = Number(i.rate || 0);
              const newBalance = prevQty + qtyIn;

              // Calculate WAC (Weighted Average Cost)
              const prevValue = prevQty * prevRate;
              const newValue = qtyIn * inRate;
              const newAverageRate = newBalance > 0 ? (prevValue + newValue) / newBalance : inRate;
              const finalRate = Number(newAverageRate.toFixed(2));

              const { error: ledgerError } = await getSupabase().from('inventory_stock_ledger').insert({
                 store_id: stock.storeId,
                 item_id: i.itemId,
                 transaction_type: 'STOCKIN',
                 ref_type: 'OPENING STOCK',
                 ref_doc_no: savedStockId,
                 ref_doc_date: stock.entryDate,
                 stock_in_quantity: qtyIn,
                 stock_out_quantity: 0,
                 closing_stock: newBalance,
                 closing_stock_rate: finalRate,
                 closing_stock_value: newBalance * finalRate,
                 currency: 'SAR',
                 batch_no: cleanBatch,
                 batch_date: i.batchStartDate || null,
                 expiry_date: i.batchEndDate || null
              });
              if (ledgerError) console.error("Error writing to ledger:", ledgerError);
          }
      }
      
      // Update local state by forcing a refresh or manually mapping
      setRefreshTrigger(prev => prev + 1);
      showToast('success', 'Opening Stock saved successfully');
    } catch (error: any) {
      console.error('Error saving opening stock:', error);
      showToast('error', `Failed to save Opening Stock: ${error.message}`);
      throw error;
    }
  };

  const fetchStockLedger = async (filters: { storeId: string; fromDate?: string; toDate?: string; itemCategory?: string; searchQuery?: string }) => {
     if (!requireDb()) return [];
     try {
         let query = getSupabase().from('inventory_stock_ledger')
            .select(`
               *,
               store:stores(*),
               item:inventory_items(*)
            `)
            .eq('store_id', filters.storeId);
            
         if (filters.fromDate) {
             query = query.gte('ref_doc_date', `${filters.fromDate}T00:00:00.000Z`);
         }
         
         if (filters.toDate) {
             query = query.lte('ref_doc_date', `${filters.toDate}T23:59:59.999Z`);
         }
         
         const { data, error } = await query;
         if (error) throw error;
         
         let result = data;
         
         // In-memory filters for nested jsonb relations if needed, else we rely on JS
         if (filters.itemCategory && filters.itemCategory !== '') {
             result = result.filter((r: any) => r.item && r.item.item_category === filters.itemCategory);
         }
         
         if (filters.searchQuery && filters.searchQuery !== '') {
             const lower = filters.searchQuery.toLowerCase();
             result = result.filter((r: any) => 
                 (r.item && r.item.item_name && r.item.item_name.toLowerCase().includes(lower)) ||
                 (r.item && r.item.item_code && r.item.item_code.toLowerCase().includes(lower))
             );
         }
         
         return result.map((r: any) => ({
             id: r.id,
             storeId: r.store_id,
             itemId: r.item_id,
             transactionType: r.transaction_type,
             refType: r.ref_type,
             refDocNo: r.ref_doc_no,
             refDocDate: r.ref_doc_date,
             stockInQuantity: r.stock_in_quantity,
             stockOutQuantity: r.stock_out_quantity,
             closingStock: r.closing_stock,
             closingStockRate: r.closing_stock_rate,
             closingStockValue: r.closing_stock_value,
             currency: r.currency,
             batchNo: r.batch_no,
             batchDate: r.batch_date,
             expiryDate: r.expiry_date,
             createdAt: r.created_at,
             store: r.store ? mapStoreFromDb(r.store) : undefined,
             item: r.item ? mapInventoryItemFromDb(r.item) : undefined
         })) as StockLedgerEntry[];
         
     } catch (error: any) {
         console.error('Error fetching stock ledger:', error);
         showToast('error', 'Failed to generate stock ledger');
         return [];
     }
  };

  const fetchDashboardMetrics = async (storeId: string): Promise<DashboardMetrics | null> => {
      if (!requireDb()) return null;
      try {
          // Fetch all items to cross check base data
          // Actually, we already have inventoryItems context state. We will use that!
          // We just need the ledger sum for the store.
          const { data, error } = await getSupabase().from('inventory_stock_ledger')
             .select('item_id, stock_in_quantity, stock_out_quantity, closing_stock_value')
             .eq('store_id', storeId);
             
          if (error) throw error;
          
          type ItemAgg = { stockIn: number, stockOut: number, lastValue: number };
          const aggregations: Record<string, ItemAgg> = {};
          
          data.forEach(row => {
              if (!aggregations[row.item_id]) {
                  aggregations[row.item_id] = { stockIn: 0, stockOut: 0, lastValue: 0 };
              }
              aggregations[row.item_id].stockIn += Number(row.stock_in_quantity || 0);
              aggregations[row.item_id].stockOut += Number(row.stock_out_quantity || 0);
              // Take latest closing stock value based on the way it's queried or just sum values roughly.
              // For prototype we sum or take simple average if needed. For accuracy closing_stock_value is tracked.
              // Since it's a rough sum:
              aggregations[row.item_id].lastValue += Number(row.closing_stock_value || 0);
          });
          
          let totalValue = 0;
          let lowStockItems = 0;
          let outOfStock = 0;
          
          const itemsDetails: Array<any> = [];
          
          // Cross-reference with `inventoryItems` memory state
          // Only process items that actually have entries in the store OR mapping
          Object.keys(aggregations).forEach(itemId => {
             const agg = aggregations[itemId];
             const currentStock = agg.stockIn - agg.stockOut;
             totalValue += (agg.lastValue); // Roughly. Note: In real scenarios value is QTY * avg rate.
             
             const info = inventoryItems.find(i => i.id === itemId);
             // Use reorder_level stored in the item master — no hardcoded fallback
             const restockLevel = info?.reorderLevel ?? 0;
             
             if (currentStock <= 0) outOfStock++;
             else if (restockLevel > 0 && currentStock < restockLevel) lowStockItems++;
             
             itemsDetails.push({
                 itemId,
                 itemCode: info?.itemCode || 'UNK',
                 itemCategory: info?.itemCategory || 'General',
                 itemName: info?.itemName || 'Unknown Item',
                 currentStock,
                 restockLevel
             });
          });
          
          return {
              totalProducts: itemsDetails.length,
              lowStockItems,
              outOfStock,
              totalValue,
              itemsDetails
          };
      } catch (err: any) {
          console.error("Failed to fetch dashboard metrics", err);
          return null;
      }
  };

  const fetchBatchDetails = async (storeId: string, itemId: string) => {
    if (!requireDb()) return [];
    try {
      // 1. Get MRP and Batch Date from opening stock
      const { data: openingData } = await getSupabase()
        .from('inventory_opening_stock_items')
        .select('batch_no, mrp, rate, batch_start_date, batch_end_date')
        .eq('item_id', itemId);
        
      const mrpMap = new Map();
      const rateMap = new Map();
      const expiryMap = new Map();
      const batchDateMap = new Map();
      openingData?.forEach(i => {
        const b = (i.batch_no || '').trim().toUpperCase();
        mrpMap.set(b, i.mrp);
        rateMap.set(b, i.rate);
        expiryMap.set(b, i.batch_end_date);
        batchDateMap.set(b, i.batch_start_date);
      });

      // 2. Aggregate current stock from ledger
      const { data: ledgerData } = await getSupabase()
        .from('inventory_stock_ledger')
        .select('batch_no, stock_in_quantity, stock_out_quantity')
        .eq('store_id', storeId)
        .eq('item_id', itemId);

      const stockMap = new Map();
      ledgerData?.forEach(row => {
        const b = (row.batch_no || '').trim().toUpperCase();
        const current = stockMap.get(b) || 0;
        stockMap.set(b, current + Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0));
      });

      return Array.from(stockMap.entries()).map(([batchNo, currentStock]) => {
        const mrp = mrpMap.get(batchNo) || 0;
        const rate = rateMap.get(batchNo) || 0;
        return {
          batchNo,
          currentStock,
          mrp,
          rate: mrp > 0 ? mrp : rate, // Use MRP as primary rate if available
          batchDate: batchDateMap.get(batchNo),
          expiryDate: expiryMap.get(batchNo)
        };
      }).filter(b => b.currentStock > 0);

    } catch (error) {
      console.error('Error fetching batch details:', error);
      return [];
    }
  };

  const saveDirectSale = async (sale: DirectSale): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      
      // 1. Save Sale Header
      const dbSale = {
        sale_no: sale.saleNo, // Correct property name
        sale_date: sale.saleDate,
        store_id: sale.storeId,
        first_name: sale.firstName,
        middle_name: sale.middleName || null,
        last_name: sale.lastName || null,
        phone_no: sale.phoneNo || null,
        external_no: sale.externalNo || null,
        dob: sale.dob || null, // Convert "" to null
        age: sale.age || null,
        age_unit: sale.ageUnit,
        gender: sale.gender || null,
        referred_doctor: sale.referredDoctor || null,
        license_no: sale.licenseNo || null,
        nationality: sale.nationality,
        is_insured: sale.isInsured,
        is_new_external_patient: sale.isNewExternalPatient,
        total_amount: sale.totalAmount
      };

      const { data: savedSale, error: saleError } = await supabase
        .from('pharmacy_direct_sales')
        .insert(dbSale)
        .select()
        .single();

      if (saleError) throw saleError;
      const saleId = savedSale.id;

      // 2. Save Sale Items (with Tax)
      const dbItems = sale.items.map(i => {
        const mapping = itemTaxMappings.find(m => m.itemId === i.itemId);
        const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
        const taxPercent = tax?.percentage || 0;
        const taxAmount = Number((i.quantity * i.unitPrice * (taxPercent / 100)).toFixed(2));

        return {
          sale_id: saleId,
          item_id: i.itemId,
          batch_no: i.batchNo,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          tax_percentage: taxPercent,
          tax_amount: taxAmount,
          total_price: Number((i.quantity * i.unitPrice + taxAmount).toFixed(2)),
          expiry_date: i.expiryDate || null // Convert "" to null
        };
      });

      const totalTaxAmount = dbItems.reduce((sum, item) => sum + item.tax_amount, 0);
      
      // Update header with tax info if not already set correctly
      await supabase.from('pharmacy_direct_sales').update({ tax_amount: totalTaxAmount }).eq('id', saleId);

      const { error: itemsError } = await supabase.from('pharmacy_direct_sale_items').insert(dbItems);
      if (itemsError) throw itemsError;

      // 3. Update Stock Ledger (STOCKOUT)
      const ledgerEntries = [];
      const localBalances = new Map<string, { quantity: number, rate: number }>();

      for (const i of sale.items) {
        const cleanBatch = (i.batchNo || '').trim().toUpperCase();
        const itemKey = `${sale.storeId}-${i.itemId}`;
        let currentItemBalance = 0;
        let currentAverageRate = 0;

        if (localBalances.has(itemKey)) {
          const val = localBalances.get(itemKey)!;
          currentItemBalance = val.quantity;
          currentAverageRate = val.rate;
        } else {
          const val = await getItemValuation(sale.storeId, i.itemId);
          currentItemBalance = val.quantity;
          currentAverageRate = val.rate;
        }

        // Batch-Specific Validation
        const batchBalance = await getBatchStockBalance(sale.storeId, i.itemId, cleanBatch);
        const qty = Number(i.quantity || 0);
        if (batchBalance < qty) {
            const itemDef = inventoryItems.find(inv => inv.id === i.itemId);
            throw new Error(`Insufficient stock in Batch ${cleanBatch} for ${itemDef?.itemName || i.itemId} (Available in batch: ${batchBalance}, Required: ${qty})`);
        }

        const newBalance = currentItemBalance - qty;
        localBalances.set(itemKey, { quantity: newBalance, rate: currentAverageRate });

        // In WAC, Stock Out inherits the current store-wide average rate
        const valuationRate = currentAverageRate;

        ledgerEntries.push({
          store_id: sale.storeId,
          item_id: i.itemId,
          transaction_type: 'STOCKOUT',
          ref_type: 'DIRECT SALE',
          ref_doc_no: sale.saleNo,
          ref_doc_date: sale.saleDate,
          stock_in_quantity: 0,
          stock_out_quantity: qty,
          closing_stock: newBalance,
          closing_stock_rate: valuationRate,
          closing_stock_value: newBalance * valuationRate,
          batch_no: cleanBatch,
          batch_date: i.batchDate || null,
          expiry_date: i.expiryDate || null,
          currency: 'SAR'
        });
      }

      const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert(ledgerEntries);
      if (ledgerError) throw ledgerError;

      showToast('success', 'Pharmacy Sale completed successfully.');
      setRefreshTrigger(prev => prev + 1);
      return true;

    } catch (error: any) {
      console.error('Error saving direct sale:', error);
      showToast('error', `Sale failed: ${error.message}`);
      return false;
    }
  };

  const saveSponsorTariff = async (tariff: SponsorTariff) => {
    setSponsorTariffs(prev => {
      const exists = prev.find(t => t.id === tariff.id);
      let updated;
      if (exists) {
        updated = prev.map(t => t.id === tariff.id ? tariff : t);
      } else {
        updated = [...prev, tariff];
      }
      localStorage.setItem('medicore_sponsor_tariffs', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbTariff = {
          id: tariff.id,
          sponsor_id: tariff.sponsorId,
          item_type: tariff.itemType,
          item_code: tariff.itemCode,
          item_name: tariff.itemName,
          cpt_code: tariff.cptCode || null,
          group_name: tariff.groupName || null,
          base_tariff: tariff.baseTariff,
          contract_type: tariff.contractType,
          tariff_amount: tariff.tariffAmount,
          sponsor_code: tariff.sponsorCode || null,
          sponsor_description: tariff.sponsorDescription || null,
          class_name: tariff.className,
          nphies_code: tariff.nphiesCode || null,
          nphies_desc: tariff.nphiesDesc || null,
          active: tariff.active
        };

        const { error } = await supabase.from('sponsor_tariffs').upsert(dbTariff);
        if (error) throw error;
        showToast('success', 'Sponsor tariff saved successfully to database!');
      } catch (err: any) {
        console.error("Database error saving sponsor tariff:", err);
        showToast('error', `Failed to sync with database: ${err.message}`);
      }
    } else {
      showToast('success', 'Sponsor tariff saved locally.');
    }
  };

  const saveSponsorTariffBatch = async (tariffs: SponsorTariff[]) => {
    if (tariffs.length === 0) return;

    setSponsorTariffs(prev => {
      let updated = [...prev];
      tariffs.forEach(t => {
        const index = updated.findIndex(existing => existing.id === t.id);
        if (index > -1) {
          updated[index] = t;
        } else {
          updated.push(t);
        }
      });
      localStorage.setItem('medicore_sponsor_tariffs', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbTariffs = tariffs.map(t => ({
          id: t.id,
          sponsor_id: t.sponsorId,
          item_type: t.itemType,
          item_code: t.itemCode,
          item_name: t.itemName,
          cpt_code: t.cptCode || null,
          group_name: t.groupName || null,
          base_tariff: t.baseTariff,
          contract_type: t.contractType,
          tariff_amount: t.tariffAmount,
          sponsor_code: t.sponsorCode || null,
          sponsor_description: t.sponsorDescription || null,
          class_name: t.className,
          nphies_code: t.nphiesCode || null,
          nphies_desc: t.nphiesDesc || null,
          active: t.active
        }));

        const { error } = await supabase.from('sponsor_tariffs').upsert(dbTariffs);
        if (error) throw error;
        showToast('success', `${tariffs.length} sponsor tariffs saved to database!`);
      } catch (err: any) {
        console.error("Database error batch saving sponsor tariffs:", err);
        showToast('error', `Failed to sync batch: ${err.message}`);
      }
    } else {
      showToast('success', `${tariffs.length} sponsor tariffs saved locally.`);
    }
  };

  const deleteSponsorTariff = async (id: string) => {
    setSponsorTariffs(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('medicore_sponsor_tariffs', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('sponsor_tariffs').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Sponsor tariff removed from database.');
      } catch (err: any) {
        console.error("Database error deleting sponsor tariff:", err);
        showToast('error', `Failed to delete from database: ${err.message}`);
      }
    } else {
      showToast('info', 'Sponsor tariff removed locally.');
    }
  };

  const getBasePrice = (
    itemType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES',
    itemCodeOrId: string
  ): number => {
    if (itemType === 'SERVICES') {
      const service = serviceDefinitions.find(s => s.id === itemCodeOrId || s.code === itemCodeOrId);
      if (service) {
        const tariff = serviceTariffs.find(t => t.serviceId === service.id && t.status === 'Active');
        if (tariff) return tariff.price;
      }
      return 0;
    } else {
      const item = inventoryItems.find(i => i.id === itemCodeOrId || i.itemCode === itemCodeOrId);
      if (item && item.pricing && item.pricing.length > 0) {
        return item.pricing[0].price;
      }
      return item?.stock?.itemRate || 0;
    }
  };

  const resolveNegotiatedPrice = (
    sponsorId: string | undefined | null,
    itemType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES',
    itemCodeOrId: string,
    className: string = 'A+'
  ): number => {
    if (!sponsorId) {
      return getBasePrice(itemType, itemCodeOrId);
    }

    const match = sponsorTariffs.find(t => 
      t.active &&
      t.sponsorId === sponsorId &&
      t.itemType === itemType &&
      (t.itemCode === itemCodeOrId || t.cptCode === itemCodeOrId) &&
      t.className.toUpperCase() === className.toUpperCase()
    );

    if (match) {
      return match.tariffAmount;
    }

    const matchAnyClass = sponsorTariffs.find(t => 
      t.active &&
      t.sponsorId === sponsorId &&
      t.itemType === itemType &&
      (t.itemCode === itemCodeOrId || t.cptCode === itemCodeOrId)
    );

    if (matchAnyClass) {
      return matchAnyClass.tariffAmount;
    }

    return getBasePrice(itemType, itemCodeOrId);
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

  const saveBranch = async (branch: Branch) => {
    if (!requireDb()) return;
    try {
      const { error } = await getSupabase().from('branches').upsert(mapBranchToDb(branch));
      if (error) throw error;
      setBranches(prev => {
          const exists = prev.find(b => b.id === branch.id);
          if (exists) return prev.map(b => b.id === branch.id ? branch : b);
          return [...prev, branch];
      });
      showToast('success', 'Hospital details saved!');
    } catch (err: any) {
      showToast('error', `Failed to save hospital: ${err.message}`);
    }
  };

  const deleteBranch = async (id: string) => {
    if (!requireDb()) return;
    try {
      const { error } = await getSupabase().from('branches').delete().eq('id', id);
      if (error) throw error;
      setBranches(prev => prev.filter(b => b.id !== id));
      showToast('success', 'Hospital removed.');
    } catch (err: any) {
      showToast('error', `Failed to delete hospital: ${err.message}`);
    }
  };

  const logout = () => {
      setUser(null);
      localStorage.removeItem('medicore_user');
      
      // Clear data states
      setPatients([]); setEmployees([]); setDepartments([]); setAppointments([]); setAvailabilities([]); setBills([]); setVitals([]); setDiagnoses([]); setClinicalNotes([]); setAllergies([]); setNarrativeDiagnoses([]); setMasterDiagnoses([]); setServiceDefinitions([]); setServiceTariffs([]); setVitalSignGroups([]); setVitalSignParameters([]); setDentalICDs([]); setPrescriptions([]);
  };

  const saveDentalICD = async (icd: DentalICD) => {
    if (!requireDb()) return;
    setDentalICDs(prev => {
        const exists = prev.find(item => item.id === icd.id);
        if (exists) return prev.map(item => item.id === icd.id ? icd : item);
        return [...prev, icd];
    });
    const { error } = await getSupabase().from('dental_icd_master').upsert({
        id: icd.id,
        code: icd.code,
        description: icd.description,
        status: icd.status
    });
    if (error) { 
        showToast('error', `Failed to save Dental ICD: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    } else {
        showToast('success', 'Dental ICD saved.');
    }
  };

  const uploadDentalICDs = async (data: DentalICD[]) => {
      if (!requireDb()) return;
      setDentalICDs(prev => [...prev, ...data]);
      const dbData = data.map(icd => ({
          id: icd.id,
          code: icd.code,
          description: icd.description,
          status: icd.status
      }));
      const { error } = await getSupabase().from('dental_icd_master').insert(dbData);
      if (error) {
          showToast('error', `Bulk upload failed: ${error.message}`);
          setRefreshTrigger(prev => prev + 1);
      } else {
          showToast('success', `${data.length} Dental ICDs imported.`);
      }
  };

  const deleteDentalICD = async (id: string) => {
      if (!requireDb()) return;
      const original = dentalICDs.find(icd => icd.id === id);
      setDentalICDs(prev => prev.filter(icd => icd.id !== id));
      const { error } = await getSupabase().from('dental_icd_master').delete().eq('id', id);
      if (error) {
          showToast('error', 'Failed to delete Dental ICD.');
          if (original) setDentalICDs(prev => [...prev, original]);
      } else {
          showToast('info', 'Dental ICD removed.');
      }
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
          paid_amount: bill.paidAmount,
          invoice_no: bill.invoiceNo || null,
          discount_amount: bill.discountAmount || 0,
          tax_amount: bill.taxAmount || 0,
          round_off: bill.roundOff || 0,
          doctor_id: bill.doctorId || null,
          department_id: bill.departmentId || null,
          payment_mode: bill.paymentMode || null,
          amount_received: bill.amountReceived || 0,
          reference_no: bill.referenceNo || null,
          notes: bill.notes || null,
          created_by: bill.createdBy || 'admin',
          is_pharmacy: bill.isPharmacy || false,
          prescription_id: bill.prescriptionId || null
      });

      if (billError) { 
          showToast('error', 'Failed to create bill: ' + billError.message); 
          setBills(prev => prev.filter(b => b.id !== bill.id)); 
          return false; 
      }

      const itemsDb = bill.items.map(i => ({ 
          id: i.id, 
          bill_id: bill.id, 
          item_id: i.itemId || null,
          batch_no: i.batchNo || null,
          description: i.description, 
          quantity: Number(i.quantity), 
          unit_price: Number(i.unitPrice), 
          total: Number(i.total),
          item_type: i.itemType || null,
          discount_percentage: Number(i.discountPercentage || 0),
          discount_amount: Number(i.discountAmount || 0),
          tax_percentage: Number(i.taxPercentage || 0),
          tax_amount: Number(i.taxAmount || 0)
      }));
      
      const { error: itemsError } = await getSupabase().from('bill_items').insert(itemsDb);
      
      if (itemsError) { 
          showToast('error', 'Failed to save bill items: ' + itemsError.message);
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

  const savePrescription = async (prescription: Prescription): Promise<boolean> => {
      if (!requireDb()) return false;
      const supabase = getSupabase();
      
      // Optimistic update
      setPrescriptions(prev => {
          const exists = prev.find(p => p.id === prescription.id);
          if (exists) return prev.map(p => p.id === prescription.id ? prescription : p);
          return [prescription, ...prev];
      });

      try {
          // 1. Save Prescription Header
          const { error: hError } = await supabase.from('prescriptions').upsert(mapPrescriptionToDb(prescription));
          if (hError) throw hError;

          // 2. Clear old items (for updates) and insert new ones
          await supabase.from('prescription_items').delete().eq('prescription_id', prescription.id);
          
          if (prescription.items.length > 0) {
              const itemsPayload = prescription.items.map(mapPrescriptionItemToDb);
              const { error: iError } = await supabase.from('prescription_items').insert(itemsPayload);
              if (iError) throw iError;
          }

          showToast('success', 'Prescription saved and sent to pharmacy.');
          return true;
      } catch (err: any) {
          showToast('error', `Failed to save prescription: ${err.message}`);
          setRefreshTrigger(prev => prev + 1); // Revert local state
          return false;
      }
  };

  const saveDrugMaster = async (mapping: DrugMaster): Promise<boolean> => {
      if (!requireDb()) return false;
      const supabase = getSupabase();
      
      // Optimistic update
      setDrugMasters(prev => {
          const exists = prev.find(dm => dm.id === mapping.id);
          if (exists) return prev.map(dm => dm.id === mapping.id ? mapping : dm);
          return [...prev, mapping];
      });

      try {
          const payload: any = {
              item_id: mapping.itemId,
              item_code: mapping.itemCode,
              drug_name: mapping.drugName,
              generic_id: mapping.genericId || null,
              is_active: mapping.isActive,
          };
          if (mapping.id) payload.id = mapping.id;

          const { error } = await supabase.from('pharmacy_drug_master').upsert(payload);
          if (error) throw error;
          
          showToast('success', `Drug mapping for ${mapping.drugName} saved.`);
          return true;
      } catch (err: any) {
          showToast('error', `Failed to save drug mapping: ${err.message}`);
          setRefreshTrigger(prev => prev + 1); // Revert state
          return false;
      }
  };

  const deleteDrugMaster = async (id: string): Promise<boolean> => {
      if (!requireDb()) return false;
      const supabase = getSupabase();
      
      const original = drugMasters.find(dm => dm.id === id);
      setDrugMasters(prev => prev.filter(dm => dm.id !== id));

      try {
          const { error } = await supabase.from('pharmacy_drug_master').delete().eq('id', id);
          if (error) throw error;
          
          showToast('info', 'Drug mapping removed.');
          return true;
      } catch (err: any) {
          showToast('error', `Failed to remove mapping: ${err.message}`);
          if (original) setDrugMasters(prev => [...prev, original]);
          return false;
      }
  };

  const dispensePrescription = async (prescriptionId: string, storeId: string, allocatedBatches: Record<string, { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount?: number }>): Promise<{ success: boolean; invoiceId?: string }> => {
      if (!requireDb()) return { success: false };
      const supabase = getSupabase();
      
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (!prescription) {
          showToast('error', 'Prescription not found locally.');
          return { success: false };
      }
      
      try {
          const ledgerEntries: any[] = [];
          const dispensedItemIds: string[] = [];
          const localBalances = new Map<string, { quantity: number, rate: number }>();
          
          for (const item of prescription.items) {
              const allocation = allocatedBatches[item.id];
              if (allocation) {
                  const cleanBatch = (allocation.batchNo || '').trim().toUpperCase();
                  const itemKey = `${storeId}-${item.itemId}`;
                  
                  // 1. Batch Specific Validation
                  const currentBatchBalance = await getBatchStockBalance(storeId, item.itemId, cleanBatch);
                  const qty = Number(item.totalQty || 0);
                  if (currentBatchBalance < qty) {
                      throw new Error(`Insufficient stock in Batch ${cleanBatch} for ${item.itemName} (Available in batch: ${currentBatchBalance}, Required: ${qty})`);
                  }

                  // 2. Cumulative Item Balance for Ledger (WAC)
                  let currentItemBalance = 0;
                  let currentAverageRate = 0;
                  if (localBalances.has(itemKey)) {
                      const val = localBalances.get(itemKey)!;
                      currentItemBalance = val.quantity;
                      currentAverageRate = val.rate;
                  } else {
                      const val = await getItemValuation(storeId, item.itemId);
                      currentItemBalance = val.quantity;
                      currentAverageRate = val.rate;
                  }

                  const newBalance = currentItemBalance - qty;
                  localBalances.set(itemKey, { quantity: newBalance, rate: currentAverageRate });

                  // In WAC, Stock Out inherits the current average rate
                  const rate = currentAverageRate;

                  ledgerEntries.push({
                      store_id: storeId,
                      item_id: item.itemId,
                      transaction_type: 'STOCKOUT',
                      ref_type: 'PHARMACY DISPENSE',
                      ref_doc_no: prescription.id,
                      ref_doc_date: new Date().toISOString(),
                      stock_in_quantity: 0,
                      stock_out_quantity: qty,
                      batch_no: cleanBatch,
                      batch_date: allocation.batchDate || null,
                      expiry_date: allocation.expiryDate || null,
                      closing_stock: newBalance,
                      closing_stock_rate: rate,
                      closing_stock_value: newBalance * rate,
                      currency: 'SAR'
                  });
                  dispensedItemIds.push(item.id);
              }
          }
          
          if (ledgerEntries.length > 0) {
              const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert(ledgerEntries);
              if (ledgerError) throw ledgerError;
              
              // Calculate total dispensed amount for this transaction (including tax)
              let transactionTotal = 0;
              let transactionTax = 0;
              
              prescription.items.filter(item => dispensedItemIds.includes(item.id)).forEach(item => {
                  const allocation = allocatedBatches[item.id];
                  const qty = Number(item.totalQty || 0);
                  const rate = Number(allocation.rate || 0);
                  
                  const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                  const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                  const taxPercent = tax?.percentage || 0;
                  const taxAmount = Number((qty * rate * (taxPercent / 100)).toFixed(2));
                  
                  transactionTotal += Number((qty * rate + taxAmount).toFixed(2));
                  transactionTax += taxAmount;
              });

              const existingHeaderTotal = Number(prescription.totalAmount) || 0;
              const newHeaderTotal = Number((existingHeaderTotal + transactionTotal).toFixed(2));

              console.log(`Dispensing: Trans Total=${transactionTotal}, Trans Tax=${transactionTax}, Old Total=${existingHeaderTotal}, New Total=${newHeaderTotal}`);

              // Update items status and pricing info
              const itemUpdates = prescription.items.filter(item => dispensedItemIds.includes(item.id)).map(item => {
                  const allocation = allocatedBatches[item.id];
                  const qty = Number(item.totalQty || 0);
                  const rate = Number(allocation.rate || 0);
                  const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                  const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                  const taxPercent = tax?.percentage || 0;
                  const taxAmount = Number((qty * rate * (taxPercent / 100)).toFixed(2));
                  const total = Number((qty * rate + taxAmount).toFixed(2));

                  return supabase.from('prescription_items')
                      .update({ 
                          status: 'Dispensed',
                          unit_price: rate,
                          tax_percentage: taxPercent,
                          tax_amount: taxAmount,
                          total_amount: total
                      } as any)
                      .eq('id', item.id);
              });

              await Promise.all(itemUpdates);
              
              const allDispensed = prescription.items.every(item => item.status === 'Dispensed' || dispensedItemIds.includes(item.id));
              const newStatus = allDispensed ? 'Dispensed' : 'Partially Dispensed';
              
              const totalPrescriptionTax = (Number(prescription.taxAmount) || 0) + transactionTax;

              console.log(`Updating Prescription ${prescription.id} with status ${newStatus}, total_amount ${newHeaderTotal}, tax_amount ${totalPrescriptionTax}`);

              const { data: updateData, error: headerError } = await supabase.from('prescriptions')
                  .update({ 
                      status: newStatus,
                      total_amount: newHeaderTotal,
                      tax_amount: totalPrescriptionTax
                  } as any)
                  .eq('id', prescription.id)
                  .select();
              
              if (headerError) {
                  console.error("Prescription Header Update Failed:", headerError);
                  throw headerError;
              }
              
              console.log("Prescription Header Updated Successfully:", updateData);
              
              // NEW: Generate Pharmacy Invoice
              const invoiceNo = await generateSequentialInvoiceNumber(storeId);
              const billId = crypto.randomUUID();
              
              const newBill: any = {
                  id: billId,
                  patient_id: prescription.patientId,
                  appointment_id: prescription.appointmentId || null,
                  date: new Date().toISOString(),
                  status: 'Unpaid',
                  total_amount: transactionTotal,
                  tax_amount: transactionTax,
                  paid_amount: 0,
                  invoice_no: invoiceNo,
                  created_by: user?.username || user?.email || 'admin'
              };

              const { error: billError } = await supabase.from('bills').insert(newBill);
              
              if (billError) {
                  throw new Error(`Invoice generation failed: ${billError.message}`);
              }

              console.log("Pharmacy bill header created successfully:", billId);
                  const billItems = prescription.items
                    .filter(item => dispensedItemIds.includes(item.id))
                    .map(item => {
                        const allocation = allocatedBatches[item.id];
                        const qty = Number(item.totalQty || 0);
                        const rate = Number(allocation.rate || 0);
                        const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                        const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                        const taxPercent = tax?.percentage || 0;
                        const taxAmount = Number((qty * rate * (taxPercent / 100)).toFixed(2));
                        return {
                            id: crypto.randomUUID(),
                            bill_id: billId,
                            item_id: item.itemId,
                            batch_no: allocation.batchNo,
                            description: item.itemName || '',
                            quantity: qty,
                            unit_price: rate,
                            tax_percentage: taxPercent,
                            tax_amount: taxAmount,
                            total: Number((qty * rate + taxAmount).toFixed(2))
                        };
                    });
                  
                  if (billItems.length === 0) {
                      console.warn("No bill items to insert. dispensedItemIds:", dispensedItemIds);
                  } else {
                      console.log("Inserting bill items:", billItems.length, "items");
                      const { error: billItemsError } = await supabase.from('bill_items').insert(billItems);
                      if (billItemsError) {
                          console.error("CRITICAL: Failed to save bill items:", billItemsError.message, "Items Payload (first):", JSON.stringify(billItems[0]));
                      } else {
                          console.log("Bill items saved successfully.");
                      }
                  }
                  
                  // Update local bills state
                  const localBill: Bill = {
                      id: billId,
                      invoiceNo: invoiceNo,
                      patientId: prescription.patientId,
                      appointmentId: prescription.appointmentId,
                      date: newBill.date,
                      status: 'Unpaid',
                      totalAmount: transactionTotal,
                      taxAmount: transactionTax,
                      paidAmount: 0,
                      isPharmacy: true,
                      prescriptionId: prescriptionId,
                      doctorId: prescription.doctorId,
                      createdBy: user?.username || user?.email || 'admin',
                      items: billItems.map(bi => ({
                          id: bi.id,
                          description: bi.description || '',
                          quantity: bi.quantity,
                          unitPrice: bi.unit_price,
                          taxPercentage: bi.tax_percentage,
                          taxAmount: bi.tax_amount,
                          total: bi.total,
                          itemId: bi.item_id,
                          batchNo: bi.batch_no
                      })),
                      payments: []
                  };
                  setBills(prev => [localBill, ...prev]);

                  setPrescriptions(prev => prev.map(p => {
                  if (p.id !== prescriptionId) return p;
                  return {
                      ...p,
                      status: newStatus as any,
                      totalAmount: newHeaderTotal,
                      items: p.items.map(i => dispensedItemIds.includes(i.id) ? { ...i, status: 'Dispensed' as any } : i)
                  };
              }));
              
              showToast('success', `Prescription dispensed. Invoice ${invoiceNo} generated.`);
              return { success: true, invoiceId: billId };
          } else {
              showToast('info', 'No items were selected for dispensing.');
              return { success: false };
          }
      } catch (e: any) {
          console.error("Dispense error:", e);
          showToast('error', `Failed to dispense: ${e.message}`);
          return { success: false };
      }
  };

  const saveServiceOrders = async (orders: ServiceOrder[]) => {
      if (!requireDb()) return;
      
      setServiceOrders(prev => [...prev, ...orders]);
      const dbPayload = orders.map(o => mapOrderToDb(o));
      
      const { error } = await getSupabase().from('service_orders').insert(dbPayload);
      if (error) {
          showToast('error', `Failed to save orders: ${error.message}`);
          const orderIds = new Set(orders.map(o => o.id));
          setServiceOrders(prev => prev.filter(p => !orderIds.has(p.id))); 
      } else {
          showToast('success', `${orders.length} service(s) ordered.`);
      }
  };

  const cancelServiceOrder = async (orderId: string) => {
      if (!requireDb()) return;
      
      const original = serviceOrders.find(o => o.id === orderId);
      setServiceOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
      
      const { error } = await getSupabase()
          .from('service_orders')
          .update({ status: 'Cancelled' })
          .eq('id', orderId);
          
      if (error) {
          showToast('error', `Failed to cancel order: ${error.message}`);
          if (original) setServiceOrders(prev => prev.map(o => o.id === orderId ? original : o));
      } else {
          showToast('success', 'Service order cancelled.');
      }
  };

  const savePatientDocument = async (doc: PatientDocument) => {
    if (!requireDb()) return;
    setPatientDocuments(prev => {
        const exists = prev.find(d => d.id === doc.id);
        if (exists) return prev.map(d => d.id === doc.id ? doc : d);
        return [...prev, doc];
    });
    const { error } = await getSupabase().from('patient_documents').upsert(mapDocumentToDb(doc));
    if (error) {
        showToast('error', `Failed to save document: ${error.message}`);
        setPatientDocuments(prev => prev.filter(d => d.id !== doc.id));
    } else {
        showToast('success', 'Document uploaded successfully.');
    }
  };

  const deletePatientDocument = async (id: string) => {
    if (!requireDb()) return;
    const original = patientDocuments.find(d => d.id === id);
    setPatientDocuments(prev => prev.filter(d => d.id !== id));
    const { error } = await getSupabase().from('patient_documents').delete().eq('id', id);
    if (error) {
        showToast('error', 'Failed to delete document.');
        if (original) setPatientDocuments(prev => [...prev, original]);
    } else {
        showToast('info', 'Document removed.');
    }
  };

  const saveInventoryItem = async (item: InventoryItem) => {
    if (!requireDb()) return;
    const supabase = getSupabase();
    
    // Optimistic Update: Update local state immediately
    setInventoryItems(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = item;
            return updated;
        }
        return [item, ...prev];
    });

    // Save base item
    const { error: itemError } = await supabase.from('inventory_items').upsert(mapInventoryItemToDb(item));
    if (itemError) {
        showToast('error', `Failed to save item: ${itemError.message}`);
        setRefreshTrigger(prev => prev + 1); // Revert on error
        return;
    }

    // Save stock if present
    if (item.stock) {
        const { error: stockError } = await supabase.from('inventory_item_stocks').upsert(mapInventoryStockToDb(item.stock), { onConflict: 'item_id' });
        if (stockError) {
            showToast('error', `Item saved, but stock details failed: ${stockError.message}`);
        }
    }

    // Save pricing methods if present
    if (item.pricing && item.pricing.length > 0) {
        const pricingData = item.pricing.map(mapInventoryPricingToDb);
        const { error: pricingError } = await supabase.from('inventory_item_pricing').upsert(pricingData, { onConflict: 'item_id,branch_id' });
        if (pricingError) {
            showToast('error', `Item saved, but pricing methods failed: ${pricingError.message}`);
        }
    }

    showToast('success', `Inventory item ${item.itemName} saved.`);
  };

  const saveStore = async (store: Store) => {
    if (!requireDb()) return;
    const supabase = getSupabase();
    
    // Optimistic Update
    setStores(prev => {
        const index = prev.findIndex(s => s.id === store.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = store;
            return updated;
        }
        return [store, ...prev];
    });

    const { error } = await supabase.from('stores').upsert(mapStoreToDb(store));
    if (error) {
        showToast('error', `Failed to save store: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    } else {
        showToast('success', `Store ${store.storeName} saved.`);
    }
  };

  const deleteStore = async (id: string) => {
    if (!requireDb()) return;
    const original = stores.find(s => s.id === id);
    setStores(prev => prev.filter(s => s.id !== id));
    
    const { error } = await getSupabase().from('stores').delete().eq('id', id);
    if (error) {
        showToast('error', `Failed to delete store: ${error.message}`);
        if (original) setStores(prev => [...prev, original]);
    } else {
        showToast('info', 'Store record removed.');
    }
  };

  const saveStoreItemMapping = async (mapping: StoreItemMapping) => {
    if (!requireDb()) return;
    setStoreItemMappings(prev => [...prev, mapping]);
    const { error } = await getSupabase().from('store_item_mappings').upsert(mapStoreMappingToDb(mapping));
    if (error) {
        showToast('error', `Mapping failed: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    }
  };

  const deleteStoreItemMapping = async (id: string) => {
    if (!requireDb()) return;
    const original = storeItemMappings.find(m => m.id === id);
    setStoreItemMappings(prev => prev.filter(m => m.id !== id));
    const { error } = await getSupabase().from('store_item_mappings').delete().eq('id', id);
    if (error) {
        showToast('error', 'Failed to remove mapping.');
        if (original) setStoreItemMappings(prev => [...prev, original]);
    }
  };

  const repairPh000006 = async (storeId: string) => {
    if (!requireDb()) return;
    const supabase = getSupabase();
    
    try {
        // 1. Get PH000006 and the target store
        const { data: itemData, error: itemError } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('item_code', 'PH000006')
            .single();
        
        if (itemError || !itemData) {
            showToast('error', 'Item PH000006 not found.');
            return;
        }

        const itemId = itemData.id;

        // 2. Fetch all ledger entries, EXCLUDING Batch 007 and 1009/009 (Actually, fetch all for that item in that store)
        // Note: The user wants to IGNORE Batch 007 from the running total calculation.
        const { data: entries, error: fetchError } = await supabase
            .from('inventory_stock_ledger')
            .select('*')
            .eq('store_id', storeId)
            .eq('item_id', itemId)
            .order('ref_doc_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        if (!entries || entries.length === 0) {
            showToast('info', 'No ledger entries found to repair.');
            return;
        }

        console.log(`Starting WAC Repair for ${entries.length} entries...`);
        let balance = 0;
        let averageRate = 0;
        
        for (const entry of entries) {
            const batchNo = (entry.batch_no || '').trim().toUpperCase();
            
            if (batchNo === '007') {
                continue; 
            }

            const qtyIn = Number(entry.stock_in_quantity || 0);
            const qtyOut = Number(entry.stock_out_quantity || 0);
            const entryRate = Number(entry.closing_stock_rate || 0); // This is the 'Purchase Rate' for StockIn
            
            const prevBalance = balance;
            const prevRate = averageRate;
            
            balance = balance + qtyIn - qtyOut;

            // Recalculate Average Rate if Stock In
            if (qtyIn > 0) {
                const prevValue = prevBalance * prevRate;
                const newValue = qtyIn * entryRate;
                averageRate = balance > 0 ? (prevValue + newValue) / balance : entryRate;
            } else {
                // For Stock Out, rate remains the same
                averageRate = prevRate;
            }
            
            // Round to 2 decimals like in the screenshot
            const finalRate = Number(averageRate.toFixed(2));

            console.log(`Updating entry ${entry.ref_doc_no}: Qty=${balance}, Rate=${finalRate}`);

            const { error: updateError } = await supabase
                .from('inventory_stock_ledger')
                .update({ 
                    closing_stock: balance,
                    closing_stock_rate: finalRate,
                    closing_stock_value: balance * finalRate 
                } as any)
                .eq('id', entry.id);
            
            if (updateError) console.error("Repair update error:", updateError);
        }

        showToast('success', 'Stock Ledger for PH000006 repaired successfully (Ignoring Batch 007).');
    } catch (err: any) {
        showToast('error', `Repair failed: ${err.message}`);
    }
  };

  const generateSequentialInvoiceNumber = async (storeId: string): Promise<string> => {
    const supabase = getSupabase();
    const prefix = 'PH-';
    let nextSequence = 1001;

    try {
        const { data, error } = await supabase
            .from('bills')
            .select('invoice_no')
            .like('invoice_no', 'PH-%')
            .order('invoice_no', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            const lastInvoice = data[0].invoice_no || '';
            const numPart = lastInvoice.replace('PH-', '');
            const sequenceNum = parseInt(numPart);
            if (!isNaN(sequenceNum)) {
                nextSequence = sequenceNum + 1;
            }
        }
    } catch (e) {
        console.warn("Could not fetch latest invoice number", e);
    }

    return `${prefix}${nextSequence}`;
  };

  const generateSequentialReturnNumber = async (storeId: string): Promise<string> => {
    const supabase = getSupabase();
    const store = stores.find(s => s.id === storeId);
    const storeCode = store?.storeCode || 'GEN';
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `RET-D-${storeCode}-${year}`;

    let nextSequence = 1;
    try {
        const { data, error } = await supabase
            .from('pharmacy_returns')
            .select('return_no')
            .like('return_no', `${prefix}%`)
            .order('return_no', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            const lastInvoice = data[0].return_no || '';
            const parts = lastInvoice.split('-');
            const lastSequenceStr = parts[parts.length - 1];
            
            if (lastSequenceStr && lastSequenceStr.length >= 6) {
                // Extracts the actual sequence from 26000001 format
                const actualSeq = parseInt(lastSequenceStr.slice(-6));
                if (!isNaN(actualSeq)) {
                    nextSequence = actualSeq + 1;
                }
            }
        }
    } catch (e) {
        console.warn("Could not fetch latest return number", e);
    }

    const paddedSequence = nextSequence.toString().padStart(6, '0');
    return `${prefix}${paddedSequence}`;
  };

  const processPharmacyReturn = async (originalBillId: string, storeId: string, returns: Array<{ itemId: string, batchNo: string, qty: number, rate: number, description: string, taxPercentage?: number }>): Promise<{ success: boolean; invoiceId?: string }> => {
    if (!requireDb()) return { success: false };
    try {
      console.log(`Starting return for Bill: ${originalBillId} in Store: ${storeId}`);
      const supabase = getSupabase();
      const originalBill = bills.find(b => b.id === originalBillId);
      if (!originalBill) throw new Error("Original invoice record not found in system.");

      const returnInvoiceNo = await generateSequentialReturnNumber(storeId);
      const returnBillId = crypto.randomUUID();
      const returnDate = new Date().toISOString();

      const totalReturnTax = returns.reduce((sum, r) => {
          const taxPercent = r.taxPercentage || 0;
          const taxAmount = Number((r.qty * r.rate * (taxPercent / 100)).toFixed(2));
          return sum + taxAmount;
      }, 0);

      const totalReturnAmount = returns.reduce((sum, r) => {
          const taxPercent = r.taxPercentage || 0;
          const basePrice = r.qty * r.rate;
          const taxAmount = Number((basePrice * (taxPercent / 100)).toFixed(2));
          return sum + basePrice + taxAmount;
      }, 0);

      // 1. Create Return Header in new table
      const { error: billError } = await supabase.from('pharmacy_returns').insert({
          id: returnBillId,
          return_no: returnInvoiceNo,
          original_bill_id: originalBillId,
          patient_id: originalBill.patientId,
          store_id: storeId,
          return_date: returnDate,
          total_amount: totalReturnAmount,
          tax_amount: totalReturnTax,
          created_by: user?.username || user?.email || 'admin'
      });

      if (billError) throw billError;

      // 2. Look up batch details for ALL items from the stock ledger FIRST
      //    so we can use them in both pharmacy_return_items AND inventory_stock_ledger
      const batchInfoMap: Record<string, { batchNo: string; batchDate: string | null; expiryDate: string | null; prevStock: number; prevRate: number }> = {};

      for (const r of returns) {
          // Latest closing stock (any entry) — for balance
          const { data: lastStockData } = await supabase
            .from('inventory_stock_ledger')
            .select('closing_stock, closing_stock_rate')
            .eq('store_id', storeId)
            .eq('item_id', r.itemId)
            .order('ref_doc_date', { ascending: false })
            .limit(1);

          // Most recent PHARMACY DISPENSE — for batch details
          const { data: dispenseData } = await supabase
            .from('inventory_stock_ledger')
            .select('batch_no, batch_date, expiry_date')
            .eq('store_id', storeId)
            .eq('item_id', r.itemId)
            .eq('ref_type', 'PHARMACY DISPENSE')
            .order('ref_doc_date', { ascending: false })
            .limit(1);

          const lastEntry = lastStockData?.[0];
          const dispenseEntry = dispenseData?.[0];

          batchInfoMap[r.itemId] = {
              batchNo: r.batchNo || dispenseEntry?.batch_no || '',
              batchDate: dispenseEntry?.batch_date || null,
              expiryDate: dispenseEntry?.expiry_date || null,
              prevStock: Number(lastEntry?.closing_stock || 0),
              prevRate: Number(lastEntry?.closing_stock_rate || r.rate),
          };
      }

      // 3. Create Return Items — now with correct batch info
      const returnItems = returns.map(r => {
          const batchInfo = batchInfoMap[r.itemId] || {};
          const taxPercent = r.taxPercentage || 0;
          const taxAmount = Number((r.qty * r.rate * (taxPercent / 100)).toFixed(2));
          return {
              id: crypto.randomUUID(),
              return_id: returnBillId,
              item_id: r.itemId,
              batch_no: batchInfo.batchNo || '',
              batch_date: batchInfo.batchDate || null,
              expiry_date: batchInfo.expiryDate || null,
              description: r.description,
              quantity: r.qty,
              unit_price: r.rate,
              tax_percentage: taxPercent,
              tax_amount: taxAmount,
              total_amount: Number((r.qty * r.rate + taxAmount).toFixed(2))
          };
      });

      const { error: itemsError } = await supabase.from('pharmacy_return_items').insert(returnItems);
      if (itemsError) throw itemsError;

      // 4. Update Stock Ledger (Stock In — one entry per returned item)
      for (const r of returns) {
          const batchInfo = batchInfoMap[r.itemId] || {};
          const newStock = batchInfo.prevStock + Number(r.qty);

          const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert({
              id: crypto.randomUUID(),
              store_id: storeId,
              item_id: r.itemId,
              batch_no: batchInfo.batchNo || '',
              batch_date: batchInfo.batchDate || null,
              expiry_date: batchInfo.expiryDate || null,
              transaction_type: 'Return',
              ref_type: 'PHARMACY RETURN',
              ref_doc_no: returnInvoiceNo,
              ref_doc_date: returnDate,
              stock_in_quantity: r.qty,
              stock_out_quantity: 0,
              closing_stock: newStock,
              closing_stock_rate: batchInfo.prevRate,
              closing_stock_value: newStock * batchInfo.prevRate,
              currency: 'SAR'
          });
          if (ledgerError) throw ledgerError;
      }

      // 4. Also create a matching "Bill" record for financial reporting consistency if desired
      // Or just update local state to include a "virtual" bill for the report
      const localReturnBill: Bill = {
          id: returnBillId,
          invoiceNo: returnInvoiceNo,
          patientId: originalBill.patientId,
          appointmentId: originalBill.appointmentId,
          date: returnDate,
          status: 'Paid',
          totalAmount: -totalReturnAmount, // Keep negative for financial logic
          paidAmount: -totalReturnAmount,
          taxAmount: -totalReturnTax,
          isPharmacy: true,
          createdBy: user?.username || user?.email || 'admin',
          items: returnItems.map(ri => ({
              id: ri.id,
              description: `RETURN: ${ri.description} (From ${originalBill.invoiceNo || 'Unknown'})`,
              quantity: -ri.quantity,
              unitPrice: ri.unit_price,
              total: -ri.total_amount,
              itemId: ri.item_id,
              batchNo: ri.batch_no
          })),
          payments: []
      };
      setBills(prev => [localReturnBill, ...prev]);

      return { success: true, invoiceId: returnBillId };
    } catch (err: any) {
      console.error("Return processing failed:", err);
      showToast('error', `Return failed: ${err.message}`);
      return { success: false };
    }
  };

  const fetchBillItems = async (billId: string): Promise<Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number; itemId?: string; batchNo?: string; returnedQty: number; taxPercentage: number; taxAmount: number; }>> => {
    if (!requireDb()) return [];
    const supabase = getSupabase();
    try {
      // Step 0: Load already-returned quantities for this bill from pharmacy_return_items
      // via pharmacy_returns (original_bill_id = billId)
      const returnedQtyByItemId: Record<string, number> = {};
      const { data: priorReturns } = await supabase
        .from('pharmacy_returns')
        .select('id')
        .eq('original_bill_id', billId);

      if (priorReturns && priorReturns.length > 0) {
        const returnIds = priorReturns.map((r: any) => r.id);
        const { data: priorReturnItems } = await supabase
          .from('pharmacy_return_items')
          .select('item_id, quantity')
          .in('return_id', returnIds);

        for (const ri of (priorReturnItems || [])) {
          const key = ri.item_id;
          returnedQtyByItemId[key] = (returnedQtyByItemId[key] || 0) + Number(ri.quantity || 0);
        }
      }

      // Step 1: Try bill_items first
      const { data: billItemsData, error: billItemsError } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId);

      if (!billItemsError && billItemsData && billItemsData.length > 0) {
        return billItemsData.map((i: any) => ({
          id: i.id,
          description: i.description || '',
          quantity: Number(i.quantity || 0),
          unitPrice: Number(i.unit_price || 0),
          total: Number(i.total || 0),
          itemId: i.item_id || '',
          batchNo: i.batch_no || '',
          returnedQty: returnedQtyByItemId[i.item_id] || 0,
          taxPercentage: Number(i.tax_percentage || 0),
          taxAmount: Number(i.tax_amount || 0)
        }));
      }

      // Step 2: Fallback — look up prescription_items via the bill's prescription_id
      console.warn(`fetchBillItems: No bill_items for ${billId}, falling back to prescription_items`);
      const { data: billData } = await supabase
        .from('bills')
        .select('prescription_id')
        .eq('id', billId)
        .single();

      if (!billData?.prescription_id) {
        console.warn('fetchBillItems: No prescription_id linked to this bill');
        return [];
      }

      const { data: prescItems, error: prescError } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', billData.prescription_id);

      if (prescError || !prescItems || prescItems.length === 0) {
        console.warn('fetchBillItems: No prescription_items found either', prescError?.message);
        return [];
      }

      const dispensed = prescItems.filter((i: any) => i.status === 'Dispensed' || i.status === 'dispensed');
      const sourceItems = dispensed.length > 0 ? dispensed : prescItems;

      const bill = bills.find(b => b.id === billId);
      const totalBillAmount = bill?.totalAmount || 0;
      const totalQtyDispensed = sourceItems.reduce((s: number, i: any) => s + Number(i.total_qty || 0), 0);

      return sourceItems.map((i: any) => {
        const qty = Number(i.total_qty || 0);
        const invItem = inventoryItems.find(inv => inv.id === i.item_id);
        const itemName = invItem?.itemName || i.generic_name || 'Unknown Item';
        const unitPrice = (qty > 0 && totalQtyDispensed > 0 && totalBillAmount > 0)
          ? Number((totalBillAmount / totalQtyDispensed).toFixed(2))
          : 0;
        return {
          id: i.id,
          description: itemName,
          quantity: qty,
          unitPrice: unitPrice,
          total: Number((qty * unitPrice).toFixed(2)),
          itemId: i.item_id || '',
          batchNo: '',
          returnedQty: returnedQtyByItemId[i.item_id] || 0,
          taxPercentage: 0, // Fallback doesn't have tax info easily accessible
          taxAmount: 0
        };
      });
    } catch (err: any) {
      console.error('fetchBillItems exception:', err.message);
      return [];
    }
  };

  const uploadInventoryItems = async (items: InventoryItem[]) => {
    if (!requireDb()) return;
    setInventoryItems(prev => [...prev, ...items]);
    const dbData = items.map(i => mapInventoryItemToDb(i));
    const { error } = await getSupabase().from('inventory_items').insert(dbData);
    if (error) {
        showToast('error', `Bulk upload failed: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    } else {
        // Handle bulk stock upload if present
        const stockData = items.filter(i => i.stock).map(i => mapInventoryStockToDb(i.stock!));
        if (stockData.length > 0) {
            const { error: stockBulkError } = await getSupabase().from('inventory_item_stocks').insert(stockData);
            if (stockBulkError) console.error("Stock bulk upload failed", stockBulkError);
        }
        showToast('success', `${items.length} items imported successfully.`);
    }
  };

  const saveTaxMaster = async (tax: TaxMaster) => {
    if (!requireDb()) return;
    const supabase = getSupabase();
    setTaxMasters(prev => {
        const index = prev.findIndex(t => t.id === tax.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = tax;
            return updated;
        }
        return [tax, ...prev];
    });
    const { error } = await supabase.from('tax_masters').upsert(mapTaxMasterToDb(tax));
    if (error) {
        showToast('error', `Tax save failed: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    }
  };

  const deleteTaxMaster = async (id: string) => {
    if (!requireDb()) return;
    setTaxMasters(prev => prev.filter(t => t.id !== id));
    const { error } = await getSupabase().from('tax_masters').delete().eq('id', id);
    if (error) {
        showToast('error', 'Tax deletion failed.');
        setRefreshTrigger(prev => prev + 1);
    }
  };

  const saveItemTaxMapping = async (mapping: ItemTaxMapping) => {
    if (!requireDb()) return;
    setItemTaxMappings(prev => {
        const index = prev.findIndex(m => m.id === mapping.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = mapping;
            return updated;
        }
        return [mapping, ...prev];
    });
    const { error } = await getSupabase().from('item_tax_mappings').upsert(mapItemTaxMappingToDb(mapping));
    if (error) {
        showToast('error', `Mapping failed: ${error.message}`);
        setRefreshTrigger(prev => prev + 1);
    }
  };

  const deleteItemTaxMapping = async (id: string) => {
    if (!requireDb()) return;
    setItemTaxMappings(prev => prev.filter(m => m.id !== id));
    const { error } = await getSupabase().from('item_tax_mappings').delete().eq('id', id);
    if (error) {
        showToast('error', 'Failed to remove mapping.');
        setRefreshTrigger(prev => prev + 1);
    }
  };

  const saveOrganization = async (org: Organization) => {
    // Local update first
    setOrganizations(prev => {
        const index = prev.findIndex(o => o.id === org.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = org;
            localStorage.setItem('medicore_organizations', JSON.stringify(updated));
            return updated;
        }
        const updated = [org, ...prev];
        localStorage.setItem('medicore_organizations', JSON.stringify(updated));
        return updated;
    });

    if (checkConfigured()) {
        try {
            const dbOrg = {
                id: org.id,
                code: org.code,
                sponsor_type: org.sponsorType,
                payer_id: org.payerId,
                vat_not_required: org.vatNotRequired,
                contract_created_by: org.contractCreatedBy,
                organization_type: org.organizationType,
                account_no: org.accountNo,
                organization_group: org.organizationGroup,
                receiver_id: org.receiverId,
                gateway_configuration: org.gatewayConfiguration,
                vat_no: org.vatNo,
                name: org.name,
                active: org.active,
                is_daman_or_thiqa: org.isDamanOrThiqa,
                max_approval_time: org.maxApprovalTime,
                address_details: org.addressDetails,
                building_no: org.buildingNo,
                city: org.city,
                country: org.country,
                postal_code: org.postalCode,
                state: org.state,
                dist: org.dist,
                contacts: org.contacts,
                insurance_id: org.insuranceId,
                branch_id: org.branchId,
                created_at: org.createdAt || new Date().toISOString()
            };
            const { error } = await getSupabase().from('finance_organizations').upsert(dbOrg);
            if (error) {
                console.warn("Supabase organization upsert warning:", error.message);
            }
        } catch (err: any) {
            console.warn("Supabase organization upsert exception:", err.message);
        }
    }
  };

  const deleteOrganization = async (id: string) => {
    setOrganizations(prev => {
        const updated = prev.filter(o => o.id !== id);
        localStorage.setItem('medicore_organizations', JSON.stringify(updated));
        return updated;
    });

    if (checkConfigured()) {
        try {
            await getSupabase().from('finance_organizations').delete().eq('id', id);
        } catch (err) {}
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
      dentalICDs, saveDentalICD, uploadDentalICDs, deleteDentalICD,
      availabilities, saveAvailability, deleteAvailability,
      appointments, bookAppointment, updateAppointment, cancelAppointment,
      bills, createBill, cancelBill, addPayment,
      vitals, diagnoses, narrativeDiagnoses, clinicalNotes, allergies, patientDocuments,
      saveVitalSign, saveDiagnosis, deleteDiagnosis, saveNarrativeDiagnosis, saveClinicalNote, saveAllergy,
      savePatientDocument, deletePatientDocument,
      serviceOrders, saveServiceOrders, cancelServiceOrder,
      inventoryItems, saveInventoryItem, uploadInventoryItems, branches, saveBranch, deleteBranch,
      stores, saveStore, deleteStore,
      storeItemMappings, saveStoreItemMapping, deleteStoreItemMapping,
      openingStocks, saveOpeningStock, fetchStockLedger, fetchDashboardMetrics,
      saveDirectSale, fetchBatchDetails, repairPh000006, processPharmacyReturn, fetchBillItems,
      prescriptions, savePrescription, dispensePrescription,
      drugGenerics, drugMasters, saveDrugMaster, deleteDrugMaster,
      taxMasters, saveTaxMaster, deleteTaxMaster, itemTaxMappings, saveItemTaxMapping, deleteItemTaxMapping,
      organizations, saveOrganization, deleteOrganization,
      sponsorTariffs, saveSponsorTariff, saveSponsorTariffBatch, deleteSponsorTariff, resolveNegotiatedPrice, getBasePrice,
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