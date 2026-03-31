
// Simulating Database Schema

export interface MasterEntity {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive';
}

export interface Department extends MasterEntity {}
export interface Unit extends MasterEntity {}
export interface ServiceCentre extends MasterEntity {}

// New Interface for Master Diagnosis List
export interface MasterDiagnosis {
  id: string;
  code: string; // ICD Code
  description: string;
  status: 'Active' | 'Inactive';
}

export interface ServiceTariff {
  id: string;
  serviceId: string;
  tariffName: string;
  price: number;
  effectiveDate: string;
  status: 'Active' | 'Inactive';
}

// NEW: Service Master Definition
export interface ServiceDefinition {
  id: string;
  code: string;
  name: string;
  alternateName?: string;
  serviceType: string;
  serviceCategory: string;
  estDuration?: number;
  status: 'Active' | 'Inactive';
  chargeable: boolean;
  applicableVisitType: 'New' | 'Follow-up' | 'Both';
  applicableGender: 'Male' | 'Female' | 'Both';
  reOrderDuration?: number;
  autoCancellationDays?: number;
  minTimeBilling?: number;
  maxTimeBilling?: number;
  maxOrderableQty?: number;
  cptCode?: string;
  nphiesCode?: string;
  nphiesDesc?: string;
  schedulable: boolean;
  surgicalService: boolean;
  individuallyOrderable: boolean;
  autoProcessable: boolean;
  consentRequired: boolean;
  isRestricted: boolean;
  isExternal: boolean;
  isPercentageTariff: boolean;
  isToothMandatory: boolean;
  isAuthRequired: boolean;
  groupName?: string;
  billingGroupName?: string;
  financialGroup?: string;
  cptDescription?: string;
  specialInstructions?: string;
  // Optional for frontend convenience to store nested tariffs
  tariffs?: ServiceTariff[];
}

// NEW: CPOE Service Order
export interface ServiceOrder {
  id: string;
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  cptCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  orderDate: string;
  status: 'Ordered' | 'Cancelled' | 'Completed';
  billingStatus: 'Invoiced' | 'Pending';
  priority: 'Routine' | 'Urgent';
  orderingDoctorId: string;
  instructions?: string;
  serviceCenter?: string;
  toothNumbers?: string; // New field for Dental
}

export enum EmployeeRole {
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  ADMIN = 'Admin',
  STAFF = 'Staff'
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  departmentId?: string; // Foreign Key to Department
  specialization?: string;
  status: 'Active' | 'Inactive';
}

export interface AppUser {
  id: string;
  username: string;
  role: string;
  fullName: string;
  employeeId?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  registrationDate: string;
}

export interface DoctorAvailability {
  id: string;
  doctorId: string; // Foreign Key to Employee
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format (24h)
  endTime: string;   // HH:mm format (24h)
  slotDurationMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string; // Foreign Key to Patient
  doctorId: string;  // Foreign Key to Employee
  departmentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'Scheduled' | 'Checked-In' | 'In-Consultation' | 'Completed' | 'Cancelled';
  visitType?: 'New Visit' | 'Follow-up';
  paymentMode?: string;
  symptoms?: string;
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

// --- Billing Types ---

export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Card' | 'Insurance' | 'Online';
  reference?: string;
}

export interface Bill {
  id: string;
  patientId: string;
  appointmentId?: string; // Optional link to an appointment
  date: string;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';
  totalAmount: number;
  paidAmount: number;
  items: BillItem[];
  payments: Payment[];
}

// --- Clinical / Workbench Types ---

export interface VitalSign {
  id: string;
  appointmentId: string;
  recordedAt: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  map?: number; // Mean Arterial Pressure
  tobaccoUse?: string;
  rowRemarks?: Record<string, string>; // JSON object for per-row remarks
}

export interface Diagnosis {
  id: string;
  appointmentId: string;
  code?: string;
  icdCode?: string;
  description: string;
  type: 'Provisional' | 'Final' | 'Primary' | 'Secondary';
  isPoa?: boolean; // Present On Admission
  addedAt: string;
}

export interface NarrativeDiagnosis {
  id: string;
  appointmentId: string;
  illness?: string;
  illnessDurationValue?: number;
  illnessDurationUnit?: string;
  behaviouralActivity?: string;
  narrative?: string;
  recordedAt: string;
}

export interface ClinicalNote {
  id: string;
  appointmentId: string;
  noteType: string; // 'Chief Complaint', 'Past History', etc.
  description: string;
  recordedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  allergyType: string; // 'Drug', 'Food', etc.
  severity: string;
  reaction?: string;
  status: 'Active' | 'Resolved';
  onsetDate?: string;
  resolvedDate?: string;
  remarks?: string;
}


// --- Vital Sign Master Types ---

export interface VitalSignGroup {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface VitalSignParameter {
  id: string;
  groupId: string;
  name: string;
  controlType: 'Text' | 'Formula' | 'Numeric' | 'Dropdown';
  referenceRangeMin?: string;
  referenceRangeMax?: string;
  unit?: string;
  isActive: boolean;
  formula?: string; // If controlType is Formula
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
