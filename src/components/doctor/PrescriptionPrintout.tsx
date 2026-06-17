import React from 'react';
import { Prescription, Patient, Diagnosis, Allergy, VitalSign, Employee } from '../../types';
import { useData } from '../../context/DataContext';

interface PrescriptionPrintoutProps {
    prescription: Prescription;
    patient: Patient;
    doctor?: Employee;
    diagnoses: Diagnosis[];
    allergies: Allergy[];
    vitals?: VitalSign;
    onClose: () => void;
}

export const PrescriptionPrintout: React.FC<PrescriptionPrintoutProps> = ({
    prescription,
    patient,
    doctor,
    diagnoses,
    allergies,
    vitals,
    onClose
}) => {
    const { departments, inventoryItems } = useData();
    const primaryDiag = diagnoses.find(d => d.type === 'Primary' || d.type === 'Provisional');
    const secondaryDiag = diagnoses.find(d => d.type === 'Secondary');
    const activeAllergy = allergies.length > 0 ? allergies.map(a => a.allergen).join(', ') : 'NKA';

    const docDept = doctor?.departmentId 
        ? (departments.find(d => d.id === doctor.departmentId)?.name || "Reception") 
        : "Reception";
    
    // Auto-print on mount
    React.useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

    return (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto p-0 m-0 print:static print:inset-auto">
            {/* Control Bar - Hidden on print */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden">
                <p className="font-bold">Prescription Print Preview</p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-sm transition-all"
                    >
                        Print Now
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded font-bold text-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Print Content Area */}
            <div className="max-w-[210mm] mx-auto bg-white p-[10mm] text-slate-900 font-sans leading-tight">
                
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-blue-700 tracking-widest uppercase">Prescription Form</h1>
                    <div className="h-0.5 bg-blue-700 w-full mt-1"></div>
                </div>

                {/* Patient Information Grid */}
                <div className="grid grid-cols-12 border border-slate-400">
                    <div className="col-span-8 border-r border-slate-400">
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold text-[11px]">Patient Name</div>
                            <div className="col-span-9 p-1.5 text-sm font-bold flex justify-between">
                                <span>{patient.firstName} {patient.lastName}</span>
                                <span className="font-arabic">{patient.arabicName || ""}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold text-[11px]">MRN</div>
                            <div className="col-span-9 p-1.5 text-sm font-mono tracking-tight font-bold">{patient.id.slice(-8).toUpperCase()}</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">ID No.</div>
                            <div className="col-span-9 p-1.5 font-medium">{patient.nationalId || ""}</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">Sex / Age</div>
                            <div className="col-span-9 p-1.5 font-medium uppercase">{patient.gender} / {age} Years</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">Department</div>
                            <div className="col-span-9 p-1.5 font-medium uppercase">{docDept}</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">Weight</div>
                            <div className="col-span-9 p-1.5 font-medium">{vitals?.weight ? `${vitals.weight} KG` : ''}</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 border-b border-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">Policy No.</div>
                            <div className="col-span-9 p-1.5 font-medium">{patient.policyNo || ""}</div>
                        </div>
                        <div className="grid grid-cols-12 divide-x divide-slate-400 text-[11px]">
                            <div className="col-span-3 bg-slate-100 p-1.5 font-bold">Card No.</div>
                            <div className="col-span-9 p-1.5 font-medium">{patient.cardNo || ""}</div>
                        </div>
                    </div>
 
                    <div className="col-span-4 flex flex-col items-center justify-start p-4 bg-white">
                         {/* Simple Barcode Placeholder */}
                         <div className="w-full h-16 bg-white flex flex-col items-center">
                            <div className="flex w-full h-12 gap-[1px]">
                                {[...Array(60)].map((_, i) => (
                                    <div key={i} className={`flex-1 ${Math.random() > 0.4 ? 'bg-black' : 'bg-white'}`}></div>
                                ))}
                            </div>
                            <span className="text-[10px] font-mono mt-1">{prescription.id.slice(0, 18).toUpperCase()}</span>
                         </div>
                         
                         <div className="w-full mt-4 space-y-1.5 text-[10px]">
                            <div className="flex justify-between border-b pb-0.5 border-slate-200">
                                <span className="font-bold">Mobile No.</span>
                                <span>{patient.phone}</span>
                            </div>
                            <div className="flex justify-between border-b pb-0.5 border-slate-200">
                                <span className="font-bold">Encounter Date</span>
                                <span>{new Date(prescription.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between border-b pb-0.5 border-slate-200">
                                <span className="font-bold">Allergy</span>
                                <span className="text-red-600 font-bold">{activeAllergy}</span>
                            </div>
                            <div className="flex justify-between border-b pb-0.5 border-slate-200">
                                <span className="font-bold">Sponsor</span>
                                <span className="truncate max-w-[120px]">{patient.sponsorName || "CASH"}</span>
                            </div>
                            <div className="flex justify-between border-b pb-0.5 border-slate-200">
                                <span className="font-bold">Validity</span>
                                <span></span>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Diagnosis Section */}
                <div className="grid grid-cols-2 divide-x divide-slate-400 border-x border-b border-slate-400 bg-emerald-50/20">
                    <div className="p-1 px-2">
                        <span className="text-[10px] font-bold block">Primary Diagnosis</span>
                        <p className="text-xs font-medium min-h-[1.5rem]">{primaryDiag?.description || ''}</p>
                    </div>
                    <div className="p-1 px-2">
                        <span className="text-[10px] font-bold block">Secondary Diagnosis</span>
                        <p className="text-xs font-medium min-h-[1.5rem]">{secondaryDiag?.description || ''}</p>
                    </div>
                </div>

                {/* Medication Table */}
                <table className="w-full mt-4 border-collapse border border-slate-400 text-[10px]">
                    <thead className="bg-emerald-50 text-slate-800 font-bold">
                        <tr className="divide-x divide-slate-400">
                            <th className="p-1.5 border-b border-slate-400 text-left w-2/5">Generic Name/Trade Name/ Dose / Form</th>
                            <th className="p-1.5 border-b border-slate-400 w-20">SFDA Code</th>
                            <th className="p-1.5 border-b border-slate-400 w-12">Dur.</th>
                            <th className="p-1.5 border-b border-slate-400 w-16">Total Qty.</th>
                            <th className="p-1.5 border-b border-slate-400 w-16">Amount</th>
                            <th className="p-1.5 border-b border-slate-400 text-left">Instructions & Route</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {prescription.items.map((item) => {
                            const invItem = inventoryItems.find(inv => inv.id === item.itemId);
                            const sfdaCode = invItem?.sfda || item.itemCode || "";
                            const itemAmt = item.totalAmount !== undefined ? item.totalAmount : (item.unitPrice && item.totalQty ? (item.unitPrice * item.totalQty) : null);
                            return (
                                <tr key={item.id} className="divide-x divide-slate-400 min-h-[3rem]">
                                    <td className="p-2 align-top">
                                        <div className="font-bold uppercase">{item.genericName}</div>
                                        <div className="text-slate-600 font-medium">{item.itemName} / {item.dose} {item.units}</div>
                                    </td>
                                    <td className="p-2 text-center align-top font-mono">{sfdaCode}</td>
                                    <td className="p-2 text-center align-top">{item.noDays}</td>
                                    <td className="p-2 text-center align-top font-bold">{item.totalQty}</td>
                                    <td className="p-2 text-center align-top">{itemAmt !== null ? itemAmt.toFixed(2) : ""}</td>
                                    <td className="p-2 align-top italic">{item.frequency} - {item.drugInstruction}</td>
                                </tr>
                            );
                        })}
                        {/* Fill remaining space if few items */}
                        {[...Array(Math.max(0, 5 - prescription.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="divide-x divide-slate-400 h-10">
                                <td></td><td></td><td></td><td></td><td></td><td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pharmacy and Signatures Section */}
                <div className="mt-4 border border-slate-400">
                    <div className="bg-slate-50 text-center font-bold text-[11px] p-1 border-b border-slate-400">For Pharmacy Use Only</div>
                    <div className="grid grid-cols-3 divide-x divide-slate-400">
                        <div className="p-2 min-h-[100px] flex flex-col justify-between">
                            <span className="text-[10px] font-bold">Doctor's Name, License, Signature & Stamp</span>
                            <div className="mt-auto pt-4 border-t border-dashed border-slate-300">
                                <p className="text-[11px] font-bold">{doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : prescription.doctorName}</p>
                                <p className="text-[9px] text-slate-500 uppercase">{doctor?.specialization}</p>
                            </div>
                        </div>
                        <div className="p-2 flex flex-col">
                            <span className="text-[10px] font-bold">Dispensed By</span>
                            <div className="flex-1 flex flex-col justify-center items-center text-slate-300 text-[9px] text-center pt-8">
                                <span className="bg-slate-100 p-2 rounded border border-slate-200 w-full mb-1">Current report item is not supported in this report format.</span>
                            </div>
                        </div>
                        <div className="p-2 flex flex-col">
                            <span className="text-[10px] font-bold">Verified By</span>
                            <div className="flex-1 flex flex-col justify-center items-center text-slate-300 text-[9px] text-center pt-8">
                                <span className="bg-slate-100 p-2 rounded border border-slate-200 w-full mb-1">Current report item is not supported in this report format.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drug Therapy Notes */}
                <div className="mt-4 border border-slate-400">
                    <div className="bg-emerald-50/30 text-center font-bold text-[10px] p-1 border-b border-slate-400 uppercase tracking-tight">
                        Drug Therapy Notes
                        <span className="block text-[8px] font-normal italic lowercase">(Please provide information pertinent to the patient's drug therapy so that pharmaceutical care provision may be optimized)</span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-400">
                        <div className="p-1 px-2 min-h-[60px]">
                            <span className="text-[9px] font-bold block border-b border-slate-200 mb-1">Medical History/ Diagnosis</span>
                        </div>
                        <div className="p-1 px-2 min-h-[60px]">
                            <span className="text-[9px] font-bold block border-b border-slate-200 mb-1">Pharmacist interventions(s)</span>
                        </div>
                        <div className="p-1 px-2 min-h-[60px]">
                            <span className="text-[9px] font-bold block border-b border-slate-200 mb-1">Patient Teaching</span>
                        </div>
                    </div>
                </div>

                {/* Guidelines section */}
                <div className="mt-4 border border-slate-400">
                    <div className="bg-slate-50 text-center font-bold text-[10px] p-1 border-b border-slate-400">Guidelines for Writing a Prescription</div>
                    <div className="grid grid-cols-2 p-2 text-[9px] leading-snug">
                        <div className="space-y-0.5">
                            <p>1. Use Block Letters for Drug Name</p>
                            <p>2. Do not use Drug Abbreviation - They can be misinterpreted and cause error</p>
                            <p>3. Record allergy / drug reaction. If not known reaction write NKA</p>
                        </div>
                        <div className="space-y-0.5">
                            <p>4. Record patient weight. This field is mandatory for paediatric patients</p>
                            <p>5. Use a ball point pen and press firmly</p>
                            <p>6. For special instructions, titrated doses or tapering doses more than 1 row may be utilized</p>
                        </div>
                    </div>
                </div>

                {/* Footer Signatory */}
                <div className="mt-8 flex justify-end">
                    <div className="text-center w-48">
                        <div className="font-bold text-sm tracking-tight border-b-2 border-slate-800 pb-1">Authorized Signatory</div>
                        <span className="text-[8px] uppercase font-bold text-slate-400">Hospital Medical Authority</span>
                    </div>
                </div>
            </div>

            {/* Print Specific CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
                .font-arabic {
                    font-family: 'Amiri', 'Traditional Arabic', serif;
                }
            ` }} />
        </div>
    );
};
