
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
export interface Branch extends MasterEntity {}

// New Interface for Master Diagnosis List
export interface MasterDiagnosis {
  id: string;
  code: string; // ICD Code
  description: string;
  status: 'Active' | 'Inactive';
}

export interface DentalICD {
  id: string;
  code: string;
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
  dentalSelections?: { tooth: string, icd: string }[]; // Mapping ICD to each tooth
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
  email?: string;
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
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  taxPercentage?: number;
  total: number;
  itemId?: string;
  batchNo?: string;
  itemType?: string;
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
  invoiceNo?: string; // e.g., INV-D-HUMC-26000208
  patientId: string;
  appointmentId?: string; // Optional link to an appointment
  date: string;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';
  totalAmount: number;
  paidAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  roundOff?: number;
  paymentMode?: string;
  amountReceived?: number;
  referenceNo?: string;
  notes?: string;
  departmentId?: string;
  items: BillItem[];
  payments: Payment[];
  isPharmacy?: boolean;
  prescriptionId?: string;
  doctorId?: string;
  createdBy?: string;
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


export interface PatientDocument {
  id: string;
  patientId: string;
  appointmentId?: string;
  name: string;
  fileType: string; // 'application/pdf', 'image/jpeg', etc.
  fileData: string; // BLOB format (Base64 string)
  uploadedAt: string;
  uploadedBy: string; // Doctor/Staff ID
  size: number; // Bytes
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

export interface InventoryItemStock {
  id: string;
  itemId: string;
  vedCategory: string;
  isReusable: boolean;
  itemRate: number;
  fsnType: string;
  isBulky: boolean;
  cycleCountFrequency: string;
  reusableCount: number;
  reservedQty: number;
  manufacturerName: string;
}

export interface InventoryItemPricing {
  id: string;
  itemId: string;
  branchId: string;
  branchName: string;
  pricingMethod: string;
  price: number;
  markupPercentage: number;
}

export interface Store {
  id: string;
  storeCode: string;
  storeName: string;
  branchId: string;
  branchName?: string;
  status: 'Active' | 'Inactive';
  isActive: boolean;
  createdAt?: string;
}

export interface StoreItemMapping {
  id: string;
  storeId: string;
  itemId: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  itemDescription: string;
  arabicName: string;
  itemType: string;
  itemCategory: string;
  itemGroup: string;
  itemClass?: string;
  stockType: string;
  procurementType: string;
  baseUom: string;
  trackUom: string;
  distributionCategory: string;
  purchaseOrganisation: string;
  shelfLifeLimit?: number;
  itemSpecification?: string;
  sfda?: string;
  gtin?: string;
  nphiesDrugType?: string;
  isInventorised: boolean;
  isBatchTracked: boolean;
  isExpiryDateRequired: boolean;
  isSerialized: boolean;
  isActive: boolean;
  isApprovalRequired: boolean;
  isInsuranceCover: boolean;
  drugSubGroups?: string;
  
  // Accounts and Sales Info
  purchaseUom: string;
  salesUom: string;
  purchaseConversionFactor: number;
  salesConversionFactor: number;
  defaultPricingMethod: string;
  defaultMarkupPercentage: number;
  branch?: string;
  purchaseInventoryAcc: string;
  costOfSalesAcc: string;
  saleAccount: string;
  reorderLevel?: number;
  minStockLevel?: number;
  
  createdAt?: string;
  updatedAt?: string;
  stock?: InventoryItemStock;
  pricing?: InventoryItemPricing[];
}

export interface OpeningStockItem {
  id?: string;
  openingStockId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemCategory: string;
  batchNo?: string;
  batchStartDate?: string;
  batchEndDate?: string;
  quantity: number;
  rate: number;
  amount: number;
  mrp: number;
}

export interface OpeningStock {
  id?: string;
  storeId: string;
  entryDate: string;
  status: 'Draft' | 'Submitted';
  items?: OpeningStockItem[];
}

export interface StockLedgerEntry {
  id?: string;
  storeId: string;
  itemId: string;
  transactionType: 'STOCKIN' | 'STOCKOUT';
  refType: string;
  refDocNo: string;
  refDocDate: string;
  stockInQuantity: number;
  stockOutQuantity: number;
  closingStock: number;
  closingStockRate: number;
  closingStockValue: number;
  currency: string;
  batchNo?: string;
  batchDate?: string;
  expiryDate?: string;
  createdAt?: string;

