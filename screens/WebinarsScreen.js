import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import { WebinarActionButton, WebinarStatusBadge } from "../components/webinars/WebinarBits";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { APP_ROUTES } from "../src/constants/routes";
import { webinarsApi } from "../src/api/webinars";
import { useAlert } from "../src/context/AlertContext";
import { joinWebinar } from "../src/utils/webinarJoin";
import {
  durationLabel, registrationLabel, scheduleLine, startsInLabel,
} from "../src/utils/webinars";

// Port of the portal's pages/dashboard/Webinars.jsx: Upcoming / Live tabs, search, registration, join.
const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live" },
];
const EMPTY = {
  upcoming: "No upcoming webinars right now. New sessions are announced here first.",
  live: "Nothing is live at the moment.",
};

export default function WebinarsScreen({ navigation }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("upcoming");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  // Debounced search (300 ms, like the portal).
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Countdown labels tick every 30 s.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["webinars", tab, query],
    queryFn: () => webinarsApi.list(tab, query).then((r) => r.data?.webinars || []),
    refetchInterval: 60 * 1000, // picks up webinars going live / ending
    retry: 1,
  });
  const items = data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const register = async (w) => {
    setBusy(w.webinar_id);
    try {
      await webinarsApi.register(w.webinar_id);
      showAlert({ type: "success", title: "You're registered", message: w.title });
      queryClient.invalidateQueries({ queryKey: ["webinars"] });
      queryClient.invalidateQueries({ queryKey: ["webinarsDashboard"] });
    } catch (e) {
      showAlert({ type: "error", title: "Could not register", message: e?.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const join = async (w) => {
    setBusy(w.webinar_id);
    const r = await joinWebinar(w.webinar_id);
    setBusy(null);
    if (!r.ok) showAlert({ type: "error", title: "Could not join", message: r.message });
  };

  return (
    <ScreenLayout screenName="WebinarsScreen" navigation={navigation}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
      >
        <View style={{ gap: 12 }}>
          <View style={s.chip}>
            <Ionicons name="desktop-outline" size={10} color={PRIMARY} />
            <Text style={s.chipText}>Webinars</Text>
          </View>
          <Text style={s.heroTitle}>
            {"Learn live, "}<Text style={s.neon}>from the desk.</Text>
          </Text>
          <Text style={s.heroSub}>
            Deep-dive sessions with the CashFlow Trader team. All times are in India Standard Time
            <Text style={s.mono}>{" · IST"}</Text>.
          </Text>
        </View>

        <View style={s.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[s.tab, tab === t.key && s.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
            >
              <Text style={[s.tabText, tab === t.key && { color: PRIMARY }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" style={s.searchIcon} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search webinars"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={s.search}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
        ) : isError ? (
          <View style={s.glass}>
            <Text style={s.emptyTitle}>Webinars aren't available right now.</Text>
            <Text style={s.emptySub}>Please check back a little later.</Text>
            <TouchableOpacity onPress={() => refetch()} style={s.retry}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={s.glass}>
            <Text style={s.emptyTitle}>{query ? "No webinars match your search." : EMPTY[tab]}</Text>
          </View>
        ) : (
          items.map((w) => {
            const live = w.status === "LIVE";
            const cancelled = w.status === "CANCELLED";
            const countdown = startsInLabel(w, now);
            const showSeats = w.registration_required && w.seats_remaining != null
              && !["ENDED", "ARCHIVED", "CANCELLED"].includes(w.status);
            return (
              <View key={w.webinar_id} style={[s.card, live && s.cardLive, cancelled && { opacity: 0.6 }]}>
                <View style={s.rowBetween}>
                  <WebinarStatusBadge status={w.status} />
                  {!!countdown && <Text style={s.countdown}>{countdown}</Text>}
                </View>
                <Text style={s.cardTitle}>{w.title}</Text>
                {!!w.description && <Text style={s.cardDesc} numberOfLines={3}>{w.description}</Text>}
                <View style={{ gap: 6, marginTop: 14 }}>
                  <Text style={s.when}>{scheduleLine(w.start_at)}</Text>
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={s.meta}>{durationLabel(w.duration_minutes)}</Text>
                    </View>
                    <Text style={s.meta}>{registrationLabel(w)}</Text>
                    {showSeats && (
                      <View style={s.metaItem}>
                        <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={s.meta}>{w.seats_remaining} seats left</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={s.actions}>
                  <WebinarActionButton webinar={w} busy={busy === w.webinar_id} onJoin={join} onRegister={register} />
                  <TouchableOpacity
                    style={s.detailsBtn}
                    onPress={() => navigation.navigate(APP_ROUTES.WEBINAR_DETAIL, { webinarId: w.webinar_id })}
                  >
                    <Text style={s.detailsText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  chip: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.05)",
  },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 30, letterSpacing: -0.8, lineHeight: 36 },
  neon: { color: PRIMARY },
  heroSub: { color: "rgba(255,255,255,0.6)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20 },
  mono: { fontFamily: MONO.regular, color: "rgba(255,255,255,0.45)" },

  tabs: {
    flexDirection: "row", alignSelf: "flex-start", padding: 4, borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)",
  },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  tabActive: { backgroundColor: "rgba(57,255,20,0.15)" },
  tabText: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },

  searchWrap: { justifyContent: "center" },
  searchIcon: { position: "absolute", left: 12, zIndex: 1 },
  search: {
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8, paddingLeft: 36, paddingRight: 12, paddingVertical: 10, color: "#fff",
    fontFamily: BODY.regular, fontSize: 14,
  },

  center: { paddingVertical: 40, alignItems: "center" },
  glass: {
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 28, alignItems: "center",
  },
  emptyTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 18, textAlign: "center" },
  emptySub: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 14, marginTop: 8, textAlign: "center" },
  retry: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(57,255,20,0.6)" },
  retryText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 13 },

  card: {
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 20,
  },
  cardLive: { borderColor: "rgba(57,255,20,0.5)" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  countdown: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  cardTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 20, marginTop: 12 },
  cardDesc: { color: "rgba(255,255,255,0.65)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20, marginTop: 8 },
  when: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 11 },
  actions: { marginTop: 20, gap: 8 },
  detailsBtn: {
    alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", paddingVertical: 12, minHeight: 44,
  },
  detailsText: { color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
});
