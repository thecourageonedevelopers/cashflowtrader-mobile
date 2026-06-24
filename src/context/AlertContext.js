import React, { createContext, useCallback, useContext, useState } from "react";
import AppAlert from "../../components/common/AppAlert";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [config, setConfig] = useState(null);

  const dismiss = useCallback(() => setConfig(null), []);

  /**
   * showAlert({ type, title, message, onConfirm, confirmLabel, buttons })
   * type: "success" | "error" | "warning" | "info"
   */
  const showAlert = useCallback(
    ({ type = "info", title, message, onConfirm, confirmLabel, buttons } = {}) => {
      setConfig({
        type,
        title,
        message,
        buttons: buttons || [
          { label: confirmLabel || "OK", style: "default", onPress: onConfirm },
        ],
      });
    },
    []
  );

  /**
   * showConfirm({ title, message, confirmLabel, destructive, onConfirm, onCancel })
   * Renders a Cancel + Confirm pair.
   */
  const showConfirm = useCallback(
    ({
      title,
      message,
      confirmLabel = "Confirm",
      destructive = false,
      onConfirm,
      onCancel,
    } = {}) => {
      setConfig({
        type: "warning",
        title,
        message,
        buttons: [
          { label: "Cancel", style: "cancel", onPress: onCancel },
          {
            label: confirmLabel,
            style: destructive ? "destructive" : "default",
            onPress: onConfirm,
          },
        ],
      });
    },
    []
  );

  /**
   * showOptions({ title, message, buttons: [{ text, style, onPress }] })
   * For multi-option sheets (e.g. profile photo picker).
   */
  const showOptions = useCallback(
    ({ title, message, buttons = [] } = {}) => {
      setConfig({
        type: "info",
        title,
        message,
        buttons: buttons.map((b) => ({
          label: b.text,
          style: b.style || "default",
          onPress: b.onPress,
        })),
      });
    },
    []
  );

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showOptions }}>
      {children}
      <AppAlert config={config} onDismiss={dismiss} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider");
  return ctx;
}
