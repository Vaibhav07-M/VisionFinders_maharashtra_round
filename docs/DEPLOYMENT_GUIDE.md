# FAIR DROP — DEPLOYMENT & PUBLISHING GUIDE

This guide provides step-by-step instructions to publish Fair Drop online for free, matching the stack specified in the Master Build Prompt:
- **Frontend**: Firebase Hosting (or Vercel)
- **Backend API & WebSockets**: Render.com Free Tier

---

## Architecture in Production

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│        Vercel / Firebase        │           │        Render.com (Free)        │
│   Frontend (React + Vite SPA)   │  ──────>  │  Backend (Express + Socket.io)  │
│      https://fair-drop.app      │  WebSocket│  https://fair-drop.onrender.com │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

---

## Step 1: Deploy Backend to Render.com (Free Tier)

Render supports Node.js, Express, and WebSockets (Socket.io) on its free tier.

1. **Push your code to GitHub / GitLab**.
2. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and sign in.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Name**: `fair-drop-backend`
   - **Region**: Choose closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx server/index.ts`
   - **Plan**: `Free`
6. Under **Environment Variables**, add:
   - `PORT`: `4000`
   - `NODE_ENV`: `production`
   - `HMAC_TICKET_SECRET`: `fair_drop_prod_secret_key_2026`
   - `TURNSTILE_SECRET_KEY`: `1x0000000000000000000000000000000AA`
7. Click **Create Web Service**.
8. Once deployed, copy your Render URL: e.g. `https://fair-drop-backend.onrender.com`.

---

## Step 2: Deploy Frontend

You can choose either **Vercel** (fastest, 1-command) or **Firebase Hosting** (prompt recommendation).

### Option A: Deploy to Vercel (Recommended for Simplicity)

1. Run in terminal:
   ```bash
   npx vercel
   ```
2. Follow prompts:
   - Link to existing project? **No**
   - Project name: `fair-drop`
   - Directory: `./`
   - Build settings: Override Build Command: `npm run build`, Output Directory: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://fair-drop-backend.onrender.com`
4. Deploy to production:
   ```bash
   npx vercel --prod
   ```

---

### Option B: Deploy to Firebase Hosting (Official Prompt Choice)

1. Make sure Firebase CLI is installed:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Initialize or link your Firebase project:
   ```bash
   firebase use --add
   ```
4. Build the production bundle:
   ```bash
   npm run build
   ```
5. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
6. Your site will be live at `https://<your-project-id>.web.app`.

---

## Step 3: Verification Checkpoints

Once published, verify these 3 endpoints:
1. **Frontend**: Open your live URL (e.g. `https://fair-drop.web.app` or `https://fair-drop.vercel.app`).
2. **Backend Health**: Open `https://fair-drop-backend.onrender.com/api/health` -> should return `{"status":"HEALTHY"}`.
3. **Invariants**: Open `https://fair-drop-backend.onrender.com/api/invariants/drop-jack-white-vault` -> should return `{"oversold":0,"duplicates":0,"valid":true}`.
