import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY, authBaseStyles } from "../components/auth/AuthStyles";

const DAYS = [
  "01","02","03","04","05","06","07",
  "08","09","10","11","12","13","14",
  "15","16","17","18","19","20","21",
];

// Subtle rgba wrappers for the glow effect — resolved once at module load.
const GLOW_BORDER   = "rgba(57, 255, 20, 0.18)";
const GLOW_BG       = "rgba(57, 255, 20, 0.04)";
const GLOW_BG_SOFT  = "rgba(57, 255, 20, 0.025)";
const HIGHLIGHT_TOP = "rgba(255, 255, 255, 0.08)";

export default function OverviewScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop  = Platform.OS === "web" && width >= 768;

  const completedDays = ["01", "02", "03", "20"];

  // ── First-load state ───────────────────────────────────────────────────────
  const [ready, setReady]    = useState(false);
  const contentOpacity       = useRef(new Animated.Value(0)).current;
  const pulseOpacity         = useRef(new Animated.Value(0.35)).current;
  const pulseLoopRef         = useRef(null);

  useEffect(() => {
    // Pulse the logo while loading
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 1,    duration: 650, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();

    const timer = setTimeout(() => {
      pulseLoopRef.current?.stop();
      setReady(true);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => {
      clearTimeout(timer);
      pulseLoopRef.current?.stop();
    };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const stats = [
    {
      title: "THIS WEEK",
      value: "+$6,900",
      subtitle: "50% WIN RATE",
      footer: "On track — protect the gain.",
      color: PRIMARY,
    },
    {
      title: "THIS MONTH",
      value: "+$6,900",
      subtitle: "50% WIN RATE",
      footer: "Compounding. Stay disciplined.",
      color: PRIMARY,
    },
    {
      title: "WIN RATE • 30D",
      value: "50%",
      subtitle: "4 TRADES LOGGED",
      footer: "Solid. Eliminate B-grade setups.",
      color: PRIMARY,
      progress: 50,
    },
    {
      title: "DISCIPLINE",
      value: "29",
      suffix: "/100",
      subtitle: "0 DAY STREAK",
      footer: "Critical — rebuild your morning routine.",
      color: "#ff6b6b",
    },
  ];

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Animated.View style={[authBaseStyles.logoBox, styles.loadingLogo, { opacity: pulseOpacity }]}>
          <Text style={authBaseStyles.logoLetter}>C</Text>
        </Animated.View>

        <Text style={styles.loadingBrand}>
          Cashflow{" "}
          <Text style={{ color: PRIMARY }}>Trader</Text>
        </Text>

        <Text style={styles.loadingTagline}>Preparing your dashboard…</Text>
      </SafeAreaView>
    );
  }
  return (
    <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
      <ScreenLayout
        screenName="OverviewScreen"
        navigation={navigation}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >

          {/* Glow wrapper — provides the subtle green halo around the hero card */}
          <View style={styles.heroGlowWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroDate}>
                  FRIDAY • 19 JUN
                </Text>

                <Text style={styles.heroTitle}>
                  Welcome back,{" "}
                  <Text style={styles.heroGreen}>
                    Cashflow.
                  </Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Friday closes the week. Protect your gains.
                </Text>
              </View>

              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() =>
                    navigation.navigate("ChallengeScreen")
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color="#000"
                  />

                  <Text style={styles.primaryButtonText}>
                    Continue 21-Day Challenge
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() =>
                    navigation.navigate("MarketScreen")
                  }
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={18}
                    color="#fff"
                  />

                  <Text style={styles.secondaryButtonText}>
                    Live Market
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statsGrid,
              isDesktop && styles.statsGridDesktop,
            ]}
          >
            {stats.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.statCard,
                  isDesktop && styles.statCardDesktop,
                ]}
              >
                <Text style={styles.cardLabel}>
                  {item.title}
                </Text>

                <View style={styles.statValueRow}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: item.color },
                    ]}
                  >
                    {item.value}
                  </Text>

                  {item.suffix && (
                    <Text style={styles.statSuffix}>
                      {item.suffix}
                    </Text>
                  )}
                </View>

                <Text style={styles.statSubText}>
                  {item.subtitle}
                </Text>

                {item.progress && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${item.progress}%` },
                      ]}
                    />
                  </View>
                )}

                <Text style={styles.cardFooter}>
                  {item.footer}
                </Text>
              </View>
            ))}
          </View>

          {/* =========================
              TRADER IDENTITY
          ========================== */}

          <View
            style={[
              styles.identityWrapper,
              isDesktop && styles.identityWrapperDesktop,
            ]}
          >
            {/* LEFT */}
            <View style={styles.identityCard}>
              <View style={styles.identityBadge}>
                <Ionicons
                  name="information-circle-outline"
                  size={12}
                  color={PRIMARY}
                />
                <Text style={styles.identityBadgeText}>
                  TRADER IDENTITY
                </Text>
              </View>

              <View style={styles.identityLine} />

              <Text style={styles.identityName}>
                Cashflow Admin
              </Text>

              <View style={styles.roleBadge}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={PRIMARY}
                />
                <Text style={styles.roleBadgeText}>
                  THE BUILDER
                </Text>
              </View>

              <Text style={styles.identityQuote}>
                "You're not chasing wins — you're
                building a trader. Brick by brick."
              </Text>
            </View>

            {/* RIGHT */}
            <View style={styles.identityRight}>
              {/* Glow wrapper around the goal card */}
              <View style={styles.goalGlowWrap}>
                <View style={styles.goalCard}>
                  <View style={styles.goalTop}>
                    <Text style={styles.cardLabel}>
                      YOUR MONTHLY GOAL
                    </Text>

                    <Text style={styles.goalPercent}>
                      99%
                    </Text>
                  </View>

                  <Text style={styles.goalValue}>
                    +$6,900 of $7,000
                  </Text>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: "99%" },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.doubleCards,
                  isDesktop &&
                    styles.doubleCardsDesktop,
                ]}
              >
                <View style={styles.strengthCard}>
                  <Text style={styles.cardLabel}>
                    ↗↗ YOUR BIGGEST STRENGTH
                  </Text>

                  <Text style={styles.strengthText}>
                    Breakout — keep doubling down
                  </Text>
                </View>

                <View style={styles.weaknessCard}>
                  <Text
                    style={[
                      styles.cardLabel,
                      { color: "#ff8d8d" },
                    ]}
                  >
                    ↘↘ YOUR CURRENT WEAKNESS
                  </Text>

                  <Text style={styles.weaknessText}>
                    Tag mistakes when you log losers
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.doubleCards,
                  isDesktop &&
                    styles.doubleCardsDesktop,
                ]}
              >
                <View style={styles.infoCard}>
                  <Text style={styles.cardLabel}>
                    ⏱ YOUR WEEKLY RECORDS
                  </Text>

                  <Text style={styles.infoValue}>
                    4 journals found
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.cardLabel}>
                    ◎ YOUR CURRENT POSITION
                  </Text>

                  <Text style={styles.infoValue}>
                    No trades open
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* =========================
              BOTTOM SECTION
          ========================== */}

          <View
            style={[
              styles.bottomGrid,
              isDesktop && styles.bottomGridDesktop,
            ]}
          >
            {/* 21 DAY CHALLENGE */}
            <TouchableOpacity
              style={styles.challengeCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("ChallengeScreen")}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBadge}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={PRIMARY}
                  />

                  <Text style={styles.sectionBadgeText}>
                    21 DAYS TO BUILD A TRADER
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#aaa"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Continue your transformation.
              </Text>

              <Text style={styles.sectionSubTitle}>
                3 of 21 conquered • 14% transformed.
              </Text>

              <View style={styles.daysGrid}>
                {DAYS.map((day) => {
                  const active =
                    completedDays.includes(day);

                  return (
                    <View
                      key={day}
                      style={[
                        styles.dayBox,
                        active &&
                          styles.dayBoxActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          active &&
                            styles.dayTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>

            {/* LIVE TODAY */}
            <TouchableOpacity
              style={styles.liveCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("SessionsScreen")}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBadge}>
                  <Ionicons
                    name="pulse-outline"
                    size={12}
                    color={PRIMARY}
                  />

                  <Text style={styles.sectionBadgeText}>
                    LIVE TODAY
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#aaa"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Process beats prediction.
              </Text>

              <View style={styles.sessionItem}>
                <View style={styles.sessionLeft}>
                  <View
                    style={styles.liveDot}
                  />
                  <Text style={styles.sessionText}>
                    TEST Admin Session
                  </Text>
                </View>

                <Text style={styles.sessionTime}>
                  9:00 PM
                </Text>
              </View>

              <View style={styles.sessionItem}>
                <View style={styles.sessionLeft}>
                  <View
                    style={styles.liveDot}
                  />
                  <Text style={styles.sessionText}>
                    TEST Admin Session
                  </Text>
                </View>

                <Text style={styles.sessionTime}>
                  9:00 PM
                </Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </ScreenLayout>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  // ── Loading screen ──────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingLogo: {
    // Inherits logoBox dimensions from authBaseStyles;
    // size override makes it slightly larger for a splash context.
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 20,
  },

  loadingBrand: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },

  loadingTagline: {
    color: "#555",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // ── Hero card ───────────────────────────────────────────────────────────────
  heroGlowWrap: {
    borderRadius: 26,
    backgroundColor: GLOW_BG,
    marginBottom: 20,
    // iOS coloured shadow
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },

  heroCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: GLOW_BORDER,
    borderRadius: 24,
    padding: 24,
  },

  heroLeft: {
    marginBottom: 20,
  },

  heroDate: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    marginBottom: 10,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
    marginBottom: 10,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#999",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },

  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  primaryButton: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  primaryButtonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
    marginLeft: 8,
  },

  secondaryButton: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  secondaryButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 15,
  },

  // ── Stats grid ─────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",   // was "column" — now row for 2x2 on mobile
    flexWrap: "wrap",       // allows cards to wrap to next row
    gap: 12,
    marginBottom: 22,
  },

  statsGridDesktop: {
    flexWrap: "nowrap",     // all 4 cards in one row on desktop
  },

  statCard: {
    width: "48%",           // exactly 2 per row on mobile (was flex: 1)
    minHeight: 150,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    borderRadius: 20,
    padding: 18,
  },

  statCardDesktop: {
    flex: 1,                // overrides width — 4 equal cards in one row
  },

  cardLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },

  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  statValue: {
    fontSize: 28,           // reduced from 34 to fit cleanly in 2-col cards
    fontWeight: "800",
  },

  statSuffix: {
    color: "#999",
    fontSize: 16,
    marginLeft: 4,
    marginBottom: 4,
  },

  statSubText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 8,
    marginBottom: 14,
  },

  cardFooter: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
    marginTop: "auto",
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#1d1d1d",
    borderRadius: 999,
    overflow: "hidden",
    marginVertical: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  // ── Trader identity ────────────────────────────────────────────────────────
  identityWrapper: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 22,
  },

  identityWrapperDesktop: {
    flexDirection: "row",
  },

  identityCard: {
    flex: 1,
  },

  identityBadge: {
    flexDirection: "row",
    alignItems: "center",
  },

  identityBadgeText: {
    color: PRIMARY,
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  identityLine: {
    width: 40,
    height: 3,
    backgroundColor: PRIMARY,
    marginVertical: 18,
    borderRadius: 999,
  },

  identityName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 14,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#111",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },

  roleBadgeText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  identityQuote: {
    color: "#999",
    lineHeight: 24,
  },

  identityRight: {
    flex: 1,
    gap: 16,
  },

  // ── Goal card ──────────────────────────────────────────────────────────────
  goalGlowWrap: {
    borderRadius: 22,
    backgroundColor: GLOW_BG_SOFT,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },

  goalCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: GLOW_BORDER,
    borderTopColor: HIGHLIGHT_TOP,
    borderRadius: 20,
    padding: 18,
  },

  goalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  goalPercent: {
    color: PRIMARY,
    fontWeight: "800",
    fontSize: 18,
  },

  goalValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginVertical: 10,
  },

  doubleCards: {
    gap: 16,
  },

  doubleCardsDesktop: {
    flexDirection: "row",
  },

  strengthCard: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    padding: 18,
  },

  weaknessCard: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    padding: 18,
  },

  strengthText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 15,
  },

  weaknessText: {
    color: "#ff8d8d",
    fontWeight: "700",
    fontSize: 15,
  },

  infoCard: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    padding: 18,
  },

  infoValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // ── Bottom grid ────────────────────────────────────────────────────────────
  bottomGrid: {
    gap: 18,
  },

  bottomGridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  challengeCard: {
    flex: 1.2,
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    padding: 20,
  },

  liveCard: {
    flex: 0.8,
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderTopColor: HIGHLIGHT_TOP,
    padding: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionBadgeText: {
    color: PRIMARY,
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 14,
    marginBottom: 8,
  },

  sectionSubTitle: {
    color: "#888",
    marginBottom: 20,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  dayBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },

  dayBoxActive: {
    backgroundColor: PRIMARY,
  },

  dayText: {
    color: "#fff",
    fontWeight: "700",
  },

  dayTextActive: {
    color: "#000",
  },

  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },

  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    marginRight: 10,
  },

  sessionText: {
    color: "#fff",
    fontWeight: "600",
  },

  sessionTime: {
    color: "#888",
  },
});
