import test from "node:test";
import assert from "node:assert/strict";
import {
  alertKey, durationLabel, launchTarget, parseDismissed, primaryAction, registrationLabel,
  scheduleLine, startsInLabel, statusMeta, visibleAlerts, webinarDate, webinarOffset, webinarTime, withDismissed,
} from "../src/utils/webinars.js";

test("times are always India Standard Time", () => {
  // 13:00 UTC = 6:30 PM IST
  assert.equal(webinarTime("2026-10-20T13:00:00Z"), "6:30 PM");
  assert.equal(webinarDate("2026-10-20T13:00:00Z"), "Tue, Oct 20, 2026");
  assert.equal(webinarOffset("2026-10-20T13:00:00Z"), "IST");
  assert.equal(scheduleLine("2026-10-20T13:00:00Z"), "Tue, Oct 20, 2026 · 6:30 PM (IST)");
  assert.equal(scheduleLine(null), "—");
  assert.equal(webinarOffset("nope"), "");
});

test("durationLabel", () => {
  assert.equal(durationLabel(90), "1h 30m");
  assert.equal(durationLabel(45), "45m");
  assert.equal(durationLabel(120), "2h");
});

test("primaryAction follows the server flags", () => {
  assert.equal(primaryAction({ status: "LIVE", join: { can_join: true } }).kind, "join");
  assert.equal(primaryAction({ status: "LIVE", join: { can_join: true } }).label, "Join Now");
  assert.equal(primaryAction({ status: "PUBLISHED", join: { can_register: true } }).kind, "register");
  assert.equal(primaryAction({ status: "PUBLISHED", registration: { status: "REGISTERED" }, join: {} }).kind, "registered");
  assert.equal(primaryAction({ status: "PUBLISHED", join: { needs_registration: true }, seats_remaining: 0 }).kind, "full");
  assert.equal(primaryAction({ status: "PUBLISHED", join: { needs_registration: true }, seats_remaining: 3 }).kind, "closed");
  assert.equal(primaryAction({ status: "PUBLISHED", join: {} }).kind, "waiting");
  assert.equal(primaryAction({ status: "ENDED", join: { can_join: true } }).kind, "ended");
  assert.equal(primaryAction({ status: "CANCELLED" }).kind, "cancelled");
  assert.equal(primaryAction({ status: "ARCHIVED" }).kind, "view");
});

test("registrationLabel / statusMeta", () => {
  assert.equal(registrationLabel({ registration_required: false }), "Open to join — no registration");
  assert.equal(registrationLabel({ registration_required: true, registration: { status: "REGISTERED" } }), "You're registered");
  assert.equal(registrationLabel({ registration_required: true, seats_remaining: 0 }), "Fully booked");
  assert.deepEqual(statusMeta("LIVE"), { label: "Live", tone: "live" });
});

test("startsInLabel only for future PUBLISHED webinars", () => {
  const now = Date.parse("2026-10-20T00:00:00Z");
  const at = (ms) => new Date(now + ms).toISOString();
  assert.equal(startsInLabel({ status: "PUBLISHED", start_at: at(3 * 86400000) }, now), "Starts in 3 days");
  assert.equal(startsInLabel({ status: "PUBLISHED", start_at: at(30 * 3600000) }, now), "Starts tomorrow");
  assert.equal(startsInLabel({ status: "PUBLISHED", start_at: at(90 * 60000) }, now), "Starts in 1h 30m");
  assert.equal(startsInLabel({ status: "LIVE", start_at: at(60000) }, now), null);
  assert.equal(startsInLabel({ status: "PUBLISHED", start_at: at(-1000) }, now), null);
});

test("alert dismissal is remembered for 14 days only", () => {
  const now = 1_000_000_000_000;
  const a = { kind: "LIVE_NOW", webinar_id: "w1" };
  const b = { kind: "UPCOMING", webinar_id: "w2" };
  const stored = JSON.stringify(withDismissed({}, a, now));
  assert.deepEqual(visibleAlerts([a, b], parseDismissed(stored, now + 1000)).map(alertKey), ["UPCOMING:w2"]);
  assert.equal(visibleAlerts([a, b], parseDismissed(stored, now + 15 * 86400000)).length, 2);
  assert.deepEqual(parseDismissed("not json"), {});
  assert.deepEqual(parseDismissed(null), {});
});

test("launchTarget only accepts the backend launch path", () => {
  assert.equal(launchTarget("https://api.example.com/", "/api/webinar/launch/abc123"), "https://api.example.com/api/webinar/launch/abc123");
  assert.equal(launchTarget("https://api.example.com", "https://evil.example/x"), null);
  assert.equal(launchTarget("https://api.example.com", "//evil.example/api/webinar/launch/x"), null);
  assert.equal(launchTarget("https://api.example.com", undefined), null);
  assert.equal(launchTarget("", "/api/webinar/launch/abc"), null);
});
