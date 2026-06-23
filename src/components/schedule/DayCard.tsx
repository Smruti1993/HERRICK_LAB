import React, { useState, useEffect } from 'react';
import { DaySchedule, TimeRange, SlotType } from '../../types';

const SLOT_TYPE_STYLES: Record<SlotType, { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-green-50 border border-green-300',  text: 'text-green-800',  label: 'Available' },
  break:     { bg: 'bg-amber-50 border border-amber-300',  text: 'text-amber-800',  label: 'Break'     },
  blocked:   { bg: 'bg-red-50   border border-red-300',    text: 'text-red-800',    label: 'Blocked'   },
};

const DAYS_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface Props {
  dayIndex:    number;
  schedule:    DaySchedule;
  isToday:     boolean;
  onToggle:    () => void;
  onAddSlot:   () => void;
  onRemove:    (slotIndex: number) => void;
  onUpdate:    (slotIndex: number, field: keyof TimeRange, value: string) => void;
  onCycleType: (slotIndex: number) => void;
}

// Helper: parses diverse manual time inputs and formats them to "HH:MM"
const parseAndFormatTime = (input: string, defaultValue: string): string => {
  let val = input.trim();
  if (!val) return defaultValue;

  // Check if it's already a valid HH:MM
  if (/^\d{2}:\d{2}$/.test(val)) {
    const [h, m] = val.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return val;
    }
  }

  // Remove non-digits and non-colons
  val = val.replace(/[^0-9:]/g, '');

  // Case 1: HH:MM with potentially single digits (e.g. 9:30 -> 09:30, 9:5 -> 09:05)
  let match = val.match(/^(\d{1,2}):(\d{1,2})$/);
  if (match) {
    let h = Math.min(23, Math.max(0, parseInt(match[1])));
    let m = Math.min(59, Math.max(0, parseInt(match[2])));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Case 2: Just digits (e.g. 9 -> 09:00, 930 -> 09:30, 1230 -> 12:30)
  const digits = val.replace(/:/g, '');
  if (digits.length > 0 && digits.length <= 4) {
    let h = 0;
    let m = 0;
    if (digits.length <= 2) {
      h = parseInt(digits);
      m = 0;
    } else {
      h = parseInt(digits.substring(0, digits.length - 2));
      m = parseInt(digits.substring(digits.length - 2));
    }
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return defaultValue;
};

interface TimeInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, className }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    const formatted = parseAndFormatTime(localVal, value);
    setLocalVal(formatted);
    if (formatted !== value) {
      onChange(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="HH:MM"
      className={className}
    />
  );
};

export const DayCard: React.FC<Props> = ({
  dayIndex, schedule, isToday,
  onToggle, onAddSlot, onRemove, onUpdate, onCycleType,
}) => {
  const s = SLOT_TYPE_STYLES;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden
      ${schedule.on && schedule.slots.length ? 'border-blue-400' : 'border-gray-200'}
      ${isToday ? 'ring-1 ring-blue-200' : ''}`}>

      {/* Day header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-100
        ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
        <div>
          <p className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
            {DAYS_ABBR[dayIndex]}
            {isToday && <span className="ml-1 text-[9px] text-blue-500 font-bold">TODAY</span>}
          </p>
        </div>
        {/* Toggle switch */}
        <button
          onClick={onToggle}
          className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0
            ${schedule.on ? 'bg-blue-500' : 'bg-gray-300'}`}
          title={schedule.on ? 'Disable day' : 'Enable day'}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all
            ${schedule.on ? 'left-4' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Day body */}
      {!schedule.on ? (
        <div className="px-3 py-4 text-center text-xs text-gray-400">Off</div>
      ) : (
        <div className="p-2 space-y-1.5">
          {schedule.slots.map((slot, si) => {
            const style = s[slot.type];
            return (
              <div key={si} className="border border-slate-100 rounded-xl p-2 bg-slate-50/40 space-y-1.5 shadow-sm">
                {/* Row 1: Time range text inputs */}
                <div className="flex items-center gap-1.5">
                  <TimeInput
                    value={slot.from}
                    onChange={val => onUpdate(si, 'from', val)}
                    className="w-full h-8 border border-slate-200 rounded-lg text-center text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all font-semibold px-1.5"
                  />
                  <span className="text-slate-400 text-xs font-bold shrink-0">–</span>
                  <TimeInput
                    value={slot.to}
                    onChange={val => onUpdate(si, 'to', val)}
                    className="w-full h-8 border border-slate-200 rounded-lg text-center text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all font-semibold px-1.5"
                  />
                </div>
                {/* Row 2: Type badge & Delete */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onCycleType(si)}
                    className={`h-6 flex-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center ${style.bg} ${style.text}`}
                    title="Click to change slot type">
                    {style.label}
                  </button>
                  <button
                    onClick={() => onRemove(si)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-all font-bold text-sm shadow-sm shrink-0">
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add slot button */}
          <button
            onClick={onAddSlot}
            className="w-full h-6 border border-dashed border-gray-300 rounded
                       text-xs text-gray-400 flex items-center justify-center gap-1
                       hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50
                       transition-colors mt-1 font-semibold">
            + Add slot
          </button>
        </div>
      )}
    </div>
  );
};
