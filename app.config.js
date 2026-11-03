// Expo config: app.json uzerine CI'ya ozel surum bilgisi ekler.
// GitHub Actions her build icin:
//   EXPO_VERSION=0.1.42  -> Android versionName
//   VERSION_CODE=42      -> Android versionCode
// verir. Yerel build'de app.json degerleri kullanilir.
module.exports = ({ config }) => {
  const version = process.env.EXPO_VERSION || config.version;
  const versionCode = Number(
    process.env.VERSION_CODE || config.android?.versionCode || 1
  );

  return {
    ...config,
    version,
    android: {
      ...config.android,
      versionCode,
    },
  };
};
