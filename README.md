# StreamHub Mobile

Android TV ve TV box'lar icin TCL tarzi web tarayici (Expo / React Native).

## Ozellikler

- Site listesi (yerel + `sites.json` uzerinden uzaktan), favoriler, sekmeler
- Ana ekranda kategori bolumleri: Onerilenler, Favoriler, kullanici kategorileri
- TV kumandasi icin animasyonlu odak halkasi (mavi cerceve + buyume efekti)
- Site bazli hesap kaydi ve otomatik form doldurma
- Reklam/tracker domain engelleme, HTTPS-only, DOM storage, 3rd-party cookie ve popup ayarlari
- TV kumandasi ile D-pad gezinme: odak modu veya **beyaz daire fare modu**
- Tam ekran video, otomatik oynatma ve ekranin kapanmasini engelleme
- Geri/ileri/yenile, adres cubugu, hata ekrani
- JustRemote uyumlu: standart Android TV Remote v2 tuslari (D-pad, OK, Geri)
- **GitHub Releases uzerinden uygulama ici otomatik guncelleme** (EAS gerekmez)
- **Ayarlar > Uygulama** bolumunde tek dokunusla **Güncelle** butonu

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

## Arayuz (TV)

Ana ekran `browser.html` tasarimina gore duzenlendi:

- Ust bar: **StreamHub** basligi, **Reklam: Acik/Kapali** anahtari ve **Ayarlar** butonu
- Arama cubugu: URL yazinca dogrudan acilir, aksi halde Google'da arar
- **Kategori Olustur** ve **Duzenle**: kategori ekleme, site ekleme/cikarma, siralama
- Yatay kaydirmali bolumler: Onerilenler, Favoriler, Eklediklerim ve ozel kategoriler
- Odaklanan her oge mavi cerceve + buyume animasyonu ile belirginlesir (kumanda ile
  hangi ogede oldugunuz net gorunur)

Web gorunumunde arac cubugu: Ana menu, geri, ileri, yenile, adres cubugu, favori,
hesap ve **Fare**. Iki gezinme modu vardir:

| Mod | Davranis |
|---|---|
| Odak (varsayilan) | D-pad sayfadaki tiklanabilir ogeler arasinda gezer, OK tiklar |
| Fare | Ekranda beyaz daire cikar; yon tuslari daireyi gezdirir, OK imlecin altina tiklar |

Fare modu **Ayarlar > Tarayici > Site ici fare** anahtarindan veya web arac
cubugundaki **Fare** butonundan acilip kapanir ve tercih hatirlanir.

## Uygulama ici otomatik guncelleme

JustRemote ile ayni mantik:

1. Uygulama acilista (ve **Ayarlar > Uygulama > Güncelle** butonundan elle)
   GitHub'daki `releases/latest` surumunu kontrol eder.
2. Surum `versionName` karsilastirmasi ile yeniyse TV kumandasi ile kullanilabilen
   bir pencere acilir.
3. **Indir ve Kur** secilirse APK GitHub'dan indirilir, ilerleme yuzdesi gosterilir.
   Ayarlar ekranindaki **Güncelle** butonu bu adimi tek dokunusa indirir.
4. Indirme bitince Android paket kurucusu acilir. Ilk seferde "Bilinmeyen
   uygulamalari yukle" izni istenirse onaylayin.

Guncelleme kontrolu `expo-application`, indirme `expo-file-system`,
kurulum ekranini acma `expo-intent-launcher` ile yapilir. Ek izin:
`android.permission.REQUEST_INSTALL_PACKAGES` (`plugins/withTV.js`).

## Yerel build (istege bagli)

Gereksinimler: JDK 17 + Android SDK 34.

> Windows'ta proje yolu Turkce karakter iceriyorsa (orn. `Varsayilan` gibi
> noktasiz i iceren klasorler) Gradle build'i basarisiz olur. Projeyi ASCII
> karakterli bir yola kopyalayin veya `android/gradle.properties` dosyasina
> `android.overridePathCheck=true` satirini ve ortam degiskeni olarak
> `JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8` ayarini ekleyin.
> GitHub Actions uzerindeki build'ler bu sorundan etkilenmez.

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

## Odak gostergesi nasil calisiyor

React Native 0.74 Android'de `View` bilesenleri icin native `onFocus` olayi
gonderilmez (yalnizca iOS'ta vardir). Bu yuzden `plugins/withTvFocus.js` kucuk
bir native modul ekler:

1. Kok view agacina `ViewTreeObserver.OnGlobalFocusChangeListener` takilir.
2. Odaklanan native view'in React tag'i (RN'de native view id == React tag) ve
   ekran koordinatlari `tvFocusChanged` olayi ile JS'e yollanir.
3. `components/TVFocusable.js` kendi tag'i ile eslesince mavi halkayi ve
   buyume animasyonunu acar; `onFocus`/`onBlur` geri cagrilari da calisir.

Bu sayede ek TV fork'u (`react-native-tvos`) veya harici kutuphane gerekmez.
Odak gercekten native tarafta kaldigi icin D-pad gezinmesi ve WebView odagi
degismez.

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
