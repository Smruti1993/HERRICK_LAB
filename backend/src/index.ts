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
import abdmRoutes from './routes/abdm';
import { authenticateJWT } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5005;

// Enable CORS for all routes and explicitly include OPTIONS method
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Prefer', 'Range'],
  credentials: true
}));

// intercept and answer preflight requests immediately
app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Public status check route
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'HIS-WEB5 Backend Server is running.' });
});

// Secure API routes
app.use('/api/adjudicate', authenticateJWT, adjudicateRoutes);
app.use('/api/billing', authenticateJWT, billingRoutes);
app.use('/api/lims', authenticateJWT, limsRoutes);
app.use('/api/astm', authenticateJWT, astmRoutes);
app.use('/api/abdm', authenticateJWT, abdmRoutes);

// Protect everything passing through the database proxy lane
app.use('/api/db/proxy', (req, res, next) => {
  if (req.originalUrl.includes('/app_users') || req.path.startsWith('/app_users')) {
    next(); // Bypass auth guard for login lookups
  } else {
    authenticateJWT(req, res, next);
  }
}, proxyRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
