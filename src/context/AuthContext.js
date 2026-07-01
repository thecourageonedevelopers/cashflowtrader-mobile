import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Linking from "expo-linking";
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

  // OAuth deep-link: exchanges a session_id (from Emergent redirect) for a JWT.
  // Declared before the init useEffect so it can be safely listed in deps.
  const loginWithSession = useCallback(async (session_id) => {
    console.log("[Auth] 6. loginWithSession START — session_id:", session_id);
    const { data } = await authApi.session(session_id);
    console.log("[Auth] 7. POST /auth/session response keys:", Object.keys(data ?? {}));
    console.log("[Auth] 7. token present:", !!data?.token);
    console.log("[Auth] 7. user:", JSON.stringify(data?.user ?? null));
    await tokenService.set(data.token);
    console.log("[Auth] 7. Token stored in AsyncStorage.");
    setUser(data.user);
    console.log("[Auth] 7. setUser called — user email:", data.user?.email);
    return data.user;
  }, []);

  // ── Startup init + OAuth deep-link guard ────────────────────────────────
  useEffect(() => {
    // Foreground deep-link listener: catches the OAuth redirect when the app is
    // already running (Android Chrome Custom Tabs fires a Linking event on return).
    const sub = Linking.addEventListener("url", async ({ url }) => {
      if (!url?.includes("session_id=")) return;
      const m = url.match(/session_id=([^&\s#]+)/);
      if (m) { try { await loginWithSession(m[1]); } catch {} }
    });

    const init = async () => {
      // Cold-start guard: mirrors the web's window.location.hash check in AuthContext.jsx.
      // If the app was opened FROM an OAuth deep link (cashflowtrader://auth/callback#session_id=…),
      // skip GET /auth/me — no token exists yet. Exchange the session_id directly instead.
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl?.includes("session_id=")) {
        const m = initialUrl.match(/session_id=([^&\s#]+)/);
        if (m) { try { await loginWithSession(m[1]); } catch {} }
      } else {
        await checkAuth();
      }
      setLoading(false);
    };

    init();
    return () => sub.remove();
  }, [checkAuth, loginWithSession]);

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

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort server-side session teardown
    } finally {
      await tokenService.remove();
      queryClient.clear();
      setUser(null);
    }
  }, []);

  // ── Derived flags ───────────────────────────────────────────────────────
  const value = {
    user,
    setUser,
    loading,

    // Actions
    login,
    register,
    logout,
    loginWithSession,
    checkAuth,
    refresh: checkAuth,

    // Convenience flags (mirrors web AuthContext)
    isAuthenticated: !!user,
    isAdmin: user?.is_admin === true,
    isMentor: user?.is_mentor === true,
    isOnboarded: user?.onboarded === true,
    hasChallengeAccess: user?.challenge_unlocked === true,
    hasCommunityAccess: user?.community_access === true,
  };

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
