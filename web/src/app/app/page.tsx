"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Fish,
  MapPin,
  Clock,
  MessageCircle,
  Heart,
  Camera,
  Filter,
  ChevronDown,
  TrendingUp,
  Waves,
  AlertCircle,
  RefreshCw,
  Pin,
} from "lucide-react";
import { cn, timeAgo, formatDistance } from "@/lib/utils";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { photoSrc } from "@/lib/images";
import { useAuth } from "@/lib/auth-context";
import { SightingDetailModal } from "@/components/app/SightingDetailModal";
import { ModerationMenu } from "@/components/app/ModerationMenu";
import { SightingCardSkeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import type { Sighting } from "@/lib/types";

const avatarColors = [
  "from-ocean-500 to-teal-500",
  "from-coral-500 to-sunset-500",
  "from-sea-green-500 to-ocean-500",
  "from-sunset-500 to-coral-400",
];

function SightingCard({
  sighting,
  index,
  token,
  canModerate,
  onOpen,
  onLikeChange,
  onDeleted,
}: {
  sighting: Sighting;
  index: number;
  token: string | null;
  canModerate: boolean;
  onOpen: () => void;
  onLikeChange: (id: number, likeCount: number, likedByMe: boolean) => void;
  onDeleted: (id: number) => void;
}) {
  const photo = photoSrc(sighting.photoUrl);
  const [likeBusy, setLikeBusy] = useState(false);

  const handleLikeToggle = async () => {
    if (!token || likeBusy) return;
    const next = !sighting.likedByMe;
    setLikeBusy(true);
    // Optimistic — bump the parent's copy first so the heart fills instantly.
    onLikeChange(
      sighting.id,
      Math.max(0, sighting.likeCount + (next ? 1 : -1)),
      next
    );
    try {
      const res = next
        ? await api.likeSighting(token, sighting.id)
        : await api.unlikeSighting(token, sighting.id);
      // Sync to the server's canonical count
      onLikeChange(sighting.id, res.data.likeCount, res.data.likedByMe);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Roll back the optimistic update
      onLikeChange(sighting.id, sighting.likeCount, sighting.likedByMe);
    } finally {
      setLikeBusy(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative rounded-2xl border bg-white dark:bg-deep-850 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden",
        sighting.isPinned
          ? "border-amber-400/70 dark:border-amber-500/50 hover:shadow-amber-500/10 dark:hover:shadow-amber-400/5"
          : "border-deep-200/80 dark:border-deep-700/60 hover:shadow-ocean-600/8 dark:hover:shadow-ocean-400/5"
      )}
    >
      {/* Accent stripe — amber for pinned, teal otherwise */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
        sighting.isPinned ? "from-amber-400 to-amber-600" : "from-ocean-400 to-ocean-600"
      )} aria-hidden="true" />

      {/* Pinned badge */}
      {sighting.isPinned && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
          <Pin className="w-3 h-3" />
          Pinned
        </div>
      )}

      {/* Moderation kebab — sits OUTSIDE the open-button so its own button
          doesn't violate the HTML "no nested buttons" rule. Only renders
          for admin users. */}
      {canModerate && token && !sighting.isPinned && (
        <div className="absolute top-4 right-4 z-10">
          <ModerationMenu
            canModerate
            targetLabel="this sighting"
            authorNickname={sighting.nickname}
            variant="ghost"
            onDelete={async (reason) => {
              await api.deleteSighting(token, sighting.id, reason);
              onDeleted(sighting.id);
            }}
          />
        </div>
      )}

      {/* Clickable upper region — opens the modal. The action bar below is
          rendered OUTSIDE this button so the heart can be its own real button.
          (HTML doesn't allow buttons inside buttons.) */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open sighting from ${sighting.nickname}`}
        className="block w-full text-left p-5 pl-6 pb-0 cursor-pointer"
      >
        {/* Header */}
        <div className={cn(
          "flex items-start justify-between gap-3",
          canModerate && "pr-10"
        )}>
          <div className="flex items-center gap-3">
            <Avatar
              nickname={sighting.nickname}
              avatarUrl={sighting.avatarUrl}
              size="md"
              ring
              gradient={avatarColors[index % avatarColors.length]}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-deep-900 dark:text-white text-[15px] truncate">
                {sighting.nickname}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-deep-100 dark:bg-deep-800 text-[11px] font-medium text-deep-600 dark:text-deep-300">
                  <Clock className="w-3 h-3" />
                  {timeAgo(sighting.createdAt)}
                </span>
                {sighting.distanceKm != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-deep-100 dark:bg-deep-800 text-[11px] font-medium text-deep-600 dark:text-deep-300">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(sighting.distanceKm)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-ocean-500 to-teal-500 text-white shadow-sm shadow-ocean-500/20 flex items-center gap-1">
            <Fish className="w-3 h-3" />
            Sighting
          </span>
        </div>

        {/* Description */}
        <p className="mt-3.5 text-deep-700 dark:text-deep-300 text-sm leading-relaxed line-clamp-3">
          {sighting.description}
        </p>

        {/* Photo */}
        {photo ? (
          <div className="mt-3.5 rounded-xl overflow-hidden border border-deep-200/50 dark:border-deep-700/50">
            <img
              src={photo}
              alt={`Sighting by ${sighting.nickname}`}
              className="w-full h-52 object-cover bg-deep-100 dark:bg-deep-900 group-hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />
          </div>
        ) : null}
      </button>

      {/* Action bar — outside the open button so we can have real buttons */}
      <div className="px-5 pl-6 pt-3.5 pb-5 mt-4 border-t border-deep-100 dark:border-deep-800 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleLikeToggle}
            disabled={!token || likeBusy}
            aria-pressed={sighting.likedByMe}
            aria-label={
              sighting.likedByMe
                ? `Unlike sighting (${sighting.likeCount} likes)`
                : `Like sighting (${sighting.likeCount} likes)`
            }
            className={cn(
              "flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-all min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:opacity-50 disabled:cursor-not-allowed",
              sighting.likedByMe
                ? "text-coral-500 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-950/30"
                : "text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800 hover:text-coral-500 dark:hover:text-coral-400"
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-transform",
                sighting.likedByMe && "fill-current scale-110"
              )}
            />
            <span className="font-semibold tabular-nums">
              {sighting.likeCount}
            </span>
            <span className="text-deep-500 dark:text-deep-400 hidden sm:inline">
              {sighting.likeCount === 1 ? "like" : "likes"}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open comments (${sighting.commentCount})`}
            className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800 transition-all min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
          >
            <Waves className="w-4 h-4" />
            <span className="font-semibold tabular-nums">{sighting.commentCount}</span>
            <span className="text-deep-500 dark:text-deep-400 hidden sm:inline">
              {sighting.commentCount === 1 ? "comment" : "comments"}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 dark:hover:text-ocean-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Open
        </button>
      </div>
    </motion.article>
  );
}

