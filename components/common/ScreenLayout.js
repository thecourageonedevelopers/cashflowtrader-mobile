import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "./AppHeader";
import AppDrawer from "./AppDrawer";
import { useNavLoading } from "../../src/context/NavLoadingContext";

const DRAWER_WIDTH = 300;

// Screens narrower than this threshold use the mobile (temporary) drawer.
// 768 px is the universal mobile/tablet breakpoint — at this width a 300 px
// sidebar still leaves 468 px of usable content area.
const SIDEBAR_BREAKPOINT = 768;

export default function ScreenLayout({ children, screenName, navigation }) {
  // useWindowDimensions re-renders this component whenever the window is
  // resized, so isDesktop reacts to the browser's responsive-mode toggle.
  const { width } = useWindowDimensions();

  // Desktop only when running in a browser AND the viewport is wide enough.
  // Native platforms (iOS / Android) always take the mobile path regardless
  // of device width so their behaviour is completely unchanged.
  const isDesktop = Platform.OS === "web" && width >= SIDEBAR_BREAKPOINT;

  const { show, hide } = useNavLoading();

  // Hide the navigation loading overlay whenever this screen gains focus.
  // Fires on initial mount AND on every re-focus (e.g. navigating back).
  useFocusEffect(useCallback(() => { hide(); }, [hide]));

  // All hooks declared unconditionally (React rules of hooks).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // drawerTouchable is separate from drawerOpen so pointer events can be
  // disabled the instant a navigation tap lands, without waiting for React
  // to commit the setDrawerOpen(false) state update.
  const [drawerTouchable, setDrawerTouchable] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity  = useRef(new Animated.Value(0)).current;
  const isNavigating     = useRef(false);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    setDrawerTouchable(true);
    Animated.parallel([
      Animated.spring(drawerTranslateX, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerTranslateX, backdropOpacity]);

  const closeDrawer = useCallback((onDone) => {
    // Disable taps immediately — before the animation runs.
    setDrawerTouchable(false);
    Animated.parallel([
      Animated.spring(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
      if (typeof onDone === "function") onDone();
    });
  }, [drawerTranslateX, backdropOpacity]);

  const handleNavigate = useCallback((routeName) => {
    // Desktop: drawer is permanent, never closes — just navigate.
    if (isDesktop) {
      navigation.navigate(routeName);
      return;
    }

    // Guard: ignore taps that arrive while a navigation is already in flight.
    if (isNavigating.current) return;

    if (routeName === screenName) {
      closeDrawer();
      return;
    }

    isNavigating.current = true;
    // Show overlay immediately — gives instant feedback that the tap registered
    // and blocks further interaction until the destination screen is ready.
    show();

    // Disable drawer taps immediately so the panel cannot receive further
    // taps during the close animation.
    setDrawerTouchable(false);

    // Stop any in-progress spring that may be mid-travel.
    drawerTranslateX.stopAnimation();
    backdropOpacity.stopAnimation();

    // Animate the drawer closed with a predictable timing curve (no
    // overshoot), then navigate only after the animation completes.
    // This guarantees the drawer is visually gone before the screen
    // switches and resets isNavigating inside the callback rather than
    // on a fixed timeout, so the guard releases exactly when it is safe.
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
      navigation.navigate(routeName);
      isNavigating.current = false;
    });
  }, [isDesktop, navigation, screenName, drawerTranslateX, backdropOpacity, closeDrawer, show]);

  // ─── DESKTOP WEB (≥ 768 px): permanent sidebar, no header ───────────────
  //
  //  ┌──────────────┬──────────────────────────────────────┐
  //  │  Sidebar     │  Content area (no header)            │
  //  │  300px fixed │  flex: 1                             │
  //  └──────────────┴──────────────────────────────────────┘
  //
  if (isDesktop) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.webSidebar}>
          <AppDrawer
            currentScreen={screenName}
            onNavigate={handleNavigate}
            permanent
          />
        </View>

        <View style={styles.webMain}>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    );
  }

  // ─── MOBILE / NARROW WEB (< 768 px): temporary overlay drawer ───────────
  //
  //  Identical to the original implementation. No lines changed.
  //
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onMenuPress={openDrawer} />
        <View style={styles.content}>{children}</View>
      </SafeAreaView>

      {drawerOpen && (
        <TouchableWithoutFeedback onPress={() => closeDrawer()}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        style={[
          styles.drawerPanel,
          { transform: [{ translateX: drawerTranslateX }] },
        ]}
        pointerEvents={drawerTouchable ? "auto" : "none"}
      >
        <AppDrawer
          currentScreen={screenName}
          onNavigate={handleNavigate}
          onClose={closeDrawer}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Mobile / narrow web ───────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: "#050505",
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    zIndex: 10,
    elevation: 10,
  },

  drawerPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 20,
    elevation: 20,
  },

  // ── Desktop web ───────────────────────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#050505",
  },

  webSidebar: {
    width: DRAWER_WIDTH,
  },

  webMain: {
    flex: 1,
    backgroundColor: "#050505",
  },
});
