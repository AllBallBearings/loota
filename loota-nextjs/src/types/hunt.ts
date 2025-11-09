export interface PinData {
  id: string;
  lat?: number;
  lng?: number;
  distanceFt?: number;
  directionStr?: string;
  x?: number;
  y?: number;
  objectType?: string; // Type of loot object (coin, giftCard, etc.)
  collectedByUserId?: string;
  collectedByUser?: {
    id: string;
    name: string;
  };
  collectedAt?: string;
}

export interface HuntParticipationData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
  joinedAt: string;
}

export interface HuntData {
  id: string;
  name?: string;
  type: 'geolocation' | 'proximity';
  creator?: {
    id: string;
    name: string;
  };
  pins: PinData[];
  participants: HuntParticipationData[];
}