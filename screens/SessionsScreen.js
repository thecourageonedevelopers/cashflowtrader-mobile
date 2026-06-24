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
import { sessionsApi } from "../src/api/sessions";
import { formatCountdown, formatDate } from "../src/utils/format";

// ─── Design tokens ────────────────────────────────────────────────────────────

const NEON                 = PRIMARY; // #39FF14
const GLASS_BG             = "rgba(255,255,255,0.03)";
const GLASS_BORDER         = "rgba(255,255,255,0.08)";
const GLASS_STRONG_BG      = "rgba(10,10,10,0.8)";
const GLASS_STRONG_BORDER  = "rgba(255,255,255,0.1)";

const IMPORTANCE_COLORS = {
  MUST:        NEON,                      // text-[#39FF14]
  RECOMMENDED: "rgba(255,255,255,0.8)",   // text-white/80
  OPTIONAL:    "rgba(255,255,255,0.5)",   // text-white/50
};

// ─── Helpers (ported 1-to-1 from web LiveSessions.jsx) ───────────────────────

function sessionStart(date, slot) {
  if (!date || !slot) return null;
  const m = slot.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const d = new Date(date + "T00:00:00");
  d.setHours(h, min, 0, 0);
  return d;
}

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

function isTestSession(s) {
  const blob = `${s.title || ""} ${s.description || ""}`.toLowerCase();
  return /\b(test|qa|sample|dummy|debug|lorem)\b/.test(blob);
}

function attendeeCountFor(id) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 42 + (h % 180);
}

// Strips "Starts in " / "Starts " prefix — matches web's countdown.replace()
// "Starts in 3h 30m" → "3h 30m"   "Starts tomorrow" → "tomorrow"   null → "Live now"
function inColumnText(countdown) {
  if (!countdown) return "Live now";
  return countdown.replace(/^Starts (in )?/, "");
}

