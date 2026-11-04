// WebView icine enjekte edilen TV gezinme betigi.
//
// Iki mod vardir:
//  1) Odak modu (varsayilan): D-pad, sayfadaki odaklanabilir ogeler arasinda
//     uzamsal olarak gezer; OK / Enter odakli ogeye tiklar.
//  2) Fare modu: ekranda beyaz bir daire gorunur. D-pad daireyi hareket
//     ettirir, OK imlecin altindaki ogeye tiklar.
//
// RN tarafindan:
//   window.__STREAMHUB_SET_CURSOR__(true|false)
//   window.__STREAMHUB_MOVE__('up'|'down'|'left'|'right')
//   window.__STREAMHUB_CLICK__()
// ile komut verilir. D-pad tuşları RN tarafından yakalanıp bu komutlarla
// sayfaya enjekte edilir (WebView native odağı tuşları yuttuğu için
// page içi keydown'a güvenilmez). keydown dinleyicisi yine de yedektensasıy
// olarak durur (WebView odaklıyken).
//
// İmleç en üstteyken UP gelirse sayfa RN'e 'streamhub:toToolbar' mesajı
// gönderir; RN araç çubuğundaki ilk butona odağı geri verir.

export const PAGE_SCRIPT = `
(function () {
  try {
    if (window.__STREAMHUB__ && window.__STREAMHUB__.ready) return true;

    var S = window.__STREAMHUB__ = { ready: true, cursor: false, x: 0, y: 0 };
    var STEP = 48;
    var SELECTOR = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';

    // ---------- gorsel vurgu stilleri (odak halkasi + imlec altini) ----------
    var styleEl = document.createElement('style');
    styleEl.id = '__streamhub_style';
    styleEl.textContent =
      'a:focus,button:focus,input:focus,select:focus,textarea:focus,[role="button"]:focus,[role="link"]:focus,[tabindex]:focus{outline:3px solid #4a9eff!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(74,158,255,0.25)!important;border-radius:6px!important;}'
      + '.__sh-hover{outline:3px solid #4a9eff!important;outline-offset:3px!important;box-shadow:0 0 0 8px rgba(74,158,255,0.22)!important;border-radius:6px!important;}';
    function ensureStyle() {
      if (!styleEl.parentNode) {
        (document.head || document.documentElement).appendChild(styleEl);
      }
    }
    ensureStyle();

    // ---------- beyaz daire kursor ----------
    var dot = document.createElement('div');
    dot.id = '__streamhub_cursor';
    dot.style.cssText = 'position:fixed!important;left:0!important;top:0!important;width:26px!important;height:26px!important;margin:-13px 0 0 -13px!important;border-radius:50%!important;background:rgba(255,255,255,0.95)!important;border:2px solid #4a9eff!important;box-shadow:0 0 0 5px rgba(74,158,255,0.28),0 6px 18px rgba(0,0,0,0.6)!important;pointer-events:none!important;z-index:2147483647!important;display:none;will-change:transform!important;transition:transform 60ms linear!important;';

    function ensureDot() {
      if (!dot.parentNode) {
        (document.body || document.documentElement).appendChild(dot);
      }
    }
    ensureDot();

    function draw() {
      dot.style.transform = 'translate(' + S.x + 'px,' + S.y + 'px)';
    }

    var hoverEl = null;
    function setHover(el) {
      if (hoverEl === el) return;
      try { if (hoverEl) hoverEl.classList.remove('__sh-hover'); } catch (e) {}
      hoverEl = el;
      try { if (el) el.classList.add('__sh-hover'); } catch (e) {}
    }

    function updateHover() {
      var el = null;
      try { el = document.elementFromPoint(S.x, S.y); } catch (e) {}
      var target = null;
      try {
        target = el && el.closest ? el.closest('a,button,[role="button"],[role="link"],input,select,textarea,label,[onclick],[tabindex]') : null;
      } catch (e) {}
      setHover(target || null);
    }

    function notify(data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(data);
        }
      } catch (e) {}
    }

    function showCursor(on) {
      S.cursor = !!on;
      ensureDot();
      ensureStyle();
      if (on) {
        if (!S.x || !S.y) {
          S.x = Math.round(window.innerWidth / 2);
          S.y = Math.round(window.innerHeight / 2);
        }
        dot.style.display = 'block';
        draw();
        try { dot.style.opacity = '1'; } catch (e) {}
        updateHover();
      } else {
        dot.style.display = 'none';
        setHover(null);
      }
      return S.cursor;
    }

    function moveCursor(dx, dy) {
      var maxX = window.innerWidth - 14;
      var maxY = window.innerHeight - 14;
      var atTop = S.y <= 54;
      S.x = Math.max(14, Math.min(maxX, S.x + dx));
      S.y = Math.max(14, Math.min(maxY, S.y + dy));
      // Ekranin kenarina yaklasinca sayfayi kaydir.
      if (S.y >= maxY - 40) window.scrollBy(0, 90);
      if (S.y <= 40) window.scrollBy(0, -90);
      if (S.x >= maxX - 40) window.scrollBy(90, 0);
      if (S.x <= 40) window.scrollBy(-90, 0);
      draw();
      updateHover();
      // Fare modu: en ustteyken yukari -> RN'e haber ver, odagi arac cubuguna al.
      if (dy < 0 && atTop) {
        notify('streamhub:toToolbar');
      }
    }

    function moveByDir(dir) {
      if (!S.cursor) return false;
      if (dir === 'up') moveCursor(0, -STEP);
      else if (dir === 'down') moveCursor(0, STEP);
      else if (dir === 'left') moveCursor(-STEP, 0);
      else if (dir === 'right') moveCursor(STEP, 0);
      else return false;
      return true;
    }

    function fire(target, type) {
      try {
        target.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: S.x,
          clientY: S.y,
          button: 0
        }));
      } catch (e) {}
    }

    function fireTouch(target, type) {
      try {
        var t = new Touch({ identifier: 0, target: target, clientX: S.x, clientY: S.y });
        var empty = type === 'touchend' || type === 'touchcancel';
        target.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          touches: empty ? [] : [t],
          targetTouches: empty ? [] : [t],
          changedTouches: [t]
        }));
      } catch (e) {}
    }

    var lastClickTime = 0;
    function clickCursor() {
      var el = null;
      try { el = document.elementFromPoint(S.x, S.y); } catch (e) {}
      if (!el) return false;
      var clickable = null;
      try {
        clickable = el.closest('a,button,[role="button"],input,select,textarea,label,[onclick]');
      } catch (e) {}
      var target = clickable || el;
      try {
        if (target.focus) target.focus({ preventScroll: true });
      } catch (e) {}
      setHover(target);
      // Dokunmatik telefon hedefine de calis: touch + mouse ikisini de atesle.
      fireTouch(target, 'touchstart');
      fire(target, 'mousedown');
      fireTouch(target, 'touchend');
      fire(target, 'mouseup');
      fire(target, 'click');

      // Video uzerinde cift tikla -> tam ekran ac (YouTube vb. icin).
      var now = Date.now();
      var video = null;
      try { video = target.closest ? target.closest('video') : null; } catch (_) {}
      if (!video && target.tagName === 'VIDEO') video = target;
      if (video && now - lastClickTime < 400) {
        try { video.webkitEnterFullScreen?.(); } catch (_) {}
        try { video.requestFullscreen?.(); } catch (_) {}
      }
      lastClickTime = now;
      return true;
    }

    window.__STREAMHUB_SET_CURSOR__ = showCursor;
    window.__STREAMHUB_MOVE__ = moveByDir;
    window.__STREAMHUB_CLICK__ = clickCursor;

    // ---------- odak modu ----------
    function isVisible(el) {
      var r = el.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) return false;
      var s = window.getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    }

    function getItems() {
      return Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (el) {
        return isVisible(el) && !el.disabled && el.getAttribute('aria-hidden') !== 'true';
      });
    }

    function activate(el) {
      if (!el) return;
      try { el.focus(); } catch (e) {}
      try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}
    }

    function moveFocus(dir) {
      var list = getItems();
      if (!list.length) return false;
      var i = list.indexOf(document.activeElement);
      if (i < 0) { activate(list[0]); return true; }

      var from = list[i].getBoundingClientRect();
      var cx = from.left + from.width / 2;
      var cy = from.top + from.height / 2;
      var best = -1;
      var bestScore = Infinity;
      var horizontal = dir === 'ArrowLeft' || dir === 'ArrowRight';

      for (var j = 0; j < list.length; j++) {
        if (j === i) continue;
        var r = list[j].getBoundingClientRect();
        var dx = (r.left + r.width / 2) - cx;
        var dy = (r.top + r.height / 2) - cy;
        var delta = horizontal ? dx : dy;
        if (horizontal
          ? (dir === 'ArrowRight' ? delta <= 4 : delta >= -4)
          : (dir === 'ArrowDown' ? delta <= 4 : delta >= -4)) continue;
        var score = Math.abs(delta) + Math.abs(horizontal ? dy : dx) * 2;
        if (score < bestScore) { bestScore = score; best = j; }
      }

      if (best >= 0) { activate(list[best]); return true; }
      return false;
    }

    // ---------- tus yonetimi (yedek; ana yol RN enjeksiyonu) ----------
    document.addEventListener('keydown', function (e) {
      var key = e.key || '';
      var code = e.keyCode || 0;
      var target = e.target || {};
      var tag = (target.tagName || '').toUpperCase();
      var editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;

      var up = key === 'ArrowUp' || code === 38;
      var down = key === 'ArrowDown' || code === 40;
      var left = key === 'ArrowLeft' || code === 37;
      var right = key === 'ArrowRight' || code === 39;
      var ok = key === 'Enter' || code === 13 || key === ' ' || code === 32;

      if (S.cursor) {
        if (up || down || left || right) {
          e.preventDefault();
          e.stopPropagation();
          moveByDir(up ? 'up' : down ? 'down' : left ? 'left' : 'right');
          return;
        }
        if (ok) {
          e.preventDefault();
          e.stopPropagation();
          clickCursor();
          return;
        }
        return;
      }

      if (editing) return;
      var active = document.activeElement;
      if (active && active.tagName === 'VIDEO') return;

      if (ok) {
        var el = active && active !== document.body ? active : target;
        if (el && el !== document.body && typeof el.click === 'function') {
          e.preventDefault();
          e.stopPropagation();
          el.click();
        }
        return;
      }

      if (up || down || left || right) {
        var dir = up ? 'ArrowUp' : down ? 'ArrowDown' : left ? 'ArrowLeft' : 'ArrowRight';
        if (moveFocus(dir)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);

    window.addEventListener('resize', function () { if (S.cursor) draw(); });

    return true;
  } catch (e) {
    return false;
  }
})();
true;
`;

// Sayfa yuklendikten sonra fare modunu ac/kapat.
export function cursorCommand(on) {
  return `(function(){try{if(window.__STREAMHUB_SET_CURSOR__){window.__STREAMHUB_SET_CURSOR__(${on ? "true" : "false"});}}catch(e){}return true;})();true;`;
}

// RN tarafindan D-pad tusu enjekte edilirken kullanilir.
export function moveCommand(dir) {
  return `(function(){try{if(window.__STREAMHUB_MOVE__){window.__STREAMHUB_MOVE__('${dir}');}}catch(e){}return true;})();true;`;
}

export function clickCommand() {
  return `(function(){try{if(window.__STREAMHUB_CLICK__){window.__STREAMHUB_CLICK__();}}catch(e){}return true;})();true;`;
}
