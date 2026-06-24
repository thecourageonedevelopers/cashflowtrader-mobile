import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export default function SignUpScreen({ navigation }) {
  const { width } = useWindowDimensions();

  const cardWidth = width > 768 ? 420 : width - 24;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
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
            rightText="Sign In →"
            onRightPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "SignIn" }],
              })
            }
            style={styles.header}
            rightTextStyle={styles.rightLink}
          />

          <AuthCard
            cardWidth={cardWidth}
            wrapperStyle={styles.cardWrapper}
            cardStyle={styles.card}
          >
            {/* Badge */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>START FREE</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              Become the trader{"\n"}
              <Text style={{ color: PRIMARY }}>you respect.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Create your account. Onboarding takes under a minute.
            </Text>

            <GoogleButton
              onPress={() => {}}
              style={styles.googleButton}
            />

            <AuthDivider
              style={styles.divider}
              textStyle={styles.dividerText}
            />

            {/* Full Name */}
            <Text style={[authBaseStyles.label, styles.label]}>FULL NAME</Text>

            <TextInput
              mode="outlined"
              value={fullName}
              onChangeText={(v) => { setFullName(v); setError(""); }}
              placeholder="Arjun Mehra"
              placeholderTextColor="#555"
              style={styles.input}
              textColor="#ffffff"
              outlineColor="#222"
              activeOutlineColor={PRIMARY}
              outlineStyle={{ borderRadius: 12 }}
            />

            {/* Email */}
            <Text style={[authBaseStyles.label, styles.label]}>EMAIL</Text>

            <TextInput
              mode="outlined"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(""); }}
              placeholder="you@trader.com"
              placeholderTextColor="#555"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              textColor="#ffffff"
              outlineColor="#222"
              activeOutlineColor={PRIMARY}
              outlineStyle={{ borderRadius: 12 }}
            />

            {/* Password */}
            <Text style={[authBaseStyles.label, styles.label]}>PASSWORD</Text>

            <TextInput
              mode="outlined"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(""); }}
              secureTextEntry={!showPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#555"
              style={styles.input}
              textColor="#ffffff"
              outlineColor="#222"
              activeOutlineColor={PRIMARY}
              outlineStyle={{ borderRadius: 12 }}
              right={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#666"
                    />
                  )}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <PrimaryButton
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.createButton}
              labelStyle={{ fontSize: 17 }}
            >
              Create Account →
            </PrimaryButton>

            {/* API error */}
            {!!error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Footer */}
            <Text style={[authBaseStyles.footerText, styles.footerText]}>
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
    paddingHorizontal: 12,
    paddingBottom: 30,
  },

  header: {
    marginTop: 20,
  },

  rightLink: {
    fontWeight: "500",
  },

  cardWrapper: {
    marginTop: 40,
  },

  card: {
    borderColor: "#181818",
    padding: 22,
  },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 18,
    lineHeight: 38,
  },

  subtitle: {
    color: "#8a8a8a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 25,
  },

  googleButton: {
    height: 56,
    borderColor: "#222",
  },

  divider: {
    marginVertical: 22,
  },

  dividerText: {
    fontSize: 10,
  },

  label: {
    marginTop: 8,
  },

  input: {
    backgroundColor: "#080808",
    marginBottom: 10,
    height: 56,
  },

  createButton: {
    marginTop: 18,
  },

  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },

  footerText: {
    marginTop: 22,
    color: "#888",
  },
});
