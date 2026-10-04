import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import {
  Drop,
  Seat,
  DropEntry,
  Offer,
  Ticket,
  LiveBoardData,
  LiveTierStat,
  UserDropState,
  TicketTier,
} from '../../shared/types';
import { DEFAULT_TIERS } from '../../shared/constants';
import { getRealtimeInstance } from './realtime';
import { appendAuditRecord } from './audit';

const HMAC_SECRET = process.env.HMAC_TICKET_SECRET || 'FAIR_DROP_SECRET_HMAC_KEY_2026';

// Helper to ensure 500 seats with tiers exist for a drop
export function ensureSeatsForDrop(drop: Drop): Seat[] {
  const existingDocs = db.list(`drops/${drop.id}/seats`);
  const existingSeats = existingDocs.map(d => d.data as Seat);

  // If seats already exist with tierId, return them
  if (existingSeats.length > 0 && existingSeats[0].tierId) {
    return existingSeats;
  }

  const tiers: TicketTier[] = drop.tiers && drop.tiers.length > 0 ? drop.tiers : DEFAULT_TIERS;
  const seats: Seat[] = [];
  const batchOps: any[] = [];

  let globalSeatIndex = 1;
  for (const tier of tiers) {
    const tierPrefix = tier.id === 'vip' ? 'VIP' :
      tier.id === 'platinum' ? 'PLAT' :
      tier.id === 'gold' ? 'GOLD' :
      tier.id === 'silver' ? 'SILV' : 'BRNZ';

    const sectionName = tier.id === 'vip' ? 'VIP Lounge' :
      tier.id === 'platinum' ? 'Orchestra Prime' :
      tier.id === 'gold' ? 'Mezzanine Center' :
      tier.id === 'silver' ? 'Balcony Front' : 'Balcony General';

    const rowLetter = tier.id === 'vip' ? 'A' :
      tier.id === 'platinum' ? 'B' :
      tier.id === 'gold' ? 'C' :
      tier.id === 'silver' ? 'D' : 'E';

    for (let i = 1; i <= tier.seatCount; i++) {
      const seatId = `seat-${tier.id}-${i}`;
      const seatLabel = `${tierPrefix}-${i}`;
      const seat: Seat = {
        id: seatId,
        dropId: drop.id,
        tierId: tier.id,
        section: sectionName,
        row: rowLetter,
        number: i,
        label: seatLabel,
        price: tier.price,
        accessible: i % 25 === 1,
        status: 'available',
        currentOfferId: null,
      };
      seats.push(seat);
      batchOps.push({
        type: 'set',
        collection: `drops/${drop.id}/seats`,
        docId: seatId,
        data: seat,
      });
      globalSeatIndex++;
    }
  }

  // Batch commit in slices of 450 ops
  for (let b = 0; b < batchOps.length; b += 450) {
    db.batchWrite(batchOps.slice(b, b + 450));
  }

  return seats;
}

// Compute live board data for a drop
export function getLiveBoardData(dropId: string): LiveBoardData {
  const dropDoc = db.get('drops', dropId);
  const drop = dropDoc ? (dropDoc.data as Drop) : null;
  const tiers: TicketTier[] = drop?.tiers && drop.tiers.length > 0 ? drop.tiers : DEFAULT_TIERS;

  let seats = db.list(`drops/${dropId}/seats`).map(d => d.data as Seat);
  if (seats.length === 0 && drop) {
    seats = ensureSeatsForDrop(drop);
  }

  const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const offers = db.list(`drops/${dropId}/offers`).map(d => d.data as Offer);

  const tierStats: LiveTierStat[] = tiers.map(tier => {
    const tierSeats = seats.filter(s => s.tierId === tier.id);
    const available = tierSeats.filter(s => s.status === 'available').length;
    const held = tierSeats.filter(s => s.status === 'held').length;
    const sold = tierSeats.filter(s => s.status === 'sold').length;

    return {
      tierId: tier.id,
      name: tier.name,
      price: tier.price,
      totalSeats: tier.seatCount || tierSeats.length,
      available,
      held,
      sold,
    };
  });

  const totalAvailable = seats.filter(s => s.status === 'available').length;
  const totalHeld = seats.filter(s => s.status === 'held').length;
  const totalSold = seats.filter(s => s.status === 'sold').length;
  const peopleWaiting = entries.filter(e => e.status === 'waitlisted').length;

  const activeOffers = offers.filter(o => o.status === 'offered' && o.expiresAt > Date.now());
  const soonestExpiryMs = activeOffers.length > 0
    ? Math.min(...activeOffers.map(o => o.expiresAt))
    : null;

  return {
    dropId,
    round: drop?.round || 1,
    tiers: tierStats,
    totalAvailable,
    totalHeld,
    totalSold,
    peopleWaiting,
    soonestExpiryMs,
    seats: seats.map(s => ({
      id: s.id,
      tierId: s.tierId,
      label: s.label,
      status: s.status,
      price: s.price,
    })),
  };
}

