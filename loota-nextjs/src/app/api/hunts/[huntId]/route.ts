import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts/{huntId}:
 *   get:
 *     summary: Retrieve a specific hunt
 *     description: Returns details of a single hunt by its ID, including its pins and participants.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to retrieve.
 *     responses:
 *       200:
 *         description: Details of the hunt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 type:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 pins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       huntId:
 *                         type: string
 *                         format: uuid
 *                       lat:
 *                         type: number
 *                         format: float
 *                       lng:
 *                         type: number
 *                         format: float
 *                       distanceFt:
 *                         type: number
 *                         format: float
 *                       directionStr:
 *                         type: string
 *                       x:
 *                         type: number
 *                         format: float
 *                       y:
 *                         type: number
 *                         format: float
 *                       collectedByUserId:
 *                         type: string
 *                         format: uuid
 *                       collectedByUser:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                       collectedAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       huntId:
 *                         type: string
 *                         format: uuid
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
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
  try {
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey !== process.env.API_KEY_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { huntId } = await params;

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const hunt = await prisma.hunt.findUnique({
      where: {
        id: huntId,
      },
      include: {
        pins: {
          include: {
            collectedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!hunt) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    return NextResponse.json(hunt, { status: 200 });
  } catch (error) {
    console.error('Error retrieving hunt:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/hunts/{huntId}:
 *   delete:
 *     summary: Delete a hunt
 *     description: Deletes a specific hunt by its ID. This operation is irreversible.
 *     parameters:
 *       - in: path
 *         name: huntId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the hunt to delete.
 *     responses:
 *       200:
 *         description: Hunt deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hunt deleted successfully
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const existingHunt = await prisma.hunt.findUnique({
      where: { id: huntId },
    });

    if (!existingHunt) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    await prisma.hunt.delete({
      where: { id: huntId },
    });

    return NextResponse.json({ message: 'Hunt deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting hunt:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
