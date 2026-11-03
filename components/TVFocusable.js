import React, { useState } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";

export default function TVFocusable({
  children,
  onPress,
  onLongPress,
  style,
  focusedStyle,
  hasTVPreferredFocus = false,
  disabled = false,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      {...rest}
      activeOpacity={0.8}
      focusable={!disabled}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.base, style, focused && (focusedStyle || styles.focused), disabled && styles.disabled]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12 },
  focused: {
    borderWidth: 3,
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59,130,246,0.18)",
    transform: [{ scale: 1.02 }]
  },
  disabled: { opacity: 0.4 }
});
