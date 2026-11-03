const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");

// Android TV / TV box icin gerekli manifest ozellikleri.
// - leanback: TV ana ekraninda gorunmek icin (required=false -> telefonlarda da kurulabilir)
// - touchscreen: dokunmatik olmayan cihazlarda Play Store filtrelemesini engellemek icin
// - banner: TV ana ekranindaki 320x180 kart gorseli
const TV_FEATURES = [
  ["android.software.leanback", "false"],
  ["android.hardware.touchscreen", "false"],
];

const BANNER_RESOURCE = "banner";

// Uygulama ici APK guncellemesi icin gerekli izin.
const APP_PERMISSIONS = [
  "android.permission.REQUEST_INSTALL_PACKAGES",
];

function withTVManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest["uses-feature"] = manifest["uses-feature"] || [];
    manifest["uses-permission"] = manifest["uses-permission"] || [];

    for (const name of APP_PERMISSIONS) {
      const exists = manifest["uses-permission"].some(
        (permission) => permission?.$?.["android:name"] === name
      );
      if (!exists) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    for (const [name, required] of TV_FEATURES) {
      const exists = manifest["uses-feature"].some(
        (feature) => feature?.$?.["android:name"] === name
      );
      if (!exists) {
        manifest["uses-feature"].push({
          $: {
            "android:name": name,
            "android:required": required,
          },
        });
      }
    }

    const application = manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$["android:banner"] = `@drawable/${BANNER_RESOURCE}`;
      // Hesap bilgileri AsyncStorage'da tutuluyor; yedeklemeye kapatalim.
      application.$["android:allowBackup"] = "false";
    }

    return config;
  });
}

function withTVBanner(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const bannerPath = path.resolve(
        projectRoot,
        config.android?.banner || "./assets/banner.png"
      );
      const drawableDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "res",
        "drawable"
      );

      if (fs.existsSync(bannerPath)) {
        fs.mkdirSync(drawableDir, { recursive: true });
        fs.copyFileSync(
          bannerPath,
          path.join(drawableDir, `${BANNER_RESOURCE}.png`)
        );
      } else {
        console.warn(`[withTV] Banner bulunamadi: ${bannerPath}`);
      }

      return config;
    },
  ]);
}

module.exports = function withTV(config) {
  config = withTVManifest(config);
  config = withTVBanner(config);
  return config;
};
