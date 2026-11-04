import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, StyleSheet } from "react-native";
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
        <TVFocusable style={styles.sortBtn} radius={8} onPress={() => setSort(sort === "title" ? "recent" : "title")}>
          <Text style={styles.sortText}>{sort === "title" ? "A-Z" : "Son"}</Text>
        </TVFocusable>
      </View>
      <FlatList
        focusable={false}
        data={[...favs].sort((a, b) => sort === "title" ? (a.title || "").localeCompare(b.title || "") : (b.createdAt || 0) - (a.createdAt || 0))}
        keyExtractor={(item, i) => item.siteId + item.url + i}
        renderItem={({ item, index }) => (
          <View style={styles.cardRow}>
            <TVFocusable style={styles.card} hasTVPreferredFocus={index === 0} onPress={() => openFav(item)}>
              <Text style={styles.name} numberOfLines={1}>{item.title || item.url}</Text>
              <Text style={styles.site}>{item.siteName || item.siteId}</Text>
              <Text style={styles.url} numberOfLines={1}>{item.url}</Text>
            </TVFocusable>
            <TVFocusable style={styles.removeBtn} onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Sil</Text>
            </TVFocusable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz favori yok. Bir diziyi izlerken "Favori Ekle" ile ekleyebilirsin.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 14 },
  cardRow: { flexDirection: "row", marginBottom: 12 },
  card: { flex: 1, backgroundColor: "#15151f", padding: 22, borderRadius: 14, borderWidth: 2, borderColor: "transparent", minHeight: 100, justifyContent: "center" },
  name: { color: "#fff", fontSize: 20, fontWeight: "600" },
  site: { color: "#3b82f6", fontSize: 16, marginTop: 4 },
  url: { color: "#777", fontSize: 14, marginTop: 4 },
  removeBtn: { width: 88, marginLeft: 10, backgroundColor: "#2a1420", borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  remove: { color: "#ef4444", fontSize: 18, fontWeight: "700" },
  empty: { color: "#777", textAlign: "center", marginTop: 40, paddingHorizontal: 20, fontSize: 18 },
  sortBtn: { backgroundColor: "#2a2a3a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  sortText: { color: "#fff", fontSize: 16 }
});