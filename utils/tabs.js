import AsyncStorage from "@react-native-async-storage/async-storage";
const TABS_KEY = "open_tabs";

export async function getTabs() {
  const raw = await AsyncStorage.getItem(TABS_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function addTab(tab) {
  const tabs = await getTabs();
  if (!tabs.some(t => t.url === tab.url)) tabs.unshift(tab);
  await AsyncStorage.setItem(TABS_KEY, JSON.stringify(tabs.slice(0, 20)));
  return tabs.slice(0, 20);
}
export async function removeTab(url) {
  const tabs = await getTabs();
  const filtered = tabs.filter(t => t.url !== url);
  await AsyncStorage.setItem(TABS_KEY, JSON.stringify(filtered));
  return filtered;
}
export async function clearTabs() {
  await AsyncStorage.removeItem(TABS_KEY);
}