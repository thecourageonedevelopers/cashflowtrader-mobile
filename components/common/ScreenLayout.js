import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "./AppHeader";
import AppDrawer from "./AppDrawer";

const DRAWER_WIDTH = 300;

export default function ScreenLayout({ children, screenName, navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity  = useRef(new Animated.Value(0)).current;

  const isNavigating = useRef(false);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
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
      if (onDone) onDone();
    });
  }, [drawerTranslateX, backdropOpacity]);

  const handleNavigate = useCallback((routeName) => {
    if (isNavigating.current) return;

    if (routeName === screenName) {
      closeDrawer();
      return;
    }

    isNavigating.current = true;

    // Snap drawer shut instantly — no animation competing with navigation.
    drawerTranslateX.stopAnimation();
    backdropOpacity.stopAnimation();
    drawerTranslateX.setValue(-DRAWER_WIDTH);
    backdropOpacity.setValue(0);
    setDrawerOpen(false);

    // navigate() inside a Tab Navigator switches the active tab without
    // destroying any native views and without pushing to the back stack.
    // For "SignIn" (sign-out), React Navigation bubbles the call up to
    // the parent NativeStack which handles it.
    navigation.navigate(routeName);

    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [navigation, screenName, drawerTranslateX, backdropOpacity, closeDrawer]);

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
        pointerEvents={drawerOpen ? "auto" : "none"}
      >
        <AppDrawer
          currentScreen={screenName}
          onNavigate={handleNavigate}
          onClose={() => closeDrawer()}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
