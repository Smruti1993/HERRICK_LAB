import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useData } from '../context/DataContext';

interface DentalSelection {
  tooth: string;
  icd: string;
}

interface DentalChartProps {
  onSave: (selections: DentalSelection[]) => void;
  onClose: () => void;
  initialSelection?: DentalSelection[];
}

// Tooth component to render SVG shape
const Tooth = ({ number, isSelected, onClick, jaw }: { number: number, isSelected: boolean, onClick: () => void, jaw: 'upper' | 'lower' }) => {
  const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(number);
  
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer relative" onClick={onClick}>
        {/* The Tooth Visual */}
        <div className={`
            relative w-10 h-16 transition-all duration-200
            ${isSelected ? 'scale-110 drop-shadow-md z-10' : 'hover:scale-105 z-0'}
        `}>
            {/* Crown & Root SVG */}
            <svg viewBox="0 0 100 160" className="w-full h-full filter drop-shadow-sm">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
                    </filter>
                </defs>
                
                {/* Root (Different for Upper/Lower) */}
                <path 
                    d={jaw === 'upper' 
                       ? "M30,70 Q40,10 50,0 Q60,10 70,70 L30,70" 
                       : "M30,90 Q40,150 50,160 Q60,150 70,90 L30,90"
                    }
                    fill="#fefcf0"
                    stroke="#d4d4d4"
                    strokeWidth="2"
                />
                
                {/* Crown */}
                <path 
                    d={jaw === 'upper'
                        ? "M20,70 C10,70 10,110 20,130 Q50,140 80,130 C90,110 90,70 80,70 Z"
                        : "M20,90 C10,90 10,50 20,30 Q50,20 80,30 C90,50 90,90 80,90 Z"
                    }
                    fill={isSelected ? "#bfdbfe" : "#ffffff"} // Blue tint if selected
                    stroke={isSelected ? "#2563eb" : "#9ca3af"}
                    strokeWidth={isSelected ? "3" : "2"}
                    className="transition-colors duration-200"
                />
                
                {/* Surface Markings (Simple Cross for molars) */}
                {isMolar && (
                    <path 
                        d={jaw === 'upper' ? "M35,90 L65,110 M65,90 L35,110" : "M35,50 L65,70 M65,50 L35,70"}
                        stroke="#e5e7eb" strokeWidth="2" fill="none"
                    />
                )}
            </svg>
            
            {/* Selection Indicator Overlay (Box) from screenshot style */}
            {isSelected && (
                <div className="absolute inset-0 border-2 border-red-500 rounded-sm pointer-events-none animate-in fade-in zoom-in duration-200"></div>
            )}
        </div>

        {/* FDI Number */}
        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-600' : 'text-white'}`}>
            {number}
        </span>
    </div>
  );
};

