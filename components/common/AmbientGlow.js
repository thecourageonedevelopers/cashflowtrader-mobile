import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

let _n = 0;

/**
 * SVG radial-gradient ambient glow anchored to a corner of its parent.
 * Approximates the CSS `blur-3xl` circle effect used in React Web.
 *
 * Parent must have `position: 'relative'` (the default for flex containers in RN).
 * No `overflow: 'hidden'` needed — the SVG fills the parent exactly via absoluteFill.
 *
 * Props:
 *   position  'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'
 *   size      gradient radius in dp (default 260)
 *   opacity   peak opacity at the corner anchor (default 0.12)
 *   color     glow color (default '#39FF14')
 */
const AmbientGlow = React.memo(function AmbientGlow({
  position = "topRight",
  size = 260,
  opacity = 0.12,
  color = "#39FF14",
}) {
  // Stable unique id per mounted instance — required so multiple gradients
  // on the same screen don't share the same SVG definition id.
  const id = useRef(`ag${++_n}`).current;

  const [layout, setLayout] = useState({ width: 1, height: 1 });

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  // Map corner name to SVG user-space coordinates (gradient center).
  // The center is placed AT the card corner so the gradient spreads inward,
  // matching the web's negative-positioned blobs that peek into the corner.
  const { cx, cy } = useMemo(() => {
    const { width: w, height: h } = layout;
    switch (position) {
      case "topLeft":     return { cx: 0, cy: 0 };
      case "bottomRight": return { cx: w, cy: h };
      case "bottomLeft":  return { cx: 0, cy: h };
      default:            return { cx: w, cy: 0 }; // topRight
    }
  }, [layout, position]);

  // Four-stop gradient approximates Gaussian falloff of CSS blur-3xl.
  // Stops: full opacity → 55% → 18% → 0, matching the soft-edge visual.
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={onLayout}
    >
      <Svg width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient
            id={id}
            cx={cx}
            cy={cy}
            r={size}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0"    stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.35" stopColor={color} stopOpacity={opacity * 0.55} />
            <Stop offset="0.65" stopColor={color} stopOpacity={opacity * 0.18} />
            <Stop offset="1"    stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

export default AmbientGlow;
