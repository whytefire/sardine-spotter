"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Heart,
  Send,
  Loader2,
  Fish,
  Trash2,
  Navigation,
} from "lucide-react";
import Link from "next/link";
import { cn, timeAgo, formatDistance } from "@/lib/utils";
import { photoSrc } from "@/lib/images";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Sighting, Comment } from "@/lib/types";

interface SightingDetailModalProps {
  sighting: Sighting | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: number) => void;
  /** Called whenever like state changes so callers can keep their list in sync. */
  onLikeChange?: (id: number, likeCount: number, likedByMe: boolean) => void;
}

export function SightingDetailModal({
  sighting,
  isOpen,
  onClose,
  onDelete,
  onLikeChange,
}: SightingDetailModalProps) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const loadComments = useCallback(async (sightingId: number) => {
    setLoading(true);
    try {
      const res = await api.getComments(sightingId);
      setComments(res.data || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && sighting) {
      setComments([]);
      setCommentText("");
      setLiked(sighting.likedByMe);
      setLikeCount(sighting.likeCount);
      loadComments(sighting.id);
    }
  }, [isOpen, sighting, loadComments]);

  const handleToggleLike = async () => {
    if (!token || !sighting || likeBusy) return;
    const next = !liked;
    const optimisticCount = Math.max(0, likeCount + (next ? 1 : -1));
    // Optimistic — flip locally first, only roll back on failure
    setLiked(next);
    setLikeCount(optimisticCount);
    onLikeChange?.(sighting.id, optimisticCount, next);
    setLikeBusy(true);
    try {
      const res = next
        ? await api.likeSighting(token, sighting.id)
        : await api.unlikeSighting(token, sighting.id);
      // Server is source of truth — sync the canonical count
      setLikeCount(res.data.likeCount);
      setLiked(res.data.likedByMe);
      onLikeChange?.(sighting.id, res.data.likeCount, res.data.likedByMe);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setLiked(!next);
      const rollbackCount = Math.max(0, likeCount);
      setLikeCount(rollbackCount);
      onLikeChange?.(sighting.id, rollbackCount, !next);
    } finally {
      setLikeBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !sighting || !commentText.trim()) return;
    setPosting(true);
    try {
      const res = await api.createComment(token, sighting.id, commentText.trim());
      setComments((prev) => [
        ...prev,
        {
          ...res.data,
          nickname: user?.nickname || "You",
          avatarUrl: user?.avatarUrl ?? null,
        },
      ]);
      setCommentText("");
      setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !sighting) return;
    const confirmed = window.confirm("Delete this sighting? This cannot be undone.");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.deleteSighting(token, sighting.id);
      onDelete?.(sighting.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete sighting:", err);
      alert("Failed to delete sighting");
    } finally {
      setDeleting(false);
    }
  };

  const photo = photoSrc(sighting?.photoUrl);
  const canDelete =
    sighting &&
    user &&
    (sighting.userId === user.id || user.role === "god" || user.role === "admin");

  return (
    <AnimatePresence>
      {isOpen && sighting && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-deep-950/80 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sighting-modal-title"
            className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 sm:p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-deep-850 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-deep-200 dark:border-deep-700 pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-deep-200 dark:border-deep-700 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="avatar-ring shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ocean-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {sighting.nickname[0]?.toUpperCase() || "?"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="sighting-modal-title"
                      className="font-semibold text-deep-950 dark:text-white text-[15px] truncate"
                    >
                      {sighting.nickname}
                    </h2>
                    <p className="text-xs text-deep-500 dark:text-deep-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(sighting.createdAt)}
                      {sighting.distanceKm != null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <MapPin className="w-3 h-3" />
                          {formatDistance(sighting.distanceKm)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close sighting details"
                  className="p-2 -mr-2 text-deep-500 dark:text-deep-400 hover:text-deep-900 dark:hover:text-white rounded-lg hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {photo ? (
                  <img
                    src={photo}
                    alt={`Photo of sighting reported by ${sighting.nickname}`}
                    className="w-full max-h-[460px] object-cover bg-deep-100 dark:bg-deep-900"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-deep-900 via-ocean-900 to-ocean-700 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white/80">
                      <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
                        <Fish className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold">No photo attached</span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-ocean-500 to-teal-500 text-white shadow-sm">
                      <Fish className="w-3 h-3" />
                      Sardine Sighting
                    </span>
                    <Link
                      href={`/app/map?sighting=${sighting.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 dark:hover:text-ocean-300 px-3 py-1.5 rounded-lg hover:bg-ocean-50 dark:hover:bg-ocean-950/40 min-h-[36px]"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      View on Map
                    </Link>
                  </div>

                  <p className="text-deep-800 dark:text-deep-100 leading-relaxed whitespace-pre-wrap">
                    {sighting.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-deep-500 dark:text-deep-400 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {sighting.latitude.toFixed(4)}°, {sighting.longitude.toFixed(4)}°
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-deep-100 dark:border-deep-800">
                    <button
                      onClick={handleToggleLike}
                      disabled={!token || likeBusy}
                      aria-pressed={liked}
                      aria-label={liked ? "Unlike sighting" : "Like sighting"}
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-semibold transition-all px-2 py-2 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed",
                        liked
                          ? "text-coral-500 dark:text-coral-400"
                          : "text-deep-600 dark:text-deep-300 hover:text-coral-500 dark:hover:text-coral-400"
                      )}
                    >
                      <Heart
                        className={cn("w-5 h-5 transition-all", liked && "fill-current scale-110")}
                      />
                      <span className="tabular-nums">
                        {likeCount > 0 ? likeCount : ""}{" "}
                        {liked ? "Liked" : "Like"}
                      </span>
                    </button>
                    <span className="text-sm text-deep-500 dark:text-deep-400 font-medium">
                      {comments.length} {comments.length === 1 ? "comment" : "comments"}
                    </span>
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="ml-auto flex items-center gap-1.5 text-sm font-medium text-deep-500 dark:text-deep-400 hover:text-coral-500 dark:hover:text-coral-400 px-2 py-2 rounded-lg min-h-[44px] disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>

                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-deep-700 dark:text-deep-200 mb-3">
                      Comments
                    </h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-6 text-deep-500 dark:text-deep-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-deep-500 dark:text-deep-400 py-4 text-center">
                        Be the first to comment.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {comments.map((c) => (
                          <li key={c.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {c.nickname[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0 bg-deep-50 dark:bg-deep-800 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-deep-900 dark:text-white text-sm">
                                  {c.nickname}
                                </span>
                                <span className="text-[11px] text-deep-500 dark:text-deep-400">
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-deep-700 dark:text-deep-200 leading-relaxed break-words">
                                {c.text}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                </div>
              </div>

              {token && (
                <form
                  onSubmit={handlePostComment}
                  className="border-t border-deep-200 dark:border-deep-700 px-4 py-3 flex items-center gap-2 shrink-0 bg-white dark:bg-deep-850"
                >
                  <label htmlFor="new-comment" className="sr-only">
                    Add a comment
                  </label>
                  <input
                    id="new-comment"
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    maxLength={500}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-500 dark:placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="submit"
                    disabled={posting || !commentText.trim()}
                    aria-label="Post comment"
                    className="p-2.5 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {posting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
