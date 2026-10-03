// Fair Drop Shared Types & Interfaces

export type UserRole = 'attendee' | 'organizer' | 'security' | 'readonly' | 'evaluator';

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
  | 'entered'
  | 'offered'
  | 'waitlisted'
  | 'paid'
  | 'released'
  | 'expired'
  | 'left';

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

export type OfferStatus = 
  | 'offered' 
  | 'paid' 
  | 'released' 
  | 'expired';

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

export interface TicketTier {
  id: string; // 'vip' | 'platinum' | 'gold' | 'silver' | 'bronze'
  name: string; // 'VIP' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
  price: number; // e.g. 5000, 3500, 2500, 1500, 800
  seatCount: number; // e.g. 20, 60, 100, 150, 170
  seatLabels?: string[];
  description?: string;
  prefix?: string;
}

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
  tiers?: TicketTier[];
  round?: number;
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
  preferences?: string[]; // ordered array of tier IDs e.g. ['vip', 'platinum']
  drawRank?: number;
  currentOfferId?: string | null;
  isBot?: boolean; // simulation only
  botProfile?: BotProfileType; // simulation only
  speedClass?: BotSpeedClass; // simulation only
  ip?: string;
  ipHash?: string;
  deviceId?: string;
  userAgent?: string;
  rejectionReason?: string;
  actionReason?: string;
  receipt?: string;
}

export interface Seat {
  id: string;
  dropId: string;
  tierId: string; // 'vip' | 'platinum' | 'gold' | 'silver' | 'bronze'
  section: string;
  row: string;
  number: number;
  label: string;
  price: number;
  accessible: boolean;
  status: SeatStatus;
  holderUid?: string;
  currentOfferId?: string | null;
  holdExpiresAt?: string | null; // ISO string
}

export interface Offer {
  id: string;
  dropId: string;
  entryId: string;
  uid: string;
  seatId: string;
  tierId: string;
  tierName: string;
  seatLabel: string;
  price: number;
  status: OfferStatus;
  createdAt: number; // server timestamp ms
  expiresAt: number; // server timestamp ms
}

export interface LiveTierStat {
  tierId: string;
  name: string;
  price: number;
  totalSeats: number;
  available: number;
  held: number;
  sold: number;
}

export interface LiveBoardData {
  dropId: string;
  round: number;
  tiers: LiveTierStat[];
  totalAvailable: number;
  totalHeld: number;
  totalSold: number;
  peopleWaiting: number;
  soonestExpiryMs: number | null; // timestamp ms of soonest expiring offer
  seats: Array<{
    id: string;
    tierId: string;
    label: string;
    status: SeatStatus;
    price: number;
  }>;
}

