// Dynamic Expo config — takes precedence over app.json when both exist.
// Read environment variables via process.env.EXPO_PUBLIC_* at build time.
export default {
  expo: {
    name: "cashflowtrader",
    slug: "cashflowtrader",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: false,

    // Deep link URL scheme — required for OAuth callback
    scheme: "cashflowtrader",

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#050505",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cashflowuniversity.cashflowtrader",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.cashflowuniversity.cashflowtrader",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "cashflowtrader",
              host: "auth",
              pathPrefix: "/callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    plugins: [
      "expo-font",
      "expo-web-browser"
    ],

    extra: {
      // Expose API URL for expo-constants access (fallback for bare workflow)
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "059d4356-dc60-408a-8bad-102d81581325",
      },
    },
  },
};
