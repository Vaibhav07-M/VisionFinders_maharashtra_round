import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Drop, DropEntry, Seat, Offer, TicketTier } from '../../shared/types';
import { DEFAULT_TIERS } from '../../shared/constants';
import { ensureSeatsForDrop, getLiveBoardData } from './offers';
import { getRealtimeInstance } from './realtime';
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

  // Retrieve secret committed seed or generate deterministic reveal
  let revealedSeed: string;
  const secretRecord = db.get('private_seeds', dropId);
  if (secretRecord) {
    revealedSeed = secretRecord.data.secretSeed;
  } else if (drop.revealedSeed) {
    revealedSeed = drop.revealedSeed;
  } else {
    revealedSeed = `SEED_REVEAL_${Date.now()}`;
  }

  // Freeze entries
  const allEntries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const eligibleEntries = allEntries.filter(
    e => e.status === 'eligible' || e.status === 'entered' || e.status === 'selected' || e.status === 'not_selected' || e.status === 'waitlisted'
  );

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

  // Assign 1-indexed drawRank to each entry
  rankedEntries.forEach((entry, idx) => {
    entry.drawRank = idx + 1;
  });

  // Ensure seats with tiers exist
  const allSeats = ensureSeatsForDrop(drop);
  const tiers: TicketTier[] = drop.tiers && drop.tiers.length > 0 ? drop.tiers : DEFAULT_TIERS;

  // Group available unassigned seats by tierId
  const availableSeatsByTier: Record<string, Seat[]> = {};
  for (const tier of tiers) {
    availableSeatsByTier[tier.id] = allSeats.filter(
      s => s.tierId === tier.id && s.status === 'available'
    );
  }

  const now = Date.now();
  const holdDurationMs = (drop.holdDurationSec || 300) * 1000;
  const expiresAt = now + holdDurationMs;
  const batchOps: any[] = [];
  const createdOffers: Offer[] = [];

  let totalAllocated = 0;
  let totalWaitlisted = 0;

  // Round 1 allocation, in draw-rank order, for each entry:
  for (const entry of rankedEntries) {
    // Preferences in order
    const prefs = entry.preferences && entry.preferences.length > 0
      ? entry.preferences
      : tiers.map(t => t.id);

    let assignedSeat: Seat | null = null;
    let assignedTier: TicketTier | null = null;

    // Take the first tier that still has an unassigned seat
    for (const tierId of prefs) {
      const tierSeats = availableSeatsByTier[tierId];
      if (tierSeats && tierSeats.length > 0) {
        assignedSeat = tierSeats.shift()!;
        assignedTier = tiers.find(t => t.id === tierId) || null;
        break;
      }
    }

    if (assignedSeat && assignedTier) {
      // Create OFFER
      const offerId = `off_${dropId}_${entry.uid}`;
      const offer: Offer = {
        id: offerId,
        dropId,
        entryId: entry.identityKey,
        uid: entry.uid,
        seatId: assignedSeat.id,
        tierId: assignedTier.id,
        tierName: assignedTier.name,
        seatLabel: assignedSeat.label,
        price: assignedTier.price,
        status: 'offered',
        createdAt: now,
        expiresAt,
      };

      createdOffers.push(offer);
      totalAllocated++;

      // Seat becomes HELD
      assignedSeat.status = 'held';
      assignedSeat.currentOfferId = offerId;
      assignedSeat.holderUid = entry.uid;
      assignedSeat.holdExpiresAt = new Date(expiresAt).toISOString();

      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/seats`,
        docId: assignedSeat.id,
        data: assignedSeat,
      });

      // Offer record
      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/offers`,
        docId: offerId,
        data: offer,
      });

      // Entry becomes OFFERED
      entry.status = 'offered';
      entry.currentOfferId = offerId;

      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/entries`,
        docId: entry.identityKey,
        data: entry,
      });
    } else {
      // If none of the user's preferred tiers has a seat left -> WAITLISTED
      entry.status = 'waitlisted';
      entry.currentOfferId = null;
      totalWaitlisted++;

      batchOps.push({
        type: 'set',
        collection: `drops/${dropId}/entries`,
        docId: entry.identityKey,
        data: entry,
      });
    }
  }

  // Commit batch updates in slices of 450 ops
  for (let b = 0; b < batchOps.length; b += 450) {
    db.batchWrite(batchOps.slice(b, b + 450));
  }

  // Update drop document
  const updatedDrop: Drop = {
    ...drop,
    status: 'drawn',
    revealedSeed,
  };
  db.set('drops', dropId, updatedDrop);

  appendAuditRecord('DRAW_EXECUTED', req.user?.uid || 'admin', {
    dropId,
    revealedSeed,
    totalEligible: eligibleEntries.length,
    totalAllocated,
    totalWaitlisted,
  });

  // Socket.io Realtime Broadcasts
  const realtime = getRealtimeInstance();
  if (realtime) {
    realtime.broadcastDrawResult(dropId, totalAllocated, revealedSeed);

    // Notify each offered user individually
    for (const off of createdOffers) {
      realtime.notifyOfferCreated(off.uid, off);
    }

    // Notify each waitlisted user of their position
    const waitlistedEntries = rankedEntries
      .filter(e => e.status === 'waitlisted')
      .sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));

    waitlistedEntries.forEach((wEntry, idx) => {
      realtime.notifyWaitlistPosition(wEntry.uid, {
        position: idx + 1,
        totalWaitlisted: waitlistedEntries.length,
      });
    });

    const liveBoard = getLiveBoardData(dropId);
    realtime.broadcastBoardUpdate(dropId, liveBoard);
    realtime.broadcastQueueUpdate(dropId, {
      peopleWaiting: liveBoard.peopleWaiting,
      totalHeld: liveBoard.totalHeld,
      soonestExpiryMs: liveBoard.soonestExpiryMs,
    });
  }

  return res.json({
    success: true,
    dropId,
    revealedSeed,
    totalAllocated,
    totalWaitlisted,
    createdOffersCount: createdOffers.length,
  });
}
