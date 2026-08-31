/**
 * ChartAnalyzeScreen — mobile port of web's Chart Analysis module
 * (src/pages/dashboard/ChartAnalyzePanel.jsx + src/pages/dashboard/IntradayFlow.jsx),
 * reached from web's /dashboard/trading/analyse (JournalList.jsx) and from TradePlan.jsx's
 * "Go to Analyse" button.
 *
 * FOUR VERIFIED BACKEND-CONTRACT MISMATCHES ON WEB (read directly from both sides, not assumed —
 * see the implementation report for exact file:line citations). This screen implements the
 * CORRECT, verified backend contract in every case, not web's broken field names, consistent with
 * every prior phase's handling of contract mismatches in this codebase:
 *   1. analyze-setup: backend expects multipart field "image"; web sends "file".
 *   2. analyze-intraday: backend expects every file under repeated field "images"; web sends
 *      three separately-named fields (chart_4h/chart_1h/chart_3rd) the backend never binds.
 *   3. GET /journal/analyze/quota does not return `packs` (verified from CreditService.quota());
 *      web assumes it does. Real packs come from GET /payments/credit-packs, called here instead.
 *   4. (carried from Phase P7) GET /journal/analyses returns a raw array; web unwraps `.items`.
 *
 * i18n (en/ta/hi) is intentionally not ported — no other mobile screen in this app has a language
 * switcher, and inventing one for a single screen would be a new capability beyond parity, not a
 * port. English strings only, matching every other mobile screen's convention.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import RazorpayCheckout from "react-native-razorpay";

import { journalApi } from "../src/api/journal";
import { API_BASE } from "../src/api/client";
import { tokenService } from "../src/services/tokenService";
import { useAlert } from "../src/context/AlertContext";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { PRIMARY, RED, AMBER, GRAY, tone, Badge, LevelChip, Section } from "../components/analysis/AnalysisShared";
import { TAB_ROUTES } from "../src/constants/routes";

const STEPS_SETUP = [
  "Reading candle structure…",
  "Measuring volume pressure…",
  "Checking momentum shift…",
  "Mapping your entry, stop & target…",
  "Scoring the setup…",
];
const STEPS_INTRADAY = [
  "Reading 4H trend…",
  "Checking 1H trend…",
  "Marking key levels…",
  "Reading market structure…",
  "Reading daily open & phase…",
  "Checking market risk…",
];

const scoreColor = (v) => (v == null ? GRAY : v >= 80 ? PRIMARY : v >= 50 ? AMBER : RED);

function pickImageChoice(showOptions, onCamera, onGallery) {
  showOptions({
    title: "Add chart",
    buttons: [
      { text: "Take Photo", onPress: onCamera },
      { text: "Choose from Gallery", onPress: onGallery },
      { text: "Cancel", style: "cancel" },
    ],
  });
}

async function pickImageAsync(source, showAlert) {
  const perm =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    showAlert({ type: "warning", title: "Permission required", message: "Allow photo/camera access in Settings." });
    return null;
  }
  const options = { mediaTypes: ["images"], allowsEditing: false, quality: 0.85 };
  const picked = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return picked.canceled ? null : picked.assets[0];
}

function toFormFile(asset, name) {
  return { uri: asset.uri, type: asset.mimeType || "image/jpeg", name: asset.fileName || name };
}

// ─────────────────────────────────────────────────────────────────────────────
// Score cell (analyze-setup result)
// ─────────────────────────────────────────────────────────────────────────────
function ScoreCell({ label, s, highlight }) {
  const v = s?.value;
  const col = scoreColor(v);
  return (
    <View style={[qs.scoreCell, { borderColor: `${col}45` }, highlight && { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Text style={qs.scoreLabel}>{label}</Text>
      <Text style={[qs.scoreValue, { color: col }]}>{v != null ? v : "—"}<Text style={qs.scoreSuffix}>/100</Text></Text>
      {!!s?.reason && <Text style={qs.scoreReason}>{s.reason}</Text>}
    </View>
  );
}

function ResultCard({ n, title, icon, border, badge, bottomLine, stat, detail, meta, children }) {
  return (
    <View style={[qs.resultCard, { borderColor: `${border}55` }]}>
      <View style={qs.resultCardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={[qs.resultCardIcon, { borderColor: `${border}40`, backgroundColor: `${border}18` }]}>
            <Ionicons name={icon} size={14} color={border} />
          </View>
          <Text style={qs.resultCardTitle} numberOfLines={1}>{n}. {title}</Text>
        </View>
        {!!badge && (
          <View style={[qs.resultBadge, { borderColor: border, backgroundColor: `${border}26` }]}>
            <Text style={[qs.resultBadgeText, { color: border }]}>{badge}</Text>
          </View>
        )}
      </View>
      {!!bottomLine && (
        <Text style={qs.bottomLine}>{bottomLine}{!!meta && <Text style={qs.bottomLineMeta}>  {meta}</Text>}</Text>
      )}
      {!!stat?.value && (
        <View style={[qs.statCallout, { borderColor: `${border}45` }]}>
          {!!stat.label && <Text style={qs.statLabel}>{stat.label}</Text>}
          <Text style={[qs.statValue, { color: border }]}>{stat.value}</Text>
          {!!stat.compare && <Text style={qs.statCompare}>{stat.compare}</Text>}
        </View>
      )}
      {!!detail && <Text style={qs.detail}>{detail}</Text>}
      {children}
    </View>
  );
}

function AnnotatedChart({ uri, annotations = [] }) {
  const [active, setActive] = useState(null);
  return (
    <View>
      <View style={qs.chartImgWrap}>
        {uri ? <Image source={{ uri }} style={qs.chartImg} /> : <View style={qs.chartImgEmpty}><Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.3)" /></View>}
        {annotations.map((a) => (
          <TouchableOpacity
            key={a.n}
            onPress={() => setActive((p) => (p === a.n ? null : a.n))}
            style={[qs.marker, { left: `${a.x}%`, top: `${a.y}%` }, active === a.n && qs.markerActive]}
          >
            <Text style={[qs.markerText, active === a.n && qs.markerTextActive]}>{a.n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {annotations.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {annotations.map((a) => (
            <TouchableOpacity key={a.n} onPress={() => setActive((p) => (p === a.n ? null : a.n))} style={[qs.callout, active === a.n && qs.calloutActive]}>
              <View style={qs.calloutBadge}><Text style={qs.calloutBadgeText}>{a.n}</Text></View>
              <Text style={qs.calloutText}>{!!a.label && <Text style={{ fontWeight: "700", color: "#fff" }}>{a.label}: </Text>}{a.note}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intraday upload slot
// ─────────────────────────────────────────────────────────────────────────────
function Slot({ label, required, preview, onPick, onClear, showOptions, showAlert }) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[qs.slot, preview && qs.slotFilled]}
        activeOpacity={0.85}
        onPress={() => !preview && pickImageChoice(
          showOptions,
          async () => onPick(await pickImageAsync("camera", showAlert)),
          async () => onPick(await pickImageAsync("gallery", showAlert))
        )}
      >
        {preview ? (
          <>
            <Image source={{ uri: preview }} style={qs.slotImg} />
            <TouchableOpacity style={qs.slotClear} onPress={onClear}>
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </>
        ) : (
          <Ionicons name="image-outline" size={24} color={PRIMARY} />
        )}
      </TouchableOpacity>
      <Text style={qs.slotLabel}>{label}{required && <Text style={{ color: PRIMARY }}> *</Text>}</Text>
    </View>
  );
}

export default function ChartAnalyzeScreen({ navigation }) {
  const { showAlert, showOptions, showConfirm } = useAlert();

  const [style, setStyle] = useState("intraday");
  const [quota, setQuota] = useState(null);
  const [packs, setPacks] = useState([]);
  const [paywall, setPaywall] = useState(false);
  const [buying, setBuying] = useState("");
  const [recent, setRecent] = useState([]);
  const [streaksOpen, setStreaksOpen] = useState(false);

  // analyze-setup state
  const [asset, setAsset] = useState(null);
  const [context, setContext] = useState("");
  const [depth, setDepth] = useState("full");
  const [analyzing, setAnalyzing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [resultId, setResultId] = useState(null);
  const [confirmLevels, setConfirmLevels] = useState({ entry: "", stop: "", target: "" });
  const [refining, setRefining] = useState(false);
  const stepTimer = useRef(null);

  // analyze-intraday state
  const [slots, setSlots] = useState([null, null, null]);
  const [intradayAnalyzing, setIntradayAnalyzing] = useState(false);
  const [intradayStepIdx, setIntradayStepIdx] = useState(0);
  const [intradaySession, setIntradaySession] = useState(null);
  const intradayStepTimer = useRef(null);

  const outOfCredits = quota && quota.remaining <= 0;
  const lowConf = result?.detection?.confidence === "low";

  const fetchQuota = async () => {
    try {
      const { data } = await journalApi.quota();
      setQuota(data);
    } catch { /* ignore, matches web's silent catch */ }
  };
  const fetchPacks = async () => {
    try {
      const { data } = await journalApi.creditPacks();
      setPacks(data || []);
    } catch { /* ignore */ }
  };
  const fetchRecent = async () => {
    try {
      const { data } = await journalApi.analyses();
      setRecent(data || []);
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchQuota(); fetchRecent(); }, []);

  useEffect(() => {
    if (result?.detection?.confidence === "low") {
      const d = result.detection;
      setConfirmLevels({ entry: d.entry || "", stop: d.stop || "", target: d.target || "" });
    }
  }, [result]);

  const clearSetup = () => {
    setAsset(null); setResult(null); setResultId(null); setContext("");
  };

  // ── analyze-setup ──────────────────────────────────────────────────────────
  const analyzeSetup = async () => {
    if (!asset) return showAlert({ type: "warning", title: "Missing chart", message: "Add a chart screenshot first." });
    if (outOfCredits) { fetchPacks(); setPaywall(true); return; }
    setAnalyzing(true); setStepIdx(0);
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => setStepIdx((i) => Math.min(i + 1, STEPS_SETUP.length - 1)), 1600);
    const started = Date.now();
    try {
      const fd = new FormData();
      fd.append("image", toFormFile(asset, "chart.jpg"));
      if (context) fd.append("context", context);
      fd.append("language", "en");
      fd.append("depth", depth);
      const { data } = await journalApi.analyzeSetup(fd);
      const elapsed = Date.now() - started;
      if (elapsed < 6200) await new Promise((r) => setTimeout(r, 6200 - elapsed));
      setResult(data.analysis);
      setResultId(data.id);
      setQuota((q) => ({ ...(q || {}), remaining: data.credits_remaining, used: data.credits_used }));
      fetchRecent();
    } catch (e) {
      if (e?.response?.status === 402) { fetchPacks(); setPaywall(true); fetchQuota(); }
      else showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not analyze the chart." });
    } finally {
      if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
      setAnalyzing(false);
    }
  };

  const refine = async () => {
    if (!resultId) return;
    setRefining(true);
    try {
      const { data } = await journalApi.refine(resultId, confirmLevels.entry, confirmLevels.stop, confirmLevels.target);
      setResult(data.analysis);
      fetchRecent();
      showAlert({ type: "success", title: "Re-analyzed", message: "Re-analyzed with your levels." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not re-analyze." });
    } finally {
      setRefining(false);
    }
  };

  const downloadReport = async () => {
    if (!resultId) return;
    try {
      const token = await tokenService.get();
      const url = `${API_BASE}/journal/analyses/${resultId}/report`;
      const dest = new File(Paths.cache, "setup_analysis.html");
      await File.downloadFileAsync(url, dest, { headers: { Authorization: `Bearer ${token}` } });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest.uri);
      }
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not download the report." });
    }
  };

  // ── analyze-intraday ───────────────────────────────────────────────────────
  const setSlot = (i, a) => {
    if (!a) return;
    setSlots((p) => p.map((x, idx) => (idx === i ? a : x)));
  };
  const clearSlot = (i) => setSlots((p) => p.map((x, idx) => (idx === i ? null : x)));
  const startNewIntraday = () => { setSlots([null, null, null]); setIntradaySession(null); };

  const pollIntradayJob = (jobId) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 180000;
    const tick = async () => {
      try {
        const { data } = await journalApi.analyzeIntradayJob(jobId);
        if (data.status === "done") return resolve(data);
        if (data.status === "error") return reject(new Error(data.error_message || "Could not analyse the charts."));
        if (Date.now() > deadline) return reject(new Error("Analysis is taking longer than usual. Please try again."));
        setTimeout(tick, 3000);
      } catch (e) { reject(e); }
    };
    tick();
  });

  const analyzeIntraday = async () => {
    if (!slots[0] || !slots[1]) return showAlert({ type: "warning", title: "Missing charts", message: "4H and 1H charts are required." });
    if (outOfCredits) { fetchPacks(); setPaywall(true); return; }
    setIntradayAnalyzing(true); setIntradayStepIdx(0);
    if (intradayStepTimer.current) clearInterval(intradayStepTimer.current);
    intradayStepTimer.current = setInterval(() => setIntradayStepIdx((i) => Math.min(i + 1, STEPS_INTRADAY.length - 1)), 1700);
    const started = Date.now();
    try {
      const fd = new FormData();
      slots.filter(Boolean).forEach((a, i) => fd.append("images", toFormFile(a, `chart-${i}.jpg`)));
      fd.append("language", "en");
      const { data } = await journalApi.analyzeIntraday(fd);
      const done = await pollIntradayJob(data.job_id);
      const elapsed = Date.now() - started;
      if (elapsed < 7000) await new Promise((r) => setTimeout(r, 7000 - elapsed));
      setIntradaySession({ analysis: done.analysis, chartUris: slots.filter(Boolean).map((a) => a.uri) });
      setSlots([null, null, null]);
      setQuota((q) => ({ ...(q || {}), remaining: done.credits_remaining, used: done.credits_used }));
      fetchRecent();
    } catch (e) {
      if (e?.response?.status === 402) { fetchPacks(); setPaywall(true); }
      else showAlert({ type: "error", title: "Error", message: e?.message || e?.response?.data?.detail || "Could not analyse the charts." });
    } finally {
      if (intradayStepTimer.current) { clearInterval(intradayStepTimer.current); intradayStepTimer.current = null; }
      setIntradayAnalyzing(false);
    }
  };

  // ── shared: recent / delete / credits ─────────────────────────────────────
  const openRecent = async (item) => {
    if (item.style === "intraday") {
      try {
        const { data } = await journalApi.analysis(item.analysis_id);
        setStyle("intraday");
        setIntradaySession({ analysis: data.analysis, chartUris: [] });
      } catch (e) {
        showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not load this report." });
      }
      return;
    }
    try {
      const { data } = await journalApi.analysis(item.analysis_id);
      setStyle("swing");
      setResult(data.analysis);
      setResultId(item.analysis_id);
      setAsset(null);
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not load this report." });
    }
  };

  const confirmDelete = (id) => {
    showConfirm({
      title: "Delete analysis",
      message: "Delete this analysis? This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await journalApi.deleteAnalysis(id);
          if (id === resultId) clearSetup();
          setRecent((r) => r.filter((x) => x.analysis_id !== id));
        } catch {
          showAlert({ type: "error", title: "Error", message: "Could not delete." });
        }
      },
    });
  };

  const buyPack = async (pack) => {
    setBuying(pack.pack_id);
    try {
      const { data } = await journalApi.creditOrder(pack.pack_id);
      const finish = () => {
        showAlert({ type: "success", title: "Credits added", message: `${pack.credits} analyses added.` });
        setPaywall(false);
        fetchQuota();
      };
      if (data.mock) {
        await journalApi.creditVerify({ razorpay_order_id: data.order_id, pack_id: pack.pack_id });
        finish();
        return;
      }
      const paymentData = await RazorpayCheckout.open({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Cashflow Trader",
        description: `${pack.credits} chart analyses`,
        theme: { color: PRIMARY },
      });
      try {
        await journalApi.creditVerify({
          razorpay_order_id: data.order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          pack_id: pack.pack_id,
        });
        finish();
      } catch {
        showAlert({ type: "error", title: "Payment Failed", message: "Payment verification failed." });
      }
    } catch (e) {
      if (e?.code === 0) {
        showAlert({ type: "info", title: "Payment Cancelled" });
      } else {
        showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || e?.description || "Could not start purchase." });
      }
    } finally {
      setBuying("");
    }
  };

  // Web computes `best` from `it.analysis?.trade_plan?.setup_quality` on each recent item — but
  // GET /journal/analyses (verified in Phase P7/P9) never returns a nested `analysis` object on
  // list items, only { analysis_id, style, symbol, language, credits_used, created_at }. Web's own
  // "Best Score" tile is therefore always 0 in production, a fifth verified contract mismatch.
  // Rather than fabricate a number from data that isn't there, this omits the Best Score tile.
  const streakStats = () => {
    const used = quota?.used || 0;
    const remaining = quota?.remaining || 0;
    const days = new Set(recent.map((it) => (it.created_at || "").slice(0, 10)).filter(Boolean));
    let streak = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return { used, remaining, streak };
  };

  const verdict = result?.validation?.verdict === "correct" ? { icon: "checkmark-circle", border: PRIMARY }
    : result?.validation?.verdict === "incorrect" ? { icon: "warning", border: RED }
    : { icon: "warning", border: AMBER };
  const psychState = result?.psychology?.state === "healthy" ? PRIMARY : result?.psychology?.state === "risk" ? RED : AMBER;
  const marketTrend = result?.market?.trend === "Bullish" ? { icon: "trending-up", border: PRIMARY }
    : result?.market?.trend === "Bearish" ? { icon: "trending-down", border: RED }
    : { icon: "remove", border: GRAY };
  const sc = result?.scores || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }} edges={["top"]}>
      <View style={qs.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={qs.headerTitle}>Analyse</Text>
        {/* Web's ActionBtn hides its text label below the sm: breakpoint (hidden sm:inline,
            ChartAnalyzePanel.jsx:788) — at a phone-width viewport web itself shows icon-only
            buttons, so this matches that exactly rather than adding labels web wouldn't show
            on this screen size either. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity onPress={() => setStreaksOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="flame-outline" size={20} color={AMBER} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { fetchPacks(); setPaywall(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="cash-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate(TAB_ROUTES.SUPPORT)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="help-buoy-outline" size={20} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={qs.chip}>
          <Ionicons name="scan-outline" size={11} color={PRIMARY} />
          <Text style={qs.chipText}>Upload an analysis</Text>
        </View>

        {/* Trading style */}
        <Text style={qs.sectionLabel}>Trading style</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 4 }}>
          {[["intraday", "Intraday"], ["swing", "Swing"], ["investment", "Investment"]].map(([s, label]) => (
            <TouchableOpacity key={s} style={[qs.styleBtn, style === s && qs.styleBtnActive]} onPress={() => setStyle(s)}>
              <Text style={[qs.styleBtnText, style === s && qs.styleBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {style !== "intraday" && (
          <Text style={qs.comingSoon}>Dedicated {style === "swing" ? "Swing" : "Investment"} methodology is coming soon — running the general read for now.</Text>
        )}

        {quota && (
          <Text style={qs.quotaText}>
            {quota.used < quota.free_total && quota.remaining <= quota.free_total
              ? `${quota.remaining} of ${quota.free_total} free analyses remaining`
              : `${quota.remaining} analyses remaining`}
          </Text>
        )}

        {style === "intraday" ? (
          intradayAnalyzing ? (
            <View style={qs.loadingBox}>
              {STEPS_INTRADAY.map((s, i) => (
                <View key={i} style={[qs.stepRow, { opacity: i <= intradayStepIdx ? 1 : 0.3 }]}>
                  {i < intradayStepIdx ? <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
                    : i === intradayStepIdx ? <ActivityIndicator size="small" color={PRIMARY} />
                    : <Ionicons name="ellipse-outline" size={16} color="rgba(255,255,255,0.3)" />}
                  <Text style={[qs.stepText, { color: i === intradayStepIdx ? PRIMARY : "rgba(255,255,255,0.6)" }]}>{s}</Text>
                </View>
              ))}
            </View>
          ) : intradaySession ? (
            <IntradayResult session={intradaySession} onNew={startNewIntraday} onTradePlan={() => navigation.navigate("TradePlan", { analysis: intradaySession.analysis })} />
          ) : (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Slot label="4H Chart" required preview={slots[0]?.uri} onPick={(a) => setSlot(0, a)} onClear={() => clearSlot(0)} showOptions={showOptions} showAlert={showAlert} />
                <Slot label="1H Chart" required preview={slots[1]?.uri} onPick={(a) => setSlot(1, a)} onClear={() => clearSlot(1)} showOptions={showOptions} showAlert={showAlert} />
                <Slot label="3rd Chart" preview={slots[2]?.uri} onPick={(a) => setSlot(2, a)} onClear={() => clearSlot(2)} showOptions={showOptions} showAlert={showAlert} />
              </View>
              <TouchableOpacity
                style={[qs.analyzeBtn, (!slots[0] || !slots[1]) && qs.analyzeBtnDisabled]}
                onPress={analyzeIntraday}
                disabled={!slots[0] || !slots[1]}
              >
                <Ionicons name="sparkles" size={18} color="#000" />
                <Text style={qs.analyzeBtnText}>Analyse the Market</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={{ marginTop: 16 }}>
            {result ? (
              <AnnotatedChart uri={asset?.uri} annotations={result.annotations || []} />
            ) : analyzing ? (
              <View style={qs.loadingBox}>
                {STEPS_SETUP.map((s, i) => (
                  <View key={i} style={[qs.stepRow, { opacity: i <= stepIdx ? 1 : 0.3 }]}>
                    {i < stepIdx ? <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
                      : i === stepIdx ? <ActivityIndicator size="small" color={PRIMARY} />
                      : <Ionicons name="ellipse-outline" size={16} color="rgba(255,255,255,0.3)" />}
                    <Text style={[qs.stepText, { color: i === stepIdx ? PRIMARY : "rgba(255,255,255,0.6)" }]}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={qs.dropzone}
                  onPress={() => pickImageChoice(
                    showOptions,
                    async () => { const a = await pickImageAsync("camera", showAlert); if (a) { setAsset(a); setResult(null); setResultId(null); } },
                    async () => { const a = await pickImageAsync("gallery", showAlert); if (a) { setAsset(a); setResult(null); setResultId(null); } }
                  )}
                >
                  {asset ? (
                    <>
                      <Image source={{ uri: asset.uri }} style={qs.dropzoneImg} />
                      <TouchableOpacity style={qs.dropzoneClear} onPress={clearSetup}>
                        <Ionicons name="close" size={14} color="rgba(255,255,255,0.85)" />
                        <Text style={qs.dropzoneClearText}>Remove</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={qs.dropzoneIcon}><Ionicons name="cloud-upload-outline" size={26} color={PRIMARY} /></View>
                      <Text style={qs.dropzoneTitle}>Upload Your Chart</Text>
                      <Text style={qs.dropzoneHint}>Tap to add your market analysis or chart screenshot for AI validation.</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {[["quick", "Quick Read"], ["full", "Full Breakdown"]].map(([d, label]) => (
                    <TouchableOpacity key={d} style={[qs.depthBtn, depth === d && qs.depthBtnActive]} onPress={() => setDepth(d)}>
                      <Text style={[qs.depthBtnText, depth === d && qs.depthBtnTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={context}
                  onChangeText={setContext}
                  placeholder="Optional context — e.g. XAUUSD long, expecting breakout"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={qs.contextInput}
                />

                {outOfCredits ? (
                  <TouchableOpacity style={qs.unlockBtn} onPress={() => { fetchPacks(); setPaywall(true); }}>
                    <Ionicons name="lock-closed" size={18} color={PRIMARY} />
                    <Text style={qs.unlockBtnText}>Unlock more analyses</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[qs.analyzeBtn, !asset && qs.analyzeBtnDisabled]} onPress={analyzeSetup} disabled={!asset}>
                    <Ionicons name="sparkles" size={18} color="#000" />
                    <Text style={qs.analyzeBtnText}>Analyze with AI</Text>
                  </TouchableOpacity>
                )}

                {/* Web shows these 3 locked-section previews in a side-by-side "RIGHT" column
                    before any analysis runs (ChartAnalyzePanel.jsx:505-513); stacked below the
                    form here since mobile has no two-column layout to place them beside. */}
                <View style={{ marginTop: 14, gap: 10 }}>
                  {["AI Validation & Feedback", "Psychological Analysis", "Market Trend & News"].map((title, i) => (
                    <View key={i} style={qs.unlockPlaceholder}>
                      <Text style={qs.unlockPlaceholderTitle}>{i + 1}. {title}</Text>
                      <Text style={qs.unlockPlaceholderHint}>Upload a chart to unlock this.</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {result && (
              <View style={{ marginTop: 16, gap: 12 }}>
                <View style={qs.philosophy}>
                  <Ionicons name="scan-outline" size={13} color={PRIMARY} style={{ marginTop: 2 }} />
                  <Text style={qs.philosophyText}>We don't tell you to buy or sell. We show you what's actually in your setup — read 100 of these and you'll start seeing it yourself.</Text>
                </View>

                {lowConf && (
                  <View style={qs.confirmBox}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Ionicons name="warning" size={16} color={AMBER} />
                      <Text style={qs.confirmTitle}>Confirm Your Levels</Text>
                    </View>
                    <Text style={qs.confirmSub}>We spotted markup on your chart but couldn't be sure which line is which. Tap to correct, then re-analyze for accurate scoring.</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      {[["entry", "Entry"], ["stop", "Stop-Loss"], ["target", "Target"]].map(([k, label]) => (
                        <View key={k} style={{ flex: 1 }}>
                          <Text style={qs.confirmLabel}>{label}</Text>
                          <TextInput
                            value={confirmLevels[k]}
                            onChangeText={(v) => setConfirmLevels((c) => ({ ...c, [k]: v }))}
                            style={qs.confirmInput}
                            placeholder="—"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                          />
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={qs.reanalyzeBtn} onPress={refine} disabled={refining}>
                      {refining ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="sparkles" size={16} color="#000" />}
                      <Text style={qs.reanalyzeBtnText}>Re-analyze with my levels</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={qs.scoreBlock}>
                  <Text style={qs.sectionLabel}>Setup Scores</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <ScoreCell label="Entry" s={sc.entry} />
                    <ScoreCell label="Stop-Loss" s={sc.stop} />
                    <ScoreCell label="Exit / Target" s={sc.exit} />
                    <ScoreCell label="Overall Setup" s={sc.overall} highlight />
                  </View>
                  <Text style={qs.scoreNote}>Scores show how well-structured this setup is — not a trade signal.</Text>
                </View>

                <ResultCard n={1} title="AI Validation & Feedback" icon={verdict.icon} border={verdict.border}
                  badge={{ correct: "Correct", needs_improvement: "Needs Work", incorrect: "Incorrect" }[result.validation?.verdict] || result.validation?.verdict}
                  bottomLine={result.validation?.bottom_line} stat={result.validation?.stat} detail={result.validation?.detail}>
                  {result.validation?.observations?.length > 0 && (
                    <View style={{ marginTop: 10, gap: 6 }}>
                      {result.validation.observations.map((m, i) => (
                        <Text key={i} style={qs.observation}>▸ {m}</Text>
                      ))}
                    </View>
                  )}
                </ResultCard>

                <ResultCard n={2} title="Psychological Analysis" icon="pulse-outline" border={psychState}
                  badge={result.psychology?.mindset} bottomLine={result.psychology?.bottom_line} stat={result.psychology?.stat} detail={result.psychology?.detail} />

                <ResultCard n={3} title="Market Trend & News" icon={marketTrend.icon} border={marketTrend.border}
                  badge={result.market?.trend} bottomLine={result.market?.bottom_line} stat={result.market?.stat} detail={result.market?.detail}
                  meta={[result.instrument && result.instrument !== "Unknown" ? result.instrument : null, result.timeframe].filter(Boolean).join(" · ")}>
                  {result.market?.context?.length > 0 && (
                    <View style={{ marginTop: 10, gap: 6 }}>
                      {result.market.context.map((c, i) => (
                        <Text key={i} style={qs.observation}>📰 {c}</Text>
                      ))}
                    </View>
                  )}
                </ResultCard>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={qs.downloadBtn} onPress={downloadReport}>
                    <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.85)" />
                    <Text style={qs.downloadBtnText}>Download Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={qs.nextBtn} onPress={clearSetup}>
                    <Ionicons name="refresh" size={16} color="#000" />
                    <Text style={qs.nextBtnText}>Next Analysis</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent analyses */}
        {recent.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={qs.sectionLabel}>Recent analyses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
              {recent.map((it) => (
                <View key={it.analysis_id} style={{ position: "relative" }}>
                  <TouchableOpacity style={qs.recentThumb} onPress={() => openRecent(it)}>
                    <Ionicons name="document-text-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <Text style={qs.recentSymbol} numberOfLines={1}>{it.symbol}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={qs.recentDelete} onPress={() => confirmDelete(it.analysis_id)}>
                    <Ionicons name="trash-outline" size={12} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Streaks modal */}
      <Modal visible={streaksOpen} transparent animationType="fade" onRequestClose={() => setStreaksOpen(false)}>
        <View style={qs.modalBackdrop}>
          <View style={qs.streaksCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={qs.chip}><Ionicons name="flame" size={11} color={AMBER} /><Text style={qs.chipText}>Your Analysis Streak</Text></View>
              <TouchableOpacity onPress={() => setStreaksOpen(false)}><Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
            </View>
            {(() => {
              const st = streakStats();
              return (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <StatTile icon="flame" label="Day Streak" value={`${st.streak}`} color={AMBER} />
                  <StatTile icon="scan" label="Total Analyses" value={`${st.used}`} color={PRIMARY} />
                  <StatTile icon="cash" label="Credits Left" value={`${st.remaining}`} color={PRIMARY} />
                </View>
              );
            })()}
            <TouchableOpacity style={qs.buyCreditsBtn} onPress={() => { setStreaksOpen(false); fetchPacks(); setPaywall(true); }}>
              <Ionicons name="cash" size={16} color="#000" />
              <Text style={qs.buyCreditsBtnText}>Buy Credits</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Paywall modal */}
      <Modal visible={paywall} transparent animationType="fade" onRequestClose={() => setPaywall(false)}>
        <View style={qs.modalBackdrop}>
          <View style={qs.paywallCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={qs.chip}><Ionicons name="lock-closed" size={11} color={PRIMARY} /><Text style={qs.chipText}>You're out of analyses</Text></View>
              <TouchableOpacity onPress={() => setPaywall(false)}><Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
            </View>
            <Text style={qs.paywallSub}>Pick a pack to keep getting instant, numbers-driven reads on your setups.</Text>
            <View style={{ gap: 10, marginTop: 6 }}>
              {packs.map((p) => (
                <View key={p.pack_id} style={[qs.packCard, p.popular && qs.packCardPopular]}>
                  {p.popular && <View style={qs.popularChip}><Text style={qs.popularChipText}>Most popular</Text></View>}
                  <Text style={qs.packLabel}>{p.label}</Text>
                  <Text style={qs.packCredits}>{p.credits} <Text style={qs.packCreditsWord}>analyses</Text></Text>
                  <Text style={qs.packPrice}>${p.price_usd}</Text>
                  <TouchableOpacity style={qs.buyBtn} onPress={() => buyPack(p)} disabled={!!buying}>
                    {buying === p.pack_id ? <ActivityIndicator size="small" color="#000" /> : <Text style={qs.buyBtnText}>Buy</Text>}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intraday result view — 5 sections + summary, matching web IntradayFlow.jsx exactly
// (a genuinely different, simpler analysis schema from One-Click Analysis's 9-section report —
// trend/key_levels/structure/daily_open/market_risk/summary, not higher_tf/lower_tf/etc.)
// ─────────────────────────────────────────────────────────────────────────────
function IntradayResult({ session, onNew, onTradePlan }) {
  const a = session.analysis || {};
  const tr = a.trend || {}, kl = a.key_levels || {}, st = a.structure || {}, doo = a.daily_open || {}, mr = a.market_risk || {}, sm = a.summary || {};
  const labels = ["4H Chart", "1H Chart", "3rd Chart"];
  const annByImg = (a.annotations || []).reduce((m, x) => { (m[x.image] = m[x.image] || []).push(x); return m; }, {});
  const charts = (session.chartUris || []).map((src, i) => ({ src, label: labels[i], anns: annByImg[i + 1] || [] })).filter((c) => c.src);

  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <View style={qs.philosophy}>
        <Ionicons name="scan-outline" size={13} color={PRIMARY} style={{ marginTop: 2 }} />
        <Text style={qs.philosophyText}>We analyse the market — we never tell you to buy or sell. The decision is always yours.</Text>
      </View>

      {charts.length > 0 && (
        <View>
          <Text style={qs.sectionLabel}>What we spotted on your charts</Text>
          <View style={{ gap: 12, marginTop: 10 }}>
            {charts.map((c, i) => (
              <View key={i}>
                <Text style={qs.chartLabel}>{c.label}</Text>
                <AnnotatedChart uri={c.src} annotations={c.anns} />
              </View>
            ))}
          </View>
        </View>
      )}

      <Section icon="trending-up" n={1} title="Trend Analysis" question="Where is the market going?" accent={tone(tr.h4)} right={<Badge value={tr.alignment} />}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <Text style={qs.tfLabel}>4H</Text><Badge value={tr.h4} />
          <Text style={qs.tfLabel}>1H</Text><Badge value={tr.h1} />
          <Text style={qs.tfLabel}>Strength</Text><Badge value={tr.strength} />
        </View>
        <Text style={qs.sectionNote}>{tr.note}</Text>
      </Section>

      <Section icon="layers-outline" n={2} title="Key Levels" question="Where is the market most likely to react?" accent="#60A5FA">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <LevelChip label="Resistance" value={kl.resistance} />
          <LevelChip label="Support" value={kl.support} />
          <LevelChip label="Liquidity" value={kl.liquidity} />
          <LevelChip label="Next Level" value={kl.next_level} />
        </View>
        {!!kl.note && <Text style={qs.sectionNote}>{kl.note}</Text>}
      </Section>

      <Section icon="git-branch-outline" n={3} title="Market Structure" question="Has the market confirmed its direction?" accent={tone(st.state)} right={<Badge value={st.state} />}>
        <Text style={qs.sectionNote}>{st.note}</Text>
      </Section>

      <Section icon="sunny-outline" n={4} title="Daily Open & Market Phase" question="Where is today's market cycle?" accent={tone(doo.phase)} right={<Badge value={doo.phase} />}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {!!doo.daily_open && <LevelChip label="Daily Open" value={doo.daily_open} />}
          {!!doo.watch_zone && <LevelChip label="Watch Zone" value={doo.watch_zone} />}
        </View>
        <Text style={qs.sectionNote}>{doo.note}</Text>
      </Section>

      <Section icon="warning-outline" n={5} title="Market Risk" question="What could make this market difficult?" accent={tone(mr.level)} right={<Badge value={mr.level} />}>
        <Text style={qs.sectionNote}>{mr.note}</Text>
        {!!mr.events && <Text style={qs.eventsText}>Events: {mr.events}</Text>}
      </Section>

      <View style={qs.summaryCard}>
        <Text style={[qs.sectionLabel, { color: PRIMARY }]}>Analysis Summary</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          <SummaryItem label="Market Trend" value={sm.market_trend} colored />
          <SummaryItem label="Trend Strength" value={sm.trend_strength} colored />
          <SummaryItem label="Next Major Level" value={sm.next_major_level} />
          <SummaryItem label="Structure" value={sm.structure} colored />
          <SummaryItem label="Current Phase" value={sm.current_phase} colored />
          <SummaryItem label="Risk" value={sm.risk} colored />
        </View>
      </View>

      <View style={qs.disclaimerBox}>
        <Text style={qs.disclaimerText}>Educational market analysis only. Not financial advice, not a buy/sell signal. Your decisions and risk are your own.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity style={qs.nextBtn} onPress={onTradePlan}>
          <Ionicons name="arrow-forward" size={16} color="#000" />
          <Text style={qs.nextBtnText}>Open Trade Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={qs.downloadBtn} onPress={onNew}>
          <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.85)" />
          <Text style={qs.downloadBtnText}>New Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryItem({ label, value, colored }) {
  return (
    <View style={{ minWidth: "28%" }}>
      <Text style={qs.summaryLabel}>{label}</Text>
      <Text style={[qs.summaryValue, colored && { color: tone(value) }]}>{value || "—"}</Text>
    </View>
  );
}

function StatTile({ icon, label, value, color }) {
  return (
    <View style={qs.statTile}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={qs.statTileLabel}>{label}</Text>
      </View>
      <Text style={[qs.statTileValue, { color }]}>{value}</Text>
    </View>
  );
}

const qs = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  headerTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },

  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },

  sectionLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },

  styleBtn: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  styleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  styleBtnText: { color: "rgba(255,255,255,0.7)", fontFamily: DISPLAY.bold, fontSize: 13 },
  styleBtnTextActive: { color: "#000" },
  comingSoon: { color: "rgba(251,191,36,0.8)", fontFamily: BODY.regular, fontSize: 12, marginTop: 8 },
  quotaText: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 11, textAlign: "center", marginTop: 10 },

  loadingBox: { minHeight: 220, borderWidth: 1, borderColor: "rgba(57,255,20,0.2)", backgroundColor: "rgba(57,255,20,0.03)", borderRadius: 14, justifyContent: "center", gap: 12, padding: 20, marginTop: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepText: { fontFamily: MONO.regular, fontSize: 12, flex: 1 },

  dropzone: { minHeight: 220, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.15)", borderRadius: 14, alignItems: "center", justifyContent: "center", padding: 20 },
  dropzoneIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(57,255,20,0.12)", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  dropzoneTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 16 },
  dropzoneHint: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 13, textAlign: "center", marginTop: 6 },
  dropzoneImg: { width: "100%", height: 200, borderRadius: 10, resizeMode: "contain" },
  dropzoneClear: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  dropzoneClearText: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 11 },

  depthBtn: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  depthBtnActive: { borderColor: "rgba(57,255,20,0.6)", backgroundColor: "rgba(57,255,20,0.15)" },
  depthBtnText: { color: "rgba(255,255,255,0.65)", fontFamily: DISPLAY.bold, fontSize: 13 },
  depthBtnTextActive: { color: PRIMARY },

  contextInput: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontFamily: BODY.regular, fontSize: 13, marginTop: 10 },

  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 14, marginTop: 12 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 15 },
  unlockBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(57,255,20,0.5)", borderRadius: 10, paddingVertical: 14, marginTop: 12 },
  unlockBtnText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 15 },

  unlockPlaceholder: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16 },
  unlockPlaceholderTitle: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  unlockPlaceholderHint: { color: "rgba(255,255,255,0.35)", fontFamily: BODY.regular, fontSize: 13, marginTop: 6 },

  philosophy: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10 },
  philosophyText: { flex: 1, color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },

  confirmBox: { borderWidth: 1, borderColor: "rgba(251,191,36,0.45)", backgroundColor: "rgba(251,191,36,0.06)", borderRadius: 12, padding: 14 },
  confirmTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },
  confirmSub: { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 12, lineHeight: 17 },
  confirmLabel: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 8, textTransform: "uppercase", marginBottom: 4 },
  confirmInput: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, color: "#fff", fontFamily: DISPLAY.bold, fontSize: 13, textAlign: "center" },
  reanalyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 11, marginTop: 12 },
  reanalyzeBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },

  scoreBlock: { borderWidth: 1, borderColor: "rgba(57,255,20,0.2)", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, padding: 14 },
  scoreCell: { width: "47%", borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: "rgba(255,255,255,0.02)" },
  scoreLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase" },
  scoreValue: { fontFamily: DISPLAY.extraBold, fontSize: 24, marginTop: 4 },
  scoreSuffix: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  scoreReason: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 11, marginTop: 6, lineHeight: 15 },
  scoreNote: { color: "rgba(255,255,255,0.4)", fontFamily: BODY.regular, fontSize: 11, fontStyle: "italic", marginTop: 10 },

  resultCard: { borderWidth: 1, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)", padding: 14 },
  resultCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  resultCardIcon: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resultCardTitle: { flex: 1, color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  resultBadge: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  resultBadgeText: { fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase", fontWeight: "700" },
  bottomLine: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 19, lineHeight: 25 },
  bottomLineMeta: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 11 },
  statCallout: { borderWidth: 1, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.5)", padding: 12, marginTop: 10 },
  statLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase", marginBottom: 2 },
  statValue: { fontFamily: DISPLAY.extraBold, fontSize: 22 },
  statCompare: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10, marginTop: 4 },
  detail: { color: "rgba(255,255,255,0.8)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20, marginTop: 8 },
  observation: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19 },

  chartImgWrap: { position: "relative", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.4)" },
  chartImg: { width: "100%", height: 200, resizeMode: "cover" },
  chartImgEmpty: { width: "100%", height: 140, alignItems: "center", justifyContent: "center" },
  marker: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", transform: [{ translateX: -13 }, { translateY: -13 }] },
  markerActive: { backgroundColor: "#fff" },
  markerText: { color: "#000", fontFamily: DISPLAY.extraBold, fontSize: 12 },
  markerTextActive: { color: "#000" },
  callout: { flexDirection: "row", gap: 8, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "transparent" },
  calloutActive: { backgroundColor: "rgba(57,255,20,0.08)", borderColor: "rgba(57,255,20,0.4)" },
  calloutBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  calloutBadgeText: { color: "#000", fontFamily: DISPLAY.extraBold, fontSize: 10 },
  calloutText: { flex: 1, color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 18 },

  downloadBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingVertical: 13 },
  downloadBtnText: { color: "rgba(255,255,255,0.85)", fontFamily: DISPLAY.bold, fontSize: 13 },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 13 },
  nextBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },

  slot: { height: 100, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  slotFilled: { borderStyle: "solid", borderColor: "rgba(57,255,20,0.4)" },
  slotImg: { width: "100%", height: "100%", borderRadius: 8, resizeMode: "cover" },
  slotClear: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, padding: 3 },
  slotLabel: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 8, textTransform: "uppercase", textAlign: "center", marginTop: 6 },

  tfLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  sectionNote: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20 },
  eventsText: { color: "rgba(251,191,36,0.8)", fontFamily: BODY.regular, fontSize: 12, marginTop: 6 },
  chartLabel: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700", marginBottom: 6 },

  summaryCard: { borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)", borderRadius: 16, padding: 16 },
  summaryLabel: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  summaryValue: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 15, marginTop: 3 },

  disclaimerBox: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10 },
  disclaimerText: { color: "rgba(255,255,255,0.45)", fontFamily: BODY.regular, fontSize: 11, lineHeight: 16 },

  recentThumb: { width: 96, height: 72, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center", gap: 4, padding: 6 },
  recentSymbol: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 9 },
  recentDelete: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, padding: 4 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", padding: 20 },
  streaksCard: { width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "#0a0a0a", borderRadius: 16, padding: 20 },
  statTile: { flexBasis: "47%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 12 },
  statTileLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase" },
  statTileValue: { fontFamily: DISPLAY.extraBold, fontSize: 24 },
  buyCreditsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 13, marginTop: 16 },
  buyCreditsBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },

  paywallCard: { width: "100%", maxWidth: 460, borderWidth: 1, borderColor: "rgba(57,255,20,0.3)", backgroundColor: "#0a0a0a", borderRadius: 16, padding: 20 },
  paywallSub: { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 13, marginTop: 8, marginBottom: 10 },
  packCard: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16, alignItems: "center" },
  packCardPopular: { borderColor: "rgba(57,255,20,0.6)", backgroundColor: "rgba(57,255,20,0.06)" },
  popularChip: { backgroundColor: PRIMARY, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  popularChipText: { color: "#000", fontFamily: MONO.regular, fontSize: 9, textTransform: "uppercase", fontWeight: "700" },
  packLabel: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  packCredits: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 30, marginTop: 4 },
  packCreditsWord: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  packPrice: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 18, marginTop: 6 },
  buyBtn: { backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginTop: 12 },
  buyBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },
});
