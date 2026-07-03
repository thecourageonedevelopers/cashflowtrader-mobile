import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import ScreenLayout from "../components/common/ScreenLayout";
import AvatarStudio from "../components/common/AvatarStudio";
import { PRIMARY } from "../components/auth/AuthStyles";
import { DISPLAY, MONO, BODY } from "../src/theme/typography";
import { useAuth } from "../src/hooks/useAuth";
import { useAvatarUrl } from "../src/lib/avatar";
import { profileApi } from "../src/api/profile";
import { currencySymbol } from "../src/utils/format";
import { extractApiError } from "../src/utils/apiError";
import client from "../src/api/client";
import { useAlert } from "../src/context/AlertContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "INR", label: "₹ INR — Indian Rupee" },
];

const EMPTY_FORM = {
  name: "",
  mobile: "",
  timezone: "",
  bio: "",
  occupation: "",
  trader_persona: "",
  daily_goal: "",
  weekly_goal: "",
  monthly_goal: "",
  yearly_goal: "",
  weekly_pnl_target: "",
  monthly_pnl_target: "",
  currency: "USD",
  trader_archetype: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={11} color="rgba(57,255,20,0.8)" />
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

function FormField({ label, hint, children }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function ProtectedField({ label, value, verified, changeLabel = "Change", onChangePress }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.protectedRow}>
        <View style={styles.protectedDisplay}>
          <Text style={styles.protectedValue} numberOfLines={1}>{value || "Not set"}</Text>
          {verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark-outline" size={11} color={PRIMARY} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.changeBtn} onPress={onChangePress} activeOpacity={0.75}>
          <Text style={styles.changeBtnText}>{changeLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PickerTrigger({ label, displayValue, placeholder, onPress }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerTrigger} onPress={onPress} activeOpacity={0.75}>
        <Text style={[styles.pickerValue, !displayValue && styles.pickerPlaceholder]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down-outline" size={16} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({ visible, title, options, selectedValue, onSelect, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  selectedValue === item.value && styles.modalOptionActive,
                ]}
                onPress={() => { onSelect(item.value); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedValue === item.value && styles.modalOptionTextActive,
                ]}>
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={18} color={PRIMARY} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function GoalBar({ label, value, target, symbol }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((value / target) * 100))) : 0;
  const barColor = value >= 0 ? PRIMARY : "#ef4444";
  return (
    <View style={styles.goalBar}>
      <View style={styles.goalBarTop}>
        <Text style={styles.goalBarLabel}>{label}</Text>
        <Text style={[styles.goalBarPct, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={styles.goalBarTrack}>
        <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.goalBarBottom}>
        <Text style={styles.goalBarMeta}>{symbol}{(value || 0).toLocaleString()}</Text>
        <Text style={styles.goalBarMeta}>{symbol}{(target || 0).toLocaleString()}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  const { user, refresh } = useAuth();
  const { showAlert } = useAlert();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // ── Operation states ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);

  // ── Picker modal visibility ────────────────────────────────────────────────
  const [archetypePickerOpen, setArchetypePickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: profile,
    isLoading,
    isError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get().then((r) => r.data),
  });

  const {
    data: goalProgress,
    refetch: refetchGoalProgress,
  } = useQuery({
    queryKey: ["goalProgress"],
    queryFn: () => profileApi.getGoalProgress().then((r) => r.data),
  });

  const { data: archetypeData = [] } = useQuery({
    queryKey: ["archetypes"],
    queryFn: () =>
      client.get("/transformation/archetypes").then((r) => r.data || []),
    staleTime: 10 * 60 * 1000,
  });

  // ── Avatar URL (resolves picture → displayable URL with auth header) ────────
  const avatarUrl = useAvatarUrl(profile?.picture ?? user?.picture);

  // ── Hydrate form from profile ──────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      mobile: profile.mobile ?? "",
      timezone: profile.timezone ?? "",
      bio: profile.bio ?? "",
      occupation: profile.occupation ?? "",
      trader_persona: profile.trader_persona ?? "",
      daily_goal: profile.daily_goal ?? "",
      weekly_goal: profile.weekly_goal ?? "",
      monthly_goal: profile.monthly_goal ?? "",
      yearly_goal: profile.yearly_goal ?? "",
      weekly_pnl_target: String(profile.weekly_pnl_target ?? ""),
      monthly_pnl_target: String(profile.monthly_pnl_target ?? ""),
      currency: profile.currency ?? "USD",
      trader_archetype: profile.trader_archetype ?? "",
    });
  }, [profile]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const sym = useMemo(() => currencySymbol(form.currency), [form.currency]);

  const archetypeOptions = useMemo(() => [
    { value: "", label: "Auto (from onboarding)" },
    ...archetypeData.map((a) => ({ value: a.name, label: a.name })),
  ], [archetypeData]);

  const avatarInitial = (user?.name || user?.email || "T").trim().charAt(0).toUpperCase();

  const currencyLabel = useMemo(
    () => CURRENCIES.find((c) => c.value === form.currency)?.label ?? form.currency,
    [form.currency],
  );

  const update = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchGoalProgress()]);
    setRefreshing(false);
  }, [refetchProfile, refetchGoalProgress]);

  // ── Save profile — excludes mobile & timezone (protected, changed via verified flows) ─
  const handleSaveProfile = async () => {
    if (!form.name.trim()) {
      showAlert({ type: "warning", title: "Required", message: "Full name cannot be empty." });
      return;
    }
    setSaving(true);
    try {
      const { mobile, timezone, ...editable } = form;
      await profileApi.update({
        ...editable,
        weekly_pnl_target: Number(form.weekly_pnl_target) || 0,
        monthly_pnl_target: Number(form.monthly_pnl_target) || 0,
      });
      await refresh();
      await refetchGoalProgress();
      showAlert({ type: "success", title: "Saved", message: "Profile updated successfully." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: extractApiError(e) });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pw.current_password || !pw.new_password) {
      showAlert({ type: "warning", title: "Required", message: "Please fill both password fields." });
      return;
    }
    if (pw.new_password.length < 6) {
      showAlert({ type: "warning", title: "Too Short", message: "New password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    try {
      await profileApi.changePassword(pw.current_password, pw.new_password);
      setPw({ current_password: "", new_password: "" });
      showAlert({ type: "success", title: "Updated", message: "Password changed successfully." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: extractApiError(e) });
    } finally {
      setPwSaving(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenLayout screenName="ProfileScreen" navigation={navigation}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </ScreenLayout>
    );
  }

  if (isError) {
    return (
      <ScreenLayout screenName="ProfileScreen" navigation={navigation}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#555" />
          <Text style={styles.errorText}>Could not load profile.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetchProfile} activeOpacity={0.75}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout screenName="ProfileScreen" navigation={navigation}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >

          {/* ───── Identity / Hero ───── */}
          <View style={[styles.card, styles.heroCard]}>
            {/* Green glow orb — matches web absolute -top-24 -right-24 blob */}
            <View style={styles.heroGlow} pointerEvents="none" />

            <View style={styles.identityRow}>
              {/* Avatar with camera button overlay */}
              <View style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() => setStudioOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={14} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Chip + heading + sub */}
              <View style={styles.identityInfo}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={11} color="rgba(57,255,20,0.8)" />
                  <Text style={styles.sectionHeaderText}>My Profile</Text>
                </View>
                <Text style={styles.heroHeading}>
                  Edit your{" "}
                  <Text style={styles.heroHeadingAccent}>identity & goals</Text>.
                </Text>
                <Text style={styles.identityHint}>
                  Your name, your numbers, your weekly & monthly targets. The system measures you against them — automatically.
                </Text>
              </View>
            </View>
          </View>

          {/* ───── Goal Progress ───── */}
          {goalProgress && (
            <View style={styles.card}>
              <View style={styles.goalProgressHeader}>
                <SectionHeader icon="sparkles-outline" label="Goal Progress" />
                <TouchableOpacity onPress={() => refetchGoalProgress()} activeOpacity={0.75}>
                  <Text style={styles.refreshLink}>Refresh</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.twoCol}>
                <GoalBar
                  label="Weekly P&L vs Target"
                  value={goalProgress.weekly?.net_pnl ?? 0}
                  target={goalProgress.weekly?.target ?? 0}
                  symbol={sym}
                />
                <GoalBar
                  label="Monthly P&L vs Target"
                  value={goalProgress.monthly?.net_pnl ?? 0}
                  target={goalProgress.monthly?.target ?? 0}
                  symbol={sym}
                />
              </View>
              <View style={styles.twoColRow}>
                <StatCard
                  label="WEEKLY WIN RATE"
                  value={`${goalProgress.weekly?.win_rate ?? 0}%`}
                  hint={`${goalProgress.weekly?.trades ?? 0} trades in 7d`}
                />
                <StatCard
                  label="MONTHLY WIN RATE"
                  value={`${goalProgress.monthly?.win_rate ?? 0}%`}
                  hint={`${goalProgress.monthly?.trades ?? 0} trades in 30d`}
                />
              </View>
            </View>
          )}

          {/* ───── Basic Details ───── */}
          <View style={styles.card}>
            <SectionHeader icon="person-outline" label="Basic Details" />

            <FormField label="FULL NAME">
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => update("name", v)}
                placeholder="Your full name"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>

            <ProtectedField
              label="EMAIL"
              value={user?.email}
              verified={user?.email_verified !== false}
              onChangePress={() =>
                showAlert({ type: "info", title: "Change Email", message: "Email changes are managed via the web app for security verification." })
              }
            />

            <ProtectedField
              label="MOBILE"
              value={form.mobile}
              verified={!!user?.mobile_verified || !!user?.mobile_locked}
              changeLabel={form.mobile ? "Change" : "Add"}
              onChangePress={() =>
                showAlert({ type: "info", title: "Change Mobile", message: "Mobile number changes require OTP verification. Use the web app to update." })
              }
            />

            <ProtectedField
              label="TIMEZONE"
              value={form.timezone}
              verified={!!form.timezone}
              changeLabel={form.timezone ? "Change" : "Set"}
              onChangePress={() =>
                showAlert({ type: "info", title: "Change Timezone", message: "Use the web app to select your timezone." })
              }
            />

            <PickerTrigger
              label="TRADER ARCHETYPE"
              displayValue={form.trader_archetype || ""}
              placeholder="Auto (from onboarding)"
              onPress={() => setArchetypePickerOpen(true)}
            />

            <FormField label="TRADER PERSONA / BIO">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.bio}
                onChangeText={(v) => update("bio", v)}
                placeholder="e.g. Patient breakout trader. NIFTY index. 1% risk. Mornings only."
                placeholderTextColor="rgba(255,255,255,0.30)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField
              label="WHAT YOU DO (OCCUPATION)"
              hint="Used to personalise your achievement certificates — your story matters."
            >
              <TextInput
                style={styles.input}
                value={form.occupation}
                onChangeText={(v) => update("occupation", v)}
                placeholder="e.g. taxi driver, student, software engineer"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>
          </View>

          {/* ───── Security ───── */}
          <View style={styles.card}>
            <SectionHeader icon="shield-checkmark-outline" label="Security" />

            {/* Email & Mobile verification status */}
            <View style={styles.securityVerifyGrid}>
              <View style={styles.securityVerifyRow}>
                <View style={styles.securityRowInfo}>
                  <Text style={styles.securityRowLabel}>Email</Text>
                  <Text style={styles.securityRowValue} numberOfLines={1}>{user?.email || "Not set"}</Text>
                </View>
                {user?.email_verified !== false && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={PRIMARY} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>

              <View style={styles.securityVerifyRow}>
                <View style={styles.securityRowInfo}>
                  <Text style={styles.securityRowLabel}>Mobile</Text>
                  <Text style={styles.securityRowValue} numberOfLines={1}>{user?.mobile || "Not set"}</Text>
                </View>
                {(!!user?.mobile_verified || !!user?.mobile_locked) && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={PRIMARY} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Password row */}
            <View style={styles.securityPwRow}>
              <View style={styles.securityPwLeft}>
                <View style={styles.securityPwIconBox}>
                  <Ionicons name="key-outline" size={18} color={PRIMARY} />
                </View>
                <View>
                  <Text style={styles.securityRowLabel}>Password</Text>
                  <Text style={styles.securityRowValue}>
                    {user?.has_password ? "Password set" : "No password set"}
                  </Text>
                </View>
              </View>
              {user?.has_password ? (
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => {
                    // Scroll to Change Password section below
                    showAlert({ type: "info", title: "Change Password", message: "Use the Change Password section below to update your password." });
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.changeBtnText}>Change Password</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.neonSmallBtn}
                  onPress={() =>
                    showAlert({ type: "info", title: "Create Password", message: "Use the Change Password section below to set a new password." })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.neonSmallBtnText}>Create Password</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Security footer — forgot + linked logins */}
            <View style={styles.securityFooter}>
              {user?.has_password && (
                <TouchableOpacity
                  onPress={() =>
                    showAlert({ type: "info", title: "Forgot Password", message: "Use the web app to reset your password via email." })
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.securityMeta}>
                Linked logins:{" "}
                <Text style={{ color: "rgba(255,255,255,0.6)" }}>
                  {(user?.auth_providers || []).join(", ") || "password"}
                </Text>
              </Text>
              <Text style={[styles.securityMeta, { color: "rgba(255,255,255,0.25)" }]}>
                Two-Factor Authentication · Active Sessions (coming soon)
              </Text>
            </View>
          </View>

          {/* ───── Goals ───── */}
          <View style={styles.card}>
            <SectionHeader icon="trophy-outline" label="Goals" />

            <FormField label="DAILY GOAL">
              <TextInput
                style={styles.input}
                value={form.daily_goal}
                onChangeText={(v) => update("daily_goal", v)}
                placeholder="e.g. Take only A+ setups, 2 trades max"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="WEEKLY GOAL">
              <TextInput
                style={styles.input}
                value={form.weekly_goal}
                onChangeText={(v) => update("weekly_goal", v)}
                placeholder="e.g. Follow plan every day, log every trade"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="MONTHLY GOAL">
              <TextInput
                style={styles.input}
                value={form.monthly_goal}
                onChangeText={(v) => update("monthly_goal", v)}
                placeholder="e.g. 60% win rate, zero revenge trades"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="YEARLY GOAL">
              <TextInput
                style={styles.input}
                value={form.yearly_goal}
                onChangeText={(v) => update("yearly_goal", v)}
                placeholder="e.g. Quit job by Dec, scale to ₹50L capital"
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label={`WEEKLY P&L TARGET (${sym})`}>
              <TextInput
                style={styles.input}
                value={form.weekly_pnl_target}
                onChangeText={(v) => update("weekly_pnl_target", v)}
                placeholder="15000"
                placeholderTextColor="rgba(255,255,255,0.30)"
                keyboardType="numeric"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label={`MONTHLY P&L TARGET (${sym})`}>
              <TextInput
                style={styles.input}
                value={form.monthly_pnl_target}
                onChangeText={(v) => update("monthly_pnl_target", v)}
                placeholder="60000"
                placeholderTextColor="rgba(255,255,255,0.30)"
                keyboardType="numeric"
                selectionColor={PRIMARY}
              />
            </FormField>

            <PickerTrigger
              label="CURRENCY"
              displayValue={currencyLabel}
              placeholder="Select currency"
              onPress={() => setCurrencyPickerOpen(true)}
            />
          </View>

          {/* ───── Save Profile ───── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnBusy]}
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#000" />
              : <Ionicons name="save-outline" size={18} color="#000" />
            }
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
          </TouchableOpacity>

          {/* ───── Change Password ───── */}
          <View style={[styles.card, styles.cardLast]}>
            <SectionHeader icon="lock-closed-outline" label="Change Password" />

            <FormField label="CURRENT PASSWORD">
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, styles.pwInput]}
                  value={pw.current_password}
                  onChangeText={(v) => setPw((p) => ({ ...p, current_password: v }))}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  secureTextEntry={!showCurrentPw}
                  autoComplete="current-password"
                  autoCorrect={false}
                  selectionColor={PRIMARY}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowCurrentPw((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showCurrentPw ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(255,255,255,0.45)"
                  />
                </TouchableOpacity>
              </View>
            </FormField>

            <FormField label="NEW PASSWORD (MIN 6 CHARS)">
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, styles.pwInput]}
                  value={pw.new_password}
                  onChangeText={(v) => setPw((p) => ({ ...p, new_password: v }))}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  secureTextEntry={!showNewPw}
                  autoComplete="new-password"
                  autoCorrect={false}
                  selectionColor={PRIMARY}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPw((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNewPw ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(255,255,255,0.45)"
                  />
                </TouchableOpacity>
              </View>
            </FormField>

            <TouchableOpacity
              style={[styles.pwBtn, pwSaving && styles.pwBtnBusy]}
              onPress={handleChangePassword}
              disabled={pwSaving}
              activeOpacity={0.8}
            >
              {pwSaving
                ? <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
                : <Ionicons name="checkmark-circle-outline" size={18} color="rgba(255,255,255,0.85)" />
              }
              <Text style={styles.pwBtnText}>
                {pwSaving ? "Updating..." : "Update Password"}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── AvatarStudio modal ── */}
      <AvatarStudio visible={studioOpen} onClose={() => setStudioOpen(false)} />

      {/* ── Archetype picker modal ── */}
      <PickerModal
        visible={archetypePickerOpen}
        title="Trader Archetype"
        options={archetypeOptions}
        selectedValue={form.trader_archetype}
        onSelect={(v) => update("trader_archetype", v)}
        onClose={() => setArchetypePickerOpen(false)}
      />

      {/* ── Currency picker modal ── */}
      <PickerModal
        visible={currencyPickerOpen}
        title="Currency"
        options={CURRENCIES}
        selectedValue={form.currency}
        onSelect={(v) => update("currency", v)}
        onClose={() => setCurrencyPickerOpen(false)}
      />
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG      = "rgba(10,10,10,0.9)";
const CARD_BORDER  = "rgba(255,255,255,0.10)";
const INPUT_BG     = "rgba(255,255,255,0.03)";
const INPUT_BORDER = "rgba(255,255,255,0.10)";
const LABEL_COLOR  = "rgba(255,255,255,0.45)";
const TEXT_COLOR   = "#fff";

const styles = StyleSheet.create({
  flex: { flex: 1 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
  },

  errorText: {
    color: "#777",
    fontSize: 15,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },

  retryText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  scrollContentDesktop: {
    paddingHorizontal: 32,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    gap: 14,
  },

  heroCard: {
    borderColor: "rgba(57,255,20,0.18)",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
    overflow: "hidden",
  },

  cardLast: {
    marginBottom: 0,
  },

  // ── Hero glow orb — matches web absolute -top-24 -right-24 blur-3xl ────
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(57,255,20,0.10)",
  },

  // ── Section header chip ──────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.30)",
    backgroundColor: "rgba(57,255,20,0.08)",
  },

  sectionHeaderText: {
    color: "rgba(57,255,20,0.80)",
    fontSize: 11,
    fontFamily: MONO.regular,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Identity / Hero ──────────────────────────────────────────────────────
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },

  avatarWrap: {
    width: 80,
    height: 80,
    flexShrink: 0,
    position: "relative",
  },

  // Avatar circle — matches web w-20 h-20 rounded-full with neon glow
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },

  // Avatar image — same size, rounded
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },

  avatarInitial: {
    color: "#000",
    fontSize: 32,
    fontFamily: DISPLAY.extraBold,
  },

  // Camera button — matches web absolute -bottom-1 -right-1 w-8 h-8
  cameraBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  identityInfo: {
    flex: 1,
    gap: 6,
  },

  heroHeading: {
    color: TEXT_COLOR,
    fontSize: 26,
    fontFamily: DISPLAY.extraBold,
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  heroHeadingAccent: {
    color: PRIMARY,
  },

  identityHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: BODY.regular,
    lineHeight: 18,
  },

  // ── Goal Progress header ─────────────────────────────────────────────────
  goalProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  refreshLink: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Goal Progress content ────────────────────────────────────────────────
  twoCol: {
    gap: 10,
  },

  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },

  goalBar: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    gap: 6,
  },

  goalBarTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  goalBarLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },

  goalBarPct: {
    fontSize: 13,
    fontFamily: MONO.bold,
  },

  goalBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },

  goalBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  goalBarBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  goalBarMeta: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontFamily: BODY.regular,
  },

  statCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    flex: 1,
  },

  statLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontFamily: MONO.regular,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  statValue: {
    color: TEXT_COLOR,
    fontSize: 20,
    fontFamily: MONO.bold,
  },

  statHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    fontFamily: BODY.regular,
    marginTop: 2,
  },

  // ── Form ────────────────────────────────────────────────────────────────
  formField: {
    gap: 6,
  },

  fieldLabel: {
    color: LABEL_COLOR,
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  fieldHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontFamily: BODY.regular,
    lineHeight: 14,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_COLOR,
    fontSize: 14,
    fontFamily: BODY.regular,
  },

  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
  },

  // ── Protected field (email / mobile / timezone) ──────────────────────────
  protectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  protectedDisplay: {
    flex: 1,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  protectedValue: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: BODY.regular,
    flex: 1,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },

  verifiedText: {
    color: PRIMARY,
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    flexShrink: 0,
  },

  changeBtnText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  pickerTrigger: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pickerValue: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontFamily: BODY.regular,
    flex: 1,
    marginRight: 8,
  },

  pickerPlaceholder: {
    color: "rgba(255,255,255,0.30)",
  },

  // ── Security section ────────────────────────────────────────────────────
  securityVerifyGrid: {
    gap: 8,
  },

  securityVerifyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  securityRowInfo: {
    flex: 1,
    minWidth: 0,
  },

  securityRowLabel: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 10,
    fontFamily: MONO.regular,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  securityRowValue: {
    color: TEXT_COLOR,
    fontSize: 13,
    fontFamily: BODY.regular,
  },

  securityPwRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  securityPwLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },

  securityPwIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(57,255,20,0.08)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  neonSmallBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },

  neonSmallBtnText: {
    color: "#000",
    fontSize: 10,
    fontFamily: DISPLAY.bold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  securityFooter: {
    gap: 6,
  },

  forgotLink: {
    color: "rgba(57,255,20,0.80)",
    fontSize: 11,
    fontFamily: BODY.regular,
  },

  securityMeta: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 11,
    fontFamily: BODY.regular,
    lineHeight: 16,
  },

  // ── Password row ─────────────────────────────────────────────────────────
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  pwInput: {
    flex: 1,
  },

  eyeBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
  },

  // ── Save button ──────────────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },

  saveBtnBusy: {
    opacity: 0.65,
  },

  saveBtnText: {
    color: "#000",
    fontSize: 16,
    fontFamily: DISPLAY.bold,
  },

  // ── Password button ──────────────────────────────────────────────────────
  pwBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },

  pwBtnBusy: {
    opacity: 0.65,
  },

  pwBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: DISPLAY.bold,
  },

  // ── Picker modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: CARD_BORDER,
    maxHeight: "65%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },

  modalTitle: {
    color: TEXT_COLOR,
    fontSize: 15,
    fontFamily: DISPLAY.bold,
  },

  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },

  modalOptionActive: {
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  modalOptionText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    fontFamily: BODY.regular,
  },

  modalOptionTextActive: {
    color: TEXT_COLOR,
    fontFamily: DISPLAY.bold,
  },
});
