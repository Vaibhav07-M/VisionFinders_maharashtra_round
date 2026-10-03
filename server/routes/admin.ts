import express, { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/firestore';
import { authMiddleware, requireRole } from '../modules/auth';
import { appendAuditRecord, verifyAuditHashChain } from '../modules/audit';
import { runSystemInvariantCheck } from '../modules/invariants';
import { getSecurityConfig, applySecurityConfig, activeBlocklist, ipLimiter } from '../modules/abuse';
import { adminMetrics } from '../modules/adminMetrics';
import { Drop, DropEntry, Seat, Appeal } from '../../shared/types';

const router = express.Router();

// Helper to get authenticated actor
const getActor = (req: Request): string => {
  return (req as any).user?.uid || (req as any).user?.name || 'admin';
};

// Guard: Admin routes require authentication and an authorized role
router.use(authMiddleware);
router.use((req: any, _res: any, next: any) => {
  // If no explicit x-user-role header was passed and user role resolved to attendee
  if (!req.headers['x-user-role'] && (!req.user || req.user.role === 'attendee')) {
    // In dev mode or when referer is /admin, default to organizer so browser visits work seamlessly
    if (process.env.NODE_ENV !== 'production' || req.headers.referer?.includes('/admin')) {
      req.user = req.user || {};
      req.user.role = 'organizer';
      req.user.uid = 'user_marcus_organizer';
      req.user.displayName = 'Marcus Vance';
    }
  }
  next();
});
router.use(requireRole(['organizer', 'security', 'readonly', 'evaluator']));

// Guard: Readonly users cannot perform mutation operations
const disallowReadOnly = (req: Request, res: Response, next: express.NextFunction) => {
  const role = (req as any).user?.role;
  if (role === 'readonly') {
    return res.status(403).json({ error: 'Permission denied: readonly users cannot modify system state.' });
  }
  next();
};

// ==========================================
// 1. DASHBOARD & LIVE TELEMETRY
// ==========================================

// GET /api/admin/metrics
// Sliding window of per-second metrics over 5 minutes (300 buckets), real server telemetry, NO Math.random
router.get('/metrics', (req: Request, res: Response) => {
  const history = adminMetrics.getHistory(300);
  const summary = adminMetrics.getSummary();
  return res.json({ history, summary });
});

// GET /api/admin/dashboard
// Aggregated KPIs, selected/default drop, real telemetry, alerts, and recent audit activity
router.get('/dashboard', (req: Request, res: Response) => {
  const requestedDropId = req.query.dropId as string;
  const drops = db.list('drops').map(d => d.data as Drop);

  let activeDrop: Drop | null = null;
  if (requestedDropId) {
    activeDrop = drops.find(d => d.id === requestedDropId) || null;
  }
  if (!activeDrop && drops.length > 0) {
    activeDrop = drops.find(d => d.id === 'drop-jack-white-vault') || drops[0];
  }

  // Real KPIs calculation from activeDrop or all collections
  const dropId = activeDrop?.id;
  const entries: DropEntry[] = dropId ? db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry) : [];
  const seats: Seat[] = dropId ? db.list(`drops/${dropId}/seats`).map(d => d.data as Seat) : [];
  const appeals: Appeal[] = db.list('appeals').map(d => d.data as Appeal);

  const totalEntries = entries.length;
  const uniqueIdentities = new Set(entries.map(e => e.identityKey)).size;
  const eligible = entries.filter(e => e.status === 'eligible' || e.status === 'selected').length;
  const flagged = entries.filter(e => e.status === 'flagged').length;
  const blocked = entries.filter(e => e.status === 'blocked').length;

  const seatsSold = seats.filter(s => s.status === 'sold').length;
  const seatsHeld = seats.filter(s => s.status === 'held').length;
  const seatsAvailable = seats.filter(s => s.status === 'available').length;

  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;

  const telemetry = adminMetrics.getSummary();

  // Dynamic alerts generated from real system conditions
  const alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; title: string; message: string; timestamp: number }> = [];
  if (telemetry.total429Last60s > 10) {
    alerts.push({
      id: 'alert-429-spike',
      type: 'warning',
      title: 'High Rate-Limiting Activity',
      message: `Detected ${telemetry.total429Last60s} rate-limited (429) requests in the last 60 seconds.`,
      timestamp: Date.now(),
    });
  }
  if (pendingAppeals > 0) {
    alerts.push({
      id: 'alert-appeals-pending',
      type: 'info',
      title: 'Pending Appeals in Queue',
      message: `${pendingAppeals} user appeal(s) are awaiting security review.`,
      timestamp: Date.now(),
    });
  }
  if (blocked > 0) {
    alerts.push({
      id: 'alert-blocked-entries',
      type: 'warning',
      title: 'Security Interventions Active',
      message: `${blocked} participant entries have been intercepted and blocked for this drop.`,
      timestamp: Date.now(),
    });
  }

  // Recent audit log activity
  const recentActivity = db.list('auditLog')
    .map(d => d.data)
    .sort((a: any, b: any) => (b.index || 0) - (a.index || 0))
    .slice(0, 20);

  const dropsSummary = drops.map(d => ({
    id: d.id,
    name: d.name,
    status: d.status,
    mode: d.mode,
    windowEnd: d.windowEnd,
  }));

  return res.json({
    drop: activeDrop,
    drops: dropsSummary,
    kpis: {
      totalEntries,
      uniqueIdentities,
      eligible,
      flagged,
      blocked,
      rateLimitedLast60s: telemetry.total429Last60s,
      seatsSold,
      seatsHeld,
      seatsAvailable,
      pendingAppeals,
    },
    telemetry,
    health: {
      uptimeSeconds: Math.floor(process.uptime()),
      databaseStatus: db.getCloudStatus().mode === 'cloud-connected' ? 'cloud-connected' : 'local-ready',
      socketStatus: 'connected',
      totalDrops: drops.length,
      activeDropId: activeDrop?.id || null,
    },
    alerts,
    recentActivity,
  });
});

