/* 本体には読み込まない。?verify=1 で file:// の実ブラウザでも検査できる。 */
var VbFxLabCheck = (function () {
  'use strict';
  var errors = [], busy = false, stopRecords = [], stopReason = '', sessionPromise = null;
  var reverseNames = ['dark-fire', 'shockwave', 'demon-soul', 'worm', 'wendigo', 'cover-fire', 'banshee'];
  function plan() {
    var sounds = Object.values(VbFxSeCatalog.sounds).filter(function (s) { return !!s.url; });
    var unique = Array.from(new Map(sounds.map(function (s) { return [s.url, s]; })).values());
    return { effects: VbFx.effects.filter(function (d) { return !d.loop; }),
      states: VbFx.effects.filter(function (d) { return d.loop; }),
      reverse: reverseNames.filter(function (name) { return VbFx.effects.some(function (d) { return d.name === name; }); }),
      sounds: unique, adoptedAudioFiles: unique.filter(function (s) { return s.adopted; }).length,
      extras: 6 };
  }
  function expectedStop(reason, fn) {
    stopReason = reason;
    try { return fn(); } finally { stopReason = ''; }
  }
  function session() {
    if (busy) return function () {};
    busy = true; stopRecords.length = 0;
    var originalStop = VbFx.stopAll;
    VbFx.stopAll = function () {
      if (VbFx.activeCount()) stopRecords.push({ expected: !!stopReason, reason: stopReason || '外部の停止呼び出し',
        playing: VbFx.snapshot().map(function (j) { return j.name; }), stack: new Error('停止元').stack });
      return originalStop.apply(VbFx, arguments);
    };
    // 明示的な検査中は通常操作と再生を共有しない。状態パネルの処理自体は変更しない。
    var controls = Array.from(document.querySelectorAll('button,input,select'))
      .map(function (el) { var old = el.disabled; el.disabled = true; return [el, old]; });
    var eventTypes = ['click', 'input', 'change', 'keydown'];
    function blockUserInput(event) {
      if (event.isTrusted) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    eventTypes.forEach(function (type) { document.addEventListener(type, blockUserInput, true); });
    return function () {
      VbFx.stopAll = originalStop; busy = false;
      eventTypes.forEach(function (type) { document.removeEventListener(type, blockUserInput, true); });
      controls.forEach(function (entry) { entry[0].disabled = entry[1]; });
    };
  }
  function assert(value, text) { if (!value) throw new Error(text); }
  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function values(elements) { return elements.map(function (el) { return { el: el, css: el.style.cssText }; }); }
  function restored(before, layoutChanged) {
    function signature(css) { return css.split(';').filter(function (declaration) { return !/^\s*(left|top)\s*:/.test(declaration); })
      .map(function (declaration) { return declaration.trim(); }).filter(Boolean).join(';'); }
    before.forEach(function (r) { assert(layoutChanged ? signature(r.el.style.cssText) === signature(r.css) : r.el.style.cssText === r.css,
      'styleが戻りません: ' + r.el.id); });
  }
  function elements() { return Array.from(document.querySelectorAll('.lab-card')).concat(document.getElementById('board-design')); }
  async function imagesReady() {
    await Promise.all(Array.from(document.querySelectorAll('.lab-card img')).map(function (img) {
      return img.decode().then(function () { assert(img.naturalWidth > 0, '画像が空です: ' + img.src); });
    }));
  }
  async function one(name, side) {
    var inSession = arguments[2] === true;
    if (busy && !inSession) throw new Error('検査中です。単体検査を重ねて起動できません');
    var endSession = session();
    try {
    document.getElementById('side').value = side || 'ally';
    await expectedStop('検査の演出切替', function () { return VbFxPreview.select(name); }); await imagesReady();
    var definition = VbFx.effects.find(function (d) { return d.name === name; });
    var before = values(elements()), expected = VbFxPreview.snapshot().targetIds.length;
    var conf=VbFxPreviewCatalog[name], pulses=conf&&conf.mode==='purple'?VbFx.pulseTimes(name,conf.value).length:1;
    var start = performance.now(), result = await VbFxPreview.play();
    // 続けて出す演出（catalog の then。例：ヴリコラカス → 復活獲得）が終わるまで待ってから残りを調べる。
    if (window.VbFxPreviewCatalog && VbFxPreviewCatalog[name] && VbFxPreviewCatalog[name].then) {
      for (var waited = 0; VbFx.activeCount() > 0 && waited < 4000; waited += 50) await delay(50);
    }
    assert(!result.result.cancelled, name + ': 予期しない停止 / ' + JSON.stringify(stopRecords.filter(function (r) { return !r.expected; }).slice(-1)));
    assert(!result.result.assetErrors.length, name + ': 素材エラー');
    assert(result.impacts.length === expected*pulses, name + ': 命中数 ' + result.impacts.length + ' / ' + (expected*pulses));
    assert(new Set(result.impacts.map(function (x) { return x.targetIndex; })).size === expected, name + ': 命中の重複');
    for(var targetIndex=0;targetIndex<expected;targetIndex++)assert(result.impacts.filter(function(x){return x.targetIndex===targetIndex;}).length===pulses,name+': 対象ごとの反復命中数');
    if (definition.loop) {
      assert(result.result.looping && VbFx.activeCount() === 1, name + ': 状態の1周と継続');
      expectedStop('状態の1周を確認した後の片付け', function () { VbFxPreview.stop(); });
    }
    assert(VbFx.activeCount() === 0 && !document.querySelector('[data-vb-fx-layer]'), name + ': 残ったVFX');
    var summoned = VbFxPreviewCatalog[name].mode === 'summon';
    restored(before, summoned);
    if (summoned) {
      var front = Array.from(document.querySelectorAll('.lab-card[data-side="' + (side || 'ally') + '"][data-lane="front"]'));
      front.forEach(function (el, index) {
        var position = VbFxLabGeometry.position(side || 'ally', 'front', front.length, index);
        assert(parseFloat(el.style.left) === position.left && parseFloat(el.style.top) === position.top, '召喚後の前衛の詰め: ' + el.id);
      });
    }
    return { name: name, side: side || 'ally', pass: true, impacts: result.impacts, elapsedMs: Math.round(performance.now() - start) };
    } finally { endSession(); }
  }
  async function extras() {
    var inSession = arguments[0] === true;
    if (busy && !inSession) throw new Error('検査中です。追加検査を重ねて起動できません');
    var endSession = session();
    try {
    await expectedStop('追加検査の演出切替', function () { return VbFxPreview.select('weaken'); });
    var snap = VbFxPreview.snapshot(), el = document.getElementById(snap.targetIds[0]);
    var before = values(elements()), target = VbFx.rect(el), source = VbFx.rect(document.getElementById(snap.sourceId));
    var common = { source: source, targets: [target], side: 'ally' };
    var hits = 0;
    await Promise.all(['weaken', 'cockatrice', 'atk-down'].map(function (name) {
      return VbFx.play(name, Object.assign({}, common, { onImpact: function () { hits++; } }));
    }));
    restored(before); assert(hits === 3 && VbFx.activeCount() === 0, '同時再生の後片付け');
    var nested;
    await VbFx.play('weaken', Object.assign({}, common, { onImpact: function () { nested = VbFx.play('atk-down', common); } }));
    assert(nested && typeof nested.then === 'function', 'onImpactからの再生');
    assert(!(await nested).cancelled && VbFx.activeCount() === 0, 'onImpactからの再生の完了'); restored(before);
    var stopped = VbFx.play('cockatrice', Object.assign({}, common, { onImpact: function () { throw new Error('停止後の命中'); } }));
    await delay(40); expectedStop('明示停止の検査', function () { VbFx.stopAll(); }); assert((await stopped).cancelled, '停止のPromise'); restored(before);
    var rejected = false;
    try { await VbFx.play('weaken', Object.assign({}, common, { onImpact: function () { throw new Error('callback-probe'); } })); }
    catch (e) { rejected = e.message === 'callback-probe'; }
    assert(rejected && !document.querySelector('[data-vb-fx-layer]'), 'コールバック例外時の後片付け'); restored(before);
    var nativeRaf = window.requestAnimationFrame;
    try {
      window.requestAnimationFrame = function () { return 0; };
      var timeoutResult = await VbFx.play('weaken', common);
      assert(timeoutResult.impacts === 1 && VbFx.activeCount() === 0, 'rAF停止時の番人');
    } finally { window.requestAnimationFrame = nativeRaf; expectedStop('rAF検査の片付け', function () { VbFx.stopAll(); }); }
    restored(before);
    var invalid = false;
    try { await VbFx.play('weaken', { source: { left: 0, top: 0, width: 0, height: 0 } }); }
    catch (_) { invalid = true; }
    assert(invalid && !document.querySelector('[data-vb-fx-layer]'), '無効な矩形の後片付け');
    return ['同じカードの3演出同時再生', 'onImpactからの追加再生', '停止とstyle復元', 'onImpact例外の後片付け', 'rAF停止時のPromise完了', '無効な矩形'];
    } finally { endSession(); }
  }
  async function audioMetadata() {
    var sounds = plan().sounds;
    await Promise.all(sounds.map(function (sound) {
      return new Promise(function (resolve, reject) {
        var a = new Audio(), timer = setTimeout(function () { reject(new Error('SEの読込時間超過: ' + sound.filename)); }, 8000);
        a.addEventListener('loadedmetadata', function () {
          clearTimeout(timer);
          try { assert(Math.abs(a.duration - sound.duration) < .03, 'SEの尺が違います: ' + sound.filename); resolve(); }
          catch (e) { reject(e); }
          a.removeAttribute('src'); a.load();
        }, { once: true });
        a.addEventListener('error', function () { clearTimeout(timer); reject(new Error('SEの読込失敗: ' + sound.filename)); }, { once: true });
        a.preload = 'metadata'; a.src = sound.url;
      });
    })); return sounds.length;
  }
  async function runSession(onProgress) {
    var endSession = session(), expected = plan();
    var oldVolume = document.getElementById('volume').value;
    document.getElementById('volume').value = '0';
    errors.length = 0; var handler = function (e) { errors.push(e.message || String(e.reason)); };
    window.addEventListener('error', handler); window.addEventListener('unhandledrejection', handler);
    var report = { protocol: location.protocol, effects: [], states: [], reverse: [], extras: [], errors: errors, audioFiles: 0,
      expected: { effects: expected.effects.length, states: expected.states.length, reverse: expected.reverse.length,
        extras: expected.extras, audioFiles: expected.sounds.length, adoptedAudioFiles: expected.adoptedAudioFiles }, stops: stopRecords };
    try {
      report.audioFiles = await audioMetadata();
      for (var i = 0; i < expected.effects.length; i++) {
        var name = expected.effects[i].name;
        if (onProgress) onProgress((i + 1) + ' / ' + expected.effects.length + ' ' + name);
        report.effects.push(await one(name, 'ally', true));
      }
      for (var state of expected.states) report.states.push(await one(state.name, 'ally', true));
      for (var name of expected.reverse) report.reverse.push(await one(name, 'enemy', true));
      report.extras = await extras(true); assert(!errors.length, 'ページ内例外: ' + errors.join(' / ')); report.pass = true;
    } catch (e) { report.pass = false; report.failure = e.message; }
    finally {
      expectedStop('検査終了の片付け', function () { VbFxPreview.stop(); });
      document.getElementById('volume').value = oldVolume; document.getElementById('volume').dispatchEvent(new Event('input'));
      window.removeEventListener('error', handler); window.removeEventListener('unhandledrejection', handler);
      endSession();
    }
    report.errors = errors.slice(); report.stops = stopRecords.slice();
    return report;
  }
  function run(onProgress) {
    if (sessionPromise) return sessionPromise;
    sessionPromise = runSession(onProgress).finally(function () { sessionPromise = null; });
    return sessionPromise;
  }
  function format(report) {
    var n = report.expected;
    return (report.pass ? 'PASS' : 'FAIL') + ' · ' + report.protocol + ' 実ブラウザ\n'
      + '演出 ' + report.effects.length + '/' + n.effects + ' · 状態 ' + report.states.length + '/' + n.states
      + ' · 反対陣営 ' + report.reverse.length + '/' + n.reverse + ' · 同時再生など ' + report.extras.length + '/' + n.extras
      + ' · SE ' + report.audioFiles + '/' + n.audioFiles + '（採用済み ' + n.adoptedAudioFiles + '）\n'
      + (report.failure || '例外0・命中の重複0・styleとVFXレイヤーの残留0') + '\nVFX_QA_RESULT '
      + JSON.stringify({ protocol: report.protocol, pass: report.pass, effects: report.effects.length,
        states: report.states.length, reverse: report.reverse.length, extras: report.extras.length,
        audioFiles: report.audioFiles, expected: n, errors: report.errors, failure: report.failure || null, stops: report.stops });
  }
  function startVerification() {
    var panel = document.createElement('pre'); panel.id = 'verification-result';
    Object.assign(panel.style, { position: 'fixed', left: '252px', right: '12px', bottom: '12px', maxHeight: '180px', overflow: 'auto', zIndex: '2000010', background: '#111e', color: '#c8f7c9', padding: '14px', fontSize: '12px', whiteSpace: 'pre-wrap' });
    panel.textContent = 'ブラウザで検査中（完了まで操作を待ってください）'; document.body.appendChild(panel);
    // 結果は閉じられるようにする（2026-10-06 利用者指摘：下部に残って操作が不便）。
    panel.title = 'クリックで閉じる'; panel.style.cursor = 'pointer';
    panel.addEventListener('click', function () { if (!busy) panel.remove(); });
    window.VbFxLabCheckResult = run(function (text) { panel.textContent = 'ブラウザで検査中: ' + text; }).then(function (report) {
      window.VbFxLabLastResult = report;
      panel.textContent = format(report);
      if (window.parent !== window) window.parent.postMessage({type:'vb-fx-check',report:report}, '*');
      return report;
    });
  }
  // 自動で全検査を始めるのは ?verify=auto（ヘッドレス検査用）の時だけ。
  // ?verify=1 では右下に「全VFX検査」ボタンだけ出し、押した時に始める（2026-10-06 利用者指摘：更新のたびに長く操作できない）。
  function onReady(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  var verifyMode = new URLSearchParams(location.search).get('verify');
  if (verifyMode === 'auto') onReady(startVerification);
  else if (verifyMode === '1') onReady(function () {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = '全VFX検査を実行';
    Object.assign(b.style, { position: 'fixed', right: '12px', bottom: '12px', zIndex: '2000010' });
    b.addEventListener('click', function () { b.remove(); startVerification(); });
    document.body.appendChild(b);
  });
  return { run: run, one: one, extras: extras, audioMetadata: audioMetadata, plan: plan, format: format,
    busy: function () { return busy; }, stops: function () { return stopRecords.slice(); } };
})();
