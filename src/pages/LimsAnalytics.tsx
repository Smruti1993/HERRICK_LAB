import React, { useState, useEffect } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  Search, 
  Info 
} from 'lucide-react';

export default function LimsAnalytics() {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    avgCollectionMinutes: 0,
    avgAccessionMinutes: 0,
    avgProcessingMinutes: 0,
    tatTargetCompliance: 0
  });

  const [hourlyCounts, setHourlyCounts] = useState<{ [key: string]: number }>({
    '08:00': 0, '10:00': 0, '12:00': 0, '14:00': 0, '16:00': 0, '18:00': 0
  });

  const [deptCompliance, setDeptCompliance] = useState({
    haematology: 0,
    microbiology: 0,
    immunology: 0
  });
  
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = getSupabase();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent audit logs for log grid
      const { data: logs } = await supabase
        .from('lims_audit_trail')
        .select(`
          *,
          lab_order:lab_order_id (
            barcode_no,
            service_order:service_order_id (
              service_name,
              appointment:appointment_id (
                patient:patient_id (
                  first_name,
                  last_name
                )
              )
            )
          )
        `)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (logs) {
        setAuditLogs(logs);
      }

      // 2. Fetch all orders to compute real-time averages
      const { data: dbOrders } = await supabase
        .from('lims_lab_orders')
        .select('*');

      if (dbOrders && dbOrders.length > 0) {
        let totalCollDiff = 0, collCount = 0;
        let totalAccDiff = 0, accCount = 0;
        let totalProcDiff = 0, procCount = 0;
        let compliantPhases = 0, totalPhases = 0;

        // Compute hourly counts
        const hrCounts = { '08:00': 0, '10:00': 0, '12:00': 0, '14:00': 0, '16:00': 0, '18:00': 0 };

        dbOrders.forEach((o: any) => {
          // Calculate collection TAT (Ordered -> Collected)
          if (o.ordered_at && o.collected_at) {
            const diff = (new Date(o.collected_at).getTime() - new Date(o.ordered_at).getTime()) / 60000;
            if (diff >= 0) {
              totalCollDiff += diff;
              collCount++;
              totalPhases++;
              if (diff <= 30) compliantPhases++;
            }
          }
          // Calculate accession QA TAT (Collected -> Accepted)
          if (o.collected_at && o.accepted_at) {
            const diff = (new Date(o.accepted_at).getTime() - new Date(o.collected_at).getTime()) / 60000;
            if (diff >= 0) {
              totalAccDiff += diff;
              accCount++;
              totalPhases++;
              if (diff <= 20) compliantPhases++;
            }
          }
          // Calculate processing TAT (Accepted -> Certified)
          if (o.accepted_at && o.certified_at) {
            const diff = (new Date(o.certified_at).getTime() - new Date(o.accepted_at).getTime()) / 60000;
            if (diff >= 0) {
              totalProcDiff += diff;
              procCount++;
              totalPhases++;
              if (diff <= 120) compliantPhases++;
            }
          }

          // Distribute to hourly count brackets
          if (o.ordered_at) {
            const hr = new Date(o.ordered_at).getHours();
            if (hr >= 8 && hr < 10) hrCounts['08:00']++;
            else if (hr >= 10 && hr < 12) hrCounts['10:00']++;
            else if (hr >= 12 && hr < 14) hrCounts['12:00']++;
            else if (hr >= 14 && hr < 16) hrCounts['14:00']++;
            else if (hr >= 16 && hr < 18) hrCounts['16:00']++;
            else if (hr >= 18) hrCounts['18:00']++;
          }
        });

        setMetrics({
          avgCollectionMinutes: collCount > 0 ? Math.round(totalCollDiff / collCount) : 0,
          avgAccessionMinutes: accCount > 0 ? Math.round(totalAccDiff / accCount) : 0,
          avgProcessingMinutes: procCount > 0 ? Math.round(totalProcDiff / procCount) : 0,
          tatTargetCompliance: totalPhases > 0 ? Math.round((compliantPhases / totalPhases) * 100) : 0
        });

        setHourlyCounts(hrCounts);

        // Fetch service orders to associate test names for departmental compliance breakdown
        const { data: sOrders } = await supabase
          .from('service_orders')
          .select('id, service_name');

        let haemTotal = 0, haemCompl = 0;
        let microTotal = 0, microCompl = 0;
        let immTotal = 0, immCompl = 0;

        dbOrders.forEach((o: any) => {
          const so = sOrders?.find(s => s.id === o.service_order_id);
          const serviceName = so?.service_name?.toLowerCase() || '';
          
          let isHaem = serviceName.includes('cbc') || serviceName.includes('hemo') || serviceName.includes('blood') || serviceName.includes('cbc');
          let isMicro = serviceName.includes('culture') || serviceName.includes('stain') || serviceName.includes('micro');

          let isCompliant = true;
          let hasData = false;

          if (o.ordered_at && o.collected_at) {
            const diff = (new Date(o.collected_at).getTime() - new Date(o.ordered_at).getTime()) / 60000;
            if (diff > 30) isCompliant = false;
            hasData = true;
          }
          if (o.collected_at && o.accepted_at) {
            const diff = (new Date(o.accepted_at).getTime() - new Date(o.collected_at).getTime()) / 60000;
            if (diff > 20) isCompliant = false;
            hasData = true;
          }
          if (o.accepted_at && o.certified_at) {
            const diff = (new Date(o.certified_at).getTime() - new Date(o.accepted_at).getTime()) / 60000;
            if (diff > 120) isCompliant = false;
            hasData = true;
          }

          if (hasData) {
            if (isHaem) {
              haemTotal++;
              if (isCompliant) haemCompl++;
            } else if (isMicro) {
              microTotal++;
              if (isCompliant) microCompl++;
            } else {
              immTotal++;
              if (isCompliant) immCompl++;
            }
          }
        });

        setDeptCompliance({
          haematology: haemTotal > 0 ? Math.round((haemCompl / haemTotal) * 100) : 0,
          microbiology: microTotal > 0 ? Math.round((microCompl / microTotal) * 100) : 0,
          immunology: immTotal > 0 ? Math.round((immCompl / immTotal) * 100) : 0
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const filteredLogs = auditLogs.filter(l => {
    const patient = l.lab_order?.service_order?.appointment?.patient;
    const patientName = patient ? `${patient.first_name} ${patient.last_name || ''}`.toLowerCase() : '';
    const barcode = l.lab_order?.barcode_no?.toLowerCase() || '';
    const testName = l.lab_order?.service_order?.service_name?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();

    return patientName.includes(query) || barcode.includes(query) || testName.includes(query);
  });

  // Height calculations for custom SVG chart
  const maxHourlyVal = Math.max(...Object.values(hourlyCounts), 1);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <header className="h-16 border-b border-slate-200 bg-white flex justify-between items-center px-8 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Compliance & TAT Dashboard</h2>
            <p className="text-xs text-slate-500 font-medium">Turnaround Time (TAT) analytics and NABL trace logs</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {/* Dynamic Analytics KPIs */}
        <div className="grid grid-cols-4 gap-6 shrink-0">
          <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Collection TAT</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-905">
                {metrics.avgCollectionMinutes > 0 ? metrics.avgCollectionMinutes : 'N/A'}
              </span>
              {metrics.avgCollectionMinutes > 0 && <span className="text-xs text-slate-500 font-semibold">mins avg</span>}
            </div>
            <p className="text-xxs text-emerald-600 mt-2 font-bold">Goal: &lt; 30 mins (Phlebotomy)</p>
            <Clock className="w-10 h-10 text-slate-100 absolute right-4 bottom-2" />
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Accession QA TAT</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-905">
                {metrics.avgAccessionMinutes > 0 ? metrics.avgAccessionMinutes : 'N/A'}
              </span>
              {metrics.avgAccessionMinutes > 0 && <span className="text-xs text-slate-500 font-semibold">mins avg</span>}
            </div>
            <p className="text-xxs text-emerald-600 mt-2 font-bold">Goal: &lt; 20 mins (Accessioning)</p>
            <ShieldCheck className="w-10 h-10 text-slate-100 absolute right-4 bottom-2" />
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Processing TAT</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-905">
                {metrics.avgProcessingMinutes > 0 ? metrics.avgProcessingMinutes : 'N/A'}
              </span>
              {metrics.avgProcessingMinutes > 0 && <span className="text-xs text-slate-500 font-semibold">mins avg</span>}
            </div>
            <p className="text-xxs text-amber-600 mt-2 font-bold">Goal: &lt; 120 mins (Analysis)</p>
            <Activity className="w-10 h-10 text-slate-100 absolute right-4 bottom-2" />
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">NABL Compliance</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-blue-600">
                {metrics.tatTargetCompliance > 0 ? `${metrics.tatTargetCompliance}%` : 'N/A'}
              </span>
              {metrics.tatTargetCompliance > 0 && <span className="text-xs text-slate-500 font-semibold">overall</span>}
            </div>
            <p className="text-xxs text-slate-400 mt-2 font-medium">Goal: &gt; 90% target compliance</p>
            <FileText className="w-10 h-10 text-slate-100 absolute right-4 bottom-2" />
          </div>
        </div>

        {/* Dynamic Charts */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" /> Hourly Sample Registrations
            </h3>
            
            <div className="h-44 w-full flex items-end justify-between pt-4 border-b border-l border-slate-150 px-2 font-mono text-xxs text-slate-400">
              {Object.keys(hourlyCounts).map(hour => {
                const count = hourlyCounts[hour];
                // Calculate height dynamically: maximum 130px
                const barHeight = count > 0 ? `${(count / maxHourlyVal) * 120}px` : '0px';

                return (
                  <div key={hour} className="flex flex-col items-center gap-1 w-full">
                    <div className="w-6 bg-blue-600/80 rounded-t-sm transition-all duration-500" style={{ height: barHeight }} />
                    <span className="mt-1">{hour}</span>
                    {count > 0 && <span className="text-slate-500 font-bold text-xxs">{count}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Real-time Target Compliance Breakdown
            </h3>
            
            <div className="space-y-4 pt-2 text-xs text-slate-700">
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Haematology / CBC Profiles</span>
                  <span className="text-emerald-600">{deptCompliance.haematology > 0 ? `${deptCompliance.haematology}%` : '0%'} In-Goal</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${deptCompliance.haematology}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Microbiology / Cultures</span>
                  <span className="text-emerald-600">{deptCompliance.microbiology > 0 ? `${deptCompliance.microbiology}%` : '0%'} In-Goal</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${deptCompliance.microbiology}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>General / Clinical Chemistry</span>
                  <span className="text-emerald-600">{deptCompliance.immunology > 0 ? `${deptCompliance.immunology}%` : '0%'} In-Goal</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${deptCompliance.immunology}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NABL Trace logs */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-250 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">State Audit Trail (NABL compliance logs)</h3>
              <span className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Chronological transition history</span>
            </div>
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Search audit trace logs..."
                className="bg-white border border-slate-250 rounded-lg py-1 pl-9 pr-4 text-xs w-full outline-none text-slate-700 focus:border-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="py-2.5 px-6">Timestamp</th>
                  <th className="py-2.5 px-6">Lab order</th>
                  <th className="py-2.5 px-6 text-center">Transition path</th>
                  <th className="py-2.5 px-6">Event Action</th>
                  <th className="py-2.5 px-6">Trace Logs</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => {
                  const patient = l.lab_order?.service_order?.appointment?.patient;
                  const patientName = patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : 'Walk-in';
                  const testName = l.lab_order?.service_order?.service_name || 'Lab Investigation';
                  const barcode = l.lab_order?.barcode_no || 'N/A';

                  return (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-6 font-mono text-slate-500">
                        {new Date(l.performed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <strong className="text-slate-800 block">{patientName}</strong>
                        <span className="text-xxs text-slate-500 block font-mono">{testName} (Barcode: {barcode})</span>
                      </td>
                      <td className="py-3 px-6 text-center font-mono">
                        <div className="flex items-center justify-center gap-1 text-xxs font-bold">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{l.from_status || 'N/A'}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">{l.to_status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-750">
                        {l.action_taken}
                      </td>
                      <td className="py-3 px-6 text-slate-500 italic">
                        {l.comments || 'No supplementary comments logged.'}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No audit transition records captured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