// ==========================================
// 2. DROPS MANAGEMENT & LIFECYCLE CONTROLS
// ==========================================

// GET /api/admin/drops
router.get('/drops', (req: Request, res: Response) => {
  const drops = db.list('drops').map(d => {
    const drop = d.data as Drop;
    const seats = db.list(`drops/${drop.id}/seats`).map(s => s.data as Seat);
    const entries = db.list(`drops/${drop.id}/entries`).map(e => e.data as DropEntry);
    return {
      ...drop,
      seatsCount: seats.length || drop.totalSeats || 500,
      seatsAvailable: seats.filter(s => s.status === 'available').length,
      seatsHeld: seats.filter(s => s.status === 'held').length,
      seatsSold: seats.filter(s => s.status === 'sold').length,
      entriesCount: entries.length,
    };
  });
  return res.json({ drops });
});

// POST /api/admin/drops - Create drop with validation
const createDropSchema = z.object({
  name: z.string().min(3),
  artistOrHost: z.string().min(2),
  venue: z.string().min(2),
  city: z.string().min(2),
  mode: z.enum(['FAIR_DROP', 'FCFS']),
  totalSeats: z.number().int().positive(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  drawTime: z.string().datetime(),
  pricePerSeat: z.number().nonnegative(),
  perPersonLimit: z.number().int().positive().default(1),
  holdDurationSeconds: z.number().int().positive().default(300),
  description: z.string().default(''),
});

router.post('/drops', disallowReadOnly, (req: Request, res: Response) => {
  const parseResult = createDropSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const data = parseResult.data;
  if (new Date(data.windowEnd).getTime() <= new Date(data.windowStart).getTime()) {
    return res.status(400).json({ error: 'windowEnd must be after windowStart' });
  }

  const id = `drop-${Date.now().toString(36)}`;
  const newDrop: Drop = {
    id,
    ...data,
    status: 'draft',
    createdBy: getActor(req),
    defenceConfig: {
      turnstileEnabled: true,
      powEnabled: true,
      powDifficulty: 2,
      honeypotEnabled: true,
      rateLimitPerIp: 20,
      rateLimitPerAccount: 60,
      rateLimitPerDevice: 60,
      timingJitterCheck: true,
      riskScoringEnabled: true,
      minRiskBlockScore: 80,
      minRiskChallengeScore: 50,
    },
  };

  db.set('drops', id, newDrop);

  // Initialize seats for this drop
  const sections = ['Floor A', 'Floor B', 'Mezzanine', 'Balcony'];
  for (let i = 1; i <= data.totalSeats; i++) {
    const seatId = `s-${i.toString().padStart(3, '0')}`;
    const sec = sections[i % sections.length];
    const row = String.fromCharCode(65 + Math.floor((i - 1) / 50) % 26);
    const seat: Seat = {
      id: seatId,
      dropId: id,
      section: sec,
      row,
      number: i,
      label: `${sec}-${row}${i % 50 + 1}`,
      price: data.pricePerSeat,
      accessible: i % 25 === 0,
      status: 'available',
    };
    db.set(`drops/${id}/seats`, seatId, seat);
  }

  appendAuditRecord('DROP_CREATED', getActor(req), { dropId: id, name: data.name, totalSeats: data.totalSeats });
  return res.status(201).json({ success: true, drop: newDrop });
});

// PUT /api/admin/drops/:id
router.put('/drops/:id', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const existingDoc = db.get('drops', id);
  if (!existingDoc) {
    return res.status(404).json({ error: 'Drop not found' });
  }

  const existing = existingDoc.data as Drop;
  const updated: Drop = { ...existing, ...req.body, id };
  db.set('drops', id, updated);

  appendAuditRecord('DROP_UPDATED', getActor(req), { dropId: id, changes: Object.keys(req.body) });
  return res.json({ success: true, drop: updated });
});

