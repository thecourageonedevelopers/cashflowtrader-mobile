import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingScreen from "../../screens/auth/OnboardingScreen";

const Stack = createNativeStackNavigator();
const DARK_BG = { backgroundColor: "#050505" };

export default function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: DARK_BG }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
