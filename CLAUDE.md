# RegenHub Dashboard

Client-side network status dashboard that pings LAN devices. Uses a lightweight Hono/Bun backend to proxy pings (wired connection from server), with automatic fallback to direct browser pings if the server is unreachable.

## Stack
- **Runtime**: Bun
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Hono (Bun) — proxies HTTP pings and serves static files
- **Deployment**: Dockerfile → Coolify (expose port 3000)

## Commands
- `bun install` — install deps
- `bun dev` — frontend dev server on :5173 (proxies /api to :3001)
- `bun run dev:server` — backend dev server on :3001 (with --watch)
- `bun run build` — production build to `dist/`
- `bun start` — production server (serves dist/ + /api routes on :3000)

## Project Structure
```
server.ts        — Hono backend: /api/ping, /api/ping-all, static file serving
src/
  devices.ts     — Device list and groups (edit this to add/remove devices)
  ping.ts        — Ping logic: tries server /api/ping-all first, falls back to direct browser fetch
  useLabels.ts   — localStorage-backed custom device labels
  App.tsx        — Main dashboard UI
  main.tsx       — React entry point
  index.css      — Tailwind import + base styles
Dockerfile       — Two-stage build: bun build → bun serve
```

## Adding/Removing Devices
Edit `src/devices.ts`. Each device needs: `id`, `hostname`, `ip`, `defaultLabel`.
Devices are organized into groups (Network, Compute, Infrastructure).
A device can have `children` for nested VMs (see Compute 3 → Regenclaw VM pattern).

## Design
Airport terminal / departure board aesthetic. Monospace, dense table rows, uppercase headers.
Status shows UP/DOWN/WAIT. Latency is color-coded (green <50ms, amber <150ms, red 150ms+).
Device names are click-to-rename, persisted in localStorage.
Footer shows whether pings are routed VIA SERVER or VIA DIRECT.

## Deployment (Coolify)
1. Point Coolify at this repo
2. Build method: Dockerfile
3. Expose port: 3000
4. The server handles both API routes and serving the static frontend
