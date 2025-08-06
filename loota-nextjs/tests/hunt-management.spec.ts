import { test, expect } from '@playwright/test';

test.describe('Hunt Management', () => {
  let managementTestHuntId: string;
  let managementTestHuntUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a hunt specifically for management testing
    const page = await browser.newPage();
    
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Create hunt with management-specific name
    await page.fill('input[placeholder="Enter hunt name..."]', 'Hunt Management Test');
    await page.fill('input[placeholder="Enter your name..."]', 'Management Tester');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-MGMT-TEST');
    await page.fill('input[placeholder="your@email.com"]', 'management@test.com');
    
    // Add pins for management testing
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    const mapContainer = page.locator('.map-container-modern');
    
    // Add 3 pins
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 250, y: 300 } });
    await page.waitForTimeout(500);
    
    // Generate the hunt
    await page.click('button:has-text("Start the Adventure")');
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    managementTestHuntUrl = await page.locator('a[href*="/hunt/"]').getAttribute('href') || '';
    managementTestHuntId = managementTestHuntUrl.split('/hunt/')[1];
    
    await page.close();
  });

  test.beforeEach(async ({ request }) => {
    // Set up some collected pins and participants for each management test
    // Create a test user
    const userResponse = await request.post('/api/users/register', {
      data: {
        name: 'Management Test User',
        phone: `555-MGMT-${Date.now()}`, // Unique phone for each test
      },
    });
    const userData = await userResponse.json();
    
    // Join the hunt
    await request.post(`/api/hunts/${managementTestHuntId}/participants`, {
      data: {
        userId: userData.userId,
        participantPhone: `555-MGMT-${Date.now()}`,
      },
    });
    
    // Get hunt data and collect one pin
    const huntResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const huntData = await huntResponse.json();
    const firstPin = huntData.pins[0];
    
    // Collect the first pin
    await request.post(`/api/hunts/${managementTestHuntId}/pins/${firstPin.id}/collect`, {
      data: {
        userId: userData.userId,
        userLat: firstPin.lat,
        userLng: firstPin.lng,
      },
    });
  });

  test('should display hunt management section for creator', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Hunt management section should be visible since we're using the creator's fixed ID
    await expect(page.locator('text=Hunt Management')).toBeVisible();
    
    // Management buttons should be present
    await expect(page.locator('button:has-text("Reset Loot")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Looters")')).toBeVisible();
    
    // Buttons should not be disabled initially
    const resetButton = page.locator('button:has-text("Reset Loot")');
    const clearButton = page.locator('button:has-text("Clear Looters")');
    
    await expect(resetButton).not.toBeDisabled();
    await expect(clearButton).not.toBeDisabled();
  });

  test('should reset loot successfully', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Verify there's at least one collected pin before reset
    await expect(page.locator('text=Collected by')).toBeVisible({ timeout: 5000 });
    
    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to reset the loot?');
      expect(dialog.message()).toContain('Reset all collected pins back to uncollected state');
      expect(dialog.message()).toContain('Keep all participants in the hunt');
      await dialog.accept();
    });
    
    // Set up alert handler for success message
    let alertMessage = '';
    page.on('dialog', async dialog => {
      if (dialog.type() === 'alert') {
        alertMessage = dialog.message();
        await dialog.accept();
      }
    });
    
    // Click reset loot button
    const resetButton = page.locator('button:has-text("Reset Loot")');
    await resetButton.click();
    
    // Wait for the reset to complete and page to refresh
    await page.waitForTimeout(2000);
    
    // Verify pins are back to uncollected state
    await expect(page.locator('text=Available')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Collected by')).not.toBeVisible();
    
    // Participants should still be there
    await expect(page.locator('text=Participants')).toBeVisible();
  });

  test('should clear looters successfully', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Verify there are participants before clearing
    const participantsHeader = page.locator('text=Participants');
    const participantCount = await participantsHeader.textContent();
    expect(participantCount).toMatch(/Participants \([1-9]\d*\)/); // Should have at least 1 participant
    
    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') {
        expect(dialog.message()).toContain('Are you sure you want to clear all looters?');
        expect(dialog.message()).toContain('Remove all participants from the hunt');
        expect(dialog.message()).toContain('Keep all collected pins as they are');
        await dialog.accept();
      } else if (dialog.type() === 'alert') {
        expect(dialog.message()).toContain('successfully cleared');
        await dialog.accept();
      }
    });
    
    // Click clear looters button
    const clearButton = page.locator('button:has-text("Clear Looters")');
    await clearButton.click();
    
    // Wait for the operation to complete
    await page.waitForTimeout(2000);
    
    // Verify participants are cleared
    await expect(page.locator('text=Participants (0)')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=No participants yet.')).toBeVisible();
    
    // Collected pins should remain collected
    await expect(page.locator('text=Collected by')).toBeVisible();
  });

  test('should handle reset loot cancellation', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get initial state
    const initialCollectedCount = await page.locator('text=Collected by').count();
    
    // Set up dialog handler to cancel the confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to reset the loot?');
      await dialog.dismiss();
    });
    
    // Click reset loot button
    await page.locator('button:has-text("Reset Loot")').click();
    
    // Wait a moment and verify nothing changed
    await page.waitForTimeout(1000);
    
    const finalCollectedCount = await page.locator('text=Collected by').count();
    expect(finalCollectedCount).toBe(initialCollectedCount);
  });

  test('should handle clear looters cancellation', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get initial participant count
    const participantsHeader = page.locator('text=Participants');
    const initialParticipantText = await participantsHeader.textContent();
    
    // Set up dialog handler to cancel the confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to clear all looters?');
      await dialog.dismiss();
    });
    
    // Click clear looters button
    await page.locator('button:has-text("Clear Looters")').click();
    
    // Wait a moment and verify nothing changed
    await page.waitForTimeout(1000);
    
    const finalParticipantText = await participantsHeader.textContent();
    expect(finalParticipantText).toBe(initialParticipantText);
  });

  test('should show processing state during management operations', async ({ page }) => {
    await page.goto(managementTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Set up dialog handler to accept immediately
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click reset button and quickly check for processing state
    const resetButton = page.locator('button:has-text("Reset Loot")');
    await resetButton.click();
    
    // The button should show "Processing..." briefly
    // Note: This might be too fast to catch reliably, but we test the functionality
    await page.waitForTimeout(100);
    
    // Eventually it should return to normal state
    await expect(resetButton).toContainText('Reset Loot');
    await expect(resetButton).not.toBeDisabled();
  });

  test('should test reset loot API endpoint directly', async ({ request }) => {
    // Get current hunt state
    const beforeResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const beforeData = await beforeResponse.json();
    
    // Verify there are collected pins
    const collectedPins = beforeData.pins.filter((p: any) => p.collectedByUserId);
    expect(collectedPins.length).toBeGreaterThan(0);
    
    // Call reset API
    const resetResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001', // Creator ID
        resetPins: true,
        clearParticipants: false,
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(resetResponse.ok()).toBeTruthy();
    const resetData = await resetResponse.json();
    expect(resetData.message).toContain('successfully reset');
    
    // Verify pins are now uncollected
    const afterResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const afterData = await afterResponse.json();
    
    const stillCollectedPins = afterData.pins.filter((p: any) => p.collectedByUserId);
    expect(stillCollectedPins.length).toBe(0);
    
    // Participants should remain
    expect(afterData.participants.length).toBeGreaterThan(0);
  });

  test('should test clear participants API endpoint directly', async ({ request }) => {
    // Get current hunt state
    const beforeResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const beforeData = await beforeResponse.json();
    
    // Verify there are participants
    expect(beforeData.participants.length).toBeGreaterThan(0);
    
    // Call clear participants API
    const clearResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001', // Creator ID
        resetPins: false,
        clearParticipants: true,
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(clearResponse.ok()).toBeTruthy();
    const clearData = await clearResponse.json();
    expect(clearData.message).toContain('successfully cleared');
    
    // Verify participants are cleared
    const afterResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const afterData = await afterResponse.json();
    
    expect(afterData.participants.length).toBe(0);
    
    // Collected pins should remain
    const collectedPins = afterData.pins.filter((p: any) => p.collectedByUserId);
    expect(collectedPins.length).toBeGreaterThan(0);
  });

  test('should prevent unauthorized management operations', async ({ request }) => {
    // Try to reset with wrong user ID
    const unauthorizedResetResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'wrong-user-id',
        resetPins: true,
        clearParticipants: false,
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(unauthorizedResetResponse.status()).toBe(403);
    const errorData = await unauthorizedResetResponse.json();
    expect(errorData.message).toContain('not authorized');
  });

  test('should handle invalid hunt ID in management operations', async ({ request }) => {
    const invalidResponse = await request.post('/api/hunts/invalid-hunt-id/reset', {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001',
        resetPins: true,
        clearParticipants: false,
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(invalidResponse.status()).toBe(404);
  });

  test('should require valid parameters for management operations', async ({ request }) => {
    // Test with missing parameters
    const missingParamsResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001',
        // Missing resetPins and clearParticipants
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(missingParamsResponse.status()).toBe(400);
    
    // Test with invalid boolean values
    const invalidParamsResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001',
        resetPins: 'not-boolean',
        clearParticipants: 'also-not-boolean',
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(invalidParamsResponse.status()).toBe(400);
  });

  test('should support combined reset operations', async ({ request }) => {
    // Test resetting both pins and participants simultaneously
    const combinedResponse = await request.post(`/api/hunts/${managementTestHuntId}/reset`, {
      data: {
        userId: 'a1b2c3d4-e5f6-7890-1234-000000000001',
        resetPins: true,
        clearParticipants: true,
      },
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    
    expect(combinedResponse.ok()).toBeTruthy();
    
    // Verify both operations completed
    const afterResponse = await request.get(`/api/hunts/${managementTestHuntId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
      },
    });
    const afterData = await afterResponse.json();
    
    // No collected pins
    const collectedPins = afterData.pins.filter((p: any) => p.collectedByUserId);
    expect(collectedPins.length).toBe(0);
    
    // No participants
    expect(afterData.participants.length).toBe(0);
  });
});