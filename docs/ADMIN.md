# Fair Drop: Admin Command & Operations Architecture

## 1. Overview
The Admin console (`/admin/*`) provides high-integrity operational controls, real-time telemetry, participant risk moderation, and cryptographic audit validation for Fair Drop allocation events.

All fake and pseudo-random numbers have been completely eliminated. Real-time metrics are generated directly from real HTTP telemetry via an in-memory sliding ring buffer, and all operational actions are protected by role-based access control (RBAC) and recorded in an append-only, SHA-256 cryptographic audit ledger.

---

## 2. Navigation & Layout Architecture
The admin console utilizes a left-hand navigation sidebar (`src/layouts/AdminLayout.tsx`) collapsible on mobile, composed strictly of:
1. **Dashboard** (`/admin`): Unified operations cockpit merging real-time radar metrics, KPIs, health status, and live drop controls.
2. **Drops** (`/admin/drops`): Lifecycle management table with validated create/edit modal and draft/publish workflows.
3. **Inventory** (`/admin/inventory`): High-density 500-seat SVG/grid visualizer with status filters, manual hold/unhold dialogs, and detail inspection drawers.
4. **Entries & Risk** (`/admin/entries`): Server-side paginated entry stream with composite risk scores, raw anomaly signals drawer, and flag/ban/clear moderation actions.
5. **Security** (`/admin/security`): Live tuning of in-memory rate limiters (IP, account, device), PoW mining difficulty, honeypot traps, and dynamic blocklist/allowlist management.
6. **Audit & Integrity** (`/admin/audit`): Paginated append-only ledger with expandable block payloads, cryptographic hash chain verification, and invariant audit execution.
7. **Appeals** (`/admin/appeals`): Flagged participant appeal queue with status tabs (pending, approved, rejected) and required reviewer audit notes.
8. **Lab** (`/lab/attack-designer`): Direct link to the Adversarial Simulation Lab.

The unified header displays the persistent drop selector, active role badge, user identifier, and a secure Log Out action (developer persona switching removed from admin chrome).

---

## 3. Server Architecture & Endpoints (`server/routes/admin.ts`)
All admin endpoints are mounted under `/api/admin` and guarded by `authMiddleware` and `requireRole(['organizer', 'security', 'readonly', 'evaluator'])`. State-mutating routes (POST, PUT, PATCH, DELETE) enforce `disallowReadOnly`.

