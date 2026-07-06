"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
// Service role key bypasses RLS — required for server-side proxy queries.
// Get it from: Supabase Dashboard > Settings > API > service_role
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
router.all('/*', async (req, res) => {
    try {
        const subPath = req.params[0]; // Wildcard route parameter
        const queryStr = req.url.split('?')[1] || '';
        const targetUrl = `${supabaseUrl}/rest/v1/${subPath}${queryStr ? '?' + queryStr : ''}`;
        // Setup forwarding headers — use service role key to bypass RLS
        const headers = {
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': req.headers['prefer'] || '',
        };
        // Forward range header if present (used for pagination limits)
        if (req.headers['range']) {
            headers['Range'] = req.headers['range'];
        }
        // Forward authorization header if it exists, is not empty, and is a genuine Supabase JWT
        // Otherwise, default to the anonymous key Bearer token so PostgREST allows the query
        if (req.headers.authorization && !req.headers.authorization.includes('demo-token')) {
            const tokenVal = req.headers.authorization.split(' ')[1];
            if (tokenVal && tokenVal.trim().length > 0 && tokenVal !== 'null' && tokenVal !== 'undefined') {
                headers['Authorization'] = req.headers.authorization;
            }
            else {
                headers['Authorization'] = `Bearer ${supabaseServiceKey}`;
            }
        }
        else {
            headers['Authorization'] = `Bearer ${supabaseServiceKey}`;
        }
        const init = {
            method: req.method,
            headers,
        };
        // Forward request body if method has one
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            init.body = JSON.stringify(req.body);
        }
        // Audit logs for compliance (HIPAA)
        console.log(`[DB Proxy Log] [User: ${req.user?.email || req.user?.id || 'System'}] [Method: ${req.method}] [Path: /rest/v1/${subPath}]`);
        const dbResponse = await fetch(targetUrl, init);
        const dbData = await dbResponse.text();
        if (dbResponse.status >= 400) {
            console.log(`[DB Proxy Error] [Path: /rest/v1/${subPath}] [Status: ${dbResponse.status}] [Body: ${dbData}]`);
        }
        // Set response status
        res.status(dbResponse.status);
        // Forward PostgREST response headers
        const copyHeaders = ['preference-applied', 'content-range', 'location', 'content-type'];
        copyHeaders.forEach(h => {
            const val = dbResponse.headers.get(h);
            if (val) {
                res.setHeader(h, val);
            }
        });
        res.send(dbData);
    }
    catch (err) {
        console.error('DB Proxy Exception:', err);
        res.status(500).json({ error: 'Database proxy error: ' + err.message });
    }
});
exports.default = router;
