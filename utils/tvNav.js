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
// ile mod degistirilir.
export const PAGE_SCRIPT = `
(function () {
  try {
    if (window.__STREAMHUB__ && window.__STREAMHUB__.ready) return true;

    var S = window.__STREAMHUB__ = { ready: true, cursor: false, x: 0, y: 0 };
    var STEP = 48;
    var SELECTOR = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';

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

    function showCursor(on) {
      S.cursor = !!on;
      ensureDot();
      if (on) {
        if (!S.x || !S.y) {
          S.x = Math.round(window.innerWidth / 2);
          S.y = Math.round(window.innerHeight / 2);
        }
        dot.style.display = 'block';
        draw();
        try { dot.style.opacity = '1'; } catch (e) {}
      } else {
        dot.style.display = 'none';
      }
      return S.cursor;
    }

    function moveCursor(dx, dy) {
      var maxX = window.innerWidth - 14;
      var maxY = window.innerHeight - 14;
      S.x = Math.max(14, Math.min(maxX, S.x + dx));
      S.y = Math.max(14, Math.min(maxY, S.y + dy));
      // Ekranin kenarina yaklasinca sayfayi kaydir.
      if (S.y >= maxY - 40) window.scrollBy(0, 90);
      if (S.y <= 40) window.scrollBy(0, -90);
      draw();
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

    function clickCursor() {
      var el = document.elementFromPoint(S.x, S.y);
      if (!el) return false;
      var clickable = null;
      try {
        clickable = el.closest('a,button,[role="button"],input,select,textarea,label,[onclick]');
      } catch (e) {}
      var target = clickable || el;
      try {
        if (target.focus) target.focus({ preventScroll: true });
      } catch (e) {}
      fire(target, 'mousedown');
      fire(target, 'mouseup');
      fire(target, 'click');
      return true;
    }

    window.__STREAMHUB_SET_CURSOR__ = showCursor;

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

    // ---------- tus yonetimi ----------
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
          moveCursor(left ? -STEP : right ? STEP : 0, up ? -STEP : down ? STEP : 0);
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
