import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData, getCurrencySymbol } from '../context/DataContext';
import { 
  Plus, Search, Printer, Trash2, X, ArrowLeft, Loader2, 
  ChevronRight, AlertCircle, Calendar, User, Stethoscope, 
  Building2, DollarSign, Check, Info, AlertTriangle, ShieldAlert,
  CreditCard
} from 'lucide-react';
import { Bill, BillItem, Payment, ServiceDefinition, Patient } from '../types';
import { calculateItem, calculateSummary } from '../utils/billingCalculations';

export const NewInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const {
    patients, employees, departments, serviceDefinitions, serviceTariffs, createBill, 
    formatCurrency, selectedCurrency, addPatient, serviceOrders, showToast,
    bills
  } = useData();

  const decimals = selectedCurrency === 'BHD' ? 3 : 2;

  // --- Search Parameters Pre-fill ---
  const patientIdParam = searchParams.get('patientId') || '';
  const appointmentIdParam = searchParams.get('appointmentId') || '';
  const orderIdsParam = searchParams.get('orderIds') || '';

  // --- State Variables ---
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState<boolean>(false);
  const [outstandingDues, setOutstandingDues] = useState<number>(0);
  const [loadingDues, setLoadingDues] = useState<boolean>(false);

  // Encounter & Visit Info
  const [encounterNo, setEncounterNo] = useState<string>('');
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Billing Items
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [activeRowSuggestions, setActiveRowSuggestions] = useState<number | null>(null);
  
  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [selectedModalItems, setSelectedModalItems] = useState<Array<ServiceDefinition & { quantity: number }>>([]);

  // Payments & Split Payment Mode
  const [splitPayment, setSplitPayment] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [amountReceived, setAmountReceived] = useState<string>('0');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [splitPaymentsList, setSplitPaymentsList] = useState<Array<{ id: string; method: string; amount: number; reference: string }>>([
    { id: crypto.randomUUID(), method: 'Cash', amount: 0, reference: '' }
  ]);

  // Walk-in Patient Modal
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [newPatientForm, setNewPatientForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    email: '',
    address: ''
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- Refs ---
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // --- Setup & Next Invoice Number ---
  useEffect(() => {
    const fetchNextInvoiceNumber = () => {
      // Direct count simulation for demo / collision avoid
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      setInvoiceNo(`INV-2026-${randomNum}`);
    };
    fetchNextInvoiceNumber();
  }, []);

  // --- Pre-fill Patient from query parameter ---
  useEffect(() => {
    if (patientIdParam && patients.length > 0) {
      const p = patients.find(pat => pat.id === patientIdParam);
      if (p) {
        setSelectedPatientId(p.id);
        setPatientSearch(`${p.firstName} ${p.lastName}`);
      }
    }
  }, [patientIdParam, patients]);

  // --- Pre-fill Encounter/Orders from query parameter ---
  useEffect(() => {
    if (orderIdsParam && serviceOrders.length > 0) {
      const ids = orderIdsParam.split(',');
      const matched = serviceOrders.filter(o => ids.includes(o.id));
      if (matched.length > 0) {
        const items: BillItem[] = matched.map(o => {
          const baseSub = o.quantity * o.unitPrice;
          const svc = serviceDefinitions.find(s => s.id === o.serviceId);
          return {
            id: crypto.randomUUID(),
            itemId: o.serviceId,
            description: o.serviceName,
            quantity: o.quantity,
            unitPrice: o.unitPrice,
            discountPercentage: 0,
            discountAmount: 0,
            taxPercentage: 0,
            taxAmount: 0,
            total: baseSub,
            itemType: svc?.serviceType || 'Service'
          };
        });
        setBillItems(items);

        // Pre-fill doctor and department from first order
        const first = matched[0];
        if (first.orderingDoctorId) {
          setSelectedDoctor(first.orderingDoctorId);
          const doc = employees.find(e => e.id === first.orderingDoctorId);
          if (doc && doc.departmentId) {
            setSelectedDept(doc.departmentId);
          }
        }
        if (first.serviceCenter && !selectedDept) {
          setSelectedDept(first.serviceCenter);
        }
      }
    }
    if (appointmentIdParam) {
      setEncounterNo(`ENC-${appointmentIdParam.slice(-6).toUpperCase()}`);
    }
  }, [orderIdsParam, appointmentIdParam, serviceOrders, employees]);

  // --- Outstanding Dues Calculation ---
  useEffect(() => {
    if (!selectedPatientId) {
      setOutstandingDues(0);
      return;
    }
    // Summing outstanding dues from state/DataContext context
    // outstanding dues = totalAmount - paidAmount for Unpaid/Partial invoices
    const dues = patients.find(p => p.id === selectedPatientId) ? 450 : 0; // Simulated fallback if needed
    // In real execution, we filter the bills list:
    const activeDues = bills
      .filter(b => b.patientId === selectedPatientId && b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (Number(b.totalAmount) - Number(b.paidAmount)), 0);
    setOutstandingDues(activeDues);
  }, [selectedPatientId, bills]);

  // Close Patient Suggestion Dropdown on Outer Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target as Node)) {
        setShowPatientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unsaved changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedPatientId || billItems.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedPatientId, billItems]);

  // --- Calculation Helpers ---
  const summary = useMemo(() => {
    return calculateSummary(billItems.map(item => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount || 0),
      taxAmount: Number(item.taxAmount || 0),
      total: Number(item.total)
    })), decimals);
  }, [billItems, decimals]);

  const patientGrossAmount = summary.grossAmount;
  const calculatedDiscount = summary.discountAmount;
  const calculatedTax = summary.taxAmount;
  const calculatedNet = summary.netAmount;
  const totalAmount = summary.totalAmount;
  const roundOff = summary.roundOff;

  const totalAmountReceived = useMemo(() => {
    if (splitPayment) {
      return splitPaymentsList.reduce((sum, p) => sum + p.amount, 0);
    }
    return Number(amountReceived) || 0;
  }, [splitPayment, splitPaymentsList, amountReceived]);

  const balanceAmount = useMemo(() => {
    return Math.max(0, totalAmount - totalAmountReceived);
  }, [totalAmount, totalAmountReceived]);

  const getServicePrice = (serviceId: string): number => {
    const tariff = serviceTariffs.find(t => t.serviceId === serviceId && t.tariffName === 'Standard Price (Self Pay)' && t.status === 'Active');
    if (tariff) return tariff.price;
    const anyTariff = serviceTariffs.find(t => t.serviceId === serviceId && t.status === 'Active');
    return anyTariff ? anyTariff.price : 0;
  };

  // Sync amountReceived with totalAmount when totalAmount or paymentMode changes
  useEffect(() => {
    if (!splitPayment) {
      if (paymentMode === 'Credit') {
        setAmountReceived('0');
      } else {
        setAmountReceived(totalAmount.toString());
      }
    }
  }, [totalAmount, splitPayment, paymentMode]);

  // Default first split row to totalAmount when split is enabled and currently empty
  useEffect(() => {
    if (splitPayment) {
      setSplitPaymentsList(prev => {
        if (prev.length === 1 && prev[0].amount === 0) {
          return [{ ...prev[0], amount: totalAmount }];
        }
        return prev;
      });
    }
  }, [splitPayment, totalAmount]);

  // Auto-Suggest Consultation Fee when Doctor is Selected
  useEffect(() => {
    if (selectedDoctor) {
      const doc = employees.find(e => e.id === selectedDoctor);
      if (doc && doc.departmentId) {
        setSelectedDept(doc.departmentId);
      }
    }
  }, [selectedDoctor, employees]);

  // --- Event Handlers ---
  const handleAddModalSearchItem = (service: ServiceDefinition) => {
    setSelectedModalItems(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const handlePushModalItems = () => {
    setBillItems(prev => {
      const newItems = [...prev];
      selectedModalItems.forEach(modalItem => {
        const existingIdx = newItems.findIndex(item => item.itemId === modalItem.id);
        const qty = modalItem.quantity;
        const price = getServicePrice(modalItem.id);
        const taxPercentage = (modalItem as any).taxPercentage || 0;
        
        if (existingIdx !== -1) {
          const existing = newItems[existingIdx];
          const newQty = existing.quantity + qty;
          const result = calculateItem({
            quantity: newQty,
            unitPrice: existing.unitPrice,
            discountPercentage: existing.discountPercentage || 0,
            taxPercentage: existing.taxPercentage || 0
          }, decimals);
          
          newItems[existingIdx] = {
            ...existing,
            quantity: newQty,
            discountAmount: result.discountAmount,
            taxAmount: result.taxAmount,
            total: result.total
          };
        } else {
          const result = calculateItem({
            quantity: qty,
            unitPrice: price,
            discountPercentage: 0,
            taxPercentage: taxPercentage
          }, decimals);

          newItems.push({
            id: crypto.randomUUID(),
            itemId: modalItem.id,
            description: modalItem.name,
            quantity: qty,
            unitPrice: price,
            discountPercentage: 0,
            discountAmount: result.discountAmount,
            taxPercentage: taxPercentage,
            taxAmount: result.taxAmount,
            total: result.total,
            itemType: modalItem.serviceType || 'Service'
          });
        }
      });
      return newItems;
    });
    setSelectedModalItems([]);
    setShowAddModal(false);
  };

  const updateItemField = (index: number, field: keyof BillItem, value: any) => {
    setBillItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };
      
      const qty = Number(field === 'quantity' ? value : item.quantity || 1);
      const price = Number(field === 'unitPrice' ? value : item.unitPrice || 0);
      const discPercent = Number(field === 'discountPercentage' ? value : item.discountPercentage || 0);
      const taxPercent = Number(field === 'taxPercentage' ? value : item.taxPercentage || 0);

      const result = calculateItem({
        quantity: qty,
        unitPrice: price,
        discountPercentage: discPercent,
        taxPercentage: taxPercent
      }, decimals);

      newItems[index] = {
        ...item,
        quantity: qty,
        unitPrice: price,
        discountPercentage: discPercent,
        discountAmount: result.discountAmount,
        taxPercentage: taxPercent,
        taxAmount: result.taxAmount,
        total: result.total
      };
      return newItems;
    });
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Split Payment Add Row
  const addSplitPaymentRow = () => {
    setSplitPaymentsList(prev => [
      ...prev,
      { id: crypto.randomUUID(), method: 'Cash', amount: 0, reference: '' }
    ]);
  };

  const removeSplitPaymentRow = (id: string) => {
    setSplitPaymentsList(prev => prev.filter(item => item.id !== id));
  };

  const updateSplitPaymentRow = (id: string, field: string, value: any) => {
    setSplitPaymentsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // --- Form Validation & Submission ---
  const validateForm = (): boolean => {
    if (!selectedPatientId) {
      showToast('error', 'Patient is required.');
      return false;
    }
    if (!selectedDoctor) {
      showToast('error', 'Doctor is required.');
      return false;
    }
    if (!selectedDept) {
      showToast('error', 'Department is required.');
      return false;
    }
    if (billItems.length === 0) {
      showToast('error', 'Add at least 1 service item.');
      return false;
    }
    if (!splitPayment && paymentMode !== 'Credit' && Number(amountReceived) < 0) {
      showToast('error', 'Amount Received cannot be negative.');
      return false;
    }
    if (splitPayment) {
      const splitTotal = splitPaymentsList.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(splitTotal - totalAmount) > 0.01 && paymentMode !== 'Credit') {
        showToast('error', `Split payment total (${formatCurrency(splitTotal)}) must equal the invoice total (${formatCurrency(totalAmount)}).`);
        return false;
      }
    }
    return true;
  };

  const handleSaveInvoice = async (printAfterSave = false) => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const processedItems = billItems.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
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

      // Map payment objects
      let payments: Payment[] = [];
      let finalStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
      let paidAmt = 0;

      if (!splitPayment) {
        paidAmt = paymentMode === 'Credit' ? 0 : Number(amountReceived);
        if (paymentMode !== 'Credit' && paidAmt > 0) {
          payments.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: paidAmt,
            method: (paymentMode === 'UPI' || paymentMode === 'Online') ? 'Online' : (paymentMode as any),
            reference: referenceNo || undefined
          });
        }
      } else {
        paidAmt = splitPaymentsList.reduce((sum, p) => sum + p.amount, 0);
        splitPaymentsList.forEach(p => {
          if (p.amount > 0) {
            payments.push({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              amount: p.amount,
              method: (p.method === 'UPI' || p.method === 'Online') ? 'Online' : (p.method as any),
              reference: p.reference || undefined
            });
          }
        });
      }

      if (paidAmt >= totalAmount) {
        finalStatus = 'Paid';
      } else if (paidAmt > 0) {
        finalStatus = 'Partial';
      }

      const finalBill: Bill = {
        id: crypto.randomUUID(),
        invoiceNo: invoiceNo,
        patientId: selectedPatientId,
        appointmentId: appointmentIdParam || undefined,
        date: new Date(invoiceDate).toISOString(),
        status: finalStatus,
        totalAmount: totalAmount,
        paidAmount: paidAmt,
        discountAmount: calculatedDiscount,
        taxAmount: calculatedTax,
        roundOff: roundOff,
        paymentMode: splitPayment ? 'Split' : paymentMode,
        amountReceived: paidAmt,
        referenceNo: splitPayment ? '' : referenceNo,
        notes: notes,
        departmentId: selectedDept || undefined,
        departmentName: departments.find(d => d.id === selectedDept)?.name,
        doctorId: selectedDoctor || undefined,
        items: processedItems,
        payments: payments,
        isPharmacy: false
      };

      const success = await createBill(finalBill, orderIdsParam ? orderIdsParam.split(',') : []);
      if (success) {
        if (printAfterSave) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write('<html><head><title>Print Invoice</title></head><body><h3 style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #64748b;">Preparing invoice for printing...</h3></body></html>');
            printWindow.document.close();
            // A simple callback for print fallback
            setTimeout(() => {
              printWindow.document.body.innerHTML = `
                <div style="font-family: sans-serif; padding: 40px; color: #334155;">
                  <h1 style="color: #0f172a; margin-bottom: 2px;">MediCore HMS Invoice</h1>
                  <p style="color: #64748b; font-size: 14px; margin-top: 0;">No: ${finalBill.invoiceNo} · Date: ${new Date(finalBill.date).toLocaleDateString()}</p>
                  <hr style="border-color: #e2e8f0; margin: 20px 0;"/>
                  <h4 style="margin-bottom: 5px;">Patient Info</h4>
                  <p style="font-size: 13px; margin: 0 0 20px 0;">ID: ${finalBill.patientId.slice(-6).toUpperCase()} · Dues Balance: ${formatCurrency(outstandingDues)}</p>
                  
                  <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="border-bottom: 2px solid #cbd5e1; color: #475569;">
                        <th style="padding: 8px 0;">Item Description</th>
                        <th style="padding: 8px 0; text-align: center;">Qty</th>
                        <th style="padding: 8px 0; text-align: right;">Price</th>
                        <th style="padding: 8px 0; text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${processedItems.map(item => `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 8px 0;">${item.description}</td>
                          <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
                          <td style="padding: 8px 0; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                          <td style="padding: 8px 0; text-align: right;">${formatCurrency(item.total)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  
                  <div style="margin-left: auto; width: 300px; margin-top: 30px; font-size: 13px; color: #475569;">
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                      <span>Subtotal</span><span>${formatCurrency(patientGrossAmount)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #ef4444;">
                      <span>Discount</span><span>(${formatCurrency(calculatedDiscount)})</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                      <span>Tax</span><span>${formatCurrency(calculatedTax)}</span>
                    </div>
                    <hr style="border-color: #cbd5e1;"/>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-weight: bold; color: #0f172a; font-size: 15px;">
                      <span>Total Invoice</span><span>${formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              `;
              printWindow.print();
            }, 500);
          }
        }
        navigate('/finance/billing');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterPatient = () => {
    if (!newPatientForm.firstName || !newPatientForm.lastName || !newPatientForm.phone) {
      showToast('error', 'First name, last name, and phone are required.');
      return;
    }

    const resetForm = () => setNewPatientForm({ firstName: '', lastName: '', dob: '', gender: 'Male', phone: '', email: '', address: '' });

    // Check if a patient with the same phone number already exists in the patients table
    // (exclude ABDM demographic-only entries which are not in the patients table)
    const existingPatient = patients.find(
      p => !((p as any)._isAbdmDemographic) && p.phone.trim() === newPatientForm.phone.trim()
    );

    if (existingPatient) {
      // Patient already registered — select them without creating a duplicate
      setSelectedPatientId(existingPatient.id);
      setPatientSearch(`${existingPatient.firstName} ${existingPatient.lastName}`);
      setShowNewPatientModal(false);
      resetForm();
      showToast('info', `Already registered: ${existingPatient.firstName} ${existingPatient.lastName} selected.`);
      return;
    }

    // No existing patient found — register as new patient in the patients table
    // Using Date.now().toString() for safe ID generation (works on HTTP and HTTPS)
    const newPat: Patient = {
      id: Date.now().toString(),
      firstName: newPatientForm.firstName,
      lastName: newPatientForm.lastName,
      dob: newPatientForm.dob || new Date().toISOString().split('T')[0],
      gender: newPatientForm.gender,
      phone: newPatientForm.phone,
      email: newPatientForm.email,
      address: newPatientForm.address,
      registrationDate: new Date().toISOString()
    };
    addPatient(newPat);
    setSelectedPatientId(newPat.id);
    setPatientSearch(`${newPat.firstName} ${newPat.lastName}`);
    setShowNewPatientModal(false);
    resetForm();
  };

  // --- Filtered Services for Autocomplete ---
  const filteredServices = useMemo(() => {
    if (!itemSearchQuery.trim()) {
      return serviceDefinitions.slice(0, 10);
    }
    return serviceDefinitions.filter(s => 
      s.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || 
      s.code.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  }, [itemSearchQuery, serviceDefinitions]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-700 pb-16 font-sans">
      {/* ── TOP HEADER SECTION ── */}
      <div className="bg-[#0f2c59] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/finance/billing')}
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-all"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-200" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span>OP Billing</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200">New Invoice</span>
            </div>
            <h1 className="text-xl font-bold flex items-center gap-2 mt-0.5">
              New OP Invoice
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">DRAFT</span>
            </h1>
          </div>
        </div>

        {/* Patient Search Autocomplete */}
        <div ref={patientSearchRef} className="relative max-w-md w-full mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-800 hover:bg-slate-800/80 focus:bg-white text-slate-100 focus:text-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl text-sm outline-none transition-all placeholder:text-slate-500"
              placeholder="Search patient / UHID / phone..."
              value={patientSearch}
              onFocus={() => setShowPatientSuggestions(true)}
              onChange={e => {
                setPatientSearch(e.target.value);
                setShowPatientSuggestions(true);
              }}
            />
          </div>

          {showPatientSuggestions && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-t-xl flex justify-between items-center">
                <span>Select Patient</span>
                <button 
                  onClick={() => { setShowNewPatientModal(true); setShowPatientSuggestions(false); }}
                  className="text-blue-600 hover:text-blue-700 font-extrabold text-[10px] uppercase cursor-pointer"
                >
                  + Add Walk-In
                </button>
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
                      setSelectedPatientId(p.id);
                      setPatientSearch(`${p.firstName} ${p.lastName}`);
                      setShowPatientSuggestions(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <div className="font-semibold text-slate-800">{p.firstName} {p.lastName}</div>
                    <div className="text-[11px] text-slate-500 flex justify-between mt-0.5 font-mono">
                      <span>UHID: UHID-{p.id.slice(-6).toUpperCase()}</span>
                      <span>{p.phone}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono hidden lg:block">
            <div className="text-xs text-slate-400">Invoice No.</div>
            <div className="font-bold text-sm text-slate-200">{invoiceNo || 'INV-2026-X'}</div>
          </div>
          <div className="w-8 h-8 bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center font-bold text-xs border border-blue-400/30">
            AD
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Patient & Services */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PATIENT INFORMATION CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
            
            {/* Outstanding dues badge */}
            {outstandingDues > 0 && (
              <div className="absolute top-0 right-0 bg-red-50 border-b border-l border-red-200 text-red-600 px-4 py-1.5 rounded-bl-xl text-xs font-black tracking-wide flex items-center gap-1 shadow-sm font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                DUE {formatCurrency(outstandingDues)}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <User className="w-4.5 h-4.5 text-slate-400" />
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Patient Details</h2>
            </div>

            {!selectedPatientId ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
                <p className="text-slate-400 text-sm mb-3">No patient selected. Search above or register a new one.</p>
                <button 
                  onClick={() => setShowNewPatientModal(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Walk-in Patient
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Core Patient Data Display */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-extrabold text-lg">
                    {(() => {
                      const p = patients.find(pat => pat.id === selectedPatientId);
                      return p ? `${p.firstName[0]}${p.lastName[0]}` : 'P';
                    })()}
                  </div>
                  <div>
                    {(() => {
                      const p = patients.find(pat => pat.id === selectedPatientId);
                      if (!p) return null;
                      const birthYear = new Date(p.dob).getFullYear();
                      const age = new Date().getFullYear() - birthYear;
                      return (
                        <>
                          <div className="font-extrabold text-slate-800 text-base">{p.firstName} {p.lastName}</div>
                          <div className="text-xs text-slate-500 font-semibold mt-0.5 flex flex-wrap gap-2 items-center font-mono">
                            <span>UHID-{p.id.slice(-6).toUpperCase()}</span>
                            <span>•</span>
                            <span>{p.gender}, {age}Y</span>
                            <span>•</span>
                            <span>{p.phone}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <button 
                    onClick={() => { setSelectedPatientId(''); setPatientSearch(''); }}
                    className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Visit/Encounter Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Encounter No.</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all font-mono h-9"
                      placeholder="e.g. ENC-957384"
                      value={encounterNo}
                      onChange={e => setEncounterNo(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Visit Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer h-9"
                        value={visitDate}
                        onChange={e => setVisitDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Doctor *</label>
                    <select
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer h-9"
                      value={selectedDoctor}
                      onChange={e => setSelectedDoctor(e.target.value)}
                    >
                      <option value="">Select Doctor</option>
                      {employees.filter(e => e.role === 'Doctor' && e.status === 'Active').map(doc => (
                        <option key={doc.id} value={doc.id}>Dr. {doc.firstName} {doc.lastName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Department *</label>
                    <select
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer h-9"
                      value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                    >
                      <option value="">Select Department</option>
                      {departments.filter(d => d.status === 'Active').map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SERVICES CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4.5 h-4.5 text-slate-400" />
                <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Services</h2>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Item Dept.</th>
                    <th className="p-3 w-20 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Price</th>
                    <th className="p-3 w-20 text-center">Disc%</th>
                    <th className="p-3 w-20 text-center">Tax%</th>
                    <th className="p-3 w-28 text-right">Amount</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                        No services added yet — click <strong className="text-blue-600 cursor-pointer" onClick={() => setShowAddModal(true)}>+ Add item</strong> to search
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item, idx) => {
                      const matchedDef = serviceDefinitions.find(s => s.id === item.itemId);
                      const deptName = matchedDef ? (departments.find(d => d.id === matchedDef.billingGroupName)?.name || 'Service') : 'OP Services';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-center text-xs font-bold text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{item.description}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{deptName}</div>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2 py-1 text-center font-bold text-slate-700 text-xs h-8 outline-none transition-all"
                              value={item.quantity}
                              onChange={e => updateItemField(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{getCurrencySymbol(selectedCurrency)}</span>
                              <input
                                type="number"
                                min="0"
                                step={selectedCurrency === 'BHD' ? "0.001" : "0.01"}
                                className="w-full pl-5 pr-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg py-1 text-right font-mono font-bold text-slate-700 text-xs h-8 outline-none transition-all"
                                value={item.unitPrice}
                                onChange={e => updateItemField(idx, 'unitPrice', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-1 py-1 text-center font-mono font-bold text-slate-700 text-xs h-8 outline-none transition-all"
                              value={item.discountPercentage || 0}
                              onChange={e => updateItemField(idx, 'discountPercentage', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-1 py-1 text-center font-mono font-bold text-slate-700 text-xs h-8 outline-none transition-all"
                              value={item.taxPercentage || 0}
                              onChange={e => updateItemField(idx, 'taxPercentage', e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-800 text-xs">
                            {formatCurrency(item.total || 0)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Inline shortcut search trigger row */}
                  <tr 
                    onClick={() => setShowAddModal(true)}
                    className="hover:bg-blue-50/50 cursor-pointer border-t border-slate-100 transition-colors"
                  >
                    <td className="p-3 text-center text-xs font-bold text-blue-600 font-mono">+</td>
                    <td colSpan={7} className="p-3 text-blue-600 text-xs font-bold">
                      Add item to search more services
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Invoice Summary & Payment */}
        <div className="space-y-6">
          
          {/* INVOICE SUMMARY CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4.5 h-4.5 text-slate-400" />
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Invoice Summary</h2>
            </div>

            <div className="space-y-3 font-semibold text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span className="text-slate-700 font-mono">{formatCurrency(patientGrossAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-red-500">
                <span>Discount</span>
                <span className="font-mono">({formatCurrency(calculatedDiscount)})</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Tax</span>
                <span className="font-mono">{formatCurrency(calculatedTax)}</span>
              </div>

              <hr className="border-slate-100 border-dashed" />

              <div className="flex justify-between text-slate-800 text-sm font-bold">
                <span>Net Amount</span>
                <span className="font-mono text-slate-900">{formatCurrency(calculatedNet)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Round Off</span>
                <span className="font-mono">{formatCurrency(roundOff)}</span>
              </div>

              <hr className="border-slate-200 border-dashed" />

              <div className="flex justify-between items-center text-blue-700 text-base font-extrabold bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                <span>Total Amount</span>
                <span className="font-mono font-black text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* PAYMENT DETAILS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-slate-400" />
                <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Payment</h2>
              </div>
              
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  checked={splitPayment}
                  onChange={e => setSplitPayment(e.target.checked)}
                />
                <span>Split</span>
              </label>
            </div>

            {/* Traditional Single Mode Payment */}
            {!splitPayment ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5 block">Payment Mode *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Card', 'UPI', 'Credit'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`flex items-center justify-center gap-1 border rounded-xl py-2 px-1 text-xs font-bold cursor-pointer transition-all ${
                          paymentMode === mode
                            ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMode !== 'Credit' && (
                  <>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block font-sans">Amount Received *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{getCurrencySymbol(selectedCurrency)}</span>
                        <input
                          type="number"
                          step={selectedCurrency === 'BHD' ? "0.001" : "0.01"}
                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all font-mono h-9"
                          value={amountReceived}
                          onChange={e => setAmountReceived(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Reference No.</label>
                      <input
                        type="text"
                        placeholder="Enter transaction reference (optional)"
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 h-9"
                        value={referenceNo}
                        onChange={e => setReferenceNo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Balance Strip */}
                {paymentMode !== 'Credit' && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 flex justify-between items-center text-xs font-extrabold">
                    <span>Balance Amount</span>
                    <span className="font-mono text-sm">{formatCurrency(balanceAmount)}</span>
                  </div>
                )}
              </div>
            ) : (
              // Split Payments Multi-Row Form Layout
              <div className="space-y-4">
                <div className="space-y-3">
                  {splitPaymentsList.map((payRow, index) => (
                    <div key={payRow.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Payment #{index + 1}</span>
                        {splitPaymentsList.length > 1 && (
                          <button 
                            onClick={() => removeSplitPaymentRow(payRow.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Mode</label>
                          <select
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none"
                            value={payRow.method}
                            onChange={e => updateSplitPaymentRow(payRow.id, 'method', e.target.value)}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Amount</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 outline-none font-mono text-right"
                            value={payRow.amount}
                            onChange={e => updateSplitPaymentRow(payRow.id, 'amount', Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {payRow.method !== 'Cash' && (
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Ref No.</label>
                          <input
                            type="text"
                            placeholder="Reference"
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                            value={payRow.reference}
                            onChange={e => updateSplitPaymentRow(payRow.id, 'reference', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSplitPaymentRow}
                  className="w-full border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Payment Row
                </button>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>Total Collected</span>
                    <span className="font-mono">{formatCurrency(totalAmountReceived)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-700">
                    <span>Remaining to Collect</span>
                    <span className="font-mono text-blue-600">{formatCurrency(balanceAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
              <textarea
                placeholder="Enter notes (optional)"
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 h-16 resize-none"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 fixed bottom-0 left-0 w-full z-40 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end ml-auto">
          <button
            onClick={() => navigate('/finance/billing')}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Cancel
          </button>
          
          <button
            onClick={() => handleSaveInvoice(false)}
            disabled={isSaving || !selectedPatientId}
            className="border border-blue-200 hover:bg-blue-50/50 text-blue-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Save invoice
          </button>

          <button
            onClick={() => handleSaveInvoice(true)}
            disabled={isSaving || !selectedPatientId}
            className="bg-[#0f2c59] hover:bg-[#0f2c59]/90 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            Save & print
          </button>
        </div>
      </div>

      {/* ── ADD SERVICE / ITEM AUTOCLOSE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Add Service Items</h3>
                <p className="text-xs text-slate-500">Search and select items to add to the invoice</p>
              </div>
              <button 
                onClick={() => { setSelectedModalItems([]); setShowAddModal(false); }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search services by name, CPT code or ID..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 font-semibold"
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Results Grid List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
              {/* If search query is empty, label "Most Used Services" */}
              {!itemSearchQuery.trim() && (
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Common & Most Used Services
                </div>
              )}

              {filteredServices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  No matching service found for "{itemSearchQuery}"
                </div>
              ) : (
                filteredServices.map(service => {
                  const dept = departments.find(d => d.id === service.billingGroupName)?.name || 'General';
                  const price = getServicePrice(service.id);
                  const addedCount = selectedModalItems.find(item => item.id === service.id)?.quantity || 0;

                  return (
                    <div 
                      key={service.id} 
                      className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-3 flex justify-between items-center hover:shadow-sm transition-all"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          {service.name}
                          {addedCount > 0 && (
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-mono">
                              {addedCount} added
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Code: {service.code} · Dept: {dept}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-xs text-blue-600">
                          {formatCurrency(price)}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleAddModalSearchItem(service)}
                          className="bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg p-1.5 font-bold transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Selection Summary */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedModalItems.reduce((sum, item) => sum + item.quantity, 0)} items selected
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedModalItems([]); setShowAddModal(false); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePushModalItems}
                  disabled={selectedModalItems.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-100"
                >
                  Add to invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WALK-IN REGISTER MODAL ── */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800">Quick Patient Registration</h3>
              <button 
                onClick={() => setShowNewPatientModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">First Name *</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all h-9"
                    value={newPatientForm.firstName}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Last Name *</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all h-9"
                    value={newPatientForm.lastName}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer h-9"
                    value={newPatientForm.dob}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, dob: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Gender</label>
                  <select
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer h-9"
                    value={newPatientForm.gender}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, gender: e.target.value as any }))}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Phone Number *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all h-9"
                  placeholder="e.g. +91 98765 43210"
                  value={newPatientForm.phone}
                  onChange={e => setNewPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all h-9"
                  placeholder="patient@example.com"
                  value={newPatientForm.email}
                  onChange={e => setNewPatientForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Address</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all h-9"
                  value={newPatientForm.address}
                  onChange={e => setNewPatientForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegisterPatient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-100"
              >
                Register & Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
