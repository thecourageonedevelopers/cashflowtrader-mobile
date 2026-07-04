import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi } from "../api/auth";
import client, { setUnauthorizedHandler } from "../api/client";
import { queryClient } from "../api/queryClient";
import { tokenService } from "../services/tokenService";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading=true until the initial token check resolves — prevents auth-screen flash
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef(null);

  // ── Check existing session ──────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    try {
      const token = await tokenService.get();
      if (!token) {
        setUser(null);
        return null;
      }
      const { data } = await authApi.me();
      const resolved = data.user ?? data;
      setUser(resolved);
      return resolved;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // ── Startup init ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setLoading(false);
    };
    init();
  }, [checkAuth]);

  // ── Register forced-logout handler with the Axios interceptor ───────────
  // Fires when any response returns 401 (expired/invalid token).
  useEffect(() => {
    logoutRef.current = async () => {
      await tokenService.remove();
      queryClient.clear();
      setUser(null);
    };
    setUnauthorizedHandler(() => logoutRef.current?.());
    return () => setUnauthorizedHandler(null);
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    await tokenService.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register(name, email, password);
    await tokenService.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Mirrors web googleLoginThunk: POST /auth/google { credential } → store JWT → set user.
  // credential is the Google ID token received from expo-auth-session.
  const googleLogin = useCallback(async (credential) => {
    const { data } = await authApi.googleLogin(credential);
    await tokenService.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    // Mirror web authSlice: fire session/logout first (best-effort), then auth/logout.
    try { await authApi.sessionLogout(); } catch {}
    try { await authApi.logout(); } catch {}
    await tokenService.remove();
    queryClient.clear();
    setUser(null);
  }, []);

  // ── Derived flags ───────────────────────────────────────────────────────
  const value = useMemo(() => ({
    user,
    setUser,
    loading,

    // Actions
    login,
    register,
    googleLogin,
    logout,
    checkAuth,
    refresh: checkAuth,

    // Convenience flags (mirrors web AuthContext)
    isAuthenticated: !!user,
    isAdmin: user?.is_admin === true,
    isMentor: user?.is_mentor === true,
    isOnboarded: user?.onboarded === true,
    hasChallengeAccess: user?.challenge_unlocked === true,
    hasCommunityAccess: user?.community_access === true,
  }), [user, loading, login, register, googleLogin, logout, checkAuth, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be called inside <AuthProvider>");
  }
  return ctx;
}
