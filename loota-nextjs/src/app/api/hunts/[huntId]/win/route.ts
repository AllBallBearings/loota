import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts/{huntId}/win:
 *   post:
 *     summary: Notify the server of a hunt win
 *     description: Records a user as the winner of a specific hunt.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt that was won.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - timestamp
 *               - proofOfWin
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the user who won the hunt.
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: The timestamp when the win occurred.
 *               proofOfWin:
 *                 type: object
 *                 description: Data to validate the win (e.g., coordinates, collected items).
 *                 example:
 *                   latitude: 34.052235
 *                   longitude: -118.243683
 *     responses:
 *       200:
 *         description: Win recorded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Win recorded successfully
 *                 hunt:
 *                   type: object
 *                   description: The updated hunt object.
 *       400:
 *         description: Bad request, missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing required fields
 *       403:
 *         description: Forbidden, invalid win proof.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid win proof
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to record win
 */
export async function POST(
  request: Request,
  { params }: { params: { huntId: string } }
) {
  const { huntId } = params;
  const { userId, timestamp, proofOfWin } = await request.json();

  if (!userId || !timestamp || !proofOfWin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // 1. Validate the win (this is a placeholder and needs actual implementation)
    // For example, check proofOfWin against game state, user's current location, etc.
    const isValidWin = true; // Replace with actual validation logic

    if (!isValidWin) {
      return NextResponse.json({ error: 'Invalid win proof' }, { status: 403 });
    }

    // 2. Update the Hunt model to mark the winner
    const updatedHunt = await prisma.hunt.update({
      where: { id: huntId },
      data: {
        winnerId: userId,
        updatedAt: new Date(), // Ensure updatedAt is updated
      },
    });

    // 3. Optionally, update HuntParticipation or other related models
    // For example, mark the user's participation as 'completed' or 'won'
    // This depends on whether you add a 'status' field to HuntParticipation

    return NextResponse.json({ message: 'Win recorded successfully', hunt: updatedHunt }, { status: 200 });
  } catch (error) {
    console.error('Error recording win:', error);
    return NextResponse.json({ error: 'Failed to record win' }, { status: 500 });
  }
}
