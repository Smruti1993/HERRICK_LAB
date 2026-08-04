import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSupabase, getAuthToken, BACKEND_URL } from '../services/supabaseClient';
import { 
  ArrowLeft, 
  Bell, 
  Search, 
  Barcode as BarcodeIcon, 
  QrCode, 
  Sliders, 
  ShieldCheck, 
  FileCheck2, 
  FileText, 
  RefreshCw, 
  ChevronRight, 
  Activity, 
  Play, 
  Check, 
  AlertTriangle, 
  Info, 
  Calendar, 
  Clock, 
  User, 
  X, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  History, 
  HelpCircle,
  FileSpreadsheet,
  Edit,
  ClipboardList,
  Save
} from 'lucide-react';

interface ResultRow {
  parameterId: string;
  name: string;
  code: string;
  value: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical' | '';
  unit: string;
  refRangeText: string;
  method: string;
  refMin: number | null;
  refMax: number | null;
  critMin: number | null;
  critMax: number | null;
  
  // Hierarchy & validation fields
  parentId?: string;
  resultType?: string;
  isMandatory?: boolean;
  isDerived?: boolean;
  isParameterSum?: boolean;
  isActive?: boolean;
}

interface OrderRecord {
  id: string;
  barcodeNo: string;
  priority: string;
  status: string;
  orderedAt: string;
  collectedAt?: string;
  acceptedAt?: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  serviceName: string;
  patientId: string;
  visitCode: string;
  cptCode: string;
  consultingDoctor?: string;
  serviceId?: string;
  profileGroupId?: string;
  sourceProfileServiceId?: string;
  sourceProfileServiceName?: string;
}

