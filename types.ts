// Simulating Database Schema

export interface MasterEntity {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive';
}

export interface Department extends MasterEntity {}
export interface Unit extends MasterEntity {}
export interface ServiceCentre extends MasterEntity {
  departmentId?: string; // Foreign Key to Department
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
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  symptoms?: string;
  notes?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
