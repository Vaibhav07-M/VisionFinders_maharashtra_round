import { db, sha256Sync } from '../db/firestore';
import { AuditRecord } from '../../shared/types';

export function appendAuditRecord(action: string, actorUid: string, details: Record<string, any>): AuditRecord {
  const records = db.list('auditLog');
  const lastRecord = records.length > 0 ? records[records.length - 1].data as AuditRecord : null;
  
  const prevHash = lastRecord ? lastRecord.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const index = records.length + 1;
  const id = `audit-${index.toString().padStart(4, '0')}`;

  const payload = `${prevHash}|${action}|${timestamp}|${actorUid}|${JSON.stringify(details)}`;
  const hash = sha256Sync(payload);

  const newRecord: AuditRecord = {
    id,
    index,
    timestamp,
    action,
    actorUid,
    details,
    prevHash,
    hash,
  };

  db.set('auditLog', id, newRecord);
  return newRecord;
}

export function verifyAuditHashChain(): { isValid: boolean; brokenIndex?: number; count: number } {
  const records = db.list('auditLog').map(r => r.data as AuditRecord);
  if (records.length === 0) return { isValid: true, count: 0 };

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const curr = records[i];

    if (curr.prevHash !== prev.hash) {
      return { isValid: false, brokenIndex: curr.index, count: records.length };
    }

    const payload = `${curr.prevHash}|${curr.action}|${curr.timestamp}|${curr.actorUid}|${JSON.stringify(curr.details)}`;
    const recalculated = sha256Sync(payload);
    if (recalculated !== curr.hash) {
      return { isValid: false, brokenIndex: curr.index, count: records.length };
    }
  }

  return { isValid: true, count: records.length };
}
