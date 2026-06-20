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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../components/common/ScreenLayout";
import { PRIMARY } from "../components/auth/AuthStyles";

const supportOptions = [
  {
    id: 1,
    title: "Request Support Call",
    description:
      "Talk to our team for help with the platform.",
    icon: "call-outline",
  },
  {
    id: 2,
    title: "Request Mentorship Consultation",
    description:
      "Book time with a senior mentor.",
    icon: "people-outline",
  },
  {
    id: 3,
    title: "Account Opening Assistance",
    description:
      "Set up your broker / trading account.",
    icon: "briefcase-outline",
  },
  {
    id: 4,
    title: "Book One-On-One Session",
    description:
      "Personalized 60-min session.",
    icon: "calendar-outline",
  },
];

export default function SupportScreen({ navigation }) {
  const { width } = useWindowDimensions();

  const isDesktop =
    Platform.OS === "web" && width >= 768;

  const [modalVisible, setModalVisible] =
    useState(false);

  const [selectedTitle, setSelectedTitle] =
    useState("");

  const [fullName, setFullName] =
    useState("Cashflow Admin");

  const [email, setEmail] =
    useState("admin@cashflow.university");

  const [mobile, setMobile] =
    useState("+91 9876543210");

  const [reason, setReason] =
    useState("");

  const openRequestModal = (title) => {
    setSelectedTitle(title);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSubmit = () => {
    console.log({
      requestType: selectedTitle,
      fullName,
      email,
      mobile,
      reason,
    });

    setModalVisible(false);
  };

  return (
    <ScreenLayout
      screenName="SupportScreen"
      navigation={navigation}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}

        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Ionicons
              name="headset-outline"
              size={12}
              color={PRIMARY}
            />

            <Text style={styles.heroBadgeText}>
              SUPPORT
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            We respond when{" "}
            <Text style={styles.heroGreen}>
              you ask.
            </Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Pick what you need.
            We'll be in touch.
          </Text>
        </View>

        {/* SUPPORT CARDS */}

        <View
          style={[
            styles.cardGrid,
            isDesktop &&
              styles.cardGridDesktop,
          ]}
        >
          {supportOptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={styles.supportCard}
              onPress={() =>
                openRequestModal(item.title)
              }
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={PRIMARY}
                />
              </View>

              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Text
                style={styles.cardDescription}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MODAL STARTS HERE */}
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
                  <Text
                    style={
                      styles.modalBadgeText
                    }
                  >
                    SUPPORT REQUEST
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeModal}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#777"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>
                {selectedTitle}
              </Text>

              {/* FULL NAME */}

              <Text style={styles.inputLabel}>
                FULL NAME
              </Text>

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#555"
                style={styles.input}
              />

              {/* EMAIL */}

              <Text style={styles.inputLabel}>
                EMAIL
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#555"
                keyboardType="email-address"
                style={styles.input}
              />

              {/* MOBILE */}

              <Text style={styles.inputLabel}>
                MOBILE
              </Text>

              <TextInput
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter mobile number"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                style={styles.input}
              />

              {/* REASON */}

              <Text style={styles.inputLabel}>
                REASON
              </Text>

              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Tell us briefly..."
                placeholderTextColor="#555"
                multiline
                textAlignVertical="top"
                style={styles.textArea}
              />

              {/* SUBMIT */}

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Submit Request
                </Text>
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
    marginBottom: 28,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.25)",
    backgroundColor: "rgba(57,255,20,0.05)",
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
  },

  heroGreen: {
    color: PRIMARY,
  },

  heroSubtitle: {
    color: "#a0a0a0",
    fontSize: 15,
    lineHeight: 24,
  },

  /* CARD GRID */

  cardGrid: {
    gap: 16,
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
    borderRadius: 18,
    padding: 20,
    minHeight: 140,
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },

  cardDescription: {
    color: "#888",
    fontSize: 14,
    lineHeight: 22,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#222",
    padding: 24,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  modalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 22,
  },

  /* INPUTS */

  inputLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#080808",
    color: "#fff",
    paddingHorizontal: 14,
    fontSize: 15,
  },

  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#080808",
    color: "#fff",
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 15,
    marginBottom: 22,
  },

  /* BUTTON */

  submitButton: {
    height: 58,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  submitButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
});