/**
 * DrawerItem — matches web DashboardLayout.jsx NavLink styling exactly.
 *
 * Active:   bg-[#39FF14]/10  text-neon  border border-[#39FF14]/30
 * Inactive: text-white/70    border-transparent
 *
 * No left-bar accent (web doesn't use one).
 */
import React, { memo } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
const NEON = "#39FF14";

export default memo(function DrawerItem({ icon, label, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.item, isActive ? styles.activeItem : styles.inactiveItem]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={icon}
        size={16}
        color={isActive ? NEON : "rgba(255,255,255,0.50)"}
        style={styles.icon}
      />
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // Base — matches web: flex items-center gap-3 px-3 py-2.5 rounded-md text-sm border
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Active — web: bg-[#39FF14]/10 text-neon border border-[#39FF14]/30
  activeItem: {
    backgroundColor: "rgba(57,255,20,0.10)",
    borderColor: "rgba(57,255,20,0.30)",
  },

  // Inactive — web: text-white/70 border-transparent
  inactiveItem: {
    borderColor: "transparent",
  },

  icon: {
    marginRight: 12,
  },

  // Inactive — web: text-white/70 text-sm font-body
  label: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    fontFamily: BODY.regular,
  },

  // Active — web: text-neon
  activeLabel: {
    color: NEON,
    fontFamily: DISPLAY.bold,
  },
});
