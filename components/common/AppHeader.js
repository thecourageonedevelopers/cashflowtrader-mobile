import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY } from "../../src/theme/typography";

export default function AppHeader({ onMenuPress, showMenuButton = true }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/adaptive-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>
          Cashflow <Text style={{ color: PRIMARY }}>Trader</Text>
        </Text>
      </View>

      {showMenuButton && (
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.menuBtn}
        >
          <Ionicons name="menu" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },

  brandText: {
    color: "#fff",
    fontFamily: DISPLAY.bold,
    fontSize: 18,
  },

  menuBtn: {
    padding: 8,
  },
});
