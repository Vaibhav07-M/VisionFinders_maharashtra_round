import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { authMiddleware, requireRole } from './modules/auth';
import { sendOtpHandler, verifyOtpHandler } from './modules/identity';
import { initSampleDrops, listDropsHandler, getDropHandler, createDropHandler } from './modules/drops';
import { joinDropHandler } from './modules/entry';
import { triggerDrawHandler } from './modules/draw';
import { startHoldExpirationScheduler } from './modules/reservation';
import { checkoutHandler } from './modules/checkout';
import { setupRealtimeServer } from './modules/realtime';
import { healthHandler, metricsHandler } from './modules/health';
import { metricsCollector } from './modules/metrics';
import { verifyAuditHashChain } from './modules/audit';
import { runSystemInvariantCheck } from './modules/invariants';
import { injectFailureHandler, getInjectedLatencyMs } from './modules/failureInjection';
import { runSimulationApiHandler } from './modules/simulation';
import { db } from './db/firestore';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Enable CORS for frontend Vite dev server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-user-role', 'x-user-uid', 'x-device-id', 'x-client-jitter'],
}));

app.use(express.json());

// Injected Latency & Telemetry Middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  const latency = getInjectedLatencyMs();
  if (latency > 0) {
    await new Promise(r => setTimeout(r, latency));
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsCollector.recordRequest({
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      timestamp: Date.now(),
      isBot: req.body?.isBot || false,
    });
  });

  next();
});

// Realtime Socket.io Server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});
const realtime = setupRealtimeServer(io);

// Seed Sample Drops & Start Schedulers
initSampleDrops();
startHoldExpirationScheduler();

// ==================== REST API ROUTES ==================== //

// Health & System Metrics (Section 5 #13)
app.get('/api/health', healthHandler);
app.get('/api/metrics', metricsHandler);

// Identity Verification (Section 5 #2)
app.post('/api/identity/send-otp', authMiddleware, sendOtpHandler);
app.post('/api/identity/verify-otp', authMiddleware, verifyOtpHandler);

// Drops Catalog & Management (Section 5 #3)
app.get('/api/drops', listDropsHandler);
app.get('/api/drops/:id', getDropHandler);
app.post('/api/drops', authMiddleware, requireRole(['organizer', 'security']), createDropHandler);

// Drop Entry / Join Pipeline (Section 5 #4)
app.post('/api/drops/:id/join', authMiddleware, joinDropHandler);

// Draw Execution & Seed Reveal (Section 5 #5)
app.post('/api/drops/:id/draw', authMiddleware, triggerDrawHandler);

// Seat Checkout & HMAC Signed Pass (Section 5 #7)
app.post('/api/checkout', authMiddleware, checkoutHandler);

// Audit Hash Chain & Ledger Verification (Section 5 #11)
app.get('/api/audit', (req, res) => {
  const records = db.list('auditLog').map(d => d.data);
  res.json({ records });
});
app.post('/api/audit/verify', (req, res) => {
  const result = verifyAuditHashChain();
  res.json(result);
});

// Invariant Integrity Checker (Section 5 #12)
app.get('/api/invariants/:dropId', (req, res) => {
  const result = runSystemInvariantCheck(req.params.dropId);
  res.json(result);
});

// Chaos Failure Injection (Section 5 #15)
app.post('/api/chaos/inject', injectFailureHandler);

// Simulation API (Section 5 #14)
app.post('/api/simulation/run', runSimulationApiHandler);

// Demo Reset Helper (Section 11)
app.post('/api/demo/reset', (req, res) => {
  db.resetAll();
  initSampleDrops();
  res.json({ success: true, message: 'All database records reset to pristine state.' });
});

server.listen(PORT, () => {
  console.log(`[FAIR DROP] Express + Socket.io Server listening on port ${PORT}`);
  console.log(`[FAIR DROP] Verification Endpoint: http://localhost:${PORT}/api/health`);
});

export { app, server };