export const DentalChart: React.FC<DentalChartProps> = ({ onSave, onClose, initialSelection = [] }) => {
  const { dentalICDs } = useData();
  const [selections, setSelections] = useState<DentalSelection[]>(initialSelection);

  // FDI Notation Arrays
  const adultUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const adultUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const adultLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const adultLowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  const childUpperRight = [55, 54, 53, 52, 51];
  const childUpperLeft = [61, 62, 63, 64, 65];
  const childLowerRight = [85, 84, 83, 82, 81];
  const childLowerLeft = [71, 72, 73, 74, 75];

  const toggleTooth = (num: number) => {
    const sNum = num.toString();
    setSelections(prev => {
        const exists = prev.find(s => s.tooth === sNum);
        if (exists) {
            return prev.filter(s => s.tooth !== sNum);
        } else {
            return [...prev, { tooth: sNum, icd: '' }];
        }
    });
  };

  const updateICD = (tooth: string, icd: string) => {
      setSelections(prev => prev.map(s => s.tooth === tooth ? { ...s, icd } : s));
  };

  const handleUpdate = () => {
      onSave(selections);
  };

  const removeSelected = () => {
      setSelections([]);
  };

  const isSelected = (num: number) => selections.some(s => s.tooth === num.toString());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-6xl h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-400">
            {/* Header */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-sm">Tooth Selection & Diagnosis Chart</h3>
                <button onClick={onClose} className="hover:bg-slate-200 p-1 rounded transition-colors"><X className="w-5 h-5 text-slate-600"/></button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chart Visualization */}
                <div className="flex-1 bg-[#d4a5a5] p-6 overflow-y-auto relative flex flex-col items-center justify-center border-r border-slate-300">
                    {/* Background Texture/Gum Color mimic */}
                    <div className="absolute inset-0 bg-[#eebbbb] opacity-50 pointer-events-none"></div>
                    
                    {/* ADULT TEETH */}
                    <div className="relative z-10 w-full max-w-4xl space-y-8">
                        {/* Upper Arch */}
                        <div className="flex justify-center gap-1">
                            <div className="flex gap-1 border-b-2 border-red-400/30 pb-2 px-4 rounded-b-[3rem] bg-[#e39e9e] shadow-inner">
                                {adultUpperRight.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="upper" />)}
                            </div>
                            <div className="w-px bg-red-800/20 mx-2"></div>
                            <div className="flex gap-1 border-b-2 border-red-400/30 pb-2 px-4 rounded-b-[3rem] bg-[#e39e9e] shadow-inner">
                                {adultUpperLeft.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="upper" />)}
                            </div>
                        </div>

                        {/* Lower Arch */}
                        <div className="flex justify-center gap-1">
                            <div className="flex gap-1 border-t-2 border-red-400/30 pt-2 px-4 rounded-t-[3rem] bg-[#e39e9e] shadow-inner">
                                {adultLowerRight.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="lower" />)}
                            </div>
                            <div className="w-px bg-red-800/20 mx-2"></div>
                            <div className="flex gap-1 border-t-2 border-red-400/30 pt-2 px-4 rounded-t-[3rem] bg-[#e39e9e] shadow-inner">
                                {adultLowerLeft.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="lower" />)}
                            </div>
                        </div>
                    </div>

                    {/* DECIDUOUS TEETH (Small section below) */}
                    <div className="relative z-10 w-full max-w-2xl mt-12 pt-8 border-t border-red-900/10">
                        <h4 className="text-center text-[#7f1d1d] font-bold text-xs uppercase mb-4 tracking-wider opacity-60">Deciduous Dentition (Child)</h4>
                        <div className="flex flex-col gap-4">
                             {/* Upper Child */}
                            <div className="flex justify-center gap-1 opacity-90 scale-90">
                                {childUpperRight.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="upper" />)}
                                <div className="w-4"></div>
                                {childUpperLeft.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="upper" />)}
                            </div>
                             {/* Lower Child */}
                            <div className="flex justify-center gap-1 opacity-90 scale-90">
                                {childLowerRight.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="lower" />)}
                                <div className="w-4"></div>
                                {childLowerLeft.map(t => <Tooth key={t} number={t} isSelected={isSelected(t)} onClick={() => toggleTooth(t)} jaw="lower" />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Controls & List */}
                <div className="w-96 bg-slate-50 flex flex-col border-l border-slate-300">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tooth Specific Diagnosis</span>
                            <button 
                                onClick={removeSelected}
                                className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> CLEAR ALL
                            </button>
                        </div>
                        
                        <div className="space-y-3 mt-4 h-[calc(85vh-200px)] overflow-y-auto pr-1 scrollbar-thin">
                            {selections.length === 0 && (
                                <div className="text-center text-slate-400 text-xs mt-20 italic bg-white p-8 rounded-xl border border-dashed border-slate-200">
                                    Click teeth on the chart to begin mapping diagnosis
                                </div>
                            )}
                            {selections.sort((a,b) => parseInt(a.tooth) - parseInt(b.tooth)).map(s => (
                                <div key={s.tooth} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
                                        <span className="font-bold text-blue-700 text-sm">Tooth Number: {s.tooth}</span>
                                        <button onClick={() => toggleTooth(parseInt(s.tooth))} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Select Diagnosis (Dental ICD)</label>
                                        <select 
                                            className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            value={s.icd}
                                            onChange={(e) => updateICD(s.tooth, e.target.value)}
                                        >
                                            <option value="">-- No Diagnosis Map --</option>
                                            {dentalICDs.map(icd => (
                                                <option key={icd.id} value={icd.code}>
                                                    {icd.code} - {icd.description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 mt-auto border-t border-slate-200 bg-slate-100 flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 border border-slate-300 bg-white rounded text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all">CANCEL</button>
                        <button 
                            onClick={handleUpdate} 
                            disabled={selections.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            <Check className="w-4 h-4" /> UPDATE SELECTIONS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
