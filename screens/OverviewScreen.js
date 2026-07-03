import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import AmbientGlow from "../components/common/AmbientGlow";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import AvatarStudio from "../components/common/AvatarStudio";
import { PRIMARY, authBaseStyles } from "../components/auth/AuthStyles";
import { useAuth } from "../src/hooks/useAuth";
import { useMoney } from "../src/hooks/useMoney";
import { useAvatarUrl } from "../src/lib/avatar";
import { progressApi } from "../src/api/progress";
import { profileApi } from "../src/api/profile";
import { journalApi } from "../src/api/journal";
import { sessionsApi } from "../src/api/sessions";
import { transformationApi } from "../src/api/transformation";
import { useAlert } from "../src/context/AlertContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = [
  "01", "02", "03", "04", "05", "06", "07",
  "08", "09", "10", "11", "12", "13", "14",
  "15", "16", "17", "18", "19", "20", "21",
];

const GLOW_BORDER = "rgba(57,255,20,0.15)";
const GLOW_BG = "rgba(57,255,20,0.04)";
const HIGHLIGHT_TOP = "rgba(255,255,255,0.08)";

const DAY_LINES = {
  Monday: "Monday sets the tone for the whole week. Win it.",
  Tuesday: "Tuesday is where most traders quit. Don't be most traders.",
  Wednesday: "Wednesday tests your patience. Pass the test.",
  Thursday: "Thursday is when discipline pays compound interest.",
  Friday: "Friday closes the week. Protect your gains.",
  Saturday: "Markets rest. Your edge sharpens. Review.",
  Sunday: "Tomorrow opens fresh. Plan today.",
};

const MISSION_ICONS = {
  journal: "create-outline",
  lesson: "book-outline",
  live_session: "videocam-outline",
  risk_rule: "shield-checkmark-outline",
  no_revenge: "pulse-outline",
  daily_review: "checkmark-circle-outline",
};

const MISSION_NA_REASON = {
  lesson: "Challenge complete or locked",
  live_session: "No live session today",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pnlHint(n, period) {
  if (n > 0) return period === "week" ? "On track — protect the gain." : "Compounding. Stay disciplined.";
  if (n < 0) return period === "week" ? "Cut size. Review losers tonight." : "Step back. Rebuild the routine.";
  return period === "week" ? "Fresh week. Take one A+ setup." : "Fresh month. First trade sets the tone.";
}

function winRateHint(rate, trades) {
  if (!trades) return "Start trading. Start winning.";
  if (rate >= 60) return "Elite consistency. Hold the line.";
  if (rate >= 50) return "Solid. Eliminate B-grade setups.";
  if (rate >= 35) return "Too many low-quality entries. Filter.";
  return "Stop trading. Re-read your playbook.";
}

function disciplineHint(score) {
  if (score === 0) return "Begin your discipline streak today.";
  if (score >= 75) return "Strong — keep compounding.";
  if (score >= 50) return "Good. Journal one more rep daily.";
  if (score >= 30) return "Needs improvement: journal every trade.";
  return "Critical — rebuild your morning routine.";
}

function deriveFirstName(user) {
  const raw = (user?.name || "").trim();
  if (!raw) return "Trader";
  const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "sir", "madam", "prof"]);
  const parts = raw.split(/\s+/);
  const first = parts.find((p) => !HONORIFICS.has(p.replace(/\./g, "").toLowerCase()));
  return first || "Trader";
}

function deriveIdentity(user) {
  const ch = (user?.biggest_challenge || user?.persona || "").toLowerCase();
  if (ch.includes("discipline")) return "The Disciplined One";
  if (ch.includes("psychology") || ch.includes("mental")) return "The Patient Trader";
  if (ch.includes("consistency") || ch.includes("routine")) return "The Executor";
  if (ch.includes("strategy") || ch.includes("edge")) return "The Strategist";
  if (ch.includes("risk")) return "The Risk Manager";
  return "The Builder";
}

function identityTagline(identity) {
  const T = {
    "The Disciplined One": "Routine is your weapon. Every action a vote for the trader you're becoming.",
    "The Patient Trader": "The market pays patience in capital. Wait for your pitch.",
    "The Executor": "Plan in. Trigger pulled. No hesitation. No regret.",
    "The Strategist": "Edges are silent until proven. Test, refine, repeat.",
    "The Risk Manager": "Survive first. Thrive second. Risk is the only thing you control.",
    "The Builder": "You're not chasing wins — you're building a trader. Brick by brick.",
  };
  return T[identity] || T["The Builder"];
}

// Port from web: compute live/upcoming/ended for a session card
function parseSessionTime(dateStr, slot) {
  const m = (slot || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m || !dateStr) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, min, 0, 0);
  return d;
}

function sessionTiming(session, now) {
  const start = parseSessionTime(session.date, session.time_slot);
  if (!start) return { status: "upcoming", label: session.time_slot || "" };
  const end = new Date(start.getTime() + 90 * 60000);
  if (now >= start && now <= end) return { status: "live", label: "Live now" };
  if (now > end) return { status: "ended", label: "Ended" };
  const diff = Math.max(0, start - now);
  const h = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return { status: "upcoming", label: h > 0 ? `in ${h}h ${mins}m` : `in ${mins}m` };
}

// Port from web: contextual copy for each growth metric
function metricCopy(g) {
  if (g.current === 0) return "Your journey begins. Take today's first action.";
  const dir = g.current > g.previous ? "up" : g.current < g.previous ? "down" : "flat";
  const MAP = {
    discipline: { up: "Your consistency is becoming a habit.", flat: "One disciplined day at a time.", down: "Refocus — consistency beats intensity." },
    journal_consistency: { up: "You're logging more consistently than before.", flat: "Keep the journaling streak alive.", down: "Log your next trade to rebuild the habit." },
    risk_control: { up: "You're protecting capital better than before.", flat: "You're respecting your risk limits.", down: "Tighten up — protect your capital first." },
    emotional_control: { up: "Calmer entries. Fewer impulsive trades.", flat: "Steady mind, steady hands.", down: "Slow down. Breathe before the next entry." },
    patience: { up: "Patience is improving. Fewer impulsive trades.", flat: "Waiting for your pitch — no rush.", down: "Skip the B-grade setups this week." },
  };
  return (MAP[g.key] || MAP.discipline)[dir];
}

