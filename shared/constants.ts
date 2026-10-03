// Fair Drop Shared Constants

import { BotProfileType, DefenceConfig, Drop } from './types';

export const DEFAULT_DEFENCE_CONFIG: DefenceConfig = {
  turnstileEnabled: true,
  powEnabled: true,
  powDifficulty: 4, // 4 hex zeros
  honeypotEnabled: true,
  rateLimitPerIp: 15,
  rateLimitPerAccount: 30,
  rateLimitPerDevice: 30,
  timingJitterCheck: true,
  riskScoringEnabled: true,
  minRiskBlockScore: 80,
  minRiskChallengeScore: 50,
};

export const BOT_PROFILES_INFO: Record<BotProfileType, {
  name: string;
  tagline: string;
  description: string;
  behavior: string;
  color: string;
  dangerLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}> = {
  naive_flooder: {
    name: 'Naive Flooder',
    tagline: 'High-frequency brute force bursts',
    description: 'Fires thousands of concurrent requests/sec from a single IP address without solving challenges.',
    behavior: 'Bursts 50-200 rps per instance, static User-Agent, ignores 429 headers.',
    color: '#f43f5e',
    dangerLevel: 'Medium',
  },
  fast_single_shot: {
    name: 'Fast Single-Shot Sniper',
    tagline: 'Precision 0-millisecond window trigger',
    description: 'Submits exactly at the millisecond the entry window opens using atomic NTP synchronized timers.',
    behavior: '1 request sent at T=0.001s. Devastates standard FCFS drops, neutralized by uniform Fair Drop draw.',
    color: '#eab308',
    dangerLevel: 'Critical',
  },
  retry_spammer: {
    name: 'Retry Spammer',
    tagline: 'Aggressive retry loops on transient failure',
    description: 'Submits identical payloads in tight loops on any network hiccup or rate limit threshold.',
    behavior: 'Retries up to 50 times in 3 seconds without exponential backoff.',
    color: '#f97316',
    dangerLevel: 'High',
  },
  distributed_botnet: {
    name: 'Distributed Botnet',
    tagline: 'Rotating residential proxy swarm',
    description: 'Distributes entry requests across hundreds of distinct residential IPs with low per-IP request frequency.',
    behavior: 'Submits 1 request per IP across a pool of 500-2,000 proxies to bypass IP rate limits.',
    color: '#a855f7',
    dangerLevel: 'Critical',
  },
  sybil: {
    name: 'Sybil Farm Operator',
    tagline: 'Multiple identities per human operator',
    description: 'Uses multiple accounts/identities to gain disproportionate random draw lottery tickets.',
    behavior: 'Operates 10-50 verified accounts per human operator. Real-world challenge documented in the Fair Drop report.',
    color: '#06b6d4',
    dangerLevel: 'High',
  },
  smart_bot: {
    name: 'Smart Adaptive Bot',
    tagline: 'Client emulation with PoW solver & jitter',
    description: 'Runs real browser runtime (Playwright/Puppeteer), solves Proof-of-Work, mimics human mouse jitter.',
    behavior: 'Solves SHA-256 client puzzle in worker, adds 150-450ms randomized delay, passes basic bot detection.',
    color: '#3b82f6',
    dangerLevel: 'Critical',
  },
  socket_spammer: {
    name: 'WebSocket Event Flooder',
    tagline: 'Connection draining & live status harassment',
    description: 'Spams WebSocket connect/disconnect and subscribes to rooms to exhaust server file descriptors.',
    behavior: 'Maintains 500 simultaneous socket connections, emits heartbeat events continuously.',
    color: '#ec4899',
    dangerLevel: 'Medium',
  },
};

export const DEFAULT_TIERS: import('./types').TicketTier[] = [
  { id: 'vip', name: 'VIP', price: 5000, seatCount: 20, description: 'Front-row vantage, dedicated lounge, and priority check-in.' },
  { id: 'platinum', name: 'Platinum', price: 3500, seatCount: 60, description: 'Prime center orchestra viewing with premium acoustics.' },
  { id: 'gold', name: 'Gold', price: 2500, seatCount: 100, description: 'Elevated mezzanine seating with unobstructed clear line of sight.' },
  { id: 'silver', name: 'Silver', price: 1500, seatCount: 150, description: 'Great acoustics across middle tiers with direct stage views.' },
  { id: 'bronze', name: 'Bronze', price: 800, seatCount: 170, description: 'Accessible admission seating with full venue immersion.' },
];

