import React from "react";
import { View, StyleSheet } from "react-native";

export default function AuthCard({
  children,
  cardWidth,
  wrapperStyle,
  cardStyle,
}) {
  return (
    <View style={[styles.cardWrapper, wrapperStyle]}>
      <View style={[styles.card, { width: cardWidth }, cardStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#090909",
    borderRadius: 22,
    borderWidth: 1,
  },
});
