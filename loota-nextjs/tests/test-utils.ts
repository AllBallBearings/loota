import { expect, test as base } from '@playwright/test';

// Extend the base test to include common utilities
export const test = base.extend({
  // Common test data and utilities can go here
});

export { expect };

// Helper functions for tests
export class TestHelpers {
  static generateUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateUniquePhone(): string {
    return `555-${Date.now().toString().slice(-7)}`;
  }

  static generateUniqueEmail(): string {
    return `test-${Date.now()}@example.com`;
  }

  static async createTestHunt(page: any, huntName: string = 'Test Hunt'): Promise<string> {
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Fill in hunt details
    await page.fill('input[placeholder="Enter hunt name..."]', huntName);
    await page.fill('input[placeholder="Enter your name..."]', 'Test Creator');
    await page.fill('input[placeholder="(555) 123-4567"]', this.generateUniquePhone());
    await page.fill('input[placeholder="your@email.com"]', this.generateUniqueEmail());
    
    // Wait for map and add pins
    await page.waitForSelector('.map-container-modern', { timeout: 15000 });
    const mapContainer = page.locator('.map-container-modern');
    
    // Add three test pins
    await mapContainer.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 300, y: 250 } });
    await page.waitForTimeout(500);
    await mapContainer.click({ position: { x: 250, y: 300 } });
    await page.waitForTimeout(500);
    
    // Generate the hunt
    await page.click('button:has-text("Start the Adventure")');
    await expect(page.locator('text=Your Treasure Hunt is Ready!')).toBeVisible({ timeout: 10000 });
    
    // Get the hunt URL
    const generatedLink = page.locator('a[href*="/hunt/"]');
    const huntUrl = await generatedLink.getAttribute('href');
    
    if (!huntUrl) {
      throw new Error('Failed to create hunt - no URL generated');
    }
    
    return huntUrl;
  }

  static async createTestUser(request: any, name: string = 'Test User'): Promise<{ userId: string; phone: string }> {
    const phone = this.generateUniquePhone();
    const response = await request.post('/api/users/register', {
      data: {
        name,
        phone,
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();
    
    return {
      userId: userData.userId,
      phone,
    };
  }

  static async waitForHuntToLoad(page: any, huntUrl: string): Promise<void> {
    await page.goto(huntUrl);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Wait for hunt name to be visible (indicates full load)
    await page.waitForSelector('text=Test', { timeout: 5000 });
  }

  static async joinHunt(request: any, huntId: string, userId: string, phone: string): Promise<void> {
    const response = await request.post(`/api/hunts/${huntId}/participants`, {
      data: {
        userId,
        participantPhone: phone,
      },
    });

    expect(response.ok()).toBeTruthy();
  }

  static async collectPin(request: any, huntId: string, pinId: string, userId: string, lat: number, lng: number): Promise<void> {
    const response = await request.post(`/api/hunts/${huntId}/pins/${pinId}/collect`, {
      data: {
        userId,
        userLat: lat,
        userLng: lng,
      },
    });

    expect(response.ok()).toBeTruthy();
  }

  static extractHuntIdFromUrl(url: string): string {
    const match = url.match(/\/hunt\/([a-f0-9-]{36})/);
    if (!match) {
      throw new Error(`Invalid hunt URL: ${url}`);
    }
    return match[1];
  }

  static async setupApiKey(request: any): Promise<void> {
    // Set default headers for API requests
    const apiKey = process.env.NEXT_PUBLIC_API_KEY_SECRET || '';
    if (apiKey) {
      request.defaults = {
        ...request.defaults,
        headers: {
          ...request.defaults?.headers,
          'X-API-Key': apiKey,
        },
      };
    }
  }
}

// Test data constants
export const TEST_COORDINATES = {
  SF_DOWNTOWN: { lat: 37.7749, lng: -122.4194 },
  SF_MISSION: { lat: 37.7599, lng: -122.4148 },
  SF_CASTRO: { lat: 37.7609, lng: -122.4350 },
};

export const TEST_PROXIMITY_DATA = [
  { distanceFt: 100, directionStr: 'N45E', x: 50, y: 75 },
  { distanceFt: 200, directionStr: 'S30W', x: -100, y: -150 },
  { distanceFt: 150, directionStr: 'E', x: 150, y: 0 },
];

// Custom assertions for Loota-specific functionality
export class LootaAssertions {
  static async assertHuntExists(page: any, huntName: string): Promise<void> {
    await expect(page.locator(`text=${huntName}`)).toBeVisible();
  }

  static async assertPinCount(page: any, count: number): Promise<void> {
    await expect(page.locator('text=Pin #')).toHaveCount(count);
  }

  static async assertPinCollected(page: any, pinNumber: number, collectorName: string): Promise<void> {
    const pinCard = page.locator('.card').filter({ hasText: `Pin #${pinNumber}` });
    await expect(pinCard).toContainText(`Collected by ${collectorName}`);
  }

  static async assertHuntCompleted(page: any): Promise<void> {
    await expect(page.locator('text=Everything\'s Looted!!!')).toBeVisible();
    await expect(page.locator('text=The hunt is complete')).toBeVisible();
  }

  static async assertParticipantCount(page: any, count: number): Promise<void> {
    await expect(page.locator(`text=Participants (${count})`)).toBeVisible();
  }

  static async assertManagementVisible(page: any): Promise<void> {
    await expect(page.locator('text=Hunt Management')).toBeVisible();
    await expect(page.locator('button:has-text("Reset Loot")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Looters")')).toBeVisible();
  }

  static async assertApiResponse(response: any, expectedStatus: number = 200): Promise<void> {
    expect(response.status()).toBe(expectedStatus);
    
    if (expectedStatus < 400) {
      const data = await response.json();
      expect(data).toBeDefined();
    }
  }
}