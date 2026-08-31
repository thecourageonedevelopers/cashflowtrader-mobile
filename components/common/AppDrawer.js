/**
 * AppDrawer — RN port of web DashboardLayout.jsx sidebar.
 *
 * Menu order, icons, profile card, admin logic, and styling all match
 * React Web exactly. Web is the ONLY source of truth.
 *
 * Web LINKS order (source: DashboardLayout.jsx):
 *   1. Overview        — LayoutDashboard → grid-outline
 *   2. 21-Day Challenge — CalendarDays   → calendar-outline
 *   3. Auto Journal    — NotebookPen     → create-outline
 *   4. Live Sessions   — Radio           → radio-outline
 *   5. Progress        — Activity        → pulse-outline
 *   6. Support         — HeadphonesIcon  → headset-outline
 *
 * Bottom (fixed):
 *   — My Profile       — UserCircle2     → person-circle-outline
 *   — Sign Out         — LogOut          → log-out-outline
 *
 * Conditional (staff only):
 *   — Admin OS / Sales OS / Staff OS — ShieldCheck → shield-checkmark-outline
 */
import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY } from "../auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";
import DrawerItem from "./DrawerItem";
import { useAuth } from "../../src/context/AuthContext";
import { TAB_ROUTES } from "../../src/constants/routes";

// ─── Design tokens (matching web DashboardLayout.jsx) ────────────────────────
const NEON = "#39FF14";
const BG = "#000";
const BORDER_DIM = "rgba(255,255,255,0.10)";

// ─── Menu items — exact order from web LINKS array ────────────────────────────
const MENU_ITEMS = [
  { icon: "grid-outline",      label: "Overview",         route: TAB_ROUTES.OVERVIEW  },
  { icon: "calendar-outline",  label: "21-Day Challenge", route: TAB_ROUTES.CHALLENGE },
  { icon: "create-outline",    label: "Auto Journal",     route: TAB_ROUTES.JOURNAL   },
  { icon: "radio-outline",     label: "Live Sessions",    route: TAB_ROUTES.SESSIONS  },
  { icon: "pulse-outline",     label: "Progress",         route: TAB_ROUTES.PROGRESS  },
  { icon: "headset-outline",   label: "Support",          route: TAB_ROUTES.SUPPORT   },
];

