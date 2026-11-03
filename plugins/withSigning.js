const { withAppBuildGradle } = require("@expo/config-plugins");

// Uretilen android/app/build.gradle dosyasina ortam degiskenlerinden okuyan
// bir release imzalama yapilandirmasi ekler.
//
// CI (GitHub Actions) veya yerel build:
//   KEYSTORE_FILE=/yol/release.jks
//   KEYSTORE_PASSWORD=...
//   KEY_ALIAS=...
//   KEY_PASSWORD=...
//
// Bu degiskenler yoksa release build eskisi gibi debug anahtariyla imzalanir.
const MARKER = "// @streamhub-signing";

module.exports = function withSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      console.warn("[withSigning] app/build.gradle Groovy degil; imzalama atlandi.");
      return cfg;
    }

    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    if (!/^android\s*\{/m.test(src)) {
      throw new Error("[withSigning] android { blogu bulunamadi.");
    }

    const preamble = `${MARKER}
def streamhubKeystoreFile = System.getenv("KEYSTORE_FILE")
def streamhubKeystorePassword = System.getenv("KEYSTORE_PASSWORD")
def streamhubKeyAlias = System.getenv("KEY_ALIAS")
def streamhubKeyPassword = System.getenv("KEY_PASSWORD")
def streamhubHasSigning = streamhubKeystoreFile?.trim() &&
        streamhubKeystorePassword?.trim() &&
        streamhubKeyAlias?.trim() &&
        streamhubKeyPassword?.trim() &&
        new File(streamhubKeystoreFile).exists()
if (streamhubKeystoreFile?.trim() && !streamhubHasSigning) {
    throw new GradleException("KEYSTORE_FILE tanimli ama keystore yolu/sifreleri eksik: " + streamhubKeystoreFile)
}
`;

    // 1) Ortam degiskenlerini android blogundan once tanimla.
    src = src.replace(/^android\s*\{/m, `${preamble}\nandroid {`);

    // 2) Release build type'i gercek keystore ile imzala (debug'a geri donus yok).
    src = src.replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig (streamhubHasSigning ? signingConfigs.release : signingConfigs.debug)"
    );

    // 3) signingConfigs bloguna release tanimini ekle.
    src = src.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        if (streamhubHasSigning) {
            release {
                storeFile file(streamhubKeystoreFile)
                storePassword streamhubKeystorePassword
                keyAlias streamhubKeyAlias
                keyPassword streamhubKeyPassword
            }
        }
`
    );

    // Sablon degisirse sessizce debug imzasina dusmeyelim.
    if (!src.includes("signingConfig (streamhubHasSigning ? signingConfigs.release : signingConfigs.debug)")) {
      throw new Error("[withSigning] release signingConfig degistirilemedi.");
    }
    if ((src.match(/storeFile file\(streamhubKeystoreFile\)/g) || []).length !== 1) {
      throw new Error("[withSigning] release signingConfigs blogu eklenemedi.");
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
