import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Ticket, Seat, Drop } from '../../shared/types';
import { appendAuditRecord } from './audit';

const HMAC_SECRET = process.env.HMAC_TICKET_SECRET || 'FAIR_DROP_SECRET_HMAC_KEY_2026';

export async function checkoutHandler(req: AuthenticatedRequest, res: Response) {
  const { dropId, seatId, paymentMethod, idempotencyKey } = req.body;
  const uid = req.user?.uid || 'user_alex_77';

  // Idempotency check
  if (idempotencyKey) {
    const existing = db.get('idempotency', idempotencyKey);
    if (existing) {
      return res.json({ ticket: existing.data, isDuplicate: true });
    }
  }

  const dropDoc = db.get('drops', dropId);
  if (!dropDoc) {
    return res.status(404).json({ error: 'Drop not found' });
  }
  const drop = dropDoc.data as Drop;

  const seatDoc = db.get(`drops/${dropId}/seats`, seatId);
  if (!seatDoc) {
    return res.status(404).json({ error: 'Seat not found' });
  }
  const seat = seatDoc.data as Seat;

  if (seat.status !== 'held' && seat.status !== 'available') {
    return res.status(409).json({ error: 'SEAT_NOT_AVAILABLE', message: 'Seat is not available for purchase.' });
  }

  // Create Order & Ticket
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;

  // HMAC-SHA256 Signature
  const rawPayload = `${ticketId}:${orderId}:${uid}:${seat.label}:${dropId}`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(rawPayload).digest('hex');

  const ticket: Ticket = {
    id: ticketId,
    orderId,
    dropId,
    dropName: drop.name,
    venue: drop.venue,
    uid,
    seatLabel: seat.label,
    price: drop.price,
    issuedAt: new Date().toISOString(),
    status: 'confirmed',
    qrPayload: `FAIRDROP:TICKET:${ticketId}:SIG:${signature.substring(0, 16)}`,
    signature,
    holderName: req.user?.email || 'Alex Chen',
    holderEmail: req.user?.email || 'alex.chen@fairdrop.io',
  };

  // Mark seat as sold and clean up reservation
  db.set(`drops/${dropId}/seats`, seatId, {
    ...seat,
    status: 'sold',
    holderUid: uid,
    holdExpiresAt: null,
  });

  db.set('tickets', ticketId, ticket);
  db.set('orders', orderId, {
    orderId,
    uid,
    dropId,
    seatId,
    amount: drop.price,
    status: 'completed',
    paymentMethod: paymentMethod || 'simulated_card',
    createdAt: Date.now(),
  });

  if (idempotencyKey) {
    db.set('idempotency', idempotencyKey, ticket);
  }

  appendAuditRecord('TICKET_PURCHASED', uid, {
    ticketId,
    orderId,
    dropId,
    seatLabel: seat.label,
  });

  return res.status(201).json({
    success: true,
    ticket,
  });
}
