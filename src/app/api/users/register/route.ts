import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with optional phone, PayPal ID, and device ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The user's name.
 *               phone:
 *                 type: string
 *                 description: Optional phone number for the user (must be unique if provided).
 *               paypalId:
 *                 type: string
 *                 description: Optional PayPal ID for receiving winnings (must be unique if provided).
 *               deviceId:
 *                 type: string
 *                 description: Optional unique device ID from the user's device.
 *     responses:
 *       200:
 *         description: Existing user found with the provided device ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User found with this device ID
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *                 existingUser:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     paypalId:
 *                       type: string
 *                       nullable: true
 *       201:
 *         description: User registered successfully. Returns the new user's ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *       400:
 *         description: Bad request, missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Name is required
 *       409:
 *         description: Conflict, user with provided phone or PayPal ID already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User with this phone number already exists
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to register user
 */
export async function POST(request: Request) {
  const { name, phone, paypalId, deviceId } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    // Check if a user with the same phone, paypalId, or deviceId already exists (if provided)
    if (phone) {
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone: phone },
      });
      if (existingUserByPhone) {
        return NextResponse.json({ error: 'User with this phone number already exists' }, { status: 409 });
      }
    }

    if (paypalId) {
      const existingUserByPaypal = await prisma.user.findUnique({
        where: { paypalId: paypalId },
      });
      if (existingUserByPaypal) {
        return NextResponse.json({ error: 'User with this PayPal ID already exists' }, { status: 409 });
      }
    }

    if (deviceId) {
      const existingUserByDeviceId = await prisma.user.findUnique({
        where: { deviceId: deviceId },
      });
      if (existingUserByDeviceId) {
        return NextResponse.json({ 
          message: 'User found with this device ID', 
          userId: existingUserByDeviceId.id,
          existingUser: {
            id: existingUserByDeviceId.id,
            name: existingUserByDeviceId.name,
            phone: existingUserByDeviceId.phone,
            paypalId: existingUserByDeviceId.paypalId
          }
        }, { status: 200 });
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        phone,
        paypalId,
        deviceId,
      },
    });

    return NextResponse.json({ message: 'User registered successfully', userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
