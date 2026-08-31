/**
 * OneClickAnalysisScreen — mobile port of web src/pages/dashboard/OneClickAnalysis.jsx
 *
 * Web's report chart (src/components/ChartRenderer.jsx) uses "lightweight-charts", a browser
 * canvas library with no React Native equivalent. Rather than embedding a charting library in a
 * WebView, this ports web's OWN alternate plain-SVG candlestick algorithm — the CandleChart
 * function present in this exact web file (lines 632-675) but unused there in favor of
 * ChartRenderer — to react-native-svg (already a project dependency). Same coordinate math, same
 * candle/level rendering; only the crosshair-follow OHLC readout and fullscreen toggle (features
 * specific to the canvas-library implementation, not present in web's own SVG alternative either)
 * are not ported.
 *
 * Web's session persistence (TradingSessionContext) is Redux + localStorage, restoring a session
 * by id after a reload via GET /journal/analyses/{id}. Traced its buildSession()/openSession(): a
 * fresh oneclick-analyze job response is spread as `{...jobResponse, style:"oneclick"}` into
 * buildSession(), which reads `d.id` — but the job endpoint returns `job_id`, and the analyses
 * detail endpoint returns `analysis_id`, never a plain `id` field (confirmed directly from
 * ChartAnalysisService.java's getJob/getAnalysis). So `session.id` is undefined in both paths and
 * the `if (s.id) localStorage.setItem(...)` line never actually persists anything — this
 * cross-reload restore is inert on web itself. Porting a working version of it would exceed web's
 * actual behavior, so this screen keeps the report in plain component state (equivalent to what
 * Redux's in-memory store actually provides) without inventing a functioning AsyncStorage-based
 * restore that web's own code doesn't have.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Line, Rect, G, Text as SvgText } from "react-native-svg";

import { journalApi } from "../src/api/journal";
import { useAlert } from "../src/context/AlertContext";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { PRIMARY, RED, AMBER, GRAY, tone, Badge, Section } from "../components/analysis/AnalysisShared";

// Same list/copy as web OneClickAnalysis.jsx.
const GOALS = [
  { id: "intraday", label: "Intraday" },
  { id: "swing", label: "Swing Trade" },
  { id: "investment", label: "Long-Term Investment" },
];
const TYPES = [
  { id: "technical", label: "Technical" },
  { id: "fundamental", label: "Fundamental" },
  { id: "both", label: "Technical + Fundamental" },
];
const STEPS = [
  "Loading live market data…",
  "Reading multi-timeframe trend…",
  "Mapping key levels & liquidity…",
  "Checking structure & phase…",
  "Scoring setup quality…",
  "Writing your report…",
];
const POPULAR = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD"];

function Evidence({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <View style={{ marginBottom: 10, gap: 6 }}>
      {items.map((e, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <Ionicons name="checkmark-circle" size={15} color={PRIMARY} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 18 }}>{e}</Text>
        </View>
      ))}
    </View>
  );
}

function Conclusion({ text, watch, watchLabel = "What to watch next" }) {
  return (
    <>
      {!!text && <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: BODY.medium, fontSize: 14, lineHeight: 20 }}>{text}</Text>}
      {!!watch && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, borderWidth: 1, borderColor: "rgba(96,165,250,0.25)", backgroundColor: "rgba(96,165,250,0.06)", borderRadius: 8, padding: 10 }}>
          <Text style={{ color: "#60A5FA", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" }}>{watchLabel}</Text>
          <Text style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 18 }}>{watch}</Text>
        </View>
      )}
    </>
  );
}

function Stars({ n = 0 }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 13, color: i <= n ? AMBER : "rgba(255,255,255,0.18)" }}>★</Text>
      ))}
    </View>
  );
}

// react-native-svg port of web's own (unused-in-favor-of-ChartRenderer) CandleChart algorithm.
function CandleChart({ candles = [], levels = [], precision = 2, height = 220 }) {
  const data = (candles || []).filter((c) => c.h != null && c.l != null);
  if (data.length === 0) {
    return (
      <View style={[ccs.empty, { height: Math.min(height, 100) }]}>
        <Text style={ccs.emptyText}>Chart data unavailable</Text>
      </View>
    );
  }
  const W = 340, H = 200, padR = 56, padL = 4, padT = 8, padB = 10;
  const prices = [];
  data.forEach((c) => prices.push(c.h, c.l));
  (levels || []).forEach((l) => l.price != null && prices.push(Number(l.price)));
  let min = Math.min(...prices), max = Math.max(...prices);
  const pad = (max - min) * 0.06 || max * 0.001 || 1;
  min -= pad; max += pad;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const x = (i) => padL + (plotW * (i + 0.5)) / data.length;
  const y = (p) => padT + plotH * (1 - (p - min) / (max - min));
  const cw = Math.max(1.5, Math.min(10, (plotW / data.length) * 0.6));
  const fmt = (v) => Number(v).toFixed(precision);

  return (
    <View style={{ height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {(levels || []).map((l, i) => {
          if (l.price == null) return null;
          const ly = y(Number(l.price));
          if (ly < padT || ly > padT + plotH) return null;
          const color = l.color || "#60A5FA";
          return (
            <G key={`lvl-${i}`}>
              <Line x1={padL} y1={ly} x2={W - padR} y2={ly} stroke={color} strokeWidth="1" strokeDasharray="4,4" opacity={0.6} />
              <SvgText x={W - padR + 4} y={ly - 3} fill={color} fontSize="7">{l.label || ""}</SvgText>
              <SvgText x={W - padR + 4} y={ly + 9} fill={color} fontSize="9">{fmt(l.price)}</SvgText>
            </G>
          );
        })}
        {data.map((c, i) => {
          const up = c.c >= c.o;
          const col = up ? PRIMARY : RED;
          const cx = x(i);
          const yo = y(c.o), yc = y(c.c);
          const bodyTop = Math.min(yo, yc);
          const bodyH = Math.max(1, Math.abs(yc - yo));
          return (
            <G key={i}>
              <Line x1={cx} y1={y(c.h)} x2={cx} y2={y(c.l)} stroke={col} strokeWidth="1" />
              <Rect x={cx - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={col} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
const ccs = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 8 },
  emptyText: { color: "rgba(255,255,255,0.35)", fontFamily: MONO.regular, fontSize: 11 },
});

const ALIGN_DIR = {
  bullish: { color: PRIMARY, label: "Bullish" },
  bearish: { color: RED, label: "Bearish" },
  neutral: { color: AMBER, label: "Neutral" },
  unknown: { color: GRAY, label: "No Data" },
};
function classifyTrend(trend) {
  const s = String(trend || "").toLowerCase();
  if (!s) return "unknown";
  if (s.includes("bull")) return "bullish";
  if (s.includes("bear")) return "bearish";
  if (/(side|consol|neutral|range|mixed|chop|balance|pullback|pause)/.test(s)) return "neutral";
  return "unknown";
}

function AlignmentMeter({ higher, lower }) {
  const rows = [
    ...((higher?.timeframes) || []).map((t) => ({ tf: t.tf, trend: t.trend, group: "higher" })),
    ...((lower?.timeframes) || []).map((t) => ({ tf: t.tf, trend: t.trend, group: "lower" })),
  ];
  if (rows.length === 0) return null;
  const items = rows.map((r) => ({ ...r, dir: classifyTrend(r.trend) }));
  const total = items.length;
  const count = (d) => items.filter((i) => i.dir === d).length;
  const bull = count("bullish"), bear = count("bearish");
  const dominant = bull > bear ? "bullish" : bear > bull ? "bearish" : "neutral";
  const agreed = Math.max(bull, bear);
  const ratio = total ? agreed / total : 0;
  let strength = "No Alignment";
  if (dominant !== "neutral") strength = ratio >= 0.83 ? "Strong" : ratio >= 0.6 ? "Moderate" : "Weak";
  const strengthColor = strength === "Strong" ? PRIMARY : strength === "Moderate" ? AMBER : GRAY;
  const groupDom = (g) => {
    const sub = items.filter((i) => i.group === g);
    const b = sub.filter((i) => i.dir === "bullish").length;
    const br = sub.filter((i) => i.dir === "bearish").length;
    return b > br ? "bullish" : br > b ? "bearish" : "neutral";
  };
  const hd = groupDom("higher"), ld = groupDom("lower");
  const word = (d) => ALIGN_DIR[d].label.toLowerCase();
  let explanation;
  if (hd === ld && hd !== "neutral") {
    explanation = `Higher and lower timeframes both lean ${word(hd)} — they agree on direction, which makes the prevailing trend more reliable than when they conflict.`;
  } else if (hd !== "neutral" && ld !== "neutral" && hd !== ld) {
    explanation = `The higher timeframes remain ${word(hd)}, but the lower timeframes are turning ${word(ld)}. This creates a temporary conflict rather than a confirmed trend reversal.`;
  } else if (hd !== "neutral" && ld === "neutral") {
    explanation = `Higher timeframes are ${word(hd)} while lower timeframes are consolidating — momentum is pausing within the larger trend, not reversing.`;
  } else if (hd === "neutral" && ld !== "neutral") {
    explanation = `Higher timeframes are still consolidating while lower timeframes turn ${word(ld)} — an early move the bigger picture has not confirmed yet.`;
  } else {
    explanation = "Most timeframes are consolidating, so there is no clear directional edge right now — patience is favoured until structure breaks.";
  }

  return (
    <View style={am.wrap}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Ionicons name="pulse" size={14} color={PRIMARY} />
        <Text style={am.eyebrow}>Multi-Timeframe Alignment</Text>
      </View>
      <Text style={am.sub}>Do the timeframes agree on direction?</Text>
      <View style={am.strip}>
        {items.map((it, i) => {
          const c = ALIGN_DIR[it.dir].color;
          return (
            <View key={i} style={[am.cell, { borderColor: `${c}40` }]}>
              <Text style={am.cellTf}>{it.tf}</Text>
              <View style={[am.dot, { backgroundColor: c }]} />
              <Text style={[am.cellLabel, { color: c }]}>{ALIGN_DIR[it.dir].label}</Text>
            </View>
          );
        })}
      </View>
      <View style={am.footer}>
        <View>
          <Text style={am.footerLabel}>Overall Alignment</Text>
          <Text style={[am.overall, { color: ALIGN_DIR[dominant].color }]}>
            {dominant === "neutral" ? "No clear bias" : `${agreed} / ${total} ${ALIGN_DIR[dominant].label}`}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={am.footerLabel}>Alignment Strength</Text>
          <View style={[am.strengthChip, { borderColor: strengthColor, backgroundColor: `${strengthColor}1f` }]}>
            <Text style={[am.strengthText, { color: strengthColor }]}>{strength}</Text>
          </View>
        </View>
      </View>
      <Text style={am.explanation}>{explanation}</Text>
    </View>
  );
}
const am = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(10,10,10,0.8)", padding: 16, marginBottom: 14 },
  eyebrow: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  sub: { color: "rgba(255,255,255,0.45)", fontFamily: BODY.regular, fontSize: 12, marginTop: 4, marginBottom: 12 },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "30%", borderWidth: 1, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.3)", paddingVertical: 10, alignItems: "center", gap: 4 },
  cellTf: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 8, textTransform: "uppercase" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cellLabel: { fontFamily: MONO.regular, fontSize: 8, fontWeight: "700", textTransform: "uppercase" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  footerLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  overall: { fontFamily: DISPLAY.extraBold, fontSize: 18 },
  strengthChip: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  strengthText: { fontFamily: MONO.regular, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  explanation: { color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, marginTop: 12 },
});

function TFCard({ tf, precision, kind }) {
  const isHigher = kind === "higher";
  const meta = isHigher ? tf.structure : tf.confirmation;
  const grade = isHigher ? tf.strength : tf.momentum;
  const metaLabel = isHigher ? "Structure" : "Confirmation";
  return (
    <View style={tfc.card}>
      <View style={tfc.header}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flex: 1 }}>
          <Text style={tfc.tf}>{tf.tf}</Text>
          {!!grade && <Text style={tfc.grade}>{grade} {isHigher ? "strength" : "momentum"}</Text>}
        </View>
        <Badge value={tf.trend} />
      </View>
      {tf.candles && tf.candles.length > 0 ? (
        <CandleChart candles={tf.candles} levels={tf.annotations || []} precision={precision} height={200} />
      ) : (
        <View style={ccs.empty}><Text style={ccs.emptyText}>Chart data unavailable</Text></View>
      )}
      <View style={{ marginTop: 12 }}>
        {!!meta && (
          <Text style={tfc.metaLabel}>{metaLabel}: <Text style={tfc.metaValue}>{meta}</Text></Text>
        )}
        <Text style={[tfc.metaLabel, { color: "rgba(57,255,20,0.7)", marginTop: 8 }]}>Evidence</Text>
        <Evidence items={tf.evidence} />
        {!!tf.narrative && (
          <>
            <Text style={[tfc.metaLabel, { marginTop: 4 }]}>Conclusion</Text>
            <Text style={tfc.narrative}>{tf.narrative}</Text>
          </>
        )}
      </View>
    </View>
  );
}
const tfc = StyleSheet.create({
  card: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, backgroundColor: "rgba(0,0,0,0.3)", padding: 14, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  tf: { color: "#fff", fontFamily: MONO.regular, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  grade: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase" },
  metaLabel: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  metaValue: { color: "rgba(255,255,255,0.7)", fontFamily: BODY.regular, fontSize: 12, textTransform: "none" },
  narrative: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, marginTop: 4 },
});

function TimeframeReport({ kind, n, title, question, data, precision }) {
  if (!data || (data.timeframes || []).length === 0) return null;
  const accent = tone(data.context);
  const isHigher = kind === "higher";
  const tfs = data.timeframes || [];
  return (
    <Section
      icon={isHigher ? "trending-up" : "pulse"}
      n={n}
      title={title}
      question={question}
      accent={accent}
      right={
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Badge value={data.context} />
          {isHigher && !!data.confidence && <Badge value={`${data.confidence} conf`} />}
        </View>
      }
    >
      {(data.summary || []).length > 0 && (
        <View style={{ gap: 6, marginBottom: 12 }}>
          {data.summary.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent, marginTop: 7 }} />
              <Text style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 18 }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Per-timeframe summary table — matches web OneClickAnalysis.jsx:513-526 exactly
          (TF / Trend / Strength-or-Mom. / Structure-or-Confirm / Ev). */}
      <View style={tfr.table}>
        <View style={tfr.headerRow}>
          <Text style={[tfr.headerCell, tfr.colTf]}>TF</Text>
          <Text style={[tfr.headerCell, tfr.colTrend]}>Trend</Text>
          <Text style={[tfr.headerCell, tfr.colMid]}>{isHigher ? "Strength" : "Mom."}</Text>
          <Text style={[tfr.headerCell, tfr.colMid]}>{isHigher ? "Structure" : "Confirm"}</Text>
          <Text style={[tfr.headerCell, tfr.colEv]}>Ev</Text>
        </View>
        {tfs.map((t, i) => (
          <View key={i} style={tfr.row}>
            <Text style={[tfr.cell, tfr.colTf, { color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular }]}>{t.tf}</Text>
            <Text style={[tfr.cell, tfr.colTrend, { color: tone(t.trend), fontWeight: "700" }]} numberOfLines={1}>{t.trend}</Text>
            <Text style={[tfr.cell, tfr.colMid, { color: "rgba(255,255,255,0.7)" }]}>{isHigher ? t.strength : t.momentum}</Text>
            <Text style={[tfr.cell, tfr.colMid, { color: "rgba(255,255,255,0.55)" }]} numberOfLines={1}>{isHigher ? t.structure : t.confirmation}</Text>
            <Text style={[tfr.cell, tfr.colEv, { color: PRIMARY, fontWeight: "700" }]}>{t.evidence_count}</Text>
          </View>
        ))}
      </View>

      {tfs.map((t, i) => <TFCard key={i} tf={t} precision={precision} kind={kind} />)}
    </Section>
  );
}

