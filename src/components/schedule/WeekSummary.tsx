import React from 'react';
import { WeekScheduleState, SlotType } from '../../types';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday',
              'Thursday','Friday','Saturday'];

const TYPE_CHIP: Record<SlotType, string> = {
  available: 'bg-green-50 text-green-800 border border-green-200',
  break:     'bg-amber-50 text-amber-800 border border-amber-200',
  blocked:   'bg-red-50   text-red-800   border border-red-200',
};

interface Props { weekState: WeekScheduleState }

export const WeekSummary: React.FC<Props> = ({ weekState }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
      Week summary
    </p>
    <div className="space-y-1">
      {DAYS.map((day, i) => {
        const d = weekState[i];
        return (
          <div key={day}
               className="flex items-center justify-between py-1.5
                          border-b border-gray-100 last:border-b-0">
            <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">{day}</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {(!d || !d.on || !d.slots.length) ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded
                                 bg-gray-100 text-gray-400">
                  Off
                </span>
              ) : d.slots.map((slot, si) => (
                <span key={si}
                      className={`text-[10px] font-bold px-1.5 py-0.5
                                  rounded ${TYPE_CHIP[slot.type]}`}>
                  {slot.from}–{slot.to}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
