import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
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
  const { user, checkAuth } = useAuth();
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

  // Payment / unlock — mirrors web Challenge.jsx handleBuy with react-native-razorpay
  const handleUnlock = async () => {
    setBusy(true);
    try {
      const order = await challengeApi.createOrder().then((r) => r.data);

      // Mock mode (test/dev environment) — skip checkout, verify directly
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

      // Real Razorpay native checkout (mirrors web new Razorpay({...}).open())
      const paymentData = await RazorpayCheckout.open({
        name: "Cashflow Trader",
        description: "21-Day Discipline Challenge",
        order_id: order.order_id,
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: { color: "#39FF14" },
      });

      // Verify signature on server (mirrors web handler: async (res) => { api.post("/payments/verify", ...) })
      await challengeApi.verifyPayment(
        paymentData.razorpay_order_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature
      );
      showAlert({
        type: "success",
        title: "Challenge Unlocked",
        message: "Challenge unlocked. Let's go.",
      });
      await checkAuth();
      onPurchased?.();
    } catch (e) {
      // code 0 = user dismissed / cancelled — no error toast needed (mirrors web modal.ondismiss)
      if (e?.code === 0) return;
      showAlert({
        type: "error",
        title: "Payment Failed",
        message: e?.response?.data?.detail || e?.description || "Could not start payment",
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

      {/* Benefits — 4 columns in one row (matches web grid-cols-4 gap-2) */}
      <View style={styles.benefitsGrid}>
        {BENEFITS.map(({ icon, a, b }, i) => (
          <View key={i} style={styles.benefitCard}>
            <Ionicons name={icon} size={22} color={PRIMARY} />
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

  // Badge — web: px-3.5 py-1.5, tracking-[0.16em]×9.5px=1.52, mt-4 below
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
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#39FF14",
  },
  badgeText: {
    color: "#39FF14",
    fontFamily: MONO.regular,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Hero H1 — web: text-[6.4vw]=24px@375px, leading-[0.95]=22.8px, tracking-[-0.035em]
  heroH1: {
    fontFamily: DISPLAY.extraBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.8,
    color: "#fff",
    marginBottom: 4,
  },
  // Hero P — web: text-[4vw]=15px@375px, leading-[0.98]=14.7px, tracking-[-0.025em]
  heroP: {
    fontFamily: DISPLAY.extraBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.4,
    color: "#fff",
    marginBottom: 12,
  },
  neonText: { color: "#39FF14" },
  // Sub — web: text-[12.5px], leading-snug, mt-3=12px above, mt-7=28px below
  heroSub: {
    color: "rgba(255,255,255,0.50)",
    fontFamily: BODY.regular,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 28,
  },

  // Benefits grid — web: grid-cols-4 gap-2 (4 cards in ONE row), mt-7=28px below
  benefitsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 28,
  },
  // Each card: flex:1 so 4 fill the row equally; web py-4=16px px-1=4px rounded-2xl
  benefitCard: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.35)",
    backgroundColor: "rgba(57,255,20,0.04)",
    paddingVertical: 14,
    paddingHorizontal: 4,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  // web: text-[10.5px] leading-tight font-bold
  benefitText: {
    color: "#fff",
    fontFamily: MONO.regular,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },

  // VSL thumbnail — web: mt-7=28px above, aspect-video rounded-2xl; mt-6=24px below
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
    marginBottom: 24,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#39FF14",
    justifyContent: "center",
    alignItems: "center",
  },

  // Primary CTA — web: py-5=20px, text-base=16px, rounded-2xl, gap-2.5=10px, mt-4=16px below
  primaryCta: {
    width: "100%",
    backgroundColor: "#39FF14",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    marginBottom: 16,
  },
  // web: w-9 h-9 = 36px circle
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  // web: text-base=16px font-black
  primaryCtaText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 16,
    letterSpacing: 0.1,
  },

  // Lock microcopy — web: text-base=16px, mt-4=16px above, mt-7=28px below
  microcopyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginBottom: 28,
  },
  microcopyText: {
    color: "rgba(255,255,255,0.60)",
    fontFamily: BODY.regular,
    fontSize: 15,
  },

  // Footer CTA — web: text-sm=14px, gap-2=8px
  footerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  footerCtaText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: BODY.regular,
    fontSize: 14,
  },
});
