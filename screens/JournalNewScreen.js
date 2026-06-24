import React, { useState, useEffect } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { journalApi } from "../src/api/journal";
import { uploadApi } from "../src/api/upload";
import { useAlert } from "../src/context/AlertContext";

const PRIMARY = "#39FF14";
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";
const RED = "#f87171";
const AMBER = "#FBBF24";

// ─────────────────────────────────────────────────────────────────────────────
// Local components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ n, title, subtitle, children }) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionN}>{n}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function FieldInput({ label, value, onChange, placeholder, keyboardType = "default", multiline = false }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { height: 80, textAlignVertical: "top" }]}
        value={String(value ?? "")}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function ShotSlot({ label, value, onClear, onPick }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label} (optional)</Text>
      {value ? (
        <View style={s.shotAttached}>
          <Ionicons name="camera-outline" size={15} color={PRIMARY} />
          <Text style={s.shotFileName} numberOfLines={1}>
            {value.split("/").pop()}
          </Text>
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.shotPicker} onPress={onPick}>
          <Ionicons name="image-outline" size={16} color="rgba(255,255,255,0.55)" />
          <Text style={s.shotPickerText}>ATTACH</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function TagChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[s.tagChip, active && s.tagChipActive]}
      onPress={onPress}
    >
      <Text style={[s.tagChipText, active && s.tagChipTextActive]}>
        {label}
        {active ? " ✓" : ""}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalNewScreen({ navigation }) {
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    trade_name: "",
    date: new Date().toISOString().slice(0, 10),
    market: "",
    direction: "long",
    result: "win",
    pnl: 0,
    setup_tags: [],
    emotions: [],
    mistakes: [],
    reflection: "",
    before_screenshot: "",
    after_screenshot: "",
  });
  const [busy, setBusy] = useState(false);

  const { data: tax = { setup_tags: [], emotions: [], mistakes: [] } } = useQuery({
    queryKey: ["taxonomy"],
    queryFn: () => journalApi.taxonomy().then((r) => r.data).catch(() => ({ setup_tags: [], emotions: [], mistakes: [] })),
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleArr = (key, value) => {
    setForm((f) => {
      const cur = f[key] || [];
      return {
        ...f,
        [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  };

  const pickImage = async (fieldKey) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert({ type: "warning", title: "Permission required", message: "Allow photo access in your device Settings." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const fd = new FormData();
    fd.append("files", {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || "upload.jpg",
    });
    try {
      const r = await uploadApi.upload(fd);
      const path = r.data?.files?.[0]?.path;
      if (path) set(fieldKey, path);
      showAlert({ type: "success", title: "Attached", message: "Screenshot saved." });
    } catch {
      showAlert({ type: "error", title: "Upload failed", message: "Could not upload screenshot. Try again." });
    }
  };

  const submit = async () => {
    if (!form.trade_name.trim()) {
      showAlert({ type: "warning", title: "Required", message: "Trade name is required." });
      return;
    }
    if (!form.market.trim()) {
      showAlert({ type: "warning", title: "Required", message: "Market / instrument is required." });
      return;
    }
    setBusy(true);
    try {
      const image_paths = [form.before_screenshot, form.after_screenshot].filter(Boolean);
      await journalApi.create({ ...form, image_paths });
      showAlert({ type: "success", title: "Logged!", message: "Trade logged successfully.", onConfirm: () => navigation.goBack() });
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not save the trade. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back button ─────────────────────────────────────────────── */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={s.backText}>All entries</Text>
        </TouchableOpacity>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerChip}>
            <Text style={s.headerChipText}>30-Second Journal</Text>
          </View>
          <Text style={s.h1}>Log this trade.</Text>
          <Text style={s.subtitle}>Tap. Tag. Done. Insights come automatically.</Text>
        </View>

        {/* ── Section 01: Trade Basics ─────────────────────────────── */}
        <SectionCard n="01" title="Trade Basics">
          <View style={s.inputGrid}>
            <FieldInput
              label="Trade Name"
              value={form.trade_name}
              onChange={(v) => set("trade_name", v)}
              placeholder="NIFTY long"
            />
            <FieldInput
              label="Market / Instrument"
              value={form.market}
              onChange={(v) => set("market", v)}
              placeholder="NIFTY / BTCUSDT"
            />
            <FieldInput
              label="Date"
              value={form.date}
              onChange={(v) => set("date", v)}
              placeholder="YYYY-MM-DD"
            />
            <FieldInput
              label="P&L"
              value={form.pnl === 0 ? "" : String(form.pnl)}
              onChange={(v) => set("pnl", parseFloat(v) || 0)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          {/* Direction */}
          <View style={s.toggleSection}>
            <Text style={s.toggleLabel}>Direction</Text>
            <View style={s.toggleRow}>
              {[
                { key: "long", label: "Long", icon: "trending-up-outline" },
                { key: "short", label: "Short", icon: "trending-down-outline" },
              ].map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[s.toggleBtn, form.direction === d.key && s.toggleBtnActive]}
                  onPress={() => set("direction", d.key)}
                >
                  <Ionicons
                    name={d.icon}
                    size={16}
                    color={form.direction === d.key ? PRIMARY : "rgba(255,255,255,0.6)"}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[s.toggleBtnText, form.direction === d.key && s.toggleBtnTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Result */}
          <View style={s.toggleSection}>
            <Text style={s.toggleLabel}>Result</Text>
            <View style={s.toggleRow}>
              {[
                { key: "win", label: "Win", activeStyle: { borderColor: PRIMARY, backgroundColor: PRIMARY + "10" }, activeText: { color: PRIMARY } },
                { key: "loss", label: "Loss", activeStyle: { borderColor: RED + "99", backgroundColor: RED + "0D" }, activeText: { color: RED } },
                { key: "breakeven", label: "Breakeven", activeStyle: { borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }, activeText: { color: "#fff" } },
              ].map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[s.toggleBtn, form.result === r.key && (r.activeStyle || s.toggleBtnActive)]}
                  onPress={() => set("result", r.key)}
                >
                  <Text style={[s.toggleBtnText, form.result === r.key && (r.activeText || s.toggleBtnTextActive)]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Screenshots */}
          <View style={s.shotRow}>
            <View style={{ flex: 1 }}>
              <ShotSlot
                label="Before Screenshot"
                value={form.before_screenshot}
                onClear={() => set("before_screenshot", "")}
                onPick={() => pickImage("before_screenshot")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ShotSlot
                label="After Screenshot"
                value={form.after_screenshot}
                onClear={() => set("after_screenshot", "")}
                onPick={() => pickImage("after_screenshot")}
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Section 02: Setup Tags ─────────────────────────────────── */}
        <SectionCard n="02" title="Setup Tags" subtitle="Pick as many as apply.">
          <View style={s.chipWrap}>
            {(tax.setup_tags || []).map((t) => (
              <TagChip
                key={t}
                label={t}
                active={form.setup_tags.includes(t)}
                onPress={() => toggleArr("setup_tags", t)}
              />
            ))}
            {!tax.setup_tags?.length && (
              <Text style={s.emptyTax}>Loading tags...</Text>
            )}
          </View>
        </SectionCard>

        {/* ── Section 03: Emotional State ───────────────────────────── */}
        <SectionCard n="03" title="Emotional State" subtitle="Honesty here pays the most.">
          <View style={s.chipWrap}>
            {(tax.emotions || []).map((emo) => (
              <TagChip
                key={emo}
                label={emo}
                active={form.emotions.includes(emo)}
                onPress={() => toggleArr("emotions", emo)}
              />
            ))}
            {!tax.emotions?.length && (
              <Text style={s.emptyTax}>Loading emotions...</Text>
            )}
          </View>
        </SectionCard>

        {/* ── Section 04: Mistake Tags ───────────────────────────────── */}
        <SectionCard n="04" title="Mistake Tags" subtitle="Leave blank if none.">
          <View style={s.chipWrap}>
            {(tax.mistakes || []).map((m) => (
              <TagChip
                key={m}
                label={m}
                active={form.mistakes.includes(m)}
                onPress={() => toggleArr("mistakes", m)}
              />
            ))}
            {!tax.mistakes?.length && (
              <Text style={s.emptyTax}>Loading mistakes...</Text>
            )}
          </View>
        </SectionCard>

        {/* ── Section 05: Reflection ────────────────────────────────── */}
        <SectionCard n="05" title="One-Line Reflection" subtitle="Maximum 200 characters.">
          <TextInput
            style={s.reflectionInput}
            value={form.reflection}
            onChangeText={(v) => set("reflection", v.slice(0, 200))}
            placeholder="What is the one thing you learned from this trade?"
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
          />
          <Text style={s.charCounter}>{form.reflection.length}/200</Text>
        </SectionCard>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
          >
            <Ionicons name="save-outline" size={15} color="#000" style={{ marginRight: 6 }} />
            <Text style={s.saveBtnText}>{busy ? "Saving..." : "Log Trade"}</Text>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Back
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  // Header
  header: { marginBottom: 20 },
  headerChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  headerChipText: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  h1: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },

  // Section card
  sectionCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 16,
  },
  sectionN: {
    color: "#39FF14",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 19,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: -10,
    marginBottom: 14,
  },

  // Inputs
  inputGrid: { gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  fieldInput: {
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

  // Direction / Result toggles
  toggleSection: { marginTop: 14, gap: 8 },
  toggleLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  toggleBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY + "1A",
  },
  toggleBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  toggleBtnTextActive: { color: PRIMARY },

  // Screenshots
  shotRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  shotAttached: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    backgroundColor: PRIMARY + "0A",
    borderRadius: 8,
  },
  shotFileName: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  shotPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  shotPickerText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Tag chips
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tagChipActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY + "1A",
  },
  tagChipText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  tagChipTextActive: { color: PRIMARY },
  emptyTax: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    fontStyle: "italic",
  },

  // Reflection
  reflectionInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCounter: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "right",
    marginTop: 6,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#39FF14",
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
