import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { useAuth } from "../src/hooks/useAuth";
import { sessionsApi } from "../src/api/sessions";
import { formatCountdown, formatSessionDate } from "../src/utils/format";
import { zonedSessionStart, tzOffsetLabel } from "../src/utils/tz";

// ─── Design tokens ────────────────────────────────────────────────────────────

const NEON             = PRIMARY; // #39FF14
const GLASS_BG         = "rgba(255,255,255,0.03)";
const GLASS_BORDER     = "rgba(255,255,255,0.08)";
const GLASS_STRONG_BG  = "rgba(10,10,10,0.8)";
const GLASS_STRONG_BDR = "rgba(255,255,255,0.1)";

const IMPORTANCE_COLORS = {
  MUST:        NEON,
  RECOMMENDED: "rgba(255,255,255,0.8)",
  OPTIONAL:    "rgba(255,255,255,0.5)",
};

// ─── Helpers (ported 1-to-1 from web LiveSessions.jsx) ───────────────────────

// Deterministic pseudo-random attendee count — stable across renders
function attendeeCountFor(id) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 42 + (h % 180);
}

// 3-level importance based on title keywords
function importanceFor(title = "") {
  const t = title.toLowerCase();
  if (
    t.includes("market") || t.includes("levels") || t.includes("analysis") ||
    t.includes("psychology") || t.includes("mindset")
  ) {
    return { level: "MUST", label: "Must Attend", note: "Cornerstone session" };
  }
  if (
    t.includes("setup") || t.includes("discussion") || t.includes("trade") ||
    t.includes("live trading")
  ) {
    return { level: "RECOMMENDED", label: "Recommended", note: "Trade setups reviewed live" };
  }
  return { level: "OPTIONAL", label: "Optional", note: "Supporting session" };
}

// Hide rows that look like internal/test seeding
function isTestSession(s) {
  const blob = `${s.title || ""} ${s.description || ""}`.toLowerCase();
  return /\b(test|qa|sample|dummy|debug|lorem)\b/.test(blob);
}

// The ONE shared meeting link set by Admin/Mentor. Never generate a new room.
// Mirrors web's meetingUrlOf() exactly.
function meetingUrlOf(s) {
  const u = (s.meeting_url || s.join_url || "").trim();
  if (!u) return "";
  const base = u.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
  if (
    base === "https://meet.google.com/new" ||
    base === "http://meet.google.com/new"
  ) return "";
  return u;
}

// Strips "Starts in " / "Starts " prefix — matches web's countdown.replace()
// "Starts in 3h 30m" → "3h 30m"   "Starts tomorrow" → "tomorrow"   null → "Live now"
function inColumnText(countdown) {
  if (!countdown) return "Live now";
  return countdown.replace(/^Starts (in )?/, "");
}

