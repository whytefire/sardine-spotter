"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { cn, timeAgo, formatDistance } from "@/lib/utils";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { photoSrc } from "@/lib/images";
import { useAuth } from "@/lib/auth-context";
import { SightingDetailModal } from "@/components/app/SightingDetailModal";
import { SightingCardSkeleton } from "@/components/ui/skeleton";
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
  onOpen,
}: {
  sighting: Sighting;
  index: number;
  onOpen: () => void;
}) {
  const photo = photoSrc(sighting.photoUrl);
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl border border-deep-200/80 dark:border-deep-700/60 bg-white dark:bg-deep-850 shadow-sm hover:shadow-xl hover:shadow-ocean-600/8 dark:hover:shadow-ocean-400/5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Teal accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-ocean-400 to-ocean-600" aria-hidden="true" />

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open sighting from ${sighting.nickname}`}
        className="block w-full text-left p-5 pl-6 cursor-pointer"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="avatar-ring shrink-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br",
                  avatarColors[index % avatarColors.length]
                )}
              >
                {sighting.nickname[0].toUpperCase()}
              </div>
            </div>
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

        {/* Actions */}
        <div
          className="mt-4 pt-3.5 border-t border-deep-100 dark:border-deep-800 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-deep-600 dark:text-deep-300 text-sm">
              <Waves className="w-4 h-4" />
              <span className="font-semibold">{sighting.commentCount}</span>
              <span className="text-deep-500 dark:text-deep-400">
                {sighting.commentCount === 1 ? "comment" : "comments"}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean-600 dark:text-ocean-400 group-hover:text-ocean-700 dark:group-hover:text-ocean-300 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
            Open
          </span>
        </div>
      </button>
    </motion.article>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
      const res = await api.getSightings(params);
      setSightings(res.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sightings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [coords, user?.radius]);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
            Live Feed
          </h1>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-1.5">
            Sightings from the last 24 hours near you
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
              : `${sightings.length} sighting${sightings.length === 1 ? "" : "s"} in the last 24h${coords ? " within your radius" : ""}`}
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
        <button className="flex items-center gap-1.5 text-sm font-medium text-deep-600 dark:text-deep-300 hover:text-deep-700 dark:hover:text-deep-200 transition-colors px-3 py-2 rounded-xl bg-white dark:bg-deep-800 border border-deep-200 dark:border-deep-700 shadow-sm hover:shadow">
          Newest
          <ChevronDown className="w-4 h-4" />
        </button>
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
          {sightings.map((sighting, index) => (
            <SightingCard
              key={sighting.id}
              sighting={sighting}
              index={index}
              onOpen={() => openSighting(sighting)}
            />
          ))}
        </div>
      )}

      <SightingDetailModal
        sighting={selected}
        isOpen={modalOpen}
        onClose={closeModal}
        onDelete={handleDelete}
      />
    </div>
  );
}
