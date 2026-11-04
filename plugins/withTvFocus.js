const fs = require("fs");
const path = require("path");
const {
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");

// Neden bu plugin var?
// Network: React Native 0.74 Android'de View bilesenleri icin `onFocus` /
// `topFocus` native olayi dispatch edilmez (bu sadece iOS'ta var). Bu yuzden
// kumanda ile gezinirken hangi ogenin odakta oldugunu JS tarafinda bilemiyoruz
// ve odak halkasi cizemiyoruz.
//
// Cozum: kucuk bir native modul. Kok view agacina
// ViewTreeObserver.OnGlobalFocusChangeListener takar, odaklanan view'in React
// tag'ini (RN native view id == React tag) ve ekran koordinatlarini JS'e
// yollar. JS tarafinda TVFocusable kendi tag'i ile karsilastirip halkayi
// animasyonla acar. Boylece ek native kutuphane / TV fork'u gerekmez.

const EVENT_MARKER = "tvFocusChanged";

const MODULE_JAVA = `package __PACKAGE__.tvfocus;

import android.app.Activity;
import android.view.View;
import android.view.ViewTreeObserver;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Kok view agacindaki odak degisimlerini JS'e bildirir.
 * RN Android'de View icin onFocus olayi olmadigi icin gereklidir.
 */
public class TvFocusModule extends ReactContextBaseJavaModule {
  public static final String NAME = "TvFocus";
  private static final String EVENT_NAME = "${EVENT_MARKER}";

  private ViewTreeObserver observer;
  private ViewTreeObserver.OnGlobalFocusChangeListener listener;

  public TvFocusModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void start() {
    startWithRetry(0);
  }

  private void startWithRetry(final int attempt) {
    final Activity activity = getCurrentActivity();
    if (activity != null) {
      activity.runOnUiThread(new Runnable() {
        @Override
        public void run() {
          attach(activity.getWindow().getDecorView());
        }
      });
      return;
    }
    // Activity henuz hazir degilse kisa araliklarla tekrar dene.
    if (attempt >= 40) {
      return;
    }
    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
        new Runnable() {
          @Override
          public void run() {
            startWithRetry(attempt + 1);
          }
        },
        250);
  }

  @ReactMethod
  public void stop() {
    final Activity activity = getCurrentActivity();
    if (activity == null) {
      detach();
      return;
    }
    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        detach();
      }
    });
  }

  // NativeEventEmitter'in Android tarafinda zorunlu tuttugu iki metot.
  @ReactMethod
  public void addListener(String eventName) {}

  @ReactMethod
  public void removeListeners(double count) {}

  private void attach(View root) {
    detach();
    if (root == null) {
      return;
    }
    observer = root.getViewTreeObserver();
    listener = new ViewTreeObserver.OnGlobalFocusChangeListener() {
      @Override
      public void onGlobalFocusChanged(View oldFocus, View newFocus) {
        emit(newFocus);
      }
    };
    observer.addOnGlobalFocusChangeListener(listener);
    // Acilistaki odak durumunu da bildir.
    emit(root.findFocus());
  }

  private void detach() {
    if (observer != null && observer.isAlive() && listener != null) {
      observer.removeOnGlobalFocusChangeListener(listener);
    }
    observer = null;
    listener = null;
  }

  private void emit(View view) {
    ReactApplicationContext ctx = getReactApplicationContext();
    if (!ctx.hasActiveReactInstance()) {
      return;
    }

    WritableMap map = Arguments.createMap();
    if (view == null) {
      map.putInt("tag", -1);
      map.putDouble("x", 0);
      map.putDouble("y", 0);
      map.putInt("width", 0);
      map.putInt("height", 0);
    } else {
      int[] location = new int[2];
      view.getLocationOnScreen(location);
      map.putInt("tag", view.getId());
      map.putDouble("x", location[0]);
      map.putDouble("y", location[1]);
      map.putInt("width", view.getWidth());
      map.putInt("height", view.getHeight());
    }

    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(EVENT_NAME, map);
  }
}
`;

const PACKAGE_JAVA = `package __PACKAGE__.tvfocus;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.List;

public class TvFocusPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new TvFocusModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    List<ViewManager> managers = new ArrayList<>();
    managers.add(new TvFocusScopeManager());
    return managers;
  }
}
`;

// Gorunmez yardimci view: baglandigi pencerenin (activity veya Modal/Dialog)
// kok view agacindaki odak degisimlerini dinler. Modal'lar ayri bir Android
// penceresi actigi icin activity dinleyicisi onlarin odaklarini goremez.
const SCOPE_VIEW_JAVA = `package __PACKAGE__.tvfocus;

import android.view.View;
import android.view.ViewTreeObserver;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.ThemedReactContext;

public class TvFocusScopeView extends View {
  private static final String EVENT_NAME = "${EVENT_MARKER}";

  private ViewTreeObserver observer;
  private ViewTreeObserver.OnGlobalFocusChangeListener listener;

  public TvFocusScopeView(ThemedReactContext context) {
    super(context);
    setFocusable(false);
    setClickable(false);
    setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    attach();
  }

  @Override
  protected void onDetachedFromWindow() {
    detach();
    super.onDetachedFromWindow();
  }

  private void attach() {
    detach();
    View root = getRootView();
    if (root == null) {
      return;
    }
    observer = root.getViewTreeObserver();
    if (!observer.isAlive()) {
      observer = null;
      return;
    }
    listener = new ViewTreeObserver.OnGlobalFocusChangeListener() {
      @Override
      public void onGlobalFocusChanged(View oldFocus, View newFocus) {
        emit(newFocus);
      }
    };
    observer.addOnGlobalFocusChangeListener(listener);
    emit(root.findFocus());
  }

  private void detach() {
    if (observer != null && observer.isAlive() && listener != null) {
      observer.removeOnGlobalFocusChangeListener(listener);
    }
    observer = null;
    listener = null;
  }

  private void emit(View view) {
    if (!(getContext() instanceof ReactContext)) {
      return;
    }
    ReactContext ctx = (ReactContext) getContext();
    if (!ctx.hasActiveReactInstance()) {
      return;
    }

    WritableMap map = Arguments.createMap();
    if (view == null) {
      map.putInt("tag", -1);
      map.putDouble("x", 0);
      map.putDouble("y", 0);
      map.putInt("width", 0);
      map.putInt("height", 0);
    } else {
      int[] location = new int[2];
      view.getLocationOnScreen(location);
      map.putInt("tag", view.getId());
      map.putDouble("x", location[0]);
      map.putDouble("y", location[1]);
      map.putInt("width", view.getWidth());
      map.putInt("height", view.getHeight());
    }

    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(EVENT_NAME, map);
  }
}
`;

const SCOPE_MANAGER_JAVA = `package __PACKAGE__.tvfocus;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;

public class TvFocusScopeManager extends SimpleViewManager<TvFocusScopeView> {
  public static final String REACT_CLASS = "TvFocusScope";

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  protected TvFocusScopeView createViewInstance(ThemedReactContext reactContext) {
    return new TvFocusScopeView(reactContext);
  }
}
`;

function writeSources(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const javaPackage = (config.android && config.android.package) || "com.justemir84.streamhub";
      const targetDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...javaPackage.split("."),
        "tvfocus"
      );
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, "TvFocusModule.java"),
        MODULE_JAVA.replace(/__PACKAGE__/g, javaPackage)
      );
      fs.writeFileSync(
        path.join(targetDir, "TvFocusPackage.java"),
        PACKAGE_JAVA.replace(/__PACKAGE__/g, javaPackage)
      );
      fs.writeFileSync(
        path.join(targetDir, "TvFocusScopeView.java"),
        SCOPE_VIEW_JAVA.replace(/__PACKAGE__/g, javaPackage)
      );
      fs.writeFileSync(
        path.join(targetDir, "TvFocusScopeManager.java"),
        SCOPE_MANAGER_JAVA.replace(/__PACKAGE__/g, javaPackage)
      );
      return config;
    },
  ]);
}

