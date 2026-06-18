import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenLayout from "../components/common/ScreenLayout";

export default function ProfileScreen({ navigation }) {
  return (
    <ScreenLayout screenName="ProfileScreen" navigation={navigation}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile Screen</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
});
