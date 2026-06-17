"use client";

import { useEffect } from "react";

/**
 * Clears the home-screen app icon badge whenever the user brings the app
 * to the foreground (visibility change) or when the page first loads.
 * Uses the Web App Badging API — silently no-ops on unsupported browsers.
 */
export function BadgeClearer() {
  useEffect(() => {
    const clear = () => {
      if ("clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };

    // Clear on first load
    clear();

    // Clear whenever the tab/app becomes visible again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") clear();
    });
  }, []);

  return null;
}
