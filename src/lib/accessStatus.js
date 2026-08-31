// Port of web src/lib/accessStatus.js — trader-facing expiry helpers only (ExpiryWarningBanner).
// Web's admin-only exports (accessStatusLabel, accessStatusDetail, ACCESS_STATUS_BADGE,
// accessCountdownLabel, matchesAccessFilter) back the Admin OS Users list / Program Access panel,
// which mobile has no equivalent screen for — not ported.
//
// Deliberately separate from any millisecond-duration bucketing: cutoff_at is anchored to IST
// midnight server-side (BusinessClock.startOfDay), so "days remaining" needs to be a calendar-day
// difference in that same IST reference, not Math.floor((cutoff-now)/86400000) — the latter can
// read "1 day" as late as 23:59 the day before, or "0 days" for most of what a user would call
// "tomorrow", depending on what time of day it is right now. This is the ONE day-math
// implementation the trader-facing banner uses — ChallengeScreen.js and OverviewScreen.js both go
// through this same function, never their own.

const IST_OFFSET_MIN = 330; // Asia/Kolkata, UTC+5:30 — no DST in India

/** Calendar-day difference (IST) between `cutoffAt` (ISO/parsable) and today. 0 = today, 1 =
 *  tomorrow, negative = already passed. Returns null for a falsy cutoffAt (lifetime access). */
export function daysUntilCutoffIST(cutoffAt) {
  if (!cutoffAt) return null;
  const istCalendarDay = (epochMs) => {
    const ist = new Date(epochMs + IST_OFFSET_MIN * 60000);
    return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  };
  const cutoffMs = new Date(cutoffAt).getTime();
  if (Number.isNaN(cutoffMs)) return null;
  return Math.round((istCalendarDay(cutoffMs) - istCalendarDay(Date.now())) / 86400000);
}

/** "20 Aug 2026" — the exact DD MMM YYYY format the expiry banner displays. */
export function formatExpiryDate(cutoffAt) {
  if (!cutoffAt) return "";
  const d = new Date(cutoffAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