| Method | Endpoint | Description | Role Required | Audit Logged |
|---|---|---|---|:---:|
| `GET` | `/api/admin/metrics` | 5-minute sliding window (300 1-second buckets) of requests/sec, 429 rate, and p95 latency | Readonly+ | No |
| `GET` | `/api/admin/dashboard` | Aggregated drop KPIs, real-time telemetry summary, system health, and alerts | Readonly+ | No |
| `GET` | `/api/admin/drops` | List all drops with real seat inventory and attendee entry counts | Readonly+ | No |
| `POST` | `/api/admin/drops` | Create drop with chronologically validated registration and draw windows | Organizer / Security | Yes |
| `PUT` | `/api/admin/drops/:id` | Update drop metadata and configuration | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/pause` | Suspend drop registration window | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/resume` | Resume open registration window | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/extend` | Extend registration window by N minutes (auto-shifts draw deadline) | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/emergency-stop` | Immediate abort with mandatory reason | Organizer / Security | Yes |
| `GET` | `/api/admin/drops/:id/inventory` | 500-seat status map with holder and expiration timestamps | Readonly+ | No |
| `POST` | `/api/admin/drops/:id/seats/:seatId/hold` | Manually hold seat with required audit reason | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/seats/:seatId/unhold` | Manually release held seat with reason | Organizer / Security | Yes |
| `GET` | `/api/admin/drops/:id/entries` | Server-side paginated entry query with search, status, and risk band filters | Readonly+ | No |
| `POST` | `/api/admin/drops/:id/entries/:key/action` | Moderation action (`flag`, `ban`, `clear`) with mandatory reason | Organizer / Security | Yes |
| `POST` | `/api/admin/drops/:id/entries/bulk` | Bulk moderation action for array of identity keys | Organizer / Security | Yes |
| `GET` | `/api/admin/security` | Current defence configuration, rule hits, and in-memory blocklist | Readonly+ | No |
| `POST` | `/api/admin/security` | Reconfigure rate limiters, PoW difficulty, and challenge thresholds | Organizer / Security | Yes |
| `POST` | `/api/admin/security/blocklist` | Mutate blocklist (`add`, `remove`, `import`, `clear`) with audit reason | Organizer / Security | Yes |
| `GET` | `/api/admin/audit` | Paginated, filterable append-only audit records | Readonly+ | No |
| `POST` | `/api/admin/audit/verify` | Execute full cryptographic SHA-256 hash chain verification | Organizer / Security | Yes |
| `POST` | `/api/admin/audit/invariants/:dropId` | Audit 500 seats for oversold, duplicate claims, and orphaned holds | Organizer / Security | Yes |
| `GET` | `/api/admin/appeals` | List attendee appeals enriched with entry risk signals | Readonly+ | No |
| `POST` | `/api/admin/appeals/:id/decide` | Approve or reject appeal with mandatory reviewer note (restores/maintains eligibility) | Organizer / Security | Yes |

---

## 4. Telemetry Ring Buffer (`server/modules/adminMetrics.ts`)
To replace hardcoded or pseudo-random chart data, the server maintains a continuous 300-second ring buffer of per-second counters:
- `totalRequests`: Count of finished HTTP requests in that 1-second slice.
- `rateLimited429`: Count of intercepted 429 responses.
- `p95Latency`: True 95th percentile latency derived from request durations recorded in middleware.
- Polled by the frontend dashboard every 2 seconds or pushed via Socket.io.
- Zero `Math.random` across all admin dashboards and radar charts.

---

## 5. UI Component Design System (`src/components/admin/`)
- `AdminErrorBoundary.tsx`: Catches unhandled render failures per panel, isolating broken components and preventing crashes.
- `PageHeader.tsx`: Unified header with title, subtitle, breadcrumb, and action container.
- `StatCard.tsx`: Metric summary cards with color variants (`yellow`, `emerald`, `cyan`, `rose`, `amber`).
- `DataTable.tsx`: High-performance table with server-side and client-side pagination, column sorting, search filter, and bulk row selection.
- `Drawer.tsx`: Smooth slide-out inspection panel for risk signals, metadata, and seat holder details.
- `ConfirmDialog.tsx`: Modal dialog for destructive actions (emergency stop, ban, clear blocklist) requiring a mandatory reason for audit compliance.
- `SkeletonLoader.tsx`: Responsive pulse skeletons for loading states.
- `EmptyState.tsx`: Structured empty views with action buttons.
- `ErrorState.tsx`: Error display with instant retry action.

---

## 6. Placeholders for Attendee Branch Merge
Per concurrency rules, the following items are marked with clear placeholders and will be connected upon merging with `feat/attendee-reservation`:
1. **Ticket Tiers in Create/Edit Drop (`src/pages/admin/DropsPage.tsx`)**: Clearly labeled placeholder container for multi-tier pricing, seat allocation, and perks.
2. **Tier-based Seat Grouping in Inventory Grid (`src/pages/admin/InventoryManagerPage.tsx`)**: Prominent placeholder badge and container for VIP, Platinum, Gold, Silver, and Bronze tier segmentation.
3. **Open Next Round Cascade Trigger Button**: Placeholder container for waitlist cascade progression.

---

## 7. Seed Data Oddities & Anomaly Report
During database inspection of seeded records, the following unusual or synthetic values were catalogued:
1. `drop-daft-punk-unreleased`:
   - Title: `'Alive 2027: Synthesized Memories (Pyramid Stage)'`
   - Host/Artist: `'Modular Synth Guild'`
2. `drop-fcfs-baseline-control`:
   - Title: `'Experimental Control: FCFS Flash Drop (Baseline)'`
   - Venue: `'Virtual Arena Lab Benchmark'`
   - City: `'Global Simulation'`
3. `drop-musgz28j`:
   - Title: `'Test after db'`
4. `drop-musrpe54_ildsyv`:
   - Title: `'test adter git fix'`
   - Status: `'drawn'` with 1 entry.
