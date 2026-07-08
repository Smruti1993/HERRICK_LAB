"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ws_1 = __importDefault(require("ws"));
global.WebSocket = ws_1.default;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const adjudicate_1 = __importDefault(require("./routes/adjudicate"));
const billing_1 = __importDefault(require("./routes/billing"));
const proxy_1 = __importDefault(require("./routes/proxy"));
const lims_1 = __importDefault(require("./routes/lims"));
const astm_1 = __importDefault(require("./routes/astm"));
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5005;
// Enable CORS for all routes and explicitly include OPTIONS method
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Prefer', 'Range'],
    credentials: true
}));
// intercept and answer preflight requests immediately
app.options('*', (req, res) => {
    res.sendStatus(200);
});
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Public status check route
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', message: 'HIS-WEB5 Backend Server is running.' });
});
// Secure API routes
app.use('/api/adjudicate', auth_1.authenticateJWT, adjudicate_1.default);
app.use('/api/billing', auth_1.authenticateJWT, billing_1.default);
app.use('/api/lims', auth_1.authenticateJWT, lims_1.default);
app.use('/api/astm', auth_1.authenticateJWT, astm_1.default);
// Protect everything passing through the database proxy lane
app.use('/api/db/proxy', (req, res, next) => {
    if (req.originalUrl.includes('/app_users') || req.path.startsWith('/app_users')) {
        next(); // Bypass auth guard for login lookups
    }
    else {
        (0, auth_1.authenticateJWT)(req, res, next);
    }
}, proxy_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
