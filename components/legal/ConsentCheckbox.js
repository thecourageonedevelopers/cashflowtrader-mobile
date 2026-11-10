import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { BODY } from "../../src/theme/typography";
import { CONSENT_WARNING } from "../../src/utils/consent";

// Web equivalent: src/components/legal/ConsentCheckbox.jsx (cashflowtrader-user-portal).
//
// Mandatory, UNCHECKED-by-default Terms & Conditions checkbox for every payment-collecting screen. While it is
// unchecked the amber warning is shown (exactly like the web); it disappears the moment the box is ticked.
// "Terms & Conditions" is a link: it opens the full document and never toggles the checkbox.
//
//   checked / onChange   controlled value (parent owns it, so the parent can also gate its pay button on it)
//   onOpenTerms          opens the existing Terms screen
//   attempt              bump this number when the buyer taps pay without accepting: the warning shakes
export default function ConsentCheckbox({ checked, onChange, onOpenTerms, attempt = 0, testID = "consent" }) {
  // gentle continuous pulse on the warning (the web uses `animate-pulse`)
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (checked) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.72, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [checked, pulse]);

  // a blocked "Join" tap draws the eye to the warning
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!attempt) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [attempt, shake]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => onChange(!checked)}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          aria-checked={checked}
          accessibilityLabel="I agree to the Terms and Conditions"
          testID={`${testID}-checkbox`}
          style={[styles.box, checked && styles.boxChecked]}
        >
          {checked && <Ionicons name="checkmark" size={15} color="#000" />}
        </TouchableOpacity>
        <Text style={styles.label}>
          <Text onPress={() => onChange(!checked)}>I agree to the </Text>
          <Text
            onPress={onOpenTerms}
            accessibilityRole="link"
            accessibilityLabel="Read the Terms and Conditions"
            testID={`${testID}-terms-link`}
            style={styles.link}
          >
            Terms & Conditions
          </Text>
        </Text>
      </View>

      {!checked && (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-warning`}
          style={[styles.warning, { opacity: pulse, transform: [{ translateX: shake }] }]}
        >
          <Ionicons name="warning" size={18} color="#fbbf24" />
          <Text style={styles.warningText}>{CONSENT_WARNING}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const AMBER = "#fbbf24";

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 16, width: "100%" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },

  // web: w-5 h-5 rounded border-2 border-neon bg-black/60, glow shadow, checked:bg-neon
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  boxChecked: { backgroundColor: PRIMARY },

  // web: font-body text-white/90 text-sm
  label: { color: "rgba(255,255,255,0.9)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20 },
  link: { color: PRIMARY, textDecorationLine: "underline" },

  // web: px-4 py-2.5 rounded-xl border border-amber-400 bg-amber-400/15 text-amber-200 text-sm font-semibold
  warning: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AMBER,
    backgroundColor: "rgba(251,191,36,0.15)",
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  warningText: {
    flexShrink: 1,
    color: "#fde68a",
    fontFamily: BODY.semiBold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
