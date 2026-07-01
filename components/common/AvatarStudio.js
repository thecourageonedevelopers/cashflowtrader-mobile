/**
 * AvatarStudio — RN port of web src/components/AvatarStudio.jsx
 *
 * Web uses react-easy-crop (DOM canvas). RN uses expo-image-picker with
 * allowsEditing: true / aspect [1,1], which invokes the OS-native crop UI
 * — functionally equivalent and better suited to mobile.
 *
 * Two tabs, matching web exactly:
 *   • Upload & crop — picker → native crop → FormData → POST /profile/avatar
 *   • Choose an avatar — 6 preset CDN images → POST /profile/avatar-preset
 *
 * On success: setUser(data) immediately updates AuthContext (same as web).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { profileApi } from "../../src/api/profile";
import { useAuth } from "../../src/hooks/useAuth";
import { useAlert } from "../../src/context/AlertContext";
import { extractApiError } from "../../src/utils/apiError";

// ─── Design tokens (match web AvatarStudio) ───────────────────────────────────
const NEON = "#39FF14";
const SURFACE = "#0a0a0a";
const BORDER_DIM = "rgba(255,255,255,0.08)";
const BORDER_NEON = "rgba(57,255,20,0.30)";

// ─── Preset avatars — exact same CDN URLs as web AvatarStudio.jsx ─────────────
const PRESET_AVATARS = [
  { key: "bull",    url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/d53670de6d794224f103a8535cb76f710c5e0cc169dd244b3eda52a6733a0337.png" },
  { key: "bear",    url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/c17efb3ad2e554cdc0d73183b794fb2af1294c141f281d12f3864cd0e2d288fe.png" },
  { key: "fox",     url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/9b31d4641df607ee42fccb39a6ba2dd9a72a2b82a00acad02b58cfbabd98b675.png" },
  { key: "owl",     url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/1dc794b7b22bf9247949d364957716f733cc0c75b6230bf0e4f7008003fb7f2f.png" },
  { key: "candles", url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/4b4e99a42d3242314eae5e02be00217b2cb28e4c0af863bf455369c10727cc95.png" },
  { key: "rocket",  url: "https://static.prod-images.emergentagent.com/jobs/ea6ae3d3-45b8-476e-b912-6d91c7ef9926/images/2318853008f0ac08563e72258b66dc880b942b7b2143f9c6cdfcbab77032b4fb.png" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvatarStudio({ visible, onClose }) {
  const { setUser } = useAuth();
  const { showAlert } = useAlert();

  const [tab, setTab] = useState("upload");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  // ── Reset state when closed ──────────────────────────────────────────────
  const handleClose = () => {
    setTab("upload");
    setSelected(null);
    setBusy(false);
    onClose?.();
  };

  // ── Upload tab — pick from library, native crop, POST multipart ──────────
  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        type: "error",
        title: "Permission required",
        message: "Allow photo library access in Settings to upload a profile picture.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,  // triggers OS-native crop (equivalent to react-easy-crop)
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: "avatar.jpg",
      });
      const { data } = await profileApi.uploadAvatar(formData);
      setUser?.(data);
      showAlert({ type: "success", title: "Profile picture updated.", message: "" });
      handleClose();
    } catch (err) {
      showAlert({ type: "error", title: "Upload failed", message: extractApiError(err) });
    } finally {
      setBusy(false);
    }
  };

  // ── Preset tab — POST avatar-preset URL ──────────────────────────────────
  const savePreset = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await profileApi.setAvatarPreset(selected);
      setUser?.(data);
      showAlert({ type: "success", title: "Avatar updated.", message: "" });
      handleClose();
    } catch (err) {
      showAlert({ type: "error", title: "Could not set avatar", message: extractApiError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap outside closes */}
      <View style={s.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />

        {/* Sheet — matches web: max-w-md, rounded-2xl, border-neon/30, bg-[#0a0a0a] */}
        <View style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Set your picture</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* ── Tabs — matches web: bg-black/40 border-white/10 p-1 rounded-lg ── */}
          <View style={s.tabBar}>
            {[["upload", "Upload & crop"], ["preset", "Choose an avatar"]].map(([k, l]) => (
              <TouchableOpacity
                key={k}
                style={[s.tab, tab === k && s.tabActive]}
                onPress={() => setTab(k)}
                activeOpacity={0.8}
              >
                <Text style={[s.tabText, tab === k && s.tabTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Body ── */}
          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {tab === "upload" ? (
              // ── Upload tab ──────────────────────────────────────────────────
              <View>
                {/* Drop zone — matches web label.h-44.border-dashed.hover:border-neon/50 */}
                <TouchableOpacity
                  style={s.dropZone}
                  onPress={busy ? undefined : pickAndUpload}
                  activeOpacity={0.75}
                >
                  <Ionicons name="image-outline" size={36} color={NEON} />
                  <Text style={s.dropTitle}>Tap to choose a photo</Text>
                  <Text style={s.dropSub}>PNG, JPG or WEBP · max 5 MB</Text>
                  <Text style={s.dropNote}>Square crop applied automatically.</Text>
                </TouchableOpacity>

                {/* Save button */}
                <TouchableOpacity
                  style={[s.neonBtn, busy && s.neonBtnDisabled]}
                  onPress={busy ? undefined : pickAndUpload}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#000" />
                      <Text style={s.neonBtnText}>Upload picture</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // ── Preset tab ──────────────────────────────────────────────────
              <View>
                <Text style={s.presetDesc}>
                  Not into selfies? Pick an avatar that fits your trading spirit.
                </Text>

                {/* 3-col grid — matches web grid-cols-3 gap-3 */}
                <View style={s.presetGrid}>
                  {PRESET_AVATARS.map((a) => (
                    <TouchableOpacity
                      key={a.key}
                      style={[s.presetItem, selected === a.url && s.presetItemActive]}
                      onPress={() => setSelected(a.url)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: a.url }}
                        style={s.presetImg}
                        resizeMode="cover"
                      />
                      {selected === a.url && (
                        <View style={s.presetCheck}>
                          <Ionicons name="checkmark" size={11} color="#000" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Use this avatar button */}
                <TouchableOpacity
                  style={[s.neonBtn, (!selected || busy) && s.neonBtnDisabled]}
                  onPress={savePreset}
                  disabled={!selected || busy}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#000" />
                      <Text style={s.neonBtnText}>Use this avatar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Backdrop — matches web: fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Sheet — matches web: w-full max-w-md rounded-2xl border border-[#39FF14]/30 bg-[#0a0a0a] shadow
  sheet: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_NEON,
    overflow: "hidden",
    shadowColor: NEON,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },

  // Header — matches web: flex items-center justify-between gap-3 p-5 border-b border-white/10
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DIM,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.2,
  },

  // Tabs — matches web: flex p-1 m-5 mb-0 bg-black/40 border border-white/10 rounded-lg
  tabBar: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: NEON,
  },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: {
    color: "#000",
    fontFamily: "Inter_700Bold",
  },

  // Body
  body: { maxHeight: 380 },
  bodyContent: { padding: 16 },

  // Drop zone — matches web: label.h-44.border-dashed.border-white/15.hover:border-neon/50
  dropZone: {
    height: 160,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  dropTitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  dropSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dropNote: {
    color: "rgba(57,255,20,0.5)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Neon CTA — matches web: neon-btn w-full py-3 rounded-xl
  neonBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: NEON,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
    shadowColor: NEON,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  neonBtnDisabled: { opacity: 0.4 },
  neonBtnText: {
    color: "#000",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  // Preset tab
  presetDesc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
    lineHeight: 20,
  },
  // 3-col grid — matches web grid-cols-3 gap-3
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  presetItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.10)",
  },
  presetItemActive: {
    borderColor: NEON,
    shadowColor: NEON,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  presetImg: {
    width: "100%",
    height: "100%",
  },
  // Check badge — matches web: absolute top-1 right-1 w-5 h-5 rounded-full bg-neon
  presetCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: NEON,
    justifyContent: "center",
    alignItems: "center",
  },
});
