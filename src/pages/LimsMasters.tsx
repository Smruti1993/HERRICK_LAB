import React, { useState, useEffect } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { ReagentsMappingSubtab } from '../components/lims/ReagentsMappingSubtab';
import { ProfileComponentsSubtab } from '../components/lims/ProfileComponentsSubtab';
import {
  LimsSpecimen,
  LimsContainer,
  LimsEquipment,
  LimsOrganism,
  LimsAntibiotic,
  LimsStain,
  LimsServiceParameter,
  LimsReferenceRange,
  LimsOutsourceLab,
  LimsParameterOption,
  LimsReferenceRemark
} from '../types';
import {
  Beaker, Layers, Cpu, Microscope, Plus, Trash2,
  Save, X, Settings, Sliders, Info, Building, Search,
  FlaskConical, Clock, AlertTriangle, ChevronDown, ChevronRight, Tag, Pencil, ChevronUp, Edit
} from 'lucide-react';

type MainTab = 'services' | 'specimens' | 'containers' | 'equipment' | 'microbiology' | 'outsource';
type ServiceSubTab = 'lab' | 'specimen' | 'parameter' | 'results' | 'remarks' | 'alphanumeric' | 'tat' | 'reagents' | 'components';

const RESULT_TYPES = ['Numeric', 'Alphanumeric', 'Template', 'Parameter', 'Form'] as const;

