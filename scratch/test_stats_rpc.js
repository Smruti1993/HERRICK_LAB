import { createClient } from '@supabase/supabase-js';

const url = 'https://wbjtdhtvzlefzjvwhkui.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(url, key);

function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function testRpc() {
  const docId = '1769694978243';
  const weekStart = getWeekStart();
  console.log(`Calling get_doctor_schedule_stats with docId=${docId}, weekStart=${weekStart}...`);
  const { data, error } = await supabase.rpc('get_doctor_schedule_stats', {
    p_doctor_id: docId,
    p_week_start: weekStart
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Data:", data);
  }
}

testRpc();
