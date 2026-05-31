import { Home, Users, Calendar, Settings, Clock, Activity, Database, CreditCard, Stethoscope, FileBarChart, Package, Pill, ShoppingCart } from 'lucide-react';

export const APP_NAME = "MediCore HMS";

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  category?: string; // Optional grouping
  subItems?: { 
    label: string; 
    path?: string; 
    icon?: any;
    subItems?: { label: string; path: string; icon?: any }[];
  }[];
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
  { 
    label: 'Inventory', 
    path: '/inventory', 
    icon: Package, 
    category: 'Inventory',
    subItems: [
      { label: 'Dashboard / Overview', path: '/inventory/dashboard' },
      { label: 'Opening Stock', path: '/inventory/opening-stock' },
      { 
        label: 'Reports', 
        path: '/inventory/reports',
        subItems: [
          { label: 'Stock Ledger', path: '/inventory/reports/stock-ledger' }
        ]
      },
      { 
        label: 'Masters',
        path: '/inventory/masters',
        subItems: [
          { label: 'Item Master', path: '/inventory/item-master' },
          { label: 'Store Master', path: '/inventory/store-master' },
          { label: 'Item-Store Map', path: '/inventory/item-store-map' }
        ]
      }
    ]
  },

  // Pharmacy Section
  {
    label: 'Pharmacy',
    path: '/pharmacy',
    icon: Pill,
    category: 'Pharmacy',
    subItems: [
      {
        label: 'Masters',
        path: '/pharmacy/masters',
        subItems: [
          { label: 'Drug Generic Master', path: '/pharmacy/masters/drug-generic' },
          { label: 'Drug Master', path: '/pharmacy/masters/drug-master' }
        ]
      },
      {
        label: 'Pharmacy Sale',
        path: '/pharmacy/direct-sale',
        icon: 'ShoppingCart'
      },
      {
        label: 'OP Pharmacy',
        path: '/pharmacy/op-pharmacy',
        icon: 'Clock'
      },
      {
        label: 'Drug Return',
        path: '/pharmacy/drug-return',
        icon: 'Undo'
      }
    ]
  },

  {
    label: 'Procurement',
    path: '/procurement',
    icon: ShoppingCart,
    category: 'Procurement',
    subItems: [
      {
        label: 'Masters',
        path: '/procurement/masters',
        subItems: [
          { label: 'Vendor Master', path: '/procurement/vendor-master' }
        ]
      },
      { label: 'Purchase Order', path: '/procurement/purchase-order' },
      { label: 'Goods Receipt Note (GRN)', path: '/procurement/grn' },
      { label: 'Purchase Receipt', path: '/procurement/purchase-receipt' },
      { label: 'Purchase Return', path: '/procurement/purchase-return' },
      { label: 'Expiry Item Return', path: '/procurement/expiry-return' },
      { label: 'Tax Management', path: '/procurement/tax' }
    ]
  },

  // Finance Section
  {
    label: 'Finance',
    path: '/finance',
    icon: CreditCard,
    category: 'Finance',
    subItems: [
      {
        label: 'Master',
        path: '/finance/masters',
        subItems: [
          { label: 'Organization', path: '/finance/masters/organization' },
          { label: 'Plan Definition', path: '/finance/masters/plan-definition' },
          { label: 'Sponsor Tariff', path: '/finance/masters/sponsor-tariff' }

        ]
      }
    ]
  },

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