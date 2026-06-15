"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js on every page load (production only) and keeps a reference
 * to the registration alive. This is critical for PWA installability:
 *
 *   1. Browsers (Chrome/Edge/Safari iOS) won't show the install prompt or
 *      treat the site as a PWA unless a service worker is active for the
 *      page that owns the manifest.
 *   2. Push notifications still work because subscribeToPush() can grab the
 *      existing registration via getRegistration() instead of registering
 *      its own.
 *
 * Skipped on localhost / dev so HMR isn't interfered with — the production
 * SW would cache stale Turbopack HTML and break iteration.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[pwa] Service worker registration failed:", err));
  }, []);

  return null;
}
