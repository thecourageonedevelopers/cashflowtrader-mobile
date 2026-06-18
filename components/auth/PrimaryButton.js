import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { PRIMARY } from "./AuthStyles";

/**
 * Green primary action button (Paper Button) shared by every auth screen.
 * style — override marginTop and other container differences per screen.
 * labelStyle — override fontSize (SignIn: 18, SignUp: 17) per screen.
 * contentStyle — override height if needed (default 58).
 */
export default function PrimaryButton({
  children,
  onPress,
  style,
  labelStyle,
  contentStyle,
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
