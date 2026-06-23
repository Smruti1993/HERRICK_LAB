import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function testSave() {
  console.log("Fetching doctors to get a valid ID...");
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('role', 'Doctor')
    .limit(1);

  if (empError) {
    console.error("Error fetching employees:", empError);
    return;
  }

  if (!employees || employees.length === 0) {
    console.error("No doctors found in employees table.");
    return;
  }

  const doctorId = employees[0].id;
  console.log(`Using Doctor ID: ${doctorId} (${employees[0].first_name} ${employees[0].last_name})`);

  const testSlots = [
    {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '09:30',
      slot_type: 'available',
      slot_duration: 30
    }
  ];

  console.log("Calling save_doctor_schedule RPC...");
  const { data, error } = await supabase.rpc('save_doctor_schedule', {
    p_doctor_id: doctorId,
    p_slots: testSlots,
    p_week_start: '2026-06-22',
    p_created_by: 'admin'
  });

  if (error) {
    console.error("RPC call failed! Error details:");
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log("RPC call succeeded! Data returned:", data);
  }
}

testSave();
