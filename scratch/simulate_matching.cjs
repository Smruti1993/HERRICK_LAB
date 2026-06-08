const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateMatching() {
  try {
    // 1. Fetch data
    const { data: uploads } = await supabase.from('procurement_gstr2b_uploads').select('*');
    const { data: invoices } = await supabase.from('procurement_gstr2b_invoices').select('*');
    const { data: grns } = await supabase.from('procurement_grns').select('*');
    const { data: grnItems } = await supabase.from('procurement_grn_items').select('*');
    const { data: vendors } = await supabase.from('procurement_vendors').select('*');

    console.log(`Loaded ${uploads.length} uploads, ${invoices.length} invoices, ${grns.length} GRNs, ${grnItems.length} grnItems.`);

    const sortedUploads = [...uploads].sort((a, b) => {
      const dateA = a.upload_date ? new Date(a.upload_date).getTime() : 0;
      const dateB = b.upload_date ? new Date(b.upload_date).getTime() : 0;
      return dateB - dateA;
    });

    if (sortedUploads.length === 0) {
      console.log("No uploads found.");
      return;
    }

    const latest = sortedUploads[0];
    console.log(`Latest upload ID: ${latest.id}, is_reconciled: ${latest.is_reconciled}`);

    const uploadedInvoices = invoices.filter(i => i.upload_id === latest.id);
    console.log(`Uploaded invoices count for latest: ${uploadedInvoices.length}`);

    // Map GRNs
    const mappedGRNs = grns.map(g => {
      const myItems = grnItems.filter(i => i.grn_id === g.id);
      return {
        id: g.id,
        grnNo: g.grn_no,
        vendorId: g.vendor_id,
        netAmount: Number(g.net_amount || 0),
        invoiceNo: g.invoice_no || undefined,
        gateEntryDate: g.gate_entry_date,
        items: myItems.map(i => ({
          cgstAmount: Number(i.cgst_amount || 0),
          sgstAmount: Number(i.sgst_amount || 0),
          igstAmount: Number(i.igst_amount || 0)
        }))
      };
    });

    const dbGRNs = mappedGRNs.filter(g => 
      g.invoiceNo && 
      g.invoiceNo.trim() !== ''
    );
    console.log(`Mapped GRNs with invoice numbers count: ${dbGRNs.length}`);

    let totalTaxHold = 0;
    let matchedCount = 0;
    let mismatchedCount = 0;
    let pendingFilingCount = 0;
    const toleranceLimit = 100;

    const reconciled = dbGRNs.map(g => {
      const cgst = g.items?.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
      const sgst = g.items?.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
      const igst = g.items?.reduce((sum, item) => sum + (item.igstAmount || 0), 0) || 0;
      const dbTax = cgst + sgst + igst || (g.netAmount * 0.18 / 1.18);
      const roundedDbTax = Number(Number(dbTax).toFixed(2));

      const match = uploadedInvoices.find(u => 
        u.invoice_no.toLowerCase().trim() === g.invoiceNo?.toLowerCase().trim()
      );

      let status = 'Matched';
      let diff = 0;
      let reason = 'Fully reconciled';
      let gstrValue = g.netAmount;

      if (match) {
        const portalTax = match.tax_amount;
        if (roundedDbTax - portalTax > toleranceLimit) {
          status = 'Shortfall';
          diff = Number((roundedDbTax - portalTax).toFixed(2));
          reason = 'Tax rate mismatch';
          mismatchedCount++;
          totalTaxHold += diff;
          gstrValue = Math.max(0, g.netAmount - diff);
        } else {
          matchedCount++;
        }
      } else {
        status = 'Pending Filing';
        diff = roundedDbTax;
        reason = 'Vendor GSTR-1 not filed';
        pendingFilingCount++;
        totalTaxHold += diff;
        gstrValue = 0;
      }

      return {
        id: g.id,
        invoiceNo: g.invoiceNo,
        vendor: vendors.find(v => v.id === g.vendorId)?.name || 'Vendor',
        grnValue: g.netAmount,
        gstrValue: gstrValue,
        diff: diff,
        status: status,
        reason: reason
      };
    });

    console.log("\nReconciliation results:");
    reconciled.forEach(r => {
      console.log(`- Invoice No: ${r.invoiceNo}, Vendor: ${r.vendor}, Status: ${r.status}, Diff: ${r.diff}, Reason: ${r.reason}`);
    });
    console.log(`Summary: Matched=${matchedCount}, Mismatched=${mismatchedCount}, PendingFiling=${pendingFilingCount}`);

  } catch (err) {
    console.error(err);
  }
}

simulateMatching();
