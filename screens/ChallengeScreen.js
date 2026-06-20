import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";

const challengeDays = [
  {
    day: 1,
    title: "Welcome (Video)",
    description: "Set the tone for 21 days.",
    status: "completed",
  },
  {
    day: 2,
    title: "Day 2",
    description: "",
    status: "open",
  },
  {
    day: 3,
    title: "Risk Management 101",
    description:
      "Risk is the only thing you control. Master position sizing.",
    status: "locked",
  },
  {
    day: 4,
    title: "The Trading Plan",
    description:
      "Trade the plan, plan the trade. No exceptions.",
    status: "completed",
  },
  {
    day: 5,
    title: "Pre-Market Routine",
    description:
      "Champions prepare. A 30-min ritual sets the tone.",
    status: "open",
  },
  {
    day: 6,
    title: "Journaling Discipline",
    description:
      "Every trade. Every emotion. No shortcuts.",
    status: "locked",
  },
  {
    day: 7,
    title: "Week 1 Review",
    description:
      "Stop trading. Start studying yourself.",
    status: "locked",
  },
  {
    day: 8,
    title: "Mastering Patience",
    description:
      "A-grade setups only. Wait for them.",
    status: "locked",
  },
  {
    day: 9,
    title: "Cutting Losers Fast",
    description:
      "Hope is not a strategy. Exit when wrong.",
    status: "locked",
  },
  {
    day: 10,
    title: "Letting Winners Run",
    description:
      "Big wins fund the small losses. Don't chop them short.",
    status: "locked",
  },
  {
    day: 11,
    title: "Psychology of Losses",
    description:
      "Losing is information, not failure.",
    status: "locked",
  },
  {
    day: 12,
    title: "Position Sizing",
    description:
      "Right size = peaceful mind. Wrong size = panic exits.",
    status: "locked",
  },
  {
    day: 13,
    title: "Avoiding Revenge Trading",
    description:
      "After a loss, walk away — don't double down.",
    status: "locked",
  },
  {
    day: 14,
    title: "Week 2 Review",
    description:
      "Audit your discipline, not just your P&L.",
    status: "locked",
  },
  {
    day: 15,
    title: "Building Conviction",
    description:
      "Conviction comes from preparation, not hope.",
    status: "locked",
  },
  {
    day: 16,
    title: "Trading Without Targets",
    description:
      "Stop predicting. Start reacting.",
    status: "locked",
  },
  {
    day: 17,
    title: "Mindfulness in Trading",
    description:
      "Calm trader. Calm equity curve.",
    status: "locked",
  },
  {
    day: 18,
    title: "Building Consistency",
    description:
      "Show up daily. Compound the small wins.",
    status: "locked",
  },
  {
    day: 19,
    title: "Reviewing Your Statistics",
    description:
      "Numbers don't lie. Trust them over feelings.",
    status: "locked",
  },
  {
    day: 20,
    title: "Scaling Up Mindfully",
    description:
      "Earn the right to size up.",
    status: "completed",
  },
  {
    day: 21,
    title: "The Trader You Are Becoming",
    description:
      "Reflect. You're not the same trader who started Day 1.",
    status: "open",
  },
];

