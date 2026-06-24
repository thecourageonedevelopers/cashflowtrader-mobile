import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { useAuth } from "../src/hooks/useAuth";
import { progressApi } from "../src/api/progress";
import { challengeApi } from "../src/api/challenge";
import { formatDate } from "../src/utils/format";

function scoreFooterText(score) {
  if (score >= 75) return "Elite mode. You're building real trader equity — habits that pay you back for decades.";
  if (score >= 50) return "Consistency is forming. Keep journaling, keep showing up. The score follows the routine.";
  return "Early days. Show up tomorrow. Discipline scores compound — small actions, applied daily.";
}

export default function ProgressScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ["progress"],
    queryFn: () => progressApi.get().then((r) => r.data),
  });

  const { data: challenge, refetch: refetchChallenge } = useQuery({
    queryKey: ["challenge"],
    queryFn: () => challengeApi.lessons().then((r) => r.data),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProgress(), refetchChallenge()]);
    setRefreshing(false);
  }, [refetchProgress, refetchChallenge]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const currentStreak = progress?.current_streak ?? 0;
  const journalCount = progress?.journal_entries_count ?? 0;
  const challengePct = progress?.challenge_completion_percent ?? 0;
  const daysActive = progress?.days_active ?? 0;
  const score = progress?.personal_progress_score ?? 0;
  const completedDays = challenge?.completed_days ?? [];
  const completedCount = completedDays.length;

  const scoreItems = useMemo(() => [
    {
      title: "Journaling",
      description: "Document each trade. Even setups you skip.",
      score: `+${Math.min(journalCount * 4, 40)}`,
      progress: Math.min(journalCount * 5, 100),
    },
    {
      title: "Challenge Days",
      description: "Complete one lesson per day. Compound the routine.",
      score: `+${Math.round(challengePct * 0.35)}`,
      progress: challengePct,
    },
    {
      title: "Days Active",
      description: "Show up daily. Even 10 minutes counts.",
      score: `+${Math.min(daysActive * 2, 20)}`,
      progress: Math.min((daysActive / 30) * 100, 100),
    },
    {
      title: "Streak",
      description: "Don't break the chain. Streaks compound discipline.",
      score: `+${Math.min(currentStreak * 5, 10)}`,
      progress: Math.min((currentStreak / 10) * 100, 100),
    },
  ], [journalCount, challengePct, daysActive, currentStreak]);

  const timelineItems = useMemo(() => {
    const joinedDate = user?.created_at
      ? formatDate(user.created_at, "MMM DD, YYYY").toUpperCase()
      : "";
    const hasJournal = journalCount > 0;
    const challengeAny = completedCount > 0;
    const streak7 = currentStreak >= 7;
    const challengeAll = completedCount >= 21;

    return [
      {
        title: "Joined the platform",
        description: "The decision to become a better trader.",
        date: joinedDate,
        completed: true,
      },
      {
        title: "First Journal Entry",
        description: "The day documentation became a habit.",
        date: hasJournal ? "DONE" : "PENDING",
        completed: hasJournal,
      },
      {
        title: "First Live Session",
        description: "Joined the process. Stopped trading alone.",
        date: "PENDING",
        completed: false,
      },
      {
        title: "First Challenge Day Completed",
        description: "Discipline started compounding.",
        date: challengeAny ? "DONE" : "PENDING",
        completed: challengeAny,
      },
      {
        title: "7-Day Streak",
        description: "Routine officially installed.",
        date: streak7 ? "DONE" : "LOCKED",
        completed: streak7,
      },
      {
        title: "21-Day Completion",
        description: "The trader you were meant to become.",
        date: challengeAll ? "DONE" : "LOCKED",
        completed: challengeAll,
      },
    ];
  }, [user, journalCount, completedCount, currentStreak]);

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (progressLoading && !progress) {
    return (
      <ScreenLayout screenName="ProgressScreen" navigation={navigation}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </ScreenLayout>
    );
  }

  if (progressError && !progress) {
    return (
      <ScreenLayout screenName="ProgressScreen" navigation={navigation}>
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={40} color="#333" />
          <Text style={styles.errorText}>Couldn't load progress data</Text>
          <TouchableOpacity onPress={refetchProgress} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <ScreenLayout screenName="ProgressScreen" navigation={navigation}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* HERO */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons name="analytics-outline" size={12} color={PRIMARY} />
            <Text style={styles.heroBadgeText}>PROGRESS</Text>
          </View>

          <Text style={styles.heroTitle}>
            Receipts of{" "}
            <Text style={styles.heroGreen}>the work.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Discipline leaves a trail.{"\n"}
            Here is yours — and the trader{"\n"}
            you're becoming.
          </Text>
        </View>

        {/* STATS */}
        <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.cardLabel}>CURRENT STREAK</Text>
              <Ionicons name="flame-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={styles.statValue}>
              {currentStreak}
              <Text style={styles.statUnit}> days</Text>
            </Text>
            {currentStreak === 0 && (
              <Text style={styles.statFooter}>TODAY IS DAY 1</Text>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.cardLabel}>JOURNAL ENTRIES</Text>
              <Ionicons name="create-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={styles.statValue}>
              {journalCount}
              <Text style={styles.statUnit}> logged</Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.cardLabel}>CHALLENGE</Text>
              <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={styles.statValue}>
              {Math.round(challengePct)}%
              <Text style={styles.statUnit}> complete</Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.cardLabel}>DAYS ACTIVE</Text>
              <Ionicons name="pulse-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={styles.statValue}>
              {daysActive}
              <Text style={styles.statUnit}> days</Text>
            </Text>
          </View>
        </View>

        {/* DISCIPLINE SCORE */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTopRow}>
            <View style={styles.scoreBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color={PRIMARY} />
              <Text style={styles.scoreBadgeText}>DISCIPLINE SCORE</Text>
            </View>
            <Text style={styles.scoreRange}>0 - 100</Text>
          </View>

          <View style={styles.scoreHero}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreDescription}>
              Composite measure of{"\n"}
              consistency, journaling, and{"\n"}
              challenge execution.
            </Text>
          </View>

          <View style={styles.scoreProgressTrack}>
            <View style={[styles.scoreProgressFill, { width: `${score}%` }]} />
          </View>

          <View style={styles.movesHeader}>
            <Ionicons name="information-circle-outline" size={14} color="#777" />
            <Text style={styles.movesTitle}>WHAT MOVES YOUR SCORE</Text>
          </View>

          <View style={[styles.scoreGrid, isDesktop && styles.scoreGridDesktop]}>
            {scoreItems.map((item, index) => (
              <View key={index} style={styles.factorCard}>
                <View style={styles.factorTopRow}>
                  <Text style={styles.factorTitle}>{item.title}</Text>
                  <Text style={styles.factorScore}>{item.score}</Text>
                </View>

                <Text style={styles.factorDescription}>{item.description}</Text>

                <View style={styles.factorTrack}>
                  <View style={[styles.factorFill, { width: `${item.progress}%` }]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.scoreFooter}>{scoreFooterText(score)}</Text>
        </View>

        {/* TIMELINE */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineBadge}>
            <Ionicons name="sparkles-outline" size={12} color={PRIMARY} />
            <Text style={styles.timelineBadgeText}>YOUR STORY</Text>
          </View>

          <Text style={styles.timelineTitle}>Your trading timeline.</Text>

          <Text style={styles.timelineSubtitle}>
            Every breakthrough leaves a{"\n"}
            mark. Watch your trader self{"\n"}
            emerge — milestone by milestone.
          </Text>

          <View style={styles.timelineWrapper}>
            {timelineItems.map((item, index) => (
              <View key={index} style={styles.timelineRow}>
                {/* LEFT SIDE */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      item.completed && styles.timelineDotCompleted,
                    ]}
                  >
                    {item.completed && (
                      <Ionicons name="checkmark" size={10} color="#000" />
                    )}
                  </View>

                  {index !== timelineItems.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                {/* CENTER */}
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineItemTitle,
                      !item.completed && styles.timelineMuted,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.timelineItemDesc,
                      !item.completed && styles.timelineMutedDesc,
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>

                {/* RIGHT */}
                <View style={styles.timelineDateBox}>
                  <Text
                    style={[
                      styles.timelineDate,
                      item.date === "LOCKED" && styles.timelineLocked,
                      item.date === "PENDING" && styles.timelinePending,
                    ]}
                  >
                    {item.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },

  errorText: {
    color: "#666",
    marginTop: 12,
    fontSize: 13,
  },

  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },

  retryText: {
    color: PRIMARY,
    fontSize: 13,
  },

  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  heroSection: {
    marginBottom: 18,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 14,
  },

  heroBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#b0b0b0",
    fontSize: 13,
    lineHeight: 20,
  },

  statsGrid: {
    gap: 12,
    marginBottom: 18,
  },

  statsGridDesktop: {
    flexDirection: "row",
  },

  statCard: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    padding: 14,
  },

  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  cardLabel: {
    color: "#6d6d6d",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  statValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },

  statUnit: {
    color: "#777",
    fontSize: 12,
    fontWeight: "500",
  },

  statFooter: {
    marginTop: 10,
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },

  /* SCORE CARD */

  scoreCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    padding: 16,
    marginBottom: 18,
  },

  scoreTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  scoreBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  scoreRange: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },

  scoreHero: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 16,
  },

  scoreValue: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "900",
    marginRight: 16,
  },

  scoreDescription: {
    color: "#8e8e8e",
    fontSize: 12,
    lineHeight: 20,
    flex: 1,
  },

  scoreProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#181818",
    overflow: "hidden",
    marginBottom: 18,
  },

  scoreProgressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  movesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  movesTitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  scoreGrid: {
    gap: 10,
  },

  scoreGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  factorCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 14,
    padding: 14,
  },

  factorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  factorTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  factorScore: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "800",
  },

  factorDescription: {
    color: "#8a8a8a",
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 10,
  },

  factorTrack: {
    height: 5,
    backgroundColor: "#1a1a1a",
    borderRadius: 999,
    overflow: "hidden",
  },

  factorFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  scoreFooter: {
    marginTop: 16,
    color: "#8a8a8a",
    fontSize: 12,
    lineHeight: 20,
  },

  /* TIMELINE */

  timelineCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    padding: 16,
  },

  timelineBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 12,
  },

  timelineBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  timelineTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },

  timelineSubtitle: {
    color: "#8e8e8e",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },

  timelineWrapper: {},

  timelineRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  timelineLeft: {
    alignItems: "center",
    width: 22,
  },

  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4a4a4a",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },

  timelineDotCompleted: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: "#252525",
    marginTop: 4,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },

  timelineItemTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  timelineItemDesc: {
    color: "#8e8e8e",
    fontSize: 12,
    lineHeight: 18,
  },

  timelineMuted: {
    color: "#6b6b6b",
  },

  timelineMutedDesc: {
    color: "#555",
  },

  timelineDateBox: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
    minWidth: 76,
  },

  timelineDate: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  timelineLocked: {
    color: "#666",
  },

  timelinePending: {
    color: "#999",
  },
});
