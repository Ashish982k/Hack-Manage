# Hosting Hack-Manage — Frontend on Vercel + Backend on Render

## Will Better Auth Cookies Work? ✅ Yes

This is the most important question first.

Because the frontend uses **Next.js proxy rewrites**, the browser **never directly contacts the Render backend**. Every request goes like this:

```
Browser → frontend.vercel.app/api/auth/sign-in
             │
             └─ (Next.js rewrite — server-to-server)
             │
             └─▶ hack-manage-backend.onrender.com/api/auth/sign-in
                             │
                             └─▶ Returns response + Set-Cookie
             │
             ← Cookie is set on frontend.vercel.app  ✅
```

The cookie is always set on `frontend.vercel.app` (the browser's origin). Render's domain never appears in the browser at all. No cross-domain cookie issue — the proxy completely solves it.

---

## Architecture

```
Browser (user)
  │
  ▼
frontend.vercel.app          ← Next.js 16 (Vercel)
  │
  │  /api/auth/*      ──▶  hack-manage-backend.onrender.com/api/auth/*
  │  /api/hackathons/* ──▶  hack-manage-backend.onrender.com/hackathons/*
  │  /api/teams/*     ──▶  hack-manage-backend.onrender.com/teams/*
  │  /api/users/*     ──▶  hack-manage-backend.onrender.com/users/*
  │
hack-manage-backend.onrender.com  ← Hono + Node.js (Render)
  │
  └─▶ Turso SQLite Cloud DB
  └─▶ Cloudinary (image uploads)
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| [Vercel account](https://vercel.com/signup) | Free Hobby tier works |
| [Render account](https://render.com) | Free tier works (note: spins down after 15 min idle) |
| [Turso account](https://turso.tech) | Already used — keep same DB |
| [Cloudinary account](https://cloudinary.com) | Already configured |
| Google OAuth credentials | From [Google Cloud Console](https://console.cloud.google.com) |
| GitHub OAuth credentials | From [GitHub Developer Settings](https://github.com/settings/developers) |
| Git repository | Code pushed to GitHub/GitLab |

---

## Part 1 — Deploy the Backend to Render

Render runs your backend as a **persistent Node.js web service** — not serverless functions. This means your existing `src/index.ts` with `serve()` works perfectly as-is. **No refactoring needed.**

### Step 1 — Push Code to GitHub

Make sure both `frontend/` and `backend/` folders are pushed to your GitHub repository.

### Step 2 — Create a New Web Service on Render

1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click **New → Web Service**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `hack-manage-backend` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter for no sleep) |

> Render's Root Directory setting means it will `cd backend` before running your build/start commands. Your `package.json` scripts (`build`, `start`) work exactly as defined.
>
> Docs: https://render.com/docs/web-services

### Step 3 — Set Backend Environment Variables on Render

Go to your Render service → **Environment** tab and add all of these:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | your Google client ID |
| `GOOGLE_CLIENT_SECRET` | your Google client secret |
| `GITHUB_CLIENT_ID` | your GitHub client ID |
| `GITHUB_CLIENT_SECRET` | your GitHub client secret |
| `BETTER_AUTH_SECRET` | a long random string (32+ chars) — **must match frontend** |
| `BETTER_AUTH_URL` | `https://your-frontend.vercel.app` ← **frontend URL, not backend** |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `TURSO_DATABASE_URL` | `libsql://yourdb.aws-ap-south-1.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | your Cloudinary API secret |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_APP_PASS` | your Gmail app password |
| `NODE_ENV` | `production` |

> ⚠️ **Critical:** `BETTER_AUTH_URL` must be set to your **Vercel frontend URL**, not the Render backend URL. Better Auth uses this to build cookie domains and OAuth redirect URIs. Since the browser talks to the frontend proxy, the frontend is where auth lives from the browser's perspective.

> Docs: https://render.com/docs/environment-variables

### Step 4 — Deploy

Click **Deploy** (or push to your main branch if auto-deploy is enabled).

Once deployed, note your Render URL — it will look like:
```
https://hack-manage-backend.onrender.com
```

Test it is alive:
```bash
curl https://hack-manage-backend.onrender.com/
# Should return: Running
```

### Step 5 — Run Database Migrations

After the first deploy, push any schema changes from your local machine:

```bash
cd backend
npx drizzle-kit push
```

This pushes directly to Turso cloud from your local environment.

---

## Part 2 — Deploy the Frontend to Vercel

### Step 1 — Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

> Docs: https://vercel.com/docs/cli

### Step 2 — Deploy from the Frontend Folder

```bash
cd frontend
vercel
```

Answer the setup questions:

| Question | Answer |
|---|---|
| Set up and deploy? | `Y` |
| Project name | `hack-manage-frontend` |
| In which directory is your code? | `./` |
| Override settings? | `N` |

### Step 3 — Set Frontend Environment Variables on Vercel

Go to **Vercel Dashboard → hack-manage-frontend → Settings → Environment Variables**:

| Key | Value | Environment |
|---|---|---|
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Production |
| `FRONTEND_URL` | `http://localhost:3000` | Development |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://your-frontend.vercel.app` | Production |
| `NEXT_PUBLIC_FRONTEND_URL` | `http://localhost:3000` | Development |
| `BACKEND_URL` | `https://hack-manage-backend.onrender.com` | Production |
| `BACKEND_URL` | `http://localhost:5000` | Development |
| `NEXT_PUBLIC_BACKEND_URL` | `https://hack-manage-backend.onrender.com` | Production |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:5000` | Development |

> **Why two sets of `BACKEND_URL` vars?**
> - `BACKEND_URL` (no `NEXT_PUBLIC_`) — used by `next.config.ts` **at build time** to configure rewrites. This is server-only.
> - `NEXT_PUBLIC_BACKEND_URL` — exposed to the browser for absolute asset URLs (Cloudinary image links etc.).
>
> Docs: https://vercel.com/docs/projects/environment-variables

### Step 4 — Deploy to Production

```bash
cd frontend
vercel --prod
```

Your frontend is now live at `https://hack-manage-frontend.vercel.app` (or your custom domain).

> Docs: https://vercel.com/docs/cli/deploy

---

## Part 3 — Update OAuth Redirect URIs

Both Google and GitHub need your **frontend** production URL as the callback — not the Render backend URL.

### Google OAuth — [console.cloud.google.com](https://console.cloud.google.com)

1. Go to **APIs & Services → Credentials → your OAuth 2.0 Client**
2. Add to **Authorized redirect URIs**:
   ```
   https://your-frontend.vercel.app/api/auth/callback/google
   ```
3. Add to **Authorized JavaScript origins**:
   ```
   https://your-frontend.vercel.app
   ```

### GitHub OAuth — [github.com/settings/developers](https://github.com/settings/developers)

1. Open your OAuth App
2. Set **Homepage URL**:
   ```
   https://your-frontend.vercel.app
   ```
3. Set **Authorization callback URL**:
   ```
   https://your-frontend.vercel.app/api/auth/callback/github
   ```

> These point to the **frontend** because Better Auth's OAuth flow goes through `/api/auth/*`, which the Next.js proxy intercepts and forwards to Render internally. The browser only ever sees the frontend domain.

---

## Part 4 — Verify the Deployment

### Smoke Test Checklist

- [ ] `https://hack-manage-backend.onrender.com/` → returns `Running`
- [ ] `https://your-frontend.vercel.app/` → loads the home page without errors
- [ ] `https://your-frontend.vercel.app/api/auth/session` → returns JSON `{"session":null,"user":null}` (not HTML)
- [ ] Google login → completes and redirects back to the app
- [ ] After login: DevTools → **Application → Cookies → your-frontend.vercel.app** → `better-auth.session_token` cookie exists ✅
- [ ] `/hackathons` page → loads data from the backend

### Quick curl checks

```bash
# Is the backend alive?
curl https://hack-manage-backend.onrender.com/

# Is the auth proxy working? (Must return JSON, not HTML)
curl https://your-frontend.vercel.app/api/auth/session

# Is the API proxy working? (Must return JSON)
curl https://your-frontend.vercel.app/api/hackathons \
  -H "Cookie: better-auth.session_token=<your-token>"
```

---

## Part 5 — Enable Auto-Deploys (Recommended)

### Vercel — Auto-deploy Frontend

Vercel auto-deploys on every push to `main` by default once your GitHub repo is connected.

Set **Root Directory** to `frontend` so only frontend changes trigger a frontend redeploy:

1. **Vercel Dashboard → Project → Settings → Git**
2. Set **Root Directory** = `frontend`

> Docs: https://vercel.com/docs/deployments/git

### Render — Auto-deploy Backend

Render also auto-deploys on push. Set it up:

1. **Render Dashboard → Service → Settings → Auto-Deploy** → Enable
2. Push to `main` → Render redeploys the backend automatically

> Docs: https://render.com/docs/deploys#automatic-deploys

---

## Render Free Tier — Important Note

Render's **free tier** spins down web services after **15 minutes of inactivity**. The first request after a spin-down takes ~30–60 seconds (cold start). This will cause the first login after a period of inactivity to feel slow.

**Options to avoid this:**

1. **Upgrade to Render Starter ($7/month)** — keeps the service always running.
2. **Use a free uptime monitor** (e.g. [UptimeRobot](https://uptimerobot.com)) to ping `https://hack-manage-backend.onrender.com/` every 10 minutes to prevent sleep.
3. **Add a loading state** to the login page with a message like "First load may take a moment…".

---

## Common Issues & Fixes

### Login redirects to `localhost:3000`
`BETTER_AUTH_URL` or `FRONTEND_URL` in the **Render** backend env vars still points to localhost. Update both to your production Vercel URL and redeploy.

### `api/auth/session` returns HTML (Next.js 404 page)
The Next.js rewrite isn't forwarding to Render. Check that `BACKEND_URL` is set in your **Vercel** project's env vars and equals your Render URL (no trailing slash). Trigger a redeploy after fixing — rewrites are baked in at build time.

### Cookie not set after login
- Confirm OAuth redirect URIs use the **frontend** Vercel URL.
- Confirm `BETTER_AUTH_URL` in Render = your Vercel frontend URL.
- Confirm `useSecureCookies` is `true` in `backend/lib/auth.ts` for production (it already uses `NODE_ENV === "production"`).

### CORS error in browser console
The Render backend's `FRONTEND_URL` env var is wrong. Update it to match your actual Vercel domain exactly (including `https://`).

### `ERR_INVALID_URL` from Better Auth client
`NEXT_PUBLIC_FRONTEND_URL` is missing or empty in the Vercel env vars. The auth client in `src/lib/auth-client.ts` needs this to construct an absolute URL.

### Render service showing "Deploy failed"
Check the Render build logs. Most common causes:
- `npm run build` fails due to TypeScript errors
- `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN` is missing from env vars

---

## Local Development (Unchanged)

Nothing about local development changes. Your `.env` files already have the correct localhost URLs:

```bash
# Terminal 1 — Backend (Hono on port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (Next.js on port 3000)
cd frontend && npm run dev
```

The Next.js proxy rewrites forward `/api/auth/*`, `/api/hackathons/*`, etc. to `localhost:5000` during development — identical to how Vercel forwards to Render in production.
