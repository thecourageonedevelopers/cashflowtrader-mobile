import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse, Pattern, Line, Mask } from "react-native-svg";

export default function AuthBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <Defs>
        <Pattern id="authgrid" width="56" height="56" patternUnits="userSpaceOnUse">
          <Line x1="56" y1="0" x2="56" y2="56" stroke="#39FF14" strokeWidth="0.8" strokeOpacity="0.08" />
          <Line x1="0" y1="56" x2="56" y2="56" stroke="#39FF14" strokeWidth="0.8" strokeOpacity="0.08" />
        </Pattern>
        <RadialGradient
          id="gridfade"
          cx={width / 2}
          cy={height * 0.3}
          r={width * 0.6}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.3" stopColor="white" stopOpacity="1" />
          <Stop offset="0.85" stopColor="white" stopOpacity="0" />
        </RadialGradient>
        <Mask id="gridmask">
          <Rect x="0" y="0" width={width} height={height} fill="url(#gridfade)" />
        </Mask>
        <RadialGradient
          id="topglow"
          cx={width / 2}
          cy={0}
          r={height * 0.45}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#39FF14" stopOpacity="0.09" />
          <Stop offset="1" stopColor="#39FF14" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#authgrid)" mask="url(#gridmask)" />
      <Ellipse
        cx={width / 2}
        cy={0}
        rx={width * 0.6}
        ry={height * 0.38}
        fill="url(#topglow)"
      />
    </Svg>
  );
}
