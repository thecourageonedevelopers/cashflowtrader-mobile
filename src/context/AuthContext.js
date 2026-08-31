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
  // Mirrors web's checkAuth thunk (authSlice.js): a single attempt, classified as
  // "definitive" only for an actual 401 (invalid/expired/revoked token — there's genuinely no
  // session to restore) versus "non-definitive" for everything else (network error, timeout,
  // 500/502/503, temporary outage) — a stored token may still be perfectly valid, so a
  // non-definitive failure must never clear it. This function makes one attempt only; retrying
  // on a non-definitive failure is the caller's responsibility (see the startup effect below),
  // exactly mirroring web's split between the thunk (one attempt) and AuthContext.jsx's own
  // retry loop — not duplicated here, so other callers (post-purchase/post-onboarding refresh)
  // keep their existing single-attempt behavior unchanged.
  const checkAuthRaw = useCallback(async () => {
    const token = await tokenService.get();
    if (!token) {
      setUser(null);
      return { resolved: null, definitive: true };
    }
    try {
      const { data } = await authApi.me();
      const resolved = data.user ?? data;
      setUser(resolved);
      return { resolved, definitive: true };
    } catch (err) {
      const definitive = err?.response?.status === 401;
      if (definitive) {
        setUser(null);
      }
      return { resolved: null, definitive };
    }
  }, []);

  // Public API — return contract (resolved user or null, never throws) is unchanged from
  // before, so every existing caller (ChallengeLanding, OnboardingScreen, ChallengeScreen) keeps
  // working exactly as-is.
  const checkAuth = useCallback(async () => {
    const { resolved } = await checkAuthRaw();
    return resolved;
  }, [checkAuthRaw]);

  // ── Startup init ────────────────────────────────────────────────────────
  // Mirrors web's AuthContext.jsx mount effect exactly: capped-backoff retry
  // (Math.min(2000 * attempt, 15000)) on non-definitive failures only; a definitive failure or a
  // success both resolve `loading` immediately. `cancelled` mirrors web's own cleanup guard.
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    const tryCheck = async () => {
      if (cancelled) return;
      const { definitive } = await checkAuthRaw();
      if (cancelled) return;
      if (definitive) {
        setLoading(false);
        return;
      }
      attempt += 1;
      const delay = Math.min(2000 * attempt, 15000);
      setTimeout(tryCheck, delay);
    };

    tryCheck();
    return () => { cancelled = true; };
  }, [checkAuthRaw]);

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
