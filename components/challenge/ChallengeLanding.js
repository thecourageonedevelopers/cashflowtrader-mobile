import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { PRIMARY } from "../auth/AuthStyles";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { challengeApi } from "../../src/api/challenge";

// Web equivalent: ChallengeLanding.jsx
// Rendered by ChallengeScreen when data.unlocked === false.

const BENEFITS = [
  { icon: "stats-chart-outline",      a: "Monthly",       b: "Income"    },
  { icon: "shield-checkmark-outline", a: "Confident",     b: "Decisions" },
  { icon: "happy-outline",            a: "Less Stress",   b: "Trading"   },
  { icon: "aperture-outline",         a: "Proven Daily",  b: "Process"   },
];

export default function ChallengeLanding({ data, onPurchased }) {
  const { checkAuth } = useAuth();
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);

  // Pulsing badge dot (matches web `animate-pulse`)
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // VSL — open in browser (native equivalent of the iframe VideoModal)
  const watchVsl = async () => {
    showAlert({
      type: "info",
      title: "Coming Soon",
      message: "The 4-minute introduction video will be available here shortly.",
    });
  };

  // Payment / unlock — mirrors web ChallengeLanding handleUnlock
  const handleUnlock = async () => {
    setBusy(true);
    try {
      const order = await challengeApi.createOrder().then((r) => r.data);
      if (order.mock) {
        await challengeApi.verifyPayment(
          order.order_id,
          `pay_mock_${Date.now()}`,
          "mock_signature"
        );
        showAlert({
          type: "success",
          title: "Challenge Unlocked",
          message: "Payment successful (test mode). Challenge unlocked.",
        });
        await checkAuth();
        onPurchased?.();
        return;
      }
      if (order.checkout_url) {
        await WebBrowser.openBrowserAsync(order.checkout_url);
        await checkAuth();
        onPurchased?.();
      } else {
        showAlert({
          type: "info",
          title: "Complete Purchase",
          message: "Visit cashflowtrader.in to complete your purchase, then return to the app.",
        });
      }
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error",
        message: e?.response?.data?.detail || "Could not start payment",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Badge — "21-Day Trading Transformation" with pulsing neon dot */}
      <View style={styles.badgeWrap}>
        <Animated.View style={[styles.badgeDot, { opacity: pulseAnim }]} />
        <Text style={styles.badgeText}>21-Day Trading Transformation</Text>
      </View>

      {/* Hero h1 — matches web text-[6.4vw] sm:text-6xl */}
      <Text style={styles.heroH1}>
        {"To Become A "}
        <Text style={styles.neonText}>Profitable Trader</Text>
      </Text>

      {/* Hero p — matches web text-[4vw] sm:text-4xl */}
      <Text style={styles.heroP}>
        {"Take Action Now – "}
        <Text style={styles.neonText}>Start Your 21 Days Challenge</Text>
      </Text>

      {/* Sub headline */}
      <Text style={styles.heroSub}>
        Build more confidence. Trade with more clarity. Create consistent monthly income.
      </Text>

      {/* Benefits — 2×2 grid (web is grid-cols-4 gap-2, mobile maps to 2×2) */}
      <View style={styles.benefitsGrid}>
        {BENEFITS.map(({ icon, a, b }, i) => (
          <View key={i} style={styles.benefitCard}>
            <Ionicons name={icon} size={28} color={PRIMARY} strokeWidth={1.75} />
            <Text style={styles.benefitText}>{a}{"\n"}{b}</Text>
          </View>
        ))}
      </View>

      {/* VSL thumbnail — aspect-video, neon-border, tap → watchVsl */}
      <TouchableOpacity
        onPress={watchVsl}
        style={styles.vslThumb}
        activeOpacity={0.9}
      >
        <View style={styles.playCircle}>
          <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>

      {/* Primary CTA — "Watch The 4-Minute Introduction" */}
      <TouchableOpacity onPress={watchVsl} style={styles.primaryCta} activeOpacity={0.9}>
        <View style={styles.playIconCircle}>
          <Ionicons name="play" size={16} color={PRIMARY} style={{ marginLeft: 2 }} />
        </View>
        <Text style={styles.primaryCtaText}>Watch The 4-Minute Introduction</Text>
      </TouchableOpacity>

      {/* Lock microcopy */}
      <View style={styles.microcopyRow}>
        <Ionicons name="lock-closed" size={15} color={`${PRIMARY}cc`} />
        <Text style={styles.microcopyText}>Unlock Day One After Watching</Text>
      </View>

      {/* Footer CTA — payment unlock */}
      <TouchableOpacity
        onPress={handleUnlock}
        disabled={busy}
        style={styles.footerCta}
        activeOpacity={0.7}
      >
        <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.45)" />
        <Text style={styles.footerCtaText}>
          {busy ? "Processing…" : "Your transformation starts with one decision."}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#050505" },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 56,
    alignItems: "stretch",
  },

  // Badge
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.75)",
    backgroundColor: "rgba(57,255,20,0.08)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#39FF14",
  },
  badgeText: {
    color: "#39FF14",
    fontFamily: "Inter_700Bold",
    fontSize: 9.5,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },

  // Hero
  heroH1: {
    fontFamily: "Inter_900Black",
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.5,
    color: "#fff",
    marginBottom: 6,
  },
  heroP: {
    fontFamily: "Inter_900Black",
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: "#fff",
    marginBottom: 12,
  },
  neonText: { color: "#39FF14" },
  heroSub: {
    color: "rgba(255,255,255,0.50)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },

  // Benefits grid — 2×2 on mobile
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  benefitCard: {
    width: "47.5%",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.35)",
    backgroundColor: "rgba(57,255,20,0.04)",
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  benefitText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },

  // VSL thumbnail — 16:9, neon border, play button
  vslThumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.50)",
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#39FF14",
    justifyContent: "center",
    alignItems: "center",
  },

  // Primary CTA — neon bg, black text, play icon in black circle
  primaryCta: {
    width: "100%",
    backgroundColor: "#39FF14",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    marginBottom: 16,
  },
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryCtaText: {
    color: "#000",
    fontFamily: "Inter_900Black",
    fontSize: 15,
    letterSpacing: 0.2,
  },

  // Lock microcopy
  microcopyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginBottom: 28,
  },
  microcopyText: {
    color: "rgba(255,255,255,0.60)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  // Footer CTA — subtle, triggers payment
  footerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  footerCtaText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
});
