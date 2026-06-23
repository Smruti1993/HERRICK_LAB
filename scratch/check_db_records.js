import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

async function checkRecords() {
  console.log("Fetching all rows from doctor_schedules...");
  const { data, error } = await supabase
    .from('doctor_schedules')
    .select('*');

  if (error) {
    console.error("Error reading doctor_schedules:", error);
    return;
  }

  console.log(`Success! Found ${data.length} records in doctor_schedules:`);
  console.log(JSON.stringify(data, null, 2));

  console.log("\nFetching all rows from schedule_templates...");
  const { data: templates, error: tempError } = await supabase
    .from('schedule_templates')
    .select('*');

  if (tempError) {
    console.error("Error reading schedule_templates:", tempError);
    return;
  }
  console.log(`Success! Found ${templates.length} templates:`);
  console.log(JSON.stringify(templates, null, 2));
}

checkRecords();