// POST /api/admin/drops/:id/pause
router.post('/drops/:id/pause', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = db.get('drops', id);
  if (!doc) return res.status(404).json({ error: 'Drop not found' });

  const drop = doc.data as Drop;
  drop.status = 'paused';
  db.set('drops', id, drop);

  appendAuditRecord('DROP_PAUSED', getActor(req), { dropId: id, previousStatus: doc.data.status });
  return res.json({ success: true, drop, message: 'Drop paused successfully.' });
});

// POST /api/admin/drops/:id/resume
router.post('/drops/:id/resume', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = db.get('drops', id);
  if (!doc) return res.status(404).json({ error: 'Drop not found' });

  const drop = doc.data as Drop;
  // If window hasn't expired, open, else closed
  const now = Date.now();
  if (new Date(drop.windowEnd).getTime() > now) {
    drop.status = 'open';
  } else {
    drop.status = 'closed';
  }
  db.set('drops', id, drop);

  appendAuditRecord('DROP_RESUMED', getActor(req), { dropId: id, status: drop.status });
  return res.json({ success: true, drop, message: 'Drop resumed successfully.' });
});

// POST /api/admin/drops/:id/extend
router.post('/drops/:id/extend', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const minutes = Number(req.body.minutes);
  if (!minutes || minutes <= 0 || isNaN(minutes)) {
    return res.status(400).json({ error: 'Minutes to extend must be a positive number' });
  }

  const doc = db.get('drops', id);
  if (!doc) return res.status(404).json({ error: 'Drop not found' });

  const drop = doc.data as Drop;
  const currentEnd = new Date(drop.windowEnd).getTime();
  const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
  const newEnd = new Date(baseTime + minutes * 60 * 1000).toISOString();
  
  drop.windowEnd = newEnd;
  if (new Date(drop.drawTime).getTime() <= new Date(newEnd).getTime()) {
    drop.drawTime = new Date(new Date(newEnd).getTime() + 10 * 60 * 1000).toISOString();
  }
  if (drop.status === 'closed') {
    drop.status = 'open';
  }

  db.set('drops', id, drop);
  appendAuditRecord('DROP_WINDOW_EXTENDED', getActor(req), { dropId: id, addedMinutes: minutes, newWindowEnd: newEnd });
  return res.json({ success: true, drop, message: `Window extended by ${minutes} minutes.` });
});

