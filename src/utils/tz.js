// Port of web src/lib/tz.js — IANA timezone helpers.
// Intl.DateTimeFormat is available in React Native (Hermes + JSC).

// Offset of a timezone (minutes east of UTC) at a given instant.
export function tzOffsetMinutes(tz, date = new Date()) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(date).map((p) => [p.type, p.value])
    );
    let hour = parseInt(parts.hour, 10);
    if (hour === 24) hour = 0;
    const asUTC = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      hour,
      parts.minute,
      parts.second
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

// Returns "GMT +05:30" label for a given IANA timezone.
export function tzOffsetLabel(tz) {
  if (!tz) return "";
  const m = tzOffsetMinutes(tz);
  const sign = m >= 0 ? "+" : "-";
  const am = Math.abs(m);
  const hh = String(Math.floor(am / 60)).padStart(2, "0");
  const mm = String(am % 60).padStart(2, "0");
  return `GMT ${sign}${hh}:${mm}`;
}

// Parse "5:00 PM" / "17:00" into {h, min}.
function parseSlot(slot) {
  const m = (slot || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, min };
}

// Interpret a session's wall-clock time_slot on dateStr as being in timezone
// `tz`, and return the absolute Date instant. Falls back to device-local when
// no tz is provided (matches web zonedSessionStart behaviour exactly).
export function zonedSessionStart(dateStr, slot, tz) {
  const p = parseSlot(slot);
  if (!dateStr || !p) return null;
  if (!tz) {
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(p.h, p.min, 0, 0);
    return d;
  }
  const iso = `${dateStr}T${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}:00Z`;
  const guess = new Date(iso);
  const off = tzOffsetMinutes(tz, guess);
  return new Date(guess.getTime() - off * 60000);
}
