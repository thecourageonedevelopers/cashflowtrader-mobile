import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";
import { useAuth } from "../src/hooks/useAuth";
import { supportApi } from "../src/api/support";
import { extractApiError } from "../src/utils/apiError";
import { useAlert } from "../src/context/AlertContext";

const supportOptions = [
  {
    id: 1,
    key: "support_call",
    title: "Request Support Call",
    description: "Talk to our team for help with the platform.",
    icon: "call-outline",
  },
  {
    id: 2,
    key: "mentorship",
    title: "Request Mentorship Consultation",
    description: "Book time with a senior mentor.",
    icon: "people-outline",
  },
  {
    id: 3,
    key: "account_opening",
    title: "Account Opening Assistance",
    description: "Set up your broker / trading account.",
    icon: "briefcase-outline",
  },
  {
    id: 4,
    key: "one_on_one",
    title: "Book One-On-One Session",
    description: "Personalized 60-min session.",
    icon: "calendar-outline",
  },
];

export default function SupportScreen({ navigation }) {
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const { user } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openRequestModal = (item) => {
    setSelectedOption(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setReason("");
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !reason.trim()) {
      showAlert({ type: "warning", title: "Required Fields", message: "Please fill in all fields." });
      return;
    }
    setSubmitting(true);
    try {
      await supportApi.submit({
        name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        reason: reason.trim(),
        request_type: selectedOption.key,
      });
      showAlert({ type: "success", title: "Request Sent", message: "Our team will reach out to you shortly.", onConfirm: () => { setModalVisible(false); setReason(""); } });
    } catch (e) {
      showAlert({ type: "error", title: "Submission Failed", message: extractApiError(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout screenName="SupportScreen" navigation={navigation}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons name="headset-outline" size={12} color={PRIMARY} />
            <Text style={styles.heroBadgeText}>SUPPORT</Text>
          </View>

          <Text style={styles.heroTitle}>
            We respond when{" "}
            <Text style={styles.heroGreen}>you ask.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Pick what you need.{"\n"}We'll be in touch.
          </Text>
        </View>

        {/* SUPPORT CARDS */}
        <View style={[styles.cardGrid, isDesktop && styles.cardGridDesktop]}>
          {supportOptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={styles.supportCard}
              onPress={() => openRequestModal(item)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={24} color={PRIMARY} />
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MODAL */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>SUPPORT REQUEST</Text>
                </View>

                <TouchableOpacity onPress={closeModal} disabled={submitting}>
                  <Ionicons name="close" size={22} color="#777" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>{selectedOption?.title}</Text>

              {/* FULL NAME */}
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#555"
                style={styles.input}
                editable={!submitting}
              />

              {/* EMAIL */}
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                editable={!submitting}
              />

              {/* MOBILE */}
              <Text style={styles.inputLabel}>MOBILE</Text>
              <TextInput
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter mobile number"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                style={styles.input}
                editable={!submitting}
              />

              {/* REASON */}
              <Text style={styles.inputLabel}>REASON</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Tell us briefly..."
                placeholderTextColor="#555"
                multiline
                textAlignVertical="top"
                style={styles.textArea}
                editable={!submitting}
              />

              {/* SUBMIT */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  /* HERO */

  heroSection: {
    marginBottom: 18,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 14,
  },

  heroBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginLeft: 6,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#a0a0a0",
    fontSize: 13,
    lineHeight: 20,
  },

  /* CARD GRID */

  cardGrid: {
    gap: 12,
  },

  cardGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  supportCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1c1c1c",
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },

  cardDescription: {
    color: "#888",
    fontSize: 12,
    lineHeight: 18,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.80)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#050505",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  modalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },

  modalBadgeText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },

  /* INPUTS */

  inputLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#080808",
    color: "#fff",
    paddingHorizontal: 14,
    fontSize: 14,
  },

  textArea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#080808",
    color: "#fff",
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 14,
    marginBottom: 16,
  },

  /* BUTTON */

  submitButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
});
