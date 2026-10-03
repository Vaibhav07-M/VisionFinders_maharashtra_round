# FAIR DROP — SYSTEM ARCHITECTURE & ENGINEERING SPECIFICATION

## 1. High-Level Architectural Overview

Fair Drop is designed for high-concurrency ticket and allocation drops (e.g. 500 seats competing against up to 50,000 users) where automated bot clients must not gain an advantage through request volume or millisecond arrival speed.

```
                      ┌───────────────────────────────────────┐
                      │    Cloudflare Turnstile (Mock)        │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │   Layer 1: IP Sliding Window Limiter  │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Layer 2: Client Proof-of-Work (SHA-256│
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Layer 3: Honeypot & Timing Traps      │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Layer 4: Multi-Signal Risk Scoring    │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Layer 5: Idempotency & Unique Identity│
                      │        (Phone Hash = Doc ID)          │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Frozen Entries -> Commit-Reveal Draw   │
                      │  (Deterministic Fisher-Yates Shuffle) │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │ Atomic Seat Allocation & 5m Timed Hold│
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │  Simulated Checkout & HMAC-Signed Pass│
                      └───────────────────────────────────────┘
```

---

## 2. Multi-Layer Request Shedding Pipeline

To survive flash crowds without expensive infrastructure, requests pass through a **cheapest-first** pipeline:

1. **IP Sliding Window (`rate-limiter-flexible`)**: Rejects high-frequency packet floods before database or cryptography evaluation (`cost = O(1) in-memory lookup`).
2. **Session & Auth Verification**: Confirms valid session token.
3. **Client Proof-of-Work (PoW)**: Client browser solves a SHA-256 partial collision challenge. Verifying takes `< 0.05ms` on the server, while computing imposes a CPU cost on distributed bots.
4. **Honeypot Trap**: Invisible form fields that bots fill out automatically trigger an immediate ban.
5. **Timing Jitter**: Sub-10ms arrival times (snipers) are flagged for risk evaluation.
6. **Composite Risk Engine**: Flags or challenges suspicious traffic without rejecting genuine human users on shared university or mobile networks.
7. **Idempotent Store**: Duplicate submissions return the identical entry receipt without re-executing business logic.

---

## 3. Concurrency & Data Model Guarantees

Firestore does not have `SELECT ... FOR UPDATE`, and single documents sustain ~1 write/sec. To guarantee **zero oversold seats and zero duplicates**:

1. **Identity Uniqueness Constraint**:
   - `identities/{identityKey}`: `identityKey = sha256(normalizedPhone)`.
   - Creating a document with an existing ID throws an immediate conflict, preventing duplicate identity registrations.
2. **One Entry Per Identity**:
   - `drops/{dropId}/entries/{identityKey}`: The document ID is the `identityKey`. Double-joining is mathematically impossible.
3. **Atomic 500-Seat Batch Allocation**:
   - When the entry window closes, the server freezes entries and runs a deterministic Fisher-Yates shuffle.
   - Winning seats are committed using Firestore 500-operation batched writes in a single atomic transaction.
4. **Holds & Expiration Cascading**:
   - Holds last 5 minutes. A `node-cron` background scheduler sweeps expired holds and cascades them down the waitlist.

---

## 4. Reliable Sessions & Network Resilience

- Sessions are maintained in durable storage.
- Socket.io syncs full drop state on connect and reconnect.
- Simulated network failure recovery: if the server restarts or network drops, queue position, receipts, and held seats remain intact.
