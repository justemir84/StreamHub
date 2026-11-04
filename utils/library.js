import AsyncStorage from "@react-native-async-storage/async-storage";

// Ana ekrandaki kullanici tanimli kategoriler.
// [{ id, title, items: [{ id, name, url }] }]
const CATEGORIES_KEY = "streamhub_categories_v1";

export async function getCategories() {
  const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export async function saveCategories(list) {
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(list || []));
  return list;
}
