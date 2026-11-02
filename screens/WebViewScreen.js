import React, { useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { getAccounts, saveAccount, addFavorite } from "../utils/storage";
import { getSelectors } from "../data/sites";
import { getTabs, addTab, removeTab } from "../utils/tabs";
import { getAdBlock, getHttpsOnly, getDomStorage, getThirdPartyCookies } from "../utils/settings";
import { isBlockedUrl, isUnsafeUrl } from "../utils/blocklist";

export default function WebViewScreen({ route, navigation }) {
  const { site, initialUrl } = route.params;
  const webRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentUrl, setCurrentUrl] = useState(initialUrl || site.url);
  const [address, setAddress] = useState(initialUrl || site.url);
  const [tabs, setTabs] = useState([]);
  const [showTabs, setShowTabs] = useState(false);
  const goHome = () => {
    navigation?.navigate("Siteler", { screen: "Sites" });
  };
  const [adBlock, setAdBlock] = useState(true);
  const [httpsOnly, setHttpsOnly] = useState(true);
  const [domStorage, setDomStorage] = useState(false);
  const [thirdPartyCookies, setThirdPartyCookies] = useState(false);

  useEffect(() => {
    getAdBlock().then(setAdBlock);
    getHttpsOnly().then(setHttpsOnly);
    getDomStorage().then(setDomStorage);
    getThirdPartyCookies().then(setThirdPartyCookies);
  }, []);

  useEffect(() => {
    getAccounts().then(list => {
      const filtered = list.filter(a => a.siteId === site.id);
      setAccounts(filtered);
      if (filtered.length) setSelected(filtered[0]);
    });
    getTabs().then(setTabs);
    addTab({ title: site.name, url: initialUrl || site.url, siteId: site.id }).then(setTabs);
  }, [site.id]);

  const handleAddAccount = async () => {
    if (!username) return;
    const acc = { siteId: site.id, username, password, createdAt: Date.now() };
    const updated = await saveAccount(acc);
    const filtered = updated.filter(a => a.siteId === site.id);
    setAccounts(filtered);
    if (!selected) setSelected(filtered[0]);
    setShowAdd(false);
    setUsername("");
    setPassword("");
    Alert.alert("Kaydedildi", "Hesap bilgisi saklandı.");
  };

  const handleAutoFill = () => {
    if (!selected) { Alert.alert("Hesap yok", "Önce hesap ekleyin."); return; }
    const sel = getSelectors(site.id);
    const u = selected.username.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const p = selected.password.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const uSelectors = JSON.stringify(sel.username);
    const pSelectors = JSON.stringify(sel.password);
    const script = `
      (function(){
        function trySet(selectors, val){
          for (const s of selectors){
            const el = document.querySelector(s);
            if (el){ el.value = val; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; }
          }
          return false;
        }
        const okU = trySet(${uSelectors}, '${u}');
        const okP = trySet(${pSelectors}, '${p}');
        return { okU, okP };
      })();
    `;
    webRef.current?.injectJavaScript(script + "true;");
    Alert.alert("Oto-doldur", "Alanlar doldurulmaya çalışıldı.");
  };

  const handleAddFavorite = async () => {
    const fav = { siteId: site.id, siteName: site.name, siteUrl: site.url, url: currentUrl, title: currentUrl, createdAt: Date.now() };
    await addFavorite(fav);
    Alert.alert("Eklendi", "Favorilere eklendi.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{site.name}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity style={styles.btn} onPress={handleAddFavorite}>
            <Text style={styles.btnText}>★ Fav</Text>
          </TouchableOpacity>
          {accounts.length > 0 && (
            <TouchableOpacity style={styles.btn} onPress={handleAutoFill}>
              <Text style={styles.btnText}>Oto-doldur</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btn} onPress={() => setShowAdd(true)}>
            <Text style={styles.btnText}>+ Hesap</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.addressBar}>
        <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
          <Text style={styles.goText}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => setShowTabs(true)}>
          <Text style={styles.goText}>🗂</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={setAddress}
          placeholder="URL veya arama..."
          placeholderTextColor="#888"
          autoCapitalize="none"
          onSubmitEditing={() => {
            let u = address.trim();
            if (!/^https?:\/\//i.test(u)) {
              if (u.includes(".") && !u.includes(" ")) u = "https://" + u;
              else u = "https://www.google.com/search?q=" + encodeURIComponent(u);
            }
            setCurrentUrl(u);
            setAddress(u);
          }}
        />
        <TouchableOpacity style={styles.goBtn} onPress={() => {
          let u = address.trim();
          if (!/^https?:\/\//i.test(u)) {
            if (u.includes(".") && !u.includes(" ")) u = "https://" + u;
            else u = "https://www.google.com/search?q=" + encodeURIComponent(u);
          }
          setCurrentUrl(u);
          setAddress(u);
        }}>
          <Text style={styles.goText}>Git</Text>
        </TouchableOpacity>
      </View>
      {accounts.length > 1 && (
        <View style={styles.accountBar}>
          {accounts.map((a, i) => (
            <TouchableOpacity key={i} onPress={() => setSelected(a)} style={[styles.accountChip, selected?.username === a.username && styles.accountChipActive]}>
              <Text style={styles.accountChipText}>{a.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Modal visible={showTabs} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sekmeler</Text>
            {tabs.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => { webRef.current?.loadUrl(t.url); setShowTabs(false); }}>
                  <Text style={styles.tabTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.tabUrl} numberOfLines={1}>{t.url}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => { const updated = await removeTab(t.url); setTabs(updated); }}>
                  <Text style={styles.remove}>Kapat</Text>
                </TouchableOpacity>
              </View>
            ))}
            {tabs.length === 0 && <Text style={styles.empty}>Açık sekme yok.</Text>}
            <TouchableOpacity style={styles.saveBtn} onPress={() => { setShowTabs(false); navigation.navigate("Siteler", { screen: "Sites" }); }}>
              <Text style={styles.saveText}>Yeni Sekme (Site Listesi)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTabs(false)}>
              <Text style={styles.cancel}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <WebView
        ref={webRef}
        source={{ uri: currentUrl }}
        style={styles.web}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={thirdPartyCookies}
        javaScriptEnabled={true}
        domStorageEnabled={domStorage}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        allowFileAccessFromFileURLs={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="always"
        onShouldStartLoadWithRequest={(req) => {
          const url = req?.url || "";
          if (httpsOnly && url.startsWith("http://")) {
            const httpsUrl = url.replace(/^http:/, "https:");
            webRef.current?.loadUrl(httpsUrl);
            return false;
          }
          if (adBlock && isBlockedUrl(url)) return false;
          if (isUnsafeUrl(url)) {
            Alert.alert("Güvenlik", "Şüpheli bağlantı engellendi.");
            return false;
          }
          return true;
        }}
        onOpenWindow={() => {
          // Popup'ları engelle (yeni pencere açma)
        }}
        injectedJavaScript={`
          (function(){
            try {
              window.open = function(){ return null; };
              document.addEventListener('click', function(e){
                const a = e.target && e.target.closest ? e.target.closest('a') : null;
                if (a && a.target === '_blank') a.target = '_self';
              }, true);
            } catch(e){}
            true;
          })();
        `}
        injectedJavaScriptForMainFrameOnly={true}
        onReceivedSslError={(e) => {
          const handler = e?.nativeEvent?.handler;
          Alert.alert(
            "Güvenlik Uyarısı",
            "Bu site için SSL hatası var. Yine de devam etmek istiyor musunuz?",
            [
              { text: "İptal", style: "cancel", onPress: () => handler?.cancel?.() },
              { text: "Devam Et", onPress: () => handler?.proceed?.() }
            ]
          );
        }}
        onNavigationStateChange={(nav) => { if (nav.url) { setCurrentUrl(nav.url); setAddress(nav.url); } }}
      />
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Hesap Ekle — {site.name}</Text>
            <TextInput style={styles.input} placeholder="E-posta / Kullanıcı" placeholderTextColor="#888" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddAccount}>
              <Text style={styles.saveText}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancel}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#15151f" },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btn: { backgroundColor: "#2a2a3a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 6 },
  btnText: { color: "#fff", fontSize: 12 },
  accountBar: { flexDirection: "row", padding: 8, backgroundColor: "#101018", gap: 6 },
  accountChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "#1a1a24" },
  accountChipActive: { backgroundColor: "#3b82f6" },
  accountChipText: { color: "#fff", fontSize: 12 },
  addressBar: { flexDirection: "row", padding: 8, backgroundColor: "#101018", gap: 6, alignItems: "center" },
  homeBtn: { backgroundColor: "#2a2a3a", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  addressInput: { flex: 1, backgroundColor: "#0b0b0f", color: "#fff", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#2a2a3a", fontSize: 13 },
  goBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 14, justifyContent: "center", borderRadius: 8 },
  goText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  web: { flex: 1 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#15151f", borderRadius: 16, padding: 20 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "#0b0b0f", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#2a2a3a" },
  saveBtn: { backgroundColor: "#3b82f6", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  saveText: { color: "#fff", fontWeight: "700" },
  cancel: { color: "#888", textAlign: "center", marginTop: 12 },
  tabTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  tabUrl: { color: "#666", fontSize: 11, marginTop: 2 }
});