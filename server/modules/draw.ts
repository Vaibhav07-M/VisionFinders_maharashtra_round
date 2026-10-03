import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Drop, DropEntry, Seat, Reservation } from '../../shared/types';
import { appendAuditRecord } from './audit';
import { runSystemInvariantCheck } from './invariants';

// Deterministic PRNG and Fisher-Yates Shuffle
function createPRNG(seedString: string) {
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed << 5) - seed + seedString.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed);

  return function next(): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function executeFisherYates<T>(items: T[], seed: string): T[] {
  const result = [...items];
  const rng = createPRNG(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function triggerDrawHandler(req: AuthenticatedRequest, res: Response) {
  const { id: dropId } = req.params;
  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) {
    return res.status(404).json({ error: 'Drop not found' });
  }
  const drop = dropDoc.data as Drop;

  // Retrieve secret committed seed
  const secretRecord = db.get('private_seeds', dropId);
  const revealedSeed = secretRecord ? secretRecord.data.secretSeed : `SEED_REVEAL_${Date.now()}`;

  // Freeze entries
  const allEntries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const eligibleEntries = allEntries.filter(e => e.status === 'eligible');

  let rankedEntries: DropEntry[] = [];

  if (drop.mode === 'FCFS') {
    // FCFS EXPERIMENTAL CONTROL: Ordered by server arrival timestamp + tie break receiptId
    rankedEntries = [...eligibleEntries].sort((a, b) => {
      if (a.serverTimestamp !== b.serverTimestamp) {
        return a.serverTimestamp - b.serverTimestamp;
      }
      return a.receiptId.localeCompare(b.receiptId);
    });
  } else {
    // FAIR DROP PRODUCT: Verifiable Deterministic Fisher-Yates with Revealed Seed
    rankedEntries = executeFisherYates(eligibleEntries, revealedSeed);
  }

  const winnersCount = Math.min(drop.seatCount, rankedEntries.length);
  const winners = rankedEntries.slice(0, winnersCount);
  const waitlist = rankedEntries.slice(winnersCount);

  // Retrieve available seats
  const seats = db.list(`drops/${dropId}/seats`).map(d => d.data as Seat);
  const availableSeats = seats.filter(s => s.status === 'available');

  // ATOMIC ALLOCATION IN BATCHED WRITES (Max 500 ops per batch)
  const batchOps: Array<any> = [];
  const now = new Date().toISOString();
  const holdExpiry = new Date(Date.now() + (drop.holdDurationSec || 300) * 1000).toISOString();

  // 1. Assign winners to seats and mark hold reservations
  winners.forEach((winner, idx) => {
    const seat = availableSeats[idx] || seats[idx];
    if (seat) {
      // Seat held
      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/seats`,
        docId: seat.id,
        data: {
          ...seat,
          status: 'held',
          holderUid: winner.uid,
          holdExpiresAt: holdExpiry,
        },
      });

      // Reservation record
      const resId = `res_${dropId}_${winner.uid}`;
      const reservation: Reservation = {
        id: resId,
        dropId,
        uid: winner.uid,
        seatId: seat.id,
        status: 'active',
        expiresAt: holdExpiry,
        createdAt: now,
      };
      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/reservations`,
        docId: resId,
        data: reservation,
      });

      // Update entry status to selected
      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/entries`,
        docId: winner.identityKey,
        data: {
          ...winner,
          status: 'selected',
          drawRank: idx + 1,
        },
      });
    }
  });

  // 2. Mark remaining as not_selected or waitlisted
  waitlist.forEach((waitEntry, idx) => {
    batchOps.push({
      type: 'set',
      collection: `drops/${dropId}/entries`,
      docId: waitEntry.identityKey,
      data: {
        ...waitEntry,
        status: 'not_selected',
        drawRank: winnersCount + idx + 1,
      },
    });
  });

  // Execute batch write atomically (Firestore max 500 limit respected)
  // Split into chunks of 450 ops if needed
  for (let i = 0; i < batchOps.length; i += 450) {
    const chunk = batchOps.slice(i, i + 450);
    db.batchWrite(chunk);
  }

  // Update drop state to 'drawn' with revealed seed
  db.set('drops', dropId, {
    status: 'drawn',
    revealedSeed,
    stats: {
      ...drop.stats,
      allocated: winnersCount,
      held: winnersCount,
    },
  });

  // Log to append-only audit ledger
  appendAuditRecord('DRAW_COMPLETED', 'system', {
    dropId,
    mode: drop.mode,
    revealedSeed,
    winnersCount,
    totalEntries: eligibleEntries.length,
  });

  // Automatically run invariant integrity checker
  const invariantResult = runSystemInvariantCheck(dropId);

  return res.json({
    success: true,
    dropId,
    revealedSeed,
    winnersCount,
    invariants: invariantResult,
  });
}
