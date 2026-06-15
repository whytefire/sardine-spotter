"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "ss_cookies_ack";

/**
 * Discreet, dismissable cookie / storage notice shown once per device.
 *
 * Why this is informational rather than a full GDPR-style consent gate:
 *   - We don't use third-party advertising or analytics cookies, so there is
 *     no non-essential processing that legally requires consent.
 *   - Everything we store is either strictly necessary (auth token, SW
 *     cache) or actively opted into by the user (push notifications, dark
 *     mode preference).
 *   - POPIA still requires that the data subject be NOTIFIED about
 *     processing, hence this banner.
 *
 * The user's dismissal is recorded in localStorage under `ss_cookies_ack`.
 * Clearing site data brings the banner back.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const ack = window.localStorage.getItem(STORAGE_KEY);
      if (!ack) setOpen(true);
    } catch {
      // localStorage disabled (private mode etc.) — don't pester
    }
  }, []);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="region"
          aria-label="Cookie notice"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-[60]"
        >
          <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-900 shadow-2xl shadow-deep-950/20 dark:shadow-black/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-teal-500 flex items-center justify-center">
                <Cookie className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-deep-950 dark:text-white text-sm">
                  We store a little on your device
                </p>
                <p className="text-sm text-deep-600 dark:text-deep-300 mt-1 leading-relaxed">
                  Just the basics — enough to keep you signed in and to work
                  when you&apos;re offline. No ad trackers, no analytics, no
                  third-party cookies.{" "}
                  <Link
                    href="/cookies"
                    className="text-ocean-600 dark:text-ocean-400 underline font-medium"
                  >
                    Read more
                  </Link>
                  .
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={acknowledge}
                    className="px-4 py-2 rounded-xl bg-deep-950 dark:bg-white text-white dark:text-deep-950 text-sm font-semibold hover:opacity-90 transition-opacity min-h-[40px]"
                  >
                    Got it
                  </button>
                  <Link
                    href="/privacy"
                    className="px-4 py-2 rounded-xl text-deep-600 dark:text-deep-300 text-sm font-medium hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors min-h-[40px] inline-flex items-center"
                  >
                    Privacy policy
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={acknowledge}
                aria-label="Dismiss notice"
                className="shrink-0 p-1.5 -mr-1 -mt-1 text-deep-500 dark:text-deep-400 hover:text-deep-900 dark:hover:text-white rounded-lg hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
