import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MONO } from "../../src/theme/typography";

export default function AuthDivider({ style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      <Text style={styles.text}>Or with email</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  text: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: MONO.regular,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginHorizontal: 12,
  },
});
