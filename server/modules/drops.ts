import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Drop, Seat, DropEntry, TicketTier } from '../../shared/types';
import { INITIAL_SAMPLE_DROPS, DEFAULT_DEFENCE_CONFIG, DEFAULT_TIERS } from '../../shared/constants';
import { appendAuditRecord } from './audit';
import { ensureSeatsForDrop } from './offers';

// Helper to ensure event window times are active in the future (avoids 00:00:00 expired countdowns)
export function ensureActiveWindow(drop: Drop): Drop {
  const now = Date.now();
  const endTime = new Date(drop.windowEnd).getTime();

  // Reset main featured drop if drawn or expired so users can always interact with the live event
  if (drop.id === 'drop-jack-white-vault' && (drop.status === 'drawn' || isNaN(endTime) || endTime <= now)) {
    drop.status = 'open';
    drop.windowStart = new Date(now - 1000 * 60 * 10).toISOString();
    drop.windowEnd = new Date(now + 1000 * 60 * 90).toISOString(); // 90 minutes active countdown
    drop.drawTime = new Date(now + 1000 * 60 * 95).toISOString();
    drop.revealedSeed = null;
    db.set('drops', drop.id, drop);
    return drop;
  }

  if (drop.status === 'open' && (isNaN(endTime) || endTime <= now)) {
    drop.windowStart = new Date(now - 1000 * 60 * 10).toISOString();
    drop.windowEnd = new Date(now + 1000 * 60 * 90).toISOString(); // 90 minutes active countdown
    drop.drawTime = new Date(now + 1000 * 60 * 95).toISOString();
    db.set('drops', drop.id, drop);
  } else if (drop.status === 'scheduled') {
    const startTime = new Date(drop.windowStart).getTime();
    if (isNaN(startTime) || startTime <= now) {
      drop.windowStart = new Date(now + 1000 * 60 * 180).toISOString(); // opens in 3 hours
      drop.windowEnd = new Date(now + 1000 * 60 * 240).toISOString();
      drop.drawTime = new Date(now + 1000 * 60 * 245).toISOString();
      db.set('drops', drop.id, drop);
    }
  }
  return drop;
}

// Initialize default sample drops into Firestore if empty
export function initSampleDrops() {
  if (db.isCloudEnabled()) {
    // In Cloud Firestore, drops and 500 individual seats are already stored online.
    // Avoid blasting 1,500 unbatched individual network writes on boot.
    const drops = db.list('drops').map(d => d.data as Drop);
    for (const d of drops) {
      ensureActiveWindow(d);
    }
    return;
  }

  const existing = db.list('drops');
  if (existing.length === 0) {
    for (const drop of INITIAL_SAMPLE_DROPS) {
      const activeDrop = ensureActiveWindow({ ...drop });
      db.set('drops', activeDrop.id, activeDrop);

      // Initialize tiered seats
      ensureSeatsForDrop(activeDrop);
    }
  }
}

// GET /api/drops
export function listDropsHandler(req: Request, res: Response) {
  const drops = db.list('drops').map(d => {
    const data = d.data as Drop;
    if (!data.createdAt) {
      data.createdAt = new Date(d.createdAt || Date.now()).toISOString();
    }
    return ensureActiveWindow(data);
  });
  return res.json({ drops });
}

// GET /api/drops/:id
export function getDropHandler(req: Request, res: Response) {
  const id = req.params.id as string;
  const doc = db.get('drops', id);
  if (!doc) {
    return res.status(404).json({ error: 'Drop not found' });
  }
  const drop = ensureActiveWindow(doc.data as Drop);
  return res.json({ drop });
}

// GET /api/drops/:id/seats
export function getDropSeatsHandler(req: Request, res: Response) {
  const id = req.params.id as string;
  const seats = db.list(`drops/${id}/seats`).map(d => d.data as Seat);
  return res.json({ seats, count: seats.length });
}

// GET /api/drops/:id/entries
export function getDropEntriesHandler(req: Request, res: Response) {
  const id = req.params.id as string;
  const entries = db.list(`drops/${id}/entries`).map(d => d.data as DropEntry);
  return res.json({ entries, count: entries.length });
}

// PATCH /api/drops/:id/entries/:identityKey
export function updateEntryStatusHandler(req: AuthenticatedRequest, res: Response) {
  const dropId = req.params.id as string;
  const identityKey = req.params.identityKey as string;
  const { status, riskScore } = req.body;

  const entryDoc = db.get(`drops/${dropId}/entries`, identityKey);
  if (!entryDoc) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const updatedEntry = {
    ...entryDoc.data,
    ...(status ? { status } : {}),
    ...(riskScore !== undefined ? { riskScore } : {}),
  };

  db.set(`drops/${dropId}/entries`, identityKey, updatedEntry);

  appendAuditRecord('ENTRY_STATUS_MODIFIED', req.user?.uid || 'admin', {
    dropId,
    identityKey,
    newStatus: status,
    riskScore,
  });

  return res.json({ success: true, entry: updatedEntry });
}

