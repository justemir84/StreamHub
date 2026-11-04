import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAccounts, removeAccount } from "../utils/storage";
import {
  getAdBlock,
  setAdBlock,
  getHttpsOnly,
  setHttpsOnly,
  getDomStorage,
  setDomStorage,
  getThirdPartyCookies,
  setThirdPartyCookies,
  getPopupBlock,
  setPopupBlock,
  getCursorMode,
  setCursorMode
} from "../utils/settings";
import TVFocusable from "../components/TVFocusable";
import TVToggle from "../components/TVToggle";
import { useUpdate } from "../components/UpdateGate";

export default function AccountsScreen() {
  const {
    version,
    build,
    checking,
    busy,
    update,
    progress,
    check,
    checkAndInstall,
    error: updateError
  } = useUpdate();
  const [updateMessage, setUpdateMessage] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [adBlock, setAdBlockState] = useState(true);
  const [httpsOnly, setHttpsOnlyState] = useState(true);
  const [domStorage, setDomStorageState] = useState(true);
  const [thirdPartyCookies, setThirdPartyCookiesState] = useState(true);
  const [popupBlock, setPopupBlockState] = useState(true);
  const [cursorMode, setCursorModeState] = useState(false);

  const load = () => getAccounts().then(setAccounts);
  useEffect(() => {
    load();
    getAdBlock().then(setAdBlockState);
    getHttpsOnly().then(setHttpsOnlyState);
    getDomStorage().then(setDomStorageState);
    getThirdPartyCookies().then(setThirdPartyCookiesState);
    getPopupBlock().then(setPopupBlockState);
    getCursorMode().then(setCursorModeState);
  }, []);

  const handleRemove = async (a) => {
    const updated = await removeAccount(a.siteId, a.username);
    setAccounts(updated);
  };

  const toggleAdBlock = async (v) => {
    setAdBlockState(v);
    await setAdBlock(v);
  };
  const toggleHttps = async (v) => {
    setHttpsOnlyState(v);
    await setHttpsOnly(v);
  };
  const toggleDomStorage = async (v) => {
    setDomStorageState(v);
    await setDomStorage(v);
  };
  const toggleThirdPartyCookies = async (v) => {
    setThirdPartyCookiesState(v);
    await setThirdPartyCookies(v);
  };
  const togglePopupBlock = async (v) => {
    setPopupBlockState(v);
    await setPopupBlock(v);
  };
  const toggleCursor = async (v) => {
    setCursorModeState(v);
    await setCursorMode(v);
  };

  const handleUpdate = async () => {
    setUpdateMessage(null);
    const result = await checkAndInstall();
    if (result === "latest") setUpdateMessage("En son sürümü kullanıyorsunuz.");
  };

  const handleCheckOnly = async () => {
    setUpdateMessage(null);
    const info = await check();
    if (!info) setUpdateMessage("En son sürümü kullanıyorsunuz.");
  };

  const updateDisabled = checking || busy;

  return (
    <View style={styles.container}>
      <FlatList
        focusable={false}
        data={accounts}
        keyExtractor={(item, i) => item.siteId + item.username + i}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.title}>Ayarlar</Text>}
        ListEmptyComponent={<Text style={styles.empty}>Henüz kayıtlı hesap yok.</Text>}
        renderItem={({ item }) => (
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.site}>{item.siteId}</Text>
              <Text style={styles.user}>{item.username}</Text>
            </View>
            <TVFocusable style={styles.removeBtn} radius={12} onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Sil</Text>
            </TVFocusable>
          </View>
        )}
        ListFooterComponent={
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarayıcı</Text>
              <TVToggle
                label="Site içi fare (beyaz daire)"
                description="Yön tuşları daireyi gezdirir, OK tıklar. Kapalıyken D-pad odak gezinmesi kullanılır."
                value={cursorMode}
                onValueChange={toggleCursor}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Güvenlik</Text>
              <TVToggle
                label="Reklam/Tracker Engelleme"
                description="Bilinen reklam alan adlarını engeller"
                value={adBlock}
                onValueChange={toggleAdBlock}
              />
              <TVToggle
                label="Sadece HTTPS"
                description="Güvenli olmayan bağlantıları yönlendirir"
                value={httpsOnly}
                onValueChange={toggleHttps}
              />
              <TVToggle
                label="DOM Depolama (localStorage)"
                description="Sitelerin yerel veri saklamasına izin verir"
                value={domStorage}
                onValueChange={toggleDomStorage}
              />
              <TVToggle
                label="Üçüncü Taraf Çerezler"
                description="Siteler arası oturum çerezlerine izin verir"
                value={thirdPartyCookies}
                onValueChange={toggleThirdPartyCookies}
              />
              <TVToggle
                label="Popup Engelleme"
                description="İstenmeyen açılır pencereleri engeller"
                value={popupBlock}
                onValueChange={togglePopupBlock}
              />
            </View>

            <View style={[styles.section, styles.updateSection]}>
              <Text style={styles.sectionTitle}>Uygulama</Text>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Sürüm</Text>
                  <Text style={styles.rowDesc}>Güncellemeler GitHub Releases üzerinden alınır</Text>
                </View>
                <Text style={styles.rowValue}>v{version} ({build})</Text>
              </View>

              {!!update && (
                <Text style={styles.updateAvailable}>
                  Yeni sürüm hazır: v{update.version}
                </Text>
              )}

              <View style={styles.updateButtons}>
                <TVFocusable
                  style={[styles.updateBtn, updateDisabled && styles.btnDisabled]}
                  radius={12}
                  hasTVPreferredFocus
                  onPress={handleUpdate}
                  disabled={updateDisabled}
                >
                  <Ionicons name="cloud-download-outline" size={22} color="#fff" />
                  <Text style={styles.updateBtnText}>
                    {checking
                      ? "Denetleniyor..."
                      : busy
                      ? `İndiriliyor %${progress || 0}`
                      : update
                      ? `Güncelle (v${update.version})`
                      : "Güncelle"}
                  </Text>
                </TVFocusable>

                <TVFocusable
                  style={[styles.checkBtn, updateDisabled && styles.btnDisabled]}
                  radius={12}
                  onPress={handleCheckOnly}
                  disabled={updateDisabled}
                >
                  <Ionicons name="refresh" size={20} color="#ddd" />
                  <Text style={styles.checkBtnText}>Sürümü Kontrol Et</Text>
                </TVFocusable>
              </View>

              {!!updateError && <Text style={styles.updateError}>{updateError}</Text>}
              {!updateError && !!updateMessage && (
                <Text style={styles.updateOk}>{updateMessage}</Text>
              )}
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 24, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 30, fontWeight: "800", marginBottom: 18 },
  cardRow: { flexDirection: "row", marginBottom: 10 },
  card: { flex: 1, backgroundColor: "#1a1a1a", padding: 20, borderRadius: 12, justifyContent: "center", minHeight: 84, borderWidth: 1, borderColor: "#262626" },
  site: { color: "#fff", fontSize: 19, fontWeight: "600" },
  user: { color: "#999", fontSize: 15, marginTop: 4 },
  removeBtn: { width: 84, marginLeft: 10, backgroundColor: "#2a1420", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#4a2020" },
  remove: { color: "#ef4444", fontSize: 17, fontWeight: "700" },
  empty: { color: "#777", textAlign: "center", marginTop: 10, marginBottom: 20, fontSize: 16 },

  section: {
    marginTop: 18,
    backgroundColor: "#161616",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 18
  },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" },
  rowText: { flex: 1, paddingRight: 16 },
  rowLabel: { color: "#eee", fontSize: 18, fontWeight: "600" },
  rowDesc: { color: "#777", fontSize: 14, marginTop: 3 },
  rowValue: { color: "#4a9eff", fontSize: 18, fontWeight: "700" },

  updateSection: { borderColor: "#2b3f5c" },
  updateAvailable: { color: "#7ee787", fontSize: 16, marginTop: 12, fontWeight: "600" },
  updateButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  updateBtn: {
    flex: 1,
    minHeight: 54,
    backgroundColor: "#4a9eff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18
  },
  updateBtnText: { color: "#fff", fontSize: 19, fontWeight: "700" },
  checkBtn: {
    minHeight: 54,
    backgroundColor: "#242424",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#333"
  },
  checkBtnText: { color: "#ddd", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  updateError: { color: "#ef4444", fontSize: 15, marginTop: 12 },
  updateOk: { color: "#22c55e", fontSize: 15, marginTop: 12 }
});
