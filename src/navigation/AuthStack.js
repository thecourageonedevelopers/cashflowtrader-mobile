import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "../../screens/auth/SignInScreen";
import SignUpScreen from "../../screens/auth/SignUpScreen";
import { AUTH_ROUTES } from "../constants/routes";

// Screens not yet built are imported lazily as placeholders — remove comments
// and add imports when each screen is implemented.
// import OnboardingScreen  from "../../screens/auth/OnboardingScreen";
// import AuthCallbackScreen from "../../screens/auth/AuthCallbackScreen";

const Stack = createNativeStackNavigator();
const DARK_BG = { backgroundColor: "#050505" };

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: DARK_BG }}
    >
      <Stack.Screen name={AUTH_ROUTES.SIGN_IN} component={SignInScreen} />
      <Stack.Screen name={AUTH_ROUTES.SIGN_UP} component={SignUpScreen} />

      {/* Uncomment when screens are built: */}
      {/* <Stack.Screen name={AUTH_ROUTES.AUTH_CALLBACK} component={AuthCallbackScreen} /> */}
      {/* <Stack.Screen name={AUTH_ROUTES.ONBOARDING}    component={OnboardingScreen}   /> */}
    </Stack.Navigator>
  );
}