// GET /api/drops/:id/board
export function getBoardHandler(req: Request, res: Response) {
  const id = req.params.id as string;
  const board = getLiveBoardData(id);
  return res.json({ board });
}

// Compute full state for user
export function getUserDropState(dropId: string, uid: string, email?: string): UserDropState {
  const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const userEntry = entries.find(e => e.uid === uid) || null;

  const offers = db.list(`drops/${dropId}/offers`).map(d => d.data as Offer);
  // Active offer first, or latest user offer
  const activeOffer = offers.find(o => o.uid === uid && o.status === 'offered' && o.expiresAt > Date.now());
  const latestOffer = activeOffer || offers.find(o => o.uid === uid) || null;

  const waitlisted = entries
    .filter(e => e.status === 'waitlisted')
    .sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));

  let waitlistPosition: number | null = null;
  if (userEntry && userEntry.status === 'waitlisted') {
    const idx = waitlisted.findIndex(e => e.uid === uid);
    if (idx !== -1) waitlistPosition = idx + 1;
  }

  const tickets = db.list('tickets').map(d => d.data as Ticket);
  const ticket = tickets.find(t => t.uid === uid && t.dropId === dropId) || null;

  return {
    dropId,
    entry: userEntry,
    offer: latestOffer,
    waitlistPosition,
    totalWaitlisted: waitlisted.length,
    ticket,
  };
}

// GET /api/drops/:id/me
export function getUserDropStateHandler(req: AuthenticatedRequest, res: Response) {
  const id = req.params.id as string;
  const uid = req.user?.uid || 'user_guest';
  const state = getUserDropState(id, uid, req.user?.email);
  return res.json(state);
}

// CASCADE: Scan waitlist in draw-rank order for an available seat
export function cascadeSeat(dropId: string, seatId: string): { cascaded: boolean; offer?: Offer } {
  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) return { cascaded: false };
  const drop = dropDoc.data as Drop;

  const seatDoc = db.get(`drops/${dropId}/seats`, seatId);
  if (!seatDoc) return { cascaded: false };
  const seat = seatDoc.data as Seat;

  // Retrieve waitlist in draw-rank order
  const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const waitlisted = entries
    .filter(e => e.status === 'waitlisted')
    .sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));

  // Find first waitlisted entry who prefers this tier
  const eligibleWinner = waitlisted.find(e => {
    const prefs = e.preferences && e.preferences.length > 0
      ? e.preferences
      : (drop.tiers || DEFAULT_TIERS).map(t => t.id);
    return prefs.includes(seat.tierId);
  });

  const realtime = getRealtimeInstance();

  if (eligibleWinner) {
    const now = Date.now();
    const holdDurationMs = (drop.holdDurationSec || 300) * 1000;
    const expiresAt = now + holdDurationMs;
    const offerId = `off_${dropId}_${eligibleWinner.uid}_${now.toString(36)}`;

    const tierInfo = (drop.tiers || DEFAULT_TIERS).find(t => t.id === seat.tierId);

    const newOffer: Offer = {
      id: offerId,
      dropId,
      entryId: eligibleWinner.identityKey,
      uid: eligibleWinner.uid,
      seatId: seat.id,
      tierId: seat.tierId,
      tierName: tierInfo?.name || seat.tierId.toUpperCase(),
      seatLabel: seat.label,
      price: tierInfo?.price || seat.price,
      status: 'offered',
      createdAt: now,
      expiresAt,
    };

    // Update Offer in DB
    db.set(`drops/${dropId}/offers`, offerId, newOffer);

    // Update Seat in DB
    db.set(`drops/${dropId}/seats`, seat.id, {
      ...seat,
      status: 'held',
      currentOfferId: offerId,
      holderUid: eligibleWinner.uid,
      holdExpiresAt: new Date(expiresAt).toISOString(),
    });

    // Update Entry in DB
    db.set(`drops/${dropId}/entries`, eligibleWinner.identityKey, {
      ...eligibleWinner,
      status: 'offered',
      currentOfferId: offerId,
    });

    appendAuditRecord('SEAT_CASCADED', eligibleWinner.uid, {
      dropId,
      seatId: seat.id,
      offerId,
      tierId: seat.tierId,
      drawRank: eligibleWinner.drawRank,
    });

    // Push instant socket notifications
    if (realtime) {
      realtime.notifyOfferCreated(eligibleWinner.uid, newOffer);
      const board = getLiveBoardData(dropId);
      realtime.broadcastBoardUpdate(dropId, board);
      realtime.broadcastQueueUpdate(dropId, {
        peopleWaiting: board.peopleWaiting,
        totalHeld: board.totalHeld,
        soonestExpiryMs: board.soonestExpiryMs,
      });

      // Recalculate remaining waitlist positions
      const updatedEntries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
      const updatedWaitlist = updatedEntries
        .filter(e => e.status === 'waitlisted')
        .sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));

      updatedWaitlist.forEach((wEntry, idx) => {
        realtime.notifyWaitlistPosition(wEntry.uid, {
          position: idx + 1,
          totalWaitlisted: updatedWaitlist.length,
        });
      });
    }

    return { cascaded: true, offer: newOffer };
  } else {
    // Nobody waiting wants this tier -> seat returns to AVAILABLE
    db.set(`drops/${dropId}/seats`, seat.id, {
      ...seat,
      status: 'available',
      currentOfferId: null,
      holderUid: null,
      holdExpiresAt: null,
    });

    if (realtime) {
      const board = getLiveBoardData(dropId);
      realtime.broadcastBoardUpdate(dropId, board);
      realtime.broadcastQueueUpdate(dropId, {
        peopleWaiting: board.peopleWaiting,
        totalHeld: board.totalHeld,
        soonestExpiryMs: board.soonestExpiryMs,
      });
    }

    return { cascaded: false };
  }
}

