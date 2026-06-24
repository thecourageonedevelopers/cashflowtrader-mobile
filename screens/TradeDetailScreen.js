import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { journalApi } from "../src/api/journal";
import { tokenService } from "../src/services/tokenService";
import { formatDate, formatMoney, moneyColor } from "../src/utils/format";
import { useAlert } from "../src/context/AlertContext";

const PRIMARY = "#39FF14";
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";
const AMBER = "#FBBF24";
const RED = "#f87171";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtHold(m) {
  if (!m || m <= 0) return "—";
  const total = Math.round(m);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const u = (n, w) => `${n} ${w}${n !== 1 ? "s" : ""}`;
  if (days > 0) return hours ? `${u(days, "day")} ${u(hours, "hour")}` : u(days, "day");
  if (hours > 0) return mins ? `${u(hours, "hour")} ${u(mins, "minute")}` : u(hours, "hour");
  return u(mins, "minute");
}

// ─────────────────────────────────────────────────────────────────────────────
// Small components
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Text style={s.sectionLabel}>{children}</Text>
  );
}

function DetailStat({ label, value, valueColor }) {
  return (
    <View style={s.detailStat}>
      <Text style={s.detailStatLabel}>{label}</Text>
      <Text style={[s.detailStatVal, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function TagRow({ label, items, tagStyle, textStyle }) {
  if (!items?.length) return null;
  return (
    <View style={s.tagRow}>
      <Text style={s.tagRowLabel}>{label}</Text>
      <View style={s.tagRowPills}>
        {items.map((t, i) => (
          <View key={i} style={[s.tagPill, tagStyle]}>
            <Text style={[s.tagPillText, textStyle]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StorageImage({ path, token }) {
  if (!path || !token) return null;
  const url = `${API_URL}/api/files/${path}?auth=${encodeURIComponent(token)}`;
  return (
    <Image
      source={{ uri: url }}
      style={s.chartImage}
      resizeMode="contain"
    />
  );
}

function ChartSlot({ label, accentColor, path, file, onPick, token }) {
  return (
    <View style={s.chartSlot}>
      <Text style={[s.chartSlotLabel, { color: accentColor }]}>{label}</Text>
      {file ? (
        <View style={[s.chartSlotPlaceholder, { borderColor: PRIMARY + "55" }]}>
          <Ionicons name="image-outline" size={20} color={PRIMARY} />
          <Text style={s.chartSlotFileName} numberOfLines={1}>{file.fileName || "Selected"}</Text>
        </View>
      ) : path ? (
        <StorageImage path={path} token={token} />
      ) : (
        <View style={s.chartSlotEmpty}>
          <Text style={s.chartSlotEmptyText}>No {label.toLowerCase()} chart yet</Text>
        </View>
      )}
      <TouchableOpacity style={s.chartSlotBtn} onPress={onPick}>
        <Ionicons name="image-outline" size={14} color="rgba(255,255,255,0.6)" />
        <Text style={s.chartSlotBtnText}>
          {path || file ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()} chart`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChartReviewResult({ review }) {
  if (!review) return null;
  return (
    <View style={s.reviewCard}>
      {review.verdict ? (
        <View style={s.reviewVerdict}>
          <Text style={s.reviewVerdictLabel}>VERDICT</Text>
          <Text style={s.reviewVerdictText}>{review.verdict}</Text>
        </View>
      ) : null}
      {review.strengths?.length ? (
        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>STRENGTHS</Text>
          {review.strengths.map((str, i) => (
            <View key={i} style={s.reviewBullet}>
              <View style={[s.reviewDot, { backgroundColor: PRIMARY }]} />
              <Text style={s.reviewBulletText}>{str}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {review.mistakes?.length ? (
        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>MISTAKES</Text>
          {review.mistakes.map((m, i) => (
            <View key={i} style={s.reviewBullet}>
              <View style={[s.reviewDot, { backgroundColor: RED }]} />
              <Text style={s.reviewBulletText}>{m}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {review.matches?.length ? (
        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>PATTERN MATCHES</Text>
          {review.matches.map((m, i) => (
            <View key={i} style={s.reviewBullet}>
              <View style={[s.reviewDot, { backgroundColor: AMBER }]} />
              <Text style={s.reviewBulletText}>{m}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {review.recommendation ? (
        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>RECOMMENDATION</Text>
          <Text style={s.reviewBulletText}>{review.recommendation}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function TradeDetailScreen({ navigation, route }) {
  const { showAlert } = useAlert();
  const { entry } = route.params;

  const [token, setToken] = useState("");
  const [review, setReview] = useState(entry?.chart_review || null);
  const [beforePath, setBeforePath] = useState(entry?.before_screenshot || "");
  const [afterPath, setAfterPath] = useState(entry?.after_screenshot || "");
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    tokenService.get().then((t) => setToken(t || ""));
  }, []);

  const result = (entry.result || "").toLowerCase();
  const direction = (entry.direction || "").toLowerCase();
  const isWin = result === "win";
  const isLoss = result === "loss";
  const pnl = parseFloat(entry.pnl ?? 0);

  const pickChart = async (slot) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert({ type: "warning", title: "Permission required", message: "Allow photo access in your device Settings." });
      return;
    }
    const result2 = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result2.canceled) return;
    const asset = result2.assets[0];
    if (slot === "before") setBeforeFile(asset);
    else setAfterFile(asset);
  };

  const analyzeCharts = async () => {
    if (!beforeFile && !afterFile && !beforePath && !afterPath) {
      showAlert({ type: "warning", title: "Charts needed", message: "Add a before or after chart to analyze." });
      return;
    }
    setAnalyzing(true);
    try {
      const fd = new FormData();
      if (beforeFile) {
        fd.append("before", {
          uri: beforeFile.uri,
          type: beforeFile.mimeType || "image/jpeg",
          name: beforeFile.fileName || "before.jpg",
        });
      }
      if (afterFile) {
        fd.append("after", {
          uri: afterFile.uri,
          type: afterFile.mimeType || "image/jpeg",
          name: afterFile.fileName || "after.jpg",
        });
      }
      const { data } = await journalApi.chartReview(entry.entry_id, fd);
      setReview(data.chart_review);
      setBeforePath(data.before_screenshot || beforePath);
      setAfterPath(data.after_screenshot || afterPath);
      setBeforeFile(null);
      setAfterFile(null);
      showAlert({ type: "success", title: "Done", message: "AI chart review saved to this trade." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not analyze the charts." });
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadPdf = async () => {
    // Opens the PDF in the device browser. The server accepts ?auth=<token>
    // for file endpoints; the PDF endpoint uses the same pattern.
    // Install expo-file-system + expo-sharing for an in-app download UX.
    setDownloading(true);
    try {
      const t = token || (await tokenService.get()) || "";
      const url = `${API_URL}/api/journal/${entry.entry_id}/pdf?auth=${encodeURIComponent(t)}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("Cannot open URL");
      await Linking.openURL(url);
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not open PDF. Try from the web app." });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <View style={s.stickyHeader}>
        <View style={s.stickyHeaderInner}>
          {/* Badge row */}
          <View style={s.badgeRow}>
            {entry.market ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{entry.market}</Text>
              </View>
            ) : null}
            {direction ? (
              <View style={[s.badge, { borderColor: (direction === "long" ? PRIMARY : RED) + "55", backgroundColor: (direction === "long" ? PRIMARY : RED) + "1A" }]}>
                <Ionicons
                  name={direction === "long" ? "trending-up-outline" : "trending-down-outline"}
                  size={11}
                  color={direction === "long" ? PRIMARY : RED}
                  style={{ marginRight: 4 }}
                />
                <Text style={[s.badgeText, { color: direction === "long" ? PRIMARY : RED }]}>
                  {direction.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {result ? (
              <View style={[s.badge, { borderColor: (isWin ? PRIMARY : isLoss ? RED : "rgba(255,255,255,0.3)") + "55", backgroundColor: (isWin ? PRIMARY : isLoss ? RED : "rgba(255,255,255,0.1)") + "1A" }]}>
                <Text style={[s.badgeText, { color: isWin ? PRIMARY : isLoss ? RED : "#fff" }]}>
                  {result.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {entry.status && entry.status !== "logged" ? (
              <View style={[s.badge, { borderColor: AMBER + "55", backgroundColor: AMBER + "1A" }]}>
                <Text style={[s.badgeText, { color: AMBER }]}>{entry.status.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          {/* Trade name */}
          <Text style={s.tradeName}>{entry.trade_name || "Untitled Trade"}</Text>

          {/* Date */}
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
            <Text style={s.dateText}>{formatDate(entry.date)}</Text>
          </View>
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* P&L hero grid (4 cols) */}
        <View style={s.grid4}>
          <DetailStat
            label="P&L"
            value={formatMoney(pnl, "INR", { showSign: true })}
            valueColor={moneyColor(pnl)}
          />
          <DetailStat label="Market" value={entry.market || "—"} />
          <DetailStat label="Direction" value={(entry.direction || "—").toUpperCase()} />
          <DetailStat
            label="Result"
            value={result ? result.toUpperCase() : "—"}
            valueColor={isWin ? PRIMARY : isLoss ? RED : "#fff"}
          />
        </View>

        {/* Timing grid (conditional) */}
        {(entry.open_time || entry.close_time || entry.holding_minutes) ? (
          <View style={s.grid3}>
            <DetailStat label="Open Time" value={entry.open_time || "—"} />
            <DetailStat label="Close Time" value={entry.close_time || "—"} />
            <DetailStat label="Holding" value={fmtHold(entry.holding_minutes)} valueColor={PRIMARY} />
          </View>
        ) : null}

        {/* Execution grid (conditional) */}
        {(entry.entry_price || entry.exit_price || entry.lot_size) ? (
          <View style={s.grid3}>
            <DetailStat label="Entry Price" value={String(entry.entry_price || "—")} />
            <DetailStat label="Exit Price" value={String(entry.exit_price || "—")} />
            <DetailStat label="Lot Size" value={String(entry.lot_size || "—")} />
          </View>
        ) : null}

        {/* AI Chart Review */}
        <View style={s.section}>
          <SectionLabel>AI Chart Review</SectionLabel>
          <View style={s.chartGrid}>
            <ChartSlot
              label="Before"
              accentColor={AMBER}
              path={beforePath}
              file={beforeFile}
              onPick={() => pickChart("before")}
              token={token}
            />
            <ChartSlot
              label="After"
              accentColor={PRIMARY}
              path={afterPath}
              file={afterFile}
              onPick={() => pickChart("after")}
              token={token}
            />
          </View>

          {/* Analyze button */}
          <TouchableOpacity
            style={[
              s.analyzeBtn,
              (analyzing || (!beforeFile && !afterFile && !beforePath && !afterPath)) && { opacity: 0.5 },
            ]}
            onPress={analyzeCharts}
            disabled={analyzing || (!beforeFile && !afterFile && !beforePath && !afterPath)}
          >
            <Ionicons
              name={analyzing ? "time-outline" : "sparkles-outline"}
              size={16}
              color="#000"
              style={{ marginRight: 6 }}
            />
            <Text style={s.analyzeBtnText}>
              {analyzing ? "Analyzing…" : review ? "Re-analyze with AI" : "Analyze with AI"}
            </Text>
          </TouchableOpacity>

          {!review ? (
            <Text style={s.analyzeHint}>
              Add your before (setup) &amp; after (outcome) charts — AI spots the mistakes and strengths.
            </Text>
          ) : (
            <ChartReviewResult review={review} />
          )}
        </View>

        {/* Categorization */}
        {(entry.setup_tags?.length || entry.emotions?.length || entry.mistakes?.length) ? (
          <View style={s.section}>
            <SectionLabel>Categorization</SectionLabel>
            <View style={{ gap: 10 }}>
              <TagRow
                label="Setups"
                items={entry.setup_tags}
                tagStyle={s.tagSetup}
                textStyle={s.tagTextSetup}
              />
              <TagRow
                label="Emotions"
                items={entry.emotions}
                tagStyle={s.tagEmotion}
                textStyle={s.tagTextEmotion}
              />
              <TagRow
                label="Mistakes"
                items={entry.mistakes}
                tagStyle={s.tagMistake}
                textStyle={s.tagTextMistake}
              />
            </View>
          </View>
        ) : null}

        {/* Voice Notes */}
        {(entry.before_voice_transcript || entry.after_voice_transcript) ? (
          <View style={s.section}>
            <SectionLabel>Voice Notes</SectionLabel>
            {entry.before_voice_transcript ? (
              <View style={s.voiceCardBefore}>
                <View style={s.voiceHeader}>
                  <Ionicons name="mic-outline" size={15} color={AMBER} />
                  <Text style={[s.voiceLabel, { color: AMBER + "CC" }]}>Before · transcribed</Text>
                </View>
                <Text style={s.voiceText}>&ldquo;{entry.before_voice_transcript}&rdquo;</Text>
              </View>
            ) : null}
            {entry.after_voice_transcript ? (
              <View style={s.voiceCardAfter}>
                <View style={s.voiceHeader}>
                  <Ionicons name="mic-outline" size={15} color={PRIMARY} />
                  <Text style={[s.voiceLabel, { color: PRIMARY }]}>After · transcribed</Text>
                </View>
                <Text style={s.voiceText}>&ldquo;{entry.after_voice_transcript}&rdquo;</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Reflection */}
        {entry.reflection ? (
          <View style={s.section}>
            <SectionLabel>Reflection</SectionLabel>
            <View style={s.reflectionCard}>
              <Text style={s.reflectionText}>&ldquo;{entry.reflection}&rdquo;</Text>
            </View>
          </View>
        ) : null}

        {/* Chart symbol */}
        {entry.chart_symbol ? (
          <View style={s.chartSymbolRow}>
            <Ionicons name="bar-chart-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.chartSymbolText}>
              Chart symbol: <Text style={{ color: PRIMARY }}>{entry.chart_symbol}</Text>
            </Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.detailFooter}>
          <Text style={s.loggedText}>
            Logged {(entry.created_at || "").slice(0, 19).replace("T", " ")}
          </Text>
          <TouchableOpacity
            style={[s.pdfBtn, downloading && { opacity: 0.5 }]}
            onPress={downloadPdf}
            disabled={downloading}
          >
            <Ionicons
              name={downloading ? "time-outline" : "download-outline"}
              size={15}
              color="#000"
              style={{ marginRight: 6 }}
            />
            <Text style={s.pdfBtnText}>{downloading ? "Downloading..." : "Download PDF"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Sticky header
  stickyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  stickyHeaderInner: { flex: 1, marginRight: 8 },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tradeName: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // Detail stat grids
  grid4: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  grid3: {
    flexDirection: "row",
    gap: 10,
  },
  detailStat: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 8,
    padding: 12,
  },
  detailStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailStatVal: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 18,
    lineHeight: 22,
  },

  // Section
  section: { gap: 10 },
  sectionLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },

  // Chart slots
  chartGrid: {
    flexDirection: "row",
    gap: 10,
  },
  chartSlot: { flex: 1, gap: 6 },
  chartSlotLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  chartSlotEmpty: {
    height: 100,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  chartSlotEmptyText: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  chartSlotPlaceholder: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chartSlotFileName: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingHorizontal: 8,
  },
  chartImage: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  chartSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  chartSlotBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  analyzeBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  analyzeHint: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
  },

  // Chart review result
  reviewCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: PRIMARY + "30",
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  reviewVerdict: { gap: 4 },
  reviewVerdictLabel: {
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  reviewVerdictText: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  reviewSection: { gap: 6 },
  reviewSectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  reviewBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  reviewBulletText: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  // Tag rows
  tagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tagRowLabel: {
    width: 70,
    flexShrink: 0,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  tagRowPills: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  tagSetup: { borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)" },
  tagTextSetup: { color: "#fff" },
  tagEmotion: { borderColor: PRIMARY + "55", backgroundColor: PRIMARY + "14" },
  tagTextEmotion: { color: PRIMARY },
  tagMistake: { borderColor: RED + "66", backgroundColor: RED + "14" },
  tagTextMistake: { color: RED },

  // Voice notes
  voiceCardBefore: {
    padding: 14,
    borderWidth: 1,
    borderColor: AMBER + "50",
    backgroundColor: AMBER + "0A",
    borderRadius: 8,
  },
  voiceCardAfter: {
    padding: 14,
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    backgroundColor: PRIMARY + "0A",
    borderRadius: 8,
  },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  voiceLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  voiceText: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },

  // Reflection
  reflectionCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
  },
  reflectionText: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 22,
  },

  // Chart symbol
  chartSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chartSymbolText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // Footer
  detailFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
  },
  loggedText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  pdfBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  pdfBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
