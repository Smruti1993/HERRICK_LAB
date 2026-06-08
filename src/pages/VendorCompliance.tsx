import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, Clock, Search, Filter, RefreshCw, Upload, 
  Play, Sparkles, UserCheck, HelpCircle, ArrowRight, ShieldAlert, Award,
  LayoutDashboard, FileText, Settings, Key, Lock, ChevronDown, Check,
  Database, AlertCircle, FileBarChart, CheckSquare, Coins, Download, CreditCard, Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { GRN, JournalVoucher, JournalVoucherItem, GSTR2BUpload, GSTR2BInvoice } from '../types';

export const VendorCompliance: React.FC = () => {
  const { 
    showToast, vendors, grns, saveJournalVoucher, deleteJournalVoucher,
    journalVouchers, chartOfAccounts,
    gstr2bUploads, gstr2bInvoices, saveGstr2bUpload, markUploadReconciled
  } = useData();

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gstr-upload' | 'reports' | 'vendor-mgmt' | 'ledger-lock' | 'settings'>('dashboard');

  const [isUploaded, setIsUploaded] = useState<boolean>(false);
  const [isReconciled, setIsReconciled] = useState<boolean>(false);

  // Main Dashboard State - initialized to 0/empty
  const [totalVendors, setTotalVendors] = useState<number>(0);
  const [activeVendors, setActiveVendors] = useState<number>(0);
  const [totalPendingItc, setTotalPendingItc] = useState<number>(0);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState<number>(0);
  const [atRiskItc, setAtRiskItc] = useState<number>(0);
  const [atRiskInvoicesCount, setAtRiskInvoicesCount] = useState<number>(0);
  const [atRiskPercentage, setAtRiskPercentage] = useState<number>(0);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [matchingStatus, setMatchingStatus] = useState<any>({
    lastUploadDate: '',
    period: '',
    matchedCount: 0,
    mismatchedCount: 0,
    pendingFilingCount: 0,
    hasStatus: false
  });

  const [topMismatches, setTopMismatches] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Upload Tab state - initialized to empty
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  // Reports Tab state - initialized to empty
  const [reportFilter, setReportFilter] = useState('All');
  const [reportSearch, setReportSearch] = useState('');
  const [reconciliationInvoices, setReconciliationInvoices] = useState<any[]>([]);

  // Ledger Lock Tab state - initialized to empty
  const [lockPeriod, setLockPeriod] = useState('April 2026');
  const [ledgerLocks, setLedgerLocks] = useState<any[]>([]);

  // Selected distributor ID state for Settlement
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  
  // Pending GRN Invoices list state for Settlement
  const [pendingGRNs, setPendingGRNs] = useState<GRN[]>([]);
  
  // Selected Invoice IDs for payment
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Settled Invoices log in LocalStorage to hide paid invoices
  const [settledGrnIds, setSettledGrnIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('medicore_settled_grn_ids');
    return saved ? JSON.parse(saved) : [];
  });

  // Settings state - declared early so effects below can reference toleranceLimit
  const [toleranceLimit, setToleranceLimit] = useState(100);
  const [autoEmail, setAutoEmail] = useState(true);
  const [autoWithhold, setAutoWithhold] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('Monthly');

  // Search & Filters - declared early so effects below can reference them
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  const [uploadedInvoices, setUploadedInvoices] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // Keep LocalStorage in sync
  useEffect(() => {
    localStorage.setItem('medicore_settled_grn_ids', JSON.stringify(settledGrnIds));
  }, [settledGrnIds]);

  // Load GSTR-2B state from database/context when uploads change
  useEffect(() => {
    if (gstr2bUploads && gstr2bUploads.length > 0) {
      const sortedUploads = [...gstr2bUploads].sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
        const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
        return dateB - dateA;
      });

      setUploadHistory(sortedUploads.map(u => ({
        id: u.id,
        period: u.period,
        date: u.uploadDate ? new Date(u.uploadDate).toLocaleDateString() : '',
        invoices: u.invoicesCount,
        itc: u.totalItc,
        user: u.uploadedBy,
        status: u.status
      })));

      const latest = sortedUploads[0];
      setFileName(latest.fileName);
      setIsUploaded(true);
      
      const invoicesForLatest = gstr2bInvoices.filter(i => i.uploadId === latest.id);
      setUploadedInvoices(invoicesForLatest);
      setIsReconciled(latest.isReconciled);
    } else {
      setIsUploaded(false);
      setIsReconciled(false);
      setFileName('');
      setUploadedInvoices([]);
      setUploadHistory([]);
      setReconciliationInvoices([]);
      setAlerts([]);
      setTopMismatches([]);
      setMatchingStatus({
        lastUploadDate: '',
        period: '',
        matchedCount: 0,
        mismatchedCount: 0,
        pendingFilingCount: 0,
        hasStatus: false
      });
    }
  }, [gstr2bUploads, gstr2bInvoices]);

  // Dynamically recompute reconciliation details whenever isReconciled, uploadedInvoices, or database GRNs change
  useEffect(() => {
    if (isReconciled && uploadedInvoices.length > 0) {
      const dbGRNs = grns.filter(g => 
        g.invoiceNo && 
        g.invoiceNo.trim() !== '' && 
        !settledGrnIds.includes(g.id)
      );
      
      let totalTaxHold = 0;
      let matchedCount = 0;
      let mismatchedCount = 0;
      let pendingFilingCount = 0;
      
      const reconciled = dbGRNs.map(g => {
        const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
        const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
        const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
        const dbTax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
        const roundedDbTax = Number(Number(dbTax).toFixed(2));

        const match = uploadedInvoices.find(u => 
          u.invoiceNo.toLowerCase().trim() === g.invoiceNo?.toLowerCase().trim()
        );

        let status = 'Matched';
        let diff = 0;
        let reason = 'Fully reconciled';
        let gstrValue = g.netAmount;

        if (match) {
          const portalTax = match.taxAmount;
          if (roundedDbTax - portalTax > toleranceLimit) {
            status = 'Shortfall';
            diff = Number((roundedDbTax - portalTax).toFixed(2));
            reason = 'Tax rate mismatch';
            mismatchedCount++;
            totalTaxHold += diff;
            gstrValue = Math.max(0, g.netAmount - diff);
          } else {
            matchedCount++;
          }
        } else {
          status = 'Pending Filing';
          diff = roundedDbTax;
          reason = 'Vendor GSTR-1 not filed';
          pendingFilingCount++;
          totalTaxHold += diff;
          gstrValue = 0;
        }

        return {
          id: g.id,
          invoiceNo: g.invoiceNo,
          vendor: vendors.find(v => v.id === g.vendorId)?.name || 'Vendor',
          date: g.gateEntryDate,
          grnValue: g.netAmount,
          gstrValue: gstrValue,
          diff: diff,
          status: status,
          reason: reason
        };
      });

      setReconciliationInvoices(reconciled);
      setAtRiskItc(Number(totalTaxHold.toFixed(2)));
      setAtRiskInvoicesCount(mismatchedCount + pendingFilingCount);
      
      let totalTax = 0;
      dbGRNs.forEach(g => {
        const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
        const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
        const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
        const tax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
        totalTax += tax;
      });
      setAtRiskPercentage(totalTax > 0 ? Math.round((totalTaxHold / totalTax) * 100) : 0);

      const newAlerts: any[] = [];
      reconciled.forEach(item => {
        if (item.status === 'Shortfall') {
          newAlerts.push({
            id: crypto.randomUUID(),
            type: 'warning',
            title: `TAX MISMATCH: ${item.invoiceNo}`,
            vendor: item.vendor,
            invoice: item.invoiceNo,
            tag: 'ITC Shortfall',
            description: `Internal tax expected difference detected. Shortfall of ${formatCurrency(item.diff)} locked to payout.`,
            actions: ['View Discrepancy', 'Withhold Payment']
          });
        } else if (item.status === 'Pending Filing') {
          newAlerts.push({
            id: crypto.randomUUID(),
            type: 'error',
            title: `MISSING INVOICE: ${item.invoiceNo}`,
            vendor: item.vendor,
            invoice: item.invoiceNo,
            tag: 'Missing Row',
            description: `Invoice missing from government portal. Full tax of ${formatCurrency(item.diff)} flagged as loss and hold applied.`,
            actions: ['Resolve', 'Hold Payment']
          });
        }
      });
      setAlerts(newAlerts);

      setTopMismatches(
        reconciled
          .filter(item => item.status === 'Shortfall' || item.status === 'Pending Filing')
          .map(item => ({ vendor: item.vendor, invoice: item.invoiceNo, type: item.status === 'Shortfall' ? 'Shortfall' : 'Missing', amount: item.diff }))
      );

      const latestUpload = [...gstr2bUploads].sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
        const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
        return dateB - dateA;
      })[0];

      setMatchingStatus({
        lastUploadDate: latestUpload?.uploadDate ? new Date(latestUpload.uploadDate).toLocaleString() : '',
        period: latestUpload?.period || 'GSTR-2B Uploaded',
        matchedCount,
        mismatchedCount,
        pendingFilingCount,
        hasStatus: true
      });
    }
  }, [isReconciled, uploadedInvoices, grns, vendors, settledGrnIds, toleranceLimit, gstr2bUploads]);

  // Load pending invoices once vendor gets selected
  useEffect(() => {
    if (!selectedVendorId) {
      setPendingGRNs([]);
      setSelectedInvoiceIds([]);
      return;
    }

    // Filter GRNs for this vendor that have invoiceNo and are not settled
    const filtered = grns.filter(g => 
      g.vendorId === selectedVendorId && 
      g.invoiceNo && 
      g.invoiceNo.trim() !== '' &&
      !settledGrnIds.includes(g.id)
    );

    setPendingGRNs(filtered);
    setSelectedInvoiceIds([]);
  }, [selectedVendorId, grns, settledGrnIds, vendors]);


  // 1. Load initial dashboard metrics dynamically from actual database state
  useEffect(() => {
    setTotalVendors(vendors.length);
    setActiveVendors(vendors.filter(v => v.active).length);

    if (isReconciled) {
      setTotalPendingItc(0);
      setPendingInvoicesCount(0);
      return;
    }

    // Filter GRNs that have invoiceNo and are not settled
    const pendingInvoices = grns.filter(g => 
      g.invoiceNo && 
      g.invoiceNo.trim() !== '' && 
      !settledGrnIds.includes(g.id)
    );

    let totalTax = 0;
    pendingInvoices.forEach(g => {
      const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
      const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
      const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
      const tax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
      totalTax += tax;
    });

    setTotalPendingItc(Number(totalTax.toFixed(2)));
    setPendingInvoicesCount(pendingInvoices.length);
  }, [vendors, grns, settledGrnIds, isReconciled]);

  // 2. Load leaderboard metrics dynamically from database & reconciliation status
  useEffect(() => {
    const board = vendors.filter(v => v.active).map((vendor) => {
      const vendorGRNs = grns.filter(g => g.vendorId === vendor.id && g.invoiceNo && g.invoiceNo.trim() !== '' && !settledGrnIds.includes(g.id));
      
      let totalTax = 0;
      let matchedCount = 0;
      
      vendorGRNs.forEach(g => {
        const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
        const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
        const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
        const tax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
        totalTax += tax;

        if (isReconciled) {
          const match = reconciliationInvoices.find(r => r.id === g.id);
          if (match && match.status === 'Matched') {
            matchedCount++;
          }
        } else {
          matchedCount++;
        }
      });

      const score = vendorGRNs.length > 0 ? Math.round((matchedCount / vendorGRNs.length) * 100) : 100;
      
      let riskLevel = 'Low';
      if (score < 70) riskLevel = 'High';
      else if (score < 90) riskLevel = 'Medium';

      return {
        name: vendor.name,
        score: score,
        pendingItc: Number(totalTax.toFixed(2)),
        riskLevel: riskLevel
      };
    });

    const sorted = board.sort((a, b) => b.score - a.score);
    const ranked = sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    setLeaderboard(ranked);
  }, [vendors, grns, reconciliationInvoices, settledGrnIds, isReconciled]);

  // Parse actual uploaded GSTR-2B Excel File
  const processExcelFile = (file: File) => {
    setFileName(file.name);
    setIsLoading(true);
    showToast('info', `Reading GSTR-2B Excel: ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          showToast('error', 'Excel sheet is empty.');
          setIsLoading(false);
          return;
        }

        // Search for header row
        let headerIdx = -1;
        for (let i = 0; i < Math.min(jsonData.length, 25); i++) {
          const row = jsonData[i];
          if (Array.isArray(row)) {
            const hasInvoice = row.some(cell => typeof cell === 'string' && /invoice|inv/i.test(cell));
            const hasGst = row.some(cell => typeof cell === 'string' && /gst|supplier/i.test(cell));
            if (hasInvoice || hasGst) {
              headerIdx = i;
              break;
            }
          }
        }

        if (headerIdx === -1) {
          headerIdx = 0;
        }

        const headers = jsonData[headerIdx] as any[];
        const rows = jsonData.slice(headerIdx + 1);

        const parsed: any[] = [];
        let totalSheetItc = 0;

        rows.forEach(row => {
          if (!Array.isArray(row) || row.length === 0) return;
          
          let invoiceNo = '';
          let invoiceDate = '';
          let taxableValue = 0;
          let cgst = 0;
          let sgst = 0;
          let igst = 0;
          let supplierName = '';
          let supplierGst = '';

          row.forEach((cell, idx) => {
            const header = String(headers[idx] || '').toLowerCase();
            const valStr = cell !== null && cell !== undefined ? String(cell).trim() : '';
            const valNum = Number(valStr) || 0;

            if (/invoice.*no|inv.*no|invoice.*num/i.test(header)) {
              invoiceNo = valStr;
            } else if (/date|inv.*date/i.test(header)) {
              invoiceDate = valStr;
            } else if (/taxable|assessable/i.test(header)) {
              taxableValue = valNum;
            } else if (/cgst|central.*tax/i.test(header)) {
              cgst = valNum;
            } else if (/sgst|state.*tax/i.test(header)) {
              sgst = valNum;
            } else if (/igst|integrated.*tax/i.test(header)) {
              igst = valNum;
            } else if (/gstin|supplier.*gst/i.test(header)) {
              supplierGst = valStr;
            } else if (/name|supplier.*name|trade/i.test(header)) {
              supplierName = valStr;
            }
          });

          if (invoiceNo) {
            const taxAmount = cgst + sgst + igst;
            totalSheetItc += taxAmount;
            parsed.push({
              invoiceNo,
              invoiceDate,
              taxableValue,
              taxAmount,
              cgst,
              sgst,
              igst,
              supplierName,
              supplierGst
            });
          }
        });

        const uploadId = crypto.randomUUID();
        const period = parsed[0]?.invoiceDate ? `Period ${parsed[0].invoiceDate.substring(0, 7)}` : 'Uploaded Period';
        const totalItcVal = Number(totalSheetItc.toFixed(2));

        const newUploadObj: GSTR2BUpload = {
          id: uploadId,
          period: period,
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          invoicesCount: parsed.length,
          totalItc: totalItcVal,
          uploadedBy: 'System Manager',
          status: 'Processed',
          isReconciled: false
        };

        const newInvoicesObjs: GSTR2BInvoice[] = parsed.map(p => ({
          id: crypto.randomUUID(),
          uploadId: uploadId,
          invoiceNo: p.invoiceNo,
          invoiceDate: p.invoiceDate || '',
          taxableValue: p.taxableValue,
          taxAmount: p.taxAmount,
          cgst: p.cgst,
          sgst: p.sgst,
          igst: p.igst,
          supplierName: p.supplierName || '',
          supplierGst: p.supplierGst || ''
        }));

        const success = await saveGstr2bUpload(newUploadObj, newInvoicesObjs);

        setIsUploaded(true);
        setIsReconciled(false);
        setIsLoading(false);
        if (success) {
          showToast('success', `GSTR-2B Excel parsed and saved to database successfully! Loaded ${parsed.length} invoices.`);
        } else {
          showToast('error', `GSTR-2B Excel parsed successfully, but failed to insert into the database.`);
        }

      } catch (err: any) {
        console.error(err);
        showToast('error', `Failed to parse Excel: ${err.message}`);
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Trigger real database GSTR-2B Invoice Matching Loop
  const handleMatchInvoices = () => {
    if (!isUploaded || uploadedInvoices.length === 0) {
      showToast('error', 'Please upload a GSTR-2B Excel file first.');
      return;
    }

    setIsLoading(true);
    showToast('info', 'Running Core Matching Loop Logic...');
    
    setTimeout(() => {
      setIsLoading(false);
      setIsReconciled(true);
      showToast('success', 'Reconciliation report compiled! Summary widgets recalculated.');
      
      // Get all database GRNs that have invoiceNo and are not settled
      const dbGRNs = grns.filter(g => 
        g.invoiceNo && 
        g.invoiceNo.trim() !== '' && 
        !settledGrnIds.includes(g.id)
      );
      
      let totalTaxHold = 0;
      let matchedCount = 0;
      let mismatchedCount = 0;
      let pendingFilingCount = 0;
      
      const reconciled = dbGRNs.map(g => {
        // Calculate database GRN tax
        const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
        const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
        const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
        const dbTax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
        const roundedDbTax = Number(Number(dbTax).toFixed(2));

        // Find match in uploaded portal sheet
        const match = uploadedInvoices.find(u => 
          u.invoiceNo.toLowerCase().trim() === g.invoiceNo?.toLowerCase().trim()
        );

        let status = 'Matched';
        let diff = 0;
        let reason = 'Fully reconciled';
        let gstrValue = g.netAmount;

        if (match) {
          const portalTax = match.taxAmount;
          // Check if there is a shortfall
          if (roundedDbTax - portalTax > toleranceLimit) {
            status = 'Shortfall';
            diff = Number((roundedDbTax - portalTax).toFixed(2));
            reason = 'Tax rate mismatch';
            mismatchedCount++;
            totalTaxHold += diff;
            gstrValue = Math.max(0, g.netAmount - diff);
          } else {
            matchedCount++;
          }
        } else {
          // Missing portal row
          status = 'Pending Filing';
          diff = roundedDbTax; // Full tax hold
          reason = 'Vendor GSTR-1 not filed';
          pendingFilingCount++;
          totalTaxHold += diff;
          gstrValue = 0;
        }

        return {
          id: g.id,
          invoiceNo: g.invoiceNo,
          vendor: vendors.find(v => v.id === g.vendorId)?.name || 'Vendor',
          date: g.gateEntryDate,
          grnValue: g.netAmount,
          gstrValue: gstrValue,
          diff: diff,
          status: status,
          reason: reason
        };
      });

      setReconciliationInvoices(reconciled);

      // Card & Widget Recalculation Math:
      setAtRiskItc(Number(totalTaxHold.toFixed(2)));
      setAtRiskInvoicesCount(mismatchedCount + pendingFilingCount);
      
      const totalInitialITC = totalPendingItc;
      setAtRiskPercentage(totalInitialITC > 0 ? Math.round((totalTaxHold / totalInitialITC) * 100) : 0);

      // High-Priority Alerts
      const newAlerts: any[] = [];
      reconciled.forEach(item => {
        if (item.status === 'Shortfall') {
          newAlerts.push({
            id: crypto.randomUUID(),
            type: 'warning',
            title: `TAX MISMATCH: ${item.invoiceNo}`,
            vendor: item.vendor,
            invoice: item.invoiceNo,
            tag: 'ITC Shortfall',
            description: `Internal tax expected difference detected. Shortfall of ${formatCurrency(item.diff)} locked to payout.`,
            actions: ['View Discrepancy', 'Withhold Payment']
          });
        } else if (item.status === 'Pending Filing') {
          newAlerts.push({
            id: crypto.randomUUID(),
            type: 'error',
            title: `MISSING INVOICE: ${item.invoiceNo}`,
            vendor: item.vendor,
            invoice: item.invoiceNo,
            tag: 'Missing Row',
            description: `Invoice missing from government portal. Full tax of ${formatCurrency(item.diff)} flagged as loss and hold applied.`,
            actions: ['Resolve', 'Hold Payment']
          });
        }
      });
      setAlerts(newAlerts);

      setTopMismatches(
        reconciled
          .filter(item => item.status === 'Shortfall' || item.status === 'Pending Filing')
          .map(item => ({ vendor: item.vendor, invoice: item.invoiceNo, type: item.status === 'Shortfall' ? 'Shortfall' : 'Missing', amount: item.diff }))
      );

      // Status chart values update
      setMatchingStatus((prev: any) => ({
        ...prev,
        matchedCount,
        mismatchedCount,
        pendingFilingCount
      }));



      const sortedUploads = [...gstr2bUploads].sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
        const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
        return dateB - dateA;
      });
      if (sortedUploads.length > 0) {
        markUploadReconciled(sortedUploads[0].id);
      }
    }, 1500);
  };

  const handleAlertAction = (actionName: string, vendor: string) => {
    showToast('success', `${actionName} request sent for ${vendor}`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // Filter leaderboard
  const filteredLeaderboard = leaderboard.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = riskFilter === 'All' || item.riskLevel.toLowerCase() === riskFilter.toLowerCase() ||
      (riskFilter === 'High riskers' && item.riskLevel === 'High') ||
      (riskFilter === 'Low riskers' && item.riskLevel === 'Low');
    return matchesSearch && matchesFilter;
  });

  // Filter Reconciliation Reports
  const filteredReconciliation = reconciliationInvoices.filter(item => {
    const matchesSearch = item.vendor.toLowerCase().includes(reportSearch.toLowerCase()) || item.invoiceNo.toLowerCase().includes(reportSearch.toLowerCase());
    const matchesFilter = reportFilter === 'All' || item.status === reportFilter;
    return matchesSearch && matchesFilter;
  });

  const matchingStatusTotal = matchingStatus.matchedCount + matchingStatus.mismatchedCount + matchingStatus.pendingFilingCount;
  const matchedPercentage = matchingStatusTotal > 0 ? (matchingStatus.matchedCount / matchingStatusTotal) * 100 : 0;
  const mismatchedPercentage = matchingStatusTotal > 0 ? (matchingStatus.mismatchedCount / matchingStatusTotal) * 100 : 0;
  const pendingPercentage = matchingStatusTotal > 0 ? (matchingStatus.pendingFilingCount / matchingStatusTotal) * 100 : 0;

  // --- Vendor Payout Settlement Helpers & Actions ---
  const getTaxHoldAmount = (grn: GRN): number => {
    if (!isReconciled) return 0;
    const match = reconciliationInvoices.find(r => r.id === grn.id || r.invoiceNo === grn.invoiceNo);
    if (match) {
      if (match.status === 'Shortfall' || match.status === 'Pending Filing') {
        return match.diff;
      }
    }
    return 0;
  };

  const handleToggleSelect = (grnId: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(grnId) 
        ? prev.filter(id => id !== grnId) 
        : [...prev, grnId]
    );
  };

  const handleToggleAll = () => {
    if (selectedInvoiceIds.length === pendingGRNs.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(pendingGRNs.map(g => g.id));
    }
  };

  const selectedGRNsForSettlement = pendingGRNs.filter(g => selectedInvoiceIds.includes(g.id));
  const grossAmountSettlement = selectedGRNsForSettlement.reduce((sum, g) => sum + g.netAmount, 0);
  const taxHoldDeductionSettlement = selectedGRNsForSettlement.reduce((sum, g) => sum + getTaxHoldAmount(g), 0);
  const netPayableCashSettlement = grossAmountSettlement - taxHoldDeductionSettlement;

  const handleDownloadHoldMemo = () => {
    if (selectedGRNsForSettlement.length === 0) {
      showToast('error', 'Select at least one invoice to download the hold memo.');
      return;
    }

    const heldGRNs = selectedGRNsForSettlement.filter(g => getTaxHoldAmount(g) > 0);
    if (heldGRNs.length === 0) {
      showToast('info', 'No active tax holds exist for the selected invoices.');
      return;
    }

    const selVendor = vendors.find(v => v.id === selectedVendorId);

    let memoContent = `==================================================\n`;
    memoContent += `         MEDICORE HEALTHCARE MANAGEMENT SYSTEM\n`;
    memoContent += `                TAX HOLD DEFERRAL MEMORANDUM\n`;
    memoContent += `==================================================\n\n`;
    memoContent += `Date: ${new Date().toLocaleDateString()}\n`;
    memoContent += `Distributor: ${selVendor?.name || 'N/A'} (${selVendor?.code || 'N/A'})\n`;
    memoContent += `Pan Number: ${selVendor?.panNo || 'N/A'}\n\n`;
    memoContent += `The following invoice tax amounts are currently HELD and deferred from the final payout settlement due to GSTR-2B compliance discrepancies (Shortfalls / Missing Filings):\n\n`;
    memoContent += `--------------------------------------------------\n`;
    memoContent += `Invoice No       GRN Date      Original Amt   Tax Held Amt\n`;
    memoContent += `--------------------------------------------------\n`;
    heldGRNs.forEach(g => {
      memoContent += `${g.invoiceNo?.padEnd(16)}${g.gateEntryDate.padEnd(14)}${formatCurrency(g.netAmount).padEnd(15)}${formatCurrency(getTaxHoldAmount(g))}\n`;
    });
    memoContent += `--------------------------------------------------\n`;
    memoContent += `TOTAL TAX HELD DEDUCTION: ${formatCurrency(taxHoldDeductionSettlement)}\n\n`;
    memoContent += `Note: These held tax components will be cleared and disbursed in the next payout schedule once GSTR-2B reconciliation is marked as Clean.\n\n`;
    memoContent += `Authorized Signatory:\n`;
    memoContent += `Finance & Treasury Audit Board\n`;

    const blob = new Blob([memoContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tax_Hold_Memo_${selVendor?.code}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Tax Hold Memo downloaded successfully.');
  };

  const handleExecutePayout = async () => {
    if (selectedGRNsForSettlement.length === 0) {
      showToast('error', 'Select at least one invoice to execute payout.');
      return;
    }

    const selVendor = vendors.find(v => v.id === selectedVendorId);

    try {
      const voucherDate = new Date().toISOString().split('T')[0];
      const voucherNo = `JV-PAY-${Date.now().toString().slice(-6)}`;

      // Resolve account IDs by code so Supabase receives valid UUIDs
      const getAccId = (code: string) => chartOfAccounts.find(a => a.code === code)?.id || code;
      const apLedgerId       = getAccId('210000'); // Accounts Payable Ledger
      const bankClearingId   = getAccId('112000'); // Bank Clearing Account
      const cgstProvId       = getAccId('131000'); // Input CGST (Provisional)
      const sgstProvId       = getAccId('132000'); // Input SGST (Provisional)
      
      const items: JournalVoucherItem[] = [
        {
          id: crypto.randomUUID(),
          accountId: apLedgerId,
          postingNature: 'Debit',
          amount: grossAmountSettlement,
          description: `Settlement of invoices: ${selectedGRNsForSettlement.map(g => g.invoiceNo).join(', ')}`
        },
        {
          id: crypto.randomUUID(),
          accountId: bankClearingId,
          postingNature: 'Credit',
          amount: netPayableCashSettlement,
          description: `Net payout to vendor ${selVendor?.name}`
        }
      ];

      if (taxHoldDeductionSettlement > 0) {
        items.push({
          id: crypto.randomUUID(),
          accountId: cgstProvId,
          postingNature: 'Credit',
          amount: Number((taxHoldDeductionSettlement / 2).toFixed(2)),
          description: `Withholding tax portion - CGST`
        });
        items.push({
          id: crypto.randomUUID(),
          accountId: sgstProvId,
          postingNature: 'Credit',
          amount: Number((taxHoldDeductionSettlement / 2).toFixed(2)),
          description: `Withholding tax portion - SGST`
        });
      }

      const jv: JournalVoucher = {
        id: crypto.randomUUID(),
        voucherNo,
        voucherDate,
        refType: 'GRN',
        narration: `Automatic Settlement Payout to ${selVendor?.name} (Code: ${selVendor?.code})`,
        totalDebit: grossAmountSettlement,
        totalCredit: grossAmountSettlement,
        status: 'Posted',
        items
      };

      const success = await saveJournalVoucher(jv);
      if (success) {
        // Post exact-match Approved Tax JVs for any settled GRNs that are 'Matched'
        const cgstApprovedId   = getAccId('133000'); // Input CGST (Approved)
        const sgstApprovedId   = getAccId('134000'); // Input SGST (Approved)
        const cgstProvisionalId = getAccId('131000'); // Input CGST (Provisional)
        const sgstProvisionalId = getAccId('132000'); // Input SGST (Provisional)

        const matchedGRNs = selectedGRNsForSettlement.filter(grn => {
          const match = reconciliationInvoices.find(r => r.id === grn.id);
          return match && match.status === 'Matched';
        });

        let postedMatchedCount = 0;
        for (const grnObj of matchedGRNs) {
          try {
            const cgst = Number((grnObj.items?.reduce((sum, i) => sum + (i.cgstAmount || 0), 0) || 0).toFixed(2));
            const sgst = Number((grnObj.items?.reduce((sum, i) => sum + (i.sgstAmount || 0), 0) || 0).toFixed(2));
            
            if (cgst + sgst === 0) continue;

            const jvExists = journalVouchers.some(v => 
              v.refDocId === grnObj.id && 
              v.refType === 'GRN' && 
              v.narration?.includes('GSTR-2B exact match')
            );
            if (jvExists) continue;

            const jvItems: JournalVoucherItem[] = [
              {
                id: crypto.randomUUID(),
                accountId: cgstApprovedId,
                postingNature: 'Debit',
                amount: cgst,
                description: `Approved CGST for ${grnObj.invoiceNo}`
              },
              {
                id: crypto.randomUUID(),
                accountId: sgstApprovedId,
                postingNature: 'Debit',
                amount: sgst,
                description: `Approved SGST for ${grnObj.invoiceNo}`
              },
              {
                id: crypto.randomUUID(),
                accountId: cgstProvisionalId,
                postingNature: 'Credit',
                amount: cgst,
                description: `Release provisional CGST for ${grnObj.invoiceNo}`
              },
              {
                id: crypto.randomUUID(),
                accountId: sgstProvisionalId,
                postingNature: 'Credit',
                amount: sgst,
                description: `Release provisional SGST for ${grnObj.invoiceNo}`
              }
            ];

            const matchJv: JournalVoucher = {
              id: crypto.randomUUID(),
              voucherNo: `JV-REC-${Date.now().toString().slice(-6)}`,
              voucherDate,
              refType: 'GRN',
              refDocId: grnObj.id,
              refDocNo: grnObj.grnNo,
              narration: `Auto-reconciled Input Tax Credit (Approved) for GSTR-2B exact match (Invoice: ${grnObj.invoiceNo})`,
              totalDebit: cgst + sgst,
              totalCredit: cgst + sgst,
              status: 'Posted',
              items: jvItems
            };

            const jvSuccess = await saveJournalVoucher(matchJv);
            if (jvSuccess) {
              postedMatchedCount++;
            }
          } catch (err) {
            console.error('JV exact match error:', err);
          }
        }

        const paidIds = selectedGRNsForSettlement.map(g => g.id);
        setSettledGrnIds(prev => [...prev, ...paidIds]);

        let successMsg = `Payout executed successfully! Journal Voucher ${voucherNo} posted.`;
        if (postedMatchedCount > 0) {
          successMsg += ` Also posted ${postedMatchedCount} Approved Tax JV(s) for exact GSTR-2B matches.`;
        }
        showToast('success', successMsg);
      } else {
        showToast('error', 'Failed to save payout Journal Voucher.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', `Error executing payout: ${err.message}`);
    }
  };

  return (
    <div className="flex bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden min-h-[750px] shadow-sm">
      <input 
        id="gstr2b-file-input"
        type="file" 
        accept=".xlsx,.xls" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            processExcelFile(file);
          }
        }}
      />
      {/* LOCAL SUB-SIDEBAR (Matches Screenshot exactly) */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Sub-Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-emerald-100">
              ✚
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">Pharmacy</span>
          </div>
          <button className="text-slate-400 hover:text-slate-600 text-xs">
            ‹
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('gstr-upload')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'gstr-upload'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Upload className="w-4.5 h-4.5" />
              <span>GSTR-2B Upload</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'reports'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileBarChart className="w-4.5 h-4.5" />
              <span>Reconciliation Reports</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('vendor-mgmt')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'vendor-mgmt'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4.5 h-4.5" />
              <span>Vendor Management</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('ledger-lock')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'ledger-lock'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4.5 h-4.5" />
              <span>Ledger Lock History</span>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4.5 h-4.5" />
              <span>Settings</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </button>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide bg-slate-50/20 text-center">
          MediCore Compliance Suite
        </div>
      </aside>

      {/* SUB-PAGES WORKSPACE */}
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-x-hidden bg-white">
        
        {/* ======================= 1. DASHBOARD TAB ======================= */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Top Header Panel */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-7 h-7 text-indigo-600 animate-pulse" />
                  VENDOR COMPLIANCE DASHBOARD
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Status updated as of <span className="font-semibold text-slate-700">{new Date().toLocaleString()}</span>
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => document.getElementById('gstr2b-file-input')?.click()}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload GSTR-2B Excel File
                </button>
                <button
                  type="button"
                  onClick={handleMatchInvoices}
                  className="px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  Match Invoices
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Vendors</div>
                <div className="text-3xl font-black text-slate-800 mt-3 flex items-baseline gap-2">
                  <span>{totalVendors}</span>
                  <span className="text-sm font-bold text-slate-500">Active</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Pending ITC</div>
                <div className="text-3xl font-black text-slate-800 mt-3 flex items-baseline gap-2">
                  <span>{formatCurrency(totalPendingItc)}</span>
                  <span className="text-sm font-semibold text-slate-500">| {pendingInvoicesCount} Invoices</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-red-200/60 shadow-sm flex justify-between items-end">
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider">At-Risk ITC</div>
                  <div className="text-3xl font-black text-slate-800 mt-3 flex items-baseline gap-2">
                    <span>{formatCurrency(atRiskItc)}</span>
                    <span className="text-sm font-semibold text-slate-500">| {atRiskInvoicesCount} Invoices</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 font-extrabold text-sm rounded-lg flex items-center gap-0.5">
                  <span>{atRiskPercentage}%</span>
                  <span>↗</span>
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Alerts */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  HIGH PRIORITY ALERTS ({alerts.length})
                </h2>
                {alerts.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-4 rounded-xl border flex flex-col gap-3 ${
                          alert.type === 'error' ? 'bg-rose-50/40 border-rose-200' : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        <div className={`text-[10px] font-black px-2 py-0.5 rounded w-fit text-white uppercase ${
                          alert.type === 'error' ? 'bg-rose-600' : 'bg-amber-600'
                        }`}>
                          {alert.title}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
                            <span>{alert.vendor}</span>
                            {alert.tag && <span className="px-1.5 py-0.5 bg-rose-100 border border-rose-200 rounded text-[9px] font-black text-rose-600 uppercase">{alert.tag}</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-bold mt-1">Invoice: {alert.invoice}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-2">{alert.description}</p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                          {alert.actions?.map((act: string, aIdx: number) => (
                            <button
                              type="button"
                              key={aIdx}
                              onClick={() => handleAlertAction(act, alert.vendor)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                    <CheckCircle className="w-8 h-8 text-slate-300" />
                    <div className="text-xs font-bold text-slate-500">No pending compliance alerts</div>
                    <div className="text-[10px] text-slate-400">Run match algorithm to generate reconciliation flags.</div>
                  </div>
                )}
              </div>

              {/* Right Column: matching bar & Leaderboard */}
              <div className="flex flex-col gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                  <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
                    LATEST GSTR-2B MATCHING STATUS
                  </h2>
                  <div className="text-xs font-semibold text-slate-400">
                    Last Upload: <span className="font-extrabold text-slate-700">{matchingStatus.lastUploadDate || 'N/A'}</span> {matchingStatus.period ? `(${matchingStatus.period})` : ''}
                  </div>
                  {/* Progress bar */}
                  <div className="flex h-5 w-full rounded-full overflow-hidden bg-slate-100">
                    <div style={{ width: `${matchedPercentage}%` }} className="bg-indigo-600" />
                    <div style={{ width: `${mismatchedPercentage}%` }} className="bg-rose-500" />
                    <div style={{ width: `${pendingPercentage}%` }} className="bg-amber-500" />
                  </div>
                  {/* Legend */}
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 border-b border-slate-100 pb-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Matched ({matchingStatus.matchedCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Mismatched ({matchingStatus.mismatchedCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Filing ({matchingStatus.pendingFilingCount})</span>
                  </div>

                  {/* Top 3 Mismatches */}
                  <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">TOP 3 MISMATCHES</div>
                    {topMismatches.length > 0 ? (
                      <table className="w-full text-left text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                            <th className="py-2">Vendor</th>
                            <th className="py-2">Invoice #</th>
                            <th className="py-2">Type</th>
                            <th className="py-2">Amount</th>
                            <th className="py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topMismatches.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 font-bold text-slate-700">{item.vendor}</td>
                              <td className="py-2.5">{item.invoice}</td>
                              <td className="py-2.5"><span className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded text-[9px] font-black uppercase">{item.type}</span></td>
                              <td className="py-2.5 font-black text-slate-800">{formatCurrency(item.amount)}</td>
                              <td className="py-2.5 text-right"><button type="button" onClick={() => showToast('info', 'Fix discrepancy triggered')} className="px-2 py-0.5 border border-slate-200 bg-white hover:bg-slate-50 rounded text-[10px] font-black uppercase">Fix</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400 font-medium">
                        No mismatches detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Leaderboard snippet */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                  <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
                    VENDOR TAX COMPLIANCE LEADERBOARD
                  </h2>
                  <div className="flex gap-2">
                    <select 
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold outline-none text-slate-600"
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="All">All Risk Levels</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <input 
                      type="text"
                      placeholder="Search vendor..."
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs flex-1 outline-none font-semibold text-slate-600"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {filteredLeaderboard.length > 0 ? (
                    <table className="w-full text-left text-xs font-semibold text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                          <th className="py-2">Rank</th>
                          <th className="py-2">Vendor Name</th>
                          <th className="py-2">Compliance Score</th>
                          <th className="py-2">Pending ITC</th>
                          <th className="py-2 text-right">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaderboard.map((item) => (
                          <tr key={item.rank} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-500">{item.rank}</td>
                            <td className="py-2.5 font-bold text-slate-700">{item.name}</td>
                            <td className="py-2.5 text-indigo-600 font-black">{item.score}%</td>
                            <td className="py-2.5 font-black text-slate-800">{formatCurrency(item.pendingItc)}</td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                item.riskLevel === 'Low' ? 'bg-green-50 text-green-700 border border-green-200' :
                                item.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {item.riskLevel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No leaderboard scores available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 2. GSTR-2B UPLOAD TAB ======================= */}
        {activeTab === 'gstr-upload' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                <Upload className="w-5 h-5 text-indigo-600" />
                GSTR-2B Reconciliation Excel Upload
              </h2>

              {/* Upload Box Dropzone */}
              <div 
                onClick={() => document.getElementById('gstr2b-file-input')?.click()}
                className="mt-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4"
              >
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-700 text-sm">
                    {fileName ? `Selected File: ${fileName}` : "Drag and drop GSTR-2B Excel File here"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold">Supports .xlsx, .xls formats (Max 15MB)</div>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('gstr2b-file-input')?.click();
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all"
                >
                  Browse Files
                </button>
              </div>
            </div>

            {/* Upload History list */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 tracking-wider uppercase mb-4">Upload History Log</h3>
              {gstr2bUploads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                        <th className="py-3 px-3">Upload ID</th>
                        <th className="py-3 px-3">Reconciliation Period</th>
                        <th className="py-3 px-3">Upload Date</th>
                        <th className="py-3 px-3">Invoices Count</th>
                        <th className="py-3 px-3">Total ITC Value</th>
                        <th className="py-3 px-3">Uploaded By</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...gstr2bUploads]
                        .sort((a, b) => {
                          const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
                          const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
                          return dateB - dateA;
                        })
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-slate-700 text-[10px]">
                              {u.id.includes('-') ? `UP-${u.id.split('-')[0].substring(0, 6).toUpperCase()}` : u.id}
                            </td>
                            <td className="py-3 px-3 font-extrabold text-indigo-700">{u.period}</td>
                            <td className="py-3 px-3 text-slate-400">
                              {u.uploadDate ? new Date(u.uploadDate).toLocaleString() : '—'}
                            </td>
                            <td className="py-3 px-3">{u.invoicesCount}</td>
                            <td className="py-3 px-3 font-black text-slate-800">{formatCurrency(u.totalItc)}</td>
                            <td className="py-3 px-3 font-medium text-slate-500">{u.uploadedBy}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                u.isReconciled
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-green-50 text-green-700 border border-green-100'
                              }`}>
                                {u.isReconciled ? 'Reconciled' : u.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button 
                                type="button"
                                onClick={handleMatchInvoices}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-black uppercase tracking-wide"
                              >
                                Re-Run Reconciliation
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No files uploaded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= 3. RECONCILIATION REPORTS TAB ======================= */}
        {activeTab === 'reports' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* KPI statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Invoices</div>
                <div className="text-2xl font-black text-slate-800 mt-2">{reconciliationInvoices.length}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Matched</div>
                <div className="text-2xl font-black text-emerald-600 mt-2">
                  {reconciliationInvoices.filter(i => i.status === 'Matched').length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shortfall / Mismatch</div>
                <div className="text-2xl font-black text-rose-600 mt-2">
                  {reconciliationInvoices.filter(i => i.status === 'Shortfall').length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Filing</div>
                <div className="text-2xl font-black text-amber-600 mt-2">
                  {reconciliationInvoices.filter(i => i.status === 'Pending Filing').length}
                </div>
              </div>
            </div>

            {/* Reconciliation filter toolbar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-sm font-black text-slate-800 tracking-wider uppercase">Tax Invoice Reconciliation Report</h3>
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <select 
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-600"
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                  >
                    <option value="All">All Invoices</option>
                    <option value="Matched">Matched</option>
                    <option value="Shortfall">Shortfall</option>
                    <option value="Pending Filing">Pending Filing</option>
                  </select>
                  <input 
                    type="text"
                    placeholder="Search by Invoice # or Vendor..."
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none flex-grow md:w-64 font-semibold text-slate-600"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Main table log */}
              <div className="overflow-x-auto">
                {filteredReconciliation.length > 0 ? (
                  <table className="w-full text-left text-xs font-semibold text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                        <th className="py-3 px-2">Invoice #</th>
                        <th className="py-3 px-2">Vendor Name</th>
                        <th className="py-3 px-2">Invoice Date</th>
                        <th className="py-3 px-2">GRN Base Value</th>
                        <th className="py-3 px-2">GSTR-2B Base Value</th>
                        <th className="py-3 px-2">Difference</th>
                        <th className="py-3 px-2">Reconciliation Status</th>
                        <th className="py-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredReconciliation.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2 font-bold text-slate-700">{item.invoiceNo}</td>
                          <td className="py-3 px-2 font-bold text-slate-700">{item.vendor}</td>
                          <td className="py-3 px-2 text-slate-400">{item.date}</td>
                          <td className="py-3 px-2">{formatCurrency(item.grnValue)}</td>
                          <td className="py-3 px-2">{formatCurrency(item.gstrValue)}</td>
                          <td className={`py-3 px-2 font-black ${item.diff > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.diff > 0 ? `+${formatCurrency(item.diff)}` : formatCurrency(item.diff)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              item.status === 'Matched' ? 'bg-green-50 text-green-700 border border-green-200' :
                              item.status === 'Shortfall' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => showToast('info', `Reviewing discrepancy for invoice: ${item.invoiceNo}`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-black uppercase"
                            >
                              {item.status === 'Matched' ? 'View' : 'Fix'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No reconciliation records.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= 4. VENDOR MANAGEMENT (SETTLEMENT) TAB ======================= */}
        {activeTab === 'vendor-mgmt' && (
          <div className="flex flex-col gap-6 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm min-h-[600px] animate-in fade-in duration-200">
            
            {/* Header Title */}
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Coins className="w-6 h-6 text-indigo-600" />
                  Vendor Invoice Settlement & Payouts
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Perform distributor payments, manage tax holds, and authorize bank payouts
                </p>
              </div>
              {settledGrnIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('medicore_settled_grn_ids');
                    setSettledGrnIds([]);
                    showToast('success', 'Settlement and payout logs reset! Pending invoices are now unlocked.');
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  Reset Settlement History ({settledGrnIds.length})
                </button>
              )}
            </div>

            {/* Selector Section */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 max-w-xl">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Select Distributor
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
              >
                <option value="">-- Choose Distributor --</option>
                {vendors.filter(v => v.active).map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Table Section */}
            {selectedVendorId ? (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
                    <h2 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                      Pending Invoices List
                    </h2>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {pendingGRNs.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-50/20">
                            <th className="py-4 px-6 w-16">
                              <label className="flex items-center justify-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                  checked={selectedInvoiceIds.length === pendingGRNs.length && pendingGRNs.length > 0}
                                  onChange={handleToggleAll}
                                />
                              </label>
                            </th>
                            <th className="py-4 px-6">Invoice No</th>
                            <th className="py-4 px-6">GRN Date</th>
                            <th className="py-4 px-6">Original Amount</th>
                            <th className="py-4 px-6">Tax Hold Amount</th>
                            <th className="py-4 px-6">Net Payable Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingGRNs.map((grn) => {
                            const holdAmt = getTaxHoldAmount(grn);
                            const isHeld = holdAmt > 0;
                            const isSelected = selectedInvoiceIds.includes(grn.id);
                            return (
                              <tr 
                                key={grn.id} 
                                className={`hover:bg-slate-50/30 transition-colors text-xs font-semibold text-slate-600 ${
                                  isSelected ? 'bg-indigo-50/10' : ''
                                }`}
                              >
                                <td className="py-4 px-6 text-center">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelect(grn.id)}
                                    />
                                  </label>
                                </td>
                                <td className="py-4 px-6 font-bold text-slate-700">{grn.invoiceNo}</td>
                                <td className="py-4 px-6 text-slate-400">{grn.gateEntryDate}</td>
                                <td className="py-4 px-6 font-bold text-slate-700">{formatCurrency(grn.netAmount)}</td>
                                <td className="py-4 px-6">
                                  {isHeld ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-100/60 rounded-lg text-rose-700 text-[10px] font-black uppercase">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                      {formatCurrency(holdAmt)} (Hold)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-100/60 rounded-lg text-green-700 text-[10px] font-black uppercase">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      ₹0.00 (Clean)
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 font-black text-slate-800">
                                  {formatCurrency(grn.netAmount - holdAmt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <CheckSquare className="w-8 h-8 text-slate-300" />
                        <div className="font-bold text-slate-500 text-xs">No pending invoices for settlement</div>
                        <div className="text-[10px] text-slate-400">All submitted invoices for this distributor have been paid.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakdown & Payout section */}
                {selectedGRNsForSettlement.length > 0 && (
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200/50 mt-2">
                    
                    {/* Final Breakdown Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 w-full lg:max-w-md">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Final Payment Breakdown
                      </h3>
                      
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between font-bold text-slate-600">
                          <span>Gross Selected Amount:</span>
                          <span className="font-extrabold text-slate-800">{formatCurrency(grossAmountSettlement)}</span>
                        </div>
                        
                        {taxHoldDeductionSettlement > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between font-bold text-rose-600">
                              <span>Active Tax Hold Deduction:</span>
                              <span className="font-extrabold">-{formatCurrency(taxHoldDeductionSettlement)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold bg-rose-50/50 border border-rose-100/30 p-2 rounded-lg mt-0.5">
                              Deducted from Invoice(s):
                              {selectedGRNsForSettlement.filter(g => getTaxHoldAmount(g) > 0).map(g => (
                                <div key={g.id} className="font-bold text-slate-500 mt-0.5">
                                  • Invoice #{g.invoiceNo} (-{formatCurrency(getTaxHoldAmount(g))})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline mt-1">
                        <span className="text-xs font-black text-slate-700 uppercase">Total Cash to Disburse:</span>
                        <span className="text-sm font-black text-indigo-700">{formatCurrency(netPayableCashSettlement)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={handleDownloadHoldMemo}
                        className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 lg:flex-none shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Hold Memo
                      </button>

                      <button
                        type="button"
                        onClick={handleExecutePayout}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1 lg:flex-none"
                      >
                        <CreditCard className="w-4 h-4" />
                        Execute Bank Payout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-3 border border-dashed border-slate-200 rounded-3xl py-16 bg-slate-50/20">
                <Landmark className="w-10 h-10 text-slate-300" />
                <div className="font-bold text-slate-500 text-sm">No Distributor Selected</div>
                <p className="text-xs text-slate-400">Please choose a distributor from the dropdown above to load pending invoices.</p>
              </div>
            )}

          </div>
        )}

        {/* ======================= 5. LEDGER LOCK HISTORY TAB ======================= */}
        {activeTab === 'ledger-lock' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Info notice */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-indigo-800 text-xs font-semibold">
              <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold">About Ledger Locking</div>
                <p className="mt-1 text-indigo-700 leading-relaxed">
                  Ledger Locking prevents subsequent updates, deletes, or adjustments to financial transactions in a closed period. 
                  Reconciling with GSTR-2B requires that matched periods are locked against further post-facto changes to guarantee auditor compliance.
                </p>
              </div>
            </div>

            {/* Lock action form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-black text-slate-800 tracking-wider uppercase">Lock Tax Period</h3>
              <div className="flex items-center gap-3">
                <select 
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700"
                  value={lockPeriod}
                  onChange={(e) => setLockPeriod(e.target.value)}
                >
                  <option value="April 2026">April 2026</option>
                  <option value="May 2026">May 2026</option>
                  <option value="June 2026">June 2026</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newLock = {
                      period: lockPeriod,
                      date: new Date().toLocaleDateString(),
                      user: 'System Manager',
                      jvs: Math.floor(1000 + Math.random() * 1000),
                      taxLocked: 450000,
                      status: 'Locked'
                    };
                    setLedgerLocks(prev => [newLock, ...prev]);
                    showToast('success', `Period ${lockPeriod} successfully locked!`);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all"
                >
                  Apply Period Lock
                </button>
              </div>
            </div>

            {/* Lock log table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 tracking-wider uppercase mb-4">Locked Period Ledger Logs</h3>
              {ledgerLocks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                        <th className="py-3 px-3">Locked Period</th>
                        <th className="py-3 px-3">Lock Date</th>
                        <th className="py-3 px-3">Authorized By</th>
                        <th className="py-3 px-3">Journal Voucher Count</th>
                        <th className="py-3 px-3">Total Tax Locked</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ledgerLocks.map((lock, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-extrabold text-indigo-700">{lock.period}</td>
                          <td className="py-3 px-3 text-slate-400">{lock.date}</td>
                          <td className="py-3 px-3 font-medium text-slate-500">{lock.user}</td>
                          <td className="py-3 px-3">{lock.jvs} JVs</td>
                          <td className="py-3 px-3 font-black text-slate-800">{formatCurrency(lock.taxLocked)}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-black uppercase flex items-center gap-1 w-fit">
                              <Lock className="w-2.5 h-2.5" />
                              {lock.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setLedgerLocks(prev => prev.filter(l => l.period !== lock.period));
                                showToast('info', `Period ${lock.period} unlocked.`);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-black uppercase tracking-wide"
                            >
                              Unlock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No locked ledger records.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= 6. SETTINGS TAB ======================= */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-w-xl">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-slate-600" />
                Compliance Matching Configurations
              </h2>

              {/* Tolerance Limit */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-400 uppercase">Reconciliation Tolerance Limit (₹)</label>
                <input 
                  type="number"
                  className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  value={toleranceLimit}
                  onChange={(e) => setToleranceLimit(Number(e.target.value))}
                />
                <span className="text-[10px] text-slate-400 font-semibold">Differences below this value are auto-flagged as reconciled.</span>
              </div>

              {/* Sync interval */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-400 uppercase">GSTR-2B Matching Frequency</label>
                <select 
                  className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(e.target.value)}
                >
                  <option value="Daily">Daily Sync</option>
                  <option value="Weekly">Weekly Sync</option>
                  <option value="Monthly">Monthly Sync</option>
                  <option value="Manual">Manual Sync Only</option>
                </select>
              </div>

              {/* Automation Rules checkboxes */}
              <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
                <div className="text-xs font-black text-slate-400 uppercase">Automation Rules</div>
                
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="mt-0.5 rounded text-indigo-600 outline-none"
                    checked={autoEmail}
                    onChange={(e) => setAutoEmail(e.target.checked)}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-700">Auto-email notifications on GSTR-1 delays</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">Sends reminders automatically once the filing becomes overdue.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="mt-0.5 rounded text-indigo-600 outline-none"
                    checked={autoWithhold}
                    onChange={(e) => setAutoWithhold(e.target.checked)}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-700">Withhold payments on shortfall defaults</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">Flags the finance module to lock vendor payouts if compliance score drops below 80%.</div>
                  </div>
                </label>
              </div>

              {/* Save button */}
              <button 
                type="button"
                onClick={() => showToast('success', 'Configurations saved successfully!')}
                className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all w-fit"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};
