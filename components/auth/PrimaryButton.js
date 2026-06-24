import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { PRIMARY } from "./AuthStyles";

export default function PrimaryButton({
  children,
  onPress,
  style,
  labelStyle,
  contentStyle,
  loading = false,
  disabled = false,
}) {
  return (
    <Button
      mode="contained"
      buttonColor={PRIMARY}
      textColor="#000"
      style={[styles.button, style]}
      contentStyle={[styles.content, contentStyle]}
      labelStyle={[styles.label, labelStyle]}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
  },

  content: {
    height: 58,
  },

  label: {
    fontWeight: "800",
    fontSize: 18,
  },
});
