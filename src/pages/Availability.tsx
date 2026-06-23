import React, { useEffect, useState } from 'react';
import { DayCard }     from '../components/schedule/DayCard';
import { WeekSummary } from '../components/schedule/WeekSummary';
import { useSchedule } from '../hooks/useSchedule';
import { useData }     from '../context/DataContext';
import { TimeRange }   from '../types';
import { Calendar, Copy, Save, Sparkles } from 'lucide-react';

const TODAY = new Date().getDay();

export const Availability: React.FC = () => {
  const { employees, user, showToast } = useData();
  const doctors = employees?.filter(e => e.role === 'Doctor') || [];

  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const {
    weekState, stats, slotDuration, loading, saving,
    setSlotDuration, loadSchedule,
    toggleDay, addSlot, removeSlot, updateSlot, cycleSlotType,
    saveSchedule, copyFromLastWeek, computeStats,
  } = useSchedule();

  // Set first doctor as default
  useEffect(() => {
    if (doctors.length && !selectedDoctor) {
      setSelectedDoctor(doctors[0].id);
    }
  }, [doctors, selectedDoctor]);

  // Reload when doctor changes
  useEffect(() => {
    if (selectedDoctor) {
      loadSchedule(selectedDoctor);
    }
  }, [selectedDoctor, loadSchedule]);

  const { activeDays, totalSlots } = computeStats();

  const handleSave = async () => {
    if (!selectedDoctor) return;
    const result = await saveSchedule(
      selectedDoctor,
      user?.username || user?.email || 'admin'
    );
    if (result.success) {
      showToast('success', 'Schedule saved successfully');
    } else {
      showToast('error', result.error || 'Failed to save schedule');
    }
  };

  const handleCopyLastWeek = async () => {
    if (!selectedDoctor) return;
    const ok = await copyFromLastWeek(selectedDoctor);
    if (ok) {
      showToast('success', 'Schedule template loaded successfully');
    } else {
      showToast('error', 'No previous template found for this doctor.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Staff Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Availability Schedule</h1>
          <p className="text-sm text-slate-500">Define working sessions and breaks per doctor via custom ranges</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLastWeek}
            disabled={!selectedDoctor || loading || saving}
            className="h-10 px-4 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm bg-white">
            <Copy className="w-4 h-4 text-slate-500" />
            Copy from Last Week
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedDoctor || loading || saving}
            className="h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-blue-100">
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Schedule
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats / control bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80
                      rounded-2xl px-6 py-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Doctor selector */}
          <div className="min-w-[240px]">
            <p className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor</p>
            <select
              value={selectedDoctor}
              onChange={e => setSelectedDoctor(e.target.value)}
              className="h-10 w-full border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700">
              <option value="">-- Select Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} ({d.specialization || 'General'})</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block w-px h-12 bg-slate-100" />

          {/* Slot duration */}
          <div className="min-w-[140px]">
            <p className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Slot duration</p>
            <select
              value={slotDuration}
              onChange={e => setSlotDuration(Number(e.target.value))}
              className="h-10 w-full border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700">
              {[15, 30, 45, 60].map(d => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-6 bg-slate-50/50 p-3 lg:p-0 rounded-2xl border border-slate-100 lg:border-none lg:bg-transparent">
          {[
            { label: 'Active days',      value: `${activeDays} / 7`,    color: 'text-emerald-700' },
            { label: 'Slots / week',     value: `${totalSlots} slots`,  color: 'text-blue-700'  },
            { label: 'Booked this week', value: `${stats?.bookedSlots ?? 0} slots`, color: 'text-amber-700' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="hidden sm:block w-px h-12 bg-slate-100" />}
              <div className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-base font-bold ${s.color} flex items-center justify-center sm:justify-start gap-2`}>
                  <span className={`w-2 h-2 rounded-full ${s.color.replace('text-', 'bg-')}`} />
                  {s.value}
                </p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 7-day card grid */}
      {!selectedDoctor ? (
        <div className="flex flex-col items-center justify-center h-80 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-6 text-slate-400">
          <p className="font-semibold text-sm text-slate-500">Select a doctor to load time range configurations.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-80 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading Doctor's Schedule...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }, (_, d) => (
            <DayCard
              key={d}
              dayIndex={d}
              schedule={weekState[d]}
              isToday={d === TODAY}
              onToggle={() => toggleDay(d)}
              onAddSlot={() => addSlot(d)}
              onRemove={si => removeSlot(d, si)}
              onUpdate={(si, field, val) => updateSlot(d, si, field, val)}
              onCycleType={si => cycleSlotType(d, si)}
            />
          ))}
        </div>
      )}

      {/* Bottom section: Legend + Week Summary */}
      {selectedDoctor && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Legend */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm md:col-span-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Legend
            </p>
            <div className="flex flex-col gap-3">
              {[
                { color: 'bg-green-50 border border-green-200 text-green-800', label: 'Available — bookable by patients' },
                { color: 'bg-amber-50 border border-amber-200 text-amber-800', label: 'Break — rest sessions or lunch' },
                { color: 'bg-red-50 border border-red-200 text-red-800',       label: 'Blocked — non-bookable windows' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <div className={`w-6 h-6 rounded-lg ${l.color} shrink-0`} />
                  <span className="leading-snug">{l.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-5 italic">
              * Click the colored badge on any day card slot to cycle its type (Available → Break → Blocked).
            </p>
          </div>

          {/* Week Summary */}
          <div className="md:col-span-2">
            <WeekSummary weekState={weekState} />
          </div>
        </div>
      )}

      {/* Info bar */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-5 py-3.5
                      flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-medium text-slate-500 shadow-inner">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Enter any time from 00:00 to 23:59. Add multiple ranges per day to support split morning/evening sessions.
        </span>
        <span className="text-blue-600 font-bold shrink-0">
          Changes must be saved before leaving this screen!
        </span>
      </div>

    </div>
  );
};