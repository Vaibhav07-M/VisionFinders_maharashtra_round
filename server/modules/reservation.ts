import cron from 'node-cron';
import { db } from '../db/firestore';
import { Reservation, Seat, DropEntry } from '../../shared/types';
import { appendAuditRecord } from './audit';

// Run hold expiration check every 10 seconds
export function startHoldExpirationScheduler() {
  cron.schedule('*/10 * * * * *', () => {
    const drops = db.list('drops').map(d => d.data);
    const now = Date.now();

    for (const drop of drops) {
      if (drop.status !== 'drawn' && drop.status !== 'open') continue;

      const reservations = db.list(`drops/${drop.id}/reservations`).map(d => d.data as Reservation);
      const activeRes = reservations.filter(r => r.status === 'active');

      for (const res of activeRes) {
        if (new Date(res.expiresAt).getTime() < now) {
          // Hold expired!
          db.set(`drops/${drop.id}/reservations`, res.id, {
            ...res,
            status: 'expired',
          });

          // Release seat back to available or waitlist cascade
          const seatDoc = db.get(`drops/${drop.id}/seats`, res.seatId);
          if (seatDoc) {
            const seat = seatDoc.data as Seat;

            // Look for next in line on waitlist
            const entries = db.list(`drops/${drop.id}/entries`).map(d => d.data as DropEntry);
            const waitlistCandidate = entries
              .filter(e => e.status === 'not_selected')
              .sort((a, b) => (a.drawRank || 999999) - (b.drawRank || 999999))[0];

            if (waitlistCandidate) {
              // Cascade hold to waitlist candidate
              const newExpiry = new Date(Date.now() + 1000 * 300).toISOString();
              db.set(`drops/${drop.id}/seats`, seat.id, {
                ...seat,
                status: 'held',
                holderUid: waitlistCandidate.uid,
                holdExpiresAt: newExpiry,
              });

              db.set(`drops/${drop.id}/reservations`, `res_${drop.id}_${waitlistCandidate.uid}`, {
                id: `res_${drop.id}_${waitlistCandidate.uid}`,
                dropId: drop.id,
                uid: waitlistCandidate.uid,
                seatId: seat.id,
                status: 'active',
                expiresAt: newExpiry,
                createdAt: new Date().toISOString(),
              });

              db.set(`drops/${drop.id}/entries`, waitlistCandidate.identityKey, {
                ...waitlistCandidate,
                status: 'selected',
              });

              appendAuditRecord('HOLD_CASCADED_TO_WAITLIST', 'system', {
                dropId: drop.id,
                previousUid: res.uid,
                newUid: waitlistCandidate.uid,
                seatId: seat.id,
              });
            } else {
              db.set(`drops/${drop.id}/seats`, seat.id, {
                ...seat,
                status: 'available',
                holderUid: null,
                holdExpiresAt: null,
              });
            }
          }
        }
      }
    }
  });
}
