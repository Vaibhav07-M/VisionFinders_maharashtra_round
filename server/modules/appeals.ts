import { Request, Response } from 'express';
import { db } from '../db/firestore';
import { AuthenticatedRequest } from './auth';
import { Appeal, DropEntry } from '../../shared/types';
import { appendAuditRecord } from './audit';

// GET /api/appeals
export function listAppealsHandler(req: Request, res: Response) {
  const appeals = db.list('appeals').map(d => d.data as Appeal);
  return res.json({ appeals, count: appeals.length });
}

// POST /api/appeals
export function createAppealHandler(req: AuthenticatedRequest, res: Response) {
  const { dropId, reason, entryId } = req.body;
  const uid = req.user?.uid || 'user_guest';
  const email = req.user?.email || 'guest@fairdrop.io';

  if (!dropId || !reason) {
    return res.status(400).json({ error: 'dropId and reason are required' });
  }

  const dropDoc = db.get('drops', dropId);
  const dropName = dropDoc?.data?.name || 'Drop Event';

  const appealId = `appeal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newAppeal: Appeal = {
    id: appealId,
    entryId: entryId || `RCP-${Date.now().toString(36).toUpperCase()}`,
    dropId,
    dropName,
    userEmail: email,
    reason,
    status: 'pending',
    createdAt: now,
  };

  db.set('appeals', appealId, newAppeal);

  appendAuditRecord('APPEAL_SUBMITTED', uid, {
    appealId,
    dropId,
    entryId: newAppeal.entryId,
    reasonSummary: reason.substring(0, 100),
  });

  return res.status(201).json({ success: true, appeal: newAppeal });
}

// POST /api/appeals/:id/decide
export function decideAppealHandler(req: AuthenticatedRequest, res: Response) {
  const id = req.params.id as string;
  const { status, notes } = req.body;

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const appealDoc = db.get('appeals', id);
  if (!appealDoc) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  const appeal = appealDoc.data as Appeal;
  const updatedAppeal: Appeal = {
    ...appeal,
    status,
    notes: notes || `Appeal ${status} by administrator.`,
    decidedAt: new Date().toISOString(),
    decidedBy: req.user?.uid || 'security',
  };

  db.set('appeals', id, updatedAppeal);

  // If approved, update entry status in drop entries collection to 'eligible'
  const entries = db.list(`drops/${appeal.dropId}/entries`).map(d => d.data as DropEntry);
  const matchedEntry = entries.find(e => e.receiptId === appeal.entryId || e.identityKey === appeal.entryId);
  if (matchedEntry && status === 'approved') {
    db.set(`drops/${appeal.dropId}/entries`, matchedEntry.identityKey, {
      ...matchedEntry,
      status: 'eligible',
      riskScore: Math.min(matchedEntry.riskScore, 20),
    });
  }

  appendAuditRecord('APPEAL_DECIDED', req.user?.uid || 'security', {
    appealId: id,
    dropId: appeal.dropId,
    decision: status,
    notes,
  });

  return res.json({ success: true, appeal: updatedAppeal });
}
