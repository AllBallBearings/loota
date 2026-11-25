import { test, expect } from '@playwright/test';

test.describe('Loota Mobile Web AR', () => {
  test('GET /api/config/experience returns Trailhead Arcade tokens and AR config', async ({
    request,
  }) => {
    const res = await request.get('/api/config/experience');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.designTokens.themeName).toBe('Trailhead Arcade');
    expect(json.designTokens.colors.blaze).toBe('#FF5428');
    expect(json.arGameplay.gameplay.focusRangeMeters).toBe(5);
    expect(json.arGameplay.tracking.localLockRadiusMeters).toBe(15);
  });

  test('/ar-lab launches 3D Simulator, locks onto nearby coin, and collects via Hold-to-Summon', async ({
    page,
  }) => {
    await page.goto('/ar-lab');
    await expect(page.getByTestId('ar-lab-setup')).toBeVisible();

    await page.getByTestId('ar-lab-launch-sim').click();
    await expect(page.getByTestId('ar-lab-active')).toBeVisible();
    await expect(page.getByTestId('ar-viewport')).toBeVisible();
    await expect(page.getByTestId('ar-collected-count')).toHaveText('0');
    await expect(page.getByTestId('ar-remaining-count')).toHaveText('4');

    // Pin #1 is 12 ft (3.65m) straight North — within 5m focus range and centered in screen!
    const summonBtn = page.getByTestId('ar-summon-button');
    await expect(summonBtn).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('ar-edge-glow')).toBeVisible();

    // Hold Spacebar (or pointer down) to summon until auto-collect (< 0.8m)
    await page.keyboard.down('Space');
    await expect(page.getByTestId('ar-collected-count')).toHaveText('1', { timeout: 10000 });
    await page.keyboard.up('Space');

    await expect(page.getByTestId('ar-remaining-count')).toHaveText('3');

    // Open AR Tools debug drawer and verify controls
    await page.getByTestId('ar-debug-toggle').click();
    await expect(page.getByTestId('ar-debug-panel')).toBeVisible();
  });

  test('/hunt/[huntId]/play full join -> simulator collect -> victory podium flow', async ({
    page,
  }) => {
    const mockHuntId = '11111111-1111-4111-8111-111111111111';
    const mockPinId = '22222222-2222-4222-8222-222222222222';
    const mockUserId = '33333333-3333-4333-8333-333333333333';
    let pinCollected = false;

    await page.route(/\/api\/users(\/|\?|$)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({
        status: 201,
        json: { message: 'Registered', userId: mockUserId },
      });
    });

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}(\\?|$)`),
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            id: mockHuntId,
            name: 'Trailhead Test Drop',
            type: 'proximity',
            proximityRadiusFt: 50,
            isCompleted: pinCollected,
            winnerId: pinCollected ? mockUserId : null,
            creator: { id: 'host-1', name: 'Jared' },
            creatorContact: pinCollected
              ? { phone: '5551234567', email: 'host@loota.fun', preferred: 'phone' }
              : undefined,
            participants: [],
            pins: [
              {
                id: mockPinId,
                order: 0,
                distanceFt: 10,
                directionStr: 'N',
                objectType: 'giftCard',
                collectedByUserId: pinCollected ? mockUserId : null,
                collectedByUser: pinCollected ? { id: mockUserId, name: 'Scout' } : null,
              },
            ],
          },
        });
      }
    );

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/participants`),
      async (route) => {
        await route.fulfill({
          status: 201,
          json: { message: 'Joined', participationId: 'part-1' },
        });
      }
    );

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/pins/${mockPinId}/collect`),
      async (route) => {
        pinCollected = true;
        await route.fulfill({
          status: 200,
          json: {
            message: 'Pin collected successfully',
            pinId: mockPinId,
            remainingPins: 0,
            huntCompleted: true,
            winnerId: mockUserId,
          },
        });
      }
    );

    await page.goto(`/hunt/${mockHuntId}/play?mode=simulator`);
    await expect(page.getByTestId('ar-join-screen')).toBeVisible();

    // Validation check: short phone should show error
    await page.getByTestId('ar-join-name').fill('Scout');
    await page.getByTestId('ar-join-phone').fill('555');
    await page.getByTestId('ar-join-sim-btn').click();
    await expect(page.getByTestId('ar-join-error')).toBeVisible();

    // Valid 10-digit phone enters simulator
    await page.getByTestId('ar-join-phone').fill('5551234567');
    await page.getByTestId('ar-join-sim-btn').click();
    await expect(page.getByTestId('ar-active-stage')).toBeVisible();

    // Epic Gift Card is 10 ft straight ahead — summon it to win!
    await expect(page.getByTestId('ar-summon-button')).toBeVisible({ timeout: 8000 });
    await page.keyboard.down('Space');
    await expect(page.getByTestId('ar-victory-screen')).toBeVisible({ timeout: 10000 });
    await page.keyboard.up('Space');

    // Verify winner contact card appears
    await expect(page.getByTestId('ar-winner-contact')).toBeVisible();
  });
});
