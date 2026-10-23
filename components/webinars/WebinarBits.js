import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO } from "../../src/theme/typography";
import { primaryAction, statusMeta } from "../../src/utils/webinars";

// Port of the portal's components/WebinarBits.jsx: status badge + the single server-driven action button.

const TONE = {
  live: { borderColor: "rgba(57,255,20,0.5)", color: PRIMARY, backgroundColor: "rgba(57,255,20,0.06)" },
  upcoming: { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.75)" },
  ended: { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" },
  cancelled: { borderColor: "rgba(248,113,113,0.4)", color: "#fca5a5" },
};

export function WebinarStatusBadge({ status }) {
  const m = statusMeta(status);
  const t = TONE[m.tone];
  return (
    <View style={[s.badge, { borderColor: t.borderColor, backgroundColor: t.backgroundColor }]}>
      {m.tone === "live" && <View style={s.liveDot} />}
      <Text style={[s.badgeText, { color: t.color }]}>{m.label}</Text>
    </View>
  );
}

// The one main button for a webinar, driven only by the server's flags (primaryAction).
export function WebinarActionButton({ webinar, onJoin, onRegister, busy }) {
  const a = primaryAction(webinar);
  if (a.kind === "join") {
    return (
      <TouchableOpacity style={[s.joinBtn, busy && s.disabled]} disabled={busy} onPress={() => onJoin(webinar)} activeOpacity={0.85}>
        {busy ? <ActivityIndicator size="small" color="#000" /> : (
          <>
            <Ionicons name="videocam" size={16} color="#000" />
            <Text style={s.joinText}>{a.label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }
  if (a.kind === "register") {
    return (
      <TouchableOpacity style={[s.regBtn, busy && s.disabled]} disabled={busy} onPress={() => onRegister(webinar)} activeOpacity={0.85}>
        {busy ? <ActivityIndicator size="small" color={PRIMARY} /> : (
          <>
            <Text style={s.regText}>{a.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
          </>
        )}
      </TouchableOpacity>
    );
  }
  const good = a.kind === "registered";
  return (
    <View style={[s.staticBtn, good && { borderColor: "rgba(57,255,20,0.3)" }]}>
      {good && <Ionicons name="checkmark-circle-outline" size={14} color={PRIMARY} />}
      <Text style={[s.staticText, good && { color: "rgba(57,255,20,0.9)" }]}>{a.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  badgeText: { fontFamily: MONO.regular, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },

  joinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, minHeight: 44,
  },
  joinText: { color: "#000", fontFamily: DISPLAY.bold, fontSize: 14 },
  regBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(57,255,20,0.6)",
    paddingHorizontal: 20, paddingVertical: 12, minHeight: 44,
  },
  regText: { color: PRIMARY, fontFamily: DISPLAY.bold, fontSize: 14 },
  staticBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 20, paddingVertical: 12, minHeight: 44,
  },
  staticText: { color: "rgba(255,255,255,0.4)", fontFamily: MONO.regular, fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase" },
  disabled: { opacity: 0.6 },
});
