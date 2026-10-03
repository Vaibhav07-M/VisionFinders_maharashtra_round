import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Drop, Seat } from '../../shared/types';
import { INITIAL_SAMPLE_DROPS, DEFAULT_DEFENCE_CONFIG } from '../../shared/constants';
import { appendAuditRecord } from './audit';

// Initialize default sample drops into Firestore if empty
export function initSampleDrops() {
  const existing = db.list('drops');
  if (existing.length === 0) {
    for (const drop of INITIAL_SAMPLE_DROPS) {
      db.set('drops', drop.id, drop);
      // Initialize 500 seats for default drop
      const sections = ['Orchestra A', 'Orchestra B', 'Mezzanine Center', 'Balcony Front'];
      for (let i = 1; i <= 500; i++) {
        const section = sections[Math.floor((i - 1) / 125)];
        const row = String.fromCharCode(65 + Math.floor(((i - 1) % 125) / 25));
        const seatNum = ((i - 1) % 25) + 1;
        const seatId = `seat-${i}`;
        const seat: Seat = {
          id: seatId,
          dropId: drop.id,
          section,
          row,
          number: seatNum,
          label: `${section} · Row ${row}-${seatNum}`,
          price: drop.price,
          accessible: i % 25 === 1,
          status: i > 485 ? 'sold' : 'available',
        };
        db.set(`drops/${drop.id}/seats`, seatId, seat);
      }
    }
  }
}

export function listDropsHandler(req: Request, res: Response) {
  const drops = db.list('drops').map(d => d.data as Drop);
  return res.json({ drops });
}

export function getDropHandler(req: Request, res: Response) {
  const { id } = req.params;
  const doc = db.get('drops', id);
  if (!doc) {
    return res.status(404).json({ error: 'Drop not found' });
  }
  return res.json({ drop: doc.data });
}

export async function createDropHandler(req: AuthenticatedRequest, res: Response) {
  const data = req.body;
  const id = `drop-${Date.now().toString(36)}`;
  
  // Section 1 Commit-Reveal: publish hash(seed) before window opens
  const secretSeed = `SEED_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const seedCommitHash = sha256Sync(secretSeed);

  const newDrop: Drop = {
    id,
    name: data.name || 'Exclusive Allocation Event',
    artistOrHost: data.artistOrHost || 'Organizer',
    venue: data.venue || 'Concert Hall',
    city: data.city || 'Nashville, TN',
    heroImage: data.heroImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
    seatCount: data.seatCount || 500,
    price: data.price || 85,
    currency: 'USD',
    perPersonLimit: 1,
    windowStart: data.windowStart || new Date().toISOString(),
    windowEnd: data.windowEnd || new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    drawTime: data.drawTime || new Date(Date.now() + 1000 * 60 * 18).toISOString(),
    holdDurationSec: data.holdDurationSec || 300,
    mode: data.mode || 'FAIR_DROP',
    status: 'open',
    seedCommitHash,
    revealedSeed: null, // Revealed ONLY after draw closes
    defenceConfig: data.defenceConfig || DEFAULT_DEFENCE_CONFIG,
    createdBy: req.user?.uid || 'organizer',
    description: data.description || 'Verified commit-reveal random lottery drop.',
    totalEntriesCount: 0,
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

  // Initialize 500 seats in batched writes
  const sections = ['Orchestra A', 'Orchestra B', 'Mezzanine Center', 'Balcony Front'];
  for (let i = 1; i <= newDrop.seatCount; i++) {
    const section = sections[Math.floor((i - 1) / (newDrop.seatCount / 4))];
    const row = String.fromCharCode(65 + Math.floor(((i - 1) % 125) / 25));
    const seatNum = ((i - 1) % 25) + 1;
    const seatId = `seat-${i}`;
    db.set(`drops/${id}/seats`, seatId, {
      id: seatId,
      dropId: id,
      section,
      row,
      number: seatNum,
      label: `${section} · Row ${row}-${seatNum}`,
      price: newDrop.price,
      accessible: i % 25 === 1,
      status: 'available',
    });
  }

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
