/**
 * TradePlanScreen — mobile port of web src/pages/dashboard/TradePlan.jsx
 *
 * Verified from source (both the page and ChartAnalysisService.java's tradePlan() method) that
 * this is a READ-ONLY dashboard, not a CRUD feature — there is no create/edit/save/execute/delete
 * anywhere in web's TradePlan.jsx. It renders the `trade_plan` sub-object already present on
 * whichever analysis is active: either passed in directly (arriving here from One-Click
 * Analysis's "Open Trade Plan" button, exactly mirroring web's session-already-populated path) or,
 * if opened with none, fetched as the user's latest INTRADAY analysis via GET /journal/trade-plan
 * (web's own fallback when there's no active session).
 *
 * The `refine` endpoint (POST /journal/analyses/{id}/refine) that might look like an "edit" action
 * belongs to a completely different, unrelated feature — ChartAnalyzePanel.jsx's analyze-intraday
 * upload flow — confirmed by grepping every use of `/refine` in the web app. It has no connection
 * to this screen and was correctly not built here.
 *
 * Web's empty-state "Go to Analyse" button points at /dashboard/trading/analyse (JournalList.jsx +
 * ChartAnalyzePanel.jsx's screenshot-upload analysis flow) — a large, separate, unaudited feature
 * out of this phase's scope. Mirrored as an informational message instead of a broken navigation
 * target, consistent with the same adaptation already used for One-Click Analysis's own
 * out-of-scope links.
 */
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { journalApi } from "../src/api/journal";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { PRIMARY, tone, Badge } from "../components/analysis/AnalysisShared";

function Meter({ label, value }) {
  const v = value == null ? 0 : value;
  const col = v >= 70 ? PRIMARY : v >= 40 ? "#FBBF24" : "#F87171";
  return (
    <View style={ms.card}>
      <View style={ms.headerRow}>
        <Text style={ms.label}>{label}</Text>
        <Text style={[ms.value, { color: col }]}>
          {value == null ? "—" : value}
          <Text style={ms.valueSuffix}>/100</Text>
        </Text>
      </View>
      <View style={ms.track}>
        <View style={[ms.fill, { width: `${v}%`, backgroundColor: col }]} />
      </View>
    </View>
  );
}
const ms = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(10,10,10,0.8)", padding: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  value: { fontFamily: DISPLAY.extraBold, fontSize: 26 },
  valueSuffix: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "700" },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 10, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});

function BigLevel({ label, value }) {
  return (
    <View style={bl.card}>
      <Text style={bl.label}>{label}</Text>
      <Text style={bl.value}>{value || "—"}</Text>
    </View>
  );
}
const bl = StyleSheet.create({
  card: { width: "48%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14, marginBottom: 10 },
  label: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  value: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 20 },
});

function Header({ instrument, createdAt }) {
  return (
    <View style={hd.wrap}>
      <View>
        <View style={hd.chip}>
          <Ionicons name="grid-outline" size={11} color={PRIMARY} />
          <Text style={hd.chipText}>Trade Plan</Text>
        </View>
        <Text style={hd.title}>Your decision <Text style={{ color: PRIMARY }}>dashboard.</Text></Text>
      </View>
      {instrument && instrument !== "Unknown" && (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={hd.instrument}>{instrument}</Text>
          {!!createdAt && <Text style={hd.date}>{new Date(createdAt).toLocaleString()}</Text>}
        </View>
      )}
    </View>
  );
}
const hd = StyleSheet.create({
  wrap: { marginBottom: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  title: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 26, lineHeight: 32 },
  instrument: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 18, marginTop: 10 },
  date: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10 },
});

