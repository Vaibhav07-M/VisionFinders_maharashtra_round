import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import {
  authMiddleware,
  requireRole,
  signupHandler,
  loginHandler,
  personaLoginHandler,
  getCurrentUserHandler,
} from './modules/auth';
import { sendOtpHandler, verifyOtpHandler } from './modules/identity';
import {
  initSampleDrops,
  listDropsHandler,
  getDropHandler,
  createDropHandler,
  updateDropHandler,
  getDropSeatsHandler,
  getDropEntriesHandler,
  updateEntryStatusHandler,
} from './modules/drops';
import { joinDropHandler, getUserEntryHandler, registerEntryListener } from './modules/entry';
import { triggerDrawHandler } from './modules/draw';
import { startHoldExpirationScheduler } from './modules/reservation';
import { checkoutHandler, getMyTicketsHandler } from './modules/checkout';
import { listAppealsHandler, createAppealHandler, decideAppealHandler } from './modules/appeals';
import {
  initSecurityConfig,
  getSecurityRulesHandler,
  updateSecurityRulesHandler,
} from './modules/abuse';
import {
  runSimulationApiHandler,
  getLatestSimulationHandler,
  listSimulationRunsHandler,
  getExperimentMatrixHandler,
} from './modules/simulation';
import { setupRealtimeServer } from './modules/realtime';
import { healthHandler, metricsHandler } from './modules/health';
import { metricsCollector } from './modules/metrics';
import { verifyAuditHashChain } from './modules/audit';
import { runSystemInvariantCheck } from './modules/invariants';
import { injectFailureHandler, getInjectedLatencyMs } from './modules/failureInjection';
import { db } from './db/firestore';
import { runSeed } from './seed';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// CORS Configuration supporting Dev Tunnels and local dev
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // allow curl, same-origin, server-to-server
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  // Dev tunnel domain regex (*.devtunnels.ms)
  if (/^https?:\/\/.*\.devtunnels\.ms(:\d+)?$/.test(origin)) return true;
  if (envOrigins.some(o => o === origin || (o.includes('*') && new RegExp('^' + o.replace(/\*/g, '.*') + '$').test(origin)))) return true;
  return true; // permissive in dev emulator mode
};

app.use(cors({
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-session-id',
    'x-user-role',
    'x-user-uid',
    'x-user-email',
    'x-device-id',
    'x-client-jitter',
  ],
  credentials: true,
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
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
const realtime = setupRealtimeServer(io);

// Register socket broadcast for entries
registerEntryListener((dropId, stats) => {
  realtime.broadcastDropUpdate(dropId, { stats });
});

// Seed & Start Schedulers
initSampleDrops();
initSecurityConfig();
startHoldExpirationScheduler();

// ==================== REST API ROUTES ==================== //

// Health & System Metrics
app.get('/api/health', healthHandler);
app.get('/api/metrics', metricsHandler);

// Online Cloud Firestore Database Status & Sync
app.get('/api/database/status', (req, res) => {
  const status = db.getCloudStatus();
  return res.json({
    ...status,
    collections: db.listCollections(),
  });
});

app.post('/api/database/sync', async (req, res) => {
  const { action } = req.body;
  const status = db.getCloudStatus();
  if (!status.enabled) {
    return res.status(400).json({
      error: 'CLOUD_NOT_CONFIGURED',
      message: 'Cloud Firestore is not connected. Add serviceAccountKey.json to root or FIREBASE_SERVICE_ACCOUNT in .env.',
    });
  }
  try {
    if (action === 'push') {
      const result = await db.pushAllToCloud();
      return res.json({ success: true, message: `Pushed ${result.uploadedDocs} documents to Cloud Firestore!`, ...result });
    } else if (action === 'pull') {
      const result = await db.pullAllFromCloud();
      return res.json({ success: true, message: `Pulled ${result.downloadedDocs} documents from Cloud Firestore!`, ...result });
    } else {
      return res.status(400).json({ error: 'INVALID_ACTION', message: 'Action must be push or pull.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Real Authentication (Emulator) & Session Management
app.post('/api/auth/signup', signupHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/persona-login', personaLoginHandler);
app.get('/api/auth/me', authMiddleware, getCurrentUserHandler);

// Identity Verification & OTP
app.post('/api/identity/send-otp', authMiddleware, sendOtpHandler);
app.post('/api/identity/verify-otp', authMiddleware, verifyOtpHandler);

// Drops Catalog & Management
app.get('/api/drops', listDropsHandler);
app.get('/api/drops/:id', getDropHandler);
app.get('/api/drops/:id/seats', getDropSeatsHandler);
app.get('/api/drops/:id/entries', getDropEntriesHandler);
app.patch('/api/drops/:id/entries/:identityKey', authMiddleware, requireRole(['organizer', 'security', 'evaluator']), updateEntryStatusHandler);
app.post('/api/drops', authMiddleware, requireRole(['organizer', 'security']), createDropHandler);
app.patch('/api/drops/:id', authMiddleware, requireRole(['organizer', 'security']), updateDropHandler);

// Drop Entry / Join Pipeline
app.post('/api/drops/:id/join', authMiddleware, joinDropHandler);
app.get('/api/drops/:id/entries/me', authMiddleware, getUserEntryHandler);

// Draw Execution & Seed Reveal
app.post('/api/drops/:id/draw', authMiddleware, triggerDrawHandler);

// Seat Checkout & HMAC Signed Pass
app.post('/api/checkout', authMiddleware, checkoutHandler);
app.get('/api/tickets/me', authMiddleware, getMyTicketsHandler);

// Appeals Queue
app.get('/api/appeals', listAppealsHandler);
app.post('/api/appeals', authMiddleware, createAppealHandler);
app.post('/api/appeals/:id/decide', authMiddleware, requireRole(['organizer', 'security', 'evaluator']), decideAppealHandler);

// Security Rules & Rate Limiting
app.get('/api/security/rules', getSecurityRulesHandler);
app.post('/api/security/rules', authMiddleware, requireRole(['security', 'evaluator']), updateSecurityRulesHandler);

// Simulation API & Lab Reports
app.post('/api/simulation/run', runSimulationApiHandler);
app.get('/api/simulation/latest', getLatestSimulationHandler);
app.get('/api/simulation/runs', listSimulationRunsHandler);
app.get('/api/simulation/matrix', getExperimentMatrixHandler);

// Audit Hash Chain & Ledger Verification
app.get('/api/audit', (req, res) => {
  const records = db.list('auditLog').map(d => d.data).sort((a, b) => a.index - b.index);
  res.json({ records, count: records.length });
});
app.post('/api/audit/verify', (req, res) => {
  const result = verifyAuditHashChain();
  res.json(result);
});

// Invariant Integrity Checker
app.get('/api/invariants/:dropId', (req, res) => {
  const result = runSystemInvariantCheck(req.params.dropId);
  res.json(result);
});

// Chaos Failure Injection
app.post('/api/chaos/inject', injectFailureHandler);

// Demo Reset Helper
app.post('/api/demo/reset', (req, res) => {
  db.resetAll();
  runSeed();
  res.json({ success: true, message: 'All database records reset and re-seeded from pristine state.' });
});

server.listen(PORT, () => {
  console.log(`[FAIR DROP] Express + Socket.io Server listening on port ${PORT}`);
  console.log(`[FAIR DROP] Verification Endpoint: http://localhost:${PORT}/api/health`);
});

export { app, server };
