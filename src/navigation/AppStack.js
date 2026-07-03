import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppTabs from "../../navigation/AppTabs";
import TradeDetailScreen from "../../screens/TradeDetailScreen";
import JournalNewScreen from "../../screens/JournalNewScreen";
import { APP_ROUTES } from "../constants/routes";
import { useNavLoading } from "../context/NavLoadingContext";

// import AiCoachScreen from "../../screens/AiCoachScreen"; // TODO: build standalone AI coach

const Stack = createNativeStackNavigator();
const DARK_BG = { backgroundColor: "#050505" };

export default function AppStack() {
  const { loading } = useNavLoading();
  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: DARK_BG }}
      >
        {/* Main tab layout */}
        <Stack.Screen
          name={APP_ROUTES.MAIN}
          component={AppTabs}
          options={{ animation: "none" }}
        />

        {/* Trade detail — push screen (web equivalent: TradeDetailModal) */}
        <Stack.Screen
          name={APP_ROUTES.TRADE_DETAIL}
          component={TradeDetailScreen}
          options={{ animation: "slide_from_right" }}
        />

        {/* New trade form */}
        <Stack.Screen
          name={APP_ROUTES.JOURNAL_NEW}
          component={JournalNewScreen}
          options={{ animation: "slide_from_right" }}
        />
      </Stack.Navigator>

      {/* Fullscreen navigation overlay — shown from drawer tap until destination
          screen gains focus. Gives immediate feedback and prevents re-taps. */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color="#39FF14" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
});
