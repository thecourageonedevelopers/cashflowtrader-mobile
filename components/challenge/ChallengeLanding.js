import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image, ActivityIndicator, Modal, TextInput,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY, BADGE } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { challengeApi } from "../../src/api/challenge";
import { APP_ROUTES } from "../../src/constants/routes";
import { hasAccepted } from "../../src/utils/consent";
import ConsentCheckbox from "../legal/ConsentCheckbox";
import {
  VSL_VIDEO_URL, VSL_BASE_URL, muxPlaybackId, buildVslHtml, parseVslMessage, vslErrorMessage,
} from "../../src/utils/vsl";

// Web equivalent: ChallengeLanding.jsx
// Rendered by ChallengeScreen when data.unlocked === false.

const VSL_POSTER = require("../../assets/vsl-poster.png");

// Same four cards, in the same order, as web ChallengeLanding.jsx (lucide Crosshair / ShieldCheck / Smile / TrendingUp).
const BENEFITS = [
  { icon: "locate-outline",           a: "Clear",       b: "Strategy"     },
  { icon: "shield-checkmark-outline", a: "Consistent",  b: "Results"      },
  { icon: "happy-outline",            a: "Less Stress", b: "More Freedom" },
  { icon: "trending-up-outline",      a: "Steady",      b: "Income"       },
];

