/**
 * ChangeContactScreen — RN port of web src/components/ChangeContactModal.jsx.
 *
 * OTP-gated change flow for protected identity fields (mobile / email), single component
 * parametrized by `mode` exactly like web. Mobile change: email OTP -> new-phone OTP. Email
 * change: mobile OTP -> new-email OTP. No resend/cooldown control exists on web for this flow
 * (confirmed by a full fresh read of ChangeContactModal.jsx — unlike PasswordFlowModal's
 * forgot-mode, which does have one) — none is invented here either.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { profileApi } from "../src/api/profile";
import { useAuth } from "../src/hooks/useAuth";
import { extractApiError } from "../src/utils/apiError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeContactScreen({ navigation, route }) {
  const mode = route.params?.mode === "mobile" ? "mobile" : "email";
  const isMobileMode = mode === "mobile";
  const { refresh } = useAuth();

  const [step, setStep] = useState("input"); // input | otp1 | otp2
  const [newVal, setNewVal] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const title = isMobileMode ? "Change Mobile Number" : "Change Email Address";

  const start = async () => {
    if (isMobileMode) {
      if (!newVal || newVal.replace(/\D/g, "").length < 8) {
        setError("Enter a valid mobile number with country code.");
        return;
      }
    } else if (!EMAIL_RE.test(newVal.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { data } = isMobileMode
        ? await profileApi.changeMobileStart(newVal.trim())
        : await profileApi.changeEmailStart(newVal.trim());
      setSentTo(data.sent_to);
      setDevOtp(data.dev_otp || "");
      setCode("");
      setError("");
      setStep("otp1");
    } catch (e) {
      setError(extractApiError(e) || "Could not start verification.");
    } finally {
      setBusy(false);
    }
  };

  const verify1 = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const { data } = isMobileMode
        ? await profileApi.changeMobileVerifyEmail(code)
        : await profileApi.changeEmailVerifyMobile(code);
      setSentTo(data.sent_to);
      setDevOtp(data.dev_otp || "");
      setCode("");
      setError("");
      setStep("otp2");
    } catch (e) {
      setError(extractApiError(e) || "Incorrect code.");
    } finally {
      setBusy(false);
    }
  };

  const verify2 = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      isMobileMode
        ? await profileApi.changeMobileVerifyPhone(code)
        : await profileApi.changeEmailVerifyEmail(code);
      await refresh();
      navigation.goBack();
    } catch (e) {
      setError(extractApiError(e) || "Incorrect code.");
    } finally {
      setBusy(false);
    }
  };

  // Both steps of both flows are emailed (no SMS provider configured) — matches web's own
  // documented comment exactly, including why the copy says "email" even on the mobile-change
  // flow's second step.
  const otp1Label = "registered email";
  const otp2Label = isMobileMode ? "registered email" : "new email address";

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={s.backText}>Profile</Text>
          </TouchableOpacity>

          <View style={s.card}>
            <View style={s.titleRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={PRIMARY} />
              <Text style={s.title}>{title}</Text>
            </View>
            <Text style={s.subtitle}>Verify your identity to update this protected field.</Text>

            {step === "input" && (
              <>
                <Text style={s.stepCopy}>
                  {isMobileMode
                    ? "We'll verify it's you via your email, then verify your new number."
                    : "We'll verify it's you via your mobile, then verify your new email."}
                </Text>
                <TextInput
                  style={s.input}
                  value={newVal}
                  onChangeText={(v) => { setNewVal(v); setError(""); }}
                  placeholder={isMobileMode ? "Enter new mobile number" : "Enter new email address"}
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  keyboardType={isMobileMode ? "phone-pad" : "email-address"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={[s.actionBtn, busy && s.actionBtnDisabled]} onPress={start} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="arrow-forward" size={16} color="#000" />}
                  <Text style={s.actionBtnText}>Send Verification Code</Text>
                </TouchableOpacity>
              </>
            )}

            {(step === "otp1" || step === "otp2") && (
              <>
                <Text style={s.stepCopy}>
                  Enter the 6-digit code sent to your{" "}
                  <Text style={{ color: PRIMARY }}>{step === "otp1" ? otp1Label : otp2Label}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.70)" }}> ({sentTo})</Text>.
                </Text>
                <TextInput
                  style={s.input}
                  value={code}
                  onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
                  placeholder="6-digit code"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {!!devOtp && (
                  <Text style={s.devOtpText}>DEV CODE: {devOtp} — email/SMS provider not configured yet</Text>
                )}
                <TouchableOpacity
                  style={[s.actionBtn, busy && s.actionBtnDisabled]}
                  onPress={step === "otp1" ? verify1 : verify2}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="checkmark-circle" size={16} color="#000" />}
                  <Text style={s.actionBtnText}>
                    {step === "otp1" ? "Verify & Continue" : (isMobileMode ? "Verify & Update Mobile" : "Verify & Update Email")}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {!!error && <Text style={s.errorText}>{error}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 20, paddingBottom: 40 },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 13 },

  card: {
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 24,
  },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 20 },
  subtitle: { color: "rgba(255,255,255,0.50)", fontFamily: BODY.regular, fontSize: 13, marginTop: 8, marginBottom: 18 },
  stepCopy: { color: "rgba(255,255,255,0.70)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20, marginBottom: 14 },

  input: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 15,
    marginBottom: 14,
  },

  devOtpText: {
    color: "#FBBF24",
    fontFamily: MONO.regular,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 14,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14 },

  errorText: { color: "#f87171", fontFamily: BODY.regular, fontSize: 13, textAlign: "center", marginTop: 14 },
});
