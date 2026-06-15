"use client";

import { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import {
  Users,
  Fish,
  ShieldAlert,
  Search,
  RefreshCw,
  Ban,
  CheckCircle2,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, timeAgo } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui/avatar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Tab = "users" | "sightings" | "moderation";

/* ------------------------------------------------------------------ */
/* Data types                                                           */
/* ------------------------------------------------------------------ */
interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  role: "admin" | "user";
  isActive: boolean;
  banReason: string | null;
  createdAt: string;
  lastActive: string;
}

interface AdminSighting {
  id: number;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  userId: number;
  nickname: string;
  commentCount: number;
  likeCount: number;
}

interface ModerationEntry {
  id: number;
  moderatorNickname: string;
  action: string;
  targetKind: string;
  targetAuthorNickname: string | null;
  targetSnapshot: { description?: string; text?: string } | null;
  reason: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-deep-800 border border-deep-200 dark:border-deep-700 p-5 flex items-center gap-4 shadow-sm">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-deep-950 dark:text-white tabular-nums">
          {value}
        </p>
        <p className="text-xs text-deep-500 dark:text-deep-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        active
          ? "bg-sea-green-100 dark:bg-sea-green-500/15 text-sea-green-700 dark:text-sea-green-300"
          : "bg-coral-100 dark:bg-coral-500/15 text-coral-700 dark:text-coral-300"
      )}
    >
      {active ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
      {active ? "Active" : "Banned"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Ban dialog                                                           */
/* ------------------------------------------------------------------ */
function BanDialog({
  user,
  onConfirm,
  onClose,
}: {
  user: AdminUser;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-deep-900 border border-deep-200 dark:border-deep-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start gap-3 p-5 border-b border-deep-100 dark:border-deep-800">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-coral-100 dark:bg-coral-500/15 flex items-center justify-center">
            <Ban className="w-5 h-5 text-coral-600 dark:text-coral-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-deep-950 dark:text-white text-base">
              Ban {user.nickname}?
            </h2>
            <p className="text-sm text-deep-500 dark:text-deep-400 mt-0.5">
              {user.email}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-deep-100 dark:hover:bg-deep-800 text-deep-500 dark:text-deep-400 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-xs font-semibold text-deep-700 dark:text-deep-300">
            Reason (shown to the user when they next try to log in)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="e.g. Repeated hate speech, violation of community standards"
            className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-950 text-deep-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent text-sm"
          />
          <p className="text-[11px] text-right text-deep-400">{reason.length}/500</p>
          {err && (
            <p className="text-sm text-coral-600 dark:text-coral-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{err}
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onConfirm(reason.trim() || "Banned by administrator");
                onClose();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Failed");
                setBusy(false);
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-coral-600 hover:bg-coral-700 text-white disabled:opacity-50 transition-colors min-h-[40px] inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Ban user
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-deep-700 dark:text-deep-200 bg-deep-100 dark:bg-deep-800 hover:bg-deep-200 dark:hover:bg-deep-700 transition-colors min-h-[40px]"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sightings, setSightings] = useState<AdminSighting[]>([]);
  const [modLog, setModLog] = useState<ModerationEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ban dialog
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);

  // Inline editing
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");

  const [editSightingId, setEditSightingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/app");
  }, [user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [uRes, sRes, mRes] = await Promise.all([
        fetch(`${API}/api/admin/users`, { headers: authHeaders(token) }),
        fetch(`${API}/api/admin/sightings`, { headers: authHeaders(token) }),
        fetch(`${API}/api/admin/moderation-log`, { headers: authHeaders(token) }),
      ]);
      const [u, s, m] = await Promise.all([uRes.json(), sRes.json(), mRes.json()]);
      setUsers(u.data ?? []);
      setSightings(s.data ?? []);
      setModLog(m.data ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== "admin") return null;

  /* ----- User actions ----- */
  const handleBanConfirm = async (reason: string) => {
    if (!banTarget || !token) return;
    const res = await fetch(`${API}/api/admin/users/${banTarget.id}/ban`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed");
    setUsers((prev) => prev.map((u) => u.id === banTarget!.id ? { ...u, isActive: false, banReason: reason } : u));
  };

  const handleUnban = async (u: AdminUser) => {
    if (!token) return;
    await fetch(`${API}/api/admin/users/${u.id}/unban`, { method: "PUT", headers: authHeaders(token) });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: true, banReason: null } : x));
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!token || !window.confirm(`Permanently delete user "${u.nickname}"? This cannot be undone.`)) return;
    const res = await fetch(`${API}/api/admin/users/${u.id}`, { method: "DELETE", headers: authHeaders(token) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  const saveUserEdit = async (u: AdminUser) => {
    if (!token) return;
    setSavingId(u.id);
    await fetch(`${API}/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ nickname: editNickname, role: editRole }),
    });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, nickname: editNickname, role: editRole } : x));
    setEditUserId(null);
    setSavingId(null);
  };

  /* ----- Sighting actions ----- */
  const [moderateTarget, setModerateTarget] = useState<AdminSighting | null>(null);
  const [moderateReason, setModerateReason] = useState("");
  const [moderateBusy, setModerateBusy] = useState(false);

  const handleDeactivateSighting = async (reason: string) => {
    if (!moderateTarget || !token) return;
    const res = await fetch(`${API}/api/sightings/${moderateTarget.id}`, {
      method: "DELETE",
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed");
    setSightings((prev) => prev.map((x) => x.id === moderateTarget!.id ? { ...x, isActive: false } : x));
    setModerateTarget(null);
    setModerateReason("");
  };

  const handleReinstate = async (s: AdminSighting) => {
    if (!token) return;
    const res = await fetch(`${API}/api/sightings/${s.id}/reinstate`, { method: "PUT", headers: authHeaders(token) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setSightings((prev) => prev.map((x) => x.id === s.id ? { ...x, isActive: true } : x));
  };

  const handleDeleteSighting = async (s: AdminSighting) => {
    if (!token || !window.confirm(`Permanently delete sighting by "${s.nickname}"? This cannot be undone.`)) return;
    const res = await fetch(`${API}/api/sightings/${s.id}`, { method: "DELETE", headers: authHeaders(token) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setSightings((prev) => prev.filter((x) => x.id !== s.id));
  };

  const saveSightingEdit = async (s: AdminSighting) => {
    if (!token) return;
    setSavingId(s.id);
    await fetch(`${API}/api/admin/sightings/${s.id}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ description: editDescription }),
    });
    setSightings((prev) => prev.map((x) => x.id === s.id ? { ...x, description: editDescription } : x));
    setEditSightingId(null);
    setSavingId(null);
  };

  /* ----- Derived data ----- */
  const q = search.toLowerCase();
  const filteredUsers = users.filter(
    (u) => u.nickname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  const filteredSightings = sightings.filter(
    (s) => s.description.toLowerCase().includes(q) || s.nickname.toLowerCase().includes(q)
  );
  const bannedCount = users.filter((u) => !u.isActive).length;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { id: "users",      label: "Users",          icon: Users,      count: users.length },
    { id: "sightings",  label: "Sightings",      icon: Fish,       count: sightings.length },
    { id: "moderation", label: "Moderation Log", icon: ShieldAlert, count: modLog.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-1">
            Manage users, content and moderation
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          className="p-2.5 rounded-xl text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users}      label="Total users"      value={users.length}      accent="bg-gradient-to-br from-ocean-500 to-teal-500" />
        <StatCard icon={Ban}        label="Banned"           value={bannedCount}        accent="bg-gradient-to-br from-coral-500 to-sunset-500" />
        <StatCard icon={Fish}       label="Sightings"        value={sightings.length}   accent="bg-gradient-to-br from-sea-green-500 to-ocean-500" />
        <StatCard icon={ShieldAlert} label="Mod actions"     value={modLog.length}      accent="bg-gradient-to-br from-deep-600 to-deep-800" />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-coral-50 dark:bg-coral-500/10 border border-coral-200 dark:border-coral-500/20 text-coral-700 dark:text-coral-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-deep-100 dark:bg-deep-800 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-white dark:bg-deep-700 text-deep-950 dark:text-white shadow-sm"
                : "text-deep-600 dark:text-deep-300 hover:text-deep-900 dark:hover:text-white"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full tabular-nums",
              tab === t.id
                ? "bg-ocean-100 dark:bg-ocean-500/20 text-ocean-700 dark:text-ocean-300"
                : "bg-deep-200 dark:bg-deep-700 text-deep-500 dark:text-deep-400"
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== "moderation" && (
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-deep-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "users" ? "Search by nickname or email…" : "Search by description or user…"}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 text-deep-900 dark:text-white placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* USERS TAB                                                        */}
      {/* ================================================================ */}
      {tab === "users" && (
        <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep-50 dark:bg-deep-900 border-b border-deep-200 dark:border-deep-700">
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300">User</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden lg:table-cell">Last active</th>
                <th className="px-4 py-3 text-right font-semibold text-deep-700 dark:text-deep-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400">No users found</td></tr>
              )}
              {filteredUsers.map((u) => (
                <tr key={u.id} className={cn(
                  "border-b border-deep-100 dark:border-deep-700 last:border-0 hover:bg-deep-50/50 dark:hover:bg-deep-700/30 transition-colors",
                  !u.isActive && "bg-coral-50/40 dark:bg-coral-500/5"
                )}>
                  <td className="px-4 py-3">
                    {editUserId === u.id ? (
                      <input
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-ocean-300 dark:border-ocean-600 bg-white dark:bg-deep-900 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <Avatar nickname={u.nickname} size="sm" />
                        <span className="font-medium text-deep-900 dark:text-white">{u.nickname}</span>
                        {u.id === user.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ocean-100 dark:bg-ocean-500/20 text-ocean-700 dark:text-ocean-300 font-semibold">You</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-deep-600 dark:text-deep-300 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {editUserId === u.id ? (
                      <div className="relative">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as "admin" | "user")}
                          className="appearance-none pl-3 pr-7 py-1 rounded-lg border border-ocean-300 dark:border-ocean-600 bg-white dark:bg-deep-900 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-deep-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        u.role === "admin"
                          ? "bg-ocean-100 dark:bg-ocean-500/20 text-ocean-700 dark:text-ocean-300"
                          : "bg-deep-100 dark:bg-deep-700 text-deep-600 dark:text-deep-300"
                      )}>
                        {u.role === "admin" && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <Badge active={u.isActive} />
                      {!u.isActive && u.banReason && (
                        <p className="text-[11px] text-deep-500 dark:text-deep-400 mt-1 max-w-[200px] truncate" title={u.banReason}>
                          {u.banReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-deep-500 dark:text-deep-400 text-xs hidden lg:table-cell">
                    {timeAgo(u.lastActive)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editUserId === u.id ? (
                        <>
                          <button
                            onClick={() => saveUserEdit(u)}
                            disabled={savingId === u.id}
                            className="p-1.5 rounded-lg text-sea-green-600 dark:text-sea-green-400 hover:bg-sea-green-50 dark:hover:bg-sea-green-500/10 transition-colors cursor-pointer"
                            title="Save"
                          >
                            {savingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setEditUserId(null)}
                            className="p-1.5 rounded-lg text-deep-500 dark:text-deep-400 hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditUserId(u.id); setEditNickname(u.nickname); setEditRole(u.role); }}
                            className="p-1.5 rounded-lg text-deep-500 dark:text-deep-400 hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {u.isActive ? (
                            <button
                              onClick={() => setBanTarget(u)}
                              disabled={u.id === user.id}
                              className="p-1.5 rounded-lg text-coral-500 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Ban user"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnban(u)}
                              className="p-1.5 rounded-lg text-sea-green-600 dark:text-sea-green-400 hover:bg-sea-green-50 dark:hover:bg-sea-green-500/10 transition-colors cursor-pointer"
                              title="Unban user"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === user.id}
                            className="p-1.5 rounded-lg text-deep-400 dark:text-deep-500 hover:text-coral-500 dark:hover:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================ */}
      {/* SIGHTINGS TAB                                                    */}
      {/* ================================================================ */}
      {tab === "sightings" && (
        <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep-50 dark:bg-deep-900 border-b border-deep-200 dark:border-deep-700">
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden sm:table-cell">By</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden md:table-cell">Stats</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden lg:table-cell">When</th>
                <th className="px-4 py-3 text-right font-semibold text-deep-700 dark:text-deep-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              )}
              {!loading && filteredSightings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400">No sightings found</td></tr>
              )}
              {filteredSightings.map((s) => (
                <tr key={s.id} className={`border-b border-deep-100 dark:border-deep-700 last:border-0 transition-colors ${s.isActive ? "hover:bg-deep-50/50 dark:hover:bg-deep-700/30" : "bg-coral-50/30 dark:bg-coral-950/20 opacity-70"}`}>
                  <td className="px-4 py-3 max-w-xs">
                    {editSightingId === s.id ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 rounded-lg border border-ocean-300 dark:border-ocean-600 bg-white dark:bg-deep-900 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
                      />
                    ) : (
                      <p className="text-deep-800 dark:text-deep-100 line-clamp-2 leading-snug">
                        {s.description}
                      </p>
                    )}
                    {s.photoUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-ocean-600 dark:text-ocean-400 mt-1">
                        <Eye className="w-3 h-3" /> has photo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-deep-600 dark:text-deep-300 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar nickname={s.nickname} size="xs" />
                      {s.nickname}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-deep-500 dark:text-deep-400">
                      💬 {s.commentCount} · ♥ {s.likeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {s.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sea-green-100 text-sea-green-700 dark:bg-sea-green-900/30 dark:text-sea-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400">
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-deep-500 dark:text-deep-400 text-xs hidden lg:table-cell">
                    {timeAgo(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editSightingId === s.id ? (
                        <>
                          <button
                            onClick={() => saveSightingEdit(s)}
                            disabled={savingId === s.id}
                            className="p-1.5 rounded-lg text-sea-green-600 dark:text-sea-green-400 hover:bg-sea-green-50 dark:hover:bg-sea-green-500/10 transition-colors cursor-pointer"
                            title="Save"
                          >
                            {savingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setEditSightingId(null)}
                            className="p-1.5 rounded-lg text-deep-500 dark:text-deep-400 hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : s.isActive ? (
                        <>
                          <button
                            onClick={() => { setEditSightingId(s.id); setEditDescription(s.description); }}
                            className="p-1.5 rounded-lg text-deep-500 dark:text-deep-400 hover:bg-deep-100 dark:hover:bg-deep-700 transition-colors cursor-pointer"
                            title="Edit description"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setModerateTarget(s); setModerateReason(""); }}
                            className="p-1.5 rounded-lg text-deep-400 dark:text-deep-500 hover:text-coral-500 dark:hover:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-colors cursor-pointer"
                            title="Deactivate sighting"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReinstate(s)}
                          className="p-1.5 rounded-lg text-sea-green-600 dark:text-sea-green-400 hover:bg-sea-green-50 dark:hover:bg-sea-green-500/10 transition-colors cursor-pointer"
                          title="Reinstate sighting"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================ */}
      {/* DEACTIVATE SIGHTING DIALOG                                       */}
      {/* ================================================================ */}
      {moderateTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-deep-800 rounded-2xl shadow-2xl border border-deep-200 dark:border-deep-700 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-deep-900 dark:text-white mb-1">Deactivate sighting</h3>
            <p className="text-sm text-deep-500 dark:text-deep-400 mb-4">
              This will hide the sighting from the public feed and map. The original content is preserved in the moderation log and can be reinstated. Provide a reason so the record is auditable.
            </p>
            <div className="bg-deep-50 dark:bg-deep-900/50 rounded-xl p-3 mb-4 border border-deep-200 dark:border-deep-700">
              <p className="text-xs font-medium text-deep-500 dark:text-deep-400 mb-1">Original content</p>
              <p className="text-sm text-deep-800 dark:text-deep-100 line-clamp-3">{moderateTarget.description}</p>
              <p className="text-xs text-deep-400 dark:text-deep-500 mt-1">by {moderateTarget.nickname} · {timeAgo(moderateTarget.createdAt)}</p>
            </div>
            <textarea
              value={moderateReason}
              onChange={(e) => setModerateReason(e.target.value)}
              placeholder="Reason for deactivation (e.g. inappropriate content, spam)…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-deep-300 dark:border-deep-600 bg-white dark:bg-deep-900 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setModerateTarget(null); setModerateReason(""); }}
                className="flex-1 px-4 py-2 rounded-xl border border-deep-300 dark:border-deep-600 text-deep-600 dark:text-deep-300 hover:bg-deep-50 dark:hover:bg-deep-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={moderateBusy}
                onClick={async () => {
                  setModerateBusy(true);
                  try { await handleDeactivateSighting(moderateReason); }
                  catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed"); }
                  finally { setModerateBusy(false); }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {moderateBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ================================================================ */}
      {/* MODERATION LOG TAB                                               */}
      {/* ================================================================ */}
      {tab === "moderation" && (
        <div className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-deep-50 dark:bg-deep-900 border-b border-deep-200 dark:border-deep-700">
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden sm:table-cell">By</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300">Author</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden md:table-cell">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-deep-700 dark:text-deep-300 hidden lg:table-cell">When</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              )}
              {!loading && modLog.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-deep-500 dark:text-deep-400">No moderation actions yet</td></tr>
              )}
              {modLog.map((entry) => (
                <tr key={entry.id} className="border-b border-deep-100 dark:border-deep-700 last:border-0 hover:bg-deep-50/50 dark:hover:bg-deep-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                      entry.action === "deactivate_sighting"
                        ? "bg-coral-100 dark:bg-coral-500/20 text-coral-700 dark:text-coral-300"
                        : "bg-sunset-100 dark:bg-sunset-500/20 text-sunset-700 dark:text-sunset-300"
                    )}>
                      <Trash2 className="w-3 h-3" />
                      {entry.action === "deactivate_sighting" ? "sighting hidden" : "comment deleted"}
                    </span>
                    {entry.targetSnapshot && (
                      <p className="text-[11px] text-deep-500 dark:text-deep-400 mt-1 max-w-[200px] truncate">
                        {entry.targetSnapshot.description || entry.targetSnapshot.text || ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-deep-600 dark:text-deep-300 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar nickname={entry.moderatorNickname} size="xs" />
                      {entry.moderatorNickname}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-deep-600 dark:text-deep-300">
                    {entry.targetAuthorNickname ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-deep-500 dark:text-deep-400 italic">
                      {entry.reason || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-deep-500 dark:text-deep-400 text-xs hidden lg:table-cell">
                    {timeAgo(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ban dialog portal */}
      <AnimatePresence>
        {banTarget && (
          <BanDialog
            user={banTarget}
            onConfirm={handleBanConfirm}
            onClose={() => setBanTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
