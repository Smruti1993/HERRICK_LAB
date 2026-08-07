import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, getCurrencySymbol } from '../context/DataContext';
import { Pagination } from '../components/Pagination';
import { Plus, Search, Printer, DollarSign, FileText, Trash2, X, History, CreditCard, Package, Pill, Stethoscope, Save, ArrowLeft, MoreHorizontal, CheckSquare, Square, Loader2, Ban, AlertTriangle, ChevronDown } from 'lucide-react';
import { Bill, BillItem, Payment, ServiceDefinition } from '../types';
// ── New modular billing components ─────────────────────────────────────────
import { InvoiceList } from '../components/billing/InvoiceList';
import { PendingInvoiceList } from '../components/billing/PendingInvoiceList';
import { InvoiceDetail } from '../components/billing/InvoiceDetail';
import { CreditMemoForm } from '../components/billing/CreditMemoForm';
import { RefundScreen } from '../components/billing/RefundScreen';
import { CashierReconciliation } from '../components/billing/CashierReconciliation';

export const Billing = () => {
    const navigate = useNavigate();
    const {
        bills, createBill, cancelBill, addPayment, patients, appointments, showToast,
        serviceDefinitions, serviceTariffs, serviceOrders, employees, departments,
        organizations, resolveNegotiatedPrice, formatCurrency, selectedCurrency
    } = useData();

    const decimals = selectedCurrency === 'BHD' ? 3 : 2;


    // --- Tabs State ---
    const [activeTab, setActiveTab] = useState('Invoice List');

    // --- New component modal state ---
    const [detailBill, setDetailBill] = useState<Bill | null>(null);
    const [creditMemoBill, setCreditMemoBill] = useState<Bill | null>(null);
    const [refundBill, setRefundBill] = useState<Bill | null>(null);

    // Handler: bill order from PendingInvoiceList → open create page pre-filled
    const handleBillOrders = (orderIds: string[], patientId: string, appointmentId?: string) => {
        navigate(`/finance/billing/new?patientId=${patientId}&orderIds=${orderIds.join(',')}&appointmentId=${appointmentId || ''}`);
    };


    // --- Invoice List View State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingPage, setPendingPage] = useState(1);
    const itemsPerPage = 10;

    // --- Pending Invoice List State ---
    const [pendingFilters, setPendingFilters] = useState({
        mrNo: '',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        visitType: '',
        consultant: '',
        department: ''
    });

    // --- Create Bill Modal State ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [linkedOrderIds, setLinkedOrderIds] = useState<string[]>([]);

    // Header / Config State
    const [newBillPatient, setNewBillPatient] = useState('');
    const [newBillAppointmentId, setNewBillAppointmentId] = useState('');
    const [ignoreSponsor, setIgnoreSponsor] = useState(false);
    const [selectedCarePlan, setSelectedCarePlan] = useState('');
    const [encounterType, setEncounterType] = useState('Outpatient');
    const [encounterStartType, setEncounterStartType] = useState('New Visit');
    const [invoiceRemarks, setInvoiceRemarks] = useState('');

    // New invoice state properties for redesigned view
    const [invoiceNo, setInvoiceNo] = useState(() => 'INV-2026-' + Math.floor(10000 + Math.random() * 90000));
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [encounterNo, setEncounterNo] = useState(() => 'ENC-2026-' + Math.floor(100000 + Math.random() * 900000));
    const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [amountReceived, setAmountReceived] = useState('0');
    const [referenceNo, setReferenceNo] = useState('');
    const [notes, setNotes] = useState('');
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientList, setShowPatientList] = useState(false);
    const [saveAsPending, setSaveAsPending] = useState(false);

    // Items State
    const [billItems, setBillItems] = useState<Omit<BillItem, 'id'>[]>([
        { description: 'Consultation Fee', quantity: 1, unitPrice: 30, discountPercentage: 0, discountAmount: 0, taxPercentage: 0, taxAmount: 0, total: 30, itemType: 'Service' }
    ]);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

    // Summary State (Mocked mostly as we build the UI)
    const [deposits] = useState(0);
    const [collectedAmount] = useState(0);

    // --- Payment Modal State ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [amountError, setAmountError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentRef, setPaymentRef] = useState('');

    // --- Cancel Modal State ---
    const [billToCancel, setBillToCancel] = useState<string | null>(null);

    // --- Derived Data: Invoice List (Invoices & Receipts) ---
    const filteredBills = React.useMemo(() => {
        const rows: any[] = [];
        
        bills.forEach(bill => {
            const p = patients.find(pat => pat.id === bill.patientId);
            const patientName = bill.patientName || (p ? `${p.firstName} ${p.lastName}` : 'Walk-in Patient');
            
            // 1. Add Invoice Row
            rows.push({
                keyId: `${bill.id}-inv`,
                id: bill.id,
                invoiceNo: bill.invoiceNo || `#${bill.id.slice(-6)}`,
                date: bill.date,
                patientName,
                totalAmount: bill.totalAmount,
                paidAmount: bill.paidAmount,
                status: bill.status,
                isReceipt: false,
                parentBill: bill
            });
            
            // 2. Add Receipt Row for each payment
            if (bill.payments) {
                bill.payments.forEach(pay => {
                    rows.push({
                        keyId: `${pay.id}-rcp`,
                        id: pay.id,
                        invoiceNo: `RCP-${pay.id.slice(-8).toUpperCase()}`,
                        date: pay.date,
                        patientName,
                        totalAmount: pay.amount,
                        paidAmount: pay.amount,
                        status: 'Receipt',
                        isReceipt: true,
                        parentBill: bill,
                        payment: pay
                    });
                });
            }
        });
        
        // Filter and Sort
        return rows.filter(row => {
            const nameMatch = row.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             row.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
            
            let statusMatch = false;
            if (statusFilter === 'All') {
                statusMatch = true;
            } else if (statusFilter === 'Receipt') {
                statusMatch = row.isReceipt;
            } else {
                statusMatch = !row.isReceipt && row.status === statusFilter;
            }
            
            return nameMatch && statusMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bills, patients, searchTerm, statusFilter]);

    const paginatedBills = filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- Derived Data: Pending Invoices ---
    const pendingInvoices = serviceOrders.filter(order => {
        if (order.billingStatus !== 'Pending' || order.status === 'Cancelled') return false;

        const apt = appointments.find(a => a.id === order.appointmentId);
        const patient = patients.find(p => p.id === apt?.patientId);
        const doctor = employees.find(e => e.id === order.orderingDoctorId);
        const dept = departments.find(d => d.id === (doctor?.departmentId || apt?.departmentId));

        // Filters
        if (pendingFilters.mrNo && !patient?.id.includes(pendingFilters.mrNo)) return false;
        if (pendingFilters.consultant && !doctor?.lastName.toLowerCase().includes(pendingFilters.consultant.toLowerCase())) return false;
        if (pendingFilters.department && !dept?.name.toLowerCase().includes(pendingFilters.department.toLowerCase())) return false;

        const oDate = order.orderDate.split('T')[0];
        if (oDate < pendingFilters.fromDate || oDate > pendingFilters.toDate) return false;

        return true;
    });

    const paginatedPendingInvoices = pendingInvoices.slice((pendingPage - 1) * itemsPerPage, pendingPage * itemsPerPage);

    // Derived Totals
    const patientGrossAmount = billItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const calculatedDiscount = billItems.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const calculatedTax = billItems.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
    const calculatedNet = patientGrossAmount - calculatedDiscount + calculatedTax;

    // Custom round-off to nearest integer:
    const totalAmount = Math.ceil(calculatedNet);
    const roundOff = Number((totalAmount - calculatedNet).toFixed(decimals));

    // Balance calculation
    const balanceAmount = Math.max(0, totalAmount - (paymentMode === 'Credit' ? 0 : Number(amountReceived || 0)));
    const invoiceBalance = balanceAmount;

    // Sync Amount Received with Total Amount when it changes
    React.useEffect(() => {
        if (showCreateModal && paymentMode !== 'Credit') {
            setAmountReceived(totalAmount.toString());
        }
    }, [totalAmount, paymentMode, showCreateModal]);

    // --- Handlers: Create Bill ---

    const updateItem = (index: number, field: keyof Omit<BillItem, 'id'>, value: any) => {
        const newItems = [...billItems];
        const item = { ...newItems[index], [field]: value };

        const qty = Number(field === 'quantity' ? value : item.quantity || 0);
        const price = Number(field === 'unitPrice' ? value : item.unitPrice || 0);
        const discPercent = Number(field === 'discountPercentage' ? value : item.discountPercentage || 0);
        const taxPercent = Number(field === 'taxPercentage' ? value : item.taxPercentage || 0);

        const baseSub = qty * price;
        const discAmount = baseSub * (discPercent / 100);
        const subAfterDisc = baseSub - discAmount;
        const taxAmount = subAfterDisc * (taxPercent / 100);
        const total = subAfterDisc + taxAmount;

        item.discountAmount = discAmount;
        item.taxAmount = taxAmount;
        item.total = Number(total.toFixed(decimals));

        newItems[index] = item;
        setBillItems(newItems);
    };

    const addItem = (type: 'Service' | 'Lab Test' | 'Medicine' = 'Service', description: string = '', price: number = 0) => {
        setBillItems([
            ...billItems,
            {
                description,
                quantity: 1,
                unitPrice: price,
                discountPercentage: 0,
                discountAmount: 0,
                taxPercentage: type === 'Medicine' ? 12 : 0,
                taxAmount: 0,
                total: price,
                itemType: type
            }
        ]);
    };

    const removeItem = (index: number) => {
        if (billItems.length > 0) {
            setBillItems(billItems.filter((_, i) => i !== index));
            setSelectedItems(selectedItems.filter(i => i !== index).map(i => i > index ? i - 1 : i));
        }
    };

    const toggleItemSelection = (index: number) => {
        if (selectedItems.includes(index)) {
            setSelectedItems(selectedItems.filter(i => i !== index));
        } else {
            setSelectedItems([...selectedItems, index]);
        }
    };

    const toggleAllSelection = () => {
        if (selectedItems.length === billItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(billItems.map((_, i) => i));
        }
    };

    // --- Service Search Logic ---
    const getServicePrice = (serviceId: string) => {
        const service = serviceDefinitions.find(s => s.id === serviceId);
        const serviceCode = service ? service.code : serviceId;
        const sponsorId = selectedCarePlan && selectedCarePlan !== 'Self Pay' ? selectedCarePlan : null;
        return resolveNegotiatedPrice(sponsorId, 'SERVICES', serviceCode, 'A+');
    };

    const selectService = (index: number, service: ServiceDefinition) => {
        const price = getServicePrice(service.id);
        setBillItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };

            const qty = Number(item.quantity || 1);
            const discPercent = Number(item.discountPercentage || 0);
            const taxPercent = Number(item.taxPercentage || 0);

            const baseSub = qty * price;
            const discAmount = baseSub * (discPercent / 100);
            const subAfterDisc = baseSub - discAmount;
            const taxAmount = subAfterDisc * (taxPercent / 100);
            const total = subAfterDisc + taxAmount;

            newItems[index] = {
                ...item,
                description: service.name,
                unitPrice: price,
                discountAmount: discAmount,
                taxAmount: taxAmount,
                total: Number(total.toFixed(decimals))
            };
            return newItems;
        });
        setActiveRowIndex(null);
    };

    const handleCreateBill = async () => {
        if (!newBillPatient) {
            showToast('error', 'Please select a patient first.');
            return;
        }

        setIsSaving(true);

        try {
            const processedItems = billItems.map((item) => {
                // Resolve itemId for lab test items by matching service definitions
                let resolvedItemId = item.itemId;
                if (!resolvedItemId && (item.itemType === 'Lab Test' || item.itemType === 'Laboratory')) {
                    const matchedService = serviceDefinitions.find(
                        s => s.name.toLowerCase() === (item.description || '').toLowerCase()
                    );
                    if (matchedService) resolvedItemId = matchedService.id;
                }
                return {
                    id: crypto.randomUUID(),
                    description: item.description || 'Service Charges',
                    quantity: Number(item.quantity || 1),
                    unitPrice: Number(item.unitPrice || 0),
                    discountPercentage: Number(item.discountPercentage || 0),
                    discountAmount: Number(item.discountAmount || 0),
                    taxPercentage: Number(item.taxPercentage || 0),
                    taxAmount: Number(item.taxAmount || 0),
                    total: Number(item.total || 0),
                    itemType: item.itemType || 'Service',
                    itemId: resolvedItemId,
                    batchNo: item.batchNo
                };
            });

            const finalBill: Bill = {
                id: crypto.randomUUID(),
                invoiceNo: invoiceNo,
                patientId: newBillPatient,
                appointmentId: newBillAppointmentId || undefined,
                date: new Date(invoiceDate).toISOString(),
                status: saveAsPending ? 'Unpaid' : (paymentMode === 'Credit' ? 'Unpaid' : (Number(amountReceived) >= totalAmount ? 'Paid' : 'Partial')),
                totalAmount: totalAmount,
                paidAmount: paymentMode === 'Credit' ? 0 : Number(amountReceived),
                discountAmount: calculatedDiscount,
                taxAmount: calculatedTax,
                roundOff: roundOff,
                paymentMode: paymentMode,
                amountReceived: paymentMode === 'Credit' ? 0 : Number(amountReceived),
                referenceNo: paymentMode === 'Credit' ? '' : referenceNo,
                notes: notes,
                departmentId: selectedDept || undefined,
                departmentName: selectedDept ? (departments.find(d => d.id === selectedDept)?.name || undefined) : undefined,
                doctorId: selectedDoctor || undefined,
                items: processedItems,
                payments: (paymentMode === 'Credit' || saveAsPending) ? [] : [{
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    amount: Number(amountReceived),
                    method: (paymentMode === 'UPI' || paymentMode === 'Online') ? 'Online' : (paymentMode as any),
                    reference: referenceNo
                }]
            };

            const success = await createBill(finalBill, linkedOrderIds);
            if (success) {
                handleCloseModal();
                return finalBill;
            }
            return null;
        } catch (err: any) {
            console.error("Invoice creation error:", err);
            showToast('error', 'Error creating invoice: ' + err.message);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setLinkedOrderIds([]);
        setNewBillPatient('');
        setNewBillAppointmentId('');
        setBillItems([{ description: 'Consultation Fee', quantity: 1, unitPrice: 30, discountPercentage: 0, discountAmount: 0, taxPercentage: 0, taxAmount: 0, total: 30, itemType: 'Service' }]);
        setSelectedDoctor('');
        setSelectedDept('');
        setPaymentMode('Cash');
        setAmountReceived('0');
        setReferenceNo('');
        setNotes('');
        setPatientSearch('');
        setSaveAsPending(false);
    };

    // --- Handlers: Payment ---

    const openPaymentModal = (bill: Bill) => {
        setSelectedBill(bill);
        const remaining = bill.totalAmount - bill.paidAmount;
        setPaymentAmount(remaining > 0 ? remaining.toFixed(decimals) : '0');
        setAmountError('');
        setShowPaymentModal(true);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPaymentAmount(val);

        if (!selectedBill) return;
        if (!val) {
            setAmountError('');
            return;
        }

        const amount = parseFloat(val);
        const remaining = selectedBill.totalAmount - selectedBill.paidAmount;

        if (isNaN(amount) || amount <= 0) {
            setAmountError('Enter a valid positive amount');
        } else if (amount > remaining + 0.01) { // 0.01 buffer for float issues
            setAmountError(`Amount cannot exceed ${formatCurrency(remaining)}`);
        } else {
            setAmountError('');
        }
    };

    const handleRecordPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBill || !paymentAmount || amountError) return;

        const amount = parseFloat(paymentAmount);
        const remaining = selectedBill.totalAmount - selectedBill.paidAmount;

        if (isNaN(amount) || amount <= 0) {
            showToast('error', 'Please enter a valid payment amount.');
            return;
        }

        if (amount > remaining + 0.01) {
            showToast('error', `Amount exceeds remaining balance of ${formatCurrency(remaining)}`);
            return;
        }

        const payment: Payment = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: amount,
            method: paymentMethod as any,
            reference: paymentRef
        };

        addPayment(payment, selectedBill.id);
        setShowPaymentModal(false);
        setSelectedBill(null);
        setPaymentRef('');
        setAmountError('');
    };

    // --- Handlers: Print ---

    const handlePrint = (bill: Bill, preOpenedWindow?: Window | null) => {
        const patient = patients.find(p => p.id === bill.patientId);
        const apt = appointments.find(a => a.id === bill.appointmentId);
        const doctorId = bill.doctorId || apt?.doctorId;
        const doctor = doctorId ? employees.find(e => e.id === doctorId) : undefined;
        const consultantName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '';
        const patientAge = patient?.dob ? (new Date().getFullYear() - new Date(patient.dob).getFullYear()) : '';
        const mrnFormatted = patient ? patient.id.slice(-8).toUpperCase() : '';
        const visitNo = apt ? `OPD-${apt.id.slice(-6).toUpperCase()}` : (bill.appointmentId ? `OPD-${bill.appointmentId.slice(-6).toUpperCase()}` : '-');
        const printWindow = preOpenedWindow || window.open('', '_blank');
        if (!printWindow) return;

        const html = `
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
          <title>Invoice #${bill.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            body { 
                font-family: 'Inter', 'Tajawal', sans-serif; 
                padding: 10px; 
                color: #3b42cc; 
                max-width: 1000px; 
                margin: 0 auto; 
                font-size: 13px;
            }
            .border-box { border: 1px solid #a0a8e0; border-collapse: collapse; }
            .header-info { display: flex; width: 100%; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
            .info-card { 
                flex: 1; 
                border: 1px solid #a0a8e0; 
                padding: 10px 15px; 
            }
            .info-row { display: flex; justify-content: space-between; padding: 2px 0; font-weight: 500;}
            .info-label { width: 140px; }
            .info-value { flex: 1; }
            .info-arabic { width: 140px; text-align: right; }
            
            table { width: 100%; border-collapse: collapse; border: 1px solid #a0a8e0; margin-bottom: 20px;}
            th, td { border: 1px solid #a0a8e0; padding: 6px 4px; text-align: center; }
            th { font-weight: 600; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            
            .summary-box { float: right; width: 400px; margin-top: 10px;}
            .summary-row { display: flex; justify-content: flex-end; padding: 4px 0; font-weight: 600; gap: 20px; text-align: right;}
            .summary-label { flex: 1; display: flex; justify-content: flex-end; gap: 20px;}
            .summary-value { width: 100px; text-align: center; }
            
            .group-row { background-color: #f8fafc; text-align: left; font-weight: bold; }
            .remarks { margin-top: 250px; text-align: center; font-weight: bold; font-size: 15px; }

            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header-info">
              <div class="info-card">
                  <div class="info-row"><span class="info-label">MRN :</span><span class="info-value">${mrnFormatted || '-'}</span><span class="info-arabic">: رقم السجل الطبي</span></div>
                  <div class="info-row"><span class="info-label">Patient Name:</span><span class="info-value">${patient ? `${patient.firstName} ${patient.lastName}` : (bill.patientName || '-')}</span><span class="info-arabic">: اسم المريض</span></div>
                  <div class="info-row"><span class="info-label">Nationality:</span><span class="info-value">-</span><span class="info-arabic">: جنسية</span></div>
                  <div class="info-row"><span class="info-label">Identification No:</span><span class="info-value">${patient?.nationalId || '-'}</span><span class="info-arabic">: رقم الهوية / الاقامة</span></div>
                  <div class="info-row"><span class="info-label">Visit No:</span><span class="info-value">${visitNo}</span><span class="info-arabic">: عدد الزيارات</span></div>
                  <div class="info-row"><span class="info-label">Age/Sex:</span><span class="info-value">${patientAge ? `${patientAge}Yrs` : '-'}/${patient?.gender?.toUpperCase() || '-'}</span><span class="info-arabic">: العمر / الجنس</span></div>
              </div>
              <div class="info-card">
                  <div class="info-row"><span class="info-label">Bill No:</span><span class="info-value">${bill.invoiceNo || 'INV-O-ALH-' + bill.id}</span><span class="info-arabic">: رقم الفاتورة</span></div>
                  <div class="info-row"><span class="info-label">Bill Date:</span><span class="info-value">${new Date(bill.date).toLocaleString()}</span><span class="info-arabic">: تاريخ الفاتورة</span></div>
                  <div class="info-row"><span class="info-label">Consultant :</span><span class="info-value">${consultantName || '-'}</span><span class="info-arabic">: الطبيب المعالج</span></div>
                  <div class="info-row"><span class="info-label">Insurance Name :</span><span class="info-value">${patient?.sponsorName || 'CASH'}</span><span class="info-value"></span></div>
                  <div class="info-row"><span class="info-label">City :</span><span class="info-value"></span><span class="info-value"></span></div>
                  <div class="info-row"><span class="info-label">Policy No :</span><span class="info-value">${patient?.policyNo || '-'}</span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Policy Name :</span><span class="info-value">${patient?.sponsorName ? patient.sponsorName + ' Plan' : '-'}</span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Card No.:</span><span class="info-value">${patient?.cardNo || '-'}</span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Address:</span><span class="info-value">${patient?.address || '-'}</span><span class="info-arabic"></span></div>
              </div>
          </div>
          
          <table>
            <thead>
                <tr>
                    <th class="text-left">Particulars<br/>وصف الخدمات الطبية</th>
                    <th>CPT / Tooth<br/>No<br/>كود الخدمة/رقم السن</th>
                    <th>Qty<br/>العدد</th>
                    <th>Gross<br/>Amt<br/>اجمالي القيمة</th>
                    <th>Discount<br/>Amt<br/>الخصم</th>
                    <th>Sub<br/>Total<br/>الاجمالي بعد<br/>الخصم</th>
                    <th>Deduct.<br/>Amount<br/>قيمة التحمل</th>
                    <th>Net Amount<br/>صافي القيمة</th>
                    <th>Patient<br/>VAT<br/>ضريبة المراجع</th>
                    <th>Company<br/>Vat<br/>ضريبة شركة<br/>التأمين</th>
                    <th>Deduct<br/>With<br/>Patient VAT<br/>قيمة التحمل<br/>بالضريبة</th>
                    <th>Net Amt<br/>With<br/>Company<br/>VAT<br/>الصافي بالضريبة</th>
                </tr>
            </thead>
            <tbody>
                <tr class="group-row"><td colspan="12">GP</td></tr>
                ${bill.items.map(item => `
                <tr>
                    <td class="text-left">${item.description}</td>
                    <td>ALH-5888/0</td>
                    <td>${item.quantity}</td>
                    <td>${item.total.toFixed(decimals)}</td>
                    <td>0.00</td>
                    <td>${item.total.toFixed(decimals)}</td>
                    <td>${item.total.toFixed(decimals)}</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>${item.total.toFixed(decimals)}</td>
                    <td>0.00</td>
                </tr>
                `).join('')}
                <tr class="group-row" style="font-weight: 700;">
                    <td colspan="3" class="text-left">Sub Total:</td>
                    <td>${bill.totalAmount.toFixed(decimals)}</td>
                    <td>0.00</td>
                    <td>${bill.totalAmount.toFixed(decimals)}</td>
                    <td>${bill.totalAmount.toFixed(decimals)}</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>${bill.totalAmount.toFixed(decimals)}</td>
                    <td>0.00</td>
                </tr>
                <tr class="group-row"><td colspan="12">Others</td></tr>
                <tr>
                    <td class="text-left">Payment - 10%</td>
                    <td>ALH-103/0</td>
                    <td>1</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                </tr>
                <tr class="group-row" style="font-weight: 700;">
                    <td colspan="3" class="text-left">Sub Total:</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                </tr>
            </tbody>
          </table>
          
          <div class="summary-box">
              <div class="summary-row"><div class="summary-label"><span>اجمالي القيمة</span><span>Gross Total :</span></div><div class="summary-value">${bill.totalAmount.toFixed(decimals)}</div></div>
              <div class="summary-row"><div class="summary-label"><span>الخصم</span><span>Discount :</span></div><div class="summary-value">0.00</div></div>
              <div class="summary-row"><div class="summary-label"><span>ضريبة شركة التأمين</span><span>VAT :</span></div><div class="summary-value">0.00</div></div>
              <div class="summary-row"><div class="summary-label"><span>الاجمالي بعد الخصم بالضريبة</span><span>Total Amount including VAT :</span></div><div class="summary-value">${bill.totalAmount.toFixed(decimals)}</div></div>
              <div class="summary-row"><div class="summary-label"><span>التحمل المدفوع نقدا</span><span>Patient Net Amount :</span></div><div class="summary-value">${bill.totalAmount.toFixed(decimals)}</div></div>
              <div class="summary-row"><div class="summary-label"><span></span><span>Patient Collected Amount :</span></div><div class="summary-value">${(bill.paidAmount || bill.totalAmount).toFixed(decimals)}</div></div>
              <div class="summary-row"><div class="summary-label"><span></span><span>Patient Balance Amount :</span></div><div class="summary-value">0.00</div></div>
              <div class="summary-row"><div class="summary-label"><span>الصافي بالضريبة</span><span>Insurance Net Amount :</span></div><div class="summary-value">0.00</div></div>
          </div>
          
          <div style="clear: both;"></div>
          <div class="remarks">Remarks:</div>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handlePrintReceipt = (bill: Bill, payment?: Payment) => {
        const patient = patients.find(p => p.id === bill.patientId);
        const mrnFormatted = patient ? patient.id.slice(-8).toUpperCase() : '';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const displayReceiptNo = payment ? `RCP-${payment.id.slice(-8).toUpperCase()}` : (bill.receiptNo || 'RCP-' + bill.id.slice(-8).toUpperCase());
        const displayReceiptDate = payment ? payment.date : bill.date;
        const displayPaymentMode = payment ? payment.method : (bill.paymentMode || 'Cash');
        const displayPaidAmount = payment ? payment.amount : (bill.paidAmount || bill.totalAmount);
        const displayRefNo = payment ? payment.reference : bill.referenceNo;

        const html = `
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
          <title>Receipt - ${displayReceiptNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            body { 
                font-family: 'Inter', 'Tajawal', sans-serif; 
                padding: 20px; 
                color: #1e293b; 
                max-width: 800px; 
                margin: 0 auto; 
                font-size: 13px;
                line-height: 1.5;
            }
            .header {
                text-align: center;
                margin-bottom: 25px;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 15px;
            }
            .header h1 {
                font-size: 22px;
                font-weight: 800;
                margin: 0;
                color: #0f172a;
            }
            .header p {
                margin: 5px 0 0;
                font-size: 14px;
                font-weight: 700;
                color: #64748b;
                letter-spacing: 2px;
            }
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 25px;
            }
            .card {
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 15px;
                background-color: #f8fafc;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px dashed #e2e8f0;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .label-group {
                display: flex;
                gap: 5px;
                color: #475569;
                font-weight: 600;
            }
            .value {
                font-weight: 700;
                color: #0f172a;
            }
            .arabic {
                color: #64748b;
                font-size: 11px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
            }
            th, td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            th {
                background-color: #f1f5f9;
                font-weight: 700;
                color: #334155;
            }
            .text-right {
                text-align: right;
            }
            .total-section {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-bottom: 40px;
                gap: 5px;
            }
            .total-row {
                display: flex;
                width: 320px;
                justify-content: space-between;
                font-size: 13px;
                font-weight: 600;
            }
            .grand-total {
                font-size: 18px;
                font-weight: 800;
                color: #1e3a8a;
                border-top: 2px solid #e2e8f0;
                padding-top: 10px;
            }
            .footer {
                margin-top: 80px;
                display: flex;
                justify-content: space-between;
                text-align: center;
            }
            .signature-line {
                width: 200px;
                border-top: 1px solid #94a3b8;
                margin-top: 50px;
                padding-top: 5px;
                font-weight: 600;
                color: #64748b;
            }
            @media print {
                body { padding: 0; }
                .card { background-color: transparent; }
            }
          </style>
        </head>
        <body>
          <div class="header">
              <h1>KIMC MEDICAL COMPLEX</h1>
              <p>PAYMENT RECEIPT / سند قبض</p>
          </div>
          
          <div class="details-grid">
              <div class="card">
                  <div class="info-row">
                      <span class="label-group"><span>Patient Name</span><span class="arabic">/ اسم المريض</span>:</span>
                      <span class="value">${bill.patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in Patient')}</span>
                  </div>
                  <div class="info-row">
                      <span class="label-group"><span>MRN</span><span class="arabic">/ الرقم الطبي</span>:</span>
                      <span class="value">${mrnFormatted || '-'}</span>
                  </div>
                  <div class="info-row">
                      <span class="label-group"><span>Phone</span><span class="arabic">/ الهاتف</span>:</span>
                      <span class="value">${patient?.phone || '-'}</span>
                  </div>
              </div>
              <div class="card">
                  <div class="info-row">
                      <span class="label-group"><span>Receipt No</span><span class="arabic">/ رقم السند</span>:</span>
                      <span class="value">${displayReceiptNo}</span>
                  </div>
                  <div class="info-row">
                      <span class="label-group"><span>Receipt Date</span><span class="arabic">/ تاريخ السند</span>:</span>
                      <span class="value">${new Date(displayReceiptDate).toLocaleString()}</span>
                  </div>
                  <div class="info-row">
                      <span class="label-group"><span>Invoice No</span><span class="arabic">/ رقم الفاتورة</span>:</span>
                      <span class="value">${bill.invoiceNo || 'INV-' + bill.id}</span>
                  </div>
                  <div class="info-row">
                      <span class="label-group"><span>Payment Mode</span><span class="arabic">/ طريقة الدفع</span>:</span>
                      <span class="value">${displayPaymentMode}</span>
                  </div>
                  ${displayRefNo ? `
                  <div class="info-row">
                      <span class="label-group"><span>Ref No</span><span class="arabic">/ رقم المرجع</span>:</span>
                      <span class="value">${displayRefNo}</span>
                  </div>` : ''}
              </div>
          </div>
          
          <table>
            <thead>
                <tr>
                    <th>Item Description / وصف الخدمة</th>
                    <th class="text-right">Qty / العدد</th>
                    <th class="text-right">Unit Price / سعر الوحدة</th>
                    <th class="text-right">Total Price / السعر الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${bill.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                    <td class="text-right">${formatCurrency(item.total)}</td>
                </tr>
                `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
              <div class="total-row">
                  <span class="label-group"><span>Total Invoice Amount</span><span class="arabic">/ اجمالي الفاتورة</span>:</span>
                  <span>${formatCurrency(bill.totalAmount)}</span>
              </div>
              <div class="total-row">
                  <span class="label-group"><span>Total Discount</span><span class="arabic">/ اجمالي الخصم</span>:</span>
                  <span>${formatCurrency(bill.discountAmount || 0)}</span>
              </div>
              <div class="total-row grand-total">
                  <span class="label-group"><span>Amount Paid</span><span class="arabic">/ المبلغ المدفوع</span>:</span>
                  <span>${formatCurrency(displayPaidAmount)}</span>
              </div>
          </div>
          
          <div class="footer">
              <div>
                  <div class="signature-line">Customer Signature / توقيع العميل</div>
              </div>
              <div>
                  <div class="signature-line">Authorized Cashier / توقيع المستلم</div>
              </div>
          </div>
          
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="space-y-4">

            {/* Top Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
                {[
                    { id: 'Invoice List', label: 'Invoices' },
                    { id: 'Pending Invoice List', label: 'Pending' },
                    { id: 'Reconciliation', label: 'Reconciliation' },
                    { id: 'Credit Memo', label: 'Credit Memo' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        id={`tab-${tab.id.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-t border-x rounded-t-lg transition-colors relative top-[1px] ${
                            activeTab === tab.id
                                ? 'bg-white border-slate-200 text-blue-700 border-b-transparent font-semibold'
                                : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── INVOICE LIST TAB (new modular component) ────────────────── */}
            {activeTab === 'Invoice List' && (
                <InvoiceList
                    onNewInvoice={() => navigate('/finance/billing/new')}
                    onViewDetail={(bill) => setDetailBill(bill)}
                    onRecordPayment={(bill) => openPaymentModal(bill)}
                    onPrint={handlePrint}
                    onPrintReceipt={handlePrintReceipt}
                    onCancel={(id) => setBillToCancel(id)}
                />
            )}
            {/* ── PENDING INVOICE LIST TAB ────────────────── */}
            {activeTab === 'Pending Invoice List' && (
                <PendingInvoiceList onBillOrder={handleBillOrders} />
            )}



            {/* ── RECONCILIATION TAB ──────────────────────── */}
            {activeTab === 'Reconciliation' && <CashierReconciliation />}


            {/* CANCEL CONFIRMATION MODAL */}
            {billToCancel && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <div className="bg-red-100 p-2 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Cancel Invoice?</h3>
                        </div>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            Are you sure you want to cancel this invoice? This action updates the status to 'Cancelled' and cannot be undone via this interface.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setBillToCancel(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors border border-slate-200"
                            >
                                Keep Invoice
                            </button>
                            <button
                                onClick={() => {
                                    if (billToCancel) {
                                        cancelBill(billToCancel);
                                        setBillToCancel(null);
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md shadow-red-100 transition-colors"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            

            {/* PAYMENT MODAL */}
            {showPaymentModal && selectedBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            {selectedBill.status === 'Paid' ? 'Payment History' : 'Record Payment'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Invoice #{selectedBill.id.slice(-6)} • Total: {formatCurrency(selectedBill.totalAmount)}</p>

                        {/* Payment History Section */}
                        <div className={`bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5 overflow-y-auto ${selectedBill.status === 'Paid' ? 'max-h-[60vh]' : 'max-h-40'}`}>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center">
                                <History className="w-3.5 h-3.5 mr-1.5" /> Payment History
                            </h4>
                            {selectedBill.payments && selectedBill.payments.length > 0 ? (
                                <div className="space-y-2">
                                    {[...selectedBill.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                                        <div key={p.id} className="flex justify-between items-start text-xs text-slate-600 p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                                            <div>
                                                <div className="font-medium text-slate-800 mb-0.5">{new Date(p.date).toLocaleDateString()}</div>
                                                <div className="text-slate-500 flex flex-wrap gap-1">
                                                    <span className="flex items-center"><CreditCard className="w-3 h-3 mr-1" />{p.method}</span>
                                                    {p.reference && <span className="text-slate-400">• Ref: {p.reference}</span>}
                                                </div>
                                            </div>
                                            <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">+{formatCurrency(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-slate-400 text-xs italic">
                                    No previous payments recorded.
                                </div>
                            )}
                        </div>

                        {/* Hide form if bill is fully paid or cancelled */}
                        {selectedBill.status !== 'Paid' && selectedBill.status !== 'Cancelled' && (
                            <form onSubmit={handleRecordPayment} className="space-y-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className="form-label">Payment Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{getCurrencySymbol(selectedCurrency)}</span>
                                        <input
                                            type="number" step={selectedCurrency === 'BHD' ? "0.001" : "0.01"}
                                            className={`form-input pl-8 font-medium ${amountError ? 'border-red-500 focus:ring-red-200' : ''}`}
                                            value={paymentAmount}
                                            onChange={handleAmountChange}
                                        />
                                    </div>
                                    {amountError ? (
                                        <p className="text-xs text-red-500 mt-1 font-medium">{amountError}</p>
                                    ) : (
                                        <p className="text-xs text-slate-500 mt-1">Remaining Balance: {formatCurrency(selectedBill.totalAmount - selectedBill.paidAmount)}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label">Payment Method</label>
                                    <select
                                        className="form-input"
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                    >
                                        <option>Cash</option>
                                        <option>Card</option>
                                        <option>Insurance</option>
                                        <option>Online</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Reference / Note (Optional)</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Transaction ID"
                                        value={paymentRef}
                                        onChange={e => setPaymentRef(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!!amountError || !paymentAmount}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-md shadow-green-200 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        Confirm Payment
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Show simple close button if form is hidden */}
                        {(selectedBill.status === 'Paid' || selectedBill.status === 'Cancelled') && (
                            <div className="border-t border-slate-100 pt-4 flex justify-end">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ── NEW MODALS FOR DETAILS, CREDIT MEMO & REFUND ── */}
            {detailBill && (
                <InvoiceDetail
                    bill={detailBill}
                    onClose={() => setDetailBill(null)}
                    onRecordPayment={(b) => {
                        setDetailBill(null);
                        openPaymentModal(b);
                    }}
                    onIssueCreditMemo={(b) => {
                        setDetailBill(null);
                        setCreditMemoBill(b);
                    }}
                    onInitiateRefund={(b) => {
                        setDetailBill(null);
                        setRefundBill(b);
                    }}
                    onPrint={handlePrint}
                    onPrintReceipt={handlePrintReceipt}
                    onCancel={(id) => {
                        setDetailBill(null);
                        setBillToCancel(id);
                    }}
                />
            )}

            {creditMemoBill && (
                <CreditMemoForm
                    bill={creditMemoBill}
                    onClose={() => setCreditMemoBill(null)}
                    onSuccess={() => {
                        setCreditMemoBill(null);
                    }}
                />
            )}

            {refundBill && (
                <RefundScreen
                    bill={refundBill}
                    onClose={() => setRefundBill(null)}
                    onSuccess={() => {
                        setRefundBill(null);
                    }}
                />
            )}

        </div>
    );
};
