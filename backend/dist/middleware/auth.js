"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(`[Auth Middleware] Received Auth Header: "${authHeader}"`);
    if (!authHeader) {
        console.log(`[Auth Middleware] Missing Auth Header`);
        res.status(401).json({ error: 'Authorization header missing' });
        return;
    }
    // Parse comma-separated authorization values (browser/proxies sometimes combine them)
    const authParts = authHeader.split(',').map(p => p.trim());
    // 1. Look for a demo token first
    const demoPart = authParts.find(p => p.startsWith('Bearer demo-token:'));
    if (demoPart) {
        const token = demoPart.substring(7); // Remove 'Bearer '
        const tokenParts = token.split(':');
        req.user = {
            email: tokenParts[1] || 'demo@medicore.com',
            role: tokenParts[2] || 'Admin',
            id: 'demo-user-id'
        };
        next();
        return;
    }
    // 2. Otherwise look for any other Bearer token
    const bearerPart = authParts.find(p => p.startsWith('Bearer '));
    if (!bearerPart) {
        console.log(`[Auth Middleware] Malformed Auth Header`);
        res.status(401).json({ error: 'Authorization header malformed' });
        return;
    }
    const token = bearerPart.substring(7); // Remove 'Bearer '
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            console.log(`[Auth Middleware] Supabase getUser failed for token: "${token.substring(0, 20)}...". Error:`, error?.message || 'No user found');
            res.status(403).json({ error: 'Invalid or expired authentication token' });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
exports.authenticateJWT = authenticateJWT;