// ─── PulsingDot (mirrors web's animate-pulse on the LIVE badge dot) ───────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SessionsScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  // Reactive clock — re-evaluates countdowns every 30s (matches web setInterval 30_000)
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

  const todayISO = now.toISOString().slice(0, 10);

  // Filter test/seeded rows — matches web's isTestSession filter
  const sessions = useMemo(
    () => (rawSessions ?? []).filter((s) => !isTestSession(s)),
    [rawSessions]
  );

  // Group by ISO date string, sorted — matches web's groupedByDate + dates
  const groupedByDate = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { (m[s.date] = m[s.date] || []).push(s); });
    return m;
  }, [sessions]);
  const dates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  // Earliest future session — matches web's nextSession useMemo
  const nextSession = useMemo(() => {
    return sessions
      .map((s) => ({ ...s, _start: sessionStart(s.date, s.time_slot) }))
      .filter((s) => s._start && s._start.getTime() > now.getTime())
      .sort((a, b) => a._start - b._start)[0] || null;
  }, [sessions, now]);

  const nextCountdown   = nextSession ? formatCountdown(nextSession._start) : null;
  const nextAttendees   = nextSession ? attendeeCountFor(nextSession.session_id) : 0;

  const handleJoin = useCallback((url) => {
    Linking.openURL(url || "https://meet.google.com/new").catch(() => {});
  }, []);

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

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          {/* Chip: Radio + "Live Sessions" */}
          <View style={styles.chip}>
            <Ionicons name="radio-outline" size={10} color={NEON} />
            <Text style={styles.chipText}>Live Sessions</Text>
          </View>

          {/* H1 — matches: "Never trade <neon>alone again.</neon>" */}
          <Text style={styles.heroTitle}>
            {"Never trade "}
            <Text style={styles.neonText}>{"alone again."}</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Live market analysis, trade discussions, and psychology.{" "}
            Stay connected to the process every single day.
          </Text>
        </View>

        {/* ── NEXT SESSION HIGHLIGHT (glass-strong) ───────────────────────── */}
        {nextSession && (
          <View style={[styles.section, styles.nextCard]}>
            {/* Decorative orb — matches web's absolute blur-3xl bg-[#39FF14]/[0.08] */}
            <View style={styles.decorOrb} pointerEvents="none" />

            {/* Chip: Zap + "Next Live · countdown" */}
            <View style={styles.chip}>
              <Ionicons name="flash-outline" size={10} color={NEON} />
              <Text style={styles.chipText}>
                {"Next Live · "}{nextCountdown || "Upcoming"}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.nextCardTitle}>{nextSession.title}</Text>

            {/* Meta row: Date · Time · Users attendees */}
            <View style={styles.nextMetaRow}>
              <Text style={styles.metaText}>
                {nextSession.date === todayISO ? "Today" : formatDate(nextSession.date)}
              </Text>
              <Text style={styles.metaSep}>{" · "}</Text>
              <Text style={styles.metaText}>{nextSession.time_slot}</Text>
              <Text style={styles.metaSep}>{" · "}</Text>
              <View style={styles.metaAttendees}>
                <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.metaText}>{nextAttendees} traders attending</Text>
              </View>
            </View>

            {/* "Join Live" neon button — full-width on mobile (web: w-full sm:w-auto) */}
            <TouchableOpacity
              style={styles.neonBtn}
              activeOpacity={0.85}
              onPress={() => handleJoin(nextSession.join_url)}
            >
              <Text style={styles.neonBtnText}>Join Live</Text>
              <Ionicons name="open-outline" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOADING — matches web's "Loading..." mono text ────────────── */}
        {isLoading && !rawSessions && (
          <Text style={styles.loadingText}>Loading...</Text>
        )}

        {/* ── ERROR (extra beyond web — kept for native UX) ───────────────── */}
        {isError && !rawSessions && !isLoading && (
          <View style={[styles.section, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>Couldn't load sessions.</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── EMPTY STATE — matches web copy exactly ──────────────────────── */}
        {!isLoading && dates.length === 0 && (
          <View style={[styles.section, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>No upcoming sessions yet.</Text>
            <Text style={styles.emptyBody}>
              New live sessions drop daily. Check back tomorrow at 5 PM.
            </Text>
          </View>
        )}

        {/* ── SESSIONS LIST (grouped by date) ─────────────────────────────── */}
        {!isLoading && dates.map((date) => (
          <View key={date} style={styles.section}>

            {/* Date header — matches web: "Today" or formatDate (DD MMM YYYY) */}
            <Text style={styles.dateHeader}>
              {date === todayISO ? "Today" : formatDate(date)}
            </Text>

            {/* Session cards */}
            {groupedByDate[date].map((s) => {
              const imp       = importanceFor(s.title);
              const start     = sessionStart(s.date, s.time_slot);
              const countdown = start ? formatCountdown(start) : null;
              const inText    = inColumnText(countdown);
              const attendees = attendeeCountFor(s.session_id);

              return (
                <View key={s.session_id} style={styles.sessionCard}>

                  {/* Row 1: [LIVE chip w/ pulsing dot] + [importance label] */}
                  <View style={styles.cardRow1}>
                    <View style={styles.chip}>
                      <PulsingDot />
                      <Text style={styles.chipText}>LIVE</Text>
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

                  {/* Row 2: Title */}
                  <Text style={styles.cardTitle}>{s.title}</Text>

                  {/* Row 3: Importance note */}
                  <Text style={styles.cardNote}>{imp.note}</Text>

                  {/* Row 4: Description (conditional) */}
                  {s.description ? (
                    <Text style={styles.cardDesc}>{s.description}</Text>
                  ) : null}

                  {/* Row 5: 3-Column metadata grid — Starts / In / Attending */}
                  <View style={styles.metaGrid}>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaBoxLabel}>Starts</Text>
                      <Text style={styles.metaBoxValue}>{s.time_slot}</Text>
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

                  {/* Row 6: "Join Live Session" neon button */}
                  <TouchableOpacity
                    style={styles.neonBtn}
                    activeOpacity={0.85}
                    onPress={() => handleJoin(s.join_url)}
                  >
                    <Text style={styles.neonBtnText}>Join Live Session</Text>
                    <Ionicons name="open-outline" size={16} color="#000" />
                  </TouchableOpacity>
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

  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 24, // space-y-6 = 24px between top-level sections
  },

  // Common section wrapper (matches web's space-y-6 children)
  section: {
    gap: 12,
  },

  // ── Chip (matches web's .chip class) ──────────────────────────────────────
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

  chipText: {
    color: NEON,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Pulsing dot inside LIVE chip (6px = w-1.5 h-1.5 in Tailwind)
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NEON,
  },

  // ── Hero Header ───────────────────────────────────────────────────────────
  heroTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 30,
    letterSpacing: -1,
    lineHeight: 38,
  },

  neonText: {
    color: NEON,
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Next Session Card (glass-strong) ──────────────────────────────────────
  nextCard: {
    backgroundColor: GLASS_STRONG_BG,
    borderWidth: 1,
    borderColor: GLASS_STRONG_BORDER,
    borderRadius: 16,
    padding: 20,
    overflow: "hidden",
  },

  // Decorative orb: absolute top-right (mirrors web's blur-3xl div)
  decorOrb: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(57,255,20,0.08)",
  },

  nextCardTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  nextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  metaText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
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

  // ── Neon Button (matches web's .neon-btn — full-width on mobile) ──────────
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
    fontFamily: "Inter_800ExtraBold",
    fontSize: 14,
  },

  // ── Loading State (matches web: mono uppercase "Loading...") ──────────────
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    paddingVertical: 40,
  },

  // ── Empty State (matches web .glass p-10 text-center) ─────────────────────
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
    fontFamily: "Inter_900Black",
    fontSize: 18,
    textAlign: "center",
  },

  emptyBody: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  // ── Date Header (matches web: mono 10px uppercase text-white/40) ──────────
  dateHeader: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Session Card (matches web .glass p-5 flex flex-col) ───────────────────
  sessionCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  // Row 1: LIVE badge + importance label
  cardRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },

  // Importance label — text only, no border (matches web: className={importanceClass[imp.level]})
  importanceLabel: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Row 2: Title
  cardTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 26,
  },

  // Row 3: Importance note
  cardNote: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  // Row 4: Description
  cardDesc: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  // Row 5: 3-Column Metadata Grid
  metaGrid: {
    flexDirection: "row",
    gap: 8,
  },

  metaBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    minHeight: 64,
    justifyContent: "space-between",
  },

  metaBoxLabel: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  metaBoxValue: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },

  metaBoxNeon: {
    color: NEON,
  },

  metaBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
});
