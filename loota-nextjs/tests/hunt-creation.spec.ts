import { test, expect } from '@playwright/test';

test.describe('Hunt Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('should create a geolocation hunt successfully', async ({ page }) => {
    // Fill in hunt configuration
    await page.fill('input[placeholder="Enter hunt name..."]', 'Test Geolocation Hunt');
    await page.fill('input[placeholder="Enter your name..."]', 'Test Creator');
    
    // Fill in contact information
    await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567');
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com');
    
    // Select phone as preferred contact method
    await page.check('input[name="preferredContactMethod"][value="phone"]');
    
    // Ensure geolocation hunt type is selected (should be default)
    const geoButton = page.locator('button:has-text("Map-based")');
    await expect(geoButton).toHaveClass(/border-blue-500/);
    
    // Wait for the map to load
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    
    // Add some pins to the map by simulating clicks
    // Note: Since Google Maps is complex to interact with in tests, we'll simulate the click events
    const mapContainer = page.locator('.map-container-modern');
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(1000);
    await mapContainer.click({ position: { x: 300, y: 250 } });
    await page.waitForTimeout(1000);
    await mapContainer.click({ position: { x: 250, y: 300 } });
    await page.waitForTimeout(1000);
    
    // Check that pins were added to the treasure list
    const treasureSection = page.locator('text=Treasure Locations').locator('..');
    await expect(treasureSection.locator('text=Treasure #')).toHaveCount(3, { timeout: 5000 });
    
    // Click the generate button
    const generateButton = page.locator('button:has-text("Start the Adventure")');
    await generateButton.click();
    
    // Wait for the hunt to be created and URL to be generated
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    // Check that the generated URL is displayed
    const generatedLink = page.locator('a[href*="/hunt/"]');
    await expect(generatedLink).toBeVisible();
    
    // Extract the hunt ID from the URL
    const huntUrl = await generatedLink.getAttribute('href');
    expect(huntUrl).toMatch(/\/hunt\/[a-f0-9-]{36}/);
    
    // Test the copy button functionality
    const copyButton = page.locator('button:has-text("Copy")');
    await copyButton.click();
    
    // Check that the button shows "Copied!" state
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible();
    
    // Navigate to the generated hunt URL
    if (huntUrl) {
      await page.goto(huntUrl);
      
      // Verify the hunt page loads correctly
      await expect(page.locator('text=Test Geolocation Hunt')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=by Test Creator')).toBeVisible();
      await expect(page.locator('text=Map-based')).toBeVisible();
      
      // Check that the pins are displayed in the loot locations list
      await expect(page.locator('text=Treasure #')).toHaveCount(3);
    }
  });

  test('should create a proximity hunt successfully', async ({ page }) => {
    // Fill in hunt configuration
    await page.fill('input[placeholder="Enter hunt name..."]', 'Test Proximity Hunt');
    await page.fill('input[placeholder="Enter your name..."]', 'Proximity Creator');
    
    // Fill in contact information
    await page.fill('input[placeholder="(555) 123-4567"]', '555-987-6543');
    await page.fill('input[placeholder="your@email.com"]', 'proximity@example.com');
    
    // Select email as preferred contact method
    await page.check('input[name="preferredContactMethod"][value="email"]');
    
    // Switch to proximity hunt type
    const proximityButton = page.locator('button:has-text("Proximity")');
    await proximityButton.click();
    
    // Verify proximity mode is selected
    await expect(proximityButton).toHaveClass(/border-blue-500/);
    
    // Wait for the proximity interface to load
    await page.waitForSelector('text=Proximity Interface', { timeout: 10000 });
    
    // Add some proximity markers by clicking on the proximity interface
    const proximityContainer = page.locator('.card:has-text("Proximity Interface")');
    const proximityInterface = proximityContainer.locator('div[style*="min-height: 600px"]');
    
    // Click to add proximity markers
    await proximityInterface.click({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(1000);
    await proximityInterface.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(1000);
    
    // Click the generate button
    const generateButton = page.locator('button:has-text("Start the Adventure")');
    await generateButton.click();
    
    // Wait for the hunt to be created and URL to be generated
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    // Check that the generated URL is displayed
    const generatedLink = page.locator('a[href*="/hunt/"]');
    await expect(generatedLink).toBeVisible();
    
    // Extract and navigate to the hunt URL
    const huntUrl = await generatedLink.getAttribute('href');
    expect(huntUrl).toMatch(/\/hunt\/[a-f0-9-]{36}/);
    
    if (huntUrl) {
      await page.goto(huntUrl);
      
      // Verify the hunt page loads correctly
      await expect(page.locator('text=Test Proximity Hunt')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=by Proximity Creator')).toBeVisible();
      await expect(page.locator('text=Proximity')).toBeVisible();
    }
  });

  test('should require contact information before creating hunt', async ({ page }) => {
    // Fill in hunt name but leave contact info empty
    await page.fill('input[placeholder="Enter hunt name..."]', 'Test Hunt');
    
    // Try to click generate without contact info
    const generateButton = page.locator('button:has-text("Start the Adventure")');
    
    // Handle the alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Please provide both phone number and email address');
      await dialog.accept();
    });
    
    await generateButton.click();
    
    // The hunt should not be created without contact information
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).not.toBeVisible({ timeout: 2000 });
  });

  test('should require at least one pin before creating hunt', async ({ page }) => {
    // Fill in all required information
    await page.fill('input[placeholder="Enter hunt name..."]', 'Test Hunt');
    await page.fill('input[placeholder="Enter your name..."]', 'Test Creator');
    await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567');
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com');
    
    // Don't add any pins, just try to generate
    const generateButton = page.locator('button:has-text("Start the Adventure")');
    
    // Handle the alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Please drop at least one treasure pin on the map first');
      await dialog.accept();
    });
    
    await generateButton.click();
    
    // The hunt should not be created without pins
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).not.toBeVisible({ timeout: 2000 });
  });

  test('should handle hunt type switching correctly', async ({ page }) => {
    // Start with geolocation (default)
    const geoButton = page.locator('button:has-text("Map-based")');
    const proximityButton = page.locator('button:has-text("Proximity")');
    
    // Verify geolocation is selected by default
    await expect(geoButton).toHaveClass(/border-blue-500/);
    await expect(page.locator('.map-container-modern')).toBeVisible();
    
    // Switch to proximity
    await proximityButton.click();
    await expect(proximityButton).toHaveClass(/border-blue-500/);
    await expect(page.locator('text=Proximity Interface')).toBeVisible();
    await expect(page.locator('.map-container-modern')).not.toBeVisible();
    
    // Switch back to geolocation
    await geoButton.click();
    await expect(geoButton).toHaveClass(/border-blue-500/);
    await expect(page.locator('.map-container-modern')).toBeVisible();
    await expect(page.locator('text=Proximity Interface')).not.toBeVisible();
  });

  test('should use existing contact information when available', async ({ page }) => {
    // This test simulates the scenario where a user has previously created hunts
    // and their contact info is saved. Since we're using a fixed creator ID in the app,
    // we'll test the UI behavior when existing contact info is detected.
    
    // Fill in hunt details
    await page.fill('input[placeholder="Enter hunt name..."]', 'Test Hunt with Existing Info');
    await page.fill('input[placeholder="Enter your name..."]', 'Existing User');
    
    // Check if there's an existing contact info section
    const existingInfoSection = page.locator('text=We found your saved contact information');
    
    // If existing info is found, test the toggle functionality
    if (await existingInfoSection.isVisible()) {
      // Test "Use Saved Info" button
      const useSavedButton = page.locator('button:has-text("Use Saved Info")');
      await useSavedButton.click();
      await expect(useSavedButton).toHaveClass(/bg-blue-600/);
      
      // Test "Enter New Info" button
      const enterNewButton = page.locator('button:has-text("Enter New Info")');
      await enterNewButton.click();
      await expect(enterNewButton).toHaveClass(/bg-blue-600/);
      
      // Verify input fields are enabled when entering new info
      const phoneInput = page.locator('input[placeholder="(555) 123-4567"]');
      const emailInput = page.locator('input[placeholder="your@email.com"]');
      
      await expect(phoneInput).not.toBeDisabled();
      await expect(emailInput).not.toBeDisabled();
    }
  });
});