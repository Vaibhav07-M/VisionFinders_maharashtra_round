# Fair Drop — Verifiable High-Demand Sale & Registration Platform

Fair Drop is a high-demand sale and registration platform (500 seats, up to 50,000 competing users) where automated clients cannot gain an advantage through speed, request volume, or repeated attempts.

---

## 0. Official Scale & Allocation Statements

### Core Allocation Integrity Claim
> *"Fair Drop removes arrival speed and request volume as direct allocation advantages and measures the remaining effects of adversarial behaviour."*

### Scale Statement
> *"The application is real. The 50,000 users are virtual clients run against a local or staged instance with the Firebase Emulator, because free hosting and the Firebase Spark plan have connection and write limits."*

---

## 1. Official Problem Statement Key Features

1. **High-Concurrency Support**: Handles large numbers of simultaneous users competing for limited availability (50,000 virtual clients).
2. **Abuse Handling**: Detects and responds to automated clients, request flooding, and repeated attempts via multi-layer request shedding (IP/account/device rate limiting, Turnstile, Proof-of-Work, Honeypot trap, risk scoring).
3. **Allocation Integrity**: Prevents duplicate allocations, overselling, and inconsistent inventory state (`oversold = 0, duplicates = 0, inventory consistent`).
4. **Reliable Sessions**: Maintains user state across refreshes, reconnects, and temporary backend failures (tested with chaos failure injection).
5. **Adversarial Testing**: Evaluates against 7 configurable automated client profiles under varying traffic patterns.
6. **Fairness Measurement**: Quantifies allocation outcomes, system performance, and the effect of adversarial behavior (Jain's fairness index, Gini coefficient, bot advantage ratio, and FCFS baseline comparison).

---

## 2. Tech Stack & Architecture

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Recharts
- **Backend API**: Node.js + Express + TypeScript + Socket.io + `rate-limiter-flexible`
- **Database & Emulators**: Firebase Local Emulator Suite (Firestore + Auth) & durable store
- **Cryptographic Engine**: Web Crypto SHA-256 commit-reveal seed hashing, deterministic Mulberry32 PRNG, Fisher-Yates permutation shuffle, HMAC-SHA256 signed tickets
- **Load Simulator**: Multi-threaded virtual client engine (up to 50,000 clients)

---

## 3. Directory Structure

```
VisionFinders_maharashtra_round/
├── src/                      # React 19 + Vite frontend (all 23 pages across 3 panels)
│   ├── components/           # Shared UI tokens (Button, Card, Table, Badge, Modal, Countdown, ChartWrapper)
│   ├── context/              # Central state store & client simulation runner
│   ├── pages/                # Panel A (A1-A11), Panel B (B1-B8), Panel C (C1-C4)
│   └── utils/                # Cryptographic utilities (SHA-256, Fisher-Yates, PoW solver)
├── server/                   # Express + Socket.io backend
│   ├── db/                   # Firestore emulator / durable storage abstraction
│   ├── modules/              # All 15 backend modules (auth, identity, drops, entry, draw, etc.)
│   └── index.ts              # API server & Socket.io entrypoint
├── simulator/                # Load & attack simulator (up to 50,000 virtual clients)
├── shared/                   # Shared TypeScript interfaces, types, constants
├── firebase.json             # Firebase Emulator Suite config
├── firestore.rules           # Security rules (deny all client writes; public read)
├── firestore.indexes.json    # Composite indexes
├── .env.example              # Environment variables template
└── README.md                 # System documentation & verification instructions
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js v18+ or v20+ / v22+
- npm v9+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Full Stack (Frontend + Backend)
To start both the Express backend (port 4000) and the Vite frontend (port 5173) concurrently:
```bash
npm start
```
- **Frontend URL**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/api/health`

### Step 3: Running the 50,000-Client Simulator (CLI)
```bash
npm run simulator
```

---

## 5. Screen & Feature Mapping (All 23 Pages)

### Panel A: Attendee (11 Pages)
- **A1. Landing / Drops List** (`/`): Featured live drop, countdowns, search & filters.
- **A2. Drop Detail** (`/drops/:id`): Event info, rules, committed seed hash preview, reminder toggle.
- **A3. Sign In / Register** (`/login`, `/signup`): Email auth, Turnstile challenge, session persistence.
- **A4. Identity Verification** (`/verify`): Simulated phone OTP, document ID = hash(phone).
- **A5. Waiting Room** (`/drops/:id/wait`): Window opening countdown, client diagnostics, zero-rush reminder.
- **A6. Entry Console** (`/drops/:id/enter`): Proof-of-Work solver, honeypot trap, idempotent receipt test.
- **A7. Live Status** (`/drops/:id/live`): Real-time Socket.io telemetry, live entrant pulse, draw trigger.
- **A8. Result** (`/drops/:id/result`): Winner pass with confetti & 5-min hold, waitlist rank, or appeal.
- **A9. Seat Hold Checkout** (`/drops/:id/checkout`): 5-minute ticking hold timer, simulated UPI/card.
- **A10. My Tickets** (`/me`): Signed QR admission passes with HMAC signatures.
- **A11. Public Cryptographic Proof** (`/proof/:dropId`): In-browser recomputation of Fisher-Yates draw rank.

### Panel B: Organizer / Admin (8 Pages)
- **B1. Dashboard** (`/admin`): Active drops, bots blocked, health status, and quick links.
- **B2. Create / Edit Drop** (`/admin/drops/create`): Mode toggle (Fair Drop vs FCFS control), seed commitment.
- **B3. Inventory Manager** (`/admin/inventory`): 500-seat auditorium grid and hold inspector.
- **B4. Entries & Users** (`/admin/entries`): Searchable table with real-time risk scores (0-100).
- **B5. Security Rules** (`/admin/security`): Rate limit thresholds, PoW difficulty slider, blocklists.
- **B6. Live Operations** (`/admin/live`): Throughput gauges, 429 counters, emergency stop controls.
- **B7. Results & Audit Log** (`/admin/audit`): Append-only hash chain with "Verify Hash Chain" button.
- **B8. Appeals Queue** (`/admin/appeals`): Review flagged attendee appeals and approve/reject.

### Panel C: Adversarial Lab & Fairness Measurement (4 Pages)
- **C1. Attack Designer** (`/lab/attack-designer`): 7 bot profiles, 50,000 users slider, bot share %, presets.
- **C2. Live Simulation View** (`/lab/simulation-live`): Pipeline funnel split by Human vs Bot, chaos injection.
- **C3. Experiment Matrix** (`/lab/matrix`): Multi-trial combinatorial test grid with confidence intervals.
- **C4. Fairness Report** (`/lab/report`): Bot advantage ratio, Jain's index, Gini, FCFS comparison table, projector view, PDF/CSV/JSON export.

---

## 6. Definition of Done Checklist

- [x] Two browser windows hit Join simultaneously: both get valid distinct receipts; repeated attempts return the identical receipt (idempotent).
- [x] 50,000-client simulation completes with `oversold = 0, duplicates = 0, inventory consistent`.
- [x] Same attack scenario evaluated on FCFS vs Fair Drop demonstrates that Fair Drop neutralizes sniper bots while FCFS allows bots to capture ~83% of inventory.
- [x] Sybil scenario documents that uniform draws cannot prevent multi-account farms without KYC.
- [x] Injected backend kill/restart loses zero user state; recovery time measured by stopwatch.
- [x] Cryptographic audit log hash chain verifies successfully.
- [x] Public proof page allows any user to verify their draw position from the revealed seed in the browser.
