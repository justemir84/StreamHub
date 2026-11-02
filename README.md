# StreamHub Mobile (Prototype)

Bu klasör, Nuvio benzeri bir mobil akış uygulaması prototipidir.

## Kurulum
```bash
cd mobile-app
npm install
npx expo start
```

## Planlanan Modüller
- Site listesi (tbcpl.lol benzeri) + webview açma
- Hesap/cookie persist (AsyncStorage + WebView)
- Trakt OAuth + scrobbling
- Nuvio provider entegrasyonu (mevcut JS provider'ları)

## Notlar
- DRM/korumalı siteler webview'de çalışmayabilir.
- Hesap bilgilerini uygulama içinde saklamak güvenlik riski taşır; mümkünse siteye tarayıcıdan giriş yapılıp cookie persist edilmeli.
```

Call `tools.browser.preview`? No. Done.<|end|><|start|>write to=assistant<|channel|>analysis<|message|>Created file successfully: mobile-app/README.md