import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import TVFocusable from "./TVFocusable";
import TvFocusScope from "./TvFocusScope";
import {
  checkForUpdate,
  downloadUpdate,
  formatBytes,
  getCurrentBuild,
  getCurrentVersion,
  installApk,
} from "../utils/updater";

const UpdateContext = createContext(null);

export function useUpdate() {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdate, UpdateGate icinde kullanilmalidir.");
  return ctx;
}

// Uygulama acilisinda GitHub Releases'i kontrol eder; yeni surum varsa
// TV kumandasi ile kullanilabilen bir Modal gosterir.
export default function UpdateGate({ children }) {
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  const check = useCallback(async ({ silent = false } = {}) => {
    setChecking(true);
    setError(null);
    try {
      const info = await checkForUpdate();
      if (info) {
        setUpdate(info);
        setDismissed(false);
      }
      return info;
    } catch (e) {
      if (!silent) setError(e?.message || "Güncelleme kontrol edilemedi.");
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (autoChecked || __DEV__) return;
    const timer = setTimeout(() => {
      setAutoChecked(true);
      check({ silent: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [autoChecked, check]);

  const install = useCallback(
    async (info) => {
      const target = info || update;
      if (!target) return false;
      setError(null);
      setUpdate(target);
      setDismissed(false);
      setProgress(0);
      try {
        const localUri = await downloadUpdate(target, setProgress);
        setProgress(null);
        await installApk(localUri);
        setUpdate(null);
        return true;
      } catch (e) {
        setProgress(null);
        setError(e?.message || "Güncelleme kurulamadı.");
        return false;
      }
    },
    [update]
  );

  // Ayarlar ekranindaki "Güncelle" butonu icin:
  // once kontrol eder, yeni surum varsa indirip kurulum ekranini acar.
  const checkAndInstall = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const info = await checkForUpdate();
      if (!info) return "latest";
      await install(info);
      return "installed";
    } catch (e) {
      setError(e?.message || "Güncelleme denetlenemedi.");
      return "error";
    } finally {
      setChecking(false);
    }
  }, [install]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      version: getCurrentVersion(),
      build: getCurrentBuild(),
      update,
      progress,
      checking,
      busy: progress !== null,
      error,
      check,
      install,
      checkAndInstall,
      dismiss,
      visible: !!update && !dismissed,
    }),
    [
      update,
      progress,
      checking,
      error,
      check,
      install,
      checkAndInstall,
      dismiss,
      dismissed,
    ]
  );

  const busy = progress !== null;

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <Modal
        visible={value.visible}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.backdrop}>
          <TvFocusScope />
          <View style={styles.card}>
            <Text style={styles.title}>Yeni sürüm hazır</Text>
            <Text style={styles.version}>
              v{update?.currentVersion} → v{update?.version}
            </Text>
            {!!update?.size && (
              <Text style={styles.meta}>
                İndirme boyutu: {formatBytes(update.size)}
              </Text>
            )}

            {busy ? (
              <View style={styles.progressBox}>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${progress || 0}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>İndiriliyor: %{progress || 0}</Text>
                <Text style={styles.hint}>
                  İndirme bitince Android kurulum ekranı açılacak.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.hint}>
                  Güncelleme APK'sı GitHub'dan indirilip kurulur. Kurulum ekranında
                  izin istenirse onaylayın.
                </Text>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.buttons}>
                  <TVFocusable
                    style={styles.primaryBtn}
                    focusedStyle={styles.primaryBtnFocused}
                    hasTVPreferredFocus
                    onPress={() => install()}
                  >
                    <Text style={styles.primaryText}>İndir ve Kur</Text>
                  </TVFocusable>
                  <TVFocusable style={styles.secondaryBtn} onPress={dismiss}>
                    <Text style={styles.secondaryText}>Daha Sonra</Text>
                  </TVFocusable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </UpdateContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#15151f",
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: "#2a2a3a",
  },
  title: { color: "#fff", fontSize: 30, fontWeight: "700" },
  version: { color: "#3b82f6", fontSize: 22, fontWeight: "600", marginTop: 8 },
  meta: { color: "#888", fontSize: 16, marginTop: 4 },
  hint: { color: "#aaa", fontSize: 17, lineHeight: 24, marginTop: 16 },
  error: { color: "#ef4444", fontSize: 16, marginTop: 12 },
  progressBox: { marginTop: 20 },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#26263a",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3b82f6" },
  progressText: { color: "#fff", fontSize: 18, marginTop: 10, fontWeight: "600" },
  buttons: { flexDirection: "row", marginTop: 22, gap: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  primaryBtnFocused: {
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#2563eb",
  },
  primaryText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  secondaryBtn: {
    width: 180,
    backgroundColor: "#26263a",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  secondaryText: { color: "#ddd", fontSize: 20, fontWeight: "600" },
});
