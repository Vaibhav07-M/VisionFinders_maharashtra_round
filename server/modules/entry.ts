import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { ipLimiter, accountLimiter, deviceLimiter, activeBlocklist, verifyPoW, computeRiskScore } from './abuse';
import { DropEntry, Drop, Reservation } from '../../shared/types';
import { appendAuditRecord } from './audit';

let onEntryCreatedCallback: ((dropId: string, stats: any) => void) | null = null;

export function registerEntryListener(cb: (dropId: string, stats: any) => void) {
  onEntryCreatedCallback = cb;
}

// GET /api/drops/:id/entries/me
export function getUserEntryHandler(req: AuthenticatedRequest, res: Response) {
  const { id: dropId } = req.params;
  const uid = req.user?.uid || 'user_alex_77';
  const email = req.user?.email || 'alex.chen@fairdrop.io';
  const identityKey = sha256Sync(email);

  // 1. Try finding entry by identityKey or UID
  let entry = db.get(`drops/${dropId}/entries`, identityKey)?.data as DropEntry | undefined;
  if (!entry) {
    const all = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
    entry = all.find(e => e.uid === uid);
  }

  // 2. Find any active reservation for this user
  const resId = `res_${dropId}_${uid}`;
  const reservation = db.get(`drops/${dropId}/reservations`, resId)?.data as Reservation | undefined;

  return res.json({
    entry: entry || null,
    reservation: reservation || null,
  });
}

// POST /api/drops/:id/join
export async function joinDropHandler(req: AuthenticatedRequest, res: Response) {
  const { id: dropId } = req.params;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const clientDeviceId = (req.headers['x-device-id'] as string) || 'device_default';
  const userUid = req.user?.uid || 'user_guest';

  // 1. CHEAPEST FIRST: Blocklist check
  if (activeBlocklist.has(ip)) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      message: 'Access denied: IP is present on security blocklist.',
    });
  }

  // 2. RATE LIMIT CHECKS (IP, Account, Device)
  try {
    await ipLimiter.consume(ip);
    await accountLimiter.consume(userUid);
    await deviceLimiter.consume(clientDeviceId);
  } catch (rateLimitRejection) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many requests. Request rate exceeds safe threshold.',
      retryAfterSeconds: 15,
    });
  }

  // 3. DROP STATUS & WINDOW VALIDATION
  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) {
    return res.status(404).json({ error: 'DROP_NOT_FOUND', message: 'Drop event does not exist.' });
  }
  const drop = dropDoc.data as Drop;
  if (drop.status !== 'open') {
    return res.status(400).json({ error: 'DROP_NOT_OPEN', message: `Drop registration is currently ${drop.status}.` });
  }

  // 4. HONEYPOT TRAP CHECK
  const honeypotVal = req.body.website_trap || '';
  if (honeypotVal.length > 0) {
    appendAuditRecord('HONEYPOT_TRIGGERED', userUid, { ip, dropId });
    return res.status(403).json({ error: 'BOT_DETECTED', message: 'Automated agent honeypot triggered.' });
  }

  // 5. PROOF-OF-WORK VERIFICATION
  const { nonce, idempotencyKey } = req.body;
  const challenge = `${dropId}:${userUid}:${idempotencyKey}`;
  const effectiveDifficulty = Math.min(drop.defenceConfig?.powDifficulty ?? 2, 3);
  const powValid = verifyPoW(challenge, Number(nonce || 0), effectiveDifficulty);

  if (drop.defenceConfig?.powEnabled && !powValid) {
    return res.status(400).json({
      error: 'INVALID_POW',
      message: 'Cryptographic proof-of-work challenge failed or incomplete.',
    });
  }

  // 6. TIMING SIGNALS & RISK SCORING
  const { score: riskScore, signals } = computeRiskScore(req, powValid);
  if (drop.defenceConfig?.riskScoringEnabled && riskScore >= (drop.defenceConfig?.minRiskBlockScore ?? 80)) {
    return res.status(403).json({
      error: 'RISK_SCORE_EXCEEDED',
      message: 'Entry blocked by automated behavioral risk evaluation.',
      riskScore,
      signals,
    });
  }

  // 7. IDEMPOTENCY CHECK (Section 1 & 4 requirement)
  // If user or idempotency key already entered, return the SAME receipt
  const existingReceiptDoc = db.get('idempotency', idempotencyKey);
  if (existingReceiptDoc) {
    return res.json({
      isDuplicate: true,
      entry: existingReceiptDoc.data,
      message: 'Idempotent response: Returning existing valid entry receipt.',
    });
  }

  // 8. IDENTITY UNIQUENESS (1 Phone/Identity = 1 Entry)
  const phone = req.user?.email || userUid;
  const identityKey = sha256Sync(phone);

  const existingEntry = db.get(`drops/${dropId}/entries`, identityKey);
  if (existingEntry) {
    return res.json({
      isDuplicate: true,
      entry: existingEntry.data,
      message: 'One identity = one entry. Returning existing registered receipt.',
    });
  }

  // Tier preferences (Section 2 requirement)
  const dropTiers = drop.tiers || [
    { id: 'vip' },
    { id: 'platinum' },
    { id: 'gold' },
    { id: 'silver' },
    { id: 'bronze' },
  ];
  const validTierIds = dropTiers.map((t: any) => t.id);
  const inputPrefs = Array.isArray(req.body.preferences) ? req.body.preferences : [];
  const preferences = inputPrefs.filter((p: string) => validTierIds.includes(p));
  const finalPreferences = preferences.length > 0 ? preferences : validTierIds;

  // 9. CREATE ENTRY DOCUMENT (Doc ID = identityKey enforces atomic uniqueness)
  const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const newEntry: DropEntry = {
    receiptId,
    dropId,
    uid: userUid,
    identityKey,
    idempotencyKey,
    arrivedAt: now,
    serverTimestamp: Date.now(),
    riskScore,
    status: riskScore >= (drop.defenceConfig?.minRiskChallengeScore ?? 50) ? 'flagged' : 'entered',
    preferences: finalPreferences,
    isBot: req.body.isBot || false,
    speedClass: req.body.speedClass || 'normal',
  };

  try {
    // Atomic insert using identityKey as document ID
    db.create(`drops/${dropId}/entries`, identityKey, newEntry);
    db.set('idempotency', idempotencyKey, newEntry);

    // Update drop counter
    const updatedDrop = {
      totalEntriesCount: (drop.totalEntriesCount || 0) + 1,
      stats: {
        ...drop.stats,
        eligible: (drop.stats?.eligible || 0) + (newEntry.status === 'entered' || newEntry.status === 'eligible' ? 1 : 0),
        flagged: (drop.stats?.flagged || 0) + (newEntry.status === 'flagged' ? 1 : 0),
      },
    };
    db.set('drops', dropId, updatedDrop);

    appendAuditRecord('ENTRY_RECORDED', userUid, {
      receiptId,
      dropId,
      identityKey,
      riskScore,
      preferences: finalPreferences,
    });

    if (onEntryCreatedCallback) {
      onEntryCreatedCallback(dropId, updatedDrop.stats);
    }

    return res.status(201).json({
      isDuplicate: false,
      entry: newEntry,
    });
  } catch (err: any) {
    if (err.code === 6) {
      // Document already exists (race condition handled cleanly)
      const existing = db.get(`drops/${dropId}/entries`, identityKey);
      return res.json({
        isDuplicate: true,
        entry: existing?.data,
      });
    }
    return res.status(500).json({ error: err.message });
  }
}

