import React from 'react';
import { Bill, Patient, Employee } from '../../types';

interface PharmacyInvoiceReportProps {
  bill: Bill;
  patient?: Patient;
  doctor?: Employee;
  userName?: string;
  onClose: () => void;
}

export const PharmacyInvoiceReport: React.FC<PharmacyInvoiceReportProps> = ({ 
  bill, 
  patient, 
  doctor, 
  userName = 'pharma2',
  onClose 
}) => {
  const handlePrint = () => {
    window.print();
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const totalQty = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto p-8 print:p-0">
      {/* Control Buttons (Hidden on Print) */}
      <div className="flex justify-end gap-4 mb-8 print:hidden">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
        >
          Close
        </button>
        <button 
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2"
        >
          Print Invoice
        </button>
      </div>

      {/* Report Container */}
      <div className="max-w-[800px] mx-auto bg-white p-6 print:p-4 text-slate-800 font-sans border border-slate-100 shadow-xl print:shadow-none print:border-none">
        
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {bill.totalAmount < 0 ? 'Sales Return (Credit Note)' : 'Simplified Tax Invoice'}
          </h1>
        </div>

        {/* Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mb-8 text-sm">
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Invoice No</span>
            <span className="mr-2">:</span>
            <span>{bill.invoiceNo || bill.id}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Date</span>
            <span className="mr-2">:</span>
            <span>{new Date(bill.date).toLocaleString()}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Customer</span>
            <span className="mr-2">:</span>
            <span>{patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in'}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Patient</span>
            <span className="mr-2">:</span>
            <span className="uppercase">{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Nationality</span>
            <span className="mr-2">:</span>
            <span className="uppercase">{(patient as any)?.nationality || 'YEMENITE'}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Age</span>
            <span className="mr-2">:</span>
            <span>{calculateAge(patient?.dob)}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">Doctor</span>
            <span className="mr-2">:</span>
            <span className="uppercase">
                {doctor ? `Dr ${doctor.firstName} ${doctor.lastName}` : 
                 (bill as any).doctorId ? 'Finding...' : 'N/A'}
            </span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">File No</span>
            <span className="mr-2">:</span>
            <span className="uppercase">{patient?.id || 'N/A'}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32 shrink-0">User Id</span>
            <span className="mr-2">:</span>
            <span>{(bill as any).createdBy || userName}</span>
          </div>
        </div>

        {/* Logo Placeholder */}
        <div className="w-full bg-slate-50 border border-slate-200 py-4 text-center text-slate-400 text-xs mb-6 italic">
          The resource of this report item is not reachable.
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left">
              <th className="py-2 pr-4 font-bold">Sl.No</th>
              <th className="py-2 pr-4 font-bold">Description</th>
              <th className="py-2 pr-4 font-bold text-center">Qty</th>
              <th className="py-2 pr-4 font-bold text-right">Gross</th>
              <th className="py-2 pr-4 font-bold text-right">Disc</th>
              <th className="py-2 pr-4 font-bold text-right">Vat</th>
              <th className="py-2 font-bold text-right">Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bill.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="py-4 pr-4 align-top">{idx + 1}</td>
                <td className="py-4 pr-4 align-top max-w-[200px]">
                  <div className="font-bold uppercase leading-tight">{item.description}</div>
                  <div className="text-[10px] text-slate-500">EACH, 1</div>
                </td>
                <td className="py-4 pr-4 align-top text-center">{Math.abs(item.quantity)}</td>
                <td className="py-4 pr-4 align-top text-right">{item.unitPrice.toFixed(2)}</td>
                <td className="py-4 pr-4 align-top text-right">{Math.abs(item.discountAmount || 0).toFixed(2)}</td>
                <td className="py-4 pr-4 align-top text-right">{Math.abs(item.taxAmount || 0).toFixed(2)}</td>
                <td className="py-4 align-top text-right font-bold">{Math.abs(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900 font-bold">
              <td className="py-3" colSpan={2}>Total</td>
              <td className="py-3 text-center">{Math.abs(totalQty)}</td>
              <td className="py-3 text-right">{Math.abs(bill.totalAmount + (bill.discountAmount || 0)).toFixed(2)}</td>
              <td className="py-3 text-right">{Math.abs(bill.discountAmount || 0).toFixed(2)}</td>
              <td className="py-3 text-right">{Math.abs(bill.taxAmount || 0).toFixed(2)}</td>
              <td className="py-3 text-right">{Math.abs(bill.totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Details Box */}
        <div className="border-4 border-slate-900 p-4 mb-4">
          <div className="space-y-1 text-sm font-bold">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Total Qty</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{Math.abs(totalQty)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Total Gross</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{Math.abs(bill.totalAmount + (bill.discountAmount || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Total Disc.</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{Math.abs(bill.discountAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1 text-base text-slate-950">
              <span className="w-48">Grand Total</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{Math.abs(bill.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Total Vat</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{Math.abs(bill.taxAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="w-48">Net Amount</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4">{bill.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Deductible Box */}
        <div className="border-4 border-slate-900 p-4">
          <div className="space-y-1 text-sm font-bold">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Deductible</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4"></span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Vat on Deductible</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4"></span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="w-48">Net Ded.</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4"></span>
            </div>
            <div className="flex justify-between">
              <span className="w-48">Net Cash</span>
              <span>:</span>
              <span className="flex-1 text-left ml-4"></span>
            </div>
          </div>
        </div>

        {/* Footer Remarks */}
        <div className="mt-8 text-[10px] text-slate-400 text-center">
          Generated via HIS System - Simplified Tax Invoice for Pharmacy Dispensing
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-full { max-width: 100% !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};
