import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SITES } from "../data/sites";
import TVFocusable from "../components/TVFocusable";
import TvFocusScope from "../components/TvFocusScope";
import { useFocusableInput } from "../utils/tvFocus";
import {
  addCustomSite,
  getCustomSites,
  getFavorites,
  removeCustomSite,
  removeFavorite
} from "../utils/storage";
import { getCategories, saveCategories } from "../utils/library";
import { getAdBlock, getRemoteSitesUrl, setAdBlock } from "../utils/settings";

const CARD_W = 190;
const CARD_H = 112;
const CARD_GAP = 12;
const STRIDE = CARD_W + CARD_GAP;

const ICON_RULES = [
  ["youtube", "▶️"],
  ["netflix", "🎬"],
  ["twitch", "🎮"],
  ["disney", "🏰"],
  ["prime", "📺"],
  ["spotify", "🎵"],
  ["exxen", "🎭"],
  ["blutv", "🎥"],
  ["tod", "⚽"],
  ["beIN", "⚽"]
];

function iconForSite(site) {
  const name = `${site?.name || ""} ${site?.url || ""}`.toLowerCase();
  for (const [key, icon] of ICON_RULES) {
    if (name.includes(key.toLowerCase())) return icon;
  }
  if ((site?.category || "").toLowerCase().includes("index")) return "🌐";
  return "🎬";
}

function toUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
    if (u.includes(".") && !u.includes(" ")) u = "https://" + u;
    else u = "https://www.google.com/search?q=" + encodeURIComponent(u);
  }
  return u;
}