const tfr = StyleSheet.create({
  table: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  headerRow: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.04)" },
  headerCell: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  cell: { fontSize: 11 },
  colTf: { width: 32 },
  colTrend: { flex: 1 },
  colMid: { flex: 1 },
  colEv: { width: 24, textAlign: "right" },
});

function ScenarioCard({ title, color, data = {}, note, strongest }) {
  return (
    <View style={[scc.card, strongest && { borderColor: color, backgroundColor: `${color}0f` }]}>
      <View style={scc.header}>
        <Text style={[scc.title, { color }]}>{title}</Text>
        {strongest && (
          <View style={[scc.strongestChip, { backgroundColor: color }]}>
            <Text style={scc.strongestText}>Strongest</Text>
          </View>
        )}
      </View>
      {note ? (
        <Text style={scc.note}>{note}</Text>
      ) : (
        <>
          {(Array.isArray(data.evidence) ? data.evidence : []).map((e, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 6 }} />
              <Text style={scc.evidenceText}>{e}</Text>
            </View>
          ))}
          {!!data.confirmation && (
            <Text style={scc.confirmation}>
              <Text style={{ color: "rgba(255,255,255,0.4)" }}>Strengthened if: </Text>{data.confirmation}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
const scc = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 16, padding: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontFamily: DISPLAY.bold, fontSize: 13 },
  strongestChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  strongestText: { color: "#0a0a0a", fontFamily: MONO.regular, fontSize: 8, textTransform: "uppercase", fontWeight: "700" },
  note: { color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 12.5, lineHeight: 18 },
  evidenceText: { flex: 1, color: "rgba(255,255,255,0.7)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },
  confirmation: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
});

function nf(v, prec) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  if (isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: prec, maximumFractionDigits: prec });
}

