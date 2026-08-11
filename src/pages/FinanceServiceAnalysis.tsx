import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Download, Printer, Filter, Search, X, FileBarChart, ChevronDown } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   Finance → Reports → Service Analysis
   Real-time, client-side aggregation of bills + items data,
   matching the grid layout shown in the reference mockup.
   ────────────────────────────────────────────────────────────── */

interface ReportRow {
  slNo: number;
  visitDate: string;
  invoiceDate: string;
  invoiceNo: string;
  mrNo: string;
  policyNo: string;
  patientName: string;
  consultantName: string;
  cptCode: string;
  serviceName: string;
  departmentName: string;
  grossAmount: number;
  discount: number;
  netAmount: number;
  patientShare: number;
  sponsorShare: number;
  isPharmacyRecord: string;
  groupName: string;
  plan: string;
}

export const FinanceServiceAnalysis = () => {
  const {
    bills, patients, employees, serviceDefinitions,
    appointments, departments, organizations,
  } = useData();

  // ── Filters ────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');


  // ── Helpers ────────────────────────────────────────────────
  const getPatient = (id: string) => patients.find(p => p.id === id);
  const getEmployee = (id?: string) => {
    if (!id) return null;
    return employees.find(e => e.id === id);
  };
  const getDepartment = (id?: string) => {
    if (!id) return null;
    return departments.find(d => d.id === id);
  };
  const getServiceDef = (nameOrId: string) => {
    return serviceDefinitions.find(
      s => s.name === nameOrId || s.alternateName === nameOrId || s.id === nameOrId || s.code === nameOrId,
    );
  };
  const getSponsorName = (sponsorId?: string) => {
    if (!sponsorId) return '';
    const org = organizations.find(o => o.id === sponsorId);
    return org ? org.name : '';
  };

  // ── Build report rows ─────────────────────────────────────
  const reportRows: ReportRow[] = useMemo(() => {
    const rows: ReportRow[] = [];
    let serial = 0;

    bills.forEach(bill => {
      // Exclude cancelled bills
      if (bill.status === 'Cancelled') return;

      // Exclude pharmacy invoices (Direct Sale & OP Pharmacy)
      if (bill.isPharmacy) return;

      // Date filter
      if (!bill.date) return;
      const bDate = bill.date.split('T')[0];
      if (startDate && bDate < startDate) return;
      if (endDate && bDate > endDate) return;

      const patient = getPatient(bill.patientId);
      if (!patient) return;

      const pName = `${patient.firstName} ${patient.lastName}`;
      const mrNo = patient.id.slice(-8).toUpperCase();

      // Search filter (name, MRN, invoice no)
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = pName.toLowerCase().includes(q);
        const matchMrn  = mrNo.toLowerCase().includes(q);
        const matchInv  = (bill.invoiceNo || '').toLowerCase().includes(q);
        const matchPhone = (patient.phone || '').includes(q);
        if (!matchName && !matchMrn && !matchInv && !matchPhone) return;
      }



      // Doctor / Consultant resolution
      let doctorId = bill.doctorId;
      if (!doctorId && bill.appointmentId) {
        const apt = appointments.find(a => a.id === bill.appointmentId);
        if (apt) doctorId = apt.doctorId;
      }
      const doctor = getEmployee(doctorId);
      const consultantName = doctor ? `${doctor.firstName} ${doctor.lastName}` : '';

      // Consultant filter
      if (consultantFilter && doctorId !== consultantFilter) return;

      // Department resolution
      let deptName = bill.departmentName || '';
      let deptId = bill.departmentId || '';
      if (!deptName && doctor) {
        const dept = getDepartment(doctor.departmentId);
        if (dept) { deptName = dept.name; deptId = dept.id; }
      }
      if (!deptName && deptId) {
        const dept = getDepartment(deptId);
        if (dept) deptName = dept.name;
      }

      // Department filter
      if (deptFilter && deptId !== deptFilter) return;

      // Visit date (appointment date or bill date)
      let visitDate = bill.date;
      if (bill.appointmentId) {
        const apt = appointments.find(a => a.id === bill.appointmentId);
        if (apt?.date) visitDate = apt.date;
      }

      // Policy No (if sponsor type)
      const policyNo = bill.payerType === 'Sponsor' ? (bill.referenceNo || '-') : '-';

      // Plan
      let planLabel = 'CASH';
      if (bill.payerType === 'Sponsor' && bill.sponsorId) {
        const orgName = getSponsorName(bill.sponsorId);
        planLabel = orgName || bill.paymentMode || 'SPONSOR';
      } else if (bill.paymentMode) {
        planLabel = bill.paymentMode.toUpperCase();
      }

      // Process each item in the bill
      bill.items.forEach(item => {
        // Skip return / refund lines for this report
        if (item.description.startsWith('RETURN:') || item.description.startsWith('REFUND:')) return;

        const svcDef = getServiceDef(item.description) || getServiceDef(item.itemId || '');

        const grossAmount = item.unitPrice * item.quantity;
        const discount    = item.discountAmount ?? 0;
        const netAmount   = grossAmount - discount;

        // Patient / Sponsor share calculation
        let patientShare = netAmount;
        let sponsorShare = 0;
        if (bill.payerType === 'Sponsor' && bill.totalAmount > 0) {
          const patRatio = (bill.patientDueAmount ?? 0) / bill.totalAmount;
          patientShare = Math.round(netAmount * patRatio * 100) / 100;
          sponsorShare = Math.round((netAmount - patientShare) * 100) / 100;
        }

        serial++;
        rows.push({
          slNo: serial,
          visitDate: visitDate,
          invoiceDate: bill.date,
          invoiceNo: bill.invoiceNo || `INV-${bill.id.slice(-8).toUpperCase()}`,
          mrNo: mrNo,
          policyNo,
          patientName: pName,
          consultantName,
          cptCode: svcDef?.cptCode || '',
          serviceName: svcDef?.name || item.description,
          departmentName: deptName,
          grossAmount,
          discount,
          netAmount,
          patientShare,
          sponsorShare,
          isPharmacyRecord: 'N',
          groupName: svcDef?.groupName || svcDef?.billingGroupName || '',
          plan: planLabel,
        });
      });
    });

    return rows;
  }, [bills, patients, employees, serviceDefinitions, appointments, departments, organizations,
      startDate, endDate, searchTerm, deptFilter, consultantFilter]);

  // ── Summary metrics ────────────────────────────────────────
  const summary = useMemo(() => {
    let gross = 0, disc = 0, net = 0, patShare = 0, sponsorShare = 0;
    reportRows.forEach(r => {
      gross += r.grossAmount;
      disc += r.discount;
      net += r.netAmount;
      patShare += r.patientShare;
      sponsorShare += r.sponsorShare;
    });
    return {
      gross: gross.toFixed(2),
      discount: disc.toFixed(2),
      net: net.toFixed(2),
      patientShare: patShare.toFixed(2),
      sponsorShare: sponsorShare.toFixed(2),
    };
  }, [reportRows]);

  // ── Distinct consultants & departments (for filter dropdowns) ──
  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.filter(e => e.role === 'Doctor').forEach(e => map.set(e.id, `${e.firstName} ${e.lastName}`));
    return Array.from(map.entries());
  }, [employees]);

  const deptOptions = useMemo(() => {
    return departments.map(d => ({ id: d.id, name: d.name }));
  }, [departments]);

  // ── CSV Export ──────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Sl.No.', 'Visit Date', 'Invoice Date', 'Invoice No', 'MrNo', 'Policy No',
      'Patient Name', 'Consultant Name', 'CPT Code', 'Service Name', 'Department Name',
      'Gross Amount', 'Discount', 'Net Amount', 'Patient Share', 'Sponsor Share',
      'Is Pharmacy Record', 'Group Name', 'Plan',
    ];
    const csvRows = [headers.join(',')];
    reportRows.forEach(r => {
      csvRows.push([
        r.slNo, fmtDateShort(r.visitDate), fmtDateShort(r.invoiceDate),
        `"${r.invoiceNo}"`, `"${r.mrNo}"`, `"${r.policyNo}"`,
        `"${r.patientName}"`, `"${r.consultantName}"`, `"${r.cptCode}"`,
        `"${r.serviceName}"`, `"${r.departmentName}"`,
        r.grossAmount.toFixed(2), r.discount.toFixed(2), r.netAmount.toFixed(2),
        r.patientShare.toFixed(2), r.sponsorShare.toFixed(2),
        r.isPharmacyRecord, `"${r.groupName}"`, `"${r.plan}"`,
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Service_Analysis_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDateShort = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            Service Analysis Report
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Real-time financial breakdown by service, department &amp; consultant</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-colors">
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* ─── Summary Metric Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:grid-cols-5">
        <MetricCard label="Gross Amount" value={summary.gross} color="blue" />
        <MetricCard label="Net Amount" value={summary.net} color="emerald" />
        <MetricCard label="Discount Amount" value={summary.discount} color="amber" />
        <MetricCard label="Patient Share Amount" value={summary.patientShare} color="violet" />
        <MetricCard label="Sponsor Share Amount" value={summary.sponsorShare} color="rose" />
      </div>

      {/* ─── Main Card ─── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 340px)' }}>

        {/* ── Filters Toolbar ── */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap gap-3 items-center print:hidden">
          {/* Date Range */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Date:</span>
            <input type="date" className="text-xs outline-none text-slate-700 w-28 bg-transparent font-medium"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-slate-300">–</span>
            <input type="date" className="text-xs outline-none text-slate-700 w-28 bg-transparent font-medium"
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {/* Search */}
          <div className="relative">
            <input className="pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg text-sm w-52 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="Search Patient / MRNo / Invoice"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm ? (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            )}
          </div>

          {/* Department */}
          <div className="relative">
            <select className="appearance-none pl-3 pr-7 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Consultant */}
          <div className="relative">
            <select className="appearance-none pl-3 pr-7 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={consultantFilter} onChange={e => setConsultantFilter(e.target.value)}>
              <option value="">All Consultants</option>
              {doctorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>


          <span className="ml-auto text-xs font-medium text-slate-500">{reportRows.length} record{reportRows.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Data Grid ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px] border-collapse min-w-[1800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-b from-blue-700 to-blue-800 text-white">
                {[
                  { label: 'Sl.No.', w: 'w-12' },
                  { label: 'Visit Date', w: 'w-24' },
                  { label: 'Invoice Date', w: 'w-24' },
                  { label: 'Invoice No', w: 'w-28' },
                  { label: 'MrNo', w: 'w-24' },
                  { label: 'Policy No', w: 'w-28' },
                  { label: 'Patient Name', w: 'w-32' },
                  { label: 'Consultant Name', w: 'w-32' },
                  { label: 'CPT Code', w: 'w-20' },
                  { label: 'Service Name', w: 'w-40' },
                  { label: 'Department Name', w: 'w-28' },
                  { label: 'Gross Amount', w: 'w-24 text-right' },
                  { label: 'Discount', w: 'w-20 text-right' },
                  { label: 'Net Amount', w: 'w-24 text-right' },
                  { label: 'Patient Share', w: 'w-24 text-right' },
                  { label: 'Sponsor Share', w: 'w-24 text-right' },
                  { label: 'Is Pharmacy Record', w: 'w-16 text-center' },
                  { label: 'Group Name', w: 'w-36' },
                  { label: 'Plan', w: 'w-20' },
                ].map(col => (
                  <th key={col.label} className={`px-2 py-2 font-bold uppercase tracking-wide border-r border-blue-600/40 whitespace-nowrap ${col.w}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="text-center py-20">
                    <div className="flex flex-col items-center text-slate-400">
                      <FileBarChart className="w-10 h-10 mb-2 opacity-20" />
                      <span className="text-sm font-medium">No records found matching criteria.</span>
                      <span className="text-xs mt-1">Try adjusting the date range or filters above.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                reportRows.map((row, idx) => (
                  <tr key={idx} className={`border-b border-slate-200 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-center font-bold text-blue-700">{row.slNo}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 whitespace-nowrap">{fmtDateShort(row.visitDate)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 whitespace-nowrap">{fmtDateShort(row.invoiceDate)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 font-medium text-blue-700 whitespace-nowrap">{row.invoiceNo}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 font-mono text-xs">{row.mrNo}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200">{row.policyNo}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 font-medium truncate max-w-[180px]" title={row.patientName}>{row.patientName}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 truncate max-w-[160px]" title={row.consultantName}>{row.consultantName}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 font-mono">{row.cptCode}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 font-medium truncate max-w-[220px]" title={row.serviceName}>{row.serviceName}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 truncate max-w-[150px]" title={row.departmentName}>{row.departmentName}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-right font-bold">{row.grossAmount.toFixed(2)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-right text-amber-700">{row.discount.toFixed(2)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-right font-bold text-emerald-700">{row.netAmount.toFixed(2)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-right">{row.patientShare.toFixed(2)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-right">{row.sponsorShare.toFixed(2)}</td>
                    <td className="px-2 py-1.5 border-r border-slate-200 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${row.isPharmacyRecord === 'Y' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                        {row.isPharmacyRecord}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-r border-slate-200 truncate max-w-[200px]" title={row.groupName}>{row.groupName}</td>
                    <td className="px-2 py-1.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {row.plan}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Metric Card Component ────────────────────────────────── */
const colorMap: Record<string, { bg: string; border: string; text: string; label: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',    label: 'text-blue-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700', label: 'text-emerald-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',   label: 'text-amber-600' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700',  label: 'text-violet-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',    label: 'text-rose-500' },
};

const MetricCard = ({ label, value, color }: { label: string; value: string; color: string }) => {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.bg} ${c.border} border rounded-xl px-4 py-3 shadow-sm`}>
      <p className={`text-[11px] font-bold uppercase tracking-wide ${c.label}`}>{label}</p>
      <p className={`text-xl font-extrabold mt-0.5 ${c.text}`}>{value}</p>
    </div>
  );
};
