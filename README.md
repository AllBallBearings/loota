# Loota (Next.js)

Next.js app that powers Loota’s AR treasure hunts. It provides the web hunt viewer and creator experience, proximity/map hunt stages, loot tracking, and lightweight admin tools for resetting hunts and sharing invite links.

## What it does
- Hunt viewer: See hunt metadata, progress, and completion state in a modern, responsive layout.
- Proximity and map stages: Render proximity hunts (radar-style circle with markers) or geolocation hunts (map pins) depending on hunt type.
- Loot locations list: Summaries of pins with collected/available state and deep-link highlighting.
- Sharing and joining: Share links, join a hunt as a player, and view participants.
- Hunt management: For creators, reset loot or clear participants from the UI.
- Completion banner: Celebratory summary when all loot is collected, including leader stats and timestamps.

## Tech stack
- Next.js 15 (App Router) with React 18
- Tailwind 4 (via PostCSS) for styling plus custom globals
- Prisma + @prisma/client for data access
- Playwright for end-to-end tests
- TypeScript everywhere

## Key directories
- `src/app/` — App Router routes (UI pages and API handlers under `app/api`).
- `src/components/` — Reusable UI: map/proximity containers, loot lists, buttons, icons, etc.
- `src/lib/` — Helpers and shared utilities.
- `prisma/` — Prisma schema and generated client (run `prisma generate` before build).
- `tests/` — Playwright E2E suites.
- `public/` — Static assets.

## Environment
Create `.env.local` at the repo root with values your backend expects. Common keys:
```
API_KEY_SECRET=your-api-key
DATABASE_URL=your-database-url
```
(Add any other service keys your deployment requires.)

## Running locally
```bash
npm install
npm run dev
# visit http://localhost:3000
```

## Build and test
```bash
npm run build   # prisma generate + next build
npm run start   # production server
npm run lint    # lint with Next.js config
npm run test:e2e  # Playwright tests
```

## Notes for contributors
- App uses the App Router; UI lives in `src/app`, not `pages`.
- API routes sit under `src/app/api`, including the client proxy at `api/client/hunts/[huntId]`.
- Styling leans on global CSS plus Tailwind; prefer existing tokens/variables in `globals.css`.
- Proximity/map components expose imperative APIs via refs; check `ProximityComponent` and `MapContainer` before adding new stages.
