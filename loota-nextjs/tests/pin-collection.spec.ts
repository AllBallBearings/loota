import { test, expect } from '@playwright/test';

test.describe('Pin Collection Functionality', () => {
  let testHuntId: string;
  let testHuntUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test hunt for pin collection tests
    const page = await browser.newPage();
    
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Create a geolocation hunt with multiple pins
    await page.fill('input[placeholder="Enter hunt name..."]', 'Pin Collection Test Hunt');
    await page.fill('input[placeholder="Enter your name..."]', 'Collection Tester');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-COLLECT-PIN');
    await page.fill('input[placeholder="your@email.com"]', 'collect@test.com');
    
    // Add multiple pins for collection testing
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    const mapContainer = page.locator('.map-container-modern');
    
    // Add 4 test pins
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 200, y: 300 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Generate the hunt
    await page.click('button:has-text("Start the Adventure")');
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    // Extract hunt ID and URL
    testHuntUrl = await page.locator('a[href*="/hunt/"]').getAttribute('href') || '';
    testHuntId = testHuntUrl.split('/hunt/')[1];
    
    await page.close();
  });

  test('should collect a pin successfully via API', async ({ request, page }) => {
    // First, get the hunt data to find pin IDs
    const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    expect(huntResponse.ok()).toBeTruthy();
    
    const huntData = await huntResponse.json();
    const firstPin = huntData.pins[0];
    expect(firstPin).toBeDefined();
    
    // Register a test user first
    const userResponse = await request.post('/api/users/register', {
      data: {
        name: 'Test Collector',
        phone: '555-TEST-COLLECT',
      },
    });
    expect(userResponse.ok()).toBeTruthy();
    
    const userData = await userResponse.json();
    const userId = userData.userId;
    
    // Join the hunt as a participant
    const participationResponse = await request.post(`/api/hunts/${testHuntId}/participants`, {
      data: {
        userId: userId,
        participantPhone: '555-TEST-COLLECT',
      },
    });
    expect(participationResponse.ok()).toBeTruthy();
    
    // Now collect the first pin
    const collectResponse = await request.post(`/api/hunts/${testHuntId}/pins/${firstPin.id}/collect`, {
      data: {
        userId: userId,
        userLat: firstPin.lat,
        userLng: firstPin.lng,
      },
    });
    expect(collectResponse.ok()).toBeTruthy();
    
    const collectData = await collectResponse.json();
    expect(collectData.message).toContain('collected successfully');
    
    // Verify the pin is now collected
    const updatedHuntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    const updatedHuntData = await updatedHuntResponse.json();
    const collectedPin = updatedHuntData.pins.find((p: any) => p.id === firstPin.id);
    
    expect(collectedPin.collectedByUserId).toBe(userId);
    expect(collectedPin.collectedByUser.name).toBe('Test Collector');
    expect(collectedPin.collectedAt).toBeDefined();
  });

  test('should show collected pins in UI', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check that at least one pin shows as collected
    await expect(page.locator('text=Collected by')).toBeVisible({ timeout: 5000 });
    
    // Check that collected pins show collector information
    const collectedPinCard = page.locator('.card').filter({ hasText: 'Collected by' }).first();
    await expect(collectedPinCard).toContainText('Test Collector');
    await expect(collectedPinCard).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
  });

  test('should prevent double collection of same pin', async ({ request }) => {
    // Get hunt data
    const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const collectedPin = huntData.pins.find((p: any) => p.collectedByUserId);
    
    if (!collectedPin) {
      test.skip('No collected pin found for double collection test');
    }
    
    // Try to collect the same pin again with a different user
    const newUserResponse = await request.post('/api/users/register', {
      data: {
        name: 'Second Collector',
        phone: '555-SECOND-COLLECT',
      },
    });
    const newUserData = await newUserResponse.json();
    
    // Join the hunt
    await request.post(`/api/hunts/${testHuntId}/participants`, {
      data: {
        userId: newUserData.userId,
        participantPhone: '555-SECOND-COLLECT',
      },
    });
    
    // Try to collect already collected pin
    const doubleCollectResponse = await request.post(`/api/hunts/${testHuntId}/pins/${collectedPin.id}/collect`, {
      data: {
        userId: newUserData.userId,
        userLat: collectedPin.lat,
        userLng: collectedPin.lng,
      },
    });
    
    expect(doubleCollectResponse.status()).toBe(400);
    const errorData = await doubleCollectResponse.json();
    expect(errorData.message).toContain('already been collected');
  });

  test('should require user participation before pin collection', async ({ request }) => {
    // Create a new user who hasn't joined the hunt
    const nonParticipantResponse = await request.post('/api/users/register', {
      data: {
        name: 'Non Participant',
        phone: '555-NON-PARTICIPANT',
      },
    });
    const nonParticipantData = await nonParticipantResponse.json();
    
    // Get an uncollected pin
    const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const uncollectedPin = huntData.pins.find((p: any) => !p.collectedByUserId);
    
    if (!uncollectedPin) {
      test.skip('No uncollected pin found for participation test');
    }
    
    // Try to collect pin without being a participant
    const unauthorizedCollectResponse = await request.post(`/api/hunts/${testHuntId}/pins/${uncollectedPin.id}/collect`, {
      data: {
        userId: nonParticipantData.userId,
        userLat: uncollectedPin.lat,
        userLng: uncollectedPin.lng,
      },
    });
    
    expect(unauthorizedCollectResponse.status()).toBe(403);
    const errorData = await unauthorizedCollectResponse.json();
    expect(errorData.message).toContain('not a participant');
  });

  test('should validate proximity for pin collection', async ({ request }) => {
    // Get hunt and user data
    const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const uncollectedPin = huntData.pins.find((p: any) => !p.collectedByUserId);
    
    if (!uncollectedPin) {
      test.skip('No uncollected pin found for proximity test');
    }
    
    // Create a user and join the hunt
    const proximityUserResponse = await request.post('/api/users/register', {
      data: {
        name: 'Proximity Tester',
        phone: '555-PROXIMITY-TEST',
      },
    });
    const proximityUserData = await proximityUserResponse.json();
    
    await request.post(`/api/hunts/${testHuntId}/participants`, {
      data: {
        userId: proximityUserData.userId,
        participantPhone: '555-PROXIMITY-TEST',
      },
    });
    
    // Try to collect pin from far away (coordinates that are definitely not within proximity)
    const farAwayResponse = await request.post(`/api/hunts/${testHuntId}/pins/${uncollectedPin.id}/collect`, {
      data: {
        userId: proximityUserData.userId,
        userLat: uncollectedPin.lat + 1, // 1 degree away (very far)
        userLng: uncollectedPin.lng + 1,
      },
    });
    
    expect(farAwayResponse.status()).toBe(400);
    const errorData = await farAwayResponse.json();
    expect(errorData.message).toContain('too far');
  });

  test('should show completion state when all pins collected', async ({ request, page }) => {
    // Collect all remaining pins
    const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const uncollectedPins = huntData.pins.filter((p: any) => !p.collectedByUserId);
    
    // Create collector for remaining pins
    const finalCollectorResponse = await request.post('/api/users/register', {
      data: {
        name: 'Final Collector',
        phone: '555-FINAL-COLLECT',
      },
    });
    const finalCollectorData = await finalCollectorResponse.json();
    
    await request.post(`/api/hunts/${testHuntId}/participants`, {
      data: {
        userId: finalCollectorData.userId,
        participantPhone: '555-FINAL-COLLECT',
      },
    });
    
    // Collect all remaining pins
    for (const pin of uncollectedPins) {
      await request.post(`/api/hunts/${testHuntId}/pins/${pin.id}/collect`, {
        data: {
          userId: finalCollectorData.userId,
          userLat: pin.lat,
          userLng: pin.lng,
        },
      });
    }
    
    // Now check the UI shows completion
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Should show completion message
    await expect(page.locator('text=Everything\'s Looted!!!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=The hunt is complete')).toBeVisible();
    await expect(page.locator('text=Winners & Their Loot')).toBeVisible();
    
    // Should show collector information in the winners section
    await expect(page.locator('text=Test Collector')).toBeVisible();
    await expect(page.locator('text=Final Collector')).toBeVisible();
  });

  test('should handle invalid pin collection requests', async ({ request }) => {
    // Test with invalid hunt ID
    const invalidHuntResponse = await request.post('/api/hunts/invalid-hunt-id/pins/invalid-pin-id/collect', {
      data: {
        userId: 'test-user',
        userLat: 0,
        userLng: 0,
      },
    });
    expect(invalidHuntResponse.status()).toBe(404);
    
    // Test with missing required data
    const missingDataResponse = await request.post(`/api/hunts/${testHuntId}/pins/invalid-pin/collect`, {
      data: {
        userId: 'test-user',
        // Missing userLat and userLng
      },
    });
    expect(missingDataResponse.status()).toBe(400);
  });

  test('should track collection timestamps correctly', async ({ request }) => {
    const beforeCollection = new Date();
    
    // Get an uncollected pin (create new hunt if needed)
    const newHuntPage = await (await request.newContext()).newPage();
    await newHuntPage.goto('/');
    await newHuntPage.waitForSelector('h1');
    
    // Quick hunt creation for timestamp test
    await newHuntPage.fill('input[placeholder="Enter hunt name..."]', 'Timestamp Test Hunt');
    await newHuntPage.fill('input[placeholder="Enter your name..."]', 'Timestamp Tester');
    await newHuntPage.fill('input[placeholder="(555) 123-4567"]', '555-TIME-TEST');
    await newHuntPage.fill('input[placeholder="your@email.com"]', 'time@test.com');
    
    await newHuntPage.waitForSelector('.map-container-modern', { timeout: 15000 });
    await newHuntPage.locator('.map-container-modern').click({ position: { x: 200, y: 200 } });
    await newHuntPage.waitForTimeout(500);
    
    await newHuntPage.click('button:has-text("Start the Adventure")');
    await expect(newHuntPage.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    const newHuntUrl = await newHuntPage.locator('a[href*="/hunt/"]').getAttribute('href') || '';
    const newHuntId = newHuntUrl.split('/hunt/')[1];
    await newHuntPage.close();
    
    // Get the pin
    const huntResponse = await request.get(`/api/hunts/${newHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const pin = huntData.pins[0];
    
    // Create user and join hunt
    const timestampUserResponse = await request.post('/api/users/register', {
      data: {
        name: 'Timestamp User',
        phone: '555-TIMESTAMP',
      },
    });
    const timestampUserData = await timestampUserResponse.json();
    
    await request.post(`/api/hunts/${newHuntId}/participants`, {
      data: {
        userId: timestampUserData.userId,
        participantPhone: '555-TIMESTAMP',
      },
    });
    
    // Collect the pin
    const collectResponse = await request.post(`/api/hunts/${newHuntId}/pins/${pin.id}/collect`, {
      data: {
        userId: timestampUserData.userId,
        userLat: pin.lat,
        userLng: pin.lng,
      },
    });
    expect(collectResponse.ok()).toBeTruthy();
    
    const afterCollection = new Date();
    
    // Verify timestamp is within reasonable range
    const updatedHuntResponse = await request.get(`/api/hunts/${newHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const updatedHuntData = await updatedHuntResponse.json();
    const collectedPin = updatedHuntData.pins.find((p: any) => p.id === pin.id);
    
    const collectedAt = new Date(collectedPin.collectedAt);
    expect(collectedAt.getTime()).toBeGreaterThanOrEqual(beforeCollection.getTime());
    expect(collectedAt.getTime()).toBeLessThanOrEqual(afterCollection.getTime());
  });
});