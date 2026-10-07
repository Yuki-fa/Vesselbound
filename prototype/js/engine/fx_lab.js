/* Vesselbound 共通VFX — LABと戦闘で同じ通常の script を読み込む。
 * VbFx.play(name, {source, targets, side, allies, enemies, onImpact}) -> Promise
 * 矩形は画面座標。DOM 演出用には VbFx.rect(element) の element 参照を推奨。
 * 本体の接続用: settings.layer / options.board / options.resolveElement。
 * 戦闘の計算・HP変更・SE再生は行わない。onImpact は targets の添字で各1回。
 */
var VbFx = (function () {
  'use strict';
  var scriptUrl = document.currentScript && document.currentScript.src;
  var assetBase = new URL('../../assets/', scriptUrl || document.baseURI).href;
  var TAU = Math.PI * 2;
  var jobs = [], root = null, canvas = null, ctx = null, raf = 0, inFrame = false;
  var width = 0, height = 0, sequence = 0, pixelRatio = 1;
  var spriteCache = Object.create(null);
  var leases = new WeakMap();
  var settings = { speed: 1.5, size: 1, particles: 1, shake: 1, dprMax: 2, seed: null };
  // ms は等速時の全尺。範囲演出でも画面端到達を含めて 2000ms 以下。
  var definitions = [
    ['dark-fire', '闇の炎', 1500, 'wave', '#100917', '#d26df0'],
    ['banshee', 'バンシー', 1300, 'soul', '#b9f6ed', '#74c3e3'],
    ['resentment', '怨念', 1350, 'soul', '#aa8ff0', '#5a2689'],
    ['lich', 'リッチ', 1350, 'soul', '#93ffc6', '#3b996f'],
    ['great-shield', '大盾', 900, 'shield', '#bbecff', '#76bada'],
    ['cover-fire', '援護射撃', 560, 'arrow', '#ffecc4', '#d9bc76'],
    ['shockwave', '衝撃波', 1800, 'wave', '#caedff', '#92c8ee'],
    ['demon-soul', '魔族の魂', 2000, 'wave', '#29070f', '#f0454f'],
    ['vrykolakas', 'ヴリコラカス', 1500, 'undead', '#659f8c', '#a2ecd9'],
    ['dullahan', 'デュラハン', 1320, 'skullfly', '#d9f2dc', '#2e463d'],
    ['bone-chariot', 'ボーンチャリオット', 1400, 'skull', '#e1d8b8', '#b5d9c2'],
    ['jackalope', 'ジャッカロープ', 1050, 'roots', '#6cd578', '#c9ffd5'],
    ['dragonnet', 'ドラゴネット', 1500, 'morph', '#bbc8b7', '#f5fff1'],
    ['cockatrice', 'コカトリス', 860, 'stone', '#a9b4b5', '#e8edef'],
    ['bandersnatch', 'バンダースナッチ', 1500, 'morph', '#bbc8b7', '#f5fff1'],
    ['worm', 'ワーム', 1900, 'wave', '#183d12', '#81e938'],
    ['wyvern', 'ワイバーン', 650, 'wind', '#d9f9ef', '#ffffff'],
    ['frost-sprite', 'フロスト・スプライト', 1150, 'ice', '#91def5', '#f1fdff'],
    ['leprechaun', 'レプラコーン', 1700, 'gold', '#f6d575', '#fff3ba'],
    ['melusine', 'メリュジーヌ', 1700, 'fog', '#10382b', '#76a886'],
    ['carbuncle', 'カーバンクル', 1200, 'shards', '#f5bfca', '#ffebf4'],
    ['pixie', 'ピクシー', 1500, 'capture', '#f5afeb', '#fdedff'],
    ['elemental', 'エレメンタル', 1500, 'rainbow', '#fffff5', '#ff9abd'],
    ['imp', 'インプ', 1400, 'absorb', '#d7334a', '#ff9c98'],
    ['wendigo', 'ウェンディゴ', 2000, 'wave', '#68949c', '#e4fcff'],
    ['nightmare', 'ナイトメア', 1400, 'dark-aura', '#130d22', '#bd8ce8'],
    ['abyss', 'アビス・バロン A・渦', 1400, 'dark-aura', '#060e16', '#8fc7df'],
    ['baron', 'アビス・バロン B・赤い縁', 1400, 'dark-aura', '#1d0810', '#eb758e'],
    ['pegasus', 'ペガサス', 1400, 'spotlight', '#ffecbc', '#f7ffff'],
    ['direwolf', 'ダイアウルフ', 2600, 'howl', '#e8ddc4', '#fffbe8'],
    ['weaken', '弱体化', 430, 'shake', '#dccbb2', '#ffffff'],
    ['atk-down', 'ATK減少', 540, 'blue', '#a4d8f4', '#f0faff'],
    ['all-sweep', '全体攻撃 A・横一閃', 460, 'all-sweep', '#fff0cf', '#ffe5a0'],
    ['all-ring', '全体攻撃 B・衝撃リング', 580, 'all-ring', '#e4eef7', '#ffffff'],
    ['all-cross', '全体攻撃 C・交差斬撃', 460, 'all-cross', '#ffead5', '#fff7e7'],
    ['all-roar', '全体攻撃 D・咆哮', 900, 'all-roar', '#e8ddc4', '#fffbe8'],
    ['meteor-scroll', '隕石の巻物', 1450, 'meteor', '#f08338', '#fff2c8'],
    // 37：復活効果が付いている間の状態（結界と同じく付いている間ずっと出す）。プレビューでは出入りを含めて再生する。
    ['revive-state', '復活状態', 2400, 'revive-aura', '#9fd2ff', '#eef8ff'],
    // 状態異常の表示（付いている間ずっとループ。2026-10-05 利用者指定。SEは無し）
    ['shield-state', '結界状態', 2400, 'shield-aura', '#9ad6ff', '#f0fbff'],
    ['poison-state', '毒状態', 5500, 'poison-aura', '#3f8a25', '#b9ff7a'],
    ['weaken-state', '弱体状態', 2200, 'weaken-aura', '#4a3d58', '#c8b8e0'],
    ['guts-state', '根性状態', 1800, 'guts-aura', '#ff9b3d', '#ffe6b0'],
    // 2026-10-06 追加の検討（番号は既存の後ろに足す）
    ['titan', 'タイタン（地震で敵全体を弱体化）', 1600, 'quake', '#5a4030', '#e0b070'],
    ['cyclops', 'サイクロプス（全体攻撃を得る）', 1400, 'powerup', '#ff5a2a', '#ffe2a0'],
    ['wraith', 'レイス（味方の負傷効果を発動）', 1400, 'curse', '#2a0a3a', '#b45cff'],
    ['battle-summon', '戦闘中の召喚', 1300, 'summon', '#7fd0ff', '#f0fbff'],
    ['revive-summon', '復活による召喚', 1500, 'revive-summon', '#9fd2ff', '#eef8ff'],
    ['shield-gain', '結界獲得', 900, 'gain-shield', '#ffc75a', '#fff1c4'],
    ['revive-gain', '復活獲得', 900, 'gain-revive', '#9fd2ff', '#eef8ff'],
    ['shield-break', '結界消失', 780, 'shield-break', '#ffc75a', '#fff1c4']
  ].map(function (d) { return { name: d[0], label: d[1], ms: d[2], kind: d[3], color: d[4], light: d[5], loop: /-state$/.test(d[0]),
    // 毒はステータス表示の下に出す（2026-10-06 利用者指定）
    underStatus: d[0] === 'poison-state',
    // 同じものを重ねられる状態（結界・毒・弱体）。それ以外は同じカードに同じ状態を二重に出さない（2026-10-06 利用者指定）。
    stackable: ['shield-state', 'poison-state', 'weaken-state'].indexOf(d[0]) >= 0 }; });
  var lookup = {};
  definitions.forEach(function (d) { lookup[d.name] = d; lookup[d.label] = d; });
  function duration(name, speed) {
    var d = lookup[name];
    if (!d) throw new Error('VbFx: 未知の演出 ' + name);
    // 状態異常のループは速さの設定に関わらず定義の周期で回す（2026-10-06 利用者が等速で見て速さを指定した）。
    if (d.loop) return d.ms;
    var area = ['wave', 'gold', 'fog'].indexOf(d.kind) >= 0;
    return Math.min(area ? 2000 : 1500, d.ms / clamp(Number(speed) || settings.speed, .4, 12));
  }

  function clamp(v, a, b) { return Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, v)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { t = clamp(t); return t * t * (3 - 2 * t); }
  function envelope(t, attack, release) {
    return clamp(t / (attack || .1)) * clamp((1 - t) / (release || .25));
  }
  function random(i, seed) { var v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); }
  // 格子の値ノイズ。全コマで同じ種を使い、位置と時刻だけを連続的に動かす。
  function hash(x, y, seed) {
    var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed || 1, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295;
  }
  function noise(x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx), fy);
  }
  function fractal(x, y, seed) {
    return noise(x, y, seed) * .57 + noise(x * 2.07, y * 2.07, seed + 7) * .28 + noise(x * 4.13, y * 4.13, seed + 19) * .15;
  }
  function rgb(color) { return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]; }
  function rgba(color, alpha) { return 'rgba(' + rgb(color).join(',') + ',' + clamp(alpha) + ')'; }
  function point(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function rect(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom, element: el };
  }
  // カード要素の画面上の中心・大きさ・傾き（自身と親のtransformの回転・拡大を含む）。
  function cardGeometry(el) {
    var b = el.getBoundingClientRect(), angle = 0, scale = 1, node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var t = getComputedStyle(node).transform;
      if (t && t !== 'none') { var m = new DOMMatrixReadOnly(t); angle += Math.atan2(m.b, m.a); scale *= Math.hypot(m.a, m.b); }
      node = node.parentElement;
    }
    var w = el.offsetWidth * scale, h = el.offsetHeight * scale;
    if (!(w > 0 && h > 0)) { w = b.width; h = b.height; angle = 0; }
    var cs = getComputedStyle(el);
    return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: w, h: h, angle: angle,
      shown: b.width > 1 && b.height > 1 && w > 1 && h > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' };
  }
  function normalize(r) {
    if (!r) return null;
    if (typeof r.getBoundingClientRect === 'function') return rect(r);
    var left = Number(r.left == null ? r.x : r.left), top = Number(r.top == null ? r.y : r.top);
    var w = Number(r.width == null ? r.right - left : r.width), h = Number(r.height == null ? r.bottom - top : r.height);
    if (![left, top, w, h].every(Number.isFinite) || w <= 0 || h <= 0) throw new TypeError('VbFx: 有効な画面矩形を渡してください');
    var out = { left: left, top: top, width: w, height: h, right: left + w, bottom: top + h, element: r.element || null };
    // 明示したelement:nullは倒れた位置などの固定矩形。下にある別カードを拾わない。
    if (!out.element && !Object.prototype.hasOwnProperty.call(r, 'element')) {
      var p = point(out), el = document.elementFromPoint(p.x, p.y);
      out.element = el && el.closest('[data-vb-fx-card], .unit-card, .slot, .card');
    }
    return out;
  }
  function box(rects) {
    if (!rects.length) return { left: width / 2 - 80, top: height / 2 - 100, width: 160, height: 200 };
    var l = Math.min.apply(null, rects.map(function (r) { return r.left; }));
    var t = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(null, rects.map(function (r) { return r.right; }));
    var b = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    return { left: l, top: t, width: right - l, height: b - t };
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    if (!canvas) return;
    var dpr = pixelRatio = Math.min(settings.dprMax, window.devicePixelRatio || 1);
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    jobs.forEach(function (job) { if (job.trail) { job.trail.width = 0; job.trail = null; job.trailCtx = null; } });
  }
  function ensureLayer() {
    if (root) return;
    root = document.createElement('div'); root.dataset.vbFxLayer = '1';
    Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '1900000', overflow: 'hidden' });
    canvas = document.createElement('canvas'); canvas.dataset.vbFxCanvas = '1';
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
    root.appendChild(canvas);
    var parent = typeof settings.layer === 'function' ? settings.layer() : null;
    (parent || document.body).appendChild(root);
    if (parent) root.style.zIndex = '1';
    ctx = canvas.getContext('2d'); resize();
    window.addEventListener('resize', resize);
  }
  // 同じカードの同じプロパティを複数再生が触っても、最後の再生終了まで原値を保持する。
  function setStyle(job, el, key, value) {
    if (!el) return;
    var props = leases.get(el);
    if (!props) { props = {}; leases.set(el, props); }
    var lease = props[key];
    if (!lease) lease = props[key] = { value: el.style.getPropertyValue(key), priority: el.style.getPropertyPriority(key), stack: [] };
    var item = lease.stack.find(function (x) { return x.id === job.id; });
    if (!item) { item = { id: job.id, value: value }; lease.stack.push(item); job.styles.push({ el: el, key: key }); }
    item.value = value;
    el.style.setProperty(key, lease.stack[lease.stack.length - 1].value, 'important');
  }
  function restore(job) {
    job.styles.forEach(function (ref) {
      var props = leases.get(ref.el), lease = props && props[ref.key];
      if (!lease) return;
      lease.stack = lease.stack.filter(function (x) { return x.id !== job.id; });
      if (lease.stack.length) ref.el.style.setProperty(ref.key, lease.stack[lease.stack.length - 1].value, 'important');
      else {
        if (lease.value) ref.el.style.setProperty(ref.key, lease.value, lease.priority);
        else ref.el.style.removeProperty(ref.key);
        delete props[ref.key];
        if (!Object.keys(props).length) leases.delete(ref.el);
      }
    });
    job.nodes.forEach(function (node) { node.remove(); });
    if (job.trail) { job.trail.width = 0; job.trail.height = 0; job.trail = null; job.trailCtx = null; }
  }
  // cloneNodeで写したVFXの一時スタイルは、元DOMの終了処理では戻せない。
  // 登場のopacity等を複製の原値にせず、再生中の効果は通常の付け替えで追従させる。
  function prepareClone(source, clone) {
    var props = leases.get(source);
    Object.keys(props || {}).forEach(function (key) {
      var lease = props[key];
      if (lease.value) clone.style.setProperty(key, lease.value, lease.priority);
      else clone.style.removeProperty(key);
    });
  }
  // 本体がカードDOMを作り直した時だけ参照と一時スタイルを移す。LABの描画には介入しない。
  function rebindElements(job) {
    if (typeof job.options.resolveElement !== 'function') return [];
    var swaps = new Map(), changed = [];
    [job.source].concat(job.targets, job.allies, job.enemies).forEach(function (r) {
      if (!r || !r.element) return;
      var old = r.element;
      if (!swaps.has(old)) swaps.set(old, job.options.resolveElement(old) || null);
      var next = swaps.get(old);
      if (next !== old) { r.element = next; changed.push(r); }
    });
    // カードの中に描く状態（毒）は、描画用canvasも新しいカードへ移す。
    if (job.local && swaps.get(job.local.el) && swaps.get(job.local.el) !== job.local.el) {
      var nextEl = swaps.get(job.local.el), statusEl = nextEl.querySelector('.unit-stat-overlay-layer, .stats-overlay, .status_overlay, .status-overlay, [class*="status_overlay"]');
      if (statusEl) statusEl.parentNode.insertBefore(job.local.canvas, statusEl); else nextEl.appendChild(job.local.canvas);
      job.local.el = nextEl;
    }
    if (job.def.loop && swaps.get(job.source.element) === undefined && job.targets[0] && job.targets[0].element !== job.source.element) job.source = job.targets[0];
    swaps.forEach(function (next, old) {
      if (!next || next === old) return;
      var props = leases.get(old);
      // 攻撃クローンがコピーした演出中のinline値を原値として保存しない。
      Object.keys(props || {}).forEach(function (key) {
        var lease = props[key], top = lease.stack[lease.stack.length - 1];
        var current = leases.get(next);
        if (top && !(current && current[key]) && next.style.getPropertyValue(key) === top.value) {
          if (lease.value) next.style.setProperty(key, lease.value, lease.priority);
          else next.style.removeProperty(key);
        }
      });
    });
    job.targets.forEach(function (r, i) {
      if (!r.element || changed.indexOf(r) < 0) return;
      var style = getComputedStyle(r.element), nr = r.element.getBoundingClientRect();
      job.baseTransforms[i] = style.transform && style.transform !== 'none' ? style.transform : '';
      job.baseFilters[i] = style.filter && style.filter !== 'none' ? style.filter : '';
      job.domScales[i] = r.element.offsetWidth ? nr.width / r.element.offsetWidth : 1;
    });
    var relocated = changed.map(function (r) { return { rect: r, bounds: r.element && r.element.getBoundingClientRect() }; });
    job.styles.slice().forEach(function (ref) {
      var next = swaps.get(ref.el), props = leases.get(ref.el), lease = props && props[ref.key];
      var item = lease && lease.stack.find(function (x) { return x.id === job.id; });
      if (next && next !== ref.el && item) setStyle(job, next, ref.key, item.value);
    });
    return relocated;
  }
  function hit(job, index) {
    if (job.hit.has(index) || job.cancelled) return;
    job.hit.add(index);
    if (typeof job.options.onImpact === 'function') job.options.onImpact(index);
  }
  function updateHits(job, t) {
    job.hitAt.forEach(function (at, i) { if (at != null && t >= at) hit(job, i); });
  }
  function finish(job, cancelled, error) {
    if (job.done) return;
    job.done = true; job.cancelled = !!cancelled; clearTimeout(job.watchdog);
    try { if (!cancelled && !error) updateHits(job, 1); } catch (e) { error = e; }
    restore(job); jobs = jobs.filter(function (x) { return x !== job; });
    if (!jobs.length) {
      cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', resize);
      if (root) root.remove(); root = null; canvas = null; ctx = null;
    }
    if (error) job.reject(error);
    else if (job.firstCycleResolved) return;
    else job.resolve({ name: job.def.name, cancelled: !!cancelled, impacts: job.hit.size, assetErrors: job.assetErrors.slice() });
  }
  function tick(now) {
    raf = 0;
    if (!ctx) return;
    if (typeof settings.layer === 'function') settings.layer();
    inFrame = true;
    var frameContext = ctx;
    frameContext.clearRect(0, 0, width, height);
    // 盤面に data-vb-fx-board が付いている時（VFX LAB）は、その表示枠の外へ演出を出さない（2026-10-06 利用者指定）。
    var clipJob = jobs.find(function (j) { return !j.done && j.board && j.board.hasAttribute && j.board.hasAttribute('data-vb-fx-board'); });
    if (root) {
      if (clipJob) {
        var frame = (clipJob.board.closest && clipJob.board.closest('#stage')) || clipJob.board, fr = frame.getBoundingClientRect();
        root.style.clipPath = 'inset(' + Math.max(0, fr.top) + 'px ' + Math.max(0, width - fr.right) + 'px ' + Math.max(0, height - fr.bottom) + 'px ' + Math.max(0, fr.left) + 'px)';
      } else root.style.clipPath = '';
    }
    jobs.slice().forEach(function (job) {
      if (job.done) return;
      var rebound;
      try { rebound = rebindElements(job); } catch (e) { finish(job, false, e); return; }
      if (job.def.loop && (!job.source.element || !job.source.element.isConnected)) { finish(job, true); return; }
      if (job.start == null) {
        job.start = now;
        clearTimeout(job.watchdog);
        if (!job.def.loop) job.watchdog = setTimeout(function () { finish(job, false); }, job.ms + 100);
      }
      var t = clamp((now - job.start) / job.ms);
      if (job.def.loop) {
        job.cycle = Math.floor((now - job.start) / job.ms);
        t = (now - job.start) / job.ms;  // ループは時間を折り返さない（動きが継ぎ目で飛ばないよう、連続した時間で描く）
        if (job.cycle >= 1 && !job.firstCycleResolved) { job.firstCycleResolved = true; clearTimeout(job.watchdog);
          job.resolve({ name: job.def.name, cancelled: false, impacts: 0, assetErrors: job.assetErrors.slice(), looping: true }); }
      }
      frameContext.save();
      // 再生中に画面がスクロールしても、カードに付いていく（2026-10-06 利用者指摘：検査画面をスクロールするとずれる）。
      // 発生元のカードが開始時から動いた分だけ、描画全体をずらす。
      curShift = { x: 0, y: 0 };
      var anchor = job.source && job.source.element;
      if (anchor && anchor.isConnected && job.anchor0) {
        var ar = anchor.getBoundingClientRect(); curShift = { x: ar.left - job.anchor0.left, y: ar.top - job.anchor0.top };
      }
      rebound.forEach(function (entry) {
        var r = entry.rect, nr = entry.bounds;
        if (r === job.source || !nr) return;
        r.left = nr.left - curShift.x; r.top = nr.top - curShift.y;
        r.width = nr.width; r.height = nr.height; r.right = r.left + nr.width; r.bottom = r.top + nr.height;
      });
      frameContext.translate(curShift.x, curShift.y);
      // 状態のループは、カードの今の位置・大きさ・**傾き**に毎フレーム合わせる（攻撃の動きで傾く。2026-10-07 利用者指摘）。
      // 傾きのない矩形（中心0,0）で描き、描画全体をカードの中心へ移して回す。
      var drawCtx = frameContext, geo = job.def.loop && job.targets[0] && job.targets[0].element && job.targets[0].element.isConnected
        ? cardGeometry(job.targets[0].element) : null;
      // カードが隠れている（表示されず大きさ0）時は描かない。大きさ0の矩形は画面左上(0,0)に出てしまう（2026-10-07 利用者指摘）。
      if (job.def.loop && job.targets[0] && job.targets[0].element && (!geo || !geo.shown)) { frameContext.restore(); return; }
      if (geo) {
        job.targets[0].left = -geo.w / 2; job.targets[0].top = -geo.h / 2; job.targets[0].width = geo.w; job.targets[0].height = geo.h;
        job.targets[0].right = geo.w / 2; job.targets[0].bottom = geo.h / 2;
      }
      if (job.local) {
        // カードの中に描く状態（毒）は、カードの子要素のcanvasなので傾き・移動はDOMが受け持つ。カードの座標（傾きなし）で描く。
        var le = job.local.el, lc = job.local.canvas, padF = job.local.pad, gw = geo ? geo.w : le.getBoundingClientRect().width, gh = geo ? geo.h : le.getBoundingClientRect().height;
        var dprL = window.devicePixelRatio || 1, pw = Math.ceil(gw * (1 + 2 * padF) * dprL), ph = Math.ceil(gh * (1 + 2 * padF) * dprL);
        if (lc.width !== pw || lc.height !== ph) { lc.width = pw; lc.height = ph; }
        var k = pw / (gw * (1 + 2 * padF));
        drawCtx = job.local.ctx; drawCtx.setTransform(1, 0, 0, 1, 0, 0); drawCtx.clearRect(0, 0, pw, ph);
        drawCtx.setTransform(k, 0, 0, k, (gw * (.5 + padF)) * k, (gh * (.5 + padF)) * k);
      } else if (geo) {
        frameContext.setTransform(canvas.width / width, 0, 0, canvas.width / width, 0, 0);
        frameContext.translate(geo.cx, geo.cy); frameContext.rotate(geo.angle);
      }
      try {
        ctx = drawCtx;
        if (job.trail) {
          var tc = job.trailCtx, dt = job.lastFrame == null ? 16.67 : Math.min(80, now - job.lastFrame);
          tc.save(); tc.globalCompositeOperation = 'destination-out'; tc.globalAlpha = 1 - Math.exp(-dt / 65);
          tc.fillStyle = '#000'; tc.fillRect(0, 0, width, height); tc.restore();
          frameContext.save(); frameContext.globalCompositeOperation = 'lighter'; frameContext.globalAlpha = .46;
          frameContext.drawImage(job.trail, 0, 0, width, height); frameContext.restore();
        }
        job.lastFrame = now; draw(job, t); impactFx(job, t); updateHits(job, t);
      } catch (e) { finish(job, false, e); }
      ctx = frameContext;
      frameContext.restore();
      if (t >= 1 && !job.def.loop) finish(job, false);
    });
    inFrame = false;
    if (jobs.length && !raf) raf = requestAnimationFrame(tick);
  }
  /* 描画の共通部品。ぼかしと流体ノイズを小さいスプライトへ事前生成する。
   * ランタイムに大きな画面へ blur を繰り返さず、DPR付き canvas へ加算合成する。 */
  function surface(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function texture(type, color, variant) {
    var key = type + color + (variant || 0), cached = spriteCache[key]; if (cached) return cached;
    var c = surface(type === 'glow' ? 192 : 128), g = c.getContext('2d'), s = c.width, m = s / 2;
    if (type === 'glow') {
      var halo = g.createRadialGradient(m, m, 0, m, m, m);
      halo.addColorStop(0, '#ffffff'); halo.addColorStop(.035, '#fffef7');
      halo.addColorStop(.11, rgba(color, .98)); halo.addColorStop(.28, rgba(color, .46));
      halo.addColorStop(.57, rgba(color, .13)); halo.addColorStop(1, rgba(color, 0));
      g.fillStyle = halo; g.fillRect(0, 0, s, s);
      var bloom = surface(s); var bg = bloom.getContext('2d');
      bg.filter = 'blur(5px)'; bg.globalAlpha = .65; bg.drawImage(c, 0, 0); bg.filter = 'none';
      bg.globalCompositeOperation = 'lighter'; bg.drawImage(c, 0, 0); c = bloom;
    } else {
      var data = g.createImageData(s, s), col = rgb(color), seed = 11 + (variant || 0) * 31;
      for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
        var u = (x - m) / m, v = (y - m) / m, d = Math.hypot(u, v), a = Math.atan2(v, u);
        var warp = noise(u * 3 + 7, v * 3 + 7, seed);
        var curl = a + warp * 2.4 + d * 4.5;
        var n = fractal(Math.cos(curl) * d * 4.4 + 17, Math.sin(curl) * d * 4.4 + 21, seed);
        var falloff = clamp(1 - d * (1 + (warp - .5) * .35));
        var plasma = type.indexOf('plasma') === 0;
        var density = plasma ? Math.pow(clamp((n - .29) * 2.45), 1.15) : .18 + n * .9;
        var value = type === 'stone' ? .36 + n * .64 : plasma ? .3 + density * 1.12 : .23 + n * .95;
        var core = type === 'plasma' ? Math.pow(clamp(1 - d * 3.2), 2) * .93 : 0;
        var k = (y * s + x) * 4;
        for (var ch = 0; ch < 3; ch++) data.data[k + ch] = mix(col[ch] * value, 255, core);
        data.data[k + 3] = type === 'stone' ? 255 : Math.pow(falloff, type === 'smoke' ? 1.45 : 1.8) * density * 255;
      }
      g.putImageData(data, 0, 0);
      if (type === 'smoke') {
        var soft = surface(s), sg = soft.getContext('2d'); sg.filter = 'blur(2px)'; sg.drawImage(c, 0, 0); c = soft;
      }
    }
    spriteCache[key] = c; return c;
  }
  function stamp(type, x, y, radius, color, alpha, rotation, variant, sy) {
    if (radius <= 0 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.globalAlpha = clamp(alpha);
    ctx.globalCompositeOperation = type === 'smoke' || type === 'stone' ? 'source-over' : 'lighter';
    ctx.drawImage(texture(type, color, variant), -radius, -radius * (sy || 1), radius * 2, radius * 2 * (sy || 1)); ctx.restore();
  }
  function glow(x, y, radius, color, alpha) { stamp('glow', x, y, radius, color, alpha); }
  function line(points, color, lineWidth, alpha, core) {
    if (points.length < 2 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (var p = 1; p < points.length; p++) ctx.lineTo(points[p].x, points[p].y);
    [ [7, .055, color], [3.2, .19, color], [1, .65, color], [.28, core === false ? 0 : .86, '#fffdf7'] ].forEach(function (layer) {
      ctx.lineWidth = Math.max(.35, lineWidth * layer[0]); ctx.globalAlpha = clamp(alpha * layer[1]); ctx.strokeStyle = layer[2]; ctx.stroke();
    }); ctx.restore();
  }
  function arcPoints(x, y, radius, start, end, t, seed, roughness) {
    var pts = [], count = Math.max(32, Math.ceil((end - start) / TAU * 112));
    for (var i = 0; i <= count; i++) {
      var a = mix(start, end, i / count), n = fractal(Math.cos(a) * 3 + t * .8 + 12, Math.sin(a) * 3 + t * .6 + 13, seed);
      var r = radius * (1 + (n - .5) * (roughness == null ? .12 : roughness));
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    } return pts;
  }
  function ring(x, y, radius, color, alpha, lineWidth, t, seed, roughness) {
    if (radius <= 0) return;
    line(arcPoints(x, y, radius, 0, TAU, t || 0, seed || 13, roughness), color, lineWidth || 1.6, alpha);
  }
  function magicTexture(color) {
    var key = 'magic' + color; if (spriteCache[key]) return spriteCache[key];
    var c = surface(512), g = c.getContext('2d'), m = 256, r = 207;
    g.translate(m, m); g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
    function circle(rad, lw, alpha) { g.globalAlpha = alpha; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke(); }
    circle(r * .96, r * .14, .46); circle(r, 2.4, .95); circle(r * .91, 1.6, .9);
    circle(r * .74, 1.7, .8); circle(r * .7, .8, .65);
    for (var petal = 0; petal < 40; petal++) {
      g.save(); g.rotate(petal * TAU / 40); g.globalAlpha = .58; g.lineWidth = 2.1;
      g.beginPath(); g.moveTo(r * .91, 0);
      g.bezierCurveTo(r * .93, -11, r * 1.01, -11, r, 0);
      g.bezierCurveTo(r * .97, 10, r * .9, 10, r * .91, 0); g.stroke(); g.restore();
    }
    for (var n = 0; n < 32; n++) {
      g.save(); g.rotate(n * TAU / 32); g.globalAlpha = .9; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(r * .81, -7); g.lineTo(r * .86, 0); g.lineTo(r * .81, 7);
      g.moveTo(r * .81, 0); g.lineTo(r * .88, 0); g.stroke(); g.restore();
    }
    for (var p = 0; p < 8; p++) {
      g.save(); g.rotate(p * TAU / 8); g.globalAlpha = .9; g.lineWidth = 1.45;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(24, -14, 33, -69, 9, -r * .66);
      g.bezierCurveTo(0, -r * .75, -14, -r * .62, -9, -r * .53);
      g.bezierCurveTo(-36, -70, -23, -13, 0, 0); g.stroke();
      g.beginPath(); g.arc(19, -r * .64, 12, 0, TAU * .82); g.stroke();
      g.beginPath(); g.arc(-19, -r * .64, 12, Math.PI, TAU * 1.28); g.stroke(); g.restore();
    }
    circle(r * .12, 1.1, .75);
    var out = surface(512), og = out.getContext('2d');
    og.filter = 'blur(4px)'; og.globalAlpha = .8; og.drawImage(c, 0, 0); og.filter = 'none';
    og.globalCompositeOperation = 'lighter'; og.drawImage(c, 0, 0); spriteCache[key] = out; return out;
  }
  function magic(x, y, radius, color, alpha, angle) {
    if (radius <= 0 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha); ctx.translate(x, y); ctx.rotate((angle || 0) * curDir);
    ctx.drawImage(magicTexture(color), -radius * 1.24, -radius * 1.24, radius * 2.48, radius * 2.48); ctx.restore();
  }
  function attributes(job, i) { return job.motes[i % job.motes.length]; }
  function trailDot(job, x, y, radius, color, alpha) {
    if (!job.trail) {
      // 残光は柔らかい層なので等倍。粒子の芯・文様・前縁は主canvasのDPR解像度で描く。
      job.trail = surface(Math.ceil(width), Math.ceil(height)); job.trailCtx = job.trail.getContext('2d');
    }
    var c = job.trailCtx; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(alpha);
    c.drawImage(texture('glow', color), x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  // 粒子は寿命・速度・回転・ちらつきに個体差。指数摩擦で減速しながら外へ散る。
  function particles(job, p, t, color, count, radius, options) {
    if (t < 0 || t >= 1) return; options = options || {};
    count = Math.round((count || 64) * job.particles);
    for (var i = 0; i < count; i++) {
      var m = attributes(job, i + (options.offset || 0)), age = (t - m.delay * .11) / m.life;
      if (age <= 0 || age >= 1) continue;
      var a = m.angle + age * m.spin * (options.vortex || .5) * curDir, reach = radius * m.velocity * (1 - Math.exp(-age * 3.2));
      var drift = (noise(m.angle * 3 + age * 4, age * 3, job.seed) - .5) * radius * .15;
      var x = p.x + Math.cos(a) * reach + Math.cos(a + Math.PI / 2) * drift;
      var y = p.y + Math.sin(a) * reach + Math.sin(a + Math.PI / 2) * drift;
      var alpha = Math.sin(age * Math.PI) * (.55 + .45 * Math.sin(age * m.flicker + i)) * (options.alpha || 1);
      var size = job.unit * (.012 + m.size * .027) * (1 - age * .48);
      glow(x, y, size * 2.7, color, alpha * .72);
      if (options.trail !== false && i % 2 === 0) trailDot(job, x, y, size * 2, color, alpha * .34);
      if (m.size > .76) line([{ x: x - size * 1.5, y: y }, { x: x + size * 1.5, y: y }], color, .65, alpha);
    }
  }
  function burst(job, p, t, color, count, radius) {
    if (t < 0 || t >= 1) return;
    radius = radius || job.unit; var fade = Math.pow(1 - t, 1.6);
    stamp('plasma', p.x, p.y, job.unit * (.33 + .62 * ease(t)), color, fade * .88, t * 2, 1);
    glow(p.x, p.y, job.unit * (1.05 - .6 * t), color, Math.pow(1 - t, 4) * .95);
    ring(p.x, p.y, radius * (.15 + .7 * ease(t)), color, fade * .72, 1.8 + 3 * (1 - t), t, job.seed, .18);
    particles(job, p, t, color, count || 72, radius, { vortex: .9 });
  }
  function borderPoints(r, t, seed, padding) {
    var p = point(r), rx = r.width / 2 + padding, ry = r.height / 2 + padding, pts = [];
    for (var i = 0; i <= 96; i++) {
      var a = i * TAU / 96, c = Math.cos(a), s = Math.sin(a), wobble = 1 + (noise(c * 4 + t, s * 4 - t, seed) - .5) * .037;
      pts.push({ x: p.x + Math.sign(c) * Math.pow(Math.abs(c), .22) * rx * wobble, y: p.y + Math.sign(s) * Math.pow(Math.abs(s), .22) * ry * wobble });
    } return pts;
  }
  function perimeter(job, r, t, color, alpha) {
    line(borderPoints(r, t, job.seed, job.unit * .04), color, 1.5, alpha * .7);
    line(borderPoints(r, -t, job.seed + 17, job.unit * .105), color, .7, alpha * .35);
  }
  function fluid(job, p, t, rx, ry, color, alpha, options) {
    options = options || {}; var count = Math.round((options.count || 72) * job.particles);
    for (var i = 0; i < count; i++) {
      var m = attributes(job, i + (options.offset || 0)), phase = (m.delay + t * (.3 + m.velocity * .4)) % 1;
      var a = m.angle + t * m.spin * (options.spin || 1.8) * curDir, rad = options.rim ? .72 + m.size * .32 : Math.sqrt(m.size);
      var x = p.x + Math.cos(a) * rx * rad + (noise(i * .3, t * 3, job.seed) - .5) * rx * .13;
      var y = p.y + Math.sin(a) * ry * rad + (noise(i * .3 + 9, t * 3, job.seed) - .5) * ry * .13;
      var size = Math.min(rx, ry) * (.19 + m.velocity * .27) * (options.scale || 1);
      var lifeAlpha = .5 + .5 * Math.sin(phase * Math.PI);
      stamp(options.type || 'smoke', x, y, size, color, alpha * lifeAlpha * (.26 + .44 * m.size), a + phase * 3, i % 3);
    }
  }
  // 範囲演出の命中：硬い輪を描かず、柔らかい光と粒だけ（輪が並ぶと安っぽい）。
  function softHit(job, p, f, scale) {
    if (job.def.kind === 'all-roar') return;
    var fade = Math.pow(1 - f, 1.6);
    stamp('plasma', p.x, p.y, job.unit * (.3 + .45 * ease(f)) * scale, job.def.light, fade * .6, f * 2, 1);
    glow(p.x, p.y, job.unit * (.9 - .4 * f) * scale, job.def.light, Math.pow(1 - f, 4) * .7);
    particles(job, p, f, job.def.light, 40, job.unit * scale, { vortex: .6 });
  }
  function impactFx(job, t) {
    if (job.def.loop || ['morph', 'reuse', 'shake', 'blue', 'powerup', 'summon', 'revive-summon', 'gain-shield', 'gain-revive', 'shield-break'].indexOf(job.def.kind) >= 0) return;
    job.targets.forEach(function (r, i) {
      var elapsed = (t - job.hitAt[i]) * job.ms;
      var life = Math.min(550, job.ms * (1 - job.hitAt[i])); if (elapsed < 0 || elapsed > life) return;
      var f = elapsed / life, p = point(r), scale = job.def.kind === 'wave' || job.def.kind.indexOf('all-') === 0 ? .72 : 1.12;
      if (job.def.kind === 'quake') quakeHit(job, p, f, r); else if (job.def.kind === 'curse') curseHit(job, r, f); else if (job.def.kind === 'soul') soulBurst(job, p, f); else if (job.def.kind === 'skullfly') { soulBurst(job, p, f); boneScatter(job, p, f); } else if (job.def.kind === 'blood') bloodSplat(job, p, f, i); else if (job.def.kind === 'ice') iceBurst(job, p, f); else if (['wave', 'meteor', 'roots'].indexOf(job.def.kind) >= 0 || job.def.kind.indexOf('all-') === 0) softHit(job, p, f, scale); else burst(job, p, f, job.def.light, 64, job.unit * scale);
      var flash = Math.pow(1 - clamp(elapsed / 140), 2);
      if (['stone', 'capture', 'howl', 'undead'].indexOf(job.def.kind) < 0) {
        setStyle(job, r.element, 'filter', job.baseFilters[i] + ' brightness(' + (1 + flash * .62) + ')');
        setStyle(job, r.element, 'translate', (Math.sin(elapsed * .11) * flash * job.unit * .024 * settings.shake / job.domScales[i]) + 'px 0px');
      }
    });
  }
  function sprite(job, key, r, alpha, scale) {
    var cacheKey = key + '-' + Math.max(0, job.targets.indexOf(r));
    var node = job.sprites[cacheKey];
    if (!node) {
      var path = key === 'revive' ? 'vfx/K020.webp' : key === 'old-all' ? 'vfx/K009.webp'
        : key === 'appearance' ? 'vfx/appearance_sheet.webp' : 'vfx/K004.webp';
      if (key === 'reuse' && typeof getEffectVfxPath === 'function') {
        var registered = getEffectVfxPath('C053');
        if (registered) path = registered.replace(/^assets\//, '');
      }
      node = document.createElement(key === 'appearance' ? 'div' : 'img');
      if (node.tagName === 'IMG') {
        var spriteUrl = new URL(path, assetBase); spriteUrl.searchParams.set('vblab', job.id);
        node.src = spriteUrl.href; node.alt = '';
      }
      else Object.assign(node.style, { backgroundImage: 'url("' + new URL(path, assetBase).href + '")', backgroundSize: '3400% 100%', backgroundRepeat: 'no-repeat' });
      Object.assign(node.style, { position: 'fixed', pointerEvents: 'none', objectFit: 'contain', transform: 'translate(-50%, -50%)' });
      root.appendChild(node); job.nodes.push(node); job.sprites[cacheKey] = node;
      node.addEventListener('error', function () { job.assetErrors.push(path); });
    }
    var p = point(r), w = r.width * (scale || 1), h = r.height * (scale || 1);
    Object.assign(node.style, { left: (p.x + curShift.x) + 'px', top: (p.y + curShift.y) + 'px', width: w + 'px', height: h + 'px', opacity: String(clamp(alpha)) });
    return node;
  }
  function pathPoint(job, dst, u, seed, straight) {
    var dx = dst.x - job.from.x, dy = dst.y - job.from.y, length = Math.max(1, Math.hypot(dx, dy));
    var bend = straight ? 0 : Math.sin(u * Math.PI) * Math.min(job.unit * .8, length * .17) * (seed % 2 ? 1 : -1) * (job.dir || 1);
    return { x: mix(job.from.x, dst.x, u) - dy / length * bend, y: mix(job.from.y, dst.y, u) + dx / length * bend };
  }
  // 太さの揺らぎと白い芯を持つ、先細りのプラズマ／斬撃／根のリボン。
  function ribbon(points, thickness, color, alpha, t, seed) {
    if (points.length < 2 || alpha <= 0) return;
    var left = [], right = [];
    for (var i = 0; i < points.length; i++) {
      var before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      var a = Math.atan2(after.y - before.y, after.x - before.x) + Math.PI / 2;
      var f = i / (points.length - 1), w = thickness * Math.pow(Math.sin(f * Math.PI), .65);
      w *= .65 + noise(f * 19 + t * 3, t * 4, seed) * .7;
      left.push({ x: points[i].x + Math.cos(a) * w, y: points[i].y + Math.sin(a) * w });
      right.push({ x: points[i].x - Math.cos(a) * w, y: points[i].y - Math.sin(a) * w });
    }
    var mid = points[Math.floor(points.length / 2)], a = Math.atan2(points[points.length - 1].y - points[0].y, points[points.length - 1].x - points[0].x) + Math.PI / 2;
    var g = ctx.createLinearGradient(mid.x - Math.cos(a) * thickness, mid.y - Math.sin(a) * thickness, mid.x + Math.cos(a) * thickness, mid.y + Math.sin(a) * thickness);
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(.24, rgba(color, .5)); g.addColorStop(.47, rgba(color, .9));
    g.addColorStop(.5, '#fffdf4'); g.addColorStop(.53, rgba(color, .9)); g.addColorStop(.8, rgba(color, .4)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    left.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
    right.reverse().forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.fill(); ctx.restore();
    line(points, color, Math.max(.7, thickness * .1), alpha * .65);
  }
  function filament(a, b, bend, t, seed, segments) {
    var pts = [], dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
    for (var i = 0; i <= (segments || 32); i++) {
      var f = i / (segments || 32), sway = (noise(f * 7 + t * 2, t, seed) - .5) * bend * Math.sin(f * Math.PI);
      pts.push({ x: mix(a.x, b.x, f) - dy / length * sway, y: mix(a.y, b.y, f) + dx / length * sway });
    } return pts;
  }
  function crystal(x, y, size, color, angle, alpha, seed) {
    if (size <= 0 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = clamp(alpha); ctx.globalCompositeOperation = 'lighter';
    var pts = [[0,-1.2],[.57,-.42],[.4,.66],[-.24,1],[-.61,.12],[-.35,-.77]];
    var g = ctx.createLinearGradient(-size, -size, size, size); g.addColorStop(0, rgba(color, .15)); g.addColorStop(.36, rgba(color, .65));
    g.addColorStop(.49, '#ffffff'); g.addColorStop(.58, rgba(color, .82)); g.addColorStop(1, rgba(color, .08));
    ctx.fillStyle = g; ctx.beginPath();
    pts.forEach(function (p, i) { var fn = i ? 'lineTo' : 'moveTo'; ctx[fn](p[0] * size, p[1] * size); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(color, .9); ctx.lineWidth = .8; ctx.stroke();
    for (var f = 0; f < 3; f++) {
      var v = pts[(f * 2 + seed) % pts.length]; ctx.strokeStyle = f === 0 ? '#ffffff' : rgba(color, .48);
      ctx.beginPath(); ctx.moveTo(-size * .1, size * .1); ctx.lineTo(v[0] * size, v[1] * size); ctx.stroke();
    }
    ctx.restore(); glow(x, y, size * 2.8, color, alpha * .4);
  }
  function charge(job, p, t, end, color) {
    if (t < 0 || t >= end) return;
    var f = t / end, fade = Math.sin(f * Math.PI);
    magic(p.x, p.y, job.unit * (.22 + .13 * smooth(f)), color, fade * .45, f * .6);
    stamp('plasma', p.x, p.y, job.unit * (.1 + f * .2), color, fade * .65, f * 2, 0);
    particles(job, p, 1 - f, color, 42, job.unit * .6, { alpha: fade * .65, vortex: -1, trail: false });
  }
  function orb(job, p, t, color, scale, blood) {
    var size = job.unit * scale;
    fluid(job, p, t, size * .74, size * .74, blood ? '#470713' : color, .85, { count: 13, rim: true, scale: .8 });
    stamp('plasma', p.x, p.y, size, color, .92, t * 3, 1);
    stamp('plasma', p.x - size * .14, p.y + size * .13, size * .74, color, .62, -t * 4, 2);
    ring(p.x, p.y, size * .62, color, .52, size * .07, t * 2, job.seed, .29);
    glow(p.x, p.y, size * 1.35, color, blood ? .24 : .64);
    for (var i = 0; i < 14; i++) {
      var m = attributes(job, i), a = m.angle + t * m.spin * 5, r = size * (.75 + .48 * m.size);
      glow(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, size * (.035 + m.size * .04), color, .7);
    }
  }
  // 魂：人魂のような半透明の頭と、ゆらめく数本の尾。尾から薄い霊気が剥がれて漂う（2026-10-05 利用者指摘：魂感が無い）。
  function taper(points, width, color, alpha, blur) {
    if (points.length < 2 || alpha <= 0) return;
    var left = [], right = [];
    for (var i = 0; i < points.length; i++) {
      var before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      var a = Math.atan2(after.y - before.y, after.x - before.x) + Math.PI / 2, f = i / (points.length - 1);
      var w = width * Math.pow(1 - f, 1.25) * (f < .12 ? .55 + f / .12 * .45 : 1);
      left.push({ x: points[i].x + Math.cos(a) * w, y: points[i].y + Math.sin(a) * w });
      right.push({ x: points[i].x - Math.cos(a) * w, y: points[i].y - Math.sin(a) * w });
    }
    var head = points[0], tail = points[points.length - 1], g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    g.addColorStop(0, rgba(color, 1)); g.addColorStop(.35, rgba(color, .7)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha); ctx.fillStyle = g;
    if (blur) ctx.filter = 'blur(' + blur.toFixed(1) + 'px)';
    ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    for (var l = 1; l < left.length; l++) ctx.lineTo(left[l].x, left[l].y);
    for (var r = right.length - 1; r >= 0; r--) ctx.lineTo(right[r].x, right[r].y);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function ghost(job, dst, u, index, t) {
    // color＝明るい霊気（加算）、light＝濃い影の色（通常合成。明るい背景でも輪郭が読めるように）。
    var bright = job.def.color, deep = job.def.light, R = job.unit * .24, N = 34;
    var head = pathPoint(job, dst, u, index, false), back = pathPoint(job, dst, clamp(u - .03), index, false);
    var angle = Math.atan2(head.y - back.y, head.x - back.x), ca = Math.cos(angle), sa = Math.sin(angle), step = R * .2;
    var tails = [];
    for (var k = 0; k < 5; k++) {
      var len = N - Math.abs(k - 2) * 6, side = (k - 2) * .5, pts = [];
      for (var j = 0; j <= len; j++) {
        var f = j / len, along = j * step, wave = Math.sin(j * .36 - t * 34 + k * 1.7) * R * .7 * f + side * R * f * 1.8;
        pts.push({ x: head.x - ca * along - sa * wave, y: head.y - sa * along + ca * wave });
      }
      tails.push(pts);
    }
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .4; ctx.filter = 'blur(' + (R * .45).toFixed(1) + 'px)';
    tails.forEach(function (pts, k) { taperFill(pts, R * (k === 2 ? 1 : .7), deep); });
    ctx.restore();
    tails.forEach(function (pts, k) {
      taper(pts, R * (k === 2 ? .85 : .55), bright, .55, R * .3);
      taper(pts, R * (k === 2 ? .3 : .18), '#ffffff', .4);
    });
    for (var w = 0; w < 16; w++) {
      var m = attributes(job, w + index * 16 + 40), age = (t * 2.6 + m.delay) % 1, along2 = R * (1 + m.size * 4) + age * R * 1.5;
      var drift = (w % 2 ? 1 : -1) * R * (.4 + age * 1.6);
      var x = head.x - ca * along2 - sa * drift, y = head.y - sa * along2 + ca * drift;
      stamp('smoke', x, y, R * (.4 + age * .9), deep, Math.sin(age * Math.PI) * .22, m.angle + age * 3, w % 3, 1.4);
      stamp('plasma', x, y, R * (.3 + age * .7), bright, Math.sin(age * Math.PI) * .3, m.angle + age * 3, w % 3, 1.4);
    }
    var flick = .85 + .15 * Math.sin(t * 61 + index);
    stamp('smoke', head.x, head.y, R * 1.9, deep, .45, angle, 0, .8);
    glow(head.x, head.y, R * 4, bright, .5);
    stamp('plasma', head.x, head.y, R * 1.5, bright, .85, angle, 1, .78);
    stamp('plasma', head.x, head.y, R * 1.05, bright, .9 * flick, angle + t * 3, 2, .82);
    glow(head.x, head.y, R * 1.1, '#ffffff', .9 * flick);
  }
  function taperFill(points, width, color) {
    var left = [], right = [];
    for (var i = 0; i < points.length; i++) {
      var before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      var a = Math.atan2(after.y - before.y, after.x - before.x) + Math.PI / 2, w = width * Math.pow(1 - i / (points.length - 1), 1.25);
      left.push({ x: points[i].x + Math.cos(a) * w, y: points[i].y + Math.sin(a) * w });
      right.push({ x: points[i].x - Math.cos(a) * w, y: points[i].y - Math.sin(a) * w });
    }
    var g = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
    g.addColorStop(0, rgba(color, 1)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    for (var l = 1; l < left.length; l++) ctx.lineTo(left[l].x, left[l].y);
    for (var r = right.length - 1; r >= 0; r--) ctx.lineTo(right[r].x, right[r].y);
    ctx.closePath(); ctx.fill();
  }
  // 魂の着弾：霊体がほどけて、柔らかい波紋と渦を巻く霊気の筋が広がり、薄く立ち昇って消える。
  function soulBurst(job, p, f) {
    var color = job.def.color, light = job.def.color, deep = job.def.light, R = job.unit;
    var fade = Math.pow(1 - f, 1.4);
    softLayer(p.x, p.y, R * 1.3, 0, 0, function () {
      for (var i = 0; i < 18; i++) {
        var a = i / 18 * TAU - f * .6, rr = R * (.15 + .9 * ease(f));
        stamp('smoke', p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, R * (.3 + .2 * f), deep, fade * .5, a, i % 3, 1.4);
      }
    }, 'source-over');
    glow(p.x, p.y, R * (1.3 - .5 * f), light, Math.pow(1 - f, 3) * .95);
    stamp('plasma', p.x, p.y, R * (.4 + .5 * ease(f)), color, fade * .7, f * 2, 1);
    softLayer(p.x, p.y, R * 1.25, 0, 0, function () {
      var rr = R * (.2 + .95 * ease(f));
      for (var i = 0; i < 28; i++) {
        var a = i / 28 * TAU + f * .8;
        stamp('plasma', p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, R * (.16 + .1 * f), i % 2 ? color : light, fade * .5, a, i % 3, 1.6);
      }
    });
    for (var k = 0; k < 8; k++) {
      var m = attributes(job, k + 70), base = k / 8 * TAU + m.angle * .3, pts = [];
      var reach = R * (.25 + 1.05 * ease(f)) * (.75 + m.size * .5);
      for (var s = 0; s <= 14; s++) {
        var g = s / 14, rad = reach * g, a = base + g * 1.4 * curDir + Math.sin(g * 5 + f * 9) * .12;
        pts.push({ x: p.x + Math.cos(a) * rad, y: p.y + Math.sin(a) * rad });
      }
      taper(pts.slice().reverse(), R * .06, light, fade * .55, R * .02);
    }
    for (var w = 0; w < 10; w++) {
      var m2 = attributes(job, w + 90), a2 = m2.angle, d = R * (.2 + .9 * ease(f) * m2.velocity);
      stamp('plasma', p.x + Math.cos(a2) * d, p.y + Math.sin(a2) * d, R * (.18 + f * .35), color, fade * .35, a2 + f * 4, w % 3, 1.4);
    }
  }
  // デュラハン：艶のある赤黒い血の塊。揺れながら飛び、後ろに大小の滴を引く。着弾で真上から見た血しぶきが広がる。
  function blobPath(x, y, R, angle, stretch, t, seed, spikes) {
    ctx.beginPath();
    for (var i = 0; i <= 40; i++) {
      var a = i / 40 * TAU, n = noise(Math.cos(a) * 2 + t * 6, Math.sin(a) * 2 + seed, seed);
      var r = R * (.85 + (n - .5) * .35);
      if (spikes) r *= 1 + Math.pow(Math.max(0, Math.sin(a * spikes + seed)), 3) * .38;
      var lx = Math.cos(a) * r * stretch, ly = Math.sin(a) * r / Math.sqrt(stretch);
      var px = x + lx * Math.cos(angle) - ly * Math.sin(angle), py = y + lx * Math.sin(angle) + ly * Math.cos(angle);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function bloodFill(x, y, R, angle, alpha) {
    var hx = x - Math.cos(angle - .9) * R * .35, hy = y - Math.sin(angle - .9) * R * .35;
    var g = ctx.createRadialGradient(hx, hy, R * .05, x, y, R * 1.15);
    g.addColorStop(0, 'rgba(255,120,128,' + alpha + ')'); g.addColorStop(.25, 'rgba(196,22,44,' + alpha + ')');
    g.addColorStop(.7, 'rgba(110,6,22,' + alpha + ')'); g.addColorStop(1, 'rgba(48,2,10,' + alpha + ')');
    ctx.fillStyle = g; ctx.fill();
  }
  function bloodDrop(job, x, y, R, angle, stretch, t, seed, alpha, spikes) {
    if (R <= .3 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    blobPath(x, y, R, angle, stretch, t, seed, spikes); bloodFill(x, y, R, angle, clamp(alpha));
    if (R > job.unit * .05) {
      ctx.globalAlpha = clamp(alpha) * .75; ctx.fillStyle = 'rgba(255,220,220,.9)';
      ctx.beginPath(); ctx.ellipse(x - Math.cos(angle - .9) * R * .38, y - Math.sin(angle - .9) * R * .38, R * .22, R * .1, angle, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function bloodFlight(job, dst, u, index, t, p, angle) {
    var R = job.unit * .2, speed = Math.min(2.2, 1.25 + u * 1.2);
    glow(p.x, p.y, R * 3.2, '#c0122c', .3);
    for (var d = 9; d >= 1; d--) {
      var m = attributes(job, d + index * 9 + 120), q = pathPoint(job, dst, clamp(u - d * .038 - m.delay * .015), index, false);
      var side = (m.angle % 1 - .5) * R * 1.2 * (d / 9);
      q.x += -Math.sin(angle) * side; q.y += Math.cos(angle) * side;
      bloodDrop(job, q.x, q.y, R * (.42 - d * .035) * (.6 + m.size * .5), angle, 1.5, t, d + index, .95 - d * .06);
    }
    bloodDrop(job, p.x, p.y, R, angle, speed, t, index + 3, 1);
  }
  function bloodSplat(job, p, f, index) {
    var R = job.unit * .62, grow = ease(clamp(f / .22)), fade = 1 - smooth(clamp((f - .55) / .45));
    glow(p.x, p.y, job.unit * (1.1 - .4 * f), '#ff3048', Math.pow(1 - f, 4) * .7);
    bloodDrop(job, p.x, p.y, R * (.25 + .5 * grow), index * .7, 1, 0, 17 + index, .92 * fade, 9);
    for (var k = 0; k < 16; k++) {
      var m = attributes(job, k + 150), a = m.angle, dist = R * (.45 + .95 * m.velocity) * ease(clamp(f / (.18 + m.delay * .12)));
      var x = p.x + Math.cos(a) * dist, y = p.y + Math.sin(a) * dist, r = job.unit * (.025 + m.size * .045);
      var flying = f < .25 ? 2.2 - f * 4 : 1;
      bloodDrop(job, x, y, r, a, Math.max(1, flying), 0, k, .95 * fade);
      if (k % 2 === 0) {
        var s0 = { x: p.x + Math.cos(a) * R * .3 * grow, y: p.y + Math.sin(a) * R * .3 * grow };
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .7 * fade;
        ctx.strokeStyle = '#7a0718'; ctx.lineCap = 'round'; ctx.lineWidth = r * .9;
        ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.stroke(); ctx.restore();
      }
    }
  }
  // フロスト・スプライト：輪郭のはっきりした氷の欠片（通常合成で面と縁を描く。加算だけだと白く飛んで塊に見える）。
  function iceShard(x, y, size, angle, alpha, stretch) {
    if (size <= 0 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = clamp(alpha); ctx.globalCompositeOperation = 'source-over';
    var L = size * (stretch || 1.8), W = size * .42;
    var g = ctx.createLinearGradient(0, -W, 0, W);
    g.addColorStop(0, 'rgba(240,252,255,.95)'); g.addColorStop(.45, 'rgba(150,220,245,.85)'); g.addColorStop(.55, 'rgba(70,160,215,.85)'); g.addColorStop(1, 'rgba(30,90,150,.9)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * .1, -W); ctx.lineTo(-L * .55, -W * .55); ctx.lineTo(-L * .7, W * .2); ctx.lineTo(L * .05, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,250,255,.9)'; ctx.lineWidth = Math.max(.6, size * .06); ctx.stroke();
    ctx.strokeStyle = 'rgba(25,80,135,.55)'; ctx.lineWidth = Math.max(.5, size * .04);
    ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * .62, -W * .1); ctx.stroke();
    ctx.restore();
  }
  function iceFlight(job, dst, u, index, t, p, angle, f) {
    // 冷気の尾（薄い白い霧）。
    for (var i = 10; i >= 1; i--) {
      var q = pathPoint(job, dst, clamp(u - i * .02), index, false), m0 = attributes(job, i + 300);
      stamp('smoke', q.x, q.y, job.unit * (.12 + i * .02), '#d9f3fb', .2 * (1 - i / 11), m0.angle + t * 2, i % 3, 1.3);
      if (i % 2 === 0) glow(q.x + (m0.size - .5) * job.unit * .3, q.y + (m0.velocity - .5) * job.unit * .3, job.unit * .045, '#ffffff', .7 * (1 - i / 11));
    }
    glow(p.x, p.y, job.unit * .5, '#8fdcf5', .28);
    for (var sh = 0; sh < 8; sh++) {
      var m = attributes(job, sh + 20), lag = clamp(u - m.delay * .05), pos = pathPoint(job, dst, lag, index, false);
      var spread = job.unit * .4 * (.55 + .45 * (1 - f)), a = m.angle + t * 2;
      pos.x += Math.cos(a) * spread * m.size; pos.y += Math.sin(a) * spread * m.size;
      iceShard(pos.x, pos.y, job.unit * (.07 + m.size * .07), angle + (m.angle - Math.PI) * .12, .95, 2.2);
      trailDot(job, pos.x, pos.y, job.unit * .05, '#bfeeff', .3);
    }
  }
  function iceBurst(job, p, f) {
    var fade = Math.pow(1 - f, 1.3), R = job.unit;
    glow(p.x, p.y, R * (.9 - .3 * f), '#e9fbff', Math.pow(1 - f, 4) * .9);
    softLayer(p.x, p.y, R * 1.1, 0, 0, function () {
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * TAU, rr = R * (.15 + .7 * ease(f));
        stamp('smoke', p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, R * .28, '#e4f7fd', fade * .45, a, i % 3, 1.4);
      }
    }, 'source-over');
    // 霜の結晶が放射状に伸びる。
    for (var b = 0; b < 6; b++) {
      var a2 = b / 6 * TAU + .3, len = R * .55 * ease(clamp(f / .35)), tip = { x: p.x + Math.cos(a2) * len, y: p.y + Math.sin(a2) * len };
      line([p, tip], '#bfeeff', R * .018, fade * .9);
      for (var k = 1; k <= 2; k++) {
        var at = { x: p.x + Math.cos(a2) * len * k * .33, y: p.y + Math.sin(a2) * len * k * .33 }, bl = len * .28;
        line([at, { x: at.x + Math.cos(a2 + .7) * bl, y: at.y + Math.sin(a2 + .7) * bl }], '#bfeeff', R * .012, fade * .8);
        line([at, { x: at.x + Math.cos(a2 - .7) * bl, y: at.y + Math.sin(a2 - .7) * bl }], '#bfeeff', R * .012, fade * .8);
      }
    }
    for (var s2 = 0; s2 < 12; s2++) {
      var m = attributes(job, s2 + 320), a3 = m.angle, d = R * (.15 + .85 * m.velocity) * ease(f);
      iceShard(p.x + Math.cos(a3) * d, p.y + Math.sin(a3) * d, R * (.035 + m.size * .045), a3 + f * m.spin * 3, fade, 1.6);
    }
  }
  function projectile(job, t, kind) {
    var travel = kind === 'arrow' || kind === 'wind' ? .48 : .62, begin = kind === 'arrow' || kind === 'wind' ? .035 : .09;
    charge(job, job.from, t, begin, job.def.light);
    job.targets.forEach(function (r, index) {
      var dst = point(r), f = clamp((t - begin) / (travel - begin));
      var u = kind === 'arrow' || kind === 'wind' ? Math.pow(f, .8) : Math.pow(f, 1.65);
      var straight = kind === 'arrow' || kind === 'wind', p = pathPoint(job, dst, u, index, straight);
      var prev = pathPoint(job, dst, clamp(u - .015), index, straight), angle = Math.atan2(p.y - prev.y, p.x - prev.x);
      if (t >= begin && t < travel) {
        if (kind === 'soul' || kind === 'skullfly') {
          ghost(job, dst, u, index, t);
          if (kind === 'skullfly') skullHead(job, p, t, index);
        } else if (kind === 'blood') {
          bloodFlight(job, dst, u, index, t, p, angle);
        } else if (kind === 'arrow') {
          // 尾は飛んだ距離より長くしない（発射元のカードの後ろへはみ出すと、中心から出ていないように見える）。
          var tailLen = Math.min(job.unit * 2.4, Math.hypot(p.x - job.from.x, p.y - job.from.y));
          var tailEnd = { x: p.x - Math.cos(angle) * tailLen, y: p.y - Math.sin(angle) * tailLen };
          ribbon(filament(tailEnd, p, job.unit * .01, t, job.seed, 14), job.unit * .03, '#fff1cf', .9, t, job.seed);
          ribbon(filament(tailEnd, p, job.unit * .01, t, job.seed, 14), job.unit * .09, '#ffcf73', .22, t, job.seed);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle);
          var metal = ctx.createLinearGradient(0, -3, 0, 3); metal.addColorStop(0, '#897250'); metal.addColorStop(.45, '#fff9de'); metal.addColorStop(.6, '#d7cba9'); metal.addColorStop(1, '#78694b');
          ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(-job.unit * .13,-job.unit * .038);
          ctx.lineTo(-job.unit * .095,0); ctx.lineTo(-job.unit * .13,job.unit * .038); ctx.closePath(); ctx.fill();
          ctx.fillRect(-job.unit * .75, -.6, job.unit * .65, 1.2); ctx.restore();
          glow(p.x, p.y, job.unit * .34, '#ffe8b9', .85); trailDot(job, p.x, p.y, job.unit * .09, '#ffdd9d', .6);
        } else if (kind === 'wind') {
          for (var w = 0; w < 7; w++) {
            var off = (w - 3) * job.unit * .065, start = { x: job.from.x - Math.sin(angle) * off, y: job.from.y + Math.cos(angle) * off };
            var end = { x: p.x - Math.sin(angle) * off, y: p.y + Math.cos(angle) * off };
            ribbon(filament(start, end, job.unit * .11, t, w + job.seed), job.unit * (.012 + (w === 3 ? .024 : 0)), '#b1e8df', .42, t, w);
          }
          fluid(job, p, t, job.unit * .23, job.unit * .23, '#b7dcdd', .15, { count: 10, type: 'plasma', spin: 3 });
        } else if (kind === 'ice') {
          iceFlight(job, dst, u, index, t, p, angle, f);
        } else if (kind === 'shards') {
          var count = kind === 'ice' ? 9 : 13;
          for (var sh = 0; sh < count; sh++) {
            var m = attributes(job, sh + 20), lag = clamp(u - m.delay * .065), pos = pathPoint(job, dst, lag, index, false);
            var spread = job.unit * (kind === 'ice' ? .32 : .5) * (.5 + .5 * (1 - f));
            pos.x += Math.cos(m.angle + t * 3) * spread * m.size; pos.y += Math.sin(m.angle + t * 3) * spread * m.size;
            // 欠片同士の加算で白く飛ばないよう、光は控えめにする（フロスト・スプライトと同じ問題）。
            crystal(pos.x, pos.y, job.unit * (.08 + m.size * .1), job.def.color, m.angle + t * m.spin * 5, .8, sh);
            trailDot(job, pos.x, pos.y, job.unit * .08, job.def.color, .25);
          }
          glow(p.x, p.y, job.unit * .6, job.def.color, .18);
          if (kind === 'shards' && t < .2) {
            var sf = clamp(t / .2);
            magic(job.from.x, job.from.y, job.unit * .62 * (1 + sf * .12), '#f8bce2', (1 - sf) * .8, .3);
            particles(job, job.from, sf, '#ffcae7', 48, job.unit * .75, { alpha: .55, vortex: 1 });
          }
        }
      }
      if (kind === 'wind' && t >= travel) {
        var cut = (t - travel) / (1 - travel), fade = Math.pow(1 - cut, 1.5);
        for (var s = 0; s < 3; s++) {
          var cx = dst.x + (s - 1) * r.width * .21;
          var a = { x: cx - r.width * .22, y: dst.y + r.height * .36 }, b = { x: cx + r.width * .25, y: dst.y - r.height * .36 };
          ribbon(filament(a, b, job.unit * .065, cut, job.seed + s), job.unit * (.075 - s * .01), '#f4fffd', fade, cut, job.seed + s);
          glow((a.x + b.x) / 2, (a.y + b.y) / 2, job.unit * .5, '#c8f9f1', fade * .35);
        }
        particles(job, dst, cut, '#edfefd', 48, job.unit * .65, { alpha: .68, vortex: .2 });
      }
    });
  }
  // 先頭の到達と、後続の媒体の放出は別。到達後も場を約1秒保つ。
  function waveProgress(t) { return smooth(clamp((t - .035) / .29)); }
  function waveTime(distance) {
    var lo = 0, hi = 1;
    for (var i = 0; i < 16; i++) { var mid = (lo + hi) / 2; if (smooth(mid) < distance) lo = mid; else hi = mid; }
    return .035 + (lo + hi) / 2 * .29;
  }
  function rayReach(job, angle) {
    var x = Math.cos(angle), y = Math.sin(angle), p = job.from;
    var dx = Math.abs(x) < .00001 ? Infinity : (x > 0 ? width - p.x : -p.x) / x;
    var dy = Math.abs(y) < .00001 ? Infinity : (y > 0 ? height - p.y : -p.y) / y;
    return Math.max(job.unit, Math.min(dx, dy)) + job.unit * .65;
  }
  // 進行方向を向く炎の舌。黒い中心と加算する細い火の縁を別画像にする。
  function flameTexture(edge, variant) {
    var key = 'flame' + (edge ? 'edge' : 'body') + variant;
    if (spriteCache[key]) return spriteCache[key];
    var c = surface(192), g = c.getContext('2d'), s = c.width, data = g.createImageData(s, s);
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
      var u = x / s, v = (y / s - .5) * 2;
      var n = fractal(u * 7 + 5, v * 3 + 9, 71 + variant * 17);
      var bend = (noise(u * 5 + 3, variant * .7, 41) - .5) * .42;
      var half = Math.pow(Math.sin(u * Math.PI), .9) * (.35 + n * .24) * (1 - u * .52);
      var d = Math.abs(v - bend) / Math.max(.001, half), mask = clamp((1.13 - d) * 5);
      var rim = Math.pow(clamp(1 - Math.abs(d - .87) / .26), 1.5) * (.5 + n * .5);
      var a = edge ? rim * mask * (.75 + .25 * Math.sin(u * Math.PI)) : mask * .93;
      var k = (y * s + x) * 4, hot = Math.pow(clamp((n - .55) * 3), 2) * rim;
      data.data[k] = edge ? mix(202 + u * 45, 255, hot) : 7 + n * 12;
      data.data[k + 1] = edge ? mix(38 + u * 27, 243, hot) : 4 + n * 6;
      data.data[k + 2] = edge ? mix((variant >= 3 ? 55 : 138) + (1 - u) * 78, 255, hot) : 13 + n * 17;
      data.data[k + 3] = a * 255;
    }
    g.putImageData(data, 0, 0);
    var soft = surface(s), sg = soft.getContext('2d');
    sg.filter = edge ? 'blur(4px)' : 'blur(3px)'; sg.drawImage(c, 0, 0); sg.filter = 'none';
    if (edge) { sg.globalCompositeOperation = 'lighter'; sg.globalAlpha = .6; sg.drawImage(c, 0, 0); }
    spriteCache[key] = soft; return soft;
  }
  // 闇の炎：膨らみながら流れる炎の塊（根元は白紫の芯→紫の火→黒紫の煙）＋ちらつき＋火の粉。
  // 敵方向の扇へ画面端まで流れ、届いた後もしばらく燃えてから消える（2026-10-05 利用者指定：炎感、2倍速が標準）。
  function blackFlames(job, t) {
    var alpha = smooth(clamp(t / .05)) * smooth(clamp((1 - t) / .3)), front = smooth(clamp(t / .38));
    charge(job, job.from, t, .05, '#e7a6ff'); if (t < .015) return;
    var sec = t * job.ms / 1000, count = Math.round(300 * job.particles), puffs = [];
    for (var i = 0; i < count; i++) {
      var m = attributes(job, i), theta = job.angle + (m.angle / TAU * 2 - 1) * job.spread * .98;
      var angular = Math.pow(Math.max(0, Math.cos((theta - job.angle) / job.spread * Math.PI / 2)), .5);
      var life = .42 + m.life * .3, phase = (sec / life + m.delay) % 1, reach = rayReach(job, theta);
      var dist = reach * Math.pow(phase, .8);
      if (dist > reach * front + job.unit * .2) continue;
      var wob = (fractal(phase * 4 + i * .37, sec * 3, job.seed) - .5) * job.unit * (.25 + phase * .9);
      var x = job.from.x + Math.cos(theta) * dist - Math.sin(theta) * wob, y = job.from.y + Math.sin(theta) * dist + Math.cos(theta) * wob;
      var flick = .7 + .3 * noise(i * 1.7, sec * 9, job.seed);
      puffs.push({ x: x, y: y, ph: phase, a: alpha * angular * flick, sz: job.unit * (.22 + phase * 1.05) * (.6 + m.size * .7), rot: m.angle + sec * m.spin, i: i });
    }
    // 黒紫の煙（後半ほど濃く大きい）を先に、通常の重ね方で置く。
    puffs.forEach(function (p) { stamp('smoke', p.x, p.y, p.sz * 1.25, '#0d0716', p.a * (.18 + .62 * p.ph), p.rot, p.i % 3, 1.15); });
    // 火（加算）：若い塊ほど明るい。芯は白紫、中盤は紫、終盤は赤紫。
    puffs.forEach(function (p) {
      var heat = Math.pow(1 - p.ph, 1.25), col = p.ph < .2 ? '#ffe2ff' : p.ph < .5 ? '#d66df4' : '#9b2fb8';
      stamp('plasma', p.x, p.y, p.sz * (.75 + .25 * p.ph), col, p.a * heat * .78, p.rot * 1.4, p.i % 3);
      if (p.ph < .45) stamp('plasma-soft', p.x, p.y, p.sz * .55, '#fff0ff', p.a * (1 - p.ph / .45) * .45, -p.rot, (p.i + 1) % 3);
    });
    // 火の粉：速く飛び、尾を引く。
    for (var e = 0; e < 70 * job.particles; e++) {
      var m2 = attributes(job, e + 900), th = job.angle + (m2.angle / TAU * 2 - 1) * job.spread * .9;
      var ph2 = (sec / (.35 + m2.life * .2) + m2.delay) % 1, rr = rayReach(job, th) * Math.pow(ph2, .7) * 1.05;
      if (rr > rayReach(job, th) * front + job.unit * .3) continue;
      var ex = job.from.x + Math.cos(th) * rr, ey = job.from.y + Math.sin(th) * rr, ea = alpha * (1 - ph2);
      glow(ex, ey, job.unit * (.05 + .05 * m2.size), ph2 < .4 ? '#ffd7ff' : '#e05be8', ea * .8);
      trailDot(job, ex, ey, job.unit * .04, '#e889ff', ea * .35);
    }
  }
  // 魔族の魂：足元に赤い魔法陣、赤黒い脈動の波が続けて押し寄せ、通った跡に赤黒い霞と血管のような筋が残る（画面端まで消えない）。
  function demonWave(job, t) {
    var a = job.from, start = job.angle - job.spread, end = job.angle + job.spread, fade = smooth(clamp((1 - t) / .25));
    var sig = envelope(t, .06, .5);
    magic(a.x, a.y, job.unit * (.55 + .15 * ease(t)), '#ff3446', sig * .55, t * 1.4);
    stamp('smoke', a.x, a.y, job.unit * .8, '#1a0207', sig * .7, t, 0);
    glow(a.x, a.y, job.unit * .9, '#ff2a3c', sig * .5);
    if (t < .035) return;
    var lead = job.reach * waveProgress(t);
    // 通った跡の霞（通常合成で暗く、縁はぼかす）。
    softLayer(a.x, a.y, Math.max(1, lead * 1.02), job.angle, job.spread, function () {
      var g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(1, lead));
      g.addColorStop(0, 'rgba(40,2,10,.55)'); g.addColorStop(.7, 'rgba(70,4,16,.42)'); g.addColorStop(1, 'rgba(120,8,26,.25)');
      ctx.fillStyle = g; ctx.globalAlpha = fade; ctx.fillRect(a.x - lead, a.y - lead, lead * 2, lead * 2);
    }, 'source-over');
    // 脈動する波頭：1波目が当たり判定と同期、2・3波目が追いかける。厚みのある乱流の帯をぼかした層に描く。
    // ぼかしは3波まとめて1回だけ（重さ対策）。
    var pulses = [];
    for (var k = 0; k < 3; k++) {
      var tk = .035 + k * .15, rad = k === 0 ? lead : job.reach * smooth(clamp((t - tk) / .34));
      if (t < tk || rad <= job.unit * .3) continue;
      pulses.push({ k: k, rad: rad, w: k === 0 ? 1 : .62 - k * .14 });
    }
    if (pulses.length) blurLayer(job.unit * .06, function () {
      pulses.forEach(function (pl) {
        var steps = Math.max(24, Math.min(110, Math.round(pl.rad * (end - start) / (job.unit * .14))));
        for (var row = 2; row >= 0; row--) {
          for (var i = 0; i <= steps; i++) {
            var u = (i + (row % 2) * .5) / steps, th = mix(start, end, u);
            var n = fractal(Math.cos(th) * 4 + t * 2.5 + pl.k, Math.sin(th) * 4 + t + row, job.seed + pl.k), rr = pl.rad * (1 + (n - .5) * .09) - row * job.unit * (.15 + n * .08);
            var x = a.x + Math.cos(th) * rr, y = a.y + Math.sin(th) * rr, tp = Math.pow(Math.sin(clamp(u) * Math.PI), .7);
            stamp('smoke', x, y, job.unit * (.34 + n * .24), row === 0 ? '#3a0410' : '#16020a', fade * pl.w * tp * (.6 - row * .1), th + t * 3 + row, i % 3, 1.25);
            if (row <= 1 && i % 2 === row) stamp('plasma', x, y, job.unit * (.18 + n * .16), row === 0 ? '#ff5a52' : '#c0122e', fade * pl.w * tp * (row === 0 ? .55 : .4), th + t * 5, i % 3, 1.3);
          }
        }
      });
    }, 'source-over');
    pulses.forEach(function (pl) {
      // ぼかさない細部：波頭の火の粉と、剥がれて後ろへ流れる黒い煙。
      for (var e = 0; e < 50 * job.particles; e++) {
        var me = attributes(job, e + 430), ue = me.delay, the = mix(start, end, ue), tpe = Math.sin(ue * Math.PI);
        var lag = me.size * job.unit * (.2 + .9 * ((t * 3 + me.velocity) % 1)), re = pl.rad - lag;
        if (re <= 0) continue;
        var xe = a.x + Math.cos(the) * re, ye = a.y + Math.sin(the) * re;
        if (e % 3 === 0) stamp('smoke', xe, ye, job.unit * (.12 + me.size * .16), '#1a0208', fade * pl.w * tpe * .5, me.angle + t * 4, e % 3, 1.3);
        else glow(xe, ye, job.unit * (.03 + me.size * .04), e % 2 ? '#ff6a4a' : '#ffb08a', fade * pl.w * tpe * (.6 + .4 * Math.sin(t * 40 + e)));
      }
    });
    particles(job, a, clamp(t * 1.2), '#ff5a4a', 90, job.reach * .9, { alpha: fade * .7, vortex: .1 });
  }
  function areaWave(job, t) {
    if (job.def.name === 'dark-fire') { blackFlames(job, t); return; }
    if (job.def.name === 'demon-soul') { demonWave(job, t); return; }
    var a = job.from, radius = job.reach * waveProgress(t), fade = smooth(clamp((1 - t) / .28));
    charge(job, a, t, .06, job.def.light); if (t < .035) return;
    var name = job.def.name, dark = name === 'dark-fire' || name === 'demon-soul';
    var start = job.angle - job.spread, end = job.angle + job.spread;
    ctx.save();
    // 黒い媒体と明るい縁を別レイヤーへ描く。前縁に追従する乱流は到達まで薄くしない。
    var count = Math.round(260 * job.particles);
    for (var i = count - 1; i >= 0; i--) {
      var m = attributes(job, i), theta = start + (end - start) * m.delay;
      var density = Math.pow(Math.max(0, Math.cos((m.delay - .5) * Math.PI)), .6);
      var behind = (1 - m.size) * radius * .97;
      var d = Math.max(0, radius - behind), n = noise(m.angle * 2 + t * 3, m.velocity * 3 + t * 2, job.seed);
      var shift = (n - .5) * job.unit * .55;
      var x = a.x + Math.cos(theta) * d - Math.sin(theta) * shift, y = a.y + Math.sin(theta) * d + Math.cos(theta) * shift;
      var r = job.unit * (.18 + m.velocity * .36) * (.7 + behind / Math.max(job.unit, radius));
      var col = dark ? job.def.color : name === 'worm' ? '#24461b' : name === 'wendigo' ? '#a6c9d3' : '#678ca3';
      stamp('smoke', x, y, r, col, fade * density * (dark ? .9 : .38), theta + m.angle + t * m.spin, i % 3, 1.3);
      stamp('plasma', x, y, r * .95, job.def.light, fade * density * (dark ? .34 : .28) * (.4 + m.size), theta + t * 3, i % 3);
      if (i % 3 === 0) {
        var sz = job.unit * (.015 + .026 * m.size);
        glow(x, y, sz * 3.2, job.def.light, fade * (.3 + .45 * m.size));
        trailDot(job, x, y, sz * 2.2, job.def.light, fade * .25);
        if (name === 'wendigo' && i % 9 === 0) crystal(x, y, job.unit * .04, '#edfaff', m.angle, fade * .6, i);
      }
    }
    // 前縁は線で描かない（境界がくっきり出る）。ぼけた光を弧に沿って並べ、扇の両端へ向かって薄くする（2026-10-05 利用者指摘）。
    var arcLen = Math.max(1, radius * (end - start)), steps = Math.max(24, Math.min(160, Math.round(arcLen / (job.unit * .18))));
    for (var band = 2; band >= 0; band--) {
      var rad = Math.max(1, radius - band * job.unit * .16);
      for (var k = 0; k <= steps; k++) {
        var u = k / steps, theta = mix(start, end, u), taper = Math.pow(Math.sin(u * Math.PI), .9);
        var n = fractal(Math.cos(theta) * 3 + t * 2 + band, Math.sin(theta) * 3 + t, job.seed + band);
        var rr = rad * (1 + (n - .5) * (name === 'shockwave' ? .02 : .06)), x = a.x + Math.cos(theta) * rr, y = a.y + Math.sin(theta) * rr;
        glow(x, y, job.unit * (band === 0 ? .2 : .14), job.def.light, fade * taper * (band === 0 ? .34 : .14));
      }
    }
    for (var front = 0; front < 58; front++) {
      var fu = front / 57, theta = mix(start, end, fu), n = fractal(Math.cos(theta) * 3 + t * 2, Math.sin(theta) * 3 + t, job.seed);
      var ftaper = Math.pow(Math.sin(fu * Math.PI), .9);
      var rr = radius * (1 + (n - .5) * (name === 'shockwave' ? .023 : .083)), x = a.x + Math.cos(theta) * rr, y = a.y + Math.sin(theta) * rr;
      stamp('plasma', x, y, job.unit * (.12 + n * .2), job.def.light, fade * ftaper * (dark ? .27 : .26), theta + t * 5, front % 3);
      if (dark) stamp('smoke', x - Math.cos(theta) * job.unit * .12, y - Math.sin(theta) * job.unit * .12, job.unit * .29, job.def.color, fade * ftaper * .73, theta + t * 2, front % 3);
    }
    ctx.restore();
  }
  // 画面全体の一時キャンバスへ描いてから、まとめてぼかして合成する（波頭など、外周を消したくない帯に使う）。
  var blurCanvas = null;
  function blurLayer(px, drawFn, composite) {
    // ぼかす層なので半分の解像度で十分（全画面のぼかしは重い。2026-10-06 実ブラウザで途中停止の報告）。
    var dpr = (canvas && width ? canvas.width / width : 1) * .5;
    if (!blurCanvas) blurCanvas = document.createElement('canvas');
    var bw = Math.ceil(width * dpr), bh = Math.ceil(height * dpr);
    if (blurCanvas.width !== bw || blurCanvas.height !== bh) { blurCanvas.width = bw; blurCanvas.height = bh; }
    var oc = blurCanvas.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, bw, bh); oc.setTransform(dpr, 0, 0, dpr, curShift.x * dpr, curShift.y * dpr);
    var main = ctx; ctx = oc; ctx.save();
    try { drawFn(); } finally { ctx.restore(); ctx = main; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = composite || 'source-over';
    ctx.filter = 'blur(' + (px * dpr * 2).toFixed(1) + 'px)'; ctx.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height); ctx.restore();
  }
  // 縁をぼかして描く層（2026-10-05 利用者指摘：VFXの端の境界をはっきりさせない）。
  // drawFn の描画を一時キャンバスへ受け、中心→外周（と扇形なら両端）に向かって不透明度を落としてから合成する。
  var softCanvas = null;
  function softLayer(cx, cy, R, angle, halfArc, drawFn, composite) {
    if (!(R > 0)) return;
    var dpr = canvas && width ? canvas.width / width : 1, size = Math.ceil(R * 2 + 8);
    if (!softCanvas) softCanvas = document.createElement('canvas');
    softCanvas.width = Math.ceil(size * dpr); softCanvas.height = Math.ceil(size * dpr);
    var oc = softCanvas.getContext('2d'); oc.setTransform(dpr, 0, 0, dpr, 0, 0); oc.clearRect(0, 0, size, size);
    var main = ctx; ctx = oc; ctx.save(); ctx.translate(size / 2 - cx, size / 2 - cy);
    try { drawFn(); } finally { ctx.restore(); ctx = main; }
    oc.save(); oc.setTransform(dpr, 0, 0, dpr, 0, 0); oc.globalCompositeOperation = 'destination-in';
    var m = size / 2, rg = oc.createRadialGradient(m, m, 0, m, m, R);
    rg.addColorStop(0, 'rgba(0,0,0,.55)'); rg.addColorStop(.45, 'rgba(0,0,0,1)'); rg.addColorStop(.72, 'rgba(0,0,0,.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    oc.fillStyle = rg; oc.fillRect(0, 0, size, size);
    if (halfArc && oc.createConicGradient) {
      var span = halfArc * 2 / TAU, cg = oc.createConicGradient(angle - halfArc, m, m);
      cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(span * .35, 'rgba(0,0,0,1)'); cg.addColorStop(span * .65, 'rgba(0,0,0,1)');
      cg.addColorStop(Math.min(.999, span), 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = cg; oc.fillRect(0, 0, size, size);
    }
    oc.restore();
    ctx.save(); ctx.globalCompositeOperation = composite || 'lighter'; ctx.drawImage(softCanvas, cx - size / 2, cy - size / 2, size, size); ctx.restore();
  }
  // 大盾：カード同士がぶつかった時に出る小さな透明のバリア（2026-10-05 利用者指定：小さく、縁はぼかす）。
  function shield(job, t) {
    var p = job.from, f = ease(clamp((t - .035) / .22)), radius = job.unit * (.25 + f * .75), alpha = envelope(t, .08, .6);
    var half = 1.0, start = job.angle - half, end = job.angle + half;
    softLayer(p.x, p.y, radius * 1.15, job.angle, half * 1.15, function () {
      var membrane = ctx.createRadialGradient(p.x, p.y, radius * .2, p.x, p.y, radius);
      membrane.addColorStop(0, 'rgba(162,237,255,0)'); membrane.addColorStop(.62, 'rgba(179,235,242,.10)');
      membrane.addColorStop(.9, 'rgba(198,250,255,.38)'); membrane.addColorStop(1, 'rgba(198,250,255,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = membrane; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2); ctx.globalAlpha = 1;
      magic(p.x, p.y, radius * .9, '#9ae9ff', alpha * .45, t * .48);
      var cell = job.unit * .1;
      for (var y = -6; y <= 6; y++) for (var x = -6; x <= 6; x++) {
        var cx = p.x + x * cell * 1.5, cy = p.y + y * cell * 1.73 + (x % 2) * cell * .866, pts = [];
        if (Math.hypot(cx - p.x, cy - p.y) > radius) continue;
        for (var h = 0; h <= 6; h++) pts.push({ x: cx + Math.cos(h * TAU / 6) * cell, y: cy + Math.sin(h * TAU / 6) * cell });
        line(pts, '#b9edff', .5, alpha * .16, false);
      }
      line(arcPoints(p.x, p.y, radius * .96, start, end, t, job.seed, .018), '#cbf8ff', job.unit * .03, alpha * .75);
      glow(p.x + Math.cos(job.angle) * radius * .8, p.y + Math.sin(job.angle) * radius * .8, radius * .7, '#bff3ff', alpha * .35);
    });
    particles(job, p, t, '#c2f1ff', 28, radius * .9, { alpha: alpha * .3, vortex: 1 });
  }
  function boneTexture() {
    var key='bone'; if(spriteCache[key]) return spriteCache[key];
    var c=surface(128),g=c.getContext('2d');
    var b=g.createRadialGradient(48,40,5,64,64,66); b.addColorStop(0,'#f6f0d2'); b.addColorStop(.6,'#a5b6a9'); b.addColorStop(1,'#395d56');
    g.fillStyle=b;g.beginPath();g.moveTo(33,84);g.bezierCurveTo(3,40,29,13,64,15);g.bezierCurveTo(109,13,125,48,95,84);
    g.lineTo(82,108);g.lineTo(43,108);g.closePath();g.fill();
    g.globalCompositeOperation='source-atop';g.globalAlpha=.27;g.drawImage(texture('stone','#bcd5c3',2),0,0,128,128);g.globalAlpha=1;
    var eye=g.createLinearGradient(0,45,0,86);eye.addColorStop(0,'#061816');eye.addColorStop(1,'#44776a');g.fillStyle=eye;
    g.beginPath();g.ellipse(42,60,13,17,-.28,0,TAU);g.ellipse(84,60,13,17,.28,0,TAU);g.fill();
    g.beginPath();g.moveTo(63,71);g.lineTo(55,86);g.lineTo(71,86);g.closePath();g.fill();
    g.strokeStyle='#2a5047';g.lineWidth=2;for(var i=0;i<5;i++){g.beginPath();g.moveTo(45+i*8,94);g.lineTo(47+i*8,109);g.stroke();}
    var out=surface(128),o=out.getContext('2d');o.filter='blur(3px)';o.globalAlpha=.55;o.drawImage(c,0,0);o.filter='none';o.drawImage(c,0,0);
    spriteCache[key]=out;return out;
  }
  function aura(job,r,t,kind) {
    var p=point(r),alpha=envelope(t,.12,.38),radius=Math.hypot(r.width,r.height)*.53*job.size;
    if(kind==='rainbow') {
      var colors=['#ff5e69','#ffa84d','#ffed90','#80fba8','#58d8ef','#7e9cfa','#b98aff','#f394d5'];
      for(var i=0;i<176*job.particles;i++) {
        var m=attributes(job,i),phase=(m.delay+t*(.72+m.velocity*.3))%1,a=m.angle+t*m.spin*1.5;
        var rr=radius*(.53+phase*.65),x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr;
        var col=colors[Math.floor((a/TAU+4)*8)%8],sz=job.unit*(.19+m.size*.22)*(1-phase*.32);
        var life=alpha*Math.sin(phase*Math.PI);
        stamp('smoke',x,y,sz*1.15,col,life*.28,a+phase*3,i%3,1.3);
        stamp('plasma-soft',x,y,sz*1.17,col,life*.61,a+phase*3,i%3,1.35);
        stamp('plasma',x,y,sz*.64,col,life*.4,a+phase*3,i%3);
        glow(x,y,sz*.78,col,life*.32);
        if(i%4===0) trailDot(job,x,y,sz*.4,col,life*.3);
      }
      for(var band=0;band<8;band++) {
        var start=band*TAU/8+t*.3,end=start+TAU/8*.94;
        line(arcPoints(p.x,p.y,radius*.76,start,end,t*2,job.seed+band,.12),colors[band],job.unit*.065,alpha*.7);
      }
      perimeter(job,r,t,'#e7faff',alpha*.5);particles(job,p,t,'#e7faff',78,radius*1.2,{alpha:alpha*.53,vortex:2});
    } else {
      var col=kind==='skull'?'#bde0ca':job.def.light;
      fluid(job,p,t,radius*.87,radius*.87,kind==='skull'?'#334e46':job.def.color,alpha*.82,{count:92,rim:true,spin:job.def.name==='abyss'?-2.6:2});
      fluid(job,p,t,radius*.85,radius*.85,col,alpha*.48,{count:90,rim:true,type:'plasma',spin:-1.8,offset:80});
      perimeter(job,r,t,col,alpha*1.22);
      ring(p.x,p.y,radius*.94,col,alpha*.32,job.unit*.02,t,job.seed,.08);
      particles(job,p,t,col,94,radius*1.24,{alpha:alpha*.67,vortex:2.5});
      if(kind==='skull'||kind==='undead') magic(p.x,p.y,radius*.8,col,alpha*.58,-t*.46);
      if(kind==='skull') {
        var bone=boneTexture();
        for(var s=0;s<7;s++){
          var a=s*TAU/7+t*.72,x=p.x+Math.cos(a)*radius*.97,y=p.y+Math.sin(a)*radius*.97,sz=job.unit*.22;
          ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.globalAlpha=alpha*.75;ctx.globalCompositeOperation='lighter';ctx.drawImage(bone,-sz,-sz,sz*2,sz*2);ctx.restore();
          glow(x,y,sz*1.4,col,alpha*.23);
        }
      }
    }
  }
  // デュラハン：骸骨のオーラが飛ぶ（2026-10-06 利用者指定）。霊体の頭に骸骨の顔、周りを骨が回る。
  function skullHead(job, p, t, index) {
    var S = job.unit * .2, bone = boneTexture(), col = job.def.color;
    magic(p.x, p.y, S * 2.1, '#bde0ca', .45, t * 2);
    for (var b = 0; b < 5; b++) {
      var a = b * TAU / 5 + t * 5 * curDir, x = p.x + Math.cos(a) * S * 1.9, y = p.y + Math.sin(a) * S * 1.9, sz = job.unit * .11;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.globalAlpha = .8; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bone, -sz, -sz, sz * 2, sz * 2); ctx.restore();
    }
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = 'source-over';
    var g = ctx.createRadialGradient(-S * .2, -S * .35, S * .1, 0, 0, S * 1.05);
    g.addColorStop(0, 'rgba(250,255,245,.95)'); g.addColorStop(.6, 'rgba(205,230,210,.9)'); g.addColorStop(1, 'rgba(120,160,140,.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -S * .12, S * .82, S * .78, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(18,34,28,.92)';
    [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(sd * S * .32, -S * .02, S * .22, S * .26, sd * .25, 0, TAU); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(0, S * .2); ctx.lineTo(-S * .09, S * .38); ctx.lineTo(S * .09, S * .38); ctx.closePath(); ctx.fill();
    // 口（顎と歯）は描かない（2026-10-06 利用者指定）。
    ctx.restore();
    var flick = .7 + .3 * Math.sin(t * 50 + index);
    [-1, 1].forEach(function (sd) { glow(p.x + sd * S * .32, p.y - S * .02, S * .32, '#9dffc8', .8 * flick); });
    glow(p.x, p.y, S * 2.6, col, .3);
  }
  function boneScatter(job, p, f) {
    var bone = boneTexture(), fade = Math.pow(1 - f, 1.3);
    for (var b = 0; b < 8; b++) {
      var m = attributes(job, b + 500), a = m.angle, d = job.unit * (.2 + .8 * m.velocity) * ease(f), sz = job.unit * (.08 + m.size * .06);
      ctx.save(); ctx.translate(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); ctx.rotate(a + f * m.spin * 4 * curDir);
      ctx.globalAlpha = fade * .85; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bone, -sz, -sz, sz * 2, sz * 2); ctx.restore();
    }
    magic(p.x, p.y, job.unit * (.5 + .4 * ease(f)), '#bde0ca', fade * .5, f);
  }
  // カードの形（角丸の四角）に沿った柔らかい光。状態異常の表示をカード型に合わせるのに使う。
  function cardGlow(r, color, alpha, lineW, blurPx, pad) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = lineW;
    if (blurPx) ctx.filter = 'blur(' + blurPx.toFixed(1) + 'px)';
    roundRect(r, Math.min(r.width, r.height) * .07, pad || 0); ctx.stroke(); ctx.restore();
  }
  // カードの縁に沿って漂う粒・もや。s は縁の位置（0〜1で一周）、out は縁から外へ離れる量。
  function edgePoint(r, s, out) {
    var w = r.width, h = r.height, per = 2 * (w + h), d = ((s % 1) + 1) % 1 * per, x, y, nx, ny;
    if (d < w) { x = r.left + d; y = r.top; nx = 0; ny = -1; }
    else if (d < w + h) { x = r.left + w; y = r.top + d - w; nx = 1; ny = 0; }
    else if (d < 2 * w + h) { x = r.left + w - (d - w - h); y = r.top + h; nx = 0; ny = 1; }
    else { x = r.left; y = r.top + h - (d - 2 * w - h); nx = -1; ny = 0; }
    return { x: x + nx * out, y: y + ny * out, nx: nx, ny: ny };
  }
  function edgeMotes(job, r, t, color, alpha, count, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      var m = attributes(job, i + (opts.offset || 0)), ph = (m.delay + t * (opts.rate || .4) * (.6 + m.velocity * .6)) % 1;
      var q = edgePoint(r, m.angle / TAU + t * (opts.travel || .02) * curDir, job.unit * ((opts.inset || 0) + (opts.drift || .15) * ph));
      var a = alpha * Math.sin(ph * Math.PI);
      if (opts.type === 'glow') glow(q.x, q.y, job.unit * (opts.size || .04) * (.6 + m.size * .8), color, a);
      else stamp(opts.type || 'plasma-soft', q.x, q.y, job.unit * (opts.size || .2) * (.6 + m.size * .8), color, a, m.angle + ph * 2, i % 3, 1.3);
    }
  }

  // ── 2026-10-06 追加の検討 ─────────────────────────────
  // タイタン：踏み鳴らしで地面が割れ、地割れと土煙が敵全体へ走る。届いた敵は揺れて弱体化する。
  function crackPoints(job, k, from, angle, len) {
    var pts = [{ x: from.x, y: from.y }], a = angle, step = job.unit * .22, n = Math.max(2, Math.ceil(len / step));
    for (var i = 1; i <= n; i++) {
      var m = attributes(job, k * 40 + i + 600); a += (m.angle / TAU - .5) * .7;
      a = mix(a, angle, .25);
      var last = pts[pts.length - 1]; pts.push({ x: last.x + Math.cos(a) * step, y: last.y + Math.sin(a) * step });
    }
    return pts;
  }
  function drawCrack(pts, upto, width, alpha) {
    if (upto < 2 || alpha <= 0) return;
    var n = Math.min(pts.length, Math.floor(upto)), part = pts.slice(0, n);
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = clamp(alpha * .55); ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = width * 2.6;
    ctx.beginPath(); part.forEach(function (q, i) { i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
    ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = '#1c120a'; ctx.lineWidth = width;
    ctx.beginPath(); part.forEach(function (q, i) { i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
    ctx.restore();
  }
  function quake(job, t) {
    var a = job.from, fade = smooth(clamp((1 - t) / .3)), start = job.angle - job.spread, end = job.angle + job.spread;
    // 踏み鳴らし：発生元のカードが沈み、足元に土煙の輪。
    var stomp = envelope(clamp(t / .16), .4, .5);
    if (job.source && job.source.element) setStyle(job, job.source.element, 'scale', String(1 - .06 * stomp));
    if (t < .35) {
      var f0 = t / .35;
      softLayer(a.x, a.y, job.unit * 2.2, 0, 0, function () {
        for (var i = 0; i < 22; i++) {
          var an = i / 22 * TAU, rr = job.unit * (.3 + 1.6 * ease(f0));
          stamp('smoke', a.x + Math.cos(an) * rr, a.y + Math.sin(an) * rr, job.unit * (.35 + .3 * f0), '#8a6a48', (1 - f0) * .6, an, i % 3, 1.3);
        }
      }, 'source-over');
    }
    // 画面の揺れ（踏み鳴らし直後が最も強く、だんだん収まる）。
    if (job.board) {
      var amp = t < .08 ? 0 : job.unit * .06 * Math.pow(1 - clamp((t - .08) / .62), 2) * settings.shake / job.boardScale;
      setStyle(job, job.board, 'translate', (Math.sin(t * 97) * amp) + 'px ' + (Math.cos(t * 131) * amp * .7) + 'px');
    }
    // 地割れの線はやめた（線で描くと枝や根に見える。2026-10-06 自分で確認）。土煙・岩くず・揺れで地震を見せる。
    var lead = job.reach * smooth(clamp((t - .08) / .45));
    // 岩くず（波の先端から跳ねる小石）。
    for (var d = 0; d < 26; d++) {
      var md = attributes(job, d + 680), th0 = mix(start, end, md.delay), born = .1 + md.size * .3, age = clamp((t - born) / .35);
      if (age <= 0 || age >= 1) continue;
      var rr0 = job.reach * smooth(clamp((born - .08) / .45)) + job.unit * .6 * age * md.velocity;
      var hop = Math.sin(age * Math.PI) * job.unit * .25;
      var rx = a.x + Math.cos(th0) * rr0, ry = a.y + Math.sin(th0) * rr0 - hop, sz = job.unit * (.035 + md.size * .045) * (1 + hop / job.unit);
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp((1 - age) * 1.4); ctx.translate(rx, ry); ctx.rotate(age * 6 * md.spin);
      ctx.fillStyle = '#4a3624'; ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(sz * .2, -sz * .8); ctx.lineTo(-sz * .9, -sz * .3); ctx.lineTo(-sz * .5, sz * .7); ctx.lineTo(sz * .4, sz * .6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200,170,130,.6)'; ctx.fillRect(-sz * .3, -sz * .5, sz * .5, sz * .25); ctx.restore();
    }
    // 波の先端の土煙（敵方向の扇）。
    if (t > .08 && t < .7) {
      var wf = smooth(clamp((.7 - t) / .25)), steps = 30;
      for (var w = 0; w <= steps; w++) {
        var u = w / steps, th = mix(start, end, u), tp = Math.pow(Math.sin(u * Math.PI), .8);
        var n = noise(Math.cos(th) * 3 + t * 2, Math.sin(th) * 3, job.seed), rr2 = lead * (1 + (n - .5) * .08);
        stamp('smoke', a.x + Math.cos(th) * rr2, a.y + Math.sin(th) * rr2, job.unit * (.42 + n * .3), '#9a7a58', wf * tp * .6, th + t * 2, w % 3, 1.3);
        stamp('smoke', a.x + Math.cos(th) * rr2 * .9, a.y + Math.sin(th) * rr2 * .9, job.unit * (.3 + n * .2), '#6b5038', wf * tp * .4, th - t, (w + 1) % 3, 1.3);
      }
    }
  }
  function quakeHit(job, p, f, r) {
    var fade = Math.pow(1 - f, 1.3);
    // 足元の土煙と、弱体の紫の気配が一瞬カードへ沈む。
    softLayer(p.x, p.y, job.unit * 1.2, 0, 0, function () {
      for (var i = 0; i < 14; i++) {
        var m2 = attributes(job, i + 740), an = m2.angle, d = job.unit * (.15 + .8 * ease(f) * m2.velocity);
        stamp('smoke', p.x + Math.cos(an) * d, p.y + Math.sin(an) * d, job.unit * (.22 + .3 * f), '#8a6a48', fade * .55, an, i % 3, 1.3);
      }
    }, 'source-over');
    cardGlow(r, '#a45cff', Math.sin(clamp(f / .6) * Math.PI) * .55, job.unit * .1, job.unit * .06, 0);
  }
  // サイクロプス：力が一点に集まり、強い光と衝撃が弾け、赤金の炎のオーラを纏う（強力なバフ）。
  function powerUp(job, r, t) {
    var p = point(r), R = job.unit, el = r.element, i = job.targets.indexOf(r);
    if (t < .42) {
      var f = t / .42;
      particles(job, p, 1 - f, '#ffb060', 90, R * 2.2, { alpha: .8, vortex: -1.2 });
      softLayer(p.x, p.y, R * 2.6, 0, 0, function () {
        var rr = R * (2.2 - 1.6 * ease(f));
        for (var k = 0; k < 28; k++) { var an = k / 28 * TAU + f * 2 * curDir; stamp('plasma', p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr, R * .18, k % 2 ? '#ff6a2a' : '#ffd27a', .35 + .4 * f, an, k % 3, 1.5); }
      });
      glow(p.x, p.y, R * (.4 + .5 * f), '#ffd27a', .3 + .5 * f);
      magic(p.x, p.y, R * (.9 - .2 * f), '#ffb060', .25 + .4 * f, f * 3);
    } else {
      var g = (t - .42) / .58, burst = Math.pow(1 - clamp(g / .35), 2), fade = smooth(clamp((1 - t) / .3));
      glow(p.x, p.y, R * (1.6 + 1.2 * ease(clamp(g / .3))), '#fff2c8', burst * .95);
      // 放射状の光条
      for (var k2 = 0; k2 < 12; k2++) {
        var an2 = k2 / 12 * TAU + attributes(job, k2 + 760).angle * .1, len = R * (1 + 1.8 * ease(clamp(g / .3)));
        ribbon([{ x: p.x, y: p.y }, { x: p.x + Math.cos(an2) * len * .5, y: p.y + Math.sin(an2) * len * .5 }, { x: p.x + Math.cos(an2) * len, y: p.y + Math.sin(an2) * len }], R * .07, '#ffb060', burst * .7, g, k2);
      }
      ring(p.x, p.y, R * (.5 + 2.2 * ease(clamp(g / .45))), '#ffd27a', Math.pow(1 - clamp(g / .45), 1.5) * .7, R * .04, g, job.seed, .06);
      // 纏う炎のオーラ（カード型）
      cardGlow(r, '#ff5a24', fade * (.6 + .3 * Math.sin(t * 30)), R * .12, R * .07, R * .03);
      cardGlow(r, '#ffe2a0', fade * .8, R * .02, 0, R * .03);
      edgeMotes(job, r, t * 1.5, '#ff7a30', fade * .7, 36, { size: .18, drift: .25, rate: 1.2, travel: .05, type: 'plasma' });
      edgeMotes(job, r, t * 1.5, '#ffe2a0', fade * .8, 20, { size: .035, drift: .5, rate: 1, type: 'glow', offset: 90 });
      if (el) {
        setStyle(job, el, 'filter', job.baseFilters[i] + ' brightness(' + (1 + burst * .7) + ') saturate(' + (1 + .3 * fade) + ')');
        setStyle(job, el, 'scale', String(1 + .08 * burst));
      }
    }
  }
  // レイス：倒れたレイスから禍々しい黒紫の瘴気が味方へ流れ込み、まとわりついて負傷効果を呼び起こす。
  function curse(job, t) {
    job.targets.forEach(function (r, index) {
      var dst = point(r), f = clamp((t - .05) / .5), u = ease(f);
      if (t < .58) {
        for (var i = 18; i >= 0; i--) {
          var v = clamp(u - i * .025), q = pathPoint(job, dst, v, index, false), m = attributes(job, i + 780);
          var sw = Math.sin(i * .9 + t * 18) * job.unit * .12 * (i / 18);
          var x = q.x + sw, y = q.y - sw * .5, rad = job.unit * (.28 + m.size * .2) * (1 - i / 26);
          stamp('smoke', x, y, rad * 1.3, '#1a0622', (.55 - i / 40) * (1 - clamp((t - .5) / .08)), m.angle + t * 3, i % 3, 1.4);
          if (i % 2 === 0) stamp('plasma', x, y, rad, '#9a3cff', (.4 - i / 50) * (1 - clamp((t - .5) / .08)), m.angle, i % 3, 1.4);
        }
        var head = pathPoint(job, dst, u, index, false);
        glow(head.x, head.y, job.unit * .5, '#b45cff', .5);
      }
      // 発生元の足元の禍々しい陣
      var sig = envelope(clamp(t / .5), .2, .4);
      magic(job.from.x, job.from.y, job.unit * .7, '#9a3cff', sig * .5, -t * 2);
      stamp('smoke', job.from.x, job.from.y, job.unit * .9, '#12041a', sig * .5, t, 0);
    });
  }
  function curseHit(job, r, f) {
    var p = point(r), fade = Math.pow(1 - f, 1.1), el = r.element, i = job.targets.indexOf(r);
    magic(p.x, p.y, Math.min(r.width, r.height) * .45, '#9a3cff', fade * .6, f * 2);
    edgeMotes(job, r, f * 2, '#1a0622', fade * .7, 30, { size: .22, drift: .18, rate: .8, type: 'smoke' });
    edgeMotes(job, r, f * 2, '#b45cff', fade * .6, 18, { size: .04, drift: .3, rate: .9, type: 'glow', offset: 70 });
    cardGlow(r, '#7a2cff', fade * .7, job.unit * .12, job.unit * .07, job.unit * .02);
    if (el) setStyle(job, el, 'filter', job.baseFilters[i] + ' brightness(' + (1 - .35 * fade) + ') saturate(' + (1 - .3 * fade) + ')');
  }
  // 戦闘中の召喚：マスに魔法陣が開き、光の柱（真上から見ると広がる光）が立ち、カードが現れる。
  // 復活による召喚：散った魂の欠片が集まってカードを形作り、青白い光でよみがえる。
  function summonIn(job, r, t, i, revive) {
    var p = point(r), R = Math.max(r.width, r.height) * .5, el = r.element, appear = revive ? .6 : .55;
    var col = revive ? '#9fd2ff' : '#7fd0ff', light = revive ? '#eef8ff' : '#f0fbff';
    var vis = smooth(clamp((t - appear) / .18));
    if (el) {
      setStyle(job, el, 'opacity', String(vis));
      setStyle(job, el, 'transition', 'none');
      setStyle(job, el, 'scale', String(1 + .12 * (1 - vis) * (vis > 0 ? 1 : 0)));
      if (revive) setStyle(job, el, 'filter', job.baseFilters[i] + ' blur(' + ((1 - vis) * 6) + 'px) brightness(' + (1 + .8 * (1 - vis)) + ')');
    }
    var circle = envelope(t, .12, .35);
    if (revive) {
      // 魂の欠片がカードの位置へ渦を巻いて集まる
      var f = clamp(t / appear);
      for (var k = 0; k < 16; k++) {
        var m = attributes(job, k + 820), an = m.angle + f * (2 + m.spin) * curDir, d = R * (2.2 - 2.1 * ease(clamp((f - m.delay * .3) / .8)));
        var x = p.x + Math.cos(an) * d, y = p.y + Math.sin(an) * d, a = (1 - clamp((t - appear) / .1)) * .8;
        for (var tl = 3; tl >= 0; tl--) {
          var an2 = an - tl * .12 * curDir, d2 = d + tl * job.unit * .08;
          stamp('plasma-soft', p.x + Math.cos(an2) * d2, p.y + Math.sin(an2) * d2, job.unit * (.16 - tl * .025), col, a * (.6 - tl * .12), an2, k % 3, 1.6);
        }
        glow(x, y, job.unit * .07, light, a);
      }
      cardGlow(r, col, circle * .6, job.unit * .1, job.unit * .06, job.unit * .02);
    } else {
      magic(p.x, p.y, R * (.7 + .25 * ease(clamp(t / .4))), col, circle * .7, t * 1.2);
      particles(job, p, 1 - clamp(t / appear), light, 60, R * 1.6, { alpha: circle * .7, vortex: -1 });
      var pillar = envelope(clamp((t - .25) / .5), .3, .4);
      glow(p.x, p.y, R * (.5 + .7 * pillar), light, pillar * .85);
      stamp('plasma', p.x, p.y, R * .6, col, pillar * .5, t * 3, 1);
    }
    // 現れる瞬間の閃光と衝撃の輪
    var flash = clamp((t - appear) / .3);
    if (t > appear && flash < 1) {
      glow(p.x, p.y, R * (1.2 + .6 * flash), light, Math.pow(1 - flash, 2) * .9);
      ring(p.x, p.y, R * (.6 + 1.1 * ease(flash)), col, Math.pow(1 - flash, 1.5) * .6, job.unit * .03, flash, job.seed, .05);
    }
    if (revive && t > appear) reviveAura(job, r, t, smooth(clamp((t - appear) / .15)) * smooth(clamp((1 - t) / .25)));
  }
  // 結界獲得・復活獲得：状態の縁が外から締まるように現れ、少し光って状態表示へ移る（ラボでは最後に消える）。
  function gainState(job, r, t, kind) {
    var fade = smooth(clamp((1 - t) / .25)), close = ease(clamp(t / .35));
    var shield = kind === 'gain-shield', col = shield ? '#ffc75a' : '#9fd2ff', light = shield ? '#fff1c4' : '#eef8ff';
    var pad = job.unit * ((shield ? STATUS_PAD.shield : STATUS_PAD.revive) + .5 * (1 - close));
    cardGlow(r, col, (1 - close * .5) * .8 * fade, job.unit * .1, job.unit * .06, pad);
    cardGlow(r, light, .9 * fade * close, job.unit * .02, 0, pad);
    var p = point(r), flash = clamp((t - .3) / .3);
    if (t > .3 && flash < 1) glow(p.x, p.y, Math.max(r.width, r.height) * .7, light, Math.pow(1 - flash, 2) * .6);
    if (shield) statusAura(job, r, t * 1.2, 'shield-aura'); else reviveAura(job, r, t, smooth(clamp(t / .3)) * fade);
  }
  // 結界消失：金の膜にひびが走り、一瞬光って砕け、金の破片が飛び散って消える（2026-10-06 利用者指定）。
  function shieldBreak(job, r, t) {
    var p = point(r), U = job.unit, pad = U * STATUS_PAD.shield, rad = Math.min(r.width, r.height) * .09;
    var crack = clamp(t / .3), shatter = clamp((t - .3) / .7), membrane = t < .3 ? 1 : Math.pow(1 - clamp((t - .3) / .15), 2);
    // 割れる前の膜（結界状態と同じ見た目が残り、砕けると同時に消える）
    if (membrane > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = membrane;
      var mem = ctx.createRadialGradient(p.x, p.y, U * .2, p.x, p.y, Math.max(r.width, r.height) * .6);
      mem.addColorStop(0, 'rgba(255,214,120,.06)'); mem.addColorStop(.7, 'rgba(255,224,150,.2)'); mem.addColorStop(1, 'rgba(255,236,170,.4)');
      ctx.fillStyle = mem; roundRect(r, rad, pad); ctx.fill(); ctx.restore();
      cardGlow(r, '#ffc75a', membrane * .7, U * .05, U * .025, pad);
      cardGlow(r, '#fff3cc', membrane * (.8 + crack * .6), U * .016, 0, pad);
    }
    // ひび（衝撃点から放射状に走る金白の線）
    if (t < .42) {
      var cf = ease(crack), ca = t < .3 ? 1 : 1 - (t - .3) / .12, hit = { x: p.x + r.width * .12, y: p.y - r.height * .1 };
      for (var k = 0; k < 7; k++) {
        var m = attributes(job, k + 900), a = k / 7 * TAU + m.angle * .3, len = Math.max(r.width, r.height) * (.35 + m.size * .35) * cf, pts = [hit];
        for (var j = 1; j <= 5; j++) { var f = j / 5, jit = (attributes(job, k * 9 + j + 920).angle / TAU - .5) * .5; pts.push({ x: hit.x + Math.cos(a + jit) * len * f, y: hit.y + Math.sin(a + jit) * len * f }); }
        ctx.save(); ctx.beginPath(); roundRect(r, rad, pad); ctx.clip(); line(pts, '#fff1c4', U * .012, ca * .9); ctx.restore();
      }
      glow(hit.x, hit.y, U * (.3 + .4 * cf), '#fff6dc', ca * .7);
    }
    // 砕けた瞬間の閃光と、外へ飛び散る金の破片
    if (t >= .3) {
      var fl = Math.pow(1 - clamp(shatter / .25), 2);
      glow(p.x, p.y, Math.max(r.width, r.height) * .8, '#fff1c4', fl * .7);
      for (var s2 = 0; s2 < 22; s2++) {
        var m2 = attributes(job, s2 + 940), side = s2 % 4, u = m2.size;
        var sx = side === 0 ? r.left + r.width * u : side === 1 ? r.right : side === 2 ? r.left + r.width * u : r.left;
        var sy = side === 0 ? r.top : side === 1 ? r.top + r.height * u : side === 2 ? r.bottom : r.top + r.height * u;
        var dx = sx - p.x, dy = sy - p.y, dl = Math.max(1, Math.hypot(dx, dy)), go = U * (.2 + .9 * m2.velocity) * ease(shatter);
        var x = sx + dx / dl * go, y = sy + dy / dl * go + U * .25 * shatter * shatter, sz = U * (.06 + m2.size * .07), fade = Math.pow(1 - shatter, 1.4);
        ctx.save(); ctx.translate(x, y); ctx.rotate(m2.angle + shatter * m2.spin * 6 * curDir); ctx.globalAlpha = clamp(fade);
        ctx.globalCompositeOperation = 'source-over';
        var g = ctx.createLinearGradient(-sz, -sz, sz, sz); g.addColorStop(0, 'rgba(255,250,225,.95)'); g.addColorStop(.5, 'rgba(255,200,90,.8)'); g.addColorStop(1, 'rgba(190,125,30,.9)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sz * 1.8, 0); ctx.lineTo(-sz * .6, -sz * .45); ctx.lineTo(-sz * .9, sz * .35); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,250,230,.9)'; ctx.lineWidth = Math.max(.5, sz * .08); ctx.stroke(); ctx.restore();
        if (s2 % 3 === 0) glow(x, y, sz * 2, '#ffd27a', fade * .5);
      }
      particles(job, p, shatter, '#ffe6a8', 40, Math.max(r.width, r.height) * .9, { alpha: .6, vortex: .3 });
    }
  }
  // 結界の縁の魔術文字（細い線で描く小さな刻印）。
  function runeMark(x, y, size, angle, seed, color, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(.6, size * .14); ctx.lineCap = 'round';
    var r = function (k) { var v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size);
    for (var k = 0; k < 3; k++) {
      var y0 = (r(k) * 2 - 1) * size * .8, sd = r(k + 7) < .5 ? -1 : 1;
      ctx.moveTo(0, y0); ctx.lineTo(sd * size * .55, y0 + (r(k + 3) - .5) * size * .9);
    }
    ctx.stroke(); ctx.restore();
  }
  // 復活効果が付いている時の、カード上の青白いオーラ（真上視点。縁はぼかす）。gain は全体の濃さ。
  // 状態の枠の大きさ（カードからの張り出し。カード幅に対する割合）。外から 結界→根性→復活 の順（実際の発動優先順）。
  var STATUS_PAD={shield:.04,guts:.024,revive:.008}; // 隣のカードとの隙間（カード幅の約9%）の半分に収める
  function reviveAura(job,r,t,gain){
    if(!(gain>0))return;
    // 復活：細い青白い縁と、カードの中をゆっくり昇っていく魂の灯（重ね掛けで結界・根性と見分けられるよう、縁以外の目印。2026-10-06）。
    var breath=.8+.2*Math.sin(t*TAU);
    cardGlow(r,'#9fd2ff',gain*.45*breath,job.unit*.045,job.unit*.025,job.unit*STATUS_PAD.revive);
    cardGlow(r,'#bfe4ff',gain*.85*breath,job.unit*.012,job.unit*.006,job.unit*STATUS_PAD.revive);
    for(var k=0;k<3;k++){
      var ph=(t*.32+k/3)%1,x=r.left+r.width*(.25+.25*k)+Math.sin(ph*TAU*1.3+k*2)*r.width*.06,y=r.top+r.height*(.92-.84*ph);
      var a=gain*Math.sin(ph*Math.PI);
      for(var tl=4;tl>=1;tl--) stamp('plasma-soft',x-Math.sin((ph-tl*.03)*TAU*1.3+k*2)*r.width*.02,y+tl*job.unit*.07,job.unit*(.15-tl*.02),'#8fc8ff',a*(.42-tl*.07),0,tl%3,1.4);
      // 薄くぼんやり（2026-10-06 利用者指定）：白い芯は弱く、広く淡い光で。
      glow(x,y,job.unit*.28,'#9fd2ff',a*.45);glow(x,y,job.unit*.08,'#e6f4ff',a*.4);
    }
    edgeMotes(job,r,t,'#f2fbff',gain*.4,10,{size:.03,drift:.05,rate:.3,offset:120,type:'glow'});
  }
  // 状態異常のループ表示（付いている間ずっと出す）。t は連続した時間（周回数）。最初だけフェードインする。
  function roundRect(r,rad,pad){
    var x=r.left-pad,y=r.top-pad,w=r.width+pad*2,h=r.height+pad*2;
    ctx.beginPath();ctx.moveTo(x+rad,y);ctx.arcTo(x+w,y,x+w,y+h,rad);ctx.arcTo(x+w,y+h,x,y+h,rad);ctx.arcTo(x,y+h,x,y,rad);ctx.arcTo(x,y,x+w,y,rad);ctx.closePath();
  }
  function stateOnSameCard(job,name){
    var el=job.targets[0]&&job.targets[0].element;
    return !!el&&jobs.some(function(o){return !o.done&&o!==job&&o.def.name===name&&o.targets[0]&&o.targets[0].element===el;});
  }
  // 毒の値 → 重ね数（1-5:1、6-10:2、11-15:3、16以上:4。2026-10-06 利用者指定）
  // 状態の値 → 禍々しさ 0〜1（1で0、15で1。以降は1のまま。2026-10-06 利用者指定：15まで少しずつ）。
  function stateDepth(v){ return clamp(((Number(v)||1)-1)/14); }
  function stateValueOnSameCard(job,name){
    var el=job.targets[0]&&job.targets[0].element,o=el&&jobs.find(function(x){return !x.done&&x!==job&&x.def.name===name&&x.targets[0]&&x.targets[0].element===el;});
    return o?(o.value||1):0;
  }
  function mixRgb(a,b,f){ return [0,1,2].map(function(i){return Math.round(a[i]+(b[i]-a[i])*f);}).join(','); }
  // 粒のテクスチャは色ごとに作るので、色は14段階に丸めて使う。
  function mixHex(a,b,f){ f=Math.round(clamp(f)*14)/14; return '#'+[0,1,2].map(function(i){return ('0'+Math.round(a[i]+(b[i]-a[i])*f).toString(16)).slice(-2);}).join(''); }
  function poisonAura(job,r,t,inn,p){
    // 毒：下から湧き上がる緑の霧と、下から昇る泡（弱体＝上から垂れ込める紫と上下で見分ける）。
    // 毒の値で15まで少しずつどす黒くなる。弱体と重なるとさらに濁る。最大でも絵が見える濃さに抑える（2026-10-06 利用者指定）。
    var wv=stateValueOnSameCard(job,'weaken-state'),d=clamp(stateDepth(job.value)+(wv?.2+.2*stateDepth(wv):0));
    var beat=.85+.15*Math.sin(t*TAU*1.2);
    ctx.save();ctx.beginPath();roundRect(r,job.unit*.06,0);ctx.clip();
    // 強くなっても緑の毒らしさは残す（弱体の紫と見分けるため黒・紫へは寄せない。2026-10-06 利用者指摘）。
    var gc=mixRgb([60,170,30],[34,78,10],d);
    var mist=ctx.createLinearGradient(p.x,r.top+r.height,p.x,r.top+r.height*(.35-.1*d));
    mist.addColorStop(0,'rgba('+gc+','+((.62+.08*d)*inn*beat)+')');mist.addColorStop(.6,'rgba('+gc+','+((.22+.12*d)*inn)+')');mist.addColorStop(1,'rgba('+gc+',0)');
    ctx.fillStyle=mist;ctx.fillRect(r.left,r.top,r.width,r.height);
    if(d>0){ // どす黒い淀み（最大でも半透明）
      var murk=ctx.createLinearGradient(p.x,r.top+r.height,p.x,r.top+r.height*.35);
      murk.addColorStop(0,'rgba(14,30,4,'+(.38*d*inn)+')');murk.addColorStop(.7,'rgba(14,30,4,'+(.15*d*inn)+')');murk.addColorStop(1,'rgba(14,30,4,0)');
      ctx.fillStyle=murk;ctx.fillRect(r.left,r.top,r.width,r.height);
    }
    // 黒い煙（濁りに比例して増える。最後までフェード）
    var smokeN=Math.round(18*d);
    for(var w=0;w<smokeN;w++){
      var mw=attributes(job,w+560),pw=(mw.delay+t*(.18+mw.velocity*.12))%1,sx=r.left+r.width*(.1+.8*mw.size),sy=r.top+r.height*(.98-.6*pw);
      stamp('smoke',sx,sy,job.unit*(.14+.16*pw),mixHex([20,40,8],[16,34,6],d),inn*Math.pow(Math.sin(pw*Math.PI),1.5)*.5*d,mw.angle+pw,w%3,1.3);
      if(d>.5&&w%3===0)glow(sx,sy,job.unit*.05,'#b8ff30',inn*Math.sin(pw*Math.PI)*.55*(d-.5)/.5);
    }
    var bc=mixHex([134,240,74],[170,230,40],d); // 泡は強くなるほど毒々しい黄緑に
    for(var b=0;b<Math.round(14+8*d);b++){
      var m=attributes(job,b+300),ph=(m.delay+t*(.3+m.velocity*.25))%1;
      var bx=r.left+r.width*(.12+.76*m.size)+Math.sin(ph*9+b)*job.unit*.02,by=r.top+r.height*(.95-.6*ph),br=job.unit*(.03+.05*ph)*(1+m.velocity*.6);
      var al=inn*Math.pow(Math.sin(ph*Math.PI),1.2); // 泡は最後までゆっくり薄れる
      stamp('plasma-soft',bx,by,br*1.4,bc,al*.8,0,b%3);
      glow(bx-br*.35,by-br*.35,br*.45,'#efffd8',al*.8);
    }
    ctx.restore();
  }
  // 根性はぼかし層（中心からの円形の減衰）を通さず、カードの形のまま直接描く（四隅でオーラが消えないように）。
  function gutsAura(job,r,t,inn,p){
    var beat;
    // 根性：赤橙の縁がゆらぐように明滅し、外側に淡いオーラ（鼓動のリズムはやめた。2026-10-06 利用者指定）。
    var flick=.7+.18*Math.sin(t*TAU*.7)+.12*(noise(t*4,3.1,job.seed)-.5)*2;
    var gp=job.unit*STATUS_PAD.guts;
    // 外側のオーラ（2026-10-06 利用者：弱い）：太くぼかした赤橙の光を2重に。縁の外へ立ちのぼる熱のゆらぎも。
    // 明るい背景でも見えるよう、加算だけでなく通常合成の赤橙のにじみを外側に敷く。
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=inn*(.16+.06*flick);ctx.strokeStyle='#e8400c';
    ctx.lineWidth=job.unit*.08;ctx.filter='blur('+(job.unit*.06).toFixed(1)+'px)';roundRect(r,Math.min(r.width,r.height)*.07,gp+job.unit*.04);ctx.stroke();ctx.restore();
    // 2026-10-06 利用者：強すぎ→他の状態と釣り合う程度に（結界の金の縁を消さない明るさ）。
    cardGlow(r,'#ff3a10',inn*.3*flick,job.unit*.12,job.unit*.08,gp+job.unit*.01);
    cardGlow(r,'#ff6a24',inn*.5*flick,job.unit*.05,job.unit*.03,gp);
    edgeMotes(job,r,t,'#ff5a24',inn*.3*flick,20,{size:.09,drift:.08,rate:.5,travel:.02,type:'plasma-soft',inset:STATUS_PAD.guts});
    cardGlow(r,'#ffc8a0',inn*.6*flick,job.unit*.014,job.unit*.004,gp);
    cardGlow(r,'#ff6a2a',inn*.12*flick,job.unit*.09,job.unit*.06,-job.unit*.05);
    [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].forEach(function(c,ci){
      for(var e=0;e<2;e++){
        var me=attributes(job,ci*3+e+960),pe=(me.delay+t*(.45+me.velocity*.3))%1;
        glow(c[0]+(ci%2?1:-1)*job.unit*.02*pe,c[1]-job.unit*(.02+.08*pe),job.unit*(.018+.012*me.size),'#ffb070',inn*Math.sin(pe*Math.PI)*.55);
      }
    });
  }
  function statusAura(job,r,t,kind){
    var p=point(r),R=Math.hypot(r.width,r.height)*.56*job.size,inn=smooth(clamp(t/.15)),beat;
    if(kind==='revive-aura'){ reviveAura(job,r,t,inn*(.95+.2*Math.sin(t*TAU))); return; }
    // 結界の値＝重ね数。全く同じものをその数だけ重ねる（何層かは見分けられなくてよい。2026-10-06 利用者指定。最大6）。
    if(kind==='shield-aura'&&!job.stacking&&(job.value||1)>1){
      // 加算で重ねると白く飛んで絵が見えなくなるので、2枚目以降は薄く重ねる（見た目はほぼ同じで少し濃くなるだけ）。
      job.stacking=true; try{ statusAura(job,r,t,kind); for(var sl=1;sl<Math.min(6,Math.round(job.value));sl++){ ctx.save(); ctx.globalAlpha=.18; statusAura(job,r,t,kind); ctx.restore(); } } finally{ job.stacking=false; } return;
    }
    // 毒はカードの形に切り抜いて描く（ぼかし層の円形マスクを通すと下側の濃さが落ちる）。
    if(kind==='poison-aura'){ poisonAura(job,r,t,inn,p); return; }
    if(kind==='guts-aura'){ gutsAura(job,r,t,inn,p); return; }
    softLayer(p.x,p.y,R*1.3,0,0,function(){
      if(kind==='shield-aura'){
        // 結界：普通のバリア。復活と見分けるため金色（2026-10-06 利用者指定）。カードを包む透明な膜で、
        // 縁ほど濃く、ゆっくり呼吸し、表面を斜めの光の帯が通る。周りを回る物は置かない。
        // 枠の大きさは外から 結界→根性→復活（実際の発動優先順。STATUS_PAD）。
        var breathe=.88+.12*Math.sin(t*TAU*.5),pad=job.unit*STATUS_PAD.shield,rad=Math.min(r.width,r.height)*.09;
        var mem=ctx.createRadialGradient(p.x,p.y,R*.2,p.x,p.y,R*.95);
        mem.addColorStop(0,'rgba(255,214,120,.03)');mem.addColorStop(.62,'rgba(255,214,120,.09)');mem.addColorStop(.9,'rgba(255,232,160,.3)');mem.addColorStop(1,'rgba(255,232,160,.05)');
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=inn*breathe;ctx.fillStyle=mem;roundRect(r,rad,pad);ctx.fill();
        // 斜めの光の帯（濃いめ。周期の6割で膜の上を通る）。
        var sw=(t*.5)%1;
        if(sw<.6){
          var u=sw/.6,cx=mix(r.left-r.width*.7,r.left+r.width*1.7,u),g=ctx.createLinearGradient(cx-r.width*.4,r.top,cx+r.width*.4,r.top+r.height*.55);
          g.addColorStop(0,'rgba(255,230,160,0)');g.addColorStop(.42,'rgba(255,236,170,.32)');g.addColorStop(.5,'rgba(255,248,220,.5)');g.addColorStop(.58,'rgba(255,236,170,.32)');g.addColorStop(1,'rgba(255,230,160,0)');
          roundRect(r,rad,pad);ctx.clip();ctx.globalAlpha=inn*Math.sin(u*Math.PI);ctx.fillStyle=g;ctx.fillRect(r.left-job.unit,r.top-job.unit,r.width+job.unit*2,r.height+job.unit*2);
        }
        ctx.restore();
        cardGlow(r,'#ffc75a',inn*.5*breathe,job.unit*.05,job.unit*.025,pad);
        // 縁の内側の常時の反射（光の帯が通っていない時も結界だと分かるように。2026-10-06 利用者指定）。
        cardGlow(r,'#fff3cc',inn*(.32+.08*breathe),job.unit*.014,job.unit*.008,-job.unit*.035);
        var rx0=r.left+job.unit*.035,ry0=r.top+job.unit*.035,rw=r.width-job.unit*.07,rh=r.height-job.unit*.07;
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineWidth=job.unit*.022;
        var hg=ctx.createLinearGradient(rx0,ry0,rx0+rw*.55,ry0);hg.addColorStop(0,'rgba(255,248,225,0)');hg.addColorStop(.35,'rgba(255,248,225,'+(.55*inn)+')');hg.addColorStop(1,'rgba(255,248,225,0)');
        ctx.strokeStyle=hg;ctx.beginPath();ctx.moveTo(rx0+rw*.06,ry0);ctx.lineTo(rx0+rw*.55,ry0);ctx.stroke();
        var vg=ctx.createLinearGradient(rx0,ry0,rx0,ry0+rh*.45);vg.addColorStop(0,'rgba(255,248,225,0)');vg.addColorStop(.3,'rgba(255,248,225,'+(.45*inn)+')');vg.addColorStop(1,'rgba(255,248,225,0)');
        ctx.strokeStyle=vg;ctx.beginPath();ctx.moveTo(rx0,ry0+rh*.04);ctx.lineTo(rx0,ry0+rh*.45);ctx.stroke();
        var bg2=ctx.createLinearGradient(rx0+rw,ry0+rh,rx0+rw*.6,ry0+rh);bg2.addColorStop(0,'rgba(255,240,200,0)');bg2.addColorStop(.4,'rgba(255,240,200,'+(.3*inn)+')');bg2.addColorStop(1,'rgba(255,240,200,0)');
        ctx.strokeStyle=bg2;ctx.beginPath();ctx.moveTo(rx0+rw*.96,ry0+rh);ctx.lineTo(rx0+rw*.6,ry0+rh);ctx.stroke();ctx.restore();
        cardGlow(r,'#fff1c4',inn*.8*breathe,job.unit*.018,job.unit*.004,pad);
        // 結界の値＝重ね数。2枚目以降は内側へ細い金の縁を重ねる（2026-10-06 利用者指定。絵と数字を隠さないよう最大6）。

      }else if(kind==='weaken-aura'){
        // 弱体：上から垂れ込める紫の暗い膜と、沈んでいく紫の粒。値で15まで少しずつ禍々しく（2026-10-06 利用者指定）。
        // 毒と重なるとさらに濁る。最大でも絵が見える濃さに抑える。
        var pv=stateValueOnSameCard(job,'poison-state'),wd=clamp(stateDepth(job.value)+(pv?.2+.2*stateDepth(pv):0));
        var flick=.85+.15*Math.sin(t*TAU*.8),vc=mixRgb([58,20,104],[46,6,84],wd); // 強くなっても紫のまま（毒の緑と見分ける）
        var veil=ctx.createLinearGradient(p.x,r.top,p.x,r.top+r.height*.7); // 上側に留める（毒は下側）
        veil.addColorStop(0,'rgba('+vc+','+(.55+.15*wd)+')');veil.addColorStop(.55,'rgba('+vc+','+(.22+.16*wd)+')');veil.addColorStop(1,'rgba('+vc+',0)');
        ctx.save();ctx.globalAlpha=inn*flick;ctx.fillStyle=veil;roundRect(r,job.unit*.06,0);ctx.fill();ctx.restore();
        for(var s2=0;s2<Math.round(14+14*wd);s2++){
          var ms=attributes(job,s2+340),ph2=(ms.delay+t*(.28+ms.velocity*.2))%1;
          var sx=r.left+r.width*(.1+.8*ms.size),sy=r.top+r.height*(.05+.6*ph2);
          stamp('smoke',sx,sy,job.unit*(.06+ms.size*.05+.05*wd),'#2a0848',inn*Math.sin(ph2*Math.PI)*(.3+.25*wd),0,s2%3,1.3);
        }
      }
    },kind==='weaken-aura'||kind==='poison-aura'?'source-over':'lighter');
    if(kind==='weaken-aura'){
      var wf=.8+.2*Math.sin(t*TAU*.8),wd2=stateDepth(job.value);
      cardGlow(r,wd2>.5?'#7a2cc8':'#9a5cff',inn*(.28+.12*wd2)*wf,job.unit*.04,job.unit*.025,0);
      for(var w2=0;w2<Math.round(14+10*wd2);w2++){
        var mw=attributes(job,w2+340),phw=(mw.delay+t*(.28+mw.velocity*.2))%1;
        glow(r.left+r.width*(.1+.8*mw.size),r.top+r.height*(.05+.6*phw),job.unit*(.035+mw.size*.03),'#c590ff',inn*Math.sin(phw*Math.PI)*.6);
      }
    }
  }
  // ジャッカロープ：自然な緑の光の線で味方と繋がる（2026-10-06 利用者指定：植物の根ではなく光の線）。
  function roots(job,t) {
    var alpha=envelope(t,.09,.38);
    charge(job,job.from,t,.1,'#c7ffb0');
    job.targets.forEach(function(r,index){ for(var strand=0;strand<2;strand++){
      var dst=point(r),progress=ease(clamp((t-strand*.03)/.3)),end=pathPoint(job,dst,progress,index*2+strand,false);
      var pts=filament(job.from,end,job.unit*(.18+strand*.14),t*.6,job.seed+index*7+strand*13,40);
      line(pts,strand?'#b8ffc4':'#7fe58f',job.unit*(strand?.012:.02),alpha*(strand?.55:.9));
      // 線に沿って流れる光の粒。
      for(var m=0;m<6;m++){
        var ph=((t*1.6+m/6+strand*.08)%1),q=pts[Math.min(pts.length-1,Math.floor(ph*(pts.length-1)))];
        glow(q.x,q.y,job.unit*.07,'#e4ffd8',alpha*.7*Math.sin(ph*Math.PI));
      }
      if(strand)continue;
      if(t>=.35){
        var f=(t-.35)/.65;
        cardGlow(r,'#8ff09c',alpha*.6,job.unit*.12,job.unit*.07,job.unit*.02);
        cardGlow(r,'#e4ffd8',alpha*.8,job.unit*.02,0,0);
        edgeMotes(job,r,t,'#c9ffd5',alpha*.6,14,{size:.03,drift:.25,rate:.6,type:'glow',offset:index*20});
      } else glow(end.x,end.y,job.unit*.16,'#deffbd',alpha*.75);
    } });
  }
  function mist(job,r,t,color,dark) {
    var p=point(r),alpha=envelope(t,.22,.35),rx=r.width*.65,ry=r.height*.65;
    fluid(job,p,t,rx,ry,color,alpha*(dark?.93:.89),{count:112,spin:1.2,scale:1.35});
    fluid(job,p,t,rx*.82,ry*.82,dark?'#315742':'#d6e1db',alpha*(dark?.08:.13),{count:38,type:'plasma',offset:80,spin:-1.8});
    if(dark) particles(job,p,t,'#4d956d',64,Math.min(rx,ry)*1.2,{alpha:alpha*.25,vortex:2,trail:false});
  }
  function groupLight(job,t) {
    // 300msで満ち、800ms保持し、600msで消える。低速時も上限2秒。
    var b=box(job.targets),p=point(b),alpha=smooth(clamp(t/(300/1700)))*smooth(clamp((1-t)/(600/1700)));
    var radius=Math.hypot(b.width,b.height)*.66;
    glow(p.x,p.y,radius*1.23,'#eebc45',alpha*.82);
    glow(p.x,p.y,radius*.55,'#ffebb1',alpha*.56);
    stamp('plasma-soft',p.x,p.y,radius*.82,'#f5cf65',alpha*.38,t*.25,1);
    fluid(job,p,t,b.width*.53,b.height*.55,'#efce73',alpha*.24,{count:112,type:'plasma-soft',spin:.65});
    ring(p.x,p.y,radius*(.77+.06*ease(t)),'#f0dba0',alpha*.35,job.unit*.03,t,job.seed,.04);
    job.targets.forEach(function(r,i){
      var q=point(r);glow(q.x,q.y,r.height*.72,'#ffd982',alpha*.58);perimeter(job,r,t,'#fff1ba',alpha*1.5);
      magic(q.x,q.y,Math.hypot(r.width,r.height)*.57,'#e9c76d',alpha*.46,(i%2?1:-1)*t*.35);
      for(var j=0;j<60*job.particles;j++){
        var m=attributes(job,j+i*71),f=(m.delay+t*(1.7+m.velocity*.6))%1,a=m.angle+f*m.spin*.8;
        var rx=r.width*(.86-f*.62),ry=r.height*(.72-f*.5);
        var x=q.x+Math.cos(a)*rx,y=q.y+Math.sin(a)*ry,sz=job.unit*(.019+m.size*.05)*(1-f*.76);
        var bright=alpha*Math.sin(f*Math.PI)*(.5+m.size*.5);
        glow(x,y,sz*3.2,'#fff0b9',bright);glow(x,y,sz,'#fffef0',bright*.85);
        if(j%4===0)trailDot(job,x,y,sz*1.3,'#ffe69c',bright*.24);
      }
    });
  }
  function absorb(job,t) {
    var alpha=envelope(t,.07,.33),p=job.from;
    magic(p.x,p.y,job.unit*.62,'#ba3652',alpha*.46,-t*.8);
    job.targets.forEach(function(r,index){
      var start=point(r),dx=p.x-start.x,dy=p.y-start.y,length=Math.max(1,Math.hypot(dx,dy));
      for(var i=0;i<22*job.particles;i++){
        var m=attributes(job,i+index*23),f=clamp((t-m.delay*.2)/.72);
        if(f<=0||f>=1)continue;
        var u=f*f*(3-2*f),sway=Math.sin(u*Math.PI)*(m.size-.5)*job.unit*.9;
        var x=mix(start.x,p.x,u)-dy/length*sway,y=mix(start.y,p.y,u)+dx/length*sway;
        var fade=Math.sin(f*Math.PI)*alpha,sz=job.unit*(.016+m.size*.025);
        stamp('plasma',x,y,sz*2.8,'#e44960',fade*.5,f*5,i%3);glow(x,y,sz*2,'#ff9b8c',fade*.8);
        trailDot(job,x,y,sz*1.5,'#ff5b6d',fade*.38);
      }
      if(t<.25)perimeter(job,r,t,'#c85c67',alpha*.35*(1-t/.25));
    });
    orb(job,p,t,'#ff5964',.19+ease(t)*.18,true);particles(job,p,t,'#ffb099',58,job.unit*.72,{alpha:alpha*.6,vortex:-2});
  }
  function capture(job,t) {
    if(!job.targets.length)return;
    var trapped=job.targets[0],p=point(trapped),victim=point(job.targets[1]||trapped),dx=0,dy=0;
    if(t<.28){
      var end=pathPoint(job,p,ease(t/.28),0,true),pts=filament(job.from,end,job.unit*.08,t,job.seed,30);
      ribbon(pts,job.unit*.055,'#e68de2',envelope(t/.28,.1,.16),t,job.seed);
      orb(job,end,t,'#ffbbed',.13,false);
    }
    if(t>=.52){
      var move=t<.73?ease((t-.52)/.21):1-ease((t-.78)/.2);
      dx=(victim.x-p.x)*.81*move;dy=(victim.y-p.y)*.81*move;
    }
    setStyle(job,trapped.element,'transform',job.baseTransforms[0]+' translate('+(dx/job.domScales[0])+'px,'+(dy/job.domScales[0])+'px)');
    setStyle(job,trapped.element,'z-index','90');setStyle(job,trapped.element,'transition','none');
    if(t>=.28&&t<.93){
      var f=(t-.28)/.65,alpha=envelope(f,.08,.23),q={x:p.x+dx,y:p.y+dy},radius=Math.hypot(trapped.width,trapped.height)*.55;
      magic(q.x,q.y,radius,'#eeb0e9',alpha*.86,-t*.65);
      ring(q.x,q.y,radius*.87,'#ffdef9',alpha*.68,job.unit*.026,t,job.seed,.035);
      perimeter(job,{left:trapped.left+dx,top:trapped.top+dy,width:trapped.width,height:trapped.height},t,'#fbb7ea',alpha*.84);
      fluid(job,q,t,radius,radius,'#c177c8',alpha*.1,{type:'plasma',count:54,rim:true});
      particles(job,q,f,'#fad7ff',76,radius*1.17,{alpha:alpha*.56,vortex:2});
      ribbon(filament(job.from,q,job.unit*.12,t,job.seed+3,48),job.unit*.016,'#dd8acc',alpha*.3,t,job.seed+3);
      if(t>.52)trailDot(job,q.x,q.y,job.unit*.22,'#e59ce5',alpha*.23);
    }
  }
  function stone(job,r,t) {
    var p=point(r),alpha=envelope(t,.11,.25);
    setStyle(job,r.element,'filter',job.baseFilters[job.targets.indexOf(r)]+' grayscale('+alpha+') brightness('+(1-alpha*.23)+') contrast('+(1+alpha*.38)+')');
    ctx.save();ctx.beginPath();ctx.rect(r.left,r.top,r.width,r.height);ctx.clip();ctx.globalAlpha=alpha*.33;
    ctx.drawImage(texture('stone','#9eabb2',1),r.left,r.top,r.width,r.height);ctx.globalAlpha=1;
    for(var c=0;c<12;c++){
      var m=attributes(job,c),x=r.left+r.width*m.delay,y=r.top+r.height*m.size,pts=[{x:x,y:y}];
      for(var n=1;n<5;n++)pts.push({x:x+Math.sin(c*2+n)*r.width*.13*n,y:y+(n-2)*r.height*.12});
      ctx.globalAlpha=alpha*.75;ctx.lineWidth=1.3;ctx.strokeStyle='#34474e';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      pts.slice(1).forEach(function(q){ctx.lineTo(q.x,q.y);});ctx.stroke();
      ctx.globalAlpha=alpha*.5;ctx.strokeStyle='#e1ecee';ctx.lineWidth=.45;ctx.translate(.7,.4);ctx.stroke();ctx.translate(-.7,-.4);
    }
    ctx.restore();perimeter(job,r,t,'#a7c4c9',alpha*.33);particles(job,p,t,'#b7c5c5',54,job.unit*.72,{alpha:alpha*.35,vortex:.15});
  }
  function spotlight(job,r,t) {
    var p=point(r),alpha=envelope(t,.12,.43),radius=Math.hypot(r.width,r.height)*.65*job.size;
    // 頭上からの光を真上から見た、円形の光だまり。柱・円錐・楕円は作らない。
    glow(p.x,p.y,radius*1.24,'#f7e6af',alpha*.61);
    stamp('plasma',p.x,p.y,radius*.76,'#d3edf5',alpha*.22,t*.25,1);
    magic(p.x,p.y,radius*.82,'#e6d59b',alpha*.46,t*.4);
    ring(p.x,p.y,radius*.88,'#fff3c9',alpha*.48,job.unit*.017,t,job.seed,.018);
    perimeter(job,r,t,'#fff4cd',alpha*.82);
    particles(job,p,t,'#f7f5de',112,radius*1.08,{alpha:alpha*.76,vortex:.9});
    for(var i=0;i<14;i++){var m=attributes(job,i),a=m.angle+t*.22;glow(p.x+Math.cos(a)*radius*.73,p.y+Math.sin(a)*radius*.73,job.unit*.045,'#fffbed',alpha*.61);}
  }
  // 咆哮の輪：縁をぼかした多重の輪・空気の圧・粉塵。maxR は届く半径（カード幅の倍数）、amount は量と揺れの強さ。
  function roarRings(job,p,f,maxR,amount){
    var alpha=envelope(f,.08,.64),reach=job.unit*(.32+ease(f)*maxR);
    softLayer(p.x,p.y,reach*1.18,0,0,function(){
      for(var h=0;h<4;h++){
        var rr=job.unit*(.32+ease(clamp(f-h*.1))*maxR)-h*job.unit*.16;
        ring(p.x,p.y,Math.max(1,rr),'#e3dbbf',alpha*(1-h*.17)*(.55+amount*.45),job.unit*(h===0?.09:.04)*(.6+amount*.4),f,job.seed+h,.09);
      }
    });
    particles(job,p,f,'#fff3d6',Math.round(126*amount),job.unit*maxR*.72,{alpha:alpha*.68,vortex:.22});
    var fr=job.unit*(.5+ease(f)*maxR*.32);
    fluid(job,p,f,fr,fr,'#827d6d',alpha*.42*amount,{rim:true,count:Math.round(92*amount),spin:.7});
    for(var pulse=0;pulse<96*job.particles*amount;pulse++){
      var mote=attributes(job,pulse+200),angle=mote.angle+f*.18,radial=reach-job.unit*(.08+mote.size*.5)*(maxR/4.7);
      if(radial<=0)continue;
      var px=p.x+Math.cos(angle)*radial,py=p.y+Math.sin(angle)*radial;
      stamp('plasma-soft',px,py,job.unit*(.13+mote.velocity*.21)*(.5+amount*.5),'#d0d4c7',alpha*.48,angle+f*2,pulse%3,1.5);
      if(pulse%3===0)glow(px,py,job.unit*.055,'#fff5d7',alpha*.8);
    }
    if(job.board&&amount>0)setStyle(job,job.board,'translate',(Math.sin(f*73)*(1-f)*job.unit*.038*amount*settings.shake/job.boardScale)+'px '+(Math.cos(f*89)*(1-f)*job.unit*.02*amount*settings.shake/job.boardScale)+'px');
  }
  // 全体攻撃案D：ダイアウルフ当初の大きな咆哮（2026-10-05 利用者「効果に対してオーバー、他で使えるかも」）を敵全体へ。
  function allRoar(job,t){
    var b=box(job.targets),p=point(b);
    if(t<1)roarRings(job,p,t,Math.hypot(b.width,b.height)*.62/job.unit+.8,1);
    if(t>=.9&&job.board)setStyle(job,job.board,'translate','0px 0px');
  }
  function howl(job,t) {
    var p=job.from;
    // ダイアウルフ自身の遠吠えは控えめに（カード周りに収まる輪と小さな揺れ）。
    if(t<.42)roarRings(job,p,t/.42,1.7,.55);
    else if(job.board)setStyle(job,job.board,'translate','0px 0px');
    var wolf=job.targets[0];if(!wolf)return;
    // ウルフは遠吠えが終わってから出す（2026-10-05 利用者指定）。
    var elapsed=Math.max(0,(t-.46)*job.ms),u=clamp(elapsed/job.summonMs),landing=t>=.46;
    setStyle(job,wolf.element,'opacity',String(landing?ease(u):0));setStyle(job,wolf.element,'transition','none');
    setStyle(job,wolf.element,'transform',job.baseTransforms[0]+' translateX('+(-width*1.1*(1-ease(u))/job.domScales[0])+'px) scale('+(u<.64?mix(.96,1.12,ease(u/.64)):mix(1.12,1,smooth((u-.64)/.36)))+')');
    if(landing){
      var appearAt=job.summonMs*.94,visible=elapsed>=appearAt,progress=clamp((elapsed-appearAt)/Math.max(1,job.ms*.66-appearAt));
      var node=sprite(job,'appearance',wolf,visible?envelope(progress,.08,.32):0,2.44);
      var frame=Math.floor(progress*33);node.style.backgroundPosition=frame*100/33+'% center';
      node.style.filter='drop-shadow(0 0 12px #f6dda0)';
    }
  }
  function allAttack(job,t,kind) {
    var b=box(job.targets),p=point(b),alpha=envelope(t,.075,.65),span=b.width+job.unit*1.2,reach=Math.hypot(b.width,b.height)*.61;
    if(kind==='all-ring'){
      var f=ease(clamp((t-.045)/.53));
      stamp('plasma',p.x,p.y,reach*(.27+f*.66),'#7caec9',alpha*.58,t*2,1);
      glow(p.x,p.y,reach*.8,'#d5ecf9',alpha*Math.pow(1-t,3)*.42);
      for(var band=0;band<3;band++)ring(p.x,p.y,Math.max(1,reach*(.13+f*.9)-band*job.unit*.13),band===0?'#f1f9ff':'#84bed7',alpha*(band===0?.9:.4),job.unit*(band===0?.055:.02),t,job.seed+band,.07);
      fluid(job,p,t,reach*(.3+f*.6),reach*(.3+f*.6),'#b5d0d7',alpha*.48,{rim:true,count:136,scale:1.2});
      for(var splash=0;splash<84*job.particles;splash++){
        var mote=attributes(job,splash+230),angle=mote.angle+t*.22,rr=reach*(.13+f*.9)*(1-(1-mote.size)*.16);
        stamp('plasma-soft',p.x+Math.cos(angle)*rr,p.y+Math.sin(angle)*rr,job.unit*(.17+mote.velocity*.23),'#bcddef',alpha*.63,angle+t*3,splash%3,1.4);
      }
      particles(job,p,t,'#e6f5ff',144,reach*1.13,{alpha:alpha*.65,vortex:.6});
    }else{
      var cuts=kind==='all-cross'?2:1;
      for(var cut=0;cut<cuts;cut++){
        var slope=kind==='all-cross'?(cut?-.77:.77):-.14;
        var a={x:p.x-span*.57,y:p.y-slope*b.height*.75},z={x:p.x+span*.57,y:p.y+slope*b.height*.75};
        var pts=filament(a,z,job.unit*.27,t,job.seed+cut*11,64);
        ribbon(pts,job.unit*(kind==='all-cross'?.25:.34)*(1-t*.6),'#fbe1af',alpha,t,job.seed+cut);
        for(var thread=0;thread<3;thread++){
          var off=(thread-1)*job.unit*.13;
          line(pts.map(function(q){return{x:q.x,y:q.y+off};}),'#f5c780',job.unit*.009,alpha*.3,false);
        }
        for(var i=0;i<140*job.particles;i++){
          var m=attributes(job,i+cut*63),u=m.delay,x=mix(a.x,z.x,u),y=mix(a.y,z.y,u);
          var drift=job.unit*(.3+ease(t)*1.15)*(m.size-.5);
          stamp('plasma-soft',x,y+drift,job.unit*(.11+m.velocity*.2),'#f2bc7a',alpha*.56,t*m.spin+i,i%3);
          stamp('plasma',x,y+drift,job.unit*(.055+m.velocity*.095),'#ffe2b0',alpha*.36,t*m.spin+i,i%3);
          glow(x+Math.cos(m.angle)*job.unit*ease(t)*.6,y+drift,job.unit*(.018+m.size*.028),'#ffecc8',alpha*.7*(1-t));
          if(i%4===0)trailDot(job,x,y+drift,job.unit*.04,'#ffe4a8',alpha*.22);
        }
      }
    }
    job.targets.forEach(function(r,i){var q=point(r);perimeter(job,r,t,'#ffedc5',alpha*.28);particles(job,q,t,'#ffedcd',22,job.unit*.65,{alpha:alpha*.32,offset:i*21});});
  }
  function meteor(job,t) {
    var b=box(job.targets),end=point(b),flight=.46;
    if(t<flight){
      var start={x:end.x+Math.min(width*.28,job.unit*4.5),y:-job.unit*1.4},f=clamp(t/flight),u=Math.pow(f,1.5);
      var p={x:mix(start.x,end.x,u),y:mix(start.y,end.y,u)},angle=Math.atan2(end.y-start.y,end.x-start.x);
      // 真上から見ているので、空から落ちてくる火球は近づくほど大きくなる。尾は燃え盛る炎の塊が後ろへ流れる。
      var grow=.55+f*f*.95,R=job.unit*.42*grow;
      for(var tail=34;tail>=0;tail--){
        var m=attributes(job,tail),g=tail/35,length=R*(.3+g*5.2),sway=(noise(t*9,tail*.23,job.seed)-.5)*R*.9*g;
        var x=p.x-Math.cos(angle)*length-Math.sin(angle)*sway,y=p.y-Math.sin(angle)*length+Math.cos(angle)*sway;
        var r=R*(1.05-g*.55)*(.8+m.size*.4),fade=Math.pow(1-g,1.2);
        stamp('smoke',x,y,r*1.25,g>.45?'#2a1410':'#5a2412',fade*.55,angle+m.angle+t*4,tail%3,1.2);
        stamp('plasma',x,y,r,g<.25?'#ffd27a':g<.55?'#ff8a30':'#d2401c',fade*.8,angle+m.angle+t*6,tail%3,1.3);
        if(tail%4===0)trailDot(job,x,y,r*.5,'#ffb050',fade*.2);
      }
      glow(p.x,p.y,R*4,'#ff9a3c',.55);
      stamp('plasma',p.x,p.y,R*1.35,'#ff6a1e',.9,t*7,1);
      stamp('plasma',p.x,p.y,R*1.05,'#ffc060',.95,-t*9,2);
      glow(p.x,p.y,R*1.0,'#fff6d0',.95);
      for(var lick=0;lick<10;lick++){
        var ml=attributes(job,lick+60),la=angle+Math.PI+(ml.angle-Math.PI)*.45,ld=R*(.7+.5*((t*5+ml.delay)%1));
        stamp('plasma',p.x+Math.cos(la)*ld,p.y+Math.sin(la)*ld,R*(.35+ml.size*.3),'#ff9a40',.6*(1-((t*5+ml.delay)%1)),la,lick%3,1.6);
      }
      particles(job,p,f,'#ffd797',72,job.unit*.9*grow,{alpha:.5,vortex:.45});
      // 地上に落ちる火球の影の光（落下点が近づくのを示す）。
      glow(end.x,end.y,job.unit*(.6+f*1.4),'#ff8a3a',f*f*.35);
    }else{
      var q=(t-flight)/(1-flight),fade=Math.pow(1-q,7);
      // 一瞬の白いフラッシュで火球を消す。
      if(q<.12){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-q/.12)*.55;ctx.fillStyle='#fff4dc';ctx.fillRect(0,0,width,height);ctx.restore();}
      glow(end.x,end.y,job.unit*3.4,'#fff1bd',fade*.78);
      stamp('plasma',end.x,end.y,job.unit*1.6,'#ffbd73',fade*.56,q,1);
      var node=sprite(job,'old-all',{left:b.left-job.unit*.35,top:b.top-job.unit*.35,width:b.width+job.unit*.7,height:b.height+job.unit*.7},envelope(q,.055,.25),1);
      node.style.mixBlendMode='screen';
    }
  }
  var curShift = { x: 0, y: 0 };
  // 旋回の向き（右回り／左回り）は再生ごとにランダム（2026-10-06 利用者指定）。描画中の演出の向きをここに置く。
  var curDir = 1;
  function draw(job,t) {
    curDir = job.dir || 1;
    var kind=job.def.kind,alpha=envelope(t,.1,.35);
    if(kind==='wave'){areaWave(job,t);return;}
    if(['soul','skullfly','blood','arrow','wind','ice','shards'].indexOf(kind)>=0){projectile(job,t,kind);return;}
    if(kind==='capture'){capture(job,t);return;}
    if(kind==='shield'){shield(job,t);return;}
    if(kind==='roots'){roots(job,t);return;}
    if(kind==='gold'){groupLight(job,t);return;}
    if(kind==='fog'){mist(job,box(job.targets),t,'#12372a',true);return;}
    if(kind==='absorb'){absorb(job,t);return;}
    if(kind==='howl'){howl(job,t);return;}
    if(kind==='all-roar'){allRoar(job,t);return;}
    if(kind.indexOf('all-')===0){allAttack(job,t,kind);return;}
    if(kind==='meteor'){meteor(job,t);return;}
    if(kind==='quake'){quake(job,t);return;}
    if(kind==='curse'){curse(job,t);return;}
    if(kind==='powerup'){job.targets.forEach(function(r){powerUp(job,r,t);});return;}
    if(kind==='summon'||kind==='revive-summon'){job.targets.forEach(function(r,i){summonIn(job,r,t,i,kind==='revive-summon');});return;}
    if(kind==='shield-break'){job.targets.forEach(function(r){shieldBreak(job,r,t);});return;}
    if(kind==='gain-shield'||kind==='gain-revive'){job.targets.forEach(function(r){gainState(job,r,t,kind);});return;}
    job.targets.forEach(function(r,i){
      var p=point(r);
      if(['dark-aura','skull','rainbow'].indexOf(kind)>=0)aura(job,r,t,kind);
      else if(kind==='undead'){
        // 不死者のオーラを纏う。その後の「復活獲得」は続けて別の演出で出す（2026-10-06 利用者指定）。
        aura(job,r,t,'undead');
      }else if(/-aura$/.test(kind)&&job.def.loop){
        statusAura(job,r,t,kind);
      }else if(kind==='morph'){
        var cover=smooth(clamp((t-.1)/.2))*clamp((.88-t)/.3);
        setStyle(job,r.element,'opacity',String(1-clamp(cover*1.65)));
        mist(job,r,t,'#b8c6c0',false);
        if(t>.54){particles(job,p,(t-.54)/.46,'#d3ebd5',62,job.unit*.8,{alpha:.44,vortex:1.3});}
      }else if(kind==='stone')stone(job,r,t);
      else if(kind==='shake'){
        // 弱体化：震えに加え、色あせて暗く・少し縮み、くすんだ粒がカードへ吸い込まれて消える（2026-10-05 利用者指定：弱々しく）。
        var weak=envelope(t,.12,.5),shake=Math.sin(t*76)*job.unit*.045*Math.pow(1-t,1.5)*settings.shake/job.domScales[i];
        setStyle(job,r.element,'transform',job.baseTransforms[i]+' translate('+shake+'px,'+(Math.cos(t*91)*shake*.16)+'px) scale('+(1-.05*weak)+')');
        setStyle(job,r.element,'filter',job.baseFilters[i]+' saturate('+(1-.65*weak)+') brightness('+(1-.3*weak)+')');
        setStyle(job,r.element,'transition','none');
        var wr=Math.hypot(r.width,r.height)*.55;
        softLayer(p.x,p.y,wr*1.25,0,0,function(){
          fluid(job,p,t,wr*.85,wr*.85,'#3a3044',weak*.55,{count:40,rim:true,spin:-.6});
          particles(job,p,1-t,'#a99bb8',46,wr*1.15,{alpha:weak*.55,vortex:-.4});
        },'source-over');
      }else if(kind==='blue'){
        setStyle(job,r.element,'filter',job.baseFilters[i]+' grayscale('+(alpha*.58)+') sepia('+(alpha*.64)+') hue-rotate(167deg) saturate('+(1+alpha*.7)+') brightness('+(1+alpha*.34)+')');
        ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha*.25;
        var blue=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r.height*.63);blue.addColorStop(0,'#e5f4ff');blue.addColorStop(.52,'#8dbfdf88');blue.addColorStop(1,'#86bcde00');
        ctx.fillStyle=blue;ctx.fillRect(r.left,r.top,r.width,r.height);ctx.restore();
        perimeter(job,r,t,'#cce7ff',alpha*.45);
        // ATK減少：少し縮み、青白い光の輪がカードへしぼんで消える（力が抜ける）。
        setStyle(job,r.element,'transform',job.baseTransforms[i]+' scale('+(1-.045*alpha)+')');setStyle(job,r.element,'transition','none');
        var br=Math.hypot(r.width,r.height)*.6*(1.25-ease(t)*.7);
        softLayer(p.x,p.y,br*1.3,0,0,function(){
          ring(p.x,p.y,br,'#d8eeff',alpha*.7,job.unit*.05,t,job.seed,.05);
          particles(job,p,1-t,'#e3f3ff',40,br*1.1,{alpha:alpha*.5,vortex:.3});
        });
      }else if(kind==='reuse')sprite(job,'reuse',r,alpha,1.75);
      else if(kind==='spotlight')spotlight(job,r,t);
    });
  }
  function play(name, options) {
    return new Promise(function (resolve, reject) {
      var def = lookup[name], job;
      try {
        if (!def) throw new Error('VbFx: 未知の演出 ' + name);
        options = options || {}; ensureLayer();
        var allies = (options.allies || []).filter(Boolean).map(normalize), enemies = (options.enemies || []).filter(Boolean).map(normalize);
        var targets = (options.targets || []).filter(Boolean).map(normalize), side = options.side === 'enemy' ? 'enemy' : 'ally';
        var source = normalize(options.source) || targets[0] || (side === 'ally' ? allies[0] : enemies[0]);
        if (!source) source = { left: width / 2 - 40, top: side === 'ally' ? height * .8 : height * .2, width: 80, height: 120 };
        if (!targets.length && ['wave', 'all-sweep', 'all-ring', 'all-cross', 'all-roar', 'meteor', 'fog', 'quake'].indexOf(def.kind) >= 0) targets = (side === 'ally' ? enemies : allies).slice();
        if (!targets.length && def.kind === 'gold') targets = (side === 'ally' ? allies : enemies).slice();
        if (!targets.length && (['dark-aura', 'rainbow', 'morph', 'howl', 'powerup', 'summon', 'revive-summon', 'gain-shield', 'gain-revive', 'shield-break'].indexOf(def.kind) >= 0 || def.loop)) targets = [source];
        // 同じカードに同じ状態が出ていれば、新しく重ねない（2026-10-06 利用者指定）。
        // 結界・毒は値（options.value）で重ね数・濃さが決まるので、出ている表示の値だけを更新する。
        var sameState = def.loop && targets[0] && targets[0].element && jobs.find(function (other) {
          return !other.done && other.def.name === def.name && other.targets[0] && other.targets[0].element === targets[0].element; });
        if (sameState) {
          if (def.stackable && options && options.value != null) sameState.value = Math.max(1, Number(options.value) || 1);
          resolve({ name: def.name, cancelled: false, impacts: 0, assetErrors: [], looping: true, skipped: true, updated: !!def.stackable }); return;
        }
        var from = point(source), opposing = side === 'ally' ? enemies : allies, dest = point(box(opposing.length ? opposing : targets));
        var angle = Math.atan2(dest.y - from.y, dest.x - from.x);
        if (Math.hypot(dest.x - from.x, dest.y - from.y) < 1) angle = side === 'ally' ? -Math.PI / 2 : Math.PI / 2;
        var reach = Math.max.apply(null, [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }].map(function (c) { return Math.hypot(c.x - from.x, c.y - from.y); })) + 20;
        var spread = .8;
        targets.forEach(function (r) {
          [ { x: r.left, y: r.top }, { x: r.right, y: r.bottom } ].forEach(function (p) {
            var diff = Math.atan2(Math.sin(Math.atan2(p.y - from.y, p.x - from.x) - angle), Math.cos(Math.atan2(p.y - from.y, p.x - from.x) - angle));
            spread = Math.max(spread, Math.abs(diff) + .1);
          });
        });
        var speed = clamp(Number(options.speed) || settings.speed, .4, 12);
        job = { id: ++sequence, def: def, options: options, source: source, targets: targets, allies: allies, enemies: enemies,
          from: from, angle: angle, spread: Math.min(Math.PI * .98, spread), reach: reach, start: null,
          ms: duration(name, speed),
          seed: Number.isFinite(options.seed) ? options.seed : Number.isFinite(settings.seed) ? settings.seed : sequence,
          unit: source.width * (Number(options.size) || settings.size), size: Number(options.size) || settings.size,
          particles: clamp(settings.particles, .2, 2), hit: new Set(), hitAt: [], styles: [], nodes: [], sprites: {}, assetErrors: [],
          baseTransforms: targets.map(function (r) { var v = r.element && getComputedStyle(r.element).transform; return v && v !== 'none' ? v : ''; }),
          baseFilters: targets.map(function (r) { var v = r.element && getComputedStyle(r.element).filter; return v && v !== 'none' ? v : ''; }),
          domScales: targets.map(function (r) { return r.element && r.element.offsetWidth ? r.width / r.element.offsetWidth : 1; }),
          board: options.board || (source.element && source.element.closest('[data-vb-fx-board], #stage, #battle-field')),
          value: Math.max(1, Number(options.value) || 1), motes: [], summonMs: 0, dir: options.dir === -1 || options.dir === 1 ? options.dir : (Math.random() < .5 ? -1 : 1),
          resolve: resolve, reject: reject, done: false, cancelled: false };
        job.summonMs = Math.min(420, job.ms * .36);
        if (source.element && source.element.getBoundingClientRect) { var r0 = source.element.getBoundingClientRect(); job.anchor0 = { left: r0.left, top: r0.top }; }
        if (def.underStatus && targets[0] && targets[0].element) {
          // ステータス表示（status_overlay）の直前へ差し込む。見つからなければカードの末尾。
          var hostEl = targets[0].element, lcv = document.createElement('canvas'), padF = .2;
          lcv.dataset.vbFxLocal = '1';
          Object.assign(lcv.style, { position: 'absolute', left: (-padF * 100 / (1 + 2 * padF) * (1 + 2 * padF)) + '%', top: (-padF * 100) + '%',
            width: ((1 + 2 * padF) * 100) + '%', height: ((1 + 2 * padF) * 100) + '%', pointerEvents: 'none' });
          var statusEl = hostEl.querySelector('.unit-stat-overlay-layer, .stats-overlay, .status_overlay, .status-overlay, [class*="status_overlay"]');
          if (statusEl) statusEl.parentNode.insertBefore(lcv, statusEl); else hostEl.appendChild(lcv);
          // 枠（frame）より上、ステータス表示より下（2026-10-06 利用者指定）。
          var sz = statusEl ? parseInt(getComputedStyle(statusEl).zIndex, 10) : NaN;
          lcv.style.zIndex = String(Number.isFinite(sz) ? sz - 1 : 4);
          job.local = { el: hostEl, canvas: lcv, ctx: lcv.getContext('2d'), pad: padF }; job.nodes.push(lcv);
        }
        job.boardScale = job.board && job.board.offsetWidth ? job.board.getBoundingClientRect().width / job.board.offsetWidth : 1;
        for (var mote = 0; mote < 512; mote++) {
          job.motes.push({ angle: random(mote, job.seed) * TAU, delay: random(mote + 601, job.seed),
            life: .5 + random(mote + 1201, job.seed) * .7, size: random(mote + 1801, job.seed),
            velocity: .32 + random(mote + 2401, job.seed) * .88, spin: random(mote + 3001, job.seed) * 2 - 1,
            flicker: 15 + random(mote + 3601, job.seed) * 27 });
        }
        // 新しい色の初回生成は計測開始前。飛翔中にテクスチャ生成を集中させない。
        [def.color, def.light].forEach(function (color) {
          texture('glow', color);
          for (var variant = 0; variant < 3; variant++) { texture('plasma', color, variant); texture('smoke', color, variant); }
        });
        if (def.name === 'dark-fire') for (var fv = 0; fv < 6; fv++) { if (fv < 3) flameTexture(false, fv); flameTexture(true, fv); }
        targets.forEach(function (r) {
          var at = ['arrow', 'wind'].indexOf(def.kind) >= 0 ? .48 : ['soul', 'skullfly', 'blood', 'ice', 'shards'].indexOf(def.kind) >= 0 ? .62 : .24;
          if (def.kind === 'wave') {
            var targetPoint = point(r), targetAngle = Math.atan2(targetPoint.y - from.y, targetPoint.x - from.x);
            var limit = def.name === 'dark-fire' ? rayReach(job, targetAngle) : reach;
            var distance = clamp(Math.hypot(targetPoint.x - from.x, targetPoint.y - from.y) / limit);
            at = waveTime(distance);
          }
          else if (def.kind === 'gold') at = 300 / 1700;
          else if (def.kind === 'roots') at = .35;
          else if (def.kind === 'morph') at = .45;
          else if (def.kind === 'capture') at = job.hitAt.length === 0 ? .28 : .73;
          else if (def.kind === 'absorb') at = .72;
          else if (def.kind === 'howl') at = .34 + job.summonMs / job.ms;
          else if (def.kind.indexOf('all-') === 0) at = .08;
          else if (def.kind === 'meteor') at = .46;
          else if (def.kind === 'quake') at = .12 + .38 * clamp(Math.hypot(point(r).x - from.x, point(r).y - from.y) / Math.max(1, reach));
          else if (def.kind === 'powerup') at = .42;
          else if (def.kind === 'curse') at = .55;
          else if (def.kind === 'summon') at = .55;
          else if (def.kind === 'revive-summon') at = .6;
          else if (/^gain-/.test(def.kind)) at = .1;
          else if (def.kind === 'shield-break') at = .3;
          job.hitAt.push(at);
        });
        jobs.push(job);
        // 非表示タブでも Promise と後片付けが終わる番人。描画開始時に実尺で掛け直す。
        job.watchdog = setTimeout(function () { finish(job, false); }, job.ms + 200);
        if (!raf && !inFrame) raf = requestAnimationFrame(tick);
      } catch (e) {
        if (job) finish(job, false, e);
        else {
          if (!jobs.length && root) { root.remove(); root = null; canvas = null; ctx = null; window.removeEventListener('resize', resize); }
          reject(e);
        }
      }
    });
  }
  // 演出の中で「当たる」瞬間（全尺に対する割合）。SEの一番大きい所をここへ合わせる（2026-10-05 利用者指定）。
  var IMPACT_FRACTION = { 'shield-break': .3, quake: .12, powerup: .42, curse: .55, summon: .55, 'revive-summon': .6, 'gain-shield': .1, 'gain-revive': .1, 'dark-fire-wave': .2, soul: .62, skullfly: .62, blood: .62, ice: .62, shards: .62, arrow: .48, wind: .48, wave: .14, shield: .1,
    capture: .4, roots: .33, gold: .3, fog: .3, absorb: .65, howl: .08, 'all-sweep': .18, 'all-ring': .18, 'all-cross': .18,
    'all-roar': .1, meteor: .55, morph: .45, stone: .2, shake: .06, blue: .06, 'dark-aura': .3, skull: .3, rainbow: .3,
    undead: .3, spotlight: .3, reuse: .2 };
  function impactMs(name, speed) {
    var d = lookup[name]; if (!d) return 0;
    return duration(name, speed) * (IMPACT_FRACTION[d.kind] != null ? IMPACT_FRACTION[d.kind] : .25);
  }
  function stopAll(opts) { jobs.slice().forEach(function (job) { if (!(opts && opts.keepLoops && job.def.loop)) finish(job, true); }); }
  // 描画は共通のまま、カードの状態1件／指定した再生だけを終了する。
  function stop(handle) {
    var selected = jobs.filter(function (job) {
      return typeof handle === 'number' ? job.id === handle : handle &&
        (!handle.name || job.def.name === handle.name) &&
        (handle.key != null ? job.options.key === handle.key
          : !handle.element || job.source.element === handle.element || job.targets.some(function (r) { return r.element === handle.element; }));
    });
    selected.forEach(function (job) { finish(job, true); }); return selected.length;
  }
  // 状態ループの表示先を、作り直されたカードの要素へ付け替える（止めて出し直すと最初のフェードインからやり直しになり、
  // 他のキャラの行動で盤面が描き直されるたびに明滅して見える。2026-10-07 利用者指摘）。
  function retarget(handle, to) {
    var next = normalize(to); if (!next || !next.element) return 0;
    var selected = jobs.filter(function (job) {
      return !job.done && job.def.loop && (!handle.name || job.def.name === handle.name) && job.targets[0]
        && (handle.key != null ? job.options.key === handle.key : job.targets[0].element === handle.element);
    });
    selected.forEach(function (job) {
      job.source = next; job.targets[0] = next; job.from = point(next);
      var r0 = next.element.getBoundingClientRect(); job.anchor0 = { left: r0.left, top: r0.top };
      if (job.local) {
        var statusEl = next.element.querySelector('.stats-overlay, .status_overlay, .status-overlay, [class*="status_overlay"], .unit-stat-overlay-layer');
        if (statusEl) statusEl.parentNode.insertBefore(job.local.canvas, statusEl); else next.element.appendChild(job.local.canvas);
        job.local.el = next.element;
      }
    });
    return selected.length;
  }
  window.addEventListener('pagehide', stopAll);
  return { play: play, rect: rect, duration: duration, impactMs: impactMs, stop: stop, retarget: retarget, prepareClone: prepareClone, stopAll: stopAll, effects: definitions, settings: settings,
    activeCount: function () { return jobs.length; },
    snapshot: function () { return jobs.map(function (job) { return { name: job.def.name, durationMs: job.ms,
      elapsedMs: job.start == null ? null : Math.max(0, performance.now() - job.start),
      frameMs: job.start == null || job.lastFrame == null ? null : job.lastFrame - job.start,
      impactsMs: job.hitAt.map(function (at) { return at * job.ms; }), dpr: pixelRatio }; }); },
    assetBase: assetBase };
})();
