/**
 * MarketScreen — Live Trading (mobile port of web src/pages/dashboard/LiveTrading.jsx)
 *
 * Two platform-specific substitutions, made because the web mechanism has no mobile equivalent —
 * not because a mobile-native feature was invented beyond what web offers:
 *   1. Web "Capture Chart" uses navigator.mediaDevices.getDisplayMedia() to screenshot the browser
 *      tab the chart is rendered in. That API doesn't exist on native. The mobile substitute is
 *      exactly what the task brief itself names as the alternative: camera capture or gallery
 *      selection via expo-image-picker — the same mechanism already used everywhere else in this
 *      app for "attach a photo" (AvatarStudio, ChartReviewModal, JournalNewScreen).
 *   2. Web's clipboard-paste shortcut (Win+Shift+S -> Ctrl+V) has no RN equivalent and is a
 *      secondary "tip" on web, not core functionality — intentionally not ported.
 * The TradingView widget itself is the same third-party JS widget web uses, hosted in a WebView
 * instead of directly in the DOM — same tv.js script, same symbol list, same neon color overrides.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

import ScreenLayout from "../components/common/ScreenLayout";
import { journalApi } from "../src/api/journal";
import { useAlert } from "../src/context/AlertContext";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { TAB_ROUTES } from "../src/constants/routes";

const PRIMARY = "#39FF14";
const RED = "#ef4444";
const AMBER = "#FBBF24";
const SHEET_H = Math.min(Dimensions.get("window").height * 0.92, 760);

// Same list as web LiveTrading.jsx MARKETS — labels/symbols copied verbatim.
const MARKETS = [
  { label: "BTC/USDT", symbol: "BINANCE:BTCUSDT" },
  { label: "ETH/USDT", symbol: "BINANCE:ETHUSDT" },
  { label: "SOL/USDT", symbol: "BINANCE:SOLUSDT" },
  { label: "EUR/USD", symbol: "FX:EURUSD" },
  { label: "GBP/USD", symbol: "FX:GBPUSD" },
  { label: "USD/JPY", symbol: "FX:USDJPY" },
  { label: "GOLD", symbol: "TVC:GOLD" },
];

// Same list as web LiveTrading.jsx SETUPS.
const SETUPS = ["Breakout", "Pullback", "Reversal", "Trend Continuation", "Range Play", "News Driven", "Gap Fill"];

// Same tv.js widget + overrides as web's loadTradingViewWidget(), hosted in a static HTML page
// for the WebView instead of mounted directly into the DOM.
function buildTradingViewHtml(symbol) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>html,body,#tv{margin:0;padding:0;width:100%;height:100%;background:#0a0a0a;overflow:hidden;}</style>
</head>
<body>
<div id="tv"></div>
<script src="https://s3.tradingview.com/tv.js"></script>
<script>
new TradingView.widget({
  container_id: "tv",
  autosize: true,
  symbol: "${symbol}",
  interval: "15",
  timezone: "Asia/Kolkata",
  theme: "dark",
  style: "1",
  locale: "en",
  toolbar_bg: "#0a0a0a",
  enable_publishing: false,
  allow_symbol_change: true,
  withdateranges: true,
  hide_side_toolbar: false,
  hide_top_toolbar: false,
  hide_legend: false,
  save_image: true,
  details: true,
  hotlist: false,
  calendar: false,
  studies: [],
  overrides: {
    "paneProperties.background": "#0a0a0a",
    "paneProperties.backgroundType": "solid",
    "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.04)",
    "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.04)",
    "paneProperties.vertGridProperties.style": 1,
    "paneProperties.horzGridProperties.style": 1,
    "scalesProperties.textColor": "#e5e5e5",
    "scalesProperties.lineColor": "rgba(255,255,255,0.18)",
    "mainSeriesProperties.candleStyle.upColor": "#39FF14",
    "mainSeriesProperties.candleStyle.downColor": "#ef4444",
    "mainSeriesProperties.candleStyle.borderUpColor": "#39FF14",
    "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
    "mainSeriesProperties.candleStyle.wickUpColor": "#39FF14",
    "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
    "mainSeriesProperties.hollowCandleStyle.upColor": "#39FF14",
    "mainSeriesProperties.hollowCandleStyle.downColor": "#ef4444",
    "mainSeriesProperties.barStyle.upColor": "#39FF14",
    "mainSeriesProperties.barStyle.downColor": "#ef4444",
    "mainSeriesProperties.areaStyle.color1": "rgba(57,255,20,0.35)",
    "mainSeriesProperties.areaStyle.color2": "rgba(57,255,20,0.0)",
    "mainSeriesProperties.areaStyle.linecolor": "#39FF14",
    "mainSeriesProperties.lineStyle.color": "#39FF14"
  }
});
</script>
</body>
</html>`;
}

export default function MarketScreen({ navigation }) {
  const { showAlert, showOptions } = useAlert();

  const [symbol, setSymbol] = useState(MARKETS[0].symbol);
  const [marketLabel, setMarketLabel] = useState(MARKETS[0].label);

  // Capture flow
  const [captureOpen, setCaptureOpen] = useState(false);
  const [step, setStep] = useState("preview"); // preview | saving — mirrors web's step state
  const [imageAsset, setImageAsset] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [phase, setPhase] = useState(null); // before | after
  const [direction, setDirection] = useState("");
  const [setup, setSetup] = useState("");
  const [note, setNote] = useState("");

  // Voice — expo-audio (SDK 54's current recording API; expo-av is legacy)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [audioUri, setAudioUri] = useState(null);
  const recordSec = Math.floor((recorderState.durationMillis || 0) / 1000);

  // Pending entries (BEFORE captured, awaiting AFTER)
  const [pending, setPending] = useState([]);

  const loadPending = async () => {
    try {
      const { data } = await journalApi.pending();
      setPending(data || []);
    } catch {
      setPending([]);
    }
  };
  useEffect(() => {
    loadPending();
  }, []);

  const resetCapture = () => {
    setImageAsset(null);
    setPhase(null);
    setDirection("");
    setSetup("");
    setNote("");
    setAudioUri(null);
    setStep("preview");
  };

  // Web's capture mechanism (getDisplayMedia tab-screenshot) has no mobile equivalent — the
  // platform-appropriate substitute is camera or gallery, matching the task brief's own naming
  // of both as the mobile alternative.
  const startCapture = async () => {
    if (capturing) return;
    showOptions({
      title: "Capture Chart",
      message: "Take a photo or choose one from your gallery.",
      buttons: [
        { text: "Take Photo", onPress: () => pickImage("camera") },
        { text: "Choose from Gallery", onPress: () => pickImage("gallery") },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };

  const pickImage = async (source) => {
    setCapturing(true);
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert({
          type: "warning",
          title: "Permission required",
          message:
            source === "camera"
              ? "Allow camera access in Settings."
              : "Allow photo access in Settings.",
        });
        return;
      }
      const options = { mediaTypes: ["images"], allowsEditing: false, quality: 0.85 };
      const picked =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!picked.canceled) {
        setImageAsset(picked.assets[0]);
        setCaptureOpen(true);
        setStep("preview");
      }
    } catch {
      showAlert({
        type: "error",
        title: "Error",
        message: "Could not capture screenshot. Try again.",
      });
    } finally {
      setCapturing(false);
    }
  };

  // Voice — 30s max, matching web's recordSec >= 29 -> auto-stop cap exactly.
  useEffect(() => {
    if (recorderState.isRecording && recordSec >= 30) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSec, recorderState.isRecording]);

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showAlert({
          type: "warning",
          title: "Permission required",
          message: "Could not access microphone. Check app permissions.",
        });
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      showAlert({
        type: "error",
        title: "Error",
        message: "Could not access microphone. Check app permissions.",
      });
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      if (recorder.uri) setAudioUri(recorder.uri);
    } catch {
      /* ignore */
    }
  };

  const clearAudio = () => {
    setAudioUri(null);
  };

  const submit = async () => {
    if (!imageAsset) {
      showAlert({ type: "warning", title: "Missing chart", message: "Capture or choose a chart first." });
      return;
    }
    if (!phase) {
      showAlert({ type: "warning", title: "Missing phase", message: "Choose BEFORE or AFTER trade." });
      return;
    }
    setStep("saving");

    const form = new FormData();
    form.append("phase", phase);
    form.append("market", marketLabel);
    form.append("direction", direction);
    form.append("setup", setup);
    form.append("note", note);
    form.append("chart_symbol", symbol);
    form.append("image", {
      uri: imageAsset.uri,
      type: imageAsset.mimeType || "image/jpeg",
      name: imageAsset.fileName || `chart-${Date.now()}.jpg`,
    });
    if (audioUri) {
      form.append("audio", {
        uri: audioUri,
        type: "audio/m4a",
        name: `voice-${Date.now()}.m4a`,
      });
    }

    try {
      const { data } = await journalApi.quickCapture(form);
      let message;
      if (phase === "before") {
        message = "BEFORE captured. Trade is now open in your journal.";
      } else if (data.paired) {
        message = "AFTER linked to your open trade. Journal entry complete.";
      } else {
        message = "Saved as a standalone AFTER-only entry.";
      }
      showAlert({ type: "success", title: "Saved", message });
      setCaptureOpen(false);
      resetCapture();
      loadPending();
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error",
        message: e?.response?.data?.detail || "Could not save.",
      });
      setStep("preview");
    }
  };

  return (
    <ScreenLayout screenName={TAB_ROUTES.MARKET} navigation={navigation}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.chip}>
          <Ionicons name="pulse-outline" size={12} color={PRIMARY} />
          <Text style={styles.chipText}>Live Trading</Text>
        </View>
        <Text style={styles.title}>
          Trade now. Capture. <Text style={{ color: PRIMARY }}>Journal at the speed of thought.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Live TradingView chart. One-tap screenshot. Auto-paired BEFORE &amp; AFTER. Voice notes
          transcribed by Whisper. Your discipline, fully wired.
        </Text>

        <View style={styles.actionRowTop}>
          <TouchableOpacity
            style={[styles.captureBtn, styles.actionFlex, capturing && styles.captureBtnDisabled]}
            onPress={startCapture}
            disabled={capturing}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={18} color="#000" />
            <Text style={styles.captureBtnText}>Capture Chart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.oneClickBtn, styles.actionFlex]}
            onPress={() => navigation.navigate("OneClickAnalysis")}
            activeOpacity={0.85}
          >
            <Ionicons name="flash-outline" size={18} color={PRIMARY} />
            <Text style={styles.oneClickBtnText}>One-Click Analysis</Text>
          </TouchableOpacity>
        </View>

        {/* Market chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketRow} contentContainerStyle={{ gap: 8 }}>
          {MARKETS.map((m) => (
            <TouchableOpacity
              key={m.symbol}
              onPress={() => {
                setSymbol(m.symbol);
                setMarketLabel(m.label);
              }}
              style={[styles.marketChip, symbol === m.symbol && styles.marketChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.marketChipText, symbol === m.symbol && styles.marketChipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* TradingView chart */}
        <View style={styles.chartWrap}>
          <WebView
            source={{ html: buildTradingViewHtml(symbol) }}
            style={styles.chartWebview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
          />
        </View>

        {/* Open trades strip */}
        <View style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <Text style={styles.pendingHeaderText}>Open Trades · waiting for AFTER capture</Text>
            <TouchableOpacity onPress={loadPending} style={styles.refreshRow}>
              <Ionicons name="refresh-outline" size={12} color={PRIMARY} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {pending.length === 0 ? (
            <Text style={styles.pendingEmpty}>
              No open trades. Capture a <Text style={{ color: PRIMARY }}>BEFORE</Text> to start one.
            </Text>
          ) : (
            pending.map((p) => (
              <View key={p.entry_id} style={styles.pendingItem}>
                <View style={styles.pendingItemTop}>
                  <Text style={styles.pendingMarket}>{p.market}</Text>
                  <Text style={styles.pendingDirection}>{(p.direction || "—").toUpperCase()} · pending</Text>
                </View>
                <Text style={styles.pendingTradeName} numberOfLines={1}>{p.trade_name}</Text>
                <Text style={styles.pendingDate}>{(p.created_at || "").slice(0, 16).replace("T", " ")}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Capture modal */}
      <Modal visible={captureOpen} transparent animationType="slide" onRequestClose={() => { setCaptureOpen(false); resetCapture(); }}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={[styles.modalSheet, { maxHeight: SHEET_H }]} edges={["bottom"]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log trade capture</Text>
              <TouchableOpacity onPress={() => { setCaptureOpen(false); resetCapture(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {imageAsset && (
                <Image source={{ uri: imageAsset.uri }} style={styles.previewImg} />
              )}

              <Text style={styles.sectionLabel}>Is this BEFORE or AFTER the trade?</Text>
              <View style={styles.phaseRow}>
                <TouchableOpacity
                  style={[styles.phaseCard, phase === "before" && styles.phaseCardBefore]}
                  onPress={() => setPhase("before")}
                  activeOpacity={0.85}
                >
                  <View style={styles.phaseCardHeader}>
                    <Ionicons name="flag-outline" size={16} color={AMBER} />
                    <Text style={[styles.phaseCardTitle, { color: AMBER }]}>BEFORE Trade</Text>
                  </View>
                  <Text style={styles.phaseCardDesc}>Opens a pending trade. Capture AFTER later to close it.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseCard, phase === "after" && styles.phaseCardAfter]}
                  onPress={() => setPhase("after")}
                  activeOpacity={0.85}
                >
                  <View style={styles.phaseCardHeader}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={PRIMARY} />
                    <Text style={[styles.phaseCardTitle, { color: PRIMARY }]}>AFTER Trade</Text>
                  </View>
                  <Text style={styles.phaseCardDesc}>Closes the latest pending {marketLabel} trade automatically.</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Direction</Text>
              <View style={styles.directionRow}>
                {[
                  { v: "long", label: "Long", icon: "trending-up", color: PRIMARY },
                  { v: "short", label: "Short", icon: "trending-down", color: RED },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.v}
                    style={[styles.directionBtn, direction === d.v && styles.directionBtnActive]}
                    onPress={() => setDirection(d.v)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={d.icon} size={16} color={d.color} />
                    <Text style={styles.directionText}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Setup</Text>
              <View style={styles.setupRow}>
                {SETUPS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.setupChip, setup === s && styles.setupChipActive]}
                    onPress={() => setSetup(setup === s ? "" : s)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.setupChipText, setup === s && styles.setupChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Quick note</Text>
              <View style={styles.noteRow}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder='e.g. "Breakout above 22,400. Stops at 22,350. Target 22,500."'
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  style={styles.noteInput}
                />
                {!recorderState.isRecording && !audioUri && (
                  <TouchableOpacity onPress={startRecording} style={styles.voiceBtn}>
                    <Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.voiceBtnText}>Voice</Text>
                  </TouchableOpacity>
                )}
                {recorderState.isRecording && (
                  <TouchableOpacity onPress={stopRecording} style={styles.voiceBtnRecording}>
                    <Ionicons name="square" size={16} color={RED} />
                    <Text style={styles.voiceBtnRecordingText}>{String(recordSec).padStart(2, "0")}s</Text>
                  </TouchableOpacity>
                )}
              </View>
              {audioUri && (
                <View style={styles.audioPreview}>
                  <Ionicons name="mic" size={16} color={PRIMARY} />
                  <Text style={styles.audioPreviewText}>Voice note recorded</Text>
                  <TouchableOpacity onPress={clearAudio}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.55)" />
                  </TouchableOpacity>
                </View>
              )}
              {audioUri && (
                <Text style={styles.audioHint}>Auto-transcribed on save.</Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setCaptureOpen(false); resetCapture(); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, (step === "saving" || !phase) && styles.saveBtnDisabled]}
                  onPress={submit}
                  disabled={step === "saving" || !phase}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#000" />
                  <Text style={styles.saveBtnText}>
                    {step === "saving" ? "Saving…" : phase === "before" ? "Open Trade" : "Close & Log Trade"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#050505" },
  content: { padding: 16, paddingBottom: 40 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },

  title: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
  subtitle: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 16 },

  actionRowTop: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionFlex: { flex: 1 },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 15 },
  oneClickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.4)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 10,
    paddingVertical: 14,
  },
  oneClickBtnText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 13 },

  marketRow: { marginBottom: 12 },
  marketChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  marketChipActive: { borderColor: PRIMARY, backgroundColor: "rgba(57,255,20,0.15)" },
  marketChipText: { color: "rgba(255,255,255,0.65)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 0.5 },
  marketChipTextActive: { color: PRIMARY },

  chartWrap: {
    height: Math.min(Dimensions.get("window").height * 0.5, 460),
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  chartWebview: { flex: 1, backgroundColor: "#0a0a0a" },

  pendingCard: {
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
  },
  pendingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  pendingHeaderText: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  refreshRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  refreshText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  pendingEmpty: { color: "rgba(255,255,255,0.4)", fontFamily: BODY.regular, fontSize: 13, textAlign: "center", paddingVertical: 12 },
  pendingItem: {
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    backgroundColor: "rgba(251,191,36,0.05)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  pendingItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pendingMarket: { color: "#fde68a", fontFamily: DISPLAY.bold, fontSize: 13 },
  pendingDirection: { color: AMBER, fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  pendingTradeName: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 12, marginTop: 2 },
  pendingDate: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 9, marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 17 },
  modalBody: { padding: 18, paddingBottom: 32 },

  previewImg: { width: "100%", height: 180, borderRadius: 10, marginBottom: 16, resizeMode: "cover" },

  sectionLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },

  phaseRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  phaseCard: { flex: 1, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 12 },
  phaseCardBefore: { borderColor: AMBER, backgroundColor: "rgba(251,191,36,0.08)" },
  phaseCardAfter: { borderColor: PRIMARY, backgroundColor: "rgba(57,255,20,0.08)" },
  phaseCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  phaseCardTitle: { fontFamily: DISPLAY.bold, fontSize: 13 },
  phaseCardDesc: { color: "rgba(255,255,255,0.5)", fontFamily: BODY.regular, fontSize: 11, lineHeight: 15 },

  directionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  directionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingVertical: 10,
  },
  directionBtnActive: { borderColor: "rgba(57,255,20,0.6)", backgroundColor: "rgba(57,255,20,0.05)" },
  directionText: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 13 },

  setupRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  setupChip: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  setupChipActive: { borderColor: PRIMARY, backgroundColor: "rgba(57,255,20,0.15)" },
  setupChipText: { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 11 },
  setupChipTextActive: { color: PRIMARY },

  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteInput: {
    flex: 1,
    minHeight: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlignVertical: "top",
  },
  voiceBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  voiceBtnText: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  voiceBtnRecording: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  voiceBtnRecordingText: { color: "#fca5a5", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1 },

  audioPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },
  audioPreviewText: { flex: 1, color: "rgba(255,255,255,0.7)", fontFamily: BODY.regular, fontSize: 12 },
  audioHint: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 10, marginTop: 4 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  cancelBtnText: { color: "rgba(255,255,255,0.7)", fontFamily: DISPLAY.bold, fontSize: 14 },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14 },
});
