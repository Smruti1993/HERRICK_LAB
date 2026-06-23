import { useState, useCallback } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { useData } from '../context/DataContext';
import {
  WeekScheduleState, DaySchedule, TimeRange,
  SlotType, SlotConfig, ScheduleStats, DoctorSchedule
} from '../types';

// Default empty week — all days off with no slots
const emptyWeek = (): WeekScheduleState =>
  Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, { on: false, slots: [] }])
  );

// Helper: get Monday of current week as YYYY-MM-DD
const getWeekStart = (): string => {
  const today = new Date();
  const day   = today.getDay();
  const diff  = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff)).toISOString().split('T')[0];
};

// Helper: convert "HH:MM" to total minutes
const toMins = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Helper: add N minutes to "HH:MM" → "HH:MM"
const addMins = (t: string, mins: number): string => {
  const total  = toMins(t) + mins;
  const h      = Math.floor(total / 60);
  const m      = total % 60;
  return `${String(Math.min(h, 23)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

// CORE: Expand time ranges into individual slot rows for the RPC
// e.g. {from:'09:00', to:'13:00', type:'available'} with duration=30
// → [{start:'09:00',end:'09:30'}, {start:'09:30',end:'10:00'}, ...]
const expandRangeToSlots = (
  range: TimeRange,
  dayOfWeek: number,
  duration: number
): SlotConfig[] => {
  const slots: SlotConfig[] = [];
  let current = range.from;
  while (toMins(current) < toMins(range.to)) {
    const next = addMins(current, duration);
    if (toMins(next) > toMins(range.to)) break;
    slots.push({
      day_of_week:   dayOfWeek,
      start_time:    current,
      end_time:      next,
      slot_type:     range.type,
      slot_duration: duration,
    });
    current = next;
  }
  return slots;
};

// CORE: Collapse individual DB slots back into time ranges for display
// Groups consecutive slots of the same type into one TimeRange
const collapseToRanges = (slots: DoctorSchedule[]): TimeRange[] => {
  if (!slots.length) return [];

  // Sort by start time
  const sorted = [...slots].sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
  const ranges: TimeRange[] = [];
  let current: TimeRange | null = null;

  for (const slot of sorted) {
    if (
      current &&
      current.type === slot.slotType &&
      current.to   === slot.startTime
    ) {
      // Extend current range
      current.to = slot.endTime;
    } else {
      if (current) ranges.push(current);
      current = { from: slot.startTime, to: slot.endTime, type: slot.slotType };
    }
  }
  if (current) ranges.push(current);
  return ranges;
};

export const useSchedule = () => {
  const { setRefreshTrigger } = useData();
  const [weekState, setWeekState]   = useState<WeekScheduleState>(emptyWeek());
  const [stats, setStats]           = useState<ScheduleStats | null>(null);
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);

  // Load schedule for a doctor — collapses DB rows into time ranges
  const loadSchedule = useCallback(async (doctorId: string) => {
    setLoading(true);
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      const rows: DoctorSchedule[] = (data || []).map((s: any) => ({
        id:           s.id,
        doctorId:     s.doctor_id,
        dayOfWeek:    s.day_of_week,
        startTime:    s.start_time.substring(0, 5),
        endTime:      s.end_time.substring(0, 5),
        slotType:     s.slot_type as SlotType,
        slotDuration: s.slot_duration,
        isActive:     s.is_active,
      }));

      // Set slot duration from first row
      if (rows.length) setSlotDuration(rows[0].slotDuration);

      // Build week state from DB rows
      const newWeek = emptyWeek();
      for (let d = 0; d < 7; d++) {
        const dayRows = rows.filter(r => r.dayOfWeek === d);
        if (dayRows.length) {
          newWeek[d] = {
            on:    true,
            slots: collapseToRanges(dayRows),
          };
        }
      }
      setWeekState(newWeek);

      // Load stats
      const { data: statsData } = await supabase.rpc('get_doctor_schedule_stats', {
        p_doctor_id:  doctorId,
        p_week_start: getWeekStart(),
      });
      
      if (statsData) {
        const raw = statsData as any;
        setStats({
          activeDays: raw.active_days ?? 0,
          totalSlots: raw.total_slots ?? 0,
          bookedSlots: raw.booked_slots ?? 0
        });
      } else {
        setStats({ activeDays: 0, totalSlots: 0, bookedSlots: 0 });
      }

    } catch (err) {
      console.error('Load stats failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle a day on/off
  const toggleDay = useCallback((dayIndex: number) => {
    setWeekState(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        on:    !prev[dayIndex].on,
        slots: prev[dayIndex].on ? [] : [{ from: '09:00', to: '17:00', type: 'available' }],
      },
    }));
  }, []);

  // Add a new time range to a day
  const addSlot = useCallback((dayIndex: number) => {
    setWeekState(prev => {
      const slots    = prev[dayIndex].slots;
      const lastTo   = slots.length ? slots[slots.length - 1].to : '09:00';
      const [h]      = lastTo.split(':').map(Number);
      const newFrom  = lastTo;
      const newTo    = h + 1 < 24 ? `${String(h + 1).padStart(2,'0')}:00` : '23:59';
      return {
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          slots: [...slots, { from: newFrom, to: newTo, type: 'available' }],
        },
      };
    });
  }, []);

  // Remove a time range from a day
  const removeSlot = useCallback((dayIndex: number, slotIndex: number) => {
    setWeekState(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: prev[dayIndex].slots.filter((_, i) => i !== slotIndex),
      },
    }));
  }, []);

  // Update from/to/type on a specific slot
  const updateSlot = useCallback((
    dayIndex: number,
    slotIndex: number,
    field: keyof TimeRange,
    value: string
  ) => {
    setWeekState(prev => {
      const slots = [...prev[dayIndex].slots];
      slots[slotIndex] = { ...slots[slotIndex], [field]: value };
      return { ...prev, [dayIndex]: { ...prev[dayIndex], slots } };
    });
  }, []);

  // Cycle slot type: available → break → blocked → available
  const cycleSlotType = useCallback((dayIndex: number, slotIndex: number) => {
    const cycle: Record<SlotType, SlotType> = {
      available: 'break',
      break:     'blocked',
      blocked:   'available',
    };
    setWeekState(prev => {
      const slots = [...prev[dayIndex].slots];
      slots[slotIndex] = {
        ...slots[slotIndex],
        type: cycle[slots[slotIndex].type],
      };
      return { ...prev, [dayIndex]: { ...prev[dayIndex], slots } };
    });
  }, []);

  // Validate: check for overlapping ranges within a day
  const validateDay = (dayIndex: number): string | null => {
    const slots = weekState[dayIndex].slots;
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i];
      // From must be before To
      if (toMins(a.from) >= toMins(a.to)) {
        return `Day ${dayIndex}: start time must be before end time (${a.from} - ${a.to})`;
      }
      // Check overlap with next slot
      if (i + 1 < slots.length) {
        const b = slots[i + 1];
        if (toMins(a.to) > toMins(b.from)) {
          return `Day ${dayIndex}: slots overlap (${a.to} overlaps ${b.from})`;
        }
      }
    }
    return null;
  };

  // Save entire schedule to DB via RPC
  const saveSchedule = useCallback(async (
    doctorId: string,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Validate all active days
    for (let d = 0; d < 7; d++) {
      if (!weekState[d].on) continue;
      const err = validateDay(d);
      if (err) return { success: false, error: err };
    }

    setSaving(true);
    try {
      const supabase = getSupabase();

      // Expand all time ranges into individual slot rows
      const allSlots: SlotConfig[] = [];
      for (let d = 0; d < 7; d++) {
        if (!weekState[d].on) continue;
        weekState[d].slots.forEach(range => {
          const expanded = expandRangeToSlots(range, d, slotDuration);
          allSlots.push(...expanded);
        });
      }

      const { error } = await supabase.rpc('save_doctor_schedule', {
        p_doctor_id:  doctorId,
        p_slots:      allSlots,
        p_week_start: getWeekStart(),
        p_created_by: createdBy,
      });

      if (error) throw error;

      // Refresh global context
      setRefreshTrigger((prev: number) => prev + 1);
      return { success: true };

    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [weekState, slotDuration, setRefreshTrigger]);

  // Copy from last saved schedule (template)
  const copyFromLastWeek = useCallback(async (doctorId: string): Promise<boolean> => {
    try {
      const supabase = getSupabase();
      const { data: rows } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (!rows?.length) return false;

      const mapped: DoctorSchedule[] = rows.map((s: any) => ({
        id:           s.id,
        doctorId:     s.doctor_id,
        dayOfWeek:    s.day_of_week,
        startTime:    s.start_time.substring(0, 5),
        endTime:      s.end_time.substring(0, 5),
        slotType:     s.slot_type as SlotType,
        slotDuration: s.slot_duration,
        isActive:     s.is_active,
      }));

      const newWeek = emptyWeek();
      for (let d = 0; d < 7; d++) {
        const dayRows = mapped.filter(r => r.dayOfWeek === d);
        if (dayRows.length) {
          newWeek[d] = { on: true, slots: collapseToRanges(dayRows) };
        }
      }
      setWeekState(newWeek);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Compute stats from current weekState
  const computeStats = useCallback((): { activeDays: number; totalSlots: number } => {
    let activeDays = 0, totalSlots = 0;
    for (let d = 0; d < 7; d++) {
      if (!weekState[d].on || !weekState[d].slots.length) continue;
      activeDays++;
      weekState[d].slots.forEach(range => {
        if (range.type === 'available') {
          const mins = toMins(range.to) - toMins(range.from);
          if (mins > 0) totalSlots += Math.floor(mins / slotDuration);
        }
      });
    }
    return { activeDays, totalSlots };
  }, [weekState, slotDuration]);

  return {
    weekState, stats, slotDuration, loading, saving,
    setSlotDuration, loadSchedule,
    toggleDay, addSlot, removeSlot, updateSlot, cycleSlotType,
    saveSchedule, copyFromLastWeek, computeStats,
  };
};
