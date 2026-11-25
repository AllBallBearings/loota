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
  // API Key validation
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.API_KEY_SECRET) {
    console.error('Unauthorized pin collection attempt:', {
      providedKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { huntId, pinId } = await params;
  const { collectedByUserId } = await request.json();

  console.log('Pin collection request:', {
    huntId,
    pinId,
    collectedByUserId,
    timestamp: new Date().toISOString()
  });

  if (!collectedByUserId) {
    return NextResponse.json({ error: 'collectedByUserId is required' }, { status: 400 });
  }

  try {
    // Verify hunt, pin, and user existence
    const huntExists = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!huntExists) {
      console.error('Hunt not found for pin collection:', { huntId, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
    }

    const userExists = await prisma.user.findUnique({ where: { id: collectedByUserId } });
    if (!userExists) {
      console.error('User not found for pin collection:', { collectedByUserId, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pin = await prisma.pin.findFirst({
      where: { id: pinId, huntId: huntId },
    });

    if (!pin) {
      console.error('Pin not found in hunt:', { pinId, huntId, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: 'Pin not found in this hunt' }, { status: 404 });
    }

    const now = new Date();

    // Atomic conditional update prevents race-condition double collection
    const updateResult = await prisma.pin.updateMany({
      where: {
        id: pinId,
        huntId: huntId,
        collectedByUserId: null,
      },
      data: {
        collectedByUserId: collectedByUserId,
        collectedAt: now,
      },
    });

    if (updateResult.count === 0) {
      console.log('Pin already collected:', {
        pinId,
        huntId,
        collectedBy: pin.collectedByUserId,
        newCollector: collectedByUserId,
        timestamp: now.toISOString(),
      });
      return NextResponse.json({ error: 'Pin already collected' }, { status: 409 });
    }

    // Check if all pins in this hunt are now collected; if so, auto-complete the hunt
    const allPins = await prisma.pin.findMany({
      where: { huntId },
      select: {
        id: true,
        collectedByUserId: true,
        collectedAt: true,
      },
    });

    const remainingPins = allPins.filter((p) => !p.collectedByUserId).length;
    let huntCompleted = huntExists.isCompleted;
    let winnerId: string | null = huntExists.winnerId;

    if (remainingPins === 0 && allPins.length > 0 && !huntExists.isCompleted) {
      // Winner = player with the most pins collected; tie-break by earliest final pin timestamp
      const tally = new Map<string, { count: number; lastCollectedAt: number }>();
      for (const p of allPins) {
        if (!p.collectedByUserId) continue;
        const ts = p.collectedAt ? p.collectedAt.getTime() : now.getTime();
        const current = tally.get(p.collectedByUserId);
        if (!current) {
          tally.set(p.collectedByUserId, { count: 1, lastCollectedAt: ts });
        } else {
          current.count += 1;
          if (ts > current.lastCollectedAt) current.lastCollectedAt = ts;
        }
      }

      const ranked = Array.from(tally.entries()).sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return a[1].lastCollectedAt - b[1].lastCollectedAt;
      });

      const computedWinnerId = ranked[0]?.[0] ?? collectedByUserId;

      const huntUpdate = await prisma.hunt.updateMany({
        where: { id: huntId, isCompleted: false },
        data: {
          isCompleted: true,
          completedAt: now,
          winnerId: computedWinnerId,
        },
      });

      if (huntUpdate.count > 0) {
        huntCompleted = true;
        winnerId = computedWinnerId;
      }
    }

    console.log('Pin collected successfully:', {
      pinId,
      huntId,
      collectedByUserId,
      collectedAt: now,
      remainingPins,
      huntCompleted,
      winnerId,
      timestamp: now.toISOString(),
    });

    return NextResponse.json(
      {
        message: 'Pin collected successfully',
        pinId,
        remainingPins,
        huntCompleted,
        winnerId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error collecting pin:', error);
    return NextResponse.json({ error: 'Failed to collect pin' }, { status: 500 });
  }
}
