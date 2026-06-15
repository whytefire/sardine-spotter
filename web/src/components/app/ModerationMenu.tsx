"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, Trash2, X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Three-dot kebab menu that opens a confirmation dialog for moderation
 * actions. Shared between sighting cards, the sighting detail modal and
 * individual comments inside that modal — anywhere an admin needs to
 * remove user-submitted content.
 *
 * Rendering is gated by the `canModerate` prop: if false, the component
 * renders nothing. That keeps the visual chrome away from regular users
 * and centralises the role check in one place.
 *
 * The trigger button uses stopPropagation so opening the menu doesn't
 * also fire the underlying card's click handler (which would open the
 * sighting modal).
 */
export function ModerationMenu({
  canModerate,
  targetLabel,
  authorNickname,
  onDelete,
  align = "right",
  className,
  variant = "filled",
}: {
  canModerate: boolean;
  /** Human label shown in the confirm dialog, e.g. "this sighting" / "this comment". */
  targetLabel: string;
  /** The author whose content we're about to remove — shown for context in the dialog. */
  authorNickname?: string;
  /** Called when the user confirms. Receives the optional reason string. */
  onDelete: (reason: string) => Promise<void>;
  align?: "left" | "right";
  className?: string;
  /** "filled" sits on top of an image; "ghost" blends into card chrome. */
  variant?: "filled" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // The confirmation dialog renders via a portal to document.body so it
  // can escape ancestors that have a `transform` (the sighting card uses
  // framer-motion, which sets transform during animation). Any transformed
  // ancestor creates a new containing block, so `position: fixed` becomes
  // relative to the card instead of the viewport — that's what caused the
  // dialog to appear clipped inside the feed column.
  //
  // We need to wait until after mount to know document.body exists (SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Click-outside to dismiss the kebab menu.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!canModerate) return null;

  const triggerClasses =
    variant === "filled"
      ? "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
      : "bg-deep-100 hover:bg-deep-200 dark:bg-deep-700 dark:hover:bg-deep-600 text-deep-700 dark:text-deep-200";

  return (
    <>
      <div ref={wrapperRef} className={cn("relative inline-block", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-label="Moderation actions"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors",
            triggerClasses
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              role="menu"
              className={cn(
                "absolute z-30 top-10 min-w-[180px] rounded-xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-900 shadow-xl py-1.5 overflow-hidden",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              <div className="px-3 py-2 border-b border-deep-100 dark:border-deep-800 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-ocean-500" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-deep-500 dark:text-deep-400">
                  Moderator tools
                </span>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setConfirmOpen(true);
                  setReason("");
                  setError(null);
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-coral-600 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete {targetLabel}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm dialog — rendered through a React portal to document.body
          so it escapes any transformed ancestor (e.g. framer-motion cards)
          and consistently fills the viewport. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!busy) setConfirmOpen(false);
            }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mod-dialog-title"
              className="w-full max-w-md rounded-2xl bg-white dark:bg-deep-900 border border-deep-200 dark:border-deep-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-start gap-3 p-5 border-b border-deep-100 dark:border-deep-800">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-coral-100 dark:bg-coral-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-coral-600 dark:text-coral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    id="mod-dialog-title"
                    className="text-base font-display font-bold text-deep-950 dark:text-white"
                  >
                    Delete {targetLabel}?
                  </h2>
                  <p className="text-sm text-deep-600 dark:text-deep-300 mt-1 leading-relaxed">
                    This permanently removes the content from the feed and
                    notifies no-one. The action is recorded in the
                    moderation audit log.
                    {authorNickname && (
                      <>
                        {" "}Author: <strong>{authorNickname}</strong>.
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setConfirmOpen(false)}
                  aria-label="Close"
                  className="shrink-0 p-1.5 -mr-2 -mt-1 text-deep-500 dark:text-deep-400 hover:text-deep-900 dark:hover:text-white rounded-lg hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <label
                  htmlFor="mod-reason"
                  className="block text-xs font-semibold text-deep-700 dark:text-deep-300"
                >
                  Reason (optional, stored on the audit log)
                </label>
                <textarea
                  id="mod-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. hate speech, spam, off-topic, breaks community rules"
                  className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-950 text-deep-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent text-sm placeholder:text-deep-400"
                />
                <p className="text-[11px] text-deep-500 dark:text-deep-400 text-right">
                  {reason.length}/500
                </p>
                {error && (
                  <p className="text-sm text-coral-600 dark:text-coral-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await onDelete(reason.trim());
                      setConfirmOpen(false);
                      setReason("");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Failed to delete"
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-coral-600 hover:bg-coral-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] inline-flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Delete permanently
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-deep-700 dark:text-deep-200 bg-deep-100 dark:bg-deep-800 hover:bg-deep-200 dark:hover:bg-deep-700 transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