// Port from web: mission momentum hint
function calcMomentum(mission) {
  if (!mission?.tasks) return "";
  const appl = mission.tasks.filter((t) => t.applicable !== false);
  const applPoints = appl.reduce((s, t) => s + (t.points || 0), 0) || 1;
  const earned = appl.filter((t) => t.done).reduce((s, t) => s + (t.points || 0), 0);
  const undone = appl.filter((t) => !t.done).sort((a, b) => (b.points || 0) - (a.points || 0));
  if (undone.length === 0) return "Perfect day. Every action logged — this is who you're becoming.";
  if ((mission.score || 0) >= 90) return "Elite discipline today. Hold the standard.";
  let need = 0, sum = earned;
  for (const t of undone) {
    need += 1; sum += t.points || 0;
    if (Math.round((sum / applPoints) * 100) >= 90) break;
  }
  return `${need} more ${need === 1 ? "action" : "actions"} and today's score reaches 90+.`;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
// Ports the web SVG polyline sparkline (DashboardHome.jsx Sparkline component)
// to pure React Native using rotated Views as line segments.
// Web: SVG width=80 height=22, polyline stroke="#39FF14" strokeWidth="1.5",
//      last-point dot r=2.2 fill="#39FF14".
function Sparkline({ data }) {
  const raw = Array.isArray(data) && data.length > 1 ? data : null;
  const pts = raw ? raw.slice(-8) : null;

  const W = 80;
  const H = 22;
  const STROKE = 1.5;
  const DOT_R = 2.2;

  if (!pts) {
    // Flat single-point fallback — just a dot at the right
    return (
      <View style={{ width: W, height: H, flexShrink: 0, justifyContent: "center", alignItems: "flex-end" }}>
        <View style={{ width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, backgroundColor: PRIMARY }} />
      </View>
    );
  }

  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const flat = max === min;
  const range = flat ? 1 : max - min;
  const step = W / (pts.length - 1);

  // Mirror web: y = flat ? H/2 : H - ((v-min)/range) * (H-3) - 1.5
  const coords = pts.map((v, i) => ({
    x: i * step,
    y: flat ? H / 2 : H - ((v - min) / range) * (H - STROKE * 2) - STROKE,
  }));

  const last = coords[coords.length - 1];

  // Build line segments: each segment is a rotated View positioned at its midpoint.
  // RN rotates around the center of the View by default, so placing the View
  // with (left = cx - len/2, top = cy - STROKE/2) and rotating by angle°
  // correctly draws a line from point i to point i+1.
  const segs = coords.slice(0, -1).map(({ x: x1, y: y1 }, i) => {
    const { x: x2, y: y2 } = coords[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, len, angle };
  });

  return (
    <View style={{ width: W, height: H, flexShrink: 0 }}>
      {segs.map((seg, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: seg.cx - seg.len / 2,
            top: seg.cy - STROKE / 2,
            width: seg.len,
            height: STROKE,
            backgroundColor: "#39FF14",
            borderRadius: STROKE,
            transform: [{ rotate: `${seg.angle}deg` }],
          }}
        />
      ))}
      {/* Terminal dot — mirrors web <circle cx cy r="2.2" fill="#39FF14" /> */}
      <View
        style={{
          position: "absolute",
          left: last.x - DOT_R,
          top: last.y - DOT_R,
          width: DOT_R * 2,
          height: DOT_R * 2,
          borderRadius: DOT_R,
          backgroundColor: "#39FF14",
        }}
      />
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OverviewScreen({ navigation }) {
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isTablet = Platform.OS === "web" && width >= 768;

  const { user } = useAuth();
  const money = useMoney();

  // ─── State ───────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(null);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);

  // Resolves user.picture to a displayable URL (async token-auth for uploaded pics)
  const avatarUrl = useAvatarUrl(user?.picture);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ["transformationDashboard"],
    queryFn: () => transformationApi.dashboard().then((r) => r.data),
  });

  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => progressApi.get().then((r) => r.data),
  });

  const { data: goalProgress, refetch: refetchGoalProgress } = useQuery({
    queryKey: ["goalProgress"],
    queryFn: () => profileApi.getGoalProgress().then((r) => r.data),
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analyticsDashboard"],
    queryFn: () => journalApi.analyticsDashboard().then((r) => r.data),
  });

  const { data: pending, refetch: refetchPending } = useQuery({
    queryKey: ["pending"],
    queryFn: () => journalApi.pending().then((r) => r.data),
  });

  const { data: journals, refetch: refetchJournals } = useQuery({
    queryKey: ["journals"],
    queryFn: () => journalApi.list().then((r) => r.data),
  });

  // ─── Timer (session live/upcoming/ended) ─────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // ─── Animation ───────────────────────────────────────────────────────────
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;
  const pulseLoopRef = useRef(null);

  useEffect(() => {
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
    return () => pulseLoopRef.current?.stop();
  }, []);

  // Day-pip pulse — matches web `animate-pulse 2s` (opacity 1→0.5→1 infinite)
  const dayPipPulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dayPipPulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(dayPipPulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dayPipPulseAnim]);

  useEffect(() => {
    if (!progressLoading && !dashboardLoading && !ready) {
      pulseLoopRef.current?.stop();
      setReady(true);
      Animated.timing(contentOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    }
  }, [progressLoading, dashboardLoading, ready]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const toggleMission = useCallback(async (task, done) => {
    if (busy) return;
    setBusy(task);
    try {
      await transformationApi.toggleMission(task, done);
      await refetchDashboard();
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not update mission." });
    } finally {
      setBusy(null);
    }
  }, [busy, refetchDashboard]);

  const joinSession = useCallback(async (session) => {
    try {
      const { data } = await sessionsApi.join(session.session_id);
      showAlert({ type: "success", title: "Joined", message: "Attendance logged. Mission updated." });
      await refetchDashboard();
      if (data?.join_url) Linking.openURL(data.join_url);
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not join session." });
    }
  }, [refetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDashboard(), refetchProgress(), refetchGoalProgress(),
      refetchAnalytics(), refetchPending(), refetchJournals(),
    ]);
    setRefreshing(false);
  }, [refetchDashboard, refetchProgress, refetchGoalProgress, refetchAnalytics, refetchPending, refetchJournals]);

  // ─── Derived values ───────────────────────────────────────────────────────

  // Transformation dashboard sections (null-safe)
  const dbIdentity = dashboard?.identity;
  const dbTransform = dashboard?.transformation;
  const dbMission = dashboard?.mission;
  const dbDiscipline = dashboard?.discipline_score;
  const dbGrowth = dashboard?.growth ?? [];
  const dbStrength = dashboard?.biggest_strength;
  const dbGrowthArea = dashboard?.growth_area;
  const dbPoi = dashboard?.proof_of_improvement;
  const dbSessions = dashboard?.live_sessions ?? [];

  // Identity — backend preferred, local fallback
  const firstName = deriveFirstName(user);
  const identityType = dbIdentity?.archetype ?? deriveIdentity(user);
  const identityQuote = dbIdentity?.quote ?? identityTagline(identityType);
  const currentStreak = dbIdentity?.streak ?? progress?.current_streak ?? 0;
  const disciplineToday = dbDiscipline?.today ?? progress?.personal_progress_score ?? 0;
  const avatarInitial = (user?.name || "T").trim().charAt(0).toUpperCase();

  // Challenge (transformation preferred)
  const completedDaysSet = useMemo(() => {
    const days = dbTransform?.completed_days;
    if (days?.length) return new Set(days.map((d) => String(d).padStart(2, "0")));
    return new Set();
  }, [dbTransform]);
  const completedCount = completedDaysSet.size;
  const challengePct = dbTransform?.challenge_pct ?? progress?.challenge_completion_percent ?? 0;
  const challengeDay = dbTransform?.current_day ?? 1;
  const challengeTotal = dbTransform?.total_days ?? 21;
  const challengeStrongerPct = dbTransform?.stronger_pct ?? 0;
  const challengeStage = dbTransform?.stage;

  // Performance (secondary)
  const weeklyPnL = goalProgress?.weekly?.net_pnl ?? 0;
  const monthlyPnL = goalProgress?.monthly?.net_pnl ?? 0;
  const weeklyWinRate = goalProgress?.weekly?.win_rate ?? 0;
  const monthlyWinRate = goalProgress?.monthly?.win_rate ?? 0;
  const totalTrades = analytics?.total_trades ?? 0;

  // Performance · Report Card — exact web mapping (analytics first, goalProgress fallback)
  const perfNetPnL = analytics?.net_pnl ?? goalProgress?.monthly?.net_pnl ?? 0;
  const perfWinRate = analytics?.win_rate ?? 0;
  const pendingCount = Array.isArray(pending) ? pending.length : 0;

  // Date
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = String(today.getDate()).padStart(2, "0");
  const monthShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][today.getMonth()];
  const heroDate = `${dayOfWeek.toUpperCase()} • ${dayNum} ${monthShort}`;
  const heroSubtitle = DAY_LINES[dayOfWeek] || "Today is the only day that matters.";

  // Journals this week
  const journalsThisWeek = useMemo(() => {
    if (!journals?.length) return 0;
    const cutoff = new Date(todayISO + "T00:00:00");
    cutoff.setDate(cutoff.getDate() - 6);
    return journals.filter((j) => {
      const d = (j.date || j.created_at || "").slice(0, 10);
      return d && new Date(d + "T00:00:00") >= cutoff;
    }).length;
  }, [journals, todayISO]);

  // Monthly goal
  const monthlyTarget = Number(user?.monthly_pnl_target) || 0;
  const goalPct = monthlyTarget > 0
    ? Math.max(0, Math.min(100, Math.round((monthlyPnL / monthlyTarget) * 100))) : 0;
  const goalPctStr = monthlyTarget > 0 ? `${goalPct}%` : "—";
  const goalValueStr = monthlyTarget > 0
    ? `${money(monthlyPnL, { showSign: true })} of ${money(monthlyTarget)}`
    : `${money(monthlyPnL, { showSign: true })} earned`;

  const poiIsNew = !dbPoi || dbPoi.state === "new";
  const missionMomentum = useMemo(() => calcMomentum(dbMission), [dbMission]);

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Animated.View style={[authBaseStyles.logoBox, styles.loadingLogo, { opacity: pulseOpacity }]}>
          <Text style={authBaseStyles.logoLetter}>C</Text>
        </Animated.View>
        <Text style={styles.loadingBrand}>Cashflow <Text style={{ color: PRIMARY }}>Trader</Text></Text>
        <Text style={styles.loadingTagline}>Preparing your dashboard…</Text>
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
      <ScreenLayout screenName="OverviewScreen" navigation={navigation}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
        >

          {/* ══════════════════════════════════════════════════════════════
              MOBILE HERO  (mobile-specific greeting, not in web)
          ══════════════════════════════════════════════════════════════ */}
          <View style={styles.heroWrap}>
            <View style={styles.heroCard}>
              <Text style={styles.heroDate}>{heroDate}</Text>
              <Text style={styles.heroGreet}>Welcome back,</Text>
              <Text style={styles.heroName}>{dbIdentity?.name || user?.name || "Trader"}.</Text>
              <Text style={styles.heroSub}>{heroSubtitle}</Text>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroPrimary} onPress={() => navigation.navigate("ChallengeScreen")}>
                  <Ionicons name="calendar-outline" size={16} color="#000" />
                  <Text style={styles.heroPrimaryText}>Start 21-Day Challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroSecondary} onPress={() => navigation.navigate("JournalScreen")}>
                  <Ionicons name="scan-outline" size={16} color="#fff" />
                  <Text style={styles.heroSecondaryText}>Auto Journal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════
              ROW 1a — TRADER IDENTITY
              Web: TraderIdentity [col-span-5], chip + avatar + name/archetype + quote + 2 stats
          ══════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            {/* Web: absolute -top-20 -right-16 w-72 h-72 bg-[#39FF14]/0.10 blur-3xl */}
            <AmbientGlow position="topRight" size={260} opacity={0.10} />
            {/* Chip */}
            <View style={styles.chip}>
              <Ionicons
                name="trophy-outline"
                size={11}
                color="rgba(57,255,20,0.8)"
              />
              <Text style={styles.chipText}>Trader Identity</Text>
            </View>

            {/* Avatar + Name/Archetype — flex row matching web */}
            <View style={styles.identityAvatarRow}>
              {/*
                Mirrors web TraderIdentity avatar button:
                  - Shows profile picture if user.picture is set (resolved via useAvatarUrl)
                  - Falls back to initial letter
                  - Tap opens AvatarStudio (same as web onClick → setStudioOpen(true))
                  - Camera icon overlay on press-in (web uses group-hover:opacity-100)
              */}
              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={() => setStudioOpen(true)}
                activeOpacity={0.85}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarLetter}>{avatarInitial}</Text>
                )}
                {/* Camera overlay — always present, semi-transparent; matches web Camera icon overlay */}
                <View style={styles.avatarOverlay}>
                  <Ionicons name="camera-outline" size={18} color={PRIMARY} />
                </View>
              </TouchableOpacity>
              <View style={styles.identityNameBlock}>
                <Text style={styles.identityName} numberOfLines={1}>{user?.name || "Trader"}</Text>
                <View style={styles.archetypeBadge}>
                  <Ionicons name="sparkles-outline" size={11} color={PRIMARY} />
                  <Text style={styles.archetypeBadgeText}>{identityType.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* Quote — italic, green left-border (matches web border-l-2) */}
            <Text style={styles.identityQuote}>"{identityQuote}"</Text>

            {/* 2-col mini stats — streak + discipline (matches web grid-cols-2) */}
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStatBox}>
                <View style={styles.miniStatLabelRow}>
                  <Ionicons name="flame-outline" size={11} color={PRIMARY} />
                  <Text style={styles.miniStatLabelText}>Streak</Text>
                </View>
                <Text style={styles.miniStatValue}>
                  {currentStreak}
                  <Text style={styles.miniStatUnit}>{currentStreak === 1 ? " day" : " days"}</Text>
                </Text>
              </View>
              <View style={styles.miniStatBox}>
                <View style={styles.miniStatLabelRow}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={PRIMARY} />
                  <Text style={styles.miniStatLabelText}>Discipline</Text>
                </View>
                <Text style={styles.miniStatValue}>
                  {disciplineToday}<Text style={styles.miniStatUnit}>/100</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════
              ROW 1b — PROOF OF IMPROVEMENT
              Web: ProofOfImprovement [col-span-7], special green-border card
          ══════════════════════════════════════════════════════════════ */}
          {dashboard && (
            <View style={styles.poiCard}>
              {/* Web: inset-0 bg-gradient-to-br from-[#39FF14]/0.10 */}
              <AmbientGlow position="topLeft" size={300} opacity={0.08} />
              {/* Web: absolute -bottom-24 -right-10 w-96 h-96 bg-[#39FF14]/0.15 blur-3xl */}
              <AmbientGlow position="bottomRight" size={320} opacity={0.13} />
              {/* Header */}
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <View style={styles.chip}>
                  <Ionicons name="trophy-outline" size={11} color="rgba(57,255,20,0.8)" />
                  <Text style={styles.chipText}>Proof Of Improvement</Text>
                </View>
                {!poiIsNew && dbPoi?.state && (
                  <View style={[
                    styles.poiStateBadge,
                    dbPoi.state === "improving" && { borderColor: "rgba(57,255,20,0.4)", backgroundColor: "rgba(57,255,20,0.08)" },
                    dbPoi.state === "slowed" && { borderColor: "rgba(251,191,36,0.4)", backgroundColor: "rgba(251,191,36,0.08)" },
                  ]}>
                    <Text style={[
                      styles.poiStateBadgeText,
                      dbPoi.state === "improving" && { color: PRIMARY },
                      dbPoi.state === "slowed" && { color: "#fbbf24" },
                    ]}>
                      {dbPoi.state === "improving" ? "Momentum ↑" : dbPoi.state === "slowed" ? "Refocus" : "Steady"}
                    </Text>
                  </View>
                )}
              </View>

              {poiIsNew ? (
                <>
                  <Text style={styles.poiNewHeadline}>
                    Your transformation{"\n"}<Text style={{ color: PRIMARY }}>starts today.</Text>
                  </Text>
                  <Text style={styles.poiMessage}>{dbPoi?.message || "Complete your first mission to begin tracking your progress."}</Text>
                </>
              ) : (
                <>
                  <View style={styles.poiScoreRow}>
                    <View>
                      <Text style={styles.poiSmallLabel}>{(dbPoi?.days_tracked ?? 0) > 30 ? "30 DAYS AGO" : "DAY 1"}</Text>
                      <Text style={styles.poiBaselineNum}>{dbPoi?.baseline ?? 0}</Text>
                    </View>
                    <Ionicons name="arrow-up-circle-outline" size={36} color={PRIMARY} />
                    <View>
                      <Text style={[styles.poiSmallLabel, { color: PRIMARY }]}>TODAY</Text>
                      <Text style={styles.poiCurrentNum}>{dbPoi?.current ?? 0}</Text>
                    </View>
                    {(dbPoi?.improvement_pct ?? 0) > 0 && (
                      <View style={styles.poiDeltaBadge}>
                        <Text style={styles.poiDeltaText}>
                          {dbPoi.from_zero ? `+${dbPoi.improvement_pct}` : `+${dbPoi.improvement_pct}%`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.poiMessageLarge}>{dbPoi?.message}</Text>
                </>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 2a — TRANSFORMATION PROGRESS  (web: col-span-7)
              Day X/21, pct, stage badge, progress bar, day pips, stage milestones
          ══════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            {/* Header: chip + "Open →" link */}
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <View style={styles.chip}>
                <Ionicons name="rocket-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Transformation Progress</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("ChallengeScreen")} style={styles.openLink}>
                <Text style={styles.openLinkText}>Open</Text>
                <Ionicons name="arrow-forward" size={12} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Day headline */}
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.challengeDayHeadline}>
                  Day {challengeDay} <Text style={styles.challengeDayOf}>/ {challengeTotal}</Text>
                </Text>
                <Text style={styles.challengeMeta}>
                  {Math.round(challengePct)}% Completed · {completedCount} days conquered
                </Text>
                {challengeStage?.current && (
                  <View style={[styles.chip, { marginTop: 8, marginBottom: 0 }]}>
                    <Ionicons name="sparkles-outline" size={11} color="rgba(57,255,20,0.8)" />
                    <Text style={styles.chipText}>{challengeStage.current}</Text>
                  </View>
                )}
              </View>
              {challengeStrongerPct > 0 && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.strongerPct}>+{challengeStrongerPct}%</Text>
                  <Text style={styles.strongerLabel}>STRONGER THAN{"\n"}DAY 1</Text>
                </View>
              )}
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(challengePct)}%` }]} />
            </View>

            {/* Day pips grid (21 squares, matching web grid-cols-7 sm:grid-cols-21) */}
            <View style={styles.daysGrid}>
              {DAYS.map((day) => {
                // Web: done = day <= t.completed_days (numeric comparison)
                const done = parseInt(day, 10) <= (dbTransform?.completed_days ?? 0);
                const current = parseInt(day, 10) === challengeDay;
                if (current && !done) {
                  // animate-pulse: opacity 1→0.5→1 over 2s (matches web CSS animate-pulse)
                  return (
                    <Animated.View
                      key={day}
                      style={[styles.dayPip, styles.dayPipCurrent, { opacity: dayPipPulseAnim }]}
                    >
                      <Text style={[styles.dayPipText, styles.dayPipTextCurrent]}>{day}</Text>
                    </Animated.View>
                  );
                }
                return (
                  <View key={day} style={[styles.dayPip, done && styles.dayPipDone]}>
                    <Text style={[styles.dayPipText, done && styles.dayPipTextDone]}>{day}</Text>
                  </View>
                );
              })}
            </View>

            {/* Emotional stage milestones (matches web grid-cols-2 sm:grid-cols-4) */}
            {challengeStage?.stages?.length > 0 && (
              <View style={styles.stagesGrid}>
                {challengeStage.stages.map((s) => (
                  <View key={s.label} style={[
                    styles.stageBox,
                    s.active && styles.stageBoxActive,
                    s.done && !s.active && styles.stageBoxDone,
                  ]}>
                    <Text style={[styles.stageDayRange, s.active && { color: PRIMARY }]}>
                      Day {s.from}–{s.to}
                    </Text>
                    <Text style={[styles.stageLabel,
                    s.active && { color: "#fff" },
                    s.done && !s.active && { color: "rgba(255,255,255,0.7)" },
                    ]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════════════════════════════
              ROW 2b — TODAY'S MISSION  (web: col-span-5)
              Task list with toggle, momentum hint, progress bar
          ══════════════════════════════════════════════════════════════ */}
          {dbMission?.tasks?.length > 0 && (
            <View style={styles.card}>
              {/* Header: chip + count/pct */}
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <View style={styles.chip}>
                  <Ionicons name="flag-outline" size={11} color="rgba(57,255,20,0.8)" />
                  <Text style={styles.chipText}>Today's Mission</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.missionCount}>{dbMission.completed_count}/{dbMission.total_count}</Text>
                  <Text style={styles.missionPct}>{dbMission.completion_pct}% complete</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrackThin}>
                <View style={[styles.progressFill, { width: `${dbMission.completion_pct ?? 0}%` }]} />
              </View>

              {/* Momentum hint (green box, matches web p-2.5 rounded-lg bg/border) */}
              {!!missionMomentum && (
                <View style={styles.missionMomentumBox}>
                  <Text style={styles.missionMomentumText}>{missionMomentum}</Text>
                </View>
              )}

              {/* Task list */}
              <View style={styles.taskList}>
                {dbMission.tasks.map((task) => {
                  const na = task.applicable === false;
                  const clickable = !task.auto && !na;
                  const icon = MISSION_ICONS[task.key] || "ellipse-outline";
                  return (
                    <TouchableOpacity
                      key={task.key}
                      disabled={!clickable || busy === task.key}
                      onPress={() => clickable && toggleMission(task.key, !task.done)}
                      activeOpacity={0.75}
                      style={[
                        styles.taskRow,
                        na && styles.taskRowNa,
                        task.done && !na && styles.taskRowDone,
                      ]}
                    >
                      {/* Checkbox */}
                      <View style={[styles.taskCheck, task.done && !na && styles.taskCheckDone, na && styles.taskCheckNa]}>
                        {na
                          ? <Ionicons name="remove-outline" size={13} color="#555" />
                          : task.done
                            ? <Ionicons name="checkmark" size={13} color="#000" />
                            : null}
                      </View>
                      {/* Icon */}
                      <Ionicons name={icon} size={15} color={task.done && !na ? PRIMARY : "#666"} style={styles.taskIcon} />
                      {/* Label */}
                      <Text style={[styles.taskLabel, task.done && !na && { color: "#fff" }, na && { color: "#555" }]} numberOfLines={1}>
                        {task.label}
                      </Text>
                      {/* Right badge */}
                      {na ? (
                        <Text style={styles.taskBadge}>{MISSION_NA_REASON[task.key] || "N/A"}</Text>
                      ) : task.auto ? (
                        <View style={styles.taskAutoBadge}>
                          <Ionicons name="lock-closed-outline" size={9} color="#555" />
                          <Text style={styles.taskAutoText}>Auto</Text>
                        </View>
                      ) : (
                        <Text style={styles.taskPoints}>+{task.points}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.missionFooter}>
                Journal, lesson &amp; live sessions auto-detect. Self-report the rest.
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 3a — DISCIPLINE SCORE  (web: col-span-4)
              Big neon number, "out of 100", phase badge, weekly/monthly averages
          ══════════════════════════════════════════════════════════════ */}
          {dbDiscipline && (
            <View style={styles.card}>
              <View style={styles.chip}>
                <Ionicons name="shield-checkmark-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Discipline Score</Text>
              </View>

              {/* Centered big number (matches web flex-1 flex-col items-center justify-center) */}
              <View style={styles.disciplineCenter}>
                <Text style={styles.disciplineBigNum}>{dbDiscipline.today}</Text>
                <Text style={styles.disciplineOutOf}>out of 100 today</Text>
                {dbDiscipline.phase && (
                  <View style={styles.disciplinePhaseBadge}>
                    <Text style={styles.disciplinePhaseText}>{dbDiscipline.phase}</Text>
                  </View>
                )}
              </View>

              {/* 2-col averages (matches web grid-cols-2) */}
              <View style={styles.disciplineAvgRow}>
                <View style={styles.disciplineAvgBox}>
                  <Text style={styles.disciplineAvgNum}>{dbDiscipline.weekly_avg ?? "—"}</Text>
                  <Text style={styles.disciplineAvgLabel}>Weekly avg</Text>
                </View>
                <View style={styles.disciplineAvgBox}>
                  <Text style={styles.disciplineAvgNum}>{dbDiscipline.monthly_avg ?? "—"}</Text>
                  <Text style={styles.disciplineAvgLabel}>30-day avg</Text>
                </View>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 3b — GROWTH METRICS  (web: col-span-8)
              2-col grid of 5 metric cards with prev→current + bar + copy
          ══════════════════════════════════════════════════════════════ */}
          {dbGrowth.length > 0 && (
            <View style={styles.card}>
              <View style={styles.chip}>
                <Ionicons name="trending-up-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Growth Metrics · Day 1 → Today</Text>
              </View>

              <View style={styles.growthGrid}>
                {dbGrowth.map((g) => {
                  const improved = g.current > g.previous;
                  const changed = g.current !== g.previous;
                  return (
                    <View key={g.key} style={styles.growthMetricCard}>
                      {/* Label — matches web font-mono text-[10px] tracking-[0.18em] uppercase text-white/55 */}
                      <Text style={styles.growthMetricLabel}>{g.label || g.key}</Text>

                      {/* Score row: prev → arrow → cur  (matches web flex items-end gap-2 mt-2) */}
                      <View style={styles.growthScoreRow}>
                        <Text style={styles.growthPrev}>{g.previous}</Text>
                        <Ionicons
                          name={changed ? (improved ? "arrow-up-outline" : "arrow-down-outline") : "remove-outline"}
                          size={16}
                          color={changed ? (improved ? PRIMARY : "#f87171") : "#444"}
                          style={{ marginHorizontal: 3, marginBottom: 2 }}
                        />
                        <Text style={styles.growthCur}>{g.current}</Text>
                      </View>

                      {/* Bar + Sparkline row (matches web flex items-center gap-2 mt-2.5) */}
                      <View style={styles.growthBarRow}>
                        <View style={styles.growthTrack}>
                          <View style={[styles.progressFill, { width: `${Math.min(100, g.current)}%` }]} />
                        </View>
                        <Sparkline data={g.trend} />
                      </View>

                      {/* Copy + improvement pct (matches web flex items-center justify-between mt-2) */}
                      <View style={styles.growthCopyRow}>
                        <Text style={styles.growthCopy}>{metricCopy(g)}</Text>
                        {improved && (
                          <Text style={styles.growthPct}>
                            {g.from_zero ? `+${g.improvement_pct}` : `+${g.improvement_pct}%`}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 4a — BIGGEST STRENGTH  (web: md:col-span-1, green-glow border)
          ══════════════════════════════════════════════════════════════ */}
          {dbStrength?.label && (
            <View style={styles.strengthCard}>
              {/* Web: absolute -top-16 -right-10 w-60 h-60 bg-[#39FF14]/0.15 blur-3xl */}
              <AmbientGlow position="topRight" size={240} opacity={0.14} />
              <View style={styles.chip}>
                <Ionicons name="trophy-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Biggest Strength</Text>
              </View>
              <Text style={styles.strengthLabel}>{dbStrength.label}</Text>
              <View style={styles.row}>
                <Text style={styles.strengthScore}>
                  {dbStrength.value}<Text style={styles.strengthScoreUnit}>/100</Text>
                </Text>
                {dbStrength.improved && (
                  <View style={styles.improvedBadge}>
                    <Ionicons name="trending-up-outline" size={11} color={PRIMARY} />
                    <Text style={styles.improvedBadgeText}>Up vs Day 1</Text>
                  </View>
                )}
              </View>
              <Text style={styles.strengthMsg}>{dbStrength.message}</Text>
              {dbStrength.logged_trades > 0 && (
                <Text style={styles.strengthTrades}>
                  {dbStrength.logged_trades} trade{dbStrength.logged_trades === 1 ? "" : "s"} logged and counting. Keep building the habit.
                </Text>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 4b — CURRENT GROWTH AREA  (web: md:col-span-1, glass-strong)
          ══════════════════════════════════════════════════════════════ */}
          {dbGrowthArea?.label && (
            <View style={styles.card}>
              <View style={styles.chip}>
                <Ionicons name="sparkles-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Current Growth Area</Text>
              </View>
              <Text style={styles.growthAreaLabel}>{dbGrowthArea.label}</Text>
              <Text style={styles.growthAreaScore}>
                {dbGrowthArea.value}<Text style={styles.growthAreaScoreUnit}>/100</Text>
              </Text>
              <Text style={styles.growthAreaMsg}>{dbGrowthArea.message}</Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 5 — LIVE SUPPORT  (web: full-width, View not Link)
              Sessions with timing status (live/upcoming/ended) + join button
          ══════════════════════════════════════════════════════════════ */}
          <View style={styles.card}>
            {/* Header: chip + subtitle + "All sessions →" link */}
            <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={[styles.chip, { marginBottom: 6 }]}>
                  <Ionicons name="radio-outline" size={11} color="rgba(57,255,20,0.8)" />
                  <Text style={styles.chipText}>Live Support · Today</Text>
                </View>
                <Text style={styles.liveSubtitle}>Need guidance? You're not trading alone.</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("SessionsScreen")} style={styles.openLink}>
                <Text style={styles.openLinkText}>All sessions</Text>
                <Ionicons name="arrow-forward" size={12} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            {dbSessions.length === 0 ? (
              <View style={styles.liveEmpty}>
                <Text style={styles.liveEmptyText}>
                  No live sessions scheduled for today. Your mentors return tomorrow — review your journal in the meantime.
                </Text>
              </View>
            ) : (
              dbSessions.map((s) => {
                const timing = sessionTiming(s, now);
                const isLive = timing.status === "live";
                const ended = timing.status === "ended";
                return (
                  <View key={s.session_id} style={[styles.sessionCard, isLive && styles.sessionCardLive]}>
                    {/* Time slot + timing badge */}
                    <View style={styles.row}>
                      <Text style={styles.sessionTimeSlot}>{s.time_slot}</Text>
                      <View style={styles.row}>
                        {isLive && <View style={styles.livePulseDot} />}
                        <Text style={[styles.sessionTimingLabel, isLive && { color: PRIMARY }, ended && { color: "#444" }]}>
                          {timing.label}
                        </Text>
                      </View>
                    </View>
                    {/* Title + description */}
                    <Text style={styles.sessionTitle}>{s.title}</Text>
                    {s.description ? (
                      <Text style={styles.sessionDesc} numberOfLines={2}>{s.description}</Text>
                    ) : null}
                    {/* Join button (matching web neon-btn / outlined styles) */}
                    <TouchableOpacity
                      onPress={() => !ended && joinSession(s)}
                      disabled={ended}
                      style={[styles.joinBtn, isLive && styles.joinBtnLive, ended && styles.joinBtnEnded]}
                    >
                      <Ionicons name="videocam-outline" size={14} color={ended ? "#444" : isLive ? "#000" : "#fff"} />
                      <Text style={[styles.joinBtnText, isLive && { color: "#000" }, ended && { color: "#444" }]}>
                        {ended ? "Ended" : isLive ? "Join Now" : "Join"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* ══════════════════════════════════════════════════════════════
              ROW 6 — PERFORMANCE ANALYTICS  (web: opacity-70, secondary)
              "Keep your eyes above this line."
              Net P&L / Win Rate / Trades + mobile extras (goal, weekly, records)
          ══════════════════════════════════════════════════════════════ */}
          <View style={styles.perfSection}>
            {/* Header: chip + "Full analytics →" link */}
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <View style={styles.chip}>
                <Ionicons name="document-text-outline" size={11} color="rgba(57,255,20,0.8)" />
                <Text style={styles.chipText}>Performance · Report Card</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("JournalScreen")} style={styles.openLink}>
                <Text style={styles.perfLink}>Full analytics</Text>
                <Ionicons name="arrow-forward" size={12} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* 3 main stats — one per row, matching web PerfStat (analytics data source) */}
            <View style={styles.perfStats}>
              <View style={styles.perfStatCell}>
                <Text
                  style={[styles.perfStatValue, { color: perfNetPnL >= 0 ? PRIMARY : "#f87171" }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.5}
                >
                  {money(perfNetPnL, { showSign: true })}
                </Text>
                <Text style={styles.perfStatLabel}>Net P&L</Text>
              </View>
              <View style={styles.perfStatCell}>
                <Text style={styles.perfStatValue} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.5}>{perfWinRate}%</Text>
                <Text style={styles.perfStatLabel}>Win Rate</Text>
              </View>
              <View style={styles.perfStatCell}>
                <Text style={styles.perfStatValue} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.5}>{totalTrades}</Text>
                <Text style={styles.perfStatLabel}>Trades Logged</Text>
              </View>
            </View>

            {/* Footer copy */}
            <Text style={styles.perfFooter}>
              Profit is the outcome. Discipline is the cause. Keep your eyes above this line.
            </Text>

            {/* Monthly goal */}
            {/* <View style={styles.perfGoalCard}>
              <View style={styles.row}>
                <Text style={styles.perfExtraLabel}>YOUR MONTHLY GOAL</Text>
                <Text style={styles.perfGoalPct}>{goalPctStr}</Text>
              </View>
              <Text style={styles.perfGoalValue}>{goalValueStr}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${goalPct}%`, opacity: 0.6 }]} />
              </View>
            </View> */}

            {/* Weekly / Monthly PnL breakdown */}
            {/* <View style={styles.perfMiniGrid}>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>THIS WEEK</Text>
                <Text style={[styles.perfMiniValue, { color: weeklyPnL >= 0 ? PRIMARY : "#ff6b6b" }]}>
                  {money(weeklyPnL, { showSign: true })}
                </Text>
                <Text style={styles.perfMiniSub}>{Math.round(weeklyWinRate)}% win rate</Text>
                <Text style={styles.perfMiniHint}>{pnlHint(weeklyPnL, "week")}</Text>
              </View>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>THIS MONTH</Text>
                <Text style={[styles.perfMiniValue, { color: monthlyPnL >= 0 ? PRIMARY : "#ff6b6b" }]}>
                  {money(monthlyPnL, { showSign: true })}
                </Text>
                <Text style={styles.perfMiniSub}>{Math.round(monthlyWinRate)}% win rate</Text>
                <Text style={styles.perfMiniHint}>{pnlHint(monthlyPnL, "month")}</Text>
              </View>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>WIN RATE · 30D</Text>
                <Text style={[styles.perfMiniValue, {
                  color: !totalTrades || monthlyWinRate >= 50 ? PRIMARY : monthlyWinRate >= 35 ? "#f59e0b" : "#ff6b6b"
                }]}>
                  {Math.round(monthlyWinRate)}%
                </Text>
                <Text style={styles.perfMiniSub}>{totalTrades} trades</Text>
                <Text style={styles.perfMiniHint}>{winRateHint(monthlyWinRate, totalTrades)}</Text>
              </View>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>DISCIPLINE</Text>
                <Text style={[styles.perfMiniValue, {
                  color: disciplineToday >= 50 ? PRIMARY : disciplineToday >= 30 ? "#f59e0b" : "#ff6b6b"
                }]}>
                  {disciplineToday}<Text style={{ fontSize: 11, color: "#555" }}>/100</Text>
                </Text>
                <Text style={styles.perfMiniSub}>{currentStreak} day streak</Text>
                <Text style={styles.perfMiniHint}>{disciplineHint(disciplineToday)}</Text>
              </View>
            </View> */}

            {/* Records */}
            {/* <View style={styles.perfMiniGrid}>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>WEEKLY RECORDS</Text>
                <Text style={styles.perfMiniValue}>
                  {journalsThisWeek > 0
                    ? `${journalsThisWeek} journal${journalsThisWeek === 1 ? "" : "s"}`
                    : "0 journals"}
                </Text>
                <Text style={styles.perfMiniSub}>this week</Text>
              </View>
              <View style={styles.perfMiniCard}>
                <Text style={styles.perfExtraLabel}>CURRENT POSITION</Text>
                <Text style={styles.perfMiniValue}>
                  {pendingCount > 0 ? `${pendingCount} open` : "No open trades"}
                </Text>
                <Text style={styles.perfMiniSub}>{pendingCount > 0 ? "trades in progress" : "flat"}</Text>
              </View>
            </View> */}
          </View>

        </ScrollView>
      </ScreenLayout>

      {/* AvatarStudio modal — rendered outside ScrollView so it overlays everything */}
      <AvatarStudio
        visible={studioOpen}
        onClose={() => setStudioOpen(false)}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // Loading
  loadingContainer: { flex: 1, backgroundColor: "#050505", justifyContent: "center", alignItems: "center" },
  loadingLogo: { width: 56, height: 56, borderRadius: 14, marginBottom: 20 },
  loadingBrand: { color: "#fff", fontSize: 22, fontFamily: DISPLAY.bold, marginBottom: 10 },
  loadingTagline: { color: "#555", fontSize: 13, fontFamily: BODY.regular, letterSpacing: 0.5 },

  // Scroll
  container: { flex: 1, backgroundColor: "#050505" },
  content: { padding: 16, paddingBottom: 48, gap: 16 },

  // ── Shared ────────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  // The "chip" badge used as section headers in every web card
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    backgroundColor: "rgba(57,255,20,0.08)",
    marginBottom: 20,
  },
  chipText: {
    color: "rgba(57,255,20,0.80)",
    fontFamily: MONO.bold,
    fontSize: 11,
    letterSpacing: 2,
  },
  // Standard glass card (matches web glass-strong)
  card: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    borderRadius: 16,
    padding: 24,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  progressTrack: { height: 12, backgroundColor: "#1c1c1c", borderRadius: 999, overflow: "hidden", marginVertical: 12 },
  progressTrackThin: { height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginVertical: 12 },
  progressFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 999 },
  openLink: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  openLinkText: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 9, letterSpacing: 2 },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroWrap: {
    borderRadius: 18,
    backgroundColor: GLOW_BG,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  heroCard: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: GLOW_BORDER,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heroDate: { color: PRIMARY, fontSize: 11, fontFamily: MONO.regular, letterSpacing: 3.4, marginBottom: 10 },
  heroGreet: { color: "rgba(255,255,255,0.75)", fontSize: 20, fontFamily: DISPLAY.extraBold, letterSpacing: -0.5, lineHeight: 24 },
  heroName: { color: PRIMARY, fontSize: 32, fontFamily: DISPLAY.extraBold, letterSpacing: -0.8, lineHeight: 34, marginBottom: 10, textShadowColor: "rgba(57,255,20,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 22 },
  heroSub: { color: "rgba(255,255,255,0.80)", fontSize: 14, fontFamily: BODY.medium, lineHeight: 21, marginBottom: 20 },
  heroActions: { flexDirection: "column", gap: 10 },
  heroPrimary: { backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 28, elevation: 6 },
  heroPrimaryText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14 },
  heroSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  heroSecondaryText: { color: "#fff", fontFamily: DISPLAY.medium, fontSize: 14 },

  // ── TraderIdentity ────────────────────────────────────────────────────────
  identityAvatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: PRIMARY,
    justifyContent: "center", alignItems: "center",
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarLetter: { color: "#000", fontSize: 28, fontFamily: DISPLAY.extraBold },
  // Profile picture — fills the avatar circle when user.picture is set
  avatarImg: {
    width: 64, height: 64, borderRadius: 16,
  },
  // Camera overlay — matches web: absolute inset-0 grid place-items-center bg-black/55
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  identityNameBlock: { flex: 1 },
  identityName: { color: "#fff", fontSize: 24, fontFamily: DISPLAY.extraBold, letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  archetypeBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(57,255,20,0.12)", borderWidth: 1, borderColor: "rgba(57,255,20,0.45)" },
  archetypeBadgeText: { color: PRIMARY, fontFamily: DISPLAY.extraBold, fontSize: 10, letterSpacing: 2 },
  identityQuote: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 22, fontStyle: "italic", borderLeftWidth: 2, borderLeftColor: "rgba(57,255,20,0.50)", paddingLeft: 12, marginTop: 20, marginBottom: 20 },
  miniStatsRow: { flexDirection: "row", gap: 12 },
  miniStatBox: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.03)" },
  miniStatLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  miniStatLabelText: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.bold, fontSize: 9, letterSpacing: 2 },
  miniStatValue: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 30, lineHeight: 34 },
  miniStatUnit: { color: "#666", fontFamily: MONO.bold, fontSize: 13 },

  // ── ProofOfImprovement ────────────────────────────────────────────────────
  poiCard: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    borderRadius: 20,
    padding: 28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  poiStateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#333" },
  poiStateBadgeText: { fontSize: 9, fontFamily: MONO.bold, letterSpacing: 1.5, color: "#888" },
  poiNewHeadline: { color: "#fff", fontSize: 30, fontFamily: DISPLAY.extraBold, lineHeight: 38, marginTop: 8, marginBottom: 10 },
  poiMessage: { color: "rgba(255,255,255,0.70)", fontSize: 14, fontFamily: BODY.regular, lineHeight: 22, marginTop: 12 },
  poiMessageLarge: { color: "#fff", fontSize: 18, fontFamily: DISPLAY.bold, lineHeight: 26, marginTop: 20 },
  poiScoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginTop: 10, marginBottom: 14 },
  poiSmallLabel: { color: "#555", fontSize: 9, fontFamily: MONO.bold, letterSpacing: 2, marginBottom: 4 },
  poiBaselineNum: { color: "rgba(255,255,255,0.35)", fontSize: 36, fontFamily: MONO.bold, lineHeight: 40 },
  poiCurrentNum: { color: PRIMARY, fontSize: 60, fontFamily: MONO.bold, lineHeight: 64, textShadowColor: "rgba(57,255,20,0.55)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28 },
  poiDeltaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(57,255,20,0.15)", borderWidth: 1, borderColor: "rgba(57,255,20,0.50)", marginBottom: 8 },
  poiDeltaText: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 24 },

  // ── TransformationProgress (Challenge) ────────────────────────────────────
  challengeDayHeadline: { color: "#fff", fontSize: 36, fontFamily: DISPLAY.extraBold, letterSpacing: -1, lineHeight: 42, marginBottom: 4 },
  challengeDayOf: { color: "rgba(255,255,255,0.40)", fontSize: 22, fontFamily: DISPLAY.regular },
  challengeMeta: { color: "#666", fontFamily: MONO.regular, fontSize: 12, marginBottom: 4 },
  strongerPct: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 28, lineHeight: 32 },
  strongerLabel: { color: "rgba(57,255,20,0.75)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 2, textAlign: "right" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  dayPip: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#111", borderWidth: 1, borderColor: "#222", justifyContent: "center", alignItems: "center" },
  dayPipDone: { backgroundColor: "rgba(57,255,20,0.20)", borderColor: PRIMARY },
  dayPipCurrent: { borderColor: "rgba(57,255,20,0.55)", backgroundColor: "rgba(57,255,20,0.08)" },
  dayPipText: { color: "#666", fontFamily: MONO.regular, fontSize: 11 },
  dayPipTextDone: { color: PRIMARY },
  dayPipTextCurrent: { color: "#fff" },
  stagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  stageBox: { width: "48%", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "rgba(255,255,255,0.02)", alignItems: "center" },
  stageBoxActive: { borderColor: "rgba(57,255,20,0.60)", backgroundColor: "rgba(57,255,20,0.10)" },
  stageBoxDone: { borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.04)" },
  stageDayRange: { color: "rgba(255,255,255,0.40)", fontSize: 8, fontFamily: MONO.regular, letterSpacing: 1.1, marginBottom: 2, textTransform: "uppercase" },
  stageLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: DISPLAY.bold, textAlign: "center", lineHeight: 14, marginTop: 2 },

  // ── Today's Mission ───────────────────────────────────────────────────────
  missionCount: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 20, lineHeight: 24 },
  missionPct: { color: "#777", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5 },
  missionMomentumBox: { backgroundColor: "rgba(57,255,20,0.05)", borderWidth: 1, borderColor: "rgba(57,255,20,0.20)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  missionMomentumText: { color: PRIMARY, fontFamily: BODY.regular, fontSize: 12, lineHeight: 18, textAlign: "center" },
  taskList: { gap: 6 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: "#1a1a1a", backgroundColor: "rgba(255,255,255,0.015)" },
  taskRowNa: { opacity: 0.5 },
  taskRowDone: { borderColor: "rgba(57,255,20,0.40)", backgroundColor: "rgba(57,255,20,0.06)" },
  taskCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#333", justifyContent: "center", alignItems: "center", marginRight: 10, flexShrink: 0 },
  taskCheckDone: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  taskCheckNa: { borderColor: "#2a2a2a" },
  taskIcon: { marginRight: 8, flexShrink: 0 },
  taskLabel: { flex: 1, color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 14 },
  taskBadge: { color: "#555", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, flexShrink: 0 },
  taskAutoBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  taskAutoText: { color: "#555", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1 },
  taskPoints: { color: "#555", fontFamily: MONO.regular, fontSize: 11, flexShrink: 0 },
  missionFooter: { color: "#444", fontFamily: MONO.regular, fontSize: 10, lineHeight: 16, marginTop: 12 },

  // ── Discipline Score ──────────────────────────────────────────────────────
  disciplineCenter: { alignItems: "center", paddingVertical: 20 },
  disciplineBigNum: { color: PRIMARY, fontSize: 72, fontFamily: MONO.bold, lineHeight: 76 },
  disciplineOutOf: { color: "#666", fontSize: 12, fontFamily: MONO.regular, marginTop: 2, marginBottom: 10 },
  disciplinePhaseBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(57,255,20,0.10)", borderWidth: 1, borderColor: "rgba(57,255,20,0.35)" },
  disciplinePhaseText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 12, letterSpacing: 0.5 },
  disciplineAvgRow: { flexDirection: "row", gap: 12 },
  disciplineAvgBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center" },
  disciplineAvgNum: { color: "#fff", fontFamily: MONO.bold, fontSize: 24 },
  disciplineAvgLabel: { color: "#666", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 2, marginTop: 3 },

  // ── Growth Metrics ────────────────────────────────────────────────────────
  // Web: grid sm:grid-cols-2 gap-3 — on mobile: single column, full-width cards
  growthGrid: { gap: 10, marginTop: 4 },
  // Web: p-4 rounded-xl border border-white/10 bg-white/[0.03] — full width on mobile
  growthMetricCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  // Web: font-mono text-[10px] tracking-[0.18em] uppercase text-white/55
  growthMetricLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  // Web: flex items-end gap-2 mt-2
  growthScoreRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  // Web: font-mono text-lg text-white/35 leading-none
  growthPrev: { color: "rgba(255,255,255,0.35)", fontSize: 18, fontFamily: MONO.regular, lineHeight: 20 },
  // Web: font-mono font-black text-3xl text-white leading-none
  growthCur: { color: "#fff", fontSize: 30, fontFamily: MONO.bold, lineHeight: 32 },
  // Bar + sparkline container (web: flex items-center gap-2 mt-2.5)
  growthBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  // Web: flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden
  growthTrack: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" },
  // Copy + pct row (web: flex items-center justify-between gap-2 mt-2)
  growthCopyRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  // Web: font-body text-[11px] text-white/65 leading-snug
  growthCopy: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: BODY.regular, lineHeight: 16, flex: 1 },
  // Web: font-mono text-[11px] text-[#39FF14] font-bold whitespace-nowrap
  growthPct: { color: PRIMARY, fontSize: 11, fontFamily: MONO.bold, flexShrink: 0 },

  // ── Biggest Strength (special green-glow border, matches web) ─────────────
  strengthCard: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.40)",
    borderRadius: 20,
    padding: 20,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  strengthLabel: { color: PRIMARY, fontFamily: DISPLAY.extraBold, fontSize: 30, letterSpacing: -0.5, marginTop: 6, marginBottom: 6 },
  strengthScore: { color: "#fff", fontFamily: MONO.bold, fontSize: 22 },
  strengthScoreUnit: { color: "#555", fontSize: 13, fontFamily: BODY.regular },
  improvedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(57,255,20,0.08)", borderWidth: 1, borderColor: "rgba(57,255,20,0.30)" },
  improvedBadgeText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1 },
  strengthMsg: { color: "rgba(255,255,255,0.80)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21, marginTop: 10 },
  strengthTrades: { color: "rgba(57,255,20,0.75)", fontFamily: MONO.regular, fontSize: 11, marginTop: 8 },

  // ── Growth Area ───────────────────────────────────────────────────────────
  growthAreaLabel: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 30, letterSpacing: -0.5, marginTop: 6, marginBottom: 4 },
  growthAreaScore: { color: "rgba(255,255,255,0.7)", fontFamily: MONO.bold, fontSize: 22, marginBottom: 8 },
  growthAreaScoreUnit: { color: "#555", fontSize: 13, fontFamily: BODY.regular },
  growthAreaMsg: { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21 },

  // ── Live Support ──────────────────────────────────────────────────────────
  liveSubtitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 16, lineHeight: 22 },
  liveEmpty: { paddingVertical: 24, alignItems: "center" },
  liveEmptyText: { color: "#555", fontFamily: BODY.regular, fontSize: 13, lineHeight: 20, textAlign: "center" },
  sessionCard: { backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "#1c1c1c", borderRadius: 14, padding: 14, marginTop: 10 },
  sessionCardLive: { borderColor: "rgba(57,255,20,0.55)", backgroundColor: "rgba(57,255,20,0.06)" },
  sessionTimeSlot: { color: "#666", fontFamily: MONO.regular, fontSize: 11, flex: 1 },
  sessionTimingLabel: { color: "#777", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 0.5 },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  sessionTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15, lineHeight: 21, marginTop: 6 },
  sessionDesc: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 12, marginTop: 3, lineHeight: 18 },
  joinBtn: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.14)" },
  joinBtnLive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  joinBtnEnded: { borderColor: "#1c1c1c" },
  joinBtnText: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 13 },

  // ── Performance Analytics (ROW 6 — glass-strong, matches web exactly) ─
  perfSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 24,
  },
  perfLink: { color: PRIMARY, fontFamily: MONO.bold, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" },
  perfStats: { flexDirection: "row", gap: 10, marginTop: 0, marginBottom: 12 },
  perfStatCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center" },
  perfStatValue: { color: "#fff", fontFamily: MONO.bold, fontSize: 16, lineHeight: 20, marginBottom: 2 },
  perfStatLabel: { color: "rgba(255,255,255,0.50)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1.4, textAlign: "center", textTransform: "uppercase", marginTop: 4 },
  perfFooter: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, lineHeight: 16 },
  perfExtraLabel: { color: "#555", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  perfGoalCard: { marginBottom: 12 },
  perfGoalPct: { color: "rgba(57,255,20,0.60)", fontFamily: MONO.bold, fontSize: 14 },
  perfGoalValue: { color: "rgba(255,255,255,0.65)", fontFamily: MONO.bold, fontSize: 15, marginVertical: 4 },
  perfMiniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  perfMiniCard: { minWidth: "47%", flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(0,0,0,0.20)" },
  perfMiniValue: { fontFamily: DISPLAY.extraBold, fontSize: 18, marginBottom: 3 },
  perfMiniSub: { color: "#555", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
  perfMiniHint: { color: "#444", fontFamily: BODY.regular, fontSize: 10, lineHeight: 15 },

  // ── Ambient glow blobs ────────────────────────────────────────────────────
});
