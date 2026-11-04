import { useEffect, useRef, useState } from "react";
import {
  findNodeHandle,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from "react-native";

// Android TV'de RN View'lari icin native onFocus olayi gelmedigi icin
// plugins/withTvFocus.js ile eklenen kucuk native modulden odak olaylarini
// aliyoruz. Modul yoksa (ornegin iOS/web) uygulama sessizce calismaya devam
// eder; TVFocusable bu durumda eski davranisini korur.
const nativeModule = Platform.OS === "android" ? NativeModules.TvFocus : null;

export const TV_FOCUS_AVAILABLE = !!nativeModule;

let emitter = null;
let started = false;
let currentTag = -1;
const subscribers = new Set();

function ensureEmitter() {
  if (emitter || !nativeModule) return emitter;

  emitter = new NativeEventEmitter(nativeModule);
  emitter.addListener("tvFocusChanged", (event) => {
    const tag = event && typeof event.tag === "number" ? event.tag : -1;
    if (tag === currentTag) return;
    currentTag = tag;
    subscribers.forEach((fn) => {
      try {
        fn(currentTag);
      } catch (e) {
        // Bir abonenin hatasi digerlerini etkilemesin.
      }
    });
  });

  return emitter;
}

export function startTvFocus() {
  ensureEmitter();
  if (!nativeModule || started) return;
  started = true;
  try {
    nativeModule.start();
  } catch (e) {
    started = false;
  }
}

export function stopTvFocus() {
  if (!nativeModule || !started) return;
  started = false;
  try {
    nativeModule.stop();
  } catch (e) {
    // yoksay
  }
}

// Verilen fonksiyon her odak degisiminde guncel tag ile cagrilir.
// Abone olundugu anda mevcut odak tag'i ile bir kez hemen cagrilir.
export function subscribeTvFocus(fn) {
  ensureEmitter();
  subscribers.add(fn);
  fn(currentTag);
  return () => {
    subscribers.delete(fn);
  };
}

export function getFocusedTag() {
  return currentTag;
}

// TextInput gibi kendi TVFocusable'i olmayan bilesenler icin:
// native odak tag'ini izler ve ref + focus stilleri icin yardimci dondurur.
export function useFocusableInput() {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!TV_FOCUS_AVAILABLE) return undefined;
    const tag = findNodeHandle(ref.current);
    if (tag == null) return undefined;
    return subscribeTvFocus((focusedTag) => setFocused(focusedTag === tag));
  }, []);

  return {
    focused,
    focusProps: {
      ref,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
