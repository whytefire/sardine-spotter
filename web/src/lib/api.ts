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
    const err = new Error(data.error || `Request failed with status ${res.status}`) as Error & { banReason?: string };
    if (data.banReason) err.banReason = data.banReason;

    // If the server says this account is banned, clear the local session and
    // send the user to the login page immediately (ban takes effect in real time).
    if (res.status === 403 && data.error === "banned" && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const reason = data.banReason ? `?banReason=${encodeURIComponent(data.banReason)}` : "";
      window.location.href = `/login${reason}`;
    }

    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string, rememberMe = false) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    }),

  register: (email: string, password: string, nickname: string) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    }),

  getMe: (token: string) =>
    apiFetch("/api/auth/me", { token }),

  forgotPassword: (email: string) =>
    apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  sendContactMessage: (name: string, email: string, message: string) =>
    apiFetch("/api/contact", {
      method: "POST",
      body: JSON.stringify({ name, email, message }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  /**
   * POPIA right of access — downloads the full personal-data dump as a JSON
   * file. Returns the parsed payload AND triggers a browser file download so
   * the user keeps a local copy.
   */
  exportMyData: async (token: string): Promise<unknown> => {
    const res = await fetch(`${API_BASE}/api/auth/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sardine-spotter-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return blob.size;
  },

  /** POPIA right to erasure — permanently deletes the user's account. */
  deleteMyAccount: (token: string, password: string) =>
    apiFetch<ApiEnvelope<null>>("/api/auth/me", {
      method: "DELETE",
      token,
      body: JSON.stringify({ password }),
    }),

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

  /** Edit a sighting's description, photo, or category. Owner or admin only. No push notification sent. */
  editSighting: (
    token: string,
    id: number,
    fields: { description?: string; photoUrl?: string | null; category?: string }
  ) =>
    apiFetch<ApiEnvelope<{ id: number; description: string; photoUrl: string | null; category: string }>>(
      `/api/sightings/${id}`,
      { method: "PUT", token, body: JSON.stringify(fields) }
    ),

  /** Pins or unpins a sighting. Admin only. */
  pinSighting: (token: string, id: number, pinned: boolean) =>
    apiFetch<ApiEnvelope<{ isPinned: boolean }>>(`/api/sightings/${id}/pin`, {
      method: "PUT",
      token,
      body: JSON.stringify({ pinned }),
    }),

  /** Deletes a sighting. Allowed for the original reporter and for admins. */
  deleteSighting: (token: string, id: number, reason?: string) =>
    apiFetch<ApiEnvelope<null>>(`/api/sightings/${id}`, {
      method: "DELETE",
      token,
      body: JSON.stringify({ reason: reason ?? null }),
    }),

  /** Deletes a single comment. Allowed for its author and for admins. */
  deleteComment: (token: string, commentId: number, reason?: string) =>
    apiFetch<ApiEnvelope<null>>(`/api/comments/${commentId}`, {
      method: "DELETE",
      token,
      body: JSON.stringify({ reason: reason ?? null }),
    }),

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
