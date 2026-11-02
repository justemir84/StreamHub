import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCOUNTS_KEY = "accounts";

export async function getAccounts() {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveAccount(account) {
  const accounts = await getAccounts();
  const idx = accounts.findIndex(a => a.siteId === account.siteId && a.username === account.username);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

export async function removeAccount(siteId, username) {
  const accounts = await getAccounts();
  const filtered = accounts.filter(a => !(a.siteId === siteId && a.username === username));
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
  return filtered;
}

// Favorites
const FAV_KEY = "favorites";

export async function getFavorites() {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addFavorite(fav) {
  const favs = await getFavorites();
  const exists = favs.some(f => f.siteId === fav.siteId && f.url === fav.url);
  if (!exists) favs.unshift(fav);
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return favs;
}

export async function removeFavorite(siteId, url) {
  const favs = await getFavorites();
  const filtered = favs.filter(f => !(f.siteId === siteId && f.url === url));
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify(filtered));
  return filtered;
}

// Custom sites
const CUSTOM_SITES_KEY = "custom_sites";

export async function getCustomSites() {
  const raw = await AsyncStorage.getItem(CUSTOM_SITES_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function addCustomSite(site) {
  const list = await getCustomSites();
  if (!list.some(s => s.url === site.url)) list.unshift(site);
  await AsyncStorage.setItem(CUSTOM_SITES_KEY, JSON.stringify(list));
  return list;
}
export async function removeCustomSite(url) {
  const list = await getCustomSites();
  const filtered = list.filter(s => s.url !== url);
  await AsyncStorage.setItem(CUSTOM_SITES_KEY, JSON.stringify(filtered));
  return filtered;
}