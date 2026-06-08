const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://svfmxmesdgazkivvqeiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Zm14bWVzZGdhemtpdnZxZWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjAxMTksImV4cCI6MjA4NDk5NjExOX0.tygzE17-hKn1DEj4kLhVtmsei2KXuMGocnBpEiKZeX4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGrnItems() {
  try {
    const grnIds = ['5fa295c3-a073-40c8-8f22-74fb900f1d7e', '56a63d98-bbad-4177-be33-4a1cb26fec90'];
    const { data: items, error } = await supabase
      .from('procurement_grn_items')
      .select('*')
      .in('grn_id', grnIds);

    if (error) throw error;
    console.log(`Found ${items.length} items:`);
    items.forEach(i => {
      console.log(`- Item ID: ${i.id}, GRN ID: ${i.grn_id}, CGST: ${i.cgst_amount}, SGST: ${i.sgst_amount}, IGST: ${i.igst_amount}`);
    });
  } catch (err) {
    console.error(err);
  }
}

inspectGrnItems();
