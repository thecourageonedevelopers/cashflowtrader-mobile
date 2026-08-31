/**
 * ExpiryWarningBanner — RN port of web src/components/ExpiryWarningBanner.jsx.
 *
 * Reusable expiry status/warning for the trader-facing app — rendered on the Challenge screen
 * (from its own /challenge/lessons fetch) and the Overview screen (its own independent fetch of
 * the same endpoint) so there is exactly one place this logic lives, mirroring web exactly. Fed by
 * the cutoff_at / cutoff_reason / access_status / expiry_warning_days fields ChallengeService
 * already returns — no new API, no second day-math implementation (see src/lib/accessStatus.js).
 *
 * Renders nothing for: lifetime access (no cutoffAt), an already-expired/blocked grant (the
 * existing ProgramExpired/AccessBlocked full-page flows own that state — this banner is strictly
 * for the lead-up), or once outside the configured warning window (in which case only the calm,
 * always-shown "Expiry Date" line renders — 10+ days remaining still shows the date, just without
 * any urgency styling).
 */
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MONO, BODY } from "../../src/theme/typography";
import { daysUntilCutoffIST, formatExpiryDate } from "../../src/lib/accessStatus";

const NEON = "#39FF14";
const RED = "#ff4d4d";
const AMBER_BORDER = "rgba(245,158,11,0.45)";
const AMBER_BG = "rgba(245,158,11,0.10)";
const AMBER_TEXT = "#fcd34d";

const URGENT_MESSAGE = {
  critical: "Program expires today",
  tomorrow: "Program expires tomorrow",
  soon: "Only 2 days remaining",
};

function PulsingText({ style, children }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.Text style={[style, { opacity }]}>{children}</Animated.Text>;
}

export default function ExpiryWarningBanner({ cutoffAt, cutoffReason, accessStatus, warningDays }) {
  if (!cutoffAt || accessStatus === "expired" || accessStatus === "blocked") return null;

  const daysRemaining = daysUntilCutoffIST(cutoffAt);
  if (daysRemaining == null || daysRemaining < 0) return null;

  const dateLabel = formatExpiryDate(cutoffAt);
  const threshold = Number.isFinite(warningDays) ? warningDays : 3;
  const withinWarningWindow = daysRemaining <= threshold;

  const tier =
    !withinWarningWindow ? "info"
    : daysRemaining === 0 ? "critical"
    : daysRemaining === 1 ? "tomorrow"
    : daysRemaining === 2 ? "soon"
    : "info";

  if (tier === "info") {
    return (
      <View style={s.infoCard}>
        <Text style={s.infoLabel}>Expiry Date</Text>
        <Text style={s.infoDate}>{dateLabel}</Text>
      </View>
    );
  }

  const message = cutoffReason === "scheduled_lock"
    ? (tier === "critical" ? "Program access will be locked today" : tier === "tomorrow" ? "Program access will be locked tomorrow" : "Program access will be locked in 2 days")
    : URGENT_MESSAGE[tier];

  const cardStyle = tier === "soon" ? s.soonCard : s.urgentCard;

  return (
    <View style={cardStyle}>
      <View style={s.row}>
        <Ionicons name="warning" size={20} color={RED} />
        <PulsingText style={s.urgentText}>{message}</PulsingText>
      </View>
      <View style={s.dateRow}>
        <Text style={s.dateLabel}>Expiry Date</Text>
        <Text style={s.dateValue}>{dateLabel}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  // tier "info" — calm, always-shown card
  infoCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    backgroundColor: "rgba(57,255,20,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoLabel: {
    color: "rgba(57,255,20,0.80)",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: MONO.regular,
    fontWeight: "600",
  },
  infoDate: {
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  // tiers "critical"/"tomorrow" — neon-bordered glass-strong-like card
  urgentCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NEON,
    backgroundColor: "rgba(10,10,10,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // tier "soon" — amber, pulsing
  soonCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    backgroundColor: AMBER_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  urgentText: {
    color: RED,
    fontFamily: BODY.regular,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 15,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 8,
    paddingLeft: 30,
    flexWrap: "wrap",
  },
  dateLabel: {
    color: "#d1d5db",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: MONO.regular,
    fontWeight: "600",
  },
  dateValue: {
    color: "#d1d5db",
    fontSize: 13,
    fontFamily: BODY.regular,
    fontWeight: "500",
  },
});
