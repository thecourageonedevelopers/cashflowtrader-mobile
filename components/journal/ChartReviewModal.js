/**
 * ChartReviewModal + ChartReviewResult
 * Full port of React Web src/pages/dashboard/ChartReview.jsx
 *
 * ChartReviewResult — exported, used here and re-usable elsewhere.
 * ChartReviewModal  — default export, opened from AutoJournalCard "Analyze Setup".
 *
 * API: POST /journal/chart-review (FormData: before, after, context)
 * Returns: { verdict, before_match, after_match, before_issue, after_issue,
 *            summary, mistakes[], strengths[] }
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { journalApi } from "../../src/api/journal";
import { useAlert } from "../../src/context/AlertContext";

const PRIMARY = "#39FF14";
const RED = "#f87171";
const AMBER = "#FBBF24";

const SHEET_H = Math.min(Dimensions.get("window").height * 0.90, 700);

// ─────────────────────────────────────────────────────────────────────────────
// ChartReviewResult
// Mirrors web ChartReviewResult exactly (validation + summary + mistakes/strengths)
// ─────────────────────────────────────────────────────────────────────────────
export function ChartReviewResult({ review }) {
  if (!review) return null;

  const isInvalid = review.verdict === "invalid";
  const rows = [
    { side: "Before", match: review.before_match, issue: review.before_issue },
    { side: "After",  match: review.after_match,  issue: review.after_issue  },
  ].filter((r) => r.match && r.match !== "not_provided");

  return (
    <View style={cr.wrap}>
      {/* ── Validation card ──────────────────────────────────── */}
      {rows.length > 0 && (
        <View style={[cr.card, isInvalid ? cr.redCard : cr.greenCard]}>
          <View style={cr.cardHeaderRow}>
            <Ionicons
              name={isInvalid ? "warning-outline" : "checkmark-circle-outline"}
              size={12}
              color={isInvalid ? RED : PRIMARY}
              style={{ marginRight: 5 }}
            />
            <Text style={[cr.cardLabel, { color: isInvalid ? RED : PRIMARY }]}>
              {isInvalid
                ? "Upload mismatch — fix before reading the coaching"
                : "Charts match this trade"}
            </Text>
          </View>

          {rows.map((r) => {
            const ok     = r.match === "match";
            const unclear = r.match === "unclear";
            const color  = ok ? PRIMARY : unclear ? AMBER : RED;
            return (
              <View key={r.side} style={cr.matchRow}>
                <Ionicons
                  name={ok ? "checkmark-circle-outline" : "warning-outline"}
                  size={13}
                  color={color}
                  style={{ marginRight: 6, marginTop: 2, flexShrink: 0 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={cr.matchText}>
                    <Text style={{ fontFamily: "Inter_700Bold" }}>{r.side}:</Text>{" "}
                    {ok
                      ? "matches the recorded trade."
                      : unclear
                      ? "couldn't verify clearly."
                      : "does NOT match this trade."}
                  </Text>
                  {!ok && r.issue ? (
                    <Text style={cr.matchIssue}>{r.issue}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {isInvalid && (
            <Text style={cr.invalidHint}>
              Please re-upload a valid{" "}
              {review.before_match === "mismatch" ? "BEFORE" : ""}
              {review.before_match === "mismatch" && review.after_match === "mismatch" ? " and " : ""}
              {review.after_match === "mismatch" ? "AFTER" : ""} chart for this exact trade, then analyze again.
            </Text>
          )}
        </View>
      )}

      {/* ── Coach Summary ─────────────────────────────────────── */}
      {review.summary ? (
        <View style={[cr.card, cr.greenCard]}>
          <View style={cr.cardHeaderRow}>
            <Ionicons name="sparkles-outline" size={11} color={PRIMARY} style={{ marginRight: 5 }} />
            <Text style={[cr.cardLabel, { color: PRIMARY }]}>Coach Summary</Text>
          </View>
          <Text style={cr.bodyText}>{review.summary}</Text>
        </View>
      ) : null}

      {/* ── Mistakes + Strengths side-by-side ─────────────────── */}
      <View style={cr.twoCol}>
        <View style={[cr.card, cr.redCard, { flex: 1 }]}>
          <View style={cr.cardHeaderRow}>
            <Ionicons name="warning-outline" size={11} color={RED} style={{ marginRight: 5 }} />
            <Text style={[cr.cardLabel, { color: RED }]}>Mistakes</Text>
          </View>
          {review.mistakes?.length ? (
            review.mistakes.map((m, i) => (
              <View key={i} style={cr.listRow}>
                <Text style={[cr.bullet, { color: RED }]}>•</Text>
                <Text style={cr.bodyText}>{m}</Text>
              </View>
            ))
          ) : (
            <Text style={cr.emptyText}>None spotted — clean execution.</Text>
          )}
        </View>

        <View style={[cr.card, cr.greenCard, { flex: 1 }]}>
          <View style={cr.cardHeaderRow}>
            <Ionicons name="checkmark-circle-outline" size={11} color={PRIMARY} style={{ marginRight: 5 }} />
            <Text style={[cr.cardLabel, { color: PRIMARY }]}>Strengths</Text>
          </View>
          {review.strengths?.length ? (
            review.strengths.map((s, i) => (
              <View key={i} style={cr.listRow}>
                <Text style={[cr.bullet, { color: PRIMARY }]}>•</Text>
                <Text style={cr.bodyText}>{s}</Text>
              </View>
            ))
          ) : (
            <Text style={cr.emptyText}>Keep building — add a clear plan next time.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const cr = StyleSheet.create({
  wrap: { gap: 10 },

  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  greenCard: { borderColor: PRIMARY + "4D", backgroundColor: PRIMARY + "0D" },
  redCard:   { borderColor: RED   + "4D", backgroundColor: RED   + "0D" },

  cardHeaderRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  cardLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    flex: 1,
  },

  matchRow: { flexDirection: "row", alignItems: "flex-start" },
  matchText: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  matchIssue: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  invalidHint: {
    color: "#fecaca",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  bodyText: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  twoCol: { flexDirection: "row", gap: 8 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bullet: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 20, flexShrink: 0 },
  emptyText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ChartPicker tile
// Mirrors web ChartPicker — label + dashed upload zone + preview when selected
// ─────────────────────────────────────────────────────────────────────────────
function ChartPicker({ label, accentColor, asset, onPick }) {
  const { showAlert } = useAlert();
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert({ type: "warning", title: "Permission required", message: "Allow photo access in Settings." });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!picked.canceled) {
      onPick(picked.assets[0]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={[cp.label, { color: accentColor }]}>{label}</Text>
      <TouchableOpacity style={cp.zone} onPress={pick} activeOpacity={0.75}>
        {asset ? (
          <Image source={{ uri: asset.uri }} style={cp.preview} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={22} color="rgba(255,255,255,0.5)" />
            <Text style={cp.zoneText}>Add {label.toLowerCase()} chart</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const cp = StyleSheet.create({
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  zone: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 90,
  },
  zoneText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    resizeMode: "cover",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ChartReviewModal — default export
// Mirrors web ChartReviewModal from ChartReview.jsx
// ─────────────────────────────────────────────────────────────────────────────
export default function ChartReviewModal({ visible, onClose }) {
  const { showAlert } = useAlert();
  const [before,    setBefore]   = useState(null);
  const [after,     setAfter]    = useState(null);
  const [context,   setContext]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [review,    setReview]   = useState(null);

  const reset = () => {
    setBefore(null);
    setAfter(null);
    setContext("");
    setReview(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const analyze = async () => {
    if (!before && !after) {
      showAlert({ type: "warning", title: "Missing charts", message: "Add a before and/or after chart." });
      return;
    }
    setAnalyzing(true);
    try {
      const fd = new FormData();
      if (before) {
        fd.append("before", {
          uri:  before.uri,
          type: before.mimeType || "image/jpeg",
          name: before.fileName || "before.jpg",
        });
      }
      if (after) {
        fd.append("after", {
          uri:  after.uri,
          type: after.mimeType || "image/jpeg",
          name: after.fileName || "after.jpg",
        });
      }
      if (context.trim()) fd.append("context", context.trim());

      const { data } = await journalApi.standaloneChartReview(fd);
      setReview(data);
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not analyze the charts." });
    } finally {
      setAnalyzing(false);
    }
  };

  const canAnalyze = !analyzing && (!!before || !!after);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          {/* ── Header ─────────────────────────────────────────── */}
          <View style={mo.header}>
            <View style={{ flex: 1 }}>
              <View style={mo.chip}>
                <Ionicons name="sparkles-outline" size={11} color={PRIMARY} style={{ marginRight: 4 }} />
                <Text style={mo.chipText}>Analyze a Setup</Text>
              </View>
              <Text style={mo.title}>Before / After Chart Review</Text>
              <Text style={mo.subtitle}>
                Quick analysis only — not saved. To keep it, attach charts to a specific trade.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* ── Scrollable body ─────────────────────────────────── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={mo.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Chart pickers — 2 columns */}
            <View style={mo.pickerRow}>
              <ChartPicker label="Before" accentColor={AMBER} asset={before} onPick={setBefore} />
              <ChartPicker label="After"  accentColor={PRIMARY} asset={after}  onPick={setAfter} />
            </View>

            {/* Optional context */}
            <TextInput
              style={mo.contextInput}
              value={context}
              onChangeText={setContext}
              placeholder="Optional context — e.g. XAUUSD long, hit SL"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />

            {/* Analyze button */}
            <TouchableOpacity
              style={[mo.analyzeBtn, !canAnalyze && { opacity: 0.5 }]}
              onPress={analyze}
              disabled={!canAnalyze}
            >
              <Ionicons
                name={analyzing ? "hourglass-outline" : "sparkles-outline"}
                size={16}
                color="#000"
                style={{ marginRight: 8 }}
              />
              <Text style={mo.analyzeBtnText}>
                {analyzing ? "Analyzing charts…" : "Analyze with AI"}
              </Text>
            </TouchableOpacity>

            {/* Result */}
            {review ? (
              <View style={{ marginTop: 8 }}>
                <ChartReviewResult review={review} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const mo = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: SHEET_H,
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY + "4D",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY + "55",
    backgroundColor: PRIMARY + "15",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  chipText: {
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: { color: "#fff", fontFamily: "Inter_900Black", fontSize: 20, lineHeight: 26 },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    lineHeight: 15,
  },

  // Body
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  pickerRow: { flexDirection: "row", gap: 10 },
  contextInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  analyzeBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  analyzeBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 14 },
});
