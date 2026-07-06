import React, { useState, useEffect } from 'react';
import { getSupabase, getAuthToken } from '../services/supabaseClient';
import { LimsLabOrder, LimsResult } from '../types';
import { 
  History, 
  Search, 
  Edit3, 
  FileSignature, 
  Check, 
  X, 
  AlertOctagon, 
  AlertTriangle 
} from 'lucide-react';

export default function LimsAmendments() {
  const [orders, setOrders] = useState<LimsLabOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Selected state for editing
  const [selectedOrder, setSelectedOrder] = useState<LimsLabOrder | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  
  // Amendment form
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  const supabase = getSupabase();

  const fetchCertifiedOrders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
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
                id, first_name, last_name, gender, dob
              )
            )
          )
        `)
        .eq('status', 'Certified');

      if (data) {
        const formatted = data.map((o: any) => {
          const patient = o.service_order?.appointment?.patient || {};
          return {
            id: o.id,
            serviceOrderId: o.service_order_id,
            barcodeNo: o.barcode_no,
            priority: o.priority || 'Routine',
            status: o.status,
            orderedAt: o.ordered_at,
            certifiedAt: o.certified_at,
            patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Walk-in Patient',
            patientAge: patient.dob ? `${Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Y` : '30 Y',
            patientGender: patient.gender || 'Unknown',
            serviceName: o.service_order?.service_name || 'Lab Service'
          };
        });
        setOrders(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifiedOrders();
  }, []);

  const openOrderAmend = async (order: LimsLabOrder) => {
    setSelectedOrder(order);
    setEditingParamId(null);
    setReason('');
    setNewValue('');

    const { data } = await supabase
      .from('lims_results')
      .select(`
        *,
        parameter:parameter_id (
          name,
          code
        )
      `)
      .eq('lab_order_id', order.id);

    if (data) {
      setResults(data);
    }
  };

  const handleAmendSubmit = async (parameterId: string) => {
    if (!selectedOrder || !newValue || !reason) return;

    const token = await getAuthToken();
    
    const localUser = localStorage.getItem('medicore_user') ? JSON.parse(localStorage.getItem('medicore_user')!) : null;
    const currentUserId = localUser?.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
    
    const response = await fetch('/api/lims/results/amend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        labOrderId: selectedOrder.id,
        parameterId,
        newValue,
        userId: currentUserId, // mock pathologist ID
        reason
      })
    });

    if (response.ok) {
      openOrderAmend(selectedOrder);
      alert('Result successfully amended. Audit trail transition log generated.');
    } else {
      alert('Failed to submit amendment.');
    }
  };

  const filtered = orders.filter(o => 
    o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.barcodeNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-55 text-slate-800 font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex justify-between items-center px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-red-650" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Pathology Amendments Portal</h2>
              <p className="text-xs text-slate-500 font-medium">Post-certification results correction overrides</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 grid grid-cols-12 gap-6 bg-slate-50">
          {/* Certified reports list */}
          <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[calc(100vh-10rem)] shadow-sm">
            <h3 className="text-xs font-bold mb-3 text-slate-400 uppercase tracking-wider">Certified Reports</h3>
            
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, barcode..."
                className="bg-white border border-slate-250 rounded-lg py-1.5 pl-9 pr-4 text-xs w-full outline-none text-slate-700 focus:border-red-500 shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => openOrderAmend(o)}
                  className={`w-full text-left px-3 py-3 rounded-xl text-xs transition-all border flex flex-col gap-1 ${
                    selectedOrder?.id === o.id
                      ? 'bg-red-50/50 text-red-750 border-red-250 font-bold shadow-sm'
                      : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-slate-900">{o.patientName}</span>
                    <span className="bg-emerald-50 text-emerald-600 text-xxs font-bold px-1.5 py-0.5 rounded border border-emerald-250">Certified</span>
                  </div>
                  <div className="text-xxs text-slate-500 font-semibold">{o.serviceName}</div>
                  <div className="flex justify-between text-xxs text-slate-450 font-mono mt-1 pt-1 border-t border-slate-100">
                    <span>Barcode: {o.barcodeNo}</span>
                    <span>Date: {new Date(o.certifiedAt || '').toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">No certified reports found.</div>
              )}
            </div>
          </div>

          {/* Amendment Form Console */}
          <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-6 h-[calc(100vh-10rem)] flex flex-col overflow-y-auto shadow-sm">
            {selectedOrder ? (
              <div className="space-y-5">
                <div className="border-b border-slate-150 pb-4">
                  <span className="bg-red-50 text-red-650 border border-red-200 text-xxs px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-2 inline-block">Amendment Session Active</span>
                  <h3 className="text-base font-bold text-slate-900">Patient: {selectedOrder.patientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">Investigation: {selectedOrder.serviceName} | Barcode: {selectedOrder.barcodeNo}</p>
                </div>

                <div className="space-y-3.5">
                  <h4 className="font-bold text-slate-400 text-xxs uppercase tracking-wider">Test Results Values</h4>
                  
                  {results.map(r => (
                    <div key={r.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xxs font-mono text-slate-450 block">{r.parameter?.code}</span>
                          <span className="text-xs font-bold text-slate-800">{r.parameter?.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xxs text-slate-450 block font-bold">Value</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{r.value}</span>
                          </div>
                          {r.is_amended && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-250 px-2 py-0.5 rounded text-xxs font-bold flex items-center gap-0.5 shadow-sm">
                              <AlertTriangle className="w-3 h-3" /> Amended
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingParamId(r.parameter_id);
                              setNewValue(r.value || '');
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 shadow-sm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {r.is_amended && r.amended_reason && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xxs text-slate-500 leading-normal">
                          <b className="text-amber-600 font-bold block mb-0.5">Correction justification:</b>
                          {r.amended_reason}
                        </div>
                      )}

                      {editingParamId === r.parameter_id && (
                        <div className="bg-white p-4 border border-slate-200 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                            <h5 className="text-xs font-bold text-red-650 flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> Enter Corrected Details</h5>
                            <button onClick={() => setEditingParamId(null)} className="text-slate-400 hover:text-slate-650"><X className="w-4 h-4" /></button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xxs text-slate-400 block mb-1">New Value</label>
                              <input
                                placeholder="Corrected reading"
                                className="bg-white border border-slate-250 rounded-lg p-2 text-xs w-full outline-none text-slate-700 focus:border-red-500"
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xxs text-slate-400 block mb-1">Correction Reason (Required)</label>
                              <input
                                placeholder="Provide clinical justification"
                                className="bg-white border border-slate-250 rounded-lg p-2 text-xs w-full outline-none text-slate-700 focus:border-red-500"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingParamId(null)} className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-xs rounded-lg font-bold">Cancel</button>
                            <button 
                              onClick={() => handleAmendSubmit(r.parameter_id)} 
                              className="px-3 py-1 bg-red-650 text-white text-xs rounded-lg font-bold shadow flex items-center gap-1"
                            >
                              <FileSignature className="w-3.5 h-3.5" /> Log Override
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white p-8">
                <AlertTriangle className="w-10 h-10 text-red-500/60 mb-2 animate-bounce" />
                <p className="text-xs">Select a certified report on the left panel to record corrections overrides.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
