# Repository Guidelines

## Project Structure & Module Organization
This repo is a Next.js 15 App Router app with a legacy frontend kept for reference.

- `src/app/` holds routes, layouts, and API handlers under `src/app/api/`.
- `src/components/` contains reusable UI (maps, proximity views, controls).
- `src/lib/` is shared utilities and helpers.
- `prisma/` includes the schema and migrations.
- `tests/` contains Playwright end-to-end specs.
- `public/` stores static assets.
- `Legacy-Pages/` is the legacy HTML/JS frontend (avoid unless fixing legacy AR view).

## Build, Test, and Development Commands
Run all commands from the repo root.

- `npm install` installs dependencies.
- `npm run dev` starts the dev server with Turbopack at `http://localhost:3000`.
- `npm run build` runs `prisma generate` then `next build`.
- `npm run start` runs the production server from the build output.
- `npm run lint` runs Next.js ESLint rules.
- `npm run test:e2e` runs Playwright tests.
- `npm run test:e2e:ui` opens Playwright UI mode.
- `npx prisma migrate dev` applies local database migrations when schema changes.

## Coding Style & Naming Conventions
- TypeScript everywhere; use `.tsx` for React components and `.ts` for utilities.
- 2-space indentation and double quotes are the local norm.
- Component names are PascalCase (e.g., `MapContainer.tsx`); functions/vars use camelCase.
- Prefer existing Tailwind tokens and patterns in `src/app/globals.css`.
- Lint with `npm run lint` before committing changes.

## Testing Guidelines
- Playwright is the primary test framework; specs live in `tests/*.spec.ts`.
- Add or update E2E coverage for new features and important edge cases.
- Run `npm run test:e2e` before opening a PR when changes affect user flows.

## Commit & Pull Request Guidelines
- Commit history favors short, direct messages (e.g., "fix route", "Fix hunt complete banner cutoff...").
- Keep commits focused and avoid unrelated changes.
- PRs should include a clear summary, linked issue (if any), and testing notes.
- Include screenshots or short clips for UI changes.

## Configuration & Secrets
- Create `.env.local` at the repo root for local dev.
- Common keys: `DATABASE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `API_KEY_SECRET`, `NEXT_PUBLIC_API_KEY_SECRET`.
- Never commit secrets; use local overrides only.
