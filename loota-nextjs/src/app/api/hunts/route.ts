import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
          create: pins.map((pin: any) => ({
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
