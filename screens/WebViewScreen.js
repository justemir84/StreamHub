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
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import { useKeepAwake } from "expo-keep-awake";
import { getAccounts, saveAccount, addFavorite } from "../utils/storage";
import { getSelectors } from "../data/sites";
import { getTabs, addTab, removeTab } from "../utils/tabs";
import {
  getAdBlock,
  getHttpsOnly,
  getDomStorage,
  getThirdPartyCookies,
  getPopupBlock
} from "../utils/settings";
import { isBlockedUrl, isUnsafeUrl } from "../utils/blocklist";

// TV kumandasinda yon tuslariyla sayfa icinde gezinme.
// WebView'in kendi odak motoru Android TV'de calismadigi icin
// odaklanabilir ogeler arasinda JS ile geciyoruz.
const TV_NAV_SCRIPT = `
(function () {
  try {
    if (window.__STREAMHUB_TV_NAV__) return true;
    window.__STREAMHUB_TV_NAV__ = true;

    var SELECTOR = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';

    function isVisible(el) {
      var r = el.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) return false;
      var s = window.getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    }

    function getItems() {
      return Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (el) {
        return isVisible(el) && !el.disabled && el.getAttribute('aria-hidden') !== 'true';
      });
    }

    function activate(el) {
      if (!el) return;
      try { el.focus(); } catch (e) {}
      try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}
    }

    function move(dir) {
      var list = getItems();
      if (!list.length) return false;
      var i = list.indexOf(document.activeElement);
      if (i < 0) { activate(list[0]); return true; }

      var from = list[i].getBoundingClientRect();
      var cx = from.left + from.width / 2;
      var cy = from.top + from.height / 2;
      var best = -1;
      var bestScore = Infinity;

      for (var j = 0; j < list.length; j++) {
        if (j === i) continue;
        var r = list[j].getBoundingClientRect();
        var dx = (r.left + r.width / 2) - cx;
        var dy = (r.top + r.height / 2) - cy;
        var horizontal = dir === 'ArrowLeft' || dir === 'ArrowRight';
        var delta = horizontal ? dx : dy;
        if (horizontal ? (dir === 'ArrowRight' ? delta <= 4 : delta >= -4)
                       : (dir === 'ArrowDown' ? delta <= 4 : delta >= -4)) continue;
        var primary = Math.abs(delta);
        var secondary = Math.abs(horizontal ? dy : dx);
        var score = primary + secondary * 2;
        if (score < bestScore) { bestScore = score; best = j; }
      }

      if (best >= 0) { activate(list[best]); return true; }
      return false;
    }

    document.addEventListener('keydown', function (e) {
      var target = e.target;
      var tag = target && target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable)) return;

      var active = document.activeElement;
      if (active && active.tagName === 'VIDEO') return;

      var key = e.key || '';
      var code = e.keyCode || 0;

      if (key === 'Enter' || code === 13 || key === ' ' || code === 32) {
        var el = active && active !== document.body ? active : target;
        if (el && el !== document.body && typeof el.click === 'function') {
          e.preventDefault();
          e.stopPropagation();
          el.click();
        }
        return;
      }

      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ||
          code === 37 || code === 38 || code === 39 || code === 40) {
        var dir = key;
        if (!dir) dir = code === 37 ? 'ArrowLeft' : code === 38 ? 'ArrowUp' : code === 39 ? 'ArrowRight' : 'ArrowDown';
        if (move(dir)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);

    return true;
  } catch (e) {
    return false;
  }
})();
true;
`;

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

  useEffect(() => {
    getAdBlock().then(setAdBlock);
    getHttpsOnly().then(setHttpsOnly);
    getDomStorage().then(setDomStorage);
    getThirdPartyCookies().then(setThirdPartyCookies);
    getPopupBlock().then(setPopupBlock);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{site.name}</Text>
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
        <TouchableOpacity
          style={[styles.homeBtn, !canGoBack && styles.btnDisabled]}
          disabled={!canGoBack}
          onPress={() => webRef.current?.goBack()}
        >
          <Text style={styles.goText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.homeBtn, !canGoForward && styles.btnDisabled]}
          disabled={!canGoForward}
          onPress={() => webRef.current?.goForward()}
        >
          <Text style={styles.goText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => webRef.current?.reload()}>
          <Text style={styles.goText}>⟳</Text>
        </TouchableOpacity>
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
          onSubmitEditing={() => openUrl(address)}
        />
        {loading && <ActivityIndicator size="small" color="#3b82f6" />}
        <TouchableOpacity style={styles.goBtn} onPress={() => openUrl(address)}>
          <Text style={styles.goText}>Git</Text>
        </TouchableOpacity>
      </View>

      {accounts.length > 1 && (
        <View style={styles.accountBar}>
          {accounts.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelected(a)}
              style={[styles.accountChip, selected?.username === a.username && styles.accountChipActive]}
            >
              <Text style={styles.accountChipText}>{a.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
          injectedJavaScript={TV_NAV_SCRIPT}
          injectedJavaScriptForMainFrameOnly={true}
          onShouldStartLoadWithRequest={(req) => {
            const url = req?.url || "";
            if (!url || url === "about:blank") return true;
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
          onOpenWindow={(e) => handlePopout(e?.nativeEvent?.targetUrl)}
          onLoadStart={() => {
            setLoading(true);
            setError(null);
          }}
          onLoadEnd={() => {
            setLoading(false);
            // Sayfa yuklendikten sonra kumanda ile sayfa icinde gezinmeye hazir ol.
            try {
              webRef.current?.requestFocus?.();
            } catch (e) {}
          }}
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
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Sayfa açılamadı</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={() => webRef.current?.reload()}>
              <Text style={styles.saveText}>Yeniden Dene</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={showTabs} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sekmeler</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tabs.map((t, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      openUrl(t.url);
                      setShowTabs(false);
                    }}
                  >
                    <Text style={styles.tabTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.tabUrl} numberOfLines={1}>{t.url}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const updated = await removeTab(t.url);
                      setTabs(updated);
                    }}
                  >
                    <Text style={styles.remove}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {tabs.length === 0 && <Text style={styles.empty}>Açık sekme yok.</Text>}
            </ScrollView>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                setShowTabs(false);
                navigation.navigate("Siteler", { screen: "Sites" });
              }}
            >
              <Text style={styles.saveText}>Yeni Sekme (Site Listesi)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTabs(false)}>
              <Text style={styles.cancel}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Hesap Ekle — {site.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="E-posta / Kullanıcı"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
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
  title: { color: "#fff", fontSize: 20, fontWeight: "700", flexShrink: 1, marginRight: 8 },
  btn: { backgroundColor: "#2a2a3a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 6 },
  btnText: { color: "#fff", fontSize: 14 },
  btnDisabled: { opacity: 0.35 },
  accountBar: { flexDirection: "row", padding: 8, backgroundColor: "#101018", gap: 6 },
  accountChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "#1a1a24" },
  accountChipActive: { backgroundColor: "#3b82f6" },
  accountChipText: { color: "#fff", fontSize: 13 },
  addressBar: { flexDirection: "row", padding: 8, backgroundColor: "#101018", gap: 6, alignItems: "center" },
  homeBtn: { backgroundColor: "#2a2a3a", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  addressInput: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a3a",
    fontSize: 15
  },
  goBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 14, justifyContent: "center", borderRadius: 8 },
  goText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  webWrap: { flex: 1 },
  web: { flex: 1 },
  errorBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,11,15,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  errorTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  errorText: { color: "#aaa", fontSize: 15, textAlign: "center", marginBottom: 16 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#15151f", borderRadius: 16, padding: 20 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: "#0b0b0f",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2a2a3a",
    fontSize: 15
  },
  saveBtn: { backgroundColor: "#3b82f6", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancel: { color: "#888", textAlign: "center", marginTop: 12, fontSize: 15 },
  tabTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  tabUrl: { color: "#666", fontSize: 12, marginTop: 2 },
  remove: { color: "#ef4444", fontSize: 14, marginLeft: 12 },
  empty: { color: "#666", textAlign: "center", marginTop: 20 }
});
