import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppTabs from "../../navigation/AppTabs";
import TradeDetailScreen from "../../screens/TradeDetailScreen";
import JournalNewScreen from "../../screens/JournalNewScreen";
import OneClickAnalysisScreen from "../../screens/OneClickAnalysisScreen";
import TradePlanScreen from "../../screens/TradePlanScreen";
import ChartAnalyzeScreen from "../../screens/ChartAnalyzeScreen";
import CreatePasswordScreen from "../../screens/auth/CreatePasswordScreen";
import ChangeContactScreen from "../../screens/ChangeContactScreen";
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

        {/* One-Click Analysis — web equivalent: src/pages/dashboard/OneClickAnalysis.jsx */}
        <Stack.Screen
          name={APP_ROUTES.ONE_CLICK_ANALYSIS}
          component={OneClickAnalysisScreen}
          options={{ animation: "slide_from_right" }}
        />

        {/* Trade Plan — web equivalent: src/pages/dashboard/TradePlan.jsx */}
        <Stack.Screen
          name={APP_ROUTES.TRADE_PLAN}
          component={TradePlanScreen}
          options={{ animation: "slide_from_right" }}
        />

        {/* Chart Analysis — web equivalent: ChartAnalyzePanel.jsx + IntradayFlow.jsx */}
        <Stack.Screen
          name={APP_ROUTES.CHART_ANALYZE}
          component={ChartAnalyzeScreen}
          options={{ animation: "slide_from_right" }}
        />

        {/* Create Password (social-only accounts) — web equivalent: PasswordFlowModal.jsx mode="create" */}
        <Stack.Screen
          name={APP_ROUTES.CREATE_PASSWORD}
          component={CreatePasswordScreen}
          options={{ animation: "slide_from_bottom", presentation: "modal" }}
        />

        {/* Change Email / Change Mobile — web equivalent: ChangeContactModal.jsx */}
        <Stack.Screen
          name={APP_ROUTES.CHANGE_CONTACT}
          component={ChangeContactScreen}
          options={{ animation: "slide_from_bottom", presentation: "modal" }}
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
