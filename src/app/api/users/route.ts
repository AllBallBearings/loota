import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users
 *     description: Retrieve users by deviceID or get all users
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: iOS device ID to filter by
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       phone:
 *                         type: string
 *                       paypalID:
 *                         type: string
 *                       iosDeviceID:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    let users;
    
    if (deviceId) {
      users = await prisma.user.findMany({
        where: {
          deviceId: deviceId
        }
      });
    } else {
      users = await prisma.user.findMany();
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * @swagger
 * /api/users:
 *   put:
 *     summary: Update user
 *     description: Update user information by deviceID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: iOS device ID to identify user
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               paypalID:
 *                 type: string
 *                 description: PayPal ID
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     phone:
 *                       type: string
 *                     paypalID:
 *                       type: string
 *                     deviceId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - missing deviceId
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, phone, paypalId, name } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const updateData: { phone?: string; paypalId?: string; name?: string } = {};
    if (phone !== undefined) updateData.phone = phone;
    if (paypalId !== undefined) updateData.paypalId = paypalId;
    if (name !== undefined) updateData.name = name;

    const user = await prisma.user.update({
      where: {
        deviceId: deviceId
      },
      data: updateData
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}