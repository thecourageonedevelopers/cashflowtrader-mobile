import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { useAuth } from "../src/hooks/useAuth";
import { supportApi } from "../src/api/support";
import { extractApiError } from "../src/utils/apiError";
import { useAlert } from "../src/context/AlertContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const REQ_TYPES = [
  { key: "support_call",    label: "Request Support Call",              icon: "call-outline",      desc: "Talk to our team for help with the platform." },
  { key: "mentorship",      label: "Request Mentorship Consultation",   icon: "people-outline",    desc: "Book time with a senior mentor." },
  { key: "account_opening", label: "Account Opening Assistance",        icon: "briefcase-outline", desc: "Set up your broker / trading account." },
  { key: "one_on_one",      label: "Book One-On-One Session",           icon: "calendar-outline",  desc: "Personalized 60-min session." },
];

const TYPE_LABEL = Object.fromEntries(REQ_TYPES.map((t) => [t.key, t.label]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Status colors matching web: open=amber, answered=neon, resolved=dim
const STATUS_COLOR = {
  open:     { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.30)", text: "#fcd34d" },
  answered: { bg: "rgba(57,255,20,0.15)",  border: "rgba(57,255,20,0.30)",  text: PRIMARY },
  resolved: { bg: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.15)", text: "rgba(255,255,255,0.50)" },
};

function fmt(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SupportScreen({ navigation }) {
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  const { user } = useAuth();

  // ── Form state (for the create-request modal) ──────────────────────────────
  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", mobile: user?.mobile || "", reason: "" });
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // ── Requests / thread state ────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  // ── Load requests ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const r = await supportApi.list();
      setRequests(r.data?.requests || []);
    } catch { /* ignore — non-critical */ }
  }, []);

  useEffect(() => {
    setLoadingRequests(true);
    load().finally(() => setLoadingRequests(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Validation — matches web exactly ──────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address";
    const digits = (form.mobile || "").replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) e.mobile = "Enter a valid phone number (10 digits)";
    if (form.reason.trim().length < 5) e.reason = "Please describe your request (min 5 characters)";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit new request ─────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await supportApi.submit({ ...form, request_type: activeType });
      setActiveType(null);
      setForm({ name: user?.name || "", email: user?.email || "", mobile: user?.mobile || "", reason: "" });
      setFormErrors({});
      await load();
      showAlert({ type: "success", title: "Request Sent", message: "Our team will reach you shortly." });
    } catch (e) {
      showAlert({ type: "error", title: "Submission Failed", message: extractApiError(e) });
    } finally {
      setBusy(false);
    }
  };

  // ── Send reply ─────────────────────────────────────────────────────────────
  const sendReply = async (rid) => {
    if (!replyText.trim()) return;
    setReplyBusy(true);
    try {
      await supportApi.reply(rid, replyText.trim());
      setReplyText("");
      await load();
    } catch (e) {
      showAlert({ type: "error", title: "Reply Failed", message: extractApiError(e) });
    } finally {
      setReplyBusy(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout screenName="SupportScreen" navigation={navigation}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, isDesktop && s.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
        >

          {/* ── Hero ── */}
          <View style={s.hero}>
            <View style={s.chip}>
              <Ionicons name="headset-outline" size={11} color={PRIMARY} />
              <Text style={s.chipText}>SUPPORT</Text>
            </View>
            <Text style={s.heroTitle}>
              We respond when <Text style={s.heroAccent}>you ask.</Text>
            </Text>
            <Text style={s.heroSub}>Pick what you need. We'll be in touch.</Text>
          </View>

          {/* ── Request type cards ── */}
          <View style={[s.cardGrid, isDesktop && s.cardGridDesktop]}>
            {REQ_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={s.typeCard}
                onPress={() => { setActiveType(t.key); setFormErrors({}); }}
                activeOpacity={0.75}
              >
                <View style={s.iconBox}>
                  <Ionicons name={t.icon} size={22} color={PRIMARY} />
                </View>
                <Text style={s.typeCardTitle}>{t.label}</Text>
                <Text style={s.typeCardDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Your Requests ── */}
          <View style={s.requestsSection}>
            <View style={s.requestsHeader}>
              <Ionicons name="chatbubbles-outline" size={16} color={PRIMARY} />
              <Text style={s.requestsHeading}>Your Requests</Text>
            </View>

            {loadingRequests ? (
              <View style={s.emptyCard}>
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            ) : requests.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No requests yet. Pick an option above to get started.</Text>
              </View>
            ) : (
              requests.map((r) => {
                const expanded = openThread === r.request_id;
                const st = STATUS_COLOR[r.status] || STATUS_COLOR.open;
                const replyCount = r.replies?.length || 0;

                return (
                  <View key={r.request_id} style={s.requestCard}>

                    {/* ── Request header row — tap to expand / collapse ── */}
                    <TouchableOpacity
                      style={s.requestHeaderRow}
                      onPress={() => setOpenThread(expanded ? null : r.request_id)}
                      activeOpacity={0.75}
                    >
                      <View style={s.requestHeaderLeft}>
                        <View style={s.requestTitleRow}>
                          <Text style={s.requestTypeLabel} numberOfLines={1}>
                            {TYPE_LABEL[r.request_type] || r.request_type}
                          </Text>
                          <View style={[s.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                            <Text style={[s.statusBadgeText, { color: st.text }]}>{r.status}</Text>
                          </View>
                        </View>
                        <Text style={s.requestReason} numberOfLines={1}>{r.reason}</Text>
                        <Text style={s.requestMeta}>
                          {fmt(r.created_at)} · {replyCount} repl{replyCount === 1 ? "y" : "ies"}
                        </Text>
                      </View>
                      <Text style={s.expandChevron}>{expanded ? "▲" : "▼"}</Text>
                    </TouchableOpacity>

                    {/* ── Thread — visible only when expanded ── */}
                    {expanded && (
                      <View style={s.threadContainer}>

                        {/* Initial message bubble */}
                        <View style={[s.bubble, s.bubbleUser]}>
                          <Text style={s.bubbleAuthorUser}>
                            {r.name || "You"} · {fmt(r.created_at)}
                          </Text>
                          <Text style={s.bubbleText}>{r.reason}</Text>
                        </View>

                        {/* Reply bubbles */}
                        {(r.replies || []).map((m, i) => (
                          <View
                            key={i}
                            style={[s.bubble, m.from === "staff" ? s.bubbleStaff : s.bubbleUser]}
                          >
                            <Text style={m.from === "staff" ? s.bubbleAuthorStaff : s.bubbleAuthorUser}>
                              {m.from === "staff" ? "Support Team" : (m.author || "You")} · {fmt(m.at)}
                            </Text>
                            <Text style={s.bubbleText}>{m.message}</Text>
                          </View>
                        ))}

                        {/* Reply box — hidden when resolved */}
                        {r.status !== "resolved" && (
                          <View style={s.replyRow}>
                            <TextInput
                              style={s.replyInput}
                              value={openThread === r.request_id ? replyText : ""}
                              onChangeText={setReplyText}
                              placeholder="Type a reply..."
                              placeholderTextColor="rgba(255,255,255,0.30)"
                              multiline
                              numberOfLines={2}
                              textAlignVertical="top"
                              selectionColor={PRIMARY}
                            />
                            <TouchableOpacity
                              style={[s.sendBtn, (replyBusy || !replyText.trim()) && s.sendBtnDisabled]}
                              onPress={() => sendReply(r.request_id)}
                              disabled={replyBusy || !replyText.trim()}
                              activeOpacity={0.8}
                            >
                              {replyBusy
                                ? <ActivityIndicator size="small" color="#000" />
                                : <Ionicons name="send" size={16} color="#000" />
                              }
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Create Request Modal ── */}
      <Modal
        visible={activeType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!busy) setActiveType(null); }}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => { if (!busy) setActiveType(null); }}
        >
          <KeyboardAvoidingView
            style={s.modalKAV}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.modalScrollContent}
            >
              <View style={s.modalCard} onStartShouldSetResponder={() => true}>

                {/* Modal header */}
                <View style={s.modalHeaderRow}>
                  <View style={s.modalHeaderLeft}>
                    <View style={s.chip}>
                      <Text style={s.chipText}>SUPPORT REQUEST</Text>
                    </View>
                    <Text style={s.modalTitle}>
                      {REQ_TYPES.find((t) => t.key === activeType)?.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { if (!busy) setActiveType(null); }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={22} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Text fields */}
                {[
                  { key: "name",   label: "FULL NAME", placeholder: "Arjun",         keyboardType: "default",       autoCapitalize: "words" },
                  { key: "email",  label: "EMAIL",     placeholder: "you@trader.com", keyboardType: "email-address", autoCapitalize: "none" },
                  { key: "mobile", label: "MOBILE",    placeholder: "9876543210",     keyboardType: "phone-pad",     autoCapitalize: "none" },
                ].map((f) => (
                  <View key={f.key} style={s.fieldWrap}>
                    <Text style={s.fieldLabel}>{f.label}</Text>
                    <TextInput
                      style={[s.input, !!formErrors[f.key] && s.inputError]}
                      value={form[f.key]}
                      onChangeText={(v) => {
                        setForm((prev) => ({ ...prev, [f.key]: v }));
                        setFormErrors((prev) => ({ ...prev, [f.key]: undefined }));
                      }}
                      placeholder={f.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.30)"
                      keyboardType={f.keyboardType}
                      autoCapitalize={f.autoCapitalize}
                      selectionColor={PRIMARY}
                      editable={!busy}
                    />
                    {!!formErrors[f.key] && (
                      <Text style={s.fieldError}>{formErrors[f.key]}</Text>
                    )}
                  </View>
                ))}

                {/* Reason field */}
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>REASON</Text>
                  <TextInput
                    style={[s.textArea, !!formErrors.reason && s.inputError]}
                    value={form.reason}
                    onChangeText={(v) => {
                      setForm((prev) => ({ ...prev, reason: v }));
                      setFormErrors((prev) => ({ ...prev, reason: undefined }));
                    }}
                    placeholder="Tell us briefly..."
                    placeholderTextColor="rgba(255,255,255,0.30)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    selectionColor={PRIMARY}
                    editable={!busy}
                  />
                  {!!formErrors.reason && (
                    <Text style={s.fieldError}>{formErrors.reason}</Text>
                  )}
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[s.submitBtn, busy && s.submitBtnBusy]}
                  onPress={submit}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  {busy
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={s.submitBtnText}>Submit Request</Text>
                  }
                </TouchableOpacity>

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG     = "rgba(255,255,255,0.03)";   // web: glass (bg-white/[0.03])
const CARD_BORDER = "rgba(255,255,255,0.08)";   // web: glass (border-white/[0.08])
const INPUT_BG    = "rgba(0,0,0,0.40)";          // web: bg-black/40
const INPUT_BORDER = "rgba(255,255,255,0.10)";
const LABEL_COLOR  = "rgba(255,255,255,0.40)";   // web: text-white/40
const TEXT_COLOR   = "#fff";

const s = StyleSheet.create({
  flex: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  scrollContentDesktop: {
    paddingHorizontal: 32,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    gap: 10,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    backgroundColor: "rgba(57,255,20,0.08)",
  },

  chipText: {
    color: "rgba(57,255,20,0.80)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  heroTitle: {
    color: TEXT_COLOR,
    fontSize: 32,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 40,
  },

  heroAccent: {
    color: PRIMARY,
  },

  heroSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  // ── Request type cards ───────────────────────────────────────────────────
  cardGrid: {
    gap: 12,
  },

  cardGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  typeCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(57,255,20,0.10)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    justifyContent: "center",
    alignItems: "center",
  },

  typeCardTitle: {
    color: TEXT_COLOR,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },

  typeCardDesc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // ── Your Requests section ────────────────────────────────────────────────
  requestsSection: {
    gap: 10,
  },

  requestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  requestsHeading: {
    color: TEXT_COLOR,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  emptyText: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // ── Request card (accordion) ─────────────────────────────────────────────
  requestCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    overflow: "hidden",
  },

  requestHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: 16,
  },

  requestHeaderLeft: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },

  requestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  requestTypeLabel: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    flexShrink: 1,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },

  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  requestReason: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  requestMeta: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  expandChevron: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 11,
    flexShrink: 0,
    marginTop: 2,
  },

  // ── Thread ───────────────────────────────────────────────────────────────
  threadContainer: {
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    padding: 14,
    gap: 10,
  },

  // Base bubble
  bubble: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },

  // User bubble — matches web bg-white/[0.03] border-white/10
  bubbleUser: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.10)",
  },

  // Staff bubble — matches web bg-[#39FF14]/[0.06] border-[#39FF14]/20 ml-6
  bubbleStaff: {
    backgroundColor: "rgba(57,255,20,0.06)",
    borderColor: "rgba(57,255,20,0.20)",
    marginLeft: 20,
  },

  bubbleAuthorUser: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  bubbleAuthorStaff: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  bubbleText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // ── Reply row ────────────────────────────────────────────────────────────
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  replyInput: {
    flex: 1,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_COLOR,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 64,
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 4,
  },

  sendBtnDisabled: {
    opacity: 0.45,
  },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.80)",
    justifyContent: "flex-end",
  },

  modalKAV: {
    width: "100%",
  },

  modalScrollContent: {
    paddingTop: 20,
  },

  modalCard: {
    backgroundColor: "#050505",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 4,
  },

  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },

  modalHeaderLeft: {
    flex: 1,
    gap: 8,
  },

  modalTitle: {
    color: TEXT_COLOR,
    fontSize: 22,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  // ── Form fields ──────────────────────────────────────────────────────────
  fieldWrap: {
    marginTop: 14,
    gap: 6,
  },

  fieldLabel: {
    color: LABEL_COLOR,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  input: {
    height: 46,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: TEXT_COLOR,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  inputError: {
    borderColor: "rgba(239,68,68,0.60)",
  },

  textArea: {
    minHeight: 80,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    color: TEXT_COLOR,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  fieldError: {
    color: "#f87171",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // ── Submit button ────────────────────────────────────────────────────────
  submitBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },

  submitBtnBusy: {
    opacity: 0.65,
  },

  submitBtnText: {
    color: "#000",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
  },
});