// VSL player — the portal plays this video with <mux-player playback-id="..."> (VslContent.jsx). RN cannot
// host an iframe/custom element natively, so the same Mux player runs inside a WebView (the technique
// SecureVideoPlayer.js uses for lesson videos). Mux's player provides play/pause, 10 s seek buttons,
// progress bar with time/duration, buffering state and fullscreen; this wrapper adds the loading /
// error / retry states and the close control. The previous Vimeo URL was a different video than the
// portal's and never started.
function VslPlayer({ onClose }) {
  const playbackId = useMemo(() => muxPlaybackId(VSL_VIDEO_URL), []);
  const html = useMemo(() => (playbackId ? buildVslHtml(playbackId) : null), [playbackId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(playbackId ? null : "The video isn't available right now.");
  const [attempt, setAttempt] = useState(0);

  const retry = () => { setError(null); setLoading(true); setAttempt((n) => n + 1); };
  const onMessage = (e) => {
    const m = parseVslMessage(e.nativeEvent.data);
    if (!m) return;
    if (m.type === "ready") { setLoading(false); setError(null); }
    else { setLoading(false); setError(vslErrorMessage(m.reason)); }
  };

  return (
    <View style={styles.vslPlayerWrap}>
      {html && !error && (
        <WebView
          key={attempt}
          source={{ html, baseUrl: VSL_BASE_URL }}
          style={styles.vslWebview}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          onMessage={onMessage}
          onError={() => { setLoading(false); setError(vslErrorMessage("script")); }}
          onHttpError={() => { setLoading(false); setError(vslErrorMessage("script")); }}
        />
      )}
      {loading && !error && (
        <View style={[styles.vslOverlay, { pointerEvents: "none" }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
      {!!error && (
        <View style={styles.vslOverlay}>
          <Ionicons name="alert-circle-outline" size={26} color="rgba(255,255,255,0.6)" />
          <Text style={styles.vslErrorText}>{error}</Text>
          <TouchableOpacity onPress={retry} style={styles.vslRetryBtn}>
            <Text style={styles.vslRetryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity onPress={onClose} style={styles.vslCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// The poster is drawn at an EXPLICIT pixel size computed from the measured box (contain-fit by hand,
// centred) instead of relying on flex/absolute-fill sizing + resizeMode. The installed APK showed the
// bundled 1536x1024 PNG at roughly 3x scale cropped to a corner; giving the native Image exact
// dimensions (and resizeMethod="resize" so Android decodes it at that size) removes any dependence on
// density-bucket scaling of the bundled drawable.
const POSTER_SRC = Image.resolveAssetSource(VSL_POSTER);
const POSTER_RATIO = POSTER_SRC?.width && POSTER_SRC?.height ? POSTER_SRC.width / POSTER_SRC.height : 3 / 2;

function VslPoster({ onPress }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  let img = null;
  if (box.w > 0 && box.h > 0) {
    const boxRatio = box.w / box.h;
    const w = boxRatio > POSTER_RATIO ? box.h * POSTER_RATIO : box.w;
    const h = boxRatio > POSTER_RATIO ? box.h : box.w / POSTER_RATIO;
    img = { width: w, height: h, left: (box.w - w) / 2, top: (box.h - h) / 2 };
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.vslThumb}
      activeOpacity={0.9}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }));
      }}
    >
      {img && (
        <Image
          source={VSL_POSTER}
          style={[styles.vslPosterImg, img]}
          resizeMode="contain"
          resizeMethod="resize"
        />
      )}
    </TouchableOpacity>
  );
}

export default function ChallengeLanding({ data, onPurchased }) {
  const { user, checkAuth } = useAuth();
  const { showAlert } = useAlert();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  // Terms & Conditions consent — never pre-checked, never bypassed (see handleUnlock and challengeApi.createOrder).
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [consentAttempt, setConsentAttempt] = useState(0); // bumped when "Join" is tapped without consent → the warning shakes
  const openTerms = () => navigation.navigate(APP_ROUTES.LEGAL, { slug: "terms" });
  // web: headline text-[6.4vw], sub-headline text-[4vw] below the sm breakpoint (kept on one line)
  const h1Size = Math.min(Math.round(width * 0.064), 44);
  const pSize = Math.min(Math.round(width * 0.04), 28);
  // Synchronous re-entry guard: state updates are async, so two quick taps could both pass `disabled={busy}`
  // and create two Razorpay orders.
  const inFlight = useRef(false);
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
    if (inFlight.current) return;
    // Mandatory consent: without it nothing proceeds (the warning under the button is already showing; make it shake).
    if (!hasAccepted(agreedToTerms)) {
      setConsentAttempt((n) => n + 1);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const order = await challengeApi.createOrder(appliedCoupon?.code, agreedToTerms).then((r) => r.data);

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
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Badge — "21-Day Trading Transformation" with pulsing neon dot */}
      <View style={styles.badgeWrap}>
        <Animated.View style={[styles.badgeDot, { opacity: pulseAnim }]} />
        <Text style={styles.badgeText}>21-Day Trading Transformation</Text>
      </View>

      {/* Hero headline — web: centred, text-[6.4vw], font-black, one line */}
      <Text
        style={[styles.heroH1, { fontSize: h1Size, lineHeight: Math.round(h1Size * 1.0), letterSpacing: -0.035 * h1Size }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {"To Become A "}
        <Text style={styles.neonText}>Profitable Trader</Text>
      </Text>

      {/* Sub-headline — web: text-[4vw], font-black, one line */}
      <Text
        style={[styles.heroP, { fontSize: pSize, lineHeight: Math.round(pSize * 1.05), letterSpacing: -0.025 * pSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {"Take Action Now – "}
        <Text style={styles.neonText}>Start Your 21 Days Challenge</Text>
      </Text>

      {/* Supporting sub-headline */}
      <Text style={styles.heroSub}>
        21 days to more confidence, clarity, and consistent monthly income from the markets.
      </Text>

      {/* Benefits — 4 columns in one row (web grid-cols-4 gap-2) */}
      <View style={styles.benefitsGrid}>
        {BENEFITS.map(({ icon, a: la, b: lb }, i) => (
          <View key={i} style={styles.benefitCard} testID={`benefit-${i}`}>
            <Ionicons name={icon} size={28} color={PRIMARY} />
            <Text style={styles.benefitText}>{la}{"\n"}{lb}</Text>
          </View>
        ))}
      </View>

      {/* VSL thumbnail — portal ChallengeLanding.jsx: aspect-video box, neon border, black bg, poster
          object-contain object-center; the play ring is part of the poster artwork itself. Tap → watchVsl. */}
      <VslPoster onPress={watchVsl} />

      <Modal visible={playingVsl} animationType="fade" onRequestClose={() => setPlayingVsl(false)} supportedOrientations={["portrait", "landscape"]}>
        <VslPlayer onClose={() => setPlayingVsl(false)} />
      </Modal>

      {/* Primary CTA — the page's payment trigger (web: "Join 21 Days Challenge" + trophy). Stays tappable while
          consent is missing so the tap can explain itself (the warning below shakes); it just never proceeds. */}
      <TouchableOpacity
        onPress={handleUnlock}
        disabled={busy}
        style={[styles.joinCta, busy && { opacity: 0.6 }]}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Join 21 Days Challenge"
        accessibilityState={{ disabled: busy, busy }}
        testID="join-challenge-cta"
      >
        <View style={styles.trophyCircle}>
          {busy ? <ActivityIndicator size="small" color={PRIMARY} /> : <Ionicons name="trophy-outline" size={22} color={PRIMARY} />}
        </View>
        <View style={styles.joinTextCol}>
          <Text style={styles.joinTitle}>{busy ? "Processing…" : "Join 21 Days Challenge"}</Text>
          {!busy && <Text style={styles.joinSub}>Transform Your Trading. Transform Your Life.</Text>}
        </View>
      </TouchableOpacity>

      {/* Mandatory Terms & Conditions consent (unchecked by default; warning while unchecked) */}
      <View style={styles.consentWrap}>
        <ConsentCheckbox
          checked={agreedToTerms}
          onChange={setAgreedToTerms}
          onOpenTerms={openTerms}
          attempt={consentAttempt}
          testID="landing-consent"
        />
      </View>

      {/* Price + coupon — mirrors web Checkout.jsx's checkout-card (mobile keeps showing the price before payment) */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#000000" },
  content: {
    paddingHorizontal: 12, // web: px-3
    paddingTop: 4,
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
    color: "#fff",
    textAlign: "center",
    marginTop: 0,
    marginBottom: 4,
  },
  // Hero P — web: text-[4vw]=15px@375px, leading-[0.98]=14.7px, tracking-[-0.025em]
  heroP: {
    fontFamily: DISPLAY.extraBold,
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  neonText: { color: "#39FF14" },
  // Sub — web: text-[12.5px], leading-snug, mt-3=12px above, mt-7=28px below
  heroSub: {
    alignSelf: "center",
    maxWidth: 304, // web: max-w-[19rem]
    color: "rgba(255,255,255,0.50)",
    fontFamily: BODY.regular,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 28,
  },

  // Benefits grid — web: grid-cols-4 gap-2 (4 cards in ONE row), mt-7=28px below
  benefitsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  // Each card: flex:1 so 4 fill the row equally; web py-4=16px px-1=4px rounded-2xl
  benefitCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16, // web: rounded-2xl
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.35)",
    backgroundColor: "rgba(57,255,20,0.04)",
    paddingVertical: 16,
    paddingHorizontal: 2,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  // web: text-[10.5px] leading-tight font-bold
  // web: font-display font-bold text-[10.5px] leading-tight (Cabinet Grotesk, not mono)
  benefitText: {
    color: "#fff",
    fontFamily: DISPLAY.bold,
    fontSize: 10.5,
    textAlign: "center",
    lineHeight: 13,
  },

  // VSL thumbnail — web: mt-7=28px above, rounded-2xl; mt-6=24px below.
  // aspectRatio is the poster's own (assets/vsl-poster.png is 1536x1024 = 3:2) so resizeMode="contain"
  // shows the WHOLE image with no crop and no letterbox bars. The old 16:9 box + "cover" cut ~16% off
  // the top/bottom. Keep this in step with the image if the poster file is ever replaced.
  vslThumb: {
    width: "100%",
    aspectRatio: 16 / 9, // portal: aspect-video
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.50)",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  vslPosterImg: {
    position: "absolute",
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
  vslErrorText: { color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  vslRetryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(57,255,20,0.6)" },
  vslRetryText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 14 },
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

  // Primary CTA — web: w-full mt-6 px-4 py-4 rounded-2xl bg-neon, trophy in a black w-11 circle, Anton title + subtitle
  joinCta: {
    width: "100%",
    backgroundColor: "#39FF14",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  joinTextCol: { flexShrink: 1, alignItems: "flex-start" },
  // web: font-badge text-2xl uppercase (Anton)
  joinTitle: {
    color: "#000",
    fontFamily: BADGE.regular,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  // web: font-badge text-xs tracking-wide text-black/70 uppercase
  joinSub: {
    color: "rgba(0,0,0,0.7)",
    fontFamily: BADGE.regular,
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  consentWrap: { alignItems: "center", marginBottom: 24 },
});
