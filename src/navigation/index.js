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
    background: "#000000",
    card:       "#0a0a0a",
    border:     "rgba(255,255,255,0.1)",
    primary:    "#39FF14",
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isOnboarded, loading, user } = useAuth();
  // Traders must finish onboarding before dashboard access, but staff/admin bypass this exactly
  // like web (ProtectedRoute.jsx:23 — `!user.is_admin && !user.is_staff && !impersonating`;
  // mobile has no impersonation feature, so only the two role checks apply here).
  const skipOnboarding = !!user?.is_admin || !!user?.is_staff;

  // Holds splash until async token check resolves — prevents auth-screen flash
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME} linking={LINKING_CONFIG}>
      {!isAuthenticated
        ? <AuthStack />
        : (!isOnboarded && !skipOnboarding)
        ? <OnboardingStack />
        : <AppStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});
