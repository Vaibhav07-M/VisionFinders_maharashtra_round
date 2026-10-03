import { Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { sha256Sync, db } from '../db/firestore';
import { appendAuditRecord } from './audit';

export interface SecurityConfig {
  turnstileEnabled: boolean;
  powEnabled: boolean;
  powDifficulty: number;
  honeypotEnabled: boolean;
  ipWindowSec: number;
  ipMaxRequests: number;
  accountWindowSec: number;
  accountMaxRequests: number;
  deviceWindowSec: number;
  deviceMaxRequests: number;
  minRiskBlockScore: number;
  minRiskChallengeScore: number;
  blocklist: string[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  turnstileEnabled: true,
  powEnabled: true,
  powDifficulty: 2,
  honeypotEnabled: true,
  ipWindowSec: 1,
  ipMaxRequests: 20,
  accountWindowSec: 60,
  accountMaxRequests: 60,
  deviceWindowSec: 60,
  deviceMaxRequests: 60,
  minRiskBlockScore: 80,
  minRiskChallengeScore: 50,
  blocklist: ['198.51.100.42', '203.0.113.88'],
};

// Rate limiters
export let ipLimiter = new RateLimiterMemory({
  points: DEFAULT_SECURITY_CONFIG.ipMaxRequests,
  duration: DEFAULT_SECURITY_CONFIG.ipWindowSec,
});

export let accountLimiter = new RateLimiterMemory({
  points: DEFAULT_SECURITY_CONFIG.accountMaxRequests,
  duration: DEFAULT_SECURITY_CONFIG.accountWindowSec,
});

export let deviceLimiter = new RateLimiterMemory({
  points: DEFAULT_SECURITY_CONFIG.deviceMaxRequests,
  duration: DEFAULT_SECURITY_CONFIG.deviceWindowSec,
});

export const activeBlocklist = new Set<string>(DEFAULT_SECURITY_CONFIG.blocklist);

// Load persisted config from Firestore on startup
export function initSecurityConfig() {
  const doc = db.get('securityConfig', 'global');
  if (!doc) {
    db.set('securityConfig', 'global', DEFAULT_SECURITY_CONFIG);
  } else {
    applySecurityConfig(doc.data as SecurityConfig);
  }
}

// Apply config updates dynamically to active rate limiters and blocklist
export function applySecurityConfig(config: Partial<SecurityConfig>) {
  const current = getSecurityConfig();
  const merged: SecurityConfig = { ...current, ...config };

  // Re-instantiate limiters with new values
  ipLimiter = new RateLimiterMemory({
    points: merged.ipMaxRequests || 20,
    duration: merged.ipWindowSec || 1,
  });

  accountLimiter = new RateLimiterMemory({
    points: merged.accountMaxRequests || 60,
    duration: merged.accountWindowSec || 60,
  });

  deviceLimiter = new RateLimiterMemory({
    points: merged.deviceMaxRequests || 60,
    duration: merged.deviceWindowSec || 60,
  });

  // Update blocklist
  activeBlocklist.clear();
  if (merged.blocklist && Array.isArray(merged.blocklist)) {
    merged.blocklist.forEach(ip => activeBlocklist.add(ip));
  }

  db.set('securityConfig', 'global', merged);
  return merged;
}

export function getSecurityConfig(): SecurityConfig {
  const doc = db.get('securityConfig', 'global');
  return (doc?.data as SecurityConfig) || DEFAULT_SECURITY_CONFIG;
}

// Handlers for API
export function getSecurityRulesHandler(req: Request, res: Response) {
  const config = getSecurityConfig();
  return res.json({ config });
}

export function updateSecurityRulesHandler(req: Request, res: Response) {
  const updates: Partial<SecurityConfig> = req.body;
  const updated = applySecurityConfig(updates);
  
  appendAuditRecord('SECURITY_CONFIG_UPDATED', (req as any).user?.uid || 'security', {
    updatedFields: Object.keys(updates),
    config: updated,
  });

  return res.json({ success: true, config: updated, message: 'Live rate limiters and security rules updated successfully.' });
}

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

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  if (!userAgent || userAgent.includes('python') || userAgent.includes('curl') || userAgent.includes('node-fetch') || userAgent.includes('scrapy')) {
    score += 55;
    signals.push('SUSPICIOUS_USER_AGENT');
  }

  const clientJitter = Number(req.headers['x-client-jitter'] || 0);
  if (clientJitter < 5 && userAgent.includes('bot')) {
    score += 25;
    signals.push('ZERO_TIMING_JITTER_MACHINE_SPEED');
  }

  if (!powPassed) {
    score += 40;
    signals.push('POW_CHALLENGE_FAILED');
  }

  return { score: Math.min(100, score), signals };
}
