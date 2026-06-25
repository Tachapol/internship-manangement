"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "./types";
import { authApi } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

// Helpers to sync token between localStorage and cookie
// (cookie is needed for middleware redirect; localStorage for API calls)
function setToken(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  // Set cookie so middleware can read it (30-day expiry, path=/)
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearToken() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  document.cookie = "accessToken=; path=/; max-age=0";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Real token → validate with API
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  /** Real API login */
  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.accessToken, res.refreshToken);
    setUser(res.user);
    router.push("/dashboard");
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken") ?? "";
    await authApi.logout(refreshToken).catch(() => {});
    clearToken();
    setUser(null);
    router.push("/auth/login");
  };

  const refreshUser = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch (e) {
      console.error("Failed to refresh user info:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
