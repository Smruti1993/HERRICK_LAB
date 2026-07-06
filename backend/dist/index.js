"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const adjudicate_1 = __importDefault(require("./routes/adjudicate"));
const auth_1 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: '*', // For development. Can be updated to the React client's URL for production.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Public status check route
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', message: 'HIS-WEB5 Backend Server is running.' });
});
// Secure API routes
app.use('/api/adjudicate', auth_1.authenticateJWT, adjudicate_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