// PATCH /api/drops/:id
export function updateDropHandler(req: AuthenticatedRequest, res: Response) {
  const id = req.params.id as string;
  const updates = req.body;
  const doc = db.get('drops', id);
  if (!doc) {
    return res.status(404).json({ error: 'Drop not found' });
  }

  const updatedDrop = {
    ...doc.data,
    ...updates,
  };

  db.set('drops', id, updatedDrop);

  appendAuditRecord('DROP_UPDATED', req.user?.uid || 'organizer', {
    dropId: id,
    updates: Object.keys(updates),
  });

  return res.json({ success: true, drop: updatedDrop });
}

// POST /api/drops
export async function createDropHandler(req: AuthenticatedRequest, res: Response) {
  const data = req.body;
  const id = data.id || `drop-${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanName = (data.name || 'Exclusive Allocation Event').trim();

  // Validate duplicate drop name (case-insensitive)
  const existingDrops = db.list('drops').map(d => d.data as Drop);
  const isDuplicate = existingDrops.some(
    d => d.id !== id && d.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(409).json({
      error: 'DUPLICATE_DROP_NAME',
      message: `An event with the name "${cleanName}" already exists. Please choose a unique name.`,
    });
  }
  
  // Section 1 Commit-Reveal: publish hash(seed) before window opens
  const secretSeed = `SEED_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const seedCommitHash = sha256Sync(secretSeed);

  const tiers: TicketTier[] = data.tiers && data.tiers.length > 0 ? data.tiers : DEFAULT_TIERS;
  const seatCount = data.seatCount || tiers.reduce((acc: number, t: TicketTier) => acc + t.seatCount, 0) || 500;
  const newDrop: Drop = {
    id,
    name: cleanName,
    artistOrHost: data.artistOrHost || 'Organizer',
    venue: data.venue || 'Concert Hall',
    city: data.city || 'Nashville, TN',
    heroImage: data.heroImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
    seatCount,
    price: data.price || 85,
    currency: data.currency || 'USD',
    perPersonLimit: 1,
    windowStart: data.windowStart || new Date().toISOString(),
    windowEnd: data.windowEnd || new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    drawTime: data.drawTime || new Date(Date.now() + 1000 * 60 * 18).toISOString(),
    holdDurationSec: data.holdDurationSec || 300,
    mode: data.mode || 'FAIR_DROP',
    status: 'open',
    tiers,
    seedCommitHash,
    revealedSeed: null, // Revealed ONLY after draw closes
    defenceConfig: data.defenceConfig || DEFAULT_DEFENCE_CONFIG,
    createdBy: req.user?.uid || 'organizer',
    description: data.description || 'Verified commit-reveal random lottery drop.',
    totalEntriesCount: 0,
    createdAt: data.createdAt || new Date().toISOString(),
    stats: {
      eligible: 0,
      flagged: 0,
      blocked: 0,
      allocated: 0,
      held: 0,
      sold: 0,
    },
  };

  db.set('drops', id, newDrop);

  // Initialize tiered seats (VIP, Platinum, Gold, Silver, Bronze)
  ensureSeatsForDrop(newDrop);

  // Record committed seed secret in private server store
  db.set('private_seeds', id, { secretSeed, seedCommitHash });

  appendAuditRecord('DROP_CREATED', req.user?.uid || 'organizer', {
    dropId: id,
    name: newDrop.name,
    seedCommitHash,
    mode: newDrop.mode,
  });

  return res.status(201).json({ drop: newDrop });
}

// DELETE /api/drops/:id
export async function deleteDropHandler(req: AuthenticatedRequest, res: Response) {
  const id = req.params.id as string;
  const doc = db.get('drops', id);
  if (!doc) {
    return res.status(404).json({ error: 'Drop not found' });
  }

  // Remove from database and Cloud Firestore
  db.delete('drops', id);
  db.delete('private_seeds', id);

  // Clean up any tickets belonging to this drop
  const tickets = db.list('tickets').map(d => d.data as Ticket).filter(t => t.dropId === id);
  for (const t of tickets) {
    db.delete('tickets', t.id);
  }

  appendAuditRecord('DROP_DELETED', req.user?.uid || 'organizer', {
    dropId: id,
    dropName: doc.data.name,
  });

  return res.json({ success: true, message: `Drop ${id} deleted successfully.` });
}
