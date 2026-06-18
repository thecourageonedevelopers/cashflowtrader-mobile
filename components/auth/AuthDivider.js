import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * "OR WITH EMAIL" divider shared by every auth screen.
 * style — override marginVertical (SignIn: 25, SignUp: 22).
 * textStyle — override fontSize (SignIn: 11, SignUp: 10).
 */
export default function AuthDivider({ style, textStyle }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      <Text style={[styles.text, textStyle]}>OR WITH EMAIL</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#252525",
  },

  text: {
    color: "#666",
    fontSize: 11,
    letterSpacing: 2,
    marginHorizontal: 10,
  },
});
