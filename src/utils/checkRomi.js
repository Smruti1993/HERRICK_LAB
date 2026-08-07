import { createClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://wbjtdhtvzlefzjvwhkui.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndianRkaHR2emxlZnpqdndoa3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODYwMzUsImV4cCI6MjA5NzQ2MjAzNX0.-ju4dC10xPXNaVMUSVQnB7UoucakJKdepxRcUgEfeis';

const supabase = createClient(HARDCODED_URL, HARDCODED_KEY);

async function checkRomi() {
  console.log("Searching for patient 'ROMI M'...");

  // 1. Get patient ID
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .ilike('first_name', '%ROMI%');

  console.log("\n--- Patients ---");
  console.log(patients);

  if (patients && patients.length > 0) {
    const patientId = patients[0].id;

    // 2. Get bills for Romi M
    const { data: bills } = await supabase
      .from('bills')
      .select('*')
      .eq('patient_id', patientId);

    console.log("\n--- Bills for Romi ---");
    console.log(bills);

    // 3. Get appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId);

    console.log("\n--- Appointments for Romi ---");
    console.log(appointments);

    if (appointments && appointments.length > 0) {
      const appIds = appointments.map(a => a.id);

      // 4. Get service orders
      const { data: serviceOrders } = await supabase
        .from('service_orders')
        .select('*')
        .in('appointment_id', appIds);

      console.log("\n--- Service Orders for Romi ---");
      serviceOrders?.forEach((so, idx) => {
        console.log(`Order ${idx + 1}:`);
        console.log(`  ID: ${so.id}`);
        console.log(`  Service: ${so.service_name}`);
        console.log(`  Status: ${so.status}`);
        console.log(`  Billing Status: ${so.billing_status}`);
      });

      if (serviceOrders && serviceOrders.length > 0) {
        const soIds = serviceOrders.map(so => so.id);

        // 5. Get lab orders
        const { data: labOrders } = await supabase
          .from('lims_lab_orders')
          .select('*')
          .in('service_order_id', soIds);

        console.log("\n--- LIMS Lab Orders for Romi ---");
        labOrders?.forEach((lo, idx) => {
          console.log(`Lab Order ${idx + 1}:`);
          console.log(`  ID: ${lo.id}`);
          console.log(`  Service Order ID: ${lo.service_order_id}`);
          console.log(`  Barcode: ${lo.barcode_no}`);
          console.log(`  Status: ${lo.status}`);
          console.log(`  Service ID: ${lo.service_id}`);
        });
      }
    }
  }
}

checkRomi();
