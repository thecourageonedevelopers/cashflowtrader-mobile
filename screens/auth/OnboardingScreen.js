import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../src/hooks/useAuth";
import { onboardingApi } from "../../src/api/onboarding";
import { extractApiError } from "../../src/utils/apiError";
import { useAlert } from "../../src/context/AlertContext";

const PRIMARY = "#39FF14";

// ─── Step definitions (mirrors web exactly) ──────────────────────────────────

const STEPS = [
  {
    key: "full_name",
    label: "What's your full name?",
    placeholder: "Arjun Mehra",
    type: "text",
  },
  {
    key: "email",
    label: "What's your email address?",
    placeholder: "you@trader.com",
    type: "email",
  },
  {
    key: "mobile",
    label: "What's your mobile number?",
    placeholder: "+91 9876543210",
    type: "tel",
  },
  {
    key: "trading_experience",
    label: "How long have you been trading?",
    type: "choice",
    options: ["Beginner", "Less than 1 year", "1-3 years", "3+ years"],
  },
  {
    key: "biggest_challenge",
    label: "What is your biggest challenge?",
    type: "choice",
    options: ["Discipline", "Psychology", "Consistency", "Strategy", "Risk Management"],
  },
  {
    key: "monthly_goal",
    label: "What's your monthly income goal from trading?",
    placeholder: "e.g. ₹50,000",
    type: "text",
  },
  {
    key: "trader_persona",
    label: "What kind of trader do you want to become?",
    placeholder: "e.g. Calm swing trader who follows a system",
    type: "textarea",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { showAlert } = useAlert();
  const { user, checkAuth } = useAuth();

  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);

  // Animated progress bar width (0 → 1)
  const progressAnim = useRef(new Animated.Value(1 / STEPS.length)).current;

  // Pre-fill name and email from authenticated user (mirrors web useEffect)
  useEffect(() => {
    if (user) {
      setData((prev) => ({
        ...prev,
        full_name: prev.full_name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  // Animate progress bar on step change
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (stepIdx + 1) / STEPS.length,
      duration: 350,
      useNativeDriver: false, // width is a layout property
    }).start();
  }, [stepIdx]);

  const step = STEPS[stepIdx];
  const value = data[step.key] || "";
  const isLast = stepIdx === STEPS.length - 1;
  const canAdvance = step.type === "choice"
    ? !!value
    : value.trim().length > 0;

  const setField = (val) => setData((prev) => ({ ...prev, [step.key]: val }));

  const handleBack = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const handleNext = async () => {
    if (!canAdvance) return;

    if (!isLast) {
      setStepIdx(stepIdx + 1);
      return;
    }

    // Last step — submit to backend
    setBusy(true);
    try {
      await onboardingApi.submit(data);
      // Refresh user: sets user.onboarded = true, which makes isOnboarded = true
      // in AuthContext. RootNavigator then automatically switches to AppStack.
      await checkAuth();
    } catch (e) {
      showAlert({ type: "error", title: "Couldn't save", message: extractApiError(e) });
      setBusy(false);
    }
    // Note: setBusy(false) is intentionally omitted on success — the component
    // unmounts as soon as checkAuth() flips isOnboarded, so there's no state to reset.
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.root}>
      {/* Progress bar — pinned at the very top */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>C</Text>
              </View>
              <Text style={styles.logoBrand}>
                Cashflow <Text style={styles.logoGreen}>Trader</Text>
              </Text>
            </View>

            <Text style={styles.stepCounter}>
              {String(stepIdx + 1).padStart(2, "0")} / {STEPS.length}
            </Text>
          </View>

          {/* Question card */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* Badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ONBOARDING</Text>
              </View>

              {/* Question */}
              <Text style={styles.question}>{step.label}</Text>

              {/* Input area */}
              <View style={styles.inputArea}>
                {step.type === "choice" ? (
                  <View style={styles.choiceGrid}>
                    {step.options.map((opt) => {
                      const active = value === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          activeOpacity={0.85}
                          style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                          onPress={() => setField(opt)}
                        >
                          <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                            {opt}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark" size={16} color={PRIMARY} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : step.type === "textarea" ? (
                  <TextInput
                    value={value}
                    onChangeText={setField}
                    placeholder={step.placeholder}
                    placeholderTextColor="#444"
                    multiline
                    textAlignVertical="top"
                    style={styles.textarea}
                    autoCorrect={false}
                  />
                ) : (
                  <TextInput
                    value={value}
                    onChangeText={setField}
                    placeholder={step.placeholder}
                    placeholderTextColor="#444"
                    keyboardType={
                      step.type === "email"
                        ? "email-address"
                        : step.type === "tel"
                        ? "phone-pad"
                        : "default"
                    }
                    autoCapitalize={step.type === "email" ? "none" : "words"}
                    autoCorrect={step.type !== "email"}
                    style={styles.textInput}
                    returnKeyType={isLast ? "done" : "next"}
                    onSubmitEditing={canAdvance ? handleNext : undefined}
                  />
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={stepIdx === 0}
              style={[styles.backBtn, stepIdx === 0 && styles.backBtnDisabled]}
            >
              <Ionicons name="arrow-back" size={18} color={stepIdx === 0 ? "#444" : "#aaa"} />
              <Text style={[styles.backText, stepIdx === 0 && styles.backTextDisabled]}>
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={!canAdvance || busy}
              style={[styles.nextBtn, (!canAdvance || busy) && styles.nextBtnDisabled]}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={styles.nextText}>
                    {isLast ? "Complete" : "Next"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
  },

  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  /* Progress bar */

  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },

  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },

  /* Header */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  logoLetter: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },

  logoBrand: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  logoGreen: {
    color: PRIMARY,
  },

  stepCounter: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    fontVariant: ["tabular-nums"],
  },

  /* Card */

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },

  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderRadius: 20,
    padding: 22,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 18,
  },

  badgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  question: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 24,
    letterSpacing: -0.3,
  },

  inputArea: {},

  /* Choice buttons */

  choiceGrid: {
    gap: 10,
  },

  choiceBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  choiceBtnActive: {
    borderColor: "rgba(57,255,20,0.45)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  choiceText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "500",
  },

  choiceTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  /* Text inputs */

  textInput: {
    height: 56,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
  },

  textarea: {
    minHeight: 120,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    color: "#fff",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },

  /* Footer */

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },

  backBtnDisabled: {
    opacity: 0.35,
  },

  backText: {
    color: "#aaa",
    fontSize: 15,
    fontWeight: "600",
  },

  backTextDisabled: {
    color: "#444",
  },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    minWidth: 120,
    justifyContent: "center",
  },

  nextBtnDisabled: {
    opacity: 0.45,
  },

  nextText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "800",
  },
});
