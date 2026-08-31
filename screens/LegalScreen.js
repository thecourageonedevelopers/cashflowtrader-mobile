/**
 * LegalScreen — mobile parity for web's four legal pages (src/pages/legal/{Terms,Privacy,
 * RefundPolicy,Declaration}.jsx, shared chrome in src/components/legal/LegalLayout.jsx).
 *
 * Content source verification (done before writing this file, per this phase's explicit
 * requirement): all four pages are 100% static, hardcoded JSX — no API call, no CMS. LegalLayout
 * itself has zero auth-dependent logic (no data fetching, no user-specific rendering at all), so
 * these pages render identically for anonymous and signed-in visitors on web.
 *
 * However, they ARE live, public, unauthenticated production routes (confirmed: index.html's
 * og:image meta tag references https://cashflowtrader.in, and the routes carry no ProtectedRoute
 * wrapper in App.jsx). Per this phase's explicit instruction to prefer a hosted source over
 * duplicating large blocks of legal text when one already exists, this screen loads the live
 * production pages in a WebView (react-native-webview, already a dependency since Phase P6)
 * rather than re-typing ~150-200 lines of legal copy per document into RN components. This also
 * removes any risk of the mobile copy drifting out of sync with web's if the legal text is ever
 * updated — a real compliance concern a duplicated copy would not eliminate.
 *
 * The persistent side-nav between the four documents (LegalLayout.jsx's NAV array) is ported as a
 * horizontal tab row, since it's a real, visible navigational affordance on web, not simplified
 * away. The "Print" button is not ported — it's a browser-only affordance with no natural native
 * equivalent, and printing a legal document is not a core mobile use case.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import { DISPLAY, MONO } from "../src/theme/typography";

const PRIMARY = "#39FF14";

// Same four documents, same order, same labels as web's LegalLayout.jsx NAV array.
const PAGES = [
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "declaration", label: "Declaration" },
];

const BASE_URL = "https://cashflowtrader.in";

export default function LegalScreen({ navigation, route }) {
  const initialSlug = route.params?.slug || "terms";
  const [slug, setSlug] = useState(initialSlug);
  const [loading, setLoading] = useState(true);

  const page = PAGES.find((p) => p.slug === slug) || PAGES[0];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{page.label}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabRow}>
        {PAGES.map((p) => (
          <TouchableOpacity
            key={p.slug}
            style={[styles.tab, slug === p.slug && styles.tabActive]}
            onPress={() => { setSlug(p.slug); setLoading(true); }}
          >
            <Text style={[styles.tabText, slug === p.slug && styles.tabTextActive]} numberOfLines={1}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          key={slug}
          source={{ uri: `${BASE_URL}/${slug}` }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { flex: 1, textAlign: "center", color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15, marginHorizontal: 8 },

  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 9, letterSpacing: 0.3, textAlign: "center" },
  tabTextActive: { color: PRIMARY, fontWeight: "700" },

  webview: { flex: 1, backgroundColor: "#000" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
});
