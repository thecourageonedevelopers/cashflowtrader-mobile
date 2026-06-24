import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { LINKING_CONFIG } from "../constants/linking";
import AuthStack from "./AuthStack";
import OnboardingStack from "./OnboardingStack";
import AppStack from "./AppStack";

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#050505",
    card:       "#0a0a0a",
    border:     "#1b1b1b",
    primary:    "#22c55e",
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();

  // Holds splash until async token check resolves — prevents auth-screen flash
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME} linking={LINKING_CONFIG}>
      {!isAuthenticated
        ? <AuthStack />
        : !isOnboarded
        ? <OnboardingStack />
        : <AppStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },
});
