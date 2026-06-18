import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * "Continue with Google" button shared by every auth screen.
 * height / borderColor differ slightly between SignIn (58, #252525) and
 * SignUp (56, #222) — pass style to override only those values.
 */
export default function GoogleButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
    >
      <Ionicons name="logo-google" size={20} color="#ffffff" />
      <Text style={styles.text}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderWidth: 1,
    borderColor: "#252525",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
