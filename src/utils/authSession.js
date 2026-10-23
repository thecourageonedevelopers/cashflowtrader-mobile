// Pure helpers for the sign-in flows (kept free of React Native imports so they can be unit-tested
// with `node --test`).

// Endpoints whose 401 means "this attempt failed", not "the stored session expired".
// Mirrors the portal's AUTH_ENDPOINTS_EXEMPT_FROM_GLOBAL_401 (src/lib/api.js). /auth/me is
// deliberately NOT exempt: a 401 there is a genuinely dead session.
const AUTH_ATTEMPT_PREFIXES = [
  "/auth/login", // also covers /auth/login-otp/*
  "/auth/register",
  "/auth/google",
  "/auth/2fa/verify",
  "/auth/forgot-password/",
];

export function isAuthAttemptUrl(url) {
  if (typeof url !== "string") return false;
  const path = url.split("?")[0];
  return AUTH_ATTEMPT_PREFIXES.some((p) => path.startsWith(p));
}

export class AuthSessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthSessionError";
    this.code = code;
  }
}

// A sign-in response only counts as a session when it carries a real token and a real user.
// Anything else (undecrypted envelope, challenge for a staff account, empty body) throws and
// nothing is persisted.
export function assertSessionResponse(data) {
  if (data && (data.mfa_required || data.otp_required)) {
    throw new AuthSessionError(
      "STAFF_ACCOUNT",
      "This account can't sign in to the Cashflow Trader app. Please use the web portal."
    );
  }
  const token = data?.token;
  const user = data?.user ?? null;
  if (typeof token !== "string" || token.trim() === "" || !user || typeof user !== "object" || Array.isArray(user)) {
    throw new AuthSessionError(
      "INVALID_SESSION_RESPONSE",
      "Sign-in could not be completed because the server response was invalid. Please try again."
    );
  }
  return { token, user };
}

// 403 wrong_portal (staff/admin on the customer app) — body: { detail, reason: "wrong_portal" }.
export function isWrongPortalError(err) {
  const d = err?.response?.data;
  return err?.response?.status === 403 && (d?.reason === "wrong_portal" || d?.detail === "This account cannot sign in here.");
}

// Merge semantics for AuthContext.setUser — same as the portal's authSlice setUser reducer
// (state.user = { ...state.user, ...payload }). Several endpoints return only a PARTIAL user
// (e.g. POST /profile/tour-complete answers { ok, tour_completed }); replacing the user with that
// dropped `onboarded`, which sent a just-onboarded user straight back to the onboarding questions.
// `update` may be an object, a functional updater (prev) => next, or null (sign-out).
export function mergeUser(prev, update) {
  const next = typeof update === "function" ? update(prev) : update;
  if (next === null) return null;
  if (!next || typeof next !== "object" || Array.isArray(next)) return prev ?? null;
  return prev ? { ...prev, ...next } : next;
}