  // Joined fields for display
  store?: Store;
  item?: InventoryItem;
}

export interface DashboardMetrics {
  totalProducts: number;
  lowStockItems: number;
  outOfStock: number;
  totalValue: number;
  itemsDetails: Array<{
    itemId: string;
    itemCode: string;
    itemCategory: string;
    itemName: string;
    currentStock: number;
    restockLevel: number;
  }>;
}

export interface DirectSaleItem {
  id?: string;
  saleId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  batchNo: string;
  batchDate?: string;
  quantity: number;
  unitPrice: number;
  costRate?: number;
  totalPrice: number;
  expiryDate?: string;
  unit?: string;
}

export interface DirectSale {
  id?: string;
  saleNo: string;
  saleDate: string;
  storeId: string;
  
  // Patient Information
  firstName: string;
  middleName?: string;
  lastName?: string;
  phoneNo?: string;
  externalNo?: string;
  dob?: string;
  age?: number;
  ageUnit: string;
  gender?: string;
  referredDoctor?: string;
  licenseNo?: string;
  nationality: string;
  isInsured: boolean;
  isNewExternalPatient: boolean;
  
  totalAmount: number;
  items: DirectSaleItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  genericName?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  frequency: string;
  dose: string;
  units: string;
  intakeQty: number;
  startDate: string;
  noDays: number;
  totalQty: number;
  drugInstruction?: string;
  remarks?: string;
  status: 'Pending' | 'Dispensed';
  unitPrice?: number;
  taxPercentage?: number;
  taxAmount?: number;
  totalAmount?: number;
}


export interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  orderDate: string;
  orderType: string;
  status: 'Pending' | 'Partially Dispensed' | 'Dispensed' | 'Cancelled';
  totalAmount: number;
  taxAmount?: number;
  items: PrescriptionItem[];
}

// --- Pharmacy Master Types ---

export interface DrugGeneric {
  id: string;
  genericCode: string;
  genericName: string;
  groupName?: string;
  strength?: string;
  availableForms?: string;
  formOfAdministration?: string;
  routeOfAdministration?: string;
  isDrugGeneric: boolean;
  isAntibiotic: boolean;
  isNarcotic: boolean;
  isActive: boolean;
}

export interface DrugMaster {
  id: string;
  itemId: string;
  itemCode: string;
  drugName: string;
  genericId: string;
  isActive: boolean;
}

export interface TaxMaster {
  id: string;
  taxName: string;
  percentage: number;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

export interface ItemTaxMapping {
  id: string;
  itemId: string;
  taxId: string;
  createdAt?: string;
}

export interface OrganizationContact {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  designation?: string;
  contactType?: string;
  value?: string;
  mobile?: string;
  idType?: string;
  idNo?: string;
  primaryId: boolean;
}

export interface Organization {
  id: string;
  code: string;
  sponsorType: string;
  payerId?: string;
  vatNotRequired: boolean;
  contractCreatedBy?: string;
  organizationType: 'With MOU' | 'Without MOU';
  accountNo?: string;
  organizationGroup?: string;
  receiverId?: string;
  gatewayConfiguration?: string;
  vatNo?: string;
  name: string;
  active: boolean;
  isDamanOrThiqa: boolean;
  maxApprovalTime?: number;
  
  // Address details
  addressDetails?: string;
  buildingNo?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  state?: string;
  dist?: string;
  
  // Contacts
  contacts?: OrganizationContact[];
  
  // Insurance mapping
  insuranceId?: string;
  
  // Class wise tariff
  branchId?: string;
  