// 1-SECOND RELIABLE EXPIRY SCHEDULER
let expiryInterval: NodeJS.Timeout | null = null;

export function startOfferExpiryScheduler() {
  if (expiryInterval) return;

  expiryInterval = setInterval(() => {
    try {
      const drops = db.list('drops').map(d => d.data as Drop);
      const now = Date.now();
      const realtime = getRealtimeInstance();

      for (const drop of drops) {
        const offers = db.list(`drops/${drop.id}/offers`).map(d => d.data as Offer);
        for (const offer of offers) {
          if (offer.status === 'offered' && offer.expiresAt <= now) {
            // Atomic expiration
            offer.status = 'expired';
            db.set(`drops/${drop.id}/offers`, offer.id, offer);

            // Update user entry
            const entryDoc = db.get(`drops/${drop.id}/entries`, offer.entryId);
            if (entryDoc) {
              db.set(`drops/${drop.id}/entries`, offer.entryId, {
                ...entryDoc.data,
                status: 'expired',
                currentOfferId: null,
              });
            }

            appendAuditRecord('OFFER_EXPIRED', offer.uid, {
              dropId: drop.id,
              offerId: offer.id,
              seatId: offer.seatId,
            });

            if (realtime) {
              realtime.notifyOfferExpired(offer.uid, offer);
            }

            // Cascade seat to next waitlisted person
            cascadeSeat(drop.id, offer.seatId);
          }
        }
      }
    } catch (e: any) {
      // Quiet background errors
    }
  }, 1000);
}

