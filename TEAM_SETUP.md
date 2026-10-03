# Fair Drop — Team Onboarding & Cloud Sync Guide

This project is connected directly to **Google Cloud Firestore (`fair-drop-15058`)**.
All data (drops, seats, users, security rules, entries, and simulation results) synchronizes in real time across the entire team without needing to commit database files to GitHub.

---

## Quick Setup for Teammates (3 Steps)

### Step 1: Clone & Install
```bash
git clone <YOUR_REPO_URL>
cd VisionFinders_maharashtra_round
npm install
```

### Step 2: Add the Service Account Key
Ask the team lead for the `serviceAccountKey.json` file and place it in the project root:
```text
VisionFinders_maharashtra_round/serviceAccountKey.json
```
*(Note: `serviceAccountKey.json` is in `.gitignore`, so git will never commit or expose it).*

Alternatively, copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
And paste the service account credentials or set `FIREBASE_PROJECT_ID=fair-drop-15058`.

### Step 3: Start the Application
Run both backend and frontend concurrently:
```bash
npm start
```
- **Frontend**: http://localhost:5173
- **Express API**: http://localhost:4000
- **Verification Endpoint**: http://localhost:4000/api/health

---

## Useful Database Commands

- **Check Database & Cloud Sync Status**:
  ```bash
  npm run db:status
  ```
- **Pull Latest Data from Cloud Firestore**:
  ```bash
  npm run db:pull
  ```
- **Push Local Data to Cloud Firestore**:
  ```bash
  npm run db:push
  ```
- **Run the 8/8 Master Verification Test Suite**:
  ```bash
  npm test
  ```
- **Run the Real HTTP Flash Crowd Simulator**:
  ```bash
  npm run simulator
  ```

---

## How It Works
- Whenever anyone creates a drop, adjusts rate limits, or completes a ticket checkout, the update is instantly written to Cloud Firestore.
- Real-time listeners stream updates to every connected teammate in milliseconds.
- Zero git merge conflicts on database state.
