import AsyncStorage from "@react-native-async-storage/async-storage";

const ADBLOCK_KEY = "adblock_enabled";
const HTTPS_ONLY_KEY = "https_only";
const DOM_STORAGE_KEY = "dom_storage";
const THIRD_PARTY_COOKIES_KEY = "third_party_cookies";
const REMOTE_SITES_URL_KEY = "remote_sites_url";

export async function getAdBlock() {
  const v = await AsyncStorage.getItem(ADBLOCK_KEY);
  return v === null ? true : v === "true";
}
export async function setAdBlock(v) {
  await AsyncStorage.setItem(ADBLOCK_KEY, String(v));
}
export async function getHttpsOnly() {
  const v = await AsyncStorage.getItem(HTTPS_ONLY_KEY);
  return v === null ? true : v === "true";
}
export async function setHttpsOnly(v) {
  await AsyncStorage.setItem(HTTPS_ONLY_KEY, String(v));
}

export async function getDomStorage() {
  const v = await AsyncStorage.getItem(DOM_STORAGE_KEY);
  return v === null ? false : v === "true";
}
export async function setDomStorage(v) {
  await AsyncStorage.setItem(DOM_STORAGE_KEY, String(v));
}

export async function getThirdPartyCookies() {
  const v = await AsyncStorage.getItem(THIRD_PARTY_COOKIES_KEY);
  return v === null ? false : v === "true";
}
export async function setThirdPartyCookies(v) {
  await AsyncStorage.setItem(THIRD_PARTY_COOKIES_KEY, String(v));
}

const DEFAULT_REMOTE_URL = "https://raw.githubusercontent.com/justemir84/StreamHub/main/sites.json";

export async function getRemoteSitesUrl() {
  const v = await AsyncStorage.getItem(REMOTE_SITES_URL_KEY);
  return v || DEFAULT_REMOTE_URL;
}
export async function setRemoteSitesUrl(v) {
  await AsyncStorage.setItem(REMOTE_SITES_URL_KEY, v);
}