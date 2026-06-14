import type { Sighting, Comment, Notification, ApiEnvelope } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, nickname: string) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    }),

  getMe: (token: string) =>
    apiFetch("/api/auth/me", { token }),

  updateProfile: (
    token: string,
    data: { nickname?: string; avatarUrl?: string | null }
  ) =>
    apiFetch<ApiEnvelope<{ id: number; email: string; nickname: string; avatarUrl: string | null; role: string; radius: number }>>(
      "/api/auth/profile",
      { method: "PUT", token, body: JSON.stringify(data) }
    ),

  updateEmail: (token: string, email: string, password: string) =>
    apiFetch<ApiEnvelope<{ token: string; user: { id: number; email: string; nickname: string; avatarUrl: string | null; role: string; radius: number } }>>(
      "/api/auth/email",
      { method: "PUT", token, body: JSON.stringify({ email, password }) }
    ),

  updatePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiFetch<ApiEnvelope<null>>("/api/auth/password", {
      method: "PUT",
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Sightings — token is optional so the server can compute `likedByMe` for logged-in viewers
  getSightings: (
    params?: { lat?: number; lng?: number; radius?: number; page?: number },
    token?: string
  ) => {
    const query = new URLSearchParams();
    if (params?.lat) query.set("lat", String(params.lat));
    if (params?.lng) query.set("lng", String(params.lng));
    if (params?.radius) query.set("radius", String(params.radius));
    if (params?.page) query.set("page", String(params.page));
    return apiFetch<ApiEnvelope<Sighting[]>>(
      `/api/sightings?${query.toString()}`,
      { token }
    );
  },

  getSighting: (id: number, token?: string) =>
    apiFetch<ApiEnvelope<Sighting>>(`/api/sightings/${id}`, { token }),

  likeSighting: (token: string, id: number) =>
    apiFetch<ApiEnvelope<{ likeCount: number; likedByMe: boolean }>>(
      `/api/sightings/${id}/like`,
      { method: "POST", token }
    ),

  unlikeSighting: (token: string, id: number) =>
    apiFetch<ApiEnvelope<{ likeCount: number; likedByMe: boolean }>>(
      `/api/sightings/${id}/like`,
      { method: "DELETE", token }
    ),

  createSighting: (token: string, data: {
    description: string;
    latitude: number;
    longitude: number;
    category?: string;
    photoUrl?: string;
  }) =>
    apiFetch<ApiEnvelope<Sighting>>("/api/sightings", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  deleteSighting: (token: string, id: number) =>
    apiFetch<ApiEnvelope<null>>(`/api/sightings/${id}`, { method: "DELETE", token }),

  // Comments
  getComments: (sightingId: number) =>
    apiFetch<ApiEnvelope<Comment[]>>(`/api/comments/${sightingId}`),

  createComment: (token: string, sightingId: number, text: string) =>
    apiFetch<ApiEnvelope<Comment>>(`/api/comments/${sightingId}`, {
      method: "POST",
      token,
      body: JSON.stringify({ text }),
    }),

  // Notifications
  getNotifications: (token: string, unreadOnly?: boolean) =>
    apiFetch<ApiEnvelope<Notification[]>>(
      `/api/notifications${unreadOnly ? "?unread_only=true" : ""}`,
      { token }
    ),

  markAllRead: (token: string) =>
    apiFetch<ApiEnvelope<null>>("/api/notifications/read-all", { method: "PUT", token }),

  markRead: (token: string, id: number) =>
    apiFetch<ApiEnvelope<null>>(`/api/notifications/${id}/read`, { method: "PUT", token }),

  // Push subscription
  getVapidKey: () =>
    apiFetch<{ success: boolean; data: { publicKey: string } }>("/api/notifications/vapid-key"),

  subscribePush: (token: string, subscription: PushSubscription) =>
    apiFetch("/api/notifications/subscribe", {
      method: "POST",
      token,
      body: JSON.stringify(subscription.toJSON()),
    }),

  unsubscribePush: (token: string, endpoint?: string) =>
    apiFetch("/api/notifications/unsubscribe", {
      method: "POST",
      token,
      body: JSON.stringify({ endpoint }),
    }),

  // Upload
  uploadPhoto: async (
    token: string,
    file: File
  ): Promise<ApiEnvelope<{ photoUrl: string; filename: string }>> => {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`${API_BASE}/api/upload/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },

  uploadAvatar: async (
    token: string,
    file: File
  ): Promise<ApiEnvelope<{ avatarUrl: string; filename: string }>> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch(`${API_BASE}/api/upload/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Avatar upload failed");
    return data;
  },
};
