// CI surum hesaplayici.
// package.json "0.1.0" + GitHub run number -> "0.1.<run>"
// Boylece her build benzersiz versionName/versionCode alir ve
// uygulama ici guncelleme yeni surumu net sekilde gorur.
const fs = require("fs");
const path = require("path");
const pkg = require(path.join(__dirname, "..", "package.json"));

const runNumber = Number(
  process.env.GITHUB_RUN_NUMBER || process.env.BUILD_NUMBER || 0
);
const buildNumber = runNumber > 0 ? runNumber : 1;

const [major, minor] = String(pkg.version).split(".");
const version = `${major}.${minor || "0"}.${buildNumber}`;

const env = {
  EXPO_VERSION: version,
  VERSION_CODE: String(buildNumber),
  APK_NAME: `StreamHub-${version}.apk`,
  RELEASE_TAG: `v${version}`,
};

const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
console.log(lines.join("\n"));

if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
}