export default function SitesScreen({ navigation }) {
  const [sites, setSites] = useState(SITES);
  const [favorites, setFavorites] = useState([]);
  const [customSites, setCustomSites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [adBlock, setAdBlockState] = useState(true);

  const [showCreateCat, setShowCreateCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [addTarget, setAddTarget] = useState(null);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const searchFocus = useFocusableInput();
  const catNameFocus = useFocusableInput();
  const siteNameFocus = useFocusableInput();
  const siteUrlFocus = useFocusableInput();

  const outerRef = useRef(null);
  const rowRefs = useRef({});
  const sectionY = useRef({});
  const lastSection = useRef(null);

  const load = useCallback(async () => {
    const [favs, custom, cats, adb] = await Promise.all([
      getFavorites(),
      getCustomSites(),
      getCategories(),
      getAdBlock()
    ]);
    setFavorites(favs);
    setCustomSites(custom);
    setCategories(cats);
    setAdBlockState(adb);

    // Uzak site listesi (varsa) Onerilenler bolumune eklenir.
    try {
      const remoteUrl = await getRemoteSitesUrl();
      const res = await fetch(remoteUrl);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          setSites(() => {
            const merged = [...SITES];
            remote.forEach((r) => {
              if (r && r.url && !merged.some((s) => s.url === r.url)) merged.push(r);
            });
            return merged;
          });
        }
      }
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    const list = [];

    list.push({
      id: "recommended",
      title: "Önerilenler",
      kind: "fixed",
      canAdd: false,
      items: sites.map((s) => ({
        id: s.id || s.url,
        name: s.name,
        url: s.url,
        icon: iconForSite(s),
        site: s
      }))
    });

    list.push({
      id: "favorites",
      title: "Favoriler",
      kind: "favorites",
      canAdd: false,
      items: favorites.map((f, i) => ({
        id: `fav_${i}_${f.url}`,
        name: f.title || f.siteName || f.url,
        url: f.url,
        icon: "⭐",
        favorite: f,
        site: {
          id: f.siteId || f.siteName || "favorite",
          name: f.siteName || f.title || "Favori",
          url: f.url
        }
      }))
    });

    if (customSites.length) {
      list.push({
        id: "legacy",
        title: "Eklediklerim",
        kind: "legacy",
        canAdd: true,
        items: customSites.map((s) => ({
          id: s.id || s.url,
          name: s.name,
          url: s.url,
          icon: "🔖",
          site: s
        }))
      });
    }

    categories.forEach((c) => {
      list.push({
        id: c.id,
        title: c.title,
        kind: "custom",
        canAdd: true,
        items: (c.items || []).map((it) => ({
          id: it.id || it.url,
          name: it.name,
          url: it.url,
          icon: "🔖",
          site: {
            id: it.id || `cat_${it.url}`,
            name: it.name,
            url: it.url
          }
        }))
      });
    });

    return list;
  }, [sites, favorites, customSites, categories]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set();
    const items = [];
    sections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (seen.has(it.url)) return;
        const haystack = `${it.name || ""} ${it.url || ""}`.toLowerCase();
        if (haystack.includes(q)) {
          seen.add(it.url);
          items.push(it);
        }
      });
    });
    return items;
  }, [query, sections]);

  const displaySections = searchResults
    ? [{ id: "search", title: `Arama: "${query.trim()}"`, kind: "search", items: searchResults }]
    : sections;

  // --- odak takibi: kart ekranin disina ciktiginda satiri ve bolumu kaydir ---
  const handleCardFocus = useCallback((sectionId, index) => {
    const row = rowRefs.current[sectionId];
    if (row) {
      row.scrollTo({ x: Math.max(0, index * STRIDE - STRIDE), animated: true });
    }
    if (lastSection.current !== sectionId) {
      lastSection.current = sectionId;
      const y = sectionY.current[sectionId];
      if (typeof y === "number") {
        outerRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    }
  }, []);

  const openItem = useCallback(
    (item) => {
      if (!item?.site) return;
      navigation.navigate("WebView", { site: item.site, initialUrl: item.url });
    },
    [navigation]
  );

  const handleSearch = useCallback(() => {
    const url = toUrl(query);
    if (!url) return;
    navigation.navigate("WebView", {
      site: { id: "search", name: "Arama", url },
      initialUrl: url
    });
  }, [navigation, query]);

  const openSettings = useCallback(() => {
    navigation.getParent()?.navigate("Ayarlar");
  }, [navigation]);

  const toggleAdBlock = useCallback(async () => {
    const next = !adBlock;
    setAdBlockState(next);
    await setAdBlock(next);
  }, [adBlock]);

  // --- kategori islemleri ---
  const handleCreateCategory = async () => {
    const title = newCatName.trim();
    if (!title) return;
    const next = [...categories, { id: `cat_${Date.now()}`, title, items: [] }];
    setCategories(next);
    await saveCategories(next);
    setNewCatName("");
    setShowCreateCat(false);
  };

  const moveCategory = async (id, dir) => {
    const idx = categories.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[idx], next[target]] = [next[target], next[idx]];
    setCategories(next);
    await saveCategories(next);
  };

  const deleteCategory = (category) => {
    Alert.alert("Kategoriyi sil", `"${category.title}" kategorisi silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const next = categories.filter((c) => c.id !== category.id);
          setCategories(next);
          await saveCategories(next);
        }
      }
    ]);
  };

  // --- site islemleri ---
  const openAddSite = (section) => {
    setAddTarget(section);
    setSiteName("");
    setSiteUrl("");
  };

  const handleSaveSite = async () => {
    const name = siteName.trim();
    let url = siteUrl.trim();
    if (!name || !url) {
      Alert.alert("Eksik", "Site adı ve adres gerekli.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    if (addTarget?.kind === "custom") {
      const next = categories.map((c) =>
        c.id === addTarget.id
          ? { ...c, items: [...(c.items || []), { id: `item_${Date.now()}`, name, url }] }
          : c
      );
      setCategories(next);
      await saveCategories(next);
    } else {
      await addCustomSite({
        id: `custom_${Date.now()}`,
        name,
        url,
        category: "Eklediklerim",
        createdAt: Date.now()
      });
    }

    setAddTarget(null);
    setSiteName("");
    setSiteUrl("");
    load();
  };

  const removeItem = async (section, item) => {
    if (section.kind === "favorites" && item.favorite) {
      await removeFavorite(item.favorite.siteId, item.favorite.url);
    } else if (section.kind === "custom") {
      const next = categories.map((c) =>
        c.id === section.id
          ? { ...c, items: (c.items || []).filter((i) => (i.id || i.url) !== (item.id || item.url)) }
          : c
      );
      setCategories(next);
      await saveCategories(next);
    } else if (section.kind === "legacy") {
      await removeCustomSite(item.url);
    }
    load();
  };

  const moveItem = async (section, index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= section.items.length) return;
    if (section.kind !== "custom") return;

    const next = categories.map((c) => {
      if (c.id !== section.id) return c;
      const items = [...(c.items || [])];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...c, items };
    });
    setCategories(next);
    await saveCategories(next);
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={outerRef} style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ust bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>StreamHub</Text>
          <View style={{ flex: 1 }} />
          <TVFocusable
            style={[styles.topBtn, adBlock && styles.topBtnOn]}
            radius={10}
            onPress={toggleAdBlock}
          >
            <Ionicons
              name={adBlock ? "shield-checkmark" : "shield-outline"}
              size={20}
              color={adBlock ? "#7ee787" : "#ddd"}
            />
            <Text style={[styles.topBtnText, adBlock && styles.topBtnTextOn]}>
              Reklam: {adBlock ? "Açık" : "Kapalı"}
            </Text>
          </TVFocusable>
          <TVFocusable style={styles.topBtn} radius={10} onPress={openSettings}>
            <Ionicons name="settings-outline" size={20} color="#ddd" />
            <Text style={styles.topBtnText}>Ayarlar</Text>
          </TVFocusable>
        </View>

        {/* arama */}
        <View style={[styles.searchWrap, searchFocus.focused && styles.searchWrapFocused]}>
          <Ionicons name="search" size={22} color={searchFocus.focused ? "#4a9eff" : "#666"} />
          <TextInput
            {...searchFocus.focusProps}
            style={styles.searchInput}
            placeholder="URL girin veya web'de arayın..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
          />
          <TVFocusable style={styles.searchBtn} radius={8} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Ara</Text>
          </TVFocusable>
        </View>

        {/* arac cubugu */}
        <View style={styles.toolbar}>
          <TVFocusable style={styles.toolBtn} radius={8} onPress={() => setShowCreateCat(true)}>
            <Ionicons name="add" size={20} color="#ddd" />
            <Text style={styles.toolText}>Kategori Oluştur</Text>
          </TVFocusable>
          <TVFocusable
            style={[styles.toolBtn, editMode && styles.toolBtnEdit]}
            radius={8}
            onPress={() => setEditMode((v) => !v)}
          >
            <Ionicons
              name={editMode ? "checkmark" : "pencil"}
              size={18}
              color={editMode ? "#cbb6ff" : "#ddd"}
            />
            <Text style={[styles.toolText, editMode && styles.toolTextEdit]}>
              {editMode ? "Bitti" : "Düzenle"}
            </Text>
          </TVFocusable>
          <View style={{ flex: 1 }} />
          <Text style={styles.hintText}>
            {editMode ? "Taşımak için ‹ › , silmek için ×" : "Kumanda: yön tuşları + OK"}
          </Text>
        </View>

        {displaySections.map((section) => (
          <View
            key={section.id}
            style={styles.sectionWrap}
            onLayout={(e) => {
              sectionY.current[section.id] = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {editMode && section.kind === "custom" && (
                <View style={styles.sectionControls}>
                  <TVFocusable
                    style={styles.ctrlBtn}
                    radius={7}
                    onPress={() => moveCategory(section.id, -1)}
                  >
                    <Text style={styles.ctrlText}>↑</Text>
                  </TVFocusable>
                  <TVFocusable
                    style={styles.ctrlBtn}
                    radius={7}
                    onPress={() => moveCategory(section.id, 1)}
                  >
                    <Text style={styles.ctrlText}>↓</Text>
                  </TVFocusable>
                  <TVFocusable
                    style={[styles.ctrlBtn, styles.ctrlDelete]}
                    radius={7}
                    onPress={() => {
                      const cat = categories.find((c) => c.id === section.id);
                      if (cat) deleteCategory(cat);
                    }}
                  >
                    <Text style={styles.ctrlDeleteText}>🗑</Text>
                  </TVFocusable>
                </View>
              )}
            </View>

            {section.items.length === 0 && !section.canAdd ? (
              <Text style={styles.emptyRow}>
                {section.kind === "search"
                  ? "Sonuç bulunamadı."
                  : "Henüz favori yok. Bir siteyi açıp ★ Favori ile ekleyebilirsin."}
              </Text>
            ) : (
              <ScrollView
                ref={(r) => {
                  rowRefs.current[section.id] = r;
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
              >
                {section.items.map((item, index) => (
                  <TVFocusable
                    key={item.id}
                    radius={12}
                    style={styles.card}
                    focusable={!editMode}
                    onFocus={() => handleCardFocus(section.id, index)}
                    onPress={() => openItem(item)}
                  >
                    <View style={styles.cardShade} />
                    <Text style={styles.cardIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.cardName} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {editMode && section.kind !== "fixed" && section.kind !== "search" && (
                      <View style={styles.cardTools} pointerEvents="box-none">
                        <TVFocusable
                          style={styles.cardTool}
                          radius={7}
                          onPress={() => removeItem(section, item)}
                        >
                          <Text style={styles.cardToolText}>×</Text>
                        </TVFocusable>
                        {section.kind === "custom" && (
                          <View style={styles.cardMoveRow}>
                            <TVFocusable
                              style={styles.cardTool}
                              radius={7}
                              onPress={() => moveItem(section, index, -1)}
                            >
                              <Text style={styles.cardToolText}>‹</Text>
                            </TVFocusable>
                            <TVFocusable
                              style={styles.cardTool}
                              radius={7}
                              onPress={() => moveItem(section, index, 1)}
                            >
                              <Text style={styles.cardToolText}>›</Text>
                            </TVFocusable>
                          </View>
                        )}
                      </View>
                    )}
                  </TVFocusable>
                ))}

                {section.canAdd && (
                  <TVFocusable
                    radius={12}
                    style={styles.addCard}
                    onFocus={() => handleCardFocus(section.id, section.items.length)}
                    onPress={() => openAddSite(section)}
                  >
                    <Text style={styles.addPlus}>+</Text>
                    <Text style={styles.addLabel}>Site Ekle</Text>
                  </TVFocusable>
                )}
              </ScrollView>
            )}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* kategori olustur */}
      <Modal visible={showCreateCat} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TvFocusScope />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Kategori Oluştur</Text>
            <Text style={styles.modalLabel}>Kategori Adı</Text>
            <TextInput
              {...catNameFocus.focusProps}
              style={[styles.input, catNameFocus.focused && styles.inputFocused]}
              placeholder="Örn: Haberler, Müzik, Oyun"
              placeholderTextColor="#666"
              value={newCatName}
              onChangeText={setNewCatName}
              onSubmitEditing={handleCreateCategory}
            />
            <View style={styles.modalActions}>
              <TVFocusable
                style={styles.modalSecondary}
                radius={9}
                onPress={() => {
                  setShowCreateCat(false);
                  setNewCatName("");
                }}
              >
                <Text style={styles.modalSecondaryText}>İptal</Text>
              </TVFocusable>
              <TVFocusable style={styles.modalPrimary} radius={9} hasTVPreferredFocus onPress={handleCreateCategory}>
                <Text style={styles.modalPrimaryText}>Oluştur</Text>
              </TVFocusable>
            </View>
          </View>
        </View>
      </Modal>

      {/* site ekle */}
      <Modal visible={!!addTarget} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TvFocusScope />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{addTarget?.title || ""} — Site Ekle</Text>
            <Text style={styles.modalLabel}>Site Adı</Text>
            <TextInput
              {...siteNameFocus.focusProps}
              style={[styles.input, siteNameFocus.focused && styles.inputFocused]}
              placeholder="Örn: YouTube"
              placeholderTextColor="#666"
              value={siteName}
              onChangeText={setSiteName}
            />
            <Text style={styles.modalLabel}>Site Linki</Text>
            <TextInput
              {...siteUrlFocus.focusProps}
              style={[styles.input, siteUrlFocus.focused && styles.inputFocused]}
              placeholder="https://youtube.com"
              placeholderTextColor="#666"
              value={siteUrl}
              onChangeText={setSiteUrl}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSaveSite}
            />
            <View style={styles.modalActions}>
              <TVFocusable
                style={styles.modalSecondary}
                radius={9}
                onPress={() => {
                  setAddTarget(null);
                  setSiteName("");
                  setSiteUrl("");
                }}
              >
                <Text style={styles.modalSecondaryText}>İptal</Text>
              </TVFocusable>
              <TVFocusable style={styles.modalPrimary} radius={9} hasTVPreferredFocus onPress={handleSaveSite}>
                <Text style={styles.modalPrimaryText}>Ekle</Text>
              </TVFocusable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },

  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  brand: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  topBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a"
  },
  topBtnOn: { backgroundColor: "#16281a", borderColor: "#2f5a35" },
  topBtnText: { color: "#ddd", fontSize: 16, fontWeight: "600" },
  topBtnTextOn: { color: "#7ee787" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 10
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 18, paddingVertical: 0 },
  searchWrapFocused: { borderColor: "#4a9eff", backgroundColor: "#1b2533" },
  searchBtn: { backgroundColor: "#4a9eff", paddingHorizontal: 18, height: 40, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, minHeight: 44 },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a"
  },
  toolBtnEdit: { backgroundColor: "#3a2a5a", borderColor: "#6a4aaa" },
  toolText: { color: "#ddd", fontSize: 16, fontWeight: "600" },
  toolTextEdit: { color: "#cbb6ff" },
  hintText: { color: "#666", fontSize: 14 },

  sectionWrap: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 34,
    marginBottom: 8
  },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  sectionControls: { flexDirection: "row", gap: 6 },
  ctrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    alignItems: "center",
    justifyContent: "center"
  },
  ctrlText: { color: "#ccc", fontSize: 16, fontWeight: "700" },
  ctrlDelete: { backgroundColor: "#2a1420", borderColor: "#4a2020" },
  ctrlDeleteText: { color: "#f77", fontSize: 15 },

  row: { gap: CARD_GAP, paddingRight: 24 },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    backgroundColor: "#1c1c24",
    borderWidth: 1,
    borderColor: "#2a2a32",
    padding: 12,
    overflow: "hidden"
  },
  cardShade: {
    position: "absolute",
    left: -30,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(74,158,255,0.10)"
  },
  cardIcon: { fontSize: 24 },
  cardName: { color: "#fff", fontSize: 18, fontWeight: "700", lineHeight: 22 },
  cardTools: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    justifyContent: "space-between"
  },
  cardMoveRow: { flexDirection: "row", justifyContent: "space-between" },
  cardTool: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end"
  },
  cardToolText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  addCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3a3a3a",
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  addPlus: { color: "#4a9eff", fontSize: 30, fontWeight: "300", lineHeight: 32 },
  addLabel: { color: "#888", fontSize: 14 },

  emptyRow: {
    color: "#666",
    fontSize: 16,
    padding: 18,
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2a2a2a"
  },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 40 },
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
  modalLabel: { color: "#888", fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: "#0f0f0f",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 17,
    marginBottom: 10
  },
  inputFocused: { borderColor: "#4a9eff", backgroundColor: "#1b2533" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  modalPrimary: { backgroundColor: "#4a9eff", paddingHorizontal: 22, height: 46, justifyContent: "center" },
  modalPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalSecondary: { backgroundColor: "#2a2a2a", paddingHorizontal: 22, height: 46, justifyContent: "center" },
  modalSecondaryText: { color: "#fff", fontSize: 16, fontWeight: "600" }
});
