import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY, authBaseStyles } from "../auth/AuthStyles";

export default function AppHeader({ onMenuPress, showMenuButton = true }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <View style={authBaseStyles.logoBox}>
          <Text style={authBaseStyles.logoLetter}>C</Text>
        </View>

        <Text style={authBaseStyles.brandText}>
          Cashflow <Text style={{ color: PRIMARY }}>Trader</Text>
        </Text>
      </View>

      {showMenuButton && (
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.menuBtn}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#090909",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuBtn: {
    padding: 4,
  },
});
