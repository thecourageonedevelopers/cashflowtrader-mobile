/**
 * GenericProgramUnlock — RN port of the GenericProgramUnlock() function inside web
 * src/pages/dashboard/Challenge.jsx.
 *
 * "Buy to unlock" screen for any program other than the legacy 21-Day Challenge (which has its own
 * dedicated VSL landing, ChallengeLanding.js). Shown instead of that Challenge-branded hero — its
 * copy ("21 days that decide your future", etc.) is specific to the Challenge and would be actively
 * misleading for a Mentorship Program or any future course.
 */
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { challengeApi } from "../../src/api/challenge";

export default function GenericProgramUnlock({ data, programId, onPurchased }) {
  const { user, checkAuth } = useAuth();
  const { showAlert } = useAlert();
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    challengeApi.getProgramPrice(programId).then(({ data: d }) => { if (active) setPrice(d); }).catch(() => {});
    return () => { active = false; };
  }, [programId]);

  const dayCount = data.lessons?.length || 0;
  const rupees = price?.amount_paise != null ? Math.round(price.amount_paise / 100) : null;

  const handleBuy = async () => {
    setBusy(true);
    try {
      const order = await challengeApi.createProgramOrder(programId).then((r) => r.data);

      if (order.mock) {
        await challengeApi.verifyProgramOrder(programId, order.order_id, `pay_mock_${Date.now()}`, "mock_signature");
        showAlert({ type: "success", title: "Unlocked", message: "Payment successful (test mode)." });
        await checkAuth();
        onPurchased?.();
        return;
      }

      const paymentData = await RazorpayCheckout.open({
        name: "Cashflow Trader",
        description: data.program_name || programId,
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

      try {
        await challengeApi.verifyProgramOrder(
          programId,
          paymentData.razorpay_order_id,
          paymentData.razorpay_payment_id,
          paymentData.razorpay_signature
        );
        showAlert({ type: "success", title: "Unlocked", message: "Unlocked. Let's go." });
        await checkAuth();
        onPurchased?.();
      } catch {
        showAlert({ type: "error", title: "Payment Failed", message: "Payment verification failed" });
      }
    } catch (e) {
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
    <View style={s.wrap}>
      <View style={s.card}>
        <Ionicons name="book-outline" size={36} color={PRIMARY} style={{ marginBottom: 12 }} />
        <Text style={s.title}>{data.program_name || programId}</Text>
        {!!data.program_description && <Text style={s.desc}>{data.program_description}</Text>}
        {dayCount > 0 && <Text style={s.dayCount}>{dayCount} day{dayCount === 1 ? "" : "s"}</Text>}
        <TouchableOpacity
          style={[s.buyBtn, (busy || price?.configured === false) && s.buyBtnDisabled]}
          onPress={handleBuy}
          disabled={busy || price?.configured === false}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={s.buyBtnText}>
              {price?.configured === false ? "Price not set yet" : rupees != null ? `Unlock for ₹${rupees.toLocaleString("en-IN")}` : "Unlock"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    backgroundColor: "rgba(10,10,10,0.8)",
    padding: 28,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 24,
    textAlign: "center",
  },
  desc: {
    color: "rgba(255,255,255,0.60)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },
  dayCount: {
    color: "rgba(255,255,255,0.40)",
    fontFamily: MONO.regular,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  buyBtn: {
    width: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 16,
  },
});
