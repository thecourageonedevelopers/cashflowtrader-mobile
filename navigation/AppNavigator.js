import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import AppTabs      from "./AppTabs";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#000000",
    card: "#0a0a0a",
    border: "rgba(255,255,255,0.1)",
    primary: "#39FF14",
  },
};

const Stack = createNativeStackNavigator();
const DARK_BG = { backgroundColor: "#000000" };

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme} style={DARK_BG}>
      <Stack.Navigator
        initialRouteName="App"
        screenOptions={{ headerShown: false, contentStyle: DARK_BG }}
      >
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ contentStyle: DARK_BG }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ contentStyle: DARK_BG }} />
        <Stack.Screen name="App"    component={AppTabs}     options={{ animation: "none", contentStyle: DARK_BG }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
