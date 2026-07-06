import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, getAuthToken, BACKEND_URL } from '../services/supabaseClient';
import { LimsLabOrder, LimsSpecimen, LimsContainer, LimsServiceParameter } from '../types';
import { 
  Activity, 
  Search, 
  Barcode, 
  QrCode,
  ShieldCheck, 
  FileCheck2, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle,
  FlaskConical, 
  UserCheck, 
  ClipboardList,
  Check,
  X,
  PlusCircle,
  XCircle,
  Send,
  History,
  Trash2,
  ChevronRight,
  FileText,
  Sliders,
  Cpu,
  HelpCircle
} from 'lucide-react';

interface CardConfig {
  id: string;
  title: string;
  color: string;
  desc: string;
  icon: any;
}

export default function LimsDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LimsLabOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCard, setActiveCard] = useState<string>('collect');
  const [showPathologistQueue, setShowPathologistQueue] = useState(false);

  // Phlebotomy / Collection states
  const [specimens, setSpecimens] = useState<LimsSpecimen[]>([]);
  const [containers, setContainers] = useState<LimsContainer[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LimsLabOrder | null>(null);
  const [specimenId, setSpecimenId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [barcodeNo, setBarcodeNo] = useState('');

  // QA Accession states
  const [qaSufficient, setQaSufficient] = useState(true);
  const [qaContainer, setQaContainer] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  // Result entry states
  const [showResultModal, setShowResultModal] = useState(false);
  const [testParameters, setTestParameters] = useState<LimsServiceParameter[]>([]);
  const [resultValues, setResultValues] = useState<{ [key: string]: string }>({});

  // Pathologist Verification states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [savedResults, setSavedResults] = useState<any[]>([]);

  // Service Order Creation states
  const [showServiceOrderModal, setShowServiceOrderModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [orderPriority, setOrderPriority] = useState('Routine');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Automated Result Simulation states
  const [showAutomatedModal, setShowAutomatedModal] = useState(false);
  const [simulatedParams, setSimulatedParams] = useState<any[]>([]);
  const [simulatedValues, setSimulatedValues] = useState<{ [key: string]: string }>({});

  // Real-time Statistics
  const [stats, setStats] = useState({
    pending: 0,
    collected: 0,
    resultsPending: 0,
    certifiedToday: 0,
    newTodayCount: 0,
    collectedThisHour: 0,
    overdueCount: 0
  });

  const supabase = getSupabase();

  // Mapped config of the 12 action cards matching the colors and icons from the screenshot
  const cardConfigs: CardConfig[] = [
    { id: 'service', title: 'Service Order', color: 'bg-[#102A64]', desc: 'Create lab order', icon: PlusCircle },
    { id: 'cancel', title: 'Cancel Order', color: 'bg-[#842323]', desc: 'Cancel existing order', icon: XCircle },
    { id: 'collect', title: 'Collect Sample', color: 'bg-[#1B4353]', desc: 'Register collection', icon: FlaskConical },
    { id: 'send', title: 'Send Sample', color: 'bg-[#0B6623]', desc: 'Dispatch to lab', icon: Send },
    { id: 'reject', title: 'Reject Sample', color: 'bg-[#842323]', desc: 'Flag as rejected', icon: AlertTriangle },
    { id: 'accept', title: 'Accept Sample', color: 'bg-[#0E5E4E]', desc: 'Approve for testing', icon: Check },
    { id: 'resend', title: 'Resend Sample', color: 'bg-[#1B4353]', desc: 'Re-dispatch sample', icon: RefreshCw },
    { id: 'retest', title: 'ReTest', color: 'bg-[#4A154B]', desc: 'Order retest', icon: History },
    { id: 'perform', title: 'Perform Test', color: 'bg-[#102A64]', desc: 'Run test workflow', icon: Activity },
    { id: 'resample', title: 'Resample', color: 'bg-[#1B4353]', desc: 'Collect new sample', icon: FlaskConical },
    { id: 'capture', title: 'Capture Result', color: 'bg-[#0E5E4E]', desc: 'Enter test result', icon: FileText },
    { id: 'automated', title: 'Automated Result', color: 'bg-[#4A154B]', desc: 'Import from analyzer', icon: Sliders }
  ];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch lab orders with nested relations
      const { data: dbOrders, error } = await supabase
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
        `);

      let fetchedOrders: LimsLabOrder[] = [];
      if (dbOrders && !error) {
        fetchedOrders = dbOrders.map((o: any) => {
          const patient = o.service_order?.appointment?.patient || {};
          return {
            id: o.id,
            serviceOrderId: o.service_order_id,
            barcodeNo: o.barcode_no,
            priority: o.priority || 'Routine',
            status: o.status,
            orderedAt: o.ordered_at,
            collectedAt: o.collected_at,
            acceptedAt: o.accepted_at,
            certifiedAt: o.certified_at,
            patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Walk-in Patient',
            patientAge: patient.dob ? `${Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Y` : '30 Y',
            patientGender: patient.gender || 'Unknown',
            serviceName: o.service_order?.service_name || 'Lab Service'
          };
        });
        setOrders(fetchedOrders);
      }

      // 2. Fetch specimens & containers
      const { data: spec } = await supabase.from('lims_specimens').select('*');
      const { data: cont } = await supabase.from('lims_containers').select('*');
      if (spec) setSpecimens(spec);
      if (cont) setContainers(cont);

      // 3. Compute stats dynamically in real time from DB records
      const pendingCount = fetchedOrders.filter(o => o.status === 'Ordered').length;
      const collectedCount = fetchedOrders.filter(o => o.status === 'Collected').length;
      const resultsPendingCount = fetchedOrders.filter(o => ['Accepted', 'In Process', 'Result'].includes(o.status)).length;
      
      // Count certified today
      const today = new Date().toDateString();
      const certifiedTodayCount = fetchedOrders.filter(o => o.status === 'Certified' && o.certifiedAt && new Date(o.certifiedAt).toDateString() === today).length;

      // Count new today (Ordered today)
      const newToday = fetchedOrders.filter(o => o.orderedAt && new Date(o.orderedAt).toDateString() === today).length;

      // Count collected this hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const collectedThisHourCount = fetchedOrders.filter(o => o.collectedAt && new Date(o.collectedAt).getTime() > oneHourAgo).length;

      // Overdue count (Ordered > 2 hours ago but results not done yet)
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      const overdue = fetchedOrders.filter(o => o.status !== 'Certified' && o.status !== 'Cancelled' && o.orderedAt && new Date(o.orderedAt).getTime() < twoHoursAgo).length;

      setStats({
        pending: pendingCount,
        collected: collectedCount,
        resultsPending: resultsPendingCount,
        certifiedToday: certifiedTodayCount,
        newTodayCount: newToday,
        collectedThisHour: collectedThisHourCount,
        overdueCount: overdue
      });
    } catch (err) {
      console.error('Error fetching LIMS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTransition = async (labOrderId: string, targetStatus: string, comments?: string) => {
    try {
      const token = await getAuthToken();
      const localUser = localStorage.getItem('medicore_user') ? JSON.parse(localStorage.getItem('medicore_user')!) : null;
      const currentUserId = localUser?.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
      const payload = {
        labOrderId,
        targetStatus,
        userId: currentUserId, // mock admin employee
        comments
      };

      const response = await fetch(`${BACKEND_URL}/api/lims/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Fallback: transition state directly via Supabase client if server endpoint fails
        await supabase
          .from('lims_lab_orders')
          .update({ status: targetStatus, accepted_at: targetStatus === 'Accepted' ? new Date().toISOString() : undefined })
          .eq('id', labOrderId);
      }

      await fetchDashboardData();
      setSelectedOrder(null);
      setBarcodeNo('');
      setSpecimenId('');
      setContainerId('');
      setQaSufficient(true);
      setQaContainer(true);
      setRejectionReason('');
      setShowResultModal(false);
      setShowVerifyModal(false);
      setShowAutomatedModal(false);
    } catch (err) {
      console.error('Error transitioning order status:', err);
    }
  };

  // 1. Phlebotomy (Collect Sample) Action
  const triggerCollection = async () => {
    if (!selectedOrder) return;
    try {
      await supabase.from('lims_samples').insert({
        id: crypto.randomUUID(),
        lab_order_id: selectedOrder.id,
        specimen_id: specimenId || null,
        container_id: containerId || null,
        sample_no: `SMP-${Date.now().toString().slice(-6)}`,
        status: 'Collected'
      });

      await handleTransition(selectedOrder.id, 'Collected', `Sample collected: Specimen: ${specimenId}, Container: ${containerId}`);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. QA Accession (Accept Sample) Action
  const triggerAccession = async () => {
    if (!selectedOrder) return;
    try {
      if (!qaSufficient || !qaContainer) {
        await supabase.from('lims_samples')
          .update({ status: 'Rejected', rejection_reason: rejectionReason })
          .eq('lab_order_id', selectedOrder.id);
        
        await handleTransition(selectedOrder.id, 'Ordered', `Sample rejected: ${rejectionReason}`);
      } else {
        await supabase.from('lims_samples')
          .update({ status: 'Accepted' })
          .eq('lab_order_id', selectedOrder.id);

        await handleTransition(selectedOrder.id, 'Accepted', 'Sample accepted at Accession desk');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Technician manual result entry
  const openResultForm = async (order: LimsLabOrder) => {
    setSelectedOrder(order);
    try {
      const { data: definition } = await supabase
        .from('lims_lab_orders')
        .select('service_order:service_order_id ( service_id )')
        .eq('id', order.id)
        .single();

      if (definition && (definition as any).service_order?.service_id) {
        const sId = (definition as any).service_order.service_id;
        const { data: params } = await supabase
          .from('lims_service_parameters')
          .select('*')
          .eq('service_id', sId)
          .order('sort_order');
        
        if (params) {
          setTestParameters(params);
          const initialVals: any = {};
          params.forEach((p: any) => {
            initialVals[p.id] = '';
          });
          setResultValues(initialVals);
        }
      }
      setShowResultModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerResultSave = async () => {
    if (!selectedOrder) return;
    try {
      const resultsList = Object.keys(resultValues).map(paramId => ({
        parameterId: paramId,
        value: resultValues[paramId]
      }));

      const token = await getAuthToken();
      const localUser = localStorage.getItem('medicore_user') ? JSON.parse(localStorage.getItem('medicore_user')!) : null;
      const currentUserId = localUser?.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
      const response = await fetch(`${BACKEND_URL}/api/lims/results/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          labOrderId: selectedOrder.id,
          userId: currentUserId,
          results: resultsList
        })
      });

      if (!response.ok) {
        // Fallback: Save test results directly to Supabase client
        for (const res of resultsList) {
          // Check range flags
          let flag = 'Normal';
          const { data: refRanges } = await supabase
            .from('lims_reference_ranges')
            .select('*')
            .eq('parameter_id', res.parameterId);
          
          if (refRanges && refRanges.length > 0) {
            const range = refRanges[0];
            const val = parseFloat(res.value);
            if (!isNaN(val)) {
              const min = parseFloat(range.ref_min);
              const max = parseFloat(range.ref_max);
              const critMin = parseFloat(range.critical_min);
              const critMax = parseFloat(range.critical_max);

              if (!isNaN(critMin) && val <= critMin) flag = 'Critical';
              else if (!isNaN(critMax) && val >= critMax) flag = 'Critical';
              else if (!isNaN(min) && val < min) flag = 'Low';
              else if (!isNaN(max) && val > max) flag = 'High';
            }
          }

          const localUser = localStorage.getItem('medicore_user') ? JSON.parse(localStorage.getItem('medicore_user')!) : null;
          const currentUserId = localUser?.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
          await supabase.from('lims_results').insert({
            id: crypto.randomUUID(),
            lab_order_id: selectedOrder.id,
            parameter_id: res.parameterId,
            value: res.value,
            flag: flag,
            captured_by: currentUserId
          });
        }
        await supabase
          .from('lims_lab_orders')
          .update({ status: 'Result', result_captured_at: new Date().toISOString() })
          .eq('id', selectedOrder.id);
      }

      await fetchDashboardData();
      setShowResultModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Error saving lab results:', err);
    }
  };

  // 4. Pathologist verify & sign
  const openVerifyModal = async (order: LimsLabOrder) => {
    setSelectedOrder(order);
    try {
      const { data: dbResults } = await supabase
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
              critical_min,
              critical_max,
              unit
            )
          )
        `)
        .eq('lab_order_id', order.id);

      if (dbResults) {
        setSavedResults(dbResults);
      }
      setShowVerifyModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Automated Analyzer Simulation Import
  const openAutomatedSimulation = async (order: LimsLabOrder) => {
    setSelectedOrder(order);
    try {
      const { data: definition } = await supabase
        .from('lims_lab_orders')
        .select('service_order:service_order_id ( service_id )')
        .eq('id', order.id)
        .single();

      if (definition && (definition as any).service_order?.service_id) {
        const sId = (definition as any).service_order.service_id;
        const { data: params } = await supabase
          .from('lims_service_parameters')
          .select('*')
          .eq('service_id', sId)
          .order('sort_order');
        
        if (params) {
          setSimulatedParams(params);
          const mockVals: any = {};
          // Generate realistic mock clinical values
          params.forEach((p: any) => {
            let mockVal = '12.5';
            if (p.code.toUpperCase().includes('WBC')) mockVal = (4.5 + Math.random() * 6).toFixed(1);
            else if (p.code.toUpperCase().includes('RBC')) mockVal = (4.2 + Math.random() * 1.5).toFixed(2);
            else if (p.code.toUpperCase().includes('HB') || p.code.toUpperCase().includes('HEMO')) mockVal = (11.5 + Math.random() * 4).toFixed(1);
            else if (p.code.toUpperCase().includes('PLT') || p.code.toUpperCase().includes('PLATE')) mockVal = Math.floor(150 + Math.random() * 250).toString();
            else if (p.code.toUpperCase().includes('GLU') || p.code.toUpperCase().includes('SUG')) mockVal = Math.floor(70 + Math.random() * 60).toString();
            else if (p.code.toUpperCase().includes('CREAT')) mockVal = (0.6 + Math.random() * 0.7).toFixed(2);
            else mockVal = (Math.random() * 100).toFixed(1);
            
            mockVals[p.id] = mockVal;
          });
          setSimulatedValues(mockVals);
        }
      }
      setShowAutomatedModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAutomatedSave = async () => {
    if (!selectedOrder) return;
    try {
      const resultsList = Object.keys(simulatedValues).map(paramId => ({
        parameterId: paramId,
        value: simulatedValues[paramId]
      }));

      // Direct write fallback for simulator
      for (const res of resultsList) {
        let flag = 'Normal';
        const { data: refRanges } = await supabase
          .from('lims_reference_ranges')
          .select('*')
          .eq('parameter_id', res.parameterId);
        
        if (refRanges && refRanges.length > 0) {
          const range = refRanges[0];
          const val = parseFloat(res.value);
          if (!isNaN(val)) {
            const min = parseFloat(range.ref_min);
            const max = parseFloat(range.ref_max);
            const critMin = parseFloat(range.critical_min);
            const critMax = parseFloat(range.critical_max);

            if (!isNaN(critMin) && val <= critMin) flag = 'Critical';
            else if (!isNaN(critMax) && val >= critMax) flag = 'Critical';
            else if (!isNaN(min) && val < min) flag = 'Low';
            else if (!isNaN(max) && val > max) flag = 'High';
          }
        }

        const localUser = localStorage.getItem('medicore_user') ? JSON.parse(localStorage.getItem('medicore_user')!) : null;
        const currentUserId = localUser?.id || '9185e6a4-8ae8-4c60-b3c7-793d89b4700e';
        await supabase.from('lims_results').insert({
          id: crypto.randomUUID(),
          lab_order_id: selectedOrder.id,
          parameter_id: res.parameterId,
          value: res.value,
          flag: flag,
          captured_by: currentUserId
        });
      }

      await supabase
        .from('lims_lab_orders')
        .update({ status: 'Result', result_captured_at: new Date().toISOString() })
        .eq('id', selectedOrder.id);

      await fetchDashboardData();
      setShowAutomatedModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Service Order creation logic
  const openServiceOrderCreation = async () => {
    try {
      // Fetch patients
      const { data: ptData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, gender, dob')
        .order('first_name');
      if (ptData) setPatients(ptData);

      // Fetch lab services
      const { data: srvData } = await supabase
        .from('service_definitions')
        .select('id, name, code, service_type, service_category')
        .order('name');

      if (srvData) {
        // Filter to lab services
        const labSrvs = srvData.filter((s: any) =>
          s.service_type?.toLowerCase() === 'laboratory' ||
          s.service_category?.toLowerCase() === 'laboratory' ||
          s.code?.toUpperCase().startsWith('LAB')
        );
        setServices(labSrvs);
        if (labSrvs.length > 0) setSelectedServiceId(labSrvs[0].id);
      }

      setShowServiceOrderModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const saveServiceOrder = async () => {
    if (!selectedPatientId || !selectedServiceId) return;
    try {
      // Find or create an appointment for this patient to link
      // For demo convenience, let's look for existing appointments or create a quick one
      const { data: existApp } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', selectedPatientId)
        .limit(1);

      let appointmentId = existApp && existApp.length > 0 ? existApp[0].id : null;

      if (!appointmentId) {
        const newAppId = crypto.randomUUID();
        const { error: appErr } = await supabase.from('appointments').insert({
          id: newAppId,
          patient_id: selectedPatientId,
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          status: 'Scheduled',
          visit_type: 'New Visit'
        });
        if (!appErr) appointmentId = newAppId;
      }

      // Create Service Order
      const targetService = services.find(s => s.id === selectedServiceId);
      const serviceOrderId = crypto.randomUUID();
      await supabase.from('service_orders').insert({
        id: serviceOrderId,
        appointment_id: appointmentId,
        service_id: selectedServiceId,
        service_name: targetService?.name || 'Lab Investigation',
        cpt_code: targetService?.code || 'LAB001',
        quantity: 1,
        unit_price: 150,
        total_price: 150,
        status: 'Ordered',
        billing_status: 'Pending',
        priority: orderPriority
      });

      // Create LIMS Lab Order
      await supabase.from('lims_lab_orders').insert({
        id: crypto.randomUUID(),
        service_order_id: serviceOrderId,
        barcode_no: `BAR-${Date.now().toString().slice(-6)}`,
        priority: orderPriority,
        status: 'Ordered',
        ordered_at: new Date().toISOString()
      });

      setShowServiceOrderModal(false);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders lists based on active action card selection
  const getFilteredQueue = () => {
    if (showPathologistQueue) {
      return orders.filter(o => o.status === 'Result');
    }

    switch (activeCard) {
      case 'service':
        // Service orders: list all orders
        return orders;
      case 'cancel':
        // Cancel: can cancel Ordered or Collected
        return orders.filter(o => ['Ordered', 'Collected'].includes(o.status));
      case 'collect':
        // Collect: Ordered status
        return orders.filter(o => o.status === 'Ordered');
      case 'send':
        // Send: Collected status
        return orders.filter(o => o.status === 'Collected');
      case 'reject':
        // Reject: Collected or Accepted
        return orders.filter(o => ['Collected', 'Accepted'].includes(o.status));
      case 'accept':
        // Accept: Collected status
        return orders.filter(o => o.status === 'Collected');
      case 'resend':
        // Resend: rejected samples or custom status (simulate via Collected)
        return orders.filter(o => o.status === 'Collected');
      case 'retest':
        // Retest: Certified reports
        return orders.filter(o => o.status === 'Certified');
      case 'perform':
        // Perform: Accepted status
        return orders.filter(o => o.status === 'Accepted');
      case 'resample':
        // Resample: simulate via Ordered (resampled is re-ordered)
        return orders.filter(o => o.status === 'Ordered');
      case 'capture':
        // Capture: In Process status
        return orders.filter(o => o.status === 'In Process');
      case 'automated':
        // Automated: In Process status
        return orders.filter(o => o.status === 'In Process');
      default:
        return orders;
    }
  };

  const queueOrders = getFilteredQueue();
  const searchedQueue = queueOrders.filter(o => 
    o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.barcodeNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatientsForOrder = patients.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return fullName.includes(patientSearchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Title & Top Options */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Laboratory</h2>
          <p className="text-slate-500 text-sm mt-1">Select an action to proceed with lab workflow</p>
        </div>

        <button 
          onClick={fetchDashboardData} 
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
        
        {/* Pending Orders */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending orders</span>
          <span className="text-3xl font-black text-slate-800 leading-tight mt-1">{stats.pending}</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600">↑ {stats.newTodayCount} new today</span>
          </div>
        </div>

        {/* Samples Collected */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Samples collected</span>
          <span className="text-3xl font-black text-slate-800 leading-tight mt-1">{stats.collected}</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600">↑ {stats.collectedThisHour} this hour</span>
          </div>
        </div>

        {/* Results Pending */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Results pending</span>
          <span className="text-3xl font-black text-slate-800 leading-tight mt-1">{stats.resultsPending}</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] font-bold bg-rose-50 px-1.5 py-0.5 rounded text-rose-600">! {stats.overdueCount} overdue</span>
          </div>
        </div>

        {/* Certified Today */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Certified today</span>
          <span className="text-3xl font-black text-slate-800 leading-tight mt-1">{stats.certifiedToday}</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600">✓ All on time</span>
          </div>
        </div>

      </div>

      {/* 12 Grid Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
        {cardConfigs.map((cfg) => {
          const Icon = cfg.icon;
          const isActive = activeCard === cfg.id && !showPathologistQueue;
          
          return (
            <div 
              key={cfg.id}
              onClick={() => {
                if (cfg.id === 'collect') {
                  navigate('/lims/collect');
                } else if (cfg.id === 'accept') {
                  navigate('/lims/accept');
                } else if (cfg.id === 'perform' || cfg.id === 'capture') {
                  navigate('/lims/perform');
                } else {
                  setActiveCard(cfg.id);
                  setShowPathologistQueue(false);
                }
              }}
              className={`cursor-pointer rounded-xl bg-white overflow-hidden border transition-all duration-300 group flex flex-col justify-between ${
                isActive 
                  ? 'border-[#1C58D9] ring-2 ring-[#1C58D9]/15 shadow-lg scale-[1.01]' 
                  : 'border-slate-200 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {/* Colored Card Header */}
              <div className={`${cfg.color} p-4 flex flex-col items-center justify-center gap-2.5 h-28 relative`}>
                <span className="text-white text-xs font-bold uppercase tracking-wider text-center select-none">
                  {cfg.title}
                </span>
                
                {/* Square central outline icon container */}
                <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-white/10 text-white shadow-inner">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {/* White Footer */}
              <div className="p-3.5 bg-white flex items-center justify-between border-t border-slate-100 shrink-0">
                <span className="text-xxs text-slate-500 font-bold select-none">{cfg.desc}</span>
                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                  isActive 
                    ? 'bg-[#1C58D9] border-[#1C58D9] text-white' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:bg-[#EAF2FF] group-hover:text-[#1C58D9]'
                }`}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Queue Table Dashboard section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Table header bar */}
        <div className="p-5 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-[#1C58D9]" />
              {showPathologistQueue 
                ? 'Pathologist Report Verification Queue' 
                : `Worklist: ${cardConfigs.find(c => c.id === activeCard)?.title} Queue`
              }
            </h3>
            <p className="text-xxs text-slate-500 font-medium mt-0.5">
              Showing {searchedQueue.length} records matching current filter
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, barcode, test profile..."
                className="bg-white border border-slate-250 rounded-xl py-1.5 pl-9 pr-4 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9] shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Pathologist Console Toggle */}
            <button
              onClick={() => setShowPathologistQueue(!showPathologistQueue)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showPathologistQueue 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Verify Queue
            </button>

            {/* Service Order Create Button (renders when activeCard is service) */}
            {activeCard === 'service' && !showPathologistQueue && (
              <button
                onClick={openServiceOrderCreation}
                className="bg-[#1C58D9] hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> Create Order
              </button>
            )}
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/50 font-bold">
                <th className="py-3 px-6">Patient Details</th>
                <th className="py-3 px-6">Lab Service Profile</th>
                <th className="py-3 px-6">Barcode / Sample ID</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Workflow Status</th>
                <th className="py-3 px-6 text-right">Action Console</th>
              </tr>
            </thead>
            <tbody>
              {searchedQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No orders waiting in this active workflow queue.
                  </td>
                </tr>
              ) : (
                searchedQueue.map(o => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 text-sm">{o.patientName}</div>
                      <div className="text-xxs text-slate-500 font-semibold">{o.patientAge} / {o.patientGender}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700">
                      {o.serviceName}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-550">
                      {o.barcodeNo}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-xxs font-black tracking-wider uppercase ${
                        o.priority?.toUpperCase() === 'STAT' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-250' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {o.priority || 'Routine'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-xxs font-black tracking-wide ${
                        o.status === 'Ordered' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        o.status === 'Collected' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        o.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-[#A7F3D0]' :
                        o.status === 'In Process' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                        o.status === 'Result' ? 'bg-purple-50 text-purple-650 border border-[#F3E8FF]' :
                        o.status === 'Cancelled' ? 'bg-slate-100 text-slate-400 border border-slate-200' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      
                      {/* Pathologist override verification */}
                      {showPathologistQueue ? (
                        <button
                          onClick={() => openVerifyModal(o)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                        >
                          Verify & Sign <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          {/* Mapped contextual table actions per card click */}
                          {activeCard === 'collect' && o.status === 'Ordered' && (
                            <button
                              onClick={() => navigate(`/lims/collect/${o.id}`)}
                              className="bg-[#1C58D9] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Collect Sample <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'accept' && o.status === 'Collected' && (
                            <button
                              onClick={() => navigate(`/lims/accept/${o.id}`)}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              QA Accession <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'perform' && o.status === 'Accepted' && (
                            <button
                              onClick={() => navigate(`/lims/perform/${o.id}`)}
                              className="bg-[#1C58D9] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Run Analyzer <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'capture' && o.status === 'In Process' && (
                            <button
                              onClick={() => navigate(`/lims/perform/${o.id}`)}
                              className="bg-[#1C58D9] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Enter Results <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'automated' && o.status === 'In Process' && (
                            <button
                              onClick={() => openAutomatedSimulation(o)}
                              className="bg-purple-650 hover:bg-purple-750 bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Import Result <Cpu className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'cancel' && (
                            <button
                              onClick={() => handleTransition(o.id, 'Cancelled', 'Order cancelled by administrator')}
                              className="bg-rose-600 hover:bg-rose-750 hover:bg-rose-750 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Cancel Order <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'send' && o.status === 'Collected' && (
                            <button
                              onClick={() => handleTransition(o.id, 'Accepted', 'Specimen dispatched to department lab')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Dispatch <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'reject' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setQaSufficient(false);
                              }}
                              className="bg-rose-750 bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Reject <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'retest' && (
                            <button
                              onClick={() => handleTransition(o.id, 'Accepted', 'Certified report ordered for re-testing')}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Order Retest <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'resample' && (
                            <button
                              onClick={() => handleTransition(o.id, 'Ordered', 'Rejected specimen set for recollecting')}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Collect New <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeCard === 'resend' && (
                            <button
                              onClick={() => handleTransition(o.id, 'Accepted', 'Specimen re-dispatched')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                            >
                              Re-dispatch <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Phlebotomy Collection Drawer */}
      {selectedOrder && activeCard === 'collect' && !showPathologistQueue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                <FlaskConical className="w-4.5 h-4.5 text-[#1C58D9]" /> Register Specimen Collection
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-650">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold">Patient Name:</span> 
                <strong className="text-slate-800 font-bold text-sm">{selectedOrder.patientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Investigation:</span> 
                <strong className="text-[#1C58D9] font-bold text-sm">{selectedOrder.serviceName}</strong>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Specimen Type</label>
                <select 
                  className="bg-white border border-slate-250 rounded-xl p-2.5 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9]"
                  value={specimenId}
                  onChange={e => setSpecimenId(e.target.value)}
                >
                  <option value="">Select Specimen Type</option>
                  {specimens.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Tube / Container color</label>
                <select 
                  className="bg-white border border-slate-250 rounded-xl p-2.5 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9]"
                  value={containerId}
                  onChange={e => setContainerId(e.target.value)}
                >
                  <option value="">Select Container</option>
                  {containers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Barcode Scanner Input</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Scan tube barcode ID"
                    className="bg-white border border-slate-250 rounded-xl py-2.5 pl-4 pr-10 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9]"
                    value={barcodeNo}
                    onChange={e => setBarcodeNo(e.target.value)}
                  />
                  <QrCode className="w-5 h-5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={triggerCollection} 
                className="px-5 py-2 bg-[#1C58D9] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Save & Generate Sample ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QA Acceptance / QC Check Drawer */}
      {selectedOrder && (activeCard === 'accept' || activeCard === 'reject') && !showPathologistQueue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> Accession Quality Control Check
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold">Patient Name:</span> 
                <strong className="text-slate-800 font-bold">{selectedOrder.patientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Barcode ID:</span> 
                <strong className="text-slate-800 font-mono font-bold">{selectedOrder.barcodeNo}</strong>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qaSufficient}
                  onChange={e => setQaSufficient(e.target.checked)}
                  className="rounded-lg border-slate-350 text-[#1C58D9] focus:ring-[#1C58D9] bg-white w-4.5 h-4.5 cursor-pointer" 
                />
                Specimen Volume is Adequate
              </label>

              <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qaContainer}
                  onChange={e => setQaContainer(e.target.checked)}
                  className="rounded-lg border-slate-350 text-[#1C58D9] focus:ring-[#1C58D9] bg-white w-4.5 h-4.5 cursor-pointer" 
                />
                Correct Container Tube Used
              </label>

              {(!qaSufficient || !qaContainer) && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 pt-2">
                  <label className="text-xxs text-red-500 font-bold uppercase tracking-wider block">Reason for rejection (Required)</label>
                  <textarea
                    placeholder="Provide details (e.g., hemolyzed sample, clot detected)..."
                    className="bg-white border border-slate-250 rounded-xl p-3 text-xs w-full outline-none text-slate-700 h-24 focus:border-red-500"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={triggerAccession}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all ${
                  qaSufficient && qaContainer ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {qaSufficient && qaContainer ? 'Accept Sample' : 'Reject Sample'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Technician manual result entry */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-250 rounded-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-sm">
                <ClipboardList className="w-4.5 h-4.5 text-[#1C58D9]" /> Enter Investigation Parameters
              </h3>
              <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-slate-700">
              <div><span className="text-slate-400 font-semibold">Patient:</span> <strong className="text-slate-800 font-bold">{selectedOrder.patientName}</strong></div>
              <div><span className="text-slate-400 font-semibold">Age / Gender:</span> <strong className="text-slate-800 font-bold">{selectedOrder.patientAge} / {selectedOrder.patientGender}</strong></div>
              <div><span className="text-slate-400 font-semibold">Barcode ID:</span> <strong className="text-slate-800 font-mono font-semibold">{selectedOrder.barcodeNo}</strong></div>
              <div><span className="text-slate-400 font-semibold">Lab Profile:</span> <strong className="text-slate-800 font-bold">{selectedOrder.serviceName}</strong></div>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {testParameters.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No parameters registered for this lab service. Add them in Masters configuration.
                </div>
              ) : (
                testParameters.map(p => (
                  <div key={p.id} className="grid grid-cols-12 items-center gap-4 border-b border-slate-100 pb-2">
                    <div className="col-span-6">
                      <span className="text-xxs text-slate-400 font-mono block">{p.code}</span>
                      <span className="text-xs font-bold text-slate-800">{p.name}</span>
                    </div>
                    <div className="col-span-6">
                      <input
                        type={p.resultType === 'Numeric' ? 'number' : 'text'}
                        step="any"
                        placeholder={`Enter value (${p.resultType})`}
                        className="bg-white border border-slate-250 rounded-xl p-2 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9]"
                        value={resultValues[p.id] || ''}
                        onChange={e => setResultValues({ ...resultValues, [p.id]: e.target.value })}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
              <button 
                onClick={() => setShowResultModal(false)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={triggerResultSave} 
                className="px-5 py-2 bg-[#1C58D9] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                disabled={testParameters.length === 0}
              >
                Save & Compute Ranges
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pathologist Verification Console */}
      {showVerifyModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-250 rounded-2xl w-full max-w-2xl p-6 space-y-4 animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" /> Pathologist Verification Console
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-650">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
              <div><span className="text-slate-450 font-semibold">Patient Name:</span> <strong className="text-slate-800 font-bold">{selectedOrder.patientName}</strong></div>
              <div><span className="text-slate-450 font-semibold">Age / Gender:</span> <strong className="text-slate-800 font-bold">{selectedOrder.patientAge} / {selectedOrder.patientGender}</strong></div>
              <div><span className="text-slate-450 font-semibold">Barcode ID:</span> <strong className="text-slate-800 font-mono font-semibold">{selectedOrder.barcodeNo}</strong></div>
              <div><span className="text-slate-450 font-semibold">LIMS Profile:</span> <strong className="text-slate-800 font-bold">{selectedOrder.serviceName}</strong></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-550 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3 text-center">Observed Value</th>
                    <th className="py-2.5 px-3">Range Flag</th>
                    <th className="py-2.5 px-3 text-right">Reference Range</th>
                    <th className="py-2.5 px-3 text-right">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {savedResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">No captured parameter values found.</td>
                    </tr>
                  ) : (
                    savedResults.map(r => {
                      const rangesList = r.parameter?.lims_reference_ranges || [];
                      const mr = rangesList.find((rg: any) => rg.gender === 'All' || rg.gender === selectedOrder.patientGender) || rangesList[0] || {};
                      
                      return (
                        <tr key={r.id} className="border-b border-slate-150 text-slate-800 hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="text-xxs text-slate-405 font-mono block text-slate-400">{r.parameter?.code}</span>
                            <span className="font-bold text-slate-800">{r.parameter?.name}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-sm">
                            <span className={
                              r.flag === 'High' ? 'text-amber-600' :
                              r.flag === 'Low' ? 'text-blue-600' :
                              r.flag === 'Critical' ? 'text-red-600 underline font-black' :
                              'text-slate-800'
                            }>
                              {r.value}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xxs font-black ${
                              r.flag === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                              r.flag === 'Low' ? 'bg-blue-50 text-blue-700 border border-blue-250' :
                              r.flag === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {r.flag}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            {mr.ref_min && mr.ref_max ? `${mr.ref_min} - ${mr.ref_max}` : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">{mr.unit || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
              <button 
                onClick={() => setShowVerifyModal(false)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleTransition(selectedOrder.id, 'Certified', 'Results verified and certified by Pathologist')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                disabled={savedResults.length === 0}
              >
                <FileCheck2 className="w-4.5 h-4.5" /> Approve & Sign-Off Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Create Service Order */}
      {showServiceOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                <PlusCircle className="w-4.5 h-4.5 text-[#1C58D9]" /> Create Laboratory Service Order
              </h3>
              <button onClick={() => setShowServiceOrderModal(false)} className="text-slate-400 hover:text-slate-650">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient selection */}
              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Search Patient</label>
                <input 
                  type="text"
                  placeholder="Type to filter patients list..."
                  className="bg-white border border-slate-250 rounded-xl p-2 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9] mb-2 shadow-inner"
                  value={patientSearchTerm}
                  onChange={e => setPatientSearchTerm(e.target.value)}
                />
                
                <select
                  className="bg-white border border-slate-250 rounded-xl p-2.5 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9] max-h-36 overflow-y-auto"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  size={5}
                >
                  <option value="">-- Choose Patient --</option>
                  {filteredPatientsForOrder.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.gender} / {p.dob ? new Date(p.dob).getFullYear() : ''})</option>
                  ))}
                </select>
              </div>

              {/* Service selection */}
              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Laboratory Investigation Profile</label>
                <select
                  className="bg-white border border-slate-250 rounded-xl p-2.5 text-xs w-full outline-none text-slate-700 focus:border-[#1C58D9]"
                  value={selectedServiceId}
                  onChange={e => setSelectedServiceId(e.target.value)}
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xxs text-slate-450 block mb-1 font-bold uppercase tracking-wider text-slate-400">Priority Level</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="priority" 
                      value="Routine"
                      checked={orderPriority === 'Routine'}
                      onChange={() => setOrderPriority('Routine')}
                      className="text-[#1C58D9] focus:ring-[#1C58D9]"
                    />
                    Routine
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="priority" 
                      value="STAT"
                      checked={orderPriority === 'STAT'}
                      onChange={() => setOrderPriority('STAT')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    STAT (Urgent)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowServiceOrderModal(false)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveServiceOrder} 
                className="px-5 py-2 bg-[#1C58D9] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                disabled={!selectedPatientId || !selectedServiceId}
              >
                Generate Order Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Automated Analyzer Simulator */}
      {showAutomatedModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-250 rounded-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm">
                <Cpu className="w-5 h-5 text-purple-700" /> ASTM Analyzer Interface Simulator
              </h3>
              <button onClick={() => setShowAutomatedModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed shadow-inner border border-slate-800">
              <div className="flex justify-between border-b border-emerald-900/50 pb-1 mb-1">
                <span>[LIS-HOST] : CONNECTED TO EQUIPMENT</span>
                <span className="animate-pulse">● ONLINE</span>
              </div>
              <div>BARCODE ID: {selectedOrder.barcodeNo}</div>
              <div>PROFILE: {selectedOrder.serviceName}</div>
              <div className="mt-2 text-slate-400">Captured Analyzer Frame:</div>
              <div className="pl-2 mt-1 border-l-2 border-slate-700 text-slate-300">
                {simulatedParams.map(p => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.code}:</span>
                    <span className="text-emerald-450 text-emerald-400 font-bold">{simulatedValues[p.id]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 italic flex items-start gap-1">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              This simulates an automated clinical laboratory analyzer feeding data frame packets back into the LIMS middleware using ASTM/HL7 interfaces.
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
              <button 
                onClick={() => setShowAutomatedModal(false)} 
                className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={triggerAutomatedSave} 
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                disabled={simulatedParams.length === 0}
              >
                Import & Save Result Frame
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
