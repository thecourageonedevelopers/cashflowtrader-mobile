import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../../src/context/AuthContext";
import { BODY } from "../../src/theme/typography";
import { extractApiError } from "../../src/utils/apiError";

// Required by expo-auth-session to complete the OAuth session on Android/web.
WebBrowser.maybeCompleteAuthSession();

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" fill="none">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.4 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.4 29.2 4.5 24 4.5 16.3 4.5 9.6 8.8 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.2 16.3 43.5 24 43.5z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4-4.1 5.2l6.1 5C40.4 35.6 43.5 30.2 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
    </Svg>
  );
}

// User-facing message for a failed POST /auth/google. Never includes the token or raw server internals.
function googleErrorMessage(e) {
  const status = e?.response?.status;
  if (e?.code === "RESPONSE_DECRYPTION_FAILED" || e?.name === "AuthSessionError") return extractApiError(e);
  if (status === 403) return extractApiError(e); // e.g. "This account cannot sign in here."
  // The backend rejects a Google token whose audience (OAuth client) it does not trust. That is a
  // server-side configuration gap, not something the user can fix by retrying.
  const detail = String(e?.response?.data?.detail || "");
  if (/audience mismatch/i.test(detail)) {
    return "Google sign-in isn't enabled for this version of the app yet. Please sign in with your email and password, or contact support.";
  }
  if (status === 401) return "Google rejected this sign-in or it has expired. Please try again.";
  if (e?.message === "Network Error" || e?.code === "ECONNABORTED") return "No connection to the server. Please check your network and try again.";
  return "Google sign-in failed. Please try again.";
}

export default function GoogleButton({ style }) {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  // useIdTokenAuthRequest fetches a Google ID token via OAuth implicit flow.
  // The id_token it returns is structurally identical to the `credential` that
  // Google Identity Services delivers on the web — so the same backend endpoint
  // POST /auth/google { credential } works without any changes.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle the OAuth result. `response` is set by expo-auth-session after the
  // browser session completes. We watch it in an effect because promptAsync()
  // is asynchronous and the hook updates `response` out-of-band.
  useEffect(() => {
    if (!response) return;

    // Cancelled / dismissed by the user: nothing happened, nothing to report, no session created.
    if (response.type === "cancel" || response.type === "dismiss" || response.type === "locked") return;

    if (response.type === "error") {
      // OAuth / code-exchange failure reported by Google. Log only the error code, never params.
      console.error("[OAuth] Google returned an error:", response.error?.code ?? "unknown");
      Alert.alert("Sign-in failed", "Google couldn't complete the sign-in. Please try again.");
      return;
    }
    if (response.type !== "success") return;

    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      // The code exchange produced no ID token (misconfigured OAuth client or scheme).
      console.error("[OAuth] success response without an id_token");
      Alert.alert(
        "Sign-in failed",
        "Google sign-in didn't return the expected credentials. Please try again, or sign in with your email.",
      );
      return;
    }

    let active = true;
    setLoading(true);

    googleLogin(idToken)
      .catch((e) => {
        if (!active) return;
        console.error("[OAuth] POST /auth/google failed:", e?.response?.status ?? e?.code ?? e?.message);
        Alert.alert("Sign-in failed", googleErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [response, googleLogin]);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => promptAsync()}
      disabled={loading || !request}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
      ) : (
        <>
          <GoogleIcon />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  text: {
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 14,
  },
});
