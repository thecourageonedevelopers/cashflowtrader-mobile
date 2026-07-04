import React, {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Modal, TextInput, Linking, RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { useAuth } from "../src/hooks/useAuth";
import { challengeApi } from "../src/api/challenge";
import { uploadApi } from "../src/api/upload";
import { useAlert } from "../src/context/AlertContext";
import ChallengeLanding from "../components/challenge/ChallengeLanding";
import PushFormModal from "../components/challenge/PushFormModal";
import AmbientGlow from "../components/common/AmbientGlow";

// ─── Constants ────────────────────────────────────────────────────────────────

const AMBER = "#F5B43C";
const DONE_STATUSES = ["completed", "verified", "pending"];

// Exactly matches web DAY_META
const DAY_META = {
  1:  { skills: ["Market Structure Reading"], hook: "Where it all begins — read the market before you touch it." },
  2:  { skills: ["Edge Definition"], hook: "The one setup that separates specialists from generalists." },
  3:  { skills: ["Risk Sizing", "Stop-Loss Discipline"], hook: "Why position size — not the market — decides if you survive." },
  4:  { skills: ["Trade Planning"], hook: "The 1-page plan that ends impulsive trading." },
  5:  { skills: ["Pre-Market Routine"], hook: "The 30-minute ritual champions run before every open." },
  6:  { skills: ["Journaling Discipline"], hook: "The habit 90% of traders skip — and regret." },
  7:  { skills: ["Self-Review"], hook: "Week 1 verdict: find the leak quietly draining your account." },
  8:  { skills: ["Setup Selection"], hook: "How waiting for A+ setups silently doubles your edge." },
  9:  { skills: ["Cutting Losers Fast"], hook: "Why 'hope' is the most expensive word in trading." },
  10: { skills: ["Letting Winners Run"], hook: "The mistake that wipes out 80% of beginners' gains." },
  11: { skills: ["Loss Psychology", "Risk Discipline"], hook: "Prove your risk discipline — your first live checkpoint." },
  12: { skills: ["Position Sizing Mastery"], hook: "Right size = calm. Wrong size = panic exits." },
  13: { skills: ["Revenge-Trade Control"], hook: "The urge after a loss that destroys accounts overnight." },
  14: { skills: ["Discipline Auditing"], hook: "Audit your discipline, not just your P&L." },
  15: { skills: ["Conviction Building"], hook: "Where real conviction comes from — and it isn't hope." },
  16: { skills: ["Reactive Execution"], hook: "Stop predicting. Start reacting to what's actually there." },
  17: { skills: ["Trading Mindfulness"], hook: "Calm trader, calm equity curve." },
  18: { skills: ["Consistency Habit"], hook: "The boring habit that compounds into unstoppable consistency." },
  19: { skills: ["Stats Analysis"], hook: "The numbers that don't lie about your real edge." },
  20: { skills: ["Mindful Scaling"], hook: "Earn the right to size up — and the rules to do it safely." },
  21: { skills: ["Trader Identity", "90-Day Vision"], hook: "Meet the trader you've become — and go live." },
};
const SKILLS_TOTAL = Object.values(DAY_META).reduce((n, m) => n + (m.skills?.length || 0), 0);

// ─── Count-up hook (matches web useCountUp) ───────────────────────────────────
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const to = Number(target) || 0;
    let id;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMilestoneDay(lesson) {
  return (lesson.items || []).some((it) => it.type === "milestone");
}
function milestoneTitle(lesson) {
  return (lesson.items || []).find((it) => it.type === "milestone")?.title || `Day ${lesson.day} milestone`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChallengeScreen({ navigation }) {
  const { user, checkAuth, hasChallengeAccess } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const qc = useQueryClient();
  const [activeLesson, setActiveLesson] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pulse animation for current day card
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["challengeLessons"],
    queryFn: () => challengeApi.lessons().then((r) => r.data),
  });

  // Keep the open modal's lesson fresh after refetches
  useEffect(() => {
    if (activeLesson && data) {
      const fresh = data.lessons.find((l) => l.day === activeLesson.day);
      if (fresh) setActiveLesson(fresh);
    }
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenLayout screenName="ChallengeScreen" navigation={navigation}>
        <SafeAreaView style={styles.loadingBox}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </ScreenLayout>
    );
  }

  if (!data) return null;

  // Mirror web: if not purchased → show dedicated landing page
  if (!data.unlocked) {
    return (
      <ScreenLayout screenName="ChallengeScreen" navigation={navigation}>
        <ChallengeLanding
          data={data}
          onPurchased={async () => { await checkAuth(); await refetch(); }}
        />
      </ScreenLayout>
    );
  }

  // ── Derived values (mirrors web exactly) ──────────────────────────────────
  const ip = data.item_progress || {};
  const itemStatus = (day, id) => ip[String(day)]?.[id]?.status;

  const total        = data.total_days || data.lessons?.length || 21;
  const pct          = data.progress_percent || 0;
  const completedDays = new Set(data.completed_days || []);
  const lockedSet    = new Set(data.locked_days || []);
  const currentDay   = data.unlocked
    ? data.lessons?.find((l) => !lockedSet.has(l.day) && !completedDays.has(l.day))?.day ?? null
    : null;
  const previewDay   = currentDay ? data.lessons?.find((l) => l.day === currentDay + 1) : null;
  const currentLesson = currentDay ? data.lessons?.find((l) => l.day === currentDay) : null;
  const doneCount    = data.completed_days?.length || 0;
  const skillsUnlocked = (data.lessons || []).reduce(
    (acc, l) => acc + (completedDays.has(l.day) ? (DAY_META[l.day]?.skills?.length || 0) : 0),
    0
  );
  const milestoneDays = (data.lessons || [])
    .filter(isMilestoneDay)
    .map((l) => ({ day: l.day, title: milestoneTitle(l) }));

  const stageText =
    pct < 33
      ? "The first week breaks most people. Don't be most people."
      : pct < 75
      ? "You've outlasted the quitters. Most never get this far."
      : "You're closer to your first withdrawal than 90% of traders ever get.";

  const momentumText = data.unlocked
    ? doneCount === 0
      ? "Day one starts now. Every trader you admire started exactly here."
      : `Day ${doneCount} down. Quitters quit before this point — you're still standing.`
    : "You've lost money before. The next 21 days decide: a lesson, or a pattern.";

  const openLesson = (lesson, lockReason) => {
    if (lockReason) {
      showAlert({ type: "warning", title: "Locked", message: lockReason });
      return;
    }
    setActiveLesson(lesson);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout screenName="ChallengeScreen" navigation={navigation}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >

        {/* ══════════════════════════════════════════════════════════════════
            HERO — LEFT: emotional copy
        ════════════════════════════════════════════════════════════════== */}
        <View style={styles.heroLeft}>
          {/* Zap chip */}
          <View style={styles.row}>
            <Ionicons name="flash-outline" size={13} color={PRIMARY} />
            <Text style={styles.heroStake}>
              Most people blow their account in week one.{"\n"}You won't be most people.
            </Text>
          </View>

          {/* H1 — matches web text-4xl sm:text-5xl */}
          <Text style={styles.heroH1}>
            <Text style={styles.heroH1Green}>21 days </Text>
            <Text style={styles.heroH1White}>that decide your future.</Text>
          </Text>

          {/* Momentum badge (Flame icon + contextual text) */}
          <View style={styles.momentumBadge}>
            <Ionicons name="flame" size={16} color={PRIMARY} />
            <Text style={styles.momentumText}>{momentumText}</Text>
          </View>

          {/* Proof strip — only when unlocked */}
          {data.unlocked && (
            <Text style={styles.heroProof}>
              {data.streak || 0} days you showed up{"  ·  "}{pct}% to your first withdrawal
            </Text>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            HERO — RIGHT: action anchor (3 states)
        ════════════════════════════════════════════════════════════════== */}

        {/* STATE A: Today's move */}
        {data.unlocked && currentLesson && (
          <Animated.View style={[styles.todayCard, { opacity: pulseAnim }]}>
            {/* Ambient glow — SVG radial gradient from top-right corner, matching web blur-3xl orb */}
            <AmbientGlow position="topRight" size={180} opacity={0.08} color={PRIMARY} />
            {/* Chip */}
            <View style={styles.row}>
              <Ionicons name="flash-outline" size={11} color={PRIMARY} />
              <Text style={styles.todayChip}>Your move today</Text>
            </View>
            {/* Day number */}
            <View style={[styles.row, { alignItems: "flex-end", marginTop: 8, marginBottom: 4 }]}>
              <Text style={styles.todayDayNum}>{String(currentDay).padStart(2, "0")}</Text>
              <Text style={styles.todayDayOf}> / {total}</Text>
            </View>
            {/* Lesson title */}
            <Text style={styles.todayTitle}>{currentLesson.title}</Text>
            {/* Streak copy */}
            <Text style={styles.todayCopy}>
              {doneCount === 0
                ? "The version of you that quits never even starts. Begin."
                : `${doneCount} days straight. Don't break the chain.`}
            </Text>
            {/* CTA */}
            <TouchableOpacity
              style={styles.neonBtn}
              onPress={() => openLesson(currentLesson, null)}
            >
              <Text style={styles.neonBtnText}>Continue Day {currentDay}</Text>
              <Ionicons name="arrow-forward" size={17} color="#000" />
            </TouchableOpacity>
            {/* Next-day lock preview */}
            {previewDay && (
              <View style={[styles.row, { marginTop: 10, gap: 6, alignItems: "flex-start" }]}>
                <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.45)" style={{ marginTop: 2 }} />
                <Text style={styles.nextLockText}>
                  Day {previewDay.day} stays locked until you finish today.{" "}
                  {DAY_META[previewDay.day]?.hook}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* STATE B: All done */}
        {data.unlocked && !currentLesson && (
          <View style={styles.glassDark}>
            <Ionicons name="trophy" size={36} color={PRIMARY} />
            <Text style={[styles.todayTitle, { marginTop: 12 }]}>You finished what 90% quit.</Text>
            <Text style={styles.todayCopy}>
              The discipline is yours now — nobody can take it back. Keep logging. Keep withdrawing.
            </Text>
          </View>
        )}


        {/* ══════════════════════════════════════════════════════════════════
            STATS STRIP [if unlocked] — 2×2 grid matching web grid-cols-4
        ════════════════════════════════════════════════════════════════== */}
        {data.unlocked && (
          <View style={styles.statsGrid}>
            <StatCard icon="flame" label="Days You Showed Up" value={data.streak || 0} />
            <StatCard icon="sparkles" label="Discipline Points" value={data.earned_points || 0} sub="Most quit by day 5. You're earning what they didn't." />
            <StatCard icon="trophy" label="Proof You're Different" value={doneCount} suffix={`/${total}`} />
            <StatCard icon="medal" label="Edge You've Built" value={skillsUnlocked} suffix={` of ${SKILLS_TOTAL}`} accent="amber" />
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TRANSFORMATION BAR [if unlocked]
        ════════════════════════════════════════════════════════════════== */}
        {data.unlocked && (
          <View style={styles.glassCard}>
            {/* Header */}
            <View style={styles.rowBetween}>
              <Text style={styles.barLabel}>Your Transformation</Text>
              <Text style={styles.barPct}>{pct}%</Text>
            </View>

            {/* Progress bar with milestone markers */}
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(pct, 1.5)}%` }]} />
              {milestoneDays.map((m) => {
                const leftPct = Math.min(96, Math.max(2, (m.day / total) * 100));
                const reached = completedDays.has(m.day);
                return (
                  <View key={m.day} style={[styles.milestoneMarker, { left: `${leftPct}%` }]}>
                    <View style={[styles.milestoneCircle, reached && styles.milestoneCircleReached]}>
                      <Ionicons name="flag" size={10} color={reached ? "#000" : AMBER} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Stage copy */}
            <Text style={styles.barStageCopy}>{stageText}</Text>
            <View style={[styles.row, { marginTop: 6 }]}>
              <Ionicons name="flag" size={12} color={`${AMBER}bb`} />
              <Text style={styles.barHint}> Tap a flag — that's a checkpoint most never reach</Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CERTIFICATE BANNER [if certificate.ready]
        ════════════════════════════════════════════════════════════════== */}
        {data.unlocked && data.certificate?.ready && (
          <View style={[styles.glassCard, { borderColor: "rgba(57,255,20,0.40)" }]}>
            <View style={styles.row}>
              <Ionicons name="trophy" size={28} color={PRIMARY} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.certTitle}>Challenge Complete 🎉</Text>
                <Text style={styles.certCopy}>
                  Every required item & milestone is verified. You finished the 21-Day Transformation.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CERTIFICATE PENDING */}
        {data.unlocked && !data.certificate?.ready &&
          (data.certificate?.outstanding?.length || 0) > 0 &&
          doneCount >= total && (
          <View style={[styles.glassCard, { borderColor: "rgba(245,180,60,0.25)" }]}>
            <Text style={styles.certPendingChip}>Almost there</Text>
            <Text style={styles.certCopy}>
              Your certificate unlocks once these are verified:{" "}
              {data.certificate.outstanding.map((o) => `Day ${o.day} · ${o.item}`).join(" · ")}
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            DAY LIST — matches web space-y-3 day cards
        ════════════════════════════════════════════════════════════════== */}
        <View style={styles.dayList}>
          {(data.lessons || []).map((lesson) => {
            const dayLocked   = (data.locked_days || []).includes(lesson.day);
            const locked      = !data.unlocked || dayLocked;
            const done        = completedDays.has(lesson.day);
            const isCurrent   = lesson.day === currentDay;
            const milestone   = isMilestoneDay(lesson);
            const meta        = DAY_META[lesson.day] || {};
            const skill       = meta.skills?.[0];
            const totalItems  = (lesson.items || []).length;
            const doneItems   = (lesson.items || []).filter((it) =>
              DONE_STATUSES.includes(itemStatus(lesson.day, it.id))
            ).length;
            const accentColor = milestone ? AMBER : PRIMARY;

            const lockReason = !data.unlocked
              ? "Purchase challenge to unlock"
              : dayLocked
              ? `Finish the required tasks on Day ${lesson.day - 1} to unlock`
              : "";

            // Card border/bg (matches web 4 states)
            let cardStyle;
            if (isCurrent) {
              cardStyle = milestone
                ? [styles.dayCard, styles.dayCardCurrentAmber]
                : [styles.dayCard, styles.dayCardCurrentGreen];
            } else if (done) {
              cardStyle = milestone
                ? [styles.dayCard, styles.dayCardDoneAmber]
                : [styles.dayCard, styles.dayCardDoneGreen];
            } else if (locked) {
              cardStyle = milestone
                ? [styles.dayCard, styles.dayCardLockedAmber]
                : [styles.dayCard, styles.dayCardLocked];
            } else {
              cardStyle = milestone
                ? [styles.dayCard, styles.dayCardOpenAmber]
                : [styles.dayCard, styles.dayCardOpen];
            }

            return (
              <TouchableOpacity
                key={lesson.day}
                onPress={() => openLesson(lesson, lockReason)}
                activeOpacity={locked ? 1 : 0.82}
                style={cardStyle}
              >
                {/* LEFT: Day number box */}
                <View style={[
                  styles.dayNumBox,
                  (done || isCurrent) && { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}10` },
                  !(done || isCurrent) && milestone && { borderColor: `${AMBER}33` },
                ]}>
                  {/* Milestone trophy badge overlay */}
                  {milestone && (
                    <View style={styles.milestoneBadge}>
                      <Ionicons name="trophy" size={12} color={AMBER} />
                    </View>
                  )}
                  <Text style={styles.dayLabel}>DAY</Text>
                  <Text style={[styles.dayNum, { color: (done || isCurrent || milestone) ? accentColor : "#fff" }]}>
                    {String(lesson.day).padStart(2, "0")}
                  </Text>
                </View>

                {/* CENTER: badge row + title + description */}
                <View style={styles.dayCenter}>
                  {/* Badge row — matches web flex-wrap exactly */}
                  <View style={styles.dayBadgeRow}>
                    {milestone ? (
                      <View style={[styles.badge, { borderColor: `${AMBER}44`, backgroundColor: `${AMBER}18` }]}>
                        <Ionicons name="flag" size={9} color={AMBER} />
                        <Text style={[styles.badgeText, { color: AMBER }]}>Milestone</Text>
                      </View>
                    ) : (
                      <Text style={styles.itemCountText}>
                        {totalItems} item{totalItems === 1 ? "" : "s"}
                      </Text>
                    )}
                    {isCurrent && (
                      <View style={[styles.badge, { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}18` }]}>
                        <Ionicons name="flash-outline" size={9} color={accentColor} />
                        <Text style={[styles.badgeText, { color: accentColor }]}>Start now</Text>
                      </View>
                    )}
                    {done && (
                      <View style={[styles.badge, { borderColor: `${accentColor}44`, backgroundColor: `${accentColor}18` }]}>
                        <Text style={[styles.badgeText, { color: accentColor }]}>Completed</Text>
                      </View>
                    )}
                    {done && skill && (
                      <View style={styles.skillChip}>
                        <Ionicons name="medal-outline" size={9} color={AMBER} />
                        <Text style={styles.skillChipText}>+ {skill}</Text>
                      </View>
                    )}
                    {locked && !isCurrent && (
                      <View style={styles.lockedChip}>
                        <Ionicons name="lock-closed-outline" size={9} color="#888" />
                        <Text style={styles.lockedChipText}>Locked</Text>
                      </View>
                    )}
                    {!locked && !done && !isCurrent && doneItems > 0 && (
                      <View style={styles.lockedChip}>
                        <Text style={styles.lockedChipText}>{doneItems}/{totalItems} done</Text>
                      </View>
                    )}
                  </View>

                  {/* Title */}
                  <Text style={[styles.dayTitle, locked && !milestone && { color: "rgba(255,255,255,0.70)" }]}>
                    {lesson.title}
                  </Text>

                  {/* Description / locked hook */}
                  {locked ? (
                    <Text style={styles.lockedHook}>
                      {meta.hook || `Unlocks after Day ${lesson.day - 1}.`}
                      {lesson.day > 1 && (
                        <Text style={{ color: "rgba(255,255,255,0.35)" }}> · Unlocks after Day {lesson.day - 1}</Text>
                      )}
                    </Text>
                  ) : (
                    lesson.description ? (
                      <Text style={styles.dayDesc} numberOfLines={2}>{lesson.description}</Text>
                    ) : null
                  )}
                </View>

                {/* RIGHT: status indicator */}
                <View style={styles.dayRight}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={28} color={accentColor} />
                  ) : isCurrent ? (
                    <View style={styles.row}>
                      <Text style={[styles.dayRightText, { color: accentColor }]}>Start</Text>
                      <Ionicons name="arrow-forward" size={14} color={accentColor} />
                    </View>
                  ) : locked ? (
                    <Ionicons name="lock-closed-outline" size={22} color="#555" />
                  ) : (
                    <View style={styles.row}>
                      <Text style={styles.dayRightText}>Open</Text>
                      <Ionicons name="chevron-forward" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          DAY MODAL — bottom sheet
      ════════════════════════════════════════════════════════════════== */}
      {activeLesson && (
        <DayModal
          lesson={activeLesson}
          itemProgress={ip[String(activeLesson.day)] || {}}
          onClose={() => setActiveLesson(null)}
          onChanged={refetch}
        />
      )}

      {/* PushFormModal — global overlay equivalent (web: DashboardLayout) */}
      <PushFormModal />

    </ScreenLayout>
  );
}

// ─── StatCard (matches web StatCard with count-up) ────────────────────────────

function StatCard({ icon, label, value, suffix = "", sub = "", accent = "green" }) {
  const n = useCountUp(value);
  const accentColor = accent === "amber" ? AMBER : PRIMARY;
  return (
    <View style={styles.statCard}>
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={[styles.statValue, { color: accent === "amber" ? AMBER : "#fff" }]}>{n}</Text>
          {!!suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        {!!sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
      <View style={styles.statIconWrap}>
        <View style={[styles.statIconGlow, { backgroundColor: accentColor }]} />
        <Ionicons name={icon} size={32} color={accentColor} />
      </View>
    </View>
  );
}

// ─── DayModal ─────────────────────────────────────────────────────────────────

function DayModal({ lesson, itemProgress, onClose, onChanged }) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalPanel}
            onPress={() => {}} // prevent backdrop propagation
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Header */}
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDayChip}>Day {String(lesson.day).padStart(2, "0")}</Text>
                  <Text style={styles.modalTitle}>{lesson.title}</Text>
                  {lesson.description ? (
                    <Text style={styles.modalDesc}>{lesson.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Item list */}
              <View style={{ marginTop: 20, gap: 12 }}>
                {(lesson.items || []).map((item) => (
                  <ItemCard
                    key={item.id}
                    day={lesson.day}
                    item={item}
                    progress={itemProgress[item.id]}
                    onChanged={onChanged}
                  />
                ))}
                {!(lesson.items || []).length && (
                  <Text style={styles.emptyText}>No content configured for this day.</Text>
                )}
              </View>

              {/* Doubt box */}
              <DoubtBox day={lesson.day} />

              {/* Close */}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

const TYPE_ICON_MAP = {
  video:        "film-outline",
  pdf:          "document-text-outline",
  ebook:        "book-outline",
  text:         "document-text-outline",
  checklist:    "list-outline",
  submission:   "cloud-upload-outline",
  quiz:         "help-circle-outline",
  milestone:    "trophy-outline",
  live_session: "radio-outline",
  external_link:"open-outline",
};

function StatusBadge({ status, type }) {
  if (status === "verified" || status === "completed")
    return <ItemBadge tone="green">{type === "milestone" ? "Verified" : "Done"}</ItemBadge>;
  if (status === "pending")  return <ItemBadge tone="amber">Under review</ItemBadge>;
  if (status === "rejected") return <ItemBadge tone="red">Re-upload needed</ItemBadge>;
  if (status === "attempted") return <ItemBadge tone="amber">Retry quiz</ItemBadge>;
  return null;
}

function ItemBadge({ tone, children }) {
  const colors = {
    green: { bg: "rgba(57,255,20,0.12)", border: "rgba(57,255,20,0.25)", text: PRIMARY },
    amber: { bg: "rgba(245,180,60,0.10)", border: "rgba(245,180,60,0.30)", text: "#fbbf24" },
    red:   { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)", text: "#fca5a5" },
  };
  const c = colors[tone] || colors.green;
  return (
    <View style={[styles.itemBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.itemBadgeText, { color: c.text }]}>{children}</Text>
    </View>
  );
}

function ItemCard({ day, item, progress, onChanged }) {
  const icon = TYPE_ICON_MAP[item.type] || "list-outline";
  const status = progress?.status;
  const done = DONE_STATUSES.includes(status);
  return (
    <View style={[styles.itemCard, done && styles.itemCardDone]}>
      <View style={styles.rowBetween}>
        <View style={[styles.row, { flex: 1 }]}>
          <Ionicons name={icon} size={16} color={done ? PRIMARY : "rgba(255,255,255,0.70)"} />
          <Text style={[styles.itemTitle, { marginLeft: 8 }]} numberOfLines={2}>{item.title}</Text>
          {item.required && <Text style={styles.reqMarker}>·req</Text>}
        </View>
        <View style={styles.row}>
          {item.points ? <Text style={styles.itemPoints}>{item.points} pts</Text> : null}
          <StatusBadge status={status} type={item.type} />
        </View>
      </View>
      <ItemBody day={day} item={item} progress={progress} done={done} onChanged={onChanged} />
    </View>
  );
}

// ─── ItemBody (all type-specific content) ────────────────────────────────────

function ItemBody({ day, item, progress, done, onChanged }) {
  switch (item.type) {
    case "video":        return <VideoItem   day={day} item={item} done={done} onChanged={onChanged} />;
    case "checklist":   return <ChecklistItem day={day} item={item} done={done} onChanged={onChanged} />;
    case "quiz":        return <QuizItem     day={day} item={item} progress={progress} onChanged={onChanged} />;
    case "submission":  return <SubmissionItem day={day} item={item} done={done} onChanged={onChanged} />;
    case "milestone":   return <MilestoneItem  day={day} item={item} progress={progress} onChanged={onChanged} />;
    case "text":
      return (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.itemBodyText}>{item.body || "No content."}</Text>
          <MarkDone day={day} item={item} done={done} onChanged={onChanged} />
        </View>
      );
    case "pdf":
    case "ebook":
      return (
        <View style={{ marginTop: 10 }}>
          {item.url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.url)} style={styles.row}>
              <Ionicons name="download-outline" size={14} color={PRIMARY} />
              <Text style={[styles.neonLink, { marginLeft: 4 }]}>{item.filename || "Open file"}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>File URL pending.</Text>
          )}
          <MarkDone day={day} item={item} done={done} onChanged={onChanged} />
        </View>
      );
    case "live_session":
      return (
        <View style={{ marginTop: 10 }}>
          {item.join_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.join_url)} style={[styles.neonBtn, styles.neonBtnSm]}>
              <Text style={styles.neonBtnText}>Join Live</Text>
              <Ionicons name="open-outline" size={14} color="#000" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>Join URL pending.</Text>
          )}
          <MarkDone day={day} item={item} done={done} onChanged={onChanged} />
        </View>
      );
    case "external_link":
      return (
        <View style={{ marginTop: 10 }}>
          {item.url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.url)} style={[styles.neonBtn, styles.neonBtnSm]}>
              <Text style={styles.neonBtnText}>{item.label || "Open Resource"}</Text>
              <Ionicons name="open-outline" size={14} color="#000" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>URL pending.</Text>
          )}
          <MarkDone day={day} item={item} done={done} onChanged={onChanged} />
        </View>
      );
    default:
      return <Text style={styles.pendingText}>Unsupported item.</Text>;
  }
}

// ─── MarkDone ─────────────────────────────────────────────────────────────────

async function completeItem(day, item, onChanged, showAlert, label = "Marked complete") {
  try {
    await challengeApi.completeItem(day, item.id);
    showAlert({ type: "success", title: "Done", message: label });
    onChanged?.();
  } catch (e) {
    showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not save" });
  }
}

function MarkDone({ day, item, done, onChanged, disabled, label = "Mark complete" }) {
  const { showAlert } = useAlert();
  if (done) {
    return (
      <View style={[styles.row, { marginTop: 10 }]}>
        <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
        <Text style={[styles.doneText, { marginLeft: 4 }]}>Complete</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={() => completeItem(day, item, onChanged, showAlert)}
      disabled={disabled}
      style={[styles.neonBtn, styles.neonBtnSm, { marginTop: 10, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={styles.neonBtnText}>{label}</Text>
      <Ionicons name="checkmark-circle" size={14} color="#000" />
    </TouchableOpacity>
  );
}

// ─── VideoItem ────────────────────────────────────────────────────────────────

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (m) return m[1];
  const v = url.match(/[?&]v=([\w-]{11})/);
  return v ? v[1] : null;
}

function VideoItem({ day, item, done, onChanged }) {
  const url = item.video_url || item.url;
  const ytId = youtubeId(url);
  const videoUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : url;

  const openVideo = async () => {
    if (!videoUrl) return;
    await WebBrowser.openBrowserAsync(videoUrl);
  };

  return (
    <View style={{ marginTop: 10 }}>
      {url ? (
        <TouchableOpacity onPress={openVideo} style={styles.videoPlaceholder}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={28} color="#000" />
          </View>
          {ytId && (
            <Text style={styles.videoHint}>YouTube · Tap to open</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.pendingText}>Video URL pending.</Text>
      )}
      <MarkDone day={day} item={item} done={done} onChanged={onChanged} label="Mark watched" />
    </View>
  );
}

// ─── ChecklistItem ────────────────────────────────────────────────────────────

function ChecklistItem({ day, item, done, onChanged }) {
  const list = item.checklist || [];
  const [checked, setChecked] = useState(() => list.map(() => false));
  const requiredIdxs = list.map((t, i) => (typeof t === "object" && t.required ? i : null)).filter((i) => i !== null);
  const allReqDone = requiredIdxs.every((i) => checked[i]);

  return (
    <View style={{ marginTop: 10 }}>
      {list.map((t, i) => {
        const text = typeof t === "string" ? t : t.text;
        const req  = typeof t === "object" && t.required;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => !done && setChecked((c) => c.map((v, idx) => idx === i ? !v : v))}
            style={[styles.row, styles.checkRow]}
            activeOpacity={done ? 1 : 0.7}
          >
            <View style={[styles.checkbox, (done || checked[i]) && styles.checkboxChecked]}>
              {(done || checked[i]) && <Ionicons name="checkmark" size={11} color="#000" />}
            </View>
            <Text style={styles.checkText}>
              {text}
              {req ? <Text style={{ color: PRIMARY }}> ·required</Text> : null}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!list.length && <Text style={styles.pendingText}>No tasks configured.</Text>}
      <MarkDone day={day} item={item} done={done} onChanged={onChanged} disabled={!allReqDone} />
    </View>
  );
}

// ─── QuizItem ─────────────────────────────────────────────────────────────────

function QuizItem({ day, item, progress, onChanged }) {
  const { showAlert } = useAlert();
  const qs = item.questions || [];
  const [answers, setAnswers] = useState(() => qs.map(() => null));
  const [busy, setBusy] = useState(false);
  const passed = progress?.status === "completed" || progress?.status === "verified";

  if (passed) {
    return (
      <View style={[styles.row, { marginTop: 10 }]}>
        <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
        <Text style={[styles.doneText, { marginLeft: 4 }]}>Passed</Text>
      </View>
    );
  }

  const submit = async () => {
    if (answers.some((a) => a === null)) {
      showAlert({ type: "warning", title: "Incomplete", message: "Answer every question first" });
      return;
    }
    setBusy(true);
    try {
      const r = await challengeApi.submitQuiz(day, item.id, answers);
      if (r.data.passed) {
        showAlert({ type: "success", title: "Passed", message: `All correct! ${r.data.score} pts earned.` });
      } else {
        showAlert({ type: "warning", title: "Try Again", message: `${r.data.correct}/${r.data.total} correct — keep trying.` });
      }
      onChanged?.();
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not submit" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 10, gap: 14 }}>
      {qs.map((q, qi) => (
        <View key={qi}>
          <Text style={styles.quizQuestion}>{qi + 1}. {q.q}</Text>
          <View style={{ gap: 6, marginTop: 6 }}>
            {(q.options || []).map((opt, oi) => (
              <TouchableOpacity
                key={oi}
                onPress={() => setAnswers((a) => a.map((v, idx) => idx === qi ? oi : v))}
                style={[
                  styles.quizOption,
                  answers[qi] === oi && styles.quizOptionSelected,
                ]}
              >
                <View style={[styles.radioOuter, answers[qi] === oi && styles.radioOuterSelected]}>
                  {answers[qi] === oi && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.quizOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <TouchableOpacity
        onPress={submit}
        disabled={busy}
        style={[styles.neonBtn, styles.neonBtnSm, { opacity: busy ? 0.6 : 1 }]}
      >
        <Text style={styles.neonBtnText}>{busy ? "Checking..." : "Submit Answers"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SubmissionItem ───────────────────────────────────────────────────────────

function SubmissionItem({ day, item, done, onChanged }) {
  const { showAlert } = useAlert();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <View style={[styles.row, { marginTop: 10 }]}>
        <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
        <Text style={[styles.doneText, { marginLeft: 4 }]}>Submitted</Text>
      </View>
    );
  }

  const pickFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("files", {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || "upload.jpg",
    });
    try {
      const r = await uploadApi.upload(formData);
      setFiles((cur) => [...cur, ...(r.data.files || [])]);
    } catch {
      showAlert({ type: "error", title: "Upload failed", message: "Could not upload file" });
    }
  };

  const submit = async () => {
    if (!text.trim() && !files.length) {
      showAlert({ type: "warning", title: "Empty", message: "Add a response or upload a file" });
      return;
    }
    setBusy(true);
    try {
      await challengeApi.submitText(day, item.id, text, files.map((f) => f.path));
      showAlert({ type: "success", title: "Submitted", message: "Your submission is under review." });
      onChanged?.();
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Submission failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 10 }}>
      {item.prompt && <Text style={styles.itemBodyText}>{item.prompt}</Text>}
      {item.allow_text !== false && (
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type your response..."
          placeholderTextColor="rgba(255,255,255,0.30)"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
      )}
      {item.allow_files && (
        <View style={{ marginVertical: 8 }}>
          {files.map((f, i) => (
            <Text key={i} style={styles.fileChip}>{f.filename || f.path}</Text>
          ))}
          <TouchableOpacity onPress={pickFile} style={styles.uploadBtn}>
            <Ionicons name="cloud-upload-outline" size={14} color="#888" />
            <Text style={styles.uploadBtnText}>Add Files</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        onPress={submit}
        disabled={busy}
        style={[styles.neonBtn, styles.neonBtnSm, { opacity: busy ? 0.6 : 1 }]}
      >
        <Text style={styles.neonBtnText}>{busy ? "Submitting..." : "Submit"}</Text>
        <Ionicons name="checkmark-circle" size={14} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

// ─── MilestoneItem ────────────────────────────────────────────────────────────

function MilestoneItem({ day, item, progress, onChanged }) {
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);
  const status = progress?.status;

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    setBusy(true);
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("files", {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || "proof.jpg",
    });
    try {
      const up = await uploadApi.upload(formData);
      const path = up.data.files?.[0]?.path;
      await challengeApi.submitMilestone(day, item.id, path);
      showAlert({ type: "success", title: "Submitted", message: "Proof submitted — under review." });
      onChanged?.();
    } catch (err) {
      showAlert({ type: "error", title: "Error", message: err?.response?.data?.detail || "Could not submit proof" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 10 }}>
      {item.instructions && <Text style={styles.itemBodyText}>{item.instructions}</Text>}
      {status === "verified" ? (
        <View style={[styles.row, { marginTop: 4 }]}>
          <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
          <Text style={[styles.doneText, { marginLeft: 4 }]}>Verified · {item.points} pts</Text>
        </View>
      ) : status === "pending" ? (
        <View style={{ gap: 4, marginTop: 4 }}>
          <Text style={{ color: AMBER, fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1 }}>
            ⏳ Proof under review
          </Text>
          <Text style={styles.pendingText}>
            You can keep moving — this never blocks your progress. Points unlock when a mentor verifies it.
          </Text>
        </View>
      ) : (
        <>
          {status === "rejected" && (
            <Text style={[styles.pendingText, { color: "#fca5a5", marginBottom: 8 }]}>
              Your last proof was rejected. Please re-upload a clearer screenshot.
            </Text>
          )}
          <TouchableOpacity
            onPress={pickAndUpload}
            disabled={busy}
            style={[styles.neonBtn, styles.neonBtnSm, { opacity: busy ? 0.6 : 1 }]}
          >
            <Ionicons name="cloud-upload-outline" size={14} color="#000" />
            <Text style={styles.neonBtnText}>{busy ? "Uploading..." : "Upload Proof"}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── DoubtBox ─────────────────────────────────────────────────────────────────

function DoubtBox({ day }) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(null);

  const ask = async () => {
    if (!q.trim()) {
      showAlert({ type: "warning", title: "Empty", message: "Type your question" });
      return;
    }
    setBusy(true);
    setReply(null);
    try {
      const r = await challengeApi.askDoubt(day, q);
      if (r.data.resolved) {
        setReply({ resolved: true, answer: r.data.answer, video_url: r.data.video_url });
      } else {
        setReply({ resolved: false, message: r.data.message });
        setQ("");
      }
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not submit" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.doubtBox}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={styles.row}>
        <Ionicons name="help-circle-outline" size={16} color="rgba(255,255,255,0.70)" />
        <Text style={styles.doubtToggle}>Stuck? Ask a doubt</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ask anything about this day or the challenge..."
            placeholderTextColor="rgba(255,255,255,0.30)"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <TouchableOpacity
            onPress={ask}
            disabled={busy}
            style={[styles.neonBtn, styles.neonBtnSm, { opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={styles.neonBtnText}>{busy ? "Sending..." : "Submit Doubt"}</Text>
          </TouchableOpacity>
          {reply && (
            <View style={[styles.doubtReply, reply.resolved && styles.doubtReplyResolved]}>
              {reply.resolved ? (
                <>
                  <Text style={styles.doubtReplyChip}>Instant Answer</Text>
                  <Text style={styles.doubtReplyText}>{reply.answer}</Text>
                  {reply.video_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(reply.video_url)} style={[styles.row, { marginTop: 8 }]}>
                      <Text style={styles.neonLink}>Watch explainer</Text>
                      <Ionicons name="open-outline" size={12} color={PRIMARY} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.doubtReplyText}>{reply.message}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GLASS_BG    = "#0d0d0d";
const GLASS_BORDER = "#1c1c1c";
const HIGHLIGHT   = "rgba(255,255,255,0.08)";

const styles = StyleSheet.create({
  scroll:      { flex: 1, backgroundColor: "#050505" },
  content:     { padding: 18, paddingBottom: 48, gap: 16 },
  loadingBox:  { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "rgba(255,255,255,0.60)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 3 },

  row:         { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

  // ── Hero left ─────────────────────────────────────────────────────────────
  heroLeft:      { gap: 14 },
  heroStake:     { color: "rgba(57,255,20,0.85)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2, lineHeight: 18, flex: 1 },
  heroH1:        { fontFamily: DISPLAY.extraBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  heroH1Green:   { color: PRIMARY, textShadowColor: "rgba(57,255,20,0.45)", textShadowRadius: 11 },
  heroH1White:   { color: "#fff", textShadowColor: "rgba(255,255,255,0.32)", textShadowRadius: 11 },
  momentumBadge: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderColor: "rgba(57,255,20,0.30)", backgroundColor: "rgba(57,255,20,0.06)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  momentumText:  { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21, flex: 1 },
  heroProof:     { color: "rgba(255,255,255,0.40)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2 },

  // ── Today's move card ─────────────────────────────────────────────────────
  todayCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1.5,
    borderColor: "rgba(57,255,20,0.60)",
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
  },
  todayChip:     { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2 },
  todayDayNum:   { color: PRIMARY, fontFamily: MONO.bold, fontSize: 58, lineHeight: 62, textShadowColor: "rgba(57,255,20,0.45)", textShadowRadius: 12 },
  todayDayOf:    { color: "rgba(255,255,255,0.35)", fontFamily: DISPLAY.regular, fontSize: 16, marginBottom: 8 },
  todayTitle:    { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 20, lineHeight: 26, marginTop: 6 },
  todayCopy:     { color: "rgba(255,255,255,0.60)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21, marginTop: 6 },
  nextLockText:  { color: "rgba(255,255,255,0.45)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 19, flex: 1 },

  // ── Glass card (all states that aren't today's move) ─────────────────────
  glassDark: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
  },
  glassCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderTopColor: HIGHLIGHT,
    borderRadius: 18,
    padding: 18,
  },

  // ── Purchase pitch extras ─────────────────────────────────────────────────
  pitchCaption: { color: "rgba(255,255,255,0.35)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2, textAlign: "center", marginTop: 8 },

  // ── Neon button (primary CTA) ─────────────────────────────────────────────
  neonBtn:     { backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, marginTop: 14 },
  neonBtnSm:   { paddingVertical: 10, paddingHorizontal: 14, marginTop: 0, borderRadius: 8, gap: 6 },
  neonBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14, letterSpacing: 0.5 },

  // ── Stats strip ───────────────────────────────────────────────────────────
  statsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard:     { width: "47.5%", backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER, borderTopColor: HIGHLIGHT, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statValue:    { fontFamily: MONO.bold, fontSize: 36, lineHeight: 40, color: "#fff" },
  statSuffix:   { color: "rgba(255,255,255,0.30)", fontFamily: MONO.bold, fontSize: 16, marginLeft: 2, marginBottom: 4, alignSelf: "flex-end" },
  statLabel:    { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 2, marginTop: 6, lineHeight: 13 },
  statSub:      { color: "rgba(255,255,255,0.40)", fontFamily: BODY.regular, fontSize: 9, lineHeight: 14, marginTop: 4 },
  statIconWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  statIconGlow: { position: "absolute", width: 60, height: 60, borderRadius: 30, opacity: 0.25 },

  // ── Transformation bar ────────────────────────────────────────────────────
  barLabel:     { color: "rgba(255,255,255,0.50)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2 },
  barPct:       { color: PRIMARY, fontFamily: MONO.bold, fontSize: 22 },
  barTrack:     { height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", overflow: "visible", marginVertical: 10, position: "relative" },
  barFill:      { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 12, background: "linear-gradient(90deg, #2bd40f, #39FF14)", backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 10 },
  milestoneMarker: { position: "absolute", top: "50%", marginTop: -12, marginLeft: -12, zIndex: 10 },
  milestoneCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#000", borderWidth: 2, borderColor: `${AMBER}aa`, justifyContent: "center", alignItems: "center", shadowColor: AMBER, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 },
  milestoneCircleReached: { backgroundColor: AMBER, borderColor: AMBER },
  barStageCopy: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 20, marginTop: 4 },
  barHint:      { color: "rgba(255,255,255,0.35)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, marginLeft: 2 },

  // ── Certificate ───────────────────────────────────────────────────────────
  certTitle:     { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 18, marginBottom: 4 },
  certCopy:      { color: "rgba(255,255,255,0.60)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21 },
  certPendingChip: { color: AMBER, fontFamily: MONO.regular, fontSize: 9, letterSpacing: 2, marginBottom: 6 },

  // ── Day list ──────────────────────────────────────────────────────────────
  dayList:  { gap: 8 },
  dayCard:  { borderRadius: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: "#070707", padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  dayCardCurrentGreen: { borderColor: "rgba(57,255,20,0.60)", backgroundColor: "rgba(57,255,20,0.06)", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 24 },
  dayCardCurrentAmber: { borderColor: "rgba(245,180,60,0.60)", backgroundColor: "rgba(245,180,60,0.06)", shadowColor: AMBER, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 24 },
  dayCardDoneGreen:    { borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.03)" },
  dayCardDoneAmber:    { borderColor: "rgba(245,180,60,0.30)", backgroundColor: "rgba(245,180,60,0.04)" },
  dayCardLocked:       { borderColor: "rgba(255,255,255,0.05)", backgroundColor: "#0a0a0a", opacity: 0.60 },
  dayCardLockedAmber:  { borderColor: "rgba(245,180,60,0.15)", backgroundColor: "#0a0a0a", opacity: 0.70 },
  dayCardOpen:         { borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.02)" },
  dayCardOpenAmber:    { borderColor: "rgba(245,180,60,0.25)", backgroundColor: "rgba(255,255,255,0.02)" },

  // Day number box
  dayNumBox:     { width: 58, height: 58, borderRadius: 10, borderWidth: 1, borderColor: "#262626", justifyContent: "center", alignItems: "center", backgroundColor: "#0d0d0d", flexShrink: 0 },
  milestoneBadge:{ position: "absolute", top: -8, right: -8, backgroundColor: "#050505", borderRadius: 10, padding: 1, shadowColor: AMBER, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.60, shadowRadius: 4 },
  dayLabel:      { color: "#8a8a8a", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 2, marginBottom: 2 },
  dayNum:        { color: "#fff", fontFamily: MONO.bold, fontSize: 20, lineHeight: 24 },

  // Day center content
  dayCenter:     { flex: 1 },
  dayBadgeRow:   { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginBottom: 5 },
  badge:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText:     { fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5 },
  itemCountText: { color: "rgba(255,255,255,0.70)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2 },
  skillChip:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.05)" },
  skillChipText: { color: "rgba(255,255,255,0.70)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.2 },
  lockedChip:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", backgroundColor: "rgba(255,255,255,0.08)" },
  lockedChipText:{ color: "rgba(255,255,255,0.70)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5 },
  dayTitle:      { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 15, lineHeight: 21, marginBottom: 3 },
  lockedHook:    { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 19 },
  dayDesc:       { color: "rgba(255,255,255,0.70)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 19 },

  // Day right indicator
  dayRight:      { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  dayRightText:  { fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.5, color: "#fff" },

  // ── Day modal ─────────────────────────────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.80)", justifyContent: "flex-end" },
  modalPanel:    { backgroundColor: "#0e0e0e", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: GLASS_BORDER, maxHeight: "92%", padding: 22 },
  modalDayChip:  { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  modalTitle:    { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 24, lineHeight: 30, marginBottom: 4 },
  modalDesc:     { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 22, marginTop: 4 },
  modalClose:    { padding: 8 },
  modalCloseText:{ color: "rgba(255,255,255,0.50)", fontSize: 20 },
  modalCloseBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignSelf: "flex-end" },
  modalCloseBtnText: { color: "rgba(255,255,255,0.70)", fontFamily: DISPLAY.bold, fontSize: 13 },
  emptyText:     { color: "rgba(255,255,255,0.50)", fontFamily: BODY.regular, fontSize: 13 },

  // ── Item card ─────────────────────────────────────────────────────────────
  itemCard:      { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.02)", padding: 14 },
  itemCardDone:  { borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.03)" },
  itemTitle:     { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 14, flex: 1 },
  reqMarker:     { color: "rgba(57,255,20,0.70)", fontFamily: MONO.regular, fontSize: 10, marginLeft: 4 },
  itemPoints:    { color: "rgba(255,255,255,0.40)", fontFamily: MONO.regular, fontSize: 10, marginRight: 6 },
  itemBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  itemBadgeText: { fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5 },
  itemBodyText:  { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 22, marginBottom: 10 },
  doneText:      { color: "rgba(57,255,20,0.70)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.5 },
  pendingText:   { color: "rgba(255,255,255,0.50)", fontFamily: BODY.regular, fontSize: 13 },
  neonLink:      { color: PRIMARY, fontFamily: MONO.regular, fontSize: 12, letterSpacing: 1.5 },

  // ── Video ─────────────────────────────────────────────────────────────────
  videoPlaceholder: { height: 180, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "#0a0a0a", marginBottom: 10, justifyContent: "center", alignItems: "center" },
  playCircle:        { width: 60, height: 60, borderRadius: 30, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center" },
  videoHint:         { color: "rgba(255,255,255,0.40)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, marginTop: 10 },

  // ── Checklist ─────────────────────────────────────────────────────────────
  checkRow:    { paddingVertical: 6, gap: 10 },
  checkbox:    { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#333", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkText:   { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, flex: 1 },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  quizQuestion:    { color: "rgba(255,255,255,0.90)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21 },
  quizOption:      { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(0,0,0,0.30)" },
  quizOptionSelected: { borderColor: "rgba(57,255,20,0.50)", backgroundColor: "rgba(57,255,20,0.05)" },
  radioOuter:      { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: "#555", justifyContent: "center", alignItems: "center" },
  radioOuterSelected: { borderColor: PRIMARY },
  radioInner:      { width: 9, height: 9, borderRadius: 5, backgroundColor: PRIMARY },
  quizOptionText:  { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13 },

  // ── Submission / text area ────────────────────────────────────────────────
  textArea:    { backgroundColor: "rgba(0,0,0,0.40)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontFamily: BODY.regular, fontSize: 13, minHeight: 90, textAlignVertical: "top", marginBottom: 8 },
  fileChip:    { color: "rgba(255,255,255,0.70)", fontFamily: MONO.regular, fontSize: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 },
  uploadBtn:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", borderStyle: "dashed", alignSelf: "flex-start" },
  uploadBtnText: { color: "#888", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.5 },

  // ── Doubt box ─────────────────────────────────────────────────────────────
  doubtBox:          { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)" },
  doubtToggle:       { color: "rgba(255,255,255,0.70)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 2, marginLeft: 6 },
  doubtReply:        { borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.02)", padding: 12 },
  doubtReplyResolved:{ borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.04)" },
  doubtReplyChip:    { color: PRIMARY, fontFamily: MONO.regular, fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  doubtReplyText:    { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 21 },
});
