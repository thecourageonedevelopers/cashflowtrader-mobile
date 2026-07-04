/**
 * WelcomeTour — RN port of web src/components/WelcomeTour.jsx
 *
 * Shown once after onboarding completes (user.onboarded && !user.tour_completed).
 * Five feature slides with slide animation and progress dots, matching the web
 * modal exactly: same steps, same Skip / Next / Get started buttons, same colours,
 * same POST /profile/tour-complete call on finish.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { profileApi } from "../../src/api/profile";
import { useAuth } from "../../src/hooks/useAuth";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";

const NEON = "#39FF14";

// Mirrors web WelcomeTour.jsx STEPS exactly (Ionicons replacements for Lucide)
const STEPS = [
  {
    icon: "grid-outline",
    title: "Your Dashboard",
    body: "Your command center. Track your streak, discipline score, and today's mission at a glance — every time you log in.",
  },
  {
    icon: "person-circle-outline",
    title: "Your Profile",
    body: "Set your profile photo, goals, and trader identity. Tap your avatar on the dashboard to make it yours.",
  },
  {
    icon: "calendar-outline",
    title: "21-Day Challenge",
    body: "A guided, day-by-day path to build consistent, disciplined trading habits that stick.",
  },
  {
    icon: "create-outline",
    title: "Auto Trading Journal",
    body: "Log a full trading day in seconds — upload a broker screenshot and the AI does the typing for you.",
  },
  {
    icon: "radio-outline",
    title: "Live Sessions",
    body: "Join live mentorship and trade alongside the community. Never trade alone again.",
  },
];

export default function WelcomeTour({ visible }) {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Slide-in animation — mirrors web AnimatePresence x: 14 → 0 on each step
  const slideX = useRef(new Animated.Value(0)).current;
  const prevIdxRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setOpen(true);
      setStepIdx(0);
      slideX.setValue(0);
      prevIdxRef.current = 0;
    } else {
      setOpen(false);
    }
  }, [visible]);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const animateToStep = (nextIdx) => {
    const dir = nextIdx > prevIdxRef.current ? 1 : -1;
    slideX.setValue(dir * 14);
    Animated.timing(slideX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    prevIdxRef.current = nextIdx;
    setStepIdx(nextIdx);
  };

  // Mirror web finish(): close first (instant feedback), then API + setUser
  const finish = async () => {
    setOpen(false);
    try {
      const { data } = await profileApi.tourComplete();
      setUser?.(data);
    } catch {
      // Local fallback so tour doesn't reopen this session
      setUser?.({ ...user, tour_completed: true });
    }
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={finish}
    >
      {/* Backdrop — fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm */}
      <View style={s.backdrop}>
        {/* Sheet — w-full max-w-md rounded-2xl border border-[#39FF14]/30 bg-[#0a0a0a] */}
        <View style={s.sheet}>
          {/* Ambient glow — absolute -top-24 -right-16 w-64 h-64 rounded-full bg-neon/10 */}
          <View style={s.glowTopRight} pointerEvents="none" />

          {/* X close — absolute top-4 right-4 */}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={finish}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          {/* Counter — font-mono text-[10px] tracking-[0.24em] uppercase text-neon */}
          <Text style={s.counter}>Quick tour · {stepIdx + 1} of {STEPS.length}</Text>

          {/* Animated slide — mirrors web AnimatePresence opacity+x slide */}
          <Animated.View style={{ transform: [{ translateX: slideX }] }}>
            {/* Icon box — w-14 h-14 rounded-2xl bg-neon/12 border border-neon/30 */}
            <View style={s.iconBox}>
              <Ionicons name={step.icon} size={28} color={NEON} />
            </View>

            {/* Title — font-display font-black text-2xl tracking-tight */}
            <Text style={s.title}>{step.title}</Text>

            {/* Body — text-white/65 font-body text-sm leading-relaxed */}
            <Text style={s.body}>{step.body}</Text>
          </Animated.View>

          {/* Progress dots — h-1.5 rounded-full; active = w-6 bg-neon, inactive = w-1.5 bg-white/20 */}
          <View style={s.dotsRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === stepIdx ? s.dotActive : s.dotInactive]} />
            ))}
          </View>

          {/* Button row — skip left, next/finish right */}
          <View style={s.btnRow}>
            <TouchableOpacity onPress={finish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>

            {isLast ? (
              <TouchableOpacity style={s.nextBtn} onPress={finish} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>Get started</Text>
                <Ionicons name="checkmark" size={16} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.nextBtn}
                onPress={() => animateToStep(stepIdx + 1)}
                activeOpacity={0.85}
              >
                <Text style={s.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Backdrop — bg-black/80 covers everything
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Sheet — rounded-2xl border border-[#39FF14]/30 bg-[#0a0a0a] shadow
  sheet: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    padding: 24,
    paddingTop: 22,
    overflow: "hidden",
    shadowColor: NEON,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },

  // Glow — absolute top-right circle
  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(57,255,20,0.09)",
  },

  // Close button
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },

  // Counter — font-mono text-[10px] tracking-[0.24em] uppercase text-neon
  counter: {
    color: NEON,
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginBottom: 20,
  },

  // Icon box — w-14 h-14 rounded-2xl bg-neon/12 border border-neon/30
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(57,255,20,0.10)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  // Title — font-display font-black text-2xl tracking-tight text-white
  title: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 10,
  },

  // Body — text-white/65 font-body text-sm leading-relaxed
  body: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 21,
  },

  // Progress dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 28,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: NEON,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  // Button row
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Skip text
  skipText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: BODY.regular,
    fontSize: 14,
  },

  // Next / Get started — neon-btn px-5 py-3 rounded-xl
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: NEON,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: NEON,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  nextBtnText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 14,
  },
});