export default function LimsMasters() {
  const [activeTab, setActiveTab] = useState<MainTab>('services');

  // Master Lists
  const [services, setServices] = useState<any[]>([]);
  const [specimens, setSpecimens] = useState<LimsSpecimen[]>([]);
  const [containers, setContainers] = useState<LimsContainer[]>([]);
  const [equipment, setEquipment] = useState<LimsEquipment[]>([]);
  const [organisms, setOrganisms] = useState<LimsOrganism[]>([]);
  const [antibiotics, setAntibiotics] = useState<LimsAntibiotic[]>([]);
  const [stains, setStains] = useState<LimsStain[]>([]);
  const [outsourceLabs, setOutsourceLabs] = useState<LimsOutsourceLab[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  // Service Selection
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [serviceSubTab, setServiceSubTab] = useState<ServiceSubTab>('lab');
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    serviceType: 'LABORATORY',
    serviceCategory: 'Single service',
    alternateName: '',
    applicableVisitType: 'Both',
    applicableGender: 'Both',
    estDuration: 0,
    reOrderDuration: 0,
    autoCancellationDays: 0,
    minTimeBilling: 0,
    maxTimeBilling: 0,
    maxOrderableQty: 1,
    groupName: 'SERVICE_GROUPS/Lab',
    billingGroupName: 'Services/Lab',
    financialGroup: 'ERP Finance1',
    cptCode: '',
    resultType: 'Numeric',
    specialInstructions: '',
    cptDescription: '',
    isActive: true,
    chargeable: true,
    schedulable: false,
    surgicalService: false,
    individuallyOrderable: true,
    autoProcessable: false,
    consentRequired: false,
    isRestricted: false,
    isExternal: false,
    isPercentageTariff: false,
    isToothMandatory: false,
    isAuthRequired: false
  });

  // Lab Details tab state (per-service)
  const [labDetails, setLabDetails] = useState({
    resultType: 'Numeric' as typeof RESULT_TYPES[number],
    clinicalSignificance: '',
    investigationDescription: '',
    patientInstruction: '',
    phlebotomistInstruction: '',
    technicianInstruction: '',
    genderWise: false,
    ageRangeWise: false,
    isResultMandatory: true,
    isDerived: false,
    deltaCheck: false,
    shortName: '',
  });

  const [selectedSpecimenId, setSelectedSpecimenId] = useState('');
  const [selectedContainerId, setSelectedContainerId] = useState('');

  // Parameters
  const [parameters, setParameters] = useState<LimsServiceParameter[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<LimsServiceParameter | null>(null);
  const [isAddingParam, setIsAddingParam] = useState(false);
  const [editingParameterId, setEditingParameterId] = useState<string | null>(null);
  const [newParam, setNewParam] = useState({
    name: '',
    code: '',
    resultType: 'Numeric' as string,
    sortOrder: 1,
    parentId: '',
    shortName: '',
    isMandatory: true,
    isDerived: false,
    isParameterSum: false,
    isActive: true
  });

  // Reference Ranges
  const [ranges, setRanges] = useState<LimsReferenceRange[]>([]);
  const [isAddingRange, setIsAddingRange] = useState(false);
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null);
  const [newRange, setNewRange] = useState({
    gender: 'All', ageMin: 0, ageMax: 999,
    refMin: '', refMax: '',
    borderlineLow: '', borderlineHigh: '',
    criticalMin: '', criticalMax: '',
    unit: '', remarks: '',
    equipmentId: '', site: '', isDerived: false,
    parameterId: ''
  });

  // Reference Range Remarks (Lab Reference Range Remarks)
  const [refRemarks, setRefRemarks] = useState<LimsReferenceRemark[]>([]);
  const [editingRefRemarkId, setEditingRefRemarkId] = useState<string | null>(null);
  const [newRefRemark, setNewRefRemark] = useState({
    site: '',
    equipmentId: '',
    parameterId: '',
    remarks: '',
    testMethod: '',
    footer: '',
    isActive: true,
  });
  const [remarksSaving, setRemarksSaving] = useState(false);

  // Alphanumeric Options
  const [paramOptions, setParamOptions] = useState<LimsParameterOption[]>([]);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOption, setNewOption] = useState({ optionValue: '', sortOrder: 1 });

  // TAT
  const [tatHours, setTatHours] = useState('');
  const [tatAlert, setTatAlert] = useState('');

  const supabase = getSupabase();

  useEffect(() => {
    fetchServices(); fetchSpecimens(); fetchContainers();
    fetchEquipment(); fetchMicrobiology(); fetchOutsourceLabs();
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    const load = async () => {
      setServiceSubTab('lab');
      setSelectedParameter(null);
      setRanges([]);
      setParamOptions([]);
      setIsAddingService(false);

      // Fetch LIMS service config details
      const { data: configData } = await supabase
        .from('lims_service_configs')
        .select('*')
        .eq('service_id', selectedService.id)
        .maybeSingle();

      const config = configData || {
        result_type: 'Numeric',
        clinical_significance: '',
        patient_instruction: '',
        phlebotomist_instruction: '',
        technician_instruction: '',
        gender_wise: false,
        age_range_wise: false,
        delta_check: false,
        is_result_mandatory: true,
        is_derived: false
      };

      const rt = (config.result_type || 'Numeric') as typeof RESULT_TYPES[number];
      
      setServiceForm({
        code: selectedService.code || '',
        name: selectedService.name || '',
        serviceType: selectedService.service_type || 'LABORATORY',
        serviceCategory: selectedService.service_category || 'Single service',
        alternateName: selectedService.alternate_name || '',
        applicableVisitType: selectedService.applicable_visit_type || 'Both',
        applicableGender: selectedService.applicable_gender || 'Both',
        estDuration: selectedService.est_duration || 0,
        reOrderDuration: selectedService.re_order_duration || 0,
        autoCancellationDays: selectedService.auto_cancellation_days || 0,
        minTimeBilling: selectedService.min_time_billing || 0,
        maxTimeBilling: selectedService.max_time_billing || 0,
        maxOrderableQty: selectedService.max_orderable_qty || 1,
        groupName: selectedService.group_name || 'SERVICE_GROUPS/Lab',
        billingGroupName: selectedService.billing_group_name || 'Services/Lab',
        financialGroup: selectedService.financial_group || 'ERP Finance1',
        cptCode: selectedService.cpt_code || '',
        resultType: rt,
        specialInstructions: selectedService.special_instructions || '',
        cptDescription: selectedService.cpt_description || '',
        isActive: selectedService.status === 'Active',
        chargeable: !!selectedService.chargeable,
        schedulable: !!selectedService.schedulable,
        surgicalService: !!selectedService.surgical_service,
        individuallyOrderable: !!selectedService.individually_orderable,
        autoProcessable: !!selectedService.auto_processable,
        consentRequired: !!selectedService.consent_required,
        isRestricted: !!selectedService.is_restricted,
        isExternal: !!selectedService.is_external,
        isPercentageTariff: !!selectedService.is_percentage_tariff,
        isToothMandatory: !!selectedService.is_tooth_mandatory,
        isAuthRequired: !!selectedService.is_auth_required
      });

      // Fetch parameters; if non-Parameter type also load their ranges immediately
      const { data: paramData } = await supabase
        .from('lims_service_parameters')
        .select('*')
        .eq('service_id', selectedService.id)
        .order('sort_order');
      const mappedParams = (paramData || []).map((p: any) => ({ ...p, resultType: p.result_type }));
      setParameters(mappedParams);
      if (rt !== 'Parameter' && mappedParams.length > 0) {
        // For Numeric/Alphanumeric: load ranges from main parameter automatically
        fetchRanges(mappedParams[0].id);
      }
      fetchRefRemarks(selectedService.id);
      setLabDetails({
        resultType: rt,
        clinicalSignificance: config.clinical_significance || '',
        investigationDescription: selectedService.cpt_description || '',
        patientInstruction: config.patient_instruction || '',
        phlebotomistInstruction: config.phlebotomist_instruction || '',
        technicianInstruction: config.technician_instruction || '',
        shortName: selectedService.alternate_name || '',
        genderWise: !!config.gender_wise,
        ageRangeWise: !!config.age_range_wise,
        deltaCheck: !!config.delta_check,
        isResultMandatory: config.is_result_mandatory !== false,
        isDerived: !!config.is_derived,
      });
      setSelectedSpecimenId(config.specimen_id || '');
      setSelectedContainerId(config.container_id || '');
    };
    load();
  }, [selectedService?.id]);

  // Load appropriate ranges when Results tab is activated
  useEffect(() => {
    if (selectedService && serviceSubTab === 'results') {
      if (labDetails.resultType === 'Parameter') {
        fetchAllRangesForService(selectedService.id);
      } else if (parameters.length > 0) {
        fetchRanges(parameters[0].id);
      }
    }
  }, [serviceSubTab, selectedService?.id, labDetails.resultType, parameters.length]);

  useEffect(() => {
    if (selectedParameter) {
      fetchRanges(selectedParameter.id);
      fetchParamOptions(selectedParameter.id);
    } else {
      setRanges([]);
      setParamOptions([]);
    }
  }, [selectedParameter?.id]);

  const fetchServices = async () => {
    const { data, error } = await supabase.from('service_definitions').select('*').order('name');
    if (!error && data) {
      setServices(data.filter((s: any) =>
        s.service_type?.toLowerCase() === 'laboratory' ||
        s.service_category?.toLowerCase() === 'laboratory' ||
        s.code?.toUpperCase().startsWith('LAB')
      ));
    }
  };

  const fetchSpecimens = async () => { const { data } = await supabase.from('lims_specimens').select('*').order('name'); if (data) setSpecimens(data); };
  const fetchContainers = async () => { const { data } = await supabase.from('lims_containers').select('*').order('name'); if (data) setContainers(data); };
  const fetchEquipment = async () => { const { data } = await supabase.from('lims_equipment').select('*').order('name'); if (data) setEquipment(data); };
  const fetchMicrobiology = async () => {
    const [{ data: orgs }, { data: ant }, { data: stn }] = await Promise.all([
      supabase.from('lims_organisms').select('*').order('name'),
      supabase.from('lims_antibiotics').select('*').order('name'),
      supabase.from('lims_stains').select('*').order('name')
    ]);
    if (orgs) setOrganisms(orgs);
    if (ant) setAntibiotics(ant);
    if (stn) setStains(stn);
  };
  const fetchOutsourceLabs = async () => { const { data } = await supabase.from('lims_outsource_labs').select('*').order('name'); if (data) setOutsourceLabs(data); };
  const fetchHospitals = async () => { const { data } = await supabase.from('branches').select('*').order('name'); if (data) setHospitals(data); };

  const fetchParameters = async (serviceId: string) => {
    const { data } = await supabase.from('lims_service_parameters').select('*').eq('service_id', serviceId).order('sort_order');
    if (data) {
      const mapped = data.map((p: any) => ({
        ...p,
        resultType: p.result_type,
        parentId: p.parent_id || undefined,
        shortName: p.short_name || '',
        isMandatory: p.is_mandatory ?? true,
        isDerived: p.is_derived ?? false,
        isParameterSum: p.is_parameter_sum ?? false,
        isActive: p.is_active ?? true
      }));

      // Group hierarchically: Parent first, followed immediately by its children, sorted by sort_order
      const roots = mapped.filter(p => !p.parentId);
      const children = mapped.filter(p => p.parentId);
      const sorted: any[] = [];
      roots.forEach(root => {
        sorted.push(root);
        const rootChildren = children.filter(child => child.parentId === root.id);
        sorted.push(...rootChildren);
      });
      // Append any orphans whose parent is not present
      const orphans = children.filter(child => !roots.some(r => r.id === child.parentId));
      sorted.push(...orphans);

      setParameters(sorted);
    }
  };

  const fetchRanges = async (parameterId: string) => {
    const { data } = await supabase.from('lims_reference_ranges').select('*').eq('parameter_id', parameterId).order('gender');
    if (data) setRanges(data.map((r: any) => ({
      ...r,
      parameterId: r.parameter_id,
      ageMin: r.age_min, ageMax: r.age_max,
      refMin: r.ref_min, refMax: r.ref_max,
      borderlineLow: r.borderline_low, borderlineHigh: r.borderline_high,
      criticalMin: r.critical_min, criticalMax: r.critical_max,
      equipmentId: r.equipment_id, isDerived: r.is_derived
    })));
  };

  const fetchAllRangesForService = async (serviceId: string) => {
    const { data } = await supabase.from('lims_reference_ranges')
      .select('*, lims_service_parameters!inner(service_id)')
      .eq('lims_service_parameters.service_id', serviceId)
      .order('gender');
    if (data) setRanges(data.map((r: any) => ({
      ...r,
      parameterId: r.parameter_id,
      ageMin: r.age_min, ageMax: r.age_max,
      refMin: r.ref_min, refMax: r.ref_max,
      borderlineLow: r.borderline_low, borderlineHigh: r.borderline_high,
      criticalMin: r.critical_min, criticalMax: r.critical_max,
      equipmentId: r.equipment_id, isDerived: r.is_derived
    })));
  };

  const fetchParamOptions = async (parameterId: string) => {
    const { data } = await supabase.from('lims_parameter_options').select('*').eq('parameter_id', parameterId).order('sort_order');
    if (data) setParamOptions(data.map((o: any) => ({ ...o, optionValue: o.option_value, parameterId: o.parameter_id })));
  };

  const handleAddService = async () => {
    if (!serviceForm.name || !serviceForm.code) return;
    const id = Date.now().toString();
    const payload = {
      id,
      code: serviceForm.code.toUpperCase(),
      name: serviceForm.name,
      alternate_name: serviceForm.alternateName || null,
      service_type: serviceForm.serviceType,
      service_category: serviceForm.serviceCategory,
      est_duration: serviceForm.estDuration || 0,
      status: serviceForm.isActive ? 'Active' : 'Inactive',
      chargeable: serviceForm.chargeable,
      applicable_visit_type: serviceForm.applicableVisitType,
      applicable_gender: serviceForm.applicableGender,
      re_order_duration: serviceForm.reOrderDuration || 0,
      auto_cancellation_days: serviceForm.autoCancellationDays || 0,
      min_time_billing: serviceForm.minTimeBilling || 0,
      max_time_billing: serviceForm.maxTimeBilling || 0,
      max_orderable_qty: serviceForm.maxOrderableQty || 1,
      cpt_code: serviceForm.cptCode || null,
      schedulable: serviceForm.schedulable,
      surgical_service: serviceForm.surgicalService,
      individually_orderable: serviceForm.individuallyOrderable,
      auto_processable: serviceForm.autoProcessable,
      consent_required: serviceForm.consentRequired,
      is_restricted: serviceForm.isRestricted,
      is_external: serviceForm.isExternal,
      is_percentage_tariff: serviceForm.isPercentageTariff,
      is_tooth_mandatory: serviceForm.isToothMandatory,
      is_auth_required: serviceForm.isAuthRequired,
      group_name: serviceForm.groupName,
      billing_group_name: serviceForm.billingGroupName,
      financial_group: serviceForm.financialGroup,
      cpt_description: serviceForm.cptDescription || null,
      special_instructions: serviceForm.specialInstructions || null
    };
    const { error } = await supabase.from('service_definitions').insert(payload);
    if (!error) {
      // Create defaults in lims_service_configs
      await supabase.from('lims_service_configs').insert({
        service_id: payload.id,
        result_type: serviceForm.resultType
      });
      alert('Service master created successfully!');
      fetchServices();
      // Select the newly created service immediately
      setSelectedService(payload);
      setIsAddingService(false);
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;
    const { error } = await supabase.from('service_definitions').update({
      code: serviceForm.code.toUpperCase(),
      name: serviceForm.name,
      alternate_name: serviceForm.alternateName || null,
      service_type: serviceForm.serviceType,
      service_category: serviceForm.serviceCategory,
      est_duration: serviceForm.estDuration || 0,
      status: serviceForm.isActive ? 'Active' : 'Inactive',
      chargeable: serviceForm.chargeable,
      applicable_visit_type: serviceForm.applicableVisitType,
      applicable_gender: serviceForm.applicableGender,
      re_order_duration: serviceForm.reOrderDuration || 0,
      auto_cancellation_days: serviceForm.autoCancellationDays || 0,
      min_time_billing: serviceForm.minTimeBilling || 0,
      max_time_billing: serviceForm.maxTimeBilling || 0,
      max_orderable_qty: serviceForm.maxOrderableQty || 1,
      cpt_code: serviceForm.cptCode || null,
      schedulable: serviceForm.schedulable,
      surgical_service: serviceForm.surgicalService,
      individually_orderable: serviceForm.individuallyOrderable,
      auto_processable: serviceForm.autoProcessable,
      consent_required: serviceForm.consentRequired,
      is_restricted: serviceForm.isRestricted,
      is_external: serviceForm.isExternal,
      is_percentage_tariff: serviceForm.isPercentageTariff,
      is_tooth_mandatory: serviceForm.isToothMandatory,
      is_auth_required: serviceForm.isAuthRequired,
      group_name: serviceForm.groupName,
      billing_group_name: serviceForm.billingGroupName,
      financial_group: serviceForm.financialGroup,
      cpt_description: serviceForm.cptDescription || null,
      special_instructions: serviceForm.specialInstructions || null
    }).eq('id', selectedService.id);

    if (!error) {
      // Upsert result_type in lims_service_configs
      await supabase.from('lims_service_configs').upsert({
        service_id: selectedService.id,
        result_type: serviceForm.resultType
      });
      alert('Service master details updated successfully!');
      fetchServices();
    } else {
      alert('Error updating: ' + error.message);
    }
  };

  const handleAddParameter = async () => {
    if (!selectedService) return;
    if (!newParam.name) {
      alert('Parameter Name is required.');
      return;
    }
    if (!newParam.code) {
      alert('Parameter Code is required.');
      return;
    }
    
    const payload = {
      service_id: selectedService.id,
      name: newParam.name,
      code: newParam.code.toUpperCase(),
      result_type: newParam.resultType,
      sort_order: newParam.sortOrder,
      parent_id: newParam.parentId || null,
      short_name: newParam.shortName || null,
      is_mandatory: newParam.isMandatory,
      is_derived: newParam.isDerived,
      is_parameter_sum: newParam.isParameterSum,
      is_active: newParam.isActive,
      status: newParam.isActive ? 'Active' : 'Inactive'
    };

    let error;
    if (editingParameterId) {
      const res = await supabase
        .from('lims_service_parameters')
        .update(payload)
        .eq('id', editingParameterId);
      error = res.error;
    } else {
      const res = await supabase
        .from('lims_service_parameters')
        .insert({
          id: crypto.randomUUID(),
          ...payload
        });
      error = res.error;
    }

    if (!error) {
      fetchParameters(selectedService.id);
      setNewParam({
        name: '',
        code: '',
        resultType: 'Numeric',
        sortOrder: parameters.length + 2,
        parentId: '',
        shortName: '',
        isMandatory: true,
        isDerived: false,
        isParameterSum: false,
        isActive: true
      });
      setIsAddingParam(false);
      setEditingParameterId(null);
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteParameter = async (id: string) => {
    if (!confirm('Delete this parameter and all its ranges?')) return;
    await supabase.from('lims_service_parameters').delete().eq('id', id);
    fetchParameters(selectedService.id);
    if (selectedParameter?.id === id) { setSelectedParameter(null); setRanges([]); }
  };

  const handleAddReferenceRange = async () => {
    if (!selectedService) return;

    let paramId = newRange.parameterId || selectedParameter?.id;

    // For Numeric / Alphanumeric services there is no "selected parameter" —
    // we use (or silently auto-create) a single main parameter for the service.
    if (!paramId && !isParameterType) {
      if (parameters.length > 0) {
        // Reuse the already-created main parameter
        paramId = parameters[0].id;
      } else {
        // Auto-create a main parameter named after the service
        const newParamId = crypto.randomUUID();
        const { error: paramErr } = await supabase.from('lims_service_parameters').insert({
          id: newParamId,
          service_id: selectedService.id,
          name: selectedService.name,
          code: (selectedService.code || 'MAIN').toUpperCase(),
          result_type: labDetails.resultType,
          sort_order: 1,
          status: 'Active'
        });
        if (paramErr) { alert('Error creating parameter: ' + paramErr.message); return; }
        paramId = newParamId;
        await fetchParameters(selectedService.id);
      }
    }

    if (!paramId) { alert('Please select a parameter first.'); return; }

    const { error } = await supabase.from('lims_reference_ranges').insert({
      id: crypto.randomUUID(),
      parameter_id: paramId,
      gender: newRange.gender,
      age_min: newRange.ageMin,
      age_max: newRange.ageMax,
      ref_min: newRange.refMin || null,
      ref_max: newRange.refMax || null,
      borderline_low: newRange.borderlineLow || null,
      borderline_high: newRange.borderlineHigh || null,
      critical_min: newRange.criticalMin || null,
      critical_max: newRange.criticalMax || null,
      unit: newRange.unit || null,
      remarks: newRange.remarks || null,
      equipment_id: newRange.equipmentId || null,
      site: newRange.site || null,
      is_derived: newRange.isDerived,
      status: 'Active'
    });
    if (!error) {
      // Refresh the displayed ranges
      if (isParameterType) {
        fetchAllRangesForService(selectedService.id);
      } else {
        // For Numeric/Alphanumeric: fetch all ranges via paramId we just used
        fetchRanges(paramId);
      }
      setNewRange({ gender: 'All', ageMin: 0, ageMax: 999, refMin: '', refMax: '', borderlineLow: '', borderlineHigh: '', criticalMin: '', criticalMax: '', unit: '', remarks: '', equipmentId: '', site: '', isDerived: false, parameterId: '' });
      setIsAddingRange(false);
    } else {
      alert('Error saving range: ' + error.message);
    }
  };


  const handleDeleteRange = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reference range?')) return;
    await supabase.from('lims_reference_ranges').delete().eq('id', id);
    if (isParameterType) {
      fetchAllRangesForService(selectedService.id);
    } else if (parameters.length > 0) {
      fetchRanges(parameters[0].id);
    }
  };

  const handleEditRange = (r: LimsReferenceRange) => {
    setEditingRangeId(r.id);
    setIsAddingRange(true);
    setNewRange({
      gender: r.gender,
      ageMin: r.ageMin,
      ageMax: r.ageMax,
      refMin: r.refMin || '',
      refMax: r.refMax || '',
      borderlineLow: r.borderlineLow || '',
      borderlineHigh: r.borderlineHigh || '',
      criticalMin: r.criticalMin || '',
      criticalMax: r.criticalMax || '',
      unit: r.unit || '',
      remarks: r.remarks || '',
      equipmentId: r.equipmentId || '',
      site: r.site || '',
      isDerived: r.isDerived || false,
      parameterId: r.parameterId || '',
    });
  };

  const handleUpdateReferenceRange = async () => {
    if (!editingRangeId) return;
    const { error } = await supabase.from('lims_reference_ranges').update({
      parameter_id: newRange.parameterId || null,
      gender: newRange.gender,
      age_min: newRange.ageMin,
      age_max: newRange.ageMax,
      ref_min: newRange.refMin || null,
      ref_max: newRange.refMax || null,
      borderline_low: newRange.borderlineLow || null,
      borderline_high: newRange.borderlineHigh || null,
      critical_min: newRange.criticalMin || null,
      critical_max: newRange.criticalMax || null,
      unit: newRange.unit || null,
      remarks: newRange.remarks || null,
      equipment_id: newRange.equipmentId || null,
      site: newRange.site || null,
      is_derived: newRange.isDerived,
    }).eq('id', editingRangeId);
    if (!error) {
      if (isParameterType) {
        fetchAllRangesForService(selectedService.id);
      } else if (parameters.length > 0) {
        fetchRanges(parameters[0].id);
      }
      setNewRange({ gender: 'All', ageMin: 0, ageMax: 999, refMin: '', refMax: '', borderlineLow: '', borderlineHigh: '', criticalMin: '', criticalMax: '', unit: '', remarks: '', equipmentId: '', site: '', isDerived: false, parameterId: '' });
      setIsAddingRange(false);
      setEditingRangeId(null);
    } else {
      alert('Error updating range: ' + error.message);
    }
  };

  const handleAddParamOption = async () => {
    if (!selectedParameter || !newOption.optionValue) return;
    const { error } = await supabase.from('lims_parameter_options').insert({
      id: crypto.randomUUID(),
      parameter_id: selectedParameter.id,
      option_value: newOption.optionValue,
      sort_order: newOption.sortOrder,
      status: 'Active'
    });
    if (!error) {
      fetchParamOptions(selectedParameter.id);
      setNewOption({ optionValue: '', sortOrder: paramOptions.length + 2 });
      setIsAddingOption(false);
    }
  };

  const handleDeleteParamOption = async (id: string) => {
    await supabase.from('lims_parameter_options').delete().eq('id', id);
    if (selectedParameter) fetchParamOptions(selectedParameter.id);
  };

  const fetchRefRemarks = async (serviceId: string) => {
    const { data } = await supabase
      .from('lims_reference_remarks')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at');
    if (data) {
      setRefRemarks(data.map((r: any) => ({
        id: r.id,
        serviceId: r.service_id,
        site: r.site,
        equipmentId: r.equipment_id,
        parameterId: r.parameter_id,
        remarks: r.remarks,
        testMethod: r.test_method,
        footer: r.footer,
        isActive: r.is_active,
        status: r.status
      })));
    }
  };

  const handleSaveLabDetails = async () => {
    if (!selectedService) return;

    // A. Update core fields on service_definitions
    const { error: coreError } = await supabase.from('service_definitions').update({
      alternate_name: labDetails.shortName || null,
      cpt_description: labDetails.investigationDescription || null,
    }).eq('id', selectedService.id);

    if (coreError) {
      alert('Error saving core details: ' + coreError.message);
      return;
    }

    // B. Upsert LIMS config details
    const { error: configError } = await supabase.from('lims_service_configs').upsert({
      service_id: selectedService.id,
      result_type: labDetails.resultType,
      clinical_significance: labDetails.clinicalSignificance || null,
      patient_instruction: labDetails.patientInstruction || null,
      phlebotomist_instruction: labDetails.phlebotomistInstruction || null,
      technician_instruction: labDetails.technicianInstruction || null,
      gender_wise: labDetails.genderWise,
      age_range_wise: labDetails.ageRangeWise,
      delta_check: labDetails.deltaCheck,
      is_result_mandatory: labDetails.isResultMandatory,
      is_derived: labDetails.isDerived
    });

    if (!configError) {
      alert('Lab details saved successfully!');
      const updatedService = {
        ...selectedService,
        result_type: labDetails.resultType,
        alternate_name: labDetails.shortName || null,
        clinical_significance: labDetails.clinicalSignificance || null,
        cpt_description: labDetails.investigationDescription || null,
        patient_instruction: labDetails.patientInstruction || null,
        phlebotomist_instruction: labDetails.phlebotomistInstruction || null,
        technician_instruction: labDetails.technicianInstruction || null,
        gender_wise: labDetails.genderWise,
        age_range_wise: labDetails.ageRangeWise,
        delta_check: labDetails.deltaCheck,
        is_result_mandatory: labDetails.isResultMandatory,
        is_derived: labDetails.isDerived
      };
      setSelectedService(updatedService);
      setServices(prev => prev.map(s => s.id === selectedService.id ? updatedService : s));
    } else {
      alert('Error saving LIMS configs: ' + configError.message);
    }
  };

  const handleSaveSpecimenConfig = async () => {
    if (!selectedService) return;
    const { error: configError } = await supabase.from('lims_service_configs').upsert({
      service_id: selectedService.id,
      result_type: labDetails.resultType,
      clinical_significance: labDetails.clinicalSignificance || null,
      patient_instruction: labDetails.patientInstruction || null,
      phlebotomist_instruction: labDetails.phlebotomistInstruction || null,
      technician_instruction: labDetails.technicianInstruction || null,
      gender_wise: labDetails.genderWise,
      age_range_wise: labDetails.ageRangeWise,
      delta_check: labDetails.deltaCheck,
      is_result_mandatory: labDetails.isResultMandatory,
      is_derived: labDetails.isDerived,
      specimen_id: selectedSpecimenId || null,
      container_id: selectedContainerId || null
    });

    if (!configError) {
      alert('Specimen configuration saved successfully!');
    } else {
      alert('Error saving specimen configuration: ' + configError.message);
    }
  };

  const handleSaveRefRemark = async () => {
    if (!selectedService) return;
    setRemarksSaving(true);
    const payload = {
      service_id: selectedService.id,
      site: newRefRemark.site || null,
      equipment_id: newRefRemark.equipmentId || null,
      parameter_id: newRefRemark.parameterId || null,
      remarks: newRefRemark.remarks || null,
      test_method: newRefRemark.testMethod || null,
      footer: newRefRemark.footer || null,
      is_active: newRefRemark.isActive,
      status: 'Active'
    };

    let err;
    if (editingRefRemarkId) {
      const { error } = await supabase
        .from('lims_reference_remarks')
        .update(payload)
        .eq('id', editingRefRemarkId);
      err = error;
    } else {
      const { error } = await supabase
        .from('lims_reference_remarks')
        .insert({
          id: crypto.randomUUID(),
          ...payload
        });
      err = error;
    }

    setRemarksSaving(false);
    if (!err) {
      fetchRefRemarks(selectedService.id);
      setNewRefRemark({
        site: '',
        equipmentId: '',
        parameterId: '',
        remarks: '',
        testMethod: '',
        footer: '',
        isActive: true
      });
      setEditingRefRemarkId(null);
    } else {
      alert('Error saving remarks: ' + err.message);
    }
  };

  const handleEditRefRemark = (r: LimsReferenceRemark) => {
    setEditingRefRemarkId(r.id);
    setNewRefRemark({
      site: r.site || '',
      equipmentId: r.equipmentId || '',
      parameterId: r.parameterId || '',
      remarks: r.remarks || '',
      testMethod: r.testMethod || '',
      footer: r.footer || '',
      isActive: r.isActive
    });
  };

  const handleDeleteRefRemark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this remark?')) return;
    const { error } = await supabase.from('lims_reference_remarks').delete().eq('id', id);
    if (!error && selectedService) {
      fetchRefRemarks(selectedService.id);
    }
  };

  const handleAddMasterItem = async (table: string, name: string, code: string, extra: any = {}) => {
    if (!name || !code) return;
    const { error } = await supabase.from(table).insert({ id: crypto.randomUUID(), name, code, status: 'Active', ...extra });
    if (!error) {
      if (table === 'lims_specimens') fetchSpecimens();
      if (table === 'lims_containers') fetchContainers();
      if (table === 'lims_equipment') fetchEquipment();
      if (['lims_organisms', 'lims_antibiotics', 'lims_stains'].includes(table)) fetchMicrobiology();
      if (table === 'lims_outsource_labs') fetchOutsourceLabs();
    } else {
      alert('Error: ' + error.message);
    }
  };

  // Determine which result type is active for the selected service
  const activeResultType = labDetails.resultType;
  const isParameterType = activeResultType === 'Parameter';
  const isAlphanumericType = activeResultType === 'Alphanumeric';
  const isNumericType = activeResultType === 'Numeric';

  // Filtered services
  const filteredServices = services.filter(s =>
    !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || s.code.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // For Numeric/Alphanumeric service — use the auto-created "main" parameter
  const mainParameter = isParameterType ? null : parameters[0] || null;

  const isProfile = serviceForm.serviceCategory === 'Profile/Package';

  const subTabs: { id: ServiceSubTab; label: string; disabled?: boolean }[] = isProfile
    ? [
        { id: 'lab', label: 'Lab' },
        { id: 'specimen', label: 'Specimen' },
        { id: 'tat', label: 'Turnaround Time' },
        { id: 'components', label: '⬡ Profile Components' },
      ]
    : [
        { id: 'lab', label: 'Lab' },
        { id: 'specimen', label: 'Specimen' },
        { id: 'parameter', label: 'Parameter', disabled: !isParameterType },
        { id: 'results', label: 'Results' },
        { id: 'remarks', label: 'Reference Range Remarks' },
        { id: 'alphanumeric', label: 'Alphanumeric Results', disabled: !isAlphanumericType && !(isParameterType) },
        { id: 'tat', label: 'Turnaround Time' },
        { id: 'reagents', label: 'Reagents Mapped' },
      ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col p-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4 border-b border-slate-100">
          <Settings className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-bold text-xs text-slate-900 leading-tight">Lab Service Master</p>
            <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">LIMS Masters</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {([
            { id: 'services', icon: Sliders, label: 'Lab Service Config' },
            { id: 'specimens', icon: Beaker, label: 'Specimen Master' },
            { id: 'containers', icon: Layers, label: 'Container Master' },
            { id: 'equipment', icon: Cpu, label: 'Analyzer Equipment' },
            { id: 'microbiology', icon: Microscope, label: 'Microbiology Database' },
            { id: 'outsource', icon: Building, label: 'Outsource Laboratories' },
          ] as { id: MainTab; icon: any; label: string }[]).map(nav => (
            <button
              key={nav.id}
              onClick={() => setActiveTab(nav.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === nav.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <nav.icon className="w-3.5 h-3.5 shrink-0" />
              {nav.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6 shrink-0 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            {activeTab === 'services' && 'Laboratory Services Master Config'}
            {activeTab === 'specimens' && 'Specimen Master'}
            {activeTab === 'containers' && 'Container Master'}
            {activeTab === 'equipment' && 'Analyzer Equipment Master'}
            {activeTab === 'microbiology' && 'Microbiology Masters'}
            {activeTab === 'outsource' && 'Outsource Laboratories'}
          </h2>
        </header>

        <main className="flex-1 overflow-hidden">

          {/* ─ SERVICES TAB ─ */}
          {activeTab === 'services' && (
            <div className="flex h-full">

              {/* Left: Service List */}
              <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-3 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Active Services</span>
                    <button
                      onClick={() => {
                        setServiceForm({
                          code: '',
                          name: '',
                          serviceType: 'LABORATORY',
                          serviceCategory: 'Single service',
                          alternateName: '',
                          applicableVisitType: 'Both',
                          applicableGender: 'Both',
                          estDuration: 0,
                          reOrderDuration: 0,
                          autoCancellationDays: 0,
                          minTimeBilling: 0,
                          maxTimeBilling: 0,
                          maxOrderableQty: 1,
                          groupName: 'SERVICE_GROUPS/Lab',
                          billingGroupName: 'Services/Lab',
                          financialGroup: 'ERP Finance1',
                          cptCode: '',
                          resultType: 'Numeric',
                          specialInstructions: '',
                          cptDescription: '',
                          isActive: true,
                          chargeable: true,
                          schedulable: false,
                          surgicalService: false,
                          individuallyOrderable: true,
                          autoProcessable: false,
                          consentRequired: false,
                          isRestricted: false,
                          isExternal: false,
                          isPercentageTariff: false,
                          isToothMandatory: false,
                          isAuthRequired: false
                        });
                        setIsAddingService(true);
                      }}
                      className="text-xxs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded font-bold transition-all animate-pulse"
                    >+ New Service</button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      placeholder="Search services..."
                      className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredServices.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                        selectedService?.id === s.id
                          ? 'bg-blue-50 text-blue-700 font-bold border-blue-200 shadow-sm'
                          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className={`text-xxs font-mono mt-0.5 ${selectedService?.id === s.id ? 'text-blue-500' : 'text-slate-400'}`}>{s.code}</div>
                    </button>
                  ))}
                  {filteredServices.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">No services found</div>
                  )}
                </div>
              </div>

              {/* Right: Config Panel */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
                {(!selectedService && !isAddingService) ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-20">
                    <FlaskConical className="w-12 h-12 text-blue-200" />
                    <p className="text-sm font-semibold">Select a lab service from the active services list or click "+ New Service" to start.</p>
                  </div>
                ) : (
                  <div className="flex-1 p-6 space-y-6">
                    {/* Top Section: Complete Service Definition Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-blue-600" />
                            {isAddingService ? 'New Lab Service Registration' : 'Lab Service Master Configuration'}
                          </h3>
                          <p className="text-xxs text-slate-500 mt-0.5 font-semibold">
                            {isAddingService ? 'Register a new clinical service with custom billing, operations, and parameters.' : `Modify properties for service code: ${selectedService?.code}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAddingService ? (
                            <>
                              <button 
                                onClick={() => setIsAddingService(false)} 
                                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 bg-white transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleAddService} 
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                              >
                                Save Service
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={handleUpdateService} 
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              Save Changes
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Unified Form Body */}
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-3">
                          
                          {/* --- CLINICAL SPECS --- */}
                          <div className="col-span-full border-b border-slate-100/70 pb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Clinical Specs</span>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Service Code *</label>
                            <input 
                              required
                              disabled={!isAddingService}
                              placeholder="e.g. LAB413" 
                              value={serviceForm.code} 
                              onChange={e => setServiceForm({ ...serviceForm, code: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 font-mono disabled:bg-slate-150 disabled:text-slate-500 transition-all font-semibold uppercase bg-slate-50/50"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Service Name *</label>
                            <input 
                              required
                              placeholder="e.g. Serum Osmolality" 
                              value={serviceForm.name} 
                              onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Result Type *</label>
                            <select 
                              value={serviceForm.resultType} 
                              onChange={e => setServiceForm({ ...serviceForm, resultType: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none transition-all font-bold text-blue-700 bg-blue-50/80 focus:ring-4 focus:ring-blue-500/10"
                            >
                              {RESULT_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Service Type *</label>
                            <select 
                              value={serviceForm.serviceType} 
                              onChange={e => setServiceForm({ ...serviceForm, serviceType: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none bg-slate-50/50 transition-all font-semibold focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="LABORATORY">LABORATORY</option>
                              <option value="RADIOLOGY">RADIOLOGY</option>
                              <option value="CARDIOLOGY">CARDIOLOGY</option>
                              <option value="PROCEDURE">PROCEDURE</option>
                              <option value="CONSULTATION">CONSULTATION</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Service Category *</label>
                            <select 
                              value={serviceForm.serviceCategory} 
                              onChange={e => setServiceForm({ ...serviceForm, serviceCategory: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none bg-slate-50/50 transition-all font-semibold focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="Single service">Single service</option>
                              <option value="Profile/Package">Profile/Package</option>
                              <option value="Outsourced service">Outsourced service</option>
                              <option value="Special test">Special test</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Mnemonics / Abbrev</label>
                            <input 
                              placeholder="e.g. S. Osmolality" 
                              value={serviceForm.alternateName} 
                              onChange={e => setServiceForm({ ...serviceForm, alternateName: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">CPT Code</label>
                            <input 
                              placeholder="CPT standard code" 
                              value={serviceForm.cptCode} 
                              onChange={e => setServiceForm({ ...serviceForm, cptCode: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold font-mono bg-slate-50/50"
                            />
                          </div>

                          {/* --- BILLING & SCOPE --- */}
                          <div className="col-span-full border-b border-slate-100/70 pb-1 mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Billing & Scope</span>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Group Name *</label>
                            <input 
                              placeholder="e.g. SERVICE_GROUPS/Lab" 
                              value={serviceForm.groupName} 
                              onChange={e => setServiceForm({ ...serviceForm, groupName: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Billing Group Name *</label>
                            <input 
                              placeholder="e.g. Services/Lab" 
                              value={serviceForm.billingGroupName} 
                              onChange={e => setServiceForm({ ...serviceForm, billingGroupName: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Financial Group</label>
                            <input 
                              placeholder="e.g. ERP Finance1" 
                              value={serviceForm.financialGroup} 
                              onChange={e => setServiceForm({ ...serviceForm, financialGroup: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Max Orderable Qty</label>
                            <input 
                              type="number" 
                              value={serviceForm.maxOrderableQty} 
                              onChange={e => setServiceForm({ ...serviceForm, maxOrderableQty: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Applicable Visit</label>
                            <select 
                              value={serviceForm.applicableVisitType} 
                              onChange={e => setServiceForm({ ...serviceForm, applicableVisitType: e.target.value as any })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none bg-slate-50/50 transition-all font-semibold focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="New">IP</option>
                              <option value="Follow-up">OP</option>
                              <option value="Both">Both</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Applicable Gender</label>
                            <select 
                              value={serviceForm.applicableGender} 
                              onChange={e => setServiceForm({ ...serviceForm, applicableGender: e.target.value as any })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none bg-slate-50/50 transition-all font-semibold focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="Both">Both</option>
                              <option value="Male">MALE</option>
                              <option value="Female">FEMALE</option>
                            </select>
                          </div>

                          {/* --- OPERATIONAL DURATIONS --- */}
                          <div className="col-span-full border-b border-slate-100/70 pb-1 mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-violet-600 rounded-full"></span>
                            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Operational Durations</span>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Est Duration (Min)</label>
                            <input 
                              type="number" 
                              value={serviceForm.estDuration} 
                              onChange={e => setServiceForm({ ...serviceForm, estDuration: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Re-Order Dur (Hrs)</label>
                            <input 
                              type="number" 
                              value={serviceForm.reOrderDuration} 
                              onChange={e => setServiceForm({ ...serviceForm, reOrderDuration: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Auto Cancel (Days)</label>
                            <input 
                              type="number" 
                              value={serviceForm.autoCancellationDays} 
                              onChange={e => setServiceForm({ ...serviceForm, autoCancellationDays: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Min Bill Time (Min)</label>
                            <input 
                              type="number" 
                              value={serviceForm.minTimeBilling} 
                              onChange={e => setServiceForm({ ...serviceForm, minTimeBilling: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Max Time Hourly Bill (Hours)</label>
                            <input 
                              type="number" 
                              value={serviceForm.maxTimeBilling} 
                              onChange={e => setServiceForm({ ...serviceForm, maxTimeBilling: Number(e.target.value) })} 
                              className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold bg-slate-50/50"
                            />
                          </div>

                          {/* --- DESCRIPTIONS / REMARKS --- */}
                          <div className="col-span-full border-b border-slate-100/70 pb-1 mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Instructions & Descriptions</span>
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">CPT Description</label>
                            <textarea 
                              rows={1}
                              placeholder="Provide standard billing CPT guidelines..." 
                              value={serviceForm.cptDescription} 
                              onChange={e => setServiceForm({ ...serviceForm, cptDescription: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-blue-400 bg-slate-50/50 focus:bg-white transition-all resize-none font-medium h-10"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Special Instruction</label>
                            <textarea 
                              rows={1}
                              placeholder="Sample collection hints or pre-requisite warnings..." 
                              value={serviceForm.specialInstructions} 
                              onChange={e => setServiceForm({ ...serviceForm, specialInstructions: e.target.value })} 
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-blue-400 bg-slate-50/50 focus:bg-white transition-all resize-none font-medium h-10"
                            />
                          </div>

                          {/* --- FLAGS & CONFIG TOGGLES --- */}
                          <div className="col-span-full border-b border-slate-100/70 pb-1 mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Flags & Config Toggles</span>
                          </div>

                          <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isActive} onChange={e => setServiceForm({ ...serviceForm, isActive: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Active</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.chargeable} onChange={e => setServiceForm({ ...serviceForm, chargeable: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Chargeable</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.schedulable} onChange={e => setServiceForm({ ...serviceForm, schedulable: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Schedulable</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.individuallyOrderable} onChange={e => setServiceForm({ ...serviceForm, individuallyOrderable: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Individually Orderable</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.autoProcessable} onChange={e => setServiceForm({ ...serviceForm, autoProcessable: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Auto Processable</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.consentRequired} onChange={e => setServiceForm({ ...serviceForm, consentRequired: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Consent Required</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isRestricted} onChange={e => setServiceForm({ ...serviceForm, isRestricted: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Is Restricted</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isExternal} onChange={e => setServiceForm({ ...serviceForm, isExternal: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Is External Service</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isPercentageTariff} onChange={e => setServiceForm({ ...serviceForm, isPercentageTariff: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Is Percentage Tariff</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isToothMandatory} onChange={e => setServiceForm({ ...serviceForm, isToothMandatory: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Is Tooth Mandatory</span>
                            </label>
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer">
                              <input type="checkbox" checked={serviceForm.isAuthRequired} onChange={e => setServiceForm({ ...serviceForm, isAuthRequired: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600 border-slate-200 focus:ring-blue-500/20" />
                              <span className="text-[10px] font-bold text-slate-650 select-none">Is Auth Required</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Sub-tabs and Config Lists */}
                    {isAddingService ? (
                      <div className="bg-blue-50 border border-dashed border-blue-200 rounded-2xl p-8 text-center text-blue-600 text-xs font-semibold animate-pulse">
                        Please save this service definition first to open sub-tab configuration settings (Lab, Specimen, Parameters, Results, TAT, etc.).
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col space-y-6">
                        {/* Sub-tabs header */}
                        <div className="flex gap-1 border-b border-slate-200 pb-3 overflow-x-auto">
                          {subTabs.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => !tab.disabled && setServiceSubTab(tab.id)}
                              disabled={tab.disabled}
                              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                serviceSubTab === tab.id
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                  : tab.disabled
                                  ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Sub-tab Content body */}
                        <div className="space-y-4">

                      {/* ── LAB DETAILS TAB ── */}
                      {serviceSubTab === 'lab' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                          <h4 className="font-bold text-sm text-slate-900">Lab Details</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Result Type *</label>
                              <select
                                value={labDetails.resultType}
                                onChange={e => setLabDetails({ ...labDetails, resultType: e.target.value as any })}
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400"
                              >
                                {RESULT_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                              </select>
                              {isParameterType && <p className="text-xxs text-blue-600 mt-1">→ Parameter tab will be enabled to add sub-tests</p>}
                              {isAlphanumericType && <p className="text-xxs text-emerald-600 mt-1">→ Alphanumeric Results tab will be enabled</p>}
                              {isNumericType && <p className="text-xxs text-slate-400 mt-1">→ Configure numeric reference ranges in Results tab</p>}
                            </div>
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Short Name (Alternate)</label>
                              <input value={labDetails.shortName} onChange={e => setLabDetails({ ...labDetails, shortName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400" placeholder="e.g. Osmolality" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xxs text-slate-500 font-semibold block mb-1">Clinical Significance</label>
                            <textarea value={labDetails.clinicalSignificance} onChange={e => setLabDetails({ ...labDetails, clinicalSignificance: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 resize-none" placeholder="Describe clinical significance..." />
                          </div>
                          <div>
                            <label className="text-xxs text-slate-500 font-semibold block mb-1">Investigation Description</label>
                            <textarea value={labDetails.investigationDescription} onChange={e => setLabDetails({ ...labDetails, investigationDescription: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 resize-none" placeholder="Test methodology, sample type, etc." />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Patient Instruction</label>
                              <textarea value={labDetails.patientInstruction} onChange={e => setLabDetails({ ...labDetails, patientInstruction: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 resize-none" placeholder="e.g. 8 hours fasting required" />
                            </div>
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Phlebotomist Instruction</label>
                              <textarea value={labDetails.phlebotomistInstruction} onChange={e => setLabDetails({ ...labDetails, phlebotomistInstruction: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 resize-none" placeholder="e.g. Collect in EDTA tube" />
                            </div>
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Technician Instruction</label>
                              <textarea value={labDetails.technicianInstruction} onChange={e => setLabDetails({ ...labDetails, technicianInstruction: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 resize-none" placeholder="e.g. Run on analyzer XYZ" />
                            </div>
                          </div>

                          <div className="flex items-center gap-6 py-2 border-t border-slate-100">
                            {[
                              { key: 'genderWise', label: 'Gender Wise' },
                              { key: 'ageRangeWise', label: 'Age Range Wise' },
                              { key: 'deltaCheck', label: 'Delta Check' },
                              { key: 'isResultMandatory', label: 'Is Result Mandatory' },
                              { key: 'isDerived', label: 'Derived' },
                            ].map(f => (
                              <label key={f.key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={(labDetails as any)[f.key]}
                                  onChange={e => setLabDetails({ ...labDetails, [f.key]: e.target.checked })}
                                  className="rounded border-slate-300 text-blue-600"
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>

                          <div className="flex justify-end">
                            <button onClick={handleSaveLabDetails} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all">
                              <Save className="w-3.5 h-3.5" /> Save Lab Details
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── SPECIMEN TAB ── */}
                      {serviceSubTab === 'specimen' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                          <h4 className="font-bold text-sm text-slate-900 mb-3">Specimen Configuration</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Specimen Type</label>
                              <select
                                value={selectedSpecimenId}
                                onChange={e => setSelectedSpecimenId(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white"
                              >
                                <option value="">-- Select Specimen --</option>
                                {specimens.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Container Type</label>
                              <select
                                value={selectedContainerId}
                                onChange={e => setSelectedContainerId(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white"
                              >
                                <option value="">-- Select Container --</option>
                                {containers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleSaveSpecimenConfig}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
                            >
                              <Save className="w-3.5 h-3.5" /> Save Specimen Config
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── PARAMETER TAB (only for Parameter result type) ── */}
                      {serviceSubTab === 'parameter' && isParameterType && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900">Service Parameters</h4>
                            <button
                              onClick={() => {
                                setNewParam({
                                  name: '', code: '', resultType: 'Numeric', sortOrder: parameters.length + 1,
                                  parentId: '', shortName: '', isMandatory: true, isDerived: false,
                                  isParameterSum: false, isActive: true
                                });
                                setEditingParameterId(null);
                                setIsAddingParam(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Parameter
                            </button>
                          </div>

                          {isAddingParam && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                              <p className="text-xxs font-bold text-blue-700 uppercase tracking-wider">
                                {editingParameterId ? '✏ Edit Parameter' : '✨ New Parameter'}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Parameter Name *</label>
                                  <input 
                                    placeholder="e.g. Haemoglobin" 
                                    value={newParam.name} 
                                    onChange={e => setNewParam({ ...newParam, name: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Code *</label>
                                  <input 
                                    placeholder="e.g. HB" 
                                    value={newParam.code} 
                                    onChange={e => setNewParam({ ...newParam, code: e.target.value.toUpperCase() })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 font-mono bg-white" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Sub Type Of (Parent)</label>
                                  <select 
                                    value={newParam.parentId} 
                                    onChange={e => setNewParam({ ...newParam, parentId: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white"
                                  >
                                    <option value="">-- None (Root) --</option>
                                    {parameters
                                      .filter(p => p.id !== editingParameterId)
                                      .map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                                      ))
                                    }
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Result Type *</label>
                                  <select 
                                    value={newParam.resultType} 
                                    onChange={e => setNewParam({ ...newParam, resultType: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white"
                                  >
                                    <option value="Numeric">Numeric</option>
                                    <option value="Alphanumeric">Alphanumeric</option>
                                    <option value="Template">Template</option>
                                    <option value="Heading">Heading (Label Only)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Short Name</label>
                                  <input 
                                    placeholder="Alternate label" 
                                    value={newParam.shortName} 
                                    onChange={e => setNewParam({ ...newParam, shortName: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Sort Order *</label>
                                  <input 
                                    type="number" 
                                    placeholder="Sort Order" 
                                    value={newParam.sortOrder} 
                                    onChange={e => setNewParam({ ...newParam, sortOrder: Number(e.target.value) })} 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400 bg-white" 
                                  />
                                </div>
                              </div>

                              {/* Checkboxes Row */}
                              <div className="flex flex-wrap gap-4 py-1.5 border-t border-blue-100 mt-2">
                                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer select-none font-semibold">
                                  <input 
                                    type="checkbox" 
                                    checked={newParam.isMandatory} 
                                    onChange={e => setNewParam({ ...newParam, isMandatory: e.target.checked })} 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" 
                                  />
                                  Is Result Mandatory
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer select-none font-semibold">
                                  <input 
                                    type="checkbox" 
                                    checked={newParam.isDerived} 
                                    onChange={e => setNewParam({ ...newParam, isDerived: e.target.checked })} 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" 
                                  />
                                  Derived Parameter
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer select-none font-semibold">
                                  <input 
                                    type="checkbox" 
                                    checked={newParam.isParameterSum} 
                                    onChange={e => setNewParam({ ...newParam, isParameterSum: e.target.checked })} 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" 
                                  />
                                  Is Parameter Sum
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer select-none font-semibold">
                                  <input 
                                    type="checkbox" 
                                    checked={newParam.isActive} 
                                    onChange={e => setNewParam({ ...newParam, isActive: e.target.checked })} 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" 
                                  />
                                  Active
                                </label>
                              </div>

                              <div className="flex justify-end gap-2 border-t border-blue-100 pt-3">
                                <button 
                                  onClick={() => {
                                    setIsAddingParam(false);
                                    setEditingParameterId(null);
                                    setNewParam({
                                      name: '', code: '', resultType: 'Numeric', sortOrder: parameters.length + 1,
                                      parentId: '', shortName: '', isMandatory: true, isDerived: false,
                                      isParameterSum: false, isActive: true
                                    });
                                  }} 
                                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs text-slate-650 rounded-xl font-bold bg-white transition-all active:scale-95"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={handleAddParameter} 
                                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                  <Save className="w-4 h-4" /> Save Parameter
                                </button>
                              </div>
                            </div>
                          )}

                          {parameters.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                              No parameters configured. Click Add Parameter.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {parameters.map((p, idx) => {
                                const parentParam = parameters.find(parent => parent.id === p.parentId);
                                const isChild = !!p.parentId;

                                return (
                                  <div 
                                    key={p.id} 
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                      selectedParameter?.id === p.id 
                                        ? 'bg-blue-50/50 border-blue-300 shadow-xs' 
                                        : p.resultType === 'Heading'
                                        ? 'bg-slate-50/70 border-slate-250 font-bold'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    } ${isChild ? 'ml-8 border-l-2 border-l-blue-400 pl-4' : ''}`}
                                    onClick={() => setSelectedParameter(p === selectedParameter ? null : p)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-xxs text-slate-400 w-4 font-mono">{idx + 1}</span>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-xxs font-mono text-blue-600 font-bold">{p.code}</span>
                                          {p.resultType === 'Heading' && (
                                            <span className="text-[8px] bg-slate-200 text-slate-700 font-extrabold uppercase px-1 rounded">Heading</span>
                                          )}
                                          {p.isMandatory && p.resultType !== 'Heading' && (
                                            <span className="text-[8px] bg-amber-50 text-amber-700 font-extrabold border border-amber-250/50 px-1 rounded">Mandatory</span>
                                          )}
                                          {p.isDerived && (
                                            <span className="text-[8px] bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-250/50 px-1 rounded">Derived</span>
                                          )}
                                          {p.isParameterSum && (
                                            <span className="text-[8px] bg-purple-50 text-purple-700 font-extrabold border border-purple-250/50 px-1 rounded">Sum</span>
                                          )}
                                          {!p.isActive && (
                                            <span className="text-[8px] bg-slate-100 text-slate-500 font-bold border border-slate-200 px-1 rounded">Inactive</span>
                                          )}
                                        </div>
                                        <p className={`text-xs font-semibold text-slate-900 ${p.resultType === 'Heading' ? 'text-slate-800' : ''}`}>{p.name}</p>
                                        {parentParam && (
                                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Subtype of: <span className="font-bold text-slate-500">{parentParam.name}</span></p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xxs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold mr-2">{p.resultType}</span>
                                      
                                      <button 
                                        onClick={e => {
                                          e.stopPropagation();
                                          setEditingParameterId(p.id);
                                          setNewParam({
                                            name: p.name,
                                            code: p.code,
                                            resultType: p.resultType,
                                            sortOrder: p.sortOrder,
                                            parentId: p.parentId || '',
                                            shortName: p.shortName || '',
                                            isMandatory: p.isMandatory ?? true,
                                            isDerived: p.isDerived ?? false,
                                            isParameterSum: p.isParameterSum ?? false,
                                            isActive: p.isActive ?? true
                                          });
                                          setIsAddingParam(true);
                                        }} 
                                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors p-1.5 rounded-lg border border-transparent"
                                        title="Edit Parameter"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <button onClick={e => { e.stopPropagation(); handleDeleteParameter(p.id); }} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors p-1.5 rounded-lg border border-transparent">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── RESULTS TAB ── */}
                      {serviceSubTab === 'results' && (
                        <div className="space-y-4">
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-slate-900">Lab Results</h4>
                              <button
                                onClick={() => { setIsAddingRange(true); setEditingRangeId(null); setNewRange({ gender: 'All', ageMin: 0, ageMax: 999, refMin: '', refMax: '', borderlineLow: '', borderlineHigh: '', criticalMin: '', criticalMax: '', unit: '', remarks: '', equipmentId: '', site: '', isDerived: false, parameterId: '' }); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>

                            {/* ── Add Form ── */}
                            {isAddingRange && (
                              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <p className="text-xxs font-bold uppercase tracking-wider" style={{ color: editingRangeId ? '#d97706' : '#059669' }}>
                                  {editingRangeId ? '✏ Edit Reference Range' : 'New Age / Gender Bracket'}
                                </p>
                                <div className="grid grid-cols-6 gap-3 items-end">
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Gender</label>
                                    <select value={newRange.gender} onChange={e => setNewRange({ ...newRange, gender: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white">
                                      <option value="Both">Both</option>
                                      <option value="All">All</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Age From</label>
                                    <input type="number" value={newRange.ageMin} onChange={e => setNewRange({ ...newRange, ageMin: Number(e.target.value) })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Age To</label>
                                    <input type="number" value={newRange.ageMax} onChange={e => setNewRange({ ...newRange, ageMax: Number(e.target.value) })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Lower Ref</label>
                                    <input placeholder="e.g. 12.0" value={newRange.refMin} onChange={e => setNewRange({ ...newRange, refMin: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Upper Ref</label>
                                    <input placeholder="e.g. 17.0" value={newRange.refMax} onChange={e => setNewRange({ ...newRange, refMax: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Borderline Low</label>
                                    <input placeholder="e.g. 10.0" value={newRange.borderlineLow} onChange={e => setNewRange({ ...newRange, borderlineLow: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                </div>

                                {/* Row 2: Borderline High, Panic Low, Panic High, Unit, Parameter, Equipment */}
                                <div className="grid grid-cols-6 gap-3 items-end">
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Borderline High</label>
                                    <input placeholder="e.g. 18.5" value={newRange.borderlineHigh} onChange={e => setNewRange({ ...newRange, borderlineHigh: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Panic Low</label>
                                    <input placeholder="e.g. 7.0" value={newRange.criticalMin} onChange={e => setNewRange({ ...newRange, criticalMin: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Panic High</label>
                                    <input placeholder="e.g. 21.0" value={newRange.criticalMax} onChange={e => setNewRange({ ...newRange, criticalMax: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Unit *</label>
                                    <input placeholder="e.g. g/dL" value={newRange.unit} onChange={e => setNewRange({ ...newRange, unit: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  {isParameterType && (
                                    <div>
                                      <label className="text-xxs text-slate-500 font-semibold block mb-1">Parameter</label>
                                      <select value={newRange.parameterId} onChange={e => setNewRange({ ...newRange, parameterId: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white">
                                        <option value="">-- Select --</option>
                                        {parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Equipment</label>
                                    <select value={newRange.equipmentId} onChange={e => setNewRange({ ...newRange, equipmentId: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white">
                                      <option value="">-- Select --</option>
                                      {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                                    </select>
                                  </div>
                                </div>

                                {/* Row 3: Site, Remarks, Derived, Add button */}
                                <div className="grid grid-cols-6 gap-3 items-end">
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Site</label>
                                    <input placeholder="e.g. Main Lab" value={newRange.site} onChange={e => setNewRange({ ...newRange, site: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div className="col-span-3">
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Remarks</label>
                                    <input placeholder="Optional remarks" value={newRange.remarks} onChange={e => setNewRange({ ...newRange, remarks: e.target.value })} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white" />
                                  </div>
                                  <div className="flex items-center gap-2 pt-5">
                                    <input type="checkbox" id="derivedChk" checked={newRange.isDerived} onChange={e => setNewRange({ ...newRange, isDerived: e.target.checked })} className="rounded border-slate-300 text-blue-600" />
                                    <label htmlFor="derivedChk" className="text-xs text-slate-600 cursor-pointer select-none">Derived</label>
                                  </div>
                                  <div className="flex gap-2 pt-4 justify-end">
                                    <button onClick={() => { setIsAddingRange(false); setEditingRangeId(null); setNewRange({ gender: 'All', ageMin: 0, ageMax: 999, refMin: '', refMax: '', borderlineLow: '', borderlineHigh: '', criticalMin: '', criticalMax: '', unit: '', remarks: '', equipmentId: '', site: '', isDerived: false, parameterId: '' }); }} className="px-3 py-1.5 border border-slate-200 bg-white rounded text-xs text-slate-500">Cancel</button>
                                    {editingRangeId
                                      ? <button onClick={handleUpdateReferenceRange} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold">Update</button>
                                      : <button onClick={handleAddReferenceRange} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold">Add</button>
                                    }
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── Results Grid ── */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                                <thead>
                                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-500 font-bold text-xxs uppercase tracking-wider">
                                    <th className="py-2 px-2">Gender</th>
                                    <th className="py-2 px-2">Age From</th>
                                    <th className="py-2 px-2">Age To</th>
                                    <th className="py-2 px-2">Lower Ref</th>
                                    <th className="py-2 px-2">Upper Ref</th>
                                    <th className="py-2 px-2">Borderline Low</th>
                                    <th className="py-2 px-2">Borderline High</th>
                                    <th className="py-2 px-2">Panic Low</th>
                                    <th className="py-2 px-2">Panic High</th>
                                    <th className="py-2 px-2">Unit</th>
                                    {isParameterType && <th className="py-2 px-2">Parameter</th>}
                                    <th className="py-2 px-2">Equipment</th>
                                    <th className="py-2 px-2">Site</th>
                                    <th className="py-2 px-2">Remarks</th>
                                    <th className="py-2 px-2">Derived</th>
                                    <th className="py-2 px-2">Edit</th>
                                    <th className="py-2 px-2">Remove</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ranges.length === 0 ? (
                                    <tr><td colSpan={16} className="text-center py-8 text-slate-400">No reference ranges configured. Click Add to begin.</td></tr>
                                  ) : ranges.map(r => {
                                    const eqName = equipment.find(e => e.id === r.equipmentId)?.name;
                                    const paramName = parameters.find(p => p.id === r.parameterId)?.name;
                                    return (
                                      <tr key={r.id} className="border-b border-slate-100 hover:bg-blue-50/30 group transition-colors">
                                        <td className="py-2 px-2 font-semibold text-blue-600">{r.gender}</td>
                                        <td className="py-2 px-2 font-mono">{r.ageMin}</td>
                                        <td className="py-2 px-2 font-mono">{r.ageMax}</td>
                                        <td className="py-2 px-2 font-mono text-emerald-700">{r.refMin || '–'}</td>
                                        <td className="py-2 px-2 font-mono text-emerald-700">{r.refMax || '–'}</td>
                                        <td className="py-2 px-2 font-mono text-amber-600">{r.borderlineLow || '–'}</td>
                                        <td className="py-2 px-2 font-mono text-amber-600">{r.borderlineHigh || '–'}</td>
                                        <td className="py-2 px-2 font-mono text-rose-600">{r.criticalMin || '–'}</td>
                                        <td className="py-2 px-2 font-mono text-rose-600">{r.criticalMax || '–'}</td>
                                        <td className="py-2 px-2 text-slate-600">{r.unit || '–'}</td>
                                        {isParameterType && <td className="py-2 px-2 text-slate-600">{paramName || '–'}</td>}
                                        <td className="py-2 px-2 text-slate-600">{eqName || '–'}</td>
                                        <td className="py-2 px-2 text-slate-600">{r.site || '–'}</td>
                                        <td className="py-2 px-2 text-slate-500 italic max-w-[120px] truncate">{r.remarks || '–'}</td>
                                        <td className="py-2 px-2">
                                          {r.isDerived
                                            ? <span className="bg-blue-100 text-blue-700 text-xxs font-bold px-1.5 py-0.5 rounded">Yes</span>
                                            : <span className="text-slate-300">–</span>}
                                        </td>
                                        <td className="py-2 px-2">
                                          <button onClick={() => handleEditRange(r)} className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-700 transition-all p-1 rounded" title="Edit">
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                        <td className="py-2 px-2">
                                          <button onClick={() => handleDeleteRange(r.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-all p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}


                      {/* ── REFERENCE RANGE REMARKS TAB ── */}
                      {serviceSubTab === 'remarks' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                          <h4 className="font-bold text-base text-blue-600">Reference Range Remarks</h4>
                          
                          {/* Form Section */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-3 gap-4 items-start">
                              {/* Col 1 */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xxs text-slate-500 font-semibold block mb-1">Site</label>
                                  <select 
                                    value={newRefRemark.site} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, site: e.target.value })}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white"
                                  >
                                    <option value="">-- Select --</option>
                                    {hospitals.map(h => (
                                      <option key={h.id} value={h.name}>{h.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                  <input 
                                    type="checkbox" 
                                    id="remarksActiveChk" 
                                    checked={newRefRemark.isActive} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, isActive: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <label htmlFor="remarksActiveChk" className="text-xs text-slate-600 font-semibold cursor-pointer select-none">Active</label>
                                </div>
                                <div>
                                  <label className="text-xxs text-slate-500 font-semibold block mb-1">Footer</label>
                                  <textarea 
                                    rows={2}
                                    placeholder="Enter footer notes..." 
                                    value={newRefRemark.footer} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, footer: e.target.value })}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white resize-none"
                                  />
                                </div>
                              </div>

                              {/* Col 2 */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xxs text-slate-500 font-semibold block mb-1">Equipment</label>
                                  <select 
                                    value={newRefRemark.equipmentId} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, equipmentId: e.target.value })}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white"
                                  >
                                    <option value="">-- Select --</option>
                                    {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xxs text-slate-500 font-semibold block mb-1">Remarks</label>
                                  <textarea 
                                    rows={4}
                                    placeholder="Enter remarks..." 
                                    value={newRefRemark.remarks} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, remarks: e.target.value })}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white resize-none"
                                  />
                                </div>
                              </div>

                              {/* Col 3 */}
                              <div className="space-y-3">
                                {isParameterType ? (
                                  <div>
                                    <label className="text-xxs text-slate-500 font-semibold block mb-1">Parameter</label>
                                    <select 
                                      value={newRefRemark.parameterId} 
                                      onChange={e => setNewRefRemark({ ...newRefRemark, parameterId: e.target.value })}
                                      className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white"
                                    >
                                      <option value="">-- Select --</option>
                                      {parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="h-[46px]" />
                                )}
                                <div>
                                  <label className="text-xxs text-slate-500 font-semibold block mb-1">Test Method</label>
                                  <textarea 
                                    rows={4}
                                    placeholder="Enter test method details..." 
                                    value={newRefRemark.testMethod} 
                                    onChange={e => setNewRefRemark({ ...newRefRemark, testMethod: e.target.value })}
                                    className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:border-blue-400 bg-white resize-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                              <button 
                                onClick={() => {
                                  setEditingRefRemarkId(null);
                                  setNewRefRemark({
                                    site: '',
                                    equipmentId: '',
                                    parameterId: '',
                                    remarks: '',
                                    testMethod: '',
                                    footer: '',
                                    isActive: true
                                  });
                                }}
                                className="px-3 py-1.5 border border-slate-200 bg-white rounded text-xs text-slate-500"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleSaveRefRemark}
                                disabled={remarksSaving}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all disabled:opacity-60"
                              >
                                {remarksSaving ? 'Saving...' : editingRefRemarkId ? 'Update' : 'Save'}
                              </button>
                            </div>
                          </div>

                          {/* Grid/Table Section */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                              <thead>
                                <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-500 font-bold text-xxs uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Site</th>
                                  <th className="py-2.5 px-3">Equipment</th>
                                  {isParameterType && <th className="py-2.5 px-3">Parameter</th>}
                                  <th className="py-2.5 px-3">Remarks</th>
                                  <th className="py-2.5 px-3">Test Method</th>
                                  <th className="py-2.5 px-3">Footer</th>
                                  <th className="py-2.5 px-3 text-center">Active</th>
                                  <th className="py-2.5 px-3 text-center">Modify</th>
                                </tr>
                              </thead>
                              <tbody>
                                {refRemarks.length === 0 ? (
                                  <tr>
                                    <td colSpan={isParameterType ? 8 : 7} className="text-center py-6 text-slate-400">
                                      No reference range remarks configured.
                                    </td>
                                  </tr>
                                ) : (
                                  refRemarks.map(r => {
                                    const eqName = equipment.find(e => e.id === r.equipmentId)?.name || '–';
                                    const paramName = parameters.find(p => p.id === r.parameterId)?.name || '–';
                                    return (
                                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.site || '–'}</td>
                                        <td className="py-2.5 px-3 text-slate-700">{eqName}</td>
                                        {isParameterType && <td className="py-2.5 px-3 text-slate-700">{paramName}</td>}
                                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={r.remarks}>{r.remarks || '–'}</td>
                                        <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={r.testMethod}>{r.testMethod || '–'}</td>
                                        <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={r.footer}>{r.footer || '–'}</td>
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                          {r.isActive ? '✓' : '✗'}
                                        </td>
                                        <td className="py-2.5 px-3 text-center space-x-1.5 whitespace-nowrap">
                                          <button 
                                            onClick={() => handleEditRefRemark(r)} 
                                            className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-700 p-1 transition-all"
                                            title="Edit"
                                          >
                                            <Pencil className="w-3.5 h-3.5 inline" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteRefRemark(r.id)} 
                                            className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 transition-all"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 inline" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* ── ALPHANUMERIC RESULTS TAB ── */}
                      {serviceSubTab === 'alphanumeric' && (
                        <div className="space-y-4">
                          {isParameterType && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                              <p className="text-xxs text-slate-500 font-semibold mb-2">Select an Alphanumeric Parameter</p>
                              <div className="flex flex-wrap gap-2">
                                {parameters.filter(p => (p as any).result_type === 'Alphanumeric' || p.resultType === 'Alphanumeric').map(p => (
                                  <button key={p.id} onClick={() => setSelectedParameter(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedParameter?.id === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                                    {p.code} – {p.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {(!isParameterType || selectedParameter) && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900">Predefined Result Options</h4>
                                  <p className="text-xxs text-slate-400 mt-0.5">
                                    {selectedParameter ? `For parameter: ${selectedParameter.name}` : 'Service-level alphanumeric options'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => { setNewOption({ optionValue: '', sortOrder: paramOptions.length + 1 }); setIsAddingOption(true); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Option
                                </button>
                              </div>

                              {isAddingOption && (
                                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                                  <p className="text-xxs font-bold text-violet-700 uppercase tracking-wider">New Result Option</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="Option value (e.g. Positive, Reactive, Trace)" value={newOption.optionValue} onChange={e => setNewOption({ ...newOption, optionValue: e.target.value })} className="border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-violet-400 bg-white" />
                                    <input type="number" placeholder="Sort Order" value={newOption.sortOrder} onChange={e => setNewOption({ ...newOption, sortOrder: Number(e.target.value) })} className="border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-violet-400 bg-white" />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsAddingOption(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-white">Cancel</button>
                                    <button onClick={handleAddParamOption} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold">Save Option</button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                {paramOptions.length === 0 ? (
                                  <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                                    No options configured. Add predefined result values (e.g. Positive, Negative, Reactive).
                                  </div>
                                ) : paramOptions.map((opt, idx) => (
                                  <div key={opt.id} className="flex items-center justify-between p-3 bg-violet-50 border border-violet-200 rounded-xl group hover:bg-violet-100 transition-all">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xxs text-violet-400 w-4 font-mono">{opt.sortOrder}.</span>
                                      <div className="flex items-center gap-2">
                                        <Tag className="w-3 h-3 text-violet-500" />
                                        <span className="text-xs font-semibold text-violet-900">{opt.optionValue}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => handleDeleteParamOption(opt.id)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {paramOptions.length > 0 && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                  <p className="text-xxs text-slate-400 font-semibold mb-1">Preview (at result entry time):</p>
                                  <div className="flex flex-wrap gap-2">
                                    {paramOptions.map(opt => (
                                      <span key={opt.id} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-sm">{opt.optionValue}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── TURNAROUND TIME TAB ── */}
                      {serviceSubTab === 'tat' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <h4 className="font-bold text-sm text-slate-900">Turnaround Time Configuration</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Expected TAT (Hours)</label>
                              <input type="number" value={tatHours} onChange={e => setTatHours(e.target.value)} placeholder="e.g. 4" className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400" />
                            </div>
                            <div>
                              <label className="text-xxs text-slate-500 font-semibold block mb-1">Alert at (Hours before breach)</label>
                              <input type="number" value={tatAlert} onChange={e => setTatAlert(e.target.value)} placeholder="e.g. 1" className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400" />
                            </div>
                          </div>
                          {tatHours && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                              <p className="text-xs text-amber-700">Lab orders will breach TAT after <strong>{tatHours} hours</strong>. Alert triggered at <strong>{tatAlert || 1} hour(s)</strong> before breach.</p>
                            </div>
                          )}
                          <p className="text-xxs text-slate-400">TAT column will be added to the lims_service_parameters table in a future migration.</p>
                        </div>
                      )}

                      {serviceSubTab === 'reagents' && (
                        <ReagentsMappingSubtab selectedService={selectedService} />
                      )}

                      {/* ── PROFILE COMPONENTS TAB ── */}
                      {serviceSubTab === 'components' && selectedService && (
                        <ProfileComponentsSubtab selectedService={selectedService} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

          {/* ── OTHER MASTER TABS ── */}
          {activeTab !== 'services' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
                <MasterFormAndTable
                  type={activeTab}
                  data={
                    activeTab === 'specimens' ? specimens :
                    activeTab === 'containers' ? containers :
                    activeTab === 'equipment' ? equipment :
                    activeTab === 'outsource' ? outsourceLabs :
                    activeTab === 'microbiology' ? [...organisms, ...antibiotics, ...stains] : []
                  }
                  onAdd={handleAddMasterItem}
                />
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

// ── Simple Master Form+Table ──
function MasterFormAndTable({
  type, data, onAdd
}: {
  type: Exclude<MainTab, 'services'>;
  data: any[];
  onAdd: (table: string, name: string, code: string, extra?: any) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [extraVal, setExtraVal] = useState('');
  const [microType, setMicroType] = useState<'lims_organisms' | 'lims_antibiotics' | 'lims_stains'>('lims_organisms');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    let table = 'lims_specimens', extra: any = {};
    if (type === 'containers') { table = 'lims_containers'; extra = { cap_color: extraVal }; }
    else if (type === 'equipment') { table = 'lims_equipment'; extra = { model: extraVal }; }
    else if (type === 'microbiology') { table = microType; }
    else if (type === 'outsource') { table = 'lims_outsource_labs'; extra = { contact_no: extraVal }; }
    onAdd(table, name, code, extra);
    setName(''); setCode(''); setExtraVal('');
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
        <p className="text-xxs font-bold text-blue-600 uppercase tracking-wider">Add Record</p>
        {type === 'microbiology' && (
          <div className="flex gap-4">
            {(['lims_organisms', 'lims_antibiotics', 'lims_stains'] as const).map(t => (
              <label key={t} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="radio" name="microType" checked={microType === t} onChange={() => setMicroType(t)} className="text-blue-600" />
                {t === 'lims_organisms' ? 'Organisms' : t === 'lims_antibiotics' ? 'Antibiotics' : 'Stains'}
              </label>
            ))}
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 items-end">
          <input required placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white col-span-1 font-semibold" />
          <input required placeholder="Code" value={code} onChange={e => setCode(e.target.value)} className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 font-mono bg-white font-semibold uppercase" />
          {type === 'containers' && <input placeholder="Cap Color (e.g. #800080)" value={extraVal} onChange={e => setExtraVal(e.target.value)} className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white font-semibold" />}
          {type === 'equipment' && <input placeholder="Model (e.g. DXH-800)" value={extraVal} onChange={e => setExtraVal(e.target.value)} className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white font-semibold" />}
          {type === 'outsource' && <input placeholder="Contact No" value={extraVal} onChange={e => setExtraVal(e.target.value)} className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white font-semibold" />}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-all col-span-1 shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold text-xxs uppercase tracking-wider">
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3">Code</th>
              {type === 'containers' && <th className="py-2.5 px-3">Cap Color</th>}
              {type === 'equipment' && <th className="py-2.5 px-3">Model</th>}
              {type === 'outsource' && <th className="py-2.5 px-3">Contact</th>}
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No records found</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">{item.code}</td>
                {type === 'containers' && (
                  <td className="py-2.5 px-3 font-mono flex items-center gap-1.5">
                    {item.cap_color && <span className="w-3 h-3 rounded-full border border-slate-200 inline-block" style={{ backgroundColor: item.cap_color }} />}
                    {item.cap_color || '–'}
                  </td>
                )}
                {type === 'equipment' && <td className="py-2.5 px-3">{item.model || '–'}</td>}
                {type === 'outsource' && <td className="py-2.5 px-3 font-mono">{item.contact_no || '–'}</td>}
                <td className="py-2.5 px-3">
                  <span className="bg-emerald-50 text-emerald-600 text-xxs font-bold px-1.5 py-0.5 rounded">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

