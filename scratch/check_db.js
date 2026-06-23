import { createClient } from '@supabase/supabase-js';

const url = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(url, key);

async function main() {
  const { data: depts, error: deptsErr } = await supabase.from('departments').select('*');
  const { data: serviceCentres, error: scErr } = await supabase.from('service_centres').select('*');
  const { data: employees, error: empErr } = await supabase.from('employees').select('*');

  console.log("=== DEPARTMENTS ===");
  console.log(depts);
  console.log("=== SERVICE CENTRES ===");
  console.log(serviceCentres);
  console.log("=== EMPLOYEES ===");
  console.log(employees);
}

main().catch(console.error);