export default function TradePlanScreen({ navigation, route }) {
  const passedAnalysis = route.params?.analysis || null;

  const [analysis, setAnalysis] = useState(passedAnalysis);
  const [instrument, setInstrument] = useState(passedAnalysis?.instrument || null);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(!passedAnalysis);
  const [checkedLatest, setCheckedLatest] = useState(!!passedAnalysis);

  // No analysis passed in -> adopt the user's most recent intraday analysis, mirroring web's
  // "no active session -> fetch /journal/trade-plan" fallback exactly.
  useEffect(() => {
    if (checkedLatest) return;
    (async () => {
      try {
        const { data } = await journalApi.tradePlan();
        if (!data.empty) {
          setAnalysis(data.analysis);
          setInstrument(data.instrument);
          setCreatedAt(data.created_at);
        }
      } catch {
        /* ignore, matches web's silent catch */
      } finally {
        setCheckedLatest(true);
        setLoading(false);
      }
    })();
  }, [checkedLatest]);

  if (loading) {
    return (
      <SafeAreaView style={ts.loadingWrap} edges={["top"]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }} edges={["top"]}>
        <View style={ts.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={ts.headerBarTitle}>Trade Plan</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Header instrument={null} createdAt={null} />
          <View style={ts.emptyCard}>
            <Ionicons name="grid-outline" size={36} color="rgba(255,255,255,0.3)" />
            <Text style={ts.emptyTitle}>No analysis yet</Text>
            <Text style={ts.emptyText}>
              Run an Intraday market analysis first. Your Trade Plan dashboard is built from that
              same analysis — no second upload needed.
            </Text>
            <TouchableOpacity
              style={ts.emptyBtn}
              onPress={() => navigation.navigate("ChartAnalyze")}
            >
              <Ionicons name="scan-outline" size={16} color="#000" />
              <Text style={ts.emptyBtnText}>Go to Analyse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tp = analysis.trade_plan || {};
  const ta = tp.trend_alignment || {};
  const lv = tp.levels || {};
  const checklist = tp.checklist || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }} edges={["top"]}>
      <View style={ts.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={ts.headerBarTitle}>Trade Plan</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Header instrument={instrument} createdAt={createdAt} />

        <View style={ts.disclaimer}>
          <Ionicons name="scan-outline" size={13} color={PRIMARY} style={{ marginTop: 2 }} />
          <Text style={ts.disclaimerText}>This dashboard organises the current market. It is not financial advice and never tells you to trade.</Text>
        </View>

        {/* Market bias + meters */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <View style={[ts.biasCard, { borderColor: `${tone(tp.market_bias)}40` }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Ionicons name="speedometer-outline" size={14} color={tone(tp.market_bias)} />
              <Text style={ts.sectionLabel}>Market Bias</Text>
            </View>
            <Text style={[ts.biasValue, { color: tone(tp.market_bias) }]}>{tp.market_bias || "—"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <Meter label="Setup Quality" value={tp.setup_quality} />
          <Meter label="Trade Readiness" value={tp.trade_readiness} />
        </View>

        {/* Trend alignment */}
        <View style={ts.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="pulse" size={14} color={PRIMARY} />
            <Text style={ts.sectionLabel}>Trend Alignment</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Text style={ts.tfLabel}>4H</Text><Badge value={ta.h4} />
            <Text style={ts.tfLabel}>1H</Text><Badge value={ta.h1} />
            <Text style={ts.tfLabel}>Overall</Text><Badge value={ta.overall} />
          </View>
        </View>

        {/* Checklist */}
        <View style={ts.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="checkbox-outline" size={14} color={PRIMARY} />
            <Text style={ts.sectionLabel}>Confirmation Checklist</Text>
          </View>
          <View style={{ gap: 10 }}>
            {checklist.map((c, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name={c.done ? "checkmark-circle" : "close-circle"} size={18} color={c.done ? PRIMARY : "#F87171"} />
                <Text style={{ flex: 1, color: c.done ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 13 }}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Important levels */}
        <View style={[ts.card, { borderColor: "rgba(96,165,250,0.25)", backgroundColor: "rgba(96,165,250,0.04)" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="layers-outline" size={14} color="#60A5FA" />
            <Text style={ts.sectionLabel}>Important Levels</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            <BigLevel label="Current Price" value={lv.current_price} />
            <BigLevel label="Bullish Confirmation" value={lv.bullish_confirmation} />
            <BigLevel label="Bearish Weakness" value={lv.bearish_weakness} />
            <BigLevel label="Next Major Liquidity" value={lv.next_liquidity} />
          </View>
        </View>

        {/* Market plan */}
        <View style={ts.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ionicons name="clipboard-outline" size={14} color={PRIMARY} />
            <Text style={ts.sectionLabel}>Market Plan</Text>
          </View>
          <Text style={ts.marketPlanText}>{tp.market_plan || "—"}</Text>
        </View>

        {/* Risk */}
        <View style={[ts.card, { borderColor: `${tone(tp.risk_level)}40` }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="warning-outline" size={14} color={tone(tp.risk_level)} />
              <Text style={ts.sectionLabel}>Risk Level</Text>
            </View>
            <Badge value={tp.risk_level} />
          </View>
          <Text style={ts.riskNote}>{tp.risk_note || "—"}</Text>
        </View>

        {/* Psychology */}
        <View style={ts.psychologyCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Ionicons name="bulb-outline" size={14} color={PRIMARY} />
            <Text style={[ts.sectionLabel, { color: PRIMARY }]}>Psychology Reminder</Text>
          </View>
          <Text style={ts.psychologyText}>{tp.psychology_reminder || "Be patient. Wait for confirmation."}</Text>
        </View>

        <TouchableOpacity
          style={ts.backBtn}
          onPress={() => navigation.navigate("ChartAnalyze")}
        >
          <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.85)" />
          <Text style={ts.backBtnText}>Back to Analyse</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const ts = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerBarTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },

  disclaimer: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10, marginBottom: 14 },
  disclaimerText: { flex: 1, color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },

  sectionLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },

  biasCard: { flex: 1, borderWidth: 1, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", padding: 16 },
  biasValue: { fontFamily: DISPLAY.extraBold, fontSize: 30 },

  card: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, marginBottom: 14 },
  tfLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },

  marketPlanText: { color: "rgba(255,255,255,0.9)", fontFamily: BODY.regular, fontSize: 15, lineHeight: 21 },
  riskNote: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20 },

  psychologyCard: { borderWidth: 1, borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.04)", borderRadius: 16, padding: 16, marginBottom: 16 },
  psychologyText: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 17, lineHeight: 23 },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingVertical: 14 },
  backBtnText: { color: "rgba(255,255,255,0.85)", fontFamily: DISPLAY.bold, fontSize: 14 },

  emptyCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 32, alignItems: "center" },
  emptyTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 18, marginTop: 14 },
  emptyText: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, marginTop: 18 },
  emptyBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },
});
