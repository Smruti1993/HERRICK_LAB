import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function inspectSchema() {
  console.log("Checking columns of doctor_schedules...");
  // Querying pg_attribute via a custom query is not possible directly via anon key PostgREST,
  // but we can try to insert a dummy record or query one record to see returned field names and values.
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('doctor_schedules')
    .select('*')
    .limit(1);

  if (scheduleError) {
    console.error("Error reading doctor_schedules:", scheduleError);
  } else {
    console.log("doctor_schedules read success! Columns returned:", Object.keys(scheduleData[0] || {}));
  }

  console.log("Checking columns of schedule_templates...");
  const { data: templateData, error: templateError } = await supabase
    .from('schedule_templates')
    .select('*')
    .limit(1);

  if (templateError) {
    console.error("Error reading schedule_templates:", templateError);
  } else {
    console.log("schedule_templates read success! Columns returned:", Object.keys(templateData[0] || {}));
  }
}

inspectSchema();