const IMPACT_COLOR = { "Very High": RED, High: "#FB923C", Medium: AMBER, Low: GRAY };

function OneClickReport({ session, onNew, navigation }) {
  const a = session.analysis || {};
  const md = a.market_data || {};
  const prec = md.precision ?? a.chart?.precision ?? 2;
  const tr = a.trend || {}, st = a.structure || {}, kl = a.key_levels || {}, ph = a.market_phase || {},
    vol = a.volume || {}, mr = a.market_risk || {}, sc = a.scenarios || {}, ql = a.quality || {}, tp = a.trade_plan || {};
  const pc = md.percent_change;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Hero */}
      <View style={rs.hero}>
        <View>
          <View style={rs.chip}>
            <Ionicons name="flash" size={11} color={PRIMARY} />
            <Text style={rs.chipText}>{(a.goal || "intraday")} · {(a.analysis_type || "both").replace("both", "technical + fundamental")}</Text>
          </View>
          <Text style={rs.instrument}>{a.instrument} <Text style={rs.symbol}>{a.symbol}</Text></Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={rs.price}>{nf(md.price, prec)}</Text>
          {pc != null && (
            <Text style={[rs.pct, { color: pc >= 0 ? PRIMARY : RED }]}>{pc >= 0 ? "+" : ""}{pc}%</Text>
          )}
        </View>
      </View>

      {/* Hero chart */}
      {a.chart?.candles?.length > 0 && (
        <View style={rs.chartCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={rs.chartLabel}>Live Chart · {a.chart.tf}</Text>
            <Text style={rs.chartHint}>Real data · key levels shown</Text>
          </View>
          <CandleChart candles={a.chart.candles} levels={a.chart.levels || []} precision={prec} height={220} />
        </View>
      )}

      <View style={rs.disclaimer}>
        <Ionicons name="scan-outline" size={13} color={PRIMARY} style={{ marginTop: 2 }} />
        <Text style={rs.disclaimerText}>Evidence-based market report from live data. Not financial advice and never a buy/sell signal — the decision is always yours.</Text>
      </View>

      <AlignmentMeter higher={a.higher_tf} lower={a.lower_tf} />

      <TimeframeReport kind="higher" n={1} title="Higher Timeframe Analysis" question="Where is the overall market heading?" data={a.higher_tf} precision={prec} />
      <TimeframeReport kind="lower" n={2} title="Lower Timeframe Analysis" question="What is the current trading environment?" data={a.lower_tf} precision={prec} />

      <Section icon="git-branch-outline" n={3} title="Market Structure" question="Has the market confirmed its direction?" accent={tone(st.state)} right={<Badge value={st.state} />}>
        {!!st.observation && <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>{st.observation}</Text>}
        <Evidence items={st.evidence} />
        <Conclusion text={st.conclusion} watch={st.what_next} watchLabel="What needs to happen next" />
      </Section>

      <Section icon="layers-outline" n={4} title="Key Levels" question="Where is the market most likely to react?" accent="#60A5FA">
        <View style={{ gap: 8 }}>
          {(Array.isArray(kl.items) ? kl.items : []).map((it, i) => (
            <View key={i} style={rs.levelItem}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={rs.levelPrice}>{nf(it.price, prec)}</Text>
                  <Text style={rs.levelLabel} numberOfLines={1}>{it.label}</Text>
                </View>
                <View style={[rs.impactChip, { backgroundColor: `${IMPACT_COLOR[it.importance] || GRAY}1f` }]}>
                  <Text style={[rs.impactText, { color: IMPACT_COLOR[it.importance] || GRAY }]}>{it.importance}</Text>
                </View>
              </View>
              <Text style={rs.levelWhy}>{it.why}</Text>
            </View>
          ))}
        </View>
        {!!kl.note && <Text style={rs.sectionNote}>{kl.note}</Text>}
      </Section>

      <Section icon="sunny-outline" n={5} title="Market Phase" question="Where is the market in its cycle?" accent={tone(ph.phase)} right={<Badge value={ph.phase} />}>
        <Evidence items={ph.evidence} />
        <Text style={rs.sectionNote}>{ph.note}</Text>
      </Section>

      <Section icon="bar-chart-outline" n={6} title="Volume Analysis" question="Is pressure building or fading?" accent={vol.available ? "#A78BFA" : GRAY}>
        {vol.available ? (
          <>
            <Evidence items={vol.evidence} />
            <Text style={rs.sectionNote}>{vol.note}</Text>
          </>
        ) : (
          <Text style={[rs.sectionNote, { color: "rgba(255,255,255,0.55)" }]}>{vol.note || "Volume data is not available for this market."}</Text>
        )}
      </Section>

      <Section icon="warning-outline" n={7} title="Market Risk" question="What could reduce confidence?" accent={tone(mr.level)} right={<Badge value={mr.level} />}>
        {Array.isArray(mr.events) && mr.events.length > 0 && (
          <View style={rs.eventsTable}>
            <View style={rs.eventHeaderRow}>
              <Text style={rs.eventHeaderText}>When</Text>
              <Text style={rs.eventHeaderText}>Event</Text>
              <Text style={rs.eventHeaderText}>Impact</Text>
            </View>
            {mr.events.map((e, i) => (
              <View key={i} style={rs.eventRow}>
                <Text style={rs.eventWhen}>{e.when}{e.time ? ` · ${e.time}` : ""}</Text>
                <Text style={rs.eventName} numberOfLines={2}>{e.name}</Text>
                <Text style={[rs.eventImpact, { color: tone(e.impact) }]}>{e.impact}</Text>
              </View>
            ))}
          </View>
        )}
        {typeof mr.events === "string" && mr.events.trim() && (
          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>{mr.events}</Text>
        )}
        {Array.isArray(mr.conditions) && mr.conditions.length > 0 && <Evidence items={mr.conditions} />}
        <Text style={rs.sectionNote}>{mr.note}</Text>
      </Section>

      {/* Scenarios */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ionicons name="git-branch" size={14} color={PRIMARY} />
          <Text style={rs.scenariosLabel}>8. Market Scenarios</Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ScenarioCard title="Bullish Context" color={PRIMARY} data={sc.bullish} strongest={sc.strongest === "Bullish"} />
            <ScenarioCard title="Bearish Context" color={RED} data={sc.bearish} strongest={sc.strongest === "Bearish"} />
          </View>
          <ScenarioCard title="Neutral / Patience" color={AMBER} data={{ evidence: [] }} note={sc.neutral?.note} strongest={sc.strongest === "Neutral"} />
        </View>
        <Text style={rs.scenariosFooter}>
          Strongest current evidence: <Text style={{ fontWeight: "700", color: tone(sc.strongest) }}>{sc.strongest}</Text> Context. This is evidence, not a signal.
        </Text>
      </View>

      {/* Overall quality */}
      <View style={rs.qualityCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="speedometer-outline" size={14} color={PRIMARY} />
            <Text style={rs.scenariosLabel}>9. Overall Market Quality</Text>
          </View>
          <Text style={[rs.overallScore, { color: (ql.overall || 0) >= 7 ? PRIMARY : (ql.overall || 0) >= 4 ? AMBER : RED }]}>
            {ql.overall ?? "—"}<Text style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>/10</Text>
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {Object.entries(ql.dimensions || {}).map(([k, d]) => (
            <View key={k} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Text style={rs.dimensionKey}>{k}</Text>
              <Stars n={d.stars} />
              <Text style={rs.dimensionReason}>{d.reason}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* For you */}
      <View style={rs.forYouCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Ionicons name="bulb-outline" size={14} color={PRIMARY} />
          <Text style={[rs.scenariosLabel, { color: PRIMARY }]}>For You</Text>
        </View>
        <Text style={rs.forYouText}>{a.for_you || tp.psychology_reminder || "Stay patient. Protect your capital. Wait for confirmation."}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity
          style={rs.tradePlanBtn}
          onPress={() => navigation.navigate("TradePlan", { analysis: a })}
        >
          <Ionicons name="arrow-forward" size={15} color="#000" />
          <Text style={rs.tradePlanBtnText}>Open Trade Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={rs.newBtn} onPress={onNew}>
          <Ionicons name="refresh" size={15} color="rgba(255,255,255,0.85)" />
          <Text style={rs.newBtnText}>New Analysis</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const rs = StyleSheet.create({
  hero: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", borderRadius: 16, backgroundColor: "rgba(57,255,20,0.04)", padding: 16, marginBottom: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 8 },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  instrument: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 20 },
  symbol: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  price: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 24 },
  pct: { fontFamily: MONO.regular, fontSize: 13, fontWeight: "700", marginTop: 2 },

  chartCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", padding: 14, marginBottom: 14 },
  chartLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  chartHint: { color: "rgba(255,255,255,0.35)", fontFamily: MONO.regular, fontSize: 8 },

  disclaimer: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10, marginBottom: 14 },
  disclaimerText: { flex: 1, color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },

  levelItem: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10 },
  levelPrice: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 15 },
  levelLabel: { flex: 1, color: "rgba(255,255,255,0.7)", fontFamily: BODY.regular, fontSize: 13 },
  impactChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  impactText: { fontFamily: MONO.regular, fontSize: 8, fontWeight: "700", textTransform: "uppercase" },
  levelWhy: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },
  sectionNote: { color: "rgba(255,255,255,0.8)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20, marginTop: 8 },

  eventsTable: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  eventHeaderRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.04)" },
  eventHeaderText: { flex: 1, color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  eventRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  eventWhen: { width: 70, color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 10 },
  eventName: { flex: 1, color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 12 },
  eventImpact: { width: 50, fontFamily: MONO.regular, fontSize: 8, fontWeight: "700", textTransform: "uppercase", textAlign: "right" },

  scenariosLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  scenariosFooter: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 11, marginTop: 10 },

  qualityCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, marginBottom: 14 },
  overallScore: { fontFamily: DISPLAY.extraBold, fontSize: 26 },
  dimensionKey: { width: 72, color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  dimensionReason: { flex: 1, color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },

  forYouCard: { borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.05)", borderRadius: 16, padding: 16, marginBottom: 16 },
  forYouText: { color: "rgba(255,255,255,0.9)", fontFamily: BODY.regular, fontSize: 15, lineHeight: 22 },

  tradePlanBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 13 },
  tradePlanBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },
  newBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingVertical: 13 },
  newBtnText: { color: "rgba(255,255,255,0.85)", fontFamily: DISPLAY.bold, fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen — wizard + polling + report
// ─────────────────────────────────────────────────────────────────────────────
export default function OneClickAnalysisScreen({ navigation }) {
  const { showAlert } = useAlert();

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [goal, setGoal] = useState("intraday");
  const [atype, setAtype] = useState("both");
  const [analyzing, setAnalyzing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [recent, setRecent] = useState([]);
  const [session, setSession] = useState(null);
  const stepTimer = useRef(null);
  const searchTimer = useRef(null);

  const fetchRecent = async () => {
    try {
      const { data } = await journalApi.analyses();
      setRecent(
        (data || [])
          .filter((it) => it.style === "oneclick")
          .slice(0, 6)
      );
    } catch {
      /* ignore, matches web's silent catch */
    }
  };
  useEffect(() => { fetchRecent(); }, []);

  // Debounced symbol search — mirrors web exactly (350ms debounce, min 2 chars).
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query || query.length < 2 || picked?.symbol === query) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await journalApi.marketSearch(query);
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [query, picked]);

  const pollJob = (jobId) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 180000;
    const tick = async () => {
      try {
        const { data } = await journalApi.oneclickJob(jobId);
        if (data.status === "done") return resolve(data);
        if (data.status === "error") return reject(new Error(data.error_message || "Could not analyse this market."));
        if (Date.now() > deadline) return reject(new Error("Analysis is taking longer than usual. Please try again."));
        setTimeout(tick, 3000);
      } catch (e) {
        reject(e);
      }
    };
    tick();
  });

  const analyze = async () => {
    const symbol = picked?.symbol || query.trim();
    if (!symbol) {
      showAlert({ type: "warning", title: "Choose a market", message: "Choose a market first." });
      return;
    }
    setAnalyzing(true);
    setStepIdx(0);
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)), 1800);
    const started = Date.now();
    try {
      const { data } = await journalApi.oneclickAnalyze(symbol, goal, atype, "en");
      const done = await pollJob(data.job_id);
      const elapsed = Date.now() - started;
      if (elapsed < 7000) await new Promise((r) => setTimeout(r, 7000 - elapsed));
      setSession({ analysis: done.analysis, style: "oneclick" });
      fetchRecent();
      showAlert({ type: "success", title: "Report Ready", message: "Market report ready." });
    } catch (e) {
      if (e?.response?.status === 402) {
        showAlert({ type: "warning", title: "No credits left", message: "No analysis credits left. Buy a pack to continue." });
      } else {
        showAlert({
          type: "error",
          title: "Error",
          message: e?.message || e?.response?.data?.detail || "Could not analyse this market.",
        });
      }
    } finally {
      if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
      setAnalyzing(false);
    }
  };

  const startNew = () => {
    setSession(null);
    setPicked(null);
    setQuery("");
    setResults([]);
  };

  const openRecent = async (item) => {
    try {
      const { data } = await journalApi.analysis(item.analysis_id);
      setSession({ analysis: data.analysis, style: "oneclick" });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not load this report." });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }} edges={["top"]}>
      <View style={ws.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={ws.headerTitle}>One-Click Analysis</Text>
        <View style={{ width: 22 }} />
      </View>

      {analyzing ? (
        <View style={ws.loadingWrap}>
          {STEPS.map((s, i) => (
            <View key={i} style={[ws.stepRow, { opacity: i <= stepIdx ? 1 : 0.3 }]}>
              {i < stepIdx ? (
                <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
              ) : i === stepIdx ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Ionicons name="ellipse-outline" size={18} color="rgba(255,255,255,0.3)" />
              )}
              <Text style={[ws.stepText, { color: i === stepIdx ? PRIMARY : i < stepIdx ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : session ? (
        <OneClickReport session={session} onNew={startNew} navigation={navigation} />
      ) : (
        <ScrollView contentContainerStyle={ws.wizardBody} keyboardShouldPersistTaps="handled">
          <View style={ws.chip}>
            <Ionicons name="flash" size={11} color={PRIMARY} />
            <Text style={ws.chipText}>One-Click Analysis</Text>
          </View>
          <Text style={ws.title}>Instant market <Text style={{ color: PRIMARY }}>intelligence.</Text></Text>
          <Text style={ws.subtitle}>No charts to upload. Pick a market, choose your goal, and get a complete professional report from live data in seconds.</Text>

          {/* Step 1 — market */}
          <View style={ws.stepCard}>
            <View style={ws.stepLabelRow}>
              <View style={ws.stepNum}><Text style={ws.stepNumText}>1</Text></View>
              <Text style={ws.stepLabelText}>Choose your market</Text>
            </View>
            <View style={{ position: "relative", marginTop: 10 }}>
              <TextInput
                value={picked ? `${picked.symbol}${picked.name ? " — " + picked.name : ""}` : query}
                onChangeText={(v) => { setPicked(null); setQuery(v); }}
                placeholder="Search e.g. XAUUSD, EURUSD, BTCUSD, AAPL…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="characters"
                autoCorrect={false}
                style={ws.searchInput}
              />
              {searching && <ActivityIndicator size="small" color={PRIMARY} style={ws.searchSpinner} />}
              {(picked || query) && !searching && (
                <TouchableOpacity style={ws.searchClear} onPress={() => { setPicked(null); setQuery(""); setResults([]); }}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
              {results.length > 0 && !picked && (
                <View style={ws.resultsBox}>
                  {results.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={ws.resultRow}
                      onPress={() => { setPicked(r); setQuery(r.symbol); setResults([]); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={ws.resultSymbol}>{r.symbol}</Text>
                        <Text style={ws.resultName} numberOfLines={1}>{r.name}</Text>
                      </View>
                      <Text style={ws.resultType}>{r.type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={ws.popularRow}>
              {POPULAR.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[ws.popularChip, picked?.symbol === s && ws.popularChipActive]}
                  onPress={() => { setPicked({ symbol: s, name: "", type: "" }); setQuery(s); setResults([]); }}
                >
                  <Text style={[ws.popularChipText, picked?.symbol === s && ws.popularChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Step 2 — goal */}
          <View style={ws.stepCard}>
            <View style={ws.stepLabelRow}>
              <View style={ws.stepNum}><Text style={ws.stepNumText}>2</Text></View>
              <Text style={ws.stepLabelText}>What are you looking for?</Text>
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[ws.optionBtn, goal === g.id && ws.optionBtnActive]}
                  onPress={() => setGoal(g.id)}
                >
                  <Text style={[ws.optionBtnText, goal === g.id && ws.optionBtnTextActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Step 3 — type */}
          <View style={ws.stepCard}>
            <View style={ws.stepLabelRow}>
              <View style={ws.stepNum}><Text style={ws.stepNumText}>3</Text></View>
              <Text style={ws.stepLabelText}>Analysis type</Text>
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {TYPES.map((tp) => (
                <TouchableOpacity
                  key={tp.id}
                  style={[ws.optionBtn, atype === tp.id && ws.optionBtnActive]}
                  onPress={() => setAtype(tp.id)}
                >
                  <Text style={[ws.optionBtnText, atype === tp.id && ws.optionBtnTextActive]}>{tp.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[ws.analyzeBtn, !picked && !query.trim() && ws.analyzeBtnDisabled]}
            onPress={analyze}
            disabled={!picked && !query.trim()}
          >
            <Ionicons name="flash" size={18} color="#000" />
            <Text style={ws.analyzeBtnText}>Analyze</Text>
          </TouchableOpacity>

          {recent.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={ws.recentLabel}>Recent Reports</Text>
              <View style={{ gap: 8 }}>
                {recent.map((it) => {
                  const sq = it.analysis?.trade_plan?.setup_quality;
                  const bias = it.analysis?.trade_plan?.market_bias;
                  return (
                  <TouchableOpacity key={it.analysis_id} style={ws.recentCard} onPress={() => openRecent(it)}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={ws.recentSymbol}>{it.symbol}</Text>
                      {bias ? <Badge value={bias} /> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.4)" />
                      <Text style={ws.recentDate}>{it.created_at ? new Date(it.created_at).toLocaleDateString() : ""}</Text>
                      {sq != null ? <Text style={ws.recentSq}>SQ {sq}</Text> : null}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const ws = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },

  loadingWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepText: { fontFamily: MONO.regular, fontSize: 12, flex: 1 },

  wizardBody: { padding: 16, paddingBottom: 40 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  title: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 24, lineHeight: 30 },
  subtitle: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 16 },

  stepCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, marginBottom: 14 },
  stepLabelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(57,255,20,0.15)", borderWidth: 1, borderColor: "rgba(57,255,20,0.4)", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: PRIMARY, fontFamily: DISPLAY.extraBold, fontSize: 11 },
  stepLabelText: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },

  searchInput: { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontFamily: BODY.regular, fontSize: 14 },
  searchSpinner: { position: "absolute", right: 14, top: 14 },
  searchClear: { position: "absolute", right: 12, top: 12 },
  resultsBox: { position: "absolute", top: 50, left: 0, right: 0, zIndex: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "#0b0f0b", borderRadius: 10, maxHeight: 240, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  resultSymbol: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 13 },
  resultName: { color: "rgba(255,255,255,0.5)", fontFamily: BODY.regular, fontSize: 11 },
  resultType: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 8, textTransform: "uppercase" },

  popularRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  popularChip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  popularChipActive: { borderColor: PRIMARY, backgroundColor: "rgba(57,255,20,0.1)" },
  popularChipText: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 11 },
  popularChipTextActive: { color: PRIMARY },

  optionBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  optionBtnActive: { borderColor: PRIMARY, backgroundColor: "rgba(57,255,20,0.1)" },
  optionBtnText: { color: "rgba(255,255,255,0.65)", fontFamily: DISPLAY.bold, fontSize: 13 },
  optionBtnTextActive: { color: PRIMARY },

  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 16, marginTop: 4 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 16 },

  recentLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700", marginBottom: 10 },
  recentCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 12 },
  recentSymbol: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 14 },
  recentDate: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10 },
  recentSq: { color: PRIMARY, fontFamily: MONO.regular, fontWeight: "700", fontSize: 10, marginLeft: "auto" },
});