export default function LimsPerformTest() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const supabase = getSupabase();

  // General Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Filters State
  const [searchMrn, setSearchMrn] = useState('');
  const [searchBarcode, setSearchBarcode] = useState(orderId || '');
  const [searchSampleId, setSearchSampleId] = useState('');
  const [searchInvestigation, setSearchInvestigation] = useState('All');
  const [searchPriority, setSearchPriority] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown list options
  const [investigationList, setInvestigationList] = useState<string[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  // Statistics State
  const [stats, setStats] = useState({
    pending: 0,
    resultEntered: 0,
    certifiedToday: 0,
    retestRequests: 0
  });

  // Worklist Queue States
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Active Order Context & Accordions Details
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [instrumentRunId, setInstrumentRunId] = useState('');
  const [rackPosition, setRackPosition] = useState('');
  const [qcPassed, setQcPassed] = useState(true);
  const [reagentInDate, setReagentInDate] = useState(true);
  const [calibrationVerified, setCalibrationVerified] = useState(true);
  const [maintenanceOk, setMaintenanceOk] = useState(true);
  const [duplicateRunRequired, setDuplicateRunRequired] = useState(false);
  const [controlLotNo, setControlLotNo] = useState('');
  const [reagentLotNo, setReagentLotNo] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [testMethod, setTestMethod] = useState('Automated');
  const [analyzerChannel, setAnalyzerChannel] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [clinicalComments, setClinicalComments] = useState('');
  
  // Results details
  const [resultsList, setResultsList] = useState<ResultRow[]>([]);
  const [previousResults, setPreviousResults] = useState<any[]>([]);
  const [resultDateTime, setResultDateTime] = useState('');
  const [enteredBy, setEnteredBy] = useState('');
  const [resultStatus, setResultStatus] = useState('Preliminary');

  // Worklist parameters and inline results states
  const [worklistParams, setWorklistParams] = useState<Record<string, any[]>>({});
  const [inlineResults, setInlineResults] = useState<Record<string, string>>({});
  const [selectedOrderSamples, setSelectedOrderSamples] = useState<any[]>([]);

  // Worklist service result types and modal states
  const [serviceResultTypes, setServiceResultTypes] = useState<Record<string, string>>({});
  const [showParamModal, setShowParamModal] = useState(false);
  const [paramModalOrder, setParamModalOrder] = useState<OrderRecord | null>(null);
  const [paramModalParams, setParamModalParams] = useState<any[]>([]);

  // Test tracking modal states
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  // Accordion Expander States
  const [accordionPrevExpanded, setAccordionPrevExpanded] = useState(false);
  const [accordionResultExpanded, setAccordionResultExpanded] = useState(true);
  const [accordionCommentsExpanded, setAccordionCommentsExpanded] = useState(false);

  // Keyboard shortcut instructions overlay
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Supervisor override modal state (for certification when reagent stock is insufficient)
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideModalShortfalls, setOverrideModalShortfalls] = useState<any[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePendingOrders, setOverridePendingOrders] = useState<OrderRecord[]>([]);
  const [overrideReasonError, setOverrideReasonError] = useState('');

  // Action dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current logged in technician info
  const getLoggedInUser = () => {
    try {
      const localUser = localStorage.getItem('medicore_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        return parsed.fullName || parsed.name || parsed.username || 'Shahira A.';
      }
    } catch (e) {
      console.error('Error getting user:', e);
    }
    return 'Shahira A.';
  };

  const getLoggedInUserId = () => {
    try {
      const localUser = localStorage.getItem('medicore_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        return parsed.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
      }
    } catch (e) {
      console.error(e);
    }
    return '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
  };

  useEffect(() => {
    setEnteredBy(getLoggedInUser());
    setPerformedBy(getLoggedInUser());
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setResultDateTime(formatted);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Print Lab Report (Test-wise) ───────────────────────────────────────────
  const handlePrintLabReport = useCallback(async (order: OrderRecord) => {
    setActiveDropdownId(null);
    setIsPrinting(true);
    try {
      // 1. Hospital branding
      const { data: branchData } = await supabase
        .from('branches')
        .select('name, logo_url, vat_reg_no')
        .limit(1)
        .maybeSingle();

      // 2. Full lab order + appointment + department + doctor details
      const { data: labOrder } = await supabase
        .from('lims_lab_orders')
        .select(`
          id, barcode_no, collected_at, accepted_at, certified_at, result_captured_at,
          service_order:service_order_id (
            id, service_name, cpt_code, priority,
            service_id,
            appointment:appointment_id (
              id, visit_type,
              department:department_id ( id, name ),
              doctor:doctor_id (
                id, first_name, last_name,
                department:department_id ( id, name )
              )
            ),
            ordering_doctor:ordering_doctor_id (
              id, first_name, last_name
            )
          )
        `)
        .eq('id', order.id)
        .maybeSingle();

      // 3. Full patient details (arabic name, national_id)
      let patientFull: any = {};
      if (order.patientId && order.patientId !== 'N/A') {
        const { data: pData } = await supabase
          .from('patients')
          .select('id, first_name, last_name, gender, dob, phone')
          .eq('id', order.patientId)
          .maybeSingle();
        if (pData) {
          patientFull = pData;
        } else {
          const { data: pdData } = await supabase
            .from('patient_demographics')
            .select('id, first_name, last_name, gender, year_of_birth, month_of_birth, day_of_birth, mobile')
            .eq('id', order.patientId)
            .maybeSingle();
          if (pdData) {
            const year = pdData.year_of_birth || '1990';
            const month = String(pdData.month_of_birth || 1).padStart(2, '0');
            const day = String(pdData.day_of_birth || 1).padStart(2, '0');
            patientFull = {
              ...pdData,
              dob: `${year}-${month}-${day}`,
              phone: pdData.mobile || '',
            };
          }
        }
      }

      // 4. Parameters + reference ranges
      // Use order.serviceId directly (always populated from worklist fetch);
      // fall back to the re-fetched labOrder only as a safety net.
      const serviceId = order.serviceId || (labOrder as any)?.service_order?.service_id;
      let params: any[] = [];
      if (serviceId) {
        const { data: pData } = await supabase
          .from('lims_service_parameters')
          .select('*, lims_reference_ranges(*)')
          .eq('service_id', serviceId)
          .eq('status', 'Active')
          .order('sort_order');
        
        if (pData) {
          const roots = pData.filter((p: any) => !p.parent_id);
          const children = pData.filter((p: any) => p.parent_id);
          const sorted: any[] = [];
          roots.forEach(root => {
            sorted.push(root);
            const rootChildren = children.filter(child => child.parent_id === root.id);
            sorted.push(...rootChildren);
          });
          const orphans = children.filter(child => !roots.some(r => r.id === child.parent_id));
          sorted.push(...orphans);
          params = sorted;
        } else {
          params = [];
        }
      }

      // 5. Saved results
      const { data: resultsData } = await supabase
        .from('lims_results')
        .select('*')
        .eq('lab_order_id', order.id);
      const resultsMap: Record<string, any> = {};
      (resultsData || []).forEach((r: any) => { resultsMap[r.parameter_id] = r; });

      // 6. Reference remarks (test-level)
      const { data: remarksData } = await supabase
        .from('lims_reference_remarks')
        .select('*')
        .eq('service_id', serviceId || '')
        .eq('is_active', true);
      const remarksMap: Record<string, string> = {};
      (remarksData || []).forEach((r: any) => {
        if (r.parameter_id) remarksMap[r.parameter_id] = r.remarks || '';
      });
      const globalRemark = (remarksData || []).find((r: any) => !r.parameter_id);

      // ── Resolve display values ──────────────────────────────────────────────
      const hospitalName = branchData?.name || 'HERRICK HEALTHCARE';
      const logoUrl = branchData?.logo_url || '';
      const patientName = patientFull.first_name
        ? `${patientFull.first_name} ${patientFull.last_name || ''}`.trim()
        : order.patientName;
      const arabicName = patientFull.arabic_name || '';
      const nationalId = patientFull.national_id || 'N/A';
      const gender = (patientFull.gender || order.patientGender || 'N/A').toUpperCase();
      let ageYears = 0;
      let dobStr = '';
      if (patientFull.dob) {
        const dob = new Date(patientFull.dob);
        ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        dobStr = dob.toLocaleDateString('en-GB');
      }
      const ageSex = ageYears ? `${ageYears} Yrs / ${gender}` : `${order.patientAge} / ${gender}`;

      const apptData = (labOrder as any)?.service_order?.appointment;
      const visitType = apptData?.visit_type || 'OP';
      const deptName = apptData?.department?.name || apptData?.doctor?.department?.name || 'Laboratory';

      const orderingDoc = (labOrder as any)?.service_order?.ordering_doctor;
      const consultDoc = apptData?.doctor;
      const consultingDoctorName = orderingDoc
        ? `Dr. ${orderingDoc.first_name} ${orderingDoc.last_name || ''}`.trim()
        : (consultDoc ? `Dr. ${consultDoc.first_name} ${consultDoc.last_name || ''}`.trim() : order.consultingDoctor || 'N/A');

      const fmtDate = (ts: string | null | undefined) => {
        if (!ts) return 'N/A';
        const d = new Date(ts);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      };

      // Use order.collectedAt / order.acceptedAt directly — these are populated
      // from the worklist fetch and are always reliable.
      // "Received On" = sample accepted date (accepted_at).
      const collectedOn = fmtDate(order.collectedAt || (labOrder as any)?.collected_at);
      const receivedOn  = fmtDate(order.acceptedAt  || (labOrder as any)?.accepted_at);
      const printDate   = fmtDate(new Date().toISOString());

      // ── Build result rows ───────────────────────────────────────────────────
      interface PrintRow {
        id: string;
        name: string;
        value: string;
        unit: string;
        refRange: string;
        flag: string;
        remarks: string;
        isHeading: boolean;
        isChild: boolean;
        isActive: boolean;
      }
      const resultRows: PrintRow[] = params.map((p: any) => {
        const ranges = p.lims_reference_ranges || [];
        const match = ranges.find((r: any) => {
          const gm = r.gender === 'All' || r.gender === (patientFull.gender || 'All');
          const am = ageYears >= Number(r.age_min || 0) && ageYears <= Number(r.age_max || 999);
          return gm && am;
        }) || ranges[0] || {};

        const savedResult = resultsMap[p.id];
        const value = savedResult?.value || '';
        const flag  = savedResult?.flag  || '';
        const refRange = match.ref_min && match.ref_max ? `${match.ref_min} – ${match.ref_max}` : 'N/A';
        return {
          id: p.id,
          name: p.name,
          value,
          unit: match.unit || '',
          refRange,
          flag,
          remarks: remarksMap[p.id] || '',
          isHeading: (p.result_type || p.resultType) === 'Heading',
          isChild: !!(p.parent_id || p.parentId),
          isActive: p.is_active ?? p.isActive ?? true
        };
      });

      // Filter visible parameters
      const visibleResultRows = resultRows.filter(r => r.isActive);

      // ── Build HTML string ───────────────────────────────────────────────────
      let rowsHtml = '';
      if (visibleResultRows.length > 0) {
        const testName = order.serviceName || (labOrder as any)?.service_order?.service_name || 'Lab Investigation';
        rowsHtml += `
          <tr style="background:#e2e8f0;font-weight:bold;">
            <td colspan="5" style="padding:10px 10px;border:1px solid #cbd5e1;font-size:13px;color:#0f172a;text-transform:uppercase;font-weight:900;letter-spacing:0.05em;">${testName}</td>
          </tr>`;
      }

      rowsHtml += visibleResultRows.map((r, idx) => {
        if (r.isHeading) {
          return `
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="5" style="padding:8px 10px;border:1px solid #cbd5e1;font-size:11px;color:#334155;letter-spacing:0.05em;text-transform:uppercase;font-weight:800;">${r.name}</td>
            </tr>`;
        }

        const flagColor = r.flag === 'High' || r.flag === 'Critical'
          ? '#dc2626'
          : r.flag === 'Low' ? '#2563eb' : '#1e293b';
        
        const indentStyle = r.isChild ? 'padding-left: 25px;' : '';
        
        return `
          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fffe'};">
            <td style="padding:7px 10px;${indentStyle}border:1px solid #d1d5db;font-size:12px;color:#1e293b;">${r.isChild ? '↳ ' : ''}${r.name}</td>
            <td style="padding:7px 10px;border:1px solid #d1d5db;font-size:12px;font-weight:700;color:${flagColor};text-align:center;">${r.value || '—'}${r.flag && r.flag !== 'Normal' ? ` <span style="font-size:9px;background:${flagColor};color:#fff;padding:1px 4px;border-radius:4px;">${r.flag}</span>` : ''}</td>
            <td style="padding:7px 10px;border:1px solid #d1d5db;font-size:12px;color:#374151;text-align:center;">${r.unit}</td>
            <td style="padding:7px 10px;border:1px solid #d1d5db;font-size:12px;color:#374151;text-align:center;">${r.refRange}</td>
            <td style="padding:7px 10px;border:1px solid #d1d5db;font-size:11px;color:#6b7280;">${r.remarks}</td>
          </tr>`;
      }).join('');

      const certifiedBy = (labOrder as any)?.certified_at ? 'Certified Technician' : '';

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lab Report - ${order.barcodeNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm 15mm; margin: 0 auto; }
    .header-bar { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
    .hospital-name { font-size: 20px; font-weight: 800; color: #047857; letter-spacing: 0.5px; }
    .hospital-sub  { font-size: 10px; color: #64748b; margin-top: 2px; }
    .report-title  { font-size: 14px; font-weight: 700; color: #059669; text-align: center; margin: 8px 0; border: 2px solid #059669; border-radius: 6px; padding: 4px 16px; display: inline-block; }
    .meta-box { border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 14px; overflow: hidden; }
    .meta-box-header { background: #059669; color: white; font-size: 11px; font-weight: 700; padding: 5px 12px; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .meta-row { display: flex; border-bottom: 1px solid #e5e7eb; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { font-size: 10.5px; font-weight: 700; color: #374151; width: 130px; min-width: 130px; padding: 6px 10px; background: #f8fffe; border-right: 1px solid #e5e7eb; }
    .meta-value  { font-size: 10.5px; color: #1e293b; padding: 6px 10px; flex: 1; }
    .results-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .results-table th { background: #dcfce7; color: #065f46; font-size: 11px; font-weight: 700; padding: 8px 10px; border: 1px solid #bbf7d0; text-align: left; }
    .results-table td { vertical-align: middle; }
    .footer-sig { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #d1d5db; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; width: 140px; margin: 24px auto 4px; }
    .sig-label { font-size: 10px; color: #64748b; }
    .barcode-text { font-size: 10px; color: #6b7280; text-align: right; margin-top: 6px; }
    .arabic-name { font-size: 13px; color: #374151; direction: rtl; text-align: right; }
    .print-footer { font-size: 9px; color: #9ca3af; text-align: center; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    .remark-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 5px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; color: #92400e; }
    @page { size: A4 portrait; margin: 10mm 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { width: 100%; padding: 0; margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header-bar">
    <div>
      <div class="hospital-name">${hospitalName}</div>
      <div class="hospital-sub">Laboratory Information System</div>
      <div style="margin-top:6px;"><span class="report-title">LABORATORY REPORT</span></div>
    </div>
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:80px;max-width:120px;object-fit:contain;" />` : ''}
  </div>

  <!-- PATIENT METADATA -->
  <div class="meta-box">
    <div class="meta-box-header">PATIENT INFORMATION</div>
    <div class="meta-grid">
      <!-- LEFT COLUMN -->
      <div>
        <div class="meta-row">
          <div class="meta-label">MRN</div>
          <div class="meta-value" style="font-weight:700;color:#059669;">${order.patientId}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Name</div>
          <div class="meta-value">
            <div style="font-weight:700;">${patientName}</div>
            ${arabicName ? `<div class="arabic-name">${arabicName}</div>` : ''}
          </div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Age / Sex</div>
          <div class="meta-value">${ageSex}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Sample No</div>
          <div class="meta-value" style="font-weight:700;font-family:monospace;">${order.barcodeNo}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Consulting Doctor</div>
          <div class="meta-value">${consultingDoctorName}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">ID No (Iqama)</div>
          <div class="meta-value">${nationalId}</div>
        </div>
      </div>
      <!-- RIGHT COLUMN -->
      <div style="border-left:1px solid #e5e7eb;">
        <div class="meta-row">
          <div class="meta-label">Department</div>
          <div class="meta-value">${deptName}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Visit Type</div>
          <div class="meta-value">${visitType}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Investigation</div>
          <div class="meta-value" style="font-weight:700;">${order.serviceName}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Collected On</div>
          <div class="meta-value">${collectedOn}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Received On</div>
          <div class="meta-value">${receivedOn}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Printed On</div>
          <div class="meta-value">${printDate}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- RESULTS TABLE -->
  <table class="results-table">
    <thead>
      <tr>
        <th style="width:35%;">Test Name</th>
        <th style="width:15%;text-align:center;">Result</th>
        <th style="width:12%;text-align:center;">Unit</th>
        <th style="width:20%;text-align:center;">Reference Range</th>
        <th style="width:18%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">No results entered yet</td></tr>`}
    </tbody>
  </table>

  ${globalRemark?.remarks ? `<div class="remark-box"><strong>Note:</strong> ${globalRemark.remarks}</div>` : ''}

  <!-- SIGNATURES -->
  <div class="footer-sig">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Technician / Analyst</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Lab Supervisor</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Pathologist / Consultant</div>
    </div>
  </div>

  <div class="barcode-text">Barcode: ${order.barcodeNo} &nbsp;|&nbsp; CPT: ${order.cptCode}</div>
  <div class="print-footer">${hospitalName} — This report is generated electronically and is valid without a signature if printed from the MediCore HMS system. Printed: ${printDate}</div>
</div>
</body>
</html>`;

      // ── Open a new window and trigger the native browser print dialog ─────────
      // This is the most reliable approach — the browser fully renders the HTML
      // natively, and the user can Save as PDF or print to a physical printer.
      // It bypasses all html2canvas/html2pdf rendering quirks entirely.
      const printWin = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      if (!printWin) {
        alert('Please allow pop-ups for this site to print the lab report.');
        return;
      }
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      // Auto-trigger print once the new window has fully loaded
      printWin.onload = () => {
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 300);
      };
    } catch (err) {
      console.error('Error generating lab report PDF:', err);
      alert('Failed to generate the lab report. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  }, [supabase]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch real-time tracking audit details for test tracking
  const handleOpenTestTracking = async (order: OrderRecord) => {
    setShowTrackingModal(true);
    setTrackingLoading(true);
    try {
      // 1. Fetch lab order + service order + appointment details (excluding patient nested select)
      const { data: labOrder, error: orderErr } = await supabase
        .from('lims_lab_orders')
        .select(`
          id, barcode_no, collected_at, collected_by, accepted_at, accepted_by,
          certified_at, certified_by, result_captured_at, result_captured_by,
          ordered_at, status,
          service_id,
          service:service_id ( name ),
          service_order:service_order_id (
            id, service_name, cpt_code, priority, service_id, appointment_id,
            appointment:appointment_id (
              id, visit_type, patient_id
            )
          )
        `)
        .eq('id', order.id)
        .maybeSingle();

      if (orderErr) throw orderErr;

      // 1b. Fetch patient details separately using patient_id (removing non-existent arabic_name and national_id columns)
      const patientId = order.patientId || (labOrder as any)?.service_order?.appointment?.patient_id;
      let resolvedPatient: any = {};
      if (patientId && patientId !== 'N/A') {
        const { data: pData } = await supabase
          .from('patients')
          .select('id, first_name, last_name, gender, dob, phone')
          .eq('id', patientId)
          .maybeSingle();
        if (pData) {
          resolvedPatient = pData;
        } else {
          const { data: pdData } = await supabase
            .from('patient_demographics')
            .select('id, first_name, last_name, gender, year_of_birth, month_of_birth, day_of_birth, mobile')
            .eq('id', patientId)
            .maybeSingle();
          if (pdData) {
            const year = pdData.year_of_birth || '1990';
            const month = String(pdData.month_of_birth || 1).padStart(2, '0');
            const day = String(pdData.day_of_birth || 1).padStart(2, '0');
            resolvedPatient = {
              ...pdData,
              dob: `${year}-${month}-${day}`,
              phone: pdData.mobile || '',
            };
          }
        }
      }

      // 1c. Fetch branch branding dynamically (no pre-filling branding)
      const { data: branchData } = await supabase
        .from('branches')
        .select('name')
        .limit(1)
        .maybeSingle();
      const resolvedBranchName = branchData?.name || 'Medicore Hospital';

      // 2. Fetch bill details (created_by is billing user)
      let billInfo = null;
      const appointmentId = (labOrder as any)?.service_order?.appointment_id;
      if (appointmentId) {
        const { data: billData } = await supabase
          .from('bills')
          .select('created_by, date')
          .eq('appointment_id', appointmentId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        billInfo = billData;
      }
      
      // 2b. Fallback: If no bill matched by appointment_id (e.g. direct billing), search bills by patient_id created on same date
      if (!billInfo && patientId) {
        const orderedDateOnly = labOrder?.ordered_at ? labOrder.ordered_at.split('T')[0] : new Date().toISOString().split('T')[0];
        const { data: billsData } = await supabase
          .from('bills')
          .select('created_by, date')
          .eq('patient_id', patientId)
          .gte('date', `${orderedDateOnly}T00:00:00`)
          .lte('date', `${orderedDateOnly}T23:59:59`)
          .order('date', { ascending: false });
          
        if (billsData && billsData.length > 0) {
          billInfo = billsData[0];
        }
      }

      // 3. Resolve usernames/IDs
      const uniqueUserIds = new Set<string>();
      if (billInfo?.created_by) uniqueUserIds.add(billInfo.created_by);
      if (labOrder?.collected_by) uniqueUserIds.add(labOrder.collected_by);
      if (labOrder?.accepted_by) uniqueUserIds.add(labOrder.accepted_by);
      if (labOrder?.certified_by) uniqueUserIds.add(labOrder.certified_by);
      if (labOrder?.result_captured_by) uniqueUserIds.add(labOrder.result_captured_by);

      const idsArray = Array.from(uniqueUserIds).filter(Boolean);
      let userMap: Record<string, string> = {};

      if (idsArray.length > 0) {
        const { data: usersData } = await supabase
          .from('app_users')
          .select('id, username, full_name')
          .or(`id.in.(${idsArray.join(',')}),username.in.(${idsArray.join(',')})`);
        
        if (usersData) {
          usersData.forEach(u => {
            userMap[u.id] = u.full_name || u.username;
            userMap[u.username] = u.full_name || u.username;
          });
        }
      }

      // Helper to format date matching DD/MM/YYYY HH:mm
      const formatTrackingDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (e) {
          return '';
        }
      };

      const resolvedVisitType = (labOrder as any)?.service_order?.appointment?.visit_type || 'OP';
      const resolvedVisitNo = (labOrder as any)?.service_order?.appointment?.id?.slice(0, 8) || order.visitCode || '';
      
      // Map details
      const trackingRecord = {
        patientName: [resolvedPatient.first_name, resolvedPatient.last_name].filter(Boolean).join(' '),
        arabicName: resolvedPatient.arabic_name || '',
        mrn: resolvedPatient.national_id || resolvedPatient.id || order.patientId || '',
        branchName: resolvedBranchName, 
        visitNo: `${resolvedVisitType}-${resolvedVisitNo}`,
        sampleId: labOrder?.barcode_no || order.barcodeNo || '',
        investigation: (labOrder as any)?.service?.name || (labOrder as any)?.service_order?.service_name || order.serviceName || '',
        
        orderedBy: billInfo?.created_by ? (userMap[billInfo.created_by] || billInfo.created_by) : '',
        orderedDate: formatTrackingDate(billInfo?.date || labOrder?.ordered_at),
        
        generatedBy: labOrder?.collected_by ? (userMap[labOrder.collected_by] || labOrder.collected_by) : (labOrder?.accepted_by ? (userMap[labOrder.accepted_by] || labOrder.accepted_by) : ''),
        generatedDate: formatTrackingDate(labOrder?.ordered_at),
        
        sendBy: labOrder?.collected_by ? (userMap[labOrder.collected_by] || labOrder.collected_by) : '',
        sendDate: formatTrackingDate(labOrder?.collected_at),
        
        acceptedBy: labOrder?.accepted_by ? (userMap[labOrder.accepted_by] || labOrder.accepted_by) : '',
        acceptedDate: formatTrackingDate(labOrder?.accepted_at),
        
        certifiedBy: labOrder?.certified_by ? (userMap[labOrder.certified_by] || labOrder.certified_by) : '',
        certifiedDate: formatTrackingDate(labOrder?.certified_at),
        
        rectifiedBy: '',
        rectifiedDate: '',
      };

      setTrackingData(trackingRecord);
    } catch (e: any) {
      console.error(e);
      alert('Error fetching tracking data: ' + (e.message || e));
      setShowTrackingModal(false);
    } finally {
      setTrackingLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch initial master lists and statistics
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const { data: equipData } = await supabase.from('lims_equipment').select('*').eq('status', 'Active');
        if (equipData) {
          setEquipmentList(equipData);
          if (equipData.length > 0) setSelectedEquipmentId(equipData[0].id);
        }

        // Fetch unique investigations list for filters
        const { data: orderServices } = await supabase
          .from('lims_lab_orders')
          .select(`
            service_id,
            service:service_id ( name ),
            service_order:service_order_id ( service_name )
          `);
        
        if (orderServices) {
          const names = orderServices
            .map((item: any) => {
              const comp = item.service ? (Array.isArray(item.service) ? item.service[0] : item.service) : null;
              return comp?.name || item.service_order?.service_name;
            })
            .filter(Boolean);
          setInvestigationList(Array.from(new Set(names)));
        }
      } catch (err) {
        console.error('Error loading Perform Test masters:', err);
      }
    };

    fetchMasterData();
    fetchStats();
  }, []);

  // Fetch Statistics dynamically from database
  const fetchStats = async () => {
    try {
      // 1. Pending: status in ['Accepted', 'In Process']
      const { count: pendingCount } = await supabase
        .from('lims_lab_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Accepted', 'In Process']);

      // 2. Result Entered: status === 'Result'
      const { count: enteredCount } = await supabase
        .from('lims_lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Result');

      // 3. Certified Today: status === 'Certified' and certified_at >= today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: certifiedCount } = await supabase
        .from('lims_lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Certified')
        .gte('certified_at', todayStart.toISOString());

      // 4. ReTest Requests: active re-test orders
      const { data: retestAudits } = await supabase
        .from('lims_audit_trail')
        .select('lab_order_id')
        .ilike('comments', '%re-testing%');
      
      let retestCount = 0;
      if (retestAudits && retestAudits.length > 0) {
        const uniqueRetestIds = Array.from(new Set(retestAudits.map(a => a.lab_order_id)));
        const { count: activeRetests } = await supabase
          .from('lims_lab_orders')
          .select('*', { count: 'exact', head: true })
          .in('id', uniqueRetestIds)
          .in('status', ['Accepted', 'In Process']);
        retestCount = activeRetests || 0;
      }

      setStats({
        pending: pendingCount || 0,
        resultEntered: enteredCount || 0,
        certifiedToday: certifiedCount || 0,
        retestRequests: retestCount
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Fetch Worklist orders based on filter states
  const fetchWorklist = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lims_lab_orders')
        .select(`
          id,
          barcode_no,
          priority,
          status,
          ordered_at,
          collected_at,
          accepted_at,
          service_id,
          profile_group_id,
          source_profile_service_id,
          service:service_id (
            id,
            name,
            cpt_code
          ),
          service_order:service_order_id (
            id,
            service_name,
            cpt_code,
            priority,
            service_id,
            ordering_doctor:ordering_doctor_id (
              id,
              first_name,
              last_name
            ),
            appointment:appointment_id (
              id,
              patient_id,
              doctor:doctor_id (
                id,
                first_name,
                last_name
              )
            )
          )
        `)
        .in('status', ['Accepted', 'In Process', 'Result', 'Certified']);

      // Priority Filter
      if (searchPriority && searchPriority !== 'All') {
        query = query.eq('priority', searchPriority);
      }

      // Barcode Filter
      if (searchBarcode) {
        query = query.ilike('barcode_no', `%${searchBarcode}%`);
      }

      // Date Range Filters
      if (dateFrom) {
        query = query.gte('ordered_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('ordered_at', `${dateTo}T23:59:59`);
      }

      // MRN or Patient Name filters via Patient ID resolutions
      let resolvedOrderIds: string[] = [];
      let hasPatientFilter = false;

      if (searchMrn) {
        hasPatientFilter = true;
        const { data: pts } = await supabase
          .from('patients')
          .select('id')
          .ilike('id', `%${searchMrn}%`);
        if (pts && pts.length > 0) {
          const ptIds = pts.map(p => p.id);
          const { data: apps } = await supabase.from('appointments').select('id').in('patient_id', ptIds);
          if (apps && apps.length > 0) {
            const appIds = apps.map(a => a.id);
            const { data: srvs } = await supabase.from('service_orders').select('id').in('appointment_id', appIds);
            if (srvs && srvs.length > 0) {
              const sIds = srvs.map(s => s.id);
              const { data: lbs } = await supabase.from('lims_lab_orders').select('id').in('service_order_id', sIds);
              if (lbs) resolvedOrderIds.push(...lbs.map(l => l.id));
            }
          }
        }
      }

      // Sample ID filters via Sample records lookup
      if (searchSampleId) {
        const { data: sData } = await supabase
          .from('lims_samples')
          .select('lab_order_id')
          .ilike('sample_no', `%${searchSampleId}%`);
        
        if (sData) {
          const sampleLids = sData.map(s => s.lab_order_id).filter(Boolean);
          if (hasPatientFilter) {
            resolvedOrderIds = resolvedOrderIds.filter(id => sampleLids.includes(id));
          } else {
            resolvedOrderIds = sampleLids;
            hasPatientFilter = true;
          }
        } else if (hasPatientFilter) {
          resolvedOrderIds = [];
        }
      }

      if (hasPatientFilter) {
        if (resolvedOrderIds.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
        query = query.in('id', resolvedOrderIds);
      }

      const { data: ordersData, error: queryErr } = await query
        .order('ordered_at', { ascending: false });

      if (queryErr) throw queryErr;

      if (ordersData) {
        // Collect patient_id values and fetch details separately
        const patientIds = Array.from(new Set(
          (ordersData as any[])
            .map(o => o.service_order?.appointment?.patient_id)
            .filter(Boolean)
        ));

        let patientsMap: Record<string, any> = {};
        if (patientIds.length > 0) {
          const { data: pData } = await supabase
            .from('patients')
            .select('id, first_name, last_name, gender, dob, phone')
            .in('id', patientIds);
          if (pData) {
            pData.forEach((p: any) => { patientsMap[p.id] = p; });
          }
          
          const missingIds = patientIds.filter(id => !patientsMap[id]);
          if (missingIds.length > 0) {
            const { data: pdData } = await supabase
              .from('patient_demographics')
              .select('id, first_name, last_name, gender, year_of_birth, month_of_birth, day_of_birth, mobile')
              .in('id', missingIds);
            if (pdData) {
              pdData.forEach((p: any) => {
                const year = p.year_of_birth || '1990';
                const month = String(p.month_of_birth || 1).padStart(2, '0');
                const day = String(p.day_of_birth || 1).padStart(2, '0');
                patientsMap[p.id] = {
                  id: p.id,
                  first_name: p.first_name,
                  last_name: p.last_name || '',
                  gender: p.gender,
                  dob: `${year}-${month}-${day}`,
                  phone: p.mobile || 'N/A'
                };
              });
            }
          }
        }

        // Normalize relations
        let formattedList: OrderRecord[] = (ordersData as any[]).map(o => {
          const serviceOrder = o.service_order || {};
          const appointment = serviceOrder.appointment || {};
          const patientId = appointment.patient_id;
          const patient = patientId ? patientsMap[patientId] : {};
          
          let patientAgeText = 'N/A';
          if (patient.dob) {
            const dob = new Date(patient.dob);
            const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            patientAgeText = `${age} Years`;
          }

          // Consulting doctor
          const appointmentDoctor = appointment.doctor || {};
          const consultingDoctorName = appointmentDoctor.first_name 
            ? `Dr. ${appointmentDoctor.first_name} ${appointmentDoctor.last_name || ''}`.trim()
            : 'N/A';

          const componentService = o.service ? (Array.isArray(o.service) ? o.service[0] : o.service) : null;

          return {
            id: o.id,
            barcodeNo: o.barcode_no,
            priority: o.priority || serviceOrder.priority || 'Routine',
            status: o.status,
            orderedAt: o.ordered_at,
            collectedAt: o.collected_at,
            acceptedAt: o.accepted_at,
            patientName: patient.first_name ? `${patient.first_name} ${patient.last_name || ''}`.trim() : 'Walk-in Patient',
            patientAge: patientAgeText,
            patientGender: patient.gender || 'Unknown',
            serviceName: componentService?.name || serviceOrder.service_name || 'Lab Service',
            patientId: patient.id || 'N/A',
            visitCode: appointment.id?.slice(0, 8) || 'N/A',
            cptCode: componentService?.cpt_code || serviceOrder.cpt_code || 'LAB-TEST',
            consultingDoctor: consultingDoctorName,
            serviceId: o.service_id || serviceOrder.service_id,
            profileGroupId: o.profile_group_id || null,
            sourceProfileServiceId: o.source_profile_service_id || null,
            sourceProfileServiceName: undefined, // resolved below in batch fetch
          };
        });

        // Batch-fetch profile parent service names for rows that are profile children
        const uniqueProfileParentIds = Array.from(new Set(
          formattedList
            .map(o => o.sourceProfileServiceId)
            .filter(Boolean) as string[]
        ));
        if (uniqueProfileParentIds.length > 0) {
          const { data: profileDefs } = await supabase
            .from('service_definitions')
            .select('id, name')
            .in('id', uniqueProfileParentIds);
          if (profileDefs) {
            const profileNamesMap: Record<string, string> = {};
            profileDefs.forEach((d: any) => { profileNamesMap[d.id] = d.name; });
            formattedList = formattedList.map(o => o.sourceProfileServiceId
              ? { ...o, sourceProfileServiceName: profileNamesMap[o.sourceProfileServiceId] || 'Profile' }
              : o
            );
          }
        }

        // Filter investigation text on client side
        if (searchInvestigation && searchInvestigation !== 'All') {
          formattedList = formattedList.filter(o => o.serviceName === searchInvestigation);
        }

        setOrders(formattedList);

        // Batch fetch parameters and reference ranges for visible services
        const serviceIds = Array.from(new Set(formattedList.map(o => o.serviceId).filter(Boolean)));
        if (serviceIds.length > 0) {
          const { data: paramsData } = await supabase
            .from('lims_service_parameters')
            .select(`
              *,
              lims_reference_ranges (
                *
              )
            `)
            .in('service_id', serviceIds)
            .eq('status', 'Active')
            .order('sort_order');

          if (paramsData) {
            // Group by service_id
            const pMap: Record<string, any[]> = {};
            paramsData.forEach(p => {
              if (!pMap[p.service_id]) pMap[p.service_id] = [];
              pMap[p.service_id].push(p);
            });
            
            // Sort hierarchically for each service_id
            for (const sid in pMap) {
              const list = pMap[sid];
              const roots = list.filter(p => !p.parent_id);
              const children = list.filter(p => p.parent_id);
              const sorted: any[] = [];
              roots.forEach(root => {
                sorted.push(root);
                const rootChildren = children.filter(child => child.parent_id === root.id);
                sorted.push(...rootChildren);
              });
              const orphans = children.filter(child => !roots.some(r => r.id === child.parent_id));
              sorted.push(...orphans);
              pMap[sid] = sorted;
            }

            setWorklistParams(pMap);
          }

          // Fetch service configurations to identify result_type (e.g. 'Parameter')
          const { data: configsData } = await supabase
            .from('lims_service_configs')
            .select('service_id, result_type')
            .in('service_id', serviceIds);

          if (configsData) {
            const rtMap: Record<string, string> = {};
            configsData.forEach(c => {
              rtMap[c.service_id] = c.result_type;
            });
            setServiceResultTypes(rtMap);
          }
        }

        // Batch fetch existing results for visible orders
        const orderIds = formattedList.map(o => o.id);
        if (orderIds.length > 0) {
          const { data: resultsData } = await supabase
            .from('lims_results')
            .select('*')
            .in('lab_order_id', orderIds);

          if (resultsData) {
            const rMap: Record<string, string> = {};
            resultsData.forEach(r => {
              rMap[`${r.lab_order_id}_${r.parameter_id}`] = r.value || '';
            });
            setInlineResults(rMap);
          }
        }

        // Auto select first order if matching barcode search
        if (searchBarcode && formattedList.length > 0) {
          setSelectedOrder(formattedList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching worklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklist();
  }, [searchPriority, searchInvestigation]);

  // Load detailed order context when selectedOrder changes
  useEffect(() => {
    if (!selectedOrder) {
      setResultsList([]);
      setPreviousResults([]);
      return;
    }

    const fetchSelectedOrderDetails = async () => {
      setDetailsLoading(true);
      try {
        let data: any = null;
        let success = false;

        if (BACKEND_URL) {
          try {
            const token = await getAuthToken();
            const response = await fetch(`${BACKEND_URL}/api/lims/orders/${selectedOrder.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                success = true;
              }
            }
          } catch (fetchErr) {
            console.error('API fetch failed, falling back to direct Supabase query:', fetchErr);
          }
        }

        if (!success) {
          const { data: orderData } = await supabase
            .from('lims_lab_orders')
            .select(`
              *,
              service_order:service_order_id (
                id,
                service_name,
                cpt_code,
                priority,
                service_id,
                appointment:appointment_id (
                  id,
                  patient_id
                )
              )
            `)
            .eq('id', selectedOrder.id)
            .single();

          if (orderData) {
            const patientId = (orderData as any).service_order?.appointment?.patient_id;
            let patient = null;
            if (patientId) {
              const { data: patData } = await supabase
                .from('patients')
                .select('id, first_name, last_name, gender, dob')
                .eq('id', patientId)
                .maybeSingle();
              if (patData) {
                patient = patData;
              } else {
                const { data: pdData } = await supabase
                  .from('patient_demographics')
                  .select('id, first_name, last_name, gender, year_of_birth, month_of_birth, day_of_birth')
                  .eq('id', patientId)
                  .maybeSingle();
                if (pdData) {
                  const year = pdData.year_of_birth || '1990';
                  const month = String(pdData.month_of_birth || 1).padStart(2, '0');
                  const day = String(pdData.day_of_birth || 1).padStart(2, '0');
                  patient = {
                    id: pdData.id,
                    first_name: pdData.first_name,
                    last_name: pdData.last_name || '',
                    gender: pdData.gender,
                    dob: `${year}-${month}-${day}`
                  };
                }
              }
            }

            if (orderData.service_order?.appointment) {
              (orderData as any).service_order.appointment.patient = patient;
            }

            const serviceId = (orderData as any).service_order?.service_id;
            let params: any[] = [];
            if (serviceId) {
              const { data: pData } = await supabase
                .from('lims_service_parameters')
                .select(`
                  *,
                  lims_reference_ranges (
                    *
                  )
                `)
                .eq('service_id', serviceId)
                .eq('status', 'Active')
                .order('sort_order');
              
              if (pData) {
                const roots = pData.filter((p: any) => !p.parent_id);
                const children = pData.filter((p: any) => p.parent_id);
                const sorted: any[] = [];
                roots.forEach(root => {
                  sorted.push(root);
                  const rootChildren = children.filter(child => child.parent_id === root.id);
                  sorted.push(...rootChildren);
                });
                const orphans = children.filter(child => !roots.some(r => r.id === child.parent_id));
                sorted.push(...orphans);
                params = sorted;
              } else {
                params = [];
              }
            }

            const { data: samplesData } = await supabase
              .from('lims_samples')
              .select(`
                *,
                specimen:specimen_id ( id, name, code ),
                container:container_id ( id, name, code )
              `)
              .eq('lab_order_id', selectedOrder.id);

            const { data: resultsData } = await supabase
              .from('lims_results')
              .select('*')
              .eq('lab_order_id', selectedOrder.id);

            data = {
              order: orderData,
              parameters: params,
              samples: samplesData || [],
              results: resultsData || []
            };
            success = true;
          }
        }

        if (success && data) {
          const pat = data.order?.service_order?.appointment?.patient || {};
          
          // Match reference ranges dynamically
          const gender = pat.gender || 'All';
          let ageYears = 30;
          if (pat.dob) {
            const dob = new Date(pat.dob);
            ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }

          const params = data.parameters || [];
          const list: ResultRow[] = params.map((p: any) => {
            const ranges = p.lims_reference_ranges || [];
            const match = ranges.find((r: any) => {
              const genderMatch = r.gender === 'All' || r.gender === gender;
              const ageMatch = ageYears >= Number(r.age_min) && ageYears <= Number(r.age_max);
              return genderMatch && ageMatch;
            }) || ranges[0] || {};

            const existRes = data.results?.find((r: any) => r.parameter_id === p.id);

            return {
              parameterId: p.id,
              name: p.name,
              code: p.code,
              value: existRes?.value || '',
              flag: existRes?.flag || '',
              unit: match.unit || '',
              refRangeText: match.ref_min && match.ref_max ? `${match.ref_min} - ${match.ref_max}` : 'N/A',
              method: p.result_type || 'Numeric',
              refMin: match.ref_min ? parseFloat(match.ref_min) : null,
              refMax: match.ref_max ? parseFloat(match.ref_max) : null,
              critMin: match.critical_min ? parseFloat(match.critical_min) : null,
              critMax: match.critical_max ? parseFloat(match.critical_max) : null,
              
              // New mappings
              parentId: p.parent_id || undefined,
              resultType: p.result_type || 'Numeric',
              isMandatory: p.is_mandatory ?? true,
              isDerived: p.is_derived ?? false,
              isParameterSum: p.is_parameter_sum ?? false,
              isActive: p.is_active ?? true
            };
          });

          // Run evaluation for existing results values
          list.forEach(item => {
            if (item.value) {
              item.flag = evaluateValueFlag(item, item.value);
            }
          });

          setResultsList(list);
          setSelectedOrderSamples(data.samples || []);

          // Populate QC and details fields
          if (data.order?.instrument_run_id) setInstrumentRunId(data.order.instrument_run_id);
          if (data.order?.rack_position) setRackPosition(data.order.rack_position);
          if (data.order?.test_notes) setTestNotes(data.order.test_notes);
          if (data.order?.clinical_comments) setClinicalComments(data.order.clinical_comments);
          if (data.order?.qc_passed !== undefined) setQcPassed(data.order.qc_passed);
          if (data.order?.reagent_in_date !== undefined) setReagentInDate(data.order.reagent_in_date);
          if (data.order?.calibration_verified !== undefined) setCalibrationVerified(data.order.calibration_verified);
          if (data.order?.maintenance_ok !== undefined) setMaintenanceOk(data.order.maintenance_ok);
          if (data.order?.duplicate_run_required !== undefined) setDuplicateRunRequired(data.order.duplicate_run_required);
          if (data.order?.control_lot_no) setControlLotNo(data.order.control_lot_no);
          if (data.order?.reagent_lot_no) setReagentLotNo(data.order.reagent_lot_no);
          if (data.order?.test_method) setTestMethod(data.order.test_method);
          if (data.order?.analyzer_channel) setAnalyzerChannel(data.order.analyzer_channel);
          if (data.order?.result_status) setResultStatus(data.order.result_status);

          // Fetch patient's previous historical results
          fetchPatientHistory(pat.id);
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchSelectedOrderDetails();
  }, [selectedOrder]);

  const fetchPatientHistory = async (patientId: string) => {
    try {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', patientId);
      const appIds = appts?.map(a => a.id) || [];

      if (appIds.length > 0) {
        const { data: srvs } = await supabase
          .from('service_orders')
          .select('id')
          .in('appointment_id', appIds);
        const sIds = srvs?.map(s => s.id) || [];

        if (sIds.length > 0) {
          const { data: prevOrdersList } = await supabase
            .from('lims_lab_orders')
            .select('id, certified_at, service_order:service_order_id ( service_name )')
            .eq('status', 'Certified')
            .neq('id', selectedOrder?.id)
            .in('service_order_id', sIds);
          
          const prevOids = prevOrdersList?.map(o => o.id) || [];
          if (prevOids.length > 0) {
            const { data: resData } = await supabase
              .from('lims_results')
              .select(`
                value,
                flag,
                captured_at,
                parameter:parameter_id (
                  name,
                  code
                )
              `)
              .in('lab_order_id', prevOids)
              .order('captured_at', { ascending: false });
            
            setPreviousResults(resData || []);
          } else {
            setPreviousResults([]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching patient history:', err);
    }
  };

  // Evaluate result flag
  const evaluateValueFlag = (row: ResultRow, valStr: string): 'Normal' | 'High' | 'Low' | 'Critical' | '' => {
    if (!valStr.trim()) return '';
    const val = parseFloat(valStr);
    if (isNaN(val)) return 'Normal';

    // Verify Critical ranges first
    if (row.critMin !== null && val <= row.critMin) return 'Critical';
    if (row.critMax !== null && val >= row.critMax) return 'Critical';

    // Verify standard reference ranges
    if (row.refMin !== null && val < row.refMin) return 'Low';
    if (row.refMax !== null && val > row.refMax) return 'High';

    return 'Normal';
  };

  // Evaluate inline result flag
  const evaluateInlineValueFlag = (param: any, valStr: string, patientGender: string, patientAgeText: string): 'Normal' | 'High' | 'Low' | 'Critical' | '' => {
    if (!valStr.trim()) return '';
    const val = parseFloat(valStr);
    if (isNaN(val)) return 'Normal';

    // Parse age
    let ageYears = 30;
    if (patientAgeText) {
      const match = patientAgeText.match(/(\d+)/);
      if (match) ageYears = parseInt(match[1]);
    }

    const ranges = param.lims_reference_ranges || [];
    const matchedRange = ranges.find((r: any) => {
      const genderMatch = r.gender === 'All' || r.gender === patientGender;
      const ageMatch = ageYears >= Number(r.age_min) && ageYears <= Number(r.age_max);
      return genderMatch && ageMatch;
    }) || ranges[0] || {};

    const critMin = matchedRange.critical_min ? parseFloat(matchedRange.critical_min) : null;
    const critMax = matchedRange.critical_max ? parseFloat(matchedRange.critical_max) : null;
    const refMin = matchedRange.ref_min ? parseFloat(matchedRange.ref_min) : (matchedRange.ref_min === 0 || matchedRange.ref_min === '0') ? 0 : null;
    const refMax = matchedRange.ref_max ? parseFloat(matchedRange.ref_max) : null;

    if (critMin !== null && val <= critMin) return 'Critical';
    if (critMax !== null && val >= critMax) return 'Critical';
    if (refMin !== null && val < refMin) return 'Low';
    if (refMax !== null && val > refMax) return 'High';

    return 'Normal';
  };

  const openParameterModal = (order: OrderRecord, params: any[]) => {
    setParamModalOrder(order);
    setParamModalParams(params);
    setShowParamModal(true);
  };

  const handleInlineResultChange = (orderId: string, parameterId: string, value: string) => {
    setInlineResults(prev => ({
      ...prev,
      [`${orderId}_${parameterId}`]: value
    }));
  };

  const handleSaveInlineResults = async (orderId: string, orderParams: any[]) => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();

      // Gather result values from state (excluding Headings and Inactive parameters)
      const resultsToSave = orderParams
        .filter(p => (p.result_type || p.resultType || p.resultType) !== 'Heading' && (p.is_active ?? p.isActive ?? true) !== false)
        .map(p => {
          const value = inlineResults[`${orderId}_${p.id}`] || '';
          return {
            parameterId: p.id,
            value
          };
        });

      // Send payload to save API
      const payload = {
        labOrderId: orderId,
        userId: currentUserId,
        results: resultsToSave,
        resultStatus: 'Final', // Default to Final report status for inline save
        qcPassed: true,
        reagentInDate: true,
        calibrationVerified: true,
        maintenanceOk: true
      };

      let success = false;
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/lims/results/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              success = true;
            }
          }
        } catch (fetchErr) {
          console.error("Save inline results API failed, executing fallback:", fetchErr);
        }
      }

      if (!success) {
        // Fallback to direct supabase updates
        for (const r of resultsToSave) {
          const { data: rangeData } = await supabase
            .from('lims_reference_ranges')
            .select('*')
            .eq('parameter_id', r.parameterId)
            .eq('status', 'Active');

          let flag = 'Normal';
          if (rangeData && rangeData.length > 0) {
            const range = rangeData[0];
            const valNum = parseFloat(r.value);
            if (!isNaN(valNum)) {
              if (range.critical_min && valNum < Number(range.critical_min)) flag = 'Critical';
              else if (range.critical_max && valNum > Number(range.critical_max)) flag = 'Critical';
              else if (range.ref_min && valNum < Number(range.ref_min)) flag = 'Low';
              else if (range.ref_max && valNum > Number(range.ref_max)) flag = 'High';
            }
          }

          const { data: existing } = await supabase
            .from('lims_results')
            .select('id')
            .eq('lab_order_id', orderId)
            .eq('parameter_id', r.parameterId)
            .single();

          const resultData = {
            value: r.value,
            flag,
            captured_by: currentUserId,
            captured_at: new Date().toISOString()
          };

          let { error: saveErr } = existing
            ? await supabase.from('lims_results').update(resultData).eq('id', existing.id)
            : await supabase.from('lims_results').insert({
                id: crypto.randomUUID(),
                lab_order_id: orderId,
                parameter_id: r.parameterId,
                ...resultData
              });

          if (saveErr && saveErr.code === '23503') {
            const cleanData = { ...resultData, captured_by: null };
            if (existing) {
              await supabase.from('lims_results').update(cleanData).eq('id', existing.id);
            } else {
              await supabase.from('lims_results').insert({
                id: crypto.randomUUID(),
                lab_order_id: orderId,
                parameter_id: r.parameterId,
                ...cleanData
              });
            }
          }
        }

        const now = new Date().toISOString();
        let { error: orderErr } = await supabase
          .from('lims_lab_orders')
          .update({
            status: 'Result',
            result_captured_at: now,
            result_captured_by: currentUserId
          })
          .eq('id', orderId);

        if (orderErr && orderErr.code === '23503') {
          await supabase
            .from('lims_lab_orders')
            .update({
              status: 'Result',
              result_captured_at: now,
              result_captured_by: null
            })
            .eq('id', orderId);
        }
        success = true;
      }

      if (success) {
        alert('Results saved successfully.');
        // Refresh worklist
        await fetchWorklist();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'Result' } : null);
        }
      } else {
        alert('Failed to save results.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving results.');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (index: number, val: string) => {
    setResultsList(prev => {
      const updated = [...prev];
      const item = updated[index];
      const flag = evaluateValueFlag(item, val);
      updated[index] = { ...item, value: val, flag };
      return updated;
    });
  };

  // Save Results handler
  const handleSaveResults = async (draft = false) => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();

      const payload = {
        labOrderId: selectedOrder.id,
        userId: currentUserId,
        results: resultsList.map(r => ({
          parameterId: r.parameterId,
          value: r.value
        })),
        instrumentRunId,
        rackPosition,
        equipmentId: selectedEquipmentId,
        testNotes,
        clinicalComments,
        resultStatus: draft ? 'Preliminary' : resultStatus,
        qcPassed,
        reagentInDate,
        calibrationVerified,
        maintenanceOk,
        duplicateRunRequired,
        controlLotNo,
        reagentLotNo,
        calibrationDate: calibrationDate || null,
        expiryDate: expiryDate || null,
        testMethod,
        analyzerChannel
      };

      let success = false;
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/lims/results/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              success = true;
            }
          }
        } catch (fetchErr) {
          console.error("Save manual results API failed, executing fallback:", fetchErr);
        }
      }

      if (!success) {
        // Fallback to direct supabase updates
        for (const r of payload.results) {
          const { data: rangeData } = await supabase
            .from('lims_reference_ranges')
            .select('*')
            .eq('parameter_id', r.parameterId)
            .eq('status', 'Active');

          let flag = 'Normal';
          if (rangeData && rangeData.length > 0) {
            const range = rangeData[0];
            const valNum = parseFloat(r.value);
            if (!isNaN(valNum)) {
              if (range.critical_min && valNum < Number(range.critical_min)) flag = 'Critical';
              else if (range.critical_max && valNum > Number(range.critical_max)) flag = 'Critical';
              else if (range.ref_min && valNum < Number(range.ref_min)) flag = 'Low';
              else if (range.ref_max && valNum > Number(range.ref_max)) flag = 'High';
            }
          }

          const { data: existing } = await supabase
            .from('lims_results')
            .select('id')
            .eq('lab_order_id', selectedOrder.id)
            .eq('parameter_id', r.parameterId)
            .single();

          const resultData = {
            value: r.value,
            flag,
            captured_by: currentUserId,
            captured_at: new Date().toISOString()
          };

          let { error: saveErr } = existing
            ? await supabase.from('lims_results').update(resultData).eq('id', existing.id)
            : await supabase.from('lims_results').insert({
                id: crypto.randomUUID(),
                lab_order_id: selectedOrder.id,
                parameter_id: r.parameterId,
                ...resultData
              });

          if (saveErr && saveErr.code === '23503') {
            const cleanData = { ...resultData, captured_by: null };
            if (existing) {
              await supabase.from('lims_results').update(cleanData).eq('id', existing.id);
            } else {
              await supabase.from('lims_results').insert({
                id: crypto.randomUUID(),
                lab_order_id: selectedOrder.id,
                parameter_id: r.parameterId,
                ...cleanData
              });
            }
          }
        }

        const now = new Date().toISOString();
        const updateFields = {
          status: draft ? 'In Process' : 'Result',
          result_captured_at: now,
          result_captured_by: currentUserId,
          instrument_run_id: instrumentRunId || null,
          rack_position: rackPosition || null,
          test_notes: testNotes || null,
          clinical_comments: clinicalComments || null,
          result_status: draft ? 'Preliminary' : resultStatus,
          qc_passed: qcPassed,
          reagent_in_date: reagentInDate,
          calibration_verified: calibrationVerified,
          maintenance_ok: maintenanceOk,
          duplicate_run_required: duplicateRunRequired,
          control_lot_no: controlLotNo || null,
          reagent_lot_no: reagentLotNo || null,
          calibration_date: calibrationDate || null,
          expiry_date: expiryDate || null,
          test_method: testMethod || null,
          analyzer_channel: analyzerChannel || null
        };

        let { error: orderErr } = await supabase
          .from('lims_lab_orders')
          .update(updateFields)
          .eq('id', selectedOrder.id);

        if (orderErr && orderErr.code === '23503') {
          const cleanFields = {
            ...updateFields,
            result_captured_by: null
          };
          await supabase
            .from('lims_lab_orders')
            .update(cleanFields)
            .eq('id', selectedOrder.id);
        }
        success = true;
      }

      if (success) {
        alert(draft ? 'Results saved as draft.' : 'Results submitted successfully.');
        fetchWorklist();
        fetchStats();
        setSelectedOrder(prev => prev ? { ...prev, status: draft ? 'In Process' : 'Result' } : null);
      } else {
        alert('Failed to save results.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving results.');
    } finally {
      setSaving(false);
    }
  };

  // Certify (F4) handler — two-phase flow with mandatory stock check
  const handleCertifyAction = async (inOverrideMode = false, supervisorReason?: string) => {
    const targetIds = selectedOrderIds.length > 0 
      ? selectedOrderIds 
      : (selectedOrder ? [selectedOrder.id] : []);

    if (targetIds.length === 0) {
      alert('Please select at least one order from the worklist (by checking the checkbox or clicking a row) first.');
      return;
    }

    // Filter to only include orders that are in 'Result' status
    const resultOrders = orders.filter(o => targetIds.includes(o.id) && o.status === 'Result');
    if (resultOrders.length === 0) {
      alert('Only orders with "Result Entered" status can be certified.');
      return;
    }

    // OPTION A: If backend is unavailable, block certification entirely.
    if (!BACKEND_URL) {
      alert('Certification unavailable — system is reconnecting. Please try again when the connection is restored.');
      return;
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();
      let certifiedCount = 0;
      const shortfallOrders: OrderRecord[] = [];
      let shortfallDetails: any[] = [];

      for (const order of resultOrders) {
        // Build the request payload — NO hardcoded comments.
        // overrideReason is only sent on the second (override) attempt.
        const payload: any = {
          labOrderId: order.id,
          targetStatus: 'Certified',
          userId: currentUserId
        };
        if (inOverrideMode && supervisorReason) {
          payload.overrideReason = supervisorReason;
        }

        let apiSuccess = false;
        let isShortfall = false;

        try {
          const response = await fetch(`${BACKEND_URL}/api/lims/transition`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            apiSuccess = true;
          } else if (response.status === 400) {
            const errBody = await response.json();
            if (errBody.code === 'SHORTFALL') {
              // Backend blocked due to insufficient reagent stock
              isShortfall = true;
              shortfallOrders.push(order);
              // Parse shortfall details — backend returns them as a JSON string in 'details'
              try {
                const parsed = typeof errBody.details === 'string'
                  ? JSON.parse(errBody.details)
                  : errBody.details;
                if (Array.isArray(parsed)) {
                  shortfallDetails = [...shortfallDetails, ...parsed];
                }
              } catch {
                shortfallDetails.push({ item_name: 'Unknown Reagent', available_base_uom: 0, required_base_uom: 0 });
              }
            }
          }
        } catch (fetchErr) {
          // Network error — backend is down. Block certification (Option A).
          console.error('Certify API unreachable:', fetchErr);
          alert('Certification unavailable — system is reconnecting. Please try again when the connection is restored.');
          setSaving(false);
          return;
        }

        if (apiSuccess) {
          certifiedCount++;
        }
      }

      // If any orders had insufficient stock, show the supervisor override modal
      if (shortfallOrders.length > 0) {
        // De-duplicate shortfall details by item name
        const uniqueShortfalls = shortfallDetails.filter(
          (v, i, a) => a.findIndex(t => t.item_name === v.item_name) === i
        );
        setOverridePendingOrders(shortfallOrders);
        setOverrideModalShortfalls(uniqueShortfalls);
        setOverrideReason('');
        setOverrideReasonError('');
        setShowOverrideModal(true);
        // Don't close saving yet — modal is now open
        if (certifiedCount > 0) {
          fetchWorklist();
          fetchStats();
        }
        setSaving(false);
        return;
      }

      if (certifiedCount > 0) {
        alert(`${certifiedCount} order(s) certified successfully.`);
        setSelectedOrderIds([]);
        fetchWorklist();
        fetchStats();
        if (selectedOrder && targetIds.includes(selectedOrder.id)) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'Certified' } : null);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error certifying results.');
    } finally {
      setSaving(false);
    }
  };

  // Submit override from the supervisor modal
  const handleOverrideSubmit = async () => {
    const trimmedReason = overrideReason.trim();
    if (trimmedReason.length < 5) {
      setOverrideReasonError('Reason must be at least 5 characters long.');
      return;
    }
    setShowOverrideModal(false);
    // Re-run certification for the pending orders using the supervisor reason
    const token = await getAuthToken();
    const currentUserId = getLoggedInUserId();
    let certifiedCount = 0;
    setSaving(true);
    try {
      for (const order of overridePendingOrders) {
        const response = await fetch(`${BACKEND_URL}/api/lims/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            labOrderId: order.id,
            targetStatus: 'Certified',
            userId: currentUserId,
            overrideReason: trimmedReason
          })
        });
        if (response.ok) certifiedCount++;
      }
      if (certifiedCount > 0) {
        alert(`${certifiedCount} order(s) certified with supervisor override.`);
        setSelectedOrderIds([]);
        setOverridePendingOrders([]);
        fetchWorklist();
        fetchStats();
        if (selectedOrder && overridePendingOrders.some(o => o.id === selectedOrder.id)) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'Certified' } : null);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error during override certification.');
    } finally {
      setSaving(false);
    }
  };

  // Retest (F8) handler
  const handleRetestAction = async () => {
    const targetIds = selectedOrderIds.length > 0 
      ? selectedOrderIds 
      : (selectedOrder ? [selectedOrder.id] : []);

    if (targetIds.length === 0) {
      alert('Please select at least one order to re-test.');
      return;
    }

    const confirmRetest = window.confirm(`Are you sure you want to trigger a ReTest for the selected ${targetIds.length} order(s)?`);
    if (!confirmRetest) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();
      let successCount = 0;

      for (const orderId of targetIds) {
        let success = false;
        if (BACKEND_URL) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/lims/transition`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                labOrderId: orderId,
                targetStatus: 'Accepted',
                userId: currentUserId,
                comments: 'Certified report ordered for re-testing'
              })
            });

            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                success = true;
              }
            }
          } catch (fetchErr) {
            console.error("Retest API failed, executing fallback:", fetchErr);
          }
        }

        if (!success) {
          await supabase
            .from('lims_results')
            .delete()
            .eq('lab_order_id', orderId);

          let { error } = await supabase
            .from('lims_lab_orders')
            .update({
              status: 'Accepted',
              result_captured_at: null,
              result_captured_by: null,
              certified_at: null,
              certified_by: null
            })
            .eq('id', orderId);

          if (error && error.code === '23503') {
            await supabase
              .from('lims_lab_orders')
              .update({
                status: 'Accepted',
                result_captured_at: null,
                result_captured_by: null,
                certified_at: null,
                certified_by: null
              })
              .eq('id', orderId);
          }
          success = true;
        }
        if (success) {
          successCount++;
        }
      }

      alert(`ReTest triggered for ${successCount} order(s). Selected order(s) moved back to Pending.`);
      setSelectedOrderIds([]);
      fetchWorklist();
      fetchStats();
      if (selectedOrder && targetIds.includes(selectedOrder.id)) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'Accepted' } : null);
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering ReTest.');
    } finally {
      setSaving(false);
    }
  };

  // Recollection (F9) handler
  const handleRecollectionAction = async () => {
    if (!selectedOrder) {
      alert('Please select an order first.');
      return;
    }

    const confirmRecoll = window.confirm('Revert collection? This will clear current sample records and set order to "Ordered" status.');
    if (!confirmRecoll) return;

    setSaving(true);
    try {
      // Revert status to Ordered
      const { error: updErr } = await supabase
        .from('lims_lab_orders')
        .update({
          status: 'Ordered',
          collected_at: null,
          collected_by: null,
          accepted_at: null,
          accepted_by: null,
          result_captured_at: null,
          result_captured_by: null
        })
        .eq('id', selectedOrder.id);

      if (updErr) throw updErr;

      // Delete sample entries
      await supabase.from('lims_samples').delete().eq('lab_order_id', selectedOrder.id);
      
      // Log audit trail
      const currentUserId = getLoggedInUserId();
      await supabase.from('lims_audit_trail').insert({
        lab_order_id: selectedOrder.id,
        from_status: selectedOrder.status,
        to_status: 'Ordered',
        action_taken: 'Request Recollection',
        performed_by: currentUserId,
        comments: 'Recollection requested. Prior samples cleared.'
      });

      alert('Sample marked for recollection successfully.');
      fetchWorklist();
      fetchStats();
      setSelectedOrder(prev => prev ? { ...prev, status: 'Ordered' } : null);
    } catch (err) {
      console.error(err);
      alert('Error during recollection request.');
    } finally {
      setSaving(false);
    }
  };

  // Rectify (F6) / Amendment handler
  const handleRectifyAction = async () => {
    if (!selectedOrder) {
      alert('Please select an order first.');
      return;
    }

    if (selectedOrder.status !== 'Certified') {
      alert('Rectify action is only available for Certified results.');
      return;
    }

    const reason = window.prompt('Enter reason for Result Amendment / Rectification:');
    if (!reason) {
      alert('Amendment reason is required.');
      return;
    }

    setSaving(true);
    try {
      const currentUserId = getLoggedInUserId();
      const token = await getAuthToken();

      let success = false;
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/lims/transition`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              labOrderId: selectedOrder.id,
              targetStatus: 'In Process',
              userId: currentUserId,
              comments: `Amendment requested: ${reason}`
            })
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              success = true;
            }
          }
        } catch (fetchErr) {
          console.error("Rectify API failed, executing fallback:", fetchErr);
        }
      }

      if (!success) {
        let { error } = await supabase
          .from('lims_lab_orders')
          .update({
            status: 'In Process',
            result_captured_at: null,
            result_captured_by: null,
            certified_at: null,
            certified_by: null
          })
          .eq('id', selectedOrder.id);

        if (error && error.code === '23503') {
          await supabase
            .from('lims_lab_orders')
            .update({
              status: 'In Process',
              result_captured_at: null,
              result_captured_by: null,
              certified_at: null,
              certified_by: null
            })
            .eq('id', selectedOrder.id);
        }
        success = true;
      }

      if (success) {
        alert('Results unlocked for editing.');
        fetchWorklist();
        fetchStats();
        setSelectedOrder(prev => prev ? { ...prev, status: 'In Process' } : null);
      } else {
        alert('Failed to unlock results.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate formulas (F11) handler
  const handleCalculateAction = () => {
    if (resultsList.length === 0) return;

    // Check for Lipid Profile (TC, HDL, TG -> LDL calculation)
    const tcVal = parseFloat(resultsList.find(r => r.code.toUpperCase() === 'TC' || r.code.toUpperCase() === 'CHO')?.value || '');
    const hdlVal = parseFloat(resultsList.find(r => r.code.toUpperCase() === 'HDL')?.value || '');
    const tgVal = parseFloat(resultsList.find(r => r.code.toUpperCase() === 'TG')?.value || '');

    if (!isNaN(tcVal) && !isNaN(hdlVal) && !isNaN(tgVal)) {
      const calculatedLdl = (tcVal - hdlVal - (tgVal / 5)).toFixed(1);
      
      setResultsList(prev => prev.map(row => {
        if (row.code.toUpperCase() === 'LDL') {
          return {
            ...row,
            value: calculatedLdl,
            flag: evaluateValueFlag(row, calculatedLdl)
          };
        }
        return row;
      }));
      alert('LDL calculated successfully using Friedewald Equation.');
    } else {
      alert('Derived calculations check: No matching formulas (e.g. Lipid Profile) fully filled yet.');
    }
  };

  // Focus result entry input field (F7)
  const resultEntryInputRef = useRef<HTMLInputElement>(null);
  const handleFocusResultEntry = () => {
    setAccordionResultExpanded(true);
    setTimeout(() => {
      if (resultEntryInputRef.current) {
        resultEntryInputRef.current.focus();
      }
    }, 150);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        handleCertifyAction();
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleRectifyAction();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleFocusResultEntry();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleRetestAction();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleRecollectionAction();
      } else if (e.key === 'F10') {
        e.preventDefault();
        alert('Outsource Laboratory flag toggled. Custom tag added.');
      } else if (e.key === 'F11') {
        e.preventDefault();
        handleCalculateAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedOrder, resultsList]);

  // Handle Search and Filter submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorklist();
  };

  const handleResetFilters = () => {
    setSearchMrn('');
    setSearchBarcode('');
    setSearchSampleId('');
    setSearchInvestigation('All');
    setSearchPriority('All');
    setDateFrom('');
    setDateTo('');
    fetchWorklist();
  };

  // Pagination indexing
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = orders.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(orders.length / rowsPerPage);

  const criticalRow = resultsList.find(r => r.flag === 'Critical');
  const isViewMode = selectedOrder?.status === 'Certified';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 1. Header Banner */}
      <div className="flex justify-between items-center bg-white border border-slate-200/80 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/lims/dashboard')}
            className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-all active:scale-95"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Result Processing</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage and certify patient lab test results</p>
          </div>
        </div>

        {/* User profile & notification */}
        <div className="flex items-center gap-5">
          <button className="p-2.5 text-slate-450 hover:text-slate-650 hover:bg-slate-50 rounded-xl relative border border-slate-200/60 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white">5</span>
          </button>
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-5">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-inner border border-blue-500 select-none">
              {getLoggedInUser().split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{getLoggedInUser()}</p>
              <p className="text-[10px] text-slate-450 font-medium">Lab Technician</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filters Grid Panel */}
      <form onSubmit={handleSearchSubmit} className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MRN</label>
            <input 
              type="text" 
              placeholder="Enter MRN"
              value={searchMrn}
              onChange={e => setSearchMrn(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 focus:border-blue-600 placeholder:text-slate-350"
            />
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Barcode</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Scan or enter barcode"
                value={searchBarcode}
                onChange={e => setSearchBarcode(e.target.value)}
                className="bg-white border border-slate-250 rounded-xl pl-3 pr-8 py-2 text-xs w-full outline-none text-slate-700 focus:border-blue-600 placeholder:text-slate-350 font-mono"
              />
              <BarcodeIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sample ID</label>
            <input 
              type="text" 
              placeholder="Enter Sample ID"
              value={searchSampleId}
              onChange={e => setSearchSampleId(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 focus:border-blue-600 placeholder:text-slate-350"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Investigation</label>
            <select 
              value={searchInvestigation}
              onChange={e => setSearchInvestigation(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl p-2 text-xs w-full outline-none text-slate-700 focus:border-blue-600"
            >
              <option value="All">All Investigations</option>
              {investigationList.map((name, i) => (
                <option key={i} value={name}>{name}</option>
              ))}
              {investigationList.length === 0 && (
                <>
                  <option value="Complete Blood Picture (CBC)">Complete Blood Picture (CBC)</option>
                  <option value="Pregnancy Test – Serum">Pregnancy Test – Serum</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="Thyroid Profile">Thyroid Profile</option>
                  <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
            <select 
              value={searchPriority}
              onChange={e => setSearchPriority(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl p-2 text-xs w-full outline-none text-slate-700 focus:border-blue-600 font-semibold"
            >
              <option value="All">All</option>
              <option value="Routine">Routine</option>
              <option value="STAT">STAT</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date Range</label>
            <div className="flex items-center gap-1.5 bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 text-xs">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="outline-none w-24 text-[11px] text-slate-650"
              />
              <span className="text-slate-400 text-xxs font-bold">→</span>
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="outline-none w-24 text-[11px] text-slate-650"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button 
              type="button"
              onClick={handleResetFilters}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 px-3 rounded-xl transition-all active:scale-95 flex items-center justify-center"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">💡 Scan barcode to quickly load sample</p>
      </form>

      {/* 3. Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{stats.pending}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Result Entered */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Result Entered</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{stats.resultEntered}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Certified Today */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Certified Today</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{stats.certifiedToday}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* ReTest Requests */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ReTest Requests</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{stats.retestRequests}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4. Dual Panel Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Worklist Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
              <h3 className="text-sm font-extrabold text-slate-800">Worklist Results</h3>
              <div className="flex items-center gap-2">
                <span className="text-xxs font-bold text-slate-400">Rows per page:</span>
                <select 
                  value={rowsPerPage}
                  onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg p-1 text-xxs font-semibold outline-none focus:border-blue-600"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50/50 font-bold text-[10px] uppercase tracking-wider select-none">
                    <th className="py-3 px-4 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedOrderIds(orders.map(o => o.id));
                          else setSelectedOrderIds([]);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </th>
                    <th className="py-3 px-4">Sample ID</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Age / Sex</th>
                    <th className="py-3 px-4">Investigation</th>
                    <th className="py-3 px-4 text-center">Result</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((o) => {
                    const isSelected = selectedOrder?.id === o.id;
                    let statusColor = 'text-amber-500 bg-amber-50/80';
                    let statusDot = 'bg-amber-500';

                    if (o.status === 'Result') {
                      statusColor = 'text-blue-600 bg-blue-50/80';
                      statusDot = 'bg-blue-500';
                    } else if (o.status === 'Certified') {
                      statusColor = 'text-emerald-600 bg-emerald-50/80';
                      statusDot = 'bg-emerald-500';
                    }

                    return (
                      <tr 
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className={`border-b border-slate-100 hover:bg-slate-50/40 cursor-pointer transition-all duration-150 ${
                          isSelected ? 'bg-blue-50/15 border-l-4 border-l-blue-600 pl-3' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={() => {
                              setSelectedOrderIds(prev => 
                                prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
                              );
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-800 block font-mono">{o.barcodeNo}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{o.patientId.slice(0, 10)}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-850">
                          <span className="block">{o.patientName}</span>
                          <span className="text-[10px] text-blue-600/80 font-mono block mt-0.5 font-normal">{o.visitCode} • F</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-650">{o.patientAge} / {o.patientGender}</td>
                        <td className="py-3 px-4 font-bold text-slate-750">
                          {o.sourceProfileServiceName && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded mr-1.5 uppercase tracking-wide border border-blue-200">
                              {o.sourceProfileServiceName}
                            </span>
                          )}
                          {o.serviceName}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          {serviceResultTypes[o.serviceId || ''] === 'Parameter' ? (
                            <button
                              onClick={() => openParameterModal(o, worklistParams[o.serviceId || ''] || [])}
                              className="text-blue-600 hover:text-blue-850 hover:underline font-bold transition-all text-xs"
                            >
                              Parameter
                            </button>
                          ) : (
                            <div className="flex flex-col gap-2 items-center justify-center">
                              {(worklistParams[o.serviceId || ''] || []).map((param) => {
                                const isActive = param.is_active ?? param.isActive ?? true;
                                if (!isActive) return null;

                                const isHeading = (param.result_type || param.resultType) === 'Heading';
                                if (isHeading) {
                                  return (
                                    <div key={param.id} className="w-full text-[9px] font-black text-slate-550 border-t border-slate-100 pt-1 mt-1 uppercase select-none tracking-wider text-center">
                                      {param.name}
                                    </div>
                                  );
                                }

                                const isChild = !!(param.parent_id || param.parentId);
                                const valueKey = `${o.id}_${param.id}`;
                                const val = inlineResults[valueKey] || '';
                                const flag = evaluateInlineValueFlag(param, val, o.patientGender, o.patientAge);
                                
                                let inputStyle = 'border-slate-200 text-slate-800 focus:border-blue-600';
                                let flagStyle = 'bg-slate-100 text-slate-550 border-slate-200';
                                
                                if (flag === 'High') {
                                  inputStyle = 'border-rose-350 text-rose-700 bg-rose-50/30';
                                  flagStyle = 'bg-rose-50 text-rose-600 border-rose-200';
                                } else if (flag === 'Low') {
                                  inputStyle = 'border-blue-350 text-blue-700 bg-blue-50/30';
                                  flagStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                                } else if (flag === 'Critical') {
                                  inputStyle = 'border-red-500 ring-1 ring-red-100 text-red-700 font-bold bg-red-50/40';
                                  flagStyle = 'bg-red-600 text-white font-extrabold border-red-500';
                                } else if (flag === 'Normal') {
                                  inputStyle = 'border-emerald-350 text-emerald-700 bg-emerald-50/20';
                                  flagStyle = 'bg-emerald-50 text-emerald-600 border-emerald-250';
                                }

                                const isOrderCertified = o.status === 'Certified';

                                return (
                                  <div key={param.id} className={`flex items-center gap-2 justify-center w-full max-w-[200px] ${isChild ? 'pl-3' : ''}`}>
                                    {((worklistParams[o.serviceId || ''] || []).length > 1 || isChild) && (
                                      <span className="text-[10px] text-slate-500 font-semibold w-16 truncate text-right">
                                        {isChild ? '↳ ' : ''}{param.name}:
                                      </span>
                                    )}
                                    <input 
                                      type="text"
                                      value={val}
                                      onChange={e => handleInlineResultChange(o.id, param.id, e.target.value)}
                                      disabled={isOrderCertified}
                                      placeholder="Value"
                                      className={`w-20 px-2 py-1 border rounded-lg text-center font-bold text-xxs outline-none focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-50 disabled:text-slate-400 ${inputStyle}`}
                                    />
                                    {flag && (
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${flagStyle}`}>
                                        {flag}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Render a Save button for this row if not certified */}
                              {o.status !== 'Certified' && (worklistParams[o.serviceId || ''] || []).length > 0 && (
                                <button
                                  onClick={() => handleSaveInlineResults(o.id, worklistParams[o.serviceId || ''] || [])}
                                  className="mt-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                                >
                                  Save Results
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
                            <span>{o.status === 'Result' ? 'Result Entered' : o.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {o.priority === 'STAT' ? (
                            <span className="border border-rose-200 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50/30 uppercase tracking-wide">
                              STAT
                            </span>
                          ) : (
                            <span className="border border-blue-200 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50/30 uppercase tracking-wide">
                              Routine
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1" ref={activeDropdownId === o.id ? dropdownRef : undefined}>
                            <button 
                              onClick={() => setSelectedOrder(o)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors active:scale-90"
                              title="Load details & Capture result"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                            {/* ── Action Menu ── */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  if (activeDropdownId === o.id) {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  } else {
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    // Open above the button so it never gets clipped
                                    setDropdownPos({
                                      top: rect.top + window.scrollY - 6,   // small gap above
                                      left: rect.right + window.scrollX,    // right-align to button right
                                    });
                                    setActiveDropdownId(o.id);
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  activeDropdownId === o.id
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'hover:bg-slate-100 text-slate-400'
                                }`}
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        No lab orders match the filters selected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/30 select-none">
              <span className="text-xxs font-bold text-slate-400">
                Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, orders.length)} of {orders.length} results
              </span>
              
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-xxs font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  «
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-xxs font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`px-2 py-1 rounded text-xxs font-bold border ${
                      currentPage === idx + 1 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-xxs font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  ›
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-xxs font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fixed-position action dropdown portal (escapes overflow-hidden) ── */}
        {activeDropdownId && dropdownPos && (
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              transform: 'translateX(-100%) translateY(-100%)',
              zIndex: 9999,
            }}
          >
            <div
              className="bg-white border border-slate-200 rounded-xl py-1 min-w-[220px]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
            >
              {/* Tiny arrow pointing right toward the button */}
              <div
                style={{
                  position: 'absolute',
                  right: '-6px',
                  bottom: '10px',
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '6px solid #e2e8f0',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '-5px',
                  bottom: '10px',
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '6px solid #ffffff',
                }}
              />
              <button
                onClick={() => {
                  const order = orders.find(o => o.id === activeDropdownId);
                  if (order) handlePrintLabReport(order);
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                }}
                disabled={isPrinting}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-wait rounded-t-xl border-b border-slate-100"
              >
                <FileText className="w-4 h-4 shrink-0" />
                {isPrinting ? 'Generating PDF…' : 'Print Lab Report (Test wise)'}
              </button>
              <button
                onClick={() => {
                  const order = orders.find(o => o.id === activeDropdownId);
                  if (order) handleOpenTestTracking(order);
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors rounded-b-xl"
              >
                <History className="w-4 h-4 shrink-0 text-slate-400" />
                Test Tracking
              </button>
            </div>
          </div>
        )}

        {/* Right Side: Details Panel */}
        <div className="lg:col-span-4">
          {selectedOrder ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 animate-in slide-in-from-right duration-350">
              
              {/* Header card info */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-base shadow-inner">
                    {selectedOrder.patientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{selectedOrder.patientName}</h4>
                    <p className="text-xxs font-bold text-slate-400 mt-0.5">MRN: <span className="font-mono">{selectedOrder.patientId.slice(0, 10)}</span></p>
                    <p className="text-xxs text-slate-500 font-semibold">{selectedOrder.patientAge} / {selectedOrder.patientGender}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-1 hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600"
                    title="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-blue-600 hover:underline font-extrabold cursor-pointer select-none">View Profile</span>
                </div>
              </div>

              {/* Sample metadata list */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 text-slate-650">
                  <BarcodeIcon className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Sample ID:</span>
                  <span className="font-bold font-mono text-slate-800">{selectedOrder.barcodeNo}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-650">
                  <FileSpreadsheet className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Specimen:</span>
                  <span className="font-bold text-slate-850">{selectedOrderSamples[0]?.specimen?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-650">
                  <Calendar className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Collection Date:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.collectedAt ? new Date(selectedOrder.collectedAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-650">
                  <Clock className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Received Date:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.acceptedAt ? new Date(selectedOrder.acceptedAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-650">
                  <User className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Consulting Doctor:</span>
                  <span className="font-bold text-slate-850">{selectedOrder.consultingDoctor || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-650">
                  <Sliders className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="font-semibold text-slate-500">Accession No:</span>
                  <span className="font-bold font-mono text-slate-850">{selectedOrder.cptCode}</span>
                </div>
              </div>

              {/* Investigation details card */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Investigation Details</h5>
                
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-450 block">Investigation</span>
                    <span className="font-bold text-slate-800 block">{selectedOrder.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Method</span>
                    <select
                      value={testMethod}
                      onChange={e => setTestMethod(e.target.value)}
                      disabled={isViewMode}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xxs font-medium outline-none"
                    >
                      <option value="Automated">Automated</option>
                      <option value="Manual">Manual</option>
                      <option value="Enzymatic">Enzymatic</option>
                      <option value="HPLC">HPLC</option>
                      <option value="PCR">PCR</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Analyzer</span>
                    <select 
                      value={selectedEquipmentId}
                      onChange={e => setSelectedEquipmentId(e.target.value)}
                      disabled={isViewMode}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xxs font-medium w-full truncate outline-none"
                    >
                      {equipmentList.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}</option>
                      ))}
                      {equipmentList.length === 0 && <option value="">Sysmex X-1000</option>}
                    </select>
                  </div>
                  <div className="flex flex-col items-end justify-end">
                    <span className="text-blue-600 hover:underline text-xxs font-extrabold cursor-pointer select-none">View Test Details</span>
                  </div>
                </div>
              </div>

              {/* Collapsible Accordions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                
                {/* 1. Previous Results Accordion */}
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                  <div 
                    onClick={() => setAccordionPrevExpanded(!accordionPrevExpanded)}
                    className="flex justify-between items-center px-4 py-3 bg-slate-50/20 cursor-pointer select-none"
                  >
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      Previous Results ({previousResults.length})
                    </span>
                    {accordionPrevExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {accordionPrevExpanded && (
                    <div className="p-3 border-t border-slate-100 bg-white max-h-48 overflow-y-auto text-xxs space-y-2">
                      {previousResults.length > 0 ? (
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-450 text-left font-bold">
                              <th className="pb-1.5">Date</th>
                              <th className="pb-1.5">Parameter</th>
                              <th className="pb-1.5 text-center">Value</th>
                              <th className="pb-1.5">Flag</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previousResults.map((r, i) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0">
                                <td className="py-1 text-slate-500">{new Date(r.captured_at).toLocaleDateString()}</td>
                                <td className="py-1 font-bold text-slate-750">{r.parameter?.name}</td>
                                <td className="py-1 font-bold text-center font-mono">{r.value}</td>
                                <td className="py-1">
                                  {r.flag && (
                                    <span className={`px-1 rounded text-[8px] font-black uppercase ${
                                      r.flag === 'High' ? 'bg-rose-50 text-rose-600' :
                                      r.flag === 'Low' ? 'bg-blue-50 text-blue-600' :
                                      r.flag === 'Critical' ? 'bg-red-600 text-white' :
                                      'bg-emerald-50 text-emerald-600'
                                    }`}>
                                      {r.flag}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-slate-400 text-center py-2 font-medium">No previous certified test records available.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Comments Accordion */}
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                  <div 
                    onClick={() => setAccordionCommentsExpanded(!accordionCommentsExpanded)}
                    className="flex justify-between items-center px-4 py-3 bg-slate-50/20 cursor-pointer select-none"
                  >
                    <span className="text-xs font-extrabold text-slate-700">Comments</span>
                    {accordionCommentsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {accordionCommentsExpanded && (
                    <div className="p-3 border-t border-slate-100 bg-white">
                      <textarea
                        value={clinicalComments}
                        onChange={e => setClinicalComments(e.target.value)}
                        placeholder="Enter clinical notes, comments or pathologist remarks here..."
                        disabled={isViewMode}
                        className="w-full p-2 border border-slate-250 rounded-lg text-xs outline-none focus:border-blue-600 h-24 text-slate-750 resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center gap-3 min-h-[40vh]">
              <div className="p-4 rounded-full bg-slate-50 border border-slate-100 text-slate-350">
                <ClipboardList className="w-10 h-10" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No Patient Selected</h4>
              <p className="text-xxs text-slate-450 font-medium max-w-xs leading-relaxed">
                Select a patient row from the worklist results table on the left, or click their "Play" button to load details, run QC checks, and capture test results.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 5. Sticky Bottom Shortcut Actions Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-250/90 py-3 px-8 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleCertifyAction()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Press F4 to Certify Results"
          >
            <span className="bg-emerald-700/60 text-white font-extrabold text-[9px] px-1 rounded">F4</span>
            Certify <Check className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={handleRectifyAction}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Press F6 to unlock and edit certified results"
          >
            <span className="bg-purple-700/60 text-white font-extrabold text-[9px] px-1 rounded">F6</span>
            Rectify <Edit className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={handleFocusResultEntry}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Press F7 to focus the result entries"
          >
            <span className="bg-blue-700/60 text-white font-extrabold text-[9px] px-1 rounded">F7</span>
            Result Entry
          </button>

          <button 
            onClick={handleRetestAction}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Press F8 to order a ReTest"
          >
            <span className="bg-amber-600/60 text-white font-extrabold text-[9px] px-1 rounded">F8</span>
            ReTest <History className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={handleRecollectionAction}
            className="px-3.5 py-2 bg-slate-550 hover:bg-slate-650 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            title="Press F9 to request sample recollection"
          >
            <span className="bg-slate-650/60 text-white font-extrabold text-[9px] px-1 rounded">F9</span>
            Sample Recollection
          </button>

          <button 
            onClick={() => alert('Outsource Laboratory flag toggled. Custom tag added.')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all"
            title="Press F10 to flag test as outsourced"
          >
            <span className="bg-slate-300 text-slate-700 font-extrabold text-[9px] px-1 rounded">F10</span>
            Mark External
          </button>

          <button 
            onClick={handleCalculateAction}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all"
            title="Press F11 to compute derived parameters"
          >
            <span className="bg-slate-300 text-slate-700 font-extrabold text-[9px] px-1 rounded">F11</span>
            Calculate
          </button>
        </div>

        <button 
          onClick={() => setShowShortcutsHelp(true)}
          className="text-slate-400 hover:text-slate-600 p-1 flex items-center gap-1 text-xs font-semibold select-none"
        >
          <HelpCircle className="w-4 h-4" /> Shortcuts
        </button>
      </div>

      {/* Shortcuts overlay modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-blue-600" /> Workbench Shortcuts
              </h4>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 text-xs font-semibold text-slate-650">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Certify Results</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F4</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Unlock / Rectify results</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F6</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Focus Result Entries</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F7</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Request ReTest</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F8</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Request Sample Recollection</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F9</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Mark External Outsource</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F10</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>Calculate formulas</span>
                <kbd className="bg-slate-100 border border-slate-250 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 shadow-2xs">F11</kbd>
              </div>
            </div>

            <button 
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold py-2 rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Supervisor Override Modal — shown when reagent stock is insufficient */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100 rounded-t-2xl">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">Insufficient Reagent Stock</h3>
                <p className="text-xs text-red-600 mt-0.5">Certification is blocked — stock below required levels</p>
              </div>
            </div>

            {/* Shortfall Details */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Affected Reagents</p>
              <div className="space-y-2 mb-4">
                {overrideModalShortfalls.map((sf, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{sf.item_name || sf.item_code || 'Unknown Reagent'}</span>
                    <div className="text-right text-xs text-red-600 font-mono">
                      <span>Required: {Number(sf.required_base_uom || 0).toFixed(2)}</span>
                      <span className="mx-1 text-slate-300">|</span>
                      <span>Available: {Number(sf.available_base_uom || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Supervisor Override Reason Input */}
              <div className="mb-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Supervisor Override Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={e => { setOverrideReason(e.target.value); setOverrideReasonError(''); }}
                  placeholder="Enter a detailed reason for overriding the stock check (min. 5 characters)..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
                />
                {overrideReasonError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {overrideReasonError}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">This reason will be permanently recorded in the audit log.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => { setShowOverrideModal(false); setOverridePendingOrders([]); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? 'Certifying...' : 'Override & Certify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parameter entry modal */}
      {showParamModal && paramModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" /> Enter Parameters - {paramModalOrder.serviceName}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500 font-semibold">
                  <span>Patient: <strong className="text-slate-700">{paramModalOrder.patientName}</strong></span>
                  <span>MRN: <strong className="text-slate-700 font-mono">{paramModalOrder.patientId.slice(0, 10)}</strong></span>
                  <span>Age/Sex: <strong className="text-slate-700">{paramModalOrder.patientAge} / {paramModalOrder.patientGender}</strong></span>
                  <span>Barcode: <strong className="text-slate-700 font-mono">{paramModalOrder.barcodeNo}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => { setShowParamModal(false); setParamModalOrder(null); }}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parameters list / form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50/50 font-bold text-[10px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-4">Parameter Name</th>
                    <th className="py-2.5 px-4 text-center">Ref Range</th>
                    <th className="py-2.5 px-4 text-center">Unit</th>
                    <th className="py-2.5 px-4 text-center" style={{ width: '160px' }}>Value</th>
                    <th className="py-2.5 px-4 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {paramModalParams.map((param) => {
                    const isActive = param.is_active ?? param.isActive ?? true;
                    if (!isActive) return null;

                    const isHeading = (param.result_type || param.resultType) === 'Heading';
                    if (isHeading) {
                      return (
                        <tr key={param.id} className="bg-slate-50 border-y border-slate-200">
                          <td colSpan={5} className="py-2 px-4 font-extrabold text-xxs text-slate-600 uppercase tracking-wider">
                            {param.name}
                          </td>
                        </tr>
                      );
                    }

                    const isChild = !!(param.parent_id || param.parentId);
                    const valueKey = `${paramModalOrder.id}_${param.id}`;
                    const val = inlineResults[valueKey] || '';
                    const flag = evaluateInlineValueFlag(param, val, paramModalOrder.patientGender, paramModalOrder.patientAge);
                    const match = param.lims_reference_ranges?.find((r: any) => {
                      const gender = paramModalOrder.patientGender || 'All';
                      let ageYears = 30;
                      if (paramModalOrder.patientAge) {
                        const numericAge = parseInt(paramModalOrder.patientAge);
                        if (!isNaN(numericAge)) ageYears = numericAge;
                      }
                      const genderMatch = r.gender === 'All' || r.gender === gender;
                      const ageMatch = ageYears >= Number(r.age_min) && ageYears <= Number(r.age_max);
                      return genderMatch && ageMatch;
                    }) || param.lims_reference_ranges?.[0] || {};

                    const refRangeText = match.ref_min && match.ref_max ? `${match.ref_min} - ${match.ref_max}` : 'N/A';
                    const unitText = match.unit || 'N/A';

                    let inputStyle = 'border-slate-200 text-slate-800 focus:border-blue-600 focus:ring-blue-600/10';
                    let flagStyle = 'bg-slate-100 text-slate-550 border-slate-200';
                    
                    if (flag === 'High') {
                      inputStyle = 'border-rose-350 text-rose-700 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/10';
                      flagStyle = 'bg-rose-50 text-rose-600 border-rose-200';
                    } else if (flag === 'Low') {
                      inputStyle = 'border-blue-350 text-blue-700 bg-blue-50/30 focus:border-blue-500 focus:ring-blue-500/10';
                      flagStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                    } else if (flag === 'Critical') {
                      inputStyle = 'border-red-500 ring-1 ring-red-100 text-red-700 font-bold bg-red-50/40 focus:border-red-650 focus:ring-red-650/15';
                      flagStyle = 'bg-red-600 text-white font-extrabold border-red-500';
                    } else if (flag === 'Normal') {
                      inputStyle = 'border-emerald-350 text-emerald-700 bg-emerald-50/20 focus:border-emerald-500 focus:ring-emerald-500/10';
                      flagStyle = 'bg-emerald-50 text-emerald-600 border-emerald-250';
                    }

                    const isOrderCertified = paramModalOrder.status === 'Certified';

                    return (
                      <tr key={param.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                        <td className={`py-2.5 px-4 font-bold text-slate-750 ${isChild ? 'pl-8 border-l-2 border-l-blue-400' : ''}`}>
                          {param.name}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-500">{refRangeText}</td>
                        <td className="py-2.5 px-4 text-center font-medium text-slate-500">{unitText}</td>
                        <td className="py-2.5 px-4 text-center">
                          <input 
                            type="text"
                            value={val}
                            onChange={e => handleInlineResultChange(paramModalOrder.id, param.id, e.target.value)}
                            disabled={isOrderCertified}
                            placeholder="Enter result"
                            className={`w-full px-3 py-1.5 border rounded-lg text-center font-bold text-xs outline-none transition-all ${inputStyle}`}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {flag ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border select-none shrink-0 ${flagStyle}`}>
                              {flag}
                            </span>
                          ) : (
                            <span className="text-slate-350 text-[10px] select-none font-semibold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-150 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button 
                onClick={() => { setShowParamModal(false); setParamModalOrder(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl text-xs transition-colors active:scale-95"
              >
                Cancel
              </button>
              {paramModalOrder.status !== 'Certified' && (
                <button 
                  onClick={async () => {
                    if (!paramModalOrder) return;
                    setSaving(true);
                    await handleSaveInlineResults(paramModalOrder.id, paramModalParams);
                    setShowParamModal(false);
                    setParamModalOrder(null);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Test Tracking Modal ── */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Test Tracking
              </h3>
              <button 
                onClick={() => { setShowTrackingModal(false); setTrackingData(null); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Close
              </button>
            </div>

            {trackingLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Loading tracking logs...</span>
              </div>
            ) : trackingData ? (
              <div className="p-6 space-y-4 overflow-y-auto">
                {/* Banner Section (light green/yellow background) */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-bold text-emerald-800 leading-tight">
                    {trackingData.arabicName ? `${trackingData.arabicName}, ` : ''}{trackingData.patientName}, {trackingData.mrn}
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {trackingData.branchName}, {trackingData.visitNo}
                  </div>
                </div>

                {/* Metadata Section */}
                <div className="border-t border-slate-200 pt-3 flex flex-col gap-1 text-xs">
                  <div className="flex gap-2">
                    <span className="font-extrabold text-slate-800 w-24 shrink-0">Sample Id</span>
                    <span className="text-slate-700 font-semibold font-mono">{trackingData.sampleId}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-extrabold text-slate-800 w-24 shrink-0">Investigation</span>
                    <span className="text-slate-700 font-bold">{trackingData.investigation}</span>
                  </div>
                </div>

                {/* Table Grid (6 rows, 4 columns) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-4">
                  <table className="w-full text-xs text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Ordered By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.orderedBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Ordered Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.orderedDate}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Generated By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.generatedBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Generated Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.generatedDate}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Send By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.sendBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Send Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.sendDate}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Accepted By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.acceptedBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Accepted Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.acceptedDate}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Certified By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.certifiedBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Certified Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.certifiedDate}</td>
                      </tr>
                      <tr>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Rectified By</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold border-r border-slate-200">{trackingData.rectifiedBy}</td>
                        <td className="w-[18%] bg-slate-50/80 p-2.5 font-bold text-slate-750 border-r border-slate-200">Rectified Date</td>
                        <td className="w-[32%] p-2.5 text-slate-700 font-semibold">{trackingData.rectifiedDate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                Failed to load tracking records.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parameter entry modal */}
      {showParamModal && paramModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" /> Enter Parameters - {paramModalOrder.serviceName}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500 font-semibold">
                  <span>Patient: <strong className="text-slate-700">{paramModalOrder.patientName}</strong></span>
                  <span>MRN: <strong className="text-slate-700 font-mono">{paramModalOrder.patientId.slice(0, 10)}</strong></span>
                  <span>Age/Sex: <strong className="text-slate-700">{paramModalOrder.patientAge} / {paramModalOrder.patientGender}</strong></span>
                  <span>Barcode: <strong className="text-slate-700 font-mono">{paramModalOrder.barcodeNo}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => { setShowParamModal(false); setParamModalOrder(null); }}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parameters list / form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50/50 font-bold text-[10px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-4">Parameter Name</th>
                    <th className="py-2.5 px-4 text-center">Ref Range</th>
                    <th className="py-2.5 px-4 text-center">Unit</th>
                    <th className="py-2.5 px-4 text-center" style={{ width: '160px' }}>Value</th>
                    <th className="py-2.5 px-4 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {paramModalParams.map((param) => {
                    const isActive = param.is_active ?? param.isActive ?? true;
                    if (!isActive) return null;

                    const isHeading = (param.result_type || param.resultType) === 'Heading';
                    if (isHeading) {
                      return (
                        <tr key={param.id} className="bg-slate-50 border-y border-slate-200">
                          <td colSpan={5} className="py-2 px-4 font-extrabold text-xxs text-slate-600 uppercase tracking-wider">
                            {param.name}
                          </td>
                        </tr>
                      );
                    }

                    const isChild = !!(param.parent_id || param.parentId);
                    const valueKey = `${paramModalOrder.id}_${param.id}`;
                    const val = inlineResults[valueKey] || '';
                    const flag = evaluateInlineValueFlag(param, val, paramModalOrder.patientGender, paramModalOrder.patientAge);
                    const match = param.lims_reference_ranges?.find((r: any) => {
                      const gender = paramModalOrder.patientGender || 'All';
                      let ageYears = 30;
                      if (paramModalOrder.patientAge) {
                        const numericAge = parseInt(paramModalOrder.patientAge);
                        if (!isNaN(numericAge)) ageYears = numericAge;
                      }
                      const genderMatch = r.gender === 'All' || r.gender === gender;
                      const ageMatch = ageYears >= Number(r.age_min) && ageYears <= Number(r.age_max);
                      return genderMatch && ageMatch;
                    }) || param.lims_reference_ranges?.[0] || {};

                    const refRangeText = match.ref_min && match.ref_max ? `${match.ref_min} - ${match.ref_max}` : 'N/A';
                    const unitText = match.unit || 'N/A';

                    let inputStyle = 'border-slate-200 text-slate-800 focus:border-blue-600 focus:ring-blue-600/10';
                    let flagStyle = 'bg-slate-100 text-slate-550 border-slate-200';
                    
                    if (flag === 'High') {
                      inputStyle = 'border-rose-350 text-rose-700 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/10';
                      flagStyle = 'bg-rose-50 text-rose-600 border-rose-200';
                    } else if (flag === 'Low') {
                      inputStyle = 'border-blue-350 text-blue-700 bg-blue-50/30 focus:border-blue-500 focus:ring-blue-500/10';
                      flagStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                    } else if (flag === 'Critical') {
                      inputStyle = 'border-red-500 ring-1 ring-red-100 text-red-700 font-bold bg-red-50/40 focus:border-red-650 focus:ring-red-650/15';
                      flagStyle = 'bg-red-600 text-white font-extrabold border-red-500';
                    } else if (flag === 'Normal') {
                      inputStyle = 'border-emerald-350 text-emerald-700 bg-emerald-50/20 focus:border-emerald-500 focus:ring-emerald-500/10';
                      flagStyle = 'bg-emerald-50 text-emerald-600 border-emerald-250';
                    }

                    const isOrderCertified = paramModalOrder.status === 'Certified';

                    return (
                      <tr key={param.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                        <td className={`py-2.5 px-4 font-bold text-slate-750 ${isChild ? 'pl-8 border-l-2 border-l-blue-400' : ''}`}>
                          {param.name}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-500">{refRangeText}</td>
                        <td className="py-2.5 px-4 text-center font-medium text-slate-500">{unitText}</td>
                        <td className="py-2.5 px-4 text-center">
                          <input 
                            type="text"
                            value={val}
                            onChange={e => handleInlineResultChange(paramModalOrder.id, param.id, e.target.value)}
                            disabled={isOrderCertified}
                            placeholder="Enter result"
                            className={`w-full px-3 py-1.5 border rounded-lg text-center font-bold text-xs outline-none transition-all ${inputStyle}`}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {flag ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border select-none shrink-0 ${flagStyle}`}>
                              {flag}
                            </span>
                          ) : (
                            <span className="text-slate-350 text-[10px] select-none font-semibold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-150 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button 
                onClick={() => { setShowParamModal(false); setParamModalOrder(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl text-xs transition-colors active:scale-95"
              >
                Cancel
              </button>
              {paramModalOrder.status !== 'Certified' && (
                <button 
                  onClick={async () => {
                    if (!paramModalOrder) return;
                    setSaving(true);
                    await handleSaveInlineResults(paramModalOrder.id, paramModalParams);
                    setShowParamModal(false);
                    setParamModalOrder(null);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>

  );
}
