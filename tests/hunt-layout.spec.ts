import { test, expect } from '@playwright/test';

test.describe('Hunt View Layout', () => {
  test('should display map and loot list side-by-side on desktop', async ({ page }) => {
    // Navigate to a hunt page - using the ID from the server logs
    await page.goto('/hunt/4d5ca707-6b50-4103-88e5-409686d4185d');
    
    // Wait for the page to load
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Wait for elements to be visible
    await page.waitForSelector('.hidden.lg\\:flex', { timeout: 5000 });
    
    // Check that the desktop layout container is visible and has flex display
    const desktopContainer = page.locator('.hidden.lg\\:flex');
    await expect(desktopContainer).toBeVisible();
    
    // Check that the map container has the correct width class (2/3)
    const mapContainer = desktopContainer.locator('.w-2\\/3');
    await expect(mapContainer).toBeVisible();
    
    // Check that the loot list container has the correct width class (1/3)
    const lootContainer = desktopContainer.locator('.w-1\\/3');
    await expect(lootContainer).toBeVisible();
    
    // Verify they are positioned side by side by checking their bounding boxes
    const mapBox = await mapContainer.boundingBox();
    const lootBox = await lootContainer.boundingBox();
    
    expect(mapBox).not.toBeNull();
    expect(lootBox).not.toBeNull();
    
    if (mapBox && lootBox) {
      // Map should be on the left, loot list on the right
      expect(mapBox.x).toBeLessThan(lootBox.x);
      
      // They should be at roughly the same vertical position (side by side)
      expect(Math.abs(mapBox.y - lootBox.y)).toBeLessThan(50);
      
      // Map should be wider than loot list (2/3 vs 1/3)
      expect(mapBox.width).toBeGreaterThan(lootBox.width);
    }
  });
  
  test('should display map and loot list stacked on mobile', async ({ page }) => {
    // Navigate to a hunt page
    await page.goto('/hunt/4d5ca707-6b50-4103-88e5-409686d4185d');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for the page to load
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Check that the mobile layout container is visible
    const mobileContainer = page.locator('.block.lg\\:hidden');
    await expect(mobileContainer).toBeVisible();
    
    // Check that the desktop layout container is hidden
    const desktopContainer = page.locator('.hidden.lg\\:flex');
    await expect(desktopContainer).not.toBeVisible();
    
    // On mobile, elements should be stacked vertically
    const lootList = mobileContainer.locator('.card').first();
    const mapCard = mobileContainer.locator('.card').last();
    
    const lootBox = await lootList.boundingBox();
    const mapBox = await mapCard.boundingBox();
    
    expect(lootBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    
    if (lootBox && mapBox) {
      // Loot list should be above the map (smaller y coordinate)
      expect(lootBox.y).toBeLessThan(mapBox.y);
    }
  });
  
  test('should maintain layout when switching between desktop and mobile', async ({ page }) => {
    // Navigate to a hunt page
    await page.goto('/hunt/4d5ca707-6b50-4103-88e5-409686d4185d');
    
    // Start with desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForSelector('.hidden.lg\\:flex', { timeout: 5000 });
    
    // Verify desktop layout is active
    const desktopContainer = page.locator('.hidden.lg\\:flex');
    await expect(desktopContainer).toBeVisible();
    
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout is now active
    const mobileContainer = page.locator('.block.lg\\:hidden');
    await expect(mobileContainer).toBeVisible();
    await expect(desktopContainer).not.toBeVisible();
    
    // Switch back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Verify desktop layout is active again
    await expect(desktopContainer).toBeVisible();
    await expect(mobileContainer).not.toBeVisible();
  });
});