import { Platform } from "react-native";
import * as Application from "expo-application";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";

// Uygulama ici otomatik guncelleme (JustRemote ile ayni mantik):
// GitHub Releases "latest" -> APK indir -> Android paket kurucusunu ac.
export const UPDATE_REPO = "justemir84/StreamHub";
const RELEASES_URL = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
const UPDATE_DIR = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}updates/`;
const MIN_APK_BYTES = 100 * 1024;

export function getCurrentVersion() {
  return Application.nativeApplicationVersion || "0.0.0";
}

export function getCurrentBuild() {
  return Application.nativeBuildVersion || "0";
}

function parseVersion(value) {
  return String(value || "")
    .replace(/^v/i, "")
    .trim()
    .split(/[.+-]/)
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

export function isNewerVersion(remote, current) {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export async function checkForUpdate() {
  if (Platform.OS !== "android") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  let res;
  try {
    res = await fetch(RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "StreamHub-Android",
      },
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("Güncelleme sunucusuna ulaşılamadı.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("GitHub istek limiti aşıldı. Biraz sonra tekrar deneyin.");
    }
    throw new Error(`GitHub hatası (HTTP ${res.status}).`);
  }

  const json = await res.json().catch(() => {
    throw new Error("Güncelleme sunucusunun yanıtı okunamadı.");
  });
  const version = String(json.tag_name || "").replace(/^v/i, "");
  if (!version) return null;

  const currentVersion = getCurrentVersion();
  if (!isNewerVersion(version, currentVersion)) return null;

  const assets = Array.isArray(json.assets) ? json.assets : [];
  const apk = assets.find((asset) => /\.apk$/i.test(asset.name || ""));
  if (!apk?.browser_download_url) return null;

  return {
    version,
    currentVersion,
    tag: json.tag_name,
    name: json.name || json.tag_name,
    notes: json.body || "",
    size: apk.size || 0,
    downloadUrl: apk.browser_download_url,
    publishedAt: json.published_at || null,
  };
}

async function ensureUpdateDir() {
  if (!UPDATE_DIR || UPDATE_DIR.startsWith("null")) {
    throw new Error("Güncelleme klasörü oluşturulamadı.");
  }
  const info = await FileSystem.getInfoAsync(UPDATE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(UPDATE_DIR, { intermediates: true });
  }
}

export async function downloadUpdate(update, onProgress) {
  if (!update?.downloadUrl) throw new Error("İndirme adresi bulunamadı.");

  await ensureUpdateDir();

  // Onceki denemelerden kalan dosyalari temizle.
  try {
    const files = await FileSystem.readDirectoryAsync(UPDATE_DIR);
    await Promise.all(
      files
        .filter((name) => name.endsWith(".apk"))
        .map((name) =>
          FileSystem.deleteAsync(UPDATE_DIR + name, { idempotent: true })
        )
    );
  } catch (e) {}

  const target = `${UPDATE_DIR}streamhub-${update.version}.apk`;
  const download = FileSystem.createDownloadResumable(
    update.downloadUrl,
    target,
    { headers: { Accept: "application/octet-stream" } },
    (progress) => {
      const total = progress.totalBytesExpectedToWrite;
      if (onProgress && total > 0) {
        onProgress(
          Math.max(0, Math.min(100, Math.round((progress.totalBytesWritten * 100) / total)))
        );
      }
    }
  );

  let result;
  try {
    result = await download.downloadAsync();
  } catch (e) {
    throw new Error("APK indirilemedi. İnternet bağlantınızı kontrol edin.");
  }

  if (!result?.uri) throw new Error("APK indirilemedi.");

  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  if (!fileInfo.exists || !fileInfo.size || fileInfo.size < MIN_APK_BYTES) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error("İndirilen dosya geçersiz görünüyor.");
  }

  return result.uri;
}

export async function installApk(fileUri) {
  if (Platform.OS !== "android") return false;

  const contentUri = await FileSystem.getContentUriAsync(fileUri);

  try {
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: "application/vnd.android.package-archive",
      // FLAG_GRANT_READ_URI_PERMISSION
      flags: 1,
    });
    return true;
  } catch (e) {
    throw new Error(
      "Kurulum ekranı açılamadı. Ayarlardan bu uygulamaya 'Bilinmeyen uygulamaları yükle' izni verin."
    );
  }
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
