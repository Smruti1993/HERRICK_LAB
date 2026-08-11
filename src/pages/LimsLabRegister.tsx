import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../services/supabaseClient';
import {
  Search, RefreshCw, Download, Printer, FileText,
  ChevronDown, Filter, X, ClipboardList
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   LIMS → Report → Lab Register
   Real-time query of lims_lab_orders, joined with patients,
   service info, and consulting doctor.
   Patient Source column is intentionally excluded.
   ────────────────────────────────────────────────────────────── */

// Status filter options exactly matching the mockup (label → DB value mapping)
const STATUS_OPTIONS = [
  { label: '-- Select --',        db: '' },
  { label: 'Mark For External Lab', db: 'External' },
  { label: 'Receive Report',      db: 'ReceiveReport' },
  { label: 'Receive Sample',      db: 'Collected' },
  { label: 'Result Certified',    db: 'Certified' },
  { label: 'Result Entered',      db: 'Result' },
  { label: 'Result Interfaced',   db: 'Interfaced' },
  { label: 'Result Pending',      db: 'Accepted|In Process' },
  { label: 'Result Rectified',    db: 'Rectified' },
  { label: 'Result Rejected',     db: 'Rejected' },
  { label: 'Retest',              db: 'Retest' },
  { label: 'Send To External Lab', db: 'Sent' },
];

interface ReportRow {
  accessionNo: string;
  mrNo: string;
  patientName: string;
  investigation: string;
  receivedOn: string;
  receivedBy: string;
  remarks: string;
  consultingDoctor: string;
  currentStatus: string;
}

const statusDisplayLabel = (dbStatus: string): string => {
  const map: Record<string, string> = {
    Ordered:       'Order Placed',
    Collected:     'Sample Collected',
    Accepted:      'Result Pending',
    'In Process':  'Result Pending',
    Result:        'Result Entered',
    Certified:     'Result Certified',
    Rejected:      'Result Rejected',
    External:      'Mark For External Lab',
    Sent:          'Send To External Lab',
    Retest:        'Retest',
    Rectified:     'Result Rectified',
    Interfaced:    'Result Interfaced',
    ReceiveReport: 'Receive Report',
  };
  return map[dbStatus] || dbStatus;
};

const statusColor = (label: string) => {
  if (label.includes('Certified'))  return 'bg-emerald-100 text-emerald-700';
  if (label.includes('Pending'))    return 'bg-amber-100 text-amber-700';
  if (label.includes('Entered'))    return 'bg-blue-100 text-blue-700';
  if (label.includes('Rejected'))   return 'bg-rose-100 text-rose-700';
  if (label.includes('Collected'))  return 'bg-violet-100 text-violet-700';
  if (label.includes('Retest'))     return 'bg-orange-100 text-orange-700';
  return 'bg-slate-100 text-slate-600';
};

export default function LimsLabRegister() {
  const supabase = getSupabase();

  // ── Master data ──────────────────────────────────────────
  const [branches, setBranches]         = useState<any[]>([]);
  const [serviceCentres, setServiceCentres] = useState<any[]>([]);

  // ── Filters ──────────────────────────────────────────────
  const today       = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [branch,     setBranch]     = useState('');
  const [laboratory, setLaboratory] = useState('');
  const [status,     setStatus]     = useState('');   // label value from STATUS_OPTIONS
  const [fromDate,   setFromDate]   = useState(firstOfMonth);
  const [toDate,     setToDate]     = useState(today);

  // ── Report data ──────────────────────────────────────────
  const [rows,    setRows]    = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Active criteria for the report header block
  const [activeCriteria, setActiveCriteria] = useState<{
    branch: string; laboratory: string; status: string; fromDate: string; toDate: string;
  } | null>(null);

  // ── Load master data on mount ────────────────────────────
  useEffect(() => {
    const fetchMasters = async () => {
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (branchData && branchData.length > 0) {
        setBranches(branchData);
        setBranch(branchData[0].id); // default to first branch
      }

      const { data: scData } = await supabase
        .from('service_centres')
        .select('id, name')
        .eq('status', 'Active')
        .order('name');
      if (scData) setServiceCentres(scData);
    };
    fetchMasters();
  }, []);

  // ── DB status filter builder ─────────────────────────────
  const buildStatusFilter = (label: string): string[] => {
    const opt = STATUS_OPTIONS.find(o => o.label === label);
    if (!opt || !opt.db) return []; // empty = no filter
    return opt.db.split('|');
  };

  // ── Run the report ───────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setActiveCriteria({
      branch:     branches.find(b => b.id === branch)?.name || branch,
      laboratory: serviceCentres.find(s => s.id === laboratory)?.name || (laboratory ? laboratory : 'All'),
      status:     status || 'All',
      fromDate,
      toDate,
    });

    try {
      const dbStatuses = buildStatusFilter(status);

      // Build base query on lims_lab_orders with nested joins
      let query = supabase
        .from('lims_lab_orders')
        .select(`
          id,
          barcode_no,
          status,
          ordered_at,
          collected_at,
          received_at,
          received_by,
          collected_by,
          collection_remarks,
          lab_section,
          service:service_id (
            id,
            name,
            cpt_code
          ),
          service_order:service_order_id (
            id,
            service_name,
            service_center,
            ordering_doctor:ordering_doctor_id (
              first_name,
              last_name
            ),
            appointment:appointment_id (
              id,
              patient_id
            )
          )
        `)
        // Use new Date() so the browser converts the local date to the correct UTC offset
        .gte('ordered_at', new Date(`${fromDate}T00:00:00`).toISOString())
        .lte('ordered_at', new Date(`${toDate}T23:59:59`).toISOString())
        .order('ordered_at', { ascending: false });

      // Status filter
      if (dbStatuses.length === 1) {
        query = query.eq('status', dbStatuses[0]);
      } else if (dbStatuses.length > 1) {
        query = query.in('status', dbStatuses);
      }

      // Lab section / laboratory filter (service_center)
      if (laboratory) {
        const labName = serviceCentres.find(s => s.id === laboratory)?.name || '';
        if (labName) {
          query = query.ilike('lab_section', `%${labName}%`);
        }
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;

      if (!ordersData || ordersData.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // ── Client-side secondary date filter (Issue 2 fix) ──────────────
      // Restrict to rows whose *displayed* received/collected date also falls
      // within the selected window, so the Received On column is consistent.
      const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      const toMs   = new Date(`${toDate}T23:59:59`).getTime();
      const filteredOrders = (ordersData as any[]).filter(o => {
        const ts = o.received_at || o.collected_at || o.ordered_at;
        if (!ts) return true; // include orders with no timestamp (edge case)
        const t = new Date(ts).getTime();
        return t >= fromMs && t <= toMs;
      });

      if (filteredOrders.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Collect unique patient IDs to batch-fetch patients
      const resolveArr = (val: any) => (Array.isArray(val) ? val[0] : val);
      const patientIds: string[] = Array.from(new Set(
        filteredOrders.map((o: any) => resolveArr(o.service_order)?.appointment?.patient_id).filter(Boolean)
      ));

      // Collect received_by employee IDs
      const empIds: string[] = Array.from(new Set(
        filteredOrders.map((o: any) => o.received_by || o.collected_by).filter(Boolean)
      ));

      // Batch-fetch patients
      let patientsMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: ptData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);
        ptData?.forEach((p: any) => { patientsMap[p.id] = p; });

        // Fallback to patient_demographics for any missing IDs
        const missing = patientIds.filter(id => !patientsMap[id]);
        if (missing.length > 0) {
          const { data: pdData } = await supabase
            .from('patient_demographics')
            .select('id, first_name, last_name')
            .in('id', missing);
          pdData?.forEach((p: any) => { patientsMap[p.id] = p; });
        }
      }

      // Batch-fetch employees (received_by / collected_by)
      let employeesMap: Record<string, string> = {};
      if (empIds.length > 0) {
        const { data: empData } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', empIds);
        empData?.forEach((e: any) => {
          employeesMap[e.id] = `${e.first_name} ${e.last_name}`;
        });

        // Fallback to app_users for any missing (some systems save user ID not employee ID)
        const missingEmp = empIds.filter(id => !employeesMap[id]);
        if (missingEmp.length > 0) {
          const { data: usersData } = await supabase
            .from('app_users')
            .select('id, full_name, username')
            .in('id', missingEmp);
          usersData?.forEach((u: any) => {
            employeesMap[u.id] = u.full_name || u.username || u.id;
          });
        }
      }

      // Map to report rows (use filteredOrders, not raw ordersData)
      const mapped: ReportRow[] = filteredOrders.map((o: any) => {
        const svcOrder    = resolveArr(o.service_order);
        const appt        = svcOrder ? resolveArr(svcOrder.appointment) : null;
        const patient     = appt?.patient_id ? patientsMap[appt.patient_id] : null;
        const orderingDoc = svcOrder ? resolveArr(svcOrder.ordering_doctor) : null;
        const svc         = resolveArr(o.service);

        const mrNo = patient?.id || appt?.patient_id || '—';
        const patientName = patient
          ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
          : '—';

        const receivedEmpId = o.received_by || o.collected_by || '';
        const receivedByName = receivedEmpId
          ? (employeesMap[receivedEmpId] || receivedEmpId)
          : '—';

        const receivedTimestamp = o.received_at || o.collected_at || o.ordered_at || '';
        const receivedOn = receivedTimestamp
          ? new Date(receivedTimestamp).toLocaleString('en-GB', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : '—';

        const consultingDoctor = orderingDoc
          ? `${orderingDoc.first_name || ''} ${orderingDoc.last_name || ''}`.trim()
          : '—';

        const investigation = svc?.name || svcOrder?.service_name || '—';

        return {
          accessionNo:     o.barcode_no || o.id.slice(-8).toUpperCase(),
          mrNo,
          patientName,
          investigation,
          receivedOn,
          receivedBy:      receivedByName,
          remarks:         o.collection_remarks || '—',
          consultingDoctor,
          currentStatus:   statusDisplayLabel(o.status),
        };
      });

      setRows(mapped);
    } catch (err: any) {
      console.error('Lab Register fetch error:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branch, laboratory, status, fromDate, toDate, branches, serviceCentres]);

  // ── Reset ────────────────────────────────────────────────
  const handleReset = () => {
    setBranch(branches[0]?.id || '');
    setLaboratory('');
    setStatus('');
    setFromDate(firstOfMonth);
    setToDate(today);
    setRows([]);
    setSearched(false);
    setActiveCriteria(null);
  };

  // ── CSV Export ───────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Accession No / Sample Id', 'MRN', 'Patient Name', 'Investigation',
      'Received On', 'Received By', 'Remarks', 'Consulting Doctor', 'Current Status',
    ];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([
        `"${r.accessionNo}"`, `"${r.mrNo}"`, `"${r.patientName}"`, `"${r.investigation}"`,
        `"${r.receivedOn}"`, `"${r.receivedBy}"`, `"${r.remarks}"`,
        `"${r.consultingDoctor}"`, `"${r.currentStatus}"`,
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Lab_Register_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#1C58D9]" />
            Lab Register
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time registry of all lab orders with filtering by branch, lab section, status &amp; date
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={rows.length === 0}
            className="bg-[#1C58D9] hover:bg-[#1649bb] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* ── Criteria Selection Panel ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
          <Filter className="w-4 h-4 text-[#1C58D9]" />
          <h3 className="text-sm font-bold text-slate-700">Lab Register Filter Criteria</h3>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Branch */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Branch <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full appearance-none border border-slate-300 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-[#1C58D9] outline-none shadow-sm"
              >
                {branches.length === 0 && <option value="">Loading...</option>}
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Laboratory */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Laboratory
            </label>
            <div className="relative">
              <select
                value={laboratory}
                onChange={e => setLaboratory(e.target.value)}
                className="w-full appearance-none border border-slate-300 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-[#1C58D9] outline-none shadow-sm"
              >
                <option value="">-- Select --</option>
                {serviceCentres.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-rose-600 uppercase tracking-wide">
              Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full appearance-none border border-slate-300 rounded-lg px-3 pr-8 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-[#1C58D9] outline-none shadow-sm"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date pickers stacked in one grid-cell on mobile, or inline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-rose-600 uppercase tracking-wide">
              From Date <span className="text-slate-400 normal-case font-normal">→</span> To Date <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-[#1C58D9] outline-none shadow-sm"
              />
              <span className="text-slate-400 text-sm font-medium shrink-0">–</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-[#1C58D9] outline-none shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-5 flex items-center gap-3">
          <button
            onClick={handleSearch}
            disabled={loading || !branch}
            className="bg-[#1C58D9] hover:bg-[#1649bb] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {loading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button
            onClick={handleReset}
            className="bg-white border border-slate-300 text-slate-600 px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 transition-all"
          >
            <X className="w-4 h-4" /> Reset
          </button>
          {searched && (
            <span className="ml-auto text-xs font-medium text-slate-500">
              {rows.length} record{rows.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* ── Report Output (shown after search) ── */}
      {searched && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Criteria Header block (matches mockup print layout) */}
          {activeCriteria && (
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Criteria</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-1 text-xs">
                {[
                  { label: 'Branch',     val: activeCriteria.branch },
                  { label: 'Laboratory', val: activeCriteria.laboratory },
                  { label: 'Status',     val: activeCriteria.status },
                  { label: 'From Date',  val: activeCriteria.fromDate },
                  { label: 'To Date',    val: activeCriteria.toDate },
                ].map(item => (
                  <div key={item.label} className="flex flex-col">
                    <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">{item.label}</span>
                    <span className="font-bold text-slate-800">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-b from-[#0B2252] to-[#1C3D7A] text-white">
                  {[
                    { label: 'Accession No / Sample Id', w: 'w-32' },
                    { label: 'MRN',                      w: 'w-24' },
                    { label: 'Name',                     w: 'w-36' },
                    { label: 'Investigation',            w: 'w-48' },
                    { label: 'Received On',              w: 'w-32' },
                    { label: 'Received By',              w: 'w-28' },
                    { label: 'Remarks',                  w: 'w-28' },
                    { label: 'Consulting Doctor',        w: 'w-32' },
                    { label: 'Current Status',           w: 'w-28' },
                  ].map(col => (
                    <th
                      key={col.label}
                      className={`px-3 py-2.5 text-left font-bold uppercase tracking-wide border-r border-white/10 whitespace-nowrap ${col.w}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20">
                      <div className="flex flex-col items-center text-slate-400">
                        <RefreshCw className="w-8 h-8 mb-2 animate-spin opacity-40" />
                        <span className="text-sm font-medium">Fetching lab records…</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20">
                      <div className="flex flex-col items-center text-slate-400">
                        <FileText className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-sm font-medium">No records found for the selected criteria.</span>
                        <span className="text-xs mt-1 text-slate-400">Try adjusting the date range, status, or branch.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-[#1C58D9] whitespace-nowrap">
                        {row.accessionNo}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-xs">
                        {row.mrNo}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-medium max-w-[180px] truncate" title={row.patientName}>
                        {row.patientName}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 max-w-[220px] truncate font-medium" title={row.investigation}>
                        {row.investigation}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-slate-600">
                        {row.receivedOn}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 max-w-[160px] truncate" title={row.receivedBy}>
                        {row.receivedBy}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 max-w-[160px] truncate text-slate-500 italic" title={row.remarks}>
                        {row.remarks}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 max-w-[180px] truncate" title={row.consultingDoctor}>
                        {row.consultingDoctor}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusColor(row.currentStatus)}`}>
                          {row.currentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          {rows.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
              <span>Showing <strong className="text-slate-700">{rows.length}</strong> record{rows.length !== 1 ? 's' : ''}</span>
              <span className="text-slate-400 text-[10px]">
                Generated: {new Date().toLocaleString('en-GB')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          table { font-size: 9px !important; }
          thead th { background: #0B2252 !important; color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
