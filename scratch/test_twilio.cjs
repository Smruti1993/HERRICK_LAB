const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse backend/.env file to avoid external package dependency
const envPath = path.join(__dirname, '../backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const cleanLine = line.trim();
  if (cleanLine && !cleanLine.startsWith('#')) {
    const parts = cleanLine.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envVars[key] = val;
    }
  }
});

const accountSid = envVars.TWILIO_ACCOUNT_SID;
const authToken = envVars.TWILIO_AUTH_TOKEN;
const fromWhatsApp = envVars.TWILIO_WHATSAPP_FROM;
const supabaseUrl = envVars.SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Twilio Diagnostic Tool ---');
console.log('Account SID:', accountSid ? `${accountSid.slice(0, 10)}...` : 'Missing');
console.log('Auth Token:', authToken ? `${authToken.slice(0, 6)}...` : 'Missing');
console.log('From WhatsApp:', fromWhatsApp);

if (!accountSid || !authToken || !fromWhatsApp) {
  console.error('Error: Twilio credentials are not configured in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    // 1. Get the latest direct sale to extract the patient number
    console.log('\nFetching latest direct sale from database...');
    const { data: sales, error: saleError } = await supabase
      .from('pharmacy_direct_sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (saleError) {
      throw new Error(`Failed to fetch latest sale: ${saleError.message}`);
    }

    if (!sales || sales.length === 0) {
      console.log('No direct sales found in the database. Please perform a dispense first.');
      process.exit(1);
    }

    const latestSale = sales[0];
    const phoneNo = latestSale.phone_no;
    const invoiceNo = latestSale.invoice_no || latestSale.sale_no;

    console.log(`Latest Sale Details:`);
    console.log(`- Invoice No: ${invoiceNo}`);
    console.log(`- Patient Name: ${latestSale.first_name} ${latestSale.last_name || ''}`);
    console.log(`- Phone No: ${phoneNo}`);

    if (!phoneNo) {
      console.error('Error: The latest sale does not have a registered phone number.');
      process.exit(1);
    }

    // 2. Fetch the generated PDF URL from Supabase Storage
    console.log('\nLooking for PDF in Supabase Storage...');
    // List files in the invoices bucket
    const { data: files, error: storageError } = await supabase.storage
      .from('invoices')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (storageError) {
      throw new Error(`Failed to list bucket files: ${storageError.message}`);
    }

    let pdfUrl = '';
    const matchingFile = files.find(f => f.name.startsWith(invoiceNo));
    if (matchingFile) {
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(matchingFile.name);
      pdfUrl = publicUrl;
      console.log(`Found matching PDF: ${matchingFile.name}`);
      console.log(`PDF URL: ${pdfUrl}`);
    } else {
      console.log('Warning: No matching PDF found in storage. Using a fallback test PDF.');
      pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }

    // 3. Format the phone number
    let cleanedPhone = phoneNo.replace(/\D/g, '');
    let finalPhone = '';
    if (phoneNo.startsWith('+')) {
      finalPhone = `whatsapp:${phoneNo}`;
    } else if (phoneNo.startsWith('00')) {
      finalPhone = `whatsapp:+${phoneNo.slice(2)}`;
    } else if (cleanedPhone.length === 10) {
      finalPhone = `whatsapp:+91${cleanedPhone}`;
    } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
      finalPhone = `whatsapp:+${cleanedPhone}`;
    } else {
      finalPhone = `whatsapp:+${cleanedPhone}`;
    }

    console.log(`Cleaned recipient: ${finalPhone}`);

    // 4. Send the request to Twilio API
    console.log('\nSending request to Twilio API...');
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const bodyParams = new URLSearchParams({
      From: fromWhatsApp,
      To: finalPhone,
      Body: `Hello! Here is your bill/invoice ${invoiceNo} for the dispensed medicines.`,
      MediaUrl: pdfUrl
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: bodyParams.toString()
    });

    const data = await response.json();
    console.log(`Twilio Status: ${response.status} ${response.statusText}`);
    console.log('Twilio API Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\nSuccess! Twilio accepted the message request.');
      console.log(`Message SID: ${data.sid}`);
      console.log(`Current Status: ${data.status}`);

      // Wait 8 seconds to allow Twilio to attempt delivery, then query final status
      console.log('\nWaiting 8 seconds for delivery status update...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      console.log('Querying message status...');
      const statusResponse = await fetch(`${twilioUrl.replace('.json', '')}/${data.sid}.json`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });
      const statusData = await statusResponse.json();
      console.log(`Final Twilio Status: ${statusData.status}`);
      if (statusData.error_code) {
        console.error(`Delivery Error Code: ${statusData.error_code}`);
        console.error(`Delivery Error Message: ${statusData.error_message}`);
      } else {
        console.log('Message delivered or sent successfully without errors!');
      }
    } else {
      console.error('\nError: Twilio rejected the message request.');
      console.error(`Error Code: ${data.code}`);
      console.error(`Error Message: ${data.message}`);
    }

  } catch (err) {
    console.error('\nExecution Failed:', err.message);
  }
}

run();