// POST /api/offers/:id/pay
export async function payOfferHandler(req: AuthenticatedRequest, res: Response) {
  const offerId = req.params.id as string;
  const uid = req.user?.uid || 'user_guest';

  // Search for offer across all drops
  const drops = db.list('drops').map(d => d.data as Drop);
  let targetDrop: Drop | null = null;
  let targetOffer: Offer | null = null;

  for (const d of drops) {
    const offerDoc = db.get(`drops/${d.id}/offers`, offerId);
    if (offerDoc) {
      targetDrop = d;
      targetOffer = offerDoc.data as Offer;
      break;
    }
  }

  if (!targetDrop || !targetOffer) {
    return res.status(404).json({ error: 'OFFER_NOT_FOUND', message: 'Offer not found or expired.' });
  }

  // Verify ownership: only the user to whom the offer was given can pay for it
  if (targetOffer.uid !== uid) {
    return res.status(403).json({ error: 'UNAUTHORIZED_OFFER', message: 'You do not hold this exclusive offer.' });
  }

  // Idempotency: already paid -> return existing ticket
  if (targetOffer.status === 'paid') {
    const tickets = db.list('tickets').map(d => d.data as Ticket);
    const existingTicket = tickets.find(t => t.orderId === `ORD-${offerId}` || (t.uid === uid && t.dropId === targetDrop!.id));
    return res.json({ success: true, ticket: existingTicket, isDuplicate: true });
  }

  if (targetOffer.status !== 'offered' || targetOffer.expiresAt <= Date.now()) {
    return res.status(400).json({ error: 'OFFER_EXPIRED', message: 'This offer has expired or is no longer valid.' });
  }

  const dropId = targetDrop.id;
  const seatId = targetOffer.seatId;

  // Retrieve seat
  const seatDoc = db.get(`drops/${dropId}/seats`, seatId);
  if (!seatDoc) {
    return res.status(404).json({ error: 'SEAT_NOT_FOUND', message: 'Seat not found.' });
  }
  const seat = seatDoc.data as Seat;

  // Concurrency check: Ensure seat is still held for this offer
  if (seat.status !== 'held' || seat.currentOfferId !== offerId) {
    return res.status(409).json({ error: 'SEAT_NOT_AVAILABLE', message: 'Seat is no longer held for this offer.' });
  }

  // Generate Ticket & Order
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;
  const rawPayload = `${ticketId}:${orderId}:${uid}:${seat.label}:${dropId}`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(rawPayload).digest('hex');

  const ticket: Ticket = {
    id: ticketId,
    orderId,
    dropId,
    dropName: targetDrop.name,
    venue: targetDrop.venue,
    uid,
    seatLabel: seat.label,
    price: targetOffer.price,
    issuedAt: new Date().toISOString(),
    status: 'confirmed',
    qrPayload: `FAIRDROP:TICKET:${ticketId}:SIG:${signature.substring(0, 16)}`,
    signature,
    holderName: req.user?.displayName || req.user?.email || 'Attendee',
    holderEmail: req.user?.email || 'attendee@fairdrop.io',
  };

  // 1. Mark Offer PAID
  targetOffer.status = 'paid';
  db.set(`drops/${dropId}/offers`, offerId, targetOffer);

  // 2. Mark Seat SOLD
  db.set(`drops/${dropId}/seats`, seatId, {
    ...seat,
    status: 'sold',
    holderUid: uid,
    holdExpiresAt: null,
  });

  // 3. Mark Entry PAID
  const entryDoc = db.get(`drops/${dropId}/entries`, targetOffer.entryId);
  if (entryDoc) {
    db.set(`drops/${dropId}/entries`, targetOffer.entryId, {
      ...entryDoc.data,
      status: 'paid',
    });
  }

  // 4. Save Ticket
  db.set('tickets', ticketId, ticket);

  appendAuditRecord('OFFER_PAID_TICKET_ISSUED', uid, {
    dropId,
    offerId,
    seatId,
    ticketId,
    price: targetOffer.price,
  });

  const realtime = getRealtimeInstance();
  if (realtime) {
    realtime.notifyOfferPaid(uid, { offer: targetOffer, ticket });
    const board = getLiveBoardData(dropId);
    realtime.broadcastBoardUpdate(dropId, board);
    realtime.broadcastQueueUpdate(dropId, {
      peopleWaiting: board.peopleWaiting,
      totalHeld: board.totalHeld,
      soonestExpiryMs: board.soonestExpiryMs,
    });
  }

  return res.json({ success: true, ticket });
}

