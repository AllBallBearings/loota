import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAccess } from '@/lib/adminAuth';

export type AdminHuntStatus = 'in_progress' | 'waiting' | 'completed';

export interface AdminHuntSummary {
  id: string;
  name: string;
  type: 'geolocation' | 'proximity';
  proximityRadiusFt: number | null;
  status: AdminHuntStatus;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  creator: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  creatorPhone: string | null;
  creatorEmail: string | null;
  preferredContactMethod: string | null;
  winner: {
    id: string;
    name: string;
  } | null;
  totalPins: number;
  collectedPins: number;
  coinPins: number;
  giftCardPins: number;
  completionPct: number;
  participantCount: number;
  lastActivityAt: string;
  participants: Array<{
    id: string;
    userId: string;
    name: string;
    joinedAt: string;
    collectedCount: number;
  }>;
  pins: Array<{
    id: string;
    objectType: string;
    order: number;
    lat: number | null;
    lng: number | null;
    distanceFt: number | null;
    directionStr: string | null;
    collectedByUserId: string | null;
    collectedByName: string | null;
    collectedAt: string | null;
  }>;
}

export interface AdminActivityEvent {
  id: string;
  kind: 'claim' | 'join' | 'created' | 'completed';
  timestamp: string;
  huntId: string;
  huntName: string;
  actorName: string;
  detail: string;
}

export interface AdminDailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. Nov 12
  huntsCreated: number;
  pinsClaimed: number;
}

export interface AdminOverviewResponse {
  authProtected: boolean;
  generatedAt: string;
  kpis: {
    totalHunts: number;
    huntsLast7Days: number;
    inProgressHunts: number;
    waitingHunts: number;
    completedHunts: number;
    completionRatePct: number;
    totalPins: number;
    collectedPins: number;
    claimRatePct: number;
    coinPins: number;
    giftCardPins: number;
    geolocationHunts: number;
    proximityHunts: number;
    totalUsers: number;
    totalParticipations: number;
    uniqueCreators: number;
  };
  dailyActivity: AdminDailyPoint[];
  recentActivity: AdminActivityEvent[];
  topCreators: Array<{
    id: string;
    name: string;
    huntsCreated: number;
    totalParticipants: number;
    totalPinsPlaced: number;
  }>;
  topLooters: Array<{
    id: string;
    name: string;
    pinsCollected: number;
    huntsWon: number;
    huntsJoined: number;
  }>;
  hunts: AdminHuntSummary[];
}

