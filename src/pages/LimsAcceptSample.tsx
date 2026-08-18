import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabase, getAuthToken, BACKEND_URL } from '../services/supabaseClient';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertTriangle, 
  Printer, 
  RefreshCw, 
  FlaskConical,
  Info,
  QrCode,
  MapPin,
  ClipboardList
} from 'lucide-react';

interface IncomingSample {
  id: string;
  sample_no: string;
  status: string;
  condition: string;
  section: string;
  received_at: string | null;
  received_by: string | null;
  specimen: { id: string; name: string } | null;
  container: { id: string; name: string } | null;
  lab_order: {
    id: string;
    barcode_no: string;
    status: string;
    lab_section: string | null;
    ordered_at: string;
    service?: {
      id: string;
      name: string;
      cpt_code: string | null;
    } | null;
    service_order: {
      id: string;
      service_name: string;
      cpt_code: string | null;
      priority: string;
      ordering_doctor: {
        first_name: string;
        last_name: string;
      } | null;
      appointment: {
        id: string;
        visit_type: string;
        doctor: {
          first_name: string;
          last_name: string;
        } | null;
        patient: {
          id: string;
          first_name: string;
          last_name: string;
          gender: string;
          dob: string;
        } | null;
      } | null;
    } | null;
  } | null;
}

