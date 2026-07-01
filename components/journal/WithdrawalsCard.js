/**
 * WithdrawalsCard
 * COMPLETE REWRITE to match React Web Withdrawals.jsx.
 *
 * Web changed from goal-based → level-based system (Level 1 / 2 / 3).
 * API now: GET /withdrawals/levels  (replaces /withdrawals/summary + goal)
 *
 * Each level has: target, status (achieved/current/locked), reward_amount,
 * reward_desc, reward_code, and a per-level certificate download.
 *
 * New components added:
 *   StatusBadge  — verified / in review / rejected badge on list rows
 *   LevelCard    — one card per level with achieved/current/locked styling
 *   MentorModal  — shown when mentor_eligible and user taps "Learn more"
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
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { withdrawalsApi } from "../../src/api/withdrawals";
import { tokenService } from "../../src/services/tokenService";
import { formatDate, formatMoney } from "../../src/utils/format";
import { useAlert } from "../../src/context/AlertContext";

const PRIMARY = "#39FF14";
const SHEET_H = Math.min(Dimensions.get("window").height * 0.88, 640);
const AMBER = "#FBBF24";
const RED = "#f87171";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const today = () => new Date().toISOString().slice(0, 10);

// ─── StatusBadge — mirrors web StatusBadge ────────────────────────────────────
function StatusBadge({ status }) {
  if (status === "verified") {
    return (
      <View style={[sb.badge, { borderColor: PRIMARY + "66" }]}>
        <Ionicons name="checkmark-circle-outline" size={10} color={PRIMARY} style={{ marginRight: 3 }} />
        <Text style={[sb.text, { color: PRIMARY }]}>Verified</Text>
      </View>
    );
  }
  if (status === "needs_review") {
    return (
      <View style={[sb.badge, { borderColor: AMBER + "66" }]}>
        <Ionicons name="time-outline" size={10} color={AMBER} style={{ marginRight: 3 }} />
        <Text style={[sb.text, { color: AMBER }]}>In review</Text>
      </View>
    );
  }
  return (
    <View style={[sb.badge, { borderColor: RED + "66" }]}>
      <Ionicons name="close-outline" size={10} color={RED} style={{ marginRight: 3 }} />
      <Text style={[sb.text, { color: RED }]}>Rejected</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

// ─── LevelCard — mirrors web LevelCard ───────────────────────────────────────
function LevelCard({ tier, certBusy, onDownloadCert }) {
  const achieved = tier.status === "achieved";
  const current = tier.status === "current";
  const hasReward = (tier.reward_amount > 0) || !!tier.reward_desc;

  return (
    <View
      style={[
        lc.card,
        achieved ? lc.achievedCard : current ? lc.currentCard : lc.lockedCard,
      ]}
    >
      {/* Header row: level label + status indicator */}
      <View style={lc.header}>
        <Text style={lc.levelLabel}>Level {tier.level}</Text>
        {achieved ? (
          <Ionicons name="trophy-outline" size={16} color={PRIMARY} />
        ) : current ? (
          <Text style={lc.inProgressText}>In progress</Text>
        ) : (
          <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.35)" />
        )}
      </View>

      {/* Target amount */}
      <Text style={[lc.target, achieved && { color: PRIMARY }]}>
        {formatMoney(tier.target)}
      </Text>
      <Text style={lc.targetSub}>total verified withdrawals</Text>

      {/* Reward section */}
      {hasReward && (
        <View style={lc.rewardSection}>
          <View style={lc.rewardLabelRow}>
            <Ionicons name="gift-outline" size={10} color={AMBER} style={{ marginRight: 4 }} />
            <Text style={lc.rewardLabel}>Reward</Text>
          </View>
          {tier.reward_amount > 0 && (
            <Text style={lc.rewardAmount}>{formatMoney(tier.reward_amount)}</Text>
          )}
          {tier.reward_desc ? (
            <Text style={lc.rewardDesc}>{tier.reward_desc}</Text>
          ) : null}
          {achieved && tier.reward_code ? (
            <View style={lc.rewardCode}>
              <Text style={lc.rewardCodeText}>Code: {tier.reward_code}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Certificate download — achieved only */}
      {achieved && (
        <TouchableOpacity
          style={[lc.certBtn, certBusy && { opacity: 0.6 }]}
          onPress={() => onDownloadCert(tier.level)}
          disabled={certBusy}
        >
          <Ionicons
            name={certBusy ? "hourglass-outline" : "download-outline"}
            size={12}
            color={PRIMARY}
            style={{ marginRight: 5 }}
          />
          <Text style={lc.certBtnText}>Certificate</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const lc = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
  },
  achievedCard: {
    borderColor: PRIMARY + "80",
    backgroundColor: PRIMARY + "12",
  },
  currentCard: {
    borderColor: AMBER + "80",
    backgroundColor: AMBER + "0D",
  },
  lockedCard: {
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.02)",
    opacity: 0.75,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  levelLabel: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  inProgressText: {
    color: AMBER,
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  target: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 18,
    lineHeight: 22,
    marginTop: 2,
  },
  targetSub: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
    lineHeight: 13,
  },
  rewardSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    gap: 3,
  },
  rewardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardLabel: {
    color: AMBER + "CC",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  rewardAmount: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    marginTop: 2,
  },
  rewardDesc: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
  rewardCode: {
    marginTop: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: PRIMARY + "4D",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  rewardCodeText: {
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  certBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: PRIMARY + "66",
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  certBtnText: {
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
});

// ─── MentorModal — mirrors web MentorModal ────────────────────────────────────
function MentorModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={mm.overlay}>
        <View style={mm.card}>
          <View style={mm.topRow}>
            <View style={mm.iconBox}>
              <Ionicons name="school-outline" size={20} color={AMBER} />
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
          <Text style={mm.title}>You've earned a shot at Mentor.</Text>
          <Text style={mm.body}>
            Clearing Level 3 proves you can turn discipline into real, withdrawn profit.
            Becoming a Cashflow Mentor is a separate step — a direct 1:1 interview where
            we understand what you've truly learned and whether you have real value to give
            other traders. Our team will reach out to schedule it.
          </Text>
          <TouchableOpacity style={mm.btn} onPress={onClose}>
            <Ionicons name="checkmark" size={15} color="#000" style={{ marginRight: 6 }} />
            <Text style={mm.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
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
  body: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#000", fontFamily: "Inter_700Bold", fontSize: 14 },
});

// ─── AddWithdrawalModal — updated to match web ────────────────────────────────
function AddWithdrawalModal({ visible, onClose, onSaved }) {
  const { showAlert } = useAlert();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [proof, setProof] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAmount("");
    setDate(today());
    setNote("");
    setProof(null);
  };

  const pickProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert({ type: "warning", title: "Permission required", message: "Allow photo access in Settings." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
      const { data } = await withdrawalsApi.create(fd);
      if (data?.status === "verified") {
        showAlert({
          type: "success",
          title: "Verified!",
          message: `${formatMoney(parseFloat(amount))} verified and counted toward your level.`,
        });
      } else {
        showAlert({
          type: "info",
          title: "In review",
          message: "Got it — needs a quick manual review. We'll confirm shortly, then it counts.",
        });
      }
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
              <TouchableOpacity
                onPress={() => { reset(); onClose(); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
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
                      AI verifies it in seconds — reused or suspicious shots go to manual review.
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
                <Text style={am.saveBtnText}>{saving ? "Verifying…" : "Submit for Verification"}</Text>
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
  label: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
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
  inputHint: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
  },
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
  proofThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  proofLabel: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  proofHint: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    marginTop: 3,
    lineHeight: 15,
  },
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

// ─── WithdrawalsCard — main component ─────────────────────────────────────────
export default function WithdrawalsCard({ onNavigate }) {
  const { showAlert, showConfirm } = useAlert();
  const [levels, setLevels] = useState(null);
  const [list, setList] = useState([]);
  const [showList, setShowList] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    try {
      const [lv, l] = await Promise.all([withdrawalsApi.levels(), withdrawalsApi.list()]);
      setLevels(lv.data);
      setList(l.data || []);
    } catch {
      // silent — card won't render if null
    }
  }, []);

  useEffect(() => {
    load();
    tokenService.get().then((t) => setToken(t || ""));
  }, [load]);

  const downloadCert = async (level) => {
    setCertBusy(true);
    try {
      const t = await tokenService.get();
      const url = `${API_URL}/api/withdrawals/certificate?level=${level}`;
      const dest = new File(Paths.cache, `cashflow_level${level}_certificate.pdf`);
      const downloaded = await File.downloadFileAsync(url, dest, {
        headers: { Authorization: `Bearer ${t || ""}` },
        idempotent: true,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showAlert({ type: "success", title: "Downloaded", message: `Level ${level} certificate saved.` });
        return;
      }
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: "application/pdf",
        dialogTitle: `cashflow_level${level}_certificate.pdf`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      showAlert({ type: "error", title: "Not available", message: "Certificate unlocks once this level is verified." });
    } finally {
      setCertBusy(false);
    }
  };

  const deleteWithdrawal = (id) => {
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

  if (!levels) return null;

  const {
    verified_total,
    pending_total,
    pending_count,
    levels: tiers,
    progress_to_next,
    remaining_to_next,
    current_level,
    all_complete,
    mentor_eligible,
  } = levels;

  const currentTier = (tiers || []).find((t) => t.status === "current");
  const verifiedCount = list.filter((w) => w.status === "verified").length;

  return (
    <>
      <View style={wc.card}>
        {/* Decorative glow orb */}
        <View style={wc.glowOrb} pointerEvents="none" />

        <View style={wc.inner}>
          {/* ── Total section ── */}
          <View style={wc.chip}>
            <Ionicons name="wallet-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
            <Text style={wc.chipText}>Verified Withdrawn</Text>
          </View>

          <Text style={wc.totalAmount} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(verified_total || 0)}
          </Text>

          <View style={wc.metaRow}>
            <Text style={wc.totalMeta}>{verifiedCount} verified</Text>
            {(pending_count || 0) > 0 && (
              <Text style={wc.pendingMeta}>
                {"  "}{formatMoney(pending_total || 0)} in review ({pending_count})
              </Text>
            )}
          </View>

          <View style={wc.btnRow}>
            <TouchableOpacity style={wc.addBtn} onPress={() => setAddOpen(true)}>
              <Ionicons name="add" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={wc.addBtnText}>Add Withdrawal</Text>
            </TouchableOpacity>
            {list.length > 0 && (
              <TouchableOpacity style={wc.viewBtn} onPress={() => setShowList((v) => !v)}>
                <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                <Text style={wc.viewBtnText}>{showList ? "Hide" : "View all"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Progress to current level ── */}
          {!all_complete && currentTier && (
            <View style={wc.progressSection}>
              <View style={wc.progressHeader}>
                <Text style={wc.progressLabel}>
                  Level {current_level} target · {formatMoney(currentTier.target)}
                </Text>
                <Text style={wc.progressPct}>{progress_to_next || 0}%</Text>
              </View>
              <View style={wc.progressTrack}>
                <View
                  style={[
                    wc.progressFill,
                    { width: `${Math.min(progress_to_next || 0, 100)}%` },
                  ]}
                />
              </View>
              <Text style={wc.progressMeta}>
                {formatMoney(remaining_to_next || 0)} to unlock Level {current_level}
              </Text>
            </View>
          )}

          {/* ── Mentor eligibility banner ── */}
          {mentor_eligible && (
            <View style={wc.mentorBanner}>
              <View style={wc.mentorIconBox}>
                <Ionicons name="school-outline" size={20} color={AMBER} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={wc.mentorTitle}>All levels cleared — you're Mentor-eligible 🎓</Text>
                <Text style={wc.mentorHint}>
                  Next step: a 1:1 mentor interview to assess the value you can give other traders.
                </Text>
              </View>
              <TouchableOpacity style={wc.mentorLearnBtn} onPress={() => setMentorOpen(true)}>
                <Text style={wc.mentorLearnText}>Learn more</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Level cards grid ── */}
          <View style={wc.levelGrid}>
            {(tiers || []).map((t) => (
              <LevelCard
                key={t.level}
                tier={t}
                certBusy={certBusy}
                onDownloadCert={downloadCert}
              />
            ))}
          </View>
        </View>

        {/* ── Withdrawal list (toggle) ── */}
        {showList && (
          <View style={wc.listWrap}>
            {list.length === 0 ? (
              <Text style={wc.listEmpty}>No withdrawals logged yet.</Text>
            ) : (
              list.map((w) => (
                <View key={w.withdrawal_id} style={wc.listRow}>
                  <View style={wc.listIconBox}>
                    <Ionicons name="cash-outline" size={16} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={wc.listAmountRow}>
                      <Text style={wc.listAmount}>{formatMoney(w.amount || 0)}</Text>
                      {w.status ? <StatusBadge status={w.status} /> : null}
                    </View>
                    <View style={wc.listMeta}>
                      <Ionicons
                        name="calendar-outline"
                        size={11}
                        color="rgba(255,255,255,0.45)"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={wc.listMetaText} numberOfLines={1}>
                        {formatDate(w.date)}{w.note ? ` · ${w.note}` : ""}
                      </Text>
                    </View>
                    {w.status === "needs_review" && w.review_reason ? (
                      <Text style={wc.reviewReason} numberOfLines={1}>
                        {w.review_reason}
                      </Text>
                    ) : null}
                  </View>
                  {w.proof_path && token ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          `${API_URL}/api/files/${w.proof_path}?auth=${encodeURIComponent(token)}`
                        )
                      }
                      style={wc.proofThumbWrap}
                    >
                      <Image
                        source={{
                          uri: `${API_URL}/api/files/${w.proof_path}?auth=${encodeURIComponent(token)}`,
                        }}
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
        )}
      </View>

      <AddWithdrawalModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await load();
        }}
      />

      <MentorModal visible={mentorOpen} onClose={() => setMentorOpen(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  chipText: {
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Total amount
  totalAmount: {
    color: PRIMARY,
    fontFamily: "Inter_900Black",
    fontSize: 52,
    lineHeight: 56,
    textShadowColor: "rgba(57,255,20,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },

  // Meta row (verified count + pending)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  totalMeta: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  pendingMeta: {
    color: AMBER,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
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

  // Progress to current level
  progressSection: {
    marginTop: 20,
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "rgba(255,255,255,0.80)",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  progressPct: {
    color: PRIMARY,
    fontFamily: "Inter_900Black",
    fontSize: 22,
    lineHeight: 26,
  },
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
  progressMeta: {
    color: "rgba(255,255,255,0.60)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // Mentor banner
  mentorBanner: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AMBER + "66",
    backgroundColor: AMBER + "0D",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mentorIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AMBER + "1F",
    borderWidth: 1,
    borderColor: AMBER + "66",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mentorTitle: {
    color: "#fff",
    fontFamily: "Inter_900Black",
    fontSize: 14,
    lineHeight: 18,
  },
  mentorHint: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  mentorLearnBtn: {
    borderWidth: 1,
    borderColor: AMBER + "80",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  mentorLearnText: {
    color: AMBER,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },

  // Level cards grid (vertical stack — one card per row)
  levelGrid: {
    flexDirection: "column",
    gap: 8,
    marginTop: 20,
  },

  // Withdrawal list
  listWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  listEmpty: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
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
    flexShrink: 0,
  },
  listAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  listAmount: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  listMetaText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    flex: 1,
  },
  reviewReason: {
    color: AMBER + "CC",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
  proofThumbWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PRIMARY + "50",
    flexShrink: 0,
  },
  proofThumb: { width: "100%", height: "100%", resizeMode: "cover" },
  deleteBtn: { padding: 4, flexShrink: 0 },
});
