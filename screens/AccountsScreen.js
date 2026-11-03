import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch } from "react-native";
import { getAccounts, removeAccount } from "../utils/storage";
import { getAdBlock, setAdBlock, getHttpsOnly, setHttpsOnly, getDomStorage, setDomStorage, getThirdPartyCookies, setThirdPartyCookies, getPopupBlock, setPopupBlock } from "../utils/settings";
import TVFocusable from "../components/TVFocusable";
import { useUpdate } from "../components/UpdateGate";

export default function AccountsScreen() {
  const { version, build, checking, check, error: updateError } = useUpdate();
  const [updateMessage, setUpdateMessage] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [adBlock, setAdBlockState] = useState(true);
  const [httpsOnly, setHttpsOnlyState] = useState(true);
  const [domStorage, setDomStorageState] = useState(true);
  const [thirdPartyCookies, setThirdPartyCookiesState] = useState(true);
  const [popupBlock, setPopupBlockState] = useState(true);

  const load = () => getAccounts().then(setAccounts);
  useEffect(() => {
    load();
    getAdBlock().then(setAdBlockState);
    getHttpsOnly().then(setHttpsOnlyState);
    getDomStorage().then(setDomStorageState);
    getThirdPartyCookies().then(setThirdPartyCookiesState);
    getPopupBlock().then(setPopupBlockState);
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

  const handleCheckUpdate = async () => {
    setUpdateMessage(null);
    const info = await check();
    if (!info) setUpdateMessage("En son sürümü kullanıyorsunuz.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıtlı Hesaplar</Text>
      <FlatList
        data={accounts}
        keyExtractor={(item, i) => item.siteId + item.username + i}
        renderItem={({ item }) => (
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.site}>{item.siteId}</Text>
              <Text style={styles.user}>{item.username}</Text>
            </View>
            <TVFocusable style={styles.removeBtn} onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Sil</Text>
            </TVFocusable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz hesap yok.</Text>}
        ListFooterComponent={
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Güvenlik</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Reklam/Tracker Engelleme</Text>
                <Switch value={adBlock} onValueChange={toggleAdBlock} trackColor={{ true: "#3b82f6" }} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Sadece HTTPS</Text>
                <Switch value={httpsOnly} onValueChange={toggleHttps} trackColor={{ true: "#3b82f6" }} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>DOM Depolama (localStorage)</Text>
                <Switch value={domStorage} onValueChange={toggleDomStorage} trackColor={{ true: "#3b82f6" }} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Üçüncü Taraf Çerezler</Text>
                <Switch value={thirdPartyCookies} onValueChange={toggleThirdPartyCookies} trackColor={{ true: "#3b82f6" }} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Popup Engelleme</Text>
                <Switch value={popupBlock} onValueChange={togglePopupBlock} trackColor={{ true: "#3b82f6" }} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Uygulama</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Sürüm</Text>
                <Text style={styles.rowValue}>v{version} ({build})</Text>
              </View>
              <Text style={styles.updateHint}>
                Güncellemeler GitHub Releases üzerinden alınır.
              </Text>
              <TVFocusable
                style={styles.updateBtn}
                focusedStyle={styles.updateBtnFocused}
                onPress={handleCheckUpdate}
                disabled={checking}
              >
                <Text style={styles.updateBtnText}>
                  {checking ? "Kontrol ediliyor..." : "Güncellemeyi Kontrol Et"}
                </Text>
              </TVFocusable>
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
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 14 },
  cardRow: { flexDirection: "row", marginBottom: 12 },
  card: { flex: 1, backgroundColor: "#15151f", padding: 22, borderRadius: 14, justifyContent: "center", minHeight: 90 },
  site: { color: "#fff", fontSize: 20, fontWeight: "600" },
  user: { color: "#999", fontSize: 16, marginTop: 4 },
  removeBtn: { width: 88, marginLeft: 10, backgroundColor: "#2a1420", borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  remove: { color: "#ef4444", fontSize: 18, fontWeight: "700" },
  empty: { color: "#777", textAlign: "center", marginTop: 40, fontSize: 18 },
  section: { marginTop: 20, backgroundColor: "#15151f", padding: 16, borderRadius: 12, marginBottom: 24 },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  rowLabel: { color: "#ddd", fontSize: 18 },
  rowValue: { color: "#3b82f6", fontSize: 18, fontWeight: "600" },
  updateHint: { color: "#888", fontSize: 15, marginTop: 4, marginBottom: 10 },
  updateBtn: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 3, borderColor: "transparent" },
  updateBtnFocused: { borderWidth: 3, borderColor: "#ffffff", backgroundColor: "#2563eb" },
  updateBtnText: { color: "#fff", fontSize: 19, fontWeight: "700" },
  updateError: { color: "#ef4444", fontSize: 15, marginTop: 10 },
  updateOk: { color: "#22c55e", fontSize: 15, marginTop: 10 }
});