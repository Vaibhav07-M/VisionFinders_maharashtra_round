import { db } from '../db/firestore';
import { appendAuditRecord } from './audit';

export function runSystemInvariantCheck(dropId: string) {
  const seats = db.list(`drops/${dropId}/seats`).map(d => d.data);
  const reservations = db.list(`drops/${dropId}/reservations`).map(d => d.data);
  const orders = db.list(`orders`).map(d => d.data).filter(o => o.dropId === dropId);
  const tickets = db.list(`tickets`).map(d => d.data).filter(t => t.dropId === dropId);

  const available = seats.filter(s => s.status === 'available').length;
  const held = seats.filter(s => s.status === 'held').length;
  const sold = seats.filter(s => s.status === 'sold').length;
  const blocked = seats.filter(s => s.status === 'blocked').length;

  const total = seats.length || 500;
  const inventoryConsistent = (available + held + sold + blocked) === total;

  // Check duplicate seat claims
  const seatIds = new Set<string>();
  let duplicates = 0;
  for (const ticket of tickets) {
    if (seatIds.has(ticket.seatLabel)) {
      duplicates++;
    }
    seatIds.add(ticket.seatLabel);
  }

  const oversold = Math.max(0, sold - total);
  const orphanedHolds = Math.max(0, held - reservations.filter(r => r.status === 'active').length);

  const valid = oversold === 0 && duplicates === 0 && orphanedHolds === 0 && inventoryConsistent;

  appendAuditRecord('INVARIANT_CHECK_EXECUTED', 'system', {
    dropId,
    oversold,
    duplicates,
    orphanedHolds,
    inventoryConsistent,
    valid,
  });

  return {
    oversold,
    duplicates,
    orphanedHolds,
    inventoryConsistent,
    totalSeats: total,
    valid,
  };
}
