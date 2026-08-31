import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DISPLAY, BODY } from "../../src/theme/typography";

// Web equivalents: src/components/ProgramExpired.jsx, src/components/AccessBlocked.jsx,
// src/components/ChallengeMaintenance.jsx — read in full before porting. Same "you can't be here
// right now" card family on web: contact-administrator-only, no self-service action (self-renewal
// was removed there; not re-added here). Web's "Contact administrator" link routes to
// /dashboard/support; the mobile equivalent is the SupportScreen tab.

const AMBER = "#FBBF24";
const RED = "#f87171";

function AccessStateCard({ icon, iconColor, borderColor, title, message, navigation }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { borderColor }]}>
        <Ionicons name={icon} size={34} color={iconColor} style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: iconColor }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("SupportScreen")}
        >
          <Ionicons name="headset-outline" size={16} color="#000" />
          <Text style={styles.buttonText}>Contact administrator</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Web: data.access_status === "expired" -> <ProgramExpired programName={data.program_name} />
export function ProgramExpired({ programName, navigation }) {
  return (
    <AccessStateCard
      icon="time-outline"
      iconColor={AMBER}
      borderColor="rgba(251,191,36,0.3)"
      title="Your program has expired."
      message={`${
        programName ? `Your access to ${programName} has ended.` : "Your access has ended."
      } Contact your administrator to restore access.`}
      navigation={navigation}
    />
  );
}

// Web: data.access_status === "blocked" -> <AccessBlocked selfRenewalAllowed={data.self_renewal_allowed !== false} />
export function AccessBlocked({ selfRenewalAllowed = true, navigation }) {
  return (
    <AccessStateCard
      icon="lock-closed-outline"
      iconColor={RED}
      borderColor="rgba(248,113,113,0.3)"
      title={
        selfRenewalAllowed
          ? "Your access has been blocked."
          : "Your access has been permanently locked."
      }
      message="Please contact the administrator to restore your access."
      navigation={navigation}
    />
  );
}

// Web: data.maintenance -> <ChallengeMaintenance reason={data.reason} />
// Title is a fixed string, never derived from `reason` — the admin-typed reason is only ever body
// text. Uppercase is applied visually (textTransform) rather than baked into the string, matching
// web's own reasoning for keeping the underlying text normal-case.
const MAINTENANCE_TITLE = "Server Maintenance";
const DEFAULT_MAINTENANCE_REASON =
  "This program is temporarily under maintenance. Please try again later.";

export function ChallengeMaintenance({ reason }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { borderColor: "rgba(251,191,36,0.3)" }]}>
        <Ionicons name="warning-outline" size={36} color={AMBER} style={styles.icon} />
        <Text style={[styles.title, styles.maintenanceTitle]}>{MAINTENANCE_TITLE}</Text>
        <Text style={styles.message}>{reason || DEFAULT_MAINTENANCE_REASON}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(10,10,10,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  maintenanceTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  message: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
  },
  buttonText: {
    color: "#000",
    fontFamily: DISPLAY.bold,
    fontSize: 14,
  },
});
