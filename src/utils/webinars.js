// Webinar display rules for the customer app. Port of the portal's src/lib/webinars.js — the backend
// decides everything (visibility, registration, seats, join window) and sends it in each webinar's
// `join` block; these helpers only turn those answers into labels. No React Native imports here so the
// file can be unit-tested with `node --test`.
// Times arrive as UTC instants and are ALWAYS shown in India Standard Time (no timezone choice).

export const WEBINAR_TIMEZONE = "Asia/Kolkata";

const STATUS = {
  PUBLISHED: { label: "Upcoming", tone: "upcoming" },
  LIVE: { label: "Live", tone: "live" },
  ENDED: { label: "Ended", tone: "ended" },
  ARCHIVED: { label: "Archived", tone: "ended" },
  CANCELLED: { label: "Cancelled", tone: "cancelled" },
};

export function statusMeta(status) {
  return STATUS[status] || { label: status || "", tone: "ended" };
}

function fmt(iso, opts) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: WEBINAR_TIMEZONE, ...opts }).format(d);
}

// "Tue, Oct 20, 2026" in IST.
export function webinarDate(iso) {
  return fmt(iso, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// "6:30 PM" in IST.
export function webinarTime(iso) {
  return fmt(iso, { hour: "numeric", minute: "2-digit" });
}

// "IST" for any valid instant (India has no daylight saving), empty for a missing/invalid one.
export function webinarOffset(iso) {
  if (!iso || isNaN(new Date(iso).getTime())) return "";
  return "IST";
}

// "Tue, Oct 20, 2026 · 6:30 PM (IST)"
export function scheduleLine(iso) {
  if (!iso) return "—";
  return `${webinarDate(iso)} · ${webinarTime(iso)} (${webinarOffset(iso)})`;
}

// "1h 30m" / "45m" / "2h".
export function durationLabel(minutes) {
  const m = Number(minutes) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
}

// What the main button should be, from the server's flags only.
// kind: join | register | registered | full | closed | waiting | ended | view | cancelled
export function primaryAction(w) {
  const j = w?.join || {};
  const registered = w?.registration?.status === "REGISTERED";
  switch (w?.status) {
    case "CANCELLED":
      return { kind: "cancelled", label: "Cancelled" };
    case "ARCHIVED":
      return { kind: "view", label: "View only" };
    case "ENDED":
      return { kind: "ended", label: "Ended" };
    default:
      break;
  }
  if (j.can_join) return { kind: "join", label: w.status === "LIVE" ? "Join Now" : "Join" };
  if (j.can_register) return { kind: "register", label: "Register" };
  if (registered) return { kind: "registered", label: "Registered" };
  if (j.needs_registration && w.seats_remaining === 0) return { kind: "full", label: "Full" };
  if (j.needs_registration || j.state === "CLOSED") return { kind: "closed", label: "Closed" };
  return { kind: "waiting", label: "Opens soon" };
}

// Human registration line for list cards.
export function registrationLabel(w) {
  if (!w?.registration_required) return "Open to join — no registration";
  if (w?.registration?.status === "REGISTERED") return "You're registered";
  if (w?.seats_remaining === 0) return "Fully booked";
  return "Registration required";
}

// "Starts in 2 days" etc. — only while PUBLISHED and in the future (same wording as the portal).
export function startsInLabel(w, now = Date.now()) {
  if (!w?.start_at || w.status !== "PUBLISHED") return null;
  const ms = new Date(w.start_at).getTime() - now;
  if (!(ms > 0)) return null;
  const totalMin = Math.floor(ms / 60000);
  const totalHr = Math.floor(totalMin / 60);
  const totalDays = Math.floor(totalHr / 24);
  if (totalDays >= 2) return `Starts in ${totalDays} days`;
  if (totalDays === 1) return "Starts tomorrow";
  if (totalHr >= 1) return `Starts in ${totalHr}h ${totalMin - totalHr * 60}m`;
  if (totalMin >= 1) return `Starts in ${totalMin}m`;
  return `Starts in ${Math.floor(ms / 1000)}s`;
}

// ── dashboard alerts ──────────────────────────────────────────────────────────
const ALERT_META = {
  LIVE_NOW: { label: "Live now", cta: "Join", tone: "live" },
  STARTING_SOON: { label: "Starting soon", cta: "Details", tone: "soon" },
  UPCOMING: { label: "Upcoming", cta: "Details", tone: "upcoming" },
};

export function alertMeta(alert) {
  return ALERT_META[alert?.kind] || { label: "Webinar", cta: "Details", tone: "upcoming" };
}

export const DISMISS_FOR_MS = 14 * 86400000;
export const dismissKey = (userId) => `cf_webinar_alerts_dismissed:${userId || "anon"}`;
export const alertKey = (a) => `${a.kind}:${a.webinar_id}`;

// `raw` is the stored JSON string (or null). Entries older than 14 days are forgotten.
export function parseDismissed(raw, now = Date.now()) {
  try {
    const obj = JSON.parse(raw || "{}");
    return Object.fromEntries(
      Object.entries(obj).filter(([, at]) => typeof at === "number" && now - at < DISMISS_FOR_MS)
    );
  } catch {
    return {};
  }
}

export function withDismissed(dismissed, alert, now = Date.now()) {
  return { ...(dismissed || {}), [alertKey(alert)]: now };
}

export function visibleAlerts(alerts, dismissed, limit = 4) {
  return (alerts || []).filter((a) => !dismissed?.[alertKey(a)]).slice(0, limit);
}

// Joining returns a one-time launch path ("/api/webinar/launch/<ticket>") — never a provider link.
// Only a path under that prefix is ever opened, so a malformed response can't send the user elsewhere.
export function launchTarget(apiBase, launchUrl) {
  if (typeof launchUrl !== "string" || !launchUrl.startsWith("/api/webinar/launch/")) return null;
  const base = String(apiBase || "").replace(/\/+$/, "");
  return base ? `${base}${launchUrl}` : null;
}
