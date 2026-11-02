// Basit reklam/tracker/malware domain listesi (genişletilebilir)
const BLOCKED_DOMAINS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "connect.facebook.net",
  "analytics.google.com",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "amazon-adsystem.com",
  "adnxs.com",
  "outbrain.com",
  "taboola.com",
  "popads.net",
  "propellerads.com",
  "exoclick.com",
  "juicyads.com",
  "trafficjunky.com"
];

export function isBlockedUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch (e) {
    return false;
  }
}

export function isUnsafeUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return true;
    // Bilinen şüpheli uzantılar
    if (/\.(exe|apk|bat|cmd|scr|msi)$/i.test(u.pathname)) return true;
    return false;
  } catch (e) {
    return true;
  }
}