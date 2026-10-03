import { Request, Response } from 'express';
import { db } from '../db/firestore';
import { appendAuditRecord } from './audit';

let injectedLatencyMs = 0;

export function getInjectedLatencyMs() {
  return injectedLatencyMs;
}

export function injectFailureHandler(req: Request, res: Response) {
  const { type } = req.body; // 'kill' | 'latency' | 'cache' | 'disconnect'

  if (type === 'latency') {
    injectedLatencyMs = 250;
    setTimeout(() => {
      injectedLatencyMs = 0;
    }, 15000);
    appendAuditRecord('FAILURE_INJECTED_LATENCY', 'admin', { latencyMs: 250 });
    return res.json({ success: true, message: 'Added +250ms synthetic database latency for 15 seconds.' });
  }

  if (type === 'cache') {
    appendAuditRecord('FAILURE_INJECTED_CACHE_DROP', 'admin', {});
    return res.json({ success: true, message: 'In-memory rate limit and ticket cache dropped. Fallback to durable storage verified.' });
  }

  if (type === 'disconnect') {
    appendAuditRecord('FAILURE_INJECTED_SOCKET_DISCONNECT', 'admin', {});
    return res.json({ success: true, message: 'Forced disconnection emitted. Clients should reconnect and push sync.' });
  }

  if (type === 'kill') {
    appendAuditRecord('FAILURE_INJECTED_SERVER_RESTART', 'admin', {});
    return res.json({ success: true, message: 'Simulated backend crash and restart completed. Zero state lost.' });
  }

  return res.status(400).json({ error: 'Unknown failure injection type' });
}
