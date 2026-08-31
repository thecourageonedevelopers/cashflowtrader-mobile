import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { authApi } from "../../src/api/auth";
import { useAlert } from "../../src/context/AlertContext";
import { extractApiError } from "../../src/utils/apiError";

// Mirrors web PasswordFlowModal.jsx's "forgot" mode validation exactly.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Web flow (PasswordFlowModal.jsx, mode="forgot"):
//   step "request" -> POST /auth/forgot-password/start {email} -> step "set"
//   step "set"     -> POST /auth/forgot-password/reset {email, code, new_password} -> done
// There is no intermediate /auth/forgot-password/verify call in this flow on web — mirrored here.
export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState(route.params?.emailPrefill || "");
  const [code, setCode] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const { showAlert } = useAlert();

  const callStart = async (cleanEmail) => {
    setBusy(true);
    try {
      const { data } = await authApi.forgotPasswordStart(cleanEmail);
      setSentTo(data.sent_to || "your email");
      setDevOtp(data.dev_otp || "");
      setCode("");
      setError("");
      setStep("set");
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const startReq = () => {
    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    callStart(cleanEmail);
  };

  const finish = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (pw1.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.forgotPasswordReset(email.trim(), code, pw1);
      // Web shows two sequential toasts here ("Password updated successfully." then "You can now
      // sign in with your new password.") — consolidated into one alert since mobile's AlertContext
      // is a blocking modal, not a toast stack; same information, adapted to the existing pattern.
      showAlert({
        type: "success",
        title: "Password updated",
        message: "You can now sign in with your new password.",
        onConfirm: () => navigation.goBack(),
      });
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuthBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader
              rightText="Sign In →"
              onRightPress={() => navigation.goBack()}
            />

            <View style={styles.card}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Reset Password</Text>
              </View>

              <Text style={styles.title}>Secured with an{"\n"}
                <Text style={{ color: PRIMARY }}>email verification code.</Text>
              </Text>

              {step === "request" && (
                <>
                  <Text style={styles.subtitle}>
                    Enter your registered email and we'll send you a verification code.
                  </Text>

                  <Text style={authBaseStyles.label}>EMAIL</Text>
                  <AuthInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(""); }}
                    placeholder="you@trader.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon="mail-outline"
                  />

                  <PrimaryButton onPress={startReq} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
                    Send Verification Code →
                  </PrimaryButton>
                </>
              )}

              {step === "set" && (
                <>
                  <Text style={styles.subtitle}>
                    Enter the 6-digit code sent to{" "}
                    <Text style={{ color: PRIMARY }}>{sentTo}</Text>, then set your new password.
                  </Text>

                  <Text style={authBaseStyles.label}>VERIFICATION CODE</Text>
                  <AuthInput
                    value={code}
                    onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                    leftIcon="shield-checkmark-outline"
                  />

                  {!!devOtp && (
                    <Text style={styles.devOtpText}>
                      DEV CODE: {devOtp} — email provider not configured yet
                    </Text>
                  )}

                  <Text style={authBaseStyles.label}>NEW PASSWORD</Text>
                  <AuthInput
                    value={pw1}
                    onChangeText={(v) => { setPw1(v); setError(""); }}
                    placeholder="Min 6 characters"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon="lock-closed-outline"
                  />

                  <Text style={authBaseStyles.label}>CONFIRM NEW PASSWORD</Text>
                  <AuthInput
                    value={pw2}
                    onChangeText={(v) => { setPw2(v); setError(""); }}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon="lock-closed-outline"
                  />

                  <PrimaryButton onPress={finish} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
                    Save Password
                  </PrimaryButton>

                  <TouchableOpacity
                    style={styles.resendWrap}
                    onPress={() => callStart(email.trim())}
                    disabled={busy}
                    activeOpacity={0.75}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                      <Text style={styles.resendText}>
                        Didn't get the code? <Text style={{ color: PRIMARY }}>Resend code</Text>
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Card — glass-strong (matches SignIn/SignUp)
  card: {
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 28,
    marginTop: 16,
  },

  chip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
  },
  chipText: {
    color: PRIMARY,
    fontFamily: MONO.regular,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  title: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },

  devOtpText: {
    color: "#FBBF24",
    fontFamily: MONO.regular,
    fontSize: 11,
    textAlign: "center",
    marginTop: -4,
    marginBottom: 12,
  },

  resendWrap: {
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 13,
  },

  errorText: {
    color: "#f87171",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
});