export interface UserDropState {
  dropId: string;
  entry: DropEntry | null;
  offer: Offer | null;
  waitlistPosition: number | null;
  totalWaitlisted: number;
  ticket: Ticket | null;
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
  tierName?: string;
  pricePaid?: number;
  attendeeName?: string;
  qrCodeHmac?: string;
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

// ==========================================
// REAL ADVERSARIAL LAB TYPES
// ==========================================

export type DefenceOutcome =
  | 'ACCEPTED'
  | 'DUPLICATE_RECEIPT'
  | 'CHALLENGED'
  | 'RATE_LIMITED'
  | 'BLOCKED'
  | 'UNAUTHENTICATED'
  | 'INVALID'
  | 'SERVER_ERROR';

export type DefenceReasonCode =
  | 'RL_IP'
  | 'RL_ACCOUNT'
  | 'RL_DEVICE'
  | 'BLOCKLIST'
  | 'POW_MISSING'
  | 'POW_INVALID'
  | 'HONEYPOT'
  | 'TIMING'
  | 'RISK_BLOCK'
  | 'RISK_CHALLENGE'
  | 'TURNSTILE_FAILED'
  | 'NO_SESSION'
  | 'NOT_VERIFIED'
  | 'WINDOW_CLOSED'
  | 'VALIDATION';

export interface DefenceEvent {
  ts: number;
  requestId: string;
  dropId: string;
  ipHash: string;
  uid?: string;
  outcome: DefenceOutcome;
  reasonCode?: DefenceReasonCode;
  latencyMs: number;
  statusCode: number;
}

export type LabAttackType =
  | 'naive_flooder'
  | 'fast_single_shot'
  | 'retry_spammer'
  | 'distributed_botnet'
  | 'sybil'
  | 'smart_bot'
  | 'socket_spammer'
  | 'unauthenticated_spam';

export interface LabAttackGroup {
  id: string;
  attackType: LabAttackType;
  clientCount: number;
  requestsPerClient: number;
  targetRps?: number;
  startOffsetSec: number;
  durationSec: number;
  options?: {
    ipPoolSize?: number;
    accountsPerOperator?: number;
    powSolveSpeedMs?: number;
    jitterRangeMs?: [number, number];
  };
}

export interface LabHumanTrafficConfig {
  enabled?: boolean;
  clientCount: number;
  pattern: 'surge_tail' | 'steady' | 'waves';
  fastConnectionRatio: number; // 0 to 1 e.g. 0.3
  retryOnFailure: boolean;
}

export interface LabScenarioConfig {
  name: string;
  targetDropId: string;
  targetEventName?: string;
  targetMode: 'live' | 'sandbox';
  trafficPattern: 'steady' | 'flash_crowd' | 'ramp_up' | 'burst_waves';
  seed: string;
  attackGroups: LabAttackGroup[];
  humanTraffic: LabHumanTrafficConfig;
  durationSec: number;
  defenceSnapshot?: Record<string, any>;
  confirmationEventName?: string;
}

export interface LabGroundTruthRecord {
  runId: string;
  requestId: string;
  clientId: string;
  isBot: boolean;
  group: string;
  profile: LabAttackType | 'human';
  speedClass: 'superfast' | 'fast' | 'normal' | 'slow';
  scheduledAtMs: number;
}

export interface LabGroupOutcomeStats {
  sent: number;
  accepted: number;
  challenged: number;
  rateLimited: number;
  blocked: number;
  duplicate: number;
  unauthenticated: number;
  errors: number;
  gotThroughPct: number;
  selected?: number;
  allocated?: number;
}

export interface LabHumanOutcomeStats {
  sent: number;
  accepted: number;
  challenged: number;
  blocked: number; // false positives
  rateLimited: number;
  duplicate: number;
  unauthenticated: number;
  errors: number;
  gotThroughPct: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  selected?: number;
  allocated?: number;
}

export interface LabRunProgress {
  runId: string;
  scenarioName: string;
  targetDropId: string;
  targetEventName: string;
  targetMode: 'live' | 'sandbox';
  state: 'running' | 'stopping' | 'done' | 'interrupted' | 'failed';
  elapsedSec: number;
  durationSec: number;
  totalPlannedRequests: number;
  totalSentRequests: number;
  serverReceivedRequests: number;
  achievedRps: number;
  groupStats: Record<string, LabGroupOutcomeStats>;
  humanStats: LabHumanOutcomeStats;
  defenceLayerStats: Record<string, number>;
  timeline: Array<{
    second: number;
    sent: number;
    accepted: number;
    rateLimited: number;
    blocked: number;
    challenged: number;
    other: number;
  }>;
  recentRequests: Array<{
    ts: number;
    requestId: string;
    group: string;
    outcome: DefenceOutcome;
    reasonCode?: DefenceReasonCode;
    latencyMs: number;
  }>;
  reconciliation: {
    simulatorSent: number;
    serverReceived: number;
    outcomesAccounted: number;
    gap: number;
    isReconciled: boolean;
  };
  recoveryTimeSec?: number;
}

export interface LabMeasuredReport {
  runId: string;
  timestamp: string;
  scenarioName: string;
  targetDropId: string;
  targetEventName: string;
  targetMode: 'live' | 'sandbox';
  mode: DropMode;
  seed: string;
  durationSec: number;
  totalSent: number;
  totalReceived: number;
  achievedRps: number;
  defenceSnapshot: Record<string, any>;
  funnel: {
    attempted: { human: number; bot: number; total: number };
    authenticated: { human: number; bot: number; total: number };
    passedChecks: { human: number; bot: number; total: number };
    challenged: { human: number; bot: number; total: number };
    rateLimited: { human: number; bot: number; total: number };
    blocked: { human: number; bot: number; total: number };
    entered: { human: number; bot: number; total: number };
    eligible: { human: number; bot: number; total: number };
    selected: { human: number; bot: number; total: number };
    allocated: { human: number; bot: number; total: number };
  };
  perAttackType: Record<string, LabGroupOutcomeStats>;
  defenceEffectiveness: Record<string, { botStopped: number; humanStopped: number }>;
  detectionQuality: {
    botDetectionRate: number;
    humanFalsePositiveRate: number;
    precision: number;
  };
  fairness: {
    botShareOfTraffic: number;
    botShareOfEntries: number;
    botShareOfWinners: number;
    botAdvantageRatio: number;
    jainsIndexHumans: number;
    giniCoefficientHumans: number;
    fastConnectionSuccessRate: number;
    slowConnectionSuccessRate: number;
  };
  systemPerformance: {
    throughputRps: number;
    errorRate: number;
    humanLatencyP50Ms: number;
    humanLatencyP95Ms: number;
    humanLatencyP99Ms: number;
    baselineLatencyP50Ms: number;
  };
  reliability: {
    recoveryTimeSec?: number;
    sessionPreservationVerified: boolean;
  };
  invariants: {
    oversold: number;
    duplicates: number;
    orphanedHolds: number;
    inventoryConsistent: boolean;
    valid: boolean;
  };
  reconciliation: {
    simulatorSent: number;
    serverReceived: number;
    outcomesAccounted: number;
    gap: number;
    isReconciled: boolean;
  };
  whatThisShowsSummary: string;
  sybilLimitationNote?: string;
  drawCompleted: boolean;
}

export interface LabThreatSummary {
  dropId: string;
  requestsPerSec: number;
  lastMinute: { accepted: number; blocked: number; rateLimited: number; challenged: number; total: number };
  total: { accepted: number; blocked: number; rateLimited: number; challenged: number; total: number };
  blockedByReason: Record<string, number>;
  topOffendingIps: Array<{ ipPrefix: string; count: number; lastReason: string }>;
  activeLabRun: { runId: string; scenarioName: string; targetDropId: string } | null;
}

export interface SimulationConfig {
  scenarioName: string;
  targetDropId?: string; // Target event/drop ID
  targetEventName?: string; // Target event name
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

// Admin Specific Types
export interface AdminMetricPoint {
  timestamp: number;
  timeLabel: string;
  totalRequests: number;
  rateLimited429: number;
  latencies: number[];
  p95Latency: number;
}

export interface AdminKPIs {
  totalEntries: number;
  uniqueIdentities: number;
  eligible: number;
  flagged: number;
  blocked: number;
  rateLimitedLast60s: number;
  seatsSold: number;
  seatsHeld: number;
  seatsAvailable: number;
  pendingAppeals: number;
}

export interface AdminAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export interface AdminDashboardData {
  drop: Drop | null;
  drops: { id: string; name: string; status: string; mode: string; windowEnd: string }[];
  kpis: AdminKPIs;
  telemetry: {
    currentRps: number;
    current429Rate: number;
    p95Latency: number;
    totalRequestsLast60s: number;
    total429Last60s: number;
  };
  health: {
    uptimeSeconds: number;
    databaseStatus: string;
    socketStatus: string;
    totalDrops: number;
    activeDropId: string | null;
  };
  alerts: AdminAlert[];
  recentActivity: any[];
}

