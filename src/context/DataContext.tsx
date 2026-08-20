import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Patient, Employee, Department, Unit, ServiceCentre, 
  DoctorAvailability, Appointment, ToastMessage, Bill, Payment,
  DoctorSchedule, ScheduleTemplate, SlotType,
  VitalSign, Diagnosis, ClinicalNote, Allergy, NarrativeDiagnosis, MasterDiagnosis, DentalICD, ServiceDefinition, AppUser, ServiceTariff, ServiceOrder, ServiceLocationMapping, VitalSignGroup, VitalSignParameter, PatientDocument, InventoryItem, InventoryItemStock, InventoryItemPricing, Branch, Store, StoreItemMapping, OpeningStock, StockLedgerEntry, DashboardMetrics, DirectSale, Prescription, PrescriptionItem, DrugGeneric, DrugMaster, TaxMaster, ItemTaxMapping, Organization, OrganizationContact, SponsorTariff, Vendor, VendorTerm, PurchaseOrder, PurchaseOrderItem, GRN, GRNItem, PurchaseReceipt, PurchaseReceiptItem, PurchaseReturn, PurchaseReturnItem, ExpiryReturn, ExpiryReturnItem, ChartOfAccount, JournalVoucher, JournalVoucherItem, GSTR2BUpload, GSTR2BInvoice, Currency, PatientRefund,
  Role, Screen, Privilege,
  LoyaltyProgramConfig, LoyaltyTier, LoyaltyRedemptionRules, LoyaltyBonusRule, LoyaltyAccount, LoyaltyTransaction, LoyaltyAccountLookupResult, LoyaltyRedemptionCalc,
  PharmacyZone, PharmacyRack, InventoryBatchLocation, LabServiceReagent, LabReagentConsumptionLog, SubstitutionLogInput
} from '../types';
import { 
    getSupabase, 
    checkConfigured, 
    saveCredentialsToStorage, 
    clearCredentialsFromStorage,
    BACKEND_URL,
    getAuthToken
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
  serviceLocationMappings: ServiceLocationMapping[];
  saveServiceLocationMappings: (serviceId: string, mappings: ServiceLocationMapping[]) => Promise<void>;

  dentalICDs: DentalICD[];
  saveDentalICD: (icd: DentalICD) => void;
  uploadDentalICDs: (icds: DentalICD[]) => Promise<void>;
  deleteDentalICD: (id: string) => void;
  
  availabilities: DoctorAvailability[];
  saveAvailability: (avail: DoctorAvailability) => void;
  deleteAvailability: (id: string) => void;
  doctorSchedules: DoctorSchedule[];
  scheduleTemplates: ScheduleTemplate[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  
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

  reagentsMapping: LabServiceReagent[];
  fetchReagentMappings: (serviceId?: string) => Promise<void>;
  saveReagentMapping: (mapping: LabServiceReagent) => Promise<boolean>;
  deleteReagentMapping: (id: string) => Promise<boolean>;
  fetchReagentConsumptionLog: (labOrderId: string) => Promise<LabReagentConsumptionLog[]>;

  openingStocks: OpeningStock[];
  saveOpeningStock: (stock: OpeningStock) => Promise<void>;
  
  saveDirectSale: (sale: DirectSale) => Promise<{ success: boolean; savedSale?: DirectSale }>;
  fetchDirectSales: (filters?: { storeId?: string; fromDate?: string; toDate?: string }) => Promise<DirectSale[]>;
  fetchBatchDetails: (storeId: string, itemId: string) => Promise<Array<{ batchNo: string, currentStock: number, mrp: number, rate: number, batchDate?: string, expiryDate?: string }>>;
  fetchAlternates: (itemId: string, storeId: string, prescriptionId?: string) => Promise<{ original_drug: any, alternates: any[] }>;
  logSubstitutions: (logs: SubstitutionLogInput[]) => Promise<boolean>;
  
  fetchStockLedger: (filters: { storeId: string; fromDate?: string; toDate?: string; itemCategory?: string; searchQuery?: string }) => Promise<StockLedgerEntry[]>;
  fetchDashboardMetrics: (storeId: string) => Promise<DashboardMetrics | null>;
  repairPh000006: (storeId: string) => Promise<void>;
  dispensePrescription: (prescriptionId: string, storeId: string, allocatedBatches: Record<string, { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount?: number }>, issueQty?: Record<string, number>, dispensingUom?: Record<string, string>, paymentMode?: string, referenceNo?: string, paidAmount?: number, paymentStatus?: string) => Promise<{ success: boolean; invoiceId?: string }>;
  processPharmacyReturn: (originalBillId: string, storeId: string, returns: Array<{ itemId: string, batchNo: string, qty: number, rate: number, description: string, taxPercentage?: number }>, reason?: string) => Promise<{ success: boolean; invoiceId?: string }>;
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
  
  vendors: Vendor[];
  saveVendor: (vendor: Vendor) => Promise<boolean>;
  deleteVendor: (id: string) => Promise<boolean>;

  purchaseOrders: PurchaseOrder[];
  savePurchaseOrder: (po: PurchaseOrder) => Promise<boolean>;
  deletePurchaseOrder: (id: string) => Promise<boolean>;

  grns: GRN[];
  saveGRN: (grn: GRN) => Promise<boolean>;
  deleteGRN: (id: string) => Promise<boolean>;

  purchaseReceipts: PurchaseReceipt[];
  savePurchaseReceipt: (receipt: PurchaseReceipt) => Promise<boolean>;
  deletePurchaseReceipt: (id: string) => Promise<boolean>;

  purchaseReturns: PurchaseReturn[];
  savePurchaseReturn: (ret: PurchaseReturn) => Promise<boolean>;
  deletePurchaseReturn: (id: string) => Promise<boolean>;

  expiryReturns: ExpiryReturn[];
  saveExpiryReturn: (ret: ExpiryReturn) => Promise<boolean>;
  deleteExpiryReturn: (id: string) => Promise<boolean>;
  fetchExpiryItems: (storeId: string, noOfDays: number) => Promise<any[]>;

  chartOfAccounts: ChartOfAccount[];
  saveChartOfAccount: (coa: ChartOfAccount) => Promise<boolean>;
  deleteChartOfAccount: (id: string) => Promise<boolean>;

  journalVouchers: JournalVoucher[];
  saveJournalVoucher: (jv: JournalVoucher) => Promise<boolean>;
  deleteJournalVoucher: (id: string) => Promise<boolean>;
  postAutoJournalVoucher: (
    type: 'GRN' | 'PHARMACY_SALE' | 'OP_DISPENSE',
    refDocId: string,
    refDocNo: string,
    amountDetails: {
      net: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      tax?: number;
      gross?: number;
      partyName?: string;
      description?: string;
      paymentMode?: string;
    }
  ) => Promise<boolean>;

  gstr2bUploads: GSTR2BUpload[];
  gstr2bInvoices: GSTR2BInvoice[];
  saveGstr2bUpload: (upload: GSTR2BUpload, invoices: GSTR2BInvoice[]) => Promise<boolean>;
  markUploadReconciled: (uploadId: string) => Promise<boolean>;

  currencies: Currency[];
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  saveCurrency: (curr: Currency) => Promise<boolean>;
  deleteCurrency: (id: string) => Promise<boolean>;
  formatCurrency: (amount: number | string) => string;
  completeDirectSalePayment: (sale: DirectSale, paymentId: string, orderId: string) => Promise<boolean>;
  patientRefunds: PatientRefund[];
  processPatientRefund: (patientId: string, itemsList: Array<{ type: 'Return' | 'ServiceInvoice', id: string, amount: number }>, totalAmount: number, remarks: string) => Promise<{ success: boolean; refundNo?: string }>;

  isLoading: boolean;
  isDbConnected: boolean;

  updateDbConnection: (url: string, key: string) => void;
  disconnectDb: () => void;

  // Loyalty Wallet System
  loyaltyAccounts: LoyaltyAccount[];
  loyaltyTransactions: LoyaltyTransaction[];
  loyaltyProgramConfig: LoyaltyProgramConfig | null;
  loyaltyTiers: LoyaltyTier[];
  loyaltyRedemptionRules: LoyaltyRedemptionRules | null;
  loyaltyBonusRules: LoyaltyBonusRule[];
  
  enrollOrFetchLoyaltyAccount: (mobile: string, name: string, patientId?: string) => Promise<LoyaltyAccountLookupResult | null>;
  calculateLoyaltyRedemption: (accountId: string, billAmount: number) => Promise<LoyaltyRedemptionCalc | null>;
  processLoyaltyTransaction: (accountId: string, billNo: string, billAmount: number, cashPaid: number, pointsRedeemed: number) => Promise<boolean>;
  reverseLoyaltyTransaction: (billNo: string) => Promise<boolean>;
  manualLoyaltyAdjustment: (accountId: string, type: 'ADJUST_ADD' | 'ADJUST_SUB', points: number, reason: string) => Promise<boolean>;
  saveLoyaltyProgramConfig: (config: LoyaltyProgramConfig) => Promise<boolean>;
  saveLoyaltyTier: (tier: LoyaltyTier) => Promise<boolean>;
  saveLoyaltyRedemptionRules: (rules: LoyaltyRedemptionRules) => Promise<boolean>;
  saveLoyaltyBonusRule: (rule: LoyaltyBonusRule) => Promise<boolean>;

  // Pharmacy Location Hierarchy
  pharmacyZones: PharmacyZone[];
  pharmacyRacks: PharmacyRack[];
  savePharmacyZone: (zone: Omit<PharmacyZone, 'id'> & { id?: string }) => Promise<boolean>;
  deletePharmacyZone: (id: string) => Promise<boolean>;
  savePharmacyRack: (rack: Omit<PharmacyRack, 'id'> & { id?: string }) => Promise<boolean>;
  deletePharmacyRack: (id: string) => Promise<boolean>;
  saveBatchLocation: (loc: InventoryBatchLocation) => Promise<boolean>;
  deleteBatchLocation: (id: string) => Promise<boolean>;
  fetchBatchLocation: (storeId: string, itemId: string, batchNo: string) => Promise<InventoryBatchLocation | null>;
  fetchStoreBatchLocations: (storeId: string, searchTerm?: string) => Promise<InventoryBatchLocation[]>;
  // RBAC Roles & Screens
  roles: Role[];
  screens: Screen[];
  saveRole: (role: Role) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;
  saveScreen: (screen: Omit<Screen, 'id'> & { id?: string }) => Promise<boolean>;
  deleteScreen: (id: string) => Promise<boolean>;
  saveRolePrivileges: (roleId: string, privileges: Omit<Privilege, 'screen_code'|'screen_name'|'module'>[]) => Promise<boolean>;
  saveUserOverrides: (userId: string, overrides: Omit<Privilege, 'screen_code'|'screen_name'|'module'>[]) => Promise<boolean>;
  updateAppUserRole: (userId: string, roleId: string | null, isActive: boolean, userCode?: string, mobile?: string) => Promise<boolean>;
  saveAppUser: (appUser: Partial<AppUser> & { password?: string }) => Promise<boolean>;
  deleteAppUser: (userId: string) => Promise<boolean>;
}

export const getCurrencySymbol = (code: string): string => {
  try {
    const local = localStorage.getItem('medicore_currencies');
    if (local) {
      const list = JSON.parse(local);
      const found = list.find((c: any) => c.code === code);
      if (found) return found.symbol;
    }
  } catch (e) {}
  switch (code) {
    case 'INR': return '₹';
    case 'SAR': return 'SAR';
    case 'USD': return '$';
    case 'BHD': return 'BD';
    case 'QAR': return 'QR';
    default: return code;
  }
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth State
  const [user, setUser] = useState<AppUser | null>(() => {
      const saved = localStorage.getItem('medicore_user');
      return saved ? JSON.parse(saved) : null;
  });

  // Currency State
  const [currencies, setCurrencies] = useState<Currency[]>(() => {
    const local = localStorage.getItem('medicore_currencies');
    if (local) return JSON.parse(local);
    return [
      { id: 'c1', code: 'INR', name: 'Indian Rupee', symbol: '₹', isActive: true, isDefault: true },
      { id: 'c2', code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', isActive: true, isDefault: false },
      { id: 'c3', code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', isActive: true, isDefault: false },
      { id: 'c4', code: 'USD', name: 'US Dollar', symbol: '$', isActive: true, isDefault: false },
      { id: 'c5', code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', isActive: true, isDefault: false }
    ];
  });

  const [selectedCurrency, setSelectedCurrencyState] = useState<string>(() => {
    return localStorage.getItem('medicore_selected_currency') || 'INR';
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
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([]);
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
  const [reagentsMapping, setReagentsMapping] = useState<LabServiceReagent[]>([]);
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
  const [serviceLocationMappings, setServiceLocationMappings] = useState<ServiceLocationMapping[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStock[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sponsorTariffs, setSponsorTariffs] = useState<SponsorTariff[]>(() => {
      const saved = localStorage.getItem('medicore_sponsor_tariffs');
      return saved ? JSON.parse(saved) : [];
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [expiryReturns, setExpiryReturns] = useState<ExpiryReturn[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => {
    const local = localStorage.getItem('medicore_chart_of_accounts');
    if (local) return JSON.parse(local);
    return [
      { id: 'coa-root-1', code: '100000', name: 'Assets', accountType: 'Asset', balanceNature: 'Debit', isGroup: true, description: 'Asset group accounts', status: 'Active' },
      { id: 'coa-root-2', code: '200000', name: 'Liabilities', accountType: 'Liability', balanceNature: 'Credit', isGroup: true, description: 'Liability group accounts', status: 'Active' },
      { id: 'coa-root-3', code: '400000', name: 'Income', accountType: 'Revenue', balanceNature: 'Credit', isGroup: true, description: 'Revenue group accounts', status: 'Active' },
      { id: 'coa-root-4', code: '500000', name: 'Expenses', accountType: 'Expense', balanceNature: 'Debit', isGroup: true, description: 'Expense group accounts', status: 'Active' },
      
      { id: 'coa-sub-1', code: '110000', name: 'Cash & Bank', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-root-1', isGroup: true, description: 'Cash and bank group', status: 'Active' },
      { id: 'coa-sub-2', code: '130000', name: 'Duties & Taxes Receivable', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-root-1', isGroup: true, description: 'Duties and taxes group', status: 'Active' },
      { id: 'coa-sub-3', code: '220000', name: 'Duties & Taxes Payable', accountType: 'Liability', balanceNature: 'Credit', parentId: 'coa-root-2', isGroup: true, description: 'Duties and taxes payable group', status: 'Active' },
      
      { id: 'coa-item-1', code: '510000', name: 'Medicine Purchase A/C', accountType: 'Expense', balanceNature: 'Debit', parentId: 'coa-root-4', isGroup: false, systemPurpose: 'Captures the net factory-cost of medicines coming into the warehouse before taxes.', status: 'Active' },
      { id: 'coa-item-2', code: '131000', name: 'Input CGST (Provisional)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'Parks the central government tax portion paid to vendors. Locked from tax deductions.', status: 'Active' },
      { id: 'coa-item-3', code: '132000', name: 'Input SGST (Provisional)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'Parks the state government tax portion paid to vendors. Locked from tax deductions.', status: 'Active' },
      { id: 'coa-item-4', code: '133000', name: 'Input CGST (Approved)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'The verified central tax vault. Unlocked by matching excel files to reduce tax liabilities.', status: 'Active' },
      { id: 'coa-item-5', code: '134000', name: 'Input SGST (Approved)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'The verified state tax vault. Unlocked by matching excel files to reduce tax liabilities.', status: 'Active' },
      { id: 'coa-item-6', code: '210000', name: 'Accounts Payable Ledger', accountType: 'Liability', balanceNature: 'Credit', parentId: 'coa-root-2', isGroup: false, systemPurpose: 'Tracks the live, un-truncated debt owed to each specific wholesale pharmaceutical distributor.', status: 'Active' },
      { id: 'coa-item-7', code: '410000', name: 'Pharmacy Sales Revenue', accountType: 'Revenue', balanceNature: 'Credit', parentId: 'coa-root-3', isGroup: false, systemPurpose: 'Stores the base earnings extracted backward from retail medicine shelf-sales.', status: 'Active' },
      { id: 'coa-item-8', code: '221000', name: 'Output CGST Liability', accountType: 'Liability', balanceNature: 'Credit', parentId: 'coa-sub-3', isGroup: false, systemPurpose: 'Accumulates the central tax slice collected from patients. Owed to the state treasury.', status: 'Active' },
      { id: 'coa-item-9', code: '222000', name: 'Output SGST Liability', accountType: 'Liability', balanceNature: 'Credit', parentId: 'coa-sub-3', isGroup: false, systemPurpose: 'Accumulates the state tax slice collected from patients. Owed to the state treasury.', status: 'Active' },
      { id: 'coa-item-10', code: '580000', name: 'Tax Variance Purchase Loss', accountType: 'Expense', balanceNature: 'Debit', parentId: 'coa-root-4', isGroup: false, systemPurpose: 'A specialized write-off account to absorb losses caused by internal human data-entry typos.', status: 'Active' },
      { id: 'coa-item-11', code: '111000', name: 'Cash Account', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-1', isGroup: false, systemPurpose: 'Tracks physical hard cash collections inside the pharmacy\'s retail counter drawer.', status: 'Active' },
      { id: 'coa-item-12', code: '112000', name: 'Bank Clearing Account', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-1', isGroup: false, systemPurpose: 'Tracks digital payment collections (UPI scans, Credit Cards, NetBanking transfers).', status: 'Active' },
      { id: '13500000-1350-4000-8000-000000135000', code: '135000', name: 'Input IGST (Provisional)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'Parks the integrated government tax portion paid to interstate vendors. Locked from tax deductions.', status: 'Active' },
      { id: '13600000-1360-4000-8000-000000136000', code: '136000', name: 'Input IGST (Approved)', accountType: 'Asset', balanceNature: 'Debit', parentId: 'coa-sub-2', isGroup: false, systemPurpose: 'The verified integrated tax vault. Unlocked by matching excel files to reduce tax liabilities.', status: 'Active' },
      { id: '22300000-2230-4000-8000-000000223000', code: '223000', name: 'Output IGST Liability', accountType: 'Liability', balanceNature: 'Credit', parentId: 'coa-sub-3', isGroup: false, systemPurpose: 'Accumulates the integrated tax slice collected from interstate patients. Owed to the treasury.', status: 'Active' }
    ];
  });

  const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>(() => {
    const local = localStorage.getItem('medicore_journal_vouchers');
    return local ? JSON.parse(local) : [];
  });

  const [gstr2bUploads, setGstr2bUploads] = useState<GSTR2BUpload[]>([]);
  const [gstr2bInvoices, setGstr2bInvoices] = useState<GSTR2BInvoice[]>([]);
  const [patientRefunds, setPatientRefunds] = useState<PatientRefund[]>([]);

  // Loyalty Wallet System States
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loyaltyProgramConfig, setLoyaltyProgramConfig] = useState<LoyaltyProgramConfig | null>(null);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [loyaltyRedemptionRules, setLoyaltyRedemptionRules] = useState<LoyaltyRedemptionRules | null>(null);
  const [loyaltyBonusRules, setLoyaltyBonusRules] = useState<LoyaltyBonusRule[]>([]);

  // Pharmacy Location Hierarchy masters
  const [pharmacyZones, setPharmacyZones] = useState<PharmacyZone[]>([]);
  const [pharmacyRacks, setPharmacyRacks] = useState<PharmacyRack[]>([]);

  // RBAC states
  const [roles, setRoles] = useState<Role[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);



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
  const mapServiceCentreFromDb = (d: any): ServiceCentre => ({ id: d.id, name: d.name, code: d.code, status: d.status, departmentId: d.department_id });
  const mapBranchFromDb = (b: any): Branch => ({ id: b.id, name: b.name, code: b.code, status: b.status, vatRegNo: b.vat_reg_no, logoUrl: b.logo_url });
  const mapBranchToDb = (b: Branch) => ({ id: b.id, name: b.name, code: b.code, status: b.status, vat_reg_no: b.vatRegNo, logo_url: b.logoUrl });
  
  const mapLocationMappingFromDb = (m: any): ServiceLocationMapping => ({
    id: m.id,
    serviceId: m.service_id,
    branchId: m.branch_id,
    departmentId: m.department_id,
    serviceCentreId: m.service_centre_id,
    isPrimary: m.is_primary
  });
  const mapLocationMappingToDb = (m: ServiceLocationMapping) => ({
    id: m.id,
    service_id: m.serviceId,
    branch_id: m.branchId,
    department_id: m.departmentId || null,
    service_centre_id: m.serviceCentreId,
    is_primary: m.isPrimary
  });
  
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

  const mapDoctorScheduleFromDb = (s: any): DoctorSchedule => ({
    id: s.id,
    doctorId: s.doctor_id,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time.substring(0, 5),
    endTime: s.end_time.substring(0, 5),
    slotType: s.slot_type as SlotType,
    slotDuration: s.slot_duration,
    isActive: s.is_active,
    createdBy: s.created_by,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  });

  const mapScheduleTemplateFromDb = (t: any): ScheduleTemplate => ({
    id: t.id,
    doctorId: t.doctor_id,
    templateName: t.template_name,
    weekStart: t.week_start,
    createdBy: t.created_by,
    createdAt: t.created_at
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
    // Use parseFloat for Postgres numeric columns — PostgREST returns them as strings
    totalAmount: parseFloat(b.total_amount ?? '0') || 0,
    paidAmount: parseFloat(b.paid_amount ?? '0') || 0,
    discountAmount: parseFloat(b.discount_amount ?? '0') || 0,
    taxAmount: parseFloat(b.tax_amount ?? '0') || 0,
    roundOff: parseFloat(b.round_off ?? '0') || 0,
    paymentMode: b.payment_mode,
    amountReceived: parseFloat(b.amount_received ?? '0') || 0,
    referenceNo: b.reference_no,
    notes: b.notes,
    departmentId: b.department_id,
    isPharmacy: !!(b.is_pharmacy || (b.invoice_no && (b.invoice_no.startsWith('PH-') || b.invoice_no.startsWith('INV-D-')))),
    prescriptionId: b.prescription_id,
    doctorId: b.doctor_id,
    createdBy: b.created_by,
    // New schema columns
    branchId: b.branch_id ?? undefined,
    payerType: b.payer_type ?? 'Self',
    sponsorId: b.sponsor_id ?? undefined,
    patientDueAmount: parseFloat(b.patient_due_amount ?? '0') || 0,
    sponsorDueAmount: parseFloat(b.sponsor_due_amount ?? '0') || 0,
    items: items.map(i => ({
        id: i.id,
        description: i.description,
        quantity: parseInt(i.quantity ?? '0', 10) || 0,
        unitPrice: parseFloat(i.unit_price ?? '0') || 0,
        total: parseFloat(i.total ?? '0') || 0,
        itemId: i.item_id,
        batchNo: i.batch_no,
        discountAmount: parseFloat(i.discount_amount ?? '0') || 0,
        discountPercentage: parseFloat(i.discount_percentage ?? '0') || 0,
        taxAmount: parseFloat(i.tax_amount ?? '0') || 0,
        taxPercentage: parseFloat(i.tax_percentage ?? '0') || 0,
        itemType: i.item_type,
    })),
    payments: payments.map(p => ({
        id: p.id,
        date: p.date,
        amount: parseFloat(p.amount ?? '0') || 0,
        method: p.method,
        reference: p.reference,
    })),
    refundStatus: b.refund_status || 'Pending',
    refundId: b.refund_id ?? undefined,
    cancelledAt: b.cancelled_at ?? undefined,
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

  const mapCurrencyFromDb = (c: any): Currency => ({
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    isActive: !!c.is_active,
    isDefault: !!c.is_default,
    createdAt: c.created_at
  });

  const mapCurrencyToDb = (c: Currency) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    is_active: c.isActive,
    is_default: c.isDefault
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
    storageCondition: i.storage_condition,
    purchaseUom: i.purchase_uom,
    salesUom: i.sales_uom,
    purchaseConversionFactor: Number(i.purchase_conversion_factor || 1),
    salesConversionFactor: Number(i.sales_conversion_factor || 1),
    defaultPricingMethod: i.default_pricing_method,
    defaultMarkupPercentage: i.default_markup_percentage,
    branch: i.branch,
    purchaseInventoryAcc: i.purchase_inventory_acc,
    costOfSalesAcc: i.cost_of_sales_acc,
    saleAccount: i.sale_account,
    reorderLevel: i.reorder_level ?? 50,
    minStockLevel: i.min_stock_level ?? 10,
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
    storeType: s.store_type,
    departmentId: s.department_id,
    createdAt: s.created_at
  });

  const mapStoreToDb = (s: Store) => ({
    id: s.id,
    store_code: s.storeCode,
    store_name: s.storeName,
    branch_id: s.branchId,
    status: s.status,
    is_active: s.isActive,
    store_type: s.storeType || null,
    department_id: s.departmentId || null
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
    storage_condition: i.storageCondition || null,
    purchase_uom: i.purchaseUom,
    sales_uom: i.salesUom,
    purchase_conversion_factor: i.purchaseConversionFactor || 1,
    sales_conversion_factor: i.salesConversionFactor || 1,
    default_pricing_method: i.defaultPricingMethod,
    default_markup_percentage: i.defaultMarkupPercentage,
    branch: i.branch,
    purchase_inventory_acc: i.purchaseInventoryAcc,
    cost_of_sales_acc: i.costOfSalesAcc,
    sale_account: i.saleAccount,
    reorder_level: i.reorderLevel,
    min_stock_level: i.minStockLevel
  });

  const mapVendorFromDb = (v: any, terms: any[] = []): Vendor => ({
    id: v.id,
    code: v.code,
    name: v.name,
    vendorType: v.vendor_type,
    billingStructure: v.billing_structure,
    currency: v.currency === 'SAR' ? 'INR' : (v.currency || 'INR'),
    address: v.address || undefined,
    creditPeriod: v.credit_period,
    rating: v.rating,
    paymentTerm: v.payment_term,
    supplierSubType: v.supplier_sub_type,
    panNo: v.pan_no,
    regstStatus: v.regst_status,
    accountGroup: v.account_group,
    tdsType: v.tds_type,
    exportLicense: v.export_license,
    account: v.account,
    remarks: v.remarks,
    active: !!v.active,
    qualityCheckRequired: !!v.quality_check_required,
    suspended: !!v.suspended,
    isoCertified: !!v.iso_certified,
    isVat: !!v.is_vat,
    bankInfo: v.bank_info || {},
    registrationDetails: v.registration_details || {},
    businessInfo: v.business_info || {},
    contactDetails: v.contact_details || {},
    terms: terms.map(t => ({ id: t.id, vendorId: t.vendor_id, termCode: t.term_code, termDesc: t.term_desc })),
    createdAt: v.created_at
  });

  const mapVendorToDb = (v: Vendor) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    vendor_type: v.vendorType,
    billing_structure: v.billingStructure,
    currency: v.currency,
    address: v.address || null,
    credit_period: v.creditPeriod,
    rating: v.rating,
    payment_term: v.paymentTerm,
    supplier_sub_type: v.supplierSubType,
    pan_no: v.panNo,
    regst_status: v.regstStatus,
    account_group: v.accountGroup,
    tds_type: v.tdsType,
    export_license: v.exportLicense,
    account: v.account,
    remarks: v.remarks,
    active: v.active,
    quality_check_required: v.qualityCheckRequired,
    suspended: v.suspended,
    iso_certified: v.isoCertified,
    is_vat: v.isVat,
    bank_info: v.bankInfo || {},
    registration_details: v.registrationDetails || {},
    business_info: v.businessInfo || {},
    contact_details: v.contactDetails || {}
  });

  const mapChartOfAccountFromDb = (c: any): ChartOfAccount => ({
    id: c.id,
    code: c.code,
    name: c.name,
    accountType: c.account_type,
    accountGroup: c.account_group || undefined,
    balanceNature: c.balance_nature,
    systemPurpose: c.system_purpose || undefined,
    parentId: c.parent_id || undefined,
    isGroup: !!c.is_group,
    description: c.description || undefined,
    status: c.status || 'Active',
    createdAt: c.created_at,
    updatedAt: c.updated_at
  });

  const mapChartOfAccountToDb = (c: ChartOfAccount) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    account_type: c.accountType,
    account_group: c.accountGroup || null,
    balance_nature: c.balanceNature,
    system_purpose: c.systemPurpose || null,
    parent_id: c.parentId || null,
    is_group: c.isGroup,
    description: c.description || null,
    status: c.status
  });

  const mapJournalVoucherFromDb = (v: any, items: any[] = []): JournalVoucher => ({
    id: v.id,
    voucherNo: v.voucher_no,
    voucherDate: v.voucher_date,
    refType: v.ref_type,
    refDocId: v.ref_doc_id || undefined,
    refDocNo: v.ref_doc_no || undefined,
    narration: v.narration || undefined,
    totalDebit: Number(v.total_debit || 0),
    totalCredit: Number(v.total_credit || 0),
    status: v.status || 'Draft',
    items: items.map(item => ({
      id: item.id,
      voucherId: item.voucher_id || undefined,
      accountId: item.account_id,
      postingNature: item.posting_nature,
      amount: Number(item.amount || 0),
      description: item.description || undefined
    })),
    createdAt: v.created_at,
    updatedAt: v.updated_at
  });

  const mapJournalVoucherToDb = (v: JournalVoucher) => ({
    id: v.id,
    voucher_no: v.voucherNo,
    voucher_date: v.voucherDate,
    ref_type: v.refType,
    ref_doc_id: v.refDocId || null,
    ref_doc_no: v.refDocNo || null,
    narration: v.narration || null,
    total_debit: v.totalDebit,
    total_credit: v.totalCredit,
    status: v.status
  });

  const mapJournalVoucherItemToDb = (i: JournalVoucherItem, voucherId: string) => ({
    id: i.id || crypto.randomUUID(),
    voucher_id: voucherId,
    account_id: i.accountId,
    posting_nature: i.postingNature,
    amount: i.amount,
    description: i.description || null
  });

  const mapPOFromDb = (p: any, items: any[] = []): PurchaseOrder => ({
    id: p.id,
    poNo: p.po_no,
    poType: p.po_type,
    vendorId: p.vendor_id,
    storeId: p.store_id,
    refDocDate: p.ref_doc_date,
    refDocNo: p.ref_doc_no,
    purchaseOrganisation: p.purchase_organisation,
    currencyCode: p.currency_code,
    currencyExchangeRate: Number(p.currency_exchange_rate || 1),
    validTill: p.valid_till,
    discountAmount: Number(p.discount_amount || 0),
    discountPercentage: Number(p.discount_percentage || 0),
    taxCode: p.tax_code,
    isNonStock: !!p.is_non_stock,
    accountCode: p.account_code,
    netAmount: Number(p.net_amount || 0),
    addressDetails: p.address_details || {},
    otherDetails: p.other_details || {},
    importedItems: p.imported_items || '',
    status: p.status || 'Draft',
    items: items.map(i => ({
      id: i.id,
      poId: i.po_id,
      itemId: i.item_id,
      quantity: Number(i.quantity || 0),
      publicPrice: Number(i.public_price || 0),
      discountPercentage: Number(i.discount_percentage || 0),
      unitCost: Number(i.unit_cost || 0),
      isBulk: !!i.is_bulk,
      taxStructure: i.tax_structure,
      remarks: i.remarks,
      sourceDocNum: i.source_doc_num,
      sourceDocDate: i.source_doc_date,
      sourceQuantity: Number(i.source_quantity || 0),
      pendingQuantity: Number(i.pending_quantity || 0),
      shortCloseQuantity: Number(i.short_close_quantity || 0)
    })),
    createdAt: p.created_at
  });

  const mapPOToDb = (p: PurchaseOrder) => ({
    id: p.id,
    po_no: p.poNo,
    po_type: p.poType,
    vendor_id: p.vendorId,
    store_id: p.storeId,
    ref_doc_date: p.refDocDate || null,
    ref_doc_no: p.refDocNo || null,
    purchase_organisation: p.purchaseOrganisation,
    currency_code: p.currencyCode,
    currency_exchange_rate: p.currencyExchangeRate || 1.0,
    valid_till: p.validTill || null,
    discount_amount: p.discountAmount || 0,
    discount_percentage: p.discountPercentage || 0,
    tax_code: p.taxCode || null,
    is_non_stock: p.isNonStock,
    account_code: p.accountCode || null,
    net_amount: p.netAmount,
    address_details: p.addressDetails || {},
    other_details: p.otherDetails || {},
    imported_items: p.importedItems || '',
    status: p.status || 'Draft'
  });

  const mapGRNFromDb = (g: any, items: any[] = []): GRN => ({
    id: g.id,
    grnNo: g.grn_no,
    grnType: g.grn_type,
    vendorId: g.vendor_id,
    storeId: g.store_id,
    poId: g.po_id || undefined,
    gateEntryDate: g.gate_entry_date,
    gateEntryNo: g.gate_entry_no,
    discountPercentage: Number(g.discount_percentage || 0),
    discountAmount: Number(g.discount_amount || 0),
    netAmount: Number(g.net_amount || 0),
    grossAmount: Number(g.gross_amount || 0),
    status: g.status || 'Draft',
    items: items.map(i => ({
      id: i.id,
      grnId: i.grn_id,
      itemId: i.item_id,
      locator: i.locator,
      batchCode: i.batch_code,
      batchDate: i.batch_date,
      expiryDate: i.expiry_date,
      poQuantity: Number(i.po_quantity || 0),
      receivedQuantity: Number(i.received_quantity || 0),
      acceptedQuantity: Number(i.accepted_quantity || 0),
      rate: Number(i.rate || 0),
      publicPrice: Number(i.public_price || 0),
      unitCost: Number(i.unit_cost || 0),
      discountPercentage: Number(i.discount_percentage || 0),
      discountAmount: Number(i.discount_amount || 0),
      vatPercentage: Number(i.vat_percentage || 15),
      vatAmount: Number(i.vat_amount || 0),
      cgstAmount: Number(i.cgst_amount || 0),
      sgstAmount: Number(i.sgst_amount || 0),
      igstAmount: Number(i.igst_amount || 0),
      totalAmount: Number(i.total_amount || 0),
      remarks: i.remarks,
      isBulky: !!i.is_bulky,
      qcStatus: i.qc_status || 'Passed'
    })),
    invoiceNo: g.invoice_no || undefined,
    createdAt: g.created_at
  });

  const mapGRNToDb = (g: GRN) => ({
    id: g.id,
    grn_no: g.grnNo,
    grn_type: g.grnType,
    vendor_id: g.vendorId,
    store_id: g.storeId,
    po_id: g.poId || null,
    gate_entry_date: g.gateEntryDate,
    gate_entry_no: g.gateEntryNo,
    discount_percentage: g.discountPercentage || 0,
    discount_amount: g.discountAmount || 0,
    net_amount: g.netAmount,
    gross_amount: g.grossAmount,
    invoice_no: g.invoiceNo || null,
    status: g.status || 'Draft'
  });

  const mapPRNFromDb = (p: any, items: any[] = []): PurchaseReceipt => ({
    id: p.id,
    receiptNo: p.receipt_no,
    receiptDate: p.receipt_date,
    grnId: p.grn_id || undefined,
    vendorId: p.vendor_id,
    storeId: p.store_id,
    taxProfile: p.tax_profile || undefined,
    netAmount: Number(p.net_amount || 0),
    addressDetails: p.address_details || {},
    referenceDetails: p.reference_details || {},
    lcDetails: p.lc_details || {},
    otherDetails: p.other_details || {},
    status: p.status || 'Draft',
    items: items.map(i => ({
      id: i.id,
      receiptId: i.receipt_id,
      itemId: i.item_id,
      quantity: Number(i.quantity || 0),
      remarks: i.remarks || undefined,
      rate: Number(i.rate || 0),
      discountPercentage: Number(i.discount_percentage || 0),
      discountAmount: Number(i.discount_amount || 0),
      sourceQuantity: Number(i.source_quantity || 0),
      pendingQuantity: Number(i.pending_quantity || 0),
      alreadyConvertedQuantity: Number(i.already_converted_quantity || 0),
      batchDetails: i.batch_details || {}
    })),
    createdAt: p.created_at
  });

  const mapPurchaseReturnFromDb = (r: any, items: any[] = []): PurchaseReturn => ({
    id: r.id,
    returnNo: r.return_no,
    returnDate: r.return_date,
    returnType: r.return_type,
    sourceGrnId: r.source_grn_id || undefined,
    sourcePrnId: r.source_prn_id || undefined,
    vendorId: r.vendor_id,
    storeId: r.store_id,
    netAmount: Number(r.net_amount || 0),
    remarks: r.remarks || undefined,
    status: r.status || 'Draft',
    items: items.map(i => ({
      id: i.id,
      returnId: i.return_id,
      itemId: i.item_id,
      quantity: Number(i.quantity || 0),
      rate: Number(i.rate || 0),
      discountPercentage: Number(i.discount_percentage || 0),
      discountAmount: Number(i.discount_amount || 0),
      sourceQuantity: Number(i.source_quantity || 0),
      returnReason: i.return_reason || undefined,
      batchDetails: i.batch_details || {}
    })),
    createdAt: r.created_at
  });

  const mapPurchaseReturnToDb = (r: PurchaseReturn) => ({
    id: r.id,
    return_no: r.returnNo,
    return_date: r.returnDate,
    return_type: r.returnType,
    source_grn_id: r.sourceGrnId || null,
    source_prn_id: r.sourcePrnId || null,
    vendor_id: r.vendorId,
    store_id: r.storeId,
    net_amount: r.netAmount,
    remarks: r.remarks || null,
    status: r.status || 'Draft'
  });

  const mapExpiryReturnFromDb = (r: any, items: any[] = []): ExpiryReturn => ({
    id: r.id,
    docNo: r.doc_no,
    docDate: r.doc_date,
    storeId: r.store_id,
    vendorId: r.vendor_id,
    noOfDays: Number(r.no_of_days || 0),
    netAmount: Number(r.net_amount || 0),
    purchaseOrganisation: r.purchase_organisation || 'Pharmacy',
    remarks: r.remarks || undefined,
    status: r.status || 'Draft',
    items: items.map(i => ({
      id: i.id,
      returnId: i.return_id,
      itemId: i.item_id,
      batchCode: i.batch_code,
      expiryDate: i.expiry_date,
      currentStock: Number(i.current_stock || 0),
      quantity: Number(i.quantity || 0),
      rate: Number(i.rate || 0),
      value: Number(i.value || 0),
      remarks: i.remarks || undefined
    })),
    createdAt: r.created_at
  });

  const mapExpiryReturnToDb = (r: ExpiryReturn) => ({
    id: r.id,
    doc_no: r.docNo,
    doc_date: r.docDate,
    store_id: r.storeId,
    vendor_id: r.vendorId,
    no_of_days: r.noOfDays,
    net_amount: r.netAmount,
    purchase_organisation: r.purchaseOrganisation,
    remarks: r.remarks || null,
    status: r.status || 'Draft'
  });

  const mapPRNToDb = (p: PurchaseReceipt) => ({
    id: p.id,
    receipt_no: p.receiptNo,
    receipt_date: p.receiptDate,
    grn_id: p.grnId || null,
    vendor_id: p.vendorId,
    store_id: p.storeId,
    tax_profile: p.taxProfile || null,
    net_amount: p.netAmount,
    address_details: p.addressDetails || {},
    reference_details: p.referenceDetails || {},
    lc_details: p.lcDetails || {},
    other_details: p.otherDetails || {},
    status: p.status || 'Draft'
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

      // Load branches list early so it's available on the Login screen
      try {
        const { data: brData, error: brErr } = await supabase.from('branches').select('*');
        if (!brErr && brData) {
          setBranches(brData.map(mapBranchFromDb));
        }
      } catch (e) {
        console.warn('Failed to load branches on init:', e);
      }

      // Only fetch data if user is logged in
      if (!user) {
          setIsLoading(false);
          return;
      }

      try {
        // ─────────────────────────────────────────────────────────────────────
        // CORE SYNC — tables every module depends on (15 second timeout)
        // If these fail due to network error the app shows a connection error.
        // ─────────────────────────────────────────────────────────────────────
        const coreTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Data sync timed out. Check your connection.')), 15000)
        );

        const coreFetchPromise = Promise.all([
          supabase.from('patients').select('*'),                                          // 0
          supabase.from('employees').select('*'),                                         // 1
          supabase.from('departments').select('*'),                                       // 2
          supabase.from('units').select('*'),                                             // 3
          supabase.from('service_centres').select('*'),                                   // 4
          supabase.from('doctor_availability').select('*'),                               // 5
          supabase.from('appointments').select('*'),                                      // 6
          supabase.from('bills').select('*').order('date', { ascending: false }).limit(5000), // 7
          supabase.from('bill_items').select('*').limit(10000),                           // 8
          supabase.from('payments').select('*').limit(5000),                              // 9
          supabase.from('clinical_vitals').select('*').limit(2000),                       // 10
          supabase.from('clinical_diagnoses').select('*').limit(2000),                    // 11
          supabase.from('clinical_notes').select('*').limit(2000),                        // 12
          supabase.from('clinical_allergies').select('*').limit(1000),                    // 13
          supabase.from('clinical_narrative_diagnoses').select('*').limit(1000),          // 14
          supabase.from('master_diagnoses').select('*').limit(1000),                      // 15
          supabase.from('service_definitions').select('*').limit(2000),                   // 16
          supabase.from('service_tariffs').select('*').limit(5000),                       // 17
          supabase.from('service_orders').select('*').limit(5000),                        // 18
          supabase.from('inventory_items').select('*, stock:inventory_item_stocks(*), pricing:inventory_item_pricing(*)'), // 19
          supabase.from('branches').select('*'),                                          // 20
          supabase.from('stores').select('*, branches(name)'),                            // 21
          supabase.from('store_item_mappings').select('*'),                               // 22
          supabase.from('inventory_opening_stocks').select('*, items:inventory_opening_stock_items(*)'), // 23
          supabase.from('prescriptions').select('*').order('order_date', { ascending: false }).limit(2000), // 24
          supabase.from('prescription_items').select('*').limit(10000),                   // 25
          supabase.from('pharmacy_drug_generics').select('*'),                            // 26
          supabase.from('pharmacy_drug_master').select('*'),                              // 27
          supabase.from('tax_masters').select('*'),                                       // 28
          supabase.from('item_tax_mappings').select('*'),                                 // 29
          supabase.from('pharmacy_returns').select('*').order('return_date', { ascending: false }).limit(2000), // 30
          supabase.from('pharmacy_return_items').select('*').limit(10000),                // 31
          supabase.from('procurement_vendors').select('*'),                               // 32
          supabase.from('procurement_vendor_terms').select('*'),                          // 33
          supabase.from('procurement_purchase_orders').select('*'),                       // 34
          supabase.from('procurement_purchase_order_items').select('*'),                  // 35
          supabase.from('procurement_grns').select('*'),                                  // 36
          supabase.from('procurement_grn_items').select('*'),                             // 37
          supabase.from('procurement_purchase_receipts').select('*'),                     // 38
          supabase.from('procurement_purchase_receipt_items').select('*'),                // 39
          supabase.from('procurement_purchase_returns').select('*'),                      // 40
          supabase.from('procurement_purchase_return_items').select('*'),                 // 41
          supabase.from('procurement_expiry_returns').select('*'),                        // 42
          supabase.from('procurement_expiry_return_items').select('*'),                   // 43
          supabase.from('finance_chart_of_accounts').select('*'),                         // 44
          supabase.from('finance_journal_vouchers').select('*'),                          // 45
          supabase.from('finance_journal_voucher_items').select('*'),                     // 46
          supabase.from('currency_master').select('*'),                                   // 47
          supabase.from('patient_refunds').select('*'),                                   // 48
          supabase.from('doctor_schedules').select('*'),                                  // 49
          supabase.from('schedule_templates').select('*'),                                // 50
        ]);

        const results = await Promise.race([coreFetchPromise, coreTimeoutPromise]) as any[];

        // ─────────────────────────────────────────────────────────────────────
        // OPTIONAL SYNC — module-specific tables that may not exist yet.
        // Uses Promise.allSettled so failures are isolated and never block core.
        // ─────────────────────────────────────────────────────────────────────
        const optionalResults = await Promise.allSettled([
          supabase.from('vital_sign_groups').select('*'),    // 0
          supabase.from('vital_sign_parameters').select('*'), // 1
          supabase.from('patient_documents').select('*'),    // 2
          supabase.from('dental_icd_master').select('*'),    // 3
          supabase.from('patient_demographics').select('*'), // 4
          supabase.from('loyalty_program_config').select('*'), // 5
          supabase.from('loyalty_tiers').select('*').order('min_lifetime_points', { ascending: true }), // 6
          supabase.from('loyalty_redemption_rules').select('*'), // 7
          supabase.from('loyalty_bonus_rules').select('*'),    // 8
          supabase.from('loyalty_accounts').select('*'),       // 9
          supabase.from('loyalty_transactions').select('*').order('transaction_date', { ascending: false }), // 10
          supabase.from('pharmacy_zones').select('*').eq('is_active', true).order('zone_code'), // 11
          supabase.from('pharmacy_racks').select('*').eq('is_active', true).order('rack_code'), // 12
          supabase.from('roles').select('*'),                  // 13
          supabase.from('screens').select('*').order('display_order', { ascending: true }), // 14
          supabase.from('service_location_mappings').select('*') // 15
        ]);

        // Helper to safely extract data from optional results
        const getOptional = (idx: number) => {
          const r = optionalResults[idx];
          if (r.status === 'fulfilled' && r.value && !r.value.error) return r.value;
          if (r.status === 'fulfilled' && r.value?.error) {
            console.warn(`[Optional Sync] Table skipped:`, r.value.error?.message || r.value.error);
          }
          return { data: null, error: null };
        };

        const vsgRes  = getOptional(0);
        const vspRes  = getOptional(1);
        const docRes  = getOptional(2);
        const denRes  = getOptional(3);
        const demoRes = getOptional(4);
        const loyaltyConfigRes = getOptional(5);
        const loyaltyTiersRes = getOptional(6);
        const loyaltyRedeemRulesRes = getOptional(7);
        const loyaltyBonusRulesRes = getOptional(8);
        const loyaltyAccountsRes = getOptional(9);
        const loyaltyTxnsRes = getOptional(10);
        const phZonesRes = getOptional(11);
        const phRacksRes = getOptional(12);
        const rolesRes = getOptional(13);
        const screensRes = getOptional(14);
        const slmRes = getOptional(15);

        // Core table name index (for error reporting)
        const tableNames = [
            'patients', 'employees', 'departments', 'units', 'service_centres', 'doctor_availability', 'appointments',
            'bills', 'bill_items', 'payments', 'clinical_vitals', 'clinical_diagnoses', 'clinical_notes',
            'clinical_allergies', 'clinical_narrative_diagnoses', 'master_diagnoses', 'service_definitions',
            'service_tariffs', 'service_orders',
            'inventory_items', 'branches', 'stores', 'store_item_mappings',
            'inventory_opening_stocks', 'prescriptions', 'prescription_items', 'pharmacy_drug_generics', 'pharmacy_drug_master',
            'tax_masters', 'item_tax_mappings', 'pharmacy_returns', 'pharmacy_return_items',
            'procurement_vendors', 'procurement_vendor_terms',
            'procurement_purchase_orders', 'procurement_purchase_order_items',
            'procurement_grns', 'procurement_grn_items',
            'procurement_purchase_receipts', 'procurement_purchase_receipt_items',
            'procurement_purchase_returns', 'procurement_purchase_return_items',
            'procurement_expiry_returns', 'procurement_expiry_return_items',
            'finance_chart_of_accounts', 'finance_journal_vouchers', 'finance_journal_voucher_items',
            'currency_master', 'patient_refunds', 'doctor_schedules', 'schedule_templates',
        ];

        const [
            pRes, eRes, dRes, uRes, sRes, avRes, apRes, bRes, biRes, payRes,
            vRes, diRes, notRes, alRes, narRes, mdRes, sdRes, stRes, ordRes,
            invRes, brRes, stRes2, mRes, osRes,
            prRes, piRes, dgRes, dmRes, tmRes, itmRes, retRes, retiRes,
            pvRes, pvtRes, poRes, poiRes, grnRes, grniRes, prnRes, prniRes,
            prtnRes, prtniRes, exprRes, expriRes, coaRes, jvRes, jviRes, curRes, refundRes,
            dsRes, stRes3
        ] = results;


        console.log(`Sync: Fetched ${bRes.data?.length || 0} raw bills from DB.`);
        console.log(`Sync complete. Core tables: ${results.length}. Optional tables: ${optionalResults.length}.`);

        // ─── Classify core table errors ────────────────────────────────────
        let failedToFetchCount = 0;
        const missingTables: string[] = [];
        const permissionErrors: string[] = [];
        const otherErrors: string[] = [];

        results.forEach((r, idx) => {
            if (r && r.error) {
                const msg = (r.error.message || '').toLowerCase();
                const code = r.error.code || '';
                console.error(`[Core Sync Failure] Table [${tableNames[idx]}] Code=${code} Msg=${r.error.message}`);

                if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('typeerror')) {
                    // True network/connection failure — backend unreachable
                    failedToFetchCount++;
                } else if (
                    msg.includes('does not exist') ||
                    code === 'PGRST301' ||
                    code === '42P01' // PostgreSQL: undefined_table
                ) {
                    // Table physically missing from database
                    missingTables.push(tableNames[idx]);
                } else if (
                    msg.includes('permission denied') ||
                    code === '42501' || // PostgreSQL: insufficient_privilege
                    code === 'PGRST116'
                ) {
                    // RLS / anon permissions block — log but don't alarm the user
                    permissionErrors.push(tableNames[idx]);
                } else {
                    otherErrors.push(`[${tableNames[idx]}]: ${r.error.message}`);
                }
            }
        });

        // Only a network failure is a true blocking error
        if (failedToFetchCount > 0) {
            showToast('error', 'Database connection failed. Please check your network or credentials on the Connection page.');
        }

        // Missing tables: warn once (collapsed if many)
        if (missingTables.length > 0) {
            console.warn(`[Sync] Missing tables (${missingTables.length}): ${missingTables.join(', ')}`);
            if (missingTables.length > 3) {
                showToast('info', `${missingTables.length} database tables are missing. Some modules may be empty. Run the SQL schema to fix.`);
            } else {
                missingTables.forEach(t => showToast('info', `Table [${t}] not found. Run the SQL schema to set it up.`));
            }
        }

        // Permission errors: just log to console, never show toast
        if (permissionErrors.length > 0) {
            console.warn(`[Sync] Permission errors on tables (RLS may be enabled): ${permissionErrors.join(', ')}`);
        }

        // Other unexpected errors: show once consolidated
        if (otherErrors.length > 0) {
            console.error(`[Sync] Other errors:`, otherErrors);
            if (otherErrors.length > 3) {
                showToast('info', 'Some data could not be loaded. Check browser console for details.');
            } else {
                otherErrors.forEach(err => showToast('info', err));
            }
        }
        
        if (retRes && retRes.data) console.log(`Fetched ${retRes.data.length} pharmacy returns.`);

        {
          const dbPatientsList = (pRes && pRes.data) ? pRes.data.map(mapPatientFromDb) : [];
          const demoPatients = (demoRes && demoRes.data && demoRes.data.length > 0)
            ? demoRes.data.map((row: any) => ({
                id: String(row.id),
                firstName: row.first_name || '',
                lastName: row.last_name || '',
                dob: row.year_of_birth
                  ? `${row.year_of_birth}-${String(row.month_of_birth || 1).padStart(2, '0')}-${String(row.day_of_birth || 1).padStart(2, '0')}`
                  : '',
                gender: (row.gender === 'M' || row.gender === 'Male') ? 'Male'
                       : (row.gender === 'F' || row.gender === 'Female') ? 'Female' : 'Other',
                phone: row.mobile || '',
                email: '',
                address: row.address || '',
                nationalId: row.abha_number || '',
                arabicName: '',
                sponsorName: 'CASH',
                policyNo: '',
                cardNo: '',
                registrationDate: row.created_at || new Date().toISOString(),
                _isAbdmDemographic: true,
              }))
            : [];
          setPatients([...dbPatientsList, ...demoPatients]);
        }
        if (eRes && eRes.data) setEmployees(eRes.data.map(mapEmpFromDb));
        if (dRes && dRes.data) setDepartments(dRes.data.map(mapDeptFromDb));
        if (uRes && uRes.data) setUnits(uRes.data.map(mapDeptFromDb)); 
        if (sRes && sRes.data) setServiceCentres(sRes.data.map(mapServiceCentreFromDb));
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
        if (slmRes && slmRes.data) setServiceLocationMappings(slmRes.data.map(mapLocationMappingFromDb));
        
         if (dgRes && dgRes.data) setDrugGenerics(dgRes.data.map(mapDrugGenericFromDb));
         if (dmRes && dmRes.data) setDrugMasters(dmRes.data.map(mapDrugMasterFromDb));
         if (tmRes && tmRes.data) setTaxMasters(tmRes.data.map(mapTaxMasterFromDb));
         if (itmRes && itmRes.data) setItemTaxMappings(itmRes.data.map(mapItemTaxMappingFromDb));
        // Map Loyalty program config
        if (loyaltyConfigRes && loyaltyConfigRes.data && loyaltyConfigRes.data.length > 0) {
          const cfg = loyaltyConfigRes.data[0];
          setLoyaltyProgramConfig({
            id: cfg.id,
            programName: cfg.program_name,
            programStatus: cfg.program_status,
            effectiveFrom: cfg.effective_from,
            pointValue: Number(cfg.point_value || 0),
            earnRate: Number(cfg.earn_rate || 0),
            minBillToEarn: Number(cfg.min_bill_to_earn || 0),
            pointsRounding: cfg.points_rounding,
            expiryDays: Number(cfg.expiry_days || 0),
            expiryType: cfg.expiry_type,
            expiryWarningDays: Number(cfg.expiry_warning_days || 0),
            smsEnabled: Boolean(cfg.sms_enabled),
            smsOnEarn: Boolean(cfg.sms_on_earn),
            smsOnRedeem: Boolean(cfg.sms_on_redeem),
            smsOnExpiryWarning: Boolean(cfg.sms_on_expiry_warning),
            autoEnroll: Boolean(cfg.auto_enroll)
          });
        }

        // Map Loyalty Tiers
        if (loyaltyTiersRes && loyaltyTiersRes.data) {
          setLoyaltyTiers(loyaltyTiersRes.data.map((t: any) => ({
            id: t.id,
            tierName: t.tier_name,
            minLifetimePoints: Number(t.min_lifetime_points || 0),
            earnMultiplier: Number(t.earn_multiplier || 0),
            downgradeDays: t.downgrade_days ? Number(t.downgrade_days) : null,
            birthdayBonusPoints: Number(t.birthday_bonus_points || 0),
            welcomeBonusPoints: Number(t.welcome_bonus_points || 0),
            isActive: Boolean(t.is_active)
          })));
        }

        // Map Loyalty Redemption Rules
        if (loyaltyRedeemRulesRes && loyaltyRedeemRulesRes.data && loyaltyRedeemRulesRes.data.length > 0) {
          const r = loyaltyRedeemRulesRes.data[0];
          setLoyaltyRedemptionRules({
            minPointsToRedeem: Number(r.min_points_to_redeem || 0),
            maxRedemptionPct: Number(r.max_redemption_pct || 0),
            maxPointsPerBill: Number(r.max_points_per_bill || 0),
            partialRedemption: Boolean(r.partial_redemption),
            blockOnDiscountedBill: Boolean(r.block_on_discounted_bill),
            excludeGstFromRedeem: Boolean(r.exclude_gst_from_redeem)
          });
        }

        // Map Loyalty Bonus Rules
        if (loyaltyBonusRulesRes && loyaltyBonusRulesRes.data) {
          setLoyaltyBonusRules(loyaltyBonusRulesRes.data.map((b: any) => ({
            id: b.id,
            bonusType: b.bonus_type,
            pointsAwarded: b.points_awarded ? Number(b.points_awarded) : null,
            earnMultiplier: Number(b.earn_multiplier || 0),
            triggerCondition: b.trigger_condition || '',
            validFrom: b.valid_from || null,
            validTo: b.valid_to || null,
            isActive: Boolean(b.is_active)
          })));
        }

        // Map Loyalty Accounts
        if (loyaltyAccountsRes && loyaltyAccountsRes.data) {
          setLoyaltyAccounts(loyaltyAccountsRes.data.map((acc: any) => ({
            id: acc.id,
            accountNo: acc.account_no,
            mobile: acc.mobile,
            patientName: acc.patient_name,
            dateOfBirth: acc.date_of_birth || null,
            gender: acc.gender || null,
            email: acc.email || null,
            patientId: acc.patient_id || null,
            enrolmentDate: acc.enrolment_date,
            enrolmentSource: acc.enrolment_source,
            currentTier: acc.current_tier,
            accountStatus: acc.account_status,
            currentPoints: Number(acc.current_points || 0),
            lifetimePoints: Number(acc.lifetime_points || 0),
            lifetimeSpend: Number(acc.lifetime_spend || 0),
            totalTransactions: Number(acc.total_transactions || 0),
            lastTransactionDate: acc.last_transaction_date || null,
            referredByMobile: acc.referred_by_mobile || null,
            consentGiven: Boolean(acc.consent_given)
          })));
        }

        // Map Loyalty Transactions
        if (loyaltyTxnsRes && loyaltyTxnsRes.data) {
          setLoyaltyTransactions(loyaltyTxnsRes.data.map((txn: any) => ({
            id: txn.id,
            accountId: txn.account_id,
            transactionDate: txn.transaction_date,
            transactionType: txn.transaction_type,
            points: Number(txn.points || 0),
            balanceBefore: Number(txn.balance_before || 0),
            balanceAfter: Number(txn.balance_after || 0),
            monetaryValue: Number(txn.monetary_value || 0),
            referenceBillNo: txn.reference_bill_no || null,
            referenceAmount: txn.reference_amount ? Number(txn.reference_amount) : null,
            description: txn.description || null,
            isReversed: Boolean(txn.is_reversed),
            createdBy: txn.created_by
          })));
        }

        // Pharmacy Location Hierarchy
        if (phZonesRes?.data) {
          setPharmacyZones(phZonesRes.data.map((z: any) => ({
            id: z.id, storeId: z.store_id, zoneCode: z.zone_code,
            zoneName: z.zone_name, temperature: z.temperature,
            description: z.description, isActive: z.is_active
          })));
        }
        if (phRacksRes?.data) {
          setPharmacyRacks(phRacksRes.data.map((r: any) => ({
            id: r.id, zoneId: r.zone_id, rackCode: r.rack_code,
            rackName: r.rack_name, noOfShelves: r.no_of_shelves, isActive: r.is_active
          })));
        }

        if (rolesRes?.data) {
          setRoles(rolesRes.data.map((r: any) => ({
            id: r.id,
            role_code: r.role_code,
            role_name: r.role_name,
            description: r.description
          })));
        }

        if (screensRes?.data) {
          setScreens(screensRes.data.map((s: any) => ({
            id: s.id,
            module: s.module,
            screen_code: s.screen_code,
            screen_name: s.screen_name,
            screen_url: s.screen_url,
            display_order: Number(s.display_order || 0)
          })));
        }

         if (curRes && curRes.data && curRes.data.length > 0) {
           const dbCurrencies = curRes.data.map(mapCurrencyFromDb);
           setCurrencies(dbCurrencies);
           const defaultCurr = dbCurrencies.find((c: Currency) => c.isDefault);
           if (defaultCurr && !localStorage.getItem('medicore_selected_currency')) {
             setSelectedCurrencyState(defaultCurr.code);
           }
         }
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

        if (refundRes && refundRes.data) {
            setPatientRefunds(refundRes.data.map((r: any) => ({
                id: r.id,
                refundNo: r.refund_no,
                patientId: r.patient_id,
                refundDate: r.refund_date,
                totalAmount: Number(r.total_amount || 0),
                paymentMethod: r.payment_method,
                remarks: r.remarks,
                createdBy: r.created_by,
                createdAt: r.created_at
            })));
        }

        if (dsRes && dsRes.data) {
            setDoctorSchedules(dsRes.data.map(mapDoctorScheduleFromDb));
        }
        if (stRes3 && stRes3.data) {
            setScheduleTemplates(stRes3.data.map(mapScheduleTemplateFromDb));
        }

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
                        refundStatus: r.refund_status || 'Pending',
                        refundId: r.refund_id || undefined,
                        cancelledAt: r.return_date || r.created_at,
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

            // Merge Patient Refunds as "Bills" (Debit) for the ledger
            if (refundRes && refundRes.data) {
                refundRes.data.forEach((ref: any) => {
                    const refundBill: Bill = {
                        id: ref.id,
                        invoiceNo: ref.refund_no,
                        patientId: ref.patient_id,
                        appointmentId: undefined,
                        date: ref.refund_date || ref.created_at,
                        status: 'Paid',
                        totalAmount: Number(ref.total_amount || 0),
                        paidAmount: 0,
                        taxAmount: 0,
                        isPharmacy: false,
                        createdBy: ref.created_by,
                        refundStatus: 'Refunded',
                        items: [{
                            id: ref.id,
                            description: `REFUND: Cash Refund (Ref: ${ref.refund_no})`,
                            quantity: 1,
                            unitPrice: Number(ref.total_amount || 0),
                            total: Number(ref.total_amount || 0)
                        }],
                        payments: []
                    };
                    structuredBills.push(refundBill);
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

        // Load vendors and terms gracefully
        let vendorsData: Vendor[] = [];
        if (pvRes && pvRes.data) {
            const rawVendors = pvRes.data;
            const rawTerms = pvtRes?.data || [];
            vendorsData = rawVendors.map((v: any) => {
                const myTerms = rawTerms.filter((t: any) => t.vendor_id === v.id);
                return mapVendorFromDb(v, myTerms);
            });
        } else {
            const local = localStorage.getItem('medicore_vendors');
            if (local) vendorsData = JSON.parse(local);
        }
        setVendors(vendorsData);

        // Load purchase orders gracefully
        let poData: PurchaseOrder[] = [];
        if (poRes && poRes.data) {
            const rawPOs = poRes.data;
            const rawPOItems = poiRes?.data || [];
            poData = rawPOs.map((p: any) => {
                const myItems = rawPOItems.filter((i: any) => i.po_id === p.id);
                return mapPOFromDb(p, myItems);
            });
        } else {
            const local = localStorage.getItem('medicore_purchase_orders');
            if (local) poData = JSON.parse(local);
        }
        setPurchaseOrders(poData);

        // Load GRNs gracefully
        let grnData: GRN[] = [];
        if (grnRes && grnRes.data) {
            const rawGRNs = grnRes.data;
            const rawGRNItems = grniRes?.data || [];
            grnData = rawGRNs.map((g: any) => {
                const myItems = rawGRNItems.filter((i: any) => i.grn_id === g.id);
                return mapGRNFromDb(g, myItems);
            });
            // Overwrite localStorage with real database records to purge mock data
            localStorage.setItem('medicore_grns', JSON.stringify(grnData));
        } else {
            const local = localStorage.getItem('medicore_grns');
            if (local) {
                const parsed = JSON.parse(local);
                // Filter out default/mock data from local fallback
                grnData = parsed.filter((g: any) => 
                    g.invoiceNo && 
                    !g.invoiceNo.startsWith('INV-2026-')
                );
                localStorage.setItem('medicore_grns', JSON.stringify(grnData));
            }
        }
        setGrns(grnData);

        // Load Purchase Receipts gracefully
        let prnData: PurchaseReceipt[] = [];
        if (prnRes && prnRes.data) {
            const rawPRNs = prnRes.data;
            const rawPRNItems = prniRes?.data || [];
            prnData = rawPRNs.map((p: any) => {
                const myItems = rawPRNItems.filter((i: any) => i.receipt_id === p.id);
                return mapPRNFromDb(p, myItems);
            });
        } else {
            const local = localStorage.getItem('medicore_purchase_receipts');
            if (local) prnData = JSON.parse(local);
        }
        setPurchaseReceipts(prnData);

        // Load Purchase Returns gracefully
        let returnData: PurchaseReturn[] = [];
        if (prtnRes && prtnRes.data) {
            const rawReturns = prtnRes.data;
            const rawReturnItems = prtniRes?.data || [];
            returnData = rawReturns.map((r: any) => {
                const myItems = rawReturnItems.filter((i: any) => i.return_id === r.id);
                return mapPurchaseReturnFromDb(r, myItems);
            });
        } else {
            const local_returns = localStorage.getItem('medicore_purchase_returns');
            if (local_returns) returnData = JSON.parse(local_returns);
        }
        
        // Load Journal Vouchers gracefully
        let jvData: JournalVoucher[] = [];
        if (jvRes && jvRes.data) {
            const rawJVs = jvRes.data;
            const rawJVItems = jviRes?.data || [];
            jvData = rawJVs.map((jv: any) => {
                const myItems = rawJVItems.filter((i: any) => i.voucher_id === jv.id);
                return mapJournalVoucherFromDb(jv, myItems);
            });
            setJournalVouchers(jvData);
        } else {
            const local = localStorage.getItem('medicore_journal_vouchers');
            if (local) {
                setJournalVouchers(JSON.parse(local));
            }
        }
        setPurchaseReturns(returnData);

        // Load Expiry Returns gracefully
        let expData: ExpiryReturn[] = [];
        if (exprRes && exprRes.data) {
            const rawReturns = exprRes.data;
            const rawReturnItems = expriRes?.data || [];
            expData = rawReturns.map((r: any) => {
                const myItems = rawReturnItems.filter((i: any) => i.return_id === r.id);
                return mapExpiryReturnFromDb(r, myItems);
            });
        } else {
            const local_exp = localStorage.getItem('medicore_expiry_returns');
            if (local_exp) expData = JSON.parse(local_exp);
        }
        setExpiryReturns(expData);

        // Load Chart of Accounts gracefully
        let coaData: ChartOfAccount[] = [];
        if (coaRes && coaRes.data && coaRes.data.length > 0) {
            coaData = coaRes.data.map(mapChartOfAccountFromDb);
        } else {
            const local = localStorage.getItem('medicore_chart_of_accounts');
            if (local) {
                coaData = JSON.parse(local);
            }
        }

        const requiredSeeds = [
          { id: '13500000-1350-4000-8000-000000135000', code: '135000', name: 'Input IGST (Provisional)', accountType: 'Asset' as const, balanceNature: 'Debit' as const, parentId: 'coa-sub-2', isGroup: false, description: 'Parks the integrated government tax portion paid to interstate vendors. Locked from tax deductions.', status: 'Active' as const },
          { id: '13600000-1360-4000-8000-000000136000', code: '136000', name: 'Input IGST (Approved)', accountType: 'Asset' as const, balanceNature: 'Debit' as const, parentId: 'coa-sub-2', isGroup: false, description: 'The verified integrated tax vault. Unlocked by matching excel files to reduce tax liabilities.', status: 'Active' as const },
          { id: '22300000-2230-4000-8000-000000223000', code: '223000', name: 'Output IGST Liability', accountType: 'Liability' as const, balanceNature: 'Credit' as const, parentId: 'coa-sub-3', isGroup: false, description: 'Accumulates the integrated tax slice collected from interstate patients. Owed to the treasury.', status: 'Active' as const }
        ];

        const missingSeeds = requiredSeeds.filter(seed => !coaData.some(acc => acc.code === seed.code));
        if (missingSeeds.length > 0) {
            console.log("Merging missing IGST seed accounts:", missingSeeds.map(s => s.code));
            coaData = [...coaData, ...missingSeeds];

            // If we fetched from database, try to push missing seeds to database
            if (coaRes && coaRes.data && coaRes.data.length > 0 && checkConfigured()) {
                const supabase = getSupabase();
                missingSeeds.forEach(async (seed) => {
                    const parentCode = seed.code === '223000' ? '220000' : '130000';
                    const parent = coaData.find(a => a.code === parentCode);
                    const dbCOA = mapChartOfAccountToDb({
                        ...seed,
                        parentId: parent ? parent.id : undefined
                    });
                    await supabase.from('finance_chart_of_accounts').upsert(dbCOA);
                });
            }
        }

        // Always normalize parentIds to prevent local storage vs database UUID mismatches
        coaData = coaData.map(account => {
            if (account.code.endsWith('00000')) {
                return { ...account, parentId: undefined };
            }
            
            let parentCode = '';
            if (account.code.endsWith('0000')) {
                parentCode = account.code.substring(0, 1) + '00000';
            } else {
                const candidateParentCode = account.code.substring(0, 2) + '0000';
                const parentExists = coaData.some(a => a.code === candidateParentCode && a.code !== account.code);
                if (parentExists) {
                    parentCode = candidateParentCode;
                } else {
                    parentCode = account.code.substring(0, 1) + '00000';
                }
            }
            
            const parent = coaData.find(a => a.code === parentCode);
            return { ...account, parentId: parent ? parent.id : undefined };
        });

        localStorage.setItem('medicore_chart_of_accounts', JSON.stringify(coaData));
        setChartOfAccounts(coaData);

        // Load GSTR-2B data independently so it doesn't block or error the main sync
        let uploadsData: GSTR2BUpload[] = [];
        let invoicesData: GSTR2BInvoice[] = [];
        if (checkConfigured()) {
          try {
            const { data: uploads, error: uploadsErr } = await supabase.from('procurement_gstr2b_uploads').select('*');
            const { data: invoices, error: invoicesErr } = await supabase.from('procurement_gstr2b_invoices').select('*');
            
            if (uploads && !uploadsErr && invoices && !invoicesErr) {
              uploadsData = uploads.map((u: any) => ({
                id: u.id,
                period: u.period,
                fileName: u.file_name,
                uploadDate: u.upload_date,
                invoicesCount: u.invoices_count,
                totalItc: Number(u.total_itc || 0),
                uploadedBy: u.uploaded_by,
                status: u.status,
                isReconciled: !!u.is_reconciled,
                createdAt: u.created_at
              }));
              invoicesData = invoices.map((i: any) => ({
                id: i.id,
                uploadId: i.upload_id,
                invoiceNo: i.invoice_no,
                invoiceDate: i.invoice_date,
                taxableValue: Number(i.taxable_value || 0),
                taxAmount: Number(i.tax_amount || 0),
                cgst: Number(i.cgst || 0),
                sgst: Number(i.sgst || 0),
                igst: Number(i.igst || 0),
                supplierName: i.supplier_name,
                supplierGst: i.supplier_gst,
                createdAt: i.created_at
              }));
              localStorage.setItem('medicore_gstr2b_uploads', JSON.stringify(uploadsData));
              localStorage.setItem('medicore_gstr2b_invoices', JSON.stringify(invoicesData));
            } else {
              const uLocal = localStorage.getItem('medicore_gstr2b_uploads');
              const iLocal = localStorage.getItem('medicore_gstr2b_invoices');
              if (uLocal) uploadsData = JSON.parse(uLocal);
              if (iLocal) invoicesData = JSON.parse(iLocal);
            }
          } catch (err) {
            const uLocal = localStorage.getItem('medicore_gstr2b_uploads');
            const iLocal = localStorage.getItem('medicore_gstr2b_invoices');
            if (uLocal) uploadsData = JSON.parse(uLocal);
            if (iLocal) invoicesData = JSON.parse(iLocal);
          }
        } else {
          const uLocal = localStorage.getItem('medicore_gstr2b_uploads');
          const iLocal = localStorage.getItem('medicore_gstr2b_invoices');
          if (uLocal) uploadsData = JSON.parse(uLocal);
          if (iLocal) invoicesData = JSON.parse(iLocal);
        }
        setGstr2bUploads(uploadsData);
        setGstr2bInvoices(invoicesData);
        
        if (failedToFetchCount === 0 && missingTables.length === 0 && otherErrors.length === 0) {
            showToast('success', 'Data synced with database.');
        }

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
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
      .order('created_at', { ascending: false })
      .order('ref_doc_date', { ascending: false })
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
             // Use min_stock_level stored in the item master as the threshold for low stock alert
             const minStock = info?.minStockLevel ?? 10;
             
             if (currentStock <= 0) outOfStock++;
             else if (minStock > 0 && currentStock < minStock) lowStockItems++;
             
             itemsDetails.push({
                 itemId,
                 itemCode: info?.itemCode || 'UNK',
                 itemCategory: info?.itemCategory || 'General',
                 itemName: info?.itemName || 'Unknown Item',
                 currentStock,
                 restockLevel: minStock
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

      // 1b. Get MRP (public_price) and Batch Date from GRN items
      const { data: grnData } = await getSupabase()
        .from('procurement_grn_items')
        .select('batch_code, public_price, rate, batch_date, expiry_date')
        .eq('item_id', itemId);

      grnData?.forEach(i => {
        const b = (i.batch_code || '').trim().toUpperCase();
        if (b) {
          mrpMap.set(b, Number(i.public_price || 0));
          rateMap.set(b, Number(i.rate || 0));
          if (i.expiry_date) expiryMap.set(b, i.expiry_date);
          if (i.batch_date) batchDateMap.set(b, i.batch_date);
        }
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

  const fetchAlternates = async (itemId: string, storeId: string, prescriptionId?: string) => {
    try {
      const token = await getAuthToken();
      const url = `${BACKEND_URL}/api/pharmacy/drugs/${itemId}/alternates?store_id=${storeId}${prescriptionId ? `&prescription_id=${prescriptionId}` : ''}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return { original_drug: null, alternates: [] };
      return await res.json();
    } catch (err) {
      console.error('Error fetching alternates:', err);
      return { original_drug: null, alternates: [] };
    }
  };

  const logSubstitutions = async (logs: SubstitutionLogInput[]) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/api/pharmacy/sales/substitution-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logs })
      });
      return res.ok;
    } catch (err) {
      console.error('Error logging substitutions:', err);
      return false;
    }
  };

  const saveDirectSale = async (sale: DirectSale): Promise<{ success: boolean; savedSale?: DirectSale }> => {
    if (!requireDb()) return { success: false };
    try {
      const supabase = getSupabase();
      
      const store = stores.find(s => s.id === sale.storeId);
      const storeCode = store ? store.storeCode : 'DS';
      const year = new Date().getFullYear().toString().slice(-2); // e.g. "26"
      
      // Get sequential counter
      const { count, error: countError } = await supabase
        .from('pharmacy_direct_sales')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      const seq = (count !== null ? count + 1 : 1).toString().padStart(6, '0');
      const invoiceNo = `INV-D-${storeCode}-${year}${seq}`;
      
      const rcpSeq = (count !== null ? count + 1 : 1).toString().padStart(8, '0');
      const receiptNo = `RCP-${year}${rcpSeq}`;

      // 1. Save Sale Header
      const dbSale = {
        sale_no: sale.saleNo, // Correct property name
        invoice_no: invoiceNo,
        receipt_no: receiptNo,
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
        total_amount: sale.totalAmount,
        discount_percentage: sale.discountPercentage || 0,
        discount_amount: sale.discountAmount || 0,
        payment_mode: sale.paymentMode || 'Cash',
        payment_status: sale.paymentStatus || 'paid',
        reference_no: sale.referenceNo || null,
        pg_order_id: sale.pgOrderId || null,
        pg_payment_id: sale.pgPaymentId || null
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
        const total = Number((i.quantity * i.unitPrice).toFixed(2));
        const taxAmount = Number((total * taxPercent / (100 + taxPercent)).toFixed(2));

        return {
          sale_id: saleId,
          item_id: i.itemId,
          batch_no: i.batchNo,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          tax_percentage: taxPercent,
          tax_amount: taxAmount,
          total_price: total,
          expiry_date: i.expiryDate || null // Convert "" to null
        };
      });

      const totalTaxAmount = dbItems.reduce((sum, item) => sum + item.tax_amount, 0);
      
      // Update header with tax info if not already set correctly
      await supabase.from('pharmacy_direct_sales').update({ tax_amount: totalTaxAmount }).eq('id', saleId);

      const { error: itemsError } = await supabase.from('pharmacy_direct_sale_items').insert(dbItems);
      if (itemsError) throw itemsError;

      const savedDirectSale: DirectSale = {
        ...sale,
        id: saleId,
        invoiceNo: invoiceNo,
        receiptNo: receiptNo,
        taxAmount: totalTaxAmount,
        items: sale.items.map((item, idx) => {
          const dbItem = dbItems[idx];
          return {
            ...item,
            taxPercentage: dbItem.tax_percentage,
            taxAmount: dbItem.tax_amount
          };
        })
      };

      if (sale.paymentStatus === 'pending') {
        showToast('info', 'Direct sale saved as pending payment.');
        setRefreshTrigger(prev => prev + 1);
        return { success: true, savedSale: savedDirectSale };
      }

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

        // Resolve Sales Conversion Factor (e.g. 1 STRIP = 10 Tablets)
        const itemDef = inventoryItems.find(inv => inv.id === i.itemId);
        const isSalesUom = i.unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
        const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

        // Batch-Specific Validation
        const batchBalance = await getBatchStockBalance(sale.storeId, i.itemId, cleanBatch);
        const qty = Number(i.quantity || 0) * salesCF;
        if (batchBalance < qty) {
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

      // Trigger automatic PO checks if item stock reaches reserve quantity level
      for (const i of sale.items) {
        const itemKey = `${sale.storeId}-${i.itemId}`;
        const val = localBalances.get(itemKey);
        if (val) {
          await checkAndAutoRaisePO(sale.storeId, i.itemId, val.quantity);
        }
      }

      // Auto JV Posting
      try {
        const partyName = `${sale.firstName} ${sale.lastName || ''}`.trim();
        await postAutoJournalVoucher('PHARMACY_SALE', saleId, sale.saleNo, {
          net: sale.totalAmount,
          tax: totalTaxAmount,
          cgst: Number((totalTaxAmount / 2).toFixed(2)),
          sgst: Number((totalTaxAmount / 2).toFixed(2)),
          igst: 0,
          gross: Number((sale.totalAmount - totalTaxAmount).toFixed(2)),
          partyName: partyName || 'Cash Patient',
          paymentMode: sale.paymentMode
        });
      } catch (jvErr) {
        console.error("Error posting automated direct sale journal voucher:", jvErr);
      }

      showToast('success', 'Pharmacy Sale completed successfully.');
      setRefreshTrigger(prev => prev + 1);

      return { success: true, savedSale: savedDirectSale };

    } catch (error: any) {
      console.error('Error saving direct sale:', error);
      showToast('error', `Sale failed: ${error.message}`);
      return { success: false };
    }
  };

  const fetchDirectSales = async (filters?: { storeId?: string; fromDate?: string; toDate?: string }): Promise<DirectSale[]> => {
    if (!requireDb()) return [];
    try {
      const supabase = getSupabase();
      let query = supabase.from('pharmacy_direct_sales').select('*, items:pharmacy_direct_sale_items(*)').order('sale_date', { ascending: false });
      
      if (filters?.storeId) {
        query = query.eq('store_id', filters.storeId);
      }
      if (filters?.fromDate) {
        query = query.gte('sale_date', filters.fromDate);
      }
      if (filters?.toDate) {
        query = query.lte('sale_date', filters.toDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((sale: any) => ({
        id: sale.id,
        saleNo: sale.sale_no,
        invoiceNo: sale.invoice_no,
        receiptNo: sale.receipt_no,
        saleDate: sale.sale_date,
        storeId: sale.store_id,
        firstName: sale.first_name,
        middleName: sale.middle_name,
        lastName: sale.last_name,
        phoneNo: sale.phone_no,
        externalNo: sale.external_no,
        dob: sale.dob,
        age: sale.age,
        ageUnit: sale.age_unit,
        gender: sale.gender,
        referredDoctor: sale.referred_doctor,
        licenseNo: sale.license_no,
        nationality: sale.nationality,
        isInsured: sale.is_insured,
        isNewExternalPatient: sale.is_new_external_patient,
        totalAmount: sale.total_amount,
        taxAmount: sale.tax_amount,
        discountPercentage: sale.discount_percentage || 0,
        discountAmount: sale.discount_amount || 0,
        items: (sale.items || []).map((i: any) => {
          const invItem = inventoryItems.find((inv: any) => inv.id === i.item_id);
          return {
            id: i.id,
            saleId: i.sale_id,
            itemId: i.item_id,
            itemCode: invItem ? invItem.itemCode : '',
            itemName: invItem ? invItem.itemName : '',
            batchNo: i.batch_no,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            totalPrice: i.total_price,
            taxPercentage: i.tax_percentage,
            taxAmount: i.tax_amount,
            expiryDate: i.expiry_date
          };
        })
      }));
    } catch (error: any) {
      console.error('Error fetching direct sales:', error);
      showToast('error', `Failed to fetch direct sales: ${error.message}`);
      return [];
    }
  };

  const completeDirectSalePayment = async (
    sale: DirectSale,
    paymentId: string,
    orderId: string
  ): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();

      // 1. Retrieve the existing sale header from the DB to verify it exists
      const { data: dbSale, error: fetchError } = await supabase
        .from('pharmacy_direct_sales')
        .select('*, items:pharmacy_direct_sale_items(*)')
        .eq('sale_no', sale.saleNo)
        .single();

      if (fetchError || !dbSale) {
        throw new Error(fetchError?.message || 'Sale record not found.');
      }

      // If already paid, return true to avoid duplicate processing
      if (dbSale.payment_status === 'paid') {
        return true;
      }

      // 2. Update status to 'paid', record payment IDs
      const { error: updateError } = await supabase
        .from('pharmacy_direct_sales')
        .update({
          payment_status: 'paid',
          pg_payment_id: paymentId,
          pg_order_id: orderId,
          reference_no: paymentId
        })
        .eq('id', dbSale.id);

      if (updateError) throw updateError;

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

        // Resolve Sales Conversion Factor
        const itemDef = inventoryItems.find(inv => inv.id === i.itemId);
        const isSalesUom = i.unit?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
        const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

        // Batch-Specific Validation
        const batchBalance = await getBatchStockBalance(sale.storeId, i.itemId, cleanBatch);
        const qty = Number(i.quantity || 0) * salesCF;
        if (batchBalance < qty) {
            throw new Error(`Insufficient stock in Batch ${cleanBatch} for ${itemDef?.itemName || i.itemId} (Available in batch: ${batchBalance}, Required: ${qty})`);
        }

        const newBalance = currentItemBalance - qty;
        localBalances.set(itemKey, { quantity: newBalance, rate: currentAverageRate });

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

      // Trigger automatic PO checks
      for (const i of sale.items) {
        const itemKey = `${sale.storeId}-${i.itemId}`;
        const val = localBalances.get(itemKey);
        if (val) {
          await checkAndAutoRaisePO(sale.storeId, i.itemId, val.quantity);
        }
      }

      // Calculate total tax amount from dbSale.items
      const totalTaxAmount = (dbSale.items || []).reduce((sum: number, item: any) => sum + Number(item.tax_amount || 0), 0);

      // Auto JV Posting
      try {
        const partyName = `${sale.firstName} ${sale.lastName || ''}`.trim();
        await postAutoJournalVoucher('PHARMACY_SALE', dbSale.id, sale.saleNo, {
          net: sale.totalAmount,
          tax: totalTaxAmount,
          cgst: Number((totalTaxAmount / 2).toFixed(2)),
          sgst: Number((totalTaxAmount / 2).toFixed(2)),
          igst: 0,
          gross: Number((sale.totalAmount - totalTaxAmount).toFixed(2)),
          partyName: partyName || 'Cash Patient',
          paymentMode: sale.paymentMode
        });
      } catch (jvErr) {
        console.error("Error posting automated direct sale journal voucher:", jvErr);
      }

      showToast('success', 'Pharmacy Sale payment completed successfully.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (error: any) {
      console.error('Error completing direct sale payment:', error);
      showToast('error', `Payment completion failed: ${error.message}`);
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

  const saveVendor = async (vendor: Vendor): Promise<boolean> => {
    // Optimistic local state update
    setVendors(prev => {
      const exists = prev.find(v => v.id === vendor.id);
      let updated;
      if (exists) {
        updated = prev.map(v => v.id === vendor.id ? vendor : v);
      } else {
        updated = [...prev, vendor];
      }
      localStorage.setItem('medicore_vendors', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbVendor = mapVendorToDb(vendor);
        const { error } = await supabase.from('procurement_vendors').upsert(dbVendor);
        if (error) throw error;

        // Save Terms
        if (vendor.terms) {
          // Delete old terms for this vendor
          await supabase.from('procurement_vendor_terms').delete().eq('vendor_id', vendor.id);
          
          if (vendor.terms.length > 0) {
            const dbTerms = vendor.terms.map(t => ({
              vendor_id: vendor.id,
              term_code: t.termCode,
              term_desc: t.termDesc
            }));
            const { error: termsError } = await supabase.from('procurement_vendor_terms').insert(dbTerms);
            if (termsError) throw termsError;
          }
        }

        showToast('success', 'Vendor saved successfully to database!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error saving vendor:", err);
        showToast('error', `Failed to sync vendor to database: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', 'Vendor saved locally.');
      return true;
    }
  };

  const deleteVendor = async (id: string): Promise<boolean> => {
    setVendors(prev => {
      const updated = prev.filter(v => v.id !== id);
      localStorage.setItem('medicore_vendors', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_vendors').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Vendor removed from database.');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error deleting vendor:", err);
        showToast('error', `Failed to delete vendor from database: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'Vendor removed locally.');
      return true;
    }
  };

  const savePurchaseOrder = async (po: PurchaseOrder): Promise<boolean> => {
    // Optimistic local state update
    setPurchaseOrders(prev => {
      const exists = prev.find(p => p.id === po.id);
      let updated;
      if (exists) {
        updated = prev.map(p => p.id === po.id ? po : p);
      } else {
        updated = [po, ...prev];
      }
      localStorage.setItem('medicore_purchase_orders', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbPO = mapPOToDb(po);
        const { error } = await supabase.from('procurement_purchase_orders').upsert(dbPO);
        if (error) throw error;

        // Save Items
        if (po.items) {
          // Delete old items for this PO
          await supabase.from('procurement_purchase_order_items').delete().eq('po_id', po.id);
          
          if (po.items.length > 0) {
            const dbItems = po.items.map(i => ({
              id: i.id || crypto.randomUUID(),
              po_id: po.id,
              item_id: i.itemId,
              quantity: i.quantity,
              public_price: i.publicPrice || 0,
              discount_percentage: i.discountPercentage || 0,
              unit_cost: i.unitCost,
              is_bulk: i.isBulk,
              tax_structure: i.taxStructure || null,
              remarks: i.remarks || null,
              source_doc_num: i.sourceDocNum || null,
              source_doc_date: i.sourceDocDate || null,
              source_quantity: i.sourceQuantity || 0,
              pending_quantity: i.pendingQuantity || 0,
              short_close_quantity: i.shortCloseQuantity || 0
            }));
            const { error: itemsError } = await supabase.from('procurement_purchase_order_items').insert(dbItems);
            if (itemsError) throw itemsError;
          }
        }

        showToast('success', 'Purchase Order saved successfully to database!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error saving purchase order:", err);
        showToast('error', `Failed to sync purchase order: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', 'Purchase Order saved locally.');
      return true;
    }
  };

  const deletePurchaseOrder = async (id: string): Promise<boolean> => {
    setPurchaseOrders(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('medicore_purchase_orders', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_purchase_orders').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Purchase Order removed from database.');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error deleting PO:", err);
        showToast('error', `Failed to delete purchase order: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'Purchase Order removed locally.');
      return true;
    }
  };

  const saveGRN = async (grn: GRN): Promise<boolean> => {
    // Check if already submitted in state to prevent double stock posting
    const isAlreadySubmitted = grns.find(g => g.id === grn.id)?.status === 'Submitted';

    // Optimistic local state update
    setGrns(prev => {
      const exists = prev.find(g => g.id === grn.id);
      let updated;
      if (exists) {
        updated = prev.map(g => g.id === grn.id ? grn : g);
      } else {
        updated = [grn, ...prev];
      }
      localStorage.setItem('medicore_grns', JSON.stringify(updated));
      return updated;
    });

    // Auto-map GRN items to tax master if not mapped or if mapped incorrectly
    if (grn.items) {
      for (const item of grn.items) {
        const targetVat = Number(item.vatPercentage || 0);

        // Find active tax master for this percentage
        let matchingTax = taxMasters.find(t => t.percentage === targetVat && t.status === 'Active');
        if (!matchingTax) {
          matchingTax = taxMasters.find(t => t.percentage === targetVat);
        }

        let taxId = matchingTax?.id;

        if (!matchingTax) {
          const newTaxId = crypto.randomUUID();
          const newTax: TaxMaster = {
            id: newTaxId,
            taxName: `GST ${targetVat}%`,
            percentage: targetVat,
            status: 'Active',
            createdAt: new Date().toISOString()
          };
          await saveTaxMaster(newTax);
          taxId = newTaxId;
        } else if (matchingTax.status !== 'Active') {
          const updatedTax: TaxMaster = {
            ...matchingTax,
            status: 'Active'
          };
          await saveTaxMaster(updatedTax);
        }

        if (taxId) {
          const existingMapping = itemTaxMappings.find(m => m.itemId === item.itemId);
          if (existingMapping) {
            if (existingMapping.taxId !== taxId) {
              const updatedMapping: ItemTaxMapping = {
                ...existingMapping,
                taxId: taxId
              };
              await saveItemTaxMapping(updatedMapping);
            }
          } else {
            const newMapping: ItemTaxMapping = {
              id: crypto.randomUUID(),
              itemId: item.itemId,
              taxId: taxId,
              createdAt: new Date().toISOString()
            };
            await saveItemTaxMapping(newMapping);
          }
        }
      }
    }

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbGRN = mapGRNToDb(grn);
        const { error } = await supabase.from('procurement_grns').upsert(dbGRN);
        if (error) throw error;

        // Save Items
        if (grn.items) {
          // Delete old items for this GRN
          await supabase.from('procurement_grn_items').delete().eq('grn_id', grn.id);
          
          if (grn.items.length > 0) {
            const dbItems = grn.items.map(i => ({
              id: i.id || crypto.randomUUID(),
              grn_id: grn.id,
              item_id: i.itemId,
              locator: i.locator || null,
              batch_code: i.batchCode,
              batch_date: i.batchDate || null,
              expiry_date: i.expiryDate,
              po_quantity: i.poQuantity || 0,
              received_quantity: i.receivedQuantity,
              accepted_quantity: i.acceptedQuantity,
              rate: i.rate,
              public_price: i.publicPrice || 0,
              unit_cost: i.unitCost,
              discount_percentage: i.discountPercentage || 0,
              discount_amount: i.discountAmount || 0,
              vat_percentage: i.vatPercentage || 15,
              vat_amount: i.vatAmount || 0,
              cgst_amount: i.cgstAmount || 0,
              sgst_amount: i.sgstAmount || 0,
              igst_amount: i.igstAmount || 0,
              total_amount: i.totalAmount,
              remarks: i.remarks || null,
              is_bulky: !!i.isBulky,
              qc_status: i.qcStatus || 'Passed'
            }));
            const { error: itemsError } = await supabase.from('procurement_grn_items').insert(dbItems);
            if (itemsError) throw itemsError;
          }
        }

        // Post stock ledger entries if submitted and not already submitted
        if (grn.status === 'Submitted' && !isAlreadySubmitted) {
          for (const i of grn.items || []) {
            const cleanBatch = (i.batchCode || '').trim().toUpperCase();
            
            // Get current store-wide item balance and rate for WAC
            const { quantity: prevQty, rate: prevRate } = await getItemValuation(grn.storeId, i.itemId);
            
            // Resolve Purchase Conversion Factor (e.g. 1 BOX = 100 Tablets)
            const itemDef = inventoryItems.find(item => item.id === i.itemId);
            const purchaseCF = Number(itemDef?.purchaseConversionFactor || 1);

            const qtyIn = Number(i.acceptedQuantity || 0) * purchaseCF;
            const inRate = Number(i.rate || 0) / purchaseCF;
            const newBalance = prevQty + qtyIn;

            // Calculate WAC (Weighted Average Cost)
            const prevValue = prevQty * prevRate;
            const newValue = qtyIn * inRate;
            const newAverageRate = newBalance > 0 ? (prevValue + newValue) / newBalance : inRate;
            const finalRate = Number(newAverageRate.toFixed(2));

            const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert({
              store_id: grn.storeId,
              item_id: i.itemId,
              transaction_type: 'STOCKIN',
              ref_type: 'GRN RECEIPT',
              ref_doc_no: grn.grnNo,
              ref_doc_date: grn.gateEntryDate,
              stock_in_quantity: qtyIn,
              stock_out_quantity: 0,
              closing_stock: newBalance,
              closing_stock_rate: finalRate,
              closing_stock_value: newBalance * finalRate,
              currency: 'SAR',
              batch_no: cleanBatch,
              batch_date: i.batchDate || null,
              expiry_date: i.expiryDate
            });
            if (ledgerError) {
              console.error("Error writing to ledger for GRN item:", ledgerError);
            }
          }

          // Auto JV Posting
          try {
            const vendor = vendors.find(v => v.id === grn.vendorId);
            const cgstTotal = grn.items?.reduce((sum, i) => sum + Number(i.cgstAmount || 0), 0) || 0;
            const sgstTotal = grn.items?.reduce((sum, i) => sum + Number(i.sgstAmount || 0), 0) || 0;
            const igstTotal = grn.items?.reduce((sum, i) => sum + Number(i.igstAmount || 0), 0) || 0;
            const taxAmount = grn.items?.reduce((sum, i) => sum + Number(i.cgstAmount || 0) + Number(i.sgstAmount || 0) + Number(i.igstAmount || 0), 0) || 0;
            const grossTotal = grn.items?.reduce((sum, i) => sum + (Number(i.acceptedQuantity || 0) * Number(i.rate || 0) - Number(i.discountAmount || 0)), 0) || 0;

            await postAutoJournalVoucher('GRN', grn.id, grn.grnNo, {
              net: grn.netAmount,
              cgst: cgstTotal,
              sgst: sgstTotal,
              igst: igstTotal,
              tax: taxAmount,
              gross: grossTotal,
              partyName: vendor?.name || 'Vendor'
            });
          } catch (jvErr) {
            console.error("Error posting automated GRN journal voucher:", jvErr);
          }
        }

        showToast('success', 'GRN saved successfully to database!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error saving GRN:", err);
        showToast('error', `Failed to sync GRN: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', 'GRN saved locally.');
      return true;
    }
  };

  const deleteGRN = async (id: string): Promise<boolean> => {
    setGrns(prev => {
      const updated = prev.filter(g => g.id !== id);
      localStorage.setItem('medicore_grns', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_grns').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'GRN removed from database.');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error deleting GRN:", err);
        showToast('error', `Failed to delete GRN: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'GRN removed locally.');
      return true;
    }
  };

  const savePurchaseReceipt = async (receipt: PurchaseReceipt): Promise<boolean> => {
    // Optimistic local state update
    setPurchaseReceipts(prev => {
      const exists = prev.find(p => p.id === receipt.id);
      let updated;
      if (exists) {
        updated = prev.map(p => p.id === receipt.id ? receipt : p);
      } else {
        updated = [receipt, ...prev];
      }
      localStorage.setItem('medicore_purchase_receipts', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbPRN = mapPRNToDb(receipt);
        const { error } = await supabase.from('procurement_purchase_receipts').upsert(dbPRN);
        if (error) throw error;

        // Save Items
        if (receipt.items) {
          // Delete old items
          await supabase.from('procurement_purchase_receipt_items').delete().eq('receipt_id', receipt.id);
          
          if (receipt.items.length > 0) {
            const dbItems = receipt.items.map(i => ({
              id: i.id || crypto.randomUUID(),
              receipt_id: receipt.id,
              item_id: i.itemId,
              quantity: i.quantity,
              remarks: i.remarks || null,
              rate: i.rate,
              discount_percentage: i.discountPercentage || 0,
              discount_amount: i.discountAmount || 0,
              source_quantity: i.sourceQuantity || 0,
              pending_quantity: i.pendingQuantity || 0,
              already_converted_quantity: i.alreadyConvertedQuantity || 0,
              batch_details: i.batchDetails || {}
            }));
            const { error: itemsError } = await supabase.from('procurement_purchase_receipt_items').insert(dbItems);
            if (itemsError) throw itemsError;
          }
        }

        showToast('success', 'Purchase Receipt saved successfully to database!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error saving Purchase Receipt:", err);
        showToast('error', `Failed to sync Purchase Receipt: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', 'Purchase Receipt saved locally.');
      return true;
    }
  };

  const deletePurchaseReceipt = async (id: string): Promise<boolean> => {
    setPurchaseReceipts(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('medicore_purchase_receipts', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_purchase_receipts').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Purchase Receipt removed from database.');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error("Database error deleting Purchase Receipt:", err);
        showToast('error', `Failed to delete Purchase Receipt: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'Purchase Receipt removed locally.');
      return true;
    }
  };

  const savePurchaseReturn = async (ret: PurchaseReturn): Promise<boolean> => {
    // Guard: prevent double stock posting
    const isAlreadySubmitted = purchaseReturns.find(r => r.id === ret.id)?.status === 'Submitted';

    setPurchaseReturns(prev => {
      const exists = prev.find(r => r.id === ret.id);
      const updated = exists
        ? prev.map(r => r.id === ret.id ? ret : r)
        : [ret, ...prev];
      localStorage.setItem('medicore_purchase_returns', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbRet = mapPurchaseReturnToDb(ret);
        const { error } = await supabase.from('procurement_purchase_returns').upsert(dbRet);
        if (error) throw error;

        if (ret.items) {
          await supabase.from('procurement_purchase_return_items').delete().eq('return_id', ret.id);
          if (ret.items.length > 0) {
            const dbItems = ret.items.map(i => ({
              id: i.id || crypto.randomUUID(),
              return_id: ret.id,
              item_id: i.itemId,
              quantity: i.quantity,
              rate: i.rate,
              discount_percentage: i.discountPercentage || 0,
              discount_amount: i.discountAmount || 0,
              source_quantity: i.sourceQuantity || 0,
              return_reason: i.returnReason || null,
              batch_details: i.batchDetails || {}
            }));
            const { error: ie } = await supabase.from('procurement_purchase_return_items').insert(dbItems);
            if (ie) throw ie;
          }
        }

        // Post STOCKOUT entries to stock ledger (only on first submission)
        if (ret.status === 'Submitted' && !isAlreadySubmitted) {
          for (const i of ret.items || []) {
            const qtyOut = Number(i.quantity || 0);
            if (qtyOut <= 0) continue;

            // Get current closing stock and WAC rate
            const { quantity: prevQty, rate: prevRate } = await getItemValuation(ret.storeId, i.itemId);
            const newBalance = Math.max(0, prevQty - qtyOut);

            const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert({
              store_id: ret.storeId,
              item_id: i.itemId,
              transaction_type: 'STOCKOUT',
              ref_type: 'PURCHASE RETURN',
              ref_doc_no: ret.returnNo,
              ref_doc_date: ret.returnDate,
              stock_in_quantity: 0,
              stock_out_quantity: qtyOut,
              closing_stock: newBalance,
              closing_stock_rate: prevRate,
              closing_stock_value: newBalance * prevRate,
              currency: 'SAR',
              batch_no: (i.batchDetails?.batchCode || '').trim().toUpperCase() || null,
              batch_date: null,
              expiry_date: i.batchDetails?.expiryDate || null
            });
            if (ledgerError) {
              console.error('STOCKOUT ledger error for Purchase Return item:', ledgerError);
            } else {
              await checkAndAutoRaisePO(ret.storeId, i.itemId, newBalance);
            }
          }
        }

        showToast('success', ret.status === 'Submitted'
          ? 'Purchase Return submitted! STOCKOUT entries posted to stock ledger.'
          : 'Purchase Return saved to database!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error('DB error saving Purchase Return:', err);
        showToast('error', `Failed to sync Purchase Return: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', ret.status === 'Submitted'
        ? 'Purchase Return submitted locally. Ledger will sync when DB is connected.'
        : 'Purchase Return saved locally.');
      return true;
    }
  };

  const deletePurchaseReturn = async (id: string): Promise<boolean> => {
    setPurchaseReturns(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('medicore_purchase_returns', JSON.stringify(updated));
      return updated;
    });
    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_purchase_returns').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Purchase Return removed from database.');
        return true;
      } catch (err: any) {
        showToast('error', `Failed to delete Purchase Return: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'Purchase Return removed locally.');
      return true;
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
                .maybeSingle(),
              timeoutPromise
          ]) as any;

          if (error || !data) {
              console.error("Login error:", error);
              showToast('error', error?.message || 'Invalid username or password');
              setIsLoading(false);
              return false;
          }

          // Check if active
          if (data.is_active === false) {
              showToast('error', 'Your account has been deactivated. Please contact administrator.');
              setIsLoading(false);
              return false;
          }

          // Fetch Effective Privileges
          const privilegesMap: Record<string, Privilege> = {};
          const isUserAdmin = username.toLowerCase() === 'admin' || 
                             data.role?.toLowerCase() === 'administrator' || 
                             data.role?.toLowerCase() === 'admin';

          // Load screen registry
          const { data: screensList } = await supabase.from('screens').select('*');
          const allScreens = screensList || [];

          if (isUserAdmin) {
              // Superuser has all access
              allScreens.forEach((s: any) => {
                  privilegesMap[s.screen_code] = {
                      screen_id: s.id,
                      screen_code: s.screen_code,
                      screen_name: s.screen_name,
                      module: s.module,
                      can_view: true,
                      can_create: true,
                      can_edit: true,
                      can_delete: true,
                      can_export: true
                  };
              });
          } else {
              // 1. Fetch Role Privileges
              if (data.role_id) {
                  const { data: rpList } = await supabase
                      .from('role_privileges')
                      .select(`
                          *,
                          screen:screen_id ( screen_code, screen_name, module )
                      `)
                      .eq('role_id', data.role_id);
                  
                  if (rpList) {
                      rpList.forEach((rp: any) => {
                          const scr = Array.isArray(rp.screen) ? rp.screen[0] : rp.screen;
                          if (scr) {
                              privilegesMap[scr.screen_code] = {
                                  screen_id: rp.screen_id,
                                  screen_code: scr.screen_code,
                                  screen_name: scr.screen_name,
                                  module: scr.module,
                                  can_view: !!rp.can_view,
                                  can_create: !!rp.can_create,
                                  can_edit: !!rp.can_edit,
                                  can_delete: !!rp.can_delete,
                                  can_export: !!rp.can_export
                              };
                          }
                      });
                  }
              }

              // 2. Fetch User Privilege Overrides (take precedence)
              const { data: upList } = await supabase
                  .from('user_privilege_overrides')
                  .select(`
                      *,
                      screen:screen_id ( screen_code, screen_name, module )
                  `)
                  .eq('user_id', data.id);
              
              if (upList) {
                  upList.forEach((up: any) => {
                      const scr = Array.isArray(up.screen) ? up.screen[0] : up.screen;
                      if (scr) {
                          privilegesMap[scr.screen_code] = {
                              screen_id: up.screen_id,
                              screen_code: scr.screen_code,
                              screen_name: scr.screen_name,
                              module: scr.module,
                              can_view: !!up.can_view,
                              can_create: !!up.can_create,
                              can_edit: !!up.can_edit,
                              can_delete: !!up.can_delete,
                              can_export: !!up.can_export
                          };
                      }
                  });
              }
          }

          const loggedUser: AppUser = {
              id: data.id,
              username: data.username,
              role: data.role,
              fullName: data.full_name || 'User',
              employeeId: data.employee_id,
              user_code: data.user_code,
              mobile: data.mobile,
              department_id: data.department_id,
              location_id: data.location_id,
              role_id: data.role_id,
              is_active: !!data.is_active,
              privileges: privilegesMap
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
          employeeId: 'DEMO-001',
          is_active: true
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
      setDoctorSchedules([]); setScheduleTemplates([]);
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
    if(original) {
        const fullNewData = { ...original, ...data };
        const { error } = await getSupabase().from('employees').update(mapEmpToDb(fullNewData)).eq('id', id);
        if (error) { showToast('error', `Update failed: ${error.message}`); if (original) setEmployees(prev => prev.map(emp => emp.id === id ? original : emp)); }
        else showToast('success', 'Employee updated.');
    }
  };

  const addDepartment = async (d: Department) => {
    if (!requireDb()) return;
    setDepartments(prev => [...prev, d]);
    const { id, name, code, status } = d;
    const { error } = await getSupabase().from('departments').insert({ id, name, code, status });
    if(error) { showToast('error', error.message); setDepartments(prev => prev.filter(dept => dept.id !== d.id)); }
    else showToast('success', 'Department added.');
  };

  const addUnit = async (u: Unit) => {
    if (!requireDb()) return;
    setUnits(prev => [...prev, u]);
    const { id, name, code, status } = u;
    const { error } = await getSupabase().from('units').insert({ id, name, code, status });
    if(error) { showToast('error', error.message); setUnits(prev => prev.filter(unit => unit.id !== u.id)); }
    else showToast('success', 'Unit added.');
  };

  const addServiceCentre = async (s: ServiceCentre) => {
    if (!requireDb()) return;
    setServiceCentres(prev => [...prev, s]);
    const { id, name, code, status, departmentId } = s;
    const { error } = await getSupabase().from('service_centres').insert({ id, name, code, status, department_id: departmentId });
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

  const saveServiceLocationMappings = async (serviceId: string, mappings: ServiceLocationMapping[]) => {
      if (!requireDb()) return;

      // Optimistically update local state
      setServiceLocationMappings(prev => {
          const others = prev.filter(m => m.serviceId !== serviceId);
          return [...others, ...mappings];
      });

      // Delete existing mappings for this service first
      const { error: deleteError } = await getSupabase()
          .from('service_location_mappings')
          .delete()
          .eq('service_id', serviceId);

      if (deleteError) {
          console.warn('Failed to delete old mappings (might be first save):', deleteError.message);
      }

      if (mappings.length > 0) {
          const dbPayload = mappings.map(mapLocationMappingToDb);
          const { error: insertError } = await getSupabase()
              .from('service_location_mappings')
              .insert(dbPayload);

          if (insertError) {
              showToast('error', `Failed to save assigned locations: ${insertError.message}`);
              // Revert local state (reload mappings)
              try {
                  const { data } = await getSupabase().from('service_location_mappings').select('*');
                  if (data) setServiceLocationMappings(data.map(mapLocationMappingFromDb));
              } catch (err) {}
          }
      }
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

  const createBill = async (bill: Bill, linkedOrderIdsRaw?: string[]): Promise<boolean> => {
      const linkedOrderIds = (linkedOrderIdsRaw || []).filter(id => id && id.trim());
      if (!requireDb()) return false;
      
      // Optimistic update
      setBills(prev => [{ ...bill, refundStatus: bill.refundStatus || 'Pending' }, ...prev]);

      const triggerDirectLabOrders = async () => {
          const supabase = getSupabase();
          const labItems = bill.items?.filter((i: any) => {
              const t = (i.itemType || '').toLowerCase();
              return t === 'lab test' || t === 'laboratory' || t === 'lab_test';
          }) || [];

          if (labItems.length > 0 && (!linkedOrderIds || linkedOrderIds.length === 0)) {
              let appointmentId = bill.appointmentId || null;
              if (!appointmentId && bill.patientId) {
                  try {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const { data: existingApp } = await supabase
                          .from('appointments')
                          .select('id')
                          .eq('patient_id', bill.patientId)
                          .eq('date', todayStr)
                          .limit(1);

                      if (existingApp && existingApp.length > 0) {
                          appointmentId = existingApp[0].id;
                      } else {
                          const newAppId = crypto.randomUUID();
                          const { error: appErr } = await supabase.from('appointments').insert({
                              id: newAppId,
                              patient_id: bill.patientId,
                              date: todayStr,
                              time: new Date().toTimeString().slice(0, 5),
                              status: 'Completed',
                              visit_type: 'Direct Billing',
                              doctor_id: bill.doctorId || null,
                              department_id: bill.departmentId || null
                          });
                          if (!appErr) {
                              appointmentId = newAppId;
                          }
                      }
                  } catch (appQueryErr) {
                      console.error('Direct fallback: Failed to resolve/create stub appointment:', appQueryErr);
                  }
              }

              for (const labItem of labItems) {
                  let resolvedServiceId = labItem.itemId || null;
                  let resolvedCptCode: string | null = null;
                  
                  const matchedSvc = serviceDefinitions.find(s => 
                      (resolvedServiceId && s.id === resolvedServiceId) || 
                      s.name.toLowerCase() === (labItem.description || '').toLowerCase()
                  );
                  
                  if (matchedSvc) {
                      resolvedServiceId = matchedSvc.id;
                      resolvedCptCode = matchedSvc.cptCode || null;
                  } else if (!resolvedServiceId && labItem.description) {
                      const { data: svcMatch } = await supabase
                          .from('service_definitions')
                          .select('id, cpt_code')
                          .ilike('name', labItem.description)
                          .limit(1);
                      if (svcMatch && svcMatch.length > 0) {
                          resolvedServiceId = svcMatch[0].id;
                          resolvedCptCode = svcMatch[0].cpt_code || null;
                      }
                  }

                  const serviceOrderId = crypto.randomUUID();
                  await supabase.from('service_orders').insert({
                      id: serviceOrderId,
                      appointment_id: appointmentId,
                      service_id: resolvedServiceId,
                      service_name: labItem.description,
                      cpt_code: resolvedCptCode,
                      quantity: labItem.quantity || 1,
                      unit_price: labItem.unitPrice || 0,
                      total_price: labItem.total || 0,
                      status: 'Billed',
                      billing_status: 'Billed',
                      priority: 'Routine',
                      order_date: new Date().toISOString(),
                      ordering_doctor_id: bill.doctorId || null,
                      service_center: bill.departmentId || null
                  });
              }
          }
      };

      try {
          const token = await getAuthToken();
          const response = await fetch(`${BACKEND_URL}/api/billing/create`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ bill, linkedOrderIds })
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Failed to create bill');
          }

          // Update local state for immediate UI reflection
          if (linkedOrderIds && linkedOrderIds.length > 0) {
              setServiceOrders(prev => prev.map(o => 
                  linkedOrderIds.includes(o.id) ? { ...o, billingStatus: 'Invoiced' } : o
              ));
          }

          // Trigger direct lab orders registration on success
          await triggerDirectLabOrders();

          showToast('success', 'Invoice generated successfully.');
          return true;
      } catch (error: any) {
          console.warn("Backend billing create failed, trying client-side direct fallback...", error);
          
          try {
              const supabase = getSupabase();
              // 1. Insert bill header
              const { error: billError } = await supabase.from('bills').insert({
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
                  prescription_id: bill.prescriptionId || null,
                  cancelled_at: bill.cancelledAt || null
              });

              if (billError) {
                  throw new Error('Direct bill header save failed: ' + billError.message);
              }

              // 2. Insert bill items
              const itemsDb = bill.items.map((i: any) => ({
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

              const { error: itemsError } = await supabase.from('bill_items').insert(itemsDb);
              if (itemsError) {
                  // clean up bill
                  await supabase.from('bills').delete().eq('id', bill.id);
                  throw new Error('Direct bill items save failed: ' + itemsError.message);
              }

              // 3. Insert payments
              if (bill.payments && bill.payments.length > 0) {
                  const paymentsDb = bill.payments.map((p: any) => ({
                      id: p.id,
                      bill_id: bill.id,
                      date: p.date,
                      amount: Number(p.amount),
                      method: p.method,
                      reference: p.reference || null
                  }));
                  const { error: payError } = await supabase.from('payments').insert(paymentsDb);
                  if (payError) {
                      console.error('Direct fallback: Failed to insert payments:', payError);
                  }
              }

              // 4. Update status of linked service orders
              if (linkedOrderIds && linkedOrderIds.length > 0) {
                  await supabase
                      .from('service_orders')
                      .update({ billing_status: 'Billed', status: 'Billed' })
                      .in('id', linkedOrderIds);

                  setServiceOrders(prev => prev.map(o => 
                      linkedOrderIds.includes(o.id) ? { ...o, billingStatus: 'Invoiced' } : o
                  ));
              }

              // 5. Direct Billing Path for Lab Tests
              await triggerDirectLabOrders();

              showToast('success', 'Invoice generated successfully (via direct database fallback).');
              return true;
          } catch (fallbackError: any) {
              console.error("Direct fallback failed:", fallbackError);
              showToast('error', 'Failed to create bill: ' + fallbackError.message);
              setBills(prev => prev.filter(b => b.id !== bill.id));
              return false;
          }
      }
  };

  const cancelBill = async (id: string): Promise<boolean> => {
      if (!requireDb()) return false;
      
      const original = bills.find(b => b.id === id);
      if (!original) return false;

      const cancelledAt = new Date().toISOString();

      // Optimistic update
      setBills(prev => prev.map(b => b.id === id ? { ...b, status: 'Cancelled', refundStatus: 'Pending', cancelledAt } : b));

      try {
          const token = await getAuthToken();
          const response = await fetch(`${BACKEND_URL}/api/billing/cancel`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ id, cancelledAt })
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Failed to cancel bill');
          }

          if (original.invoiceNo) {
              await reverseLoyaltyTransaction(original.invoiceNo);
          }

          showToast('success', 'Invoice cancelled.');
          return true;
      } catch (error: any) {
          console.warn("Backend billing cancel failed, trying client-side direct fallback...", error);
          
          try {
              const supabase = getSupabase();
              const { error: cancelError } = await supabase
                  .from('bills')
                  .update({ status: 'Cancelled', refund_status: 'Pending', cancelled_at: cancelledAt })
                  .eq('id', id);

              if (cancelError) {
                  throw new Error('Direct cancel failed: ' + cancelError.message);
              }

              if (original.invoiceNo) {
                  await reverseLoyaltyTransaction(original.invoiceNo);
              }

              showToast('success', 'Invoice cancelled successfully (via direct database fallback).');
              return true;
          } catch (fallbackError: any) {
              console.error("Direct fallback failed for cancelBill:", fallbackError);
              showToast('error', 'Failed to cancel bill: ' + fallbackError.message);
              // Revert
              setBills(prev => prev.map(b => b.id === id ? original : b));
              return false;
          }
      }
  };

  const addPayment = async (payment: Payment, billId: string) => {
      if (!requireDb()) return;

      const bill = bills.find(b => b.id === billId);
      if (!bill) return;

      const originalBillsState = [...bills];
      const newPaidAmount = Number(bill.paidAmount) + Number(payment.amount);
      let newStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Partial';
      if (newPaidAmount >= bill.totalAmount) newStatus = 'Paid';

      // Optimistic update
      setBills(prev => prev.map(b => {
          if (b.id !== billId) return b;
          return { ...b, paidAmount: newPaidAmount, status: newStatus, payments: [...b.payments, payment] };
      }));

      try {
          const token = await getAuthToken();
          const response = await fetch(`${BACKEND_URL}/api/billing/add-payment`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ payment, billId, newPaidAmount, newStatus })
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Failed to record payment');
          }

          showToast('success', 'Payment recorded.');
      } catch (error: any) {
          console.warn("Backend billing add-payment failed, trying client-side direct fallback...", error);
          
          try {
              const supabase = getSupabase();
              const { error: payError } = await supabase.from('payments').insert({
                  id: payment.id,
                  bill_id: billId,
                  date: payment.date,
                  amount: payment.amount,
                  method: payment.method,
                  reference: payment.reference || null
              });

              if (payError) {
                  throw new Error('Direct payment insert failed: ' + payError.message);
              }

              const { error: billError } = await supabase
                  .from('bills')
                  .update({ paid_amount: newPaidAmount, status: newStatus })
                  .eq('id', billId);

              if (billError) {
                  throw new Error('Direct bill status update failed: ' + billError.message);
              }

              showToast('success', 'Payment recorded successfully (via direct database fallback).');
          } catch (fallbackError: any) {
              console.error("Direct fallback failed for addPayment:", fallbackError);
              showToast('error', 'Failed to record payment: ' + fallbackError.message);
              // Revert
              setBills(originalBillsState);
          }
      }
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

  const dispensePrescription = async (
      prescriptionId: string, 
      storeId: string, 
      allocatedBatches: Record<string, { batchNo: string, rate: number, batchDate?: string, expiryDate?: string, amount?: number }>, 
      issueQty?: Record<string, number>,
      dispensingUom?: Record<string, string>,
      paymentMode?: string,
      referenceNo?: string,
      paidAmount?: number,
      paymentStatus?: string
  ): Promise<{ success: boolean; invoiceId?: string }> => {
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
                  
                  // Resolve Sales Conversion Factor (e.g. 1 STRIP = 10 Tablets)
                  const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                  const selectedUom = dispensingUom?.[item.id] || item.units || 'EACH';
                  const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                  const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

                  // Use issueQty if provided, otherwise fall back to totalQty
                  const issueQtyForItem = issueQty?.[item.id];
                  const dispensedQty = issueQtyForItem !== undefined ? Number(issueQtyForItem) : Number(item.totalQty || 0);
                  const qty = dispensedQty * salesCF;
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
              
              // Check low stock triggers
              for (const entry of ledgerEntries) {
                await checkAndAutoRaisePO(entry.store_id, entry.item_id, entry.closing_stock);
              }
              
              // Calculate total dispensed amount for this transaction (including tax)
              let transactionTotal = 0;
              let transactionTax = 0;
              
              prescription.items.filter(item => dispensedItemIds.includes(item.id)).forEach(item => {
                  const allocation = allocatedBatches[item.id];
                  const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                  const selectedUom = dispensingUom?.[item.id] || item.units || 'EACH';
                  const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                  const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

                  const iqtyForItem = issueQty?.[item.id];
                  const qty = iqtyForItem !== undefined ? Number(iqtyForItem) : Number(item.totalQty || 0);
                  const rate = Number(allocation.rate || 0);
                  const itemPrice = rate * salesCF;
                  
                  const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                  const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                  const taxPercent = tax?.percentage || 0;
                  const total = Number((qty * itemPrice).toFixed(2));
                  const taxAmount = Number((total * taxPercent / (100 + taxPercent)).toFixed(2));
                  
                  transactionTotal += total;
                  transactionTax += taxAmount;
              });

              const existingHeaderTotal = Number(prescription.totalAmount) || 0;
              const newHeaderTotal = Number((existingHeaderTotal + transactionTotal).toFixed(2));

              console.log(`Dispensing: Trans Total=${transactionTotal}, Trans Tax=${transactionTax}, Old Total=${existingHeaderTotal}, New Total=${newHeaderTotal}`);

              // Find previously dispensed quantity for all items under this prescription
              const prescriptionBills = bills.filter(b => b.prescriptionId === prescription.id && b.status !== 'Cancelled');

              // Update items status and pricing info
              const itemUpdates = prescription.items.filter(item => dispensedItemIds.includes(item.id)).map(item => {
                  const allocation = allocatedBatches[item.id];
                  const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                  const selectedUom = dispensingUom?.[item.id] || item.units || 'EACH';
                  const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                  const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

                  const iqtyForItem = issueQty?.[item.id];
                  const qty = iqtyForItem !== undefined ? Number(iqtyForItem) : Number(item.totalQty || 0);
                  const rate = Number(allocation.rate || 0);
                  const itemPrice = rate * salesCF;
                  const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                  const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                  const taxPercent = tax?.percentage || 0;
                  const total = Number((qty * itemPrice).toFixed(2));
                  const taxAmount = Number((total * taxPercent / (100 + taxPercent)).toFixed(2));
                  
                  // Calculate cumulative dispensed quantity (past bills + current transaction) in base units
                  const previouslyDispensed = prescriptionBills.reduce((sum, b) => {
                      const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                      return sum + matchingItems.reduce((acc, curr) => {
                          const isSales = curr.itemType?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                          const cf = isSales ? Number(itemDef?.salesConversionFactor || 1) : 1;
                          return acc + (curr.quantity * cf);
                      }, 0);
                  }, 0);

                  const qtyInBase = qty * salesCF;
                  const totalDispensedQtyInBase = previouslyDispensed + qtyInBase;
                  const itemStatus = totalDispensedQtyInBase < Number(item.totalQty || 0) ? 'Partially Dispensed' : 'Dispensed';

                  return supabase.from('prescription_items')
                      .update({ 
                          status: itemStatus,
                          unit_price: itemPrice,
                          tax_percentage: taxPercent,
                          tax_amount: taxAmount,
                          total_amount: total
                      } as any)
                      .eq('id', item.id);
              });

              await Promise.all(itemUpdates);
              
              // Fully dispensed only if every item's cumulative dispensed qty is >= its total required qty
              const allDispensed = prescription.items.every(item => {
                  const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                  const previouslyDispensed = prescriptionBills.reduce((sum, b) => {
                      const matchingItems = b.items.filter(bi => bi.itemId === item.itemId);
                      return sum + matchingItems.reduce((acc, curr) => {
                          const isSales = curr.itemType?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                          const cf = isSales ? Number(itemDef?.salesConversionFactor || 1) : 1;
                          return acc + (curr.quantity * cf);
                      }, 0);
                  }, 0);

                  let currentDispensedInBase = 0;
                  if (dispensedItemIds.includes(item.id)) {
                      const selectedUom = dispensingUom?.[item.id] || item.units || 'EACH';
                      const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                      const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;
                      const iqty = issueQty?.[item.id];
                      currentDispensedInBase = (iqty !== undefined ? Number(iqty) : Number(item.totalQty || 0)) * salesCF;
                  }

                  const totalDispensedQtyInBase = previouslyDispensed + currentDispensedInBase;
                  return totalDispensedQtyInBase >= Number(item.totalQty || 0);
              });
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
              
              const finalPaymentStatus = paymentStatus || 'Unpaid';
              const finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : 0;

              const newBill: any = {
                  id: billId,
                  patient_id: prescription.patientId,
                  appointment_id: prescription.appointmentId || null,
                  date: new Date().toISOString(),
                  status: finalPaymentStatus,
                  total_amount: transactionTotal,
                  tax_amount: transactionTax,
                  paid_amount: finalPaidAmount,
                  invoice_no: invoiceNo,
                  created_by: user?.username || user?.email || 'admin',
                  is_pharmacy: true,
                  prescription_id: prescription.id,
                  payment_mode: paymentMode || null,
                  amount_received: finalPaidAmount,
                  reference_no: referenceNo || null
              };

              const { error: billError } = await supabase.from('bills').insert(newBill);
              
              if (billError) {
                  throw new Error(`Invoice generation failed: ${billError.message}`);
              }

              // Record payment if paidAmount > 0
              if (finalPaidAmount > 0) {
                  const paymentId = crypto.randomUUID();
                  const { error: payError } = await supabase.from('payments').insert({
                      id: paymentId,
                      bill_id: billId,
                      date: newBill.date,
                      amount: finalPaidAmount,
                      method: paymentMode === 'Card' || paymentMode === 'UPI' ? 'Online' : (paymentMode || 'Cash'),
                      reference: referenceNo || null
                  });
                  if (payError) {
                      console.error("Failed to insert payment record during dispensePrescription:", payError);
                  }
              }

              console.log("Pharmacy bill header created successfully:", billId);
                  const billItems = prescription.items
                    .filter(item => dispensedItemIds.includes(item.id))
                    .map(item => {
                        const allocation = allocatedBatches[item.id];
                        const itemDef = inventoryItems.find(inv => inv.id === item.itemId);
                        const selectedUom = dispensingUom?.[item.id] || item.units || 'EACH';
                        const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                        const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;

                        const iqtyForBill = issueQty?.[item.id];
                        const qty = iqtyForBill !== undefined ? Number(iqtyForBill) : Number(item.totalQty || 0);
                        const rate = Number(allocation.rate || 0);
                        const itemPrice = rate * salesCF;
                        const mapping = itemTaxMappings.find(m => m.itemId === item.itemId);
                        const tax = mapping ? taxMasters.find(t => t.id === mapping.taxId && t.status === 'Active') : null;
                        const taxPercent = tax?.percentage || 0;
                        const total = Number((qty * itemPrice).toFixed(2));
                        const taxAmount = Number((total * taxPercent / (100 + taxPercent)).toFixed(2));
                        return {
                            id: crypto.randomUUID(),
                            bill_id: billId,
                            item_id: item.itemId,
                            batch_no: allocation.batchNo,
                            description: item.itemName || '',
                            quantity: qty,
                            unit_price: itemPrice,
                            tax_percentage: taxPercent,
                            tax_amount: taxAmount,
                            total: total,
                            item_type: selectedUom
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
                      status: finalPaymentStatus as any,
                      totalAmount: transactionTotal,
                      taxAmount: transactionTax,
                      paidAmount: finalPaidAmount,
                      isPharmacy: true,
                      prescriptionId: prescriptionId,
                      doctorId: prescription.doctorId,
                      createdBy: user?.username || user?.email || 'admin',
                      paymentMode: paymentMode,
                      amountReceived: finalPaidAmount,
                      referenceNo: referenceNo,
                      items: billItems.map(bi => ({
                          id: bi.id,
                          description: bi.description || '',
                          quantity: bi.quantity,
                          unitPrice: bi.unit_price,
                          taxPercentage: bi.tax_percentage,
                          taxAmount: bi.tax_amount,
                          total: bi.total,
                          itemId: bi.item_id,
                          batchNo: bi.batch_no,
                          itemType: bi.item_type
                      })),
                      payments: finalPaidAmount > 0 ? [{
                          id: crypto.randomUUID(),
                          date: newBill.date,
                          amount: finalPaidAmount,
                          method: paymentMode === 'Card' || paymentMode === 'UPI' ? 'Online' : (paymentMode as any),
                          reference: referenceNo || ''
                      }] : []
                  };
                  setBills(prev => [localBill, ...prev]);

                  setPrescriptions(prev => prev.map(p => {
                  if (p.id !== prescriptionId) return p;
                  return {
                      ...p,
                      status: newStatus as any,
                      totalAmount: newHeaderTotal,
                      items: p.items.map(i => {
                          const itemDef = inventoryItems.find(inv => inv.id === i.itemId);
                          // Calculate cumulative quantity dispensed for local state update
                          const previouslyDispensed = prescriptionBills.reduce((sum, b) => {
                              const matchingItems = b.items.filter(bi => bi.itemId === i.itemId);
                              return sum + matchingItems.reduce((acc, curr) => {
                                  const isSales = curr.itemType?.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                                  const cf = isSales ? Number(itemDef?.salesConversionFactor || 1) : 1;
                                  return acc + (curr.quantity * cf);
                              }, 0);
                          }, 0);

                          let currentDispensedInBase = 0;
                          if (dispensedItemIds.includes(i.id)) {
                              const selectedUom = dispensingUom?.[i.id] || i.units || 'EACH';
                              const isSalesUom = selectedUom.toUpperCase() === itemDef?.salesUom?.toUpperCase();
                              const salesCF = isSalesUom ? Number(itemDef?.salesConversionFactor || 1) : 1;
                              const iqtyLocal = issueQty?.[i.id];
                              const issuedLocal = iqtyLocal !== undefined ? Number(iqtyLocal) : Number(i.totalQty || 0);
                              currentDispensedInBase = issuedLocal * salesCF;
                          }

                          const totalDispensedQtyInBase = previouslyDispensed + currentDispensedInBase;
                          const localStatus = totalDispensedQtyInBase < Number(i.totalQty || 0) ? 'Partially Dispensed' : 'Dispensed';
                          return { ...i, status: localStatus as any };
                      })
                  };
              }));
              
              // Auto JV Posting
              try {
                const pat = patients.find(p => p.id === prescription.patientId);
                const patientName = pat ? `${pat.firstName} ${pat.lastName || ''}`.trim() : 'Patient';

                await postAutoJournalVoucher('OP_DISPENSE', billId, invoiceNo, {
                  net: transactionTotal,
                  tax: transactionTax,
                  cgst: Number((transactionTax / 2).toFixed(2)),
                  sgst: Number((transactionTax / 2).toFixed(2)),
                  igst: 0,
                  gross: Number((transactionTotal - transactionTax).toFixed(2)),
                  partyName: patientName,
                  paymentMode: paymentMode || 'Cash'
                });
              } catch (jvErr) {
                console.error("Error posting automated prescription dispense journal voucher:", jvErr);
              }

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

    // Evaluate if any store's current stock level is already <= the newly set reserved quantity
    if (item.stock && Number(item.stock.reservedQty || 0) > 0) {
      const rq = Number(item.stock.reservedQty);
      for (const st of stores) {
        const val = await getItemValuation(st.id, item.id);
        if (val.quantity <= rq) {
          await checkAndAutoRaisePO(st.id, item.id, val.quantity, item);
        }
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

  const fetchReagentMappings = async (serviceId?: string) => {
    if (!requireDb()) return;
    const supabase = getSupabase();
    try {
      let query = supabase
        .from('lab_service_reagents')
        .select(`
          id,
          service_id,
          item_id,
          store_id,
          quantity_per_test,
          unit_id,
          is_mandatory,
          inventory_items(item_name, item_code),
          stores(store_name),
          units(code)
        `);
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      const { data, error } = await query;
      if (error) {
        showToast('error', `Failed to fetch reagent mappings: ${error.message}`);
      } else {
        const mappings: LabServiceReagent[] = (data || []).map((r: any) => ({
          id: r.id,
          serviceId: r.service_id,
          itemId: r.item_id,
          storeId: r.store_id,
          quantityPerTest: Number(r.quantity_per_test || 0),
          unitId: r.unit_id,
          isMandatory: !!r.is_mandatory,
          itemName: r.inventory_items?.item_name,
          itemCode: r.inventory_items?.item_code,
          storeName: r.stores?.store_name,
          unitCode: r.units?.code
        }));
        setReagentsMapping(mappings);
      }
    } catch (err: any) {
      console.error('Error fetching reagent mappings:', err);
    }
  };

  const saveReagentMapping = async (mapping: LabServiceReagent): Promise<boolean> => {
    if (!requireDb()) return false;
    const supabase = getSupabase();
    try {
      const payload = {
        id: mapping.id || undefined,
        service_id: mapping.serviceId,
        item_id: mapping.itemId,
        store_id: mapping.storeId,
        quantity_per_test: mapping.quantityPerTest,
        unit_id: mapping.unitId,
        is_mandatory: mapping.isMandatory
      };
      const { error } = await supabase.from('lab_service_reagents').upsert(payload);
      if (error) {
        showToast('error', `Failed to save reagent mapping: ${error.message}`);
        return false;
      }
      showToast('success', 'Reagent mapping saved.');
      await fetchReagentMappings(mapping.serviceId);
      return true;
    } catch (err: any) {
      showToast('error', `Error saving mapping: ${err.message}`);
      return false;
    }
  };

  const deleteReagentMapping = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    const supabase = getSupabase();
    try {
      const originalMapping = reagentsMapping.find(r => r.id === id);
      const serviceId = originalMapping?.serviceId;
      const { error } = await supabase.from('lab_service_reagents').delete().eq('id', id);
      if (error) {
        showToast('error', `Failed to delete reagent mapping: ${error.message}`);
        return false;
      }
      showToast('info', 'Reagent mapping removed.');
      if (serviceId) {
        await fetchReagentMappings(serviceId);
      }
      return true;
    } catch (err: any) {
      showToast('error', `Error deleting mapping: ${err.message}`);
      return false;
    }
  };

  const fetchReagentConsumptionLog = async (labOrderId: string): Promise<LabReagentConsumptionLog[]> => {
    if (!requireDb()) return [];
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('lab_reagent_consumption_log')
        .select('*')
        .eq('lab_order_id', labOrderId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching reagent log:', error);
        return [];
      }
      return (data || []).map((l: any) => ({
        id: l.id,
        labOrderId: l.lab_order_id,
        serviceId: l.service_id,
        itemId: l.item_id,
        storeId: l.store_id,
        quantityDeducted: Number(l.quantity_deducted || 0),
        ledgerRefId: l.ledger_ref_id,
        action: l.action,
        reversedByLogId: l.reversed_by_log_id,
        overrideReason: l.override_reason,
        performedBy: l.performed_by,
        createdAt: l.created_at
      }));
    } catch (err: any) {
      console.error('Exception in fetchReagentConsumptionLog:', err);
      return [];
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

  // ─── LOYALTY FUNCTIONS ───────────────────────────────────

  // 1. Enroll or fetch loyalty account
  const enrollOrFetchLoyaltyAccount = async (
    mobile: string,
    name: string,
    patientId?: string
  ): Promise<LoyaltyAccountLookupResult | null> => {
    if (!requireDb()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('enroll_or_fetch_loyalty_account', {
        p_mobile:     mobile,
        p_name:       name,
        p_patient_id: patientId || null,
        p_created_by: user?.username || user?.email || 'staff'
      });
      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      return {
        accountId: data.account_id,
        accountNo: data.account_no,
        patientName: data.patient_name,
        mobile: data.mobile,
        currentTier: data.current_tier,
        earnMultiplier: Number(data.earn_multiplier || 1.0),
        currentPoints: Number(data.current_points || 0),
        lifetimePoints: Number(data.lifetime_points || 0),
        pointValue: Number(data.point_value || 1.0),
        accountStatus: data.account_status,
        isNewAccount: Boolean(data.is_new_account),
        welcomePoints: Number(data.welcome_points || 0)
      };
    } catch (err) {
      console.error('Loyalty lookup failed:', err);
      return null;
    }
  };

  // 2. Calculate redemption rules
  const calculateLoyaltyRedemption = async (
    accountId: string,
    billAmount: number
  ): Promise<LoyaltyRedemptionCalc | null> => {
    if (!requireDb()) return null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('calculate_loyalty_redemption', {
        p_account_id:  accountId,
        p_bill_amount: billAmount
      });
      if (error) throw error;
      return {
        eligible: Boolean(data.eligible),
        reason: data.reason || undefined,
        currentPoints: Number(data.current_points || 0),
        maxRedeemable: Number(data.max_redeemable || 0),
        maxByPct: Number(data.max_by_pct || 0),
        maxAbsolute: Number(data.max_absolute || 0),
        pointValue: Number(data.point_value || 1.0),
        discountValue: Number(data.discount_value || 0)
      };
    } catch (err) {
      console.error('Loyalty redemption calc failed:', err);
      return null;
    }
  };

  // 3. Process transaction (earn / redeem points)
  const processLoyaltyTransaction = async (
    accountId:      string,
    billNo:         string,
    billAmount:     number,
    cashPaid:       number,
    pointsRedeemed: number
  ): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('process_loyalty_transaction', {
        p_account_id:       accountId,
        p_bill_no:          billNo,
        p_bill_amount:      billAmount,
        p_cash_paid:        cashPaid,
        p_points_redeemed:  pointsRedeemed,
        p_created_by:       user?.username || user?.email || 'staff'
      });
      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err) {
      console.error('Loyalty transaction failed:', err);
      return false;
    }
  };

  // 4. Reverse loyalty transaction on bill cancellation
  const reverseLoyaltyTransaction = async (billNo: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('reverse_loyalty_transaction', {
        p_bill_no:    billNo,
        p_created_by: user?.username || user?.email || 'staff'
      });
      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err) {
      console.error('Loyalty reversal failed:', err);
      return false;
    }
  };

  // 5. Manual adjust points
  const manualLoyaltyAdjustment = async (
    accountId: string,
    type:      'ADJUST_ADD' | 'ADJUST_SUB',
    points:    number,
    reason:    string
  ): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('manual_points_adjustment', {
        p_account_id: accountId,
        p_type:       type,
        p_points:     points,
        p_reason:     reason,
        p_created_by: user?.username || user?.email || 'staff'
      });
      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      showToast('success', 'Points adjusted successfully.');
      return true;
    } catch (err: any) {
      console.error('Manual adjustment failed:', err);
      showToast('error', `Adjustment failed: ${err.message}`);
      return false;
    }
  };

  // 6. Save Loyalty Program Config
  const saveLoyaltyProgramConfig = async (config: LoyaltyProgramConfig): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbConfig = {
        program_name: config.programName,
        program_status: config.programStatus,
        point_value: Number(config.pointValue || 1.00),
        earn_rate: Number(config.earnRate || 1.00),
        min_bill_to_earn: Number(config.minBillToEarn || 0.00),
        points_rounding: config.pointsRounding,
        expiry_days: Number(config.expiryDays || 365),
        expiry_type: config.expiryType,
        expiry_warning_days: Number(config.expiryWarningDays || 30),
        sms_enabled: Boolean(config.smsEnabled),
        sms_on_earn: Boolean(config.smsOnEarn),
        sms_on_redeem: Boolean(config.smsOnRedeem),
        sms_on_expiry_warning: Boolean(config.smsOnExpiryWarning),
        auto_enroll: Boolean(config.autoEnroll),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('loyalty_program_config')
        .upsert({
          ...(config.id ? { id: config.id } : {}),
          ...dbConfig
        });

      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      showToast('success', 'Loyalty config saved successfully.');
      return true;
    } catch (err: any) {
      console.error('Save loyalty config failed:', err);
      showToast('error', `Save failed: ${err.message}`);
      return false;
    }
  };

  // 7. Save Loyalty Tier
  const saveLoyaltyTier = async (tier: LoyaltyTier): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbTier = {
        min_lifetime_points: Number(tier.minLifetimePoints || 0),
        earn_multiplier: Number(tier.earnMultiplier || 1.00),
        downgrade_days: tier.downgradeDays ? Number(tier.downgradeDays) : null,
        birthday_bonus_points: Number(tier.birthdayBonusPoints || 0),
        welcome_bonus_points: Number(tier.welcomeBonusPoints || 0),
        is_active: Boolean(tier.isActive)
      };

      const { error } = await supabase
        .from('loyalty_tiers')
        .upsert({
          ...(tier.id ? { id: tier.id } : {}),
          tier_name: tier.tierName,
          ...dbTier
        });

      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      showToast('success', `${tier.tierName} tier saved successfully.`);
      return true;
    } catch (err: any) {
      console.error('Save loyalty tier failed:', err);
      showToast('error', `Save failed: ${err.message}`);
      return false;
    }
  };

  // 8. Save Loyalty Redemption Rules
  const saveLoyaltyRedemptionRules = async (rules: LoyaltyRedemptionRules): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbRules = {
        min_points_to_redeem: Number(rules.minPointsToRedeem || 0),
        max_redemption_pct: Number(rules.maxRedemptionPct || 0),
        max_points_per_bill: Number(rules.maxPointsPerBill || 0),
        partial_redemption: Boolean(rules.partialRedemption),
        block_on_discounted_bill: Boolean(rules.blockOnDiscountedBill),
        exclude_gst_from_redeem: Boolean(rules.excludeGstFromRedeem),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('loyalty_redemption_rules')
        .upsert({
          ...(rules.id ? { id: rules.id } : {}),
          ...dbRules
        });

      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      showToast('success', 'Redemption rules saved successfully.');
      return true;
    } catch (err: any) {
      console.error('Save redemption rules failed:', err);
      showToast('error', `Save failed: ${err.message}`);
      return false;
    }
  };

  // 9. Save Loyalty Bonus Rule
  const saveLoyaltyBonusRule = async (rule: LoyaltyBonusRule): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbRule = {
        points_awarded: rule.pointsAwarded ? Number(rule.pointsAwarded) : null,
        earn_multiplier: Number(rule.earnMultiplier || 1.00),
        trigger_condition: rule.triggerCondition || '',
        valid_from: rule.validFrom || null,
        valid_to: rule.validTo || null,
        is_active: Boolean(rule.isActive),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('loyalty_bonus_rules')
        .upsert({
          ...(rule.id ? { id: rule.id } : {}),
          bonus_type: rule.bonusType,
          ...dbRule
        });

      if (error) throw error;
      setRefreshTrigger(prev => prev + 1);
      showToast('success', 'Bonus rule saved successfully.');
      return true;
    } catch (err: any) {
      console.error('Save bonus rule failed:', err);
      showToast('error', `Save failed: ${err.message}`);
      return false;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHARMACY LOCATION HIERARCHY — CRUD functions
  // ─────────────────────────────────────────────────────────────────────────

  const savePharmacyZone = async (zone: Omit<PharmacyZone, 'id'> & { id?: string }): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbZone = {
        store_id:    zone.storeId,
        zone_code:   zone.zoneCode.toUpperCase().trim(),
        zone_name:   zone.zoneName.trim(),
        temperature: zone.temperature,
        description: zone.description ?? null,
        is_active:   zone.isActive
      };
      const { data, error } = await supabase
        .from('pharmacy_zones')
        .upsert({ ...(zone.id ? { id: zone.id } : {}), ...dbZone }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      const saved: PharmacyZone = {
        id: data.id, storeId: data.store_id, zoneCode: data.zone_code,
        zoneName: data.zone_name, temperature: data.temperature,
        description: data.description, isActive: data.is_active
      };
      setPharmacyZones(prev => zone.id
        ? prev.map(z => z.id === zone.id ? saved : z)
        : [...prev, saved]
      );
      showToast('success', `Zone ${saved.zoneCode} saved.`);
      return true;
    } catch (err: any) {
      console.error('savePharmacyZone failed:', err);
      showToast('error', `Failed to save zone: ${err.message}`);
      return false;
    }
  };

  const deletePharmacyZone = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const { error } = await getSupabase().from('pharmacy_zones').delete().eq('id', id);
      if (error) throw error;
      setPharmacyZones(prev => prev.filter(z => z.id !== id));
      showToast('success', 'Zone deleted.');
      return true;
    } catch (err: any) {
      console.error('deletePharmacyZone failed:', err);
      showToast('error', `Delete failed: ${err.message}`);
      return false;
    }
  };

  const savePharmacyRack = async (rack: Omit<PharmacyRack, 'id'> & { id?: string }): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbRack = {
        zone_id:      rack.zoneId,
        rack_code:    rack.rackCode.toUpperCase().trim(),
        rack_name:    rack.rackName?.trim() ?? null,
        no_of_shelves: Number(rack.noOfShelves),
        is_active:    rack.isActive
      };
      const { data, error } = await supabase
        .from('pharmacy_racks')
        .upsert({ ...(rack.id ? { id: rack.id } : {}), ...dbRack }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      const saved: PharmacyRack = {
        id: data.id, zoneId: data.zone_id, rackCode: data.rack_code,
        rackName: data.rack_name, noOfShelves: data.no_of_shelves, isActive: data.is_active
      };
      setPharmacyRacks(prev => rack.id
        ? prev.map(r => r.id === rack.id ? saved : r)
        : [...prev, saved]
      );
      showToast('success', `Rack ${saved.rackCode} saved.`);
      return true;
    } catch (err: any) {
      console.error('savePharmacyRack failed:', err);
      showToast('error', `Failed to save rack: ${err.message}`);
      return false;
    }
  };

  const deletePharmacyRack = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const { error } = await getSupabase().from('pharmacy_racks').delete().eq('id', id);
      if (error) throw error;
      setPharmacyRacks(prev => prev.filter(r => r.id !== id));
      showToast('success', 'Rack deleted.');
      return true;
    } catch (err: any) {
      console.error('deletePharmacyRack failed:', err);
      showToast('error', `Delete failed: ${err.message}`);
      return false;
    }
  };

  const saveBatchLocation = async (loc: InventoryBatchLocation): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const dbLoc = {
        store_id:   loc.storeId,
        item_id:    loc.itemId,
        batch_no:   loc.batchNo,
        zone_id:    loc.zoneId,
        rack_id:    loc.rackId,
        shelf_no:   Number(loc.shelfNo),
        bin_no:     loc.binNo.trim(),
        is_primary: Boolean(loc.isPrimary),
        notes:      loc.notes ?? null,
        created_by: loc.createdBy ?? null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('inventory_batch_locations')
        .upsert({ ...(loc.id ? { id: loc.id } : {}), ...dbLoc });
      if (error) throw error;
      showToast('success', 'Batch location saved.');
      return true;
    } catch (err: any) {
      console.error('saveBatchLocation failed:', err);
      showToast('error', `Failed to save location: ${err.message}`);
      return false;
    }
  };

  const deleteBatchLocation = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const { error } = await getSupabase().from('inventory_batch_locations').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Batch location removed.');
      return true;
    } catch (err: any) {
      console.error('deleteBatchLocation failed:', err);
      showToast('error', `Delete failed: ${err.message}`);
      return false;
    }
  };

  /**
   * Fetch primary location for a specific batch — called on-demand in dispense modals.
   * Returns null if no location has been assigned yet.
   */
  const fetchBatchLocation = async (
    storeId: string, itemId: string, batchNo: string
  ): Promise<InventoryBatchLocation | null> => {
    if (!requireDb()) return null;
    try {
      const { data, error } = await getSupabase()
        .from('vw_batch_locations')
        .select('*')
        .eq('store_id', storeId)
        .eq('item_id', itemId)
        .eq('batch_no', batchNo)
        .eq('is_primary', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id, storeId: data.store_id, itemId: data.item_id,
        batchNo: data.batch_no, zoneId: data.zone_id, rackId: data.rack_id,
        shelfNo: data.shelf_no, binNo: data.bin_no, isPrimary: data.is_primary,
        notes: data.notes, createdBy: data.created_by,
        zoneCode: data.zone_code, zoneName: data.zone_name, temperature: data.temperature,
        rackCode: data.rack_code, rackName: data.rack_name,
        itemName: data.item_name, itemCode: data.item_code,
        locationDisplay: data.location_display, locationCode: data.location_code
      };
    } catch (err: any) {
      console.error('fetchBatchLocation failed:', err);
      return null;
    }
  };

  /**
   * Fetch all batch locations for the master screen — with optional search.
   */
  const fetchStoreBatchLocations = async (
    storeId: string, searchTerm?: string
  ): Promise<InventoryBatchLocation[]> => {
    if (!requireDb()) return [];
    try {
      let query = getSupabase()
        .from('vw_batch_locations')
        .select('*')
        .eq('store_id', storeId)
        .order('zone_code')
        .order('rack_code')
        .order('shelf_no')
        .order('bin_no');
      if (searchTerm && searchTerm.trim()) {
        const s = `%${searchTerm.trim()}%`;
        query = query.or(
          `item_name.ilike.${s},item_code.ilike.${s},batch_no.ilike.${s},location_code.ilike.${s}`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id, storeId: d.store_id, itemId: d.item_id,
        batchNo: d.batch_no, zoneId: d.zone_id, rackId: d.rack_id,
        shelfNo: d.shelf_no, binNo: d.bin_no, isPrimary: d.is_primary,
        notes: d.notes, createdBy: d.created_by,
        zoneCode: d.zone_code, zoneName: d.zone_name, temperature: d.temperature,
        rackCode: d.rack_code, rackName: d.rack_name,
        itemName: d.item_name, itemCode: d.item_code,
        locationDisplay: d.location_display, locationCode: d.location_code
      }));
    } catch (err: any) {
      console.error('fetchStoreBatchLocations failed:', err);
      return [];
    }
  };

  const processPharmacyReturn = async (
      originalBillId: string, 
      storeId: string, 
      returns: Array<{ itemId: string, batchNo: string, qty: number, rate: number, description: string, taxPercentage?: number, itemType?: string }>,
      reason?: string
  ): Promise<{ success: boolean; invoiceId?: string }> => {
    if (!requireDb()) return { success: false };
    try {
      console.log(`Starting RPC return for Bill: ${originalBillId} in Store: ${storeId}`);
      const supabase = getSupabase();
      
      const { data, error } = await supabase.rpc('process_pharmacy_return', {
        p_original_bill_id: originalBillId,
        p_return_items: returns.map(item => ({
          item_id:        item.itemId,
          quantity:       Number(item.qty),
          unit_price:     Number(item.rate),
          batch_no:       item.batchNo,
          tax_percentage: Number(item.taxPercentage || 0),
          description:    item.description || ''
        })),
        p_store_id:   storeId,
        p_reason:     reason || 'Medication Return',
        p_created_by: user?.username || user?.email || 'admin'
      });

      if (error) throw error;

      // Force refresh of local context state
      setRefreshTrigger(prev => prev + 1);

      return { success: true, invoiceId: data.return_id };
    } catch (err: any) {
      console.error("Return processing failed:", err);
      showToast('error', `Return failed: ${err.message}`);
      return { success: false };
    }
  };

  const processPatientRefund = async (
      patientId: string,
      itemsList: Array<{ type: 'Return' | 'ServiceInvoice'; id: string; amount: number }>,
      totalAmount: number,
      remarks: string
  ): Promise<{ success: boolean; refundNo?: string }> => {
      if (!requireDb()) return { success: false };
      try {
          const supabase = getSupabase();
          const returnIds = itemsList.filter(item => item.type === 'Return').map(item => item.id);
          const billIds = itemsList.filter(item => item.type === 'ServiceInvoice').map(item => item.id);

          const { data, error } = await supabase.rpc('process_patient_refund', {
              p_patient_id:    patientId,
              p_return_ids:    returnIds,
              p_bill_ids:      billIds,
              p_refund_method: 'Cash',
              p_remarks:       remarks || 'Cash Refund',
              p_created_by:    user?.username || user?.email || 'admin'
          });

          if (error) throw error;

          // Force refresh of local context state
          setRefreshTrigger(prev => prev + 1);

          return { success: true, refundNo: data.ref_no };
      } catch (err: any) {
          console.error("Refund processing failed:", err);
          showToast('error', `Refund failed: ${err.message}`);
          return { success: false };
      }
  };

  const fetchBillItems = async (billId: string): Promise<Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number; itemId?: string; batchNo?: string; returnedQty: number; taxPercentage: number; taxAmount: number; itemType?: string; }>> => {
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
          taxAmount: Number(i.tax_amount || 0),
          itemType: i.item_type || 'EACH'
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
          taxAmount: 0,
          itemType: i.units || 'EACH'
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
    setTaxMasters(prev => {
        const index = prev.findIndex(t => t.id === tax.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = tax;
            return updated;
        }
        return [tax, ...prev];
    });
    if (isDbConnected && checkConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('tax_masters').upsert(mapTaxMasterToDb(tax));
      if (error) {
          showToast('error', `Tax save failed: ${error.message}`);
          setRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const deleteTaxMaster = async (id: string) => {
    setTaxMasters(prev => prev.filter(t => t.id !== id));
    if (isDbConnected && checkConfigured()) {
      const { error } = await getSupabase().from('tax_masters').delete().eq('id', id);
      if (error) {
          showToast('error', 'Tax deletion failed.');
          setRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const setSelectedCurrency = (code: string) => {
    setSelectedCurrencyState(code);
    localStorage.setItem('medicore_selected_currency', code);
    showToast('info', `Active currency set to ${code}`);
  };

  const saveCurrency = async (curr: Currency): Promise<boolean> => {
    setCurrencies(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(c => c.id === curr.id || c.code === curr.code);
      if (idx > -1) {
        updated[idx] = curr;
      } else {
        updated.push(curr);
      }
      localStorage.setItem('medicore_currencies', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected && checkConfigured()) {
      try {
        const { error } = await getSupabase()
          .from('currency_master')
          .upsert(mapCurrencyToDb(curr));
        if (error) throw error;
      } catch (err: any) {
        console.error('Error saving currency to DB:', err);
        showToast('error', `DB Error saving currency: ${err.message}`);
        return false;
      }
    }
    showToast('success', `Currency ${curr.code} saved.`);
    return true;
  };

  const deleteCurrency = async (id: string): Promise<boolean> => {
    setCurrencies(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('medicore_currencies', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected && checkConfigured()) {
      try {
        const { error } = await getSupabase()
          .from('currency_master')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        console.error('Error deleting currency from DB:', err);
        showToast('error', `DB Error deleting currency: ${err.message}`);
        return false;
      }
    }
    showToast('info', 'Currency deleted.');
    return true;
  };

  const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0.00';
    const symbol = getCurrencySymbol(selectedCurrency);
    const decimals = selectedCurrency === 'BHD' ? 3 : 2;
    return `${symbol} ${num.toFixed(decimals)}`;
  };

  const saveItemTaxMapping = async (mapping: ItemTaxMapping) => {
    setItemTaxMappings(prev => {
        const index = prev.findIndex(m => m.id === mapping.id);
        if (index > -1) {
            const updated = [...prev];
            updated[index] = mapping;
            return updated;
        }
        return [mapping, ...prev];
    });
    if (isDbConnected && checkConfigured()) {
      const { error } = await getSupabase().from('item_tax_mappings').upsert(mapItemTaxMappingToDb(mapping));
      if (error) {
          showToast('error', `Mapping failed: ${error.message}`);
          setRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const deleteItemTaxMapping = async (id: string) => {
    setItemTaxMappings(prev => prev.filter(m => m.id !== id));
    if (isDbConnected && checkConfigured()) {
      const { error } = await getSupabase().from('item_tax_mappings').delete().eq('id', id);
      if (error) {
          showToast('error', 'Failed to remove mapping.');
          setRefreshTrigger(prev => prev + 1);
      }
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

  const saveChartOfAccount = async (coa: ChartOfAccount): Promise<boolean> => {
    let isSuccess = true;
    setChartOfAccounts(prev => {
      const index = prev.findIndex(c => c.id === coa.id);
      let updated: ChartOfAccount[];
      if (index > -1) {
        updated = [...prev];
        updated[index] = coa;
      } else {
        updated = [coa, ...prev];
      }
      localStorage.setItem('medicore_chart_of_accounts', JSON.stringify(updated));
      return updated;
    });

    if (checkConfigured()) {
      try {
        const dbCOA = mapChartOfAccountToDb(coa);
        const { error } = await getSupabase().from('finance_chart_of_accounts').upsert(dbCOA);
        if (error) {
          console.error("Error saving chart of account:", error.message);
          showToast('error', `Database error: ${error.message}`);
          isSuccess = false;
        }
      } catch (err: any) {
        console.error("Exception saving chart of account:", err.message);
        isSuccess = false;
      }
    }
    return isSuccess;
  };

  const deleteChartOfAccount = async (id: string): Promise<boolean> => {
    let isSuccess = true;
    setChartOfAccounts(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('medicore_chart_of_accounts', JSON.stringify(updated));
      return updated;
    });

    if (checkConfigured()) {
      try {
        const { error } = await getSupabase().from('finance_chart_of_accounts').delete().eq('id', id);
        if (error) {
          console.error("Error deleting chart of account:", error.message);
          showToast('error', `Database error: ${error.message}`);
          isSuccess = false;
        }
      } catch (err: any) {
        console.error("Exception deleting chart of account:", err.message);
        isSuccess = false;
      }
    }
    return isSuccess;
  };

  const saveJournalVoucher = async (jv: JournalVoucher): Promise<boolean> => {
    let isSuccess = true;
    setJournalVouchers(prev => {
      const index = prev.findIndex(v => v.id === jv.id);
      let updated: JournalVoucher[];
      if (index > -1) {
        updated = [...prev];
        updated[index] = jv;
      } else {
        updated = [jv, ...prev];
      }
      localStorage.setItem('medicore_journal_vouchers', JSON.stringify(updated));
      return updated;
    });

    if (checkConfigured()) {
      try {
        const supabase = getSupabase();
        const dbJV = mapJournalVoucherToDb(jv);
        const { error: hdrError } = await supabase.from('finance_journal_vouchers').upsert(dbJV);
        if (hdrError) {
          console.error("Error saving journal voucher:", hdrError.message);
          showToast('error', `Database error: ${hdrError.message}`);
          isSuccess = false;
        } else if (jv.items) {
          // Delete existing items for this voucher
          await supabase.from('finance_journal_voucher_items').delete().eq('voucher_id', jv.id);
          
          if (jv.items.length > 0) {
            const dbItems = jv.items.map(item => mapJournalVoucherItemToDb(item, jv.id));
            const { error: itemsError } = await supabase.from('finance_journal_voucher_items').insert(dbItems);
            if (itemsError) {
              console.error("Error saving journal voucher items:", itemsError.message);
              showToast('error', `Database error: ${itemsError.message}`);
              isSuccess = false;
            }
          }
        }
      } catch (err: any) {
        console.error("Exception saving journal voucher:", err.message);
        isSuccess = false;
      }
    }
    return isSuccess;
  };

  const deleteJournalVoucher = async (id: string): Promise<boolean> => {
    let isSuccess = true;
    setJournalVouchers(prev => {
      const updated = prev.filter(v => v.id !== id);
      localStorage.setItem('medicore_journal_vouchers', JSON.stringify(updated));
      return updated;
    });

    if (checkConfigured()) {
      try {
        const { error } = await getSupabase().from('finance_journal_vouchers').delete().eq('id', id);
        if (error) {
          console.error("Error deleting journal voucher:", error.message);
          showToast('error', `Database error: ${error.message}`);
          isSuccess = false;
        }
      } catch (err: any) {
        console.error("Exception deleting journal voucher:", err.message);
        isSuccess = false;
      }
    }
    return isSuccess;
  };

  const postAutoJournalVoucher = async (
    type: 'GRN' | 'PHARMACY_SALE' | 'OP_DISPENSE',
    refDocId: string,
    refDocNo: string,
    amountDetails: {
      net: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      tax?: number;
      gross?: number;
      partyName?: string;
      description?: string;
      paymentMode?: string;
    }
  ): Promise<boolean> => {
    // Generate sequential voucher number JV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const voucherNo = `JV-${dateStr}-${randSuffix}`;
    const voucherId = crypto.randomUUID();

    const items: JournalVoucherItem[] = [];

    const getAccountByCode = (code: string) => {
      return chartOfAccounts.find(a => a.code === code);
    };

    if (type === 'GRN') {
      const medicinePurchaseAcc = getAccountByCode('510000');
      const inputCgstAcc = getAccountByCode('131000');
      const inputSgstAcc = getAccountByCode('132000');
      const inputIgstAcc = getAccountByCode('135000');
      const accountsPayableAcc = getAccountByCode('210000');

      const igst = amountDetails.igst ?? 0;
      const isInterstate = igst > 0;

      const cgst = isInterstate ? 0 : (amountDetails.cgst ?? Number(((amountDetails.tax || 0) / 2).toFixed(2)));
      const sgst = isInterstate ? 0 : (amountDetails.sgst ?? Number(((amountDetails.tax || 0) / 2).toFixed(2)));
      const taxTotal = isInterstate ? igst : (cgst + sgst);
      const gross = amountDetails.gross ?? Number((amountDetails.net - taxTotal).toFixed(2));
      const net = amountDetails.net;

      if (medicinePurchaseAcc && gross > 0) {
        items.push({
          id: crypto.randomUUID(),
          accountId: medicinePurchaseAcc.id,
          postingNature: 'Debit',
          amount: gross,
          description: `Medicine purchase costs for ${refDocNo}`
        });
      }

      if (isInterstate) {
        if (inputIgstAcc && igst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: inputIgstAcc.id,
            postingNature: 'Debit',
            amount: igst,
            description: `Provisional Input IGST paid for ${refDocNo}`
          });
        }
      } else {
        if (inputCgstAcc && cgst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: inputCgstAcc.id,
            postingNature: 'Debit',
            amount: cgst,
            description: `Provisional Input CGST paid for ${refDocNo}`
          });
        }
        if (inputSgstAcc && sgst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: inputSgstAcc.id,
            postingNature: 'Debit',
            amount: sgst,
            description: `Provisional Input SGST paid for ${refDocNo}`
          });
        }
      }

      if (accountsPayableAcc && net > 0) {
        items.push({
          id: crypto.randomUUID(),
          accountId: accountsPayableAcc.id,
          postingNature: 'Credit',
          amount: net,
          description: `Payable to Vendor: ${amountDetails.partyName || 'Vendor'} for ${refDocNo}`
        });
      }
    } else if (type === 'PHARMACY_SALE' || type === 'OP_DISPENSE') {
      const isDigital = amountDetails.paymentMode === 'Card' || amountDetails.paymentMode === 'UPI' || amountDetails.paymentMode === 'Online';
      const paymentAcc = isDigital ? getAccountByCode('112000') : getAccountByCode('111000');
      const salesRevenueAcc = getAccountByCode('410000');
      const outputCgstAcc = getAccountByCode('221000');
      const outputSgstAcc = getAccountByCode('222000');
      const outputIgstAcc = getAccountByCode('223000');

      const igst = amountDetails.igst ?? 0;
      const isInterstate = igst > 0;

      const cgst = isInterstate ? 0 : (amountDetails.cgst ?? Number(((amountDetails.tax || 0) / 2).toFixed(2)));
      const sgst = isInterstate ? 0 : (amountDetails.sgst ?? Number(((amountDetails.tax || 0) / 2).toFixed(2)));
      const taxTotal = isInterstate ? igst : (cgst + sgst);
      const gross = amountDetails.gross ?? Number((amountDetails.net - taxTotal).toFixed(2));
      const net = amountDetails.net;

      if (paymentAcc && net > 0) {
        items.push({
          id: crypto.randomUUID(),
          accountId: paymentAcc.id,
          postingNature: 'Debit',
          amount: net,
          description: `${amountDetails.paymentMode || 'Cash'} collections for ${type} ${refDocNo}`
        });
      }

      if (salesRevenueAcc && gross > 0) {
        items.push({
          id: crypto.randomUUID(),
          accountId: salesRevenueAcc.id,
          postingNature: 'Credit',
          amount: gross,
          description: `Pharmacy Sales Revenue for ${refDocNo}`
        });
      }

      if (isInterstate) {
        if (outputIgstAcc && igst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: outputIgstAcc.id,
            postingNature: 'Credit',
            amount: igst,
            description: `Output IGST liability collected for ${refDocNo}`
          });
        }
      } else {
        if (outputCgstAcc && cgst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: outputCgstAcc.id,
            postingNature: 'Credit',
            amount: cgst,
            description: `Output CGST liability collected for ${refDocNo}`
          });
        }
        if (outputSgstAcc && sgst > 0) {
          items.push({
            id: crypto.randomUUID(),
            accountId: outputSgstAcc.id,
            postingNature: 'Credit',
            amount: sgst,
            description: `Output SGST liability collected for ${refDocNo}`
          });
        }
      }
    }

    if (items.length === 0) return false;

    const totalDebit = Number(items.filter(i => i.postingNature === 'Debit').reduce((sum, i) => sum + i.amount, 0).toFixed(2));
    const totalCredit = Number(items.filter(i => i.postingNature === 'Credit').reduce((sum, i) => sum + i.amount, 0).toFixed(2));

    const diff = Number((totalDebit - totalCredit).toFixed(2));
    if (diff !== 0 && items.length > 1) {
      if (diff > 0) {
        const creditLine = items.find(i => i.postingNature === 'Credit');
        if (creditLine) creditLine.amount = Number((creditLine.amount + diff).toFixed(2));
      } else {
        const debitLine = items.find(i => i.postingNature === 'Debit');
        if (debitLine) debitLine.amount = Number((debitLine.amount + Math.abs(diff)).toFixed(2));
      }
    }

    const finalDebit = Number(items.filter(i => i.postingNature === 'Debit').reduce((sum, i) => sum + i.amount, 0).toFixed(2));
    const finalCredit = Number(items.filter(i => i.postingNature === 'Credit').reduce((sum, i) => sum + i.amount, 0).toFixed(2));

    const jv: JournalVoucher = {
      id: voucherId,
      voucherNo,
      voucherDate: new Date().toISOString().split('T')[0],
      refType: type,
      refDocId,
      refDocNo,
      narration: amountDetails.description || `${type} Auto Posting for ${refDocNo}`,
      totalDebit: finalDebit,
      totalCredit: finalCredit,
      status: 'Posted',
      items
    };

    return await saveJournalVoucher(jv);
  };

  const checkAndAutoRaisePO = async (storeId: string, itemId: string, newBalance: number, forcedItem?: InventoryItem) => {
    if (!requireDb()) return;
    try {
      const supabase = getSupabase();
      
      // 1. Fetch item (from forcedItem or state)
      const item = forcedItem || inventoryItems.find(i => i.id === itemId);
      if (!item || !item.stock) return;
      
      const reservedQty = Number(item.stock.reservedQty || 0);
      if (reservedQty <= 0) return; // Trigger is only active if reservedQty is set (> 0)
      
      // 2. Check if new balance has reached or is below reserved quantity level
      if (newBalance > reservedQty) return; 
      
      // 3. Prevent duplicate PO generation: check if there's already a Draft PO with this item for this store
      const draftPOExists = purchaseOrders.some(po => 
        po.storeId === storeId && 
        po.status === 'Draft' && 
        po.items?.some(pi => pi.itemId === itemId)
      );
      if (draftPOExists) {
        console.log(`[Auto-PO Trigger] Draft PO already exists for item "${item.itemName}" in store "${storeId}". Skipping creation.`);
        return;
      }
      
      // 4. Find the last vendor this item was received from
      // We query procurement_grn_items and join procurement_grns
      const { data: grnItemData, error: grnError } = await supabase
        .from('procurement_grn_items')
        .select(`
          grn_id,
          procurement_grns!inner (
            id,
            vendor_id,
            status
          )
        `)
        .eq('item_id', itemId)
        .eq('procurement_grns.status', 'Submitted')
        .order('created_at', { ascending: false })
        .limit(1);

      let vendorId = '';
      if (!grnError && grnItemData && grnItemData.length > 0) {
        const grnRow = grnItemData[0].procurement_grns as any;
        if (grnRow) {
          vendorId = grnRow.vendor_id;
        }
      }
      
      // Fallback: If no GRN exists, use the first vendor from the list
      if (!vendorId && vendors.length > 0) {
        vendorId = vendors[0].id;
      }
      
      if (!vendorId) {
        console.warn(`[Auto-PO Trigger] Could not resolve a vendor for auto PO for item "${item.itemName}".`);
        return;
      }
      
      // 5. Build and save the Draft Purchase Order
      const poId = crypto.randomUUID();
      const poNo = `AUTO-PO-${Date.now().toString().slice(-8)}`;
      const costRate = Number(item.stock.itemRate || 10);
      
      // Order standard quantity: 10 times the reserved quantity or minimum 50
      const reorderQty = Math.max(50, reservedQty * 10);
      const lineCost = reorderQty * costRate;
      
      // Resolve tax for the item: if item is not mapped to a tax, no tax is calculated
      const taxMapping = itemTaxMappings.find(m => m.itemId === itemId);
      const activeTax = taxMapping ? taxMasters.find(t => t.id === taxMapping.taxId && t.status === 'Active') : null;
      const vatPct = activeTax ? Number(activeTax.percentage ?? 0) : 0;
      const taxStructure = activeTax ? `${activeTax.taxName} (${activeTax.percentage}%)` : '';
      
      const lineVat = lineCost * (vatPct / 100);
      const totalAmount = lineCost + lineVat;
 
      const autoPO: PurchaseOrder = {
        id: poId,
        poNo: poNo,
        poType: 'Direct Purchase Order',
        vendorId: vendorId,
        storeId: storeId,
        purchaseOrganisation: 'Pharmacy',
        currencyCode: 'Saudi Riyal',
        currencyExchangeRate: 1.0,
        isNonStock: false,
        netAmount: Number(totalAmount.toFixed(2)),
        status: 'Draft',
        items: [{
          id: crypto.randomUUID(),
          poId: poId,
          itemId: itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: reorderQty,
          unitCost: costRate,
          isBulk: false,
          taxStructure: taxStructure,
          remarks: `Auto PO: Stock reached reserve limit of ${reservedQty} (Current: ${newBalance})`
        }],
        createdAt: new Date().toISOString()
      };
      
      // Insert in database & state
      const success = await savePurchaseOrder(autoPO);
      if (success) {
        showToast('info', `[Trigger Alert] Draft PO ${poNo} raised dynamically for item "${item.itemName}" with last vendor (Stock: ${newBalance} <= Reserve: ${reservedQty}).`);
      }
    } catch (err: any) {
      console.error("[Auto-PO Trigger Error]", err);
    }
  };

  const fetchExpiryItems = async (storeId: string, noOfDays: number) => {
    if (!requireDb()) return [];
    try {
      const supabase = getSupabase();
      
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('inventory_stock_ledger')
        .select('item_id, batch_no, stock_in_quantity, stock_out_quantity, expiry_date, closing_stock_rate')
        .eq('store_id', storeId);
 
      if (ledgerError) throw ledgerError;
      if (!ledgerData || ledgerData.length === 0) return [];
 
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + noOfDays);
      cutoffDate.setHours(23, 59, 59, 999);
 
      const stockMap = new Map<string, { itemId: string; batchNo: string; currentStock: number; expiryDate?: string; ledgerRate?: number }>();
 
      ledgerData.forEach(row => {
        const itemId = row.item_id;
        const batchNo = (row.batch_no || '').trim().toUpperCase();
        if (!itemId || !batchNo) return;
 
        const key = `${itemId}-${batchNo}`;
        const existing = stockMap.get(key) || { itemId, batchNo, currentStock: 0, expiryDate: row.expiry_date, ledgerRate: 0 };
        existing.currentStock += Number(row.stock_in_quantity || 0) - Number(row.stock_out_quantity || 0);
        if (row.expiry_date) existing.expiryDate = row.expiry_date;
        if (Number(row.closing_stock_rate || 0) > 0) {
          existing.ledgerRate = Number(row.closing_stock_rate);
        }
        stockMap.set(key, existing);
      });
 
      const candidates = Array.from(stockMap.values()).filter(c => {
        if (c.currentStock <= 0) return false;
        if (!c.expiryDate) return false;
        const exp = new Date(c.expiryDate);
        return exp <= cutoffDate;
      });
 
      if (candidates.length === 0) return [];
 
      const itemIds = Array.from(new Set(candidates.map(c => c.itemId)));
      
      const { data: itemsData } = await supabase
        .from('inventory_items')
        .select('id, item_code, item_name')
        .in('id', itemIds);
 
      const { data: openingData } = await supabase
        .from('inventory_opening_stock_items')
        .select('item_id, batch_no, mrp, rate')
        .in('item_id', itemIds);
 
      const itemsMap = new Map(itemsData?.map(i => [i.id, i]));
      
      const rateMap = new Map<string, { mrp: number; rate: number }>();
      openingData?.forEach(o => {
        const key = `${o.item_id}-${(o.batch_no || '').trim().toUpperCase()}`;
        rateMap.set(key, { mrp: Number(o.mrp || 0), rate: Number(o.rate || 0) });
      });
 
      return candidates.map(c => {
        const itemInfo = itemsMap.get(c.itemId);
        
        // 1. Try opening stock batch rate first
        const rateInfo = rateMap.get(`${c.itemId}-${c.batchNo}`);
        let rate = rateInfo ? (rateInfo.mrp > 0 ? rateInfo.mrp : rateInfo.rate) : 0;
        
        // 2. Fallback to latest transaction closing_stock_rate from the ledger
        if (!rate && c.ledgerRate) {
          rate = c.ledgerRate;
        }
        
        // 3. Fallback to standard inventory item cost rate in memory
        if (!rate) {
          const invItem = inventoryItems.find(inv => inv.id === c.itemId);
          rate = invItem?.stock?.itemRate || 0;
        }
 
        return {
          itemId: c.itemId,
          itemCode: itemInfo?.item_code || 'UNK',
          itemName: itemInfo?.item_name || 'Unknown Item',
          batchCode: c.batchNo,
          expiryDate: c.expiryDate,
          currentStock: c.currentStock,
          rate: rate || 0
        };
      });
    } catch (err) {
      console.error('Error fetching expiry items:', err);
      return [];
    }
  };

  const saveExpiryReturn = async (ret: ExpiryReturn): Promise<boolean> => {
    const isAlreadySubmitted = expiryReturns.find(r => r.id === ret.id)?.status === 'Submitted';

    setExpiryReturns(prev => {
      const exists = prev.find(r => r.id === ret.id);
      const updated = exists
        ? prev.map(r => r.id === ret.id ? ret : r)
        : [ret, ...prev];
      localStorage.setItem('medicore_expiry_returns', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const dbRet = mapExpiryReturnToDb(ret);
        const { error } = await supabase.from('procurement_expiry_returns').upsert(dbRet);
        if (error) throw error;

        if (ret.items) {
          await supabase.from('procurement_expiry_return_items').delete().eq('return_id', ret.id);
          if (ret.items.length > 0) {
            const dbItems = ret.items.map(i => ({
              id: i.id || crypto.randomUUID(),
              return_id: ret.id,
              item_id: i.itemId,
              batch_code: i.batchCode,
              expiry_date: i.expiryDate,
              current_stock: i.currentStock,
              quantity: i.quantity,
              rate: i.rate,
              value: i.value,
              remarks: i.remarks || null
            }));
            const { error: ie } = await supabase.from('procurement_expiry_return_items').insert(dbItems);
            if (ie) throw ie;
          }
        }

        // Post STOCKOUT entries to stock ledger on submission
        if (ret.status === 'Submitted' && !isAlreadySubmitted) {
          for (const i of ret.items || []) {
            const qtyOut = Number(i.quantity || 0);
            if (qtyOut <= 0) continue;

            const { quantity: prevQty, rate: prevRate } = await getItemValuation(ret.storeId, i.itemId);
            const newBalance = Math.max(0, prevQty - qtyOut);

            const { error: ledgerError } = await supabase.from('inventory_stock_ledger').insert({
              store_id: ret.storeId,
              item_id: i.itemId,
              transaction_type: 'STOCKOUT',
              ref_type: 'EXPIRY RETURN',
              ref_doc_no: ret.docNo,
              ref_doc_date: ret.docDate,
              stock_in_quantity: 0,
              stock_out_quantity: qtyOut,
              closing_stock: newBalance,
              closing_stock_rate: prevRate,
              closing_stock_value: newBalance * prevRate,
              currency: 'SAR',
              batch_no: (i.batchCode || '').trim().toUpperCase(),
              batch_date: null,
              expiry_date: i.expiryDate
            });
            if (ledgerError) throw ledgerError;
            await checkAndAutoRaisePO(ret.storeId, i.itemId, newBalance);
          }
        }

        showToast('success', ret.status === 'Submitted'
          ? 'Expiry Return submitted! STOCKOUT entries posted.'
          : 'Expiry Return saved!');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        console.error('Error saving expiry return:', err);
        showToast('error', `Failed to save Expiry Return: ${err.message}`);
        return false;
      }
    } else {
      showToast('success', ret.status === 'Submitted'
        ? 'Expiry Return submitted locally.'
        : 'Expiry Return saved locally.');
      return true;
    }
  };

  const deleteExpiryReturn = async (id: string): Promise<boolean> => {
    setExpiryReturns(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('medicore_expiry_returns', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected) {
      const supabase = getSupabase();
      try {
        const { error } = await supabase.from('procurement_expiry_returns').delete().eq('id', id);
        if (error) throw error;
        showToast('info', 'Expiry Return removed from database.');
        setRefreshTrigger(prev => prev + 1);
        return true;
      } catch (err: any) {
        showToast('error', `Failed to delete: ${err.message}`);
        return false;
      }
    } else {
      showToast('info', 'Expiry Return removed locally.');
      return true;
    }
  };

  const saveGstr2bUpload = async (upload: GSTR2BUpload, invoices: GSTR2BInvoice[]): Promise<boolean> => {
    let isSuccess = true;
    
    setGstr2bUploads(prev => {
      const updated = [upload, ...prev.filter(u => u.id !== upload.id)];
      localStorage.setItem('medicore_gstr2b_uploads', JSON.stringify(updated));
      return updated;
    });

    setGstr2bInvoices(prev => {
      const filtered = prev.filter(i => i.uploadId !== upload.id);
      const updated = [...invoices, ...filtered];
      localStorage.setItem('medicore_gstr2b_invoices', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected && checkConfigured()) {
      try {
        const supabase = getSupabase();
        
        const dbUpload = {
          id: upload.id,
          period: upload.period,
          file_name: upload.fileName,
          upload_date: upload.uploadDate || new Date().toISOString(),
          invoices_count: upload.invoicesCount,
          total_itc: upload.totalItc,
          uploaded_by: upload.uploadedBy,
          status: upload.status,
          is_reconciled: upload.isReconciled
        };
        
        const { error: uploadErr } = await supabase.from('procurement_gstr2b_uploads').upsert(dbUpload);
        if (uploadErr) {
          console.error("Database error saving GSTR2B upload:", uploadErr.message);
          isSuccess = false;
        } else if (invoices.length > 0) {
          await supabase.from('procurement_gstr2b_invoices').delete().eq('upload_id', upload.id);
          
          const dbInvoices = invoices.map(i => ({
            id: i.id || crypto.randomUUID(),
            upload_id: upload.id,
            invoice_no: i.invoiceNo,
            invoice_date: i.invoiceDate,
            taxable_value: i.taxableValue,
            tax_amount: i.taxAmount,
            cgst: i.cgst,
            sgst: i.sgst,
            igst: i.igst,
            supplier_name: i.supplierName,
            supplier_gst: i.supplierGst
          }));
          
          const { error: invoicesErr } = await supabase.from('procurement_gstr2b_invoices').insert(dbInvoices);
          if (invoicesErr) {
            console.error("Database error saving GSTR2B invoices:", invoicesErr.message);
            isSuccess = false;
          }
        }
      } catch (err: any) {
        console.error("Exception saving GSTR-2B data to Supabase:", err.message);
        isSuccess = false;
      }
    }
    
    return isSuccess;
  };

  const markUploadReconciled = async (uploadId: string): Promise<boolean> => {
    let isSuccess = true;
    
    setGstr2bUploads(prev => {
      const updated = prev.map(u => u.id === uploadId ? { ...u, isReconciled: true } : u);
      localStorage.setItem('medicore_gstr2b_uploads', JSON.stringify(updated));
      return updated;
    });

    if (isDbConnected && checkConfigured()) {
      try {
        const supabase = getSupabase();
        const { error } = await supabase
          .from('procurement_gstr2b_uploads')
          .update({ is_reconciled: true })
          .eq('id', uploadId);
          
        if (error) {
          console.error("Database error marking GSTR2B reconciled:", error.message);
          isSuccess = false;
        }
      } catch (err: any) {
        console.error("Exception marking GSTR2B reconciled:", err.message);
        isSuccess = false;
      }
    }
    return isSuccess;
  };

  const saveRole = async (role: Role): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('roles')
        .upsert({
          id: role.id || undefined,
          role_code: role.role_code.toUpperCase(),
          role_name: role.role_name,
          description: role.description || null
        }, { onConflict: 'role_code' });

      if (error) throw error;
      showToast('success', `Role ${role.role_name} saved successfully.`);
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error saving role:", err);
      showToast('error', `Failed to save role: ${err.message}`);
      return false;
    }
  };

  const deleteRole = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('info', 'Role deleted.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error deleting role:", err);
      showToast('error', `Failed to delete role: ${err.message}`);
      return false;
    }
  };

  const saveScreen = async (screen: Omit<Screen, 'id'> & { id?: string }): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const payload: any = {
        module: screen.module,
        screen_code: screen.screen_code.trim().toUpperCase(),
        screen_name: screen.screen_name.trim(),
        screen_url: screen.screen_url.trim(),
        display_order: Number(screen.display_order) || 0
      };
      if (screen.id) {
        payload.id = screen.id;
      }
      const { error } = await supabase
        .from('screens')
        .upsert(payload, { onConflict: 'screen_code' });

      if (error) throw error;
      showToast('success', `Screen "${screen.screen_name}" registered successfully.`);
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error saving screen:", err);
      showToast('error', `Failed to register screen: ${err.message}`);
      return false;
    }
  };

  const deleteScreen = async (id: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('screens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('info', 'Screen registration deleted.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error deleting screen:", err);
      showToast('error', `Failed to delete screen registration: ${err.message}`);
      return false;
    }
  };

  const saveRolePrivileges = async (roleId: string, privilegesList: Omit<Privilege, 'screen_code'|'screen_name'|'module'>[]): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      
      // Delete old privileges for this role
      await supabase.from('role_privileges').delete().eq('role_id', roleId);

      if (privilegesList.length > 0) {
        const dbPayload = privilegesList.map(p => ({
          role_id: roleId,
          screen_id: p.screen_id,
          can_view: !!p.can_view,
          can_create: !!p.can_create,
          can_edit: !!p.can_edit,
          can_delete: !!p.can_delete,
          can_export: !!p.can_export
        }));
        const { error } = await supabase.from('role_privileges').insert(dbPayload);
        if (error) throw error;
      }

      showToast('success', 'Role privileges updated.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error saving role privileges:", err);
      showToast('error', `Failed to update privileges: ${err.message}`);
      return false;
    }
  };

  const saveUserOverrides = async (userId: string, overridesList: Omit<Privilege, 'screen_code'|'screen_name'|'module'>[]): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      
      // Delete old overrides
      await supabase.from('user_privilege_overrides').delete().eq('user_id', userId);

      if (overridesList.length > 0) {
        const dbPayload = overridesList.map(o => ({
          user_id: userId,
          screen_id: o.screen_id,
          can_view: !!o.can_view,
          can_create: !!o.can_create,
          can_edit: !!o.can_edit,
          can_delete: !!o.can_delete,
          can_export: !!o.can_export
        }));
        const { error } = await supabase.from('user_privilege_overrides').insert(dbPayload);
        if (error) throw error;
      }

      showToast('success', 'User privilege overrides updated.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error saving user overrides:", err);
      showToast('error', `Failed to update overrides: ${err.message}`);
      return false;
    }
  };

  const updateAppUserRole = async (userId: string, roleId: string | null, isActive: boolean, userCode?: string, mobile?: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      
      // Resolve the matching role row to sync legacy 'role' string field
      let roleName = '';
      if (roleId) {
        const matched = roles.find(r => r.id === roleId);
        if (matched) {
          roleName = matched.role_name;
        }
      }

      const updateData: any = {
        role_id: roleId || null,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };
      if (roleName) {
        updateData.role = roleName; // Keep legacy 'role' column updated in sync
      }
      if (userCode !== undefined) updateData.user_code = userCode;
      if (mobile !== undefined) updateData.mobile = mobile;

      const { error } = await supabase
        .from('app_users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      showToast('success', 'User access permissions updated.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error updating user role/status:", err);
      showToast('error', `Failed to update user: ${err.message}`);
      return false;
    }
  };

  const saveAppUser = async (appUser: Partial<AppUser> & { password?: string }): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      
      let roleName = '';
      if (appUser.role_id) {
        const matched = roles.find(r => r.id === appUser.role_id);
        if (matched) {
          roleName = matched.role_name;
        }
      }

      const payload: any = {
        username: appUser.username,
        full_name: appUser.fullName,
        user_code: appUser.user_code,
        email: appUser.email,
        mobile: appUser.mobile,
        department_id: appUser.department_id || null,
        location_id: appUser.location_id || null,
        role_id: appUser.role_id || null,
        role: roleName || appUser.role || 'User',
        is_active: appUser.is_active !== undefined ? appUser.is_active : true,
        updated_at: new Date().toISOString()
      };

      if (appUser.password) {
        payload.password = appUser.password;
      }

      if (appUser.id) {
        // Edit existing
        const { error } = await supabase
          .from('app_users')
          .update(payload)
          .eq('id', appUser.id);
        if (error) throw error;
        showToast('success', 'User updated successfully.');
      } else {
        // Create new
        payload.id = crypto.randomUUID();
        payload.created_at = new Date().toISOString();
        if (!payload.password) {
          throw new Error("Password is required for new users.");
        }
        const { error } = await supabase
          .from('app_users')
          .insert(payload);
        if (error) throw error;
        showToast('success', 'User created successfully.');
      }
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error saving user:", err);
      showToast('error', `Failed to save user: ${err.message}`);
      return false;
    }
  };

  const deleteAppUser = async (userId: string): Promise<boolean> => {
    if (!requireDb()) return false;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);
      if (error) throw error;
      showToast('success', 'User deleted successfully.');
      setRefreshTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.error("Error deleting user:", err);
      showToast('error', `Failed to delete user: ${err.message}`);
      return false;
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
      serviceLocationMappings, saveServiceLocationMappings,
      dentalICDs, saveDentalICD, uploadDentalICDs, deleteDentalICD,
      availabilities, saveAvailability, deleteAvailability,
      doctorSchedules, scheduleTemplates, setRefreshTrigger,
      appointments, bookAppointment, updateAppointment, cancelAppointment,
      bills, createBill, cancelBill, addPayment,
      vitals, diagnoses, narrativeDiagnoses, clinicalNotes, allergies, patientDocuments,
      saveVitalSign, saveDiagnosis, deleteDiagnosis, saveNarrativeDiagnosis, saveClinicalNote, saveAllergy,
      savePatientDocument, deletePatientDocument,
      serviceOrders, saveServiceOrders, cancelServiceOrder,
      inventoryItems, saveInventoryItem, uploadInventoryItems, branches, saveBranch, deleteBranch,
      stores, saveStore, deleteStore,
      storeItemMappings, saveStoreItemMapping, deleteStoreItemMapping,
      reagentsMapping, fetchReagentMappings, saveReagentMapping, deleteReagentMapping, fetchReagentConsumptionLog,
      openingStocks, saveOpeningStock, fetchStockLedger, fetchDashboardMetrics,
      saveDirectSale, fetchDirectSales, fetchBatchDetails, fetchAlternates, logSubstitutions, repairPh000006, processPharmacyReturn, fetchBillItems,
      prescriptions, savePrescription, dispensePrescription,
      drugGenerics, drugMasters, saveDrugMaster, deleteDrugMaster,
      taxMasters, saveTaxMaster, deleteTaxMaster, itemTaxMappings, saveItemTaxMapping, deleteItemTaxMapping,
      organizations, saveOrganization, deleteOrganization,
      sponsorTariffs, saveSponsorTariff, saveSponsorTariffBatch, deleteSponsorTariff, resolveNegotiatedPrice, getBasePrice,
      vitalSignGroups, vitalSignParameters, addVitalSignGroup, saveVitalSignParameter, deleteVitalSignParameter,
      vendors, saveVendor, deleteVendor,
      purchaseOrders, savePurchaseOrder, deletePurchaseOrder,
      grns, saveGRN, deleteGRN,
      purchaseReceipts, savePurchaseReceipt, deletePurchaseReceipt,
      purchaseReturns, savePurchaseReturn, deletePurchaseReturn,
      expiryReturns, saveExpiryReturn, deleteExpiryReturn, fetchExpiryItems,
      chartOfAccounts, saveChartOfAccount, deleteChartOfAccount,
      journalVouchers, saveJournalVoucher, deleteJournalVoucher, postAutoJournalVoucher,
      gstr2bUploads, gstr2bInvoices, saveGstr2bUpload, markUploadReconciled,
      currencies, selectedCurrency, setSelectedCurrency, saveCurrency, deleteCurrency, formatCurrency, completeDirectSalePayment,
      toasts, showToast, addToast, removeToast,
      isLoading, isDbConnected, updateDbConnection, disconnectDb,
      patientRefunds, processPatientRefund,

      // Loyalty Wallet System
      loyaltyAccounts, loyaltyTransactions, loyaltyProgramConfig, loyaltyTiers, loyaltyRedemptionRules, loyaltyBonusRules,
      enrollOrFetchLoyaltyAccount, calculateLoyaltyRedemption, processLoyaltyTransaction, reverseLoyaltyTransaction, manualLoyaltyAdjustment,
      saveLoyaltyProgramConfig, saveLoyaltyTier, saveLoyaltyRedemptionRules, saveLoyaltyBonusRule,

      // RBAC values
      roles, screens, saveRole, deleteRole, saveScreen, deleteScreen, saveRolePrivileges, saveUserOverrides, updateAppUserRole, saveAppUser, deleteAppUser,

      // Pharmacy Location Hierarchy
      pharmacyZones, pharmacyRacks,
      savePharmacyZone, deletePharmacyZone,
      savePharmacyRack, deletePharmacyRack,
      saveBatchLocation, deleteBatchLocation,
      fetchBatchLocation, fetchStoreBatchLocations
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