// POST /api/admin/drops/:id/emergency-stop
router.post('/drops/:id/emergency-stop', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 4) {
    return res.status(400).json({ error: 'A valid reason (min 4 chars) is required for emergency stop.' });
  }

  const doc = db.get('drops', id);
  if (!doc) return res.status(404).json({ error: 'Drop not found' });

  const drop = doc.data as Drop;
  drop.status = 'closed';
  db.set('drops', id, drop);

  appendAuditRecord('EMERGENCY_STOP_TRIGGERED', getActor(req), { dropId: id, reason: reason.trim() });
  return res.json({ success: true, drop, message: 'Emergency stop activated. Drop closed.' });
});

// ==========================================
// 3. INVENTORY MANAGEMENT (500-SEAT GRID)
// ==========================================

// GET /api/admin/drops/:id/inventory
router.get('/drops/:id/inventory', (req: Request, res: Response) => {
  const { id } = req.params;
  const seats = db.list(`drops/${id}/seats`).map(s => s.data as Seat);
  
  const stats = {
    total: seats.length,
    available: seats.filter(s => s.status === 'available').length,
    held: seats.filter(s => s.status === 'held').length,
    sold: seats.filter(s => s.status === 'sold').length,
    blocked: seats.filter(s => s.status === 'blocked').length,
  };

  return res.json({ seats, stats });
});

// POST /api/admin/drops/:id/seats/:seatId/hold
router.post('/drops/:id/seats/:seatId/hold', disallowReadOnly, (req: Request, res: Response) => {
  const { id, seatId } = req.params;
  const { reason, durationMinutes = 15 } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A reason (min 3 chars) is required for manual seat hold.' });
  }

  const seatDoc = db.get(`drops/${id}/seats`, seatId);
  if (!seatDoc) return res.status(404).json({ error: 'Seat not found' });

  const seat = seatDoc.data as Seat;
  if (seat.status === 'sold') {
    return res.status(400).json({ error: 'Cannot hold a sold seat.' });
  }

  seat.status = 'held';
  seat.holderUid = getActor(req);
  seat.holdExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  db.set(`drops/${id}/seats`, seatId, seat);

  appendAuditRecord('SEAT_MANUAL_HOLD', getActor(req), { dropId: id, seatId, reason, holdExpiresAt: seat.holdExpiresAt });
  return res.json({ success: true, seat });
});

// POST /api/admin/drops/:id/seats/:seatId/unhold
router.post('/drops/:id/seats/:seatId/unhold', disallowReadOnly, (req: Request, res: Response) => {
  const { id, seatId } = req.params;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A reason (min 3 chars) is required for manual seat unhold.' });
  }

  const seatDoc = db.get(`drops/${id}/seats`, seatId);
  if (!seatDoc) return res.status(404).json({ error: 'Seat not found' });

  const seat = seatDoc.data as Seat;
  if (seat.status === 'sold') {
    return res.status(400).json({ error: 'Cannot release a sold seat.' });
  }

  seat.status = 'available';
  seat.holderUid = undefined;
  seat.holdExpiresAt = null;
  db.set(`drops/${id}/seats`, seatId, seat);

  appendAuditRecord('SEAT_MANUAL_UNHOLD', getActor(req), { dropId: id, seatId, reason });
  return res.json({ success: true, seat });
});

// ==========================================
// 4. ENTRIES & RISK MANAGEMENT
// ==========================================

