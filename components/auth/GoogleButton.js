import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../src/context/AuthContext";

const OAUTH_BASE_URL = "https://auth.emergentagent.com/";

/**
 * "Continue with Google" button shared by every auth screen.
 * Handles the full OAuth flow internally:
 *   1. Builds a dynamic redirect URL (scheme-aware for Expo Go / standalone)
 *   2. Opens an in-app browser pointed at the Emergent OAuth endpoint
 *   3. Extracts session_id from the redirect hash
 *   4. Calls loginWithSession() — AuthContext stores the JWT and sets user
 *   5. RootNavigator reacts to user state change automatically
 *
 * The `style` prop overrides only visual properties (height, borderColor).
 * The deprecated `onPress` prop is kept for API compatibility but is unused.
 */
export default function GoogleButton({ style }) {
  const { loginWithSession } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // ── DEBUG 1 & 2: redirect + auth URLs ─────────────────────────────
      const redirectUrl = Linking.createURL("auth/callback");
      console.log("[OAuth] 1. redirectUrl:", redirectUrl);

      const authUrl = `${OAUTH_BASE_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
      console.log("[OAuth] 2. authUrl:", authUrl);

      // ── DEBUG 3: openAuthSessionAsync result ───────────────────────────
      console.log("[OAuth] 3. Opening browser...");
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      console.log("[OAuth] 3. result.type :", result.type);
      console.log("[OAuth] 3. result.url  :", result.url ?? "(none)");
      console.log("[OAuth] 3. full result :", JSON.stringify(result));

      if (result.type !== "success") {
        console.warn("[OAuth] 4. STOPPED — result.type is not 'success', got:", result.type,
          "\n    If type='dismiss': app is probably running on Expo Web (COOP blocks window.closed).",
          "\n    Test on a physical device or simulator instead.");
        return;
      }

      // ── DEBUG 4: session_id extraction ─────────────────────────────────
      console.log("[OAuth] 4. result.url to parse:", result.url);
      const match = result.url.match(/session_id=([^&\s#]+)/);
      console.log("[OAuth] 4. regex match:", match ? `session_id=${match[1]}` : "NO MATCH — session_id not found in URL");

      if (!match) {
        console.error("[OAuth] 4. STOPPED — no session_id in callback URL.");
        return;
      }

      // ── DEBUG 5 & 6: loginWithSession call ─────────────────────────────
      console.log("[OAuth] 5. Calling loginWithSession with session_id:", match[1]);
      const authedUser = await loginWithSession(match[1]);
      console.log("[OAuth] 6. loginWithSession returned user:", authedUser?.email ?? JSON.stringify(authedUser));
    } catch (e) {
      console.error("[OAuth] CAUGHT:", e?.message ?? String(e));
      console.error("[OAuth] Error detail:", JSON.stringify(e?.response?.data ?? {}));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#ffffff" />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderWidth: 1,
    borderColor: "#252525",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