export default function ChallengeScreen({ navigation }) {
  const { width } = useWindowDimensions();

  const isDesktop =
    Platform.OS === "web" && width >= 768;

  const progress = 14;

  const handleCardPress = (day) => {
    console.log(`${day} Video`);
  };

  return (
    <ScreenLayout
      screenName="ChallengeScreen"
      navigation={navigation}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}

        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={PRIMARY}
            />

            <Text style={styles.heroBadgeText}>
              21 DAYS TO BUILD A TRADER
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            <Text style={styles.heroGreen}>
              Designed to install discipline,
            </Text>
            {"\n"}
            not information.
          </Text>

          <Text style={styles.heroSubtitle}>
            3 of 21 conquered • 14% transformed.
            Today is the only one that matters.
          </Text>
        </View>

        {/* PROGRESS */}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              TRANSFORMATION
            </Text>

            <Text style={styles.progressValue}>
              {progress}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        {/* Challenge Cards Start Here */}

                {/* CHALLENGE DAY LIST */}

        <View style={styles.listWrapper}>
          {challengeDays.map((item) => {
            const isCompleted =
              item.status === "completed";

            const isLocked =
              item.status === "locked";

            const isOpen =
              item.status === "open";

            return (
              <TouchableOpacity
                key={item.day}
                activeOpacity={0.9}
                style={[
                  styles.dayCard,

                  isCompleted &&
                    styles.completedCard,

                  isLocked &&
                    styles.lockedCard,
                ]}
                onPress={() =>
                  handleCardPress(item.day)
                }
              >
                {/* LEFT DAY BOX */}

                <View
                  style={[
                    styles.dayNumberBox,

                    isCompleted &&
                      styles.dayNumberBoxCompleted,
                  ]}
                >
                  <Text style={styles.dayLabel}>
                    DAY
                  </Text>

                  <Text
                    style={[
                      styles.dayNumber,

                      isCompleted &&
                        styles.dayNumberCompleted,
                    ]}
                  >
                    {String(item.day).padStart(
                      2,
                      "0"
                    )}
                  </Text>
                </View>

                {/* CENTER CONTENT */}

                <View style={styles.cardContent}>
                  <View
                    style={styles.cardTopRow}
                  >
                    <View
                      style={
                        styles.videoBadgeRow
                      }
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={12}
                        color={
                          isLocked
                            ? "#666"
                            : "#fff"
                        }
                      />

                      <Text
                        style={[
                          styles.videoLabel,

                          isLocked &&
                            styles.lockedText,
                        ]}
                      >
                        VIDEO
                      </Text>
                    </View>

                    {isCompleted && (
                      <View
                        style={
                          styles.completedBadge
                        }
                      >
                        <Text
                          style={
                            styles.completedBadgeText
                          }
                        >
                          COMPLETED
                        </Text>
                      </View>
                    )}

                    {isLocked && (
                      <View
                        style={
                          styles.lockedBadge
                        }
                      >
                        <Text
                          style={
                            styles.lockedBadgeText
                          }
                        >
                          LOCKED
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.cardTitle,

                      isLocked &&
                        styles.lockedText,
                    ]}
                  >
                    {item.title}
                  </Text>

                  {!!item.description && (
                    <Text
                      style={[
                        styles.cardDescription,

                        isLocked &&
                          styles.lockedDescription,
                      ]}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>

                {/* RIGHT STATUS */}

                <View
                  style={styles.cardRight}
                >
                  {isCompleted && (
                    <Ionicons
                      name="checkmark-circle"
                      size={30}
                      color={PRIMARY}
                    />
                  )}

                  {isOpen && (
                    <Text
                      style={styles.openText}
                    >
                      OPEN →
                    </Text>
                  )}

                  {isLocked && (
                    <Ionicons
                      name="lock-closed-outline"
                      size={24}
                      color="#666"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
    padding: 16,
    paddingBottom: 32,
  },

  heroSection: {
    marginBottom: 18,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
    backgroundColor: "rgba(57,255,20,0.04)",
  },

  heroBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginLeft: 6,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_900Black",
    lineHeight: 30,
    marginBottom: 10,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#b0b0b0",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  progressCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    padding: 14,
    marginBottom: 16,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  progressLabel: {
    color: "#666",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  progressValue: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
  },

  progressTrack: {
    height: 5,
    backgroundColor: "#171717",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  listWrapper: {
    gap: 8,
  },

  dayCard: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    backgroundColor: "#070707",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  completedCard: {
    borderColor: "rgba(57,255,20,0.45)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  lockedCard: {
    opacity: 0.65,
  },

  dayNumberBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "#0d0d0d",
  },

  dayNumberBoxCompleted: {
    borderColor: "rgba(57,255,20,0.5)",
    backgroundColor: "rgba(57,255,20,0.08)",
  },

  dayLabel: {
    color: "#8a8a8a",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 3,
  },

  dayNumber: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_900Black",
  },

  dayNumberCompleted: {
    color: PRIMARY,
  },

  cardContent: {
    flex: 1,
    justifyContent: "center",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    flexWrap: "wrap",
  },

  videoBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  videoLabel: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginLeft: 4,
  },

  completedBadge: {
    backgroundColor: "rgba(57,255,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.4)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  completedBadgeText: {
    color: PRIMARY,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },

  lockedBadge: {
    backgroundColor: "#181818",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  lockedBadgeText: {
    color: "#999",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },

  cardDescription: {
    color: "#b0b0b0",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  lockedText: {
    color: "#707070",
  },

  lockedDescription: {
    color: "#5c5c5c",
  },

  cardRight: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    minWidth: 44,
  },

  openText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    fontSize: 10,
  },
});