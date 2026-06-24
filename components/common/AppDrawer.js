import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY, authBaseStyles } from "../auth/AuthStyles";
import DrawerItem from "./DrawerItem";
import { useAuth } from "../../src/context/AuthContext";

const MENU_ITEMS = [
  { icon: "home-outline",         label: "Overview",          route: "OverviewScreen"      },
  { icon: "trophy-outline",       label: "21-Day Challenge",  route: "ChallengeScreen"     },
  // { icon: "trending-up-outline",  label: "Live Trading",      route: "LiveTradingScreen"   },
  { icon: "scan-outline",         label: "Trading AI",        route: "JournalScreen"       },
  { icon: "videocam-outline",     label: "Live Sessions",     route: "SessionsScreen"      },
  { icon: "bar-chart-outline",    label: "Progress",          route: "ProgressScreen"      },
  { icon: "help-circle-outline",  label: "Support",           route: "SupportScreen"       },
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
    borderRightWidth: 1,
    borderRightColor: "#1a1a1a",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
  },

  profileInfo: {
    flex: 1,
  },

  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(57, 255, 20, 0.1)",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },

  roleText: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  profileName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },

  profileEmail: {
    color: "#666",
    fontSize: 11,
  },

  challengeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  challengeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginRight: 5,
  },

  challengeText: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  menuScroll: {
    flex: 1,
    paddingTop: 4,
  },

  adminSpacer: {
    height: 8,
  },

  separator: {
    height: 1,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 20,
    marginBottom: 4,
  },

  bottomSection: {
    paddingBottom: 6,
  },
});

export default memo(function AppDrawer({ currentScreen, onNavigate, onClose, permanent = false }) {
  const { user, isAdmin, hasChallengeAccess, logout } = useAuth();

  const avatarInitials = useMemo(() => getInitials(user?.name), [user?.name]);

  const navHandlers = useMemo(() => {
    const routes = [
      ...MENU_ITEMS.map((i) => i.route),
      "ProfileScreen",
      "AdminScreen",
      "SignIn",
    ];
    return Object.fromEntries(routes.map((r) => [r, () => onNavigate(r)]));
  }, [onNavigate]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Drawer header ── */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={authBaseStyles.logoBox}>
            <Text style={authBaseStyles.logoLetter}>C</Text>
          </View>
          <Text style={authBaseStyles.brandText}>
            Cashflow{" "}
            <Text style={{ color: PRIMARY }}>Trader</Text>
          </Text>
        </View>

        {!permanent && (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#777" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitials}</Text>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>TRADER</Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.name || "Trader"}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || ""}
          </Text>
          {hasChallengeAccess && (
            <View style={styles.challengeBadge}>
              <View style={styles.challengeDot} />
              <Text style={styles.challengeText}>CHALLENGE ACTIVE</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Navigation items ── */}
      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {MENU_ITEMS.map((item) => (
          <DrawerItem
            key={item.route}
            icon={item.icon}
            label={item.label}
            isActive={currentScreen === item.route}
            onPress={navHandlers[item.route]}
          />
        ))}

        {isAdmin && (
          <>
            <View style={styles.adminSpacer} />
            <DrawerItem
              icon="shield-checkmark-outline"
              label="Admin OS"
              isActive={currentScreen === "AdminScreen"}
              onPress={navHandlers.AdminScreen}
            />
          </>
        )}
      </ScrollView>

      {/* ── Bottom: Profile + Sign Out ── */}
      <View style={styles.bottomSection}>
        <View style={styles.separator} />
        <DrawerItem
          icon="person-outline"
          label="My Profile"
          isActive={currentScreen === "ProfileScreen"}
          onPress={navHandlers.ProfileScreen}
        />
        <DrawerItem
          icon="log-out-outline"
          label="Sign Out"
          isActive={false}
          onPress={logout}
        />
      </View>
    </SafeAreaView>
  );
});
