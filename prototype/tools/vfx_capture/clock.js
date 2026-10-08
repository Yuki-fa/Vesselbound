'use strict';
// Page.addScriptToEvaluateOnNewDocument で、ページの最初のscriptより前に注入する。
// LABやVbFxには撮影専用の処理を加えない。旧コミットにも同じ時計を注入できる。
function installCaptureClock(seed) {
  var now = 0, serial = 0, frames = new Map(), timers = new Map(), randomSeed = seed >>> 0;
  var NativeDate = Date, epoch = 1791417600000, imageStarts = new WeakMap(), animationStarts = new WeakMap();
  // 画像の生成時刻も外部時計で記録する。Animated WebPの静止コマ選択に使う。
  function imagesAdded(node) {
    if (node.tagName === 'IMG' && !imageStarts.has(node)) imageStarts.set(node, now);
    if (node.querySelectorAll) node.querySelectorAll('img').forEach(imagesAdded);
  }
  new MutationObserver(function (records) {
    records.forEach(function (record) { record.addedNodes.forEach(imagesAdded); });
  }).observe(document, { subtree: true, childList: true });
  function CaptureDate() {
    var args = Array.prototype.slice.call(arguments);
    if (!(this instanceof CaptureDate)) return new NativeDate(epoch + now).toString();
    return args.length ? new (Function.prototype.bind.apply(NativeDate, [null].concat(args)))() : new NativeDate(epoch + now);
  }
  CaptureDate.prototype = NativeDate.prototype;
  CaptureDate.now = function () { return epoch + now; };
  CaptureDate.parse = NativeDate.parse; CaptureDate.UTC = NativeDate.UTC;
  window.Date = CaptureDate;
  Object.defineProperty(performance, 'now', { value: function () { return now; }, configurable: true });
  Math.random = function () {
    randomSeed += 0x6D2B79F5;
    var n = randomSeed;
    n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
  window.requestAnimationFrame = function (cb) { var id = ++serial; frames.set(id, cb); return id; };
  window.cancelAnimationFrame = function (id) { frames.delete(id); };
  function timer(cb, ms, repeat, args) {
    if (typeof cb !== 'function') throw new Error('撮影時計では文字列タイマーを受け付けません');
    var id = ++serial, delay = Math.max(repeat ? 1 : 0, Number(ms) || 0);
    timers.set(id, { cb: cb, at: now + delay, interval: repeat ? delay : 0, args: args }); return id;
  }
  window.setTimeout = function (cb, ms) { return timer(cb, ms, false, Array.prototype.slice.call(arguments, 2)); };
  window.setInterval = function (cb, ms) { return timer(cb, ms, true, Array.prototype.slice.call(arguments, 2)); };
  window.clearTimeout = window.clearInterval = function (id) { timers.delete(id); };
  window.__vfxCaptureClock = {
    now: function () { return now; },
    imageStart: function (image) { return imageStarts.has(image) ? imageStarts.get(image) : 0; },
    step: async function (to) {
      if (to < now) throw new Error('撮影時計は巻き戻せません');
      now = to;
      var guard = 0;
      for (;;) {
        var due = Array.from(timers).filter(function (pair) { return pair[1].at <= now; })
          .sort(function (a, b) { return a[1].at - b[1].at || a[0] - b[0]; })[0];
        if (!due) break;
        if (++guard > 10000) throw new Error('撮影時計のタイマーが収束しません');
        if (due[1].interval) due[1].at += due[1].interval; else timers.delete(due[0]);
        due[1].cb.apply(null, due[1].args); await Promise.resolve();
      }
      var queue = Array.from(frames);
      queue.forEach(function (pair) { if (frames.delete(pair[0])) pair[1](now); });
      await Promise.resolve();
      // CSSアニメーションも実時計の進みを止め、同じ時刻へ揃える。
      document.getAnimations().forEach(function (a) {
        if (!animationStarts.has(a)) animationStarts.set(a, now);
        a.pause(); a.currentTime = now - animationStarts.get(a);
      });
    }
  };
}
module.exports = { installCaptureClock };
