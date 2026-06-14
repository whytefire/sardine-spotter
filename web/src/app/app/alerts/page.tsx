"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  Check,
  Bell,
  Loader2,
  RefreshCw,
  Fish,
  MessageCircle,
  Heart,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Notification, Sighting } from "@/lib/types";
import { SightingDetailModal } from "@/components/app/SightingDetailModal";

function notificationCopy(n: Notification) {
  const actorName = n.actor?.nickname ?? "Someone";

  if (n.kind === "comment") {
    const subject =
      n.sighting.nickname && n.sighting.nickname !== actorName
        ? `${n.sighting.nickname}'s sighting`
        : "a sighting";
    return {
      headline: (
        <>
          <span className="font-semibold">{actorName}</span> commented on {subject}
        </>
      ),
      detail: n.comment?.text ?? n.sighting.description,
      Icon: MessageCircle,
      accent: "comment" as const,
    };
  }

  if (n.kind === "like") {
    return {
      headline: (
        <>
          <span className="font-semibold">{actorName}</span> liked your sighting
        </>
      ),
      detail: n.sighting.description,
      Icon: Heart,
      accent: "like" as const,
    };
  }

  return {
    headline: (
      <>
        <span className="font-semibold">{actorName}</span> reported a sighting
      </>
    ),
    detail: n.sighting.description,
    Icon: Fish,
    accent: "sighting" as const,
  };
}

export default function AlertsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSighting, setActiveSighting] = useState<Sighting | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const load = useCallback(
    async (showSpinner = true) => {
      if (!token) return;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await api.getNotifications(token);
        setNotifications(res.data || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load alerts:", err);
        setError("Could not load alerts. Pull to refresh.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllRead(token);
    } catch (err) {
      console.error("Failed to mark all read:", err);
      load(false);
    }
  };

  const handleOpenAlert = async (notification: Notification) => {
    if (!token) return;
    setOpeningId(notification.id);
    try {
      const res = await api.getSighting(notification.sighting.id, token);
      setActiveSighting(res.data);
      setModalOpen(true);
      if (!notification.read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        api.markRead(token, notification.id).catch((err) =>
          console.error("Failed to mark read:", err)
        );
      }
    } catch (err) {
      console.error("Failed to open sighting:", err);
      alert("That sighting is no longer available.");
    } finally {
      setOpeningId(null);
    }
  };

  const handleSightingDeleted = (deletedId: number) => {
    setNotifications((prev) =>
      prev.filter((n) => n.sighting.id !== deletedId)
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
              Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-coral-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-deep-600 dark:text-deep-300 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} new update${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => load(false)}
            aria-label="Refresh alerts"
            disabled={refreshing}
            className="p-2 rounded-lg text-deep-600 dark:text-deep-300 hover:bg-surface-100 dark:hover:bg-deep-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ocean-700 dark:text-ocean-300 hover:bg-ocean-50 dark:hover:bg-ocean-900/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-deep-500 dark:text-deep-400">
          <Loader2 className="w-6 h-6 animate-spin mb-3" />
          <p className="text-sm">Loading alerts…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-coral-200 dark:border-coral-900/40 bg-coral-50 dark:bg-coral-950/20 p-4 text-sm text-coral-700 dark:text-coral-300">
          {error}
        </div>
      )}

      {/* Notification cards */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, index) => {
            const { headline, detail, Icon, accent } = notificationCopy(notification);
            const actorInitial =
              notification.actor?.nickname?.[0]?.toUpperCase() ??
              notification.sighting.nickname?.[0]?.toUpperCase() ??
              "?";
            const isComment = accent === "comment";
            const isLike = accent === "like";
            const accentBg =
              accent === "sighting"
                ? "bg-gradient-to-br from-ocean-500 to-ocean-600"
                : accent === "comment"
                ? "bg-gradient-to-br from-coral-500 to-coral-600"
                : "bg-gradient-to-br from-coral-400 to-sunset-500";
            const badgeBg =
              accent === "sighting" ? "bg-ocean-500" : "bg-coral-500";

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) }}
                className={cn(
                  "group relative rounded-2xl transition-all",
                  !notification.read && "accent-border-left"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleOpenAlert(notification)}
                  disabled={openingId === notification.id}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-4 rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500",
                    notification.read
                      ? "bg-white dark:bg-deep-800 border border-deep-200 dark:border-deep-700 hover:border-ocean-300 dark:hover:border-ocean-700"
                      : "bg-ocean-50/50 dark:bg-ocean-900/20 border border-ocean-200/50 dark:border-ocean-700/30 hover:border-ocean-400 dark:hover:border-ocean-600"
                  )}
                >
                  {/* Avatar with kind badge */}
                  <div className="relative flex-shrink-0">
                    <div className="avatar-ring">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                          accentBg
                        )}
                      >
                        {actorInitial}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-deep-850",
                        badgeBg
                      )}
                      aria-hidden="true"
                    >
                      <Icon
                        className={cn(
                          "w-2.5 h-2.5 text-white",
                          isLike && "fill-current"
                        )}
                      />
                    </span>
                    {!notification.read && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-coral-500 border-2 border-ocean-50 dark:border-deep-850" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        notification.read
                          ? "text-deep-700 dark:text-deep-300"
                          : "text-deep-900 dark:text-white"
                      )}
                    >
                      {headline}
                    </p>
                    <p
                      className={cn(
                        "text-sm leading-relaxed line-clamp-2 mt-0.5",
                        notification.read
                          ? "text-deep-600 dark:text-deep-400"
                          : "text-deep-800 dark:text-deep-200",
                        isComment && "italic"
                      )}
                    >
                      {isComment ? `“${detail}”` : detail}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-deep-800 text-xs text-deep-600 dark:text-deep-300">
                        <Clock className="w-3 h-3" />
                        {timeAgo(notification.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-deep-800 text-xs text-deep-600 dark:text-deep-300">
                        <MapPin className="w-3 h-3" />
                        {notification.sighting.latitude.toFixed(3)}°,{" "}
                        {notification.sighting.longitude.toFixed(3)}°
                      </span>
                    </div>
                  </div>

                  {openingId === notification.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-ocean-500 dark:text-ocean-400 flex-shrink-0 mt-2" />
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-deep-800 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-deep-400 dark:text-deep-500" />
          </div>
          <p className="text-deep-700 dark:text-deep-200 font-medium">
            No alerts yet
          </p>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-1 max-w-xs mx-auto">
            You&apos;ll be notified here when someone reports a sighting or
            comments on one. Make sure push notifications are enabled in
            Settings.
          </p>
        </div>
      )}

      <SightingDetailModal
        sighting={activeSighting}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={handleSightingDeleted}
      />
    </div>
  );
}
