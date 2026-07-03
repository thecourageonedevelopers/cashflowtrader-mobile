/**
 * AppAlert
 * Custom themed alert modal matching the Cashflow Trader design system.
 * Dark background · Neon green accents · Glow effects · Rounded corners.
 *
 * Consumed exclusively through AlertContext (showAlert / showConfirm / showOptions).
 * Do not render this component directly.
 */
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DISPLAY, MONO, BODY } from "../../src/theme/typography";

const TYPE_CONFIG = {
  success: {
    border: "#39FF14",
    iconName: "checkmark-circle-outline",
    iconColor: "#39FF14",
  },
  error: {
    border: "#f87171",
    iconName: "close-circle-outline",
    iconColor: "#f87171",
  },
  warning: {
    border: "#FBBF24",
    iconName: "warning-outline",
    iconColor: "#FBBF24",
  },
  info: {
    border: "#60A5FA",
    iconName: "information-circle-outline",
    iconColor: "#60A5FA",
  },
};

export default function AppAlert({ config, onDismiss }) {
  if (!config) return null;

  const { type = "info", title, message, buttons = [] } = config;
  const tc = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const resolvedBtns =
    buttons.length > 0 ? buttons : [{ label: "OK", style: "default" }];

  // > 2 buttons → stack vertically; ≤ 2 → side by side
  const isColumn = resolvedBtns.length > 2;

  const handlePress = (btn) => {
    onDismiss();
    btn.onPress?.();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop — tap to dismiss */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={s.backdrop}>
          {/* Card — tap inside should not dismiss */}
          <TouchableWithoutFeedback>
            <View
              style={[
                s.card,
                { borderColor: tc.border, shadowColor: tc.border },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  s.iconBox,
                  {
                    borderColor: tc.border + "66",
                    backgroundColor: tc.border + "1A",
                  },
                ]}
              >
                <Ionicons name={tc.iconName} size={26} color={tc.iconColor} />
              </View>

              {/* Title */}
              <Text style={s.title}>{title}</Text>

              {/* Message */}
              {!!message && <Text style={s.message}>{message}</Text>}

              {/* Buttons */}
              <View
                style={[
                  s.btnWrap,
                  isColumn ? s.btnColumn : s.btnRow,
                ]}
              >
                {resolvedBtns.map((btn, i) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.btn,
                        // Side-by-side: equal width
                        !isColumn && resolvedBtns.length > 1 && s.btnFlex,
                        // Stacked: full width
                        isColumn && s.btnFull,
                        isCancel && s.btnCancel,
                        isDestructive && s.btnDestructive,
                        !isCancel && !isDestructive && s.btnPrimary,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => handlePress(btn)}
                    >
                      <Text
                        style={[
                          s.btnText,
                          isCancel && s.btnTextCancel,
                          isDestructive && s.btnTextDestructive,
                          !isCancel && !isDestructive && s.btnTextPrimary,
                        ]}
                      >
                        {btn.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const PRIMARY = "#39FF14";

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 16,
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  title: {
    color: "#fff",
    fontFamily: DISPLAY.extraBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: -0.3,
  },

  message: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: BODY.regular,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  // Button containers
  btnWrap: { width: "100%", marginTop: 6 },
  btnRow: { flexDirection: "row", gap: 10 },
  btnColumn: { flexDirection: "column", gap: 8 },

  // Button sizing
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  btnFlex: { flex: 1 },
  btnFull: { width: "100%" },

  // Button variants
  btnPrimary: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  btnCancel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  btnDestructive: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },

  // Button text
  btnText: { fontFamily: DISPLAY.bold, fontSize: 14 },
  btnTextPrimary: { color: "#000" },
  btnTextCancel: { color: "rgba(255,255,255,0.8)" },
  btnTextDestructive: { color: "#fff" },
});