  createdAt?: string;
}

// --- Insurance & Policy Types ---

export interface PolicyRule {
  id: string;
  policyId: string;
  ruleType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES' | 'ALL';
  visitType: 'OP' | 'IP' | 'ER' | 'All';
  gender: string;
  className: string;
  tariffClass?: string;
  tariffValue?: string;
  amountLimit: number;
  quantityLimit: number;
  patientCopay: string; 
  sponsorPayment: string; 
  patientDeductible: string;
  patientDeductibleType: 'Amt' | '%';
  approvalRequired: boolean;
  exclude: boolean;
  active: boolean;
  aliasCode?: string; // For "Specific Item Code" specificity
  groupName?: string; // For "Service/Drug Group" specificity (50 points)
}

export interface InsurancePolicy {
  id: string;
  policyNo: string;
  policyName: string;
  sponsorType: string;
  sponsorId: string;
  insuranceId?: string;
  startDate: string;
  endDate: string;
  active: boolean;
  patientAmt: number;
}

export interface PolicyRuleContext {
  policyId: string;
  visitType: 'OP' | 'IP' | 'ER';
  gender: string;
  item: {
    type: 'SERVICES' | 'DRUGS' | 'CONSUMABLES';
    code: string; 
    className: string; 
    tariffClass?: string;
    groupName?: string; // Add groupName for group specific evaluations
    unitPrice: number;
    quantity: number;
  };
}

export interface AdjudicationResult {
  matchedRuleId?: string;
  originalAmount: number;
  patientPayable: number;
  sponsorPayable: number;
  deductibleApplied: number;
  isExcluded: boolean;
  approvalRequired: boolean;
  score: number;
}

export interface SponsorTariff {
  id: string;
  sponsorId: string;
  itemType: 'SERVICES' | 'DRUGS' | 'CONSUMABLES';
  itemCode: string;
  itemName: string;
  cptCode?: string;
  groupName?: string;
  baseTariff: number;
  contractType: string; // 'Flat' | 'Discount %' | 'Markup %'
  tariffAmount: number;
  sponsorCode?: string;
  sponsorDescription?: string;
  className: string;
  nphiesCode?: string;
  nphiesDesc?: string;
  active: boolean;
  createdAt?: string;
}

export interface VendorTerm {
  id?: string;
  vendorId?: string;
  termCode: string;
  termDesc: string;
}

export interface VendorBankInfo {
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
}

export interface VendorRegistration {
  crNumber?: string;
  vatNumber?: string;
  crExpiry?: string;
  vatExpiry?: string;
}

export interface VendorBusinessInfo {
  website?: string;
  annualTurnover?: string;
  distributorLink?: string;
}

export interface VendorContact {
  contactPerson?: string;
  email?: string;
  mobile?: string;
  designation?: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  vendorType: string;
  billingStructure?: string;
  currency: string;
  creditPeriod?: string;
  rating?: string;
  paymentTerm?: string;
  supplierSubType?: string;
  panNo?: string;
  regstStatus: string;
  accountGroup: string;
  tdsType?: string;
  exportLicense?: string;
  account?: string;
  remarks?: string;
  
  // Checkboxes
  active: boolean;
  qualityCheckRequired: boolean;
  suspended: boolean;
  isoCertified: boolean;
  isVat: boolean;

  // Embedded details
  bankInfo?: VendorBankInfo;
  registrationDetails?: VendorRegistration;
  businessInfo?: VendorBusinessInfo;
  contactDetails?: VendorContact;

  // Loaded Terms & Conditions list
  terms?: VendorTerm[];
  createdAt?: string;
}

export interface POAddressDetails {
  billingAddress?: string;
  shippingAddress?: string;
}

export interface POOtherDetails {
  deliveryTerms?: string;
  shipmentMode?: string;
  paymentMethod?: string;
}

export interface POTerm {
  termCode: string;
  termDesc: string;
}

export interface PurchaseOrderItem {
  id?: string;
  poId?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  publicPrice?: number;
  discountPercentage?: number;
  unitCost: number;
  isBulk: boolean;
  taxStructure?: string;
  remarks?: string;

  // Source document details
  sourceDocNum?: string;
  sourceDocDate?: string;
  sourceQuantity?: number;
  pendingQuantity?: number;
  shortCloseQuantity?: number;

