/**
 * Shared helpers for AI-analysis screens (OneClickAnalysisScreen, TradePlanScreen,
 * ChartAnalyzeScreen). Mirrors web's src/pages/dashboard/IntradayFlow.jsx tone()/Badge()/
 * Section()/LevelChip() — kept in one file, matching web's own shared-module approach (both
 * TradePlan.jsx and OneClickAnalysis.jsx import these from IntradayFlow.jsx), so none of it is
 * duplicated per screen.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MONO, DISPLAY } from "../../src/theme/typography";

export const PRIMARY = "#39FF14";
export const RED = "#F87171";
export const AMBER = "#FBBF24";
export const GRAY = "#9CA3AF";

export function tone(v) {
  const s = String(v || "");
  if (["Bullish", "Aligned", "Strong", "Confirmed", "Low"].includes(s)) return PRIMARY;
  if (["Bearish", "Weak", "Not Confirmed", "High"].includes(s)) return RED;
  if (["Sideways", "Mixed", "Moderate", "Waiting for Confirmation", "Medium", "Manipulation", "Neutral"].includes(s)) return AMBER;
  return GRAY;
}

export function Badge({ value }) {
  const c = tone(value);
  return (
    <View style={[s.badge, { borderColor: c, backgroundColor: `${c}1f` }]}>
      <Text style={[s.badgeText, { color: c }]}>{value || "—"}</Text>
    </View>
  );
}

export function LevelChip({ label, value }) {
  return (
    <View style={s.levelChip}>
      <Text style={s.levelLabel}>{label}</Text>
      <Text style={s.levelValue}>{value || "—"}</Text>
    </View>
  );
}

export function Section({ icon, n, title, question, accent = PRIMARY, right, children }) {
  return (
    <View style={[s.section, { borderColor: `${accent}55` }]}>
      <View style={s.sectionHeader}>
        <View style={s.sectionHeaderLeft}>
          <View style={[s.sectionIconBox, { borderColor: `${accent}55`, backgroundColor: `${accent}14` }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionEyebrow}>{n}. {title}</Text>
            <Text style={s.sectionQuestion}>{question}</Text>
          </View>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  badge: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },

  levelChip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10 },
  levelLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  levelValue: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 16, marginTop: 3 },

  section: { borderWidth: 1, borderRadius: 16, backgroundColor: "rgba(10,10,10,0.8)", padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  sectionIconBox: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionEyebrow: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  sectionQuestion: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15, marginTop: 2 },
});
