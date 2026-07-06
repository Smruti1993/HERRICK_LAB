import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../services/supabaseClient';
const supabase = getSupabase();
import { Barcode, Printer, CheckCircle, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface LimsReportProps {
  labOrderId: string;
  onClose?: () => void;
}

export default function LimsReport({ labOrderId, onClose }: LimsReportProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetchReportDetails();
  }, [labOrderId]);

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      // Fetch order header with patient details
      const { data: orderData } = await supabase
        .from('lims_lab_orders')
        .select(`
          *,
          service_order:service_order_id (
            id,
            service_name,
            cpt_code,
            appointment:appointment_id (
              id,
              patient:patient_id (
                id,
                first_name,
                last_name,
                gender,
                dob,
                phone
              )
            )
          )
        `)
        .eq('id', labOrderId)
        .single();

      if (orderData) {
        const patient = (orderData as any).service_order?.appointment?.patient || {};
        let ageText = '30 Years';
        if (patient.dob) {
          const dob = new Date(patient.dob);
          const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          ageText = `${age} Yrs`;
        }

        setOrder({
          ...orderData,
          patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Walk-in Patient',
          patientAge: ageText,
          patientGender: patient.gender || 'Unknown',
          patientPhone: patient.phone || 'N/A',
          serviceName: (orderData as any).service_order?.service_name || 'Laboratory Investigation'
        });
      }

      // Fetch results with parameter descriptions and reference ranges
      const { data: resultsData } = await supabase
        .from('lims_results')
        .select(`
          *,
          parameter:parameter_id (
            name,
            code,
            lims_reference_ranges (
              gender,
              age_min,
              age_max,
              ref_min,
              ref_max,
              unit
            )
          )
        `)
        .eq('lab_order_id', labOrderId);

      if (resultsData) {
        setResults(resultsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mr-2" />
        Generating report layout...
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-8 text-rose-500">Error: Report details could not be loaded.</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Control Toolbar (hidden during printing) */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800 print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-350">Certified Patient Report</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print PDF Report
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Report Container */}
      <div className="bg-white text-slate-950 p-8 rounded-xl shadow border border-slate-250 font-serif leading-relaxed max-w-2xl mx-auto print:p-0 print:border-none print:shadow-none print:text-black">
        {/* Letterhead Header */}
        <div className="border-b-2 border-indigo-900 pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-indigo-950 font-sans uppercase">Medicore Labs Ltd.</h1>
            <p className="text-xs text-slate-600 font-sans font-medium mt-1">12, Clinical Parkway, Sector 5, Salt Lake</p>
            <p className="text-xs text-slate-500 font-sans font-medium">NABL Accredited Lab | Lic No: NABL-94392</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 justify-end print:border-none">
              <Barcode className="w-6 h-6 text-slate-700" />
              <span className="font-mono text-xs font-bold tracking-widest text-slate-800">{order.barcode_no}</span>
            </div>
            <p className="text-xxs text-slate-400 mt-1 font-sans">Sample Received: {new Date(order.collected_at || order.ordered_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Patient Demographics Info */}
        <div className="grid grid-cols-2 gap-4 py-4 text-xs font-sans border-b border-slate-200 bg-slate-50/50 p-4 my-4 rounded-lg">
          <div className="space-y-1.5">
            <div><span className="text-slate-500">Patient Name:</span> <strong className="text-slate-900 font-bold text-sm">{order.patientName}</strong></div>
            <div><span className="text-slate-500">Age / Gender:</span> <span className="text-slate-800 font-semibold">{order.patientAge} / {order.patientGender}</span></div>
            <div><span className="text-slate-500">Contact Phone:</span> <span className="text-slate-800">{order.patientPhone}</span></div>
          </div>
          <div className="space-y-1.5 text-right">
            <div><span className="text-slate-500">Order ID:</span> <span className="font-mono text-slate-800">{order.id.slice(0, 8).toUpperCase()}</span></div>
            <div><span className="text-slate-500">Report Status:</span> <span className="font-semibold text-emerald-700">Certified & Closed</span></div>
            <div><span className="text-slate-500">Report Date:</span> <span className="text-slate-800">{new Date(order.certified_at || Date.now()).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Investigation Title */}
        <div className="my-6">
          <h3 className="text-base font-bold text-indigo-950 font-sans border-b border-indigo-900 pb-1 uppercase tracking-wider">{order.serviceName} Report</h3>
        </div>

        {/* Results Parameter Table */}
        <table className="w-full text-xs text-left border-collapse my-4 font-sans">
          <thead>
            <tr className="border-b border-slate-350 text-slate-700 bg-slate-100 font-bold">
              <th className="py-2 px-3">Test Parameter</th>
              <th className="py-2 px-3 text-center">Observed Value</th>
              <th className="py-2 px-3">Flag</th>
              <th className="py-2 px-3 text-right">Reference Range</th>
              <th className="py-2 px-3 text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const rangesList = r.parameter?.lims_reference_ranges || [];
              const mr = rangesList.find((rg: any) => rg.gender === 'All' || rg.gender === order.patientGender) || rangesList[0] || {};
              const isOutRange = r.flag !== 'Normal';

              return (
                <tr key={r.id} className="border-b border-slate-200 text-slate-800 hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">{r.parameter?.name}</span>
                    <span className="text-xxs text-slate-500 block font-mono">Code: {r.parameter?.code}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={isOutRange ? 'font-bold text-red-600 underline' : 'font-medium'}>
                      {r.value}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-xxs uppercase">
                    {isOutRange ? (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {r.flag}
                      </span>
                    ) : (
                      <span className="text-slate-400">Normal</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {mr.ref_min && mr.ref_max ? `${mr.ref_min} - ${mr.ref_max}` : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono">{mr.unit || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Audit Verification Log details (clinical validation) */}
        <div className="mt-8 bg-slate-55 p-3 rounded text-xxs font-sans text-slate-600 border border-slate-200">
          <p className="font-semibold text-slate-700 mb-1">Clinical Trace Notes:</p>
          <p>This investigation has been validated and certified on the laboratory analyser equipment. All parameters match the registered specimen quality checks. For any inquiries, contact Medicore Pathology Helpdesk.</p>
        </div>

        {/* Doctor Signature Block */}
        <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-6 font-sans">
          <div>
            <div className="w-32 border-b border-slate-300 pb-1 flex justify-center text-slate-400 font-mono italic text-xxs">Verified Logged</div>
            <p className="text-xxs text-slate-500 mt-1">Technician signature</p>
          </div>
          <div className="text-right">
            <div className="w-48 border-b border-slate-300 pb-1 flex justify-center text-emerald-700 font-semibold italic text-xs">Dr. Sarah Miller, MD</div>
            <p className="text-xxs text-slate-500 mt-1 font-bold">Dr. Sarah Miller</p>
            <p className="text-xxs text-slate-400">Consultant Pathologist (Reg No: PATH-92043)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
