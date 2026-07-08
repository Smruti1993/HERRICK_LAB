"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// 1. Create Bill
router.post('/create', async (req, res) => {
    try {
        const { bill, linkedOrderIds } = req.body;
        if (!bill || !bill.id || !bill.patientId || !bill.items) {
            res.status(400).json({ error: 'Missing required bill information' });
            return;
        }
        // Insert bill
        const { error: billError } = await supabase.from('bills').insert({
            id: bill.id,
            patient_id: bill.patientId,
            appointment_id: bill.appointmentId || null,
            date: bill.date,
            status: bill.status,
            total_amount: bill.totalAmount,
            paid_amount: bill.paidAmount,
            invoice_no: bill.invoiceNo || null,
            discount_amount: bill.discountAmount || 0,
            tax_amount: bill.taxAmount || 0,
            round_off: bill.roundOff || 0,
            doctor_id: bill.doctorId || null,
            department_id: bill.departmentId || null,
            payment_mode: bill.paymentMode || null,
            amount_received: bill.amountReceived || 0,
            reference_no: bill.referenceNo || null,
            notes: bill.notes || null,
            created_by: bill.createdBy || 'admin',
            is_pharmacy: bill.isPharmacy || false,
            prescription_id: bill.prescriptionId || null,
            cancelled_at: bill.cancelledAt || null
        });
        if (billError) {
            console.error('Failed to create bill:', billError);
            res.status(500).json({ error: 'Failed to create bill in database: ' + billError.message });
            return;
        }
        // Insert bill items
        const itemsDb = bill.items.map((i) => ({
            id: i.id,
            bill_id: bill.id,
            item_id: i.itemId || null,
            batch_no: i.batchNo || null,
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unitPrice),
            total: Number(i.total),
            item_type: i.itemType || null,
            discount_percentage: Number(i.discountPercentage || 0),
            discount_amount: Number(i.discountAmount || 0),
            tax_percentage: Number(i.taxPercentage || 0),
            tax_amount: Number(i.taxAmount || 0)
        }));
        const { error: itemsError } = await supabase.from('bill_items').insert(itemsDb);
        if (itemsError) {
            console.error('Failed to insert bill items:', itemsError);
            // Clean up bill to avoid orphan rows if items fail
            await supabase.from('bills').delete().eq('id', bill.id);
            res.status(500).json({ error: 'Failed to save bill items: ' + itemsError.message });
            return;
        }
        // Insert payments
        if (bill.payments && bill.payments.length > 0) {
            const paymentsDb = bill.payments.map((p) => ({
                id: p.id,
                bill_id: bill.id,
                date: p.date,
                amount: Number(p.amount),
                method: p.method,
                reference: p.reference || null
            }));
            const { error: payError } = await supabase.from('payments').insert(paymentsDb);
            if (payError) {
                console.error('Failed to insert payments:', payError);
            }
        }
        // Update status of linked service orders (and trigger auto-creates lims_lab_orders via DB trigger)
        if (linkedOrderIds && linkedOrderIds.length > 0) {
            const { error: orderError } = await supabase
                .from('service_orders')
                .update({ billing_status: 'Billed', status: 'Billed' })
                .in('id', linkedOrderIds);
            if (orderError) {
                console.error('Failed to update service orders:', orderError);
            }
        }
        // --- Direct Billing Path ---
        // If the bill has Lab Test items but NO linked service_orders,
        // the DB trigger on service_orders will never fire.
        // In this case we create lims_lab_orders directly here.
        const labItems = bill.items?.filter((i) => i.itemType === 'Lab Test' || i.itemType === 'Laboratory' || i.itemType === 'lab_test') || [];
        if (labItems.length > 0 && (!linkedOrderIds || linkedOrderIds.length === 0)) {
            // 1. Resolve or create a stub appointment for direct billing
            let appointmentId = bill.appointmentId || null;
            if (!appointmentId && bill.patientId) {
                try {
                    // Check if there is an existing appointment for this patient today
                    const todayStr = new Date().toISOString().split('T')[0];
                    const { data: existingApp } = await supabase
                        .from('appointments')
                        .select('id')
                        .eq('patient_id', bill.patientId)
                        .eq('date', todayStr)
                        .limit(1);
                    if (existingApp && existingApp.length > 0) {
                        appointmentId = existingApp[0].id;
                    }
                    else {
                        // Create a stub appointment for direct billing
                        const newAppId = crypto.randomUUID();
                        const { error: appErr } = await supabase.from('appointments').insert({
                            id: newAppId,
                            patient_id: bill.patientId,
                            date: todayStr,
                            time: new Date().toTimeString().slice(0, 5),
                            status: 'Completed',
                            visit_type: 'Direct Billing',
                            doctor_id: bill.doctorId || null,
                            department_id: bill.departmentId || null
                        });
                        if (!appErr) {
                            appointmentId = newAppId;
                        }
                    }
                }
                catch (appQueryErr) {
                    console.error('Failed to resolve/create stub appointment for direct billing:', appQueryErr);
                }
            }
            for (const labItem of labItems) {
                // Resolve service_id by name if not provided by the frontend
                let resolvedServiceId = labItem.itemId || null;
                if (!resolvedServiceId && labItem.description) {
                    const { data: svcMatch } = await supabase
                        .from('service_definitions')
                        .select('id')
                        .ilike('name', labItem.description)
                        .limit(1);
                    if (svcMatch && svcMatch.length > 0) {
                        resolvedServiceId = svcMatch[0].id;
                    }
                }
                // Create a service_order row first (so lims_lab_orders can reference it)
                const serviceOrderId = crypto.randomUUID();
                await supabase.from('service_orders').insert({
                    id: serviceOrderId,
                    appointment_id: appointmentId,
                    service_id: resolvedServiceId,
                    service_name: labItem.description,
                    cpt_code: labItem.cptCode || null,
                    quantity: labItem.quantity || 1,
                    unit_price: labItem.unitPrice || 0,
                    total_price: labItem.total || 0,
                    status: 'Billed',
                    billing_status: 'Billed',
                    priority: 'Routine',
                    order_date: new Date().toISOString(),
                    ordering_doctor_id: bill.doctorId || null,
                    service_center: bill.departmentId || null
                });
            }
        }
        res.json({ success: true, message: 'Bill created successfully', billId: bill.id });
    }
    catch (err) {
        console.error('Create bill error:', err);
        res.status(500).json({ error: 'Internal server error while creating bill' });
    }
});
// 2. Cancel Bill
router.post('/cancel', async (req, res) => {
    try {
        const { id, cancelledAt } = req.body;
        if (!id) {
            res.status(400).json({ error: 'Missing bill ID' });
            return;
        }
        const dateStr = cancelledAt || new Date().toISOString();
        const { error } = await supabase
            .from('bills')
            .update({ status: 'Cancelled', refund_status: 'Pending', cancelled_at: dateStr })
            .eq('id', id);
        if (error) {
            console.error('Failed to cancel bill:', error);
            res.status(500).json({ error: 'Failed to cancel bill in database: ' + error.message });
            return;
        }
        res.json({ success: true, message: 'Bill cancelled successfully', cancelledAt: dateStr });
    }
    catch (err) {
        console.error('Cancel bill error:', err);
        res.status(500).json({ error: 'Internal server error while cancelling bill' });
    }
});
// 3. Add Payment
router.post('/add-payment', async (req, res) => {
    try {
        const { payment, billId, newPaidAmount, newStatus } = req.body;
        if (!payment || !billId || newPaidAmount === undefined || !newStatus) {
            res.status(400).json({ error: 'Missing payment details' });
            return;
        }
        // Insert payment receipt
        const { error: payError } = await supabase.from('payments').insert({
            id: payment.id,
            bill_id: billId,
            date: payment.date,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference || null
        });
        if (payError) {
            console.error('Failed to insert payment:', payError);
            res.status(500).json({ error: 'Failed to insert payment receipt: ' + payError.message });
            return;
        }
        // Update bill paid amount and status
        const { error: billError } = await supabase
            .from('bills')
            .update({ paid_amount: newPaidAmount, status: newStatus })
            .eq('id', billId);
        if (billError) {
            console.error('Failed to update bill payment details:', billError);
            res.status(500).json({ error: 'Failed to update bill payment details: ' + billError.message });
            return;
        }
        res.json({ success: true, message: 'Payment added successfully' });
    }
    catch (err) {
        console.error('Add payment error:', err);
        res.status(500).json({ error: 'Internal server error while adding payment' });
    }
});
// 4. Send WhatsApp Invoice PDF via Twilio
router.post('/send-whatsapp', async (req, res) => {
    try {
        const { phoneNo, invoiceNo, pdfBase64 } = req.body;
        if (!phoneNo || !invoiceNo || !pdfBase64) {
            res.status(400).json({ error: 'Missing phoneNo, invoiceNo, or pdfBase64' });
            return;
        }
        const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
        const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
        const fromWhatsApp = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
        if (!accountSid || !authToken || !fromWhatsApp) {
            console.warn('Twilio credentials not configured in environment variables');
            res.status(500).json({ error: 'Twilio configurations are missing on the server.' });
            return;
        }
        // 1. Upload base64 PDF to Supabase Storage using admin client (bypassing client RLS policies)
        const fileName = `${invoiceNo}-${Date.now()}.pdf`;
        const buffer = Buffer.from(pdfBase64, 'base64');
        console.log(`Uploading PDF to storage bucket "invoices" via admin client: ${fileName} (${buffer.length} bytes)`);
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('invoices')
            .upload(fileName, buffer, {
            contentType: 'application/pdf',
            upsert: true
        });
        if (uploadError) {
            console.error('Supabase admin storage upload failed:', uploadError);
            res.status(502).json({ error: `Storage upload failed: ${uploadError.message}` });
            return;
        }
        // 2. Get the public URL of the uploaded file
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('invoices')
            .getPublicUrl(fileName);
        if (!publicUrl) {
            res.status(500).json({ error: 'Failed to generate public URL for the invoice PDF' });
            return;
        }
        // Clean phone number: keep only digits
        let cleanedPhone = phoneNo.replace(/\D/g, '');
        // Format phone number to E.164 (Twilio expects whatsapp:+[country_code][number])
        let finalPhone = '';
        if (phoneNo.startsWith('+')) {
            finalPhone = `whatsapp:${phoneNo}`;
        }
        else if (phoneNo.startsWith('00')) {
            finalPhone = `whatsapp:+${phoneNo.slice(2)}`;
        }
        else if (cleanedPhone.length === 10) {
            finalPhone = `whatsapp:+91${cleanedPhone}`;
        }
        else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
            finalPhone = `whatsapp:+${cleanedPhone}`;
        }
        else {
            finalPhone = `whatsapp:+${cleanedPhone}`;
        }
        console.log(`Sending WhatsApp bill to ${finalPhone} for invoice ${invoiceNo} (PDF: ${publicUrl})`);
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const bodyParams = new URLSearchParams({
            From: fromWhatsApp,
            To: finalPhone,
            Body: `Hello! Here is your bill/invoice ${invoiceNo} for the dispensed medicines.`,
            MediaUrl: publicUrl
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
        if (!response.ok) {
            console.error('Twilio API returned error:', data);
            res.status(502).json({ error: data.message || 'Twilio failed to send WhatsApp message' });
            return;
        }
        console.log(`WhatsApp message sent successfully: ${data.sid}`);
        res.json({ success: true, message: 'WhatsApp message sent successfully', messageSid: data.sid });
    }
    catch (err) {
        console.error('Send WhatsApp error:', err);
        res.status(500).json({ error: 'Internal server error while sending WhatsApp message' });
    }
});
exports.default = router;
