export interface User {
  id: number;
  email: string;
  nickname: string;
  role: "admin" | "user";
  radius: number;
  avatarUrl?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface Sighting {
  id: number;
  userId: number;
  nickname: string;
  avatarUrl?: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  category: SightingCategory;
  createdAt: Date;
  distance?: number;
  commentCount: number;
}

export type SightingCategory = "sardine_sighting";

export interface Comment {
  id: number;
  sightingId: number;
  userId: number;
  nickname: string;
  avatarUrl?: string;
  text: string;
  createdAt: Date;
}

export interface Notification {
  id: number;
  sightingId: number;
  userId: number;
  read: boolean;
  createdAt: Date;
  sighting?: Sighting;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
