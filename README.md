# StreamHub Mobile

Android TV ve TV box'lar icin TCL tarzi web tarayici (Expo / React Native).

## Ozellikler

- Site listesi (yerel + `sites.json` uzerinden uzaktan), favoriler, sekmeler
- Site bazli hesap kaydi ve otomatik form doldurma
- Reklam/tracker domain engelleme, HTTPS-only, DOM storage, 3rd-party cookie ve popup ayarlari
- TV kumandasi ile D-pad gezinme (WebView icine enjekte edilen odak motoru)
- Tam ekran video, otomatik oynatma ve ekranin kapanmasini engelleme
- Geri/ileri/yenile, adres cubugu, hata ekrani
- JustRemote uyumlu: standart Android TV Remote v2 tuslari (D-pad, OK, Geri)
- **GitHub Releases uzerinden uygulama ici otomatik guncelleme** (EAS gerekmez)

## Kurulum

```bash
npm ci
npx expo start
```

## Build (GitHub Actions, EAS'siz)

`main` dalina yapilan her push (sadece `.md` degisiklikleri haric) GitHub Actions
uzerinde imzali bir release APK uretir. EAS kotasi veya `EXPO_TOKEN` gerekmez.

Akis:

1. `npx expo prebuild --platform android`
2. `./gradlew assembleRelease`
3. APK, GitHub Secrets'taki keystore ile `apksigner` kullanilarak imzalanir
4. APK hem **Actions > Artifacts** altina hem de **GitHub Releases**'e yuklenir

Her build'in surumu otomatik artar:

- `versionName` = `0.1.<GitHub run number>` (ornek: `0.1.42`)
- `versionCode` = `<GitHub run number>` (ornek: `42`)
- Release etiketi = `v0.1.42`

### Gerekli GitHub Secrets

Repo > **Settings > Secrets and variables > Actions** altina su dort secret eklenmeli
(JustRemote ile ayni isimler):

| Secret | Aciklama |
|---|---|
| `KEYSTORE_BASE64` | `.jks` / `.keystore` dosyasinin base64 hali |
| `KEYSTORE_PASSWORD` | Keystore sifresi |
| `KEY_ALIAS` | Anahtar alias'i |
| `KEY_PASSWORD` | Anahtar sifresi |

Base64 olusturma:

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("streamhub-release.jks"))
```

```bash
# Linux / macOS
base64 -w0 streamhub-release.jks
```

> **Onemli:** APK'nin mevcut kurulumun uzerine guncellenebilmesi icin ayni imza
> anahtari kullanilmalidir. EAS ile uretilen eski APK farkli bir keystore ile
> imzalandiysa, yeni APK'yi kurmadan once eski uygulamayi TV'den kaldirmaniz
> gerekir (`App not installed` / imza uyusmazligi hatasi alinir).

### Build'i elle baslatma

Actions > **Android Release** > **Run workflow**.
Ya da bos bir commit push edin.

## Uygulama ici otomatik guncelleme

JustRemote ile ayni mantik:

1. Uygulama acilista (ve "Hesaplar > Uygulama" bolumunden elle) GitHub'daki
   `releases/latest` surumunu kontrol eder.
2. Surum `versionName` karsilastirmasi ile yeniyse TV kumandasi ile kullanilabilen
   bir pencere acilir.
3. **Indir ve Kur** secilirse APK GitHub'dan indirilir, ilerleme yuzdesi gosterilir.
4. Indirme bitince Android paket kurucusu acilir. Ilk seferde "Bilinmeyen
   uygulamalari yukle" izni istenirse onaylayin.

Guncelleme kontrolu `expo-application`, indirme `expo-file-system`,
kurulum ekranini acma `expo-intent-launcher` ile yapilir. Ek izin:
`android.permission.REQUEST_INSTALL_PACKAGES` (`plugins/withTV.js`).

## Yerel build (istege bagli)

Gereksinimler: JDK 17 + Android SDK 34.

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Imzalama icin CI'daki adimlari kullanin veya `apksigner` ile elle imzalayin:

```bash
zipalign -f -p 4 app/build/outputs/apk/release/app-release.apk aligned.apk
apksigner sign --ks release.jks --ks-key-alias <alias> \
  --out StreamHub.apk aligned.apk
```

## Android TV notlari

- `app.json` icinde `orientation: landscape`, `LEANBACK_LAUNCHER` ve `plugins/withTV.js`
  (leanback + touchscreen `required=false`, banner, `allowBackup=false`) tanimli.
- APK'yi TV'ye USB veya Downloader ile kur; TV ana ekraninda "StreamHub" gorunur.
- JustRemote, TV'nin Android TV Remote servisini kullanir. Google TV / Android TV
  sertifikali cihazlarda calisir; bazi AOSP TV box'larda bu servis bulunmaz.

## Bilinen sinirlar

- Netflix/Disney+ gibi DRM'li siteler WebView'de oynamaz.
- HLS icin `hls.js` kullanmayan oynaticalar WebView'de calismaz.
- JustRemote tarafinda touchpad/klavye/mouse paketleri henuz TODO.
- Medya tuslari (oynat/duraklat) icin native key listener yok; `react-native-tvos`
  veya kucuk bir native modul gerekir.
- Reklam engelleme su an ana pencere navigasyonunu filtreler; alt kaynak
  (video reklam) engelleme icin native bir cozum gerekir.
- Parolalar hala duz metin `AsyncStorage`'da; `expo-secure-store` onerilir.