// PUT /api/drops/:id/preferences (Edit preferences while window is open)
export function updatePreferencesHandler(req: AuthenticatedRequest, res: Response) {
  const { id: dropId } = req.params;
  const uid = req.user?.uid || 'user_guest';
  const email = req.user?.email || uid;
  const identityKey = sha256Sync(email);

  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) {
    return res.status(404).json({ error: 'DROP_NOT_FOUND', message: 'Drop not found.' });
  }
  const drop = dropDoc.data as Drop;

  if (drop.status !== 'open') {
    return res.status(400).json({
      error: 'WINDOW_CLOSED',
      message: 'Preferences can only be modified while the registration window is open.',
    });
  }

  // Find user's entry
  let entryDoc = db.get(`drops/${dropId}/entries`, identityKey);
  let entry = entryDoc ? (entryDoc.data as DropEntry) : null;

  if (!entry) {
    const all = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
    entry = all.find(e => e.uid === uid) || null;
  }

  if (!entry) {
    return res.status(404).json({ error: 'ENTRY_NOT_FOUND', message: 'You have not entered this drop.' });
  }

  const { preferences } = req.body;
  if (!Array.isArray(preferences) || preferences.length === 0) {
    return res.status(400).json({ error: 'INVALID_PREFERENCES', message: 'Preferences must be an array of at least 1 tier ID.' });
  }

  const updatedEntry: DropEntry = {
    ...entry,
    preferences,
  };

  db.set(`drops/${dropId}/entries`, entry.identityKey, updatedEntry);

  appendAuditRecord('PREFERENCES_UPDATED', uid, {
    dropId,
    preferences,
  });

  return res.json({ success: true, entry: updatedEntry });
}
