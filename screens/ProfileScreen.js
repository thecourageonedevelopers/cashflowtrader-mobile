import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { useAuth } from "../src/hooks/useAuth";
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
  daily_goal: "",
  weekly_goal: "",
  monthly_goal: "",
  yearly_goal: "",
  weekly_pnl_target: "",
  monthly_pnl_target: "",
  currency: "USD",
  trader_archetype: "",
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ icon, label }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={13} color={PRIMARY} />
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

function FormField({ label, children }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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
        <Ionicons name="chevron-down-outline" size={16} color="#555" />
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
  const { showAlert, showOptions } = useAlert();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // ── Operation states ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // ── Hydrate form from profile ──────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      mobile: profile.mobile ?? "",
      timezone: profile.timezone ?? "",
      bio: profile.bio ?? "",
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

  const avatarUrl = profile?.avatar_url || user?.avatar_url;
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

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!form.name.trim()) {
      showAlert({ type: "warning", title: "Required", message: "Full name cannot be empty." });
      return;
    }
    setSaving(true);
    try {
      await profileApi.update({
        ...form,
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

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const handleAvatarPress = () => {
    const buttons = [
      { text: "Choose from Library", onPress: handlePickImage },
    ];
    if (avatarUrl) {
      buttons.push({ text: "Remove Photo", style: "destructive", onPress: handleDeleteAvatar });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    showOptions({ title: "Profile Photo", message: "Update your profile picture", buttons });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({ type: "warning", title: "Permission Needed", message: "Allow Cashflow Trader to access your photos to upload a profile picture." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", {
        uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "avatar.jpg",
      });
      await profileApi.uploadAvatar(fd);
      await refresh();
      showAlert({ type: "success", title: "Updated", message: "Profile photo updated." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: extractApiError(e) });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    try {
      await profileApi.deleteAvatar();
      await refresh();
      showAlert({ type: "success", title: "Removed", message: "Profile photo removed." });
    } catch (e) {
      showAlert({ type: "error", title: "Error", message: extractApiError(e) });
    } finally {
      setAvatarLoading(false);
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

          {/* ───── Identity / Avatar ───── */}
          <View style={styles.card}>
            <View style={styles.identityRow}>
              {/* Avatar */}
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={handleAvatarPress}
                disabled={avatarLoading}
                activeOpacity={0.8}
              >
                {avatarLoading ? (
                  <View style={styles.avatar}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                  </View>
                )}
                <View style={styles.cameraBtn}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Name + badge */}
              <View style={styles.identityInfo}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>MY PROFILE</Text>
                </View>
                <Text style={styles.identityName} numberOfLines={1}>
                  {user?.name || "Trader"}
                </Text>
                <Text style={styles.identityEmail} numberOfLines={1}>
                  {user?.email || ""}
                </Text>
              </View>
            </View>
            <Text style={styles.identityHint}>
              Edit your identity, goals, and P&L targets. The system measures you against them automatically.
            </Text>
          </View>

          {/* ───── Goal Progress ───── */}
          {goalProgress && (
            <View style={styles.card}>
              <SectionHeader icon="sparkles-outline" label="Goal Progress" />
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
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="EMAIL (READ-ONLY)">
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email ?? ""}
                editable={false}
              />
            </FormField>

            <FormField label="MOBILE">
              <TextInput
                style={styles.input}
                value={form.mobile}
                onChangeText={(v) => update("mobile", v)}
                placeholder="+91 ..."
                placeholderTextColor="#3a3a3a"
                keyboardType="phone-pad"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="TIMEZONE">
              <TextInput
                style={styles.input}
                value={form.timezone}
                onChangeText={(v) => update("timezone", v)}
                placeholder="e.g. Asia/Kolkata"
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <PickerTrigger
              label="TRADER ARCHETYPE"
              displayValue={form.trader_archetype || ""}
              placeholder="Auto (from onboarding)"
              onPress={() => setArchetypePickerOpen(true)}
            />

            <FormField label="TRADER BIO">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.bio}
                onChangeText={(v) => update("bio", v)}
                placeholder="e.g. Patient breakout trader. NIFTY index. 1% risk. Mornings only."
                placeholderTextColor="#3a3a3a"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={PRIMARY}
              />
            </FormField>
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
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="WEEKLY GOAL">
              <TextInput
                style={styles.input}
                value={form.weekly_goal}
                onChangeText={(v) => update("weekly_goal", v)}
                placeholder="e.g. Follow plan every day, log every trade"
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="MONTHLY GOAL">
              <TextInput
                style={styles.input}
                value={form.monthly_goal}
                onChangeText={(v) => update("monthly_goal", v)}
                placeholder="e.g. 60% win rate, zero revenge trades"
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label="YEARLY GOAL">
              <TextInput
                style={styles.input}
                value={form.yearly_goal}
                onChangeText={(v) => update("yearly_goal", v)}
                placeholder="e.g. Quit job by Dec, scale to ₹50L capital"
                placeholderTextColor="#3a3a3a"
                selectionColor={PRIMARY}
              />
            </FormField>

            <FormField label={`WEEKLY P&L TARGET (${sym})`}>
              <TextInput
                style={styles.input}
                value={form.weekly_pnl_target}
                onChangeText={(v) => update("weekly_pnl_target", v)}
                placeholder="15000"
                placeholderTextColor="#3a3a3a"
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
                placeholderTextColor="#3a3a3a"
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
                  placeholderTextColor="#3a3a3a"
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
                    color="#555"
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
                  placeholderTextColor="#3a3a3a"
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
                    color="#555"
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
                ? <ActivityIndicator size="small" color={PRIMARY} />
                : <Ionicons name="checkmark-circle-outline" size={18} color={PRIMARY} />
              }
              <Text style={styles.pwBtnText}>
                {pwSaving ? "Updating..." : "Update Password"}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

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

const CARD_BG      = "#0d0d0d";
const CARD_BORDER  = "#1e1e1e";
const INPUT_BG     = "#111";
const INPUT_BORDER = "#262626";
const LABEL_COLOR  = "#555";
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
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    gap: 14,
  },

  cardLast: {
    marginBottom: 0,
  },

  // ── Section header ──────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },

  sectionHeaderText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  // ── Identity ────────────────────────────────────────────────────────────
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  avatarWrap: {
    position: "relative",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },

  avatarInitial: {
    color: "#000",
    fontSize: 28,
    fontWeight: "900",
  },

  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: CARD_BG,
    justifyContent: "center",
    alignItems: "center",
  },

  identityInfo: {
    flex: 1,
    gap: 4,
  },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  identityName: {
    color: TEXT_COLOR,
    fontSize: 17,
    fontWeight: "700",
  },

  identityEmail: {
    color: "#666",
    fontSize: 12,
  },

  identityHint: {
    color: "#555",
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Goal progress ────────────────────────────────────────────────────────
  twoCol: {
    gap: 10,
  },

  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },

  goalBar: {
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    gap: 6,
  },

  goalBarTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  goalBarLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },

  goalBarPct: {
    fontSize: 13,
    fontWeight: "900",
  },

  goalBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1a1a1a",
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
    color: "#555",
    fontSize: 10,
  },

  statCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    flex: 1,
  },

  statLabel: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  statValue: {
    color: TEXT_COLOR,
    fontSize: 20,
    fontWeight: "900",
  },

  statHint: {
    color: "#555",
    fontSize: 9,
    marginTop: 2,
  },

  // ── Form ────────────────────────────────────────────────────────────────
  formField: {
    gap: 6,
  },

  fieldLabel: {
    color: LABEL_COLOR,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT_COLOR,
    fontSize: 15,
  },

  inputDisabled: {
    color: "#444",
    opacity: 0.6,
  },

  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },

  pickerTrigger: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pickerValue: {
    color: TEXT_COLOR,
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },

  pickerPlaceholder: {
    color: "#3a3a3a",
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
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 10,
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
  },

  saveBtnBusy: {
    opacity: 0.65,
  },

  saveBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },

  // ── Password button ──────────────────────────────────────────────────────
  pwBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
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
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
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
    borderColor: "#1e1e1e",
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
    borderBottomColor: "#1e1e1e",
  },

  modalTitle: {
    color: TEXT_COLOR,
    fontSize: 15,
    fontWeight: "700",
  },

  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0f0f0f",
  },

  modalOptionActive: {
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  modalOptionText: {
    color: "#aaa",
    fontSize: 15,
  },

  modalOptionTextActive: {
    color: TEXT_COLOR,
    fontWeight: "600",
  },
});