  // Added search details
  isFoc?: boolean;
  unit?: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  poType: string;
  vendorId: string;
  storeId: string;
  refDocDate?: string;
  refDocNo?: string;
  purchaseOrganisation: string;
  currencyCode: string;
  currencyExchangeRate?: number;
  validTill?: string;
  discountAmount?: number;
  discountPercentage?: number;
  taxCode?: string;
  isNonStock: boolean;
  accountCode?: string;
  netAmount: number;

  // Detailed Tabs
  addressDetails?: POAddressDetails;
  otherDetails?: POOtherDetails;
  importedItems?: string;
  terms?: POTerm[]; // Added terms & conditions support

  status: 'Draft' | 'Approved' | 'Cancelled';
  items?: PurchaseOrderItem[];
  createdAt?: string;
}

export interface GRNItem {
  id?: string;
  grnId?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  locator?: string;
  batchCode: string;
  batchDate?: string;
  expiryDate: string;
  poQuantity?: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rate: number;
  publicPrice?: number;
  unitCost: number;
  discountPercentage?: number;
  discountAmount?: number;
  vatPercentage?: number;
  vatAmount?: number;
  totalAmount: number;
  remarks?: string;
  isBulky: boolean;
}

export interface GRN {
  id: string;
  grnNo: string;
  grnType: 'From Expiry Item Return' | 'From Purchase Order' | 'From Letter of Indent' | 'Direct' | 'From Consignment';
  vendorId: string;
  storeId: string;
  poId?: string;
  gateEntryDate: string;
  gateEntryNo: string;
  discountPercentage?: number;
  discountAmount?: number;
  netAmount: number;
  grossAmount: number;
  status: 'Draft' | 'Submitted';
  items?: GRNItem[];
  createdAt?: string;
}

export interface PurchaseReceiptItem {
  id?: string;
  receiptId?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  remarks?: string;
  rate: number;
  discountPercentage?: number;
  discountAmount?: number;
  sourceQuantity?: number;
  pendingQuantity?: number;
  alreadyConvertedQuantity?: number;
  batchDetails?: {
    batchCode?: string;
    expiryDate?: string;
    locator?: string;
  };
}

export interface PurchaseReceipt {
  id: string;
  receiptNo: string;
  receiptDate: string;
  grnId?: string;
  vendorId: string;
  storeId: string;
  taxProfile?: string;
  netAmount: number;
  addressDetails?: {
    billingAddress?: string;
    shippingAddress?: string;
  };
  referenceDetails?: {
    refNo?: string;
    refDate?: string;
  };
  lcDetails?: {
    lcNo?: string;
    lcDate?: string;
  };
  otherDetails?: {
    paymentTerm?: string;
    remarks?: string;
  };
  status: 'Draft' | 'Submitted';
  items?: PurchaseReceiptItem[];
  createdAt?: string;
}

export type PurchaseReturnType = 'From Purchase Receipt' | 'From GRN' | 'From Consignment';

export interface PurchaseReturnItem {
  id?: string;
  returnId?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  quantity: number;
  rate: number;
  discountPercentage?: number;
  discountAmount?: number;
  sourceQuantity?: number;
  returnReason?: string;
  batchDetails?: {
    batchCode?: string;
    expiryDate?: string;
    locator?: string;
  };
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  returnDate: string;
  returnType: PurchaseReturnType;
  sourceGrnId?: string;
  sourcePrnId?: string;
  vendorId: string;
  storeId: string;
  netAmount: number;
  remarks?: string;
  status: 'Draft' | 'Submitted';
  items?: PurchaseReturnItem[];
  createdAt?: string;
}

export interface ExpiryReturnItem {
  id?: string;
  returnId?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  batchCode: string;
  expiryDate: string;
  currentStock: number;
  quantity: number;
  rate: number;
  value: number;
  remarks?: string;
}

export interface ExpiryReturn {
  id: string;
  docNo: string;
  docDate: string;
  storeId: string;
  vendorId: string;
  noOfDays: number;
  netAmount: number;
  purchaseOrganisation: string;
  remarks?: string;
  status: 'Draft' | 'Submitted';
  items?: ExpiryReturnItem[];
  createdAt?: string;
}

