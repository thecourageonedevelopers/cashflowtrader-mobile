import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";

const scoreItems = [
  {
    title: "Journaling",
    description:
      "Document each trade. Even setups you skip.",
    score: "+16",
    progress: 20,
  },
  {
    title: "Challenge Days",
    description:
      "Complete one lesson per day. Compound the routine.",
    score: "+9",
    progress: 18,
  },
  {
    title: "Days Active",
    description:
      "Show up daily. Even 10 minutes counts.",
    score: "+4",
    progress: 12,
  },
  {
    title: "Streak",
    description:
      "Don't break the chain. Streaks compound discipline.",
    score: "+0",
    progress: 0,
  },
];

const timelineItems = [
  {
    title: "Joined the platform",
    description:
      "The decision to become a better trader.",
    date: "JUN 14, 2026",
    completed: true,
  },
  {
    title: "First Journal Entry",
    description:
      "The day documentation became a habit.",
    date: "JUN 15, 2026",
    completed: true,
  },
  {
    title: "First Live Session",
    description:
      "Joined the process. Stopped trading alone.",
    date: "PENDING",
    completed: false,
  },
  {
    title: "First Challenge Day Completed",
    description:
      "Discipline started compounding.",
    date: "",
    completed: true,
  },
  {
    title: "7-Day Streak",
    description:
      "Routine officially installed.",
    date: "LOCKED",
    completed: false,
  },
  {
    title: "21-Day Completion",
    description:
      "The trader you were meant to become.",
    date: "LOCKED",
    completed: false,
  },
];

