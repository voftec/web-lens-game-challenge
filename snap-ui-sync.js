// snap-ui-sync.js — Core stack module for Snapchat Web Lens games.
// Synchronizes CSS custom properties (--ux, --uy, --s, --snap-top, --snap-bot,
// --row2-k) AND exposes JS runtime bounds (window.SnapUISync) across all 13
// Lens Studio device models (16:9, 18:9, 19.5:9, 20:9) on resize / visualViewport.

(function () {
  var REF_W = 393;
  var REF_H = 852;

  function computeMetrics(w, h) {
    var ar = h / Math.max(1, w);
    var s = Math.min(w / REF_W, h / REF_H);
    var topK = 68, row2K = 52, botK = 196;
    if (ar >= 2.20)      { topK = 46; row2K = 46; botK = 224; } // 20:9 (Galaxy S20)
    else if (ar >= 2.05) { topK = 68; row2K = 52; botK = 196; } // 19.5:9 (iPhone X/13/14 Pro/Max, Redmi Note 8 Pro)
    else if (ar >= 1.90) { topK = 46; row2K = 52; botK = 246; } // 18:9..18.5:9 (Galaxy S9, LG G6, Pixel 2 XL)
    else                 { topK = 48; row2K = 68; botK = 238; } // 16:9 & 3:2 (iPhone 8, iPhone 5s, KEYone)

    var ux = w / REF_W;
    var uy = h / REF_H;
    var topPx = topK * uy;
    var botPx = botK * uy;
    return {
      width: w,
      height: h,
      aspect: ar,
      ux: ux,
      uy: uy,
      scale: s,
      topK: topK,
      row2K: row2K,
      botK: botK,
      // Safe playable field rectangle in current viewport px (clears both
      // Snapchat chrome AND the game's own top/bottom HUD):
      playable: {
        left: Math.round(53 * ux),
        right: Math.round(w - 56 * ux),
        top: Math.round(topPx + (row2K + 42) * uy),
        bottom: Math.round(h - botPx - 120 * s),
      },
    };
  }

  function sync() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    var m = computeMetrics(w, h);
    var root = document.documentElement.style;
    root.setProperty("--ux", m.ux.toFixed(4) + "px");
    root.setProperty("--uy", m.uy.toFixed(4) + "px");
    root.setProperty("--s", m.scale.toFixed(4));
    root.setProperty("--top-k", String(m.topK));
    root.setProperty("--row2-k", String(m.row2K));
    root.setProperty("--bot-k", String(m.botK));
    window.SnapUISync.metrics = m;
    window.dispatchEvent(new CustomEvent("snap-ui-sync", { detail: m }));
    return m;
  }

  window.SnapUISync = {
    metrics: null,
    sync: sync,
    getPlayableBand: function () {
      return (this.metrics || sync()).playable;
    },
    clampToPlayable: function (x, y, padX, padY) {
      var m = this.metrics || sync();
      var px = padX == null ? 90 * m.scale : padX;
      var py = padY == null ? 20 * m.scale : padY;
      return {
        x: Math.min(Math.max(x, px), m.width - px),
        y: Math.min(Math.max(y, m.playable.top + py), m.playable.bottom - py),
      };
    },
  };

  sync();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", sync);
  }
})();
