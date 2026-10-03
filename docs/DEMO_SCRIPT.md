# FAIR DROP — JUDGES & EVALUATOR DEMO SCRIPT

This walkthrough guides hackathon judges and evaluators through all 3 portals of Fair Drop in under 5 minutes.

---

## 1. Quick Startup

1. **Start Backend**: `npm run server` (runs on `http://localhost:4000`)
2. **Start Frontend**: `npm run dev` (runs on `http://localhost:5173`)
3. Open `http://localhost:5173` in your browser.

---

## 2. Portal Walkthrough

### Part A: 1-Click Persona Access
1. Click **Switch Account** or navigate to `http://localhost:5173/login`.
2. Notice the 4 dedicated 1-click persona cards:
   - **Alex Chen** (Attendee)
   - **Elena Rostova** (Organizer)
   - **Marcus Vance** (Security Lead)
   - **Dr. Aris Thorne** (Adversarial Evaluator)
3. Click any card to instantly log in without typing passwords.

### Part B: Attendee Experience
1. As **Alex Chen**, click **Attendee View**.
2. Click on the featured drop: *Jack White: The Twilight Echoes Vault Edition*.
3. Click **Waiting Room** -> shows the pre-window countdown.
4. Click **Enter Drop (PoW)** -> browser solves the SHA-256 Proof-of-Work challenge and issues an idempotent receipt.
5. Click **Enter Drop** a second time -> note that you receive the exact same receipt ID.
6. Check **Live Telemetry** -> observe real-time entries and draw countdown.
7. Click **My Tickets** -> view HMAC-signed QR ticket with live dynamic anti-scalper countdown.
8. Click **Seed Proof** -> see the SHA-256 commit hash and recompute your position in the browser.

### Part C: Organizer Admin
1. Click **[ 🛡️ Organizer Admin ]** in the top strip to switch to **Elena Rostova**.
2. **Dashboard**: View active drops, entries, and system health.
3. **500-Seat Grid**: Real-time visual seat map showing available, held, sold, and blocked seats.
4. **Audit Ledger**: Shows append-only hash-chained transaction records. Click **Verify Hash Chain** to cryptographically verify ledger integrity.
5. **Appeals**: Review and resolve flagged entries.

### Part D: Adversarial Lab & 50,000-Client Benchmark
1. Click **[ ⚡ Adversarial Lab ]** in the top strip to switch to **Dr. Aris Thorne**.
2. **Attack Designer**:
   - Choose total users: `50,000`.
   - Set bot share: `30%`.
   - Select attack profiles (e.g. *Fast Single-Shot*, *Distributed Botnet*, *Smart Bot*).
   - Click **Run 50k Attack Simulation**.
3. **Live Simulation View**:
   - Watch the multi-layer pipeline funnel filter 50,000 clients in real time.
   - Click **Inject Latency** or **Drop Cache** to test recovery.
4. **Fairness Report**:
   - View Jain's Fairness Index ($\approx 0.98$ for Fair Drop vs $< 0.42$ for FCFS).
   - View Bot Advantage Ratio ($1.02\times$ for Fair Drop vs $14.8\times$ for FCFS).
   - Export report as CSV, JSON, or printable summary.

---

## 3. Reliable Sessions Verification

1. **Browser Refresh Test**:
   - Enter a drop, obtain a receipt, and refresh the browser.
   - Result: Session, queue state, and receipt remain intact.
2. **Socket Disconnect Test**:
   - Click the green **Socket OK** button in the top bar to simulate a network drop.
   - Notice the reconnection banner.
   - Click **Reconnect** -> full state is immediately restored from the server.
3. **Backend Restart Test**:
   - Stop and restart the backend server while on `/drops/drop-jack-white-vault/live`.
   - Result: Refresh the page -> entries, seat holds, and reservations are preserved from durable storage.
