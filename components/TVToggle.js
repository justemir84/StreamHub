import React from "react";
import { StyleSheet, Text, View } from "react-native";
import TVFocusable from "./TVFocusable";

// TV'de native Switch kucuk ve odak halkasi gostermiyor. Bunun yerine tum
// satir odaklanabilir bir buton: kumandayla uzerine gelince mavi cerceve
// belirginlesir, OK ile acilip kapanir.
export default function TVToggle({
  label,
  description,
  value,
  onValueChange,
  hasTVPreferredFocus = false,
  disabled = false,
  style,
}) {
  return (
    <TVFocusable
      style={[styles.row, style]}
      focusedStyle={styles.rowFocused}
      radius={10}
      onPress={() => onValueChange?.(!value)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!value, disabled }}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {!!description && <Text style={styles.desc}>{description}</Text>}
      </View>
      <View style={[styles.pill, value ? styles.pillOn : styles.pillOff]}>
        <Text style={[styles.pillText, value && styles.pillTextOn]}>
          {value ? "Açık" : "Kapalı"}
        </Text>
      </View>
    </TVFocusable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
    borderRadius: 10,
  },
  rowFocused: { backgroundColor: "rgba(74,158,255,0.10)" },
  text: { flex: 1, paddingRight: 16 },
  label: { color: "#eee", fontSize: 18, fontWeight: "600" },
  desc: { color: "#777", fontSize: 14, marginTop: 3, lineHeight: 19 },
  pill: {
    minWidth: 82,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillOn: { backgroundColor: "#4a9eff", borderColor: "#4a9eff" },
  pillOff: { backgroundColor: "#202020", borderColor: "#3a3a3a" },
  pillText: { color: "#9a9a9a", fontSize: 15, fontWeight: "700" },
  pillTextOn: { color: "#fff" },
});
