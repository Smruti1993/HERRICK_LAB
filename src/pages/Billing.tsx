
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Printer, DollarSign, FileText, Trash2, X, History, CreditCard, Package, Pill, Stethoscope, Save, ArrowLeft, MoreHorizontal, CheckSquare, Square, Loader2, Ban, AlertTriangle, ChevronDown } from 'lucide-react';
import { Bill, BillItem, Payment, ServiceDefinition } from '../types';

export const Billing = () => {
  const { bills, createBill, cancelBill, addPayment, patients, appointments, showToast, serviceDefinitions, serviceTariffs, serviceOrders, employees, departments } = useData();
  
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
  
  // Items State
  const [billItems, setBillItems] = useState<Omit<BillItem, 'id'>[]>([
      { description: 'Consultation Fee', quantity: 1, unitPrice: 50, total: 50 }
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
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
  const patientGrossAmount = billItems.reduce((acc, item) => acc + item.total, 0);
  const patientNetAmount = patientGrossAmount; // Minus discounts if any
  const patientPayable = patientNetAmount;
  const invoiceBalance = patientPayable - collectedAmount;

  // --- Handlers: Create Bill ---
  
  const updateItem = (index: number, field: keyof Omit<BillItem, 'id'>, value: any) => {
      const newItems = [...billItems];
      const item = { ...newItems[index], [field]: value };
      
      // Auto calc total
      if (field === 'quantity' || field === 'unitPrice') {
          item.total = Number(item.quantity) * Number(item.unitPrice);
      }
      
      newItems[index] = item;
      setBillItems(newItems);
  };

  const addItem = (description: string = '', price: number = 0) => {
      setBillItems([...billItems, { description, quantity: 1, unitPrice: price, total: price }]);
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
      const tariff = serviceTariffs.find(t => t.serviceId === serviceId && t.status === 'Active');
      return tariff ? tariff.price : 0;
  };

  const selectService = (index: number, service: ServiceDefinition) => {
      const price = getServicePrice(service.id);
      setBillItems(prev => {
          const newItems = [...prev];
          const qty = newItems[index].quantity || 1;
          newItems[index] = { 
              ...newItems[index], 
              description: service.name, 
              unitPrice: price, 
              total: price * qty 
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

      // Recalculate totals to ensure data consistency
      const processedItems = billItems.map((item, idx) => ({
          ...item,
          id: `${Date.now()}-${idx}`,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.quantity) * Number(item.unitPrice)
      }));

      const totalAmount = processedItems.reduce((sum, item) => sum + item.total, 0);
      
      const newBill: Bill = {
          id: Date.now().toString(),
          patientId: newBillPatient,
          date: new Date().toISOString(),
          status: 'Unpaid',
          totalAmount,
          paidAmount: 0,
          items: processedItems,
          payments: []
      };

      const success = await createBill(newBill, linkedOrderIds);
      setIsSaving(false);

      if (success) {
          setShowCreateModal(false);
          // Reset
          setNewBillPatient('');
          setBillItems([{ description: 'Consultation Fee', quantity: 1, unitPrice: 50, total: 50 }]);
          setInvoiceRemarks('');
          setLinkedOrderIds([]);
      }
  };

  const handleCloseModal = () => {
      setShowCreateModal(false);
      setLinkedOrderIds([]);
      setNewBillPatient('');
      setBillItems([{ description: 'Consultation Fee', quantity: 1, unitPrice: 50, total: 50 }]);
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
                  <div class="info-row"><span class="info-label">Bill No:</span><span class="info-value">INV-O-ALH-${bill.id}</span><span class="info-arabic">: رقم الفاتورة</span></div>
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
                  className={`px-4 py-2 text-sm font-medium border-t border-x rounded-t-lg transition-colors relative top-[1px] ${
                      activeTab === tab 
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
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">#{bill.id.slice(-6)}</td>
                                            <td className="px-6 py-4">{new Date(bill.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{patient?.firstName} {patient?.lastName}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">${bill.totalAmount.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-green-600">${bill.paidAmount.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    bill.status === 'Paid' ? 'bg-green-100 text-green-800' :
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
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                bill.status === 'Paid' 
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
                            onChange={e => setPendingFilters({...pendingFilters, mrNo: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center gap-2">
                          <span>From Date:</span>
                          <input 
                            type="date" 
                            className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white" 
                            value={pendingFilters.fromDate}
                            onChange={e => setPendingFilters({...pendingFilters, fromDate: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center gap-2">
                          <span>To Date:</span>
                          <input 
                            type="date" 
                            className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                            value={pendingFilters.toDate}
                            onChange={e => setPendingFilters({...pendingFilters, toDate: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center gap-2">
                          <span>Visit Type:</span>
                          <select 
                            className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white w-28"
                            value={pendingFilters.visitType}
                            onChange={e => setPendingFilters({...pendingFilters, visitType: e.target.value})}
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
                                onChange={e => setPendingFilters({...pendingFilters, consultant: e.target.value})}
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
                                onChange={e => setPendingFilters({...pendingFilters, department: e.target.value})}
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

      {/* NEW COMPLEX CREATE INVOICE MODAL */}
      {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                  
                  {/* 1. Header & Configuration Area */}
                  <div className="bg-blue-600 text-white p-3 shrink-0 flex justify-between items-center shadow-md">
                      <div className="flex items-center gap-4 flex-1">
                          <div className="bg-white/20 p-1.5 rounded-lg">
                              <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <select 
                                className="bg-blue-700 border border-blue-500 text-white text-sm rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-white/50 w-64 font-medium"
                                value={newBillPatient}
                                onChange={e => setNewBillPatient(e.target.value)}
                              >
                                  <option value="">Select Patient</option>
                                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.phone})</option>)}
                              </select>
                              <div className="h-6 w-px bg-blue-500 hidden sm:block"></div>
                              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:bg-blue-700/50 px-2 py-1 rounded transition-colors">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-blue-400 bg-blue-700 text-white" 
                                    checked={ignoreSponsor}
                                    onChange={e => setIgnoreSponsor(e.target.checked)}
                                  />
                                  Ignore Sponsor
                              </label>
                              <div className="flex items-center gap-2">
                                  <span className="text-blue-200 text-xs font-bold uppercase">Care Plans:</span>
                                  <select 
                                    className="bg-blue-700 border border-blue-500 text-white text-xs rounded px-2 py-1.5 outline-none w-48"
                                    value={selectedCarePlan}
                                    onChange={e => setSelectedCarePlan(e.target.value)}
                                  >
                                      <option value="">Select Plan(s)</option>
                                      <option value="Self Pay">Self Pay</option>
                                      <option value="Insurance A">Insurance A</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                      <button onClick={handleCloseModal} className="text-blue-200 hover:text-white hover:bg-blue-700 p-1 rounded-full transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* 2. Toolbar Actions */}
                  <div className="bg-gradient-to-b from-slate-50 to-slate-100 p-2 border-b border-slate-300 flex flex-wrap gap-2 shrink-0 shadow-inner">
                      <button onClick={() => addItem('', 0)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all border border-blue-700">
                          <Stethoscope className="w-3.5 h-3.5" /> Add Services
                      </button>
                      <button onClick={() => addItem('Package Deal', 100)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all border border-blue-700">
                          <Package className="w-3.5 h-3.5" /> Add Packages
                      </button>
                      <button onClick={() => addItem()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all border border-blue-700">
                          <Plus className="w-3.5 h-3.5" /> Add Direct services
                      </button>
                      <button onClick={() => addItem('Paracetamol', 5)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all border border-blue-700">
                          <Pill className="w-3.5 h-3.5" /> Add Drugs
                      </button>
                      
                      <div className="h-6 w-px bg-slate-300 mx-1"></div>
                      
                      <button className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all">
                          Diagnosis
                      </button>
                      <button className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all">
                          Unbill Items
                      </button>
                      <button className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all">
                          Cancel Items
                      </button>
                  </div>

                  {/* 3. Filters & Grid Area */}
                  <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                      {/* Filter Row */}
                      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 text-xs">
                          <button 
                            onClick={toggleAllSelection} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold transition-colors"
                          >
                              Select All
                          </button>
                          
                          <div className="flex items-center gap-2 ml-auto">
                              <span className="text-slate-500 font-bold">Encounter Type :</span>
                              <select value={encounterType} onChange={e => setEncounterType(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-blue-500">
                                  <option>-- Select --</option>
                                  <option value="Outpatient">Outpatient</option>
                                  <option value="Inpatient">Inpatient</option>
                              </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-bold">Encounter Start Type :</span>
                              <select value={encounterStartType} onChange={e => setEncounterStartType(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-blue-500">
                                  <option>-- Select --</option>
                                  <option value="New Visit">New Visit</option>
                                  <option value="Follow-up">Follow-up</option>
                              </select>
                          </div>

                          <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-bold">Encounter End Type :</span>
                              <select className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:border-blue-500">
                                  <option>-- Select --</option>
                                  <option>Home</option>
                                  <option>Admit</option>
                              </select>
                          </div>
                      </div>

                      {/* Items Grid */}
                      <div className="flex-1 overflow-auto bg-white">
                          <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-600 text-xs uppercase sticky top-0 z-10 shadow-sm font-bold">
                                  <tr>
                                      <th className="p-3 border-r border-slate-200 w-10 text-center"><Square className="w-4 h-4 mx-auto" /></th>
                                      <th className="p-3 border-r border-slate-200">Description</th>
                                      <th className="p-3 border-r border-slate-200 w-24 text-center">Qty</th>
                                      <th className="p-3 border-r border-slate-200 w-32 text-right">Unit Price</th>
                                      <th className="p-3 border-r border-slate-200 w-32 text-right">Total</th>
                                      <th className="p-3 w-16 text-center">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {billItems.length === 0 ? (
                                      <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No items added. Use the toolbar to add services.</td></tr>
                                  ) : (
                                      billItems.map((item, idx) => {
                                          // Calculate search suggestions for this specific row
                                          const showSuggestions = activeRowIndex === idx && item.description.length > 0;
                                          const suggestions = showSuggestions ? serviceDefinitions.filter(s => 
                                              s.name.toLowerCase().includes(item.description.toLowerCase()) || 
                                              s.code.toLowerCase().includes(item.description.toLowerCase())
                                          ).slice(0, 10) : [];

                                          return (
                                          <tr key={idx} className={`hover:bg-blue-50 transition-colors group ${selectedItems.includes(idx) ? 'bg-blue-50' : ''}`}>
                                              <td className="p-3 border-r border-slate-200 text-center">
                                                  <button onClick={() => toggleItemSelection(idx)} className="text-slate-400 hover:text-blue-600">
                                                      {selectedItems.includes(idx) ? <CheckSquare className="w-4 h-4 mx-auto text-blue-600" /> : <Square className="w-4 h-4 mx-auto" />}
                                                  </button>
                                              </td>
                                              <td className="p-2 border-r border-slate-200 relative">
                                                  <input 
                                                      className="w-full bg-transparent outline-none border border-transparent focus:border-blue-300 rounded px-2 py-1 font-medium text-slate-700"
                                                      placeholder="Item description or search service..."
                                                      value={item.description}
                                                      onFocus={() => setActiveRowIndex(idx)}
                                                      onBlur={() => setTimeout(() => setActiveRowIndex(null), 200)}
                                                      onChange={e => {
                                                          updateItem(idx, 'description', e.target.value);
                                                          setActiveRowIndex(idx);
                                                      }}
                                                  />
                                                  {suggestions.length > 0 && (
                                                      <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-b-md z-50 max-h-60 overflow-y-auto">
                                                          {suggestions.map(s => (
                                                              <div 
                                                                  key={s.id} 
                                                                  onClick={() => selectService(idx, s)} 
                                                                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 group/item"
                                                              >
                                                                  <div className="font-medium text-slate-800 group-hover/item:text-blue-700">{s.name}</div>
                                                                  <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                                                                      <span className="font-mono bg-slate-100 px-1 rounded">{s.code}</span>
                                                                      <span className="font-bold text-green-600">${getServicePrice(s.id).toFixed(2)}</span>
                                                                  </div>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                              </td>
                                              <td className="p-2 border-r border-slate-200">
                                                  <input 
                                                      type="number" min="1"
                                                      className="w-full bg-transparent outline-none border border-transparent focus:border-blue-300 rounded px-2 py-1 text-center"
                                                      value={item.quantity}
                                                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                  />
                                              </td>
                                              <td className="p-2 border-r border-slate-200">
                                                  <input 
                                                      type="number" min="0" step="0.01"
                                                      className="w-full bg-transparent outline-none border border-transparent focus:border-blue-300 rounded px-2 py-1 text-right font-mono"
                                                      value={item.unitPrice}
                                                      onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                  />
                                              </td>
                                              <td className="p-3 border-r border-slate-200 text-right font-bold text-slate-700 font-mono">
                                                  {item.total.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-center">
                                                  <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                      <Trash2 className="w-4 h-4 mx-auto" />
                                                  </button>
                                              </td>
                                          </tr>
                                      )})
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* 4. Bottom Summary & Actions (The Complex Footer) */}
                  <div className="bg-slate-50 border-t border-slate-300 shrink-0">
                      
                      {/* Top Part of Footer: Remarks & Patient Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                          {/* Remarks */}
                          <div className="space-y-4">
                              <div className="text-xs font-bold text-slate-700">Cancellation Summary</div>
                              <div className="flex gap-4 items-start">
                                  <div className="flex-1">
                                      <label className="text-xs font-bold text-slate-500 mb-1 block">Invoice Remarks :</label>
                                      <textarea 
                                          className="w-full border border-slate-300 rounded p-2 text-xs h-16 outline-none focus:border-blue-500 resize-none bg-white"
                                          value={invoiceRemarks}
                                          onChange={e => setInvoiceRemarks(e.target.value)}
                                      ></textarea>
                                  </div>
                                  <div className="w-1/3">
                                      <label className="text-xs font-bold text-slate-500 mb-1 block flex justify-between">
                                          Remarks : <Plus className="w-3 h-3 text-green-600 cursor-pointer" />
                                      </label>
                                      <select className="w-full border border-slate-300 rounded p-1 text-xs outline-none bg-white">
                                          <option>-- Select --</option>
                                      </select>
                                  </div>
                              </div>
                          </div>

                          {/* Patient Summary Box */}
                          <div className="flex justify-end">
                              <div className="w-80 border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-white text-xs font-bold uppercase">Patient Summary</div>
                                  <div className="p-2 space-y-1 text-xs">
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                          <span className="font-bold text-slate-700">Patient Gross Amount</span>
                                          <span className="font-mono text-slate-800">{patientGrossAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                          <span className="font-bold text-slate-700">Patient Net Amount</span>
                                          <span className="font-mono text-slate-800">{patientNetAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between pt-1">
                                          <span className="font-extrabold text-slate-900">Patient Payable</span>
                                          <span className="font-mono font-bold text-slate-900">{patientPayable.toFixed(2)}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Payment Summary Strip (Blue Gradient) */}
                      <div className="bg-gradient-to-b from-blue-100 to-blue-200 border-y border-blue-300 px-4 py-2 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                          <div className="flex justify-between font-bold text-slate-700"><span>Deposits / Credits</span><span className="font-mono text-slate-900">{deposits.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-slate-700"><span>Adjusted Amount</span><span className="font-mono text-slate-900">0.00</span></div>
                          <div className="flex justify-between font-bold text-slate-700"><span>Collected Amount</span><span className="font-mono text-slate-900">{collectedAmount.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-slate-700"><span>Deposit Balance</span><span className="font-mono text-slate-900">0.00</span></div>
                          <div className="flex justify-between font-bold text-slate-700"><span>Invoice Balance</span><span className="font-mono text-slate-900">{invoiceBalance.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-red-600"><span>Doc. Suggested Amount.</span><span className="font-mono">0.00</span></div>
                      </div>

                      {/* Action Bar */}
                      <div className="bg-slate-100 p-3 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-4">
                              <button className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1.5 rounded text-xs font-bold border border-slate-400 shadow-sm transition-colors">
                                  Adjust Receipt
                              </button>
                              <span className="text-xs text-slate-500 italic">No Advance available for the Patient</span>
                          </div>

                          <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                  Apply Off Duty : <input type="checkbox" className="rounded" />
                              </label>
                              
                              <button 
                                  onClick={handleCreateBill} 
                                  disabled={isSaving}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-1.5 rounded text-xs font-bold shadow-md transition-colors flex items-center gap-1"
                              >
                                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 
                                  {isSaving ? 'Saving...' : 'Save And Approve'}
                              </button>
                              
                              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold shadow-md transition-colors">
                                  Export
                              </button>
                              
                              <button onClick={handleCloseModal} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold shadow-md transition-colors flex items-center gap-1">
                                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                              </button>
                              
                              <div className="relative group">
                                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold shadow-md transition-colors flex items-center gap-1">
                                      Print <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          </div>
                      </div>
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
                             {[...selectedBill.payments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
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
