# RegenHub Dashboard

Client-side network status dashboard that pings LAN devices via HTTP fetch (no-cors mode).

## Stack
- **Runtime**: Bun
- **Framework**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Deployment**: Static build → Nginx Docker container → Coolify

## Commands
- `bun install` — install deps
- `bun dev` — dev server on :5173
- `bun run build` — production build to `dist/`

## Project Structure
```
src/
  devices.ts   — Device list and groups (edit this to add/remove devices)
  ping.ts      — Client-side ping via fetch with timeout
  useLabels.ts — localStorage-backed custom device labels
  App.tsx      — Main dashboard UI
  main.tsx     — React entry point
  index.css    — Tailwind import + base styles
```

## Adding/Removing Devices
Edit `src/devices.ts`. Each device needs: `id`, `hostname`, `ip`, `defaultLabel`.
Devices are organized into groups (Network, Compute, Infrastructure).
A device can have `children` for nested VMs (see Compute 3 → Regenclaw pattern).

## Design
Airport terminal / departure board aesthetic. Monospace, dense table rows, uppercase headers.
Status shows UP/DOWN/WAIT. Latency is color-coded (green <50ms, amber <150ms, red 150ms+).
Device names are click-to-rename, persisted in localStorage.

## Deployment
Fully static — `bun run build` produces `dist/` which is served by nginx.
Dockerfile builds and serves via nginx on port 80.
Deploy to Coolify as a Dockerfile-based project.
