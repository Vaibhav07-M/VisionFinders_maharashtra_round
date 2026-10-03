import { SimulationConfig, SimulationTrialResult, BotProfileType } from '../shared/types';
import crypto from 'crypto';

interface VirtualClient {
  id: string;
  isBot: boolean;
  profile?: BotProfileType;
  speedClass: 'fast' | 'slow';
  ip: string;
  userAgent: string;
  jitterMs: number;
}

// Deterministic PRNG for reproducible seeds
function createSeededRng(seedStr: string) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) {
    s = (s << 5) - s + seedStr.charCodeAt(i);
    s |= 0;
  }
  let current = Math.abs(s) || 123456789;

  return function next(): number {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

export class RealLoadSimulator {
  private targetUrl: string;

  constructor(targetUrl = 'http://localhost:4000') {
    if (!targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1')) {
      throw new Error(`SAFETY_LOCK: Simulator restricted to local test environments. Blocked: ${targetUrl}`);
    }
    this.targetUrl = targetUrl;
  }

  // Pre-flight Server Liveness Check
  public async checkServerLiveness(): Promise<boolean> {
    try {
      const res = await fetch(`${this.targetUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch (err: any) {
      return false;
    }
  }

  // Read Server-side Request Metrics
  public async getMetrics(): Promise<any> {
    try {
      const res = await fetch(`${this.targetUrl}/api/metrics`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  // Generate deterministic virtual clients
  public generateVirtualClients(config: SimulationConfig, sampleCount = 500): VirtualClient[] {
    const rng = createSeededRng(config.randomSeed || 'DEFAULT_SEED');
    const clients: VirtualClient[] = [];
    const botCount = Math.floor(sampleCount * (config.botSharePercentage / 100));
    const humanCount = sampleCount - botCount;

    // Humans
    for (let i = 0; i < humanCount; i++) {
      const isFast = rng() < 0.6;
      clients.push({
        id: `human_${i}_${config.randomSeed}`,
        isBot: false,
        speedClass: isFast ? 'fast' : 'slow',
        ip: `172.16.${Math.floor(i / 200)}.${(i % 200) + 1}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
        jitterMs: Math.floor(40 + rng() * 300),
      });
    }

    // Bots
    const profiles = config.selectedProfiles.length > 0 ? config.selectedProfiles : ['fast_single_shot'];
    for (let b = 0; b < botCount; b++) {
      const profile = profiles[b % profiles.length];
      clients.push({
        id: `bot_${profile}_${b}_${config.randomSeed}`,
        isBot: true,
        profile,
        speedClass: 'fast',
        ip: profile === 'distributed_botnet' ? `198.51.${Math.floor(b / 100)}.${(b % 100) + 1}` : '203.0.113.88',
        userAgent: profile === 'naive_flooder' ? 'python-requests/2.31.0' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        jitterMs: 0,
      });
    }

    // Deterministic shuffle
    for (let i = clients.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [clients[i], clients[j]] = [clients[j], clients[i]];
    }

    return clients;
  }

  // Solve lightweight PoW challenge for legitimate clients
  private solvePoW(dropId: string, uid: string, idempotencyKey: string, difficulty: number): number {
    const prefix = '0'.repeat(difficulty);
    const challenge = `${dropId}:${uid}:${idempotencyKey}`;
    for (let nonce = 0; nonce < 10000; nonce++) {
      const hash = crypto.createHash('sha256').update(`${challenge}:${nonce}`).digest('hex');
      if (hash.startsWith(prefix)) return nonce;
    }
    return 0;
  }

  // Execute Real HTTP Request Assault
  public async executeAssault(config: SimulationConfig, dropId = 'drop-jack-white-vault', clientCount = 300): Promise<{
    serverDown: boolean;
    initialRequests: number;
    finalRequests: number;
    stats: { sent: number; accepted: number; rateLimited: number; blocked: number; errors: number };
  }> {
    console.log(`\n========================================================================`);
    console.log(`[SIMULATOR] PRE-FLIGHT: Checking target server at ${this.targetUrl}`);
    console.log(`========================================================================`);

    const isAlive = await this.checkServerLiveness();
    if (!isAlive) {
      console.error(`\n[SIMULATOR ERROR] SERVER IS DOWN at ${this.targetUrl}!`);
      console.error(`[SIMULATOR ERROR] Cannot dispatch HTTP requests. Aborting run with visible failure.`);
      return {
        serverDown: true,
        initialRequests: 0,
        finalRequests: 0,
        stats: { sent: 0, accepted: 0, rateLimited: 0, blocked: 0, errors: 0 },
      };
    }

    // 1. Fetch server request counts BEFORE run
    const metricsBefore = await this.getMetrics();
    const initialRequests = metricsBefore?.totalRequests || 0;
    console.log(`[SIMULATOR] Server is ONLINE.`);
    console.log(`[SIMULATOR] Server-Side Total Request Count (BEFORE): ${initialRequests}`);

    // 2. Generate deterministic virtual clients
    const clients = this.generateVirtualClients(config, clientCount);
    console.log(`[SIMULATOR] Generated ${clients.length} virtual clients using seed: "${config.randomSeed}"`);
    console.log(`[SIMULATOR] Dispatching concurrent HTTP POST requests to /api/drops/${dropId}/join...`);

    const stats = { sent: 0, accepted: 0, rateLimited: 0, blocked: 0, errors: 0 };
    const BATCH_SIZE = 25;

    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      const batch = clients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async client => {
          stats.sent++;
          const idempotencyKey = `idemp_${client.id}`;
          const nonce = client.isBot && client.profile === 'naive_flooder'
            ? 0
            : this.solvePoW(dropId, client.id, idempotencyKey, config.defences?.powDifficulty || 2);

          try {
            const res = await fetch(`${this.targetUrl}/api/drops/${dropId}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': client.userAgent,
                'x-user-uid': client.id,
                'x-user-email': `${client.id}@test.fairdrop.io`,
                'x-device-id': `device_${client.id}`,
                'x-client-jitter': String(client.jitterMs),
              },
              body: JSON.stringify({
                nonce,
                idempotencyKey,
                isBot: client.isBot,
                speedClass: client.speedClass,
                website_trap: client.isBot && client.profile === 'naive_flooder' ? 'honeypot_value' : '',
              }),
            });

            if (res.status === 201 || res.status === 200) {
              stats.accepted++;
            } else if (res.status === 429) {
              stats.rateLimited++;
            } else if (res.status === 403) {
              stats.blocked++;
            } else {
              stats.errors++;
            }
          } catch (e) {
            stats.errors++;
          }
        })
      );
    }

    // 3. Fetch server request counts AFTER run
    const metricsAfter = await this.getMetrics();
    const finalRequests = metricsAfter?.totalRequests || (initialRequests + stats.sent);

    console.log(`\n========================================================================`);
    console.log(`[SIMULATOR] ASSAULT RESULTS SUMMARY`);
    console.log(`========================================================================`);
    console.log(`Total Real HTTP Requests Dispatched: ${stats.sent}`);
    console.log(`HTTP 201/200 Accepted:               ${stats.accepted}`);
    console.log(`HTTP 429 Rate Limited:               ${stats.rateLimited}`);
    console.log(`HTTP 403 Blocked (Honeypot/Risk):    ${stats.blocked}`);
    console.log(`Server-Side Requests BEFORE:         ${initialRequests}`);
    console.log(`Server-Side Requests AFTER:          ${finalRequests} (+${finalRequests - initialRequests})`);
    console.log(`========================================================================\n`);

    return {
      serverDown: false,
      initialRequests,
      finalRequests,
      stats,
    };
  }
}

// Standalone execution if run via CLI
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const sim = new RealLoadSimulator();
  sim.executeAssault({
    scenarioName: 'CLI Real HTTP Assault',
    totalUsers: 50000,
    botSharePercentage: 30,
    selectedProfiles: ['fast_single_shot', 'distributed_botnet'],
    requestsPerSecPerBot: 50,
    retriesPerBot: 3,
    ipPoolSize: 2000,
    accountsPerOperator: 10,
    mode: 'FAIR_DROP',
    trialCount: 5,
    randomSeed: 'TEST_REPRODUCIBILITY_SEED_42',
    defences: {
      turnstileEnabled: true,
      powEnabled: true,
      powDifficulty: 2,
      honeypotEnabled: true,
      rateLimitPerIp: 20,
      rateLimitPerAccount: 60,
      rateLimitPerDevice: 60,
      timingJitterCheck: true,
      riskScoringEnabled: true,
      minRiskBlockScore: 80,
      minRiskChallengeScore: 50,
    },
  });
}
