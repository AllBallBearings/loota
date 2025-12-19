# System Patterns

The project follows a Next.js API route pattern for backend functionality, with `src/app/api` containing various endpoints for hunts, users, and universal links. Prisma is used as the ORM, with `prisma/schema.prisma` defining the database schema and migrations managed in `prisma/migrations`. Frontend components related to mapping and proximity (`MapComponent.tsx`, `ProximityComponent.tsx`) suggest a modular approach to UI development. Universal links are handled via `src/app/api/universal-link/route.ts` and `public/apple-app-site-association`.
