import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BODY } from "../../src/theme/typography";

const PRIMARY = "#39FF14";

export default function AuthInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  leftIcon,
  rightIcon,
  onRightPress,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  style,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.wrapper, focused && s.wrapperFocused, style]}>
      {leftIcon ? (
        <View style={s.iconLeft}>
          <Ionicons name={leftIcon} size={16} color="rgba(255,255,255,0.3)" />
        </View>
      ) : null}
      <TextInput
        style={[s.input, leftIcon ? s.padLeft : null, rightIcon ? s.padRight : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={autoCorrect ?? false}
        onFocus={() => { setFocused(true); onFocusProp?.(); }}
        onBlur={() => { setFocused(false); onBlurProp?.(); }}
        {...rest}
      />
      {rightIcon ? (
        <TouchableOpacity
          style={s.iconRight}
          onPress={onRightPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={rightIcon} size={16} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    marginBottom: 12,
    // elevation is constant — changing it at focus time triggers a native
    // Android layer redraw that dismisses the keyboard (Old Arch bug).
    elevation: 2,
  },
  wrapperFocused: {
    borderColor: "rgba(57,255,20,0.5)",
    // iOS-only glow; Android ignores shadowColor/Radius/Opacity anyway.
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: "#fff",
    fontFamily: BODY.regular,
    fontSize: 14,
  },
  padLeft: { paddingLeft: 8 },
  padRight: { paddingRight: 8 },
  iconLeft: { paddingLeft: 12 },
  iconRight: { paddingRight: 12 },
});
