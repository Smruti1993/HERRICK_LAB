import 'dotenv/config';
import ws from 'ws';
(global as any).WebSocket = ws;

import express from 'express';
import cors from 'cors';
import adjudicateRoutes from './routes/adjudicate';
import billingRoutes from './routes/billing';
import proxyRoutes from './routes/proxy';
import limsRoutes from './routes/lims';
import astmRoutes from './routes/astm';
import { authenticateJWT } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5005;

// Configured to allow all origins and standard REST methods including preflight OPTIONS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Prefer', 'Range'],
  credentials: true
}));

app.use(express.json());

// Public status check route
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'HIS-WEB5 Backend Server is running.' });
});

// Secure API routes
app.use('/api/adjudicate', authenticateJWT, adjudicateRoutes);
app.use('/api/billing', authenticateJWT, billingRoutes);
app.use('/api/lims', authenticateJWT, limsRoutes);
app.use('/api/astm', authenticateJWT, astmRoutes);

// JWT Protected proxy middleware lane
app.use('/api/db/proxy', (req, res, next) => {
  // Fixed: originalUrl tracks path suffixes safely on cloud hosting layers
  if (req.originalUrl.includes('/app_users') || req.path.startsWith('/app_users')) {
    next(); // Safely bypass auth guard for login lookups
  } else {
    authenticateJWT(req, res, next); // Strict JWT validation lock for all other database actions
  }
}, proxyRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
