import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { PRIMARY, authBaseStyles } from "../../components/auth/AuthStyles";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import GoogleButton from "../../components/auth/GoogleButton";
import AuthDivider from "../../components/auth/AuthDivider";
import PrimaryButton from "../../components/auth/PrimaryButton";
import { useAuth } from "../../src/hooks/useAuth";
import { extractApiError } from "../../src/utils/apiError";

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const { width } = useWindowDimensions();

  const cardWidth = width > 768 ? 420 : width - 32;

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            rightText="Create account →"
            onRightPress={() => navigation.navigate("SignUp")}
            style={styles.header}
          />

          <AuthCard
            cardWidth={cardWidth}
            wrapperStyle={styles.cardWrapper}
            cardStyle={styles.card}
          >
            {/* Badge */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SIGN IN</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              Welcome back, trader.
            </Text>

            <Text style={styles.subtitle}>
              Pick up where you left off. Your routine is waiting.
            </Text>

            <GoogleButton
              onPress={() => { }}
              style={styles.googleButton}
            />

            <AuthDivider
              style={styles.divider}
              textStyle={styles.dividerText}
            />

            {/* Email */}
            <Text style={[authBaseStyles.label, styles.label]}>EMAIL</Text>

            <TextInput
              mode="outlined"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(""); }}
              placeholder="you@trader.com"
              placeholderTextColor={emailFocused ? "#666" : "#555"}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                { backgroundColor: emailFocused ? "#ffffff" : "#080808" },
              ]}
              textColor={emailFocused ? "#000" : "#fff"}
              outlineColor="#222"
              activeOutlineColor={PRIMARY}
              outlineStyle={{ borderRadius: 12 }}
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={emailFocused ? "#000" : "#666"}
                    />
                  )}
                />
              }
            />

            {/* Password */}
            <Text style={[authBaseStyles.label, styles.label]}>PASSWORD</Text>

            <TextInput
              mode="outlined"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(""); }}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={passwordFocused ? "#666" : "#555"}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={[
                styles.input,
                { backgroundColor: passwordFocused ? "#ffffff" : "#080808" },
              ]}
              textColor={passwordFocused ? "#000" : "#fff"}
              outlineColor="#222"
              activeOutlineColor={PRIMARY}
              outlineStyle={{ borderRadius: 12 }}
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={passwordFocused ? "#000" : "#666"}
                    />
                  )}
                />
              }
              right={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={passwordFocused ? "#000" : "#666"}
                    />
                  )}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
              labelStyle={{ fontSize: 18 }}
            >
              Sign In →
            </PrimaryButton>

            {/* API error */}
            {!!error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Footer */}
            <Text style={[authBaseStyles.footerText, styles.footerText]}>
              New here?{" "}
              <Text
                style={authBaseStyles.footerLink}
                onPress={() => navigation.navigate("SignUp")}
              >
                Start your journey
              </Text>
            </Text>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  header: {
    marginTop: 25,
    width: "100%",
  },

  cardWrapper: {
    // intentionally empty — AuthCard default handles flex/center alignment
  },

  card: {
    marginTop: 70,
    borderColor: "#1a1a1a",
    padding: 24,
  },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  title: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 22,
    lineHeight: 42,
  },

  subtitle: {
    color: "#8f8f8f",
    fontSize: 15,
    marginTop: 10,
    marginBottom: 25,
    lineHeight: 22,
  },

  googleButton: {
    height: 58,
    borderColor: "#252525",
  },

  divider: {
    marginVertical: 25,
  },

  dividerText: {
    fontSize: 11,
  },

  label: {
    marginTop: 6,
  },

  input: {
    height: 58,
    marginBottom: 14,
  },

  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },

  forgotText: {
    color: PRIMARY,
    fontSize: 13,
  },

  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },

  footerText: {
    marginTop: 25,
    color: "#777",
  },
});
