import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { WebinarActionButton, WebinarStatusBadge } from "../components/webinars/WebinarBits";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { webinarsApi } from "../src/api/webinars";
import { useAlert } from "../src/context/AlertContext";
import { joinWebinar } from "../src/utils/webinarJoin";
import {
  durationLabel, scheduleLine, startsInLabel, webinarTime,
} from "../src/utils/webinars";

// Port of the portal's pages/dashboard/WebinarDetail.jsx (overview / schedule / host / registration rules).

function registrationRules(w) {
  const rules = [];
  if (w.registration_required) {
    rules.push("Registration is required before you can join.");
    if (w.seats_remaining != null) {
      rules.push(`${w.seats_remaining} seat${w.seats_remaining === 1 ? "" : "s"} remaining.`);
    }
  } else {
    rules.push("No registration needed — join when the webinar opens.");
  }
  rules.push("Joining opens shortly before the start time; your join link is personal and works once.");
  return rules;
}

function Section({ icon, title, children }) {
  return (
    <View style={s.section}>
      <View style={s.chip}>
        <Ionicons name={icon} size={10} color={PRIMARY} />
        <Text style={s.chipText}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, children }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{children}</Text>
    </View>
  );
}

export default function WebinarDetailScreen({ navigation, route }) {
  const webinarId = route?.params?.webinarId;
  const { showAlert } = useAlert();
  const [w, setW] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | missing
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    if (!webinarId) { setState("missing"); return Promise.resolve(); }
    return webinarsApi.get(webinarId)
      .then(({ data }) => { setW(data?.webinar || null); setState(data?.webinar ? "ok" : "missing"); })
      .catch(() => setState((cur) => (cur === "ok" ? cur : "missing")));
  }, [webinarId]);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 30 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [load]);

  const register = async () => {
    setBusy(true);
    try {
      const { data } = await webinarsApi.register(webinarId);
      setW(data.webinar);
      showAlert({ type: "success", title: "You're registered", message: data.webinar?.title });
    } catch (e) {
      showAlert({ type: "error", title: "Could not register", message: e?.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const { data } = await webinarsApi.cancelRegistration(webinarId);
      setW(data.webinar);
      showAlert({ type: "success", title: "Registration cancelled" });
    } catch (e) {
      showAlert({ type: "error", title: "Could not cancel", message: e?.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    const r = await joinWebinar(webinarId);
    setBusy(false);
    if (!r.ok) showAlert({ type: "error", title: "Could not join", message: r.message });
    load();
  };

  const back = (
    <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
      <Text style={s.backText}>All webinars</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {back}

        {state === "loading" && <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>}

        {state === "missing" && (
          <View style={s.glass}>
            <Text style={s.missingTitle}>Webinar not found.</Text>
            <Text style={s.missingSub}>It may have been removed, or it isn't open to your account.</Text>
          </View>
        )}

        {state === "ok" && w && (() => {
          const countdown = startsInLabel(w, now);
          const registered = w.registration?.status === "REGISTERED";
          const canCancel = registered && w.registration_required && ["PUBLISHED", "LIVE"].includes(w.status);
          return (
            <>
              <View style={[s.hero, w.status === "LIVE" && s.heroLive]}>
                <View style={s.badgeRow}>
                  <WebinarStatusBadge status={w.status} />
                  {!!countdown && <Text style={s.countdown}>{countdown}</Text>}
                  {w.status === "LIVE" && !!w.live_since && (
                    <Text style={s.started}>Started {webinarTime(w.live_since)}</Text>
                  )}
                </View>
                <Text style={s.title}>{w.title}</Text>
                <Text style={s.schedule}>{scheduleLine(w.start_at)} · {durationLabel(w.duration_minutes)}</Text>
                <View style={s.actions}>
                  <WebinarActionButton webinar={w} busy={busy} onJoin={join} onRegister={register} />
                  {canCancel && (
                    <TouchableOpacity style={[s.cancelBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={cancel}>
                      <Text style={s.cancelText}>Cancel registration</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Section icon="desktop-outline" title="Overview">
                <Text style={s.body}>{w.description || "Details will be shared soon."}</Text>
              </Section>

              <Section icon="calendar-outline" title="Schedule">
                <Row label="Starts">{scheduleLine(w.start_at)}</Row>
                <Row label="Ends">{scheduleLine(w.end_at)}</Row>
                <Row label="Duration">{durationLabel(w.duration_minutes)}</Row>
                <Row label="Joining opens">{w.join?.opens_at ? scheduleLine(w.join.opens_at) : "—"}</Row>
                <Row label="Time zone">India Standard Time (IST)</Row>
              </Section>

              <Section icon="person-circle-outline" title="Host Information">
                <Text style={s.host}>{w.host_name || "CashFlow Trader"}</Text>
                <Text style={s.hostSub}>Hosted by the CashFlow Trader team.</Text>
              </Section>

              <Section icon="shield-checkmark-outline" title="Registration Rules">
                {registrationRules(w).map((r) => (
                  <View key={r} style={s.bulletRow}>
                    <Text style={s.bullet}>•</Text>
                    <Text style={s.bulletText}>{r}</Text>
                  </View>
                ))}
                <Text style={[s.myReg, registered && { color: PRIMARY }]}>
                  {registered ? "You're registered"
                    : w.registration?.status === "REMOVED" ? "Registration cancelled"
                      : "Not registered"}
                </Text>
              </Section>
            </>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  center: { paddingVertical: 40, alignItems: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },

  glass: {
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 28, alignItems: "center",
  },
  missingTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 20, textAlign: "center" },
  missingSub: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 14, marginTop: 8, textAlign: "center" },

  hero: {
    backgroundColor: "rgba(10,10,10,0.8)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 20,
  },
  heroLive: { borderColor: "rgba(57,255,20,0.5)" },
  badgeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  countdown: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  started: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 11 },
  title: { color: "#fff", fontFamily: DISPLAY.extraBold, fontSize: 28, letterSpacing: -0.8, lineHeight: 34, marginTop: 12 },
  schedule: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 12, marginTop: 8 },
  actions: { gap: 8, marginTop: 20 },
  cancelBtn: {
    alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", paddingVertical: 12, minHeight: 44,
  },
  cancelText: { color: "rgba(255,255,255,0.6)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },

  section: {
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 20, gap: 10,
  },
  chip: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.05)",
  },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  body: { color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 21 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)", gap: 2 },
  rowLabel: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" },
  rowValue: { color: "rgba(255,255,255,0.85)", fontFamily: BODY.regular, fontSize: 14 },
  host: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 18 },
  hostSub: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 14 },
  bulletRow: { flexDirection: "row", gap: 8 },
  bullet: { color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 14 },
  bulletText: { flex: 1, color: "rgba(255,255,255,0.75)", fontFamily: BODY.regular, fontSize: 14, lineHeight: 20 },
  myReg: { color: "rgba(255,255,255,0.5)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
});
