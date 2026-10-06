/* 撮影専用URLでは60fps刻みで指定時刻まで描き、コマを保持する。
 * 通常のプレビューでは何もしない。機能検査は自然なrAFで別途実行する。 */
var VbFxLabFrame = (function () {
  'use strict';
  var query = new URLSearchParams(location.search), name = query.get('photo');
  var state = { ready: false, name: name, phase: query.get('phase'), requestedMs: Number(query.get('ms')) || 0, error: null };
  if (!name) return state;
  document.body.classList.add('capture-board');
  var frames = new Map(), timers = new Map(), nextId = 800000;
  async function run() {
    await VbFxPreview.select(name);
    document.getElementById('volume').value = '0';
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll('.lab-card img')).map(function (i) { return i.decode(); }));
    var bg = new Image(); bg.src = '../assets/art/backgrounds/stage2_battlestage.webp'; await bg.decode();
    window.dispatchEvent(new Event('resize'));
    VbFx.settings.seed = 53;
    // 撮影ページ内だけの時計。コールバックを約16.67msごとに進め、最後は指定msに揃える。
    window.requestAnimationFrame = function (cb) { var id = ++nextId; frames.set(id, cb); return id; };
    window.cancelAnimationFrame = function (id) { frames.delete(id); };
    window.setTimeout = function (cb, ms) { var id = ++nextId; timers.set(id, { cb: cb, ms: ms }); return id; };
    window.clearTimeout = function (id) { timers.delete(id); };
    var playing = VbFxPreview.play(), start = performance.now(), now = 0;
    playing.catch(function (e) { state.error = e.message; });
    var initial = VbFx.snapshot()[0]; state.durationMs = initial.durationMs; state.impactsMs = initial.impactsMs;
    if (state.phase) {
      var firstHit = Math.min.apply(null, initial.impactsMs);
      state.requestedMs = Math.round({ begin: Math.max(16, Math.min(initial.durationMs * .065, firstHit * .4)),
        middle: initial.durationMs * .37, impact: Math.min(initial.durationMs * .85, firstHit + 17), end: initial.durationMs * .93 }[state.phase]);
      if (!Number.isFinite(state.requestedMs)) throw new Error('不明な撮影段階です: ' + state.phase);
    }
    function step(ms) {
      var queue = Array.from(frames.values()); frames.clear();
      queue.forEach(function (cb) { cb(start + ms); });
    }
    step(0);
    while (now < state.requestedMs) { now = Math.min(state.requestedMs, now + 1000 / 60); step(now); }
    state.frame = VbFx.snapshot()[0] || null;
    await Promise.all(Array.from(document.querySelectorAll('.lab-card img')).map(function (i) { return i.decode(); }));
    // Animated WebPは独自の時計を持つため、撮影時だけ原素材から抽出した該当コマへ置換。
    var key = name === 'vrykolakas' ? 'K020' : name === 'meteor-scroll' ? 'K009' : name === 'bandersnatch' ? 'K004' : null;
    var offset = key === 'K020' ? state.durationMs * .4 : key === 'K009' ? state.durationMs * .46 : 0;
    if (key && state.requestedMs >= offset && window.VbFxCaptureFrames) {
      var elapsed = state.requestedMs - offset, list = VbFxCaptureFrames[key];
      var frame = list.find(function (f) { return f.at + f.duration > elapsed; }) || list[list.length - 1];
      var image = Array.from(document.querySelectorAll('[data-vb-fx-layer] img')).find(function (i) { return i.src.indexOf(key) >= 0; });
      if (image) { image.src = 'vfx_preview/capture_frames/' + frame.file; await image.decode(); }
    }
    await Promise.resolve();
    state.impacts = VbFxPreview.snapshot().impacts.map(function (i) { return i.targetIndex; });
    var expected = state.impactsMs.filter(function (ms) { return ms <= state.requestedMs; }).length;
    if (state.impacts.length !== expected || new Set(state.impacts).size !== expected) {
      throw new Error('撮影コマの命中記録が一致しません: ' + state.impacts.length + '/' + expected);
    }
    state.ready = true;
    if (window.parent !== window) window.parent.postMessage({ type: 'vb-fx-frame', state: state }, '*');
  }
  run().catch(function (error) {
    state.error = error.message; state.ready = true;
    if (window.parent !== window) window.parent.postMessage({ type: 'vb-fx-frame', state: state }, '*');
  });
  return state;
})();
