import React, { useState, useEffect } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { useData } from '../context/DataContext';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Printer, 
  Download, 
  Mail, 
  Share2, 
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  Settings,
  Sliders,
  FileCheck,
  Eye,
  EyeOff,
  User,
  Plus
} from 'lucide-react';

interface Parameter {
  id: string;
  name: string;
  code: string;
  result_type: string;
  sort_order: number;
  unit?: string;
  ref_min?: string;
  ref_max?: string;
  referenceRangeText?: string;
  value?: string;
  flag?: string;
}

interface ProfileGroup {
  id: string;
  name: string;
  status: string;
  testCount: number;
  parameters: Parameter[];
  interpretation?: string;
}

interface PatientDetails {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  phone: string;
  visitType: string;
  collectedOn: string;
  receivedOn: string;
  reportedOn: string;
  consultant: string;
  department: string;
}

export default function LimsProfileReports() {
  const supabase = getSupabase();
  const { showToast } = useData();

  // Search & Filter States
  const [searchBarcode, setSearchBarcode] = useState('');
  const [filterVisitType, setFilterVisitType] = useState('All');
  const [filterCollectedDate, setFilterCollectedDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [profiles, setProfiles] = useState<ProfileGroup[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});
  const [branch, setBranch] = useState<any>(null);
  
  // Settings & Visibility Toggle States
  const [showRefRange, setShowRefRange] = useState(true);
  const [showInterpretation, setShowInterpretation] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('Standard Profile Report');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Stats Counters
  const [stats, setStats] = useState({
    totalProfiles: 0,
    individualTests: 0,
    totalTests: 0,
    normal: 0,
    abnormal: 0,
    borderline: 0
  });

  // Load the most recent patient with lab orders on initial render
  useEffect(() => {
    fetchBranchDetails();
    fetchMostRecentPatient();
  }, []);

  const fetchBranchDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('name, logo_url, vat_reg_no')
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setBranch(data);
      }
    } catch (err) {
      console.error('Error fetching branch details:', err);
    }
  };

  const fetchMostRecentPatient = async () => {
    setLoading(true);
    try {
      const { data: recentOrders, error } = await supabase
        .from('lims_lab_orders')
        .select('barcode_no')
        .order('ordered_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (recentOrders && recentOrders.length > 0) {
        const barcode = recentOrders[0].barcode_no;
        setSearchBarcode(barcode);
        await fetchPatientReportData(barcode);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching most recent patient:', err);
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBarcode.trim()) {
      showToast('info', 'Please enter an MRN, Barcode, or Sample ID.');
      return;
    }
    await fetchPatientReportData(searchBarcode.trim());
  };

  const handleReset = () => {
    setSearchBarcode('');
    setFilterVisitType('All');
    setFilterCollectedDate('');
    setFilterStatus('All');
    fetchMostRecentPatient();
  };

  const fetchPatientReportData = async (barcode: string) => {
    setLoading(true);
    try {
      let targetAppointmentId = '';
      let resolvedBarcode = barcode;

      // 1. Check if the input is a direct barcode number (exact or partial)
      const { data: directBarcodeOrders } = await supabase
        .from('lims_lab_orders')
        .select(`
          barcode_no,
          service_order:service_order_id (
            appointment_id
          )
        `)
        .ilike('barcode_no', `%${barcode}%`)
        .limit(1);

      if (directBarcodeOrders && directBarcodeOrders.length > 0) {
        resolvedBarcode = directBarcodeOrders[0].barcode_no;
        targetAppointmentId = (directBarcodeOrders[0] as any).service_order?.appointment_id || '';
      } else {
        // It is not a direct barcode. Try to find the patient by partial/exact ID (MRN) or Name
        const { data: pts } = await supabase
          .from('patients')
          .select('id')
          .or(`id.ilike.%${barcode}%,first_name.ilike.%${barcode}%,last_name.ilike.%${barcode}%`);

        if (pts && pts.length > 0) {
          const ptIds = pts.map(p => p.id);
          
          // Find the most recent appointment with lab orders
          const { data: apps } = await supabase
            .from('appointments')
            .select(`
              id,
              created_at,
              service_orders (
                id,
                lims_lab_orders (
                  barcode_no
                )
              )
            `)
            .in('patient_id', ptIds)
            .order('created_at', { ascending: false });

          if (apps && apps.length > 0) {
            for (const app of apps) {
              const serviceOrders = (app as any).service_orders || [];
              const labOrders = serviceOrders.flatMap((so: any) => so.lims_lab_orders || []);
              if (labOrders.length > 0) {
                targetAppointmentId = app.id;
                resolvedBarcode = labOrders[0].barcode_no;
                break;
              }
            }
          }
        }
      }

      if (!targetAppointmentId) {
        showToast('error', `No laboratory orders found matching "${barcode}".`);
        setPatient(null);
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Update search input to resolved barcode
      setSearchBarcode(resolvedBarcode);

      // 2. Fetch all service orders for this appointment to consolidate different barcodes
      const { data: srvs, error: srvsError } = await supabase
        .from('service_orders')
        .select('id')
        .eq('appointment_id', targetAppointmentId);
      if (srvsError) throw srvsError;

      const sIds = srvs?.map(s => s.id) || [];
      if (sIds.length === 0) {
        showToast('error', 'No services ordered for this visit.');
        setPatient(null);
        setProfiles([]);
        setLoading(false);
        return;
      }

      // 3. Fetch lab orders matching the resolved service orders
      let query = supabase
        .from('lims_lab_orders')
        .select(`
          id,
          barcode_no,
          status,
          ordered_at,
          collected_at,
          accepted_at,
          certified_at,
          service_id,
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
            ordering_doctor:ordering_doctor_id (
              id,
              first_name,
              last_name
            ),
            appointment:appointment_id (
              id,
              visit_type,
              department_id,
              patient_id
            )
          )
        `)
        .in('service_order_id', sIds);

      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        showToast('error', `No laboratory orders found for this visit.`);
        setPatient(null);
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Filter by Visit Type if selected
      let filteredOrders = ordersData as any[];
      if (filterVisitType !== 'All') {
        filteredOrders = filteredOrders.filter(o => 
          o.service_order?.appointment?.visit_type === filterVisitType
        );
      }

      // Restrict to certified profile tests only:
      // - status must be 'Certified' (result entered & signed off in Perform Test screen)
      // - source_profile_service_id must be set (test is a child component of a profile service)
      filteredOrders = filteredOrders.filter(o =>
        o.status === 'Certified' &&
        o.source_profile_service_id !== null &&
        o.source_profile_service_id !== undefined &&
        o.source_profile_service_id !== ''
      );

      if (filteredOrders.length === 0) {
        showToast('info', 'No certified profile reports found for this visit.');
        setPatient(null);
        setProfiles([]);
        setLoading(false);
        return;
      }

      // 4. Fetch Patient details separately to bypass the missing schema foreign key constraint
      const firstOrder = filteredOrders[0] as any;
      const patientId = firstOrder.service_order?.appointment?.patient_id;
      const appointmentData = firstOrder.service_order?.appointment;
      const doctorData = firstOrder.service_order?.ordering_doctor;

      let patientData = null;
      if (patientId) {
        const { data: pData, error: pError } = await supabase
          .from('patients')
          .select('id, first_name, last_name, dob, gender, phone')
          .eq('id', patientId)
          .maybeSingle();
        if (pError) throw pError;
        patientData = pData;
      }

      let ageYears = 'N/A';
      if (patientData?.dob) {
        const birthDate = new Date(patientData.dob);
        const ageDiff = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiff);
        ageYears = `${Math.abs(ageDate.getUTCFullYear() - 1970)} Years`;
      }

      const patientDetails: PatientDetails = {
        id: patientData?.id || 'N/A',
        firstName: patientData?.first_name || 'Walk-in',
        lastName: patientData?.last_name || 'Patient',
        age: ageYears,
        gender: patientData?.gender || 'All',
        phone: patientData?.phone || 'N/A',
        visitType: appointmentData?.visit_type || 'OP',
        collectedOn: firstOrder.collected_at ? new Date(firstOrder.collected_at).toLocaleString() : 'Pending',
        receivedOn: firstOrder.accepted_at ? new Date(firstOrder.accepted_at).toLocaleString() : 'Pending',
        reportedOn: firstOrder.certified_at ? new Date(firstOrder.certified_at).toLocaleString() : 'Pending',
        consultant: doctorData ? `Dr. ${doctorData.first_name} ${doctorData.last_name || ''}` : 'Dr. System Consultant',
        department: 'Laboratory'
      };

      setPatient(patientDetails);

      // 3. Fetch results for all these orders
      const orderIds = filteredOrders.map(o => o.id);
      const { data: resultsData, error: resultsError } = await supabase
        .from('lims_results')
        .select('*')
        .in('lab_order_id', orderIds);
      if (resultsError) throw resultsError;

      const resultsMap: Record<string, any> = {};
      resultsData?.forEach(r => {
        resultsMap[r.parameter_id] = r;
      });

      // 4. Fetch parameters and reference ranges
      const serviceIds = filteredOrders.map(o => o.service_id);
      const { data: paramsData, error: paramsError } = await supabase
        .from('lims_service_parameters')
        .select(`
          id,
          name,
          code,
          result_type,
          sort_order,
          service_id,
          lims_reference_ranges (
            gender,
            age_min,
            age_max,
            ref_min,
            ref_max,
            unit
          )
        `)
        .in('service_id', serviceIds)
        .eq('is_active', true);
      if (paramsError) throw paramsError;

      // 5. Fetch profile definition names
      const profileIds = Array.from(new Set(filteredOrders.map(o => o.source_profile_service_id).filter(Boolean)));
      let profileDefs: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: serviceDefs } = await supabase
          .from('service_definitions')
          .select('id, name')
          .in('id', profileIds);
        serviceDefs?.forEach(s => {
          profileDefs[s.id] = s.name;
        });
      }

      // 6. Group parameters by profile/individual tests
      const groupedProfilesMap: Record<string, ProfileGroup> = {};
      
      let normalCount = 0;
      let abnormalCount = 0;
      let borderlineCount = 0;
      let totalParametersCount = 0;

      filteredOrders.forEach((order: any) => {
        const profileId = order.source_profile_service_id || 'individual';
        const profileName = order.source_profile_service_id 
          ? (profileDefs[order.source_profile_service_id] || order.service?.name || 'Profile Test') 
          : 'Individual Tests';

        if (!groupedProfilesMap[profileId]) {
          groupedProfilesMap[profileId] = {
            id: profileId,
            name: profileName,
            status: 'Certified',
            testCount: 0,
            parameters: []
          };
        }

        // Keep track of worst status in profile group
        if (order.status !== 'Certified') {
          groupedProfilesMap[profileId].status = order.status;
        }

        // Get parameters for this order's service
        const orderParams = paramsData?.filter(p => p.service_id === order.service_id) || [];
        
        orderParams.forEach(p => {
          const savedResult = resultsMap[p.id];
          const val = savedResult?.value || '';
          const flag = savedResult?.flag || 'Normal';
          
          if (p.result_type !== 'Heading') {
            totalParametersCount++;
            if (flag === 'High' || flag === 'Low' || flag === 'Abnormal') abnormalCount++;
            else if (flag === 'Borderline') borderlineCount++;
            else normalCount++;
          }

          // Match reference range for patient demographics
          const gender = patientDetails.gender;
          let patientAgeYears = 30;
          if (patientDetails.age) {
            const numericAge = parseInt(patientDetails.age);
            if (!isNaN(numericAge)) patientAgeYears = numericAge;
          }

          const matchedRange = p.lims_reference_ranges?.find((r: any) => {
            const genderMatch = r.gender === 'All' || r.gender === gender;
            const ageMatch = patientAgeYears >= Number(r.age_min) && patientAgeYears <= Number(r.age_max);
            return genderMatch && ageMatch;
          }) || p.lims_reference_ranges?.[0] || {};

          const refRangeText = matchedRange.ref_min && matchedRange.ref_max 
            ? `${matchedRange.ref_min} - ${matchedRange.ref_max}` 
            : 'N/A';
          const unitText = matchedRange.unit || '';

          groupedProfilesMap[profileId].parameters.push({
            id: p.id,
            name: p.name,
            code: p.code,
            result_type: p.result_type,
            sort_order: p.sort_order,
            unit: unitText,
            ref_min: matchedRange.ref_min,
            ref_max: matchedRange.ref_max,
            referenceRangeText: refRangeText,
            value: val,
            flag: flag
          });
        });
      });

      // Calculate totals
      const profileList = Object.values(groupedProfilesMap);
      const activeProfiles = profileList.filter(p => p.id !== 'individual');
      const individualGroup = profileList.find(p => p.id === 'individual');

      profileList.forEach(p => {
        // Sort parameters by sort_order
        p.parameters.sort((a, b) => a.sort_order - b.sort_order);
        p.testCount = p.parameters.filter(param => param.result_type !== 'Heading').length;
        p.interpretation = p.status === 'Certified' ? 'All parameters are within normal limits.' : 'Report pending complete certification.';
      });

      setProfiles(profileList);
      
      // Select first profile group by default
      if (profileList.length > 0) {
        setSelectedProfileId(profileList[0].id);
      }

      // Initialize expanded state for accordion
      const expandedState: Record<string, boolean> = {};
      profileList.forEach(p => {
        expandedState[p.id] = true;
      });
      setExpandedProfiles(expandedState);

      setStats({
        totalProfiles: activeProfiles.length,
        individualTests: individualGroup ? 1 : 0,
        totalTests: totalParametersCount,
        normal: normalCount,
        abnormal: abnormalCount,
        borderline: borderlineCount
      });

    } catch (err: any) {
      console.error('Error fetching patient report data:', err);
      showToast('error', 'Failed to retrieve patient report data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleProfileAccordion = (id: string) => {
    setExpandedProfiles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const renderSingleProfileBlock = (prof: ProfileGroup) => {
    return (
      <div key={prof.id} className="border border-slate-300 rounded-xl p-5 bg-white relative flex flex-col justify-between break-inside-avoid shadow-xs">
        <div>
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                {profiles.indexOf(prof) + 1}
              </span>
              {prof.name}
            </h3>
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-250 font-sans">
              {prof.status}
            </span>
          </div>

          <table className="w-full text-left border-collapse text-[10px] font-sans">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 font-bold bg-slate-50/50">
                <th className="py-2 px-2">Test Name</th>
                <th className="py-2 px-2 text-center">Result</th>
                <th className="py-2 px-2">Unit</th>
                {showRefRange && <th className="py-2 px-2">Reference Range</th>}
                <th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {prof.parameters.map((param, pIdx) => {
                if (param.result_type === 'Heading') {
                  return (
                    <tr key={pIdx} className="bg-slate-50/50 border-b border-slate-200">
                      <td colSpan={showRefRange ? 5 : 4} className="py-2 px-2 font-bold text-slate-900">
                        {param.name}
                      </td>
                    </tr>
                  );
                }
                const isAbnormal = param.flag === 'High' || param.flag === 'Low' || param.flag === 'Abnormal';
                const isBorderline = param.flag === 'Borderline';
                return (
                  <tr key={pIdx} className="border-b border-slate-100 hover:bg-slate-50/30">
                    <td className="py-2.5 px-2 font-medium text-slate-700">{param.name}</td>
                    <td className={`py-2.5 px-2 text-center font-black ${isAbnormal ? 'text-rose-600' : isBorderline ? 'text-amber-600' : 'text-slate-900'}`}>
                      {param.value || 'Pending'}
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono">{param.unit || ''}</td>
                    {showRefRange && <td className="py-2.5 px-2 text-slate-500 font-mono">{param.referenceRangeText || 'N/A'}</td>}
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isAbnormal ? 'bg-rose-500' : isBorderline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className={`text-[9px] font-bold ${isAbnormal ? 'text-rose-600' : isBorderline ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {param.flag || 'Normal'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showInterpretation && prof.interpretation && (
          <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50/50 flex gap-2">
            <span className="text-[9px] font-black text-slate-700 uppercase shrink-0">Interpretation:</span>
            <span className="text-[9px] text-slate-500 italic leading-relaxed">{prof.interpretation}</span>
          </div>
        )}
      </div>
    );
  };

  const renderProfilesList = () => {
    const listElements = [];
    let i = 0;
    while (i < profiles.length) {
      const current = profiles[i];
      // Check if we can group this profile side-by-side with the next one
      if (
        current.parameters.filter(p => p.result_type !== 'Heading').length <= 8 &&
        i + 1 < profiles.length &&
        profiles[i+1].parameters.filter(p => p.result_type !== 'Heading').length <= 8
      ) {
        const next = profiles[i+1];
        listElements.push(
          <div key={`${current.id}_${next.id}`} className="grid grid-cols-2 gap-6 mb-6 break-inside-avoid print:grid-cols-2">
            {renderSingleProfileBlock(current)}
            {renderSingleProfileBlock(next)}
          </div>
        );
        i += 2;
      } else {
        listElements.push(
          <div key={current.id} className="mb-6 break-inside-avoid">
            {renderSingleProfileBlock(current)}
          </div>
        );
        i += 1;
      }
    }
    return listElements;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden font-sans">
      
      {/* Printable Sheet Area (Hidden on screen, styled matching the 1st screen mockup) */}
      {patient && (
        <div className="hidden print:block print-report-container bg-white p-6 text-black w-full min-h-screen font-sans">
          
          {/* Custom style overrides for print */}
          <style>{`
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              .print-report-container {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* Brand Header */}
          <div className="flex justify-between items-center border-b-2 border-emerald-800 pb-5 mb-6">
            <div className="flex items-center gap-3">
              {branch?.logo_url ? (
                <img src={branch.logo_url} className="h-12 object-contain" alt="Hospital Logo" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200 text-emerald-800 font-bold text-lg shadow-inner">
                  H
                </div>
              )}
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tight text-emerald-900 leading-none">
                  {branch?.name || 'HERRICK HEALTHCARE - HIMS'}
                </h1>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
                  LABORATORY REPORT
                </p>
                <div className="mt-1">
                  <span className="text-[8px] px-2 py-0.5 bg-emerald-700 text-white font-bold rounded-full uppercase tracking-wider">
                    COMPLETE REPORT
                  </span>
                </div>
              </div>
            </div>

            {/* Barcode Graphic on Right */}
            <div className="flex flex-col items-end shrink-0 select-none">
              <div className="flex items-center gap-[1px] h-8 bg-white px-2 border border-slate-200 rounded">
                <div className="w-[2px] h-full bg-black" />
                <div className="w-[1px] h-full bg-black" />
                <div className="w-[3px] h-full bg-black" />
                <div className="w-[1px] h-full bg-black" />
                <div className="w-[2px] h-full bg-black" />
                <div className="w-[4px] h-full bg-black" />
                <div className="w-[1px] h-full bg-black" />
                <div className="w-[2px] h-full bg-black" />
                <div className="w-[3px] h-full bg-black" />
                <div className="w-[1px] h-full bg-black" />
                <div className="w-[2px] h-full bg-black" />
                <div className="w-[1px] h-full bg-black" />
                <div className="w-[4px] h-full bg-black" />
                <div className="w-[2px] h-full bg-black" />
              </div>
              <span className="text-[9px] font-mono mt-1 text-slate-700 font-bold tracking-widest">{searchBarcode}</span>
            </div>
          </div>

          {/* Patient Card Table */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 border border-slate-300 rounded-xl p-5 bg-slate-50/50 text-[10px] font-sans mb-6">
            <div className="grid grid-cols-3 gap-y-2">
              <span className="text-slate-450 font-bold uppercase tracking-wider">MRN</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.id}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Patient Name</span>
              <span className="col-span-2 text-slate-900 font-black uppercase text-xs">: {patient.firstName} {patient.lastName}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Age / Sex</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.age} / {patient.gender}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Visit Type</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.visitType}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Department</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.department}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Consultant Doctor</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.consultant}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-y-2 pl-6 border-l border-slate-200">
              <span className="text-slate-450 font-bold uppercase tracking-wider">Sample ID</span>
              <span className="col-span-2 text-slate-805 font-bold">: {searchBarcode}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Collected On</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.collectedOn}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Sample Received On</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.receivedOn}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Reported On</span>
              <span className="col-span-2 text-slate-800 font-bold">: {patient.reportedOn}</span>
              
              <span className="text-slate-450 font-bold uppercase tracking-wider">Report Status</span>
              <span className="col-span-2 text-emerald-800 font-black uppercase tracking-wide">: {patient.reportedOn !== 'Pending' ? 'Final Report' : 'Preliminary Report'}</span>
            </div>
          </div>

          {/* Table of Contents Bar */}
          <div className="flex border border-slate-300 rounded-xl bg-slate-50 text-[9px] mb-6 select-none divide-x divide-slate-200 overflow-hidden font-sans break-inside-avoid">
            <div className="py-2.5 px-4 font-black text-slate-800 bg-slate-100 flex items-center shrink-0 uppercase tracking-wider">
              TABLE OF CONTENTS
            </div>
            <div className="flex flex-wrap items-center flex-1 py-1">
              {profiles.map((p, idx) => (
                <div key={p.id} className="py-1.5 px-3 flex items-center gap-1 text-slate-600">
                  <span className="w-4 h-4 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-black uppercase tracking-wider">{p.name.replace(/\(.*\)/, '').trim()}</span>
                  <span className="text-slate-400 font-medium">({p.testCount} Tests)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Render grouped profiles list (smart side-by-side & full-width layout) */}
          <div className="space-y-6">
            {renderProfilesList()}
          </div>

          {/* Signature Footer block */}
          <div className="mt-12 border-t border-slate-200 pt-6 flex justify-between items-end text-[10px] break-inside-avoid font-sans">
            {/* Dynamic QR verification graphic */}
            <div className="flex items-center gap-3">
              <svg className="w-12 h-12 text-slate-800 shrink-0 select-none" viewBox="0 0 25 25" fill="currentColor">
                <path d="M0 0h7v7H0zm1 1v5h5V1zm8-1h1v1H9zm1 1h1v1h-1zm-1 1h1v1H9zm2-3h1v1h-1zm1 1h1v1h-1zm-2 2h1v1h-1zm3-3h7v7h-7zm1 1v5h5V1zm-9 7h1v1H9zm1 1h1v1h-1zm-1 1h1v1H9zm2-3h1v1h-1zm1 1h1v1h-1zm-2 2h1v1h-1zm-9 2h7v7H0zm1 1v5h5V15zm8 1h1v1H9zm1 1h1v1h-1zm-1 1h1v1H9zm2-3h1v1h-1zm1 1h1v1h-1zm-2 2h1v1h-1zm3-3h1v1h-1zm1 1h1v1h-1zm1-1h1v1h-1zm1 1h1v1h-1zm-3 2h1v1h-1zm1 1h1v1h-1zm2-2h1v1h-1zm1 1h1v1h-1z" />
              </svg>
              <div className="flex flex-col text-[8px] text-slate-455 leading-relaxed font-mono">
                <p>This is a system generated report.</p>
                <p>No signature is required.</p>
                <p>Barcode: {searchBarcode} | CPT: LAB-TEST</p>
                <p>Printed On: {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Dynamic Signatures block */}
            <div className="flex gap-12 text-center text-xs">
              <div className="flex flex-col items-center">
                <svg className="w-24 h-6 text-blue-600 shrink-0 select-none" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 20 C 20 5, 30 25, 40 10 C 50 15, 60 5, 70 20 C 80 15, 90 25, 95 10" />
                </svg>
                <div className="w-28 h-[1px] bg-slate-200 mt-1 mb-1"></div>
                <p className="font-black text-slate-800">Technician / Analyst</p>
              </div>
              
              <div className="flex flex-col items-center">
                <svg className="w-24 h-6 text-indigo-600 shrink-0 select-none" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 15 C 25 25, 35 5, 45 20 C 55 10, 65 25, 75 5 C 85 15, 95 10, 99 20" />
                </svg>
                <div className="w-28 h-[1px] bg-slate-200 mt-1 mb-1"></div>
                <p className="font-black text-slate-800">Lab Supervisor</p>
              </div>

              <div className="flex flex-col items-center">
                <svg className="w-24 h-6 text-slate-700 shrink-0 select-none" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 10 Q 30 30 50 15 T 90 20" />
                </svg>
                <div className="w-28 h-[1px] bg-slate-200 mt-1 mb-1"></div>
                <p className="font-black text-slate-800">{patient.consultant}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Pathologist / Consultant</p>
              </div>
            </div>
          </div>

          {/* Thank you tagline */}
          <div className="mt-10 border-t border-slate-100 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-bold font-sans break-inside-avoid">
            <span className="text-emerald-700 font-black">Thank you for trusting {branch?.name || 'Herrick Healthcare'}. Stay Healthy!</span>
            <span>Page 1 of 1</span>
          </div>

        </div>
      )}

      {/* Screen Layout (Visible on Screen) */}
      <div className="flex flex-col flex-1 print:hidden">
        
        {/* Top Titlebar */}
        <header className="h-16 border-b border-slate-200 bg-white flex justify-between items-center px-8 shadow-sm shrink-0 no-print">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#1C58D9]" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Lab Report - All Profiles</h2>
              <p className="text-xs text-slate-500 font-medium">Review and print consolidated laboratory report</p>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient by name, MRN, barcode..."
              className="w-full bg-slate-50 border border-slate-250 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-slate-700"
              value={searchBarcode}
              onChange={e => setSearchBarcode(e.target.value)}
            />
          </form>
        </header>

        {/* Filters bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap gap-4 items-end shrink-0 shadow-sm no-print">
          <div className="flex flex-col">
            <label className="text-xxs font-bold text-slate-450 uppercase mb-1.5 tracking-wider">MRN / Barcode</label>
            <input 
              type="text"
              placeholder="Search Barcode..."
              className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchBarcode}
              onChange={e => setSearchBarcode(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xxs font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Sample ID</label>
            <input 
              type="text"
              placeholder="Enter Sample ID..."
              className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-40 focus:outline-none"
              value={searchBarcode.startsWith('BAR-') ? searchBarcode : ''}
              readOnly
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xxs font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Visit Type</label>
            <select
              value={filterVisitType}
              onChange={e => setFilterVisitType(e.target.value)}
              className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-32 focus:outline-none bg-white"
            >
              <option value="All">All</option>
              <option value="OP">OP</option>
              <option value="IP">IP</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xxs font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Collected On</label>
            <input 
              type="date"
              className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-44 focus:outline-none bg-white"
              value={filterCollectedDate}
              onChange={e => setFilterCollectedDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xxs font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Report Status</label>
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl py-2 px-3 text-xs w-36 text-emerald-700 font-bold flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              Certified Only
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="bg-emerald-600 text-white rounded-xl py-2 px-4 text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-100 border border-slate-250 text-slate-650 rounded-xl py-2 px-4 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Main Grid Viewport */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 mt-4 font-semibold">Loading real-time profile data...</p>
          </div>
        ) : patient ? (
          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
            
            {/* Demographics Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1C58D9]" />
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shadow-inner">
                  <User className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <span className="text-xxs font-black px-2 py-0.5 rounded bg-blue-100 text-[#1C58D9] border border-blue-200 font-mono">
                      {patient.visitType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold font-mono">MRN: {patient.id}</p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-xs">
                    <span><strong>Age / Sex:</strong> {patient.age} / {patient.gender}</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span><strong>Phone:</strong> {patient.phone}</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span><strong>Consultant:</strong> {patient.consultant}</span>
                  </div>
                </div>
              </div>

              {/* Sample Timestamps */}
              <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-500 border-l border-slate-200 pl-6 h-full font-mono py-1">
                <div>
                  <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Sample Collected</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{patient.collectedOn}</p>
                </div>
                <div>
                  <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Sample Received</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{patient.receivedOn}</p>
                </div>
                <div>
                  <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Reported On</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{patient.reportedOn}</p>
                </div>
              </div>
            </div>

            {/* Metrics Counter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 no-print shrink-0">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Profiles</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalProfiles}</span>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Individual Tests</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.individualTests}</span>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Parameters</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalTests}</span>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Normal</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">{stats.normal}</span>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Abnormal</span>
                <span className="text-xl font-black text-rose-600 mt-1 block">{stats.abnormal}</span>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Borderline</span>
                <span className="text-xl font-black text-amber-600 mt-1 block">{stats.borderline}</span>
              </div>
            </div>

            {/* Split layout: Profiles, Results Table, and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Left Panel: Profile list menu */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 no-print">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search profile / test..."
                    className="border border-slate-200 bg-slate-50 text-slate-700 text-xs rounded-lg py-2 pl-9 pr-3 w-full outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {profiles.map(prof => {
                    const isSelected = selectedProfileId === prof.id;
                    return (
                      <button
                        key={prof.id}
                        onClick={() => setSelectedProfileId(prof.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                          isSelected 
                            ? 'bg-[#EAF2FF] text-[#1C58D9] font-bold border-blue-200 shadow-sm' 
                            : 'bg-white border-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold">{prof.name}</span>
                          <span className={`text-[10px] font-bold ${prof.status === 'Certified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {prof.status}
                          </span>
                        </div>
                        <span className="text-xxs px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-500 font-mono">
                          {prof.testCount} Tests
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <button className="w-full text-center text-xs text-[#1C58D9] font-bold hover:underline py-1">
                  Collapse All
                </button>
              </div>

              {/* Center Panel: Table parameter results */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {selectedProfile ? (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{selectedProfile.name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono ${
                          selectedProfile.status === 'Certified' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {selectedProfile.status}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-250 text-slate-500 font-bold bg-slate-50">
                            <th className="py-3 px-6">Test Parameter</th>
                            <th className="py-3 px-6 text-center">Result</th>
                            <th className="py-3 px-6">Unit</th>
                            {showRefRange && <th className="py-3 px-6">Reference Range</th>}
                            <th className="py-3 px-6">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProfile.parameters.map((param, pIdx) => {
                            if (param.result_type === 'Heading') {
                              return (
                                <tr key={pIdx} className="bg-slate-50 border-b border-slate-150">
                                  <td colSpan={showRefRange ? 5 : 4} className="py-3 px-6 font-bold text-slate-900">
                                    {param.name}
                                  </td>
                                </tr>
                              );
                            }
                            
                            const isAbnormal = param.flag === 'High' || param.flag === 'Low' || param.flag === 'Abnormal';
                            const isBorderline = param.flag === 'Borderline';
                            
                            return (
                              <tr key={pIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="py-3.5 px-6 font-medium text-slate-800">{param.name}</td>
                                <td className={`py-3.5 px-6 text-center font-bold text-sm ${isAbnormal ? 'text-rose-600' : isBorderline ? 'text-amber-600' : 'text-slate-900'}`}>
                                  {param.value || 'Pending'}
                                </td>
                                <td className="py-3.5 px-6 text-slate-500 font-mono">{param.unit || 'N/A'}</td>
                                {showRefRange && <td className="py-3.5 px-6 text-slate-500 font-mono">{param.referenceRangeText || 'N/A'}</td>}
                                <td className="py-3.5 px-6">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isAbnormal ? 'bg-rose-500' : isBorderline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <span className={`text-[10px] font-bold ${isAbnormal ? 'text-rose-600' : isBorderline ? 'text-amber-600' : 'text-emerald-600'}`}>
                                      {param.flag || 'Normal'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {showInterpretation && selectedProfile.interpretation && (
                      <div className="p-5 border-t border-slate-150 bg-slate-50/30 flex gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200">
                          <Info className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-700">Interpretation</p>
                          <p className="text-slate-500 italic mt-0.5">{selectedProfile.interpretation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                    No profile selected.
                  </div>
                )}
              </div>

              {/* Right Panel: Actions & Settings */}
              <div className="lg:col-span-1 space-y-6 no-print">
                
                {/* Actions Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <h4 className="text-xxs font-bold text-slate-450 uppercase tracking-wider mb-2">Report Actions</h4>
                  
                  <button
                    onClick={handlePrint}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-4 text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print Full Report
                  </button>
                  <button className="w-full border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl py-2 px-4 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    Print Selected Profile
                  </button>
                  <button className="w-full border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl py-2 px-4 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-slate-400" /> Download PDF
                  </button>
                  <button className="w-full border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl py-2 px-4 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Send to Email
                  </button>
                  <button className="w-full border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl py-2 px-4 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-slate-400" /> Share Report
                  </button>
                </div>

                {/* Settings Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h4 className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Report Settings</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                      className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-full focus:outline-none bg-white text-slate-750"
                    >
                      <option value="Standard Profile Report">Standard Profile Report</option>
                      <option value="Compact NABL Report">Compact NABL Report</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Language</label>
                    <select
                      value={selectedLanguage}
                      onChange={e => setSelectedLanguage(e.target.value)}
                      className="border border-slate-250 rounded-xl py-2 px-3 text-xs w-full focus:outline-none bg-white text-slate-750"
                    >
                      <option value="English">English</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-650">
                      <input 
                        type="checkbox"
                        checked={showRefRange}
                        onChange={e => setShowRefRange(e.target.checked)}
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      Show Reference Range
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-650">
                      <input 
                        type="checkbox"
                        checked={showInterpretation}
                        onChange={e => setShowInterpretation(e.target.checked)}
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      Show Interpretation
                    </label>
                  </div>
                </div>

                {/* Report Summary sidebar checklist */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
                  <h4 className="text-xxs font-bold text-slate-450 uppercase tracking-wider mb-2 font-sans">Report Summary</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Profiles</span>
                    <span className="font-semibold text-slate-805">{stats.totalProfiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Individual Tests</span>
                    <span className="font-semibold text-slate-805">{stats.individualTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Parameters</span>
                    <span className="font-semibold text-slate-805">{stats.totalTests}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-emerald-500">Normal Parameters</span>
                    <span className="font-bold text-emerald-600">{stats.normal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-500">Abnormal Parameters</span>
                    <span className="font-bold text-rose-600">{stats.abnormal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-500">Borderline Parameters</span>
                    <span className="font-bold text-amber-600">{stats.borderline}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Patient Laboratory Orders Available</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">There are no records logged in the database yet. Create laboratory bookings or check-in billing to begin tracking results.</p>
          </div>
        )}

        {/* Bottom footer bar */}
        <footer className="h-16 border-t border-slate-200 bg-white flex justify-between items-center px-8 shrink-0 no-print">
          <button className="flex items-center gap-1 text-slate-650 text-xs font-bold hover:text-slate-900 border border-slate-250 py-2 px-4 rounded-xl hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Worklist
          </button>
          
          <div className="flex items-center gap-3">
            <button className="bg-slate-100 border border-slate-250 text-slate-650 text-xs font-bold hover:bg-slate-200 py-2 px-4 rounded-xl transition-all">
              Test Tracking
            </button>
            <button className="p-2 border border-slate-250 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
