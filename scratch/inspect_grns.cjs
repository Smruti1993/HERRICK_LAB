const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    try {
        // Find Tabuk vendor
        const { data: vendors, error: vErr } = await supabase
            .from('procurement_vendors')
            .select('*');
        
        if (vErr) throw vErr;
        
        const tabuk = vendors.find(v => v.name.toLowerCase().includes('tabuk') || v.code === 'VEN001');
        if (!tabuk) {
            console.log("Tabuk vendor not found. Available vendors:");
            vendors.forEach(v => console.log(` - ${v.name} (${v.code}) [ID: ${v.id}]`));
            return;
        }

        console.log(`Found Tabuk: ${tabuk.name} (${tabuk.code}) [ID: ${tabuk.id}]`);

        // Fetch GRNs
        const { data: grns, error: gErr } = await supabase
            .from('procurement_grns')
            .select('*')
            .eq('vendor_id', tabuk.id);

        if (gErr) throw gErr;

        console.log(`\nFound ${grns.length} GRNs for Tabuk:`);
        for (const g of grns) {
            console.log(`GRN No: ${g.grn_no} | Invoice No: ${g.invoice_no} | Net Amt: ${g.net_amount} | Status: ${g.status} [ID: ${g.id}]`);
            
            // Fetch items
            const { data: items, error: iErr } = await supabase
                .from('procurement_grn_items')
                .select('*')
                .eq('grn_id', g.id);
            
            if (iErr) throw iErr;
            console.log(`  Items (${items.length}):`);
            items.forEach(i => {
                console.log(`   - ItemID: ${i.item_id} | Qty: ${i.accepted_quantity} | Rate: ${i.rate} | VAT%: ${i.vat_percentage} | CGST: ${i.cgst_amount} | SGST: ${i.sgst_amount} | IGST: ${i.igst_amount} | Total: ${i.total_amount}`);
            });
        }

    } catch (e) {
        console.error("Error inspecting database:", e);
    }
}

inspect();
