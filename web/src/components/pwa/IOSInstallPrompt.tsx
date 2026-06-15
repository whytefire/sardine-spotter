"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

/**
 * Detects iOS Safari (not already installed as PWA) and shows a friendly
 * "Add to Home Screen" instruction banner. Dismissed state is stored in
 * sessionStorage so it re-appears on a new session (in case the user is
 * ready to install next time they visit).
 */
export function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPad on iOS 13+ reports as Mac but has touch
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isStandalone =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;

    const dismissed = sessionStorage.getItem("ios-install-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
      // Small delay so it doesn't pop up immediately on page load
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] md:hidden">
      <div className="bg-white dark:bg-deep-800 rounded-2xl shadow-2xl border border-deep-200 dark:border-deep-700 p-4">
        <button
          onClick={() => {
            sessionStorage.setItem("ios-install-dismissed", "1");
            setShow(false);
          }}
          className="absolute top-3 right-3 p-1 rounded-lg text-deep-400 hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <img src="/icons/icon-192-maskable.png" alt="SardineWatch" className="w-full h-full" />
          </div>
          <div>
            <p className="font-semibold text-deep-900 dark:text-white text-sm">
              Install SardineWatch
            </p>
            <p className="text-deep-500 dark:text-deep-400 text-xs mt-0.5 leading-relaxed">
              Add to your home screen for the best experience and to enable push notifications.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-deep-600 dark:text-deep-300">
            <div className="w-6 h-6 rounded-md bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center shrink-0">
              <span className="text-ocean-600 dark:text-ocean-400 font-bold text-[10px]">1</span>
            </div>
            Tap the
            <Share className="w-3.5 h-3.5 text-ocean-500 inline" />
            <span className="font-medium">Share</span> button in Safari
          </div>
          <div className="flex items-center gap-2 text-xs text-deep-600 dark:text-deep-300">
            <div className="w-6 h-6 rounded-md bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center shrink-0">
              <span className="text-ocean-600 dark:text-ocean-400 font-bold text-[10px]">2</span>
            </div>
            Scroll down and tap
            <Plus className="w-3.5 h-3.5 text-ocean-500 inline" />
            <span className="font-medium">Add to Home Screen</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-deep-600 dark:text-deep-300">
            <div className="w-6 h-6 rounded-md bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center shrink-0">
              <span className="text-ocean-600 dark:text-ocean-400 font-bold text-[10px]">3</span>
            </div>
            Open the app from your home screen and enable notifications
          </div>
        </div>

        {/* Visual arrow pointing up toward bottom nav */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-deep-800 border-r border-b border-deep-200 dark:border-deep-700 rotate-45" />
      </div>
    </div>
  );
}
