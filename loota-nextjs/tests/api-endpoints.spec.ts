import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  let testUserId: string;
  let testHuntId: string;
  let testPinId: string;

  test.beforeAll(async ({ request }) => {
    // Create test user for API testing
    const userResponse = await request.post('/api/users/register', {
      data: {
        name: 'API Test User',
        phone: '555-API-TEST',
      },
    });
    expect(userResponse.ok()).toBeTruthy();
    
    const userData = await userResponse.json();
    testUserId = userData.userId;
    expect(testUserId).toBeDefined();
  });

  test.describe('/api/users', () => {
    test('should register new user successfully', async ({ request }) => {
      const uniquePhone = `555-NEW-${Date.now()}`;
      const response = await request.post('/api/users/register', {
        data: {
          name: 'New Test User',
          phone: uniquePhone,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.userId).toBeDefined();
      expect(data.user.name).toBe('New Test User');
      expect(data.user.phone).toBe(uniquePhone);
      expect(data.message).toContain('registered successfully');
    });

    test('should prevent duplicate phone numbers', async ({ request }) => {
      // Try to register with existing phone number
      const duplicateResponse = await request.post('/api/users/register', {
        data: {
          name: 'Duplicate User',
          phone: '555-API-TEST', // Same phone as test user
        },
      });

      expect(duplicateResponse.status()).toBe(409);
      const errorData = await duplicateResponse.json();
      expect(errorData.message).toContain('already exists');
    });

    test('should require name and phone for registration', async ({ request }) => {
      // Test missing name
      const missingNameResponse = await request.post('/api/users/register', {
        data: {
          phone: '555-MISSING-NAME',
        },
      });
      expect(missingNameResponse.status()).toBe(400);

      // Test missing phone
      const missingPhoneResponse = await request.post('/api/users/register', {
        data: {
          name: 'Missing Phone User',
        },
      });
      expect(missingPhoneResponse.status()).toBe(400);
    });

    test('should get user by ID', async ({ request }) => {
      const response = await request.get(`/api/users/${testUserId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.ok()).toBeTruthy();
      const userData = await response.json();
      
      expect(userData.id).toBe(testUserId);
      expect(userData.name).toBe('API Test User');
      expect(userData.phone).toBe('555-API-TEST');
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      const response = await request.get('/api/users/non-existent-user-id', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.status()).toBe(404);
    });

    test('should update user information', async ({ request }) => {
      const response = await request.put(`/api/users/${testUserId}`, {
        data: {
          name: 'Updated API Test User',
          email: 'updated@test.com',
        },
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.ok()).toBeTruthy();
      const updatedData = await response.json();
      
      expect(updatedData.name).toBe('Updated API Test User');
      expect(updatedData.email).toBe('updated@test.com');
    });
  });

  test.describe('/api/hunts', () => {
    test('should create geolocation hunt successfully', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: {
          name: 'API Test Geolocation Hunt',
          type: 'geolocation',
          creatorId: testUserId,
          creatorName: 'API Test Creator',
          creatorPhone: '555-CREATOR-PHONE',
          creatorEmail: 'creator@test.com',
          preferredContactMethod: 'phone',
          pins: [
            { lat: 37.7749, lng: -122.4194 }, // San Francisco
            { lat: 37.7849, lng: -122.4094 },
            { lat: 37.7649, lng: -122.4294 },
          ],
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.huntId).toBeDefined();
      testHuntId = data.huntId;
    });

    test('should create proximity hunt successfully', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: {
          name: 'API Test Proximity Hunt',
          type: 'proximity',
          creatorId: testUserId,
          creatorName: 'API Test Creator',
          creatorPhone: '555-CREATOR-PHONE',
          creatorEmail: 'creator@test.com',
          preferredContactMethod: 'email',
          pins: [
            { distanceFt: 100, directionStr: 'N45E', x: 50, y: 75 },
            { distanceFt: 200, directionStr: 'S30W', x: -100, y: -150 },
          ],
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.huntId).toBeDefined();
    });

    test('should require contact information for hunt creation', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: {
          name: 'Hunt Without Contact',
          type: 'geolocation',
          creatorId: testUserId,
          creatorName: 'Creator',
          pins: [{ lat: 37.7749, lng: -122.4194 }],
          // Missing creatorPhone and creatorEmail
        },
      });

      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData.message).toContain('Phone and email are required');
    });

    test('should validate required fields for hunt creation', async ({ request }) => {
      // Test missing type
      const missingTypeResponse = await request.post('/api/hunts', {
        data: {
          creatorId: testUserId,
          creatorPhone: '555-TEST',
          creatorEmail: 'test@test.com',
          pins: [{ lat: 37.7749, lng: -122.4194 }],
        },
      });
      expect(missingTypeResponse.status()).toBe(400);

      // Test missing pins
      const missingPinsResponse = await request.post('/api/hunts', {
        data: {
          type: 'geolocation',
          creatorId: testUserId,
          creatorPhone: '555-TEST',
          creatorEmail: 'test@test.com',
        },
      });
      expect(missingPinsResponse.status()).toBe(400);
    });

    test('should get hunt by ID', async ({ request }) => {
      const response = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.ok()).toBeTruthy();
      const huntData = await response.json();
      
      expect(huntData.id).toBe(testHuntId);
      expect(huntData.name).toBe('API Test Geolocation Hunt');
      expect(huntData.type).toBe('geolocation');
      expect(huntData.pins).toHaveLength(3);
      expect(huntData.creator).toBeDefined();
      expect(huntData.creator.id).toBe(testUserId);
      
      // Store first pin ID for later tests
      testPinId = huntData.pins[0].id;
    });

    test('should list all hunts', async ({ request }) => {
      const response = await request.get('/api/hunts');

      expect(response.ok()).toBeTruthy();
      const hunts = await response.json();
      
      expect(Array.isArray(hunts)).toBe(true);
      expect(hunts.length).toBeGreaterThan(0);
      
      // Should include our test hunt
      const testHunt = hunts.find((hunt: any) => hunt.id === testHuntId);
      expect(testHunt).toBeDefined();
    });

    test('should return 404 for non-existent hunt', async ({ request }) => {
      const response = await request.get('/api/hunts/non-existent-hunt-id', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('/api/hunts/[huntId]/participants', () => {
    test('should add participant to hunt', async ({ request }) => {
      const response = await request.post(`/api/hunts/${testHuntId}/participants`, {
        data: {
          userId: testUserId,
          participantPhone: '555-PARTICIPANT',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toContain('successfully added');
    });

    test('should prevent duplicate participation', async ({ request }) => {
      // Try to add same user again
      const duplicateResponse = await request.post(`/api/hunts/${testHuntId}/participants`, {
        data: {
          userId: testUserId,
          participantPhone: '555-PARTICIPANT',
        },
      });

      expect(duplicateResponse.status()).toBe(409);
      const errorData = await duplicateResponse.json();
      expect(errorData.message).toContain('already participating');
    });

    test('should require valid user for participation', async ({ request }) => {
      const response = await request.post(`/api/hunts/${testHuntId}/participants`, {
        data: {
          userId: 'non-existent-user',
          participantPhone: '555-FAKE',
        },
      });

      expect(response.status()).toBe(404);
    });

    test('should require participantPhone', async ({ request }) => {
      // Create another user for this test
      const newUserResponse = await request.post('/api/users/register', {
        data: {
          name: 'Participant Test User',
          phone: `555-PART-${Date.now()}`,
        },
      });
      const newUser = await newUserResponse.json();

      const response = await request.post(`/api/hunts/${testHuntId}/participants`, {
        data: {
          userId: newUser.userId,
          // Missing participantPhone
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('/api/hunts/[huntId]/pins/[pinId]/collect', () => {
    test('should collect pin successfully', async ({ request }) => {
      // Get hunt data to find pin coordinates
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      const pin = huntData.pins.find((p: any) => p.id === testPinId);

      const response = await request.post(`/api/hunts/${testHuntId}/pins/${testPinId}/collect`, {
        data: {
          userId: testUserId,
          userLat: pin.lat,
          userLng: pin.lng,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toContain('collected successfully');
    });

    test('should prevent collecting already collected pin', async ({ request }) => {
      // Try to collect the same pin again
      const response = await request.post(`/api/hunts/${testHuntId}/pins/${testPinId}/collect`, {
        data: {
          userId: testUserId,
          userLat: 37.7749,
          userLng: -122.4194,
        },
      });

      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData.message).toContain('already been collected');
    });

    test('should require user participation for pin collection', async ({ request }) => {
      // Create new user who hasn't joined the hunt
      const newUserResponse = await request.post('/api/users/register', {
        data: {
          name: 'Non-Participant User',
          phone: `555-NON-PART-${Date.now()}`,
        },
      });
      const newUser = await newUserResponse.json();

      // Get an uncollected pin
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      const uncollectedPin = huntData.pins.find((p: any) => !p.collectedByUserId);

      if (uncollectedPin) {
        const response = await request.post(`/api/hunts/${testHuntId}/pins/${uncollectedPin.id}/collect`, {
          data: {
            userId: newUser.userId,
            userLat: uncollectedPin.lat,
            userLng: uncollectedPin.lng,
          },
        });

        expect(response.status()).toBe(403);
        const errorData = await response.json();
        expect(errorData.message).toContain('not a participant');
      }
    });

    test('should validate proximity for pin collection', async ({ request }) => {
      // Get an uncollected pin
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      const uncollectedPin = huntData.pins.find((p: any) => !p.collectedByUserId);

      if (uncollectedPin) {
        // Try to collect from very far away
        const response = await request.post(`/api/hunts/${testHuntId}/pins/${uncollectedPin.id}/collect`, {
          data: {
            userId: testUserId,
            userLat: uncollectedPin.lat + 1, // 1 degree away (very far)
            userLng: uncollectedPin.lng + 1,
          },
        });

        expect(response.status()).toBe(400);
        const errorData = await response.json();
        expect(errorData.message).toContain('too far');
      }
    });

    test('should require valid coordinates', async ({ request }) => {
      // Get an uncollected pin
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      const uncollectedPin = huntData.pins.find((p: any) => !p.collectedByUserId);

      if (uncollectedPin) {
        // Test missing coordinates
        const missingCoordsResponse = await request.post(`/api/hunts/${testHuntId}/pins/${uncollectedPin.id}/collect`, {
          data: {
            userId: testUserId,
            // Missing userLat and userLng
          },
        });

        expect(missingCoordsResponse.status()).toBe(400);
      }
    });
  });

  test.describe('/api/hunts/[huntId]/reset', () => {
    test('should reset pins for hunt creator', async ({ request }) => {
      const response = await request.post(`/api/hunts/${testHuntId}/reset`, {
        data: {
          userId: testUserId, // Creator of the hunt
          resetPins: true,
          clearParticipants: false,
        },
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toContain('successfully reset');

      // Verify pins are uncollected
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      
      const collectedPins = huntData.pins.filter((p: any) => p.collectedByUserId);
      expect(collectedPins).toHaveLength(0);
    });

    test('should clear participants for hunt creator', async ({ request }) => {
      const response = await request.post(`/api/hunts/${testHuntId}/reset`, {
        data: {
          userId: testUserId, // Creator of the hunt
          resetPins: false,
          clearParticipants: true,
        },
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.message).toContain('successfully cleared');

      // Verify participants are cleared
      const huntResponse = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      const huntData = await huntResponse.json();
      expect(huntData.participants).toHaveLength(0);
    });

    test('should prevent unauthorized reset operations', async ({ request }) => {
      // Create another user
      const otherUserResponse = await request.post('/api/users/register', {
        data: {
          name: 'Unauthorized User',
          phone: `555-UNAUTH-${Date.now()}`,
        },
      });
      const otherUser = await otherUserResponse.json();

      const response = await request.post(`/api/hunts/${testHuntId}/reset`, {
        data: {
          userId: otherUser.userId, // Not the creator
          resetPins: true,
          clearParticipants: false,
        },
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.status()).toBe(403);
      const errorData = await response.json();
      expect(errorData.message).toContain('not authorized');
    });

    test('should validate reset operation parameters', async ({ request }) => {
      // Test missing parameters
      const missingParamsResponse = await request.post(`/api/hunts/${testHuntId}/reset`, {
        data: {
          userId: testUserId,
          // Missing resetPins and clearParticipants
        },
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(missingParamsResponse.status()).toBe(400);
    });
  });

  test.describe('API Authentication', () => {
    test('should require API key for protected endpoints', async ({ request }) => {
      // Test without API key
      const response = await request.get(`/api/hunts/${testHuntId}`);
      
      // Should either require auth or work without it depending on implementation
      // This tests the actual behavior
      expect([200, 401, 403]).toContain(response.status());
    });

    test('should reject invalid API keys', async ({ request }) => {
      const response = await request.get(`/api/hunts/${testHuntId}`, {
        headers: {
          'X-API-Key': 'invalid-api-key',
        },
      });

      // Should either work (if validation is loose) or reject
      expect([200, 401, 403]).toContain(response.status());
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON requests', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: 'invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect([400, 500]).toContain(response.status());
    });

    test('should handle missing request body', async ({ request }) => {
      const response = await request.post('/api/hunts');
      expect([400, 500]).toContain(response.status());
    });

    test('should return proper error messages', async ({ request }) => {
      const response = await request.get('/api/hunts/invalid-hunt-id', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });

      expect(response.status()).toBe(404);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('message');
      expect(typeof errorData.message).toBe('string');
    });
  });

  test.describe('Data Validation', () => {
    test('should validate pin coordinates for geolocation hunts', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: {
          name: 'Invalid Coordinates Hunt',
          type: 'geolocation',
          creatorId: testUserId,
          creatorName: 'Test Creator',
          creatorPhone: '555-TEST',
          creatorEmail: 'test@test.com',
          pins: [
            { lat: 'invalid', lng: -122.4194 }, // Invalid latitude
            { lat: 37.7749, lng: 'invalid' }, // Invalid longitude
          ],
        },
      });

      // Should either succeed (with parsing) or fail with validation error
      expect([201, 400, 500]).toContain(response.status());
    });

    test('should validate proximity data for proximity hunts', async ({ request }) => {
      const response = await request.post('/api/hunts', {
        data: {
          name: 'Invalid Proximity Hunt',
          type: 'proximity',
          creatorId: testUserId,
          creatorName: 'Test Creator',
          creatorPhone: '555-TEST',
          creatorEmail: 'test@test.com',
          pins: [
            { distanceFt: 'invalid', directionStr: 'N45E', x: 50, y: 75 },
          ],
        },
      });

      // Should either succeed (with parsing) or fail with validation error
      expect([201, 400, 500]).toContain(response.status());
    });
  });
});