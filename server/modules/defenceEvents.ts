import { Request, Response, NextFunction } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { DefenceEvent, DefenceOutcome, DefenceReasonCode, LabThreatSummary } from '../../shared/types';

interface SecondAggregate {
  second: number;
  total: number;
  accepted: number;
  blocked: number;
  rateLimited: number;
  challenged: number;
  unauthenticated: number;
  invalid: number;
  errors: number;
  reasons: Record<string, number>;
  ipPrefixes: Record<string, number>;
}

// In-memory ring buffer (5 minutes = 300 seconds)
const RING_BUFFER_SIZE = 300;
const secondRingBuffer: SecondAggregate[] = [];
let currentSecondIdx = -1;

// Per-request in-memory map for fast lookups by requestId (capped to last 100,000 events)
const recentEventsByRequestId = new Map<string, DefenceEvent>();
const recentEventKeys: string[] = [];
const MAX_RECENT_EVENTS = 100000;

// Active Lab Run tracking
let activeLabRunInfo: { runId: string; scenarioName: string; targetDropId: string } | null = null;

export function setActiveLabRun(info: { runId: string; scenarioName: string; targetDropId: string } | null): void {
  activeLabRunInfo = info;
}

export function getActiveLabRun(): { runId: string; scenarioName: string; targetDropId: string } | null {
  return activeLabRunInfo;
}

// Global drop cumulative counters in-memory with DB backup
const dropCumulativeStats = new Map<string, {
  total: number;
  accepted: number;
  blocked: number;
  rateLimited: number;
  challenged: number;
  reasons: Record<string, number>;
  ipCounts: Record<string, { count: number; lastReason: string }>;
}>();

function getOrCreateDropStats(dropId: string) {
  let stats = dropCumulativeStats.get(dropId);
  if (!stats) {
    // Check DB
    const existingDoc = db.get('dropThreats', dropId);
    if (existingDoc && existingDoc.data) {
      stats = existingDoc.data as any;
    } else {
      stats = {
        total: 0,
        accepted: 0,
        blocked: 0,
        rateLimited: 0,
        challenged: 0,
        reasons: {},
        ipCounts: {},
      };
    }
    dropCumulativeStats.set(dropId, stats!);
  }
  return stats!;
}

export function recordDefenceEvent(event: DefenceEvent): void {
  const sec = Math.floor(event.ts / 1000);

  // 1. In-memory per-request map
  if (recentEventsByRequestId.size >= MAX_RECENT_EVENTS) {
    const oldestKey = recentEventKeys.shift();
    if (oldestKey) recentEventsByRequestId.delete(oldestKey);
  }
  recentEventsByRequestId.set(event.requestId, event);
  recentEventKeys.push(event.requestId);

  // 2. High-speed in-memory map keeps all request outcomes with 0 cloud quota consumption

  // 3. Update ring buffer
  if (secondRingBuffer.length === 0 || secondRingBuffer[secondRingBuffer.length - 1].second !== sec) {
    secondRingBuffer.push({
      second: sec,
      total: 0,
      accepted: 0,
      blocked: 0,
      rateLimited: 0,
      challenged: 0,
      unauthenticated: 0,
      invalid: 0,
      errors: 0,
      reasons: {},
      ipPrefixes: {},
    });
    if (secondRingBuffer.length > RING_BUFFER_SIZE) {
      secondRingBuffer.shift();
    }
  }

  const currentBucket = secondRingBuffer[secondRingBuffer.length - 1];
  currentBucket.total++;
  if (event.outcome === 'ACCEPTED' || event.outcome === 'DUPLICATE_RECEIPT') currentBucket.accepted++;
  else if (event.outcome === 'RATE_LIMITED') currentBucket.rateLimited++;
  else if (event.outcome === 'BLOCKED') currentBucket.blocked++;
  else if (event.outcome === 'CHALLENGED') currentBucket.challenged++;
  else if (event.outcome === 'UNAUTHENTICATED') currentBucket.unauthenticated++;
  else if (event.outcome === 'INVALID') currentBucket.invalid++;
  else if (event.outcome === 'SERVER_ERROR') currentBucket.errors++;

  if (event.reasonCode) {
    currentBucket.reasons[event.reasonCode] = (currentBucket.reasons[event.reasonCode] || 0) + 1;
  }

  const ipPrefix = event.ipHash ? event.ipHash.slice(0, 8) : 'unknown';
  currentBucket.ipPrefixes[ipPrefix] = (currentBucket.ipPrefixes[ipPrefix] || 0) + 1;

  // 4. Update Drop Cumulative Stats
  if (event.dropId) {
    const dropsToUpdate = [event.dropId];
    if (event.dropId.startsWith('sandbox_')) {
      const parts = event.dropId.split('_');
      if (parts.length >= 3) {
        const sourceDropId = parts.slice(2).join('_');
        if (sourceDropId && !dropsToUpdate.includes(sourceDropId)) {
          dropsToUpdate.push(sourceDropId);
        }
      }
    }

    for (const dId of dropsToUpdate) {
      const stats = getOrCreateDropStats(dId);
      stats.total++;
      if (event.outcome === 'ACCEPTED' || event.outcome === 'DUPLICATE_RECEIPT') stats.accepted++;
      else if (event.outcome === 'RATE_LIMITED') stats.rateLimited++;
      else if (event.outcome === 'BLOCKED') stats.blocked++;
      else if (event.outcome === 'CHALLENGED') stats.challenged++;

      if (event.reasonCode) {
        stats.reasons[event.reasonCode] = (stats.reasons[event.reasonCode] || 0) + 1;
      }

      if (ipPrefix) {
        const prev = stats.ipCounts[ipPrefix] || { count: 0, lastReason: event.reasonCode || 'NONE' };
        stats.ipCounts[ipPrefix] = {
          count: prev.count + 1,
          lastReason: event.reasonCode || prev.lastReason,
        };
      }

      // Persist throttled
      if (stats.total % 25 === 0) {
        db.set('dropThreats', dId, stats);
      }
    }
  }
}

