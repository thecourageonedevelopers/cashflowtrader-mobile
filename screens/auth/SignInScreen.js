import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthInput from "../../components/auth/AuthInput";
import GoogleButton from "../../components/auth/GoogleButton";
import AuthDivider from "../../components/auth/AuthDivider";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
import { extractApiError } from "../../src/utils/apiError";

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation is automatic — RootNavigator switches to AppStack when
      // AuthContext.user becomes non-null after a successful login.
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
            {/* Logo — centered above card (matches web Login) */}
            <View style={styles.logoSection}>
              <View style={styles.logoGlow}>
                <Image
                  source={require("../../assets/adaptive-icon.png")}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.logoText}>
                Cashflow <Text style={{ color: PRIMARY }}>Trader</Text>
              </Text>
            </View>

            {/* Card — glass-strong */}
            <View style={styles.card}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Sign In</Text>
              </View>

              <Text style={styles.title}>Welcome back, trader.</Text>
              <Text style={styles.subtitle}>
                Pick up where you left off. Your routine is waiting.
              </Text>

              <GoogleButton />

              <AuthDivider />

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

              <Text style={authBaseStyles.label}>PASSWORD</Text>
              <AuthInput
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                onRightPress={() => setShowPassword(!showPassword)}
              />

              <TouchableOpacity style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <PrimaryButton onPress={handleSignIn} loading={loading} disabled={loading}>
                Sign In →
              </PrimaryButton>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Text style={[authBaseStyles.footerText, styles.footer]}>
                New here?{" "}
                <Text
                  style={authBaseStyles.footerLink}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  Start your journey
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

  // Logo section — centered column above card
  logoSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 8,
    gap: 12,
  },
  logoGlow: {
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImg: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  logoText: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },

  // Card — glass-strong
  card: {
    backgroundColor: "rgba(10,10,10,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 28,
    marginTop: 16,
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
    lineHeight: 36,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: BODY.regular,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },

  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    color: "rgba(57,255,20,0.9)",
    fontFamily: BODY.regular,
    fontSize: 12,
  },

  errorText: {
    color: "#f87171",
    fontFamily: BODY.regular,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },

  footer: {
    marginTop: 24,
  },
});
