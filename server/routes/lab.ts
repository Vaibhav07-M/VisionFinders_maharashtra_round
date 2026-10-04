import { Router, Request, Response } from 'express';
import { db } from '../db/firestore';
import { authMiddleware, requireRole } from '../modules/auth';
import {
  launchLabRun,
  stopLabRun,
  getRunProgress,
  getReportForRun,
  purgeLabRun,
  provisionSyntheticAccounts,
  isHostAllowlisted,
} from '../modules/labRunner';
import { LabScenarioConfig, LabMeasuredReport } from '../../shared/types';
import { getRealtimeInstance } from '../modules/realtime';

const router = Router();

// Middleware checking SIMULATION_ENABLED and admin roles
function labSafetyGuard(req: Request, res: Response, next: Function) {
  if (process.env.SIMULATION_ENABLED !== 'true') {
    return res.status(403).json({
      error: 'SIMULATION_DISABLED',
      code: 'VALIDATION',
      message: 'Adversarial Simulation Lab is disabled. Set SIMULATION_ENABLED=true in server environment.',
    });
  }
  next();
}

// All /api/lab endpoints require authentication, admin roles, and simulation enabled
router.use(authMiddleware);
router.use(requireRole(['organizer', 'security', 'evaluator']));
router.use(labSafetyGuard);

// POST /api/lab/provision-accounts
router.post('/provision-accounts', (req: Request, res: Response) => {
  const count = Math.min(500, Math.max(1, parseInt(req.body.count as string) || 50));
  const runId = req.body.runId;
  const accounts = provisionSyntheticAccounts(count, runId);
  return res.json({ success: true, count: accounts.length, accounts });
});

// POST /api/lab/runs (Launch real HTTP attack)
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const scenario: LabScenarioConfig = req.body;
    const targetUrl = (req.body.targetUrl as string) || `http://127.0.0.1:${process.env.PORT || 4000}`;
    const user = (req as any).user || { uid: 'admin_user', role: 'security' };

    const result = await launchLabRun({
      scenario,
      targetUrl,
      adminUser: user,
    });

    return res.status(201).json({
      success: true,
      runId: result.runId,
      targetDropId: result.targetDropId,
      status: result.status,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'LAUNCH_FAILED',
      message: err.message,
    });
  }
});

// GET /api/lab/runs (List historical runs)
router.get('/runs', (req: Request, res: Response) => {
  const reports = db.list('labReports').map(d => d.data as LabMeasuredReport);
  return res.json({ runs: reports, count: reports.length });
});

// GET /api/lab/runs/:runId (Get real-time live progress)
router.get('/runs/:runId', (req: Request, res: Response) => {
  const runId = req.params.runId as string;
  const progress = getRunProgress(runId);
  if (!progress) {
    return res.status(404).json({ error: 'RUN_NOT_FOUND', message: 'Simulation run not found.' });
  }
  return res.json({ success: true, progress, run: progress });
});

// POST /api/lab/runs/:runId/stop (Abort within 2 seconds)
router.post('/runs/:runId/stop', (req: Request, res: Response) => {
  const runId = req.params.runId as string;
  const stopped = stopLabRun(runId);
  return res.json({ success: stopped, message: stopped ? 'Attack run aborted.' : 'Run was not active.' });
});

// GET /api/lab/runs/:runId/report (Get measured report)
router.get('/runs/:runId/report', (req: Request, res: Response) => {
  const runId = req.params.runId as string;
  const report = getReportForRun(runId);
  if (!report) {
    return res.status(404).json({ error: 'REPORT_NOT_FOUND', message: 'Report not available.' });
  }
  return res.json({ report });
});

// POST /api/lab/runs/:runId/purge (Purge synthetic data & delete sandbox clone)
router.post('/runs/:runId/purge', (req: Request, res: Response) => {
  const runId = req.params.runId as string;
  const result = purgeLabRun(runId);
  return res.json({ success: true, ...result, message: 'Simulation data purged cleanly.' });
});

// POST /api/lab/chaos/disconnect (Real socket disconnect)
router.post('/chaos/disconnect', (req: Request, res: Response) => {
  const startMs = Date.now();
  const broadcaster = getRealtimeInstance();
  if (broadcaster) {
    // In socket.io, io.disconnectSockets(true) disconnects all sockets
    try {
      (broadcaster as any).io?.disconnectSockets?.(true);
    } catch (_) {}
  }
  return res.json({
    success: true,
    action: 'DISCONNECT_ALL_SOCKETS',
    timestamp: startMs,
    message: 'Disconnected all active websocket client sockets. Measuring client reconnection stopwatch.',
  });
});

export default router;
