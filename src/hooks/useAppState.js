import { useEffect, useRef } from "react";
import { AppState } from "react-native";

// Fires `onForeground` when the app returns to active state.
// Used by screens that need to refresh data after the user returns from background.
export function useAppState({ onForeground } = {}) {
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        appStateRef.current === "background" ||
        appStateRef.current === "inactive";
      const isNowActive = nextState === "active";

      if (wasBackground && isNowActive && onForeground) {
        onForeground();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [onForeground]);
}
