import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { sha256Sync, db } from '../db/firestore';

// In-Memory Sliding Window Rate Limiters
export const ipLimiter = new RateLimiterMemory({
  points: 20, // 20 requests
  duration: 1, // per 1 second
});

export const accountLimiter = new RateLimiterMemory({
  points: 60, // 60 requests
  duration: 60, // per 1 minute
});

export const deviceLimiter = new RateLimiterMemory({
  points: 60, // 60 requests
  duration: 60, // per 1 minute
});

// Active IP Blocklist
export const activeBlocklist = new Set<string>([
  '198.51.100.42',
  '203.0.113.88',
]);

// Verify Proof-of-Work hash
export function verifyPoW(challenge: string, nonce: number, difficulty: number): boolean {
  const prefix = '0'.repeat(difficulty);
  const testString = `${challenge}:${nonce}`;
  const hash = sha256Sync(testString);
  return hash.startsWith(prefix);
}

// Compute client risk score (0-100)
export function computeRiskScore(req: Request, powPassed: boolean): { score: number; signals: string[] } {
  let score = 5;
  const signals: string[] = [];

  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent || userAgent.includes('python') || userAgent.includes('curl') || userAgent.includes('node-fetch')) {
    score += 55;
    signals.push('SUSPICIOUS_USER_AGENT');
  }

  const clientJitter = Number(req.headers['x-client-jitter'] || 0);
  if (clientJitter < 5) {
    score += 25;
    signals.push('ZERO_TIMING_JITTER_MACHINE_SPEED');
  }

  if (!powPassed) {
    score += 40;
    signals.push('POW_CHALLENGE_FAILED');
  }

  // Cap score between 0 and 100
  return { score: Math.min(100, score), signals };
}
