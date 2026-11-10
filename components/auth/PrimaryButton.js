import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from "react-native";
import { PRIMARY } from "./AuthStyles";
import { DISPLAY } from "../../src/theme/typography";

// The neon call-to-action used by Sign In, Sign Up, Forgot Password and Create Password.
//
//  - The label is ALWAYS rendered. While `loading`, a spinner is shown beside it (optionally with a different
//    `loadingLabel`, e.g. "Signing in…") instead of replacing it, so a slow or hung request never leaves a blank button.
//  - Enabled: black label on neon green (contrast ≈ 12.6:1).
//  - Loading: same neon button, slightly dimmed, spinner + label — clearly "working".
//  - Disabled (not loading): a muted dark button with a faint green outline and a light-grey label — clearly "off",
//    and the label stays readable (a plain opacity drop would have faded black text on dim green).
//  - The label is a fixed single line that shrinks (never wraps or clips) for long text / large system font sizes,
//    with Android's extra font padding removed so it sits optically centred in the button.
export default function PrimaryButton({
  children,
  onPress,
  style,
  labelStyle,
  loading = false,
  disabled = false,
  loadingLabel,
}) {
  const inactive = loading || disabled;
  const muted = disabled && !loading;
  const text = loading && loadingLabel ? loadingLabel : children;

  return (
    <TouchableOpacity
      style={[s.btn, loading && s.btnLoading, muted && s.btnMuted, style]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      <View style={s.row}>
        {loading && <ActivityIndicator size="small" color="#000" />}
        <Text
          style={[s.label, muted && s.labelMuted, labelStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.2}
        >
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  btnLoading: { opacity: 0.85 },
  btnMuted: {
    backgroundColor: "#1d2a1a",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    maxWidth: "100%",
  },
  label: {
    flexShrink: 1,
    color: "#000",
    // Cabinet Grotesk ships 400/500/700/800 only (no 600). The label was Bold (700); ExtraBold (800) is the next step
    // up and the weight the app already uses for headings. Custom font files carry their own weight, so no separate weight style is set.
    fontFamily: DISPLAY.extraBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  labelMuted: { color: "rgba(255,255,255,0.5)" },
});
