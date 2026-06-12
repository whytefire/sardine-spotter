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

interface User {
  id: number;
  email: string;
  nickname: string;
  role: "god" | "admin" | "user";
  radius: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("ss_token");
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
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = (await api.login(email, password)) as {
      data: { token: string; user: User };
    };
    localStorage.setItem("ss_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, nickname: string) => {
      const res = (await api.register(email, password, nickname)) as {
        data: { token: string; user: User };
      };
      localStorage.setItem("ss_token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("ss_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
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
