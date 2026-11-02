import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { getAccounts, removeAccount } from "../utils/storage";
import { getAdBlock, setAdBlock, getHttpsOnly, setHttpsOnly, getDomStorage, setDomStorage, getThirdPartyCookies, setThirdPartyCookies, getPopupBlock, setPopupBlock } from "../utils/settings";
import TVFocusable from "../components/TVFocusable";

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [adBlock, setAdBlockState] = useState(true);
  const [httpsOnly, setHttpsOnlyState] = useState(true);
  const [domStorage, setDomStorageState] = useState(false);
  const [thirdPartyCookies, setThirdPartyCookiesState] = useState(false);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıtlı Hesaplar</Text>
      <FlatList
        data={accounts}
        keyExtractor={(item, i) => item.siteId + item.username + i}
        renderItem={({ item }) => (
          <TVFocusable style={styles.card} onPress={() => {}}>
            <View>
              <Text style={styles.site}>{item.siteId}</Text>
              <Text style={styles.user}>{item.username}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Sil</Text>
            </TouchableOpacity>
          </TVFocusable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz hesap yok.</Text>}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "#15151f", padding: 20, borderRadius: 14, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 2, borderColor: "transparent", minHeight: 70 },
  site: { color: "#fff", fontSize: 14, fontWeight: "600" },
  user: { color: "#888", fontSize: 12, marginTop: 2 },
  remove: { color: "#ef4444", fontSize: 13 },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  section: { marginTop: 20, backgroundColor: "#15151f", padding: 14, borderRadius: 12 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  rowLabel: { color: "#ccc", fontSize: 14 }
});