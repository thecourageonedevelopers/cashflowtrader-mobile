// Dynamic Expo config — takes precedence over app.json when both exist.
// Read environment variables via process.env.EXPO_PUBLIC_* at build time.
export default {
  expo: {
    name: "Cashflow Trader", // launcher label; the slug below must stay "cashflowtrader" (EAS project key)
    slug: "cashflowtrader",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: false,

    // Deep link URL scheme — required for OAuth callback
    scheme: "cashflowtrader",

    splash: {
      image: "./assets/splash-logo.png", // padded copy of the neon shield (Android 12 masks the splash icon to a circle)
      resizeMode: "contain",
      backgroundColor: "#000000",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cashflowuniversity.cashflowtrader",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-foreground.png", // 1024px, shield inside the 66dp safe zone
        backgroundColor: "#000000",
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
        // Google sign-in (expo-auth-session) redirects an Android OAuth client to
        // "<applicationId>:/oauthredirect". Expo only registers app.config `scheme`, never the package
        // name, so without this the Custom Tab cannot hand control back to the app and the sign-in
        // resolves as dismissed. Scheme-only filter: Google's URI has no host.
        {
          action: "VIEW",
          data: [{ scheme: "com.cashflowuniversity.cashflowtrader" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },

    web: {
      favicon: "./assets/favicon.png",
    },

    plugins: [
      "expo-font",
      "expo-web-browser",
      "@react-native-community/datetimepicker",
      "expo-asset",
      [
        "expo-audio",
        {
          microphonePermission: "Allow Cashflow Trader to access your microphone to record voice notes for your trades.",
        },
      ],
      // Android 9+ (API 28+) blocks plaintext HTTP by default (usesCleartextTraffic defaults to
      // false). EXPO_PUBLIC_API_URL points at a plain-http LAN backend during local/device dev
      // (see .env) — without this, every API call from a physical device or emulator would fail
      // at the OS network layer before ever reaching the app's own code. HTTPS traffic (production
      // API, TradingView/legal WebViews) is unaffected either way — this only stops the platform
      // from blocking cleartext, it doesn't disable TLS anywhere.
      [
        "expo-build-properties",
        {
          android: {
            // Cleartext (plain http) is only for local/LAN development against a http:// backend. The
            // production store build talks to https://api.cashflowtrader.in only, so it must not allow
            // cleartext traffic. EAS sets EAS_BUILD_PROFILE for every cloud build.
            usesCleartextTraffic: process.env.EAS_BUILD_PROFILE !== "production",
          },
        },
      ],
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
