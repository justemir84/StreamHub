import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  findNodeHandle,
  Pressable,
  StyleSheet,
} from "react-native";
import { subscribeTvFocus, TV_FOCUS_AVAILABLE } from "../utils/tvFocus";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// TV kumandasi ile gezinirken odaklanan ogenin net gorunmesi icin:
//  - mavi cerceve (focus ring)
//  - hafif buyume (spring animasyon)
//  - accent renkli ic parlama
//
// Android'de React Native View'lar icin `onFocus` olayi gelmedigi icin
// utils/tvFocus.js uzerinden native odak tag'i dinlenir. iOS/web'de ise
// Pressable'in kendi onFocus/onBlur olaylari kullanilir.
export default function TVFocusable({
  children,
  onPress,
  onLongPress,
  onFocus,
  onBlur,
  style,
  focusedStyle,
  hasTVPreferredFocus = false,
  focusable = true,
  disabled = false,
  focusScale = 1.06,
  radius = 12,
  autoFocus = false,
  ...rest
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const viewRef = useRef(null);
  const focusedRef = useRef(false);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const [focused, setFocused] = useState(false);

  // Callback'ler her render'da degisebilir; aboneligi yeniden kurmadan
  // guncel fonksiyonu kullanmak icin ref'te tutuyoruz.
  useEffect(() => {
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  }, [onFocus, onBlur]);

  const animate = useCallback(
    (to) => {
      Animated.spring(anim, {
        toValue: to,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }).start();
    },
    [anim]
  );

  const setFocusedState = useCallback(
    (next) => {
      if (focusedRef.current === next) return;
      focusedRef.current = next;
      setFocused(next);
      animate(next ? 1 : 0);
    },
    [animate]
  );

  // Android TV: native global odak dinleyicisinden gelen tag ile esles.
  // findNodeHandle ilk render'da null donebilir (view henuz mount olmadi);
  // bu yuzden her render'da kontrol icin ref taze tutulmustur. Tag olusunca
  // bir sonraki render'da abonelik kurulur — buradaki effect her render'da
  // calisip tag'i tekrar dogrular (depsiz).
  useEffect(() => {
    if (!TV_FOCUS_AVAILABLE || !focusable || disabled) return undefined;

    const tag = findNodeHandle(viewRef.current);
    if (tag == null) return undefined;

    return subscribeTvFocus((focusedTag) => {
      const next = focusedTag === tag;
      if (focusedRef.current === next) return;
      setFocusedState(next);
      const event = { nativeEvent: { target: tag } };
      if (next) {
        onFocusRef.current?.(event);
      } else {
        onBlurRef.current?.(event);
      }
    });
  });

  // autoFocus true ise hasTVPreferredFocus ile ilk odak bu ogede verilir.
  // key degistiginde (orn. toolbarFocusKey) view remount olur ve odak geri doner.

  const handleFocus = useCallback(
    (e) => {
      setFocusedState(true);
      onFocus?.(e);
    },
    [setFocusedState, onFocus]
  );

  const handleBlur = useCallback(
    (e) => {
      setFocusedState(false);
      onBlur?.(e);
    },
    [setFocusedState, onBlur]
  );

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, focusScale],
  });
  const glowOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const tintOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.16],
  });

  return (
    <AnimatedPressable
      {...rest}
      ref={viewRef}
      focusable={focusable && !disabled}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus || autoFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      style={[
        styles.base,
        style,
        focused && focusedStyle,
        { transform: [{ scale }] },
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.tint,
          { borderRadius: radius, opacity: tintOpacity },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.ring,
          { borderRadius: radius, opacity: glowOpacity },
        ]}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12 },
  tint: { backgroundColor: "#4a9eff" },
  ring: {
    borderWidth: 3,
    borderColor: "#4a9eff",
    shadowColor: "#4a9eff",
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
