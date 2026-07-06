import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulator endpoint to post simulated ASTM/HL7 analyzer test readings
router.post('/simulate-run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { barcodeNo, analyzerModel } = req.body;

    if (!barcodeNo) {
      res.status(400).json({ error: 'Missing barcodeNo in analyzer instruction payload' });
      return;
    }

    // 1. Locate the LIMS lab order matching the barcode
    const { data: order, error } = await supabase
      .from('lims_lab_orders')
      .select('id, service_order_id, status')
      .eq('barcode_no', barcodeNo)
      .single();

    if (error || !order) {
      res.status(404).json({ error: `Lab order with barcode ${barcodeNo} not found.` });
      return;
    }

    if (order.status !== 'In Process') {
      res.status(400).json({ error: `Order status must be 'In Process' to run analyzer. Current: ${order.status}` });
      return;
    }

    // 2. Fetch parameter configurations to populate mock data
    const { data: serviceOrder } = await supabase
      .from('service_orders')
      .select('service_id')
      .eq('id', order.service_order_id)
      .single();

    if (!serviceOrder || !serviceOrder.service_id) {
      res.status(400).json({ error: 'Service definition mapping missing for this order.' });
      return;
    }

    const { data: params } = await supabase
      .from('lims_service_parameters')
      .select('*')
      .eq('service_id', serviceOrder.service_id);

    if (!params || params.length === 0) {
      res.status(400).json({ error: 'No test parameters configured for this lab service definitions.' });
      return;
    }

    // 3. Generate randomized mock readings matching typical range values
    const mockReadings = params.map(p => {
      let val = '12.5'; // default
      if (p.code.toUpperCase() === 'HB' || p.code.toLowerCase().includes('hemo')) {
        val = (11.5 + Math.random() * 5).toFixed(1);
      } else if (p.code.toUpperCase() === 'WBC' || p.code.toLowerCase().includes('white')) {
        val = (4000 + Math.floor(Math.random() * 7000)).toString();
      } else if (p.code.toUpperCase() === 'PLT' || p.code.toLowerCase().includes('plate')) {
        val = (150 + Math.floor(Math.random() * 250)).toString();
      } else {
        val = (Math.random() * 100).toFixed(2);
      }

      return {
        parameterId: p.id,
        value: val
      };
    });

    // 4. Save results to LIMS database triggers (auto-flagging engine routes)
    const token = req.headers.authorization;
    
    // Perform internal POST call back to the save results route
    const saveUrl = `${req.protocol}://${req.get('host')}/api/lims/results/save`;
    const response = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      },
      body: JSON.stringify({
        labOrderId: order.id,
        userId: '497f6eca-6276-4993-bfeb-53cbbbba6f08', // mock instrument engineer user
        results: mockReadings
      })
    });

    if (response.ok) {
      res.json({
        success: true,
        message: `ASTM simulation successful. Machine: ${analyzerModel || 'Roche Cobas'}. Results recorded.`,
        dataSimulated: mockReadings
      });
    } else {
      res.status(500).json({ error: 'Analyzer callback failed to record results.' });
    }
  } catch (err: any) {
    console.error('ASTM simulate error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
