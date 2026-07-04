import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import GoogleButton from "../../components/auth/GoogleButton";
import AuthDivider from "../../components/auth/AuthDivider";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
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

  const { register } = useAuth();

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
    backgroundColor: "rgba(10,10,10,0.9)",
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

  footer: {
    marginTop: 24,
  },
});
