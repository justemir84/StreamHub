import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { getFavorites, removeFavorite } from "../utils/storage";
import { SITES } from "../data/sites";
import TVFocusable from "../components/TVFocusable";

export default function FavoritesScreen({ navigation }) {
  const [favs, setFavs] = useState([]);
  const [sort, setSort] = useState("recent");

  const load = () => getFavorites().then(setFavs);
  useFocusEffect(useCallback(() => { load(); }, []));

  const openFav = (fav) => {
    const site = SITES.find(s => s.id === fav.siteId) || { id: fav.siteId, name: fav.siteName || fav.siteId, url: fav.siteUrl };
    navigation.navigate("Siteler", { screen: "WebView", params: { site, initialUrl: fav.url } });
  };

  const handleRemove = async (fav) => {
    const updated = await removeFavorite(fav.siteId, fav.url);
    setFavs(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favoriler</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSort(sort === "title" ? "recent" : "title")}>
          <Text style={styles.sortText}>{sort === "title" ? "A-Z" : "Son"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={[...favs].sort((a, b) => sort === "title" ? (a.title || "").localeCompare(b.title || "") : (b.createdAt || 0) - (a.createdAt || 0))}
        keyExtractor={(item, i) => item.siteId + item.url + i}
        renderItem={({ item }) => (
          <TVFocusable style={styles.card} onPress={() => openFav(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.title || item.url}</Text>
              <Text style={styles.site}>{item.siteName || item.siteId}</Text>
              <Text style={styles.url} numberOfLines={1}>{item.url}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Sil</Text>
            </TouchableOpacity>
          </TVFocusable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz favori yok. Bir diziyi izlerken "Favori Ekle" ile ekleyebilirsin.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "#15151f", padding: 20, borderRadius: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: "transparent", minHeight: 80 },
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  site: { color: "#3b82f6", fontSize: 12, marginTop: 2 },
  url: { color: "#666", fontSize: 11, marginTop: 2 },
  remove: { color: "#ef4444", fontSize: 13, marginLeft: 10 },
  empty: { color: "#666", textAlign: "center", marginTop: 40, paddingHorizontal: 20 },
  sortBtn: { backgroundColor: "#2a2a3a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sortText: { color: "#fff", fontSize: 12 }
});