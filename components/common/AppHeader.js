import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY } from "../../src/theme/typography";

// variant="landing": the web's public challenge-landing header (ChallengeLanding.jsx) — small logo mark, bolder brand
// text, no divider line, and the hamburger in a rounded neon-outlined box. Every other screen keeps the default header.
export default function AppHeader({ onMenuPress, showMenuButton = true, variant }) {
  const landing = variant === "landing";
  return (
    <View style={[styles.header, landing && styles.headerLanding]}>
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/adaptive-icon.png")}
          style={[styles.logo, landing && styles.logoLanding]}
          resizeMode="contain"
        />
        <Text style={[styles.brandText, landing && styles.brandTextLanding]}>
          Cashflow <Text style={{ color: PRIMARY }}>Trader</Text>
        </Text>
      </View>

      {showMenuButton && (
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.menuBtn, landing && styles.menuBtnLanding]}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={20} color={landing ? PRIMARY : "#fff"} />
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

  // ── landing variant ──
  headerLanding: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#000000",
    borderBottomWidth: 0,
  },
  logoLanding: {
    width: 32,
    height: 32,
    borderRadius: 0,
  },
  brandTextLanding: {
    fontFamily: DISPLAY.extraBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  menuBtnLanding: {
    width: 40,
    height: 40,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.45)",
  },
});
