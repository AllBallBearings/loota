import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts/{huntId}/reset:
 *   post:
 *     summary: Reset a hunt
 *     description: Resets a specific hunt by its ID. Can clear participants, reset pins, or both.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to reset.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetPins:
 *                 type: boolean
 *                 description: Whether to reset all collected pins for the hunt.
 *               clearParticipants:
 *                 type: boolean
 *                 description: Whether to clear all participants from the hunt.
 *     responses:
 *       200:
 *         description: Hunt reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hunt reset successfully
 *       400:
 *         description: Bad request, hunt ID is missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hunt ID is required
 *       404:
 *         description: Hunt not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hunt not found
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;
    const { resetPins, clearParticipants } = await request.json();

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    if (typeof resetPins !== 'boolean' || typeof clearParticipants !== 'boolean') {
      return NextResponse.json({ message: 'Invalid parameters: resetPins and clearParticipants must be booleans.' }, { status: 400 });
    }

    const existingHunt = await prisma.hunt.findUnique({
      where: { id: huntId },
    });

    if (!existingHunt) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    await prisma.$transaction(async (prisma) => {
      if (clearParticipants) {
        await prisma.huntParticipation.deleteMany({
          where: { huntId: huntId },
        });
      }

      if (resetPins) {
        await prisma.pin.updateMany({
          where: { huntId: huntId },
          data: {
            collectedByUserId: null,
            collectedAt: null,
          },
        });
      }
    });

    return NextResponse.json({ message: 'Hunt reset successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error resetting hunt:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