// ─── PulsingDot — mirrors web's animate-pulse on the LIVE badge dot ──────────

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseDot, { opacity }]} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionsScreen({ navigation }) {
  const { user } = useAuth();
  // Timezone from user profile — matches web's `const tz = user?.timezone || ""`
  const tz    = user?.timezone || "";
  const tzLbl = tz ? tzOffsetLabel(tz) : "";

  const [refreshing, setRefreshing] = useState(false);
  // Reactive clock — re-evaluates countdowns every 30 s (matches web setInterval 30_000)
  const [now, setNow] = useState(new Date());

  const { data: rawSessions, isLoading, isError, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionsApi.list().then((r) => r.data),
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Record attendance for mission credit — mirrors web's recordJoin()
  const recordJoin = useCallback((id) => {
    sessionsApi.join(id).catch(() => {});
  }, []);

  const todayISO = now.toISOString().slice(0, 10);

  // Filter test/seeded rows AND Cancelled — matches web's .filter() in useEffect
  const sessions = useMemo(
    () =>
      (rawSessions ?? []).filter(
        (s) => !isTestSession(s) && s.status !== "Cancelled"
      ),
    [rawSessions]
  );

  // Group by ISO date string, sorted — matches web's groupedByDate + dates
  const groupedByDate = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { (m[s.date] = m[s.date] || []).push(s); });
    return m;
  }, [sessions]);
  const dates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  // Earliest future session globally — matches web's nextSession useMemo
  const nextSession = useMemo(() => {
    return sessions
      .map((s) => ({ ...s, _start: zonedSessionStart(s.date, s.time_slot, tz) }))
      .filter((s) => s._start && s._start.getTime() > now.getTime())
      .sort((a, b) => a._start - b._start)[0] || null;
  }, [sessions, now, tz]);

  const nextCountdown = nextSession ? formatCountdown(nextSession._start) : null;
  const nextAttendees = nextSession ? attendeeCountFor(nextSession.session_id) : 0;
  const nextUrl       = nextSession ? meetingUrlOf(nextSession) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenLayout screenName="SessionsScreen" navigation={navigation}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={NEON}
            colors={[NEON]}
          />
        }
      >

        {/* ── HEADER ────────────────────────────────────────────────────────
            Matches web:
              <div className="chip"><Radio /> Live Sessions</div>
              <h1>Never trade <span className="neon-text">alone again.</span></h1>
              <p className="text-white/60">Live market analysis…</p>
        ──────────────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.chip}>
            <Ionicons name="radio-outline" size={10} color={NEON} />
            <Text style={styles.chipText}>Live Sessions</Text>
          </View>

          <Text style={styles.heroTitle}>
            {"Never trade "}
            <Text style={styles.neonText}>{"alone again."}</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Live market analysis, trade discussions, and psychology.{" "}
            Stay connected to the process every single day.
          </Text>
        </View>

        {/* ── NEXT SESSION HIGHLIGHT ────────────────────────────────────────
            Matches web's glass-strong card with decorative orb, chip, title,
            meta row (Date · Time(tz) · mentor · attendees), and join button
            or "Link Coming Soon" disabled span.
        ──────────────────────────────────────────────────────────────────── */}
        {nextSession && (
          <View style={[styles.section, styles.nextCard]}>
            {/* Decorative orb — mirrors web's absolute blur-3xl bg-[#39FF14]/[0.08] */}
            <View style={styles.decorOrb} pointerEvents="none" />

            {/* Chip: Zap + "Next Live · countdown" */}
            <View style={styles.chip}>
              <Ionicons name="flash-outline" size={10} color={NEON} />
              <Text style={styles.chipText}>
                {"Next Live · "}{nextCountdown || "Upcoming"}
              </Text>
            </View>

            {/* Title — font-display font-black text-2xl sm:text-3xl */}
            <Text style={styles.nextCardTitle}>{nextSession.title}</Text>

            {/* Meta row: Date · Time(tz) · with mentor · attendees */}
            <View style={styles.nextMetaRow}>
              <Text style={styles.metaText}>
                {nextSession.date === todayISO
                  ? "Today"
                  : formatSessionDate(nextSession.date)}
              </Text>
              <Text style={styles.metaSep}>{" · "}</Text>
              <Text style={styles.metaText}>
                {tzLbl
                  ? `${nextSession.time_slot} (${tzLbl})`
                  : nextSession.time_slot}
              </Text>
              {nextSession.mentor_name ? (
                <>
                  <Text style={styles.metaSep}>{" · "}</Text>
                  <Text style={styles.metaText}>{"with "}{nextSession.mentor_name}</Text>
                </>
              ) : null}
              <Text style={styles.metaSep}>{" · "}</Text>
              <View style={styles.metaAttendees}>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.metaText}>{nextAttendees} traders attending</Text>
              </View>
            </View>

            {/* Join button OR "Link Coming Soon" disabled — matches web exactly */}
            {nextUrl ? (
              <TouchableOpacity
                style={styles.neonBtn}
                activeOpacity={0.85}
                onPress={() => {
                  Linking.openURL(nextUrl).catch(() => {});
                  recordJoin(nextSession.session_id);
                }}
              >
                <Text style={styles.neonBtnText}>Join Live</Text>
                <Ionicons name="open-outline" size={16} color="#000" />
              </TouchableOpacity>
            ) : (
              <View style={styles.disabledBtn}>
                <Text style={styles.disabledBtnText}>Link Coming Soon</Text>
              </View>
            )}
          </View>
        )}

        {/* ── LOADING — matches web: mono uppercase "Loading..." ─────────── */}
        {isLoading && !rawSessions && (
          <Text style={styles.loadingText}>Loading...</Text>
        )}

        {/* ── ERROR — tap to retry (native-only UX) ─────────────────────── */}
        {isError && !rawSessions && !isLoading && (
          <View style={[styles.section, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>Couldn't load sessions.</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── EMPTY STATE — matches web copy exactly ──────────────────────── */}
        {!isLoading && !isError && dates.length === 0 && (
          <View style={[styles.section, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>No upcoming sessions yet.</Text>
            <Text style={styles.emptyBody}>
              New live sessions drop daily. Check back tomorrow at 5 PM.
            </Text>
          </View>
        )}

        {/* ── SESSION LIST — grouped by date ────────────────────────────────
            Matches web: dates.map → date header → grid of session cards
        ──────────────────────────────────────────────────────────────────── */}
        {!isLoading && dates.map((date) => (
          <View key={date} style={styles.section}>

            {/* Date header — matches web: font-mono 10px uppercase text-white/40 */}
            <Text style={styles.dateHeader}>
              {date === todayISO ? "Today" : formatSessionDate(date)}
            </Text>

            {groupedByDate[date].map((s) => {
              const imp       = importanceFor(s.title);
              const status    = s.status || "Scheduled";
              const isLive    = status === "Live";
              const isEnded   = status === "Ended";
              const start     = zonedSessionStart(s.date, s.time_slot, tz);
              const countdown = start ? formatCountdown(start) : null;
              const inText    = inColumnText(countdown);
              const attendees = attendeeCountFor(s.session_id);
              const url       = meetingUrlOf(s);
              const joinable  = !!url && !isEnded;

              // "Starts" column value — includes tz label when user has timezone set
              const startsValue = tzLbl
                ? `${s.time_slot} (${tzLbl})`
                : s.time_slot;

              return (
                <View key={s.session_id} style={styles.sessionCard}>

                  {/* ── Row 1: Status chip + importance label ────────────────
                      Web: <div className={`chip ${isLive ? "" : "opacity-80"}`}>
                        {isLive ? <pulse-dot /> LIVE
                         : status=Ended ? <span text-white/50>ENDED</span>
                         : <span text-white/70>SCHEDULED</span>}
                      </div>
                      <span className={importanceClass[imp.level]}>{imp.label}</span>
                  ──────────────────────────────────────────────────────────── */}
                  <View style={styles.cardRow1}>
                    <View style={[styles.chip, !isLive && styles.chipDim]}>
                      {isLive ? (
                        <>
                          <PulsingDot />
                          <Text style={styles.chipText}>LIVE</Text>
                        </>
                      ) : isEnded ? (
                        <Text style={[styles.chipText, styles.chipTextEnded]}>ENDED</Text>
                      ) : (
                        <Text style={[styles.chipText, styles.chipTextScheduled]}>SCHEDULED</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.importanceLabel,
                        { color: IMPORTANCE_COLORS[imp.level] },
                      ]}
                    >
                      {imp.label}
                    </Text>
                  </View>

                  {/* ── Title — font-display font-bold text-xl ──────────── */}
                  <Text style={styles.cardTitle}>{s.title}</Text>

                  {/* ── Mentor — "with {name}" font-mono text-white/45 ──── */}
                  {s.mentor_name ? (
                    <Text style={styles.mentorName}>{"with "}{s.mentor_name}</Text>
                  ) : null}

                  {/* ── Importance note ─────────────────────────────────── */}
                  <Text style={styles.cardNote}>{imp.note}</Text>

                  {/* ── Description (conditional) ────────────────────────── */}
                  {s.description ? (
                    <Text style={styles.cardDesc}>{s.description}</Text>
                  ) : null}

                  {/* ── 3-Column metadata grid: Starts / In / Attending ───
                      Matches web's grid-cols-3 gap-2.5 mt-5.
                      "Starts" shows tz label when available.
                      "In" is neon-colored.
                  ──────────────────────────────────────────────────────────── */}
                  <View style={styles.metaGrid}>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaBoxLabel}>Starts</Text>
                      <Text style={styles.metaBoxValue} numberOfLines={2}>
                        {startsValue}
                      </Text>
                    </View>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaBoxLabel}>In</Text>
                      <Text style={[styles.metaBoxValue, styles.metaBoxNeon]}>
                        {inText}
                      </Text>
                    </View>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaBoxLabel}>Attending</Text>
                      <View style={styles.metaBoxRow}>
                        <Ionicons
                          name="people-outline"
                          size={12}
                          color="rgba(255,255,255,0.45)"
                        />
                        <Text style={styles.metaBoxValue}>{attendees}</Text>
                      </View>
                    </View>
                  </View>

                  {/* ── Join button OR disabled span ──────────────────────
                      Web logic:
                        joinable = url && status !== "Ended"
                        joinable  → "Join Live Session" <ArrowUpRight>
                        !joinable → "Session Ended" | "Link Coming Soon"
                  ──────────────────────────────────────────────────────────── */}
                  {joinable ? (
                    <TouchableOpacity
                      style={styles.neonBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        Linking.openURL(url).catch(() => {});
                        recordJoin(s.session_id);
                      }}
                    >
                      <Text style={styles.neonBtnText}>Join Live Session</Text>
                      <Ionicons name="open-outline" size={16} color="#000" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.disabledBtn}>
                      <Text style={styles.disabledBtnText}>
                        {isEnded ? "Session Ended" : "Link Coming Soon"}
                      </Text>
                    </View>
                  )}

                </View>
              );
            })}
          </View>
        ))}

      </ScrollView>
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  scroll: {
    flex: 1,
    backgroundColor: "#000",
  },

  // padding: 20, gap: 24 between top-level sections — matches web's space-y-6 (24px)
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 24,
  },

  // Common section wrapper
  section: {
    gap: 12,
  },

  // ── Chip — matches web's .chip class ──────────────────────────────────────
  // border border-neon/25 bg-neon/5 px-2 py-0.5 rounded-full font-mono uppercase text-neon
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  // Chip opacity-80 when session is not live — matches web's `isLive ? "" : "opacity-80"`
  chipDim: {
    opacity: 0.8,
  },

  chipText: {
    color: NEON,
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ENDED override — text-white/50
  chipTextEnded: {
    color: "rgba(255,255,255,0.5)",
  },

  // SCHEDULED override — text-white/70
  chipTextScheduled: {
    color: "rgba(255,255,255,0.7)",
  },

  // Pulsing dot inside LIVE chip — w-1.5 h-1.5 rounded-full bg-neon
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NEON,
  },

  // ── Hero Header ───────────────────────────────────────────────────────────
  heroTitle: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 30,
    letterSpacing: -1,
    lineHeight: 38,
  },

  neonText: {
    color: NEON,
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: BODY.regular,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Next Session Card — glass-strong p-5 sm:p-7 relative overflow-hidden ──
  nextCard: {
    backgroundColor: GLASS_STRONG_BG,
    borderWidth: 1,
    borderColor: GLASS_STRONG_BDR,
    borderRadius: 16,
    padding: 20,
    overflow: "hidden",
  },

  // Decorative orb — -right-20 -top-20 w-64 h-64 rounded-full bg-neon/8 blur-3xl
  decorOrb: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(57,255,20,0.08)",
  },

  // font-display font-black text-2xl sm:text-3xl tracking-tighter
  nextCardTitle: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  // Meta row — flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-white/60
  nextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  metaText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: MONO.regular,
    fontSize: 11,
  },

  metaSep: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
  },

  metaAttendees: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // ── Neon Button — matches web's .neon-btn full-width on mobile ────────────
  neonBtn: {
    backgroundColor: NEON,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: NEON,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },

  neonBtnText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 14,
  },

  // ── Disabled Button — matches web's cursor-not-allowed span ───────────────
  // border border-white/15 text-white/40 font-mono uppercase tracking-[0.12em]
  disabledBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  disabledBtnText: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: MONO.regular,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },

  // ── Loading — mono uppercase text-white/50 ────────────────────────────────
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    paddingVertical: 40,
  },

  // ── Empty State — glass p-10 text-center ──────────────────────────────────
  emptyCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 18,
    textAlign: "center",
  },

  emptyBody: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },

  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NEON,
  },

  retryText: {
    color: NEON,
    fontFamily: BODY.regular,
    fontSize: 13,
  },

  // ── Date Header — font-mono 10px tracking-[0.2em] uppercase text-white/40 ─
  dateHeader: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Session Card — glass p-5 flex flex-col h-full ─────────────────────────
  sessionCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },

  // Row 1: status chip + importance label
  cardRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },

  // Importance label — importanceClass[imp.level] in web, color injected inline
  importanceLabel: {
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // font-display font-bold text-xl mt-3 break-words
  cardTitle: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 26,
  },

  // "with {mentor_name}" — font-mono text-[11px] text-white/45 mt-1
  mentorName: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: MONO.regular,
    fontSize: 11,
  },

  // Importance note — font-body text-white/55 text-sm mt-1
  cardNote: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 13,
  },

  // Description — text-white/65 font-body text-sm mt-3 break-words
  cardDesc: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: BODY.regular,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── 3-Column Metadata Grid — grid-cols-3 gap-2.5 mt-5 ────────────────────
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  // Each cell — p-3 rounded-md border border-white/10 bg-white/[0.02] min-h-[68px]
  metaBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    minHeight: 68,
    justifyContent: "space-between",
  },

  // Label — font-mono text-[9px] tracking-[0.2em] uppercase text-white/40
  metaBoxLabel: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: MONO.regular,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Value — font-mono text-sm text-white
  metaBoxValue: {
    color: "#fff",
    fontFamily: MONO.regular,
    fontSize: 13,
    marginTop: 4,
  },

  // "In" value is neon — text-neon
  metaBoxNeon: {
    color: NEON,
  },

  // Attending row (icon + number)
  metaBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
