import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts/{huntId}/pins/{pinId}/collect:
 *   post:
 *     summary: Mark a pin as collected by a user
 *     description: Updates a specific pin to mark it as collected by a given user at the current timestamp.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt the pin belongs to.
 *       - in: path
 *         name: pinId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the pin to mark as collected.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collectedByUserId
 *             properties:
 *               collectedByUserId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the user who collected the pin.
 *     responses:
 *       200:
 *         description: Pin successfully marked as collected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pin collected successfully
 *                 pinId:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *       400:
 *         description: Bad request, missing required fields or invalid data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: CollectedByUserId is required
 *       404:
 *         description: Hunt, Pin, or User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pin not found
 *       409:
 *         description: Conflict, pin already collected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Pin already collected
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to collect pin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string; pinId: string }> }
) {
  const { huntId, pinId } = await params;
  const { collectedByUserId } = await request.json();

  if (!collectedByUserId) {
    return NextResponse.json({ error: 'collectedByUserId is required' }, { status: 400 });
  }

  try {
    // Verify hunt, pin, and user existence
    const huntExists = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!huntExists) {
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
    }

    const userExists = await prisma.user.findUnique({ where: { id: collectedByUserId } });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pin = await prisma.pin.findUnique({
      where: { id: pinId, huntId: huntId },
    });

    if (!pin) {
      return NextResponse.json({ error: 'Pin not found in this hunt' }, { status: 404 });
    }

    if (pin.collectedByUserId) {
      return NextResponse.json({ error: 'Pin already collected' }, { status: 409 });
    }

    const updatedPin = await prisma.pin.update({
      where: { id: pinId },
      data: {
        collectedByUserId: collectedByUserId,
        collectedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Pin collected successfully', pinId: updatedPin.id }, { status: 200 });
  } catch (error) {
    console.error('Error collecting pin:', error);
    return NextResponse.json({ error: 'Failed to collect pin' }, { status: 500 });
  }
}
