import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/adminAuth';

/**
 * Platform owner override actions for a specific hunt:
 * - POST: resetPins and/or clearParticipants (works regardless of creatorId)
 * - DELETE: permanently delete the hunt and its participations/pins
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { authorized } = verifyAdminAccess(request);
  if (!authorized) {
    return NextResponse.json({ message: 'Unauthorized admin request' }, { status: 401 });
  }

  try {
    const { huntId } = await params;
    const { resetPins, clearParticipants } = await request.json();

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    if (typeof resetPins !== 'boolean' || typeof clearParticipants !== 'boolean') {
      return NextResponse.json(
        { message: 'resetPins and clearParticipants must be booleans.' },
        { status: 400 }
      );
    }

    const existing = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!existing) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (clearParticipants) {
        await tx.huntParticipation.deleteMany({ where: { huntId } });
      }

      if (resetPins) {
        await tx.pin.updateMany({
          where: { huntId },
          data: { collectedByUserId: null, collectedAt: null },
        });

        await tx.hunt.update({
          where: { id: huntId },
          data: { isCompleted: false, completedAt: null, winnerId: null },
        });
      }
    });

    const actionLabel =
      resetPins && clearParticipants
        ? 'Hunt loot and participants reset.'
        : resetPins
          ? 'All loot stashes reset to Open.'
          : 'All participants cleared from hunt.';

    return NextResponse.json({ message: actionLabel }, { status: 200 });
  } catch (error) {
    console.error('Error performing admin hunt reset:', error);
    return NextResponse.json({ message: 'Failed to update hunt' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { authorized } = verifyAdminAccess(request);
  if (!authorized) {
    return NextResponse.json({ message: 'Unauthorized admin request' }, { status: 401 });
  }

  try {
    const { huntId } = await params;
    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const existing = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!existing) {
      return NextResponse.json({ message: 'Hunt not found' }, { status: 404 });
    }

    // Delete participations first because HuntParticipation has no onDelete: Cascade
    await prisma.$transaction(async (tx) => {
      await tx.huntParticipation.deleteMany({ where: { huntId } });
      await tx.hunt.delete({ where: { id: huntId } });
    });

    return NextResponse.json({ message: 'Hunt deleted permanently.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting hunt via admin:', error);
    return NextResponse.json({ message: 'Failed to delete hunt' }, { status: 500 });
  }
}