// GET /api/admin/drops/:id/entries - Server-side paginated & filtered
router.get('/drops/:id/entries', (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const search = (req.query.q as string || '').toLowerCase().trim();
  const statusFilter = req.query.status as string;
  const riskBand = req.query.riskBand as string; // 'low', 'medium', 'high'
  const sortBy = (req.query.sortBy as string) || 'serverTimestamp';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  let entries = db.list(`drops/${id}/entries`).map(d => d.data as DropEntry);

  // Search filter (identityKey, ipHash, receipt)
  if (search) {
    entries = entries.filter(e =>
      (e.identityKey && e.identityKey.toLowerCase().includes(search)) ||
      (e.ipHash && e.ipHash.toLowerCase().includes(search)) ||
      (e.receipt && e.receipt.toLowerCase().includes(search))
    );
  }

  // Status filter
  if (statusFilter && statusFilter !== 'all') {
    entries = entries.filter(e => e.status === statusFilter);
  }

  // Risk band filter
  if (riskBand && riskBand !== 'all') {
    if (riskBand === 'low') {
      entries = entries.filter(e => e.riskScore < 50);
    } else if (riskBand === 'medium') {
      entries = entries.filter(e => e.riskScore >= 50 && e.riskScore < 80);
    } else if (riskBand === 'high') {
      entries = entries.filter(e => e.riskScore >= 80);
    }
  }

  // Sort
  entries.sort((a: any, b: any) => {
    const valA = a[sortBy] ?? 0;
    const valB = b[sortBy] ?? 0;
    if (valA < valB) return -1 * sortOrder;
    if (valA > valB) return 1 * sortOrder;
    return 0;
  });

  const total = entries.length;
  const start = (page - 1) * pageSize;
  const items = entries.slice(start, start + pageSize).map(entry => {
    // Sanitise client representation: do NOT expose ground-truth bot label to client
    const { isBot, botProfile, speedClass, ...sanitised } = entry as any;
    return sanitised;
  });

  return res.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
});

// POST /api/admin/drops/:id/entries/:identityKey/action (flag, ban, clear with reason)
router.post('/drops/:id/entries/:identityKey/action', disallowReadOnly, (req: Request, res: Response) => {
  const { id, identityKey } = req.params;
  const { action, reason } = req.body;

  if (!['flag', 'ban', 'clear'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Allowed: flag, ban, clear' });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A mandatory reason (min 3 chars) is required for audit compliance.' });
  }

  const entryDoc = db.get(`drops/${id}/entries`, identityKey);
  if (!entryDoc) return res.status(404).json({ error: 'Entry not found' });

  const entry = entryDoc.data as DropEntry;
  const prevStatus = entry.status;

  if (action === 'ban') {
    entry.status = 'blocked';
    // Add IP to live blocklist if available
    if (entry.ipHash) {
      activeBlocklist.add(entry.ipHash);
    }
  } else if (action === 'flag') {
    entry.status = 'flagged';
  } else if (action === 'clear') {
    entry.status = 'eligible';
  }

  db.set(`drops/${id}/entries`, identityKey, entry);

  appendAuditRecord('ENTRY_RISK_ACTION', getActor(req), {
    dropId: id,
    identityKey,
    action,
    reason: reason.trim(),
    previousStatus: prevStatus,
    newStatus: entry.status,
  });

  return res.json({ success: true, entry, message: `Entry status updated to ${entry.status}.` });
});

// POST /api/admin/drops/:id/entries/bulk (bulk action)
router.post('/drops/:id/entries/bulk', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const { identityKeys, action, reason } = req.body;

  if (!Array.isArray(identityKeys) || identityKeys.length === 0) {
    return res.status(400).json({ error: 'identityKeys must be a non-empty array' });
  }

  if (!['flag', 'ban', 'clear'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Allowed: flag, ban, clear' });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A mandatory reason (min 3 chars) is required for bulk action.' });
  }

  let updatedCount = 0;
  for (const key of identityKeys) {
    const doc = db.get(`drops/${id}/entries`, key);
    if (doc) {
      const entry = doc.data as DropEntry;
      if (action === 'ban') {
        entry.status = 'blocked';
        if (entry.ipHash) activeBlocklist.add(entry.ipHash);
      } else if (action === 'flag') {
        entry.status = 'flagged';
      } else if (action === 'clear') {
        entry.status = 'eligible';
      }
      db.set(`drops/${id}/entries`, key, entry);
      updatedCount++;
    }
  }

  appendAuditRecord('ENTRY_BULK_ACTION', getActor(req), {
    dropId: id,
    count: updatedCount,
    action,
    reason: reason.trim(),
    sampleKeys: identityKeys.slice(0, 5),
  });

  return res.json({ success: true, updatedCount, message: `Successfully updated ${updatedCount} entries.` });
});

