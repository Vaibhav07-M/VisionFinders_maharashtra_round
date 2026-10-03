# Fair Drop Adversarial Simulation Lab

## 1. Overview & Mentor Question
> **Mentor Question:** *"How can you simulate this and show it?"*

The Fair Drop Adversarial Simulation Lab is built on **real, measured HTTP traffic**, completely eliminating simulated mathematical formulas, extrapolations, or synthetic `Math.random` coin flips for results. 

Every single request is dispatched over real HTTP keep-alive connections against a real selected event (or its isolated sandbox clone). Every result is measured directly from actual server responses and recorded by server-side defence middleware.

### Core Tenets
1. **Measured, Not Simulated Math:** 
   The legacy `server/modules/simulation.ts` (which computed outcomes from static formulas) has been deleted. Every metric in the lab reflects real network requests and real server defence decisions.
2. **Zero Bot Label Leakage:**
   The server never receives a bot flag. Requests from bots and human control clients carry identical generic headers (`X-Request-Id`, generic device tokens). The server decides purely on cryptographic Proof-of-Work, IP/device velocity, session validity, and honeypot traps.
3. **Ground Truth vs Outcome Separation:**
   The runner maintains ground truth (which client belongs to which attack group) in `simulationRuns/{runId}`. Defence logic cannot read this ledger. The post-run report joins the server outcome log with the runner's ground truth, matched strictly on `X-Request-Id`.
4. **Three-Way Reconciliation:**
   The UI proves traffic integrity with real-time reconciliation:
   $$\text{Simulator Sent} = \text{Server Received} = \sum \text{Defence Outcomes}$$
   The banner displays green when $X = Y = Z$, and turns red with an explicit unaccounted request counter if any mismatch occurs.

---

## 2. User Workflow & The 4 Lab Pages

### LAB 1: Attack Designer (`/lab`)
- **Event Selection:** Fetches real events from `GET /api/drops`. Displays status, mode (`FAIR_DROP` vs `FCFS`), window countdown, capacity, and tiers.
- **Target Mode:**
  - *Sandbox Clone (Recommended):* Clones the event config, seats, and defence rules into a temporary event (`simulation=true`), completely isolated from public attendees.
  - *Production Live Event:* Attacks the live event directly, competing against real entries. Requires typed event name confirmation (case-insensitive & whitespace-trimmed).
- **8 Modular Attack Types:**
  1. **Naive Flooder:** High-rate single-IP flood, trips honeypot and IP rate limiters, ignores 429 retries.
  2. **Fast Single-Shot:** Dispatches at window opening, testing sub-second concurrency.
  3. **Retry Spammer:** Aggressive immediate retries ignoring `Retry-After`.
  4. **Distributed Botnet:** Rotates across an IP pool via `X-Forwarded-For`.
  5. **Sybil Cluster:** Coordinates multi-account operations using verified synthetic identities.
  6. **Smart Bot:** Solves Proof-of-Work challenges, applies jitter, respects backoff headers.
  7. **Socket Spammer:** High-velocity websocket connection churn.
  8. **Unauthenticated Spam:** High-volume unauthenticated joins testing gateway shed efficiency.
- **Human Control Group:** Configurable arrival curves (surge-and-tail, steady, burst waves) and connection speed splits.
- **Defence Snapshot:** Real-time view of active security rules with direct links to `/admin/security`.
- **Identity Provisioning:** `POST /api/lab/provision-accounts` creates synthetic verified accounts (`synth_user_*`) for realistic lottery entry without bypassing OTP requirements.

### LAB 2: Live Attack Console (`/lab/runs/:runId/live`)
- Real-time Socket.io stream (`lab:{runId}`).
- **Per-Group Cards:** Sent, accepted, challenged, rate-limited, blocked, duplicate, and "got through %".
- **Human Impact Card:** Quantifies collateral damage on legitimate users (false positive rate, p50/p95 latency, errors).
- **Per-Second Timeline:** Stacked area chart showing throughput by outcome over time.
- **Defence Layer Breakdown:** Interceptions by layer (IP limit, device limit, honeypot, PoW, risk score).
- **Scrolling Tail Log:** Live request inspector showing timestamp, group, outcome, reason code, and roundtrip latency.
- **Reconciliation Strip:** Real-time green/red validator comparing runner dispatch counts with server receipts.
- **Real Chaos Button:** "Disconnect All Sockets" triggers `io.disconnectSockets(true)` to measure client reconnection latency.

### LAB 3: Fairness & Forensics Report (`/lab/runs/:runId/report`)
Comprehensive post-run forensic breakdown compiled from joined data:
1. **Run Summary:** Event metadata, mode, config, seed, duration, achieved RPS, and defence snapshot.
2. **Pipeline Funnel:** Split view (Humans vs Bots) through the 10 lifecycle stages:
   $$\text{Attempted} \to \text{Authenticated} \to \text{Passed} \to \text{Challenged} \to \text{Rate-Limited} \to \text{Blocked} \to \text{Entered} \to \text{Eligible} \to \text{Selected} \to \text{Allocated}$$