// POST /api/offers/:id/release
export async function releaseOfferHandler(req: AuthenticatedRequest, res: Response) {
  const offerId = req.params.id as string;
  const uid = req.user?.uid || 'user_guest';

  // Search for offer
  const drops = db.list('drops').map(d => d.data as Drop);
  let targetDrop: Drop | null = null;
  let targetOffer: Offer | null = null;

  for (const d of drops) {
    const offerDoc = db.get(`drops/${d.id}/offers`, offerId);
    if (offerDoc) {
      targetDrop = d;
      targetOffer = offerDoc.data as Offer;
      break;
    }
  }

  if (!targetDrop || !targetOffer) {
    return res.status(404).json({ error: 'OFFER_NOT_FOUND', message: 'Offer not found.' });
  }

  if (targetOffer.status !== 'offered') {
    return res.status(400).json({ error: 'OFFER_NOT_ACTIVE', message: `Offer is already ${targetOffer.status}.` });
  }

  const dropId = targetDrop.id;

  // 1. Mark Offer RELEASED
  targetOffer.status = 'released';
  db.set(`drops/${dropId}/offers`, offerId, targetOffer);

  // 2. Mark Entry RELEASED
  const entryDoc = db.get(`drops/${dropId}/entries`, targetOffer.entryId);
  if (entryDoc) {
    db.set(`drops/${dropId}/entries`, targetOffer.entryId, {
      ...entryDoc.data,
      status: 'released',
      currentOfferId: null,
    });
  }

  appendAuditRecord('OFFER_VOLUNTARILY_RELEASED', uid, {
    dropId,
    offerId,
    seatId: targetOffer.seatId,
  });

  // 3. Immediately cascade seat to waitlist
  const cascadeResult = cascadeSeat(dropId, targetOffer.seatId);

  return res.json({
    success: true,
    message: 'Seat released and passed to the next waitlisted attendee.',
    cascaded: cascadeResult.cascaded,
  });
}

// POST /api/drops/:id/waitlist/leave
export function leaveWaitlistHandler(req: AuthenticatedRequest, res: Response) {
  const dropId = req.params.id as string;
  const uid = req.user?.uid || 'user_guest';

  const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
  const entry = entries.find(e => e.uid === uid);

  if (!entry) {
    return res.status(404).json({ error: 'ENTRY_NOT_FOUND', message: 'No entry found for this user.' });
  }

  entry.status = 'left';
  db.set(`drops/${dropId}/entries`, entry.identityKey, entry);

  appendAuditRecord('WAITLIST_LEFT', uid, { dropId });

  const realtime = getRealtimeInstance();
  if (realtime) {
    const board = getLiveBoardData(dropId);
    realtime.broadcastBoardUpdate(dropId, board);
    realtime.broadcastQueueUpdate(dropId, {
      peopleWaiting: board.peopleWaiting,
      totalHeld: board.totalHeld,
      soonestExpiryMs: board.soonestExpiryMs,
    });

    const waitlisted = db
      .list(`drops/${dropId}/entries`)
      .map(d => d.data as DropEntry)
      .filter(e => e.status === 'waitlisted')
      .sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));

    waitlisted.forEach((wEntry, idx) => {
      realtime.notifyWaitlistPosition(wEntry.uid, {
        position: idx + 1,
        totalWaitlisted: waitlisted.length,
      });
    });
  }

  return res.json({ success: true, message: 'You have left the waitlist.' });
}

// POST /api/admin/drops/:id/next-round
export function openNextRoundHandler(req: AuthenticatedRequest, res: Response) {
  const dropId = req.params.id as string;
  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) {
    return res.status(404).json({ error: 'DROP_NOT_FOUND', message: 'Drop event not found.' });
  }
  const drop = dropDoc.data as Drop;

  const seats = db.list(`drops/${dropId}/seats`).map(d => d.data as Seat);
  const availableCount = seats.filter(s => s.status === 'available').length;

  if (availableCount === 0) {
    return res.status(400).json({
      error: 'NO_SEATS_AVAILABLE',
      message: 'No remaining available seats to open a next round.',
    });
  }

  const now = Date.now();
  const nextRound = (drop.round || 1) + 1;
  const updatedDrop: Drop = {
    ...drop,
    round: nextRound,
    status: 'open',
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(now + 1000 * 60 * 90).toISOString(),
    drawTime: new Date(now + 1000 * 60 * 95).toISOString(),
    revealedSeed: null,
  };

  db.set('drops', dropId, updatedDrop);

  appendAuditRecord('NEXT_ROUND_OPENED', req.user?.uid || 'admin', {
    dropId,
    round: nextRound,
    availableSeats: availableCount,
  });

  const realtime = getRealtimeInstance();
  if (realtime) {
    realtime.broadcastDropUpdate(dropId, { drop: updatedDrop });
    const board = getLiveBoardData(dropId);
    realtime.broadcastBoardUpdate(dropId, board);
  }

  return res.json({ success: true, drop: updatedDrop, availableSeats: availableCount });
}
