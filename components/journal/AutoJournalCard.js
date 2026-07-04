/**
 * AutoJournalCard
 * Mirrors React Web src/pages/dashboard/AutoJournal.jsx exactly.
 * Visual: neon-green card, screenshot upload → AI extraction → confirmation modal.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { journalApi } from "../../src/api/journal";
import ChartReviewModal from "./ChartReviewModal";
import { useAlert } from "../../src/context/AlertContext";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import AmbientGlow from "../common/AmbientGlow";

const PRIMARY = "#39FF14";
const AMBER = "#FBBF24";

// ── Parse time string → Date (mirrors web parseT) ─────────────────────────
function parseT(s) {
  if (!s) return null;
  s = String(s).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m) {
    let h = +m[1];
    const mn = +m[2];
    const ap = (m[4] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(2000, 0, 1, h, mn, +(m[3] || 0));
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// ── Compute holding minutes from open/close times (mirrors web holdMins) ──
function holdMins(o, c) {
  const a = parseT(o);
  const b = parseT(c);
  if (!a || !b) return null;
  let diff = (b - a) / 60000;
  if (diff < 0) diff += 1440;
  if (diff < 0 || diff > 7 * 1440) return null;
  return Math.round(diff);
}

// ── Format holding minutes (mirrors web fmtMins) ──────────────────────────
function fmtMins(m) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return h && mn ? `${h}h ${mn}m` : h ? `${h}h` : `${mn}m`;
}

const CLOSE_LABEL = { tp: "Hit TP", sl: "Hit SL", manual: "Manual close", unknown: "Unknown" };

const DIRECTION_OPTIONS = ["long", "short"];
const RESULT_OPTIONS = ["win", "loss", "breakeven", ""];

// ── FieldLabel — mirrors web Field component ───────────────────────────────
function FieldLabel({ label, children }) {
  return (
    <View style={fl.wrap}>
      <Text style={fl.label}>{label}</Text>
      {children}
    </View>
  );
}
const fl = StyleSheet.create({
  wrap: { flex: 1 },
  label: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
});

// ── InlinePicker — TouchableOpacity chip selector ─────────────────────────
function InlinePicker({ options, value, onChange, formatLabel }) {
  return (
    <View style={ip.wrap}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt)}
          style={[ip.chip, value === opt && ip.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[ip.chipText, value === opt && ip.chipTextActive]}>
            {formatLabel ? formatLabel(opt) : (opt || "—")}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const ip = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY + "20",
  },
  chipText: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 11 },
  chipTextActive: { color: PRIMARY },
});

// ── TradeRow — single editable detected trade row ─────────────────────────
function TradeRow({ row, index, onChange }) {
  const update = (key, val) => {
    const next = { ...row, [key]: val };
    if (key === "open_time" || key === "close_time") {
      next.holding_minutes = holdMins(next.open_time, next.close_time);
    }
    onChange(index, next);
  };

  const isLoss = row.result === "loss";

  return (
    <View style={[tr.card, row._selected ? tr.cardSelected : tr.cardUnselected]}>
      {/* ── Row header: checkbox + index + symbol + close type ── */}
      <View style={tr.headerRow}>
        <TouchableOpacity
          style={[tr.checkbox, row._selected && tr.checkboxChecked]}
          onPress={() => update("_selected", !row._selected)}
        >
          {row._selected ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
        </TouchableOpacity>

        <Text style={tr.rowIndex}>#{index + 1}</Text>

        <TextInput
          style={tr.symbolInput}
          value={row.symbol || ""}
          onChangeText={(v) => update("symbol", v)}
          placeholder="Symbol"
          placeholderTextColor="rgba(255,255,255,0.25)"
        />

        <View style={tr.badge}>
          <Text style={tr.badgeText}>{CLOSE_LABEL[row.close_type] || "Unknown"}</Text>
        </View>

        {row.high_loss ? (
          <View style={tr.lossTag}>
            <Ionicons name="warning-outline" size={10} color="#fde68a" style={{ marginRight: 3 }} />
            <Text style={tr.lossTagText}>Biggest loss</Text>
          </View>
        ) : null}
      </View>

      {/* ── Grid row 1: Direction, Result, P&L, SL/TP ── */}
      <View style={tr.grid2}>
        <FieldLabel label="Direction">
          <InlinePicker
            options={DIRECTION_OPTIONS}
            value={row.direction}
            onChange={(v) => update("direction", v)}
            formatLabel={(v) => (v === "long" ? "Long" : "Short")}
          />
        </FieldLabel>

        <FieldLabel label="Result">
          <InlinePicker
            options={RESULT_OPTIONS}
            value={row.result}
            onChange={(v) => update("result", v)}
            formatLabel={(v) => (v === "" ? "—" : v.charAt(0).toUpperCase() + v.slice(1))}
          />
        </FieldLabel>
      </View>

      <View style={tr.grid2}>
        <FieldLabel label="P&L">
          <TextInput
            style={[tr.miniInput, isLoss && { color: "#f87171" }]}
            value={row.pnl != null ? String(row.pnl) : ""}
            onChangeText={(v) => update("pnl", v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
        </FieldLabel>

        <FieldLabel label="SL / TP">
          <View style={tr.slTpWrap}>
            <Text style={[tr.slTpText, row.stop_loss_set ? { color: PRIMARY } : { color: "rgba(255,255,255,0.4)" }]}>
              SL {row.stop_loss_set ? "✓" : "✗"}
            </Text>
            <Text style={[tr.slTpText, row.take_profit_set ? { color: PRIMARY } : { color: "rgba(255,255,255,0.4)" }]}>
              TP {row.take_profit_set ? "✓" : "✗"}
            </Text>
          </View>
        </FieldLabel>
      </View>

      {/* ── Grid row 2: Open time, Close time, Holding ── */}
      <View style={tr.grid3}>
        <FieldLabel label="Open time">
          <TextInput
            style={tr.miniInput}
            value={row.open_time || ""}
            onChangeText={(v) => update("open_time", v)}
            placeholder="09:30"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
        </FieldLabel>

        <FieldLabel label="Close time">
          <TextInput
            style={tr.miniInput}
            value={row.close_time || ""}
            onChangeText={(v) => update("close_time", v)}
            placeholder="11:45"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
        </FieldLabel>

        <FieldLabel label="Holding">
          <View style={tr.holdingWrap}>
            <Text style={tr.holdingText}>{fmtMins(row.holding_minutes)}</Text>
          </View>
        </FieldLabel>
      </View>

      {/* ── Amber note ── */}
      {row.note ? (
        <View style={tr.noteWrap}>
          <Ionicons name="warning-outline" size={13} color="#fde68a" style={{ marginRight: 4 }} />
          <Text style={tr.noteText}>{row.note}</Text>
        </View>
      ) : null}

      {/* ── Reason textarea (ask_reason flag) ── */}
      {row.ask_reason ? (
        <TextInput
          style={tr.reasonInput}
          value={row.reason || ""}
          onChangeText={(v) => update("reason", v)}
          placeholder="Optional: why did you close this trade?"
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={2}
        />
      ) : null}
    </View>
  );
}

const tr = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardSelected: { borderColor: PRIMARY + "66", backgroundColor: PRIMARY + "0D" },
  cardUnselected: { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)", opacity: 0.6 },

  headerRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  rowIndex: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 10 },
  symbolInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 13,
    width: 100,
  },
  badge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: { color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },
  lossTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AMBER + "1F",
    borderWidth: 1,
    borderColor: AMBER + "66",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  lossTagText: { color: "#fde68a", fontFamily: MONO.regular, fontSize: 10, textTransform: "uppercase" },

  grid2: { flexDirection: "row", gap: 8 },
  grid3: { flexDirection: "row", gap: 6 },

  miniInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 13,
  },

  slTpWrap: { flexDirection: "row", gap: 8, paddingVertical: 6 },
  slTpText: { fontFamily: MONO.regular, fontSize: 12 },

  holdingWrap: { paddingVertical: 6 },
  holdingText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 13 },

  noteWrap: { flexDirection: "row", alignItems: "flex-start" },
  noteText: { color: "#fde68a", fontFamily: BODY.regular, fontSize: 12, flex: 1, lineHeight: 18 },

  reasonInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlignVertical: "top",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AutoJournalCard — main component (mirrors web AutoJournal)
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoJournalCard({ onImported, onNavigateToNew }) {
  const { showAlert } = useAlert();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { screenshot_path, image_kind, trades }
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

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
    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (!/\.(png|jpe?g|webp)$/i.test(asset.fileName || "image.jpg")) {
      showAlert({ type: "warning", title: "Invalid format", message: "Upload a PNG, JPG or WEBP screenshot." });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "screenshot.jpg",
      });
      const { data } = await journalApi.autoExtract(fd);
      setResult(data);
      setRows((data.trades || []).map((t) => ({ ...t, _selected: true })));
      if ((data.trades || []).length === 0) {
        showAlert({ type: "info", title: "No trades detected", message: "No executed trades found. You can log manually." });
      }
    } catch (err) {
      showAlert({ type: "error", title: "Error", message: err?.response?.data?.detail || "Could not analyze the screenshot." });
    } finally {
      setUploading(false);
    }
  };

  const updateRow = (index, nextRow) => {
    setRows((prev) => prev.map((r, i) => (i === index ? nextRow : r)));
  };

  const close = () => {
    setResult(null);
    setRows([]);
  };

  const confirm = async () => {
    const selected = rows.filter((r) => r._selected);
    if (selected.length === 0) {
      showAlert({ type: "warning", title: "Nothing selected", message: "Select at least one trade to import." });
      return;
    }
    setImporting(true);
    try {
      const payload = {
        screenshot_path: result.screenshot_path || "",
        trades: selected.map((r) => ({
          symbol: r.symbol,
          direction: r.direction,
          open_time: r.open_time,
          close_time: r.close_time,
          holding_minutes: r.holding_minutes,
          entry_price: r.entry_price,
          exit_price: r.exit_price,
          lot_size: r.lot_size,
          stop_loss_set: r.stop_loss_set,
          take_profit_set: r.take_profit_set,
          close_type: r.close_type,
          result: r.result,
          pnl: r.pnl,
          date: r.date,
          reason: r.reason || "",
          notes: r.notes || "",
        })),
      };
      const { data } = await journalApi.autoImport(payload);
      const count = data.created || selected.length;
      showAlert({ type: "success", title: "Imported!", message: `${count} trade${count === 1 ? "" : "s"} added to your journal.` });
      close();
      onImported?.();
    } catch (err) {
      showAlert({ type: "error", title: "Error", message: err?.response?.data?.detail || "Import failed." });
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = rows.filter((r) => r._selected).length;

  return (
    <>
      {/* ── Hero upload card ───────────────────────────────────── */}
      <View style={ac.card}>
        <AmbientGlow position="topRight" size={180} opacity={0.10} color={PRIMARY} />

        <View style={ac.inner}>
          {/* Left: text content */}
          <View style={ac.textSide}>
            <View style={ac.chip}>
              <Ionicons name="scan-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
              <Text style={ac.chipText}>Trading AI</Text>
            </View>

            <Text style={ac.headline}>Upload a screenshot. We do the typing.</Text>
            <Text style={ac.description}>
              Drop a broker trade-history, a single trade, or even a chart. The AI detects each trade,
              reads SL/TP, entry &amp; result — then you confirm what to save. Logging a day takes seconds.
            </Text>
          </View>

          {/* Right: action buttons */}
          <View style={ac.btnSide}>
            {/* Upload Screenshot — primary neon */}
            <TouchableOpacity
              style={[ac.uploadBtn, uploading && { opacity: 0.6 }]}
              onPress={pick}
              disabled={uploading}
            >
              <Ionicons
                name={uploading ? "hourglass-outline" : "cloud-upload-outline"}
                size={18}
                color="#000"
                style={{ marginRight: 8 }}
              />
              <Text style={ac.uploadBtnText}>
                {uploading ? "Reading screenshot…" : "Upload Screenshot"}
              </Text>
            </TouchableOpacity>

            {/* Log Manually — ghost */}
            <TouchableOpacity style={ac.ghostBtn} onPress={onNavigateToNew}>
              <Ionicons name="add" size={15} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
              <Text style={ac.ghostBtnText}>Log Manually</Text>
            </TouchableOpacity>

            {/* Analyze Setup — ghost-green */}
            <TouchableOpacity
              style={ac.analyzeBtn}
              onPress={() => setReviewOpen(true)}
            >
              <Ionicons name="sparkles-outline" size={15} color={PRIMARY} style={{ marginRight: 6 }} />
              <Text style={ac.analyzeBtnText}>Analyze Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Chart Review Modal ────────────────────────────────── */}
      <ChartReviewModal visible={reviewOpen} onClose={() => setReviewOpen(false)} />

      {/* ── Confirmation Modal ─────────────────────────────────── */}
      <Modal visible={!!result} animationType="slide" transparent onRequestClose={close}>
        <View style={cm.overlay}>
          <View style={cm.sheet}>
            {/* Modal header */}
            <View style={cm.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={cm.chip}>
                  <Ionicons name="sparkles-outline" size={11} color={PRIMARY} style={{ marginRight: 4 }} />
                  <Text style={cm.chipText}>Detected Trades</Text>
                </View>
                <Text style={cm.modalTitle}>
                  {rows.length > 0
                    ? `${rows.length} trade${rows.length === 1 ? "" : "s"} found — confirm what to import`
                    : "No executed trades detected"}
                </Text>
                <Text style={cm.modalMeta}>
                  Source: {(result?.image_kind || "unknown").replace("_", " ")} · uncheck any you don't want
                </Text>
              </View>
              <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* Modal body */}
            <ScrollView style={cm.body} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {rows.length === 0 ? (
                <View style={cm.empty}>
                  <Text style={cm.emptyText}>
                    We couldn't read any executed trades from that image. If it was a chart, that's expected —
                    use the manual{" "}
                    <Text style={{ color: PRIMARY }}>Log Trade</Text>
                    {" "}button instead.
                  </Text>
                </View>
              ) : (
                rows.map((r, i) => (
                  <TradeRow key={i} row={r} index={i} onChange={updateRow} />
                ))
              )}
            </ScrollView>

            {/* Modal footer */}
            <View style={cm.footer}>
              <Text style={cm.selectedCount}>{selectedCount} selected</Text>
              <View style={cm.footerBtns}>
                <TouchableOpacity style={cm.cancelBtn} onPress={close}>
                  <Text style={cm.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[cm.importBtn, (importing || selectedCount === 0) && { opacity: 0.5 }]}
                  onPress={confirm}
                  disabled={importing || selectedCount === 0}
                >
                  <Ionicons name={importing ? "hourglass-outline" : "checkmark"} size={14} color="#000" style={{ marginRight: 6 }} />
                  <Text style={cm.importBtnText}>
                    {importing
                      ? "Importing…"
                      : `Import${selectedCount > 0 ? ` ${selectedCount}` : ""} to Journal`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const ac = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY + "4D",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
    overflow: "hidden",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  inner: { position: "relative", gap: 16 },

  // Text side
  textSide: { gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY + "55",
    backgroundColor: PRIMARY + "15",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  headline: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  description: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: BODY.regular,
    fontSize: 13,
    lineHeight: 20,
  },

  // Button side
  btnSide: { gap: 8 },
  uploadBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 6,
  },
  uploadBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: "rgba(255,255,255,0.8)", fontFamily: DISPLAY.bold, fontSize: 13 },
  analyzeBtn: {
    borderWidth: 1,
    borderColor: PRIMARY + "66",
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 13 },
});

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    maxHeight: "92%",
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
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
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  modalTitle: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 18, lineHeight: 24 },
  modalMeta: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 },

  body: { padding: 16 },
  empty: { padding: 32, alignItems: "center" },
  emptyText: { color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 13, lineHeight: 20, textAlign: "center" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  selectedCount: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 12 },
  footerBtns: { flexDirection: "row", gap: 8, flexShrink: 1 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: { color: "rgba(255,255,255,0.8)", fontFamily: DISPLAY.bold, fontSize: 13 },
  importBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  importBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 13 },
});