// ─── Admin label logic — mirrors web DashboardLayout.jsx ─────────────────────
function getStaffLabel(user) {
  if (user?.is_admin) return "Admin OS";
  const perms = user?.permissions || [];
  const salesOnly =
    perms.length > 0 &&
    perms.every((p) => p === "sales_agent" || p === "manage_sales");
  return salesOnly ? "Sales OS" : "Staff OS";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default memo(function AppDrawer({ currentScreen, onNavigate, onClose, extraPrograms = [], permanent = false }) {
  const { user, hasChallengeAccess, logout } = useAuth();

  // Web checks user?.is_staff for admin/staff visibility
  const isStaff = !!user?.is_staff;
  const staffLabel = useMemo(() => getStaffLabel(user), [user]);

  // Auto Journal is a paid-challenge feature (DashboardLayout.jsx's requireChallengeUnlocked +
  // canSeeJournal) — staff/admin still see it, same bypass as web.
  const canSeeJournal = !!user?.challenge_unlocked || !!user?.is_admin || !!user?.is_staff;

  // Other active programs (Mentorship Program, any future course) — inserted between
  // "21-Day Challenge" and "Auto Journal", exact same slot web's LINKS.slice(0,2) + programLinks +
  // LINKS.slice(2) uses (DashboardLayout.jsx). Each reuses ChallengeScreen with a different
  // programId param, mirroring how web reuses the same <Challenge/> route component for
  // /dashboard/programs/:programId.
  const displayItems = useMemo(() => {
    // activeId matches the screenIdentity ChallengeScreen.js computes and hands to ScreenLayout —
    // "ChallengeScreen" for the legacy program (the static link below), "ChallengeScreen:<id>" for
    // any other program — so exactly one link highlights, mirroring web's NavLink comparing the
    // current URL path (/dashboard/challenge vs /dashboard/programs/:id) rather than just a screen
    // name with no program awareness.
    const programItems = extraPrograms.map((p) => ({
      icon: "book-outline",
      label: p.name,
      route: TAB_ROUTES.CHALLENGE,
      params: { programId: p.program_id },
      activeId: `ChallengeScreen:${p.program_id}`,
      key: `program-${p.program_id}`,
    }));
    const base = MENU_ITEMS.filter((item) => item.route !== TAB_ROUTES.JOURNAL || canSeeJournal)
      .map((item) => ({ ...item, key: item.route, activeId: item.route }));
    return [...base.slice(0, 2), ...programItems, ...base.slice(2)];
  }, [extraPrograms, canSeeJournal]);

  const navHandlers = useMemo(() => {
    const routes = [
      ...MENU_ITEMS.map((i) => i.route),
      TAB_ROUTES.PROFILE,
      "AdminScreen",
    ];
    return Object.fromEntries(routes.map((r) => [r, () => onNavigate(r)]));
  }, [onNavigate]);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>

      {/* ── Header: logo + close button ── */}
      <View style={s.header}>
        <View style={s.logoRow}>
          <Image
            source={require("../../assets/adaptive-icon.png")}
            style={s.logoImg}
            resizeMode="contain"
          />
          <Text style={s.brandText}>
            Cashflow <Text style={{ color: NEON }}>Trader</Text>
          </Text>
        </View>

        {!permanent && (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.50)" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Profile card — matches web: p-4 rounded-md border border-white/10 bg-white/[0.02] ── */}
      {/*   No avatar (web sidebar has NO avatar image, text only) ── */}
      <View style={s.profileCard}>
        {/* "Trader" label — web: font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase */}
        <Text style={s.traderLabel}>Trader</Text>

        {/* Name — web: font-display font-bold text-base mt-1 truncate */}
        <Text style={s.profileName} numberOfLines={1}>
          {user?.name || "Trader"}
        </Text>

        {/* Email — web: font-mono text-xs text-white/50 truncate */}
        <Text style={s.profileEmail} numberOfLines={1}>
          {user?.email || ""}
        </Text>

        {/* Challenge badge — web: mt-2 inline-flex items-center gap-1 text-[10px] uppercase text-neon */}
        {hasChallengeAccess && (
          <View style={s.challengeBadge}>
            <View style={s.challengeDot} />
            <Text style={s.challengeText}>Challenge Active</Text>
          </View>
        )}
      </View>

      {/* ── Navigation items ── */}
      <ScrollView
        style={s.menuScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {displayItems.map((item) => (
          <DrawerItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            isActive={currentScreen === item.activeId}
            onPress={item.params ? () => onNavigate(item.route, item.params) : navHandlers[item.route]}
          />
        ))}

        {/* Admin / Staff OS — web: mt-4, always neon bg+border (not just when active) */}
        {isStaff && (
          <TouchableOpacity
            style={s.adminItem}
            onPress={navHandlers.AdminScreen}
            activeOpacity={0.80}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={NEON} style={s.adminIcon} />
            <Text style={s.adminLabel}>{staffLabel}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Bottom: My Profile + Sign Out ── */}
      <View style={s.bottomSection}>
        {/* Separator — web: border-r border-white/10 */}
        <View style={s.separator} />

        {/* My Profile — same active/inactive styling as regular nav items */}
        <DrawerItem
          icon="person-circle-outline"
          label="My Profile"
          isActive={currentScreen === TAB_ROUTES.PROFILE}
          onPress={navHandlers.ProfileScreen}
        />

        {/* Sign Out — web: text-white/60 border border-white/10 (distinct from nav items) */}
        <TouchableOpacity
          style={s.signOutBtn}
          onPress={logout}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.60)" style={s.adminIcon} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Sidebar container — web: bg-black border-r border-white/10
  container: {
    flex: 1,
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: BORDER_DIM,
  },

  // Header — web: flex items-center justify-between gap-3 px-6 py-6
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DIM,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Logo image — web: w-11 h-11 rounded-lg = 44×44
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },

  // Brand text — web: font-display font-bold text-xl = 20px
  brandText: {
    color: "#fff",
    fontFamily: DISPLAY.bold,
    fontSize: 20,
  },

  // Profile card — web: px-4 pt-2 wrapper, inner: p-4 rounded-md border border-white/10 bg-white/[0.02]
  profileCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_DIM,
  },

  // "Trader" label — web: font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase
  traderLabel: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: MONO.regular,
  },

  // Name — web: font-display font-bold text-base mt-1
  profileName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: DISPLAY.bold,
    marginTop: 4,
  },

  // Email — web: font-mono text-xs text-white/50
  profileEmail: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 12,
    fontFamily: MONO.regular,
  },

  // Challenge badge — web: mt-2 inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-neon
  challengeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  // dot — web: w-1.5 h-1.5 rounded-full bg-neon
  challengeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NEON,
    marginRight: 4,
  },
  challengeText: {
    color: NEON,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: MONO.regular,
  },

  // Nav scroll area — web: px-4 mt-6 flex flex-col gap-1
  menuScroll: {
    flex: 1,
    paddingTop: 8,
  },

  // Admin/Staff OS item — web: mt-4 text-neon bg-[#39FF14]/[0.06] border border-[#39FF14]/30
  // Always has neon styling regardless of active state (different from regular nav items)
  adminItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(57,255,20,0.06)",
    borderColor: "rgba(57,255,20,0.30)",
  },
  adminIcon: {
    marginRight: 12,
  },
  adminLabel: {
    color: NEON,
    fontSize: 14,
    fontFamily: DISPLAY.bold,
  },

  // Bottom section
  bottomSection: {
    paddingBottom: 6,
  },

  // Separator — web: border-t border-white/10 equivalent
  separator: {
    height: 1,
    backgroundColor: BORDER_DIM,
    marginHorizontal: 24,
    marginBottom: 6,
  },

  // Sign Out button — web: text-white/60 border border-white/10 (static, not conditional)
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_DIM,
  },
  signOutText: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 14,
    fontFamily: BODY.regular,
  },
});
