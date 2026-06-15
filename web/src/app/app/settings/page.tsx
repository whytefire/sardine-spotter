"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Loader2,
  AlertTriangle,
  FileText,
  Cookie,
  ShieldCheck,
  Smartphone,
  Share2,
  PlusSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { Avatar } from "@/components/ui/avatar";

type PushState =
  | "checking"
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "working";

function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(ios);
    setIsStandalone(standalone);
  }, []);
  return { isIOS, isStandalone };
}

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushError, setPushError] = useState<string | null>(null);
  const { isIOS, isStandalone } = useIsIOS();

  const refreshPushState = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    const subscribed = await isPushSubscribed();
    setPushState(subscribed ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const handlePushToggle = async () => {
    if (!token) return;
    if (
      pushState === "unsupported" ||
      pushState === "denied" ||
      pushState === "working"
    ) {
      return;
    }
    setPushError(null);
    setPushState("working");
    try {
      if (pushState === "subscribed") {
        const ok = await unsubscribeFromPush(token);
        setPushState(ok ? "unsubscribed" : "subscribed");
        if (!ok) setPushError("Could not turn off push. Please try again.");
      } else {
        const ok = await subscribeToPush(token);
        if (ok) {
          setPushState("subscribed");
        } else if (Notification.permission === "denied") {
          setPushState("denied");
          setPushError(
            "Notifications are blocked in your browser. Enable them in browser settings to receive alerts."
          );
        } else {
          setPushState("unsubscribed");
          setPushError(
            "Could not enable push. Make sure VAPID keys are configured and try again."
          );
        }
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      setPushError("Something went wrong. Please try again.");
      await refreshPushState();
    }
  };

  const pushChecked = pushState === "subscribed" || pushState === "working";
  const pushDisabled =
    pushState === "checking" ||
    pushState === "working" ||
    pushState === "unsupported" ||
    pushState === "denied";
  const pushDescription =
    pushState === "checking"
      ? "Checking subscription…"
      : pushState === "unsupported" && isIOS && !isStandalone
        ? "Requires the app to be installed"
        : pushState === "unsupported"
          ? "Not supported on this browser"
          : pushState === "denied"
            ? "Blocked in browser settings"
            : pushState === "subscribed"
              ? "On — you'll get alerted for new sightings"
              : pushState === "working"
                ? "Updating…"
                : "Get alerted for new sightings";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
          Settings
        </h1>
        <p className="text-deep-500 dark:text-deep-400 text-sm mt-1.5">
          Customize your SardineWatch experience
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar
            nickname={user?.nickname ?? "U"}
            avatarUrl={user?.avatarUrl}
            size="lg"
            ring
            gradient="from-ocean-400 to-teal-500"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-deep-950 dark:text-white text-lg">
              {user?.nickname ?? "User"}
            </h2>
            <p className="text-sm text-deep-500 dark:text-deep-300 truncate">
              {user?.email ?? "user@sardinespotter.com"}
            </p>
          </div>
          <Link
            href="/app/account"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-deep-100 dark:bg-deep-700 text-deep-700 dark:text-white hover:bg-deep-200 dark:hover:bg-deep-600 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Notification settings */}
      <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 divide-y divide-deep-100 dark:divide-deep-700 mb-4 shadow-sm">
        <SettingRow
          icon={Bell}
          label="Push Notifications"
          description={pushDescription}
          toggle
          checked={pushChecked}
          onChange={handlePushToggle}
          disabled={pushDisabled}
          busy={pushState === "checking" || pushState === "working"}
        />
      </div>

      {/* iOS install guide — only shown when on iOS Safari (not yet installed) */}
      {isIOS && !isStandalone && pushState === "unsupported" && (
        <div className="mb-4 rounded-2xl border border-ocean-200 dark:border-ocean-800/50 bg-ocean-50 dark:bg-ocean-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-ocean-600 dark:text-ocean-400 shrink-0" />
            <p className="font-semibold text-ocean-900 dark:text-ocean-200 text-sm">
              Install SardineWatch on your iPhone
            </p>
          </div>
          <p className="text-xs text-ocean-700 dark:text-ocean-300 mb-3 leading-relaxed">
            Push notifications on iPhone require the app to be added to your home screen first. It only takes a few seconds:
          </p>
          <ol className="space-y-2.5">
            <li className="flex items-center gap-3 text-xs text-ocean-800 dark:text-ocean-200">
              <div className="w-6 h-6 rounded-full bg-ocean-600 dark:bg-ocean-700 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">1</div>
              <span>Tap the <Share2 className="w-3 h-3 inline mx-0.5" /> <strong>Share</strong> button at the bottom of Safari</span>
            </li>
            <li className="flex items-center gap-3 text-xs text-ocean-800 dark:text-ocean-200">
              <div className="w-6 h-6 rounded-full bg-ocean-600 dark:bg-ocean-700 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">2</div>
              <span>Scroll down and tap <PlusSquare className="w-3 h-3 inline mx-0.5" /> <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex items-center gap-3 text-xs text-ocean-800 dark:text-ocean-200">
              <div className="w-6 h-6 rounded-full bg-ocean-600 dark:bg-ocean-700 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">3</div>
              <span>Open SardineWatch from your home screen, then come back here to enable notifications</span>
            </li>
          </ol>
        </div>
      )}

      {pushError && (
        <div className="mb-4 rounded-2xl border border-coral-200 dark:border-coral-900/40 bg-coral-50 dark:bg-coral-950/20 p-3 flex items-start gap-2 text-sm text-coral-700 dark:text-coral-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{pushError}</span>
        </div>
      )}

      {/* Account settings */}
      <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 divide-y divide-deep-100 dark:divide-deep-700 mb-4 shadow-sm overflow-hidden">
        <Link href="/app/account" className="block hover:bg-deep-50 dark:hover:bg-deep-750 transition-colors">
          <SettingRow
            icon={User}
            label="Account"
            description="Nickname, email, and profile picture"
            chevron
          />
        </Link>
        <Link href="/app/account" className="block hover:bg-deep-50 dark:hover:bg-deep-750 transition-colors">
          <SettingRow
            icon={Shield}
            label="Password & Security"
            description="Change your password"
            chevron
          />
        </Link>
      </div>

      {/* Dark mode toggle */}
      <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 mb-6 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-deep-100 dark:bg-deep-700 flex items-center justify-center shrink-0">
            {isDark ? (
              <Moon className="w-5 h-5 text-ocean-400" />
            ) : (
              <Sun className="w-5 h-5 text-sunset-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-deep-950 dark:text-white text-sm">
              Dark Mode
            </p>
            <p className="text-xs text-deep-500 dark:text-deep-400">
              Switch between light and dark theme
            </p>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer",
              isDark ? "bg-ocean-600" : "bg-deep-200"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform",
                isDark ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Legal & privacy */}
      <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 divide-y divide-deep-100 dark:divide-deep-700 mb-6 shadow-sm overflow-hidden">
        <Link href="/privacy" className="block hover:bg-deep-50 dark:hover:bg-deep-750 transition-colors">
          <SettingRow
            icon={ShieldCheck}
            label="Privacy Policy"
            description="How we handle your personal information"
            chevron
          />
        </Link>
        <Link href="/terms" className="block hover:bg-deep-50 dark:hover:bg-deep-750 transition-colors">
          <SettingRow
            icon={FileText}
            label="Terms of Service"
            description="The rules of using SardineWatch"
            chevron
          />
        </Link>
        <Link href="/cookies" className="block hover:bg-deep-50 dark:hover:bg-deep-750 transition-colors">
          <SettingRow
            icon={Cookie}
            label="Cookie Policy"
            description="What we store on your device"
            chevron
          />
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-coral-500 hover:text-coral-600 dark:text-coral-400 dark:hover:text-coral-300 font-semibold transition-colors rounded-2xl hover:bg-coral-50 dark:hover:bg-coral-500/10"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </button>

      <p className="text-center text-xs text-deep-400 dark:text-deep-500 mt-8">
        SardineWatch v2.0.0
      </p>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  toggle,
  checked,
  onChange,
  chevron,
  disabled,
  busy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  toggle?: boolean;
  checked?: boolean;
  onChange?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-10 h-10 rounded-xl bg-deep-100 dark:bg-deep-700 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-deep-500 dark:text-deep-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-deep-950 dark:text-white text-sm">
          {label}
        </p>
        <p className="text-xs text-deep-500 dark:text-deep-400">
          {description}
        </p>
      </div>
      {toggle && (
        <button
          onClick={() => !disabled && onChange?.()}
          disabled={disabled}
          aria-label={`Toggle ${label}`}
          aria-pressed={!!checked}
          className={cn(
            "relative w-12 h-7 rounded-full transition-colors shrink-0",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            checked ? "bg-ocean-600" : "bg-deep-200 dark:bg-deep-600"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center",
              checked ? "translate-x-6" : "translate-x-1"
            )}
          >
            {busy && (
              <Loader2 className="w-3 h-3 animate-spin text-ocean-600" />
            )}
          </div>
        </button>
      )}
      {chevron && (
        <ChevronRight className="w-5 h-5 text-deep-400 dark:text-deep-500 shrink-0" />
      )}
    </div>
  );
}
