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

  // Retrieve or resume secret committed seed
  let revealedSeed: string;
  let lastAllocatedIndex = 0;

  if (drop.drawState && drop.drawState.status === 'in_progress') {
    // Resuming an interrupted draw
    revealedSeed = drop.drawState.revealedSeed;
    lastAllocatedIndex = drop.drawState.lastAllocatedIndex || 0;
    console.log(`[DRAW] Resuming interrupted draw for drop ${dropId} from index ${lastAllocatedIndex}`);
  } else {
    const secretRecord = db.get('private_seeds', dropId);
    revealedSeed = secretRecord ? secretRecord.data.secretSeed : `SEED_REVEAL_${Date.now()}`;
  }

  // Freeze entries
  const allEntries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const eligibleEntries = allEntries.filter(e => e.status === 'eligible' || e.status === 'selected' || e.status === 'not_selected');

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

  // Store draw progress in drop document BEFORE batch execution (Section 5 requirement)
  db.set('drops', dropId, {
    drawState: {
      status: 'in_progress',
      revealedSeed,
      lastAllocatedIndex,
      totalToAllocate: winnersCount,
      totalEligible: eligibleEntries.length,
      startedAt: drop.drawState?.startedAt || Date.now(),
      lastBatchAt: Date.now(),
    },
  });

  // Retrieve seats
  const seats = db.list(`drops/${dropId}/seats`).map(d => d.data as Seat);
  const now = new Date().toISOString();
  const holdExpiry = new Date(Date.now() + (drop.holdDurationSec || 300) * 1000).toISOString();

  // ATOMIC ALLOCATION IN MULTIPLE RESUMABLE BATCHES (<= 450 ops per batch, < 500 Firestore limit)
  // Each winner involves 3 ops (seat, reservation, entry). 100 winners = 300 ops.
  const WINNER_CHUNK_SIZE = 100;

  for (let i = lastAllocatedIndex; i < winnersCount; i += WINNER_CHUNK_SIZE) {
    const chunkEnd = Math.min(i + WINNER_CHUNK_SIZE, winnersCount);
    const chunkWinners = winners.slice(i, chunkEnd);
    const batchOps: Array<any> = [];

    chunkWinners.forEach((winner, offset) => {
      const seatIndex = i + offset;
      const seat = seats[seatIndex];
      if (seat) {
        const resId = `res_${dropId}_${winner.uid}`;
        const existingRes = db.get(`drops/${dropId}/reservations`, resId);

        // Idempotency: only allocate if not already allocated to this user
        if (!existingRes || existingRes.data.status !== 'active') {
          // 1. Seat hold
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

          // 2. Reservation record
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

          // 3. Winner entry marked selected
          batchOps.push({
            type: 'set',
            collection: `drops/${dropId}/entries`,
            docId: winner.identityKey,
            data: {
              ...winner,
              status: 'selected',
              drawRank: seatIndex + 1,
            },
          });
        }
      }
    });

    if (batchOps.length > 0) {
      db.batchWrite(batchOps);
    }

    // Persist progress checkpoint to Firestore
    db.set('drops', dropId, {
      drawState: {
        status: 'in_progress',
        revealedSeed,
        lastAllocatedIndex: chunkEnd,
        totalToAllocate: winnersCount,
        lastBatchAt: Date.now(),
      },
    });
  }

  // Batch process waitlist entries in chunks of 450 ops
  for (let w = 0; w < waitlist.length; w += 450) {
    const waitlistChunk = waitlist.slice(w, w + 450);
    const waitlistOps = waitlistChunk.map((waitEntry, idx) => ({
      type: 'set' as const,
      collection: `drops/${dropId}/entries`,
      docId: waitEntry.identityKey,
      data: {
        ...waitEntry,
        status: 'not_selected' as const,
        drawRank: winnersCount + w + idx + 1,
      },
    }));
    db.batchWrite(waitlistOps);
  }

  // Update drop to 'drawn' state with completed drawState
  db.set('drops', dropId, {
    status: 'drawn',
    revealedSeed,
    drawState: {
      status: 'completed',
      revealedSeed,
      lastAllocatedIndex: winnersCount,
      totalToAllocate: winnersCount,
      completedAt: Date.now(),
    },
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
    drawState: {
      status: 'completed',
      lastAllocatedIndex: winnersCount,
      totalToAllocate: winnersCount,
    },
    invariants: invariantResult,
  });
}