export default function LimsAcceptSample() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const supabase = getSupabase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Queue of samples
  const [samples, setSamples] = useState<IncomingSample[]>([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);

  // Master lists
  const [specimens, setSpecimens] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [serviceCentres, setServiceCentres] = useState<any[]>([]);

  // Search Filter States
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchMrn, setSearchMrn] = useState('');
  const [searchPatientName, setSearchPatientName] = useState('');
  const [searchAccessionNo, setSearchAccessionNo] = useState('');
  const [searchLab, setSearchLab] = useState('');
  const [searchSampleId, setSearchSampleId] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchPsNo, setSearchPsNo] = useState('');
  const [searchService, setSearchService] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchStatus, setSearchStatus] = useState('Sample Send'); // Default matches collected samples
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Barcode Scanning Bar
  const [scanBarcode, setScanBarcode] = useState('');

  const resolveSingle = (val: any) => Array.isArray(val) ? val[0] : val;

  const getLoggedInUser = () => {
    try {
      const localUser = localStorage.getItem('medicore_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        return parsed.name || parsed.username || '';
      }
    } catch (e) {
      console.error(e);
    }
    return 'admin';
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

  // Load Master data on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const { data: specData } = await supabase.from('lims_specimens').select('*').eq('status', 'Active');
        const { data: contData } = await supabase.from('lims_containers').select('*').eq('status', 'Active');
        const { data: deptData } = await supabase.from('departments').select('id, name').eq('status', 'Active');
        const { data: scData } = await supabase.from('service_centres').select('id, name').eq('status', 'Active');
        if (specData) setSpecimens(specData);
        if (contData) setContainers(contData);
        if (deptData) setDepartments(deptData);
        if (scData) setServiceCentres(scData);
      } catch (err) {
        console.error('Error loading Master Data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Samples with nested joins in real-time
  const fetchSamples = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lims_samples')
        .select(`
          id,
          sample_no,
          status,
          condition,
          section,
          received_at,
          received_by,
          specimen:specimen_id ( id, name ),
          container:container_id ( id, name ),
          lab_order:lab_order_id (
            id,
            barcode_no,
            status,
            lab_section,
            ordered_at,
            service_id,
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
              ordering_doctor:ordering_doctor_id (
                first_name,
                last_name
              ),
              appointment:appointment_id (
                id,
                visit_type,
                patient_id,
                doctor:doctor_id (
                  first_name,
                  last_name
                )
              )
            )
          )
        `);

      // Map search status dropdown to DB sample status
      let dbStatus = 'Collected';
      if (searchStatus === 'Sample Accepted') dbStatus = 'Accepted';
      else if (searchStatus === 'Sample Resend') dbStatus = 'Ordered';
      else if (searchStatus === 'Sample Rejected') dbStatus = 'Rejected';
      else if (searchStatus === 'Sample Send') dbStatus = 'Collected';
      
      query = query.eq('status', dbStatus);

      if (searchSampleId) {
        query = query.ilike('sample_no', `%${searchSampleId}%`);
      }

      const { data: samplesData, error: queryErr } = await query;
      if (queryErr) throw queryErr;

      if (samplesData) {
        // Collect patient_id values and fetch details separately
        const patientIds = Array.from(new Set(
          (samplesData as any[])
            .map(s => {
              const labOrder = resolveSingle(s.lab_order);
              const sOrder = labOrder ? resolveSingle(labOrder.service_order) : null;
              const appt = sOrder ? resolveSingle(sOrder.appointment) : null;
              return appt?.patient_id;
            })
            .filter(Boolean)
        ));

        let patientsMap: Record<string, any> = {};
        if (patientIds.length > 0) {
          const { data: pData } = await supabase
            .from('patients')
            .select('id, first_name, last_name, gender, dob')
            .in('id', patientIds);
          if (pData) {
            pData.forEach((p: any) => { patientsMap[p.id] = p; });
          }
          
          const missingIds = patientIds.filter(id => !patientsMap[id]);
          if (missingIds.length > 0) {
            const { data: pdData } = await supabase
              .from('patient_demographics')
              .select('id, first_name, last_name, gender, year_of_birth, month_of_birth, day_of_birth')
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
                  dob: `${year}-${month}-${day}`
                };
              });
            }
          }
        }

        // Normalize nested relations arrays to single objects if needed
        const normalized = (samplesData as any[]).map(s => {
          const specObj = resolveSingle(s.specimen);
          const contObj = resolveSingle(s.container);
          const labOrder = resolveSingle(s.lab_order);
          const serviceObj = labOrder ? resolveSingle(labOrder.service) : null;
          const sOrder = labOrder ? resolveSingle(labOrder.service_order) : null;
          const appt = sOrder ? resolveSingle(sOrder.appointment) : null;
          const patientId = appt?.patient_id;
          const patient = patientId ? patientsMap[patientId] : null;
          const doctor = appt ? resolveSingle(appt.doctor) : null;
          const orderingDoctor = sOrder ? resolveSingle(sOrder.ordering_doctor) : null;

          return {
            ...s,
            specimen: specObj,
            container: contObj,
            lab_order: labOrder ? {
              ...labOrder,
              service: serviceObj || null,
              service_order: sOrder ? {
                ...sOrder,
                appointment: appt ? {
                  ...appt,
                  patient,
                  doctor
                } : null,
                ordering_doctor: orderingDoctor
              } : null
            } : null
          } as IncomingSample;
        });

        // Apply filters client-side
        let filtered = normalized;

        if (orderId) {
          filtered = filtered.filter(s => s.lab_order?.id === orderId);
        }

        if (searchMrn) {
          filtered = filtered.filter(s => 
            s.lab_order?.service_order?.appointment?.patient?.id?.toLowerCase().includes(searchMrn.toLowerCase())
          );
        }

        if (searchPatientName) {
          filtered = filtered.filter(s => {
            const pat = s.lab_order?.service_order?.appointment?.patient;
            if (!pat) return false;
            const fullName = `${pat.first_name || ''} ${pat.last_name || ''}`.toLowerCase();
            return fullName.includes(searchPatientName.toLowerCase());
          });
        }

        if (searchAccessionNo) {
          filtered = filtered.filter(s => 
            s.lab_order?.barcode_no?.toLowerCase().includes(searchAccessionNo.toLowerCase())
          );
        }

        if (searchPsNo) {
          filtered = filtered.filter(s => 
            s.lab_order?.barcode_no?.toLowerCase().includes(searchPsNo.toLowerCase())
          );
        }

        if (searchService) {
          filtered = filtered.filter(s => {
            const compName = s.lab_order?.service?.name || '';
            const parentName = s.lab_order?.service_order?.service_name || '';
            return compName.toLowerCase().includes(searchService.toLowerCase()) ||
                   parentName.toLowerCase().includes(searchService.toLowerCase());
          });
        }

        if (searchLab) {
          filtered = filtered.filter(s => 
            s.lab_order?.lab_section?.toLowerCase().includes(searchLab.toLowerCase()) ||
            s.section?.toLowerCase().includes(searchLab.toLowerCase())
          );
        }

        if (searchLocation) {
          filtered = filtered.filter(s => 
            s.lab_order?.service_order?.appointment?.visit_type?.toLowerCase().includes(searchLocation.toLowerCase())
          );
        }

        if (searchDateFrom) {
          filtered = filtered.filter(s => {
            const ordDate = s.lab_order?.ordered_at;
            if (!ordDate) return false;
            return ordDate >= `${searchDateFrom}T00:00:00`;
          });
        }

        if (searchDateTo) {
          filtered = filtered.filter(s => {
            const ordDate = s.lab_order?.ordered_at;
            if (!ordDate) return false;
            return ordDate <= `${searchDateTo}T23:59:59`;
          });
        }

        // Default sort: newest ordered lab orders first
        filtered.sort((a, b) => {
          const tA = a.lab_order?.ordered_at || '';
          const tB = b.lab_order?.ordered_at || '';
          return tB.localeCompare(tA);
        });

        setSamples(filtered);
      }
    } catch (err) {
      console.error('Error fetching samples:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial trigger
  useEffect(() => {
    fetchSamples();
  }, [searchStatus, specimens, containers]);

  // Handle routing navigation parameter if any
  useEffect(() => {
    if (orderId) {
      setSearchStatus('Sample Send');
    }
  }, [orderId]);

  const handleClearFilters = () => {
    setSearchMrn('');
    setSearchPatientName('');
    setSearchAccessionNo('');
    setSearchLab('');
    setSearchSampleId('');
    setSearchLocation('');
    setSearchPsNo('');
    setSearchService('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchStatus('Sample Send');
    setRowsPerPage(10);
  };

  // Selection Checkboxes
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSampleIds(samples.map(s => s.id));
    } else {
      setSelectedSampleIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedSampleIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Barcode Submission (Auto-checks/searches)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBarcode) return;
    const barcode = scanBarcode.trim();

    const matched = samples.find(s => s.sample_no?.toLowerCase() === barcode.toLowerCase());
    if (matched) {
      setSelectedSampleIds(prev => 
        prev.includes(matched.id) ? prev : [...prev, matched.id]
      );
      setScanBarcode('');
    } else {
      // Pull search parameters
      setSearchSampleId(barcode);
      setSearchStatus('Sample Send');
      setScanBarcode('');
    }
  };

  // 1. Batch Accept Action
  const handleBatchAccept = async () => {
    if (selectedSampleIds.length === 0) {
      alert('Please select at least one sample to accept.');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();
      const userName = getLoggedInUser();

      // Group samples by lab order ID to call the accession endpoint correctly
      const groupedByOrder: { [orderId: string]: IncomingSample[] } = {};
      selectedSampleIds.forEach(id => {
        const sample = samples.find(s => s.id === id);
        if (!sample || !sample.lab_order?.id) return;
        const oId = sample.lab_order.id;
        if (!groupedByOrder[oId]) groupedByOrder[oId] = [];
        groupedByOrder[oId].push(sample);
      });

      const orderIds = Object.keys(groupedByOrder);

      for (const oId of orderIds) {
        const orderSamples = groupedByOrder[oId];

        // Fetch all samples for this order to ensure we keep the statuses of non-selected ones
        const { data: dbSamples } = await supabase
          .from('lims_samples')
          .select('*')
          .eq('lab_order_id', oId);

        const samplesPayload = (dbSamples || []).map(dbS => {
          const isSelected = selectedSampleIds.includes(dbS.id);
          const targetStatus = isSelected ? 'Accepted' : dbS.status;
          const matchingSelectedSample = orderSamples.find(s => s.id === dbS.id);
          return {
            id: dbS.id,
            status: targetStatus,
            condition: dbS.condition || 'Good',
            section: matchingSelectedSample?.section || dbS.section || 'Biochemistry'
          };
        });

        const payload = {
          labOrderId: oId,
          userId: currentUserId,
          receivedBy: userName,
          labSection: orderSamples[0].lab_order?.lab_section || 'Biochemistry',
          rejectionReason: null,
          rejectionComments: null,
          notifyPhysician: false,
          requestResample: false,
          samples: samplesPayload
        };
        let apiSuccess = false;
        if (BACKEND_URL) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/lims/orders/accept`, {
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
                apiSuccess = true;
              }
            }
          } catch (fetchErr) {
            console.error("Accept API connection failed, executing fallback:", fetchErr);
          }
        }

        if (!apiSuccess) {
          // Fallback direct updates if API fails
          const now = new Date().toISOString();
          
          await supabase
            .from('lims_samples')
            .update({
              status: 'Accepted',
              condition: 'Good',
              received_at: now,
              received_by: null
            })
            .in('id', orderSamples.map(x => x.id));

          const { error: updErr } = await supabase
            .from('lims_lab_orders')
            .update({
              status: 'Accepted',
              accepted_at: now,
              accepted_by: currentUserId,
              received_at: now,
              received_by: currentUserId,
              lab_section: orderSamples[0].lab_order?.lab_section || 'Biochemistry'
            })
            .eq('id', oId);

          if (updErr && updErr.code === '23503') {
            await supabase
              .from('lims_lab_orders')
              .update({
                status: 'Accepted',
                accepted_at: now,
                accepted_by: null,
                received_at: now,
                received_by: null,
                lab_section: orderSamples[0].lab_order?.lab_section || 'Biochemistry'
              })
              .eq('id', oId);
          }
        }
      }

      alert('Selected samples accepted successfully.');
      setSelectedSampleIds([]);
      await fetchSamples();


    } catch (err) {
      console.error(err);
      alert('Error accepting samples.');
    } finally {
      setSaving(false);
    }
  };

  // 2. Batch Reject Action
  const handleBatchReject = async () => {
    if (selectedSampleIds.length === 0) {
      alert('Please select at least one sample to reject.');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();
      const userName = getLoggedInUser();

      const groupedByOrder: { [orderId: string]: IncomingSample[] } = {};
      selectedSampleIds.forEach(id => {
        const sample = samples.find(s => s.id === id);
        if (!sample || !sample.lab_order?.id) return;
        const oId = sample.lab_order.id;
        if (!groupedByOrder[oId]) groupedByOrder[oId] = [];
        groupedByOrder[oId].push(sample);
      });

      const orderIds = Object.keys(groupedByOrder);

      for (const oId of orderIds) {
        const orderSamples = groupedByOrder[oId];
        const { data: dbSamples } = await supabase
          .from('lims_samples')
          .select('*')
          .eq('lab_order_id', oId);

        const samplesPayload = (dbSamples || []).map(dbS => {
          const isSelected = selectedSampleIds.includes(dbS.id);
          const targetStatus = isSelected ? 'Rejected' : dbS.status;
          return {
            id: dbS.id,
            status: targetStatus,
            condition: isSelected ? 'Haemolysed' : (dbS.condition || 'Good'),
            section: dbS.section || 'Biochemistry'
          };
        });

        const payload = {
          labOrderId: oId,
          userId: currentUserId,
          receivedBy: userName,
          labSection: 'Biochemistry',
          rejectionReason: 'Haemolysed',
          rejectionComments: 'Rejected from Accession Workbench',
          notifyPhysician: true,
          requestResample: true, // This reverts status back to Ordered (pending re-collection)
          samples: samplesPayload
        };

        const response = await fetch(`${BACKEND_URL}/api/lims/orders/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // Fallback direct updates if API fails
          const now = new Date().toISOString();

          await supabase
            .from('lims_samples')
            .update({
              status: 'Rejected',
              condition: 'Haemolysed',
              received_at: now,
              received_by: null
            })
            .in('id', orderSamples.map(x => x.id));

          await supabase
            .from('lims_lab_orders')
            .update({
              status: 'Ordered',
              accepted_at: null,
              accepted_by: null,
              received_at: null,
              received_by: null,
              collected_at: null,
              collected_by: null
            })
            .eq('id', oId);
        }
      }

      alert('Selected samples rejected and reverted back to collection desk.');
      setSelectedSampleIds([]);
      await fetchSamples();
    } catch (err) {
      console.error(err);
      alert('Error rejecting samples.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Batch Revert Action
  const handleBatchRevert = async () => {
    if (selectedSampleIds.length === 0) {
      alert('Please select at least one sample to revert.');
      return;
    }
    setSaving(true);
    try {
      for (const id of selectedSampleIds) {
        const sample = samples.find(s => s.id === id);
        if (!sample) continue;

        // Update sample status back to Collected
        await supabase
          .from('lims_samples')
          .update({
            status: 'Collected',
            received_at: null,
            received_by: null,
            rejection_reason: null,
            rejected_by: null
          })
          .eq('id', id);

        // Update parent lab order status back to Collected
        if (sample.lab_order?.id) {
          await supabase
            .from('lims_lab_orders')
            .update({
              status: 'Collected',
              accepted_at: null,
              accepted_by: null,
              received_at: null,
              received_by: null
            })
            .eq('id', sample.lab_order.id);
        }
      }
      alert('Selected samples reverted back to Collected status.');
      setSelectedSampleIds([]);
      await fetchSamples();
    } catch (err) {
      console.error(err);
      alert('Error reverting sample status.');
    } finally {
      setSaving(false);
    }
  };

  const getContainerStyle = (color: string) => {
    const norm = color?.toLowerCase() || '';
    if (norm.includes('purple') || norm.includes('lavender') || norm.includes('edta')) {
      return 'bg-purple-100 text-purple-750 border-purple-200';
    }
    if (norm.includes('yellow') || norm.includes('gold') || norm.includes('sst')) {
      return 'bg-amber-100 text-amber-750 border-amber-200';
    }
    if (norm.includes('red') || norm.includes('plain')) {
      return 'bg-rose-100 text-rose-750 border-rose-200';
    }
    if (norm.includes('blue') || norm.includes('citrate')) {
      return 'bg-blue-100 text-blue-750 border-blue-200';
    }
    if (norm.includes('green') || norm.includes('heparin')) {
      return 'bg-emerald-100 text-emerald-750 border-emerald-250';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const TestTubeIcon = ({ color }: { color: string }) => {
    const norm = color?.toLowerCase() || '';
    const capColorHex = 
      norm.includes('purple') || norm.includes('lavender') || norm.includes('edta') ? '#A78BFA' :
      norm.includes('yellow') || norm.includes('gold') || norm.includes('sst') ? '#FBBF24' :
      norm.includes('red') || norm.includes('plain') ? '#F87171' :
      norm.includes('blue') || norm.includes('citrate') ? '#60A5FA' :
      norm.includes('green') || norm.includes('heparin') ? '#34D399' :
      '#9CA3AF';

    return (
      <svg className="w-5 h-8 scale-90 shrink-0" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 6V26C7 28.7614 9.23858 31 12 31C14.7614 31 17 28.7614 17 26V6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        <rect x="5" y="2" width="14" height="4" rx="1.5" fill={capColorHex} stroke="#4B5563" strokeWidth="1.5" />
        <path d="M8 15V26C8 28.2091 9.79086 30 12 30C14.2091 30 16 28.2091 16 26V15H8Z" fill={capColorHex} opacity="0.6" />
      </svg>
    );
  };

  const visibleSamples = samples.slice(0, rowsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-[#0B2252] text-white py-4 px-6 rounded-2xl flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/lims/dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold tracking-wide">Accept Sample</h2>
            <p className="text-xxs text-slate-300 font-light mt-0.5">Accession workbench: verify condition, review parameters and batch accept/reject incoming samples</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xxs font-bold text-slate-300 uppercase tracking-widest hidden sm:inline">Laboratory / Accept Sample</span>
          <span className="bg-[#10B981] text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-inner select-none">
            Step 4 of 9
          </span>
        </div>
      </div>

      {/* Redesigned Search Filters section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
        <button 
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/55 transition-colors border-b border-slate-100"
        >
          <span className="text-xs font-bold text-[#0B2252] uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-4.5 h-4.5 text-[#1C58D9]" /> Search Filters
          </span>
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="text-xxs font-bold text-slate-500 hover:text-[#1C58D9] uppercase tracking-wider transition-colors"
            >
              Clear all
            </button>
            {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {filtersExpanded && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white">
            {/* MRN */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MRN</label>
              <input 
                type="text" 
                placeholder="Enter patient MRN..."
                value={searchMrn}
                onChange={e => setSearchMrn(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Patient Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Patient Name</label>
              <input 
                type="text" 
                placeholder="Search patient"
                value={searchPatientName}
                onChange={e => setSearchPatientName(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Accession No */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Accession No</label>
              <input 
                type="text" 
                placeholder="Accession"
                value={searchAccessionNo}
                onChange={e => setSearchAccessionNo(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Lab Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lab Name</label>
              <select 
                value={searchLab}
                onChange={e => setSearchLab(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="">-- Select --</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Haematology">Haematology</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Immunology">Immunology</option>
              </select>
            </div>

            {/* Sample ID */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sample ID</label>
              <input 
                type="text" 
                placeholder="Sample ID"
                value={searchSampleId}
                onChange={e => setSearchSampleId(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Ordering Location */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ordering Location</label>
              <select 
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="">-- Select --</option>
                <option value="Direct Billing">Direct Billing</option>
                <option value="OPD">OPD Clinic</option>
                <option value="IPD">IPD Ward</option>
              </select>
            </div>

            {/* PS No */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PS No</label>
              <input 
                type="text" 
                placeholder="PS No"
                value={searchPsNo}
                onChange={e => setSearchPsNo(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Service */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Service</label>
              <input 
                type="text" 
                placeholder="Service"
                value={searchService}
                onChange={e => setSearchService(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Ordered Date From */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ordered Date From</label>
              <input 
                type="date" 
                value={searchDateFrom}
                onChange={e => setSearchDateFrom(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Ordered Date To */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ordered Date To</label>
              <input 
                type="date" 
                value={searchDateTo}
                onChange={e => setSearchDateTo(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select 
                value={searchStatus}
                onChange={e => setSearchStatus(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="Sample Send">Sample Send</option>
                <option value="Sample Accepted">Sample Accepted</option>
                <option value="Sample Resend">Sample Resend</option>
                <option value="Sample Rejected">Sample Rejected</option>
              </select>
            </div>

            {/* Rows / Page */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rows / Page</label>
              <select 
                value={rowsPerPage}
                onChange={e => setRowsPerPage(parseInt(e.target.value) || 10)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Search Trigger */}
            <div className="flex items-end justify-end col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1">
              <button 
                onClick={fetchSamples}
                className="bg-[#1C58D9] hover:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all w-full"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barcode scanner bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <span className="text-xs font-extrabold text-[#0B2252] uppercase tracking-wider whitespace-nowrap">
            Barcode acceptance :
          </span>
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Scan or enter barcode..." 
              value={scanBarcode}
              onChange={e => setScanBarcode(e.target.value)}
              className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl pl-4 pr-10 py-2.5 text-xs w-full outline-none text-slate-700 font-mono font-bold shadow-inner"
            />
            <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-[#1C58D9] transition-colors">
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Table & Batch Action card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[450px]">
        {/* Table Top Action Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#1C58D9]">
              {samples.length} sample{samples.length !== 1 && 's'} found
            </span>
            {selectedSampleIds.length > 0 && (
              <span className="bg-[#1C58D9] text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold select-none">
                {selectedSampleIds.length} Selected
              </span>
            )}
            <span className="bg-blue-50 text-[#1C58D9] text-[9px] border border-blue-200 px-3 py-1 rounded-full font-bold uppercase tracking-wider select-none">
              Status: {searchStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleBatchAccept}
              disabled={selectedSampleIds.length === 0 || saving}
              className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
            <button 
              onClick={handleBatchReject}
              disabled={selectedSampleIds.length === 0 || saving}
              className="px-4 py-2 bg-[#EF4444] hover:bg-red-650 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <AlertTriangle className="w-4 h-4" /> Reject
            </button>
            <button 
              onClick={handleBatchRevert}
              disabled={selectedSampleIds.length === 0 || saving}
              className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Revert
            </button>
          </div>
        </div>

        {/* Dynamic Table queue */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
              <FlaskConical className="w-10 h-10 text-[#1C58D9] animate-bounce" />
              <span className="text-xs font-semibold">Loading accession queue...</span>
            </div>
          ) : samples.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-slate-400">
              <ClipboardList className="w-12 h-12 opacity-30 mb-2" />
              <span className="text-xs font-bold">NO SAMPLES PENDING ACCESSION</span>
              <span className="text-[10px] text-slate-400 mt-1 max-w-sm text-center">Modify your search filters above or scan a tube barcode to retrieve pending samples in real-time</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/50 font-bold">
                  <th className="py-3 px-4 text-center w-12 select-none">
                    <input 
                      type="checkbox"
                      checked={samples.length > 0 && selectedSampleIds.length === samples.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-350 text-[#1C58D9] accent-[#1C58D9] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Consulting Doctor</th>
                  <th className="py-3 px-4">Ordered Doctor</th>
                  <th className="py-3 px-4 text-center">Specimen</th>
                  <th className="py-3 px-4 text-center">Sample ID / Pack Slip No</th>
                  <th className="py-3 px-4">Lab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSamples.map(item => {
                  const patient = (item.lab_order?.service_order?.appointment?.patient || {}) as any;
                  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Walk-in';
                  const age = patient.dob
                    ? `${Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Y`
                    : '—';

                  const isSelected = selectedSampleIds.includes(item.id);

                  const consultingDoctor = item.lab_order?.service_order?.appointment?.doctor
                    ? `Dr. ${item.lab_order.service_order.appointment.doctor.first_name} ${item.lab_order.service_order.appointment.doctor.last_name || ''}`.trim()
                    : '—';

                  const orderedDoctor = item.lab_order?.service_order?.ordering_doctor
                    ? `Dr. ${item.lab_order.service_order.ordering_doctor.first_name} ${item.lab_order.service_order.ordering_doctor.last_name || ''}`.trim()
                    : '—';

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => handleSelectRow(item.id)}
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer select-none ${
                        isSelected ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-slate-350 text-[#1C58D9] accent-[#1C58D9] cursor-pointer"
                        />
                      </td>

                      {/* Patient Details */}
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-900 font-extrabold">{patientName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {patient.gender?.toUpperCase() || 'MALE'} · {patient.dob} ({age})
                          </span>
                          <span className="text-[9px] font-mono text-[#1C58D9] font-bold flex items-center gap-1.5 mt-0.5">
                            MRN: {patient.id || 'N/A'}
                          </span>
                          <span className="text-[9px] text-slate-450 font-normal flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {item.lab_order?.service_order?.appointment?.visit_type || 'Direct Billing'}
                          </span>
                          <span className="text-[10px] text-slate-700 font-extrabold mt-1 border-t border-slate-100 pt-1">
                            {(item.lab_order?.service?.name || item.lab_order?.service_order?.service_name || 'Lab Service')}
                          </span>
                        </div>
                      </td>

                      {/* Consulting Doctor */}
                      <td className="py-4 px-4 text-slate-600 font-bold">
                        {consultingDoctor}
                      </td>

                      {/* Ordered Doctor */}
                      <td className="py-4 px-4 text-slate-500 font-semibold">
                        {orderedDoctor}
                      </td>

                      {/* Specimen capped details */}
                      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <TestTubeIcon color={item.container?.name || 'Red'} />
                          <span className={`px-2 py-0.5 border text-[9px] font-extrabold rounded-full ${getContainerStyle(item.container?.name || 'Red')}`}>
                            {item.specimen?.name || 'SERUM'}
                          </span>
                        </div>
                      </td>

                      {/* Sample ID / pack slip */}
                      <td className="py-4 px-4 text-center font-mono" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-slate-900 font-extrabold text-[12px] tracking-wide">
                            {item.sample_no}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold select-none">
                            PSNO-{item.lab_order?.barcode_no?.replace('BAR-', '') || '00000'}
                          </span>
                        </div>
                      </td>

                      {/* LabSection */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                          {(() => {
                            const raw = item.section || item.lab_order?.lab_section || 'Dental';
                            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
                            if (isUuid) {
                              const sc = serviceCentres.find(s => s.id === raw);
                              if (sc) return sc.name;
                              const dept = departments.find(d => d.id === raw);
                              if (dept) return dept.name;
                            }
                            return raw;
                          })()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Bottom Action Toolbar */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={samples.length > 0 && selectedSampleIds.length === samples.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-350 text-[#1C58D9] accent-[#1C58D9] cursor-pointer"
              />
              Select All
            </label>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleBatchAccept}
                disabled={selectedSampleIds.length === 0 || saving}
                className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" /> Accept
              </button>
              <button 
                onClick={handleBatchReject}
                disabled={selectedSampleIds.length === 0 || saving}
                className="px-4 py-2 bg-[#EF4444] hover:bg-red-650 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <AlertTriangle className="w-4 h-4" /> Reject
              </button>
              <button 
                onClick={handleBatchRevert}
                disabled={selectedSampleIds.length === 0 || saving}
                className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Revert
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500 select-none">
            {selectedSampleIds.length} sample{selectedSampleIds.length !== 1 && 's'} selected · Ready to accept or reject
          </div>
        </div>
      </div>
    </div>
  );
}
