import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getSupabase } from '../services/supabaseClient';
import { 
  Search, Plus, Trash2, ShieldCheck, Layers, Percent, Check, X, FileText, 
  ChevronRight, Calendar, Landmark, Settings, AlertCircle, HelpCircle, 
  MapPin, PlusCircle, CheckSquare, Square, Info
} from 'lucide-react';

interface HospitalMapping {
  code: string;
  name: string;
}

interface PolicyRule {
  id: string;
  type: string;
  visitType: string;
  gender: string;
  ageBracket: string;
  amountLimit: number;
  quantityLimit: number;
  className: string;
  aliasCode: string;
  aliasName: string;
  tariffClass: string;
  tariffValue: string;
  dayOfService: string;
  exclude: boolean;
  patientCoPay: string;
  sponsorPay: string;
  active: boolean;
  groupName?: string;
}

interface PatientMaxAmountConfig {
  id: string;
  className: string;
  circleName: string;
  branch: string;
  patMaxAmt: number;
  minimumAmt: number;
  addOnType: string;
  approvalLimit: number;
  groupName: string;
  visitType: string;
  active: boolean;
}

interface PolicyItem {
  id: string;
  policyNo: string;
  policyName: string;
  active: boolean;
  restricted: boolean;
  sponsorType: string;
  sponsorId: string;
  insuranceId: string;
  serviceTax: string;
  startDate: string;
  endDate: string;
  sponsorPayTax: boolean;
  isSponsorPrice: boolean;
  patientAmt: number;
  isAutoCorporatePlanCreate: boolean;
  hospitals: HospitalMapping[];
  rules: PolicyRule[];
  maxAmountConfigs: PatientMaxAmountConfig[];
}

