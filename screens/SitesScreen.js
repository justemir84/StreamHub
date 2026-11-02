import React, { useState, useCallback } from "react";
import { FlatList, Text, TouchableOpacity, View, StyleSheet, TextInput, Modal, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SITES } from "../data/sites";
import TVFocusable from "../components/TVFocusable";
import { getCustomSites, addCustomSite, removeCustomSite } from "../utils/storage";
import { getRemoteSitesUrl } from "../utils/settings";

export default function SitesScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [sites, setSites] = useState(SITES);
  const [sort, setSort] = useState("name"); // name | recent
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Movies & Shows");

  const loadSites = useCallback(async () => {
    let merged = [...SITES];
    // custom
    const custom = await getCustomSites();
    merged = merged.concat(custom);
    // remote
    try {
      const remoteUrl = await getRemoteSitesUrl();
      const res = await fetch(remoteUrl);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          remote.forEach(r => {
            if (!merged.some(s => s.url === r.url)) merged.push(r);
          });
        }
      }
    } catch (e) {}
    setSites(merged);
  }, []);

  useFocusEffect(useCallback(() => { loadSites(); }, [loadSites]));

  const filtered = sites
    .filter(s => (s.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "recent") return (b.createdAt || 0) - (a.createdAt || 0);
      return (a.name || "").localeCompare(b.name || "");
    });

  const handleAdd = async () => {
    if (!name || !url) { Alert.alert("Eksik", "Ad ve URL gerekli."); return; }
    const site = { id: "custom_" + Date.now(), name, url, category };
    await addCustomSite(site);
    setName(""); setUrl(""); setCategory("Movies & Shows"); setShowAdd(false);
    loadSites();
  };

  const handleRemoveCustom = async (site) => {
    if (!site.id?.startsWith("custom_")) return;
    await removeCustomSite(site.url);
    loadSites();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Site ara..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Site</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSort(sort === "name" ? "recent" : "name")}>
          <Text style={styles.addBtnText}>{sort === "name" ? "A-Z" : "Son"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id || item.url}
        renderItem={({ item }) => (
          <TVFocusable style={styles.card} onPress={() => navigation.navigate("WebView", { site: item })} onLongPress={() => handleRemoveCustom(item)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.url}>{item.url}</Text>
            <Text style={styles.cat}>{item.category}</Text>
            {item.id?.startsWith("custom_") && <Text style={styles.customTag}>Özel</Text>}
          </TVFocusable>
        )}
      />
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Site Ekle</Text>
            <TextInput style={styles.input} placeholder="Site adı" placeholderTextColor="#888" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#888" value={url} onChangeText={setUrl} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Kategori" placeholderTextColor="#888" value={category} onChangeText={setCategory} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
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
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 12 },
  topRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  search: { backgroundColor: "#1a1a24", color: "#fff", padding: 12, borderRadius: 10 },
  addBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 14, justifyContent: "center", borderRadius: 10 },
  sortBtn: { backgroundColor: "#2a2a3a", paddingHorizontal: 12, justifyContent: "center", borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#15151f", padding: 20, borderRadius: 14, marginBottom: 12, borderWidth: 2, borderColor: "transparent", minHeight: 80 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  url: { color: "#888", fontSize: 12, marginTop: 2 },
  cat: { color: "#555", fontSize: 11, marginTop: 4 },
  customTag: { color: "#f59e0b", fontSize: 10, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#15151f", borderRadius: 16, padding: 20 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "#0b0b0f", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#2a2a3a" },
  saveBtn: { backgroundColor: "#3b82f6", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  saveText: { color: "#fff", fontWeight: "700" },
  cancel: { color: "#888", textAlign: "center", marginTop: 12 }
});