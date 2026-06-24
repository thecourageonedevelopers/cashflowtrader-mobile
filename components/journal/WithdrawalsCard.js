/**
 * WithdrawalsCard
 * Mirrors React Web src/pages/dashboard/Withdrawals.jsx exactly.
 * Visual: neon-green bordered card, withdrawal total, goal progress, add/view modals.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { withdrawalsApi } from "../../src/api/withdrawals";
import { tokenService } from "../../src/services/tokenService";
import { formatDate, formatMoney } from "../../src/utils/format";
import { useAlert } from "../../src/context/AlertContext";

const PRIMARY = "#39FF14";
const SHEET_H = Math.min(Dimensions.get("window").height * 0.88, 640);
const AMBER = "#FBBF24";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const today = () => new Date().toISOString().slice(0, 10);

const TIERS = [
  { label: "Beginner", amount: 1000, hint: "Just starting out" },
  { label: "Intermediate", amount: 2000, hint: "Some live experience" },
  { label: "Experienced", amount: 10000, hint: "₹30k–40k+ capital" },
];

// ─────────────────────────────────────────────────────────────────────────────
// GoalSuggestions — mirrors web GoalSuggestions
// ─────────────────────────────────────────────────────────────────────────────
function GoalSuggestions({ saving, achieved, onSet }) {
  const [custom, setCustom] = useState("");
  return (
    <View style={gs.wrap}>
      <Text style={gs.hint}>
        {achieved
          ? "Goal smashed — that's real proof. Set a bigger target and keep the momentum."
          : "Set a withdrawal target. Pick what matches where you are right now:"}
      </Text>

      <View style={gs.tierRow}>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={t.label}
            style={[gs.tierBtn, saving && { opacity: 0.5 }]}
            onPress={() => onSet(t.amount)}
            disabled={saving}
          >
            <Text style={gs.tierAmount}>{formatMoney(t.amount)}</Text>
            <Text style={gs.tierLabel}>{t.label}</Text>
            <Text style={gs.tierHint}>{t.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={gs.customRow}>
        <TextInput
          style={gs.customInput}
          placeholder="Custom (₹)"
          placeholderTextColor="rgba(255,255,255,0.25)"
          keyboardType="numeric"
          value={custom}
          onChangeText={setCustom}
        />
        <TouchableOpacity
          style={[gs.setBtn, (saving || !(parseFloat(custom) > 0)) && { opacity: 0.5 }]}
          onPress={() => parseFloat(custom) > 0 && onSet(parseFloat(custom))}
          disabled={saving || !(parseFloat(custom) > 0)}
        >
          <Ionicons name="flag-outline" size={14} color="#000" style={{ marginRight: 4 }} />
          <Text style={gs.setBtnText}>{saving ? "Saving..." : "Set"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const gs = StyleSheet.create({
  wrap: { gap: 10, marginTop: 14 },
  hint: { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tierAmount: { color: PRIMARY, fontFamily: "Inter_900Black", fontSize: 14 },
  tierLabel: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11, marginTop: 2 },
  tierHint: { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_600SemiBold", fontSize: 9, marginTop: 2, lineHeight: 13 },
  customRow: { flexDirection: "row", gap: 8 },
  customInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  setBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  setBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────────────────
// AddWithdrawalModal — mirrors web AddWithdrawalModal
// ─────────────────────────────────────────────────────────────────────────────
function AddWithdrawalModal({ visible, onClose, onSaved }) {
  const { showAlert } = useAlert();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [proof, setProof] = useState(null); // { uri, mimeType, fileName }
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAmount(""); setDate(today()); setNote(""); setProof(null);
  };

  const pickProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert({ type: "warning", title: "Permission required", message: "Allow photo access in Settings." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled) return;
    setProof(result.assets[0]);
  };

  const save = async () => {
    if (!(parseFloat(amount) > 0)) {
      showAlert({ type: "warning", title: "Required", message: "Enter an amount greater than 0." });
      return;
    }
    if (!proof) {
      showAlert({ type: "warning", title: "Required", message: "Attach a proof screenshot (payment / mail / brokerage approval)." });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("amount", parseFloat(amount));
      fd.append("date", date);
      fd.append("note", note);
      fd.append("proof", {
        uri: proof.uri,
        type: proof.mimeType || "image/jpeg",
        name: proof.fileName || "proof.jpg",
      });
      await withdrawalsApi.create(fd);
      reset();
      onSaved();
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: e?.response?.data?.detail || "Could not save withdrawal." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}
        >
          <View style={am.sheet}>
            <View style={am.sheetHeader}>
              <Text style={am.sheetTitle}>Log a Withdrawal</Text>
              <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={am.body} keyboardShouldPersistTaps="handled">
            <View style={am.field}>
              <Text style={am.label}>Amount (₹)</Text>
              <TextInput
                style={am.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="500"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={am.field}>
              <Text style={am.label}>Date</Text>
              <TextInput
                style={am.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
              <Text style={am.inputHint}>Backdate it if the payout happened earlier.</Text>
            </View>

            <View style={am.field}>
              <Text style={am.label}>Note (optional)</Text>
              <TextInput
                style={am.input}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. monthly profit payout"
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
            </View>

            {/* Proof — required */}
            <View style={am.field}>
              <Text style={am.label}>
                Proof of Withdrawal <Text style={{ color: PRIMARY }}>*</Text>
              </Text>
              <TouchableOpacity style={am.proofPicker} onPress={pickProof}>
                {proof ? (
                  <Image source={{ uri: proof.uri }} style={am.proofThumb} />
                ) : (
                  <View style={am.proofIconBox}>
                    <Ionicons name="image-outline" size={20} color={PRIMARY} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={am.proofLabel}>
                    {proof ? "Change screenshot" : "Add a screenshot"}
                  </Text>
                  <Text style={am.proofHint}>
                    Payment received, withdrawal mail, or brokerage approval.
                    Keeps your record honest &amp; authentic.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[am.saveBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              <Ionicons name="checkmark" size={16} color="#000" style={{ marginRight: 6 }} />
              <Text style={am.saveBtnText}>{saving ? "Saving..." : "Save Withdrawal"}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    height: SHEET_H,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sheetTitle: { color: "#fff", fontFamily: "Inter_900Black", fontSize: 20 },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  field: { gap: 6 },
  label: { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  input: {
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
  inputHint: { color: "rgba(255,255,255,0.35)", fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1 },
  proofPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PRIMARY + "66",
    backgroundColor: PRIMARY + "07",
    borderRadius: 12,
  },
  proofIconBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: PRIMARY + "1F",
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    alignItems: "center",
    justifyContent: "center",
  },
  proofThumb: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  proofLabel: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  proofHint: { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 3, lineHeight: 15 },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────────────────────
// HelpModal — mirrors web HelpModal (amber)
// ─────────────────────────────────────────────────────────────────────────────
function HelpModal({ visible, summary, onClose, onNavigate }) {
  const days = summary?.days_since_goal ?? 7;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={hm.overlay}>
        <View style={hm.card}>
          <View style={hm.topRow}>
            <View style={hm.iconBox}>
              <Ionicons name="life-buoy-outline" size={20} color="#fde68a" />
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
          <Text style={hm.title}>Stuck on your goal? That's normal.</Text>
          <Text style={hm.body}>
            You set a {formatMoney(summary?.goal || 0)} withdrawal goal {days} day{days === 1 ? "" : "s"} ago and you're at{" "}
            <Text style={{ color: PRIMARY, fontFamily: "Inter_700Bold" }}>{summary?.progress_pct || 0}%</Text>
            {(summary?.total || 0) <= 0 ? " — not started yet" : ""}. This is exactly where a mentor makes the difference.
            Don't grind alone.
          </Text>
          <View style={hm.btns}>
            <TouchableOpacity
              style={hm.primaryBtn}
              onPress={() => { onClose(); onNavigate?.("SupportScreen"); }}
            >
              <Ionicons name="life-buoy-outline" size={15} color="#000" style={{ marginRight: 6 }} />
              <Text style={hm.primaryBtnText}>Get Help / Register for Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={hm.ghostBtn}
              onPress={() => { onClose(); onNavigate?.("SessionsScreen"); }}
            >
              <Ionicons name="sparkles-outline" size={15} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
              <Text style={hm.ghostBtnText}>Join a Live Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={hm.dismissBtn} onPress={onClose}>
              <Text style={hm.dismissBtnText}>I've got this — remind me later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const hm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AMBER + "66",
    padding: 22,
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 10,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AMBER + "1F",
    borderWidth: 1,
    borderColor: AMBER + "66",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontFamily: "Inter_900Black", fontSize: 19, marginBottom: 8 },
  body: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 21, marginBottom: 20 },
  btns: { gap: 8 },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 13 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_700Bold", fontSize: 13 },
  dismissBtn: { paddingVertical: 8, alignItems: "center" },
  dismissBtnText: { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

// ─────────────────────────────────────────────────────────────────────────────
// WithdrawalsCard — main component (mirrors web Withdrawals)
// ─────────────────────────────────────────────────────────────────────────────
export default function WithdrawalsCard({ onNavigate }) {
  const { showAlert, showConfirm } = useAlert();
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState([]);
  const [showList, setShowList] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([withdrawalsApi.summary(), withdrawalsApi.list()]);
      setSummary(s.data);
      setList(l.data || []);
      if (s.data?.needs_help) setHelpOpen(true);
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    load();
    tokenService.get().then((t) => setToken(t || ""));
  }, [load]);

  const setGoal = async (amount) => {
    setSavingGoal(true);
    try {
      await withdrawalsApi.setGoal(amount);
      await load();
    } catch {
      showAlert({ type: "error", title: "Error", message: "Could not save goal." });
    } finally {
      setSavingGoal(false);
    }
  };

  const downloadCertificate = async () => {
    setCertBusy(true);
    try {
      const url = `${API_URL}/api/withdrawals/certificate?auth=${encodeURIComponent(token)}`;
      await Linking.openURL(url);
    } catch {
      showAlert({ type: "info", title: "Not yet", message: "Certificate unlocks once you reach your goal." });
    } finally {
      setCertBusy(false);
    }
  };

  const deleteWithdrawal = async (id) => {
    showConfirm({
      title: "Remove withdrawal?",
      message: "This cannot be undone.",
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: async () => {
        try {
          await withdrawalsApi.delete(id);
          await load();
        } catch {
          showAlert({ type: "error", title: "Error", message: "Could not remove withdrawal." });
        }
      },
    });
  };

  if (!summary) return null;

  const hasGoal = (summary.goal || 0) > 0;
  const achieved = hasGoal && (summary.progress_pct || 0) >= 100;

  return (
    <>
      <View style={wc.card}>
        {/* Decorative glow orb */}
        <View style={wc.glowOrb} pointerEvents="none" />

        <View style={wc.inner}>
          {/* ── Total side ──────────────────────────────────────── */}
          <View style={wc.totalSide}>
            <View style={wc.chip}>
              <Ionicons name="wallet-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
              <Text style={wc.chipText}>Withdrawn From Trading</Text>
            </View>

            <Text
              style={wc.totalAmount}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {formatMoney(summary.total || 0)}
            </Text>

            <Text style={wc.totalMeta}>
              {summary.count || 0} withdrawal{summary.count === 1 ? "" : "s"}
              {summary.last_date ? ` · last on ${formatDate(summary.last_date)}` : ""}
            </Text>

            <View style={wc.btnRow}>
              <TouchableOpacity style={wc.addBtn} onPress={() => setAddOpen(true)}>
                <Ionicons name="add" size={16} color="#000" style={{ marginRight: 4 }} />
                <Text style={wc.addBtnText}>Add Withdrawal</Text>
              </TouchableOpacity>
              {(summary.count || 0) > 0 ? (
                <TouchableOpacity style={wc.viewBtn} onPress={() => setShowList((v) => !v)}>
                  <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                  <Text style={wc.viewBtnText}>{showList ? "Hide" : "View all"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* ── Goal side ───────────────────────────────────────── */}
          <View style={[wc.goalSide, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }]}>
            <View style={wc.chip}>
              <Ionicons name="flag-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
              <Text style={wc.chipText}>Withdrawal Goal</Text>
            </View>

            {!hasGoal || achieved ? (
              <>
                {achieved ? (
                  <View style={wc.certBanner}>
                    <View style={wc.certIconBox}>
                      <Ionicons name="trophy-outline" size={20} color={PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={wc.certTitle}>Goal achieved 🎉</Text>
                      <Text style={wc.certHint}>Your certificate is ready to download.</Text>
                    </View>
                    <TouchableOpacity
                      style={[wc.addBtn, { paddingHorizontal: 12, paddingVertical: 8 }, certBusy && { opacity: 0.6 }]}
                      onPress={downloadCertificate}
                      disabled={certBusy}
                    >
                      <Ionicons name="download-outline" size={14} color="#000" style={{ marginRight: 4 }} />
                      <Text style={wc.addBtnText}>{certBusy ? "..." : "Certificate"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <GoalSuggestions saving={savingGoal} achieved={achieved} onSet={setGoal} />
              </>
            ) : (
              <View style={wc.progressWrap}>
                <View style={wc.progressHeader}>
                  <Text style={wc.progressText}>
                    {formatMoney(summary.total || 0)}{" "}
                    <Text style={wc.progressMax}>/ {formatMoney(summary.goal || 0)}</Text>
                  </Text>
                  <Text style={wc.progressPct}>{summary.progress_pct || 0}%</Text>
                </View>

                {/* Progress bar */}
                <View style={wc.progressTrack}>
                  <View style={[wc.progressFill, { width: `${Math.min(summary.progress_pct || 0, 100)}%` }]} />
                </View>

                <Text style={wc.progressMeta}>
                  {formatMoney(summary.remaining || 0)} to go
                  {summary.days_since_goal != null ? ` · day ${summary.days_since_goal} of this goal` : ""}
                </Text>

                {summary.needs_help ? (
                  <TouchableOpacity style={wc.helpBtn} onPress={() => setHelpOpen(true)}>
                    <Ionicons name="life-buoy-outline" size={14} color="#fde68a" style={{ marginRight: 4 }} />
                    <Text style={wc.helpBtnText}>Stuck on this goal? Get help →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* ── Withdrawal list (toggle) ─────────────────────────── */}
        {showList ? (
          <View style={wc.listWrap}>
            {list.length === 0 ? (
              <Text style={wc.listEmpty}>No withdrawals logged yet.</Text>
            ) : (
              list.map((w) => (
                <View key={w.withdrawal_id} style={wc.listRow}>
                  <View style={wc.listIconBox}>
                    <Ionicons name="cash-outline" size={16} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={wc.listAmount}>{formatMoney(w.amount || 0)}</Text>
                    <View style={wc.listMeta}>
                      <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.45)" style={{ marginRight: 3 }} />
                      <Text style={wc.listMetaText}>
                        {formatDate(w.date)}{w.note ? ` · ${w.note}` : ""}
                      </Text>
                    </View>
                  </View>
                  {w.proof_path && token ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`${API_URL}/api/files/${w.proof_path}?auth=${encodeURIComponent(token)}`)}
                      style={wc.proofThumbWrap}
                    >
                      <Image
                        source={{ uri: `${API_URL}/api/files/${w.proof_path}?auth=${encodeURIComponent(token)}` }}
                        style={wc.proofThumb}
                      />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => deleteWithdrawal(w.withdrawal_id)}
                    style={wc.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : null}
      </View>

      <AddWithdrawalModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await load();
        }}
      />

      <HelpModal
        visible={helpOpen}
        summary={summary}
        onClose={() => setHelpOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const wc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY + "4D",
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 20,
    overflow: "hidden",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  glowOrb: {
    position: "absolute",
    bottom: -96,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: PRIMARY + "1A",
  },
  inner: { position: "relative" },

  // Chip
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
    marginBottom: 12,
  },
  chipText: { color: PRIMARY, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },

  // Total side
  totalSide: {},
  totalAmount: {
    color: PRIMARY,
    fontFamily: "Inter_900Black",
    fontSize: 52,
    lineHeight: 56,
    textShadowColor: "rgba(57,255,20,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  totalMeta: { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 8 },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  addBtnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 13 },
  viewBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  viewBtnText: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_700Bold", fontSize: 13 },

  // Goal side
  goalSide: {},

  // Certificate banner
  certBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY + "66",
    backgroundColor: PRIMARY + "0F",
  },
  certIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: PRIMARY + "26",
    borderWidth: 1,
    borderColor: PRIMARY + "66",
    alignItems: "center",
    justifyContent: "center",
  },
  certTitle: { color: "#fff", fontFamily: "Inter_900Black", fontSize: 15 },
  certHint: { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 2 },

  // Progress bar
  progressWrap: { marginTop: 12, gap: 8 },
  progressHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  progressText: { color: "#fff", fontFamily: "Inter_900Black", fontSize: 20 },
  progressMax: { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_900Black", fontSize: 16 },
  progressPct: { color: PRIMARY, fontFamily: "Inter_900Black", fontSize: 28 },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  progressMeta: { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  helpBtn: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  helpBtnText: { color: "#fde68a", fontFamily: "Inter_600SemiBold", fontSize: 11 },

  // Withdrawal list
  listWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  listEmpty: { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", fontSize: 13 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PRIMARY + "1F",
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    alignItems: "center",
    justifyContent: "center",
  },
  listAmount: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  listMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  listMetaText: { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_600SemiBold", fontSize: 11, flex: 1 },
  proofThumbWrap: { width: 40, height: 40, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: PRIMARY + "50" },
  proofThumb: { width: "100%", height: "100%", resizeMode: "cover" },
  deleteBtn: { padding: 4 },
});
