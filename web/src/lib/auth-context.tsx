"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";

export interface User {
  id: number;
  email: string;
  nickname: string;
  role: "admin" | "user";
  radius: number;
  avatarUrl?: string | null;
  createdAt?: string;
  lastActive?: string;
}

const REMEMBER_EXPIRY_KEY = "ss_token_expiry";
const REMEMBER_DAYS = 30;

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  logout: () => void;
  /** Replace the cached user. Use after account edits when you already have the updated record. */
  setUser: (user: User) => void;
  /** Refetch /me from the server and refresh the cached user. */
  refreshUser: () => Promise<void>;
  /** Replace the stored token (e.g. after an email change re-emits one). */
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check remembered token (localStorage) first, then session token
    const expiry = localStorage.getItem(REMEMBER_EXPIRY_KEY);
    const saved =
      expiry && Date.now() < Number(expiry)
        ? localStorage.getItem("ss_token")
        : sessionStorage.getItem("ss_token");

    // Clean up expired remembered token
    if (expiry && Date.now() >= Number(expiry)) {
      localStorage.removeItem("ss_token");
      localStorage.removeItem(REMEMBER_EXPIRY_KEY);
    }

    if (saved) {
      setToken(saved);
      api
        .getMe(saved)
        .then((res: unknown) => {
          const { data } = res as { data: User };
          setUser(data);
        })
        .catch(() => {
          localStorage.removeItem("ss_token");
          localStorage.removeItem(REMEMBER_EXPIRY_KEY);
          sessionStorage.removeItem("ss_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const res = (await api.login(email, password, rememberMe)) as {
      data: { token: string; user: User };
    };
    if (rememberMe) {
      const expiry = Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem("ss_token", res.data.token);
      localStorage.setItem(REMEMBER_EXPIRY_KEY, String(expiry));
    } else {
      sessionStorage.setItem("ss_token", res.data.token);
    }
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, nickname: string) => {
      const res = (await api.register(email, password, nickname)) as {
        data: { token: string; user: User };
      };
      sessionStorage.setItem("ss_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem(REMEMBER_EXPIRY_KEY);
    sessionStorage.removeItem("ss_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = (await api.getMe(token)) as { data: User };
      setUser(res.data);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, [token]);

  const persistToken = useCallback((next: string) => {
    // Preserve whichever storage was used for the original login
    if (localStorage.getItem(REMEMBER_EXPIRY_KEY)) {
      localStorage.setItem("ss_token", next);
    } else {
      sessionStorage.setItem("ss_token", next);
    }
    setToken(next);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setUser,
        refreshUser,
        setToken: persistToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
