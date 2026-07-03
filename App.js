import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { CABINET_GROTESK_FONTS } from "./src/theme/typography";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/api/queryClient";
import { AuthProvider } from "./src/context/AuthContext";
import { AlertProvider } from "./src/context/AlertContext";
import { NavLoadingProvider } from "./src/context/NavLoadingContext";
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
    ...CABINET_GROTESK_FONTS,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
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
                <NavLoadingProvider>
                  <StatusBar style="light" backgroundColor="#050505" />
                  <RootNavigator />
                </NavLoadingProvider>
              </AlertProvider>
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
