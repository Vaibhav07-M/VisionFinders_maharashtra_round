// Fair Drop Shared Types & Interfaces

export type UserRole = 'attendee' | 'organizer' | 'security' | 'readonly';

export type DropMode = 'FAIR_DROP' | 'FCFS';

export type DropStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'open' 
  | 'closed' 
  | 'drawn' 
  | 'completed' 
  | 'paused';

export type EntryStatus = 
  | 'eligible' 
  | 'flagged' 
  | 'blocked' 
  | 'selected' 
  | 'not_selected' 
  | 'waitlisted';

export type SeatStatus = 
  | 'available' 
  | 'held' 
  | 'sold' 
  | 'blocked';

export type TicketStatus = 
  | 'confirmed' 
  | 'used' 
  | 'expired' 
  | 'cancelled';

export type AppealStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected';

export type BotSpeedClass = 'fast' | 'normal' | 'slow';

export type BotProfileType = 
  | 'naive_flooder'
  | 'fast_single_shot'
  | 'retry_spammer'
  | 'distributed_botnet'
  | 'sybil'
  | 'smart_bot'
  | 'socket_spammer';

export interface DefenceConfig {
  turnstileEnabled: boolean;
  powEnabled: boolean;
  powDifficulty: number; // e.g. 4 leading zeros
  honeypotEnabled: boolean;
  rateLimitPerIp: number; // req/sec
  rateLimitPerAccount: number; // req/min
  rateLimitPerDevice: number; // req/min
  timingJitterCheck: boolean;
  riskScoringEnabled: boolean;
  minRiskBlockScore: number; // 0-100 threshold
  minRiskChallengeScore: number; // 0-100 threshold
}

export interface Drop {
  id: string;
  name: string;
  artistOrHost: string;
  venue: string;
  city: string;
  heroImage: string;
  seatCount: number;
  price: number;
  currency: string;
  perPersonLimit: number;
  windowStart: string; // ISO date
  windowEnd: string; // ISO date
  drawTime: string; // ISO date
  holdDurationSec: number;
  mode: DropMode;
  status: DropStatus;
  seedCommitHash: string; // SHA-256 of revealedSeed
  revealedSeed: string | null;
  defenceConfig: DefenceConfig;
  createdBy: string;
  description: string;
  totalEntriesCount?: number;
  stats?: {
    eligible: number;
    flagged: number;
    blocked: number;
    allocated: number;
    held: number;
    sold: number;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  phoneVerified: boolean;
  role: UserRole;
  createdAt: string;
}

export interface DropEntry {
  receiptId: string;
  dropId: string;
  uid: string;
  identityKey: string;
  idempotencyKey: string;
  arrivedAt: string; // ISO string
  serverTimestamp: number;
  riskScore: number;
  status: EntryStatus;
  drawRank?: number;
  isBot?: boolean; // simulation only
  botProfile?: BotProfileType; // simulation only
  speedClass?: BotSpeedClass; // simulation only
}

export interface Seat {
  id: string;
  dropId: string;
  section: string;
  row: string;
  number: number;
  label: string;
  price: number;
  accessible: boolean;
  status: SeatStatus;
  holderUid?: string;
  holdExpiresAt?: string | null; // ISO string
}

export interface Reservation {
  id: string;
  dropId: string;
  uid: string;
  seatId: string;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  dropId: string;
  dropName: string;
  venue: string;
  uid: string;
  seatLabel: string;
  price: number;
  issuedAt: string;
  status: TicketStatus;
  qrPayload: string;
  signature: string;
  holderName: string;
  holderEmail: string;
}

export interface AuditRecord {
  id: string;
  index: number;
  timestamp: string;
  action: string;
  actorUid: string;
  details: Record<string, any>;
  prevHash: string;
  hash: string;
}

export interface Appeal {
  id: string;
  entryId: string;
  dropId: string;
  dropName: string;
  userEmail: string;
  reason: string;
  status: AppealStatus;
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNotes?: string;
}

export interface SimulationConfig {
  scenarioName: string;
  totalUsers: number;
  botSharePercentage: number; // 0 - 50%
  selectedProfiles: BotProfileType[];
  requestsPerSecPerBot: number;
  retriesPerBot: number;
  ipPoolSize: number;
  accountsPerOperator: number;
  mode: DropMode;
  trialCount: number;
  randomSeed: string;
  defences: DefenceConfig;
}

export interface PipelineFunnelMetrics {
  attempted: { human: number; bot: number; total: number };
  verified: { human: number; bot: number; total: number };
  rateLimited: { human: number; bot: number; total: number };
  challenged: { human: number; bot: number; total: number };
  blocked: { human: number; bot: number; total: number };
  entered: { human: number; bot: number; total: number };
  eligible: { human: number; bot: number; total: number };
  selected: { human: number; bot: number; total: number };
  allocated: { human: number; bot: number; total: number };
}

export interface SimulationTrialResult {
  trialId: string;
  config: SimulationConfig;
  funnel: PipelineFunnelMetrics;
  botAdvantageRatio: number; // (bot win rate) / (human win rate)
  jainsFairnessIndex: number; // 0 to 1
  giniCoefficient: number; // 0 to 1
  fastConnectionSuccessRate: number;
  slowConnectionSuccessRate: number;
  throughputRps: number;
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  recoveryTimeSec?: number;
  invariants: {
    oversold: number;
    duplicates: number;
    inventoryConsistent: boolean;
  };
  durationMs: number;
}

export interface FairnessComparisonReport {
  timestamp: string;
  scenarios: {
    fairDrop: SimulationTrialResult;
    fcfs: SimulationTrialResult;
  };
  summary: {
    speedAdvantageFairDrop: number;
    speedAdvantageFcfs: number;
    botAdvantageFairDrop: number;
    botAdvantageFcfs: number;
    giniFairDrop: number;
    giniFcfs: number;
    verdict: string;
  };
}
