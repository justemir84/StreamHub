import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";

export default function TVFocusable({ children, onPress, onLongPress, style, focusedStyle }) {
  const [focused, setFocused] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      focusable={true}
      hasTVPreferredFocus={false}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.base, style, focused && (focusedStyle || styles.focused)]}
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
    backgroundColor: "rgba(59,130,246,0.15)",
    transform: [{ scale: 1.02 }]
  }
});