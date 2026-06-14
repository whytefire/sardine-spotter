"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";

type BannerKind = "success" | "error";

function Banner({ kind, message }: { kind: BannerKind; message: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2 text-sm border",
        kind === "success"
          ? "bg-sea-green-50 dark:bg-sea-green-500/10 border-sea-green-200 dark:border-sea-green-500/20 text-sea-green-700 dark:text-sea-green-300"
          : "bg-coral-50 dark:bg-coral-500/10 border-coral-200 dark:border-coral-500/20 text-coral-700 dark:text-coral-300"
      )}
    >
      {kind === "success" ? (
        <Check className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export default function AccountPage() {
  const { user, token, setUser, setToken } = useAuth();

  // ====== Profile card state ======
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: BannerKind; text: string } | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ====== Email card state ======
  const [emailField, setEmailField] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ kind: BannerKind; text: string } | null>(null);

  // ====== Password card state ======
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: BannerKind; text: string } | null>(null);

  if (!user || !token) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-deep-600 dark:text-deep-300 text-sm">
          You need to be signed in to manage your account.
        </p>
      </div>
    );
  }

  // ---------- Profile (nickname + avatar) ----------

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-picking the same file

    if (!file.type.startsWith("image/")) {
      setProfileMsg({ kind: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ kind: "error", text: "Image must be under 5 MB." });
      return;
    }

    setAvatarBusy(true);
    setProfileMsg(null);
    try {
      const uploadRes = await api.uploadAvatar(token, file);
      const updateRes = await api.updateProfile(token, {
        avatarUrl: uploadRes.data.avatarUrl,
      });
      setUser({ ...user, ...updateRes.data });
      setProfileMsg({ kind: "success", text: "Profile picture updated." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload avatar.";
      setProfileMsg({ kind: "error", text: message });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user.avatarUrl) return;
    setAvatarBusy(true);
    setProfileMsg(null);
    try {
      const updateRes = await api.updateProfile(token, { avatarUrl: null });
      setUser({ ...user, ...updateRes.data });
      setProfileMsg({ kind: "success", text: "Profile picture removed." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove avatar.";
      setProfileMsg({ kind: "error", text: message });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed === user.nickname) {
      setProfileMsg({ kind: "error", text: "Nothing to save — nickname is unchanged." });
      return;
    }
    if (trimmed.length < 2) {
      setProfileMsg({ kind: "error", text: "Nickname must be at least 2 characters." });
      return;
    }
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const res = await api.updateProfile(token, { nickname: trimmed });
      setUser({ ...user, ...res.data });
      setProfileMsg({ kind: "success", text: "Nickname saved." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save nickname.";
      setProfileMsg({ kind: "error", text: message });
    } finally {
      setProfileBusy(false);
    }
  };

  // ---------- Email ----------

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = emailField.trim().toLowerCase();
    if (next === user.email.toLowerCase()) {
      setEmailMsg({ kind: "error", text: "Nothing to save — email is unchanged." });
      return;
    }
    if (!emailPassword) {
      setEmailMsg({ kind: "error", text: "Confirm your current password to change email." });
      return;
    }

    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await api.updateEmail(token, next, emailPassword);
      setToken(res.data.token);
      setUser({ ...user, ...res.data.user });
      setEmailPassword("");
      setEmailMsg({ kind: "success", text: "Email updated." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update email.";
      setEmailMsg({ kind: "error", text: message });
    } finally {
      setEmailBusy(false);
    }
  };

  // ---------- Password ----------

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) {
      setPwdMsg({ kind: "error", text: "Both current and new passwords are required." });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ kind: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ kind: "error", text: "New password and confirmation don't match." });
      return;
    }
    if (newPwd === currentPwd) {
      setPwdMsg({ kind: "error", text: "New password must be different from the current one." });
      return;
    }

    setPwdBusy(true);
    setPwdMsg(null);
    try {
      await api.updatePassword(token, currentPwd, newPwd);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setPwdMsg({ kind: "success", text: "Password updated." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update password.";
      setPwdMsg({ kind: "error", text: message });
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/settings"
          aria-label="Back to settings"
          className="p-2 -ml-2 rounded-lg text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-deep-950 dark:text-white tracking-tight">
            Account
          </h1>
          <p className="text-deep-500 dark:text-deep-400 text-sm mt-0.5">
            Manage your profile, email, and password
          </p>
        </div>
      </div>

      {/* Profile card */}
      <section className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-deep-950 dark:text-white text-base flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-ocean-500" />
          Profile
        </h2>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} size="xl" ring />
            {avatarBusy && (
              <div className="absolute inset-0 rounded-full bg-deep-950/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {user.avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={avatarBusy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-coral-600 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="mt-5 space-y-3">
          <div>
            <label
              htmlFor="nickname"
              className="block text-xs font-semibold text-deep-700 dark:text-deep-300 mb-1.5"
            >
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={100}
              autoComplete="nickname"
              className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-900 text-deep-900 dark:text-white placeholder:text-deep-500 dark:placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={profileBusy || nickname.trim() === user.nickname}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] inline-flex items-center justify-center gap-2"
          >
            {profileBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            Save nickname
          </button>
          {profileMsg && <Banner kind={profileMsg.kind} message={profileMsg.text} />}
        </form>
      </section>

      {/* Email card */}
      <section className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-deep-950 dark:text-white text-base flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-ocean-500" />
          Email
        </h2>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-deep-700 dark:text-deep-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={emailField}
              onChange={(e) => setEmailField(e.target.value)}
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-900 text-deep-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="emailPassword"
              className="block text-xs font-semibold text-deep-700 dark:text-deep-300 mb-1.5"
            >
              Confirm current password
            </label>
            <input
              id="emailPassword"
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Required to change email"
              className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-900 text-deep-900 dark:text-white placeholder:text-deep-500 dark:placeholder:text-deep-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={
              emailBusy ||
              !emailPassword ||
              emailField.trim().toLowerCase() === user.email.toLowerCase()
            }
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] inline-flex items-center justify-center gap-2"
          >
            {emailBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            Update email
          </button>
          {emailMsg && <Banner kind={emailMsg.kind} message={emailMsg.text} />}
        </form>
      </section>

      {/* Password card */}
      <section className="rounded-2xl border border-deep-200 dark:border-deep-700 bg-white dark:bg-deep-800 p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-deep-950 dark:text-white text-base flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-ocean-500" />
          Password
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <PasswordField
            id="currentPwd"
            label="Current password"
            value={currentPwd}
            onChange={setCurrentPwd}
            show={showPwd}
            autoComplete="current-password"
          />
          <PasswordField
            id="newPwd"
            label="New password"
            value={newPwd}
            onChange={setNewPwd}
            show={showPwd}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <PasswordField
            id="confirmPwd"
            label="Confirm new password"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showPwd}
            autoComplete="new-password"
          />
          <label className="flex items-center gap-2 text-xs text-deep-600 dark:text-deep-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showPwd}
              onChange={(e) => setShowPwd(e.target.checked)}
              className="rounded border-deep-300 dark:border-deep-600 text-ocean-500 focus:ring-ocean-500"
            />
            {showPwd ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide passwords
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Show passwords
              </>
            )}
          </label>
          <button
            type="submit"
            disabled={pwdBusy || !currentPwd || !newPwd || !confirmPwd}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] inline-flex items-center justify-center gap-2"
          >
            {pwdBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
          {pwdMsg && <Banner kind={pwdMsg.kind} message={pwdMsg.text} />}
        </form>
      </section>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-deep-700 dark:text-deep-300 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 rounded-xl border border-deep-200 dark:border-deep-700 bg-deep-50 dark:bg-deep-900 text-deep-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent text-sm font-mono tracking-wider"
      />
      {hint && (
        <p className="mt-1 text-[11px] text-deep-500 dark:text-deep-400">{hint}</p>
      )}
    </div>
  );
}
