import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const hunt = await prisma.hunt.findUnique({
      where: {
        id: huntId,
      },
      include: {
        pins: true,
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
