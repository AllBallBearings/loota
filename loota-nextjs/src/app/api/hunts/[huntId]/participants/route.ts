import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts/{huntId}/participants:
 *   post:
 *     summary: Add a user to a hunt (join hunt)
 *     description: Creates a new HuntParticipation record, associating a user with a specific hunt.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to join.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the user joining the hunt.
 *     responses:
 *       201:
 *         description: User successfully joined the hunt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User successfully joined the hunt
 *                 participationId:
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
 *                   example: User ID is required
 *       404:
 *         description: Hunt or User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hunt or User not found
 *       409:
 *         description: Conflict, user is already participating in this hunt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User is already participating in this hunt
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to add user to hunt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { huntId } = await params;
  const { userId, participantPhone } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!participantPhone) {
    return NextResponse.json({ error: 'Participant phone number is required' }, { status: 400 });
  }

  try {
    // Check if hunt and user exist
    const huntExists = await prisma.hunt.findUnique({ where: { id: huntId } });
    const userExists = await prisma.user.findUnique({ where: { id: userId } });

    if (!huntExists || !userExists) {
      return NextResponse.json({ error: 'Hunt or User not found' }, { status: 404 });
    }

    // Check if user is already participating in this hunt
    const existingParticipation = await prisma.huntParticipation.findUnique({
      where: {
        userId_huntId: {
          userId: userId,
          huntId: huntId,
        },
      },
    });

    if (existingParticipation) {
      return NextResponse.json({ error: 'User is already participating in this hunt' }, { status: 409 });
    }

    const newParticipation = await prisma.huntParticipation.create({
      data: {
        userId: userId,
        huntId: huntId,
        participantPhone: participantPhone,
      },
    });

    return NextResponse.json({ message: 'User successfully joined the hunt', participationId: newParticipation.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding user to hunt:', error);
    return NextResponse.json({ error: 'Failed to add user to hunt' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/hunts/{huntId}/participants:
 *   delete:
 *     summary: Remove a user from a hunt (leave hunt)
 *     description: Deletes a HuntParticipation record, removing a user from a specific hunt.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to leave.
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the user to remove from the hunt.
 *     responses:
 *       200:
 *         description: User successfully removed from the hunt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User successfully removed from the hunt
 *       400:
 *         description: Bad request, missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User ID is required
 *       404:
 *         description: Hunt participation not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hunt participation not found
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to remove user from hunt
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { huntId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const existingParticipation = await prisma.huntParticipation.findUnique({
      where: {
        userId_huntId: {
          userId: userId,
          huntId: huntId,
        },
      },
    });

    if (!existingParticipation) {
      return NextResponse.json({ error: 'Hunt participation not found' }, { status: 404 });
    }

    await prisma.huntParticipation.delete({
      where: {
        userId_huntId: {
          userId: userId,
          huntId: huntId,
        },
      },
    });

    return NextResponse.json({ message: 'User successfully removed from the hunt' }, { status: 200 });
  } catch (error) {
    console.error('Error removing user from hunt:', error);
    return NextResponse.json({ error: 'Failed to remove user from hunt' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/hunts/{huntId}/participants:
 *   get:
 *     summary: Retrieve participants for a specific hunt
 *     description: Returns a list of all users participating in a given hunt.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to retrieve participants for.
 *     responses:
 *       200:
 *         description: A list of hunt participants.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   userId:
 *                     type: string
 *                     format: uuid
 *                   huntId:
 *                     type: string
 *                     format: uuid
 *                   joinedAt:
 *                     type: string
 *                     format: date-time
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                         nullable: true
 *                       paypalId:
 *                         type: string
 *                         nullable: true
 *       400:
 *         description: Bad request, hunt ID is missing.
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { huntId } = await params;

  if (!huntId) {
    return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
  }

  try {
    const huntExists = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!huntExists) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    const participants = await prisma.huntParticipation.findMany({
      where: { huntId: huntId },
      include: { user: true }, // Include user details for each participant
    });

    return NextResponse.json(participants, { status: 200 });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
