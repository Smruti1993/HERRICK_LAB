import { Home, Users, Calendar, Settings, Clock, Activity, Database, CreditCard, Stethoscope, FileBarChart, Package } from 'lucide-react';

export const APP_NAME = "MediCore HMS";

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  category?: string; // Optional grouping
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home, category: 'Main' },
  { label: 'Appointments', path: '/appointments', icon: Calendar, category: 'Main' },
  { label: 'Patients', path: '/patients', icon: Users, category: 'Main' },
  { label: 'Billing', path: '/billing', icon: CreditCard, category: 'Main' },
  
  // Patient Care Section
  { label: 'Doctor Workbench', path: '/doctor-workbench', icon: Stethoscope, category: 'Patient Care' },

  { label: 'Reports', path: '/reports', icon: FileBarChart, category: 'Administration' },
  { label: 'Doctors & Staff', path: '/employees', icon: Activity, category: 'Administration' },
  { label: 'Availability', path: '/availability', icon: Clock, category: 'Administration' },
  { label: 'Masters', path: '/masters', icon: Settings, category: 'Administration' },
  
  // Inventory Section
  { label: 'Inventory', path: '/inventory', icon: Package, category: 'Inventory' },

  { label: 'Connection', path: '/connection', icon: Database, category: 'System' },
];

export const MOCK_DEPARTMENTS = [
  { id: '1', name: 'Cardiology', code: 'CARD', status: 'Active' },
  { id: '2', name: 'Neurology', code: 'NEURO', status: 'Active' },
  { id: '3', name: 'General Medicine', code: 'GEN', status: 'Active' },
  { id: '4', name: 'Orthopedics', code: 'ORTHO', status: 'Active' },
];

export const MOCK_EMPLOYEES = [
  { 
    id: '101', firstName: 'Sarah', lastName: 'Connor', email: 's.connor@medicore.com', 
    phone: '555-0101', role: 'Doctor', departmentId: '1', specialization: 'Heart Surgeon', status: 'Active' 
  },
  { 
    id: '102', firstName: 'Gregory', lastName: 'House', email: 'g.house@medicore.com', 
    phone: '555-0102', role: 'Doctor', departmentId: '3', specialization: 'Diagnostician', status: 'Active' 
  },
];