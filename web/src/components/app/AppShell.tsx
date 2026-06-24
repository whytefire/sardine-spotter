"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Map,
  Newspaper,
  PlusCircle,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { PageTransition } from "@/components/ui/page-transition";
import { api } from "@/lib/api";

/**
 * Fired by any page that changes notification read-state (e.g. the alerts page
 * after Mark-all-read or opening an alert) so the sidebar badge can update
 * immediately without waiting for the next poll.
 */
const NOTIFICATIONS_UPDATED_EVENT = "ss:notifications-updated";

/** Cap the badge so the layout doesn't break with hundreds of unread alerts. */
function formatUnread(n: number): string {
  if (n <= 0) return "";
  if (n > 99) return "99+";
  return String(n);
}

const navItems = [
  { label: "Feed", href: "/app", icon: Newspaper },
  { label: "Map", href: "/app/map", icon: Map },
  { label: "Report", href: "/app/report", icon: PlusCircle },
  { label: "Alerts", href: "/app/alerts", icon: Bell },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  // Pull the unread alert count and keep it in sync with: (a) login state,
  // (b) navigation, (c) periodic polling, and (d) explicit "I just changed
  // notification state" events from the alerts page.
  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getNotifications(token, true);
      setUnreadCount(res.data?.length ?? 0);
    } catch (err) {
      console.error("Failed to fetch unread alerts:", err);
    }
  }, [token]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, pathname]);

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(refreshUnread, 30_000);
    return () => window.clearInterval(id);
  }, [token, refreshUnread]);

  useEffect(() => {
    const handler = () => refreshUnread();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
  }, [refreshUnread]);

  const unreadLabel = formatUnread(unreadCount);
  const bellAriaLabel =
    unreadCount > 0
      ? `View alerts (${unreadCount} unread)`
      : "View alerts";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-deep-950">
        <div className="w-10 h-10 border-3 border-ocean-200 border-t-ocean-600 rounded-full animate-spin dark:border-deep-700 dark:border-t-ocean-400" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const roleBadge = user.role === "admin";

  return (
    <div className="min-h-screen bg-deep-100 dark:bg-deep-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] bg-deep-950 dark:bg-deep-950 text-white">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/app" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-lg font-display font-bold text-white tracking-tight">
              SardineWatch
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-deep-400 hover:bg-white/5 hover:text-deep-200"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-ocean-400" />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-ocean-400" : "text-deep-500"
                  )}
                />
                {item.label}
                {item.label === "Alerts" && unreadCount > 0 && (
                  <span
                    className={cn(
                      "ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-coral-500 text-white text-xs flex items-center justify-center font-bold",
                      unreadCount > 99 && "text-[10px]"
                    )}
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadLabel}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin-only dashboard link */}
          {user?.role === "admin" && (
            <>
              <div className="my-2 mx-3 h-px bg-white/10" />
              <Link
                href="/app/admin"
                aria-current={pathname === "/app/admin" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                  pathname === "/app/admin"
                    ? "bg-white/10 text-white"
                    : "text-deep-400 hover:bg-white/5 hover:text-deep-200"
                )}
              >
                {pathname === "/app/admin" && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-ocean-400" />
                )}
                <LayoutDashboard className={cn("w-5 h-5", pathname === "/app/admin" ? "text-ocean-400" : "text-deep-500")} />
                Admin
              </Link>
            </>
          )}
        </nav>

        {/* Dark mode toggle */}
        <div className="px-5 pb-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-deep-400 hover:bg-white/5 hover:text-deep-200 transition-colors w-full"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-sunset-400" />
            ) : (
              <Moon className="w-4 h-4 text-deep-500" />
            )}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <Avatar
              nickname={user.nickname}
              avatarUrl={user.avatarUrl}
              size="sm"
              ring
              gradient="from-ocean-400 to-teal-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.nickname}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {roleBadge && (
                  <Shield className="w-3 h-3 text-ocean-400" />
                )}
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                  roleBadge
                    ? "bg-ocean-500/20 text-ocean-300"
                    : "bg-white/10 text-deep-400"
                )}>
                  {user.role === "admin" ? "Admin" : "Member"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-deep-200 hover:bg-red-500/15 hover:text-red-300 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-deep-950/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 w-72 glass-light z-50 lg:hidden flex flex-col border-r border-deep-200/60 dark:border-deep-800"
            >
              <div className="border-b border-deep-200/60 dark:border-deep-800" style={{ paddingTop: "env(safe-area-inset-top)" }}>
                <div className="h-16 flex items-center justify-between px-6">
                <Link
                  href="/app"
                  className="flex items-center gap-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Logo size="md" shadow={false} />
                  <span className="text-lg font-bold text-deep-950 dark:text-deep-50">
                    SardineWatch
                  </span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-deep-400 hover:text-deep-600 dark:hover:text-deep-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all relative",
                        isActive
                          ? "bg-ocean-500/10 text-ocean-600 dark:text-ocean-400"
                          : "text-deep-500 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-white/10"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-ocean-500" />
                      )}
                      <item.icon
                        className={cn(
                          "w-5 h-5",
                          isActive ? "text-ocean-500" : "text-deep-400"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-5 py-3 border-t border-deep-200/60 dark:border-deep-800">
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-deep-500 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-white/10 transition-colors w-full"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-sunset-500" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white/90 dark:bg-deep-950/90 backdrop-blur-xl border-b border-deep-200/60 dark:border-deep-800 sticky top-0 z-30 shadow-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="h-14 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-deep-500 dark:text-deep-300 hover:text-deep-700 dark:hover:text-deep-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" shadow={false} />
            <span className="font-bold text-deep-950 dark:text-deep-50">
              SardineWatch
            </span>
          </div>
          <Link
            href="/app/alerts"
            className="p-2 -mr-2 text-deep-500 dark:text-deep-300 hover:text-deep-700 dark:hover:text-deep-100 rounded-lg relative min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={bellAriaLabel}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-deep-950"
                aria-hidden="true"
              >
                {unreadLabel}
              </span>
            )}
          </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Mobile bottom nav */}
        <nav aria-label="Mobile navigation" className="lg:hidden bg-white/90 dark:bg-deep-950/90 backdrop-blur-xl border-t border-surface-200 dark:border-deep-800 flex items-center justify-around py-2 px-1 sticky bottom-0 z-30" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isReport = item.label === "Report";
            const isAlerts = item.label === "Alerts";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px]",
                  isReport && "relative -top-3",
                  isActive && !isReport && "text-ocean-600 dark:text-ocean-400",
                  !isActive && !isReport && "text-deep-300 dark:text-deep-500"
                )}
              >
                {isReport ? (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral-500 to-sunset-500 flex items-center justify-center shadow-lg shadow-coral-500/30">
                    <PlusCircle className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <span className="relative inline-flex">
                    <item.icon className="w-5 h-5" />
                    {isAlerts && unreadCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-coral-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-deep-950"
                        aria-label={`${unreadCount} unread`}
                      >
                        {unreadLabel}
                      </span>
                    )}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isReport && "text-coral-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
