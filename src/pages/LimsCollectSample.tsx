import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabase, getAuthToken, BACKEND_URL } from '../services/supabaseClient';
import { 
  ArrowLeft, 
  FlaskConical, 
  Printer, 
  Check, 
  QrCode, 
  Info, 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  X, 
  RefreshCw, 
  Trash2,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';

interface ParameterSpecimen {
  id: string;
  name: string;
  code: string;
  specimenId: string;
  containerId: string;
  volume: string;
  site: string;
  temp: string;
  barcode: string;
  status: string;
  orderId?: string;
}

export default function LimsCollectSample() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const supabase = getSupabase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Master lists
  const [specimens, setSpecimens] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>(['ICU-01', 'ICU-02', 'Ward-A', 'Ward-B', 'OPD Clinic', 'Emergency', 'Dental']);
  const [labs, setLabs] = useState<string[]>(['Dental', 'Biochemistry', 'Haematology', 'Microbiology', 'Immunology', 'Clinical Pathology']);

  // Orders list & Selection
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [tempBarcodes, setTempBarcodes] = useState<{ [orderId: string]: string }>({});
  const [inlineRemarks, setInlineRemarks] = useState<{ [orderId: string]: string }>({});

  // Search Filters States (Start empty as per feedback)
  const [searchMrn, setSearchMrn] = useState('');
  const [searchSampleId, setSearchSampleId] = useState('');
  const [searchPsNo, setSearchPsNo] = useState('');
  const [searchLab, setSearchLab] = useState('');
  const [searchPatientName, setSearchPatientName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchService, setSearchService] = useState('');
  const [searchAccessionNo, setSearchAccessionNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('Ordered'); // Default is Ordered as shown in mockup status dropdown
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchProfile, setSearchProfile] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const getLoggedInUser = () => {
    try {
      const localUser = localStorage.getItem('medicore_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        return parsed.name || parsed.username || '';
      }
    } catch (e) {
      console.error('Error getting logged in user:', e);
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
      console.error('Error getting logged in user ID:', e);
    }
    return '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
  };

  // Fetch Master Data on load
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const { data: specData } = await supabase.from('lims_specimens').select('*').eq('status', 'Active');
        const { data: contData } = await supabase.from('lims_containers').select('*').eq('status', 'Active');
        const { data: deptData } = await supabase.from('departments').select('id, name').eq('status', 'Active');
        if (specData) setSpecimens(specData);
        if (contData) setContainers(contData);
        if (deptData) setDepartments(deptData);
      } catch (err) {
        console.error('Error loading Master Data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Orders based on active search filters in real-time
  const fetchOrders = async () => {
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
          collected_by,
          collector_badge,
          collection_remarks,
          identity_verified,
          consent_obtained,
          service_order:service_order_id (
            id,
            service_id,
            service_name,
            cpt_code,
            priority,
            ordering_doctor_id,
            instructions,
            service_center,
            ordering_doctor:ordering_doctor_id (
              first_name,
              last_name
            ),
            appointment:appointment_id (
              id,
              visit_type,
              doctor:doctor_id (
                first_name,
                last_name
              ),
              patient:patient_id (
                id,
                first_name,
                last_name,
                gender,
                dob
              )
            )
          )
        `);

      // 1. Status Filter
      if (searchStatus && searchStatus !== 'All') {
        query = query.eq('status', searchStatus);
      }

      // 2. Barcode/Sample ID/PS No/Accession No Filters
      if (searchSampleId) {
        query = query.ilike('barcode_no', `%${searchSampleId}%`);
      }
      if (searchPsNo) {
        query = query.ilike('barcode_no', `%${searchPsNo}%`);
      }
      if (searchAccessionNo) {
        query = query.ilike('barcode_no', `%${searchAccessionNo}%`);
      }

      // 3. Date Filters
      if (searchDateFrom) {
        query = query.gte('ordered_at', `${searchDateFrom}T00:00:00`);
      }
      if (searchDateTo) {
        query = query.lte('ordered_at', `${searchDateTo}T23:59:59`);
      }

      // 4. Lab section or Service Center
      if (searchLab) {
        query = query.or(`lab_section.ilike.%${searchLab}%,service_order.service_center.ilike.%${searchLab}%`);
      }

      // 5. Patient MRN & Patient Name Filters
      let patientIds: string[] = [];
      let hasPatientFilter = false;

      if (searchMrn) {
        hasPatientFilter = true;
        const { data: pts } = await supabase
          .from('patients')
          .select('id')
          .ilike('id', `%${searchMrn}%`);
        if (pts) patientIds.push(...pts.map(p => p.id));
      }

      if (searchPatientName) {
        hasPatientFilter = true;
        const { data: pts } = await supabase
          .from('patients')
          .select('id')
          .or(`first_name.ilike.%${searchPatientName}%,last_name.ilike.%${searchPatientName}%`);
        if (pts) {
          const ids = pts.map(p => p.id);
          if (patientIds.length > 0) {
            patientIds = patientIds.filter(id => ids.includes(id));
          } else {
            patientIds = ids;
          }
        }
      }

      if (hasPatientFilter) {
        if (patientIds.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        // Resolve appointments for these patients
        const { data: apps } = await supabase
          .from('appointments')
          .select('id')
          .in('patient_id', patientIds);

        if (!apps || apps.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const appIds = apps.map(a => a.id);
        // Resolve service orders for these appointments
        const { data: srvs } = await supabase
          .from('service_orders')
          .select('id')
          .in('appointment_id', appIds);

        if (!srvs || srvs.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const srvIds = srvs.map(s => s.id);
        query = query.in('service_order_id', srvIds);
      }

      // Execute main query
      const { data: ordersData, error: queryErr } = await query
        .order('ordered_at', { ascending: false })
        .limit(rowsPerPage);

      if (queryErr) throw queryErr;

      if (ordersData) {
        // Normalize nested relations from arrays to single objects if needed
        const normalizedOrders = (ordersData as any[]).map(o => {
          const serviceOrder = Array.isArray(o.service_order) ? o.service_order[0] : o.service_order;
          
          const appointment = serviceOrder && Array.isArray(serviceOrder.appointment) 
            ? serviceOrder.appointment[0] 
            : serviceOrder?.appointment;

          const patient = appointment && Array.isArray(appointment.patient)
            ? appointment.patient[0]
            : appointment?.patient;

          const doctor = appointment && Array.isArray(appointment.doctor)
            ? appointment.doctor[0]
            : appointment?.doctor;

          const orderingDoctor = serviceOrder && Array.isArray(serviceOrder.ordering_doctor)
            ? serviceOrder.ordering_doctor[0]
            : serviceOrder?.ordering_doctor;

          return {
            ...o,
            service_order: serviceOrder ? {
              ...serviceOrder,
              appointment: appointment ? {
                ...appointment,
                patient,
                doctor
              } : null,
              ordering_doctor: orderingDoctor
            } : null
          };
        });

        // Resolve specimens and containers for all retrieved orders
        const finalOrders = [];
        const orderIds = normalizedOrders.map(o => o.id);
        
        // Fetch existing samples from DB
        const { data: samplesData } = await supabase
          .from('lims_samples')
          .select('*')
          .in('lab_order_id', orderIds);

        // Fetch service parameters for mapping if DB samples don't exist
        const serviceIds = Array.from(new Set(normalizedOrders.map(o => o.service_order?.service_id).filter(Boolean)));
        let paramsData: any[] = [];
        if (serviceIds.length > 0) {
          const { data: pData } = await supabase
            .from('lims_service_parameters')
            .select('*')
            .in('service_id', serviceIds);
          if (pData) paramsData = pData;
        }

        for (const order of normalizedOrders) {
          const dbSamples = samplesData?.filter(s => s.lab_order_id === order.id) || [];
          let resolvedSpecimen = null;
          let resolvedContainer = null;
          let barcode = order.barcode_no;

          if (dbSamples.length > 0) {
            const firstSample = dbSamples[0];
            resolvedSpecimen = specimens.find(s => s.id === firstSample.specimen_id);
            resolvedContainer = containers.find(c => c.id === firstSample.container_id);
            barcode = firstSample.sample_no;
          } else {
            // Dynamically fall back based on parameters or service name
            const sParams = paramsData.filter(p => p.service_id === order.service_order?.service_id);
            const nameLower = (order.service_order?.service_name || '').toLowerCase();
            const paramNamesLower = sParams.map(p => p.name.toLowerCase()).join(' ');

            let defSpec = specimens[0];
            let defCont = containers[0];

            if (nameLower.includes('urine') || paramNamesLower.includes('urine')) {
              defSpec = specimens.find(s => s.name.toLowerCase().includes('urine')) || defSpec;
              defCont = containers.find(c => c.name.toLowerCase().includes('cup') || c.name.toLowerCase().includes('sterile')) || defCont;
            } else if (nameLower.includes('creatinine') || nameLower.includes('liver') || nameLower.includes('lft') || nameLower.includes('rft') || paramNamesLower.includes('creatinine') || paramNamesLower.includes('liver')) {
              defSpec = specimens.find(s => s.name.toLowerCase().includes('blood') || s.name.toLowerCase().includes('serum')) || defSpec;
              defCont = containers.find(c => c.name.toLowerCase().includes('edta') || c.name.toLowerCase().includes('sst') || c.name.toLowerCase().includes('gold') || c.name.toLowerCase().includes('purple')) || defCont;
            } else if (nameLower.includes('cbc') || nameLower.includes('haem') || paramNamesLower.includes('cbc') || paramNamesLower.includes('haem')) {
              defSpec = specimens.find(s => s.name.toLowerCase().includes('blood')) || defSpec;
              defCont = containers.find(c => c.name.toLowerCase().includes('edta') || c.name.toLowerCase().includes('purple')) || defCont;
            }

            resolvedSpecimen = defSpec;
            resolvedContainer = defCont;
          }

          finalOrders.push({
            ...order,
            specimen: resolvedSpecimen,
            container: resolvedContainer,
            resolvedBarcode: barcode
          });
        }
        setOrders(finalOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial trigger
  useEffect(() => {
    fetchOrders();
  }, [searchStatus, rowsPerPage, specimens, containers]);

  // Handle specific orderId navigation context
  useEffect(() => {
    if (orderId) {
      setSearchPsNo(orderId);
      setSearchStatus('All');
    }
  }, [orderId]);

  // Collapsible Search Toggle
  const toggleFilters = () => setFiltersExpanded(!filtersExpanded);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchMrn('');
    setSearchSampleId('');
    setSearchPsNo('');
    setSearchLab('');
    setSearchPatientName('');
    setSearchLocation('');
    setSearchService('');
    setSearchAccessionNo('');
    setSearchStatus('Ordered');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchProfile('');
    setRowsPerPage(50);
  };

  // Checkbox Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(orders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 1. Generate Barcodes / Sample IDs (and instantly print them)
  const handleGenerateBarcodes = () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to generate barcode.');
      return;
    }
    const updatedBarcodes = { ...tempBarcodes };
    selectedOrderIds.forEach(id => {
      const order = orders.find(o => o.id === id);
      const existing = tempBarcodes[id] || order?.resolvedBarcode;
      if (!existing) {
        // Generate standard barcode format e.g. BC-2026-89472
        const year = new Date().getFullYear();
        const rand = Math.floor(10000 + Math.random() * 90000);
        updatedBarcodes[id] = `BC-${year}-${rand}`;
      }
    });
    setTempBarcodes(updatedBarcodes);

    // Instant printing
    triggerPrintLabels(selectedOrderIds, updatedBarcodes);
  };

  // 2. Send (Confirm Collection & Redirect to Accept Desk)
  const handleSendCollection = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to collect.');
      return;
    }

    // Check if all selected orders are already collected
    const allCollected = selectedOrderIds.every(id => {
      const orderData = orders.find(o => o.id === id);
      return orderData?.status === 'Collected';
    });

    if (allCollected) {
      // If already collected, directly navigate to Accept page
      navigate(`/lims/accept/${selectedOrderIds[0]}`);
      return;
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      const currentUserId = getLoggedInUserId();
      const now = new Date().toISOString();

      // We collect each selected order one by one
      for (const id of selectedOrderIds) {
        const orderData = orders.find(o => o.id === id);
        if (!orderData) continue;

        // Skip orders that are already collected
        if (orderData.status === 'Collected') continue;

        const barcode = tempBarcodes[id] || orderData.resolvedBarcode || `BC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const remarks = inlineRemarks[id] || '';

        // Call the collection API for this specific lab order
        const payload = {
          labOrderId: id,
          userId: currentUserId,
          collectorBadge: getLoggedInUser(),
          collectionRemarks: remarks,
          identityVerified: true,
          consentObtained: true,
          samples: [
            {
              specimenId: orderData.specimen?.id || specimens[0]?.id,
              containerId: orderData.container?.id || containers[0]?.id,
              volumeMl: '3 mL',
              collectionSite: 'Left arm',
              tempReq: 'Room temp',
              sampleNo: barcode,
              orderId: id
            }
          ]
        };

        const response = await fetch(`${BACKEND_URL}/api/lims/orders/collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // Fallback to direct supabase updates if backend collect route fails
          const { error: updErr } = await supabase.from('lims_lab_orders').update({
            status: 'Collected',
            collected_at: now,
            collected_by: currentUserId,
            collection_remarks: remarks,
            identity_verified: true,
            consent_obtained: true
          }).eq('id', id);

          if (updErr && updErr.code === '23503') {
            await supabase.from('lims_lab_orders').update({
              status: 'Collected',
              collected_at: now,
              collected_by: null,
              collection_remarks: remarks,
              identity_verified: true,
              consent_obtained: true
            }).eq('id', id);
          }

          const { data: existingSample } = await supabase
            .from('lims_samples')
            .select('id')
            .eq('lab_order_id', id)
            .single();

          const samplePayload = {
            lab_order_id: id,
            specimen_id: orderData.specimen?.id || specimens[0]?.id,
            container_id: orderData.container?.id || containers[0]?.id,
            sample_no: barcode,
            status: 'Collected',
            collection_site: 'Left arm',
            volume_ml: 3.0,
            temp_req: 'Room temp'
          };

          if (existingSample) {
            await supabase.from('lims_samples').update(samplePayload).eq('id', existingSample.id);
          } else {
            await supabase.from('lims_samples').insert({ id: crypto.randomUUID(), ...samplePayload });
          }
        }
      }

      alert('Selected samples collected successfully.');
      setSelectedOrderIds([]);
      setTempBarcodes({});
      setInlineRemarks({});
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Error registering collection.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Revert Collection
  const handleRevertCollection = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to revert.');
      return;
    }
    setSaving(true);
    try {
      for (const id of selectedOrderIds) {
        // Update lab order status to Ordered
        await supabase
          .from('lims_lab_orders')
          .update({
            status: 'Ordered',
            collected_at: null,
            collected_by: null,
            collection_remarks: null
          })
          .eq('id', id);

        // Delete samples registered for this order
        await supabase
          .from('lims_samples')
          .delete()
          .eq('lab_order_id', id);
      }
      alert('Selected orders reverted back to Ordered.');
      setSelectedOrderIds([]);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Error reverting collection status.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Print Labels (Single stick layout page with breaks)
  const handlePrintLabels = () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order to print.');
      return;
    }
    triggerPrintLabels(selectedOrderIds, tempBarcodes);
  };

  const triggerPrintLabels = (ids: string[], barcodesMap: { [id: string]: string }) => {
    const printWindow = window.open('', '_blank', 'width=700,height=500');
    if (!printWindow) return;

    let stickerHtml = '';
    ids.forEach(id => {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const barcode = barcodesMap[id] || order.resolvedBarcode || 'BC-00000';
      const patient = order.service_order?.appointment?.patient || {};
      const patName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
      const dob = patient.dob || '—';
      const gender = patient.gender || '—';
      const mrn = patient.id || '—';
      const specName = order.specimen?.name || 'Specimen';
      const contName = order.container?.name || 'Container';
      const testName = order.service_order?.service_name || 'Lab Service';
      const collTime = new Date().toLocaleString();
      const tech = getLoggedInUser();

      // Encode patient name, MRN, test name, and specimen type for barcode scanner reading
      const barcodeData = `${patName} | ${mrn} | ${testName} | ${specName}`;

      stickerHtml += `
        <div class="sticker">
          <div class="header">
            <span class="bold">${patName}</span> (${gender})
          </div>
          <div class="content">
            <div class="details">
              <div>MRN: <span class="bold">${mrn}</span></div>
              <div>DOB: ${dob}</div>
              <div>TEST: <span class="bold">${specName}</span></div>
              <div>TUBE: ${contName}</div>
              <div>BARCODE: <span class="bold">${barcode}</span></div>
            </div>
            <div class="barcode-container">
              <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=Code128&hidetext=true" alt="Barcode" />
            </div>
          </div>
          <div class="footer">
            <span>Coll: ${collTime}</span>
            <span>Tech: ${tech}</span>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Tube Stickers</title>
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .sticker {
              font-family: 'Courier New', Courier, monospace;
              width: 50mm;
              height: 25mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-size: 7px;
              line-height: 1.1;
              color: #000;
              padding: 2px 4px;
              page-break-after: always;
            }
            .header {
              font-weight: bold;
              font-size: 8px;
              border-bottom: 0.5px solid #000;
              padding-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .content {
              display: flex;
              flex: 1;
              padding: 2px 0;
              align-items: center;
              justify-content: space-between;
            }
            .details {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              font-size: 6px;
            }
            .barcode-container {
              width: 80px;
              height: 35px;
              margin-left: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .barcode-container img {
              width: 100%;
              height: 100%;
              object-fit: fill;
            }
            .footer {
              font-size: 5.5px;
              border-top: 0.5px solid #000;
              padding-top: 1px;
              display: flex;
              justify-content: space-between;
            }
            .bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${stickerHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getContainerStyle = (color: string) => {
    const norm = color?.toLowerCase() || '';
    if (norm.includes('purple') || norm.includes('lavender') || norm.includes('edta')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (norm.includes('yellow') || norm.includes('gold') || norm.includes('sst')) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    if (norm.includes('red') || norm.includes('plain')) {
      return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    if (norm.includes('blue') || norm.includes('citrate')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (norm.includes('green') || norm.includes('heparin')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-250';
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

  const BarcodeSVG = ({ code }: { code: string }) => {
    return (
      <div className="flex flex-col items-center gap-0.5 select-none font-mono">
        <svg className="w-24 h-6 opacity-75" viewBox="0 0 100 30" preserveAspectRatio="none">
          <rect x="0" width="2" height="30" fill="black" />
          <rect x="4" width="1" height="30" fill="black" />
          <rect x="7" width="3" height="30" fill="black" />
          <rect x="12" width="1" height="30" fill="black" />
          <rect x="15" width="2" height="30" fill="black" />
          <rect x="19" width="4" height="30" fill="black" />
          <rect x="25" width="1" height="30" fill="black" />
          <rect x="28" width="2" height="30" fill="black" />
          <rect x="32" width="3" height="30" fill="black" />
          <rect x="37" width="1" height="30" fill="black" />
          <rect x="40" width="2" height="30" fill="black" />
          <rect x="44" width="4" height="30" fill="black" />
          <rect x="50" width="2" height="30" fill="black" />
          <rect x="54" width="1" height="30" fill="black" />
          <rect x="57" width="3" height="30" fill="black" />
          <rect x="62" width="1" height="30" fill="black" />
          <rect x="65" width="2" height="30" fill="black" />
          <rect x="69" width="4" height="30" fill="black" />
          <rect x="75" width="1" height="30" fill="black" />
          <rect x="78" width="2" height="30" fill="black" />
          <rect x="82" width="3" height="30" fill="black" />
          <rect x="87" width="1" height="30" fill="black" />
          <rect x="90" width="2" height="30" fill="black" />
          <rect x="94" width="4" height="30" fill="black" />
        </svg>
        <span className="text-[9px] text-slate-500 font-semibold tracking-wider font-mono">{code}</span>
      </div>
    );
  };

  const isSendDisabled = selectedOrderIds.length === 0 || saving || selectedOrderIds.some(id => {
    const o = orders.find(x => x.id === id);
    return o?.status === 'Collected' || o?.status === 'Accepted' || o?.status === 'In Process' || o?.status === 'Result' || o?.status === 'Certified';
  });

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
            <h2 className="text-base font-extrabold tracking-wide">Collect Sample</h2>
            <p className="text-xxs text-slate-300 font-light mt-0.5">Redesigned workbench: search laboratory orders and confirm specimen collection</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xxs font-bold text-slate-300 uppercase tracking-widest hidden sm:inline">Laboratory / Collect Sample</span>
          <span className="bg-[#10B981] text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-inner select-none">
            Step 2 of 9
          </span>
        </div>
      </div>

      {/* Redesigned Search Filters section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
        <button 
          onClick={toggleFilters}
          className="w-full px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-[#1C58D9]" /> Search Filters
          </span>
          <div className="flex items-center gap-4 text-slate-400 hover:text-slate-650">
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

            {/* Sample ID */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sample ID</label>
              <input 
                type="text" 
                placeholder="Enter ID"
                value={searchSampleId}
                onChange={e => setSearchSampleId(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              />
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

            {/* Lab */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lab</label>
              <select 
                value={searchLab}
                onChange={e => setSearchLab(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="">-- Select --</option>
                {labs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
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

            {/* Ordering Location */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ordering Location</label>
              <select 
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="">-- Select --</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
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

            {/* Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select 
                value={searchStatus}
                onChange={e => setSearchStatus(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="All">All</option>
                <option value="Ordered">Ordered</option>
                <option value="Collected">Collected</option>
                <option value="Accepted">Accepted</option>
                <option value="In Process">In Process</option>
                <option value="Result">Result</option>
                <option value="Certified">Certified</option>
              </select>
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

            {/* Profile */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Profile</label>
              <select 
                value={searchProfile}
                onChange={e => setSearchProfile(e.target.value)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value="">-- Select --</option>
                <option value="CBC">CBC Profile</option>
                <option value="LFT">LFT Profile</option>
                <option value="RFT">RFT Profile</option>
              </select>
            </div>

            {/* Rows / Page */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rows / Page</label>
              <select 
                value={rowsPerPage}
                onChange={e => setRowsPerPage(parseInt(e.target.value) || 50)}
                className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-xl px-3 py-2 text-xs w-full outline-none text-slate-700 transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Trigger Button */}
            <div className="flex items-end justify-end col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 mt-3 sm:mt-0">
              <button 
                onClick={fetchOrders}
                className="bg-[#1C58D9] hover:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all w-full"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Workbench results */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[450px]">
        {/* Table Top Action Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#1C58D9]">
              {orders.length} order{orders.length !== 1 && 's'} found
            </span>
            {selectedOrderIds.length > 0 && (
              <span className="bg-[#1C58D9] text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold select-none">
                {selectedOrderIds.length} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleGenerateBarcodes}
              disabled={selectedOrderIds.length === 0}
              className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" /> Generate
            </button>
            <button 
              onClick={handleSendCollection}
              disabled={isSendDisabled}
              className="px-4 py-2 bg-[#0B2252] hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> Send
            </button>
            <button 
              onClick={handleRevertCollection}
              disabled={selectedOrderIds.length === 0 || saving}
              className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Revert
            </button>
            <button 
              onClick={handlePrintLabels}
              disabled={selectedOrderIds.length === 0}
              className="px-4 py-2 bg-[#1C58D9] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" /> Print Labels
            </button>
          </div>
        </div>

        {/* Dynamic Table list */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
              <FlaskConical className="w-10 h-10 text-[#1C58D9] animate-bounce" />
              <span className="text-xs font-semibold">Loading orders queue...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-400">
              <FlaskConical className="w-12 h-12 opacity-35 text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">No laboratory records found</h4>
              <p className="text-[11px] max-w-sm text-center leading-relaxed">Modify your search filters above or click Search to refresh the real-time list from the DB.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/50 font-bold">
                  <th className="py-3 px-4 text-center w-12 select-none">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-350 text-[#1C58D9] accent-[#1C58D9] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Order Details</th>
                  <th className="py-3 px-4">Consulting Doctor</th>
                  <th className="py-3 px-4">Ordered Doctor</th>
                  <th className="py-3 px-4 text-center">Specimen</th>
                  <th className="py-3 px-4 text-center">Container</th>
                  <th className="py-3 px-4 text-center">Sample ID / Pack Slip No</th>
                  <th className="py-3 px-4">Lab</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Md Info</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((item) => {
                  const patient = item.service_order?.appointment?.patient || {};
                  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Walk-in';
                  const arabicName = '';
                  const age = patient.dob 
                    ? `${Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Y` 
                    : '—';

                  const isSelected = selectedOrderIds.includes(item.id);
                  const barcode = tempBarcodes[item.id] || item.resolvedBarcode || '';

                  // Status Badge Colors
                  const statusColors = 
                    item.status === 'Ordered' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                    item.status === 'Collected' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                    item.status === 'Accepted' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    item.status === 'In Process' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    item.status === 'Result' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    item.status === 'Certified' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-slate-100 text-slate-600 border-slate-200';

                  const consultingDoctor = item.service_order?.appointment?.doctor 
                    ? `Dr. ${item.service_order.appointment.doctor.first_name} ${item.service_order.appointment.doctor.last_name || ''}`.trim()
                    : '—';

                  const orderedDoctor = item.service_order?.ordering_doctor
                    ? `Dr. ${item.service_order.ordering_doctor.first_name} ${item.service_order.ordering_doctor.last_name || ''}`.trim()
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
                          <span className="text-slate-900 font-extrabold flex items-center gap-1.5">
                            {patientName}
                            {arabicName && <span className="text-xs font-semibold text-[#1C58D9]" dir="rtl">{arabicName}</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {patient.gender?.toUpperCase() || 'MALE'} · {patient.dob} ({age})
                          </span>
                          <span className="text-[10px] text-[#1C58D9] font-mono font-bold tracking-wide">
                            {patient.id || 'KTMC0000209975'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            KTMC, {item.service_order?.appointment?.visit_type || 'OP-004'}
                          </span>
                        </div>
                      </td>

                      {/* Order Details */}
                      <td className="py-4 px-4 text-slate-700">
                        <div className="flex flex-col gap-1">
                          <strong className="text-xs font-bold text-slate-800">
                            {item.service_order?.cpt_code || 'EMR'} | {item.service_order?.service_name || 'Lab Service'}
                          </strong>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${statusColors}`}>
                              {item.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-light flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.ordered_at ? new Date(item.ordered_at).toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Consulting Doctor */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        {consultingDoctor}
                      </td>

                      {/* Ordered Doctor */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        {orderedDoctor}
                      </td>

                      {/* Specimen */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <TestTubeIcon color={item.container?.cap_color || 'red'} />
                          <span className="text-[10px] text-slate-500 font-semibold">{item.specimen?.name || 'EDTA blood'}</span>
                        </div>
                      </td>

                      {/* Container */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shadow-inner tracking-wider select-none ${getContainerStyle(item.container?.name || '')}`}>
                          {item.container?.name || 'EDTA Purple'}
                        </span>
                      </td>

                      {/* Barcode/Sample ID/Pack Slip No */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        {barcode ? (
                          <BarcodeSVG code={barcode} />
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not generated</span>
                        )}
                      </td>

                      {/* Lab Section */}
                      <td className="py-4 px-4 text-slate-700 font-semibold">
                         {(() => {
                           const raw = item.lab_section || item.service_order?.service_center || '';
                           // If raw looks like a UUID, resolve to department name
                           const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
                           if (isUuid) {
                             const dept = departments.find(d => d.id === raw);
                             return dept ? dept.name : raw;
                           }
                           return raw || '—';
                         })()}
                      </td>

                      {/* Remarks */}
                      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          placeholder="Add note"
                          value={inlineRemarks[item.id] || item.collection_remarks || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setInlineRemarks(prev => ({ ...prev, [item.id]: val }));
                          }}
                          className="bg-white border border-slate-200 focus:border-[#1C58D9] rounded-lg px-2.5 py-1.5 text-xxs w-full max-w-[120px] outline-none text-slate-700 transition-colors font-medium placeholder:text-slate-400"
                        />
                      </td>

                      {/* Md Info */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button className="text-[#1C58D9] hover:text-blue-800 transition-colors p-1" title="Order Information">
                          <Info className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleSelectRow(item.id)}
                          className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider active:scale-95 transition-all select-none shadow-sm ${
                            isSelected 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-650' 
                              : 'bg-[#10B981] hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {isSelected ? 'Deselect' : 'Select'}
                        </button>
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
                checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-350 text-[#1C58D9] accent-[#1C58D9] cursor-pointer"
              />
              Select All
            </label>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleGenerateBarcodes}
                disabled={selectedOrderIds.length === 0}
                className="px-4 py-2 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <QrCode className="w-4 h-4" /> Generate
              </button>
              <button 
                onClick={handleSendCollection}
                disabled={isSendDisabled}
                className="px-4 py-2 bg-[#0B2252] hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" /> Send
              </button>
              <button 
                onClick={handleRevertCollection}
                disabled={selectedOrderIds.length === 0 || saving}
                className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Revert
              </button>
              <button 
                onClick={handlePrintLabels}
                disabled={selectedOrderIds.length === 0}
                className="px-4 py-2 bg-[#1C58D9] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" /> Print Labels
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500 select-none">
            {selectedOrderIds.length > 0 ? (
              <span className="text-[#10B981] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
                {selectedOrderIds.length} order{selectedOrderIds.length !== 1 && 's'} selected - Ready to generate
              </span>
            ) : (
              '0 orders selected'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
