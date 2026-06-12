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

export type NotificationKind = "sighting" | "comment";

export interface NotificationActor {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
}

export interface NotificationCommentBody {
  id: number;
  text: string;
}

export interface Notification {
  id: number;
  read: boolean;
  createdAt: string;
  kind: NotificationKind;
  /** Who did the action — reporter for sightings, commenter for comments. May be null for legacy rows. */
  actor: NotificationActor | null;
  /** The sighting the notification refers to. `nickname` / `avatarUrl` here are the sighting AUTHOR. */
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
  /** Only set when kind === 'comment'. */
  comment: NotificationCommentBody | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}
