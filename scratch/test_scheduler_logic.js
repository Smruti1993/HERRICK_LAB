import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

const mapDoctorScheduleFromDb = (s) => ({
  id: s.id,
  doctorId: s.doctor_id,
  dayOfWeek: s.day_of_week,
  startTime: s.start_time.substring(0, 5),
  endTime: s.end_time.substring(0, 5),
  slotType: s.slot_type,
  slotDuration: s.slot_duration,
  isActive: s.is_active,
  createdBy: s.created_by,
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

async function testScheduler() {
  const { data: rawSchedules, error } = await supabase.from('doctor_schedules').select('*');
  if (error) {
    console.error("Error fetching schedules:", error);
    return;
  }
  const doctorSchedules = rawSchedules.map(mapDoctorScheduleFromDb);

  const selectedDoctor = '1769694978243'; // Dr. SM RR
  const selectedDateObj = new Date("2026-06-23T12:00:00"); // Tuesday
  const dayOfWeek = selectedDateObj.getDay();

  console.log(`Simulating scheduler for doctor=${selectedDoctor}, dayOfWeek=${dayOfWeek}`);

  // Filter slots for this doctor and day of week
  const daySlots = (doctorSchedules || []).filter(s => 
      s.doctorId === selectedDoctor && 
      s.dayOfWeek === dayOfWeek && 
      s.isActive
  );

  console.log(`Found ${daySlots.length} active slots for this day:`);
  daySlots.forEach(s => {
    console.log(` - Slot: ${s.startTime} to ${s.endTime} (${s.slotType})`);
  });

  const slots = [];
  let startHour = 8;
  let endHour = 20;

  if (daySlots.length > 0) {
      daySlots.forEach(slot => {
          const [sH] = slot.startTime.split(':').map(Number);
          const [eH, eM] = slot.endTime.split(':').map(Number);
          if (sH < startHour) startHour = sH;
          let viewEnd = eH;
          if (eM > 0) viewEnd += 1;
          if (viewEnd > endHour) endHour = viewEnd;
      });
  }

  console.log(`View range: startHour=${startHour}, endHour=${endHour}`);

  let current = new Date(selectedDateObj);
  current.setHours(startHour, 0, 0, 0);
  
  const endTime = new Date(selectedDateObj);
  endTime.setHours(endHour, 0, 0, 0);

  while(current < endTime) {
      const timeStr = current.toTimeString().substring(0, 5);
      
      const activeSlot = daySlots.find(s => {
          const [sH, sM] = s.startTime.split(':').map(Number);
          const [eH, eM] = s.endTime.split(':').map(Number);
          const t = current.getHours() * 60 + current.getMinutes();
          const startT = sH * 60 + sM;
          const endT = eH * 60 + eM;
          return t >= startT && t < endT && s.slotType === 'available';
      });
      
      const isWorkingHour = !!activeSlot;
      if (isWorkingHour) {
        slots.push(timeStr);
      }
      current.setMinutes(current.getMinutes() + 15);
  }

  console.log("Calculated available bookable slots in Appointments page:");
  console.log(slots);
}

testScheduler();
