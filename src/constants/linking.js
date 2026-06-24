// Deep link prefixes — scheme must match app.json `scheme`.
// Auth callback URLs (cashflowtrader://auth/callback#session_id=…) are
// handled directly in AuthContext via Linking.addEventListener — no screen
// routing is needed here. Prefixes are enough for the OS to wake the app.
export const LINKING_CONFIG = {
  prefixes: ["cashflowtrader://", "https://cashflowtrader.app"],
};
