"use client";

import { api } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service worker registered");
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(token: string): Promise<boolean> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const { data } = await api.getVapidKey();
    if (!data.publicKey) {
      console.warn("No VAPID key configured on server");
      return false;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey).buffer as ArrayBuffer,
    });

    await api.subscribePush(token, subscription);
    console.log("Push subscription saved");
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();

    // Capture the endpoint BEFORE we call .unsubscribe(), because some browsers
    // tear down the subscription object once it's been unsubscribed. We pass
    // the endpoint to the API so only THIS device is removed from the user's
    // push fan-out, not every device they've ever logged in on.
    const endpoint = subscription?.endpoint;

    if (subscription) {
      await subscription.unsubscribe();
    }

    await api.unsubscribePush(token, endpoint);
    return true;
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    // getRegistration returns undefined immediately if no SW is registered.
    // navigator.serviceWorker.ready hangs forever in that case — so don't use it here.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