function registerPackage(config) {
  return withMainApplication(config, (config) => {
    const javaPackage = (config.android && config.android.package) || "com.justemir84.streamhub";
    const importLine = `import ${javaPackage}.tvfocus.TvFocusPackage`;

    let contents = config.modResults.contents;

    // Onceden eklendiyse tekrar ekleme (prebuild tekrar calisabilir).
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        /\n(class MainApplication)/,
        `\n${importLine}\n\n$1`
      );
    }

    if (!contents.includes("TvFocusPackage()")) {
      let patched = false;

      // Expo SDK 51 sablonu: val packages = PackageList(this).packages
      if (/val packages = PackageList\(this\)\.packages/.test(contents)) {
        contents = contents.replace(
          /val packages = PackageList\(this\)\.packages/,
          "val packages = PackageList(this).packages\n            packages.add(TvFocusPackage())"
        );
        patched = true;
      } else if (/return PackageList\(this\)\.packages/.test(contents)) {
        // Expo SDK 51 varsayilan sablonu.
        contents = contents.replace(
          /return PackageList\(this\)\.packages/,
          "val packages = PackageList(this).packages\n            packages.add(TvFocusPackage())\n            return packages"
        );
        patched = true;
      } else if (contents.includes("PackageList(this).packages.apply {")) {
        // Diger sablon: PackageList(this).packages.apply { ... }
        contents = contents.replace(
          "PackageList(this).packages.apply {",
          "PackageList(this).packages.apply {\n              add(TvFocusPackage())"
        );
        patched = true;
      } else if (/add\(MyReactNativePackage\(\)\)/.test(contents)) {
        contents = contents.replace(
          /add\(MyReactNativePackage\(\)\)/,
          "add(MyReactNativePackage())\n            add(TvFocusPackage())"
        );
        patched = true;
      }

      if (!patched) {
        throw new Error(
          "[withTvFocus] MainApplication.getPackages() icinde TvFocusPackage eklenebilecek bir desen bulunamadi."
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withTvFocus(config) {
  config = registerPackage(config);
  config = writeSources(config);
  return config;
};