export async function GET(request: NextRequest) {
  const { authorized, protectedMode } = verifyAdminAccess(request);
  if (!authorized) {
    return NextResponse.json(
      { message: 'Admin access key required', authProtected: true },
      { status: 401 }
    );
  }

  try {
    const [rawHunts, totalUsers, totalParticipations] = await Promise.all([
      prisma.hunt.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true, phone: true },
          },
          winner: {
            select: { id: true, name: true },
          },
          pins: {
            orderBy: { order: 'asc' },
            include: {
              collectedByUser: {
                select: { id: true, name: true },
              },
            },
          },
          participants: {
            orderBy: { joinedAt: 'desc' },
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.user.count(),
      prisma.huntParticipation.count(),
    ]);

    const now = new Date();
    const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    // Build 14-day daily chart buckets
    const dailyMap = new Map<string, AdminDailyPoint>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap.set(key, { date: key, label, huntsCreated: 0, pinsClaimed: 0 });
    }

    let huntsLast7Days = 0;
    let inProgressHunts = 0;
    let waitingHunts = 0;
    let completedHunts = 0;
    let totalPins = 0;
    let collectedPins = 0;
    let coinPins = 0;
    let giftCardPins = 0;
    let geolocationHunts = 0;
    let proximityHunts = 0;

    const creatorAgg = new Map<
      string,
      { id: string; name: string; huntsCreated: number; totalParticipants: number; totalPinsPlaced: number }
    >();
    const looterAgg = new Map<
      string,
      { id: string; name: string; pinsCollected: number; huntsWon: number; huntsJoined: number }
    >();
    const activityEvents: AdminActivityEvent[] = [];

    const ensureLooter = (id: string, name: string) => {
      let entry = looterAgg.get(id);
      if (!entry) {
        entry = { id, name, pinsCollected: 0, huntsWon: 0, huntsJoined: 0 };
        looterAgg.set(id, entry);
      }
      return entry;
    };

    const hunts: AdminHuntSummary[] = rawHunts.map((h) => {
      const huntName = h.name?.trim() || 'Untitled Hunt';
      const huntType: 'geolocation' | 'proximity' =
        h.type === 'proximity' ? 'proximity' : 'geolocation';

      if (huntType === 'proximity') proximityHunts++;
      else geolocationHunts++;

      if (h.createdAt.getTime() >= sevenDaysAgoMs) {
        huntsLast7Days++;
      }

      const createdKey = h.createdAt.toISOString().slice(0, 10);
      const createdBucket = dailyMap.get(createdKey);
      if (createdBucket) createdBucket.huntsCreated++;

      // Count pins & track per-user collections for this hunt
      const perUserClaims = new Map<string, number>();
      let huntCollected = 0;
      let huntCoins = 0;
      let huntGifts = 0;
      let latestMs = h.updatedAt.getTime();

      const serializedPins = h.pins.map((p) => {
        totalPins++;
        const isGift = p.objectType === 'giftCard';
        if (isGift) {
          giftCardPins++;
          huntGifts++;
        } else {
          coinPins++;
          huntCoins++;
        }

        if (p.collectedByUserId) {
          collectedPins++;
          huntCollected++;
          perUserClaims.set(
            p.collectedByUserId,
            (perUserClaims.get(p.collectedByUserId) ?? 0) + 1
          );

          const collectorName = p.collectedByUser?.name || 'Hunter';
          ensureLooter(p.collectedByUserId, collectorName).pinsCollected++;

          if (p.collectedAt) {
            const cMs = p.collectedAt.getTime();
            if (cMs > latestMs) latestMs = cMs;
            const cKey = p.collectedAt.toISOString().slice(0, 10);
            const cBucket = dailyMap.get(cKey);
            if (cBucket) cBucket.pinsClaimed++;

            activityEvents.push({
              id: `claim-${p.id}`,
              kind: 'claim',
              timestamp: p.collectedAt.toISOString(),
              huntId: h.id,
              huntName,
              actorName: collectorName,
              detail: `Claimed ${isGift ? 'Rare Gift Card' : 'Gold Coin'} #${p.order + 1}`,
            });
          }
        }

        return {
          id: p.id,
          objectType: p.objectType || 'coin',
          order: p.order,
          lat: p.lat !== null ? Number(p.lat) : null,
          lng: p.lng !== null ? Number(p.lng) : null,
          distanceFt: p.distanceFt !== null ? Number(p.distanceFt) : null,
          directionStr: p.directionStr,
          collectedByUserId: p.collectedByUserId,
          collectedByName: p.collectedByUser?.name ?? null,
          collectedAt: p.collectedAt ? p.collectedAt.toISOString() : null,
        };
      });

      const serializedParticipants = h.participants.map((part) => {
        const pName = part.user?.name || 'Looter';
        ensureLooter(part.userId, pName).huntsJoined++;
        const jMs = part.joinedAt.getTime();
        if (jMs > latestMs) latestMs = jMs;

        activityEvents.push({
          id: `join-${part.id}`,
          kind: 'join',
          timestamp: part.joinedAt.toISOString(),
          huntId: h.id,
          huntName,
          actorName: pName,
          detail: 'Joined the hunt',
        });

        return {
          id: part.id,
          userId: part.userId,
          name: pName,
          joinedAt: part.joinedAt.toISOString(),
          collectedCount: perUserClaims.get(part.userId) ?? 0,
        };
      });

      const allPinsClaimed = h.pins.length > 0 && huntCollected === h.pins.length;
      const effectivelyCompleted = h.isCompleted || allPinsClaimed;

      let status: AdminHuntStatus = 'waiting';
      if (effectivelyCompleted) {
        status = 'completed';
        completedHunts++;
      } else if (huntCollected > 0 || h.participants.length > 0) {
        status = 'in_progress';
        inProgressHunts++;
      } else {
        status = 'waiting';
        waitingHunts++;
      }

      if (h.winnerId && h.winner?.name) {
        ensureLooter(h.winnerId, h.winner.name).huntsWon++;
      }

      if (h.creator) {
        const existing = creatorAgg.get(h.creator.id) ?? {
          id: h.creator.id,
          name: h.creator.name,
          huntsCreated: 0,
          totalParticipants: 0,
          totalPinsPlaced: 0,
        };
        existing.huntsCreated++;
        existing.totalParticipants += h.participants.length;
        existing.totalPinsPlaced += h.pins.length;
        creatorAgg.set(h.creator.id, existing);
      }

      activityEvents.push({
        id: `created-${h.id}`,
        kind: 'created',
        timestamp: h.createdAt.toISOString(),
        huntId: h.id,
        huntName,
        actorName: h.creator?.name || 'Host',
        detail: `Dropped ${h.pins.length} ${h.pins.length === 1 ? 'stash' : 'stashes'} (${
          huntType === 'proximity' ? `Proximity ${h.proximityRadiusFt ?? 100}ft` : 'GPS Map'
        })`,
      });

      if (effectivelyCompleted && h.completedAt) {
        activityEvents.push({
          id: `completed-${h.id}`,
          kind: 'completed',
          timestamp: h.completedAt.toISOString(),
          huntId: h.id,
          huntName,
          actorName: h.winner?.name || 'Crew',
          detail: 'Finished hunt — all stashes claimed',
        });
      }

      const completionPct =
        h.pins.length > 0 ? Math.round((huntCollected / h.pins.length) * 100) : 0;

      return {
        id: h.id,
        name: huntName,
        type: huntType,
        proximityRadiusFt: h.proximityRadiusFt,
        status,
        isCompleted: effectivelyCompleted,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
        completedAt: h.completedAt ? h.completedAt.toISOString() : null,
        creator: h.creator,
        creatorPhone: h.creatorPhone,
        creatorEmail: h.creatorEmail,
        preferredContactMethod: h.preferredContactMethod,
        winner: h.winner,
        totalPins: h.pins.length,
        collectedPins: huntCollected,
        coinPins: huntCoins,
        giftCardPins: huntGifts,
        completionPct,
        participantCount: h.participants.length,
        lastActivityAt: new Date(latestMs).toISOString(),
        participants: serializedParticipants,
        pins: serializedPins,
      };
    });

    activityEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const topCreators = Array.from(creatorAgg.values())
      .sort((a, b) => b.huntsCreated - a.huntsCreated || b.totalParticipants - a.totalParticipants)
      .slice(0, 6);

    const topLooters = Array.from(looterAgg.values())
      .sort((a, b) => b.pinsCollected - a.pinsCollected || b.huntsJoined - a.huntsJoined)
      .slice(0, 6);

    const totalHunts = rawHunts.length;
    const response: AdminOverviewResponse = {
      authProtected: protectedMode,
      generatedAt: now.toISOString(),
      kpis: {
        totalHunts,
        huntsLast7Days,
        inProgressHunts,
        waitingHunts,
        completedHunts,
        completionRatePct:
          totalHunts > 0 ? Math.round((completedHunts / totalHunts) * 100) : 0,
        totalPins,
        collectedPins,
        claimRatePct: totalPins > 0 ? Math.round((collectedPins / totalPins) * 100) : 0,
        coinPins,
        giftCardPins,
        geolocationHunts,
        proximityHunts,
        totalUsers,
        totalParticipations,
        uniqueCreators: creatorAgg.size,
      },
      dailyActivity: Array.from(dailyMap.values()),
      recentActivity: activityEvents.slice(0, 30),
      topCreators,
      topLooters,
      hunts,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error building admin overview:', error);
    return NextResponse.json({ message: 'Failed to load platform admin overview' }, { status: 500 });
  }
}
