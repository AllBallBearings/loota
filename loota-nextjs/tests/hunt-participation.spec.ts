import { test, expect } from '@playwright/test';

test.describe('Hunt Viewing and Participation', () => {
  let testHuntUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test hunt that we can use for all participation tests
    const page = await browser.newPage();
    
    // Navigate to home and create a geolocation hunt
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Fill in hunt details
    await page.fill('input[placeholder="Enter hunt name..."]', 'E2E Test Hunt for Participation');
    await page.fill('input[placeholder="Enter your name..."]', 'E2E Test Creator');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-E2E-TEST');
    await page.fill('input[placeholder="your@email.com"]', 'e2e@test.com');
    
    // Wait for map and add some pins
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    const mapContainer = page.locator('.map-container-modern');
    
    // Add three test pins
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(1000);
    await mapContainer.click({ position: { x: 300, y: 250 } });
    await page.waitForTimeout(1000);
    await mapContainer.click({ position: { x: 250, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Generate the hunt
    await page.click('button:has-text("Start the Adventure")');
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    // Get the hunt URL
    const generatedLink = page.locator('a[href*="/hunt/"]');
    testHuntUrl = await generatedLink.getAttribute('href') || '';
    
    await page.close();
  });

  test('should display hunt information correctly', async ({ page }) => {
    await page.goto(testHuntUrl);
    
    // Wait for page to load
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check hunt header information
    await expect(page.locator('text=E2E Test Hunt for Participation')).toBeVisible();
    await expect(page.locator('text=by E2E Test Creator')).toBeVisible();
    await expect(page.locator('text=Map-based')).toBeVisible();
    
    // Check that hunt ID is displayed (truncated)
    await expect(page.locator('text=🆔').locator('..').locator('text=...')).toBeVisible();
  });

  test('should show share functionality', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Click the share button
    const shareButton = page.locator('button:has-text("Share")');
    await shareButton.click();
    
    // Check that share section expands
    await expect(page.locator('text=Generate Universal Link')).toBeVisible({ timeout: 5000 });
    
    // Check that iOS link functionality is available
    await expect(page.locator('button:has-text("Generate iOS Link")')).toBeVisible();
    
    // Click share button again to collapse
    await shareButton.click();
    await expect(page.locator('text=Generate Universal Link')).not.toBeVisible();
  });

  test('should display treasure locations list', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check that loot locations are displayed
    await expect(page.locator('text=Loot Locations')).toBeVisible();
    
    // Should show 3 pins we created
    await expect(page.locator('text=Pin #')).toHaveCount(3);
    
    // Each pin should show as available initially
    const pinCards = page.locator('.card').filter({ hasText: 'Pin #' });
    await expect(pinCards.first()).toContainText('Available');
    
    // Check that coordinates are displayed for geolocation pins
    await expect(pinCards.first()).toContainText(/\d+\.\d+, -?\d+\.\d+/);
  });

  test('should display map with pins', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check that map section is present
    await expect(page.locator('text=Hunt Map')).toBeVisible();
    
    // Check that map container is present
    const mapContainer = page.locator('.map-container-modern');
    await expect(mapContainer).toBeVisible();
    
    // Map should have correct height
    const mapStyle = await mapContainer.getAttribute('style');
    expect(mapStyle).toContain('height: 600px');
  });

  test('should handle responsive layout correctly', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Test desktop layout (>= 1024px)
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Desktop should show side-by-side layout
    const desktopContainer = page.locator('.hidden.lg\\:flex');
    await expect(desktopContainer).toBeVisible();
    
    // Map should be 2/3 width, loot list 1/3 width
    await expect(desktopContainer.locator('.w-2\\/3')).toBeVisible();
    await expect(desktopContainer.locator('.w-1\\/3')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile should show stacked layout
    const mobileContainer = page.locator('.block.lg\\:hidden');
    await expect(mobileContainer).toBeVisible();
    await expect(desktopContainer).not.toBeVisible();
  });

  test('should show participants section', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check participants section
    await expect(page.locator('text=Participants (0)')).toBeVisible();
    await expect(page.locator('text=No participants yet.')).toBeVisible();
  });

  test('should show hunt management for creator', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Since we're using the same fixed creator ID, management section should be visible
    await expect(page.locator('text=Hunt Management')).toBeVisible();
    
    // Check management buttons are present
    await expect(page.locator('button:has-text("Reset Loot")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Looters")')).toBeVisible();
  });

  test('should handle pin highlighting from list clicks', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // On desktop layout, click on a pin in the list
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const firstPinCard = page.locator('.card').filter({ hasText: 'Pin #1' }).first();
    await firstPinCard.click();
    
    // The click should not cause any errors (pin highlighting is handled by map)
    // We can't easily test the actual map highlighting without accessing Google Maps API
    // but we can ensure the click doesn't break the page
    await expect(firstPinCard).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test with invalid hunt ID
    await page.goto('/hunt/invalid-hunt-id');
    
    // Should show error message
    await expect(page.locator('text=Hunt Not Found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=doesn\'t exist or has been removed')).toBeVisible();
    
    // Should have button to go home
    const goHomeButton = page.locator('button:has-text("Go Home")');
    await expect(goHomeButton).toBeVisible();
    
    // Test the go home functionality
    await goHomeButton.click();
    await expect(page.locator('h1:has-text("Loota")')).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state initially', async ({ page }) => {
    // Start navigation but don't wait for complete load
    await page.goto(testHuntUrl, { waitUntil: 'domcontentloaded' });
    
    // Should show loading spinner initially
    const loadingContainer = page.locator('.loading-container');
    
    // The loading state might be brief, so we check if it appears or if content is already loaded
    const isLoading = await loadingContainer.isVisible();
    const isLoaded = await page.locator('.card').first().isVisible();
    
    expect(isLoading || isLoaded).toBe(true);
    
    // Eventually should load the content
    await page.waitForSelector('.card', { timeout: 10000 });
    await expect(page.locator('text=E2E Test Hunt for Participation')).toBeVisible();
  });

  test('should poll for updates automatically', async ({ page }) => {
    await page.goto(testHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // The app should poll every 5 seconds for updates
    // We can't easily test the polling directly, but we can verify
    // that the page continues to function properly over time
    
    await page.waitForTimeout(6000); // Wait longer than polling interval
    
    // Page should still be functional
    await expect(page.locator('text=E2E Test Hunt for Participation')).toBeVisible();
    await expect(page.locator('text=Pin #')).toHaveCount(3);
  });

  test('should handle proximity hunt display correctly', async ({ browser }) => {
    // Create a proximity hunt for this test
    const setupPage = await browser.newPage();
    
    await setupPage.goto('/');
    await setupPage.waitForSelector('h1', { timeout: 10000 });
    
    // Create proximity hunt
    await setupPage.fill('input[placeholder="Enter hunt name..."]', 'E2E Proximity Hunt Test');
    await setupPage.fill('input[placeholder="Enter your name..."]', 'Proximity Creator');
    await setupPage.fill('input[placeholder="(555) 123-4567"]', '555-PROX-TEST');
    await setupPage.fill('input[placeholder="your@email.com"]', 'proximity@test.com');
    
    // Switch to proximity mode
    await setupPage.click('button:has-text("Proximity")');
    await setupPage.waitForSelector('text=Proximity Interface', { timeout: 10000 });
    
    // Add proximity markers
    const proximityInterface = setupPage.locator('.card:has-text("Proximity Interface")').locator('div[style*="min-height: 600px"]');
    await proximityInterface.click({ position: { x: 150, y: 150 } });
    await setupPage.waitForTimeout(1000);
    await proximityInterface.click({ position: { x: 250, y: 200 } });
    await setupPage.waitForTimeout(1000);
    
    // Generate hunt
    await setupPage.click('button:has-text("Start the Adventure")');
    await expect(setupPage.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    const proximityHuntUrl = await setupPage.locator('a[href*="/hunt/"]').getAttribute('href') || '';
    await setupPage.close();
    
    // Now test the proximity hunt viewing
    await page.goto(proximityHuntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check proximity hunt specific elements
    await expect(page.locator('text=E2E Proximity Hunt Test')).toBeVisible();
    await expect(page.locator('text=Proximity')).toBeVisible();
    await expect(page.locator('text=Proximity Hunt')).toBeVisible();
    
    // Should not show map interface, but proximity interface
    await expect(page.locator('text=Hunt Map')).not.toBeVisible();
  });
});