export const INITIAL_SAMPLE_DROPS: Drop[] = [
  {
    id: 'drop-jack-white-vault',
    name: 'Jack White: The Twilight Echoes Vault Edition',
    artistOrHost: 'Third Man Records x Fair Drop',
    venue: 'Blue Room Theatre, Nashville TN',
    city: 'Nashville, TN',
    heroImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
    seatCount: 500,
    price: 2500,
    currency: 'Rs',
    perPersonLimit: 1,
    windowStart: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // currently open
    windowEnd: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    drawTime: new Date(Date.now() + 1000 * 60 * 95).toISOString(),
    holdDurationSec: 300,
    mode: 'FAIR_DROP',
    status: 'open',
    tiers: DEFAULT_TIERS,
    round: 1,
    seedCommitHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    revealedSeed: null,
    defenceConfig: DEFAULT_DEFENCE_CONFIG,
    createdBy: 'organizer-tmr-01',
    description: 'Intimate 500-capacity live direct-to-acetate recording session and exclusive triple-cut vinyl pressing. Protected by Fair Drop commit-reveal lottery draw to eliminate bot advantage.',
    totalEntriesCount: 4218,
    stats: {
      eligible: 3950,
      flagged: 182,
      blocked: 86,
      allocated: 0,
      held: 0,
      sold: 0,
    },
  },
  {
    id: 'drop-daft-punk-unreleased',
    name: 'Alive 2027: Synthesized Memories (Pyramid Stage)',
    artistOrHost: 'Modular Synth Guild',
    venue: 'Bercy Omnisports Arena',
    city: 'Paris, France',
    heroImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
    seatCount: 500,
    price: 120,
    currency: 'EUR',
    perPersonLimit: 1,
    windowStart: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // scheduled
    windowEnd: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    drawTime: new Date(Date.now() + 1000 * 60 * 60 * 5 + 1000 * 60 * 2).toISOString(),
    holdDurationSec: 300,
    mode: 'FAIR_DROP',
    status: 'scheduled',
    seedCommitHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    revealedSeed: null,
    defenceConfig: DEFAULT_DEFENCE_CONFIG,
    createdBy: 'organizer-paris-01',
    description: 'One-night only spatial audio reconstruction. 50,000 interested registrants competing for 500 front-row sensory pods.',
    totalEntriesCount: 18450,
    stats: {
      eligible: 18450,
      flagged: 0,
      blocked: 0,
      allocated: 0,
      held: 0,
      sold: 0,
    },
  },
  {
    id: 'drop-fcfs-baseline-control',
    name: 'Experimental Control: FCFS Flash Drop (Baseline)',
    artistOrHost: 'Fair Drop Research Lab',
    venue: 'Virtual Arena Lab Benchmark',
    city: 'Global Simulation',
    heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
    seatCount: 500,
    price: 45,
    currency: 'USD',
    perPersonLimit: 1,
    windowStart: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    windowEnd: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    drawTime: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    holdDurationSec: 300,
    mode: 'FCFS',
    status: 'completed',
    seedCommitHash: 'fcfs_baseline_no_seed_needed',
    revealedSeed: 'fcfs_direct_arrival_order',
    defenceConfig: {
      ...DEFAULT_DEFENCE_CONFIG,
      turnstileEnabled: false,
      powEnabled: false,
    },
    createdBy: 'admin-lab',
    description: 'Experimental control group simulating pure first-come, first-served allocation under flash crowd bot assault. Used for scientific comparison against Fair Drop.',
    totalEntriesCount: 28400,
    stats: {
      eligible: 24800,
      flagged: 1200,
      blocked: 2400,
      allocated: 500,
      held: 0,
      sold: 500,
    },
  },
];
