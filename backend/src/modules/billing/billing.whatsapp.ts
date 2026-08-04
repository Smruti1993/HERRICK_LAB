import { createClient } from '@supabase/supabase-js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

/**
 * POST /api/billing/send-whatsapp
 * Uploads a base64-encoded invoice PDF to Supabase Storage, then dispatches
 * it via Twilio's WhatsApp API.
 */
export default async function whatsappHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { phoneNo, invoiceNo, pdfBase64 } = req.body;

    if (!phoneNo || !invoiceNo || !pdfBase64) {
      res.status(400).json({ error: 'Missing phoneNo, invoiceNo, or pdfBase64' });
      return;
    }

    const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const fromWhatsApp = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!accountSid || !authToken || !fromWhatsApp) {
      res.status(500).json({ error: 'Twilio credentials not configured on the server.' });
      return;
    }
    if (!supabaseUrl || !serviceKey) {
      res.status(500).json({ error: 'Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.' });
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Upload PDF to Supabase Storage
    const fileName = `${invoiceNo}-${Date.now()}.pdf`;
    const buffer = Buffer.from(pdfBase64, 'base64');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('invoices')
      .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      res.status(502).json({ error: `Storage upload failed: ${uploadError.message}` });
      return;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('invoices').getPublicUrl(fileName);
    if (!publicUrl) {
      res.status(500).json({ error: 'Failed to generate public URL for invoice PDF' });
      return;
    }

    // 2. Format phone for Twilio E.164
    const cleaned = phoneNo.replace(/\D/g, '');
    let finalPhone: string;
    if (phoneNo.startsWith('+')) finalPhone = `whatsapp:${phoneNo}`;
    else if (phoneNo.startsWith('00')) finalPhone = `whatsapp:+${phoneNo.slice(2)}`;
    else if (cleaned.length === 10) finalPhone = `whatsapp:+91${cleaned}`;
    else finalPhone = `whatsapp:+${cleaned}`;

    // 3. Send via Twilio
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const bodyParams = new URLSearchParams({
      From: fromWhatsApp,
      To: finalPhone,
      Body: `Hello! Here is your invoice ${invoiceNo}.`,
      MediaUrl: publicUrl,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader },
      body: bodyParams.toString(),
    });

    const data: any = await response.json();
    if (!response.ok) {
      res.status(502).json({ error: data.message || 'Twilio failed to send WhatsApp message' });
      return;
    }

    res.json({ success: true, messageSid: data.sid });
  } catch (err: any) {
    console.error('send-whatsapp error:', err);
    res.status(500).json({ error: 'Internal server error while sending WhatsApp message' });
  }
}
