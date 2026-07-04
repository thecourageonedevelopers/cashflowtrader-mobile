import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../src/hooks/useAuth";
import { onboardingApi } from "../../src/api/onboarding";
import { extractApiError } from "../../src/utils/apiError";
import { useAlert } from "../../src/context/AlertContext";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NEON = "#39FF14";
const BG = "#050505";
const SURFACE = "#0a0a0a";
const BORDER = "rgba(255,255,255,0.10)";

// ─── Currency helpers ─────────────────────────────────────────────────────────
const CUR_SYM = { INR: "₹", USD: "$" };

const RANGES = {
  INR: { min: 0, max: 1000000, step: 10000, markers: [100000, 300000, 500000], def: 300000 },
  USD: { min: 0, max: 10000, step: 100, markers: [1000, 3000, 5000], def: 3000 },
};

// ─── Choice options (mirror web exactly) ──────────────────────────────────────
const PROFESSIONS = [
  { key: "student", label: "Student", icon: "school-outline" },
  { key: "employed", label: "Working Professional", icon: "briefcase-outline" },
  { key: "freelancer", label: "Freelancer", icon: "laptop-outline" },
  { key: "business", label: "Business Owner", icon: "business-outline" },
  { key: "unemployed", label: "Currently Not Working", icon: "close-circle-outline" },
];

const INCOME_BANDS = [
  { key: "zero", label: "No income yet", icon: "close-circle-outline" },
  { key: "below_20k", label: "Below ₹20,000", icon: "wallet-outline" },
  { key: "20k_40k", label: "₹20,000 – ₹40,000", icon: "cash-outline" },
  { key: "40k_70k", label: "₹40,000 – ₹70,000", icon: "cash-outline" },
  { key: "70k_plus", label: "₹70,000+", icon: "cash-outline" },
];

const EXPERIENCE = [
  { key: "below_6m", label: "Below 6 months", icon: "time-outline" },
  { key: "below_1y", label: "Below 1 year", icon: "star-outline" },
  { key: "1_3y", label: "1 – 3 years", icon: "calendar-outline" },
  { key: "above_3y", label: "Above 3 years", icon: "trophy-outline" },
];

// Common country codes for the mobile picker
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+60", flag: "🇲🇾", country: "Malaysia" },
  { code: "+27", flag: "🇿🇦", country: "South Africa" },
];

// ─── Step definitions (mirrors web BASE_STEPS exactly) ────────────────────────
const BASE_STEPS = {
  full_name: {
    key: "full_name", type: "text", cat: "About You", catIcon: "person-outline",
    title: "What should we call you?",
    sub: "Your name helps us personalise your journey.",
    placeholder: "Enter your name",
    helper: "Letters only.",
    inputIcon: "person-outline",
  },
  email: {
    key: "email", type: "email", cat: "About You", catIcon: "person-outline",
    title: "What's your best email?",
    sub: "We'll send your roadmap and important updates.",
    placeholder: "you@email.com",
    note: "We'll only send things worth reading.",
    readonly: true,
    inputIcon: "mail-outline",
  },
  mobile: {
    key: "mobile", type: "mobile", cat: "Secure Account", catIcon: "lock-closed-outline",
    title: "What's your WhatsApp number?",
    sub: "Your login code, live-session reminders, and key updates land here.",
    note: "We'll only message you about things that matter.",
  },
  profession: {
    key: "profession", type: "choice", cat: "Your Profile", catIcon: "person-outline",
    title: "Which best describes you today?",
    sub: "We'll tailor your lessons and roadmap to fit you.",
    options: PROFESSIONS,
  },
  monthly_income: {
    key: "monthly_income", type: "choice", cat: "Your Goals", catIcon: "flag-outline",
    title: "What's your monthly income?",
    sub: "So we can match you with a plan for your current stage.",
    options: INCOME_BANDS,
  },
  trading_experience: {
    key: "trading_experience", type: "choice", cat: "Your Experience", catIcon: "trending-up-outline",
    title: "How long have you been trading?",
    sub: "So we recommend strategies that fit your level.",
    options: EXPERIENCE,
  },
  trading_capital: {
    key: "trading_capital", type: "slider", cat: "Your Capital", catIcon: "shield-checkmark-outline",
    title: "How much capital do you trade with?",
    sub: "This is what we'll help you protect and grow.",
    money: true,
  },
  trading_goal: {
    key: "trading_goal", type: "slider", cat: "Your Goal", catIcon: "flag-outline",
    title: "What's your monthly income goal?",
    sub: "Set the income you're working towards — we'll build your roadmap around it.",
    money: true,
  },
};

