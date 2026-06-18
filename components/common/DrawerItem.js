import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";

export default function DrawerItem({ icon, label, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.item, isActive && styles.activeItem]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {isActive && <View style={styles.activeBorder} />}

      <Ionicons
        name={icon}
        size={20}
        color={isActive ? PRIMARY : "#888"}
        style={styles.icon}
      />

      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 1,
    borderRadius: 10,
  },

  activeItem: {
    backgroundColor: "rgba(57, 255, 20, 0.07)",
  },

  activeBorder: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },

  icon: {
    marginRight: 14,
  },

  label: {
    color: "#999",
    fontSize: 15,
    fontWeight: "500",
  },

  activeLabel: {
    color: "#fff",
    fontWeight: "700",
  },
});
