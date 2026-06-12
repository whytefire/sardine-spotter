export interface Sighting {
  id: number;
  userId: number;
  nickname: string;
  avatarUrl?: string | null;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  category: string;
  createdAt: string;
  distanceKm?: number | null;
  commentCount: number;
}

export interface Comment {
  id: number;
  sightingId: number;
  userId: number;
  nickname: string;
  avatarUrl?: string | null;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  read: boolean;
  createdAt: string;
  sighting: {
    id: number;
    description: string;
    latitude: number;
    longitude: number;
    category: string;
    photoUrl?: string | null;
    createdAt: string;
    nickname: string;
    avatarUrl?: string | null;
  };
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}