export default function ProgressScreen({ navigation }) {
  const { width } = useWindowDimensions();

  const isDesktop =
    Platform.OS === "web" && width >= 768;

  return (
    <ScreenLayout
      screenName="ProgressScreen"
      navigation={navigation}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}

        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons
              name="analytics-outline"
              size={12}
              color={PRIMARY}
            />

            <Text style={styles.heroBadgeText}>
              PROGRESS
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Receipts of{" "}
            <Text style={styles.heroGreen}>
              the work.
            </Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Discipline leaves a trail.
            Here is yours — and the trader
            you're becoming.
          </Text>
        </View>

        {/* STATS */}

        <View
          style={[
            styles.statsGrid,
            isDesktop &&
              styles.statsGridDesktop,
          ]}
        >
          <View style={styles.statCard}>
            <View
              style={styles.statHeader}
            >
              <Text style={styles.cardLabel}>
                CURRENT STREAK
              </Text>

              <Ionicons
                name="flame-outline"
                size={18}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.statValue}>
              0
              <Text style={styles.statUnit}>
                {" "}
                days
              </Text>
            </Text>

            <Text style={styles.statFooter}>
              TODAY IS DAY 1
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={styles.statHeader}
            >
              <Text style={styles.cardLabel}>
                JOURNAL ENTRIES
              </Text>

              <Ionicons
                name="create-outline"
                size={18}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.statValue}>
              4
              <Text style={styles.statUnit}>
                {" "}
                logged
              </Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={styles.statHeader}
            >
              <Text style={styles.cardLabel}>
                CHALLENGE
              </Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.statValue}>
              14%
              <Text style={styles.statUnit}>
                {" "}
                complete
              </Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={styles.statHeader}
            >
              <Text style={styles.cardLabel}>
                DAYS ACTIVE
              </Text>

              <Ionicons
                name="pulse-outline"
                size={18}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.statValue}>
              2
              <Text style={styles.statUnit}>
                {" "}
                days
              </Text>
            </Text>
          </View>
        </View>

        {/* Discipline Score Starts Here */}
                {/* DISCIPLINE SCORE */}

        <View style={styles.scoreCard}>
          <View style={styles.scoreTopRow}>
            <View style={styles.scoreBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={12}
                color={PRIMARY}
              />

              <Text style={styles.scoreBadgeText}>
                DISCIPLINE SCORE
              </Text>
            </View>

            <Text style={styles.scoreRange}>
              0 - 100
            </Text>
          </View>

          <View style={styles.scoreHero}>
            <Text style={styles.scoreValue}>
              29
            </Text>

            <Text style={styles.scoreDescription}>
              Composite measure of{"\n"}
              consistency, journaling, and{"\n"}
              challenge execution.
            </Text>
          </View>

          <View style={styles.scoreProgressTrack}>
            <View
              style={[
                styles.scoreProgressFill,
                { width: "29%" },
              ]}
            />
          </View>

          <View style={styles.movesHeader}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#777"
            />

            <Text style={styles.movesTitle}>
              WHAT MOVES YOUR SCORE
            </Text>
          </View>

          <View
            style={[
              styles.scoreGrid,
              isDesktop &&
                styles.scoreGridDesktop,
            ]}
          >
            {scoreItems.map(
              (item, index) => (
                <View
                  key={index}
                  style={styles.factorCard}
                >
                  <View
                    style={
                      styles.factorTopRow
                    }
                  >
                    <Text
                      style={
                        styles.factorTitle
                      }
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={
                        styles.factorScore
                      }
                    >
                      {item.score}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.factorDescription
                    }
                  >
                    {item.description}
                  </Text>

                  <View
                    style={
                      styles.factorTrack
                    }
                  >
                    <View
                      style={[
                        styles.factorFill,
                        {
                          width: `${item.progress}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )
            )}
          </View>

          <Text style={styles.scoreFooter}>
            Early days. Show up tomorrow.
            Discipline scores compound —
            small actions, applied daily.
          </Text>
        </View>

        {/* TIMELINE */}

        <View style={styles.timelineCard}>
          <View style={styles.timelineBadge}>
            <Ionicons
              name="sparkles-outline"
              size={12}
              color={PRIMARY}
            />

            <Text
              style={
                styles.timelineBadgeText
              }
            >
              YOUR STORY
            </Text>
          </View>

          <Text style={styles.timelineTitle}>
            Your trading timeline.
          </Text>

          <Text
            style={styles.timelineSubtitle}
          >
            Every breakthrough leaves a
            mark. Watch your trader self
            emerge — milestone by milestone.
          </Text>

          <View
            style={styles.timelineWrapper}
          >
            {timelineItems.map(
              (item, index) => (
                <View
                  key={index}
                  style={
                    styles.timelineRow
                  }
                >
                  {/* LEFT SIDE */}

                  <View
                    style={
                      styles.timelineLeft
                    }
                  >
                    <View
                      style={[
                        styles.timelineDot,

                        item.completed &&
                          styles.timelineDotCompleted,
                      ]}
                    >
                      {item.completed && (
                        <Ionicons
                          name="checkmark"
                          size={10}
                          color="#000"
                        />
                      )}
                    </View>

                    {index !==
                      timelineItems.length -
                        1 && (
                      <View
                        style={
                          styles.timelineLine
                        }
                      />
                    )}
                  </View>

                  {/* CENTER */}

                  <View
                    style={
                      styles.timelineContent
                    }
                  >
                    <Text
                      style={[
                        styles.timelineItemTitle,

                        !item.completed &&
                          styles.timelineMuted,
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={[
                        styles.timelineItemDesc,

                        !item.completed &&
                          styles.timelineMutedDesc,
                      ]}
                    >
                      {
                        item.description
                      }
                    </Text>
                  </View>

                  {/* RIGHT */}

                  <View
                    style={
                      styles.timelineDateBox
                    }
                  >
                    <Text
                      style={[
                        styles.timelineDate,

                        item.date ===
                          "LOCKED" &&
                          styles.timelineLocked,

                        item.date ===
                          "PENDING" &&
                          styles.timelinePending,
                      ]}
                    >
                      {item.date}
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  heroSection: {
    marginBottom: 24,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#b0b0b0",
    fontSize: 15,
    lineHeight: 24,
  },

  statsGrid: {
    gap: 14,
    marginBottom: 22,
  },

  statsGridDesktop: {
    flexDirection: "row",
  },

  statCard: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    padding: 18,
  },

  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  cardLabel: {
    color: "#6d6d6d",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  statValue: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },

  statUnit: {
    color: "#777",
    fontSize: 14,
    fontWeight: "500",
  },

  statFooter: {
    marginTop: 14,
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
    padding: 20,
    marginBottom: 22,
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
    marginTop: 18,
    marginBottom: 20,
  },

  scoreValue: {
    color: "#fff",
    fontSize: 58,
    fontWeight: "900",
    marginRight: 16,
  },

  scoreDescription: {
    color: "#8e8e8e",
    fontSize: 13,
    lineHeight: 22,
    flex: 1,
  },

  scoreProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#181818",
    overflow: "hidden",
    marginBottom: 24,
  },

  scoreProgressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  movesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  movesTitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  scoreGrid: {
    gap: 12,
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
    fontSize: 15,
    fontWeight: "700",
  },

  factorScore: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: "800",
  },

  factorDescription: {
    color: "#8a8a8a",
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 12,
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
    marginTop: 22,
    color: "#8a8a8a",
    fontSize: 13,
    lineHeight: 22,
  },

  /* TIMELINE */

  timelineCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    padding: 20,
  },

  timelineBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },

  timelineSubtitle: {
    color: "#8e8e8e",
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 26,
  },

  timelineWrapper: {},

  timelineRow: {
    flexDirection: "row",
    marginBottom: 22,
  },

  timelineLeft: {
    alignItems: "center",
    width: 26,
  },

  timelineDot: {
    width: 16,
    height: 16,
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
    paddingLeft: 14,
  },

  timelineItemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },

  timelineItemDesc: {
    color: "#8e8e8e",
    fontSize: 13,
    lineHeight: 20,
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
    minWidth: 90,
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