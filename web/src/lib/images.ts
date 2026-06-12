const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function photoSrc(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  if (photoUrl.startsWith("/")) return `${API_BASE}${photoUrl}`;
  return `${API_BASE}/${photoUrl}`;
}
