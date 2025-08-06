# End-to-End Test Suite for Loota

This directory contains comprehensive end-to-end tests for the Loota treasure hunt application using Playwright.

## Test Files

### Core Functionality Tests

1. **hunt-creation.spec.ts** - Tests for creating hunts
   - Geolocation hunt creation
   - Proximity hunt creation
   - Form validation
   - Contact information handling
   - Hunt type switching
   - Error handling

2. **hunt-participation.spec.ts** - Tests for viewing and participating in hunts
   - Hunt information display
   - Responsive layouts (mobile/desktop)
   - Share functionality
   - Map and proximity interfaces
   - Error states and loading
   - Polling for updates

3. **pin-collection.spec.ts** - Tests for pin collection mechanics
   - Successful pin collection via API
   - UI updates for collected pins
   - Double collection prevention
   - Proximity validation
   - Hunt completion detection
   - Timestamp tracking

4. **hunt-management.spec.ts** - Tests for hunt creator management
   - Reset loot functionality
   - Clear participants functionality
   - Authorization checks
   - Confirmation dialogs
   - Processing states
   - Combined operations

5. **universal-links.spec.ts** - Tests for iOS universal links and sharing
   - Share section expansion/collapse
   - iOS link generation
   - Apple app site association files
   - Copy functionality
   - Device-specific behavior
   - Error handling

6. **api-endpoints.spec.ts** - Direct API endpoint testing
   - User registration and management
   - Hunt creation and retrieval
   - Participant management
   - Pin collection endpoints
   - Hunt reset operations
   - Error handling and validation

7. **hunt-layout.spec.ts** - Layout and responsive design tests (existing)
   - Desktop side-by-side layout
   - Mobile stacked layout
   - Layout switching

### Utility Files

8. **test-utils.ts** - Helper functions and utilities
   - Common test data generation
   - Hunt creation helpers
   - User management helpers
   - Custom assertions
   - Test constants

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/hunt-creation.spec.ts
```

### With UI
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npx playwright test --debug tests/hunt-creation.spec.ts
```

## Test Environment Setup

### Prerequisites
1. Development server must be running (`npm run dev`)
2. Database must be accessible and migrated (`npx prisma migrate dev`)
3. Environment variables must be configured:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `API_KEY_SECRET`
   - `NEXT_PUBLIC_API_KEY_SECRET`

### Test Data
Tests create their own test data to avoid conflicts:
- Unique phone numbers using timestamps
- Unique hunt names
- Isolated test hunts for each test suite

## Test Coverage

### Frontend Features
- ✅ Hunt creation (both geolocation and proximity)
- ✅ Hunt viewing and participation
- ✅ Pin collection interface
- ✅ Hunt management (reset/clear)
- ✅ Responsive layouts
- ✅ Universal link sharing
- ✅ Form validation
- ✅ Error states and loading

### Backend Features
- ✅ User registration and management
- ✅ Hunt CRUD operations
- ✅ Pin collection logic
- ✅ Proximity validation
- ✅ Participant management
- ✅ Hunt reset operations
- ✅ API authentication
- ✅ Input validation
- ✅ Error handling

### Integration Tests
- ✅ End-to-end hunt creation flow
- ✅ Complete pin collection workflow
- ✅ Hunt management operations
- ✅ Multi-user scenarios
- ✅ Real-time updates (polling)
- ✅ Cross-browser compatibility (via Playwright)

## Test Philosophy

1. **Realistic User Flows** - Tests simulate actual user behavior
2. **Independent Tests** - Each test creates its own data
3. **Comprehensive Coverage** - Tests cover happy paths, edge cases, and error conditions
4. **API + UI Testing** - Tests both frontend interactions and backend APIs
5. **Responsive Testing** - Validates mobile and desktop experiences
6. **Error Resilience** - Tests error handling and recovery

## Debugging Failed Tests

1. **Check Development Server** - Ensure `npm run dev` is running
2. **Database Connection** - Verify database is accessible
3. **Environment Variables** - Confirm all required env vars are set
4. **Google Maps API** - Check if API key is valid (for map tests)
5. **Run with --headed** - See tests run in browser for visual debugging
6. **Use test.only()** - Isolate specific failing tests

## Adding New Tests

1. Follow the existing pattern of test organization
2. Use `test-utils.ts` helpers for common operations
3. Create independent test data for each test
4. Test both positive and negative scenarios
5. Include appropriate timeouts and waits
6. Document complex test scenarios

## Browser Support

Tests run against:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Android simulation)
- Mobile Safari (iOS simulation)

This ensures cross-browser compatibility for the Loota application.