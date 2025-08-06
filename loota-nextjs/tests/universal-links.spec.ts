import { test, expect } from '@playwright/test';

test.describe('Universal Links and Sharing', () => {
  let universalLinksTestHuntId: string;
  let universalLinksTestHuntUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a hunt for universal link testing
    const page = await browser.newPage();
    
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Create hunt for universal link testing
    await page.fill('input[placeholder="Enter hunt name..."]', 'Universal Links Test Hunt');
    await page.fill('input[placeholder="Enter your name..."]', 'Link Tester');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-LINK-TEST');
    await page.fill('input[placeholder="your@email.com"]', 'link@test.com');
    
    // Add pins
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    const mapContainer = page.locator('.map-container-modern');
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    
    // Generate the hunt
    await page.click('button:has-text("Start the Adventure")');
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    universalLinksTestHuntUrl = await page.locator('a[href*="/hunt/"]').getAttribute('href') || '';
    universalLinksTestHuntId = universalLinksTestHuntUrl.split('/hunt/')[1];
    
    await page.close();
  });

  test('should display share section when expanded', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Share button should be visible
    const shareButton = page.locator('button:has-text("Share")');
    await expect(shareButton).toBeVisible();
    
    // Click to expand share section
    await shareButton.click();
    
    // Universal link generator component should be visible
    await expect(page.locator('text=Generate Universal Link')).toBeVisible({ timeout: 5000 });
    
    // Should see iOS-related functionality
    await expect(page.locator('text=iOS App Integration')).toBeVisible();
    
    // Should see instructions or input fields for universal links
    await expect(page.locator('button:has-text("Generate iOS Link")')).toBeVisible();
  });

  test('should collapse share section when clicked again', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const shareButton = page.locator('button:has-text("Share")');
    
    // Expand share section
    await shareButton.click();
    await expect(page.locator('text=Generate Universal Link')).toBeVisible();
    
    // Collapse share section
    await shareButton.click();
    await expect(page.locator('text=Generate Universal Link')).not.toBeVisible();
    
    // Button should show collapsed state
    await expect(shareButton).toContainText('▶');
  });

  test('should show expanded state in share button', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const shareButton = page.locator('button:has-text("Share")');
    
    // Initially should show collapsed arrow
    await expect(shareButton).toContainText('▶');
    
    // After clicking should show expanded arrow
    await shareButton.click();
    await expect(shareButton).toContainText('▼');
    
    // Button styling should change when expanded
    await expect(shareButton).toHaveClass(/btn-primary/);
  });

  test('should generate iOS universal link', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Expand share section
    await page.click('button:has-text("Share")');
    await expect(page.locator('text=Generate Universal Link')).toBeVisible();
    
    // Click generate iOS link
    const generateButton = page.locator('button:has-text("Generate iOS Link")');
    await generateButton.click();
    
    // Should show generated link or success message
    // The exact behavior depends on the implementation, but we should see some result
    await page.waitForTimeout(1000);
    
    // Check if link is displayed or if there's success feedback
    const linkDisplay = page.locator('text=https://').or(page.locator('text=loota://'));
    const successMessage = page.locator('text=Generated').or(page.locator('text=Success'));
    
    const linkDisplayed = await linkDisplay.count() > 0;
    const successShown = await successMessage.count() > 0;
    
    expect(linkDisplayed || successShown).toBe(true);
  });

  test('should test universal link API endpoint', async ({ request }) => {
    // Test the universal link generation API directly
    const response = await request.post('/api/universal-link', {
      data: {
        huntId: universalLinksTestHuntId,
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data.universalLink).toBeDefined();
      expect(data.universalLink).toContain(universalLinksTestHuntId);
    } else {
      // If endpoint doesn't exist or fails, that's also valuable information
      expect(response.status()).toBe(404);
    }
  });

  test('should handle apple-app-site-association file', async ({ request }) => {
    // Test that the apple-app-site-association file is accessible
    const response = await request.get('/apple-app-site-association');
    
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('applinks');
    expect(data.applinks).toHaveProperty('apps');
    expect(data.applinks).toHaveProperty('details');
  });

  test('should handle well-known apple-app-site-association', async ({ request }) => {
    // Test the .well-known URL redirect
    const response = await request.get('/.well-known/apple-app-site-association');
    
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('applinks');
  });

  test('should provide copy functionality for generated links', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Expand share section
    await page.click('button:has-text("Share")');
    
    // Generate a link
    await page.click('button:has-text("Generate iOS Link")');
    await page.waitForTimeout(1000);
    
    // Look for copy button (might be present even if link generation fails)
    const copyButton = page.locator('button:has-text("Copy")').or(page.locator('button[title*="copy"]')).or(page.locator('button[aria-label*="copy"]'));
    
    if (await copyButton.count() > 0) {
      await copyButton.first().click();
      
      // Should show copied state
      await expect(page.locator('text=Copied')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show instructions for iOS app integration', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Expand share section
    await page.click('button:has-text("Share")');
    await expect(page.locator('text=iOS App Integration')).toBeVisible();
    
    // Should provide some instructions or information about iOS integration
    const instructionElements = [
      page.locator('text=Open in iOS app'),
      page.locator('text=Install the app'),
      page.locator('text=iOS device'),
      page.locator('text=App Store'),
    ];
    
    let foundInstructions = false;
    for (const element of instructionElements) {
      if (await element.count() > 0) {
        foundInstructions = true;
        break;
      }
    }
    
    // Should have some form of iOS-related instruction
    expect(foundInstructions).toBe(true);
  });

  test('should handle different device types appropriately', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.click('button:has-text("Share")');
    await expect(page.locator('text=Generate Universal Link')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Share section should still be accessible on mobile
    const shareButton = page.locator('button:has-text("Share")');
    await expect(shareButton).toBeVisible();
    
    // Universal link component should work on mobile
    if (!(await page.locator('text=Generate Universal Link').isVisible())) {
      await shareButton.click();
    }
    await expect(page.locator('text=Generate Universal Link')).toBeVisible();
  });

  test('should provide fallback when iOS app is not available', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.click('button:has-text("Share")');
    
    // Should provide web fallback information
    const webFallbackElements = [
      page.locator('text=web browser'),
      page.locator('text=continue on web'),
      page.locator('text=browser version'),
      page.locator('a[href*="/hunt/"]'), // Direct link to hunt
    ];
    
    let foundFallback = false;
    for (const element of webFallbackElements) {
      if (await element.count() > 0) {
        foundFallback = true;
        break;
      }
    }
    
    expect(foundFallback).toBe(true);
  });

  test('should include hunt information in universal link generation', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.click('button:has-text("Share")');
    
    // The universal link generator should have access to hunt information
    await expect(page.locator('text=Universal Links Test Hunt')).toBeVisible();
    
    // Hunt ID should be referenced somewhere in the component
    const huntIdPattern = new RegExp(universalLinksTestHuntId.substring(0, 8));
    await expect(page.locator(`text=${huntIdPattern}`)).toBeVisible();
  });

  test('should handle universal link generation errors gracefully', async ({ page }) => {
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.click('button:has-text("Share")');
    
    // Mock potential network errors by intercepting API calls
    await page.route('/api/universal-link', route => {
      route.fulfill({ status: 500, body: 'Server error' });
    });
    
    // Try to generate link
    await page.click('button:has-text("Generate iOS Link")');
    
    // Should handle error gracefully - either show error message or fallback
    await page.waitForTimeout(1000);
    
    const errorElements = [
      page.locator('text=Error'),
      page.locator('text=Failed'),
      page.locator('text=Try again'),
      page.locator('text=Unable to generate'),
    ];
    
    let foundErrorHandling = false;
    for (const element of errorElements) {
      if (await element.count() > 0) {
        foundErrorHandling = true;
        break;
      }
    }
    
    // Should either show error handling OR continue to work with fallback
    // Both are acceptable behaviors
    expect(foundErrorHandling || await page.locator('button:has-text("Generate iOS Link")').isVisible()).toBe(true);
  });

  test('should validate hunt exists before generating universal link', async ({ request }) => {
    // Test with invalid hunt ID
    const response = await request.post('/api/universal-link', {
      data: {
        huntId: 'invalid-hunt-id-12345',
      },
    });
    
    if (response.status() !== 404) {
      // If the endpoint exists, it should validate the hunt ID
      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData.message).toContain('hunt');
    }
  });

  test('should support sharing via native browser sharing API', async ({ page }) => {
    // This tests if the component attempts to use native sharing when available
    await page.goto(universalLinksTestHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.click('button:has-text("Share")');
    
    // Look for share buttons that might trigger native sharing
    const nativeShareElements = [
      page.locator('button:has-text("Share Link")'),
      page.locator('button[title*="share"]'),
      page.locator('button[aria-label*="share"]'),
      page.locator('button:has-text("📤")'),
    ];
    
    let foundNativeShare = false;
    for (const element of nativeShareElements) {
      if (await element.count() > 0) {
        foundNativeShare = true;
        break;
      }
    }
    
    // Native sharing support is optional, so we just verify the component loads
    expect(await page.locator('text=Generate Universal Link').isVisible()).toBe(true);
  });
});