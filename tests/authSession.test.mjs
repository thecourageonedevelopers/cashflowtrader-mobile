// Run with: npm test   (node's built-in runner, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSessionResponse,
  isAuthAttemptUrl,
  isWrongPortalError,
  AuthSessionError,
} from "../src/utils/authSession.js";

test("a valid token + user is accepted", () => {
  const out = assertSessionResponse({ token: "jwt.value.here", user: { user_id: "u1" } });
  assert.equal(out.token, "jwt.value.here");
  assert.equal(out.user.user_id, "u1");
});

test("an undecrypted envelope or empty body is never a session", () => {
  for (const bad of [{ __enc: "abc" }, {}, null, undefined, { token: "", user: { a: 1 } }, { token: "t" }, { token: "t", user: "x" }, { token: "t", user: [] }, { token: 5, user: {} }]) {
    assert.throws(() => assertSessionResponse(bad), (e) => e instanceof AuthSessionError && e.code === "INVALID_SESSION_RESPONSE");
  }
});

test("OTP / MFA challenges (staff accounts) are refused, not treated as success", () => {
  for (const challenge of [{ otp_required: true, otp_token: "x" }, { mfa_required: true, mfa_token: "y" }]) {
    assert.throws(() => assertSessionResponse(challenge), (e) => e.code === "STAFF_ACCOUNT");
  }
});

test("sign-in attempts are exempt from the global 401 logout, protected calls are not", () => {
  for (const url of ["/auth/login", "/auth/google", "/auth/register", "/auth/register/verify-otp", "/auth/2fa/verify", "/auth/forgot-password/start", "/auth/login-otp/verify"]) {
    assert.equal(isAuthAttemptUrl(url), true, url);
  }
  for (const url of ["/auth/me", "/journal", "/profile", "/webinars", undefined, null]) {
    assert.equal(isAuthAttemptUrl(url), false, String(url));
  }
});

test("wrong_portal 403 is recognised", () => {
  assert.equal(isWrongPortalError({ response: { status: 403, data: { reason: "wrong_portal" } } }), true);
  assert.equal(isWrongPortalError({ response: { status: 403, data: { detail: "This account cannot sign in here." } } }), true);
  assert.equal(isWrongPortalError({ response: { status: 403, data: { detail: "Forbidden" } } }), false);
  assert.equal(isWrongPortalError({ response: { status: 401, data: { reason: "wrong_portal" } } }), false);
  assert.equal(isWrongPortalError(null), false);
});

// ── onboarding / tour loop regression ─────────────────────────────────────────
import { mergeUser } from "../src/utils/authSession.js";

test("tour-complete's partial payload does not drop onboarded (the onboarding loop)", () => {
  const user = { user_id: "u1", onboarded: true, tour_completed: false, name: "A" };
  const after = mergeUser(user, { ok: true, tour_completed: true });
  assert.equal(after.onboarded, true);
  assert.equal(after.tour_completed, true);
  assert.equal(after.user_id, "u1");
});

test("mergeUser handles updaters, sign-out and junk without losing state", () => {
  const user = { onboarded: true };
  assert.deepEqual(mergeUser(user, (p) => ({ ...p, access_status: "ok" })), { onboarded: true, access_status: "ok" });
  assert.equal(mergeUser(user, null), null);
  assert.equal(mergeUser(user, undefined), user);
  assert.equal(mergeUser(user, "x"), user);
  assert.deepEqual(mergeUser(null, { onboarded: true }), { onboarded: true });
  assert.equal(mergeUser(null, (p) => p), null);
});

test("full first-login sequence keeps the user onboarded through every refresh", () => {
  let u = null;
  u = { user_id: "u1", onboarded: false, tour_completed: false };       // login
  u = mergeUser(u, { onboarded: true });                                // onboarding submit confirmed
  assert.equal(u.onboarded && !u.tour_completed, true);                  // tour shows, onboarding does not
  u = mergeUser(u, { ok: true, tour_completed: true });                 // tour finished / skipped
  assert.equal(u.onboarded, true);
  assert.equal(u.tour_completed, true);
  u = mergeUser(u, (p) => ({ ...p, access_status: "active" }));         // unrelated profile refresh
  assert.equal(u.onboarded, true);
  assert.equal(mergeUser(u, null), null);                                // logout clears everything
  assert.deepEqual(mergeUser(null, { user_id: "u2", onboarded: false }), { user_id: "u2", onboarded: false }); // next account starts clean
});
