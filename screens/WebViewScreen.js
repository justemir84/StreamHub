import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { getAccounts, saveAccount, addFavorite } from "../utils/storage";
import { getSelectors } from "../data/sites";
import { getTabs, addTab, removeTab } from "../utils/tabs";
import {
  getAdBlock,
  getHttpsOnly,
  getDomStorage,
  getThirdPartyCookies,
  getPopupBlock,
  getCursorMode,
  setCursorMode
} from "../utils/settings";
import { isBlockedUrl, isUnsafeUrl } from "../utils/blocklist";
import TVFocusable from "../components/TVFocusable";
import TvFocusScope from "../components/TvFocusScope";
import { useFocusableInput } from "../utils/tvFocus";
import { PAGE_SCRIPT, cursorCommand, moveCommand, clickCommand } from "../utils/tvNav";

function toUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
    if (u.includes(".") && !u.includes(" ")) u = "https://" + u;
    else u = "https://www.google.com/search?q=" + encodeURIComponent(u);
  }
  return u;
}

function escapeForScript(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function NavButton({ icon, onPress, disabled = false, active = false, label, hasTVPreferredFocus = false }) {
  return (
    <TVFocusable
      radius={8}
      disabled={disabled}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onPress={onPress}
      style={[styles.navBtn, active && styles.navBtnActive, disabled && styles.navBtnDisabled]}
    >
      <Ionicons name={icon} size={20} color={active ? "#fff" : "#cfcfcf"} />
      {!!label && <Text style={[styles.navBtnLabel, active && styles.navBtnLabelActive]}>{label}</Text>}
    </TVFocusable>
  );
}

export default function WebViewScreen({ route, navigation }) {
  useKeepAwake();

  const { site, initialUrl } = route.params;
  const webRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sourceUrl, setSourceUrl] = useState(initialUrl || site.url);
  const [currentUrl, setCurrentUrl] = useState(initialUrl || site.url);
  const [address, setAddress] = useState(initialUrl || site.url);
  const [pageTitle, setPageTitle] = useState(site.name);
  const [tabs, setTabs] = useState([]);
  const [showTabs, setShowTabs] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adBlock, setAdBlock] = useState(true);
  const [httpsOnly, setHttpsOnly] = useState(true);
  const [domStorage, setDomStorage] = useState(true);
  const [thirdPartyCookies, setThirdPartyCookies] = useState(true);
  const [popupBlock, setPopupBlock] = useState(true);
  const [cursorMode, setCursorModeState] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [toolbarFocusKey, setToolbarFocusKey] = useState(0);
  const addressFocus = useFocusableInput();
  const usernameFocus = useFocusableInput();
  const passwordFocus = useFocusableInput();

  // WebView'deki D-pad / OK tuslarini yakalayan ana konteyner ref'i.
  // WebView native odağı almadigi icin (requestFocus kaldirildi) RN bu tuslari
  // yakalayip cursor modunda __STREAMHUB_MOVE__ / __STREAMHUB_CLICK__ olarak
  // sayfaya enjekte eder; focus modunda ise KeyboardEvent ile sayfaya iletir.
  const keyCaptureRef = useRef(null);

  useEffect(() => {
    getAdBlock().then(setAdBlock);
    getHttpsOnly().then(setHttpsOnly);
    getDomStorage().then(setDomStorage);
    getThirdPartyCookies().then(setThirdPartyCookies);
    getPopupBlock().then(setPopupBlock);
    getCursorMode().then(setCursorModeState);
  }, []);

  useEffect(() => {
    getAccounts().then((list) => {
      const filtered = list.filter((a) => a.siteId === site.id);
      setAccounts(filtered);
      if (filtered.length) setSelected(filtered[0]);
    });
    getTabs().then(setTabs);
    addTab({ title: site.name, url: initialUrl || site.url, siteId: site.id }).then(setTabs);
  }, [site.id]);

  useEffect(() => {
    if (!initialUrl) return;
    setSourceUrl(initialUrl);
    setCurrentUrl(initialUrl);
    setAddress(initialUrl);
    setError(null);
  }, [initialUrl]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showAdd) {
        setShowAdd(false);
        return true;
      }
      if (showTabs) {
        setShowTabs(false);
        return true;
      }
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showAdd, showTabs, canGoBack]);

  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, [showHint]);

  const goHome = () => {
    navigation?.navigate("Siteler", { screen: "Sites" });
  };

  const openUrl = useCallback((raw) => {
    const url = toUrl(raw);
    if (!url) return;
    setError(null);
    setSourceUrl(url);
    setCurrentUrl(url);
    setAddress(url);
  }, []);

  const applyCursorMode = useCallback((on) => {
    try {
      webRef.current?.injectJavaScript(cursorCommand(on));
    } catch (e) {}
  }, []);

  const toggleCursor = useCallback(() => {
    const next = !cursorMode;
    setCursorModeState(next);
    setCursorMode(next).catch(() => {});
    applyCursorMode(next);
    if (next) setShowHint(true);
  }, [cursorMode, applyCursorMode]);

  // D-pad / OK tuslarini yakalar. Cursor modu acikken __STREAMHUB_MOVE__ /
  // __STREAMHUB_CLICK__ komutlarini WebView'e enjekte eder; focus modunda ise
  // sayfadaki odak motorunun calismasi icin KeyboardEvent'i sayfaya iletir.
  const handleKeyDown = useCallback(
    (e) => {
      const nativeEvent = e.nativeEvent || e;
      const key = nativeEvent.key || "";
      const code = nativeEvent.keyCode || 0;

      const up = key === "ArrowUp" || code === 38 || code === 19;
      const down = key === "ArrowDown" || code === 40 || code === 20;
      const left = key === "ArrowLeft" || code === 37 || code === 21;
      const right = key === "ArrowRight" || code === 39 || code === 22;
      const ok = key === "Enter" || code === 13 || key === " " || code === 32 || code === 23 || code === 66;

      if (!(up || down || left || right || ok)) return;

      try {
        e.preventDefault?.();
      } catch (_) {}

      if (cursorMode) {
        if (up || down || left || right) {
          const dir = up ? "up" : down ? "down" : left ? "left" : "right";
          webRef.current?.injectJavaScript(moveCommand(dir));
        } else if (ok) {
          webRef.current?.injectJavaScript(clickCommand());
        }
      } else {
        // Focus modu: sayfadaki odak movimentasyonu icin bir KeyboardEvent
        // uretir. TV focus script'i (PAGE_SCRIPT) bu eventi yakalar.
        let keyName = "";
        let keyCode = 0;
        if (up) { keyName = "ArrowUp"; keyCode = 38; }
        else if (down) { keyName = "ArrowDown"; keyCode = 40; }
        else if (left) { keyName = "ArrowLeft"; keyCode = 37; }
        else if (right) { keyName = "ArrowRight"; keyCode = 39; }
        else if (ok) { keyName = "Enter"; keyCode = 13; }

        const script = `(function(){var ev=new KeyboardEvent('keydown',{key:'${keyName}',code:'${keyName}',keyCode:${keyCode},which:${keyCode},bubbles:true,cancelable:true});document.dispatchEvent(ev);return true;})();`;
        webRef.current?.injectJavaScript(script);
      }
    },
    [cursorMode, moveCommand, clickCommand]
  );

  // WebView'den gelen mesajlari isler. 'streamhub:toToolbar' imlecin en
  // ustteyken UP tusuna gelince araç çubuğuna odagi donmeye calisir.
  const handleMessage = useCallback(
    (e) => {
      const data = e?.nativeEvent?.data;
      if (data === "streamhub:toToolbar") {
        setToolbarFocusKey((k) => k + 1);
      }
    },
    []
  );

  const handleAddAccount = async () => {
    if (!username) return;
    const acc = { siteId: site.id, username, password, createdAt: Date.now() };
    const updated = await saveAccount(acc);
    const filtered = updated.filter((a) => a.siteId === site.id);
    setAccounts(filtered);
    if (!selected) setSelected(filtered[0]);
    setShowAdd(false);
    setUsername("");
    setPassword("");
    Alert.alert("Kaydedildi", "Hesap bilgisi saklandı.");
  };

  const handleAutoFill = () => {
    if (!selected) {
      Alert.alert("Hesap yok", "Önce hesap ekleyin.");
      return;
    }
    const sel = getSelectors(site.id);
    const u = escapeForScript(selected.username);
    const p = escapeForScript(selected.password);
    const uSelectors = JSON.stringify(sel.username);
    const pSelectors = JSON.stringify(sel.password);
    const script = `
      (function(){
        function trySet(selectors, val){
          for (const s of selectors){
            const el = document.querySelector(s);
            if (el){
              el.value = val;
              el.dispatchEvent(new Event('input',{bubbles:true}));
              el.dispatchEvent(new Event('change',{bubbles:true}));
              return true;
            }
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
    const fav = {
      siteId: site.id,
      siteName: site.name,
      siteUrl: site.url,
      url: currentUrl,
      title: pageTitle || currentUrl,
      createdAt: Date.now()
    };
    await addFavorite(fav);
    Alert.alert("Eklendi", "Favorilere eklendi.");
  };

  const handlePopout = (target) => {
    if (!target) return;
    if (adBlock && isBlockedUrl(target)) return;
    if (popupBlock) {
      try {
        const base = new URL(currentUrl);
        const next = new URL(target);
        if (next.hostname !== base.hostname) return;
      } catch (e) {
        return;
      }
    }
    openUrl(target);
  };

  return (
    <View
      style={styles.container}
      focusable={true}
      hasTVPreferredFocus={true}
      onKeyDown={handleKeyDown}
    >
      {/* tarayici arac cubugu */}
      <View style={styles.toolbar}>
        <NavButton
          icon="home-outline"
          onPress={goHome}
          hasTVPreferredFocus
          focusable={!cursorMode}
          key={toolbarFocusKey}
        />
        <NavButton
          icon="arrow-back"
          disabled={!canGoBack}
          onPress={() => webRef.current?.goBack()}
          focusable={!cursorMode}
        />
        <NavButton
          icon="arrow-forward"
          disabled={!canGoForward}
          onPress={() => webRef.current?.goForward()}
          focusable={!cursorMode}
        />
        <NavButton icon="refresh" onPress={() => webRef.current?.reload()} focusable={!cursorMode} />

        <TextInput
          {...addressFocus.focusProps}
          style={[
            styles.addressInput,
            addressFocus.focused && styles.addressInputFocused,
          ]}
          value={address}
          onChangeText={setAddress}
          placeholder="URL girin veya arayın..."
          placeholderTextColor="#777"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => openUrl(address)}
          focusable={!cursorMode}
        />

        <NavButton icon="star-outline" onPress={handleAddFavorite} focusable={!cursorMode} />
        <NavButton icon="person-outline" onPress={() => setShowAdd(true)} focusable={!cursorMode} />
        <NavButton
          icon="radio-button-on"
          label="Fare"
          active={cursorMode}
          onPress={toggleCursor}
          focusable={!cursorMode}
        />
        {loading && <ActivityIndicator size="small" color="#4a9eff" style={styles.spinner} />}
      </View>

      {accounts.length > 1 && (
        <ScrollView horizontal focusable={false} showsHorizontalScrollIndicator={false} style={styles.accountBar} contentContainerStyle={styles.accountBarContent}>
          {accounts.map((a, i) => (
            <TVFocusable
              key={i}
              radius={14}
              onPress={() => setSelected(a)}
              style={[styles.accountChip, selected?.username === a.username && styles.accountChipActive]}
            >
              <Text style={styles.accountChipText}>{a.username}</Text>
            </TVFocusable>
          ))}
          <TVFocusable radius={14} style={styles.accountChip} onPress={handleAutoFill}>
            <Text style={styles.accountChipText}>Oto-doldur</Text>
          </TVFocusable>
        </ScrollView>
      )}

      <View style={styles.webWrap}>
        <WebView
          ref={webRef}
          source={{ uri: sourceUrl }}
          style={styles.web}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={thirdPartyCookies}
          javaScriptEnabled={true}
          domStorageEnabled={domStorage}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          allowFileAccessFromFileURLs={false}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          androidLayerType="hardware"
          setBuiltInZoomControls={false}
          displayZoomControls={false}
          mixedContentMode="compatibility"
          setSupportMultipleWindows={true}
          javaScriptCanOpenWindowsAutomatically={false}
          originWhitelist={["*"]}
          injectedJavaScript={PAGE_SCRIPT}
          injectedJavaScriptForMainFrameOnly={true}
          onShouldStartLoadWithRequest={(req) => {
            const url = req?.url || "";
            if (!url || url === "about:blank") return true;
            if (httpsOnly && url.startsWith("http://")) {
              webRef.current?.loadUrl(url.replace(/^http:/, "https:"));
              return false;
            }
            if (adBlock && isBlockedUrl(url)) return false;
            if (isUnsafeUrl(url)) {
              Alert.alert("Güvenlik", "Şüpheli bağlantı engellendi.");
              return false;
            }
            return true;
          }}
          onOpenWindow={(e) => handlePopout(e?.nativeEvent?.targetUrl)}
          onLoadStart={() => {
            setLoading(true);
            setError(null);
          }}
          onLoadEnd={() => {
            setLoading(false);
            // WebView native odağı almayacak; D-pad tuslari RN'de yakalanip
            // sayfaya enjekte edilecek. requestFocus() cagirilmamali.
            if (cursorMode) applyCursorMode(true);
          }}
          onMessage={handleMessage}
          onError={(e) => {
            setLoading(false);
            setError(e?.nativeEvent?.description || "Sayfa yüklenemedi.");
          }}
          onHttpError={(e) => {
            const code = e?.nativeEvent?.statusCode;
            if (code && code >= 400) setError(`Sunucu hatası (HTTP ${code}).`);
          }}
          onRenderProcessGone={() => {
            Alert.alert("Sayfa çöktü", "Sayfa yeniden yükleniyor.");
            webRef.current?.reload();
          }}
          onNavigationStateChange={(nav) => {
            if (nav.url) {
              setCurrentUrl(nav.url);
              setAddress(nav.url);
            }
            setCanGoBack(!!nav.canGoBack);
            setCanGoForward(!!nav.canGoForward);
            if (nav.title) setPageTitle(nav.title);
          }}
        />

        {cursorMode && showHint && (
          <View style={styles.cursorHint} pointerEvents="none">
            <Text style={styles.cursorHintText}>
              Fare modu: yön tuşları daireyi gezer, OK tıklar
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Sayfa açılamadı</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TVFocusable style={styles.saveBtn} radius={10} onPress={() => webRef.current?.reload()}>
              <Text style={styles.saveText}>Yeniden Dene</Text>
            </TVFocusable>
          </View>
        )}
      </View>

      <Modal visible={showTabs} transparent animationType="slide">
        <View style={styles.modalBg}>
          <TvFocusScope />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sekmeler</Text>
            <ScrollView focusable={false} style={{ maxHeight: 320 }}>
              {tabs.map((t, i) => (
                <View key={i} style={styles.tabRow}>
                  <TVFocusable
                    radius={8}
                    style={styles.tabOpen}
                    onPress={() => {
                      openUrl(t.url);
                      setShowTabs(false);
                    }}
                  >
                    <Text style={styles.tabTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.tabUrl} numberOfLines={1}>{t.url}</Text>
                  </TVFocusable>
                  <TVFocusable
                    radius={8}
                    style={styles.tabClose}
                    onPress={async () => {
                      const updated = await removeTab(t.url);
                      setTabs(updated);
                    }}
                  >
                    <Text style={styles.remove}>Kapat</Text>
                  </TVFocusable>
                </View>
              ))}
              {tabs.length === 0 && <Text style={styles.empty}>Açık sekme yok.</Text>}
            </ScrollView>
            <TVFocusable
              style={styles.saveBtn}
              radius={10}
              onPress={() => {
                setShowTabs(false);
                navigation.navigate("Siteler", { screen: "Sites" });
              }}
            >
              <Text style={styles.saveText}>Yeni Sekme (Site Listesi)</Text>
            </TVFocusable>
            <TVFocusable style={styles.cancelBtn} radius={10} onPress={() => setShowTabs(false)}>
              <Text style={styles.cancel}>Kapat</Text>
            </TVFocusable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBg}>
          <TvFocusScope />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Hesap Ekle — {site.name}</Text>
            <TextInput
              {...usernameFocus.focusProps}
              style={[styles.input, usernameFocus.focused && styles.inputFocused]}
              placeholder="E-posta / Kullanıcı"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              {...passwordFocus.focusProps}
              style={[styles.input, passwordFocus.focused && styles.inputFocused]}
              placeholder="Şifre"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TVFocusable style={styles.saveBtn} radius={10} onPress={handleAddAccount}>
              <Text style={styles.saveText}>Kaydet</Text>
            </TVFocusable>
            <TVFocusable style={styles.cancelBtn} radius={10} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancel}>İptal</Text>
            </TVFocusable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#151515",
    borderBottomWidth: 1,
    borderBottomColor: "#222"
  },
  navBtn: {
    height: 40,
    minWidth: 40,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5
  },
  navBtnActive: { backgroundColor: "#4a9eff", borderColor: "#6cb4ff" },
  navBtnDisabled: { opacity: 0.35 },
  navBtnLabel: { color: "#cfcfcf", fontSize: 14, fontWeight: "600" },
  navBtnLabelActive: { color: "#fff" },
  addressInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    borderRadius: 8,
    paddingHorizontal: 14,
    color: "#fff",
    fontSize: 16
  },
  addressInputFocused: { borderColor: "#4a9eff", backgroundColor: "#1b2533" },
  spinner: { marginLeft: 4 },

  accountBar: { backgroundColor: "#101010", borderBottomWidth: 1, borderBottomColor: "#1e1e1e", maxHeight: 52 },
  accountBarContent: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  accountChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#1e1e1e" },
  accountChipActive: { backgroundColor: "#4a9eff" },
  accountChipText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  webWrap: { flex: 1 },
  web: { flex: 1 },
  cursorHint: {
    position: "absolute",
    left: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "#4a9eff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cursorHintText: { color: "#cfe4ff", fontSize: 14 },

  errorBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,15,15,0.95)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  errorTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  errorText: { color: "#aaa", fontSize: 16, textAlign: "center", marginBottom: 18 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: 40 },
  modal: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    padding: 24
  },
  modalTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  tabRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  tabOpen: { flex: 1, backgroundColor: "#222", borderRadius: 8, padding: 12 },
  tabClose: { backgroundColor: "#2a1420", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  tabTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tabUrl: { color: "#777", fontSize: 12, marginTop: 2 },
  remove: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#0f0f0f",
    color: "#fff",
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    fontSize: 16
  },
  inputFocused: { borderColor: "#4a9eff", backgroundColor: "#1b2533" },
  saveBtn: { backgroundColor: "#4a9eff", height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { backgroundColor: "#242424", height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 10 },
  cancel: { color: "#aaa", fontSize: 16 },
  empty: { color: "#666", textAlign: "center", marginVertical: 20, fontSize: 16 }
});