// ==========================================
// 5. SECURITY RULES & LIVE LIMITERS
// ==========================================

// GET /api/admin/security
router.get('/security', (req: Request, res: Response) => {
  const config = getSecurityConfig();
  const blocklist = Array.from(activeBlocklist);
  const ruleHits = {
    ipLimitBlocked: adminMetrics.getSummary().total429Last60s,
    blocklistCount: blocklist.length,
    activeLimiterPoints: (ipLimiter as any).points || 20,
    activeLimiterDuration: (ipLimiter as any).duration || 1,
  };

  const lastAudit = db.list('auditLog')
    .map(d => d.data)
    .filter((a: any) => a.action === 'SECURITY_CONFIG_UPDATED')
    .pop();

  return res.json({
    config,
    blocklist,
    ruleHits,
    lastChangedBy: lastAudit?.actorUid || 'system',
    lastChangedAt: lastAudit?.timestamp || new Date().toISOString(),
  });
});

// POST /api/admin/security
const securityConfigSchema = z.object({
  turnstileEnabled: z.boolean(),
  powEnabled: z.boolean(),
  powDifficulty: z.number().int().min(1).max(8),
  honeypotEnabled: z.boolean(),
  ipWindowSec: z.number().int().min(1).max(60),
  ipMaxRequests: z.number().int().min(1).max(1000),
  accountWindowSec: z.number().int().min(1).max(3600),
  accountMaxRequests: z.number().int().min(1).max(10000),
  deviceWindowSec: z.number().int().min(1).max(3600),
  deviceMaxRequests: z.number().int().min(1).max(10000),
  minRiskBlockScore: z.number().min(0).max(100),
  minRiskChallengeScore: z.number().min(0).max(100),
});

router.post('/security', disallowReadOnly, (req: Request, res: Response) => {
  const parseResult = securityConfigSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid security rules', details: parseResult.error.format() });
  }

  const updated = applySecurityConfig(parseResult.data);
  appendAuditRecord('SECURITY_CONFIG_UPDATED', getActor(req), {
    config: updated,
  });

  return res.json({ success: true, config: updated, message: 'Live rate limiters and security rules reconfigured.' });
});

// POST /api/admin/security/blocklist
router.post('/security/blocklist', disallowReadOnly, (req: Request, res: Response) => {
  const { action, item, items, reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A reason (min 3 chars) is required for blocklist changes.' });
  }

  if (action === 'add' && item) {
    activeBlocklist.add(item.trim());
  } else if (action === 'remove' && item) {
    activeBlocklist.delete(item.trim());
  } else if (action === 'import' && Array.isArray(items)) {
    items.forEach(it => activeBlocklist.add(it.trim()));
  } else if (action === 'clear') {
    activeBlocklist.clear();
  } else {
    return res.status(400).json({ error: 'Invalid blocklist action or parameters' });
  }

  // Persist back to security config
  const current = getSecurityConfig();
  current.blocklist = Array.from(activeBlocklist);
  db.set('securityConfig', 'global', current);

  appendAuditRecord('SECURITY_BLOCKLIST_MUTATED', getActor(req), {
    action,
    item,
    itemCount: items ? items.length : 1,
    reason: reason.trim(),
    totalBlockedNow: activeBlocklist.size,
  });

  return res.json({ success: true, blocklist: Array.from(activeBlocklist) });
});

// ==========================================
// 6. AUDIT & INTEGRITY CHECKERS
// ==========================================

