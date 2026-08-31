import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { profileApi } from "../../src/api/profile";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { extractApiError } from "../../src/utils/apiError";

// Web flow (PasswordFlowModal.jsx, mode="create" — needs:"none"):
//   on mount -> POST /profile/password/create/start {} -> step "set"
//   step "set" -> POST /profile/password/create/verify {code, new_password} -> forced re-auth
// No email/current-password step (none exists yet for a social-only account) and no "resend
// code" link — web only shows resend for mode="forgot" (PasswordFlowModal.jsx's mode==="forgot"
// gate around that button). Reuses the same OTP+set-password screen structure and validation as
// ForgotPasswordScreen.js rather than a parallel implementation.
export default function CreatePasswordScreen({ navigation }) {
  const [step, setStep] = useState("loading");
  const [code, setCode] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const { logout } = useAuth();
  const { showAlert } = useAlert();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await profileApi.createPasswordStart();
        if (!active) return;
        setSentTo(data.sent_to || "");
        setDevOtp(data.dev_otp || "");
        setStep("set");
      } catch (e) {
        if (!active) return;
        // Matches web: if the initial send fails, there's nothing to do on this screen — back out.
        showAlert({ type: "error", title: "Error", message: extractApiError(e) || "Could not send code." });
        navigation.goBack();
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await profileApi.createPasswordVerify(code, pw1);
      // Setting a password invalidates every active session for this account, including this one
      // (backend bumps session_version) — sign back in with the new password rather than let this
      // device's next request fail later with a misleading error, matching web's forced
      // re-auth + "Please sign in again" copy exactly (PasswordFlowModal.jsx:69-77).
      await logout();
      showAlert({ type: "success", title: "Password Created", message: "Password updated. Please sign in again." });
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
            <AuthHeader rightText="Cancel" onRightPress={() => navigation.goBack()} />

            <View style={styles.card}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Create Password</Text>
              </View>

              <Text style={styles.title}>Set a password to{"\n"}
                <Text style={{ color: PRIMARY }}>also sign in with email.</Text>
              </Text>

              {step === "loading" ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : (
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

  loadingWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },

  devOtpText: {
    color: "#FBBF24",
    fontFamily: MONO.regular,
    fontSize: 11,
    textAlign: "center",
    marginTop: -4,
    marginBottom: 12,
  },

  errorText: {
    color: "#f87171",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
});
