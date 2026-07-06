import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

router.all('*', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Reconstruct the exact URL path sent from the frontend
    const cleanPath = req.url.replace(/^\//, '');
    const targetUrl = `${supabaseUrl}/rest/v1/${cleanPath}`;
    
    const headers: Record<string, string> = {
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json',
      'Prefer': req.headers['prefer'] as string || '',
    };

    if (req.headers['range']) {
      headers['Range'] = req.headers['range'] as string;
    }

    if (req.headers.authorization && !req.headers.authorization.includes('demo-token')) {
      headers['Authorization'] = req.headers.authorization;
    } else {
      headers['Authorization'] = `Bearer ${supabaseServiceKey}`;
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      init.body = JSON.stringify(req.body);
    }

    console.log(`[DB Proxy Log] Forwarding to: ${targetUrl}`);

    const dbResponse = await fetch(targetUrl, init);
    const dbData = await dbResponse.text();

    res.status(dbResponse.status);

    const copyHeaders = ['preference-applied', 'content-range', 'location', 'content-type'];
    copyHeaders.forEach(h => {
      const val = dbResponse.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    });

    res.send(dbData);
  } catch (err: any) {
    console.error('DB Proxy Exception:', err);
    res.status(500).json({ error: 'Database proxy error: ' + err.message });
  }
});

export default router;