export function getDefenceEventByRequestId(requestId: string): DefenceEvent | undefined {
  const inMemory = recentEventsByRequestId.get(requestId);
  if (inMemory) return inMemory;
  const doc = db.get('defenceEvents', requestId);
  return doc?.data as DefenceEvent | undefined;
}

export function getThreatSummary(dropId?: string): LabThreatSummary {
  const nowSec = Math.floor(Date.now() / 1000);
  const oneMinuteAgo = nowSec - 60;
  const tenSecAgo = nowSec - 10;

  // Last minute aggregates from ring buffer
  let rpsCount = 0;
  let rpsSeconds = 0;
  const lastMinute = { accepted: 0, blocked: 0, rateLimited: 0, challenged: 0, total: 0 };

  for (const bucket of secondRingBuffer) {
    if (bucket.second >= tenSecAgo) {
      rpsCount += bucket.total;
      rpsSeconds++;
    }
    if (bucket.second >= oneMinuteAgo) {
      lastMinute.total += bucket.total;
      lastMinute.accepted += bucket.accepted;
      lastMinute.blocked += bucket.blocked;
      lastMinute.rateLimited += bucket.rateLimited;
      lastMinute.challenged += bucket.challenged;
    }
  }

  const requestsPerSec = rpsSeconds > 0 ? Number((rpsCount / rpsSeconds).toFixed(1)) : 0;

  // Total stats from cumulative map or empty
  const targetId = dropId || 'drop-jack-white-vault';
  const dropStats = getOrCreateDropStats(targetId);

  // Top offending IPs
  const topOffendingIps = Object.entries(dropStats.ipCounts || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([prefix, d]) => ({
      ipPrefix: prefix,
      count: d.count,
      lastReason: d.lastReason,
    }));

  return {
    dropId: targetId,
    requestsPerSec,
    lastMinute,
    total: {
      accepted: dropStats.accepted,
      blocked: dropStats.blocked,
      rateLimited: dropStats.rateLimited,
      challenged: dropStats.challenged,
      total: dropStats.total,
    },
    blockedByReason: dropStats.reasons || {},
    topOffendingIps,
    activeLabRun: activeLabRunInfo,
  };
}

/**
 * Express Middleware mounted before join route to capture every join attempt
 * with NO human/bot label. Reads status + body.code.
 */
export function defenceEventsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only intercept POST /api/drops/:id/join
  const urlPath = req.originalUrl || req.path || '';
  if (req.method !== 'POST' || !urlPath.includes('/join')) {
    return next();
  }

  const startMs = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const dropIdMatch = urlPath.match(/\/drops\/([^/?]+)\/join/);
  const dropId = (req.params?.id as string) || (dropIdMatch ? dropIdMatch[1] : 'drop-jack-white-vault');
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = sha256Sync(ip).slice(0, 16);

  // Intercept res.json
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const latencyMs = Math.max(1, Date.now() - startMs);
    const statusCode = res.statusCode || 200;

    let outcome: DefenceOutcome = 'ACCEPTED';
    let reasonCode: DefenceReasonCode | undefined = undefined;

    if (statusCode === 201) {
      outcome = 'ACCEPTED';
      reasonCode = undefined;
    } else if (statusCode === 200) {
      if (body?.isDuplicate) {
        outcome = 'DUPLICATE_RECEIPT';
        reasonCode = undefined;
      } else {
        outcome = 'ACCEPTED';
        reasonCode = undefined;
      }
    } else if (statusCode === 429) {
      outcome = 'RATE_LIMITED';
      reasonCode = (body?.code as DefenceReasonCode) || 'RL_IP';
    } else if (statusCode === 403) {
      if (body?.code === 'RISK_CHALLENGE') {
        outcome = 'CHALLENGED';
        reasonCode = 'RISK_CHALLENGE';
      } else {
        outcome = 'BLOCKED';
        reasonCode = (body?.code as DefenceReasonCode) || (body?.error === 'BOT_DETECTED' ? 'HONEYPOT' : 'BLOCKLIST');
      }
    } else if (statusCode === 401) {
      outcome = 'UNAUTHENTICATED';
      reasonCode = (body?.code as DefenceReasonCode) || 'NO_SESSION';
    } else if (statusCode === 400 || statusCode === 404) {
      if (body?.code === 'POW_MISSING' || body?.code === 'POW_INVALID' || body?.error === 'INVALID_POW' || body?.error === 'POW_MISSING') {
        outcome = 'BLOCKED';
        reasonCode = (body?.code as DefenceReasonCode) || 'POW_INVALID';
      } else {
        outcome = 'INVALID';
        reasonCode = (body?.code as DefenceReasonCode) || 'VALIDATION';
      }
    } else if (statusCode >= 500) {
      outcome = 'SERVER_ERROR';
    }

    // Record defence event with NO bot/human label
    recordDefenceEvent({
      ts: startMs,
      requestId,
      dropId,
      ipHash,
      uid: (req as any).user?.uid,
      outcome,
      reasonCode,
      latencyMs,
      statusCode,
    });

    return originalJson(body);
  };

  next();
}
