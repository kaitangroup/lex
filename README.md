# Lex Practice OS

A practice-management dashboard for small litigation firms. Built around four daily questions a managing partner needs to answer at a glance:

1. **Are we on top of our cases?** — operational R/Y/G across milestones, court deadlines, hearings, lawyer capacity, A/R aging
2. **Is the team doing what they're supposed to do?** — task accountability per staff member, process compliance, overdue rollups
3. **Are we growing?** — new-case speedometer vs goal, net income QoQ + YTD vs last year, billable hours vs 40h target per lawyer/paralegal
4. **Am I moving the needle?** — strategic projects (hiring, BD, operations, compliance, practice-area launches) with R/Y/G health and at-risk surfacing

Designed for a managing partner who reads charts and colors faster than digits.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts + wouter (hash routing)
- **Backend:** Express + better-sqlite3 (synchronous SQLite) for persistence
- **Shared types:** `shared/schema.ts` is the single source of truth for both client and server
- **Build:** Vite for the client, esbuild bundles the server into a single CJS file

## Persistence

Data persists across restarts in a local SQLite file (default `./data.db`). The app keeps a fast in-memory representation of all collections (cases, milestones, time entries, etc.) and snapshots the full state to SQLite as a JSON blob whenever a mutation succeeds. Writes are debounced (500ms) so bursts collapse into a single flush. On boot:

- If `data.db` does not exist: the seeded baseline (60 cases, 12 staff, 180 days of time entries, etc.) is written to disk.
- If `data.db` exists: the snapshot is loaded and replaces the seeded baseline.

Override the location via the `DATABASE_PATH` environment variable.

## Project layout

```
client/          React frontend (Vite)
  src/
    pages/       Route components (Alerts.tsx is Margaret's home, the 4-zone dashboard)
    components/  Reusable widgets (RYGPie, StatusPill, Sparkline, Layout, ...)
    lib/         queryClient, format helpers
server/          Express backend
  index.ts       Server entry; reads PORT, calls bootstrapPersistence()
  routes.ts      All /api/* route handlers + mutation→snapshot middleware
  storage.ts     In-memory storage layer + computed dashboard summaries + persistence
  db.ts          SQLite snapshot reader/writer (debounced)
  seed.ts        Demo data: 60 cases, 12 staff, 180 days of time entries, strategic projects
shared/
  schema.ts      Drizzle tables, Zod schemas, TypeScript types
script/
  build.ts       Production build orchestrator (client + server)
.env.example     Template for environment configuration
```

## Getting started

```bash
npm install
cp .env.example .env       # tweak PORT or DATABASE_PATH if needed
npm run dev
```

This starts Express with Vite middleware mounted on the same port. The app seeds itself with demo data on first run (file: `data.db`, gitignored).

Open: <http://localhost:4004>

## Production build

```bash
npm run build
PORT=4004 NODE_ENV=production node dist/index.cjs
```

The build emits:

- `dist/public/` — static frontend assets
- `dist/index.cjs` — bundled Express server

## Deployment to whatsthepayout.com (port 4004)

The app is configured to bind `0.0.0.0:4004` by default. To deploy behind a reverse proxy:

### Nginx config

```nginx
server {
  server_name whatsthepayout.com;
  listen 443 ssl http2;
  # ssl_certificate / ssl_certificate_key managed by certbot

  location / {
    proxy_pass http://127.0.0.1:4004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}

server {
  listen 80;
  server_name whatsthepayout.com;
  return 301 https://$host$request_uri;
}
```

### systemd service

```ini
[Unit]
Description=Lex Practice OS
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/lex-practice-os
EnvironmentFile=/srv/lex-practice-os/.env
ExecStart=/usr/bin/node dist/index.cjs
Restart=on-failure
User=lexapp

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now lex-practice-os
```

### One-shot setup script (Ubuntu 22.04+)

```bash
git clone https://github.com/<you>/lex-practice-os.git /srv/lex-practice-os
cd /srv/lex-practice-os
npm ci
npm run build
cp .env.example .env
sudo cp deploy/lex-practice-os.service /etc/systemd/system/
sudo systemctl enable --now lex-practice-os
sudo certbot --nginx -d whatsthepayout.com
```

## Role switcher

The header has a role switcher with four views:

- **Managing Partner (Margaret)** — the four-question homepage at `/`
- **Lawyer** — case load, deadlines, billable progress
- **Paralegal** — assigned tasks, communications SLA, hours pacing
- **Bookkeeper** — A/R aging, invoices, collections

## Demo data

On first run the seed creates a realistic firm:

- 8 lawyers (1 partner, 7 associates) + 4 paralegals + 1 bookkeeper
- 3 practice areas: bankruptcy avoidance, commercial litigation, real estate
- ~60 active cases at varying stages, with milestones, deadlines, hearings, invoices
- 180 days of time entries with per-staff baselines that drive realistic R/Y/G hours distribution
- 8 strategic projects across hiring / BD / operations / compliance / practice-area launches

To reset, stop the server, delete `data.db*`, and restart.

## Roadmap

- [ ] Per-person Hours drill-down page
- [ ] Strategic Projects detail page (replaces Marketing in nav)
- [ ] Communications watchdog (manual entry first)
- [ ] Disposition dropdown → auto-task creation
- [ ] Microsoft 365 / Graph: email + calendar OAuth
- [ ] Fireflies.AI integration → action items become Lex tasks
- [ ] Smart email triage (contact-role tagging + AI intent classification)
- [ ] Salesforce integration: newly-filed lawsuits → Potentials pipeline
- [ ] Auto-reply + Margaret escalation banner/digest
- [ ] Milestone template engine with practice-area pre-seeds
- [ ] Client portal + auth (PIN for staff, email/password for clients)
- [ ] QuickBooks Online sync (Intuit sandbox)

## Architectural notes

- **No localStorage / sessionStorage / cookies on the client.** Persistence goes through the API + SQLite.
- **Hash routing** (`useHashLocation` from wouter). All routes are `/#/path` so the app deploys cleanly inside an iframe proxy.
- **`apiRequest` from `client/src/lib/queryClient.ts` is the only way to talk to the backend.** Raw `fetch()` is forbidden — it bypasses the deploy-time URL rewriter.
- **R/Y/G computation** lives server-side in `storage.ts` (`computeHoursSummary`, `computeFirmPerformance`, `computeAccountabilitySummary`, `computeStrategicProjectsSummary`). The client renders pies and bars from these summaries — no R/Y/G logic on the client.
- **Persistence model** is a single-row JSON snapshot in SQLite. This is intentional: domain mutations are infrequent (small firm scale), the entire dataset fits comfortably in memory, and the snapshot model means we never have to write or maintain per-table CRUD migrations as the schema evolves. If load ever justifies it, swapping to per-table Drizzle CRUD is a contained refactor inside `storage.ts`.

## License

Proprietary — internal demo. Do not redistribute.
