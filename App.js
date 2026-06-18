import React from "react";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./navigation/AppNavigator";

const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#22c55e",
    background: "#050505",
    surface: "#0a0a0a",
    onSurface: "#ffffff",
    onSurfaceVariant: "#aaaaaa",
    outline: "#333333",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
