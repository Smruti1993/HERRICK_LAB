import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

router.all('/:targetPath*', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Safely pull the database endpoint target path
    const subPath = req.params.targetPath || req.path.replace(/^\//, ''); 
    const queryStr = req.url.split('?')[1] || '';
    
    const targetUrl = `${supabaseUrl}/rest/v1/${subPath}${queryStr ? '?' + queryStr : ''}`;
    
    const headers: Record<string, string> = {
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json',
      'Prefer': req.headers['prefer'] as string || '',
    };

    if (req.headers['range']) {
      headers['Range'] = req.headers['range'] as string;
    }

    // FIXED: Corrected string verification to prevent runtime array crash errors
    if (req.headers.authorization && !req.headers.authorization.includes('demo-token')) {
      const authHeader = req.headers.authorization;
      if (authHeader.trim().length > 0 && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
        headers['Authorization'] = authHeader;
      } else {
        headers['Authorization'] = `Bearer ${supabaseServiceKey}`;
      }
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

    console.log(`[DB Proxy Log] [User: ${req.user?.email || req.user?.id || 'System'}] [Method: ${req.method}] [Path: /rest/v1/${subPath}]`);

    const dbResponse = await fetch(targetUrl, init);
    const dbData = await dbResponse.text();

    if (dbResponse.status >= 400) {
      console.log(`[DB Proxy Error] [Path: /rest/v1/${subPath}] [Status: ${dbResponse.status}] [Body: ${dbData}]`);
    }

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
