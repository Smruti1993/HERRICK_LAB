import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Printer, DollarSign, FileText, Trash2, X, History, CreditCard, Package, Pill, Stethoscope, Save, ArrowLeft, MoreHorizontal, CheckSquare, Square, Loader2, Ban, AlertTriangle, ChevronDown } from 'lucide-react';
import { Bill, BillItem, Payment, ServiceDefinition } from '../types';

export const Billing = () => {
    const {
        bills, createBill, cancelBill, addPayment, patients, appointments, showToast,
        serviceDefinitions, serviceTariffs, serviceOrders, employees, departments,
        organizations, resolveNegotiatedPrice
    } = useData();


    // --- Tabs State ---
    const [activeTab, setActiveTab] = useState('Invoice List');

    // --- Invoice List View State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

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

    // --- Derived Data: Invoice List ---
    const filteredBills = bills.filter(b => {
        const p = patients.find(pat => pat.id === b.patientId);
        const nameMatch = p ? `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const statusMatch = statusFilter === 'All' || b.status === statusFilter;
        return nameMatch && statusMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    // Derived Totals
    const patientGrossAmount = billItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const calculatedDiscount = billItems.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const calculatedTax = billItems.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
    const calculatedNet = patientGrossAmount - calculatedDiscount + calculatedTax;

    // Custom round-off to nearest integer:
    const totalAmount = Math.ceil(calculatedNet);
    const roundOff = Number((totalAmount - calculatedNet).toFixed(2));

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
        item.total = Number(total.toFixed(2));

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
                total: Number(total.toFixed(2))
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

        const processedItems = billItems.map((item, idx) => ({
            id: `${Date.now()}-${idx}`,
            description: item.description || 'Service Charges',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            discountPercentage: Number(item.discountPercentage || 0),
            discountAmount: Number(item.discountAmount || 0),
            taxPercentage: Number(item.taxPercentage || 0),
            taxAmount: Number(item.taxAmount || 0),
            total: Number(item.total || 0),
            itemType: item.itemType || 'Service',
            itemId: item.itemId,
            batchNo: item.batchNo
        }));

        const finalBill: Bill = {
            id: Date.now().toString(),
            invoiceNo: invoiceNo,
            patientId: newBillPatient,
            appointmentId: linkedOrderIds[0] || undefined,
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
            doctorId: selectedDoctor || undefined,
            items: processedItems,
            payments: (paymentMode === 'Credit' || saveAsPending) ? [] : [{
                id: `${Date.now()}-pay`,
                date: new Date().toISOString(),
                amount: Number(amountReceived),
                method: (paymentMode === 'UPI' || paymentMode === 'Online') ? 'Online' : (paymentMode as any),
                reference: referenceNo
            }]
        };

        const success = await createBill(finalBill, linkedOrderIds);
        setIsSaving(false);

        if (success) {
            handleCloseModal();
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setLinkedOrderIds([]);
        setNewBillPatient('');
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
        setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '0');
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
            setAmountError(`Amount cannot exceed $${remaining.toFixed(2)}`);
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
            showToast('error', `Amount exceeds remaining balance of $${remaining.toFixed(2)}`);
            return;
        }

        const payment: Payment = {
            id: Date.now().toString(),
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

    const handlePrint = (bill: Bill) => {
        const patient = patients.find(p => p.id === bill.patientId);
        const printWindow = window.open('', '_blank');
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
                  <div class="info-row"><span class="info-label">MRN :</span><span class="info-value">${patient?.id?.toUpperCase() || 'ALH0000030173'}</span><span class="info-arabic">: رقم السجل الطبي</span></div>
                  <div class="info-row"><span class="info-label">Patient Name:</span><span class="info-value">${patient?.firstName || ''} ${patient?.lastName || ''}</span><span class="info-arabic">: اسم المريض</span></div>
                  <div class="info-row"><span class="info-label">Nationality:</span><span class="info-value">BAHRAINI</span><span class="info-arabic">: جنسية</span></div>
                  <div class="info-row"><span class="info-label">Identification No:</span><span class="info-value">0000000000</span><span class="info-arabic">: رقم الهوية / الاقامة</span></div>
                  <div class="info-row"><span class="info-label">Visit No:</span><span class="info-value">OP-001</span><span class="info-arabic">: عدد الزيارات</span></div>
                  <div class="info-row"><span class="info-label">Age/Sex:</span><span class="info-value">14Yrs/${patient?.gender?.toUpperCase() || 'MALE'}</span><span class="info-arabic">: العمر / الجنس</span></div>
              </div>
              <div class="info-card">
                  <div class="info-row"><span class="info-label">Bill No:</span><span class="info-value">${bill.invoiceNo || 'INV-O-ALH-' + bill.id}</span><span class="info-arabic">: رقم الفاتورة</span></div>
                  <div class="info-row"><span class="info-label">Bill Date:</span><span class="info-value">${new Date(bill.date).toLocaleString()}</span><span class="info-arabic">: تاريخ الفاتورة</span></div>
                  <div class="info-row"><span class="info-label">Consultant :</span><span class="info-value">Dr Hebtulla Hajrs</span><span class="info-arabic">: الطبيب المعالج</span></div>
                  <div class="info-row"><span class="info-label">Insurance Name :</span><span class="info-value">CASH</span><span class="info-value">VATNO-</span></div>
                  <div class="info-row"><span class="info-label">City :</span><span class="info-value"></span><span class="info-value">Postal Code-</span></div>
                  <div class="info-row"><span class="info-label">Policy No :</span><span class="info-value">C001</span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Policy Name :</span><span class="info-value">Cash Plan</span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Membership No.:</span><span class="info-value"></span><span class="info-arabic"></span></div>
                  <div class="info-row"><span class="info-label">Address:</span><span class="info-value">Dammam</span><span class="info-arabic"></span></div>
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
                    <td>${item.total.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>0.00</td>
                </tr>
                `).join('')}
                <tr class="group-row" style="font-weight: 700;">
                    <td colspan="3" class="text-left">Sub Total:</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
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
              <div class="summary-row"><div class="summary-label"><span>اجمالي القيمة</span><span>Gross Total :</span></div><div class="summary-value">${bill.totalAmount.toFixed(2)}</div></div>
              <div class="summary-row"><div class="summary-label"><span>الخصم</span><span>Discount :</span></div><div class="summary-value">0.00</div></div>
              <div class="summary-row"><div class="summary-label"><span>ضريبة شركة التأمين</span><span>VAT :</span></div><div class="summary-value">0.00</div></div>
              <div class="summary-row"><div class="summary-label"><span>الاجمالي بعد الخصم بالضريبة</span><span>Total Amount including VAT :</span></div><div class="summary-value">${bill.totalAmount.toFixed(2)}</div></div>
              <div class="summary-row"><div class="summary-label"><span>التحمل المدفوع نقدا</span><span>Patient Net Amount :</span></div><div class="summary-value">${bill.totalAmount.toFixed(2)}</div></div>
              <div class="summary-row"><div class="summary-label"><span></span><span>Patient Collected Amount :</span></div><div class="summary-value">${(bill.paidAmount || bill.totalAmount).toFixed(2)}</div></div>
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

    return (
        <div className="space-y-4">

            {/* Top Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {['Invoice List', 'Pending Invoice List', 'Credit Memo'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-t border-x rounded-t-lg transition-colors relative top-[1px] ${activeTab === tab
                                ? 'bg-white border-slate-200 text-slate-800 border-b-transparent'
                                : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'Invoice List' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Billing & Invoices</h2>
                            <p className="text-slate-500 text-sm">Manage patient invoices and payments</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors w-fit"
                        >
                            <Plus className="w-4 h-4" /> New Invoice
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/50">
                            <div className="relative max-w-xs flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Search patient..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                className="bg-white border border-slate-300 text-slate-600 text-sm rounded-lg px-3 py-2 outline-none"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Unpaid">Unpaid</option>
                                <option value="Partial">Partial</option>
                                <option value="Paid">Paid</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Invoice ID</th>
                                        <th className="px-6 py-3 font-semibold">Date</th>
                                        <th className="px-6 py-3 font-semibold">Patient</th>
                                        <th className="px-6 py-3 font-semibold">Amount</th>
                                        <th className="px-6 py-3 font-semibold">Paid</th>
                                        <th className="px-6 py-3 font-semibold">Status</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredBills.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                No invoices found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBills.map(bill => {
                                            const patient = patients.find(p => p.id === bill.patientId);
                                            return (
                                                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{bill.invoiceNo || `#${bill.id.slice(-6)}`}</td>
                                                    <td className="px-6 py-4">{new Date(bill.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-900">{patient?.firstName} {patient?.lastName}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-900">${bill.totalAmount.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-green-600">${bill.paidAmount.toFixed(2)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                                                bill.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                                                                    bill.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 line-through' :
                                                                        'bg-red-100 text-red-800'
                                                            }`}>
                                                            {bill.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {bill.status !== 'Cancelled' && (
                                                                <button
                                                                    onClick={() => openPaymentModal(bill)}
                                                                    className={`p-2 rounded-lg transition-colors ${bill.status === 'Paid'
                                                                            ? 'text-slate-500 hover:bg-slate-100'
                                                                            : 'text-blue-600 hover:bg-blue-50'
                                                                        }`}
                                                                    title={bill.status === 'Paid' ? "View Payment History" : "Record Payment"}
                                                                >
                                                                    {bill.status === 'Paid' ? <History className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                                                </button>
                                                            )}

                                                            {bill.status !== 'Cancelled' && (
                                                                <button
                                                                    onClick={() => setBillToCancel(bill.id)}
                                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Cancel Invoice"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handlePrint(bill)}
                                                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title="Print Invoice"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Pending Invoice List' && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 animate-in fade-in duration-300">
                    {/* Filters */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-2">
                                <span>MR No:</span>
                                <input
                                    className="border border-slate-300 rounded px-2 py-1 w-24 outline-none focus:border-blue-500 bg-white"
                                    value={pendingFilters.mrNo}
                                    onChange={e => setPendingFilters({ ...pendingFilters, mrNo: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span>From Date:</span>
                                <input
                                    type="date"
                                    className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                                    value={pendingFilters.fromDate}
                                    onChange={e => setPendingFilters({ ...pendingFilters, fromDate: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span>To Date:</span>
                                <input
                                    type="date"
                                    className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                                    value={pendingFilters.toDate}
                                    onChange={e => setPendingFilters({ ...pendingFilters, toDate: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Visit Type:</span>
                                <select
                                    className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white w-28"
                                    value={pendingFilters.visitType}
                                    onChange={e => setPendingFilters({ ...pendingFilters, visitType: e.target.value })}
                                >
                                    <option value="">-- Select --</option>
                                    <option value="New Visit">New Visit</option>
                                    <option value="Follow-up">Follow-up</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Consultant:</span>
                                <div className="relative">
                                    <input
                                        className="border border-slate-300 rounded px-2 py-1 pr-7 w-32 outline-none focus:border-blue-500 bg-white"
                                        value={pendingFilters.consultant}
                                        onChange={e => setPendingFilters({ ...pendingFilters, consultant: e.target.value })}
                                    />
                                    <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Department:</span>
                                <div className="relative">
                                    <input
                                        className="border border-slate-300 rounded px-2 py-1 pr-7 w-32 outline-none focus:border-blue-500 bg-white"
                                        value={pendingFilters.department}
                                        onChange={e => setPendingFilters({ ...pendingFilters, department: e.target.value })}
                                    />
                                    <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded shadow-sm">Search</button>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded shadow-sm font-bold">Excel</button>
                            <button
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded shadow-sm font-bold flex items-center gap-1"
                                onClick={() => setShowCreateModal(true)}
                            >
                                New <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px] border-t border-slate-200">
                        <div className="bg-gradient-to-b from-blue-400 to-blue-500 text-white text-xs font-bold px-4 py-2 border-b border-blue-600 flex items-center gap-2">
                            <span>Pending Invoice</span>
                        </div>
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                                <tr>
                                    <th className="p-2 border-r border-slate-200">MRNO</th>
                                    <th className="p-2 border-r border-slate-200">Encounter Date</th>
                                    <th className="p-2 border-r border-slate-200">Visit No</th>
                                    <th className="p-2 border-r border-slate-200">Consultant</th>
                                    <th className="p-2 border-r border-slate-200">Department</th>
                                    <th className="p-2 border-r border-slate-200">Service Approval</th>
                                    <th className="p-2 border-r border-slate-200">Sponsor</th>
                                    <th className="p-2 border-r border-slate-200">Order No</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-slate-400 italic">No pending orders found.</td>
                                    </tr>
                                ) : (
                                    pendingInvoices.map((order, idx) => {
                                        const apt = appointments.find(a => a.id === order.appointmentId);
                                        const patient = patients.find(p => p.id === apt?.patientId);
                                        const doctor = employees.find(e => e.id === order.orderingDoctorId);
                                        const dept = departments.find(d => d.id === (doctor?.departmentId || apt?.departmentId));

                                        return (
                                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="p-2 border-r border-slate-200 font-medium">{patient?.id.slice(-8).toUpperCase()}</td>
                                                <td className="p-2 border-r border-slate-200">{new Date(order.orderDate).toLocaleString()}</td>
                                                <td className="p-2 border-r border-slate-200 text-slate-500">{apt?.id.slice(-6)}</td>
                                                <td className="p-2 border-r border-slate-200">Dr. {doctor?.lastName || '-'}</td>
                                                <td className="p-2 border-r border-slate-200">{dept?.name || '-'}</td>
                                                <td className="p-2 border-r border-slate-200 text-green-600 font-bold">Approved</td>
                                                <td className="p-2 border-r border-slate-200">Self Pay</td>
                                                <td className="p-2 border-r border-slate-200 font-mono">{order.id.slice(-8)}</td>
                                                <td className="p-2">
                                                    <button
                                                        className="text-blue-600 hover:underline font-bold"
                                                        onClick={() => {
                                                            setNewBillPatient(patient?.id || '');
                                                            setLinkedOrderIds([order.id]); // Link this specific order
                                                            setBillItems([{
                                                                description: order.serviceName,
                                                                quantity: order.quantity,
                                                                unitPrice: order.unitPrice,
                                                                total: order.totalPrice
                                                            }]);
                                                            setShowCreateModal(true);
                                                        }}
                                                    >
                                                        Invoice
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

            {/* REDESIGNED PREMIUM NEW INVOICE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 overflow-y-auto animate-in fade-in duration-200">

                    {/* TOP HEADER SECTION */}
                    <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    New Invoice
                                </h2>
                                <div className="flex gap-2 text-xs font-semibold text-slate-400 mt-0.5">
                                    <span>OP Billing</span> • <span>Create New Receipt</span>
                                </div>
                            </div>
                        </div>

                        {/* CENTER PATIENT SEARCH BAR */}
                        <div className="relative max-w-lg w-full mx-8">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                                <input
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-full text-sm outline-none transition-all shadow-inner placeholder:text-slate-400"
                                    placeholder="Search patient by name, UHID or phone..."
                                    value={patientSearch}
                                    onFocus={() => setShowPatientList(true)}
                                    onChange={e => {
                                        setPatientSearch(e.target.value);
                                        setShowPatientList(true);
                                    }}
                                />
                            </div>

                            {showPatientList && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-64 overflow-y-auto">
                                    <div className="p-2 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-t-xl">
                                        Patient Results
                                    </div>
                                    {patients.filter(p =>
                                        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                        p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                        p.phone.includes(patientSearch)
                                    ).length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-400 italic">No patients found.</div>
                                    ) : (
                                        patients.filter(p =>
                                            `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                            p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                            p.phone.includes(patientSearch)
                                        ).map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setNewBillPatient(p.id);
                                                    setPatientSearch(`${p.firstName} ${p.lastName}`);
                                                    setShowPatientList(false);
                                                }}
                                                className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <div className="font-semibold text-slate-800">{p.firstName} {p.lastName}</div>
                                                <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                                                    <span>UHID: UHID-{p.id.slice(-6).toUpperCase()}</span>
                                                    <span>{p.phone}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RIGHT AVATAR / NOTIFICATIONS */}
                        <div className="flex items-center gap-4">
                            <div className="relative cursor-pointer p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">3</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <img
                                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
                                    alt="Admin"
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                                <div className="hidden md:block">
                                    <div className="text-xs font-bold text-slate-700">Admin</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">OPD Admin</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA: TWO COLUMN GRID */}
                    <div className="flex-1 max-w-[1500px] w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* LEFT COLUMN: Patient Info & Items Grid */}
                        <div className="lg:col-span-2 space-y-6 flex flex-col">

                            {/* 1. PATIENT INFORMATION CARD */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">Patient Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    {/* Left Avatar + Core Info */}
                                    <div className="md:col-span-4 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shrink-0 shadow-sm text-slate-400">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            {newBillPatient ? (
                                                (() => {
                                                    const p = patients.find(pat => pat.id === newBillPatient);
                                                    if (!p) return null;
                                                    const birthYear = new Date(p.dob).getFullYear();
                                                    const age = new Date().getFullYear() - birthYear;
                                                    return (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-extrabold text-slate-800 truncate text-base">{p.firstName} {p.lastName}</span>
                                                                <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">OPD</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1 font-mono">
                                                                <div>UHID: UHID-{p.id.slice(-6).toUpperCase()}</div>
                                                                <div>{p.gender}, {age} Y</div>
                                                                <div className="text-slate-400">{p.phone}</div>
                                                            </div>
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <div className="text-slate-400 text-sm italic font-medium">Select a patient using the top search bar to load details.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Forms Fields */}
                                    <div className="md:col-span-8 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Visit/Encounter No.</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all"
                                                value={encounterNo}
                                                onChange={e => setEncounterNo(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Visit Date</label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all"
                                                value={visitDate}
                                                onChange={e => setVisitDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Doctor</label>
                                            <select
                                                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                                                value={selectedDoctor}
                                                onChange={e => setSelectedDoctor(e.target.value)}
                                            >
                                                <option value="">Select Doctor</option>
                                                {employees.filter(e => e.role === 'Doctor').map(doc => (
                                                    <option key={doc.id} value={doc.id}>Dr. {doc.firstName} {doc.lastName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Department</label>
                                            <select
                                                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                                                value={selectedDept}
                                                onChange={e => setSelectedDept(e.target.value)}
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. ITEMS / SERVICES SELECTION CARD */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[400px]">
                                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Items / Services</h3>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => addItem('Service', 'Consultation Fee', 30)}
                                            className="flex items-center gap-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Service
                                        </button>
                                        <button
                                            onClick={() => addItem('Lab Test', 'CBC (Complete Blood Count)', 120)}
                                            className="flex items-center gap-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Lab Test
                                        </button>
                                        <button
                                            onClick={() => addItem('Medicine', 'Paracetamol 650mg', 2)}
                                            className="flex items-center gap-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Medicine
                                        </button>
                                        <button className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors shadow-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Item Grid Table */}
                                <div className="flex-1 overflow-x-auto min-h-0">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 w-10 text-center">#</th>
                                                <th className="p-3 w-28">Type</th>
                                                <th className="p-3">Item / Service</th>
                                                <th className="p-3 w-20 text-center">Qty</th>
                                                <th className="p-3 w-28 text-right">Unit Price</th>
                                                <th className="p-3 w-24 text-center">Discount (%)</th>
                                                <th className="p-3 w-24 text-center">Tax (%)</th>
                                                <th className="p-3 w-28 text-right">Amount</th>
                                                <th className="p-3 w-12 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {billItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                                                        No items added yet. Click "+ Add" buttons to start.
                                                    </td>
                                                </tr>
                                            ) : (
                                                billItems.map((item, idx) => {
                                                    const isMedicine = item.itemType === 'Medicine';
                                                    const isLab = item.itemType === 'Lab Test';
                                                    const badgeColor = isMedicine
                                                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                        : (isLab ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100');

                                                    const showSuggestions = activeRowIndex === idx && item.description.length > 0;
                                                    const suggestions = showSuggestions ? serviceDefinitions.filter(s =>
                                                        s.name.toLowerCase().includes(item.description.toLowerCase()) ||
                                                        s.code.toLowerCase().includes(item.description.toLowerCase())
                                                    ).slice(0, 10) : [];

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-3 text-center text-xs font-bold text-slate-400 font-mono">{idx + 1}</td>
                                                            <td className="p-3">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeColor}`}>
                                                                    {item.itemType || 'Service'}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 relative">
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white outline-none border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-100 rounded-lg px-2 py-1 font-semibold text-slate-700 text-xs"
                                                                    value={item.description}
                                                                    placeholder="Type to search service..."
                                                                    onFocus={() => setActiveRowIndex(idx)}
                                                                    onBlur={() => setTimeout(() => setActiveRowIndex(null), 200)}
                                                                    onChange={e => {
                                                                        updateItem(idx, 'description', e.target.value);
                                                                        setActiveRowIndex(idx);
                                                                    }}
                                                                />
                                                                {suggestions.length > 0 && (
                                                                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-60 overflow-y-auto mt-1">
                                                                        {suggestions.map(s => (
                                                                            <div
                                                                                key={s.id}
                                                                                onClick={() => selectService(idx, s)}
                                                                                className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                                            >
                                                                                <div className="font-bold text-slate-800">{s.name}</div>
                                                                                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                                                                    <span className="font-mono bg-slate-100 px-1 rounded">{s.code}</span>
                                                                                    <span className="font-extrabold text-blue-600">${getServicePrice(s.id).toFixed(2)}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white outline-none border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-100 rounded-lg px-1 py-1 text-center font-bold text-slate-700 text-xs"
                                                                    value={item.quantity}
                                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">$</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="w-full pl-5 pr-1 bg-transparent hover:bg-slate-100/50 focus:bg-white outline-none border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-100 rounded-lg py-1 text-right font-mono font-bold text-slate-700 text-xs"
                                                                        value={item.unitPrice}
                                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white outline-none border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-100 rounded-lg px-1 py-1 text-center font-mono font-bold text-slate-700 text-xs"
                                                                    value={item.discountPercentage || 0}
                                                                    onChange={e => updateItem(idx, 'discountPercentage', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    className="w-full bg-transparent hover:bg-slate-100/50 focus:bg-white outline-none border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-100 rounded-lg px-1 py-1 text-center font-mono font-bold text-slate-700 text-xs"
                                                                    value={item.taxPercentage || 0}
                                                                    onChange={e => updateItem(idx, 'taxPercentage', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-extrabold text-slate-800 text-xs">
                                                                ${(item.total || 0).toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => removeItem(idx)}
                                                                    className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Table Buttons */}
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
                                    <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold transition-colors">
                                        <Plus className="w-4 h-4" /> Add Note
                                    </button>

                                    {billItems.length > 0 && (
                                        <button
                                            onClick={() => setBillItems([])}
                                            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-bold transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" /> Clear All Items
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Invoice Details & Summary Card */}
                        <div className="space-y-6">

                            {/* 1. INVOICE DETAILS */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">Invoice Details</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Invoice No.</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none pr-8 cursor-not-allowed font-mono"
                                                value={invoiceNo}
                                                readOnly
                                            />
                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Invoice Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                                            value={invoiceDate}
                                            onChange={e => setInvoiceDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. INVOICE SUMMARY */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Invoice Summary</h3>

                                <div className="space-y-3 font-semibold text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Sub Total</span>
                                        <span className="text-slate-700 font-mono">${patientGrossAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-500">
                                        <span>Discount</span>
                                        <span className="font-mono">(${calculatedDiscount.toFixed(2)})</span>
                                    </div>
                                    <div className="flex justify-between text-slate-700">
                                        <span>Tax</span>
                                        <span className="font-mono">${calculatedTax.toFixed(2)}</span>
                                    </div>

                                    <hr className="border-slate-100" />

                                    <div className="flex justify-between text-slate-800 text-sm font-bold">
                                        <span>Net Amount</span>
                                        <span className="font-mono text-slate-900">${calculatedNet.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-400">
                                        <span>Round Off</span>
                                        <span className="font-mono">${roundOff.toFixed(2)}</span>
                                    </div>

                                    <hr className="border-slate-200" />

                                    <div className="flex justify-between items-center text-blue-600 text-base font-extrabold">
                                        <span>Total Amount</span>
                                        <span className="font-mono font-black text-lg">${totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. PAYMENT DETAILS */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Payment Details</h3>

                                <div className="space-y-4">
                                    {/* Payment Mode Selection */}
                                    <div>
                                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Payment Mode *</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Cash', 'Card', 'UPI', 'Insurance', 'Credit'].map(mode => (
                                                <label
                                                    key={mode}
                                                    className={`flex items-center justify-center gap-1.5 border rounded-xl py-2 px-1 text-xs font-bold cursor-pointer transition-all ${paymentMode === mode
                                                            ? 'bg-blue-50 border-blue-500 text-blue-600'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="payment_mode"
                                                        className="hidden"
                                                        checked={paymentMode === mode}
                                                        onChange={() => setPaymentMode(mode)}
                                                    />
                                                    <span>{mode}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {paymentMode !== 'Credit' && (
                                        <>
                                            <div>
                                                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Amount Received *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all font-mono"
                                                        value={amountReceived}
                                                        onChange={e => setAmountReceived(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Reference No.</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter reference number (optional)"
                                                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                                                    value={referenceNo}
                                                    onChange={e => setReferenceNo(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
                                        <textarea
                                            placeholder="Enter notes (optional)"
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 h-16 resize-none"
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                    </div>

                                    {/* Balance Amount Strip */}
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex justify-between items-center text-xs font-extrabold">
                                        <span>Balance Amount</span>
                                        <span className="font-mono text-sm">${balanceAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER BAR (FULL WIDTH ACTION BLOCK) */}
                    <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-30 shadow-md">
                        <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                checked={saveAsPending}
                                onChange={e => setSaveAsPending(e.target.checked)}
                            />
                            <span>Save as Pending Invoice</span>
                        </label>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                onClick={handleCloseModal}
                                className="flex-1 sm:flex-none border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors text-center"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBill}
                                disabled={isSaving || !newBillPatient}
                                className="flex-1 sm:flex-none border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Invoice
                            </button>
                            <button
                                onClick={async () => {
                                    // Perform standard create and then trigger printing!
                                    const originalSuccess = await handleCreateBill();
                                }}
                                disabled={isSaving || !newBillPatient}
                                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                Save Invoice & Print
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
                        <p className="text-sm text-slate-500 mb-4">Invoice #{selectedBill.id.slice(-6)} • Total: ${selectedBill.totalAmount.toFixed(2)}</p>

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
                                            <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">+${p.amount.toFixed(2)}</span>
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
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number" step="0.01"
                                            className={`form-input pl-8 font-medium ${amountError ? 'border-red-500 focus:ring-red-200' : ''}`}
                                            value={paymentAmount}
                                            onChange={handleAmountChange}
                                        />
                                    </div>
                                    {amountError ? (
                                        <p className="text-xs text-red-500 mt-1 font-medium">{amountError}</p>
                                    ) : (
                                        <p className="text-xs text-slate-500 mt-1">Remaining Balance: ${(selectedBill.totalAmount - selectedBill.paidAmount).toFixed(2)}</p>
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

        </div>
    );
};
