import { Request, Response } from 'express';
import { metricsCollector } from './metrics';
import { db } from '../db/firestore';

export function healthHandler(req: Request, res: Response) {
  const dropsCount = db.list('drops').length;
  const auditBlocks = db.list('auditLog').length;

  return res.json({
    status: 'HEALTHY',
    service: 'Fair Drop Allocation Server',
    uptimeSec: Math.floor(process.uptime()),
    database: 'Firestore / Local Durable Store Ready',
    activeDropsCount: dropsCount,
    auditLogBlockCount: auditBlocks,
    timestamp: new Date().toISOString(),
  });
}

export function metricsHandler(req: Request, res: Response) {
  const summary = metricsCollector.getSummary();
  return res.json(summary);
}
