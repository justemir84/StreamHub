import React from "react";
import { requireNativeComponent, StyleSheet } from "react-native";
import { TV_FOCUS_AVAILABLE } from "../utils/tvFocus";

// plugins/withTvFocus.js ile eklenen gorunmez native view.
// Baglandigi pencerenin (ana pencere veya RN Modal/Dialog) kok view agacindaki
// odak degisimlerini JS'e bildirir. RN Modal'lari ayri bir Android penceresi
// actigi icin ana pencere dinleyicisi onlarin odaklarini goremez; bu yuzden her
// Modal'in icine de bir tane konur.
const NativeTvFocusScope = TV_FOCUS_AVAILABLE
  ? requireNativeComponent("TvFocusScope")
  : null;

export default function TvFocusScope() {
  if (!NativeTvFocusScope) return null;
  return <NativeTvFocusScope style={styles.scope} />;
}

const styles = StyleSheet.create({
  scope: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
