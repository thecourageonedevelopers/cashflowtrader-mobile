import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image, ActivityIndicator, Modal, TextInput,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { challengeApi } from "../../src/api/challenge";

// Web equivalent: ChallengeLanding.jsx
// Rendered by ChallengeScreen when data.unlocked === false.

// Same Vimeo embed web's VslContent.jsx/ChallengeLanding.jsx hardcode — "Paste your real VSL link
// here (YouTube/Vimeo embed URL or an .mp4)." Kept in sync manually with that source of truth.
const VSL_VIDEO_URL = "https://player.vimeo.com/video/1207635619?title=0&byline=0&portrait=0&dnt=1&muted=0";
const VSL_POSTER = require("../../assets/vsl-poster.png");

const BENEFITS = [
  { icon: "stats-chart-outline",      a: "Monthly",       b: "Income"    },
  { icon: "shield-checkmark-outline", a: "Confident",     b: "Decisions" },
  { icon: "happy-outline",            a: "Less Stress",   b: "Trading"   },
  { icon: "aperture-outline",         a: "Proven Daily",  b: "Process"   },
];

// Same-technology WebView embed as SecureVideoPlayer, without the lesson-video watermark/Mux
// path — the VSL is public marketing content, not paid lesson content, matching web's plain
// VideoModal/inline iframe with no watermark.
function VslPlayer({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const html = useMemo(() => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>html,body{margin:0;padding:0;background:#000;width:100%;height:100%;overflow:hidden}</style></head>
    <body><iframe src="${VSL_VIDEO_URL}${VSL_VIDEO_URL.includes("?") ? "&" : "?"}autoplay=1" style="width:100%;height:100%;border:0"
      allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></body></html>`, []);

  return (
    <View style={styles.vslPlayerWrap}>
      <WebView
        source={{ html }}
        style={styles.vslWebview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setErrored(true); setLoading(false); }}
      />
      {loading && !errored && (
        <View style={styles.vslOverlay}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
      {errored && (
        <View style={styles.vslOverlay}>
          <Ionicons name="alert-circle-outline" size={26} color="rgba(255,255,255,0.6)" />
          <Text style={styles.vslErrorText}>Couldn't load the video.</Text>
        </View>
      )}
      <TouchableOpacity onPress={onClose} style={styles.vslCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function ChallengeLanding({ data, onPurchased }) {
  const { user, checkAuth } = useAuth();
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState(false);
  const [playingVsl, setPlayingVsl] = useState(false);

  // Price + coupon — mirrors web Checkout.jsx's checkout-card exactly. Web's own already-purchased
  // dashboard buy flow (Challenge.jsx's pitch-card) never shows a price/coupon UI at all — it's
  // dead code, unreachable behind the never-purchased early-return — so Checkout.jsx (the one
  // *reachable* place web shows a price+coupon combo to an already-authenticated buyer, since it
  // doesn't gate the coupon UI on being a guest) is the real source of truth this ports.
  const [price, setPrice] = useState(null);
  const [showCouponBox, setShowCouponBox] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    let active = true;
    challengeApi.getChallengePrice().then((r) => { if (active) setPrice(r.data); }).catch(() => {});
    return () => { active = false; };
  }, []);

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

  // VSL — plays in a full-screen modal (native equivalent of web's requestFullscreen + inline
  // iframe swap — RN has no direct fullscreen-a-DOM-node API, so the practical equivalent is
  // presenting the same player full-screen instead).
  const watchVsl = () => setPlayingVsl(true);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    try {
      const { data: d } = await challengeApi.validateCoupon(code);
      setAppliedCoupon(d);
      setShowCouponBox(false);
      showAlert({ type: "success", title: "Coupon Applied", message: `Coupon "${d.code}" applied.` });
    } catch (e) {
      setAppliedCoupon(null);
      showAlert({ type: "error", title: "Invalid Coupon", message: e?.response?.data?.detail || "Invalid or expired coupon code." });
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); };

  // Payment / unlock — mirrors web Challenge.jsx handleBuy with react-native-razorpay
  const handleUnlock = async () => {
    setBusy(true);
    try {
      const order = await challengeApi.createOrder(appliedCoupon?.code).then((r) => r.data);

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
      // prefill includes `contact` (user's mobile) matching web's prefill:{name,email,contact}
      // exactly — previously omitted here.
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
          contact: user?.mobile || "",
        },
        theme: { color: "#39FF14" },
      });

      // Verify signature on server. Mirrors web's handler-specific try/catch exactly: web shows
      // the distinct "Payment verification failed" message here (not the generic order/checkout
      // failure message below) when a charge succeeded but the signature check failed.
      try {
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
      } catch {
        showAlert({
          type: "error",
          title: "Payment Failed",
          message: "Payment verification failed",
        });
      }
    } catch (e) {
      // code 0 = user dismissed/cancelled the checkout sheet — mirrors web's
      // modal.ondismiss: () => toast("Payment cancelled"), which does show neutral feedback
      // (previously this branch here returned silently with no feedback at all).
      if (e?.code === 0) {
        showAlert({ type: "info", title: "Payment Cancelled" });
        return;
      }
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

      {/* VSL thumbnail — aspect-video, neon-border, real poster image, tap → watchVsl */}
      <TouchableOpacity
        onPress={watchVsl}
        style={styles.vslThumb}
        activeOpacity={0.9}
      >
        <Image source={VSL_POSTER} style={styles.vslPosterImg} resizeMode="cover" />
        <View style={styles.vslPosterScrim} />
        <View style={styles.playCircle}>
          <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>

      <Modal visible={playingVsl} animationType="fade" onRequestClose={() => setPlayingVsl(false)} supportedOrientations={["portrait", "landscape"]}>
        <VslPlayer onClose={() => setPlayingVsl(false)} />
      </Modal>

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

      {/* Price + coupon — mirrors web Checkout.jsx's checkout-card */}
      {price?.amount != null && (
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>{appliedCoupon ? "You Pay" : "Price"}</Text>
          <Text style={styles.priceValue}>
            {appliedCoupon
              ? `₹${Math.round(appliedCoupon.final_amount / 100).toLocaleString("en-IN")}`
              : `₹${Math.round(price.amount / 100).toLocaleString("en-IN")}`}
          </Text>

          {appliedCoupon ? (
            <View style={styles.couponAppliedBox}>
              <View style={styles.couponBadge}>
                <Ionicons name="pricetag" size={13} color="#000" />
                <Text style={styles.couponBadgeText}>
                  {appliedCoupon.discount_type === "percent" ? `${appliedCoupon.discount_value}%` : `₹${Math.round(appliedCoupon.discount / 100)}`} OFF APPLIED
                </Text>
              </View>
              <Text style={styles.couponCodeText}>{appliedCoupon.code}</Text>
              {appliedCoupon.usage_limit > 0 && (
                <Text style={styles.couponLimitText}>Limited to First {appliedCoupon.usage_limit} Members</Text>
              )}
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={styles.couponRemoveText}>Remove coupon</Text>
              </TouchableOpacity>
            </View>
          ) : showCouponBox ? (
            <View style={styles.couponInputRow}>
              <TextInput
                value={couponInput}
                onChangeText={(v) => setCouponInput(v.toUpperCase())}
                placeholder="Coupon code"
                placeholderTextColor="rgba(255,255,255,0.30)"
                autoCapitalize="characters"
                style={styles.couponInput}
              />
              <TouchableOpacity
                onPress={applyCoupon}
                disabled={couponBusy || !couponInput.trim()}
                style={[styles.couponApplyBtn, (couponBusy || !couponInput.trim()) && { opacity: 0.4 }]}
              >
                {couponBusy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.couponApplyText}>Apply</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowCouponBox(true)}>
              <Text style={styles.couponToggleText}>Have a coupon code?</Text>
            </TouchableOpacity>
          )}

          <View style={styles.priceFeatureRow}>
            <View style={styles.priceFeature}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY} />
              <Text style={styles.priceFeatureText}>One-Time Payment</Text>
            </View>
            <View style={styles.priceFeature}>
              <Ionicons name="flash-outline" size={18} color={PRIMARY} />
              <Text style={styles.priceFeatureText}>Instant Access</Text>
            </View>
          </View>
        </View>
      )}

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
  vslPosterImg: {
    ...StyleSheet.absoluteFillObject,
  },
  vslPosterScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // Fullscreen VSL player modal
  vslPlayerWrap: { flex: 1, backgroundColor: "#000" },
  vslWebview: { flex: 1, backgroundColor: "#000" },
  vslOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  vslErrorText: { color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 13 },
  vslCloseBtn: {
    position: "absolute",
    top: 44,
    right: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  // Price + coupon card — mirrors web Checkout.jsx's checkout-card
  priceCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(10,10,10,0.8)",
    padding: 20,
    marginBottom: 20,
  },
  priceLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: BODY.regular,
    fontSize: 13,
  },
  priceValue: {
    color: PRIMARY,
    fontFamily: DISPLAY.extraBold,
    fontSize: 32,
    marginTop: 2,
  },
  couponAppliedBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.30)",
    padding: 12,
    alignItems: "center",
  },
  couponBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  couponBadgeText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 11,
  },
  couponCodeText: {
    marginTop: 10,
    color: PRIMARY,
    fontFamily: MONO.regular,
    fontWeight: "700",
    fontSize: 13,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(57,255,20,0.40)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  couponLimitText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.50)",
    fontFamily: BODY.regular,
    fontSize: 11,
  },
  couponRemoveText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.30)",
    fontFamily: MONO.regular,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontFamily: MONO.regular,
    fontSize: 13,
  },
  couponApplyBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  couponApplyText: {
    color: "rgba(255,255,255,0.70)",
    fontFamily: MONO.regular,
    fontSize: 11,
    textTransform: "uppercase",
  },
  couponToggleText: {
    marginTop: 14,
    color: "rgba(255,255,255,0.40)",
    fontFamily: MONO.regular,
    fontSize: 11,
    textTransform: "uppercase",
  },
  priceFeatureRow: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  priceFeature: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  priceFeatureText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: BODY.regular,
    fontSize: 11,
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
