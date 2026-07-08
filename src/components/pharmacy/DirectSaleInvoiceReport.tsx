import React from 'react';
import { DirectSale } from '../../types';
import { useData } from '../../context/DataContext';
import { X, Printer } from 'lucide-react';

interface DirectSaleInvoiceReportProps {
  sale: DirectSale;
  onClose: () => void;
}

const Barcode: React.FC<{ value: string }> = ({ value }) => {
  // Clean fake barcode pattern for visual realism
  const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pattern = Array.from({ length: 45 }, (_, i) => ((seed + i * 7) % 3 === 0 || (seed + i * 13) % 4 === 0) ? '1' : '0');
  
  return (
    <div className="flex flex-col items-center">
      <svg className="h-10 w-64" viewBox="0 0 100 20" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="20" fill="white" />
        <g fill="black">
          {pattern.map((bar, idx) => {
            if (bar === '1') {
              const x = 5 + idx * 2;
              const width = (idx % 5 === 0) ? 1.5 : 0.8;
              return <rect key={idx} x={x} y="1" width={width} height="18" />;
            }
            return null;
          })}
        </g>
      </svg>
      <span className="text-[10px] font-mono tracking-[0.2em] text-slate-500 mt-1">{value}</span>
    </div>
  );
};

export const DirectSaleInvoiceReport: React.FC<DirectSaleInvoiceReportProps> = ({ sale, onClose }) => {
  const { stores, branches, formatCurrency, selectedCurrency } = useData();
  const decimals = selectedCurrency === 'BHD' ? 3 : 2;
  
  // Find store and branch/hospital
  const store = stores.find(s => s.id === sale.storeId);
  const branch = store ? branches.find(b => b.id === store.branchId) : null;
  const hospitalName = branch?.name || 'MediCore - HIMS';
  const vatRegNo = branch?.vatRegNo || '310358458600003';

  // Calculations
  const calculatedItems = sale.items.map(item => {
    const taxPercentage = item.taxPercentage || 0;
    const netAmount = item.totalPrice;
    
    // Reverse engineer base amount and tax
    // netAmount = baseAmount * (1 + taxPercentage / 100)
    // baseAmount = netAmount / (1 + taxPercentage / 100)
    const baseAmount = netAmount / (1 + taxPercentage / 100);
    const taxAmount = netAmount - baseAmount;
    const rateBeforeTax = item.unitPrice / (1 + taxPercentage / 100);

    return {
      ...item,
      rateBeforeTax: Number(rateBeforeTax.toFixed(4)),
      baseAmount: Number(baseAmount.toFixed(decimals)),
      taxAmount: Number(taxAmount.toFixed(decimals)),
      taxPercentage
    };
  });

  const subtotalBeforeTax = calculatedItems.reduce((sum, item) => sum + item.baseAmount, 0);
  const totalTax = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalDiscount = 0; // Direct sales do not have discounts currently
  const roundOff = 0.00;
  const grandTotal = sale.totalAmount;

  // Group VAT for breakdown table
  const vatBreakdown = calculatedItems.reduce((acc, item) => {
    const pct = item.taxPercentage;
    if (pct > 0) {
      if (!acc[pct]) {
        acc[pct] = { taxableAmount: 0, vatAmount: 0 };
      }
      acc[pct].taxableAmount += item.baseAmount;
      acc[pct].vatAmount += item.taxAmount;
    }
    return acc;
  }, {} as Record<number, { taxableAmount: number, vatAmount: number }>);

  const handlePrint = () => {
    window.print();
  };

  const patientName = [sale.firstName, sale.middleName, sale.lastName].filter(Boolean).join(' ');

  return (
    <div id="invoice-print-container" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4 md:p-6 print:p-0 print:bg-white print:relative print:inset-auto">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-4 overflow-hidden border border-slate-100 print:shadow-none print:border-none print:my-0 print:rounded-none">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex justify-between items-center bg-slate-50 px-6 py-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">Print Preview</span>
            <span className="text-slate-500 text-xs">Direct Sale Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Bill
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print-ready Invoice Document */}
        <div id="direct-sale-invoice-content" className="flex-1 p-8 space-y-6 bg-white overflow-y-auto text-slate-800 text-xs leading-relaxed font-sans print:p-0 print:overflow-visible">
          
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">{hospitalName}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pharmacy Bill & Receipt</p>
          </div>

          {/* Barcode & VAT No Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">VAT Registration Number</span>
              <span className="text-sm font-bold text-slate-800 tracking-wider font-mono">{vatRegNo}</span>
            </div>
            {sale.invoiceNo && <Barcode value={sale.invoiceNo} />}
          </div>

          {/* Patient / Billing Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 print:bg-transparent print:border-slate-300 print:rounded-none">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MRN</span>
              <span className="font-semibold text-slate-700">-</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
              <span className="font-bold text-slate-800">{patientName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age / Gender</span>
              <span className="font-semibold text-slate-700">{sale.age} {sale.ageUnit} / {sale.gender || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visit No</span>
              <span className="font-semibold text-slate-700">N/A</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Referred Doctor</span>
              <span className="font-semibold text-slate-700">{sale.referredDoctor || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill / Invoice No</span>
              <span className="font-bold text-blue-700 font-mono">{sale.invoiceNo || sale.saleNo}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill Date</span>
              <span className="font-semibold text-slate-700">{new Date(sale.saleDate).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sponsor Name</span>
              <span className="font-bold text-slate-800">{sale.isInsured ? 'Insured' : 'Self Pay'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Policy No</span>
              <span className="font-semibold text-slate-700">-</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Store</span>
              <span className="font-semibold text-slate-700">{store?.storeName || 'Pharmacy Store'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 print:bg-transparent print:border-b">
                  <th className="py-2 px-1">Code</th>
                  <th className="py-2 px-1 w-1/3">Particulars</th>
                  <th className="py-2 px-1 text-right">Qty</th>
                  <th className="py-2 px-1 text-right">Rate</th>
                  <th className="py-2 px-1">UOM</th>
                  <th className="py-2 px-1 text-right">Patient Amt</th>
                  <th className="py-2 px-1 text-right">Sponsor Amt</th>
                  <th className="py-2 px-1 text-right">Amount</th>
                  <th className="py-2 px-1 text-right">Discount</th>
                  <th className="py-2 px-1 text-right">VAT%</th>
                  <th className="py-2 px-1 text-right">Net Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-y-0">
                {calculatedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                    <td className="py-2.5 px-1 font-mono text-[10px] text-slate-500">{item.itemCode}</td>
                    <td className="py-2.5 px-1">
                      <div className="font-bold text-slate-800">{item.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {item.batchNo} {item.expiryDate && `| Exp: ${new Date(item.expiryDate).toLocaleDateString()}`}</div>
                    </td>
                    <td className="py-2.5 px-1 text-right font-semibold">{item.quantity}</td>
                    <td className="py-2.5 px-1 text-right font-mono">{(item.rateBeforeTax).toFixed(decimals)}</td>
                    <td className="py-2.5 px-1 uppercase text-slate-500 text-[10px]">{item.unit || 'Tablets'}</td>
                    <td className="py-2.5 px-1 text-right font-mono">{item.totalPrice.toFixed(decimals)}</td>
                    <td className="py-2.5 px-1 text-right font-mono">{(0).toFixed(decimals)}</td>
                    <td className="py-2.5 px-1 text-right font-mono">{item.baseAmount.toFixed(decimals)}</td>
                    <td className="py-2.5 px-1 text-right font-mono">{(0).toFixed(decimals)}</td>
                    <td className="py-2.5 px-1 text-right font-semibold text-slate-600">{item.taxPercentage}%</td>
                    <td className="py-2.5 px-1 text-right font-bold font-mono">{item.totalPrice.toFixed(decimals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotals & VAT Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-100">
            {/* VAT Summary Table (Left) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">VAT Summary Breakdown</span>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-1">Tax Description</th>
                    <th className="py-1 text-right">Taxable Amount</th>
                    <th className="py-1 text-right">VAT Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(vatBreakdown).map(([pct, val]) => (
                    <tr key={pct}>
                      <td className="py-1.5 text-slate-600">VAT {pct}%</td>
                      <td className="py-1.5 text-right">{val.taxableAmount.toFixed(decimals)}</td>
                      <td className="py-1.5 text-right">{val.vatAmount.toFixed(decimals)}</td>
                    </tr>
                  ))}
                  {Object.keys(vatBreakdown).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-slate-400 italic">No taxable items in this bill</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-slate-200 text-slate-800">
                    <td className="py-1.5">Total Tax (VAT)</td>
                    <td className="py-1.5 text-right">{(grandTotal - totalTax).toFixed(decimals)}</td>
                    <td className="py-1.5 text-right">{totalTax.toFixed(decimals)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subtotal details (Right) */}
            <div className="flex flex-col justify-end items-end space-y-1.5">
              <div className="flex justify-between w-64 text-slate-500 font-medium">
                <span>Total Before Round Off:</span>
                <span className="font-mono">{subtotalBeforeTax.toFixed(decimals)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-500 font-medium">
                <span>Add: Total Taxes (VAT):</span>
                <span className="font-mono">{totalTax.toFixed(decimals)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-500 font-medium">
                <span>Less: Total Discount:</span>
                <span className="font-mono">-{totalDiscount.toFixed(decimals)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-500 font-medium border-b border-slate-100 pb-1.5">
                <span>Round Off:</span>
                <span className="font-mono">{roundOff.toFixed(decimals)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-900 font-extrabold text-sm border-b-2 border-slate-200 pb-1">
                <span>Grand Total:</span>
                <span className="font-mono text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Details</span>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider print:bg-transparent print:border-b">
                  <th className="py-1.5 px-1">Sl No</th>
                  <th className="py-1.5 px-1">Receipt No</th>
                  <th className="py-1.5 px-1 text-right">Amount</th>
                  <th className="py-1.5 px-1">Payment Mode</th>
                  <th className="py-1.5 px-1">Ref No / Card Details</th>
                  <th className="py-1.5 px-1">Instrument Details</th>
                  <th className="py-1.5 px-1">Instrument Date</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-slate-100 print:divide-y-0">
                <tr>
                  <td className="py-2 px-1">1</td>
                  <td className="py-2 px-1 text-blue-700">{sale.receiptNo || 'RCP-26000001'}</td>
                  <td className="py-2 px-1 text-right font-bold">{grandTotal.toFixed(decimals)}</td>
                  <td className="py-2 px-1 font-sans">{sale.paymentMode || 'Cash'}</td>
                  <td className="py-2 px-1">{sale.referenceNo || '-'}</td>
                  <td className="py-2 px-1 font-sans text-[10px]">{sale.paymentMode === 'UPI' && sale.pgOrderId ? `PG Order: ${sale.pgOrderId}` : '-'}</td>
                  <td className="py-2 px-1 font-sans">{new Date(sale.saleDate).toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary columns: Patient details vs Sponsor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t-2 border-slate-200/80">
            {/* Patient details block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2 print:bg-transparent print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Patient Summary ({selectedCurrency})</span>
              <div className="space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between"><span>Patient Gross Amount:</span><span className="font-mono">{grandTotal.toFixed(decimals)}</span></div>
                <div className="flex justify-between"><span>Patient Discount Amount:</span><span className="font-mono">{(0).toFixed(decimals)}</span></div>
                <div className="flex justify-between"><span>Patient VAT Amount:</span><span className="font-mono">{totalTax.toFixed(decimals)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-800 text-sm font-bold">
                  <span>Patient Net Amount Payable:</span>
                  <span className="font-mono text-blue-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Sponsor details block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2 print:bg-transparent print:border-slate-300 print:rounded-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sponsor Summary ({selectedCurrency})</span>
              <div className="space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between"><span>Sponsor Gross Amount:</span><span className="font-mono">{(0).toFixed(decimals)}</span></div>
                <div className="flex justify-between"><span>Sponsor Discount Amount:</span><span className="font-mono">{(0).toFixed(decimals)}</span></div>
                <div className="flex justify-between"><span>Sponsor VAT Amount:</span><span className="font-mono">{(0).toFixed(decimals)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-800 text-sm font-bold">
                  <span>Sponsor Net Amount Payable:</span>
                  <span className="font-mono">{(0).toFixed(decimals)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer print note */}
          <div className="text-center pt-8 text-[10px] text-slate-400 uppercase tracking-widest border-t border-slate-100">
            Thank you for using our services. This is a computer-generated invoice.
          </div>

        </div>

      </div>

      {/* Tailwind Print Overrides stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-container, #invoice-print-container * {
            visibility: visible;
          }
          #invoice-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          .print\\:border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          .print\\:rounded-none {
            border-radius: 0px !important;
          }
          .print\\:divide-y-0 > * {
            border-bottom-width: 0px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
      `}} />
    </div>
  );
};