export const PlanDefinition: React.FC = () => {
    const { organizations, branches, showToast, serviceDefinitions, drugGenerics, isDbConnected, selectedCurrency, formatCurrency } = useData();

    // Tab management inside Create/Edit Mode
    const [subTab, setSubTab] = useState<'policy' | 'policyRule' | 'classHospitalMapping'>('policy');
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Central Policy List State loaded from localStorage or mock
    const [policies, setPolicies] = useState<PolicyItem[]>(() => {
        const saved = localStorage.getItem('policies_definitions');
        if (saved) return JSON.parse(saved);
        
        return [
            {
                id: 'pol-1',
                policyNo: '521612001',
                policyName: '2P Perfect Presentation Company',
                active: true,
                restricted: false,
                sponsorType: 'TPA',
                sponsorId: organizations[0]?.id || '1',
                insuranceId: organizations[0]?.id || '1',
                serviceTax: 'VAT 15 PERCENT',
                startDate: '2026-01-24T12:00',
                endDate: '2027-01-23T12:00',
                sponsorPayTax: true,
                isSponsorPrice: true,
                patientAmt: 0.0,
                isAutoCorporatePlanCreate: false,
                hospitals: [
                    { code: 'KIMC', name: 'Complex KOKARA TABUK AL-TABI BRANCH CHARKA DORRA AL-QADHI Medical' }
                ],
                rules: [
                    {
                        id: 'rule-1',
                        type: 'SERVICES',
                        visitType: 'OP',
                        gender: 'All',
                        ageBracket: 'All',
                        amountLimit: 1000,
                        quantityLimit: 5,
                        className: 'SERVICE_GROUPS',
                        aliasCode: 'CON-01',
                        aliasName: 'Consultation',
                        tariffClass: 'A+',
                        tariffValue: '100',
                        dayOfService: 'All',
                        exclude: false,
                        patientCoPay: '10%',
                        sponsorPay: '90%',
                        active: true
                    }
                ],
                maxAmountConfigs: [
                    {
                        id: 'mac-1',
                        className: 'A+',
                        circleName: 'Gold Circle',
                        branch: 'KIMC',
                        patMaxAmt: 100,
                        minimumAmt: 0,
                        addOnType: 'None',
                        approvalLimit: 1500,
                        groupName: 'SERVICE_GROUPS',
                        visitType: 'OP',
                        active: true
                    }
                ]
            }
        ];
    });

    useEffect(() => {
        const loadPoliciesFromDb = async () => {
            if (!isDbConnected) return;
            const supabase = getSupabase();
            try {
                // Fetch insurance policies
                const { data: ipData, error: ipError } = await supabase
                    .from('insurance_policies')
                    .select('*');
                if (ipError) throw ipError;

                if (!ipData || ipData.length === 0) return;

                // Fetch rules
                const { data: rulesData, error: rulesError } = await supabase
                    .from('policy_rules')
                    .select('*');
                if (rulesError) throw rulesError;

                // Fetch mapped branches
                const { data: branchesData, error: branchesError } = await supabase
                    .from('policy_mapped_branches')
                    .select('*');
                if (branchesError) throw branchesError;

                // Fetch max amounts
                const { data: maxAmtsData, error: maxAmtsError } = await supabase
                    .from('policy_patient_max_amounts')
                    .select('*');
                if (maxAmtsError) throw maxAmtsError;

                // Structure them into PolicyItem
                const loaded: PolicyItem[] = ipData.map((p: any) => {
                    const myRules = (rulesData || []).filter((r: any) => r.policy_id === p.id).map((r: any) => ({
                        id: r.id,
                        type: r.rule_type,
                        visitType: r.visit_type,
                        gender: r.gender || 'All',
                        ageBracket: 'All', // Default bracket
                        amountLimit: Number(r.amount_limit || 0),
                        quantityLimit: Number(r.quantity_limit || 0),
                        className: r.class_name || '',
                        aliasCode: r.alias_code || '',
                        aliasName: r.alias_name || '',
                        tariffClass: r.tariff_class || 'A+',
                        tariffValue: r.tariff_value || '',
                        dayOfService: 'All',
                        exclude: !!r.exclude,
                        patientCoPay: r.patient_copay || '0',
                        sponsorPay: r.sponsor_payment || '100',
                        active: !!r.active,
                        groupName: r.group_name || 'All'
                    }));

                    const myHospitals = (branchesData || []).filter((b: any) => b.policy_id === p.id).map((b: any) => ({
                        code: b.branch_code,
                        name: b.branch_name
                    }));

                    const myMaxConfigs = (maxAmtsData || []).filter((m: any) => m.policy_id === p.id).map((m: any) => ({
                        id: m.id,
                        className: m.class_name,
                        circleName: m.circle_name || '',
                        branch: m.branch_code || 'All',
                        patMaxAmt: Number(m.pat_max_amt || 100),
                        minimumAmt: Number(m.minimum_amt || 0),
                        addOnType: 'None',
                        approvalLimit: Number(m.approval_limit || 1500),
                        groupName: 'SERVICE_GROUPS',
                        visitType: m.visit_type || 'OP',
                        active: !!m.active
                    }));

                    return {
                        id: p.id,
                        policyNo: p.policy_no,
                        policyName: p.policy_name,
                        active: !!p.active,
                        restricted: !!p.restricted,
                        sponsorType: p.sponsor_type,
                        sponsorId: p.sponsor_id || '',
                        insuranceId: p.insurance_id || '',
                        serviceTax: p.service_tax || 'VAT 15 PERCENT',
                        startDate: p.start_date ? p.start_date.split('.')[0] : '', // format datetime-local
                        endDate: p.end_date ? p.end_date.split('.')[0] : '',
                        sponsorPayTax: !!p.sponsor_pay_tax,
                        isSponsorPrice: !!p.is_sponsor_price,
                        patientAmt: Number(p.patient_amt || 0),
                        isAutoCorporatePlanCreate: false,
                        hospitals: myHospitals,
                        rules: myRules,
                        maxAmountConfigs: myMaxConfigs
                    };
                });

                setPolicies(loaded);
            } catch (err) {
                console.error("Failed to load policies from database:", err);
            }
        };

        loadPoliciesFromDb();
    }, [isDbConnected]);

    // ----------------------------------------------------
    // TAB 1: POLICY FORM STATES
    // ----------------------------------------------------
    const [policyNo, setPolicyNo] = useState(() => `${Math.floor(100000000 + Math.random() * 900000000)}`);
    const [policyName, setPolicyName] = useState('');
    const [active, setActive] = useState(true);
    const [restricted, setRestricted] = useState(false);
    const [sponsorType, setSponsorType] = useState('TPA');
    const [sponsorId, setSponsorId] = useState('');
    const [insuranceId, setInsuranceId] = useState('');
    const [serviceTax, setServiceTax] = useState('VAT 15 PERCENT');
    const [startDate, setStartDate] = useState('2026-01-24T12:00');
    const [endDate, setEndDate] = useState('2027-01-23T12:00');
    const [sponsorPayTax, setSponsorPayTax] = useState(true);
    const [isSponsorPrice, setIsSponsorPrice] = useState(true);
    const [patientAmt, setPatientAmt] = useState<number>(0.0);
    const [isAutoCorporatePlanCreate, setIsAutoCorporatePlanCreate] = useState(false);
    const [mappedHospitals, setMappedHospitals] = useState<HospitalMapping[]>([]);
    const [selectedHospitalToAdd, setSelectedHospitalToAdd] = useState('');

    // ----------------------------------------------------
    // TAB 2: POLICY RULE FORM STATES
    // ----------------------------------------------------
    const [ruleType, setRuleType] = useState('SERVICES');
    const [ruleVisitType, setRuleVisitType] = useState('OP');
    const [ruleGender, setRuleGender] = useState('All');
    const [ruleAgeBracket, setRuleAgeBracket] = useState('All');
    const [ruleDayOfService, setRuleDayOfService] = useState('All');
    const [ruleTariffClass, setRuleTariffClass] = useState('A+');
    const [ruleTariffClassValue, setRuleTariffClassValue] = useState('A+ Value');
    const [ruleAmountLimit, setRuleAmountLimit] = useState<number>(0);
    const [ruleQuantityLimit, setRuleQuantityLimit] = useState<number>(0);
    const [ruleClass, setRuleClass] = useState('SERVICE_GROUPS');
    const [ruleGroup, setRuleGroup] = useState('All');
    const [ruleNetwork, setRuleNetwork] = useState('');
    const [ruleHospital, setRuleHospital] = useState('');
    const [ruleActive, setRuleActive] = useState(true);

    const serviceGroups = useMemo(() => {
        const groups = new Set<string>();
        serviceDefinitions?.forEach(s => {
            if (s.groupName) groups.add(s.groupName);
        });
        return Array.from(groups).sort();
    }, [serviceDefinitions]);

    const drugGroups = useMemo(() => {
        const groups = new Set<string>();
        drugGenerics?.forEach(d => {
            if (d.groupName) groups.add(d.groupName);
        });
        return Array.from(groups).sort();
    }, [drugGenerics]);

    const [ruleApprovalRequired, setRuleApprovalRequired] = useState(true);
    const [ruleApprovalAmount, setRuleApprovalAmount] = useState<number>(0);
    const [ruleComponentMaxPrice, setRuleComponentMaxPrice] = useState<number>(0);
    const [ruleExclusion, setRuleExclusion] = useState(false);
    const [ruleTypeOnBase, setRuleTypeOnBase] = useState('-- Select --');
    const [rulePatientCoPay, setRulePatientCoPay] = useState('10');
    const [rulePatientCoPayIsPercent, setRulePatientCoPayIsPercent] = useState(true);
    const [rulePatientCoPayMax, setRulePatientCoPayMax] = useState<number>(0);
    const [ruleSponsorPayment, setRuleSponsorPayment] = useState('90');
    const [rulePatientDeductible, setRulePatientDeductible] = useState('0');
    const [rulePatientDeductibleType, setRulePatientDeductibleType] = useState('Amt');

    const [rulesList, setRulesList] = useState<PolicyRule[]>([]);

    // Patient Max Amount Config Sub-form
    const [macClassName, setMacClassName] = useState('A+');
    const [macCircleName, setMacCircleName] = useState('');
    const [macPatMaxAmt, setMacPatMaxAmt] = useState<number>(100);
    const [macMinimumAmt, setMacMinimumAmt] = useState<number>(0);
    const [macAddOnType, setMacAddOnType] = useState('None');
    const [macMaxApprovalLimit, setMacMaxApprovalLimit] = useState<number>(1500);
    const [macActive, setMacActive] = useState(true);
    const [macBranch, setMacBranch] = useState('');
    const [macVisitType, setMacVisitType] = useState('OP');

    const [macList, setMacList] = useState<PatientMaxAmountConfig[]>([]);

    // Save all to local storage helper
    const savePolicies = (updatedPolicies: PolicyItem[]) => {
        setPolicies(updatedPolicies);
        localStorage.setItem('policies_definitions', JSON.stringify(updatedPolicies));
    };

    // Hospital Mapping handlers
    const handleAddHospital = () => {
        if (!selectedHospitalToAdd) {
            showToast('error', 'Please select a hospital branch to add');
            return;
        }
        const foundBranch = branches.find(b => b.id === selectedHospitalToAdd);
        if (!foundBranch) return;

        if (mappedHospitals.some(h => h.code === foundBranch.code)) {
            showToast('error', 'Hospital branch is already mapped');
            return;
        }

        setMappedHospitals([...mappedHospitals, {
            code: foundBranch.code || 'CODE',
            name: foundBranch.name
        }]);
        showToast('success', 'Hospital mapped successfully');
    };

    const handleRemoveHospital = (code: string) => {
        setMappedHospitals(mappedHospitals.filter(h => h.code !== code));
        showToast('success', 'Hospital removed from mapping');
    };

    // Policy Rules handler
    const handleAddRule = () => {
        const newRule: PolicyRule = {
            id: crypto.randomUUID(),
            type: ruleType,
            visitType: ruleVisitType,
            gender: ruleGender,
            ageBracket: ruleAgeBracket,
            amountLimit: ruleAmountLimit,
            quantityLimit: ruleQuantityLimit,
            className: ruleClass,
            aliasCode: `AL-${Math.floor(10 + Math.random() * 90)}`,
            aliasName: ruleType,
            tariffClass: ruleTariffClass,
            tariffValue: ruleTariffClassValue,
            dayOfService: ruleDayOfService,
            exclude: ruleExclusion,
            patientCoPay: `${rulePatientCoPay}${rulePatientCoPayIsPercent ? '%' : ` ${selectedCurrency}`}`,
            sponsorPay: `${ruleSponsorPayment}%`,
            active: ruleActive,
            groupName: ruleGroup
        };

        setRulesList([...rulesList, newRule]);
        showToast('success', 'Plan Policy Rule added successfully');
    };

    const handleRemoveRule = (id: string) => {
        setRulesList(rulesList.filter(r => r.id !== id));
        showToast('success', 'Plan Policy Rule removed');
    };

    // Patient Max Amount Config Handlers
    const handleAddMac = () => {
        const newMac: PatientMaxAmountConfig = {
            id: crypto.randomUUID(),
            className: macClassName,
            circleName: macCircleName || 'Corporate',
            branch: macBranch || 'All',
            patMaxAmt: macPatMaxAmt,
            minimumAmt: macMinimumAmt,
            addOnType: macAddOnType,
            approvalLimit: macMaxApprovalLimit,
            groupName: 'SERVICE_GROUPS',
            visitType: macVisitType,
            active: macActive
        };

        setMacList([...macList, newMac]);
        showToast('success', 'Patient Max Amount Config added');
    };

    const handleRemoveMac = (id: string) => {
        setMacList(macList.filter(m => m.id !== id));
        showToast('success', 'Config removed');
    };

    // Form handlers
    const handleCreateNew = () => {
        setPolicyNo(`${Math.floor(100000000 + Math.random() * 900000000)}`);
        setPolicyName('');
        setActive(true);
        setRestricted(false);
        setSponsorType('TPA');
        setSponsorId(organizations[0]?.id || '');
        setInsuranceId(organizations[0]?.id || '');
        setServiceTax('VAT 15 PERCENT');
        setStartDate('2026-01-24T12:00');
        setEndDate('2027-01-23T12:00');
        setSponsorPayTax(true);
        setIsSponsorPrice(true);
        setPatientAmt(0.0);
        setIsAutoCorporatePlanCreate(false);
        setMappedHospitals([]);
        setRulesList([]);
        setMacList([]);
        setRuleGroup('All');
        setSelectedPolicyId(null);
        setSubTab('policy');
        setIsCreateMode(true);
    };

    const handleEdit = (policy: PolicyItem) => {
        setSelectedPolicyId(policy.id);
        setPolicyNo(policy.policyNo);
        setPolicyName(policy.policyName);
        setActive(policy.active);
        setRestricted(policy.restricted);
        setSponsorType(policy.sponsorType);
        setSponsorId(policy.sponsorId);
        setInsuranceId(policy.insuranceId);
        setServiceTax(policy.serviceTax);
        setStartDate(policy.startDate);
        setEndDate(policy.endDate);
        setSponsorPayTax(policy.sponsorPayTax);
        setIsSponsorPrice(policy.isSponsorPrice);
        setPatientAmt(policy.patientAmt);
        setIsAutoCorporatePlanCreate(policy.isAutoCorporatePlanCreate);
        setMappedHospitals(policy.hospitals || []);
        setRulesList(policy.rules || []);
        setMacList(policy.maxAmountConfigs || []);
        setRuleGroup('All');
        setSubTab('policy');
        setIsCreateMode(true);
    };

    const handleDeletePolicy = async (id: string) => {
        if (confirm('Are you sure you want to delete this policy definition?')) {
            if (isDbConnected) {
                const supabase = getSupabase();
                try {
                    const { error } = await supabase
                        .from('insurance_policies')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    showToast('success', 'Policy deleted successfully from Supabase!');
                } catch (err: any) {
                    console.error("Failed to delete policy from database:", err);
                    showToast('error', `Failed to delete from database: ${err.message}`);
                }
            }
            const filtered = policies.filter(p => p.id !== id);
            savePolicies(filtered);
            showToast('success', 'Policy deleted successfully');
        }
    };

    const handleSavePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!policyName.trim()) {
            showToast('error', 'Policy Name is required');
            return;
        }

        const policyId = selectedPolicyId || crypto.randomUUID();

        const policyData: PolicyItem = {
            id: policyId,
            policyNo,
            policyName,
            active,
            restricted,
            sponsorType,
            sponsorId,
            insuranceId,
            serviceTax,
            startDate,
            endDate,
            sponsorPayTax,
            isSponsorPrice,
            patientAmt,
            isAutoCorporatePlanCreate,
            hospitals: mappedHospitals,
            rules: rulesList,
            maxAmountConfigs: macList
        };

        // --- DATABASE SYNC ---
        if (isDbConnected) {
            const supabase = getSupabase();
            try {
                // 1. Upsert base Insurance Policy
                const dbPolicy = {
                    id: policyId,
                    policy_no: policyNo,
                    policy_name: policyName,
                    active,
                    restricted,
                    sponsor_type: sponsorType,
                    sponsor_id: sponsorId || null,
                    insurance_id: insuranceId || null,
                    service_tax: serviceTax,
                    start_date: startDate,
                    end_date: endDate,
                    sponsor_pay_tax: sponsorPayTax,
                    is_sponsor_price: isSponsorPrice,
                    patient_amt: patientAmt
                };

                const { error: ipError } = await supabase
                    .from('insurance_policies')
                    .upsert(dbPolicy);

                if (ipError) throw ipError;

                // 2. Clear old mapping, rules, and max amounts first to ensure full sync
                await supabase.from('policy_mapped_branches').delete().eq('policy_id', policyId);
                await supabase.from('policy_rules').delete().eq('policy_id', policyId);
                await supabase.from('policy_patient_max_amounts').delete().eq('policy_id', policyId);

                // 3. Insert mapped branches/hospitals
                if (mappedHospitals.length > 0) {
                    const dbBranches = mappedHospitals.map(h => ({
                        policy_id: policyId,
                        branch_code: h.code,
                        branch_name: h.name
                    }));
                    const { error: brError } = await supabase
                        .from('policy_mapped_branches')
                        .insert(dbBranches);
                    if (brError) throw brError;
                }

                // 4. Insert rules
                if (rulesList.length > 0) {
                    const dbRules = rulesList.map(r => ({
                        id: r.id.startsWith('rule-') && r.id.length < 15 ? crypto.randomUUID() : r.id, // Ensure valid UUID
                        policy_id: policyId,
                        rule_type: r.type,
                        visit_type: r.visitType,
                        gender: r.gender,
                        class_name: r.className || 'SERVICE_GROUPS',
                        tariff_class: r.tariffClass || 'A+',
                        tariff_value: r.tariffValue || '',
                        amount_limit: r.amountLimit,
                        quantity_limit: r.quantityLimit,
                        patient_copay: r.patientCoPay,
                        sponsor_payment: r.sponsorPay,
                        patient_deductible: '0',
                        patient_deductible_type: 'Amt',
                        alias_code: r.aliasCode || null,
                        alias_name: r.aliasName || null,
                        approval_required: true,
                        exclude: !!r.exclude,
                        active: !!r.active,
                        group_name: r.groupName || 'All'
                    }));

                    const { error: ruError } = await supabase
                        .from('policy_rules')
                        .insert(dbRules);
                    if (ruError) throw ruError;
                }

                // 5. Insert max amount configurations
                if (macList.length > 0) {
                    const dbMacs = macList.map(m => ({
                        id: m.id.startsWith('mac-') && m.id.length < 15 ? crypto.randomUUID() : m.id, // Ensure valid UUID
                        policy_id: policyId,
                        class_name: m.className,
                        circle_name: m.circleName || 'Corporate',
                        branch_code: m.branch || 'All',
                        pat_max_amt: m.patMaxAmt,
                        minimum_amt: m.minimumAmt,
                        approval_limit: m.approvalLimit,
                        visit_type: m.visitType || 'OP',
                        active: !!m.active
                    }));

                    const { error: macError } = await supabase
                        .from('policy_patient_max_amounts')
                        .insert(dbMacs);
                    if (macError) throw macError;
                }

                showToast('success', 'Policy and rules saved successfully to Supabase!');
            } catch (dbErr: any) {
                console.error("Database Save Error:", dbErr);
                showToast('error', `Failed to save to Database: ${dbErr.message}`);
            }
        }

        let updated: PolicyItem[];
        if (selectedPolicyId) {
            updated = policies.map(p => p.id === selectedPolicyId ? policyData : p);
            showToast('success', 'Policy updated successfully');
        } else {
            updated = [...policies, policyData];
            showToast('success', 'Policy created successfully');
        }

        savePolicies(updated);
        setIsCreateMode(false);
    };

    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            return p.policyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   p.policyNo.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [policies, searchQuery]);

    return (
        <div className="flex flex-col h-full gap-5">
            {/* Header Area */}
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        Policy Definition
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">Configure insurance networks, copay structures, hospital mapping, and class benefit tiers</p>
                </div>
                {!isCreateMode ? (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs"
                    >
                        <Plus className="w-4 h-4" /> Define New Plan
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsCreateMode(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
                    >
                        <X className="w-4 h-4" /> Back to List
                    </button>
                )}
            </div>

            {!isCreateMode ? (
                /* LIST VIEW OF ALL PLANS */
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search plans by name or policy number..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {filteredPolicies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <ShieldCheck className="w-12 h-12 text-slate-300 mb-2" />
                                <p className="font-bold text-slate-500 text-xs">No active plan policies found</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Policy No</th>
                                        <th className="px-6 py-4">Policy Name</th>
                                        <th className="px-6 py-4">Sponsor Type</th>
                                        <th className="px-6 py-4">Start / End Date</th>
                                        <th className="px-6 py-4">Hospitals</th>
                                        <th className="px-6 py-4">Rules count</th>
                                        <th className="px-6 py-4">Active</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                                    {filteredPolicies.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-blue-600">{p.policyNo}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{p.policyName}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{p.sponsorType}</span></td>
                                            <td className="px-6 py-4 text-[10px] text-slate-500">
                                                <div>{p.startDate.replace('T', ' ')}</div>
                                                <div className="font-bold text-slate-400">to {p.endDate.replace('T', ' ')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-[11px]">
                                                {p.hospitals?.length > 0 ? (
                                                    <span className="text-green-600 font-bold">{p.hospitals.length} Mapped</span>
                                                ) : <span className="text-slate-400">None</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{p.rules?.length || 0} rules</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${p.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {p.active ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(p)} className="px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded hover:bg-blue-100">Edit</button>
                                                    <button onClick={() => handleDeletePolicy(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : (
                /* TABBED CREATION & RULE EDITING MODE */
                <div className="flex flex-col gap-4">
                    {/* Nested Tabs Bar */}
                    <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2">
                        <button 
                            type="button"
                            onClick={() => setSubTab('policy')}
                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${subTab === 'policy' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Policy Details
                        </button>
                        <button 
                            type="button"
                            onClick={() => setSubTab('policyRule')}
                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${subTab === 'policyRule' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Policy Rules & Tiers
                        </button>
                    </div>

                    {/* SUB-TAB 1: POLICY DETAILS */}
                    {subTab === 'policy' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
                                    <Layers className="w-4 h-4 text-blue-500" />
                                    Policy Base Parameters
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Policy Number <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={policyNo} 
                                            onChange={(e) => setPolicyNo(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Policy Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={policyName} 
                                            onChange={(e) => setPolicyName(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Enter full policy package name"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-4 items-center pt-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-slate-300 text-blue-600 h-4 w-4" />
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} className="rounded border-slate-300 text-blue-600 h-4 w-4" />
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Restricted</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Sponsor Type <span className="text-red-500">*</span></label>
                                        <select value={sponsorType} onChange={(e) => setSponsorType(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="TPA">TPA</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Insurance">Insurance</option>
                                            <option value="Self">Self</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Sponsor <span className="text-red-500">*</span></label>
                                        <select value={sponsorId} onChange={(e) => setSponsorId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="">--Select Sponsor--</option>
                                            {organizations.map(o => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Insurance Company <span className="text-red-500">*</span></label>
                                        <select value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="">--Select Insurance--</option>
                                            {organizations.map(o => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Service Tax <span className="text-red-500">*</span></label>
                                        <select value={serviceTax} onChange={(e) => setServiceTax(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="VAT 15 PERCENT">VAT 15 PERCENT</option>
                                            <option value="VAT 5 PERCENT">VAT 5 PERCENT</option>
                                            <option value="NO VAT">NO VAT</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Start Date <span className="text-red-500">*</span></label>
                                        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">End Date <span className="text-red-500">*</span></label>
                                        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                    </div>
                                    <div className="flex gap-4 items-center pt-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={sponsorPayTax} onChange={(e) => setSponsorPayTax(e.target.checked)} className="rounded border-slate-300 text-blue-600 h-4 w-4" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Sponsor Pay Tax</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isSponsorPrice} onChange={(e) => setIsSponsorPrice(e.target.checked)} className="rounded border-slate-300 text-blue-600 h-4 w-4" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Is Sponsor Price</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Patient Amt</label>
                                        <input type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"} value={patientAmt} onChange={(e) => setPatientAmt(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* HOSPITAL MAPPING BLOCK */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    Mapped Hospitals / Branches
                                </h3>
                                <div className="flex gap-3 items-end max-w-xl">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Select Hospital Branch</label>
                                        <select 
                                            value={selectedHospitalToAdd} 
                                            onChange={(e) => setSelectedHospitalToAdd(e.target.value)} 
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        >
                                            <option value="">--Select Hospital--</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleAddHospital}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-50 active:scale-95 transition-all"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add Branch
                                    </button>
                                </div>

                                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-2">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                                <th className="px-6 py-2.5">Code</th>
                                                <th className="px-6 py-2.5">Branch / Hospital Name</th>
                                                <th className="px-6 py-2.5 text-right">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                            {mappedHospitals.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-6 text-center text-slate-400 font-medium">No hospital branches mapped yet. Select above to map.</td>
                                                </tr>
                                            ) : (
                                                mappedHospitals.map(h => (
                                                    <tr key={h.code} className="hover:bg-slate-50/40">
                                                        <td className="px-6 py-3 text-blue-600">{h.code}</td>
                                                        <td className="px-6 py-3 font-semibold text-slate-800">{h.name}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleRemoveHospital(h.code)}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB 2: POLICY RULES & CONDITIONS */}
                    {subTab === 'policyRule' && (
                        <div className="flex flex-col gap-4">
                            {/* POLICY RULES CRITERIA PANEL */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
                                    <Settings className="w-4 h-4 text-blue-500" />
                                    Define Rule Conditions & Copay Actions
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/40">
                                    <div className="md:col-span-4 border-b border-slate-200 pb-1 mb-1">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Conditions Matrix</span>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Type <span className="text-red-500">*</span></label>
                                        <select value={ruleType} onChange={(e) => { setRuleType(e.target.value); setRuleGroup('All'); }} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                            <option value="SERVICES">SERVICES</option>
                                            <option value="DRUGS">DRUGS</option>
                                            <option value="CONSUMABLES">CONSUMABLES</option>
                                            <option value="ALL">ALL</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Visit Type</label>
                                        <select value={ruleVisitType} onChange={(e) => setRuleVisitType(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                            <option value="OP">OP (Outpatient)</option>
                                            <option value="IP">IP (Inpatient)</option>
                                            <option value="ER">ER (Emergency)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                                        <select value={ruleGender} onChange={(e) => setRuleGender(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                            <option value="All">All</option>
                                            <option value="Male">Male Only</option>
                                            <option value="Female">Female Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Class <span className="text-red-500">*</span></label>
                                        <input type="text" value={ruleClass} onChange={(e) => setRuleClass(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" placeholder="SERVICE_GROUPS" />
                                    </div>

                                    {ruleType === 'SERVICES' && (
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 font-semibold text-blue-600">Service Group</label>
                                            <select value={ruleGroup} onChange={(e) => setRuleGroup(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                                                <option value="All">All Groups</option>
                                                {serviceGroups.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {ruleType === 'DRUGS' && (
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 font-semibold text-emerald-600">Drug Group</label>
                                            <select value={ruleGroup} onChange={(e) => setRuleGroup(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                                                <option value="All">All Groups</option>
                                                {drugGroups.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tariff Class</label>
                                        <select value={ruleTariffClass} onChange={(e) => setRuleTariffClass(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                            <option value="A+">A+</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tariff Class Value</label>
                                        <input type="text" value={ruleTariffClassValue} onChange={(e) => setRuleTariffClassValue(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Amount Limit ({selectedCurrency})</label>
                                        <input type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"} value={ruleAmountLimit} onChange={(e) => setRuleAmountLimit(Number(e.target.value))} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Quantity Limit</label>
                                        <input type="number" value={ruleQuantityLimit} onChange={(e) => setRuleQuantityLimit(Number(e.target.value))} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 mt-1">
                                    <div className="md:col-span-4 border-b border-blue-100 pb-1 mb-1">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Coverage & Co-payment Actions</span>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Patient Co-payment <span className="text-red-500">*</span></label>
                                        <div className="flex gap-1.5 items-center">
                                            <input type="text" value={rulePatientCoPay} onChange={(e) => setRulePatientCoPay(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" placeholder="10" />
                                            <label className="flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer">
                                                <input type="checkbox" checked={rulePatientCoPayIsPercent} onChange={(e) => setRulePatientCoPayIsPercent(e.target.checked)} /> %
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Sponsor Payment (%)</label>
                                        <input type="text" value={ruleSponsorPayment} onChange={(e) => setRuleSponsorPayment(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" placeholder="90" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Patient Deductible</label>
                                        <div className="flex gap-1 items-center">
                                            <input type="text" value={rulePatientDeductible} onChange={(e) => setRulePatientDeductible(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" placeholder="0" />
                                            <select value={rulePatientDeductibleType} onChange={(e) => setRulePatientDeductibleType(e.target.value)} className="px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold">
                                                <option value="Amt">Amt</option>
                                                <option value="%">%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 pt-4">
                                        <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={ruleApprovalRequired} onChange={(e) => setRuleApprovalRequired(e.target.checked)} /> Approval Req
                                        </label>
                                        <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={ruleExclusion} onChange={(e) => setRuleExclusion(e.target.checked)} /> Exclude
                                        </label>
                                    </div>
                                    
                                    <div className="md:col-span-4 flex justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddRule}
                                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-50 hover:shadow-lg transition-all"
                                        >
                                            Add Rule Row
                                        </button>
                                    </div>
                                </div>

                                {/* RULES TABLE LIST */}
                                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-3">
                                    <span className="block px-4 py-2 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Configured Rules List</span>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                                                <th className="px-6 py-2">Type</th>
                                                <th className="px-6 py-2">Group</th>
                                                <th className="px-6 py-2">Visit</th>
                                                <th className="px-6 py-2">Gender</th>
                                                <th className="px-6 py-2">Class</th>
                                                <th className="px-6 py-2">Tariff Class</th>
                                                <th className="px-6 py-2">Patient Co-Pay</th>
                                                <th className="px-6 py-2">Sponsor Payment</th>
                                                <th className="px-6 py-2">Exclude</th>
                                                <th className="px-6 py-2 text-right">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-bold">
                                            {rulesList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-6 text-center text-slate-400 font-medium">No policy rules added yet. Use the card above to add.</td>
                                                </tr>
                                            ) : (
                                                rulesList.map(r => (
                                                    <tr key={r.id} className="hover:bg-slate-50/30">
                                                        <td className="px-6 py-2.5 text-blue-600">{r.type}</td>
                                                        <td className="px-6 py-2.5 text-slate-600">{r.groupName || 'All'}</td>
                                                        <td className="px-6 py-2.5"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">{r.visitType}</span></td>
                                                        <td className="px-6 py-2.5 text-slate-500">{r.gender}</td>
                                                        <td className="px-6 py-2.5">{r.className}</td>
                                                        <td className="px-6 py-2.5 text-slate-600">{r.tariffClass} ({r.tariffValue})</td>
                                                        <td className="px-6 py-2.5 text-indigo-600">{r.patientCoPay}</td>
                                                        <td className="px-6 py-2.5 text-slate-600">{r.sponsorPay}</td>
                                                        <td className="px-6 py-2.5">
                                                            {r.exclude ? <span className="text-red-500 text-[10px]">YES</span> : <span className="text-slate-400">-</span>}
                                                        </td>
                                                        <td className="px-6 py-2.5 text-right">
                                                            <button type="button" onClick={() => handleRemoveRule(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* PATIENT MAXIMUM AMOUNT CONFIGURATION PANEL */}
                            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3 mt-4">
                                <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
                                    <Percent className="w-4 h-4 text-blue-500" />
                                    Patient Maximum Amount Configuration
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Class Name <span className="text-red-500">*</span></label>
                                        <select value={macClassName} onChange={(e) => setMacClassName(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">
                                            <option value="A+">Class A+</option>
                                            <option value="A">Class A</option>
                                            <option value="B">Class B</option>
                                            <option value="C">Class C</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Circle Name</label>
                                        <input type="text" value={macCircleName} onChange={(e) => setMacCircleName(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700" placeholder="Gold Circle" />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Patient Max Amount ({selectedCurrency}) <span className="text-red-500">*</span></label>
                                        <input type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"} value={macPatMaxAmt} onChange={(e) => setMacPatMaxAmt(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Minimum Amount ({selectedCurrency})</label>
                                        <input type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"} value={macMinimumAmt} onChange={(e) => setMacMinimumAmt(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700" />
                                    </div>

                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Max Approval Limit ({selectedCurrency})</label>
                                        <input type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"} value={macMaxApprovalLimit} onChange={(e) => setMacMaxApprovalLimit(Number(e.target.value))} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Branch</label>
                                        <select value={macBranch} onChange={(e) => setMacBranch(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">
                                            <option value="">All Branches</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.code}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Visit Type</label>
                                        <select value={macVisitType} onChange={(e) => setMacVisitType(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">
                                            <option value="OP">OP Only</option>
                                            <option value="IP">IP Only</option>
                                            <option value="Both">Both (OP & IP)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-3 justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddMac}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all active:scale-95"
                                        >
                                            Add Limit Config
                                        </button>
                                    </div>
                                </div>

                                {/* MAC TABLE LIST */}
                                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-1 max-h-48 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr className="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                                <th className="px-4 py-2">Class Name</th>
                                                <th className="px-4 py-2">Circle</th>
                                                <th className="px-4 py-2">Branch</th>
                                                <th className="px-4 py-2">Pat Max Amt</th>
                                                <th className="px-4 py-2">Min Amt</th>
                                                <th className="px-4 py-2">Approval Limit</th>
                                                <th className="px-4 py-2">Visit Type</th>
                                                <th className="px-4 py-2 text-right">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                                            {macList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-4 text-center text-slate-400 font-medium">No maximum amount configurations added yet.</td>
                                                </tr>
                                            ) : (
                                                macList.map(m => (
                                                    <tr key={m.id} className="hover:bg-slate-50/30">
                                                        <td className="px-4 py-1.5 text-blue-600">{m.className}</td>
                                                        <td className="px-4 py-1.5 text-slate-600">{m.circleName}</td>
                                                        <td className="px-4 py-1.5 text-slate-500">{m.branch}</td>
                                                        <td className="px-4 py-1.5 text-slate-800">{formatCurrency(m.patMaxAmt)}</td>
                                                        <td className="px-4 py-1.5 text-slate-500">{formatCurrency(m.minimumAmt)}</td>
                                                        <td className="px-4 py-1.5 text-emerald-600">{formatCurrency(m.approvalLimit)}</td>
                                                        <td className="px-4 py-1.5"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">{m.visitType}</span></td>
                                                        <td className="px-4 py-1.5 text-right">
                                                            <button type="button" onClick={() => handleRemoveMac(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Master Submit Bar */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Info className="w-4 h-4 text-blue-500" />
                            <span>Navigate through tabs to completely define rules, networks and copays before saving.</span>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsCreateMode(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleSavePolicy}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs shadow-md shadow-blue-100"
                            >
                                Save Plan Definition
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
