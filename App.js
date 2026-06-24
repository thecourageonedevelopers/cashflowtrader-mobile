import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/api/queryClient";
import { AuthProvider } from "./src/context/AuthContext";
import { AlertProvider } from "./src/context/AlertContext";
import RootNavigator from "./src/navigation";

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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    // GestureHandlerRootView is required at the root for react-native-gesture-handler
    // and @gorhom/bottom-sheet (used in future screens).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <AuthProvider>
              <AlertProvider>
                <StatusBar style="light" backgroundColor="#050505" />
                <RootNavigator />
              </AlertProvider>
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
