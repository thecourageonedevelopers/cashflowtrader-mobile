/**
 * ChallengeMaintenanceBanner — RN port of web src/components/ChallengeMaintenanceBanner.jsx.
 *
 * Fixed top-of-app notice shown whenever the 21-Day Challenge is under maintenance — mounted in
 * ScreenLayout.js (mobile's equivalent of web's DashboardLayout.jsx) so it's visible on every
 * screen, before the trader ever opens the Challenge screen itself (which shows its own full-screen
 * version, ChallengeAccessState.js's ChallengeMaintenance). Sourced from the same
 * challengeApi.listPrograms() call — no extra request beyond what ScreenLayout already fetches
 * for this purpose. A marquee (two identical copies of the message side by side, track translated
 * exactly -contentWidth so the loop is seamless) — RN has no CSS keyframe/vw equivalent, so the
 * loop distance is measured via onLayout instead of expressed as a percentage.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BODY } from "../../src/theme/typography";

const GOLD = "#F5B843"; // same premium-gold accent web's admin dashboard warning cards use

export default function ChallengeMaintenanceBanner({ reason }) {
  const message = `Challenge Maintenance — ${reason || "Temporarily unavailable. Please try again later."}`;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!segmentWidth) return;
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -segmentWidth,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [segmentWidth, translateX]);

  const Segment = ({ onLayout }) => (
    <View style={s.segment} onLayout={onLayout}>
      <Ionicons name="warning" size={14} color={GOLD} style={{ marginRight: 8 }} />
      <Text style={s.text} numberOfLines={1}>{message}</Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.track, { transform: [{ translateX }] }]}>
        <Segment onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)} />
        <Segment />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.30)",
    backgroundColor: "rgba(245,158,11,0.10)",
  },
  track: {
    flexDirection: "row",
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  text: {
    color: GOLD,
    fontFamily: BODY.regular,
    fontWeight: "700",
    fontSize: 12,
  },
});
