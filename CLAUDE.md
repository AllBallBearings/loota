# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **Loota** - an augmented reality treasure hunt application with two main components:

1. **Legacy HTML/JS frontend** (`legacy-pages/`) - Original implementation
2. **Next.js application** (`loota-nextjs/`) - Current main application

The active development happens in the `loota-nextjs/` directory.

## Key Commands

All commands should be run from the `loota-nextjs/` directory:

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production (includes Prisma generation)
npm start           # Start production server
npm run lint        # Run ESLint

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run database migrations
npx prisma studio   # Open database browser
```

## Architecture Overview

**Core Application Type**: Next.js 15 App Router with TypeScript, Tailwind CSS, and Prisma ORM

### Code Commits

- Don't co-author with Claude or Claude-Code
- Before committing any changes, ensure:

1. Code passes linting (`npm run lint`)
2. Build completes successfully (`npm run build`)
3. New features have corresponding tests written

**Database**: PostgreSQL with Prisma ORM

- User management with device ID tracking
- Hunt creation and participation
- Pin collection system with geolocation and proximity modes

**Main Features**:

- **Geolocation Hunt**: Map-based treasure hunts using Google Maps API
- **Proximity Hunt**: Relative positioning treasure hunts
- **Universal Links**: iOS app integration via `apple-app-site-association`
- **API Documentation**: Swagger UI available at `/swagger`

## Key Components

### Database Models (Prisma)

- `User`: Stores user data including phone, PayPal ID, and iOS device ID
- `Hunt`: Main hunt entity with type ('geolocation' or 'proximity'), creator, and winner
- `Pin`: Treasure locations with different data based on hunt type
- `HuntParticipation`: Many-to-many relationship between users and hunts

### Frontend Components

- `MapComponent`: Google Maps integration for geolocation hunts
- `ProximityComponent`: Relative positioning interface for proximity hunts
- `MapContainer`/`ProximityContainer`: Hunt viewing containers
- `UniversalLinkGenerator`: iOS deep linking functionality

### API Routes

- `/api/hunts`: CRUD operations for hunts
- `/api/hunts/[huntId]`: Individual hunt management
- `/api/hunts/[huntId]/participants`: User participation
- `/api/hunts/[huntId]/pins/[pinId]/collect`: Pin collection
- `/api/users`: User management and registration
- `/api/universal-link`: iOS universal link handling

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `API_KEY_SECRET`: API authentication secret
- `NEXT_PUBLIC_API_KEY_SECRET`: Public API key for client-side requests

## Development Notes

- The application uses `forwardRef` pattern extensively for component interaction
- Google Maps integration requires proper API key configuration
- Database migrations are in `prisma/migrations/`
- Universal links are configured for iOS app integration
- All API endpoints include Swagger documentation comments
- The app uses Turbopack for fast development builds

## Testing Requirements

- **Write tests for all new features** unless explicitly told not to
- **Run tests before committing** to ensure code quality and functionality
- Tests should cover both happy path and edge cases for new functionality

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
