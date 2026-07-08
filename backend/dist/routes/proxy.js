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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
router.all('*', async (req, res) => {
    try {
        // Reconstruct the exact URL path sent from the frontend
        const cleanPath = req.url.replace(/^\//, '');
        const targetUrl = `${supabaseUrl}/rest/v1/${cleanPath}`;
        const headers = {
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': req.headers['prefer'] || '',
        };
        if (req.headers['range']) {
            headers['Range'] = req.headers['range'];
        }
        if (req.headers.authorization && !req.headers.authorization.includes('demo-token')) {
            headers['Authorization'] = req.headers.authorization;
        }
        else {
            headers['Authorization'] = `Bearer ${supabaseServiceKey}`;
        }
        const init = {
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
    }
    catch (err) {
        console.error('DB Proxy Exception:', err);
        res.status(500).json({ error: 'Database proxy error: ' + err.message });
    }
});
exports.default = router;