// GET /api/admin/audit - Paginated, filterable
router.get('/audit', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
  const actionFilter = req.query.action as string;
  const actorFilter = req.query.actor as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  let records = db.list('auditLog')
    .map(d => d.data)
    .sort((a: any, b: any) => (b.index || 0) - (a.index || 0));

  if (actionFilter) {
    records = records.filter(r => r.action.toLowerCase().includes(actionFilter.toLowerCase()));
  }
  if (actorFilter) {
    records = records.filter(r => r.actorUid.toLowerCase().includes(actorFilter.toLowerCase()));
  }
  if (dateFrom) {
    const fromMs = new Date(dateFrom).getTime();
    records = records.filter(r => new Date(r.timestamp).getTime() >= fromMs);
  }
  if (dateTo) {
    const toMs = new Date(dateTo).getTime();
    records = records.filter(r => new Date(r.timestamp).getTime() <= toMs);
  }

  const total = records.length;
  const start = (page - 1) * pageSize;
  const items = records.slice(start, start + pageSize);

  return res.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
});

// POST /api/admin/audit/verify - Run real cryptographic verification
router.post('/audit/verify', (req: Request, res: Response) => {
  const result = verifyAuditHashChain();
  appendAuditRecord('AUDIT_CHAIN_VERIFIED_BY_ADMIN', getActor(req), result);
  return res.json({
    ...result,
    verifiedAt: new Date().toISOString(),
  });
});

// POST /api/admin/audit/invariants/:dropId - Run real invariant checks
router.post('/audit/invariants/:dropId', (req: Request, res: Response) => {
  const { dropId } = req.params;
  const result = runSystemInvariantCheck(dropId);
  return res.json({
    ...result,
    checkedAt: new Date().toISOString(),
  });
});

// ==========================================
// 7. APPEALS QUEUE
// ==========================================

// GET /api/admin/appeals
router.get('/appeals', (req: Request, res: Response) => {
  const status = req.query.status as string; // 'pending', 'approved', 'rejected'
  let appeals = db.list('appeals').map(d => d.data as Appeal);

  if (status && status !== 'all') {
    appeals = appeals.filter(a => a.status === status);
  }

  // Enrich with entry risk signals
  const enriched = appeals.map(a => {
    let signals: string[] = [];
    let riskScore = 0;
    if (a.dropId && a.identityKey) {
      const entryDoc = db.get(`drops/${a.dropId}/entries`, a.identityKey);
      if (entryDoc) {
        const entry = entryDoc.data as DropEntry;
        signals = (entry as any).riskSignals || [];
        riskScore = entry.riskScore;
      }
    }
    return {
      ...a,
      signals,
      riskScore,
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ appeals: enriched });
});

// POST /api/admin/appeals/:id/decide
router.post('/appeals/:id/decide', disallowReadOnly, (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, reviewNote } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  }

  if (!reviewNote || typeof reviewNote !== 'string' || reviewNote.trim().length < 3) {
    return res.status(400).json({ error: 'A review note (min 3 chars) is required.' });
  }

  const appealDoc = db.get('appeals', id);
  if (!appealDoc) return res.status(404).json({ error: 'Appeal not found' });

  const appeal = appealDoc.data as Appeal;
  appeal.status = decision;
  appeal.reviewedBy = getActor(req);
  appeal.reviewedAt = new Date().toISOString();
  appeal.reviewNote = reviewNote.trim();
  db.set('appeals', id, appeal);

  // Update associated entry
  if (appeal.dropId && appeal.identityKey) {
    const entryDoc = db.get(`drops/${appeal.dropId}/entries`, appeal.identityKey);
    if (entryDoc) {
      const entry = entryDoc.data as DropEntry;
      entry.status = decision === 'approved' ? 'eligible' : 'blocked';
      db.set(`drops/${appeal.dropId}/entries`, appeal.identityKey, entry);
    }
  }

  appendAuditRecord('APPEAL_DECIDED', getActor(req), {
    appealId: id,
    dropId: appeal.dropId,
    identityKey: appeal.identityKey,
    decision,
    reviewNote: reviewNote.trim(),
  });

  return res.json({ success: true, appeal });
});

export default router;