3. **Attack Group Breakdown Table:** Per-type success metrics.
4. **Defence Layer Effectiveness:** Interceptions split by bot vs human (identifies false positives).
5. **Detection Quality:** Bot Detection Rate, Human False Positive Rate, and Intercept Precision.
6. **Fairness Metrics:** Bot Advantage Ratio ($\text{Bot Win Rate} / \text{Human Win Rate}$), Jain's Fairness Index, Gini coefficient, and fast vs slow connection win rates.
7. **System Performance:** P50/P95/P99 latency comparison before and during attack.
8. **Invariant Verification:** Runs `runSystemInvariantCheck` to verify 0 oversold seats and 0 duplicate receipts.
9. **Draw Integration:** Displays "Waiting for Draw" until the commit-reveal random draw executes, then updates live.
10. **Sybil Limitation Note:** Automatically appended whenever a Sybil group participates.
11. **Export & Clean Purge:** JSON export, CSV export, print-to-PDF formatting, and clean deletion of sandbox clones and synthetic entries.

### LAB 4: Experiment Matrix & Comparisons (`/lab/compare`)
- Historical run catalog with filters.
- Side-by-side run differential comparison.
- **FCFS vs Fair Drop Benchmark:** Runs identical seeded traffic schedules across sandbox clones to demonstrate that Fair Drop keeps the Bot Advantage Ratio near $\approx 1.0\times$ while FCFS rewards automated spam ($>7.0\times$).

---

## 3. Threat Telemetry & Admin Integration

### Shared Threat Monitor Widget (`src/components/security/ThreatMonitor.tsx`)
Mounted on the main Admin Dashboard (`src/pages/admin/AdminDashboardPage.tsx`), this live radar operates 24/7—both during simulated lab attacks and during real production drops:
- Velocity gauge (current req/sec).
- Last-minute & total counters for Accepted, Blocked, Rate-Limited (429), and Challenged requests.
- Defence reason code pill distribution.
- Top offending IP hash clusters.
- Live "Simulated Attack In Progress" badge when a lab runner is active.

### Stable Machine-Readable Reason Codes
Captured by `server/modules/defenceEvents.ts` and returned across all 4xx/5xx responses:
| Code | Category | Trigger Condition |
| :--- | :--- | :--- |
| `RL_IP` | Rate Limiter | IP request rate exceeded sliding window limit |
| `RL_ACCOUNT` | Rate Limiter | Account request rate exceeded limit |
| `RL_DEVICE` | Rate Limiter | Device fingerprint request rate exceeded limit |
| `BLOCKLIST` | Access Control | IP or client fingerprint on active security blocklist |
| `POW_MISSING` | Cryptographic PoW | Proof-of-Work nonce missing from join payload |
| `POW_INVALID` | Cryptographic PoW | Nonce does not produce required SHA-256 zero prefix |
| `HONEYPOT` | Bot Trap | Hidden `website_trap` input field populated |
| `TIMING` | Anomaly Detection | Sub-millisecond humanly impossible form submission |
| `RISK_BLOCK` | Risk Engine | Composite behavioral risk score $\ge 80$ |
| `RISK_CHALLENGE` | Risk Engine | Composite risk score between 50 and 79 |
| `TURNSTILE_FAILED` | Challenge | Cloudflare Turnstile token validation failed |
| `NO_SESSION` | Authentication | Missing or expired bearer session token |
| `NOT_VERIFIED` | Identity | Attendee phone number or identity not OTP-verified |
| `WINDOW_CLOSED` | Lifecycle | Drop window is scheduled, paused, or closed |
| `VALIDATION` | Schema | Payload failed Zod schema or missing required fields |

---

## 4. CLI Simulator Engine (`simulator/index.ts`)
The simulator shares the exact same execution engine as the website. It can be executed from the terminal:

```bash
# Execute benchmark scenario via CLI
npm run simulator -- --scenario tests/lab/sample_scenario.json --target http://localhost:4000
```

CLI options:
- `--scenario <file.json>`: Path to JSON configuration file.
- `--target <url>`: Target server URL (must be in allowlist).
- `--duration <sec>`: Override run duration.
- `--seed <string>`: Deterministic pseudorandom seed.

---

## 5. Security & Safety Controls
- **Kill-Switch Environment Flag:** All simulation endpoints require `SIMULATION_ENABLED=true` in server environment; returns 403 Forbidden otherwise.
- **Target Host Allowlist:** Restricts target URLs strictly to `localhost`, `127.0.0.1`, `PORT=4000`, `PORT=4002`, and configured staging domains. Refuses external targets.
- **Role Verification:** Restricted to `organizer`, `security`, or `evaluator` roles.
- **Typed Event Confirmation:** Prevents accidental live production event bombardment; compares trimmed and case-insensitive strings.
- **Immediate Abort:** AbortController terminates runner loops within 2 seconds.
- **Cloud Firestore Protection:** Warns if $>2,000$ requests are planned while connected to cloud Firestore to protect free tier quotas.
