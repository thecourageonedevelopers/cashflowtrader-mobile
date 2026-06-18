import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { PRIMARY, authBaseStyles } from "./AuthStyles";

/**
 * Logo row shared by every auth screen.
 * rightText / onRightPress differ per screen (Create account vs Sign In).
 * Pass style to adjust marginTop or width for the screen-specific header.
 * Pass rightTextStyle to adjust fontWeight on the right link.
 */
export default function AuthHeader({
  rightText,
  onRightPress,
  style,
  rightTextStyle,
}) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.logoContainer}>
        <View style={authBaseStyles.logoBox}>
          <Text style={authBaseStyles.logoLetter}>C</Text>
        </View>

        <Text style={authBaseStyles.brandText}>
          Cashflow{" "}
          <Text style={{ color: PRIMARY }}>Trader</Text>
        </Text>
      </View>

      <TouchableOpacity onPress={onRightPress}>
        <Text style={[styles.rightLink, rightTextStyle]}>
          {rightText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  rightLink: {
    color: "#fff",
    fontSize: 13,
  },
});