const DEFAULT_ORDER = [
  "full_name", "email", "mobile", "profession",
  "monthly_income", "trading_experience", "trading_capital", "trading_goal",
];

// Mirrors web buildSteps() — merges admin-configured questions with base definitions
function buildSteps(formQs) {
  if (!formQs || !formQs.length) return DEFAULT_ORDER.map((k) => BASE_STEPS[k]);
  const steps = [];
  for (const q of formQs) {
    if (q.enabled === false) continue;
    const base = q.field_key && BASE_STEPS[q.field_key];
    if (base) {
      const s = { ...base, title: q.label || base.title, sub: q.sub || base.sub, required: q.required };
      if (base.type === "choice" && Array.isArray(q.options) && q.options.length) {
        const iconByKey = Object.fromEntries((base.options || []).map((o) => [o.key, o.icon]));
        s.options = q.options.map((o) => ({ key: o.key, label: o.label, icon: iconByKey[o.key] || "help-circle-outline" }));
      }
      steps.push(s);
    } else {
      // Custom question from admin Forms manager
      steps.push({
        key: String(q.id), type: "custom", question: q,
        cat: "Tell us more", catIcon: "sparkles-outline",
        title: q.label, sub: q.sub, required: q.required,
      });
    }
  }
  return steps.length ? steps : DEFAULT_ORDER.map((k) => BASE_STEPS[k]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const onlyLetters = (s) => String(s || "").replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ");
const digitsOnly = (s) => String(s || "").replace(/\D/g, "");

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { showAlert } = useAlert();
  const { user, checkAuth } = useAuth();

  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState({
    currency: "INR",
    trading_capital: String(RANGES.INR.def),
    trading_goal: "100000",
  });
  const [mobileErr, setMobileErr] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [formQs, setFormQs] = useState(null);
  const [countryCode, setCountryCode] = useState("+91");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Build step list reactively (null = still loading, [] = loaded empty → use defaults)
  const STEPS = useMemo(() => buildSteps(formQs), [formQs]);

  // ── Hydrate from server + load dynamic questions on mount ──────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      let saved = {};
      try {
        const r = await onboardingApi.getProgress();
        saved = r.data || {};
      } catch { /* ignore — start fresh */ }

      try {
        const fr = await onboardingApi.getFormQuestions();
        if (active) setFormQs(fr.data?.questions || []);
      } catch {
        if (active) setFormQs([]); // fall back to defaults
      }

      if (!active) return;

      const cur = saved.currency || "INR";
      const base = {
        currency: cur,
        full_name: onlyLetters(saved.full_name || user?.name || ""),
        email: saved.email || user?.email || "",
        mobile: digitsOnly(saved.mobile || ""),
        profession: saved.profession || "",
        monthly_income: saved.monthly_income || "",
        trading_experience: saved.trading_experience || "",
        trading_capital: saved.trading_capital || String(RANGES[cur].def),
        trading_goal: saved.trading_goal || (cur === "USD" ? "1000" : "100000"),
      };
      setData(base);

      // Resume from last saved step
      if (saved.last_step != null && !saved.completed) {
        setStepIdx(Math.min((saved.last_step || 0) + 1, DEFAULT_ORDER.length - 1));
        setStarted(true);
      }

      setHydrated(true);
    })();
    return () => { active = false; };
  }, [user]);

  // ── Animate progress bar whenever step changes ─────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: STEPS.length > 0 ? (stepIdx + 1) / STEPS.length : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [stepIdx, STEPS.length]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const cur = data.currency || "INR";
  const sym = CUR_SYM[cur];
  const range = RANGES[cur];
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const value = data[step?.key] ?? "";

  const canAdvance = (() => {
    if (!step) return false;
    if (step.type === "custom") {
      if (!step.required) return true;
      const v = data[step.key];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "" && v !== null;
    }
    if (step.type === "slider") return true;
    if (step.type === "mobile") return digitsOnly(String(value || "")).length >= 8;
    if (step.key === "full_name") return onlyLetters(String(value)).trim().length >= 2;
    if (step.type === "email") return true;
    return String(value).trim().length > 0;
  })();

  const fmtMoney = (n) =>
    `${sym}${Number(n).toLocaleString(cur === "USD" ? "en-US" : "en-IN")}`;

  const setCurrency = (c) => {
    setData((d) => ({
      ...d,
      currency: c,
      trading_capital: String(RANGES[c].def),
      trading_goal: String(c === "USD" ? 1000 : 100000),
    }));
  };

  // ── Fire-and-forget progress save ─────────────────────────────────────────
  const saveProgress = async (idx) => {
    try {
      await onboardingApi.saveProgress({
        step_index: idx,
        step_key: STEPS[idx]?.key || "",
        data,
      });
    } catch { /* non-blocking */ }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = async () => {
    if (!canAdvance) {
      if (step.type === "mobile") setMobileErr("Please enter a valid mobile number.");
      if (step.key === "full_name") setNameErr("Please enter your name (letters only).");
      return;
    }

    if (!isLast) {
      await saveProgress(stepIdx);
      setMobileErr("");
      setNameErr("");
      setStepIdx(stepIdx + 1);
      return;
    }

    // Last step — final submit
    setBusy(true);
    try {
      const customAnswers = {};
      for (const s of STEPS) {
        if (s.type === "custom" && data[s.key] !== undefined && data[s.key] !== "") {
          customAnswers[s.key] = data[s.key];
        }
      }

      await onboardingApi.submit({
        full_name: onlyLetters(data.full_name || "").trim(),
        email: data.email || "",
        mobile: `${countryCode}${digitsOnly(String(data.mobile || ""))}`,
        timezone: detectTimezone(),
        profession: data.profession || "",
        monthly_income: data.monthly_income || "",
        trading_experience: data.trading_experience || "",
        trading_capital: String(data.trading_capital || ""),
        trading_goal: String(data.trading_goal || ""),
        currency: cur,
        answers: customAnswers,
      });

      // checkAuth() flips isOnboarded → RootNavigator auto-switches to AppStack
      await checkAuth();
    } catch (e) {
      showAlert({ type: "error", title: "Couldn't save", message: extractApiError(e) });
      setBusy(false);
    }
  };

  const goBack = () => {
    setMobileErr("");
    setNameErr("");
    setStepIdx(Math.max(0, stepIdx - 1));
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={NEON} size="large" />
      </View>
    );
  }

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.flex}>
          <ScrollView
            contentContainerStyle={s.welcomeScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand header */}
            <View style={s.logoRow}>
              <Image source={require("../../assets/adaptive-icon.png")} style={s.logoImg} resizeMode="contain" />
              <Text style={s.logoBrand}>
                Cashflow <Text style={s.logoGreen}>Trader</Text>
              </Text>
            </View>

            {/* Main card */}
            <View style={s.card}>
              {/* Shield icon box */}
              <View style={s.welcomeIconBox}>
                <Ionicons name="shield-checkmark-outline" size={28} color={NEON} />
              </View>

              {/* Headline */}
              <Text style={s.welcomeHeading}>
                {"Let's build your "}
                <Text style={s.neonText}>trading edge.</Text>
              </Text>
              <Text style={s.welcomeSub}>
                A few quick questions to personalise your experience and fast-track your transformation.
              </Text>

              {/* Feature rows */}
              <View style={s.featureList}>
                {[
                  { icon: "flash-outline", title: "Personalised for you", desc: "We tailor everything to your goals and experience." },
                  { icon: "time-outline", title: "Takes under 60 seconds", desc: "Answer a few quick questions and you're in." },
                  { icon: "rocket-outline", title: "Unlock your dashboard", desc: "Get your custom plan, tools, and roadmap." },
                ].map((f) => (
                  <View key={f.title} style={s.featureRow}>
                    <View style={s.featureIconBox}>
                      <Ionicons name={f.icon} size={20} color={NEON} />
                    </View>
                    <View style={s.featureText}>
                      <Text style={s.featureTitle}>{f.title}</Text>
                      <Text style={s.featureDesc}>{f.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity style={s.neonBtn} onPress={() => setStarted(true)} activeOpacity={0.85}>
                <Text style={s.neonBtnText}>Let's get started</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>

              {/* Privacy note */}
              <View style={s.privacyRow}>
                <Ionicons name="lock-closed" size={12} color="rgba(57,255,20,0.6)" />
                <Text style={s.privacyText}>100% private. Your information is never shared.</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Step screens ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.flex}>
        <KeyboardAvoidingView
          style={s.flex}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {/* Header: brand logo row above; progress bar + back + counter below (mirrors web) */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Image source={require("../../assets/adaptive-icon.png")} style={s.logoImg} resizeMode="contain" />
              <Text style={s.logoBrand}>
                Cashflow <Text style={s.logoGreen}>Trader</Text>
              </Text>
            </View>
            <View style={s.progressRow}>
              <TouchableOpacity
                onPress={goBack}
                disabled={stepIdx === 0}
                style={[s.backIconBtn, stepIdx === 0 && s.backIconBtnDisabled]}
              >
                <Ionicons name="arrow-back" size={18} color={stepIdx === 0 ? "#333" : "#888"} />
              </TouchableOpacity>
              <View style={s.progressTrack}>
                <Animated.View style={[s.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={s.stepCounter}>{stepIdx + 1}/{STEPS.length}</Text>
            </View>
          </View>

          {/* Scrollable question card */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              {/* ── Badge row: category + optional currency toggle ── */}
              <View style={s.badgeRow}>
                <View style={s.badge}>
                  <Ionicons name={step?.catIcon || "help-circle-outline"} size={11} color="rgba(57,255,20,0.8)" />
                  <Text style={s.badgeText}>{(step?.cat || "ONBOARDING").toUpperCase()}</Text>
                </View>

                {step?.money && (
                  <View style={s.currencyToggle}>
                    {Object.keys(CUR_SYM).map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCurrency(c)}
                        style={[s.currencyBtn, cur === c && s.currencyBtnActive]}
                      >
                        <Text style={[s.currencyBtnText, cur === c && s.currencyBtnTextActive]}>
                          {CUR_SYM[c]} {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* ── Question title ── */}
              <Text style={s.question}>{step?.title}</Text>

              {/* ── Sub-text ── */}
              {step?.sub && <Text style={s.subText}>{step.sub}</Text>}

              {/* ── Note with check icon ── */}
              {step?.note && (
                <View style={s.noteRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="rgba(57,255,20,0.6)" />
                  <Text style={s.noteText}>{step.note}</Text>
                </View>
              )}

              {/* ── Input area ── */}
              <View style={s.inputArea}>

                {/* CHOICE */}
                {step?.type === "choice" && (
                  <View style={s.choiceGrid}>
                    {(step.options || []).map((opt) => {
                      const active = value === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          activeOpacity={0.85}
                          style={[s.choiceBtn, active && s.choiceBtnActive]}
                          onPress={() => setData({ ...data, [step.key]: opt.key })}
                        >
                          <View style={s.choiceBtnInner}>
                            {opt.icon && (
                              <Ionicons
                                name={opt.icon}
                                size={18}
                                color={active ? NEON : "rgba(255,255,255,0.4)"}
                              />
                            )}
                            <Text style={[s.choiceText, active && s.choiceTextActive]}>
                              {opt.label}
                            </Text>
                          </View>
                          {active && <Ionicons name="checkmark" size={16} color={NEON} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* SLIDER */}
                {step?.type === "slider" && (
                  <View>
                    {/* Large formatted value */}
                    <View style={s.sliderValueBox}>
                      <Text style={s.sliderValue}>
                        {fmtMoney(data[step.key] || range.min)}
                      </Text>
                      <Text style={s.sliderLabel}>
                        {step.key === "trading_goal"
                          ? "Target monthly income"
                          : "Trading capital"} · {cur}
                      </Text>
                    </View>

                    {/* Drag slider */}
                    <Slider
                      style={s.slider}
                      minimumValue={range.min}
                      maximumValue={range.max}
                      step={range.step}
                      value={Math.min(Number(data[step.key] || range.min), range.max)}
                      onValueChange={(v) =>
                        setData({ ...data, [step.key]: String(Math.round(v)) })
                      }
                      minimumTrackTintColor={NEON}
                      maximumTrackTintColor="rgba(255,255,255,0.1)"
                      thumbTintColor={NEON}
                    />

                    {/* Range labels */}
                    <View style={s.sliderRange}>
                      <Text style={s.sliderRangeText}>{fmtMoney(range.min)}</Text>
                      <Text style={s.sliderRangeText}>{fmtMoney(range.max)}</Text>
                    </View>

                    {/* Quick-select marker buttons */}
                    <View style={s.markerGrid}>
                      {range.markers.map((m) => {
                        const on = String(data[step.key]) === String(m);
                        return (
                          <TouchableOpacity
                            key={m}
                            onPress={() => setData({ ...data, [step.key]: String(m) })}
                            style={[s.markerBtn, on && s.markerBtnActive]}
                            activeOpacity={0.8}
                          >
                            <Text style={[s.markerText, on && s.markerTextActive]}>
                              {fmtMoney(m)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* MOBILE — country code picker + digit input */}
                {step?.type === "mobile" && (
                  <View>
                    <View style={s.phoneRow}>
                      <TouchableOpacity
                        style={s.countryCodeBtn}
                        onPress={() => setShowCountryPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.countryCodeText}>{countryCode}</Text>
                        <Ionicons name="chevron-down" size={12} color="#888" />
                      </TouchableOpacity>
                      <TextInput
                        style={s.phoneInput}
                        value={String(value || "")}
                        onChangeText={(v) => {
                          setData({ ...data, mobile: digitsOnly(v) });
                          setMobileErr("");
                        }}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#444"
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        maxLength={15}
                      />
                    </View>
                    {mobileErr ? <Text style={s.errText}>{mobileErr}</Text> : null}
                  </View>
                )}

                {/* TEXT / EMAIL */}
                {(step?.type === "text" || step?.type === "email") && (
                  <View>
                    <View style={[s.inputBox, step.readonly && s.inputBoxReadonly]}>
                      {step.inputIcon && (
                        <Ionicons
                          name={step.inputIcon}
                          size={18}
                          color={NEON}
                          style={s.inputPrefixIcon}
                        />
                      )}
                      <TextInput
                        style={[s.textInput, step.readonly && s.textInputReadonly]}
                        value={String(value || "")}
                        editable={!step.readonly}
                        onChangeText={(v) => {
                          const val = step.key === "full_name" ? onlyLetters(v) : v;
                          setData({ ...data, [step.key]: val });
                          if (step.key === "full_name") setNameErr("");
                        }}
                        placeholder={step.placeholder || ""}
                        placeholderTextColor="#444"
                        keyboardType={step.type === "email" ? "email-address" : "default"}
                        autoCapitalize={step.type === "email" ? "none" : "words"}
                        autoCorrect={step.type !== "email"}
                        returnKeyType={isLast ? "done" : "next"}
                        onSubmitEditing={canAdvance ? goNext : undefined}
                      />
                    </View>
                    {step.helper && !step.readonly && (
                      <Text style={s.helperText}>{step.helper}</Text>
                    )}
                    {nameErr ? <Text style={s.errText}>{nameErr}</Text> : null}
                  </View>
                )}

                {/* CUSTOM — dynamic admin-configured questions */}
                {step?.type === "custom" && (() => {
                  const q = step.question;
                  const qType = q?.type;
                  const curVal = data[step.key];

                  if (qType === "multiple_choice") {
                    const selected = Array.isArray(curVal) ? curVal : [];
                    return (
                      <View style={s.choiceGrid}>
                        {(q.options || []).map((opt) => {
                          const optKey = opt.key || opt;
                          const optLabel = opt.label || opt;
                          const active = selected.includes(optKey);
                          return (
                            <TouchableOpacity
                              key={optKey}
                              style={[s.choiceBtn, active && s.choiceBtnActive]}
                              onPress={() => {
                                const next = active
                                  ? selected.filter((v) => v !== optKey)
                                  : [...selected, optKey];
                                setData({ ...data, [step.key]: next });
                              }}
                            >
                              <Text style={[s.choiceText, active && s.choiceTextActive]}>
                                {optLabel}
                              </Text>
                              {active && <Ionicons name="checkmark" size={16} color={NEON} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  }

                  if (qType === "dropdown") {
                    return (
                      <View style={s.choiceGrid}>
                        {(q.options || []).map((opt) => {
                          const optKey = opt.key || opt;
                          const optLabel = opt.label || opt;
                          const active = curVal === optKey;
                          return (
                            <TouchableOpacity
                              key={optKey}
                              style={[s.choiceBtn, active && s.choiceBtnActive]}
                              onPress={() => setData({ ...data, [step.key]: optKey })}
                            >
                              <Text style={[s.choiceText, active && s.choiceTextActive]}>
                                {optLabel}
                              </Text>
                              {active && <Ionicons name="checkmark" size={16} color={NEON} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  }

                  if (qType === "long_text") {
                    return (
                      <TextInput
                        value={String(curVal || "")}
                        onChangeText={(v) => setData({ ...data, [step.key]: v })}
                        placeholder={q.placeholder || "Your answer..."}
                        placeholderTextColor="#444"
                        multiline
                        textAlignVertical="top"
                        style={s.textarea}
                      />
                    );
                  }

                  return (
                    <TextInput
                      value={String(curVal || "")}
                      onChangeText={(v) => setData({ ...data, [step.key]: v })}
                      placeholder={q?.placeholder || "Your answer..."}
                      placeholderTextColor="#444"
                      style={s.textInput}
                      returnKeyType={isLast ? "done" : "next"}
                      onSubmitEditing={canAdvance ? goNext : undefined}
                    />
                  );
                })()}
              </View>

              {/* ── Continue / Complete CTA — inside the card ── */}
              <TouchableOpacity
                style={[s.neonBtn, (!canAdvance || busy) && s.neonBtnDisabled]}
                onPress={goNext}
                disabled={!canAdvance || busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Text style={s.neonBtnText}>
                      {isLast ? "Complete" : "Continue"}
                    </Text>
                    <Ionicons
                      name={isLast ? "checkmark" : "arrow-forward"}
                      size={18}
                      color="#000"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Privacy note below card */}
            <View style={s.privacyRowBottom}>
              <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.25)" />
              <Text style={s.privacyTextBottom}>
                Private &amp; used only to personalise your plan.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Country code picker modal ── */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          onPress={() => setShowCountryPicker(false)}
          activeOpacity={1}
        >
          <View style={s.countrySheet}>
            <View style={s.countrySheetHandle} />
            <Text style={s.countrySheetTitle}>Select country code</Text>
            {COUNTRY_CODES.map((c) => {
              const active = countryCode === c.code && c.country.startsWith(
                COUNTRY_CODES.find((x) => x.code === countryCode)?.country.split(" ")[0] || ""
              );
              return (
                <TouchableOpacity
                  key={c.country}
                  style={[s.countryRow, countryCode === c.code && s.countryRowActive]}
                  onPress={() => {
                    setCountryCode(c.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={s.countryFlag}>{c.flag}</Text>
                  <Text style={s.countryName}>{c.country}</Text>
                  <Text style={s.countryCodeVal}>{c.code}</Text>
                  {countryCode === c.code && (
                    <Ionicons name="checkmark" size={16} color={NEON} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },

  // ── Progress bar — now inline inside header progressRow (matches web) ──
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: NEON,
    borderRadius: 999,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  backIconBtnDisabled: { opacity: 0.25 },
  stepCounter: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: MONO.regular,
    fontSize: 11,
    minWidth: 32,
    textAlign: "right",
  },

  // ── Logo / brand ──
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logoBrand: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 16 },
  logoGreen: { color: NEON },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  welcomeScroll: { padding: 20, paddingBottom: 40 },

  // ── Card ──
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 22,
  },

  // ── Badge row ──
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },
  badgeText: {
    color: NEON,
    fontFamily: MONO.regular,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },

  // ── Currency toggle ──
  currencyToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  currencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currencyBtnActive: {
    backgroundColor: NEON,
  },
  currencyBtnText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  currencyBtnTextActive: {
    color: "#000",
    fontWeight: "800",
  },

  // ── Question ──
  question: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  noteText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: BODY.regular,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  // ── Input area ──
  inputArea: { marginTop: 20 },

  // ── Choice buttons ──
  choiceGrid: { gap: 10 },
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
    backgroundColor: "rgba(57,255,20,0.07)",
    shadowColor: NEON,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  choiceBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  choiceText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: BODY.medium,
    fontSize: 15,
  },
  choiceTextActive: {
    color: "#fff",
    fontFamily: BODY.semiBold,
  },

  // ── Slider ──
  sliderValueBox: {
    alignItems: "center",
    marginBottom: 8,
  },
  sliderValue: {
    color: NEON,
    fontFamily: MONO.bold,
    fontSize: 40,
    letterSpacing: -1,
  },
  sliderLabel: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  slider: {
    width: "100%",
    height: 40,
    marginTop: 8,
  },
  sliderRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderRangeText: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  markerGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  markerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  markerBtnActive: {
    borderColor: "rgba(57,255,20,0.5)",
    backgroundColor: "rgba(57,255,20,0.06)",
  },
  markerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  markerTextActive: {
    color: NEON,
    fontWeight: "700",
  },

  // ── Mobile / phone input ──
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countryCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  countryCodeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  phoneInput: {
    flex: 1,
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

  // ── Text / email input ──
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  inputBoxReadonly: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "rgba(255,255,255,0.06)",
  },
  inputPrefixIcon: {
    paddingLeft: 14,
    paddingRight: 6,
  },
  textInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: 14,
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
  },
  textInputReadonly: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
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
    lineHeight: 22,
    textAlignVertical: "top",
  },

  // ── Helper / error text ──
  helperText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 6,
  },
  errText: {
    color: "#F87171",
    fontSize: 12,
    marginTop: 6,
  },

  // ── Neon CTA button ──
  neonBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: NEON,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: NEON,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  neonBtnDisabled: {
    opacity: 0.45,
  },
  neonBtnText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 16,
    letterSpacing: 0.2,
  },

  // ── Privacy rows ──
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    justifyContent: "center",
  },
  privacyText: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: BODY.regular,
    fontSize: 11,
  },
  privacyRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    justifyContent: "center",
  },
  privacyTextBottom: {
    color: "rgba(255,255,255,0.28)",
    fontSize: 11,
  },

  // ── Welcome screen ──
  welcomeIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.28)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeHeading: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  neonText: { color: NEON },
  welcomeSub: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  featureList: { gap: 16, marginBottom: 28 },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.22)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: {
    color: "#fff",
    fontFamily: DISPLAY.bold,
    fontSize: 15,
    marginBottom: 3,
  },
  featureDesc: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: BODY.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Country picker modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  countrySheet: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  countrySheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginBottom: 16,
  },
  countrySheetTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    gap: 12,
  },
  countryRowActive: {
    backgroundColor: "rgba(57,255,20,0.04)",
  },
  countryFlag: { fontSize: 22 },
  countryName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  countryCodeVal: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginRight: 4,
  },
});
