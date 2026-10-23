import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { WebinarActionButton, WebinarStatusBadge } from "./WebinarBits";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import { APP_ROUTES, TAB_ROUTES } from "../../src/constants/routes";
import { webinarsApi } from "../../src/api/webinars";
import { storage } from "../../src/services/storage";
import { useAlert } from "../../src/context/AlertContext";
import { joinWebinar } from "../../src/utils/webinarJoin";
import {
  alertMeta, dismissKey, parseDismissed, scheduleLine, visibleAlerts, webinarOffset, webinarTime, withDismissed,
} from "../../src/utils/webinars";

// Port of the portal's components/WebinarWidgets.jsx for the Overview screen: alerts (dismissible for
// 14 days, remembered on this device only), "Live Now" and "Upcoming Webinars". Renders nothing while the
// webinar service is off (it answers 404 then) or the viewer has nothing to see.
export default function WebinarWidgets({ userId }) {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    let active = true;
    storage.get(dismissKey(userId)).then((raw) => { if (active) setDismissed(parseDismissed(raw)); });
    return () => { active = false; };
  }, [userId]);

  const { data } = useQuery({
    queryKey: ["webinarsDashboard"],
    queryFn: () => webinarsApi.dashboard().then((r) => r.data),
    refetchInterval: 60 * 1000,
    retry: 0,
  });
  const { data: alerts } = useQuery({
    queryKey: ["webinarsAlerts"],
    queryFn: () => webinarsApi.alerts().then((r) => r.data?.alerts || []),
    refetchInterval: 60 * 1000,
    retry: 0,
  });

  const dismiss = useCallback((a) => {
    const next = withDismissed(dismissed, a);
    setDismissed(next);
    storage.set(dismissKey(userId), JSON.stringify(next));
  }, [dismissed, userId]);

  if (!data) return null;

  const shown = visibleAlerts(alerts, dismissed);
  const live = data.live || [];
  const upcoming = data.upcoming || [];
  const openDetail = (id) => navigation.navigate(APP_ROUTES.WEBINAR_DETAIL, { webinarId: id });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["webinarsDashboard"] });
    queryClient.invalidateQueries({ queryKey: ["webinars"] });
  };
  const join = async (w) => {
    setBusy(w.webinar_id);
    const r = await joinWebinar(w.webinar_id);
    setBusy(null);
    if (!r.ok) showAlert({ type: "error", title: "Could not join", message: r.message });
  };
  const register = async (w) => {
    setBusy(w.webinar_id);
    try {
      await webinarsApi.register(w.webinar_id);
      showAlert({ type: "success", title: "You're registered", message: w.title });
      refresh();
    } catch (e) {
      showAlert({ type: "error", title: "Could not register", message: e?.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const toneStyle = { live: s.alertLive, soon: s.alertSoon, upcoming: s.alertUpcoming };

  return (
    <View style={{ gap: 16 }}>
      {shown.map((a) => {
        const m = alertMeta(a);
        return (
          <View key={`${a.kind}:${a.webinar_id}`} style={[s.alert, toneStyle[m.tone]]}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={s.alertTop}>
                <Ionicons name="notifications-outline" size={14} color={m.tone === "live" ? PRIMARY : "rgba(255,255,255,0.7)"} />
                <Text style={[s.alertLabel, m.tone === "live" && { color: PRIMARY }]}>{m.label}</Text>
              </View>
              <Text style={s.alertTitle} numberOfLines={2}>{a.title}</Text>
              {(a.kind === "STARTING_SOON" || a.kind === "UPCOMING") && (
                <Text style={s.alertWhen}>{webinarTime(a.at)} ({webinarOffset(a.at)})</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => openDetail(a.webinar_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.alertCta}>{m.cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dismiss(a)} accessibilityLabel="Dismiss" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        );
      })}

      {live.length > 0 && (
        <View style={s.liveCard}>
          <View style={s.chip}>
            <Ionicons name="radio-outline" size={10} color={PRIMARY} />
            <Text style={s.chipText}>Live Now</Text>
          </View>
          {live.map((w) => (
            <View key={w.webinar_id} style={s.liveItem}>
              <View style={s.rowBetween}>
                <WebinarStatusBadge status={w.status} />
                <Text style={s.started}>Started {webinarTime(w.live_since || w.start_at)} ({webinarOffset(w.live_since || w.start_at)})</Text>
              </View>
              <Text style={s.liveTitle}>{w.title}</Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                <WebinarActionButton webinar={w} busy={busy === w.webinar_id} onJoin={join} onRegister={register} />
                <TouchableOpacity style={s.detailsBtn} onPress={() => openDetail(w.webinar_id)}>
                  <Text style={s.detailsText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={s.card}>
        <View style={s.rowBetween}>
          <View style={{ flex: 1 }}>
            <View style={s.chip}>
              <Ionicons name="desktop-outline" size={10} color={PRIMARY} />
              <Text style={s.chipText}>Upcoming Webinars</Text>
            </View>
            <Text style={s.cardHeading}>Reserve your seat for the next deep dive.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate(TAB_ROUTES.WEBINARS)}>
            <Text style={s.allLink}>All webinars</Text>
          </TouchableOpacity>
        </View>

        {upcoming.length === 0 ? (
          <Text style={s.empty}>No webinars scheduled yet. New ones show up here first.</Text>
        ) : (
          upcoming.map((w) => (
            <TouchableOpacity key={w.webinar_id} style={s.upItem} onPress={() => openDetail(w.webinar_id)} activeOpacity={0.8}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.upTitle} numberOfLines={2}>{w.title}</Text>
                <Text style={s.upWhen}>{scheduleLine(w.start_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  alert: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  alertLive: { borderColor: "rgba(57,255,20,0.5)", backgroundColor: "rgba(57,255,20,0.07)" },
  alertSoon: { borderColor: "rgba(251,191,36,0.4)", backgroundColor: "rgba(251,191,36,0.06)" },
  alertUpcoming: { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)" },
  alertTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertLabel: { color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  alertTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 14 },
  alertWhen: { color: "rgba(255,255,255,0.45)", fontFamily: MONO.regular, fontSize: 11 },
  alertCta: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },

  liveCard: {
    backgroundColor: "rgba(10,10,10,0.8)", borderWidth: 1, borderColor: "rgba(57,255,20,0.5)",
    borderRadius: 16, padding: 20, gap: 14,
  },
  liveItem: {
    borderWidth: 1, borderColor: "rgba(57,255,20,0.6)", backgroundColor: "rgba(57,255,20,0.07)",
    borderRadius: 12, padding: 14,
  },
  liveTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 17, marginTop: 8 },
  started: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  detailsBtn: {
    alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", paddingVertical: 12, minHeight: 44,
  },
  detailsText: { color: "rgba(255,255,255,0.7)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },

  card: {
    backgroundColor: "rgba(10,10,10,0.8)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 20, gap: 14,
  },
  chip: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)", backgroundColor: "rgba(57,255,20,0.05)",
  },
  chipText: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  cardHeading: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 16, marginTop: 8 },
  allLink: { color: PRIMARY, fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", marginTop: 4 },
  empty: { color: "rgba(255,255,255,0.55)", fontFamily: BODY.regular, fontSize: 14, textAlign: "center", paddingVertical: 16 },
  upItem: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)",
  },
  upTitle: { color: "#fff", fontFamily: DISPLAY.bold, fontSize: 15 },
  upWhen: { color: "rgba(255,255,255,0.55)", fontFamily: MONO.regular, fontSize: 11 },
});
