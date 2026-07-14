# 🐾 Litter Watch

A mobile-first PWA for tracking a litter of kittens — weights, growth charts, photos and videos — shared between household members via a single passcode. Built with React + Vite + TypeScript + Tailwind, Netlify Functions, Netlify DB (Neon Postgres), and Netlify Blobs.

## Features

- **Dashboard** — per-kitten tiles with latest weight, gain since last weigh-in, sparkline, and a health flag when a kitten is gaining too slowly or losing weight (threshold configurable in Settings).
- **Log weigh-ins** — one kitten or the whole litter in one session, with date/time, who logged it, notes, and photo/video capture straight from the phone camera. Images are compressed client-side; videos up to 100 MB upload in chunks with progress.
- **Growth chart** — all kittens overlaid; tap a kitten chip to view it solo.
- **Timeline** — reverse-chronological feed of all weigh-ins with deltas and tappable media thumbnails.
- **Kitten profiles** — full history, chart, stats, and media gallery per kitten.
- **Kitten management** — add / edit / archive / delete kittens, each with a fixed color used consistently across the UI and charts.
- **PWA** — installable to the iPhone home screen, offline-tolerant shell (last-fetched data and media are cached).
- **Auth** — one shared household passcode (`HOUSEHOLD_PASSCODE` env var) → signed cookie, valid for a year per device. No accounts.

## Repo layout

```
netlify/functions/   Serverless API (auth, kittens, weigh-ins, media, settings, seed)
src/                 React app (pages, components, hooks, lib)
db/schema.sql        Reference schema — tables are auto-created on first API call
scripts/             Icon generator (sharp) + in-memory demo API
public/icons/        Generated PWA icons (committed)
```

## Quick demo (zero setup)

```bash
npm install
npm run dev:demo
```

Open http://localhost:5173 — passcode is `kittens`. This runs against an **in-memory API**: perfect for trying the UI, but **nothing is saved**. Real dev uses `netlify dev` (below).

## Local development (real stack)

1. **Install tools**
   ```bash
   npm install
   npm install -g netlify-cli
   ```
2. **Link the site** (after you've created it on Netlify — see Deploying):
   ```bash
   netlify login
   netlify link
   ```
3. **Provision the database** (once per site):
   ```bash
   netlify db init
   ```
   This creates a Neon Postgres database and sets `NETLIFY_DATABASE_URL` on the site. **Important:** Netlify DB starts as a temporary database — claim it (Netlify dashboard → the extension banner → "Claim database", which connects it to a free Neon account) within 7 days or it's deleted.
4. **Set the passcode** — in the Netlify dashboard (Site configuration → Environment variables) add `HOUSEHOLD_PASSCODE`, or for purely local work create a `.env` file:
   ```
   HOUSEHOLD_PASSCODE=your-secret-here
   ```
5. **Run it**:
   ```bash
   netlify dev
   ```
   Open http://localhost:8888 (the vite dev server runs behind it). `netlify dev` injects the linked site's env vars, runs the functions, and emulates Netlify Blobs locally — the database is the real (remote) Neon one.

Tables are created automatically on the first API call; no migration step. `db/schema.sql` is a reference copy.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `HOUSEHOLD_PASSCODE` | Netlify dashboard (+ `.env` locally) | The shared passcode. Changing it invalidates all signed-in devices. |
| `NETLIFY_DATABASE_URL` | Set automatically by `netlify db init` | Neon Postgres connection string. |

Netlify Blobs needs no configuration — the `litter-media` store is created on first upload.

## Deploying (GitHub → Netlify CI/CD)

1. **Create a GitHub repo and push:**
   ```bash
   git init && git add -A && git commit -m "Litter Watch"
   git remote add origin https://github.com/<you>/litter-watch.git
   git push -u origin main
   ```
2. **Connect to Netlify:** [app.netlify.com](https://app.netlify.com) → *Add new project* → *Import an existing project* → GitHub → pick the repo. Build settings are read from `netlify.toml` (build `npm run build`, publish `dist`) — accept and deploy.
3. **Add the env var:** Site configuration → Environment variables → `HOUSEHOLD_PASSCODE` = your secret. Redeploy (Deploys → Trigger deploy) so functions pick it up.
4. **Provision the DB:** `netlify link` then `netlify db init` (or install the Neon extension from the Netlify dashboard → Extensions). Claim the database when prompted.
5. Every push to `main` now auto-deploys.

## Install on iPhone

Open the site in Safari → Share → **Add to Home Screen**. It launches standalone with the paw icon. Both phones enter the passcode once; data syncs through the shared database (pull-to-refresh = just refocus the app; data refetches automatically).

## Notes & limits

- **Videos** are capped at 100 MB (~1–2 min of iPhone video). They upload in 4 MB chunks because Netlify Functions cap request bodies at ~6 MB. Keep clips short.
- **Photos** are resized to ≤1600 px JPEG (~0.5 MB) before upload.
- Media is stored in Netlify Blobs and served through an authenticated function with Range support (required for iOS video playback).
- The passcode gate is privacy, not security — it keeps the URL private to the household, exactly as intended.
- Regenerate icons after editing the art: `npm run icons`.
