import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/hunts:
 *   post:
 *     summary: Create a new hunt
 *     description: Creates a new hunt with specified type and associated pins.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - pins
 *             properties:
 *               type:
 *                 type: string
 *                 description: The type of the hunt (e.g., 'geolocation' or 'proximity').
 *                 enum: [geolocation, proximity]
 *               pins:
 *                 type: array
 *                 description: An array of pin objects associated with the hunt.
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                       format: float
 *                       description: Latitude for geolocation pins.
 *                     lng:
 *                       type: number
 *                       format: float
 *                       description: Longitude for geolocation pins.
 *                     distanceFt:
 *                       type: number
 *                       format: float
 *                       description: Distance in feet for proximity pins.
 *                     directionStr:
 *                       type: string
 *                       description: Direction string for proximity pins (e.g., "N45E").
 *                     x:
 *                       type: number
 *                       format: float
 *                       description: Relative X coordinate for proximity pins.
 *                     y:
 *                       type: number
 *                       format: float
 *                       description: Relative Y coordinate for proximity pins.
 *     responses:
 *       201:
 *         description: Hunt created successfully. Returns the new hunt's ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 huntId:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *       400:
 *         description: Invalid request data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid request data
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
/**
 * @swagger
 * /api/hunts:
 *   get:
 *     summary: Retrieve all hunts
 *     description: Returns a list of all available hunts.
 *     responses:
 *       200:
 *         description: A list of hunts.
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
 *                   type:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
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
export async function GET() {
  try {
    const hunts = await prisma.hunt.findMany();
    return NextResponse.json(hunts, { status: 200 });
  } catch (error) {
    console.error('Error fetching hunts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/hunts:
 *   post:
 *     summary: Create a new hunt
 *     description: Creates a new hunt with specified type and associated pins.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - pins
 *             properties:
 *               type:
 *                 type: string
 *                 description: The type of the hunt (e.g., 'geolocation' or 'proximity').
 *                 enum: [geolocation, proximity]
 *               pins:
 *                 type: array
 *                 description: An array of pin objects associated with the hunt.
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                       format: float
 *                       description: Latitude for geolocation pins.
 *                     lng:
 *                       type: number
 *                       format: float
 *                       description: Longitude for geolocation pins.
 *                     distanceFt:
 *                       type: number
 *                       format: float
 *                       description: Distance in feet for proximity pins.
 *                     directionStr:
 *                       type: string
 *                       description: Direction string for proximity pins (e.g., "N45E").
 *                     x:
 *                       type: number
 *                       format: float
 *                       description: Relative X coordinate for proximity pins.
 *                     y:
 *                       type: number
 *                       format: float
 *                       description: Relative Y coordinate for proximity pins.
 *     responses:
 *       201:
 *         description: Hunt created successfully. Returns the new hunt's ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 huntId:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *       400:
 *         description: Invalid request data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid request data
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
export async function POST(request: Request) {
  try {
    const { type, pins } = await request.json();

    if (!type || !pins || !Array.isArray(pins)) {
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }

    const newHunt = await prisma.hunt.create({
      data: {
        type: type,
        pins: {
          create: pins.map((pin: { lat?: string; lng?: string; distanceFt?: string; directionStr?: string; x?: string; y?: string }) => ({
            lat: pin.lat !== undefined ? parseFloat(pin.lat) : null,
            lng: pin.lng !== undefined ? parseFloat(pin.lng) : null,
            distanceFt: pin.distanceFt !== undefined ? parseFloat(pin.distanceFt) : null,
            directionStr: pin.directionStr || null,
            x: pin.x !== undefined ? parseFloat(pin.x) : null,
            y: pin.y !== undefined ? parseFloat(pin.y) : null,
          })),
        },
      },
    });

    return NextResponse.json({ huntId: newHunt.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating hunt:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