type SortOption = "newest" | "most_liked" | "most_commented";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  most_liked: "Most Liked",
  most_commented: "Most Commented",
};

function sortSightings(sightings: Sighting[], sort: SortOption): Sighting[] {
  const copy = [...sightings];
  if (sort === "most_liked") return copy.sort((a, b) => b.likeCount - a.likeCount);
  if (sort === "most_commented") return copy.sort((a, b) => b.commentCount - a.commentCount);
  return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default function FeedPage() {
  const { user, token } = useAuth();
  const canModerate = user?.role === "admin";
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Request location for distance calculation (optional)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Ignore — feed still works without GPS
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }, []);

  const loadSightings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: { lat?: number; lng?: number; radius?: number } = {};
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = user?.radius ?? 50;
      }
      const res = await api.getSightings(params, token ?? undefined);
      setSightings(res.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sightings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [coords, user?.radius, token]);

  useEffect(() => {
    loadSightings();
  }, [loadSightings]);

  const openSighting = (s: Sighting) => {
    setSelected(s);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setSightings((prev) => prev.filter((s) => s.id !== id));
  };

  const handleLikeChange = (id: number, likeCount: number, likedByMe: boolean) => {
    setSightings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, likeCount, likedByMe } : s))
    );
    if (selected?.id === id) {
      setSelected((s) => (s ? { ...s, likeCount, likedByMe } : s));
    }
  };

  const handlePinChange = (id: number, isPinned: boolean) => {
    setSightings((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, isPinned } : s))
        // Re-sort: pinned items bubble to the top
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        })
    );
    if (selected?.id === id) {
      setSelected((s) => (s ? { ...s, isPinned } : s));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
            Live Feed
          </h1>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-1.5">
            All sightings along the KZN coast in the last 48 hours
          </p>
        </div>
        <button
          onClick={loadSightings}
          disabled={loading}
          aria-label="Refresh feed"
          className="p-2.5 rounded-xl text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Season status banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-deep-900 via-ocean-900 to-ocean-600 text-white flex items-center gap-4 shadow-xl shadow-ocean-900/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0 50 Q100 20 200 50 Q300 80 400 50 L400 100 L0 100Z" fill="rgba(255,255,255,0.08)" />
            <path d="M0 60 Q100 30 200 60 Q300 90 400 60 L400 100 L0 100Z" fill="rgba(255,255,255,0.05)" />
          </svg>
        </div>
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Fish className="w-6 h-6 animate-float" />
          </div>
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sea-green-400 border-2 border-ocean-800 shadow-lg shadow-sea-green-400/50"
            aria-hidden="true"
          />
        </div>
        <div className="relative flex-1">
          <p className="font-display font-bold text-base">Sardine Season Active</p>
          <p className="text-ocean-200 text-sm mt-0.5">
            {loading
              ? "Loading sightings…"
              : `${sightings.length} sighting${sightings.length === 1 ? "" : "s"} along the KZN coast in the last 48h`}
          </p>
        </div>
        <div className="relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium">
          <TrendingUp className="w-3.5 h-3.5 text-sea-green-400" />
          <span>Trending</span>
        </div>
      </motion.div>

      {/* Sort bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-deep-500 dark:text-deep-400" />
          <span className="text-sm font-semibold text-deep-600 dark:text-deep-300">
            Sardine Sightings
          </span>
        </div>
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm font-medium text-deep-600 dark:text-deep-300 hover:text-deep-700 dark:hover:text-deep-200 transition-colors px-3 py-2 rounded-xl bg-white dark:bg-deep-800 border border-deep-200 dark:border-deep-700 shadow-sm hover:shadow cursor-pointer"
          >
            {SORT_LABELS[sortBy]}
            <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 shadow-lg overflow-hidden">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                    sortBy === opt
                      ? "bg-ocean-50 dark:bg-ocean-950/30 text-ocean-600 dark:text-ocean-400 font-semibold"
                      : "text-deep-700 dark:text-deep-200 hover:bg-deep-50 dark:hover:bg-deep-700"
                  }`}
                >
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 p-4 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-700 dark:text-coral-300 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Couldn&apos;t load the feed</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Sighting cards */}
      {loading ? (
        <div className="space-y-4">
          <SightingCardSkeleton />
          <SightingCardSkeleton />
          <SightingCardSkeleton />
        </div>
      ) : sightings.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ocean-100 to-deep-100 dark:from-deep-800 dark:to-deep-700 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-10 h-10 text-deep-400 dark:text-deep-500" />
          </div>
          <p className="font-display font-bold text-lg text-deep-900 dark:text-white">
            No sightings yet
          </p>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-1">
            Be the first to report a sighting in your area!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortSightings(sightings, sortBy).map((sighting, index) => (
            <SightingCard
              key={sighting.id}
              sighting={sighting}
              index={index}
              token={token}
              canModerate={canModerate}
              onOpen={() => openSighting(sighting)}
              onLikeChange={handleLikeChange}
              onDeleted={handleDelete}
            />
          ))}
        </div>
      )}

      <SightingDetailModal
        sighting={selected}
        isOpen={modalOpen}
        onClose={closeModal}
        onDelete={handleDelete}
        onLikeChange={handleLikeChange}
        onPinChange={handlePinChange}
      />
    </div>
  );
}
