import { BACKEND_URL, getAuthToken } from './supabaseClient';
import html2pdf from 'html2pdf.js';

/**
 * Generates an invoice PDF from a DOM element, uploads it to Supabase Storage,
 * and calls the backend API to send it as a WhatsApp message via Twilio.
 * 
 * @param element The DOM element (print container) to generate PDF from.
 * @param phoneNo The patient's registered phone number.
 * @param invoiceNo The sequential invoice number.
 * @returns A promise resolving to a success/error object.
 */
export const sendInvoicePdf = async (
  element: HTMLElement,
  phoneNo: string,
  invoiceNo: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!phoneNo || !phoneNo.trim()) {
      return { success: false, message: 'Patient phone number is not available.' };
    }

    if (!invoiceNo) {
      return { success: false, message: 'Invoice number is missing.' };
    }

    console.log(`Starting WhatsApp Invoice PDF generation for ${invoiceNo}...`);

    // Configuration options for html2pdf.js
    const opt = {
      margin:       0.3, // margins in inches
      filename:     `${invoiceNo}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };

    // 1. Generate PDF blob from the DOM element
    // html2pdf.js can render nodes even if they are positioned off-screen
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Generated PDF blob is empty.');
    }

    console.log(`PDF successfully generated. Size: ${(pdfBlob.size / 1024).toFixed(2)} KB.`);

    // 2. Convert Blob to Base64 String
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data URL header e.g. "data:application/pdf;base64,"
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(pdfBlob);
    });

    const pdfBase64 = await base64Promise;

    // 3. Send trigger and base64 PDF to the Express backend to upload and invoke Twilio
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/billing/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        phoneNo,
        invoiceNo,
        pdfBase64
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Backend WhatsApp trigger failed:', data);
      return { success: false, message: data.error || 'Failed to send WhatsApp message through backend.' };
    }

    console.log('WhatsApp message successfully triggered through backend.');
    return { success: true, message: 'Invoice PDF has been successfully sent to the patient via WhatsApp!' };
  } catch (error: any) {
    console.error('sendInvoicePdf error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during PDF generation/delivery.' };
  }
};
