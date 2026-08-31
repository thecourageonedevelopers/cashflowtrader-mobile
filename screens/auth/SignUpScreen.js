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
import { Ionicons } from "@expo/vector-icons";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import GoogleButton from "../../components/auth/GoogleButton";
import AuthDivider from "../../components/auth/AuthDivider";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
import { authApi } from "../../src/api/auth";
import { useAlert } from "../../src/context/AlertContext";
import { extractApiError } from "../../src/utils/apiError";

// Mirrors web Register.jsx validation constants exactly
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE  = /^[A-Za-z\s]+$/;

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Email verification (server-enforced — see IdentityService#register's guard). Mirrors web
  // Register.jsx's state machine exactly: verifiedEmail tracks the exact address an OTP was
  // confirmed for, so editing the email after verifying automatically drops back to unverified.
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const emailVerified = !!verifiedEmail && verifiedEmail === email.trim().toLowerCase();

  const { register } = useAuth();
  const { showAlert } = useAlert();

  const sendOtp = async () => {
    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setOtpBusy(true);
    try {
      const { data } = await authApi.sendRegisterOtp(cleanEmail);
      setDevOtp(data.dev_otp || "");
      setOtp("");
      setOtpSent(true);
      showAlert({
        type: "success",
        title: "Code sent",
        message: `Verification code sent to ${data.sent_to || cleanEmail}`,
      });
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setOtpBusy(true);
    try {
      await authApi.verifyRegisterOtp(email.trim(), otp);
      setVerifiedEmail(email.trim().toLowerCase());
      setOtpSent(false);
      setOtp("");
      setError("");
      showAlert({ type: "success", title: "Email verified" });
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSignUp = async () => {
    // Validation order mirrors web Register.jsx exactly
    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!NAME_RE.test(fullName.trim())) {
      setError("Name can only contain letters and spaces.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Server-enforced (IdentityService#register) — mirrors web Register.jsx's client-side gate,
    // which exists only to fail fast with the same message the backend would otherwise return.
    if (!emailVerified) {
      setError("Please verify your email before creating an account.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      // Navigation is automatic — RootNavigator switches to AppStack when
      // AuthContext.user becomes non-null after a successful registration.
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuthBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Nav bar — logo left, Sign In link right (matches web Register) */}
            <AuthHeader
              rightText="Sign In →"
              onRightPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "SignIn" }],
                })
              }
            />

            {/* Card — glass-strong */}
            <View style={styles.card}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Start Free</Text>
              </View>

              <Text style={styles.title}>
                Become the trader{"\n"}
                <Text style={{ color: PRIMARY }}>you respect.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Create your account. Onboarding takes under a minute.
              </Text>

              <GoogleButton />

              <AuthDivider />

              <Text style={authBaseStyles.label}>FULL NAME</Text>
              <AuthInput
                value={fullName}
                onChangeText={(v) => {
                  // Mirror web Register.jsx: strip non-letter/space chars inline
                  setFullName(v.replace(/[^A-Za-z\s]/g, ""));
                  setError("");
                }}
                placeholder="Arjun Mehra"
                autoCapitalize="words"
                autoCorrect={false}
                leftIcon="person-outline"
              />

              <Text style={authBaseStyles.label}>EMAIL</Text>
              <View style={styles.emailRow}>
                <AuthInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={(v) => {
                    // Mirror web Register.jsx: editing the email drops any in-progress/completed
                    // verification, since verifiedEmail must match the current trimmed email.
                    setEmail(v);
                    setError("");
                    setOtpSent(false);
                    setOtp("");
                  }}
                  placeholder="you@trader.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="mail-outline"
                />
                {emailVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={14} color={PRIMARY} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={sendOtp}
                    disabled={otpBusy || !email.trim()}
                    activeOpacity={0.8}
                  >
                    {otpBusy && !otpSent ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                      <Text style={styles.verifyBtnText}>
                        {otpSent ? "Resend" : "Verify"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {otpSent && !emailVerified && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpHint}>
                    Enter the 6-digit code sent to{" "}
                    <Text style={{ color: PRIMARY }}>{email.trim()}</Text>
                  </Text>
                  <AuthInput
                    value={otp}
                    onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
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
                  <TouchableOpacity
                    style={[styles.verifyOtpBtn, (otpBusy || otp.length !== 6) && styles.verifyOtpBtnDisabled]}
                    onPress={verifyOtp}
                    disabled={otpBusy || otp.length !== 6}
                    activeOpacity={0.8}
                  >
                    {otpBusy ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                      <Ionicons name="shield-checkmark-outline" size={16} color={PRIMARY} />
                    )}
                    <Text style={styles.verifyOtpBtnText}>Verify Code</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={authBaseStyles.label}>PASSWORD</Text>
              <AuthInput
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                placeholder="Min 6 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                onRightPress={() => setShowPassword(!showPassword)}
              />

              <PrimaryButton
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={{ marginTop: 18 }}
              >
                Create Account →
              </PrimaryButton>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={styles.disclaimerText}>
                By creating an account, you agree to our{" "}
                <Text
                  style={styles.disclaimerLink}
                  onPress={() => navigation.navigate("Legal", { slug: "terms" })}
                >
                  Terms
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.disclaimerLink}
                  onPress={() => navigation.navigate("Legal", { slug: "privacy" })}
                >
                  Privacy Policy
                </Text>
                .
              </Text>

              <Text style={[authBaseStyles.footerText, styles.footer]}>
                Already have an account?{" "}
                <Text
                  style={authBaseStyles.footerLink}
                  onPress={() =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "SignIn" }],
                    })
                  }
                >
                  Sign in
                </Text>
              </Text>
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

  // Card — glass-strong
  card: {
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 28,
    marginTop: 8,
  },

  // Chip
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
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },

  errorText: {
    color: "#f87171",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },

  // Matches web Register.jsx's disclosure paragraph exactly: text-[11px] text-white/35,
  // links text-white/55 underline.
  disclaimerText: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: BODY.regular,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
  },
  disclaimerLink: {
    color: "rgba(255,255,255,0.55)",
    textDecorationLine: "underline",
  },

  footer: {
    marginTop: 24,
  },

  // Email + verify/resend/verified row — mirrors web Register.jsx's flex email row
  emailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  emailInput: {
    flex: 1,
    marginBottom: 0,
  },
  verifyBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.4)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    color: PRIMARY,
    fontFamily: BODY.regular,
    fontSize: 13,
  },
  verifiedBadge: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  verifiedText: {
    color: PRIMARY,
    fontFamily: BODY.regular,
    fontSize: 13,
  },

  // OTP entry block — mirrors web Register.jsx's inline OTP panel
  otpBox: {
    marginTop: -4,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)",
    gap: 8,
  },
  otpHint: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 12,
  },
  devOtpText: {
    color: "#FBBF24",
    fontFamily: MONO.regular,
    fontSize: 11,
    textAlign: "center",
  },
  verifyOtpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
  },
  verifyOtpBtnDisabled: {
    opacity: 0.5,
  },
  verifyOtpBtnText: {
    color: PRIMARY,
    fontFamily: BODY.regular,
    fontSize: 14,
  },
});
