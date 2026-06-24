import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppTabs from "../../navigation/AppTabs";
import TradeDetailScreen from "../../screens/TradeDetailScreen";
import JournalNewScreen from "../../screens/JournalNewScreen";
import { APP_ROUTES } from "../constants/routes";

// import AiCoachScreen from "../../screens/AiCoachScreen"; // TODO: build standalone AI coach

const Stack = createNativeStackNavigator();
const DARK_BG = { backgroundColor: "#050505" };

export default function AppStack() {
  return (
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
  );
}
