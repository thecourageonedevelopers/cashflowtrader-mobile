import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { PRIMARY } from "./AuthStyles";
import { DISPLAY } from "../../src/theme/typography";

export default function PrimaryButton({
  children,
  onPress,
  style,
  labelStyle,
  loading = false,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      style={[s.btn, (loading || disabled) && s.btnDisabled, style]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text style={[s.label, labelStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  label: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 15,
  },
});
