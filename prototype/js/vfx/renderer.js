/* Vesselbound 共通VFX — LABと戦闘で同じ通常の script を読み込む。
 * VbFx.play(name, {source, targets, side, allies, enemies, onImpact}) -> Promise
 * 矩形は画面座標。DOM 演出用には VbFx.rect(element) の element 参照を推奨。
 * 本体の接続用: settings.layer / options.board / options.resolveElement。
 * 戦闘の計算・HP変更・SE再生は行わない。onImpact は targets の添字で各1回。
 */
var VbFxRenderer = (function () {
  'use strict';
  var scriptUrl = document.currentScript && document.currentScript.src;
  var assetBase = new URL('../../assets/', scriptUrl || document.baseURI).href;
  var TAU = Math.PI * 2;
  var jobs = [], root = null, canvas = null, ctx = null, raf = 0, inFrame = false;
  var width = 0, height = 0, sequence = 0, pixelRatio = 1;
  var leases = new WeakMap();
  var settings = { speed: 1.5, size: 1, particles: 1, shake: 1, dprMax: 2, seed: null };
  // 2026-10-12: 派生設定は共有層への参照と入力値だけ。JSONに同じ効果を複製しない。
  var definitions=[];VbFxDefs.effects.forEach(function(d){definitions.push(d);(d.variants||[]).forEach(function(v){definitions.push(Object.assign({},d,v,{variants:undefined}));});});
  var lookup={}, fieldSpecs={};
  VbFxDefs.types.forEach(function(type){fieldSpecs[type]=VbFxDefs.fields(type);});
  definitions.forEach(function(d){lookup[d.name]=d;lookup[d.label]=d;});
  // 2026-10-12: 有限脈動の合図も定義の層と濃さ曲線から共有計算する。
  function pulseTimes(name,count){
    var d=lookup[name],layer=d&&d.layers.find(function(l){return l.anchor==='each-target'&&l.cycles;});
    if(!layer||!Number.isInteger(count)||count<1||count>128)return [];
    var time=layer.time||[0,1],peak=layer.curves&&layer.curves.alpha&&layer.curves.alpha.keys.find(function(k){return k[1]>0;});
    return Array.from({length:count},function(_,i){return time[0]+(time[1]-time[0])*(i+(peak?peak[0]:.2))/count;});
  }
  function duration(name,speed){
    var d=lookup[name];if(!d)throw new Error('VbFx: 未知の演出 '+name);
    // 状態異常のループは速さの設定に関わらず定義の周期で回す（2026-10-06 利用者が等速で見て速さを指定した）。
    if(d.loop)return d.ms;
    return Math.min(d.playback.maxMs,d.ms/clamp(Number(speed)||settings.speed,d.playback.speedMin,d.playback.speedMax));
  }
  var clamp=VbFxCurves.clamp,mix=VbFxCurves.mix,random=VbFxCurves.random,noise=VbFxCurves.noise,rgba=VbFxCurves.rgba,fractal=VbFxCurves.fractal;
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
    if(typeof r.color==='string'&&/^#[0-9a-f]{6}$/i.test(r.color))out.color=r.color;
    // 明示したelement:nullは倒れた位置などの固定矩形。下にある別カードを拾わない。
    if (!out.element && !Object.prototype.hasOwnProperty.call(r, 'element')) {
      var p = point(out), el = document.elementFromPoint(p.x, p.y);
      out.element = el && el.closest('[data-vb-fx-card], .unit-card, .slot, .card');
    }
    return out;
  }
  // 外側で動かす演出用の入れ物。旧カードの描画経路には適用しない。
  function hostGeometry(el) {
    var b = el.getBoundingClientRect(), a = 1, bb = 0, c = 0, d = 1, node = el, opacity = 1;
    while (node && node.nodeType === 1 && node !== document.body) {
      var style = getComputedStyle(node), ownOpacity = Number(style.opacity), ma = 1, mb = 0, mc = 0, md = 1;
      if (Number.isFinite(ownOpacity)) opacity *= clamp(ownOpacity);
      if (style.transform && style.transform !== 'none') {
        var m = new DOMMatrixReadOnly(style.transform); ma = m.a; mb = m.b; mc = m.c; md = m.d;
      }
      // 個別のscale/rotateも、CSSの順序（rotate × scale × transform）で合成する。
      if (style.scale && style.scale !== 'none') {
        var parts = style.scale.trim().split(/\s+/), sx = parseFloat(parts[0]), sy = parts[1] == null ? sx : parseFloat(parts[1]);
        if (parts[0].indexOf('%') >= 0) sx /= 100;
        if (parts[1] && parts[1].indexOf('%') >= 0) sy /= 100;
        if (Number.isFinite(sx) && Number.isFinite(sy)) { ma *= sx; mc *= sx; mb *= sy; md *= sy; }
      }
      var rotation = style.rotate && style.rotate.match(/^(?:z\s+)?([+-]?[\d.]+)(deg|rad|turn)$/);
      if (rotation) {
        var radians = Number(rotation[1]) * (rotation[2] === 'deg' ? Math.PI/180 : rotation[2] === 'turn' ? TAU : 1);
        var cos = Math.cos(radians), sin = Math.sin(radians), ra = cos*ma-sin*mb, rb = sin*ma+cos*mb;
        var rc = cos*mc-sin*md, rd = sin*mc+cos*md; ma = ra; mb = rb; mc = rc; md = rd;
      }
      var na = ma*a+mc*bb, nb = mb*a+md*bb, nc = ma*c+mc*d, nd = mb*c+md*d;
      a = na; bb = nb; c = nc; d = nd; node = node.parentElement;
    }
    return { cx: b.left + b.width / 2, cy: b.top + b.height / 2,
      w: (el.offsetWidth || b.width) * Math.hypot(a, bb),
      h: (el.offsetHeight || b.height) * Math.hypot(c, d), angle: Math.atan2(bb, a), opacity: opacity };
  }
  // 部品がalphaを直接指定しても、外側のフェードを保つCanvasの共通アダプター。
  // *=でも二重に掛けないよう、部品にはフェードを除いた値を返す。
  function opacityContext(target) {
    var state = { target: target, factor: 1 }, methods = new Map();
    state.context = new Proxy(target, {
      get: function (obj, key) {
        if (key === 'globalAlpha') return state.factor ? obj.globalAlpha / state.factor : 0;
        var value = Reflect.get(obj, key, obj);
        if (typeof value !== 'function') return value;
        if (!methods.has(key)) methods.set(key, value.bind(obj));
        return methods.get(key);
      },
      set: function (obj, key, value) { return Reflect.set(obj, key, key === 'globalAlpha' ? value * state.factor : value, obj); }
    });
    return state;
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
      if (job.baselines && job.baselines.has(old)) job.baselines.set(next, job.baselines.get(old));
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
      if ((job.def.loop || job.options.followGeometry) && (!job.source.element || !job.source.element.isConnected)) { finish(job, true); return; }
      if (job.start == null) {
        // seekMs：演出の途中から始める（戦闘の結界消失は、ひびの溜めを飛ばして割れる瞬間から。2026-10-20 利用者指定）。
        job.start = now - Math.min(job.ms, Math.max(0, Number(job.options.seekMs) || 0));
        clearTimeout(job.watchdog);
        if (!job.def.loop) job.watchdog = setTimeout(function () { finish(job, false); }, job.ms * job.endRatio - (now - job.start) + 100);
      }
      var t = Math.min(job.endRatio, clamp((now - job.start) / job.ms));
      if (job.def.loop) {
        job.cycle = Math.floor((now - job.start) / job.ms);
        t = (now - job.start) / job.ms;  // ループは時間を折り返さない（動きが継ぎ目で飛ばないよう、連続した時間で描く）
        if (job.cycle >= 1 && !job.firstCycleResolved) { job.firstCycleResolved = true; clearTimeout(job.watchdog);
          job.resolve({ name: job.def.name, cancelled: false, impacts: 0, assetErrors: job.assetErrors.slice(), looping: true }); }
      }
      if (job.options.repeat) t -= Math.floor(t);
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
      var drawCtx = frameContext, geo = job.def.loop && !job.options.followGeometry && job.targets[0] && job.targets[0].element && job.targets[0].element.isConnected
        ? cardGeometry(job.targets[0].element) : null;
      // カードが隠れている（表示されず大きさ0）時は描かない。大きさ0の矩形は画面左上(0,0)に出てしまう（2026-10-07 利用者指摘）。
      if (job.def.loop && !job.options.followGeometry && job.targets[0] && job.targets[0].element && (!geo || !geo.shown)) { frameContext.restore(); return; }
      if (geo) {
        job.targets[0].left = -geo.w / 2; job.targets[0].top = -geo.h / 2; job.targets[0].width = geo.w; job.targets[0].height = geo.h;
        job.targets[0].right = geo.w / 2; job.targets[0].bottom = geo.h / 2;
      }
      // 単発/継続VFXの入れ物へ追従する共通の姿勢。旧50種はこのオプションを使わない。
      // 軌道・拡大・回転を受け口が決め、図形は同じ部品で描く（効果名の分岐は無い）。
      var followAlpha = 1;
      if (job.options.followGeometry && anchor && anchor.isConnected) {
        var pose = hostGeometry(anchor), origin = point(job.source);
        frameContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        frameContext.translate(pose.cx, pose.cy); frameContext.rotate(pose.angle);
        frameContext.scale(pose.w / job.source.width, pose.h / job.source.height);
        frameContext.translate(-origin.x, -origin.y);
        if (job.options.followOpacity) { followAlpha = pose.opacity; frameContext.globalAlpha *= followAlpha; }
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
        if (job.options.followGeometry && job.options.followOpacity) {
          if (drawCtx !== frameContext) drawCtx.globalAlpha *= followAlpha;
          if (!job.opacityContext || job.opacityContext.target !== drawCtx) job.opacityContext = opacityContext(drawCtx);
          job.opacityContext.factor = followAlpha; ctx = job.opacityContext.context;
        }
        if (job.trail) {
          var tc = job.trailCtx, dt = job.lastFrame == null ? 16.67 : Math.min(80, now - job.lastFrame);
          tc.save(); tc.globalCompositeOperation = 'destination-out'; tc.globalAlpha = 1 - Math.exp(-dt / 65);
          tc.fillStyle = '#000'; tc.fillRect(0, 0, width, height); tc.restore();
          frameContext.save(); frameContext.globalCompositeOperation = 'lighter'; frameContext.globalAlpha = .46 * followAlpha;
          frameContext.drawImage(job.trail, 0, 0, width, height); frameContext.restore();
        }
        job.lastFrame = now; draw(job, t); updateHits(job, t);
        // 2026-10-12: 汎用の追加合図。実フレームの時計から1回ずつ通知する。
        if(job.options.cueTimesMs)(job.options.cueTimesMs||[]).forEach(function(ms,i){
          if(t*job.ms>=ms&&!job.cues.has(i)){job.cues.add(i);if(typeof job.options.onCue==='function')job.options.onCue(i);}
        });
      } catch (e) { finish(job, false, e); }
      ctx = frameContext;
      frameContext.restore();
      if (t >= job.endRatio && !job.def.loop) finish(job, false);
    });
    inFrame = false;
    if (jobs.length && !raf) raf = requestAnimationFrame(tick);
  }
  var curShift = { x: 0, y: 0 }, pathCache = Object.create(null);
  var BLENDS = { normal: 'source-over', add: 'lighter', screen: 'screen', multiply: 'multiply' };
  function surface(w, h) { return VbFxTextures.surface(w, h); }
  function texture(type, color, variant) { return VbFxTextures.get(type, color, variant); }
  // 同じsine-hash属性を全層で共有する。層番号・対象番号で勝手にseedを変えない。
  function mote(job, index) {
    index = ((index % 512) + 512) % 512;
    if (!job.motes) job.motes = [];
    if (!job.motes[index]) job.motes[index] = { angle: random(index, job.seed) * TAU, delay: random(index + 601, job.seed),
      life: .5 + random(index + 1201, job.seed) * .7, size: random(index + 1801, job.seed),
      velocity: .32 + random(index + 2401, job.seed) * .88, spin: random(index + 3001, job.seed) * 2 - 1,
      flicker: 15 + random(index + 3601, job.seed) * 27 };
    return job.motes[index];
  }
  function afterglow(job, p, radius, color, opacity) {
    if (!job.trail) { job.trail = surface(Math.ceil(width), Math.ceil(height)); job.trailCtx = job.trail.getContext('2d'); }
    var c = job.trailCtx; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(opacity);
    c.drawImage(texture('glow', color), p.x - radius, p.y - radius, radius * 2, radius * 2); c.restore();
  }
  function dimension(f, space) {
    if (space === 'width') return f.r.width;
    if (space === 'height') return f.r.height;
    if (space === 'diagonal') return Math.hypot(f.r.width, f.r.height) * (f.spec.scaleBounds===false?1:f.job.size);
    if (space === 'max') return Math.max(f.r.width, f.r.height);
    if (space === 'min') return Math.min(f.r.width, f.r.height);
    if (space === 'reach') return f.job.reach;
    return f.unit;
  }
  function input(job, tag) {
    if (tag === 'value') return job.value;
    var el = job.targets[0] && job.targets[0].element;
    var state = el && jobs.find(function (other) { return other !== job && !other.done && other.def.tag === tag && other.targets[0] && other.targets[0].element === el; });
    return state ? state.value : 0;
  }
  // 参照先は固定の数値フィールドのみ。式・変数・呼び出しを解釈しない。
  function modulated(f,m,out){
    var time=m.timeSpace==='seconds'?f.clock*f.job.ms/1000:m.timeSpace==='effect'?f.effect:m.timeSpace==='continuous'?f.absoluteEffect:f.life;
    if(m.timeClamp)time=clamp(time,m.timeClamp[0],m.timeClamp[1]);
    var wave=(m.bias==null?1:m.bias)+(m.amplitude||0)*Math.sin(time*(m.frequency||0)+(m.phase||0)+f.index*(m.phaseStride||0));
    if(m.noiseAmplitude){var scale=m.noiseScale||[1,0],offset=m.noiseOffset||[0,0],fn=m.noiseType==='fractal'?fractal:noise;
      wave+=(fn(time*scale[0]+offset[0],time*scale[1]+offset[1],f.seed+(m.seedOffset||0))-.5)*m.noiseAmplitude;}
    return m.mode==='add'?out+wave:out*wave;
  }
  function value(f, key, fallback, life) {
    var s = f.spec, c = s.curves && s.curves[key], out = s[key] == null ? fallback : s[key];
    if (c) out = VbFxCurves.sample(c, c.domain === 'effect' ? f.effect : life == null ? f.life : life);
    (s.bind || []).forEach(function (binding) {
      if (binding.target !== key) return;
      var mapped = VbFxCurves.sample(binding.curve, input(f.job, binding.input));
      if (binding.mode === 'add') out += mapped;
      else if (binding.mode === 'multiply') out *= mapped;
      else out = mapped;
    });
    if(s.modulation&&s.modulation[key]){var mods=s.modulation[key];(Array.isArray(mods)?mods:[mods]).forEach(function(m){out=modulated(f,m,out);});}
    var field = fieldSpecs[s.type][key];
    if (field && field.form === 'number') { out = clamp(out, field.min, field.max); if (field.integer) out = Math.round(out); }
    return out;
  }
  function tint(f, life) {
    var s = f.spec;
    if(s.colorFrom==='anchor'&&f.r.color)return f.r.color;
    if (s.palette) {var factor=value(f,'tint',0,life),steps=s.tintSteps==null?14:s.tintSteps;
      if(s.colorInterpolation==='step'){for(var i=1;i<s.palette.length;i++)if(factor<=s.palette[i][0])return s.palette[i-1][1];return s.palette[s.palette.length-1][1];}
      return VbFxCurves.gradientColor(s.palette,steps?Math.round(factor*steps)/steps:factor);}
    if (s.colors) return VbFxCurves.gradientColor(s.colors, Math.round((life == null ? f.life : life) * 14) / 14);
    return s.color || f.job.def.color;
  }
  function alpha(f, life) { return (value(f,'alpha',1,life)+value(f,'alphaDepth',0)*value(f,'tint',0,life))*(f.spec.intrinsicAlpha?f.intro:1)*(f.spec.alphaGain?VbFxCurves.sample(f.spec.alphaGain,f.effect):1); }
  function hasParameter(s, key) { return s[key] != null || s.curves && s.curves[key] || s.bind && s.bind.some(function(b) { return b.target === key; }); }
  function stamp(type, p, radius, color, opacity, rotation, aspect, seed) {
    if (!(radius > 0 && opacity > 0)) return;
    aspect = aspect || [1, 1];
    ctx.save(); ctx.globalAlpha *= clamp(opacity); ctx.translate(p.x, p.y); ctx.rotate(rotation || 0);
    ctx.drawImage(texture(type, color, Math.abs(seed || 0) % 3), -radius * aspect[0], -radius * aspect[1], radius * 2 * aspect[0], radius * 2 * aspect[1]); ctx.restore();
  }
  // ── カードの枠の形（2026-10-21 利用者指定：枠線の出る演出は、元の枠の形を少し大きくした形にし、角Rを揃える） ──
  // 枠の角Rは枠画像ごとに違い、assets.js が実測して要素の border-radius（--card-frame-r：横％ / 縦％）へ入れている。
  // その要素（または直下の子）の角Rを読み、外へ pad 広げた形は「角R＋pad」の楕円角で描く（枠を一様に太らせた形）。
  // 読めない時はゲームの既定値（708×1075 の枠で 40px ＝ 横5.65% / 縦3.721%）。
  var FRAME_RADIUS_DEFAULT = [.0565, .03721], frameRadiusCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function frameRadiusOf(node) {
    if (!node || node.nodeType !== 1 || !(node.offsetWidth > 0 && node.offsetHeight > 0)) return null;
    var v = String(getComputedStyle(node).borderTopLeftRadius || '').trim().split(/\s+/), out = [];
    for (var i = 0; i < 2; i++) {
      var t = v[i] || v[0] || '', n = parseFloat(t);
      if (!(n > 0)) return null;
      out.push(/%$/.test(t) ? n / 100 : n / (i ? node.offsetHeight : node.offsetWidth));
    }
    return out;
  }
  function frameRadiusRatio(el) {
    if (!el || !frameRadiusCache) return FRAME_RADIUS_DEFAULT;
    var now = Date.now(), hit = frameRadiusCache.get(el);
    // 角Rの実測は枠画像の読み込み後に非同期で入るので、少し経ったら読み直す。
    if (hit && now - hit.at < 1000) return hit.ratio;
    var ratio = frameRadiusOf(el);
    for (var c = el.firstElementChild; !ratio && c; c = c.nextElementSibling) ratio = frameRadiusOf(c);
    ratio = ratio || FRAME_RADIUS_DEFAULT;
    frameRadiusCache.set(el, { ratio: ratio, at: now });
    return ratio;
  }
  // r を pad だけ外へ広げた枠の形（x, y, w, h と楕円の角 rx, ry）。pad が負なら内側へ縮める。
  function frameShape(r, pad) {
    var q = frameRadiusRatio(r && r.element), x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
    return { x: x, y: y, w: w, h: h,
      rx: Math.max(0, Math.min(w / 2, q[0] * r.width + pad)), ry: Math.max(0, Math.min(h / 2, q[1] * r.height + pad)) };
  }
  function framePath(r, pad) {
    var k = frameShape(r, pad), x = k.x, y = k.y, w = k.w, h = k.h, rx = k.rx, ry = k.ry;
    if (w <= 0 || h <= 0) return false;
    ctx.beginPath(); ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y);
    ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0); ctx.lineTo(x + w, y + h - ry);
    ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2); ctx.lineTo(x + rx, y + h);
    ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI); ctx.lineTo(x, y + ry);
    ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5); ctx.closePath(); return true;
  }
  // 枠の形に沿った点列（光の線用）。中心から見た揺らぎ wobble(角度) を掛けられる。
  function framePoints(r, pad, steps, wobble) {
    var k = frameShape(r, pad), x = k.x, y = k.y, w = k.w, h = k.h, rx = k.rx, ry = k.ry, cx = x + w / 2, cy = y + h / 2, pts = [];
    var arc = Math.PI / 2 * Math.sqrt((rx * rx + ry * ry) / 2), seg = [w - 2 * rx, arc, h - 2 * ry, arc, w - 2 * rx, arc, h - 2 * ry, arc], per = 0;
    seg.forEach(function (n) { per += Math.max(0, n); });
    for (var j = 0; j <= steps; j++) {
      var d = per * j / steps, i = 0;
      while (i < 7 && d > seg[i]) { d -= Math.max(0, seg[i]); i++; }
      var q = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0, a = q * Math.PI / 2, p;
      switch (i) {
        case 0: p = { x: x + rx + d, y: y }; break;
        case 1: p = { x: x + w - rx + Math.sin(a) * rx, y: y + ry - Math.cos(a) * ry }; break;
        case 2: p = { x: x + w, y: y + ry + d }; break;
        case 3: p = { x: x + w - rx + Math.cos(a) * rx, y: y + h - ry + Math.sin(a) * ry }; break;
        case 4: p = { x: x + w - rx - d, y: y + h }; break;
        case 5: p = { x: x + rx - Math.sin(a) * rx, y: y + h - ry + Math.cos(a) * ry }; break;
        case 6: p = { x: x, y: y + h - ry - d }; break;
        default: p = { x: x + rx - Math.cos(a) * rx, y: y + ry - Math.sin(a) * ry };
      }
      if (wobble) { var m = wobble(Math.atan2(p.y - cy, p.x - cx)); p = { x: cx + (p.x - cx) * m, y: cy + (p.y - cy) * m }; }
      pts.push(p);
    }
    return pts;
  }
  function roundedPath(r, pad) { return framePath(r, pad); }
  function stroke(points, color, lineWidth, opacity, soft, core, crisp) {
    if (points.length < 2 || lineWidth <= 0 || opacity <= 0) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
    ctx.globalAlpha *= clamp(opacity); ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); });
    if (soft > 0) { ctx.save(); ctx.filter = 'blur(' + soft + 'px)'; ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha *= crisp == null ? 1 : crisp; ctx.stroke(); ctx.restore();
    if (core > 0) { ctx.globalAlpha *= core; ctx.strokeStyle = '#fffdf7'; ctx.lineWidth = Math.max(.2, lineWidth * .23); ctx.stroke(); }
    ctx.restore();
  }
  function haloStroke(points, color, lineWidth, opacity, core) {
    if (points.length < 2 || opacity <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    [[7,.055,color],[3.2,.19,color],[1,.65,color],[.28,core === 0 ? 0 : .86,'#fffdf7']].forEach(function (part) {
      ctx.lineWidth = Math.max(.35, lineWidth * part[0]); ctx.globalAlpha = clamp(opacity * part[1]); ctx.strokeStyle = part[2]; ctx.stroke();
    }); ctx.restore();
  }
  function drawPath(shape, p, radius, color, light, shadow, rotation, aspect, opacity, strokeWidth, variant) {
    if (!(radius > 0 && opacity > 0)) return;
    var geometry=VbFxDefs.shapes[shape],rich=geometry.paths.some(function(part){return !part.d;}),factor=rich?radius:1;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rotation||0);ctx.scale((rich?1:radius)*(aspect?aspect[0]:1),(rich?1:radius)*(aspect?aspect[1]:1));ctx.globalAlpha*=clamp(opacity);
    function paintColor(role){return role==='color'?color:role==='light'?light:role==='shadow'?shadow:role;}
    geometry.paths.forEach(function(part){
      var path=part.d?(pathCache[part.d]||(pathCache[part.d]=new Path2D(part.d))):null;
      if(!path){ctx.beginPath();
        if(part.ellipse){var el=part.ellipse;ctx.ellipse(el[0]*factor,el[1]*factor,el[2]*factor,el[3]*factor,el[4],0,TAU);}
        else if(part.rect){var r=part.rect,px=part.rectPixels||[0,0,0,0];ctx.rect(r[0]*factor+px[0],r[1]*factor+px[1],r[2]*factor+px[2],r[3]*factor+px[3]);}
        else {part.vertices.forEach(function(v,i){var px=part.pixelOffsets&&part.pixelOffsets[i]||[0,0];ctx[i?'lineTo':'moveTo'](v[0]*factor+px[0],v[1]*factor+px[1]);});if(part.fill!=='none')ctx.closePath();}
      }
      var fill=part.fill==null?'color':part.fill;
      if(fill!=='none'){
        ctx.fillStyle=part.fillAlpha==null?paintColor(fill):rgba(paintColor(fill),part.fillAlpha);
        if(part.gradient){var gs=part.gradient,gf=gs.space==='pixel'?(rich?1:1/radius):factor;
          var g=gs.type==='radial'?ctx.createRadialGradient(gs.from[0]*gf,gs.from[1]*gf,gs.inner*gf,gs.to[0]*gf,gs.to[1]*gf,gs.outer*gf):ctx.createLinearGradient(gs.from[0]*gf,gs.from[1]*gf,gs.to[0]*gf,gs.to[1]*gf);
          gs.stops.forEach(function(stop){g.addColorStop(stop[0],rgba(paintColor(stop[1]),stop[2]));});ctx.fillStyle=g;
        }
        if(path)ctx.fill(path);else if(part.rect){var rect0=part.rect,pixels0=part.rectPixels||[0,0,0,0];ctx.fillRect(rect0[0]*factor+pixels0[0],rect0[1]*factor+pixels0[1],rect0[2]*factor+pixels0[2],rect0[3]*factor+pixels0[3]);}else ctx.fill();
      }
      if(part.stroke&&part.stroke!=='none'){
        ctx.strokeStyle=part.strokeAlpha==null?paintColor(part.stroke):rgba(paintColor(part.stroke),part.strokeAlpha);
        var width0=part.widthSpace==='pixel'?part.width||.8:(part.width||.012)*radius;
        ctx.lineWidth=strokeWidth>0?strokeWidth/(rich?1:radius):Math.max(part.strokeMinPx||0,width0)/(rich?1:radius);
        if(path)ctx.stroke(path);else ctx.stroke();
      }
    });
    if(geometry.facets){var facet=geometry.facets;ctx.lineWidth=facet.width/(rich?1:radius);
      for(var k=0;k<facet.count;k++){var v=facet.vertices[(k*facet.stride+(variant||0))%facet.vertices.length];ctx.strokeStyle=rgba(paintColor(facet.colors[k][0]),facet.colors[k][1]);
        ctx.beginPath();ctx.moveTo(facet.origin[0]*factor,facet.origin[1]*factor);ctx.lineTo(v[0]*factor,v[1]*factor);ctx.stroke();}
    }
    ctx.restore();
  }
  function paintMaterial(f,mat,p,size,color,opacity,rotation,variant){
    if(mat.shape)drawPath(mat.shape,p,size,mat.color||color,f.spec.light||f.job.def.light,f.spec.shadow||'#304050',rotation,mat.aspect,opacity,0,variant);
    else stamp(mat.texture,p,size,mat.color||color,opacity,rotation,mat.aspect,variant);
  }
  function rayReach(job, angle) {
    var x = Math.cos(angle), y = Math.sin(angle), p = job.from;
    var dx = Math.abs(x) < .00001 ? Infinity : (x > 0 ? width - p.x : -p.x) / x;
    var dy = Math.abs(y) < .00001 ? Infinity : (y > 0 ? height - p.y : -p.y) / y;
    return Math.max(job.unit, Math.min(dx, dy)) + job.unit * .65;
  }
  function curvedPoint(a, b, u, bend, dir) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1, Math.hypot(dx, dy));
    var bulge = Math.sin(clamp(u) * Math.PI) * Math.min(Math.abs(bend), len * .17) * Math.sign(bend || 1) * dir;
    return { x: mix(a.x, b.x, u) - dy / len * bulge, y: mix(a.y, b.y, u) + dx / len * bulge };
  }
  function endpoint(f, which) {
    var job = f.job, s = f.spec;
    if (which === 'source') return { x: job.from.x + f.copyOffset.x, y: job.from.y + f.copyOffset.y };
    if (which === 'screen-top') return { x: f.p.x, y: -curShift.y };
    return { x: f.p.x, y: f.p.y };
  }
  function pathPoint(f, progress) {
    var s = f.spec, a = endpoint(f, s.from || 'source'), b = endpoint(f, s.to || 'target');
    var ao = s.fromOffset || [0, 0], bo = s.toOffset || [0, 0];
    a.x += ao[0] * f.unit; a.y += ao[1] * f.unit; b.x += bo[0] * f.unit; b.y += bo[1] * f.unit;
    // 出発点だけを再生ごとにずらす（落ちてくる角度が毎回変わる）。
    if (s.fromJitter) { a.x += (random(41, f.seed) - .5) * 2 * s.fromJitter[0] * f.unit; a.y += (random(43, f.seed) - .5) * 2 * s.fromJitter[1] * f.unit; }
    return curvedPoint(a, b, progress, value(f, 'bend', s.pathBend || 0) * f.unit, f.job.dir * (f.index % 2 ? -1 : 1));
  }
  // TrailRenderer相当。幾何と減衰を固定処理で描く。部品を再呼び出ししない。
  function paintTrail(points, spec, f, color, widthScale) {
    if (!points.length) return;
    var count = spec.strands || 1, w = (spec.width == null ? .025 : spec.width) * f.unit * (widthScale == null ? 1 : widthScale);
    for (var strand = 0; strand < count; strand++) {
      var left = [], right = [], centers = [];
      for (var i = 0; i < points.length; i++) {
        var p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], u = i / Math.max(1, points.length - 1);
        var angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
        var taper = spec.taper ? VbFxCurves.sample(spec.taper, u) : 1 - u;
        var seconds = f.clock * f.job.def.ms / 1000;
        var sway = (noise(i * .24, f.clock * 12 + strand * 1.7, f.seed) - .5) * (spec.noise || 0) * f.unit * u + (strand - (count - 1) / 2) * w * u * 1.1;
        sway += Math.sin(u * TAU * (spec.frequency == null ? 2 : spec.frequency) - seconds * TAU * (spec.frequencyHz == null ? 3 : spec.frequencyHz) + strand * 1.7) * (spec.wave || 0) * f.unit * u;
        centers.push({ x: p.x + Math.cos(angle) * sway, y: p.y + Math.sin(angle) * sway });
        var thickness = w * taper;
        left.push({ x: p.x + Math.cos(angle) * (sway + thickness), y: p.y + Math.sin(angle) * (sway + thickness) });
        right.push({ x: p.x + Math.cos(angle) * (sway - thickness), y: p.y + Math.sin(angle) * (sway - thickness) });
      }
      ctx.save(); ctx.globalAlpha *= spec.alpha == null ? .5 : spec.alpha;
      var head = points[0], tail = points[points.length - 1], g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      var stops = spec.colors || [[0, spec.color || color], [1, spec.color || color]];
      stops.forEach(function (stop) { g.addColorStop(stop[0], rgba(stop[1], 1 - stop[0])); });
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
      left.slice(1).forEach(function (p) { ctx.lineTo(p.x, p.y); }); right.reverse().forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.fill();
      if (spec.softness) { ctx.save(); ctx.filter = 'blur(' + spec.softness * f.unit + 'px)'; ctx.fill(); ctx.restore(); }
      if (spec.core) stroke(centers, '#ffffff', w * .22, spec.core, 0, 0);
      if (spec.texture) points.forEach(function (p, j) {
        var u = j / Math.max(1, points.length - 1);
        stamp(spec.texture, p, Math.max(.1, w * 2.4 * (1 - u)), spec.color || color, (1 - u) * .16, 0, [1, 1.2], j);
      }); ctx.restore();
    }
  }
  function drawParticles(f) {
    if (f.spec.motion === 'radial-drag') { drawRadialMotes(f); return; }
    if(f.spec.motion==='wake'){drawWakeMotes(f);return;}
    if(f.spec.motion==='path-motes'){drawPathMotes(f);return;}
    if(f.spec.motion==='stream'){drawStreamMotes(f);return;}
    if(f.spec.motion==='edge-burst'){drawEdgeBurst(f);return;}
    if(f.spec.motion==='fan-volume'){drawFanVolume(f);return;}
    if(f.spec.motion==='arc-grid'){drawArcGrid(f);return;}
    if(f.spec.motion==='arc-motes'){drawArcMotes(f);return;}
    if(f.spec.motion==='line-motes'){drawLineMotes(f);return;}
    if(f.spec.motion==='fan-flow'){drawFanFlow(f);return;}
    if(f.spec.motion==='fan-ballistic'){drawFanBallistic(f);return;}
    if(f.spec.motion==='axial-motes'){drawAxialMotes(f);return;}
    if(['edge-motes','rise','corners'].indexOf(f.spec.motion)>=0){drawSurfaceMotes(f);return;}
    if(f.spec.motion==='ellipse-motes'){
      var sp=f.spec,jb=f.job,tt=f.clock,rate0=sp.phaseRate||[.3,.4],xx=sp.radiusX||[.5,.5],yy=sp.radiusY||xx;
      var ext=sp.positionSpace==='diagonal'?Math.hypot(f.r.width,f.r.height)*jb.size:f.unit;
      for(var ii=0;ii<value(f,'count',60)*jb.particles;ii++){
        var mm=mote(jb,ii+(sp.moteOffset||0)+f.index*(sp.targetMoteStride||0)),ph=(mm.delay+tt*(rate0[0]+mm.velocity*rate0[1]))%1;
        var aa=mm.angle*value(f,'angleScale',1)+value(f,'angleOffset',0)+(sp.angleSpace==='trajectory'?f.angle||0:0)+(sp.angularClock==='phase'?ph:tt)*mm.spin*value(f,'angleSpeed',0)*(sp.directedSpin?jb.dir:1);
        var rx=mix(xx[0],xx[1],ph)*(sp.positionSpace==='bounds'?f.r.width:ext)*value(f,'radiusMultiplier',1),ry=mix(yy[0],yy[1],ph)*(sp.positionSpace==='bounds'?f.r.height:ext)*value(f,'radiusMultiplier',1);
        var pos={x:f.p.x+Math.cos(aa)*rx,y:f.p.y+Math.sin(aa)*ry},sr=sp.sizeRange||[.019,.069];
        var sz=(sr[0]+mm.size*(sr[1]-sr[0]))*(1-ph*(1-(sp.sizeEnd==null?1:sp.sizeEnd)))*f.unit*value(f,'sizeScale',1);
        var or=sp.opacityRange||[1,1],al=alpha(f)*(sp.phaseAlpha?VbFxCurves.sample(sp.phaseAlpha,ph):Math.sin(ph*Math.PI))*(or[0]+mm.size*(or[1]-or[0]));
        var cc=sp.angularColors?sp.angularColors[((Math.floor((aa/TAU+4)*sp.angularColors.length)%sp.angularColors.length)+sp.angularColors.length)%sp.angularColors.length]:tint(f);
        var materials=sp.materials||[{texture:sp.texture||'glow'}];
        materials.forEach(function(mat){ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||(mat.texture==='smoke'||mat.texture==='stone'?'normal':'add')];
          stamp(mat.texture,pos,sz*(mat.radiusScale==null?1:mat.radiusScale),mat.color||cc,al*(mat.alphaScale==null?1:mat.alphaScale),(aa+ph*value(f,'orientationPhase',3))*(mat.rotationScale==null?(mat.texture==='glow'?0:1):mat.rotationScale),mat.aspect,(ii+(mat.variantOffset||0))%3);ctx.restore();});
        if(sp.afterglowEvery&&ii%sp.afterglowEvery===0)afterglow(jb,pos,sz*(sp.afterglowRadius||1),sp.afterglowColor||cc,al*(sp.afterglowAlpha||1));
      }return;
    }
    if (f.spec.motion==='orbit') {
      var s0=f.spec,orbit=value(f,'orbit',.5)*dimension(f,s0.orbitSpace)+value(f,'orbitBounds',0)*dimension(f,'diagonal');
      var orbitCount=s0.countScale==='none'?value(f,'count',14):(s0.countScale==='ceil'?Math.ceil:Math.round)(value(f,'count',14)*f.job.particles*value(f,'countMultiplier',1));
      for(var k=0;k<orbitCount;k++){
        var m0=mote(f.job,k+(s0.moteOffset||0)),a0=(s0.phaseDistribution==='uniform'?k/orbitCount*TAU:m0.angle)+value(f,'angularProgress',f.clock)*(value(f,'angleSpeed',0)+m0.spin*value(f,'angularSpread',0))*(s0.directedSpin?f.job.dir:1);
        var radial0=orbit+(value(f,'orbitVelocity',0)*m0.velocity+value(f,'orbitSize',0)*m0.size)*dimension(f,s0.orbitSpace)+value(f,'orbitSizeBounds',0)*m0.size*dimension(f,'diagonal');
        if(s0.radialCurve)radial0*=VbFxCurves.sample(s0.radialCurve,clamp((value(f,'radialProgress',f.life)-m0.delay*value(f,'radialDelay',0))/value(f,'radialLife',1)));
        if(s0.skipNonPositiveRadius&&radial0<=0)continue;
        var pos0={x:f.p.x+Math.cos(a0)*radial0,y:f.p.y+Math.sin(a0)*radial0};
        (s0.materials||[{texture:s0.texture||'glow',rotationScale:0}]).forEach(function(mat){ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||'add'];
          if(mat.every&&k%mat.every){ctx.restore();return;}
          var size0=(s0.sizeRange?s0.sizeRange[0]:value(f,'size',.045))+value(f,'sizeSize',0)*m0.size+value(f,'sizeVelocity',0)*m0.velocity;
          var rotation0=a0+f.life*value(f,'particleSpin',0)*m0.spin*(s0.directedSpin?f.job.dir:1)+f.clock*value(f,'materialRotationRate',0);
          var an0=a0+(mat.polarOffset||0)*(mat.directedPolarOffset?f.job.dir:1),d0=radial0+(mat.radialOffset||0)*f.unit,at0=mat.polarOffset||mat.radialOffset?{x:f.p.x+Math.cos(an0)*d0,y:f.p.y+Math.sin(an0)*d0}:pos0;
          paintMaterial(f,Object.assign({aspect:s0.aspect},mat),at0,(mat.radiusAbsolute==null?size0:mat.radiusAbsolute)*f.unit*(mat.radiusScale==null?1:mat.radiusScale),mat.colors?mat.colors[k%mat.colors.length]:tint(f),alpha(f)*(mat.alphaScale==null?1:mat.alphaScale),rotation0*(mat.rotationScale==null?1:mat.rotationScale)+(mat.rotationOffset||0)*(mat.directedPolarOffset?f.job.dir:1),mat.variant==null?k+(mat.variantOffset||0):mat.variant);ctx.restore();});
      }return;
    }
    var s = f.spec, job = f.job, now = f.clock * job.def.ms / 1000, ranges = s.lifeMs || [300, 700];
    var count = Math.max(1, Math.round(value(f, 'count', 64) * job.particles)), rate = value(f, 'rate', 32) * job.particles;
    var begin = 0, end = count - 1;
    if (s.emit === 'rate') { end = Math.floor(now * rate); begin = Math.max(s.prewarm ? -count : 0, end - count + 1, Math.floor((now - ranges[1] / 1000) * rate)); }
    var extent = s.extent || [f.r.width / (2 * f.unit), f.r.height / (2 * f.unit)];
    for (var i = begin; i <= end; i++) {
      var seed = f.seed, offset = i * 31, life = VbFxCurves.range(ranges, seed, offset + 3) / 1000;
      var birth = s.emit === 'rate' ? i / rate : VbFxCurves.range(s.delayMs || [0, 60], seed, offset + 7) / 1000;
      var age = now - birth; if (age < 0 || age >= life) continue;
      var arc = s.emissionArc || [0, TAU], u = age / life, an = mix(arc[0], arc[1], random(offset + 1, seed)), rad = Math.sqrt(random(offset + 2, seed)), ex = 0, ey = 0;
      switch (s.emission || 'point') {
      case 'circle': ex = Math.cos(an) * extent[0] * rad; ey = Math.sin(an) * extent[1] * rad; break;
      case 'rim': ex = Math.cos(an) * extent[0]; ey = Math.sin(an) * extent[1]; break;
      case 'rect': ex = (random(offset + 5, seed) * 2 - 1) * extent[0]; ey = (random(offset + 6, seed) * 2 - 1) * extent[1]; break;
      case 'edge':
        var edge = random(offset + 5, seed) * 4, z = (edge % 1) * 2 - 1;
        if (edge < 1) { ex = z * extent[0]; ey = -extent[1]; }
        else if (edge < 2) { ex = extent[0]; ey = z * extent[1]; }
        else if (edge < 3) { ex = z * extent[0]; ey = extent[1]; }
        else { ex = -extent[0]; ey = z * extent[1]; }
        an = Math.atan2(ey, ex); break;
      case 'line':
        if (s.points) {
          var along = random(offset + 5, seed) * (s.points.length - 1), segment = Math.min(s.points.length - 2, Math.floor(along));
          ex = mix(s.points[segment][0], s.points[segment + 1][0], along - segment); ey = mix(s.points[segment][1], s.points[segment + 1][1], along - segment);
        } else { ex = (random(offset + 5, seed) * 2 - 1) * extent[0]; ey = (random(offset + 6, seed) * 2 - 1) * extent[1]; } break;
      case 'path':
        var q = curvedPoint(job.from, f.p, random(offset + 5, seed), (s.pathBend || 0) * f.unit, job.dir);
        ex = (q.x - f.p.x) / f.unit; ey = (q.y - f.p.y) / f.unit; break;
      }
      var orbit = value(f, 'orbitSpeed', 0) * age * job.dir + value(f, 'rotation', 0) * job.dir;
      if (orbit) { var ox = ex; ex = ox * Math.cos(orbit) - ey * Math.sin(orbit); ey = ox * Math.sin(orbit) + ey * Math.cos(orbit); an += orbit; }
      var dir = VbFxCurves.range(s.direction || [0, TAU], seed, offset + 8);
      if (s.directionSpace === 'radial') dir = an;
      else if (s.directionSpace === 'inward') dir = Math.atan2(-ey, -ex);
      else if (s.directionSpace === 'forward') dir += job.angle;
      var speed = VbFxCurves.range(s.speed || [.3, 1.2], seed, offset + 9), drag = value(f, 'drag', 0);
      var distance = speed * (drag > 0 ? (1 - Math.exp(-drag * age)) / drag : age);
      if (s.directionSpace === 'inward') distance = Math.min(distance, Math.hypot(ex, ey));
      var gravity = s.gravity || [0, 0], x = f.p.x + (ex + Math.cos(dir) * distance + gravity[0] * age * age / 2) * f.unit;
      var y = f.p.y + (ey + Math.sin(dir) * distance + gravity[1] * age * age / 2) * f.unit;
      var radius = VbFxCurves.range(s.sizeRange || [.012, .03], seed, offset + 10) * value(f, 'size', 1, u) * f.unit;
      var opacity = alpha(f, u) * (s.curves && s.curves.alpha && s.curves.alpha.domain !== 'effect' ? 1 : Math.sin(u * Math.PI));
      var rotation = VbFxCurves.range(s.particleRotation || [0, TAU], seed, offset + 11) + VbFxCurves.range(s.spin || [0, 0], seed, offset + 12) * age;
      var color = tint(f, u), p = { x: x, y: y };
      if (s.trail) {
        var len = Math.min(s.trail.length || .2, distance) * f.unit, points = [];
        for (var j = 0; j <= (s.trail.segments || 12); j++) { var v = j / (s.trail.segments || 12); points.push({ x: x - Math.cos(dir) * len * v, y: y - Math.sin(dir) * len * v }); }
        ctx.save(); ctx.globalAlpha *= clamp(opacity); paintTrail(points, s.trail, f, color); ctx.restore();
      }
      if (s.shape) drawPath(s.shape, p, radius, color, s.light || job.def.light, s.shadow || '#304050', rotation, s.aspect, opacity, 0);
      else stamp(s.texture || 'glow', p, radius, color, opacity, rotation, s.aspect, i);
    }
  }
  function noiseSample(s,x,y,seed){return s.noiseType==='fractal'?fractal(x,y,seed):noise(x,y,seed);}
  function particleMaterial(f,mat,p,size,opacity,rotation,index,row,n,m,phase){
    row=row||0;n=n||0;m=m||{size:0,angle:0,spin:0,velocity:0};
    phase=phase==null?f.life:phase;if(mat.phaseRange&&(phase<mat.phaseRange[0]||phase>=mat.phaseRange[1]))return;
    if(mat.rows&&mat.rows.indexOf(row)<0||mat.every&&index%mat.every!==(mat.cadenceRow?row:0)||mat.skipEvery&&index%mat.skipEvery===0)return;
    var radius=(mat.rowRadii?mat.rowRadii[Math.min(row,mat.rowRadii.length-1)]*f.unit:mat.radius==null?size:(mat.radius+(mat.radiusNoise||0)*n+(mat.radiusSize||0)*m.size+(mat.radiusVelocity||0)*m.velocity)*f.unit)*(mat.radiusScale==null?1:mat.radiusScale);
    if(mat.radiusCurve)radius*=VbFxCurves.sample(mat.radiusCurve,phase);
    var a=mat.rowAlpha?mat.rowAlpha[Math.min(row,mat.rowAlpha.length-1)]:(mat.alphaScale==null?1:mat.alphaScale)+(mat.alphaNoise||0)*n+(mat.alphaSize||0)*m.size;
    if(mat.flicker)a=modulated(Object.assign({},f,{index:index}),mat.flicker,a);
    if(mat.alphaCurve)a*=VbFxCurves.sample(mat.alphaCurve,mat.alphaDomain==='phase'?phase:f.life);
    var col=mat.rowColors?mat.rowColors[Math.min(row,mat.rowColors.length-1)]:mat.colors?mat.colors[index%mat.colors.length]:mat.color||tint(f);
    if(mat.palette){if(mat.colorInterpolation==='step'){col=mat.palette[0][1];mat.palette.forEach(function(stop){if(phase>=stop[0])col=stop[1];});}else col=VbFxCurves.gradientColor(mat.palette,phase);}
    var rot=rotation*(mat.rotationScale==null?1:mat.rotationScale)+f.clock*(mat.rotationSpeed||0)+row*(mat.rotationRow||0)+m.angle*(mat.moteAngle||0)+f.clock*m.spin*(mat.moteSpin||0)+index*(mat.rotationIndex||0);
    var at=mat.radialScale==null?p:{x:f.p.x+(p.x-f.p.x)*mat.radialScale,y:f.p.y+(p.y-f.p.y)*mat.radialScale};
    ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||(mat.texture==='smoke'?'normal':'add')];paintMaterial(f,mat,at,radius,col,opacity*a,rot,mat.variant==null?(index+(mat.variantOffset||0))%(mat.shape?1000000:3):mat.variant);ctx.restore();
  }
  function drawAxialMotes(f){
    var s=f.spec,count=value(f,'count',35),along=s.axialDistance||[.3,5.2],sizes=s.axialSize||[1.05,-.55],ni=s.noiseIndex||[0,.23],nt=s.noiseTime||[9,0],R=value(f,'radius',.42)*f.unit,ca=Math.cos(f.angle||0),sa=Math.sin(f.angle||0);
    for(var j=0;j<count;j++){var i=s.reverse?count-1-j:j,m=mote(f.job,i+(s.moteOffset||0)),phase=i/value(f,'axialDivisor',count),distance=R*(along[0]+phase*along[1]),sway=(noiseSample(s,f.clock*nt[0]+i*ni[0],f.clock*nt[1]+i*ni[1],f.seed)-.5)*R*value(f,'sway',.9)*phase,p={x:f.p.x-ca*distance-sa*sway,y:f.p.y-sa*distance+ca*sway},size=R*(sizes[0]+sizes[1]*phase)*(value(f,'radiusMultiplier',.8)+m.size*value(f,'sizeMoteScale',.4)),a=alpha(f)*Math.pow(1-phase,value(f,'alphaExponent',1.2));
      (s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,size,a,f.angle||0,i,0,0,m,phase);});
      if(s.afterglowEvery&&i%s.afterglowEvery===0)afterglow(f.job,p,size*value(f,'afterglowRadius',.5),s.afterglowColor||tint(f),a*value(f,'afterglowAlpha',.2));
    }
  }
  function drawFanFlow(f){
    var s=f.spec,sec=f.clock*f.job.ms/1000,lt=s.lifetime||[.42,.3],np=s.noisePhase||[4,0],ni=s.noiseIndex||[.37,0],nt=s.noiseTime||[0,3],count=(s.countScale==='ceil'?Math.ceil:Math.round)(value(f,'count',300)*f.job.particles);
    // 2026-10-14: fanDirection／fanHalfArc／reachLength を指定した層は、向き・扇・長さを層の値で決める（未指定は従来どおり）。
    var baseAngle=s.fanDirection!=null?value(f,'fanDirection',0):f.job.angle,halfArc=s.fanHalfArc!=null?Math.max(.0001,value(f,'fanHalfArc',.1)):null,fixedReach=s.reachLength!=null?value(f,'reachLength',1)*dimension(f,s.reachSpace||'width'):null;
    for(var i=0;i<count;i++){var m=mote(f.job,i+(s.moteOffset||0)),th=halfArc!=null?baseAngle+(m.angle/TAU*2-1)*halfArc:f.job.angle+(m.angle/TAU*2-1)*f.job.spread*value(f,'spreadScale',.98),angular=Math.pow(Math.max(0,Math.cos(halfArc!=null?(th-baseAngle)/halfArc*Math.PI/2:(th-f.job.angle)/f.job.spread*Math.PI/2)),value(f,'angularExponent',.5)),phase=(sec/(lt[0]+m.life*lt[1])+m.delay)%1,reach=fixedReach!=null?fixedReach:rayReach(f.job,th),distance=reach*Math.pow(phase,value(f,'flowPower',.8))*value(f,'flowReachScale',1);
      if(distance>reach*value(f,'frontProgress',1)+f.unit*value(f,'frontPad',.2))continue;
      var wob=(noiseSample(s,phase*np[0]+i*ni[0]+sec*nt[0],phase*np[1]+i*ni[1]+sec*nt[1],f.seed)-.5)*f.unit*(value(f,'sway',.25)+phase*value(f,'swayPhase',.9)),p={x:f.p.x+Math.cos(th)*distance-Math.sin(th)*wob,y:f.p.y+Math.sin(th)*distance+Math.cos(th)*wob},flick=value(f,'flickerBias',1)+value(f,'flickerNoise',0)*noise(i*value(f,'flickerIndex',1.7),sec*value(f,'flickerRate',9),f.seed),size=f.unit*(value(f,'size',.22)+phase*value(f,'sizePhase',1.05)+m.size*value(f,'sizeSize',0))*(value(f,'radiusMultiplier',1)+m.size*value(f,'sizeMoteScale',0)),a=alpha(f)*angular*flick,rotation=m.angle+sec*m.spin;
      (s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,size,a,rotation,i,0,0,m,phase);});
      if(s.afterglowEvery&&i%s.afterglowEvery===0)afterglow(f.job,p,value(f,'afterglowFixedRadius',.04)*f.unit,s.afterglowColor||tint(f),a*(1-phase)*value(f,'afterglowAlpha',.35));
    }
  }
  function drawFanBallistic(f){
    var s=f.spec;
    for(var i=0;i<value(f,'count',26);i++){var m=mote(f.job,i+(s.moteOffset||0)),th=f.job.angle-f.job.spread+2*f.job.spread*m.delay,born=value(f,'birth',.1)+m[s.birthMote||'size']*value(f,'birthSpread',.3),age=clamp((f.effect-born)/value(f,'lifeRatio',.35));if(age<=0||age>=1)continue;
      var radial=dimension(f,s.radiusSpace)*(s.progressCurve?VbFxCurves.sample(s.progressCurve,born):1)+f.unit*value(f,'speedVelocity',.6)*age*m.velocity,hop=Math.sin(age*Math.PI)*f.unit*value(f,'hop',.25),p={x:f.p.x+Math.cos(th)*radial,y:f.p.y+Math.sin(th)*radial-hop},size=f.unit*(value(f,'size',.035)+m.size*value(f,'sizeSize',.045))*(1+hop/f.unit*value(f,'hopScale',1)),a=alpha(f)*(s.ageAlpha?VbFxCurves.sample(s.ageAlpha,age):1-age),rotation=age*value(f,'particleSpin',6)*m.spin;
      (s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,size,a,rotation,i,0,0,m,age);});
    }
  }
  function drawFanVolume(f){
    var s=f.spec,R=value(f,'radius',1)*dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal'),count=Math.round(value(f,'count',260)*f.job.particles),begin=s.reverse?count-1:0,end=s.reverse?-1:count,step=s.reverse?-1:1,nt=s.noiseTime||[3,2];
    for(var i=begin;i!==end;i+=step){var m=mote(f.job,i+(s.moteOffset||0)),th=f.job.angle-f.job.spread+2*f.job.spread*m.delay,density=Math.pow(Math.max(0,Math.cos((m.delay-.5)*Math.PI)),value(f,'densityExponent',.6)),behind=(1-m.size)*R*value(f,'behind',.97),distance=Math.max(0,R-behind),n=noiseSample(s,m.angle*value(f,'noiseMoteAngle',2)+f.clock*nt[0],m.velocity*value(f,'noiseMoteVelocity',3)+f.clock*nt[1],f.seed),shift=(n-.5)*f.unit*value(f,'noiseSway',.55);
      var p={x:f.p.x+Math.cos(th)*distance-Math.sin(th)*shift,y:f.p.y+Math.sin(th)*distance+Math.cos(th)*shift},size=f.unit*(value(f,'size',.18)+m.velocity*value(f,'sizeVelocity',.36))*(value(f,'radiusMultiplier',.7)+behind/Math.max(f.unit,R)*value(f,'radiusBehind',1));
      (s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,size,alpha(f)*(mat.angularFade===false?1:density),th,i,0,n,m);});
      if(s.afterglowEvery&&i%s.afterglowEvery===0)afterglow(f.job,p,(value(f,'afterglowFixedRadius',.015)+m.size*value(f,'sizeSize',.026))*f.unit*value(f,'afterglowRadius',2.2),s.afterglowColor||tint(f),alpha(f)*value(f,'afterglowAlpha',.25));
    }
  }
  function drawArcGrid(f){
    var s=f.spec,R=value(f,'radius',1)*dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal');if(s.minActiveRadius!=null&&R<=value(f,'minActiveRadius',0)*f.unit)return;
    var steps=s.spacing?Math.max(s.stepsMin||24,Math.min(s.stepsMax||160,Math.round(Math.max(1,R*f.job.spread*2)/(f.unit*s.spacing)))):value(f,'count',58)-1,nt=s.noiseTime||[2,1],ns=s.noiseSpace||[3,3],nr=s.noiseRows||[1,0],no=s.noiseOffset||[0,0];
    for(var row=(s.gridRows||1)-1;row>=0;row--)for(var i=0;i<=steps;i++){
      var u=(i+(s.staggerRows&&row%2?.5:0))/steps,th=f.job.angle-f.job.spread+2*f.job.spread*u,n=noiseSample(s,Math.cos(th)*ns[0]+f.clock*nt[0]+row*nr[0]+no[0],Math.sin(th)*ns[1]+f.clock*nt[1]+row*nr[1]+no[1],f.seed+row*(s.noiseSeedRow||0));
      var offset=row*f.unit*(value(f,'rowOffset',0)+n*value(f,'rowNoiseOffset',0)),rr=s.rowOffsetMode==='after-noise'?R*(1+(n-.5)*value(f,'radialNoise',0))-offset:Math.max(s.radialFloorPx||0,R-offset)*(1+(n-.5)*value(f,'radialNoise',0));
      var p={x:f.p.x+Math.cos(th)*rr,y:f.p.y+Math.sin(th)*rr},opacity=alpha(f)*Math.pow(Math.sin(clamp(u)*Math.PI),value(f,'angularExponent',.9)),size=f.unit*(value(f,'size',.12)+n*value(f,'sizeNoise',.2));
      (s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,size,opacity,th,i,row,n);});
    }
  }
  function drawArcMotes(f){
    var s=f.spec,R=value(f,'radius',1)*dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal'),range=s.lagRange||[.2,.9];if(R<=value(f,'minActiveRadius',0)*f.unit)return;
    for(var i=0;i<value(f,'count',50)*f.job.particles;i++){var m=mote(f.job,i+(s.moteOffset||0)),th=f.job.angle-f.job.spread+2*f.job.spread*m.delay,phase=(f.clock*value(f,'lagRate',3)+m.velocity)%1,rr=R-m.size*f.unit*(range[0]+range[1]*phase);if(rr<=0)continue;
      var p={x:f.p.x+Math.cos(th)*rr,y:f.p.y+Math.sin(th)*rr},opacity=alpha(f)*Math.pow(Math.sin(m.delay*Math.PI),value(f,'angularExponent',1));(s.materials||[]).forEach(function(mat){particleMaterial(f,mat,p,0,opacity,th,i,0,0,m);});
    }
  }
  function shapePoints(f){var s=f.spec;return (s.points||[[0,.5],[1,.5]]).map(function(p,i){var off=s.pointOffsets&&s.pointOffsets[i]||[0,0];return s.pointSpace==='bounds'?{x:f.r.left+p[0]*f.r.width+off[0]*f.unit,y:f.r.top+p[1]*f.r.height+off[1]*f.unit}:{x:f.p.x+(p[0]+off[0])*f.unit,y:f.p.y+(p[1]+off[1])*f.unit};});}
  function drawLineMotes(f){
    var s=f.spec,pts=shapePoints(f),a=pts[0],b=pts[pts.length-1];
    for(var i=0;i<value(f,'count',140)*f.job.particles;i++){var m=mote(f.job,i+(s.moteOffset||0)),x=mix(a.x,b.x,m.delay),y=mix(a.y,b.y,m.delay),drift=f.unit*value(f,'spreadDistance',1)*(m.size-.5),p={x:x,y:y+drift};
      (s.materials||[]).forEach(function(mat){var shift=mat.moteShift||[0,0],point={x:p.x+Math.cos(m.angle)*f.unit*value(f,'scatter',0)*shift[0],y:p.y+Math.sin(m.angle)*f.unit*value(f,'scatter',0)*shift[1]};particleMaterial(f,mat,point,0,alpha(f),0,i,0,0,m);});
      if(s.afterglowEvery&&i%s.afterglowEvery===0)afterglow(f.job,p,value(f,'afterglowFixedRadius',.04)*f.unit,s.afterglowColor||tint(f),alpha(f)*value(f,'afterglowAlpha',.22));
    }
  }
  function drawEdgeBurst(f){
    var s=f.spec,g=s.gravity||[0,0],progress=value(f,'progress',f.life);
    for(var i=0;i<value(f,'count',22);i++){
      var m=mote(f.job,i+(s.moteOffset||0)),side=i%4,u=m.size,sx=side===0||side===2?f.r.left+f.r.width*u:side===1?f.r.right:f.r.left,sy=side===1||side===3?f.r.top+f.r.height*u:side===0?f.r.top:f.r.bottom;
      var dx=sx-f.p.x,dy=sy-f.p.y,len=Math.max(1,Math.hypot(dx,dy)),go=f.unit*(value(f,'speedOffset',0)+value(f,'speedVelocity',0)*m.velocity)*VbFxCurves.ease(progress);
      var p={x:sx+dx/len*go+f.unit*g[0]*progress*progress,y:sy+dy/len*go+f.unit*g[1]*progress*progress},size=(value(f,'size',.06)+value(f,'sizeSize',.07)*m.size)*f.unit,rotation=m.angle+progress*m.spin*value(f,'particleSpin',6)*f.job.dir;
      (s.materials||[{texture:'glow'}]).forEach(function(mat){if(mat.every&&i%mat.every)return;ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||'normal'];paintMaterial(f,mat,p,size*(mat.radiusScale==null?1:mat.radiusScale),tint(f),alpha(f)*(mat.alphaScale==null?1:mat.alphaScale),rotation*(mat.rotationScale==null?1:mat.rotationScale),i);ctx.restore();});
    }
  }
  function drawWakeMotes(f){
    var s=f.spec,rate=s.phaseRate||[1,0],along=s.wakeAlong||[.24,.96,.36],spread=s.wakeSpread||[.096,.48],ca=Math.cos(f.angle||0),sa=Math.sin(f.angle||0),count=value(f,'count',16);
    for(var i=0;i<count;i++){
      var m=mote(f.job,i+(s.moteOffset||0)+f.index*(s.targetMoteStride||0)),ph=(f.clock*(rate[0]+m.velocity*rate[1])+m.delay)%1;
      var distance=(along[0]+m.size*along[1]+ph*along[2])*f.unit,drift=(i%2?1:-1)*mix(spread[0],spread[1],ph)*f.unit,pos={x:f.p.x-ca*distance-sa*drift,y:f.p.y-sa*distance+ca*drift},a=alpha(f)*Math.sin(ph*Math.PI);
      (s.materials||[{texture:'smoke'}]).forEach(function(mat){ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||(mat.texture==='smoke'?'normal':'add')];
        stamp(mat.texture,pos,((mat.radius||0)+(mat.radiusPhase||0)*ph)*f.unit,mat.color||tint(f),a*(mat.alphaScale==null?1:mat.alphaScale),m.angle+ph*3,mat.aspect,i+(mat.variantOffset||0));ctx.restore();});
    }
  }
  function drawPathMotes(f){
    var s=f.spec,count=value(f,'count',8),start=s.indexStart||0,progress=value(f,'pathProgress',f.life),dst=point(f.job.targets[f.index]||f.r),sign=(f.index*(s.pathIndexStride==null?1:s.pathIndexStride)+(s.pathIndexOffset||0))%2?1:-1;
    for(var j=0;j<count;j++){
      var i=start+(s.reverse?count-1-j:j),m=mote(f.job,i+(s.moteOffset||0)),lag=clamp(progress-i*value(f,'lagIndex',0)-m.delay*value(f,'lagDelay',0)),pos=curvedPoint(f.job.from,dst,lag,(s.pathBend||0)*f.unit,sign*f.job.dir),radial=m.angle+f.clock*value(f,'scatterRate',0),spread=value(f,'scatter',0)*m.size*f.unit;
      pos.x+=Math.cos(radial)*spread;pos.y+=Math.sin(radial)*spread;
      var sway=Math.sin(i*value(f,'swayIndex',0)+f.clock*value(f,'swayFrequency',0))*f.unit*value(f,'sway',0)*(value(f,'swayGain',1)+i*value(f,'swayIndexGain',0));pos.x+=sway;pos.y+=sway*value(f,'swayY',0);
      var size=(value(f,'size',.1)+m.size*value(f,'sizeSize',0)+i*value(f,'sizeIndex',0))*(1-i*value(f,'sizeIndexDecay',0))*f.unit,opacity=alpha(f)+i*value(f,'opacityIndex',0),angle=s.orient==='mote'?m.angle:s.orient==='radial'?radial:f.angle||0;
      angle+=m.angle*value(f,'orientationSpread',0)+value(f,'orientationOffset',0)+f.clock*(value(f,'orientationSpeed',0)+m.spin*value(f,'orientationSpin',0));
      (s.materials||[{texture:s.texture||'glow'}]).forEach(function(mat){if(mat.every&&i%mat.every)return;var shift=mat.moteShift||[0,0],point0={x:pos.x+(m.size-.5)*shift[0]*f.unit,y:pos.y+(m.velocity-.5)*shift[1]*f.unit};
        ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||(mat.texture==='smoke'?'normal':'add')];paintMaterial(f,mat,point0,mat.radius==null?size*(mat.radiusScale==null?1:mat.radiusScale):mat.radius*f.unit,tint(f),opacity*((mat.alphaScale==null?1:mat.alphaScale)+i*(mat.alphaIndex||0)),angle*(mat.rotationScale==null?1:mat.rotationScale)+(mat.rotationOffset||0)+f.clock*(mat.rotationSpeed||0),mat.variant==null?i+(mat.variantOffset||0):mat.variant);ctx.restore();});
      if(s.afterglowEvery&&i%s.afterglowEvery===0)afterglow(f.job,pos,s.afterglowFixedRadius==null?size*(s.afterglowRadius||1):s.afterglowFixedRadius*f.unit,s.afterglowColor||tint(f),opacity*(s.afterglowAlpha||1));
    }
  }
  function drawStreamMotes(f){
    var s=f.spec,a=s.streamFrom==='source'?f.job.from:point(f.r),b=s.streamTo==='target'?point(f.r):f.job.from,dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),count=value(f,'count',22)*(s.countScale==='none'?1:f.job.particles);
    for(var i=0;i<count;i++){
      var m=mote(f.job,i+(s.moteOffset||0)+f.index*(s.targetMoteStride||0)),ph=(f.clock-m.delay*value(f,'delayRatio',.2))/value(f,'lifeRatio',.72);if(ph<=0||ph>=1)continue;
      var u=s.progressCurve?VbFxCurves.sample(s.progressCurve,ph):ph,sway=Math.sin(u*Math.PI)*(m.size-.5)*f.unit*value(f,'sway',.9),p={x:mix(a.x,b.x,u)-dy/len*sway,y:mix(a.y,b.y,u)+dx/len*sway};
      var size=f.unit*(value(f,'size',.016)+m.size*value(f,'sizeSize',.025)),opacity=alpha(f)*Math.sin(ph*Math.PI);
      (s.materials||[{texture:'glow'}]).forEach(function(mat){ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||'add'];paintMaterial(f,mat,p,size*(mat.radiusScale==null?1:mat.radiusScale),tint(f),opacity*(mat.alphaScale==null?1:mat.alphaScale),ph*value(f,'orientationSpeed',5)*(mat.rotationScale==null?1:mat.rotationScale),mat.variant==null?i:mat.variant);ctx.restore();});
      if(s.afterglowRadius)afterglow(f.job,p,size*s.afterglowRadius,s.afterglowColor||tint(f),opacity*(s.afterglowAlpha||1));
    }
  }
  function edgePoint(r,s,out){
    var w=r.width,h=r.height,per=2*(w+h),d=((s%1)+1)%1*per,x,y,nx,ny;
    if(d<w){x=r.left+d;y=r.top;nx=0;ny=-1;}
    else if(d<w+h){x=r.left+w;y=r.top+d-w;nx=1;ny=0;}
    else if(d<2*w+h){x=r.left+w-(d-w-h);y=r.top+h;nx=0;ny=1;}
    else{x=r.left;y=r.top+h-(d-2*w-h);nx=-1;ny=0;}
    return{x:x+nx*out,y:y+ny*out};
  }
  function drawSurfaceMotes(f){
    var s=f.spec,job=f.job,r=f.r,time=f.clock,rate=s.phaseRate||[.3,.4],count=Math.round(value(f,'count',20)+value(f,'countTint',0)*value(f,'tint',0));
    if(s.countScale==='round')count=Math.round(count*job.particles);else if(s.countScale==='ceil')count*=job.particles;
    for(var i=0;i<count;i++){
      var corner=s.motion==='corners'?Math.floor(i/(s.perCorner||2)):0,mi=s.motion==='corners'?corner*(s.cornerStride||3)+i%(s.perCorner||2):i;
      var m=s.phaseDistribution==='uniform'?{delay:i*(s.phaseSpacing==null?1/count:s.phaseSpacing),velocity:0,size:0,angle:0}:mote(job,mi+(s.moteOffset||0)+f.index*(s.targetMoteStride||0)),ph=(m.delay+time*(rate[0]+m.velocity*rate[1]))%1;
      var pos,size,rotation=0;
      if(s.motion==='edge-motes'){
        pos=edgePoint(r,m.angle/TAU+time*value(f,'travelRate',.02)*job.dir,f.unit*(value(f,'inset',0)+value(f,'drift',.15)*ph));
        size=f.unit*value(f,'size',.2)*(.6+m.size*.8);rotation=m.angle+ph*value(f,'rotationPhase',2);
      }else if(s.motion==='corners'){
        var rx=corner%2?r.right:r.left,ry=corner<2?r.top:r.bottom;
        pos={x:rx+(corner%2?1:-1)*f.unit*value(f,'drift',.02)*ph,y:ry-f.unit*(value(f,'inset',.02)+value(f,'travelRate',.08)*ph)};
        size=f.unit*(value(f,'size',.018)+value(f,'sizeSize',.012)*m.size);
      }else{
        var px=s.riseX||[.1,.9],py=s.riseY||[.98,.38];
        pos={x:r.left+r.width*(px[0]+m.size*(px[1]-px[0])+i*value(f,'riseIndexX',0))+Math.sin(ph*value(f,'swayFrequency',0)+i*value(f,'swayIndex',0))*value(f,'sway',0)*dimension(f,s.swaySpace),y:r.top+r.height*(py[0]+ph*(py[1]-py[0]))};
        size=f.unit*(value(f,'size',.14)+value(f,'sizeSize',0)*m.size+value(f,'sizeVelocity',0)*m.velocity+value(f,'sizePhase',.16)*ph+value(f,'sizeTint',0)*value(f,'tint',0))*(1+m.velocity*value(f,'velocityScale',0));
        rotation=(s.rotationPhase==null?0:m.angle+ph*s.rotationPhase);
      }
      var a=alpha(f)*(1+value(f,'alphaTint',0)*value(f,'tint',0))*Math.pow(Math.sin(ph*Math.PI),value(f,'alphaExponent',1));
      var mats=s.materials||[{texture:s.texture||'plasma-soft',aspect:s.motion==='edge-motes'&&s.texture!=='glow'?[1,1.3]:s.aspect,rotationScale:s.texture==='glow'?0:1}];
      mats.forEach(function(mat){var off=mat.offset||[0,0];ctx.save();ctx.globalCompositeOperation=BLENDS[mat.blend||(mat.texture==='smoke'||mat.texture==='stone'?'normal':'add')];
        var sway=Math.sin((ph+(mat.phaseOffset||0))*(mat.swayFrequency||0)+i*(mat.swayIndex||0))*(mat.sway||0)*dimension(f,mat.swaySpace);
        stamp(mat.texture,{x:pos.x+off[0]*size+sway,y:pos.y+off[1]*size+(mat.yOffset||0)*f.unit},mat.radius==null?size*(mat.radiusScale==null?1:mat.radiusScale):mat.radius*f.unit,mat.color||tint(f),a*(mat.alphaScale==null?1:mat.alphaScale),rotation*(mat.rotationScale==null?1:mat.rotationScale),mat.aspect,mat.variant==null?i+(mat.variantOffset||0):mat.variant);ctx.restore();});
      if(s.glintEvery&&i%s.glintEvery===0&&value(f,'tint',0)>value(f,'glintTintThreshold',0)){
        var th=value(f,'glintTintThreshold',0),am=(value(f,'tint',0)-th)/(1-th);
        ctx.save();ctx.globalCompositeOperation='lighter';stamp('glow',pos,f.unit*value(f,'glintRadius',.05),s.glintColor||tint(f),f.intro*Math.sin(ph*Math.PI)*value(f,'glintAlpha',1)*am,0,[1,1],0);ctx.restore();
      }
    }
  }
  function drawRadialMotes(f) {
    var s=f.spec, job=f.job, t=value(f,'progress',f.life), radius=value(f,'radius',1)*dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal');
    if (t < 0 || t >= 1) return;
    var count=Math.round(value(f,'count',64)*job.particles), color=tint(f), opacity=alpha(f), dir=job.dir||1;
    for (var i=0;i<count;i++) {
      var m=mote(job,i+(s.moteOffset||0)+f.index*(s.targetMoteStride||0)), age=(t-m.delay*.11)/m.life;
      if (age<=0 || age>=1) continue;
      var a=m.angle+age*m.spin*value(f,'vortex',.5)*dir, reach=radius*m.velocity*(1-Math.exp(-age*3.2));
      var drift=(noise(m.angle*3+age*4,age*3,job.seed)-.5)*radius*.15;
      var p={x:f.p.x+Math.cos(a)*reach+Math.cos(a+Math.PI/2)*drift,y:f.p.y+Math.sin(a)*reach+Math.sin(a+Math.PI/2)*drift};
      var al=Math.sin(age*Math.PI)*(.55+.45*Math.sin(age*m.flicker+i))*opacity;
      var size=job.unit*(.012+m.size*.027)*(1-age*.48);
      ctx.save();ctx.globalCompositeOperation='lighter';stamp('glow',p,size*2.7,color,al*.72,0,[1,1],0);ctx.restore();
      if (s.afterglow!==false && i%2===0) afterglow(job,p,size*2,color,al*.34);
      if (s.glint!==false && m.size>.76) haloStroke([{x:p.x-size*1.5,y:p.y},{x:p.x+size*1.5,y:p.y}],color,.65,al,1);
    }
  }
  function drawRing(f) {
    var s = f.spec, color = tint(f), opacity = alpha(f), lineWidth = value(f, 'width', .015) * (s.widthSpace==='pixel'?1:f.unit), soft = value(f, 'softness', .008) * f.unit;
    if(opacity<=0)return;
    if (s.strokeProfile==='halo') {
      var pts=[],clock=f.clock*(s.noiseClock==null?1:s.noiseClock),seed=f.seed;
      if (s.geometry==='card') {
        // カードの枠の形に沿う光の線（2026-10-21 利用者指定：魔導板のマスの変化の線を枠の形に）。
        pts=framePoints(f.r,value(f,'pad',0)*f.unit,160);
      } else if (s.geometry==='superellipse') {
        // 縁に宿る光も、枠の形を pad だけ広げた形に揺らぎを乗せる（2026-10-21 利用者指定：角Rを枠に揃える）。
        var nz=value(f,'noise',.037);
        pts=framePoints(f.r,value(f,'pad',.04)*f.unit,128,nz?function(ang){var c=Math.cos(ang),sn=Math.sin(ang);return 1+(noise(c*4+clock,sn*4-clock,seed)-.5)*nz;}:null);
      } else {
        if(!s.arc)seed=seed||13;
        var rad=Math.max(s.minRadiusPx||0,value(f,'radius',.5)*dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal')),arc0=s.arc||[0,TAU],rotate=(s.arc&&s.arcSpace!=='world'?f.job.angle:0)+value(f,'rotation',0)*(s.directedRotation?f.job.dir:1);
        if (!(rad>0)) return;
        var num=Math.max(32,Math.ceil((arc0[1]-arc0[0])/TAU*112));
        for (var k=0;k<=num;k++) {
          var an=mix(arc0[0]+rotate,arc0[1]+rotate,k/num),n=fractal(Math.cos(an)*3+clock*.8+12,Math.sin(an)*3+clock*.6+13,seed);
          var rr=rad*(1+(n-.5)*value(f,'noise',.12));
          pts.push({x:f.p.x+Math.cos(an)*rr,y:f.p.y+Math.sin(an)*rr});
        }
      }
      haloStroke(pts,color,lineWidth,opacity,value(f,'core',1));return;
    }
    if (s.geometry === 'card') {
      ctx.save(); ctx.globalAlpha *= clamp(opacity); ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
      if(s.strokeProfile==='single'){
        framePath(f.r,value(f,'pad',0)*f.unit);if(soft)ctx.filter='blur('+soft.toFixed(1)+'px)';ctx.stroke();ctx.restore();return;
      }
      if (roundedPath(f.r, value(f, 'pad', .02) * f.unit)) { if (soft) { ctx.save(); ctx.filter = 'blur(' + soft + 'px)'; ctx.stroke(); ctx.restore(); } ctx.globalAlpha *= value(f, 'core', 1); ctx.stroke(); } ctx.restore(); return;
    }
    var radius = value(f, 'radius', .5) * f.unit, aspect = s.aspect || [1, 1], arc = s.arc || [0, TAU], points = [];
    var angle = value(f, 'rotation', 0) * f.job.dir + (s.arc ? f.job.angle : 0);
    for (var i = 0; i <= 96; i++) {
      var a = mix(arc[0], arc[1], i / 96) + angle, wobble = 1 + (noise(Math.cos(a) * 3 + f.clock, Math.sin(a) * 3, f.seed) - .5) * value(f, 'noise', 0);
      points.push({ x: f.p.x + Math.cos(a) * radius * aspect[0] * wobble, y: f.p.y + Math.sin(a) * radius * aspect[1] * wobble });
    }
    if (s.stops && radius > 0) {
      ctx.save(); ctx.translate(f.p.x, f.p.y); ctx.scale(aspect[0], aspect[1]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, arc[0] + angle, arc[1] + angle); ctx.closePath(); ctx.clip();
      radial({ x: 0, y: 0 }, radius, s.stops, opacity); ctx.restore();
    }
    stroke(points, color, lineWidth, opacity * (s.texture ? .22 : 1), soft, 0, value(f, 'core', 1));
    if (s.texture) {
      var count = Math.round(value(f, 'count', 96) * f.job.particles);
      for (var k = 0; k < count; k++) {
        var u = k / count, a = mix(arc[0], arc[1], u) + angle;
        var n = noise(k * .23, f.clock * 7, f.seed), rr = radius * (1 + (n - .5) * value(f, 'noise', .06));
        stamp(s.texture, { x: f.p.x + Math.cos(a) * rr * aspect[0], y: f.p.y + Math.sin(a) * rr * aspect[1] }, lineWidth * (1.4 + n), color, opacity * (.4 + n * .4), a + f.clock, [1, 1.5], k);
      }
    }
  }
  function radial(p, radius, stops, opacity) {
    var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    stops.forEach(function (stop) { gradient.addColorStop(stop[0], rgba(stop[1], stop[2])); });
    ctx.save(); ctx.globalAlpha *= clamp(opacity); ctx.fillStyle = gradient; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2); ctx.restore();
  }
  function drawGlow(f) {
    var s = f.spec, radius = value(f, 'radius', .5) * dimension(f,s.radiusSpace)+value(f,'radiusBounds',0)*dimension(f,s.radiusBoundsSpace||'diagonal');
    if (!s.stops) { if(!s.afterglowOnly)stamp(s.texture || 'glow', f.p, radius, tint(f), alpha(f), value(f, 'rotation', 0)*(s.directedRotation?f.job.dir:1)*(s.indexAlternateRotation?(f.index%2?1:-1):1)+(s.align==='tangent'?f.copy/f.copies*TAU+Math.PI/2:s.align==='trajectory'?f.angle||0:0), s.aspect, s.variant==null?f.copy:s.variant);
      if(s.afterglowFixedRadius!=null)afterglow(f.job,f.p,value(f,'afterglowFixedRadius',0)*f.unit,s.afterglowColor||tint(f),hasParameter(s,'afterglowAlpha')?value(f,'afterglowAlpha',1):alpha(f));return; }
    if (radius <= 0) return;
    var aspect = s.aspect || [1, 1];
    ctx.save(); ctx.translate(f.p.x, f.p.y); ctx.rotate(value(f, 'rotation', 0)); ctx.scale(aspect[0], aspect[1]);
    radial({ x: 0, y: 0 }, radius, s.stops, alpha(f)); ctx.restore();
  }
  function drawBeam(f) {
    if(f.spec.geometry){drawLineBeam(f);return;}
    var s = f.spec, points = s.points ? s.points.map(function (p) { return { x: f.p.x + p[0] * f.unit, y: f.p.y + p[1] * f.unit }; }) : [f.job.from, f.p];
    var progress = value(f, 'progress', 1), result = [], segments = Math.round(value(f, 'segments', 48));
    for (var i = 0; i <= segments; i++) {
      var u = i / segments * progress, index = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
      var a = points[index], b = points[index + 1], v = u * (points.length - 1) - index, angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      var wobble = (noise(u * 8, f.clock * 4, f.seed) - .5) * value(f, 'noise', 0) * f.unit * Math.sin(u * Math.PI);
      result.push({ x: mix(a.x, b.x, v) + Math.cos(angle) * wobble, y: mix(a.y, b.y, v) + Math.sin(angle) * wobble });
    }
    var widthPx = value(f, 'width', .025) * f.unit, soft = Math.max(value(f, 'softness', .008), value(f, 'width', .025) * .65) * f.unit;
    if (!s.taper) { stroke(result, tint(f), widthPx, alpha(f), soft, value(f, 'core', .45)); return; }
    var left = [], right = [];
    result.forEach(function(p, i) {
      var a = result[Math.max(0, i - 1)], b = result[Math.min(result.length - 1, i + 1)], an = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      var w = widthPx * VbFxCurves.sample(s.taper, i / (result.length - 1)) * .5;
      left.push({ x: p.x + Math.cos(an) * w, y: p.y + Math.sin(an) * w }); right.push({ x: p.x - Math.cos(an) * w, y: p.y - Math.sin(an) * w });
    });
    ctx.save(); ctx.globalAlpha *= clamp(alpha(f)); ctx.fillStyle = tint(f); ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
    left.slice(1).forEach(function(p) { ctx.lineTo(p.x, p.y); }); right.reverse().forEach(function(p) { ctx.lineTo(p.x, p.y); }); ctx.closePath();
    ctx.save(); ctx.filter = 'blur(' + soft + 'px)'; ctx.fill(); ctx.restore(); ctx.fill(); ctx.restore();
    stroke(result.slice(1, -1), '#fffdf7', Math.max(.2, widthPx * .13), alpha(f) * value(f, 'core', .45), 0, 0);
  }
  function filament(a,b,bend,t,seed,segments){
    var pts=[],dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));
    for(var i=0;i<=segments;i++){var u=i/segments,sway=(noise(u*7+t*2,t,seed)-.5)*bend*Math.sin(u*Math.PI);
      pts.push({x:mix(a.x,b.x,u)-dy/len*sway,y:mix(a.y,b.y,u)+dx/len*sway});}return pts;
  }
  function ribbon(points,thickness,color,opacity,t,seed){
    if(points.length<2||opacity<=0)return;var left=[],right=[];
    for(var i=0;i<points.length;i++){
      var before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],a=Math.atan2(after.y-before.y,after.x-before.x)+Math.PI/2,u=i/(points.length-1),w=thickness*Math.pow(Math.sin(u*Math.PI),.65);
      w*=.65+noise(u*19+t*3,t*4,seed)*.7;left.push({x:points[i].x+Math.cos(a)*w,y:points[i].y+Math.sin(a)*w});right.push({x:points[i].x-Math.cos(a)*w,y:points[i].y-Math.sin(a)*w});
    }
    var mid=points[Math.floor(points.length/2)],an=Math.atan2(points[points.length-1].y-points[0].y,points[points.length-1].x-points[0].x)+Math.PI/2;
    var g=ctx.createLinearGradient(mid.x-Math.cos(an)*thickness,mid.y-Math.sin(an)*thickness,mid.x+Math.cos(an)*thickness,mid.y+Math.sin(an)*thickness);
    [[0,0],[.24,.5],[.47,.9],[.5,1],[.53,.9],[.8,.4],[1,0]].forEach(function(stop){g.addColorStop(stop[0],stop[0]===.5?'#fffdf4':rgba(color,stop[1]));});
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(opacity);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);
    left.slice(1).forEach(function(p){ctx.lineTo(p.x,p.y);});right.reverse().forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.restore();haloStroke(points,color,Math.max(.7,thickness*.1),opacity*.65);
  }
  function drawLineBeam(f){
    var s=f.spec,inset=value(f,'inset',0)*f.unit,x=f.r.left+inset,y=f.r.top+inset,w=f.r.width-inset*2,h=f.r.height-inset*2;
    var points=s.points?s.points.map(function(p){return s.pointSpace==='bounds'?{x:x+p[0]*w,y:y+p[1]*h}:{x:f.p.x+p[0]*f.unit*value(f,'pointScale',1),y:f.p.y+p[1]*f.unit*value(f,'pointScale',1)};}):[f.job.from,s.location==='path'?f.p:curvedPoint(f.job.from,f.p,value(f,'progress',1),(s.pathBend||0)*f.unit,f.job.dir*(f.index%2?1:-1))];
    if(s.pointOffsets)points=points.map(function(p,i){var off=s.pointOffsets[i]||[0,0];return{x:p.x+off[0]*f.unit,y:p.y+off[1]*f.unit};});
    if(s.tailLength!=null){var len0=Math.min(value(f,'tailLength',1)*f.unit,Math.hypot(f.p.x-f.job.from.x,f.p.y-f.job.from.y));points=[{x:f.p.x-Math.cos(f.angle||0)*len0,y:f.p.y-Math.sin(f.angle||0)*len0},f.p];}
    if(s.lateralOffset){var shift0=value(f,'lateralOffset',0)*f.unit;points=points.map(function(p){return{x:p.x-Math.sin(f.angle||0)*shift0,y:p.y+Math.cos(f.angle||0)*shift0};});}
    if(s.geometry==='filament')points=filament(points[0],points[points.length-1],value(f,'noise',0)*f.unit,f.clock*value(f,'filamentClockRate',1),f.seed,value(f,'segments',32));
    if(s.geometry==='sin-wave'){
      var mm0=mote(f.job,f.copy),cx=f.r.left+f.r.width*mm0.delay,cy=f.r.top+f.r.height*mm0.size;points=[{x:cx,y:cy}];
      for(var w0=1;w0<=value(f,'segments',4);w0++)points.push({x:cx+Math.sin(f.copy*value(f,'waveIndexFrequency',2)+w0*value(f,'waveSegmentFrequency',1))*f.r.width*value(f,'waveAmplitude',.13)*w0,y:cy+(w0+value(f,'waveStepOffset',-2))*f.r.height*value(f,'waveStep',.12)});
    }
    if(s.geometry==='radial'){
      var rm=mote(f.job,f.copy+(s.moteOffset||0)),ra=f.copy/f.copies*TAU+rm.angle*value(f,'angleJitter',0)+(hasParameter(s,'rotation')?value(f,'rotation',0)*f.job.dir:0),rl=(value(f,'radius',1)+rm.size*value(f,'radiusSize',0))*dimension(f,s.radiusSpace),rs=value(f,'segments',5),rin=value(f,'innerRadius',0);
      // innerRadius：線を中心からではなく、半径の rin 倍の所から引く（集中線の中心の空き。2026-10-21）。
      points=[rin>0?{x:f.p.x+Math.cos(ra)*rl*rin,y:f.p.y+Math.sin(ra)*rl*rin}:f.p];
      for(var ri=1;ri<=rs;ri++){var jit=(mote(f.job,f.copy*(s.segmentMoteStride||0)+ri+(s.segmentMoteOffset||0)).angle/TAU-.5)*value(f,'segmentJitter',0);if(rin>0){var rr0=rl*(rin+(1-rin)*ri/rs);points.push({x:f.p.x+Math.cos(ra+jit)*rr0,y:f.p.y+Math.sin(ra+jit)*rr0});}else points.push({x:f.p.x+Math.cos(ra+jit)*rl*ri/rs,y:f.p.y+Math.sin(ra+jit)*rl*ri/rs});}
    }
    if(s.geometry==='grid'){
      var ge=s.gridExtent||6,gsp=s.gridSpacing||[.15,.173],go=s.gridOffset||[0,.0866],period=s.gridPeriod||2,gr=value(f,'radius',1)*dimension(f,s.radiusSpace),cell=value(f,'cellRadius',.1)*f.unit,sides=s.cellSides||6;
      for(var gy=-ge;gy<=ge;gy++)for(var gx=-ge;gx<=ge;gx++){var gp={x:f.p.x+(gx*gsp[0]+gx%period*go[0])*f.unit,y:f.p.y+(gy*gsp[1]+gx%period*go[1])*f.unit};if(Math.hypot(gp.x-f.p.x,gp.y-f.p.y)>gr)continue;var poly=[];for(var gi=0;gi<=sides;gi++)poly.push({x:gp.x+Math.cos(gi*TAU/sides)*cell,y:gp.y+Math.sin(gi*TAU/sides)*cell});haloStroke(poly,tint(f),value(f,'width',.5)*(s.widthSpace==='pixel'?1:f.unit),alpha(f),value(f,'core',1));}return;
    }
    if(s.geometry==='trail'){
      points=[];var segments0=value(f,'segments',34),ca=Math.cos(f.angle||0),sa=Math.sin(f.angle||0);
      for(var q=0;q<=segments0;q++){var u0=q/segments0,along0=q*value(f,'tailStep',.048)*f.unit,wave0=(Math.sin(q*value(f,'tailFrequency',.36)+f.clock*value(f,'tailRate',-34)+value(f,'tailPhase',0))*value(f,'tailSway',.168)*u0+value(f,'tailFan',0)*u0)*f.unit;
        points.push({x:f.p.x-ca*along0-sa*wave0,y:f.p.y-sa*along0+ca*wave0});}
    }
    if(s.geometry==='spiral'){
      points=[];var mm=mote(f.job,f.copy+(s.moteOffset||0)),base=f.copy/f.copies*TAU+mm.angle*value(f,'angleJitter',0),reach=value(f,'radius',1)*f.unit*(value(f,'radialBias',1)+mm.size*value(f,'radialSize',0)),count0=value(f,'segments',14);
      for(var q0=0;q0<=count0;q0++){var u1=q0/count0,ang0=base+u1*value(f,'polarTurn',0)*f.job.dir+Math.sin(u1*value(f,'polarFrequency',0)+f.clock*value(f,'polarRate',0))*value(f,'polarWave',0);
        points.push({x:f.p.x+Math.cos(ang0)*reach*u1,y:f.p.y+Math.sin(ang0)*reach*u1});}
    }
    if(s.reverse)points.reverse();
    var lineWidth=value(f,'width',.02)*(s.widthSpace==='pixel'?1:f.unit),opacity=alpha(f);
    if(s.geometry==='branch'){
      var angle1=f.copy/f.copies*TAU+value(f,'rotation',0),length2=value(f,'radius',1)*f.unit,p=f.p,tip={x:p.x+Math.cos(angle1)*length2,y:p.y+Math.sin(angle1)*length2};haloStroke([p,tip],tint(f),lineWidth,opacity);
      for(var br=1;br<=value(f,'branchCount',2);br++){var at={x:p.x+Math.cos(angle1)*length2*br*value(f,'branchSpacing',.33),y:p.y+Math.sin(angle1)*length2*br*value(f,'branchSpacing',.33)},bl=length2*value(f,'branchLength',.28),ba=value(f,'branchAngle',.7);
        haloStroke([at,{x:at.x+Math.cos(angle1+ba)*bl,y:at.y+Math.sin(angle1+ba)*bl}],tint(f),lineWidth*value(f,'branchWidth',.6666666667),opacity*value(f,'branchAlpha',.8888888889));
        haloStroke([at,{x:at.x+Math.cos(angle1-ba)*bl,y:at.y+Math.sin(angle1-ba)*bl}],tint(f),lineWidth*value(f,'branchWidth',.6666666667),opacity*value(f,'branchAlpha',.8888888889));
      }return;
    }
    if(s.strokes){s.strokes.forEach(function(mat){var offset=mat.offset||[0,0],pts=mat.pointOffset?points.map(function(p){return{x:p.x+mat.pointOffset[0]*f.unit,y:p.y+mat.pointOffset[1]*f.unit};}):points;ctx.save();
      if(mat.profile==='halo'){haloStroke(pts,mat.color||tint(f),(mat.width||1)*(mat.widthSpace==='pixel'?1:f.unit),opacity*(mat.alpha==null?1:mat.alpha),mat.core);ctx.restore();return;}
      ctx.globalCompositeOperation=BLENDS[s.blend||'normal'];ctx.globalAlpha=clamp(opacity*(mat.alpha==null?1:mat.alpha));ctx.strokeStyle=mat.color||tint(f);ctx.lineWidth=(mat.width||1)*(mat.widthSpace==='pixel'?1:f.unit);ctx.lineCap=mat.lineCap||'butt';ctx.lineJoin=mat.lineJoin||'miter';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(function(p){ctx.lineTo(p.x,p.y);});if(mat.offset)ctx.translate(offset[0],offset[1]);ctx.stroke();ctx.restore();});return;}
    if(s.strokeProfile==='taper')drawTaper(points,lineWidth,f,opacity);
    else if(s.strokeProfile==='ribbon')ribbon(points,lineWidth,tint(f),opacity,f.clock,s.ribbonSeedFromCopy?f.copy:s.ribbonSeedOffset!=null?f.job.seed+s.ribbonSeedOffset:s.ribbonSeed==null?f.seed:s.ribbonSeed);
    else if(s.strokeProfile==='halo')haloStroke(points,tint(f),lineWidth,opacity,value(f,'core',1));
    else {ctx.save();ctx.globalCompositeOperation=BLENDS[s.blend||'add'];ctx.globalAlpha=clamp(opacity);ctx.lineWidth=lineWidth;ctx.lineCap='round';ctx.strokeStyle=tint(f);
      if(s.stops){var a=s.gradientFrom||[0,0],b=s.gradientTo||[1,1],g=ctx.createLinearGradient(x+a[0]*w,y+a[1]*h,x+b[0]*w,y+b[1]*h);s.stops.forEach(function(stop){g.addColorStop(stop[0],rgba(stop[1],stop[2]*(s.alphaPlacement==='stops'?opacity:1)));});ctx.strokeStyle=g;if(s.alphaPlacement==='stops')ctx.globalAlpha=1;}
      ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.stroke();ctx.restore();}
    for(var j=0;j<value(f,'sparkCount',0);j++){var ph=(f.clock*value(f,'sparkRate',1)+j/value(f,'sparkCount',1)+value(f,'sparkPhase',0))%1,point0=points[Math.min(points.length-1,Math.floor(ph*(points.length-1)))];
      ctx.save();ctx.globalCompositeOperation='lighter';stamp('glow',point0,value(f,'sparkRadius',.07)*f.unit,s.sparkColor||tint(f),opacity*value(f,'sparkAlpha',.7)*Math.sin(ph*Math.PI),0,[1,1],0);ctx.restore();}
  }
  function drawTaper(points,width0,f,opacity){
    if(points.length<2||opacity<=0)return;var left=[],right=[],s=f.spec;
    for(var i=0;i<points.length;i++){var a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2,u=i/(points.length-1),w=width0*(s.taper?VbFxCurves.sample(s.taper,u):Math.pow(1-u,1.25));
      if(s.headRamp&&u<s.headRamp[0])w*=s.headRamp[1]+u/s.headRamp[0]*(1-s.headRamp[1]);
      left.push({x:points[i].x+Math.cos(angle)*w,y:points[i].y+Math.sin(angle)*w});right.push({x:points[i].x-Math.cos(angle)*w,y:points[i].y-Math.sin(angle)*w});}
    var g=ctx.createLinearGradient(points[0].x,points[0].y,points[points.length-1].x,points[points.length-1].y);
    (s.stops||[[0,tint(f),1],[.35,tint(f),.7],[1,tint(f),0]]).forEach(function(stop){g.addColorStop(stop[0],rgba(stop[1],stop[2]));});
    ctx.save();ctx.globalCompositeOperation=BLENDS[s.blend||'add'];ctx.globalAlpha=clamp(opacity);ctx.fillStyle=g;
    var blur=value(f,'softness',0)*f.unit;if(blur)ctx.filter='blur('+blur.toFixed(s.blurPrecision==null?1:s.blurPrecision)+'px)';
    ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);left.slice(1).forEach(function(p){ctx.lineTo(p.x,p.y);});right.reverse().forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawProjectile(f) {
    var s = f.spec, u = value(f, 'progress', f.life), p = pathPoint(f, u), back = pathPoint(f, Math.max(0, u - .01));
    var angle = Math.atan2(p.y - back.y, p.x - back.x), radius = value(f, 'radius', .15) * f.unit;
    var color = tint(f), opacity = alpha(f), rotation = value(f, 'rotation', 0) * f.job.dir + (s.orient === false || s.shape && !s.orient ? 0 : angle);
    // 頭の初期角度だけを範囲乱数で分散する。経路・複製の配置・尾の向きは維持する。
    rotation += VbFxCurves.range(s.headRotation || [0, 0], f.seed, 19);
    if (s.trail) {
      var points = [], steps = s.trail.segments || 24;
      var start = pathPoint(f, 0), traveled = Math.hypot(p.x - start.x, p.y - start.y), len = Math.min(traveled, (s.trail.length || .9) * f.unit);
      for (var i = 0; i <= steps; i++) { var v = i / steps; points.push({ x: p.x - Math.cos(angle) * len * v, y: p.y - Math.sin(angle) * len * v }); }
      ctx.save(); ctx.globalAlpha *= clamp(opacity); paintTrail(points, s.trail, f, color); ctx.restore();
    }
    if (s.shape) drawPath(s.shape, p, radius, color, s.light || f.job.def.light, s.shadow || '#304050', rotation, s.aspect, opacity, 0);
    else if (s.stops && radius > 0) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rotation); ctx.scale((s.aspect || [1, 1])[0], (s.aspect || [1, 1])[1]); radial({ x: 0, y: 0 }, radius, s.stops, opacity); ctx.restore(); }
    else stamp(s.texture || 'plasma-soft', p, radius, color, opacity, rotation, s.aspect, f.copy);
  }
  function drawWave(f) {
    var s = f.spec, job = f.job, progress = value(f, 'progress', f.life), arc = s.arc || [-job.spread, job.spread];
    var count = Math.round(value(f, 'count', 96) * job.particles), widthPx = value(f, 'width', .2) * f.unit;
    var opacity = alpha(f), color = tint(f), fill = value(f, 'fill', 0);
    function reach(angle) {
      if (s.range === 'ray') return rayReach(job, angle);
      if (s.range === 'targets') return Math.max(job.source.height, Math.hypot(f.r.width, f.r.height));
      return s.radius != null || s.curves && s.curves.radius ? value(f, 'radius', 1) * f.unit : job.reach;
    }
    for (var i = 0; i <= count; i++) {
      var u = fill > 0 ? random(i * 7 + 1, f.seed) : i / count, theta = job.angle + mix(arc[0], arc[1], u);
      var lead = reach(theta) * progress, distance = lead * Math.sqrt(1 - fill * random(i * 7 + 2, f.seed));
      var n = noise(Math.cos(theta) * 4 + f.clock * 3, Math.sin(theta) * 4 + i * .12, f.seed);
      distance *= 1 + (n - .5) * value(f, 'noise', .03);
      var drift = (n - .5) * value(f, 'drift', .08) * f.unit;
      var p = { x: job.from.x + Math.cos(theta) * distance - Math.sin(theta) * drift, y: job.from.y + Math.sin(theta) * distance + Math.cos(theta) * drift };
      // 発生直後に全粒が同じ点へ重なって白く潰れるのを防ぐ。広がった面積に応じて密度を保つ。
      var coverage = fill > 0 ? Math.min(1, .12 + lead / Math.max(1, widthPx * Math.sqrt(count) * .65)) : 1;
      stamp(s.texture || 'glow', p, widthPx * (.7 + n * .6), color, opacity * coverage * Math.pow(Math.sin(u * Math.PI), .8), theta + f.clock, [1, 1.25], i);
    }
  }
  function drawFog(f) {
    var s = f.spec, color = tint(f), opacity = alpha(f), mode = s.mode || 'cloud';
    if (mode==='orbit-motes') {
      var t=f.clock,job=f.job,extent=s.extent||[.5,.5],sizeBase=s.extentSpace==='diagonal'?Math.hypot(f.r.width,f.r.height)*(s.scaleBounds===false?1:job.size):f.unit;
      var rx=value(f,'extentX',extent[0])*(s.extentSpace==='bounds'?f.r.width:sizeBase),ry=value(f,'extentY',extent[1])*(s.extentSpace==='bounds'?f.r.height:sizeBase);
      rx+=value(f,'extentBounds',0)*dimension(f,'diagonal');ry+=value(f,'extentBounds',0)*dimension(f,'diagonal');
      var count0=Math.round(value(f,'count',72)*job.particles),range=s.radialRange||[0,1];
      for (var j=0;j<count0;j++) {
        var m=mote(job,j+(s.moteOffset||0)),phase=(m.delay+t*(.3+m.velocity*.4))%1;
        var a=m.angle+t*m.spin*value(f,'spinRate',1.8)*(job.dir||1),radial=range[0]+Math.pow(m.size,s.radialPower==null?.5:s.radialPower)*(range[1]-range[0]);
        var x=f.p.x+Math.cos(a)*rx*radial+(noise(j*.3,t*3,job.seed)-.5)*rx*.13;
        var y=f.p.y+Math.sin(a)*ry*radial+(noise(j*.3+9,t*3,job.seed)-.5)*ry*.13;
        var size=Math.min(rx,ry)*(.19+m.velocity*.27)*value(f,'scale',1),al=(.5+.5*Math.sin(phase*Math.PI))*(.26+.44*m.size)*opacity;
        stamp(s.texture||'smoke',{x:x,y:y},size,color,al,a+phase*3,[1,1],j);
      }
      return;
    }
    if (mode === 'veil' || mode === 'radial') {
      var gradient, radius = value(f, 'radius', .65) * f.unit, a = s.gradientFrom || [0, -.5], b = s.gradientTo || [0, .5];
      if (mode === 'radial') gradient = ctx.createRadialGradient(f.p.x, f.p.y, 0, f.p.x, f.p.y, Math.max(.1, radius));
      else {
        var angle = value(f, 'rotation', 0) * f.job.dir, ca = Math.cos(angle), sa = Math.sin(angle);
        gradient = ctx.createLinearGradient(f.p.x + (a[0]*ca-a[1]*sa) * f.unit, f.p.y + (a[0]*sa+a[1]*ca) * f.unit, f.p.x + (b[0]*ca-b[1]*sa) * f.unit, f.p.y + (b[0]*sa+b[1]*ca) * f.unit);
      }
      var stops = s.stops || [[0, color, .55], [.65, color, .22], [1, color, 0]];
      stops.forEach(function (stop) { gradient.addColorStop(stop[0], rgba(s.palette ? color : stop[1], stop[2])); });
      ctx.save(); ctx.globalAlpha *= clamp(opacity); ctx.fillStyle = gradient;
      if (roundedPath(f.r, 0)) ctx.fill(); ctx.restore(); return;
    }
    var extent = s.extent || [.4, .6], flow = s.flow || [0, -.04], count = Math.round(value(f, 'count', 72) * f.job.particles);
    for (var i = 0; i < count; i++) {
      var arc = s.arc || [0, TAU], seconds = f.clock * f.job.def.ms / 1000;
      var an = mix(arc[0], arc[1], random(i * 5, f.seed)) + seconds * value(f, 'orbitSpeed', 0) * f.job.dir, rad = mix(value(f, 'rim', 0), 1, Math.sqrt(random(i * 5 + 1, f.seed)));
      var x = Math.cos(an) * extent[0] * rad, y = Math.sin(an) * extent[1] * rad;
      x = ((x + extent[0] + flow[0] * seconds) % (extent[0] * 2) + extent[0] * 2) % (extent[0] * 2) - extent[0];
      y = ((y + extent[1] + flow[1] * seconds) % (extent[1] * 2) + extent[1] * 2) % (extent[1] * 2) - extent[1];
      var n = noise(i * .37, seconds * .35, f.seed), radiusPx = value(f, 'radius', .2) * f.unit * (.6 + n * .7);
      var angle = value(f, 'rotation', 0) * f.job.dir, ca = Math.cos(angle), sa = Math.sin(angle), drift = (n-.5)*value(f, 'noise', .03);
      stamp(s.texture || 'smoke', { x: f.p.x + (x*ca-y*sa+drift) * f.unit, y: f.p.y + (x*sa+y*ca+drift) * f.unit }, radiusPx, color, opacity * (.3 + .25 * n), an + seconds * .3 * f.job.dir, s.aspect || [1, 1.3], i);
    }
  }
  function drawShape(f) {
    var s = f.spec, p = f.p;
    if (s.anchor === 'path'&&s.location!=='path') {
      var q = curvedPoint(f.job.from, f.pathEnd, value(f, 'progress', f.life), (s.pathBend || 0) * f.unit, f.job.dir * (f.index % 2 ? -1 : 1));
      p = { x: q.x + f.p.x - f.pathEnd.x, y: q.y + f.p.y - f.pathEnd.y };
    }
    var rotation = value(f, 'rotation', 0) * f.job.dir;
    if(s.align==='trajectory')rotation+=f.angle||0;
    if (s.align === 'tangent') rotation += f.copy / f.copies * TAU + Math.PI / 2;
    // 軸ごとの倍率は形状のローカル座標へ適用。未指定の旧定義には従来のaspectをそのまま渡す。
    var aspect = s.aspect;
    if (hasParameter(s, 'scaleX') || hasParameter(s, 'scaleY') || s.modulation && (s.modulation.scaleX || s.modulation.scaleY)) {
      aspect = [(aspect ? aspect[0] : 1) * value(f, 'scaleX', 1), (aspect ? aspect[1] : 1) * value(f, 'scaleY', 1)];
    }
    drawPath(s.shape, p, value(f, 'radius', .3) * f.unit, tint(f), s.light || f.job.def.light, s.shadow || '#304050', rotation, aspect, alpha(f), value(f, 'stroke', 0) * f.unit,s.variant==null?f.copy:s.variant);
  }
  function drawFlash(f) {
    if(alpha(f)<=0)return;
    ctx.save(); ctx.globalAlpha *= f.spec.alphaPlacement==='stops'?1:clamp(alpha(f));
    var s=f.spec;
    if(s.texture){ctx.drawImage(texture(s.texture,tint(f),s.variant||0),f.r.left,f.r.top,f.r.width,f.r.height);ctx.restore();return;}
    if(s.gradient){
      var gx=s.gradientSpace==='unit'?f.unit:f.r.width,gy=s.gradientSpace==='unit'?f.unit:f.r.height;
      var a=s.gradientFrom||[0,0],b=s.gradientTo||[1,1],sx=value(f,'startX',a[0]),sy=value(f,'startY',a[1]),ex=value(f,'endX',b[0]),ey=value(f,'endY',b[1])+value(f,'endTintY',0)*value(f,'tint',0);
      var sweep=1;if(s.sweepRate){var ph=(f.clock*s.sweepRate)%1,window0=s.sweepWindow||1;if(ph>=window0){ctx.restore();return;}var u=ph/window0,range=s.sweepRange||[0,1];sx+=mix(range[0],range[1],u);ex+=mix(range[0],range[1],u);sweep=Math.sin(u*Math.PI);}
      var g0=s.gradient==='radial'?ctx.createRadialGradient(f.p.x+sx*gx,f.p.y+sy*gy,value(f,'innerRadius',0)*dimension(f,s.innerRadiusSpace||s.radiusSpace),f.p.x+ex*gx,f.p.y+ey*gy,Math.max(s.minRadiusPx||0,value(f,'radius',1)*dimension(f,s.radiusSpace))):ctx.createLinearGradient(f.r.left+sx*gx,f.r.top+sy*gy,f.r.left+ex*gx,f.r.top+ey*gy);
      var depth=value(f,'tint',0);(s.stops||[[0,tint(f),1],[1,tint(f),0]]).forEach(function(stop,i){var col=stop[1],al=stop[2],dark=s.darkStops&&s.darkStops[i];
        if(dark){col=VbFxCurves.gradientColor([[0,col],[1,dark[1]]],depth);al=mix(al,dark[2],depth);}
        var ap=s.stopAlpha&&s.stopAlpha[i];if(ap){if(ap.range)al=mix(ap.range[0],ap.range[1],depth);if(ap.intro)al*=f.intro;if(ap.modulation)al=modulated(f,ap.modulation,al);}
        g0.addColorStop(stop[0],rgba(col,al*(s.alphaPlacement==='stops'?alpha(f):1)));});ctx.fillStyle=g0;ctx.globalAlpha*=sweep;
      var pad=value(f,'pad',0)*f.unit;
      if(s.geometry==='card'){framePath(f.r,pad);ctx.fill();}
      else if(s.geometry==='square'){var fr=value(f,'fillRadius',1)*dimension(f,s.radiusSpace);ctx.fillRect(f.p.x-fr,f.p.y-fr,fr*2,fr*2);}
      else {var fp=value(f,'fillPad',0)*f.unit;ctx.fillRect(f.r.left-fp,f.r.top-fp,f.r.width+fp*2,f.r.height+fp*2);}
      ctx.restore();return;
    } else if (s.stops) {
      var g = ctx.createLinearGradient(f.r.left, f.r.top, f.r.right, f.r.bottom);
      f.spec.stops.forEach(function(stop){g.addColorStop(stop[0], rgba(stop[1], stop[2]));}); ctx.fillStyle = g;
    } else ctx.fillStyle = tint(f);
    ctx.fillRect(f.r.left, f.r.top, f.r.width, f.r.height); ctx.restore();
  }
  function base(job, r, index) {
    if (index >= 0 && job.targets[index] && job.targets[index].element === r.element) return { transform: job.baseTransforms[index], filter: job.baseFilters[index], scale: job.domScales[index] || 1 };
    return job.baselines.get(r.element) || { transform: '', filter: '', scale: 1 };
  }
  function drawCard(f) {
    var s = f.spec, el = f.r.element, job = f.job; if (!el) return;
    // 2026-10-12: 汎用のカード残像。元DOM・数値・既存card部品の復元経路に触れない。
    if(s.echo){
      if(!job.echoes)job.echoes={};var key=f.layer+':'+f.index+':'+f.copy,node=job.echoes[key];
      if(!node){
        var original=s.artOnly&&(el.querySelector('.unit-portrait, .art'))||el;
        node=original.cloneNode(true);prepareClone(el,node);node.removeAttribute('id');
        if(s.artOnly&&original!==el){var artStyle=getComputedStyle(original);node.className='';
          ['backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','objectFit','borderRadius','clipPath'].forEach(function(k){if(artStyle[k])node.style[k]=artStyle[k];});}
        // 黒地のJPEGもファイルを加工せず、輝度を透明度へ写して体の形だけを残す。
        // Canvasの画素読み出しを使わないためfile://でも同じSVGフィルタを使える。
        if(s.lumaMask){
          var mask=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','svg'):document.createElement('svg');
          var maskId='vb-fx-luma-'+job.id+'-'+f.layer+'-'+f.index+'-'+f.copy,c=tint(f),rgb=[1,3,5].map(function(at){return parseInt(c.slice(at,at+2),16)/255;});
          mask.setAttribute('width','0');mask.setAttribute('height','0');mask.setAttribute('aria-hidden','true');
          mask.innerHTML='<defs><filter id="'+maskId+'" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 '+rgb[0]+' 0 0 0 0 '+rgb[1]+' 0 0 0 0 '+rgb[2]+' .2126 .7152 .0722 0 0"/><feComponentTransfer><feFuncA type="gamma" amplitude="'+value(f,'lumaGain',1)+'" exponent="'+value(f,'lumaExponent',1)+'" offset="0"/></feComponentTransfer></filter></defs>';
          root.appendChild(mask);job.nodes.push(mask);node._vbFxMask='url(#'+maskId+') ';
        }
        node.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
        node.querySelectorAll('[data-vb-fx-local], .unit-stat-overlay-layer, .unit-shield-layer, .stats-overlay, .stats, .slot-stats, .slot-name, .slot-keywords, .name, .card-caption').forEach(function(n){n.remove();});
        Object.assign(node.style,{position:'fixed',margin:'0',pointerEvents:'none',transition:'none',visibility:'visible',zIndex:'1',transformOrigin:'center'});
        root.appendChild(node);job.nodes.push(node);job.echoes[key]=node;
      }
      var scale=value(f,'scale',1);
      Object.assign(node.style,{left:f.p.x+curShift.x+'px',top:f.p.y+curShift.y+'px',width:f.r.width+'px',height:f.r.height+'px',
        opacity:String(clamp(value(f,'opacity',1)*alpha(f)*f.opacity)),transform:'translate(-50%,-50%) translate('+value(f,'x',0)*f.unit+'px,'+value(f,'y',0)*f.unit+'px) scale('+scale+')',
        filter:(node._vbFxMask||'')+'brightness('+value(f,'brightness',1)+') saturate('+value(f,'saturation',1)+') grayscale('+value(f,'grayscale',0)+')',mixBlendMode:s.blend==='add'?'screen':s.blend||'normal'});
      return;
    }
    var b = base(job, f.r, f.index), x = value(f, 'x', 0) * f.unit, y = value(f, 'y', 0) * f.unit;
    var move = value(f, 'move', 0), target = job.targets[Math.min(f.index + 1, job.targets.length - 1)] || f.r;
    if (s.moveTo === 'source') target = job.source;
    if (s.moveTo === 'screen-left') x -= width * move;
    else if (s.moveTo) { var p = point(target), origin = point(f.r); x += (p.x - origin.x) * move; y += (p.y - origin.y) * move; }
    var hasTransform = s.mirror || s.moveTo || ['x', 'y', 'scale', 'move', 'rotation'].some(function(key) { return hasParameter(s, key); });
    // 拡大も記録し、followMove の層（枠の線など）がカードの拡大に合わせて広がるようにする（2026-10-21 利用者指摘：神速の指輪の枠の光がカードの動きとずれる）。
    if (hasTransform) job.moves.set(el, { x: x, y: y, scale: hasParameter(s, 'scale') ? value(f, 'scale', 1) : 1 });
    if (hasParameter(s, 'opacity')) setStyle(job, el, 'opacity', String(value(f, 'opacity', 1)));
    var hasFilter = ['brightness', 'saturation', 'grayscale', 'sepia', 'hue', 'contrast', 'blur'].some(function (key) { return hasParameter(s, key); });
    if(hasFilter && s.filterOrder){
      var filterText=b.filter,filterNames={brightness:'brightness',saturation:'saturate',grayscale:'grayscale',sepia:'sepia',hue:'hue-rotate',contrast:'contrast',blur:'blur'};
      s.filterOrder.forEach(function(key){var num=value(f,key,['brightness','saturation','contrast'].indexOf(key)>=0?1:0);
        if(key==='blur')num*=s.blurSpace==='pixel'?1:f.unit/b.scale;
        filterText+=' '+filterNames[key]+'('+num+(key==='hue'?'deg':key==='blur'?'px':'')+')';});
      setStyle(job,el,'filter',filterText);
    } else if (hasFilter) setStyle(job, el, 'filter', b.filter + ' brightness(' + value(f, 'brightness', 1) + ') saturate(' + value(f, 'saturation', 1) + ') grayscale(' + value(f, 'grayscale', 0) + ') sepia(' + value(f, 'sepia', 0) + ') hue-rotate(' + value(f, 'hue', 0) + 'deg) contrast(' + value(f, 'contrast', 1) + ') blur(' + value(f, 'blur', 0) * f.unit / b.scale + 'px)');
    var transform = b.transform + ' translate(' + x / b.scale + 'px,' + y / b.scale + 'px) rotate(' + value(f, 'rotation', 0) * job.dir + 'rad) scale(' + (s.mirror ? -1 : 1) * value(f, 'scale', 1) + ',' + value(f, 'scale', 1) + ')';
    if (s.scaleProperty) setStyle(job,el,'scale',String(s.scaleWhenVisible&&value(f,'opacity',1)<=0?1:value(f,'scale',1)));
    else if (hasTransform) setStyle(job, el, 'transform', transform);
    if (s.transition) setStyle(job, el, 'transition', s.transition);
    if (s.zIndex != null) setStyle(job, el, 'z-index', String(s.zIndex));
    if (hasParameter(s, 'dissolve')) {
      var progress = value(f, 'dissolve', 0), grid = value(f, 'grid', 24), cells = [];
      for (var row = 0; row < grid; row++) for (var col = 0; col < grid; col++) if (VbFxCurves.hash(col, row, job.seed) >= progress) cells.push('<rect x="' + col + '" y="' + row + '" width="1.05" height="1.05"/>');
      // 2026-10-12指定・撮影第3回: 指定した層だけ縦長カード全面へマスクを伸ばす。未指定の既存効果は保持。
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + grid + ' ' + grid + '"' + (s.dissolveFit === 'stretch' ? ' preserveAspectRatio="none"' : '') + '>' + cells.join('') + '</svg>';
      setStyle(job, el, 'mask-image', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'); setStyle(job, el, 'mask-size', '100% 100%');
    }
    if (s.art) setStyle(job, el, 'background-image', 'url("' + new URL(VbFxTextures.sprites[s.art].path, assetBase).href + '")');
  }
  function drawShake(f) {
    var job = f.job, el = f.spec.anchor === 'board' ? job.board : f.r.element; if (!el) return;
    var strength = f.spec.strength || [.03, .015], hz = f.spec.frequencyHz || [18, 24], seconds = f.spec.timeSpace==='normalized'?f.clock:f.clock * job.ms / 1000;
    var scale = el === job.board ? job.boardScale || 1 : base(job, f.r, f.index).scale;
    var amount = alpha(f) * settings.shake * f.unit / scale;
    var x=Math.sin(seconds*hz[0]*TAU)*strength[0]*amount,y=Math.cos(seconds*hz[1]*TAU)*strength[1]*(f.spec.coupled?x:amount);
    if(f.spec.property==='transform'){setStyle(job,el,'transform',base(job,f.r,f.index).transform+' translate('+x+'px,'+y+'px) scale('+value(f,'scale',1)+')');setStyle(job,el,'transition','none');}
    else setStyle(job, el, 'translate', x + 'px ' + y + 'px');
  }
  function drawSprite(f) {
    var s = f.spec, job = f.job, resource = VbFxTextures.sprites[s.texture], key = f.layer + ':' + f.index + ':' + f.copy, node = job.sprites[key];
    if (!node) {
      node = document.createElement(resource.columns ? 'div' : 'img');
      var url = new URL(resource.path, assetBase); url.searchParams.set('vblab', job.id);
      if (resource.columns) Object.assign(node.style, { backgroundImage: 'url("' + url.href + '")', backgroundSize: resource.columns * 100 + '% 100%', backgroundRepeat: 'no-repeat' });
      else { node.src = url.href; node.alt = ''; node.addEventListener('error', function () { job.assetErrors.push(resource.path); }); }
      Object.assign(node.style, { position: 'fixed', pointerEvents: 'none', objectFit: 'contain', transform: 'translate(-50%,-50%)' });
      root.appendChild(node); job.nodes.push(node); job.sprites[key] = node;
    }
    var scale = value(f, 'scale', 1);
    Object.assign(node.style, { left: f.p.x + curShift.x + 'px', top: f.p.y + curShift.y + 'px', width: (f.r.width+2*value(f,'pad',0)*f.unit) * scale + 'px', height: (f.r.height+2*value(f,'pad',0)*f.unit) * scale + 'px', opacity: String(clamp(alpha(f) * f.opacity)), transform: 'translate(-50%,-50%)'+(s.mirror?' scaleX(-1)':''), mixBlendMode: s.blend === 'add' ? 'screen' : s.blend || 'normal' });
    if (resource.columns) node.style.backgroundPosition = Math.floor(value(f, 'frame', f.life) * (resource.columns - 1)) * 100 / (resource.columns - 1) + '% center';
    var glow = value(f, 'glow', 0); node.style.filter = glow ? 'drop-shadow(0 0 ' + glow * (s.glowSpace==='pixel'?1:f.unit) + 'px ' + tint(f) + ')' : '';
  }
  var painters = { particles: drawParticles, ring: drawRing, glow: drawGlow, beam: drawBeam, projectile: drawProjectile, wave: drawWave, fog: drawFog, shape: drawShape, flash: drawFlash, card: drawCard, shake: drawShake, sprite: drawSprite };
  function anchors(s, job) {
    var rects;
    if (s.anchor === 'each-target' || s.anchor === 'path') rects = job.targets;
    else if (s.anchor === 'target') rects = job.targets.slice(0, 1);
    else if (s.anchor === 'source') rects = [job.source];
    else if(s.anchor==='viewport')rects=[{left:0,top:0,right:width,bottom:height,width:width,height:height}];
    else if (s.anchor === 'board') {
      var b = job.board && job.board.getBoundingClientRect ? job.board.getBoundingClientRect() : { left: 0, top: 0, width: width, height: height };
      rects = [{ left: b.left - curShift.x, top: b.top - curShift.y, width: b.width, height: b.height, right: b.left + b.width - curShift.x, bottom: b.top + b.height - curShift.y }];
    } else if (s.anchor === 'targets' && job.targetsBox) rects = [job.targetsBox];  // 呼び出し側が範囲を決めた時（全体攻撃の最大の大きさ）
    else { rects = job[s.anchor] || []; rects = rects.length ? [box(rects)] : []; }
    return rects.map(function (r, index) { return { rect: r, index: index }; }).filter(function (entry) { return !s.indices || s.indices.indexOf(entry.index) >= 0; });
  }
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

  function draw(job, t) {
    job.moves.clear();
    var effect = job.def.loop ? t % 1 : t, intro = job.def.intro ? VbFxCurves.sample(job.def.intro, t) : 1;
    var ordered=[];
    for(var next=0;next<job.def.layers.length;){
      var first=next,firstLayer=job.def.layers[first],group=firstLayer.pass==null?firstLayer.batch:'p'+firstLayer.pass;
      if(group==null){var one=job.def.layers[next];anchors(one,job).forEach(function(entry){ordered.push({spec:one,layer:first,entry:entry});});next++;continue;}
      while(next<job.def.layers.length&&(job.def.layers[next].pass==null?job.def.layers[next].batch:'p'+job.def.layers[next].pass)===group)next++;
      var anchorNames=[];job.def.layers.slice(first,next).forEach(function(s){if(anchorNames.indexOf(s.anchor)<0)anchorNames.push(s.anchor);});
      anchorNames.forEach(function(anchor){
        var list=[];for(var i=first;i<next;i++)if(job.def.layers[i].anchor===anchor)list.push(i);
        anchors(job.def.layers[list[0]],job).forEach(function(entry){list.forEach(function(layer){var s=job.def.layers[layer];if(!s.indices||s.indices.indexOf(entry.index)>=0)ordered.push({spec:s,layer:layer,entry:entry});});});
      });
    }
    function renderItem(item) {
      var s=item.spec,layerIndex=item.layer,entry=item.entry;
        var origin = s.at === 'impact' ? job.hitAt[Math.min(entry.index, job.hitAt.length - 1)] || 0 : 0;
        if(s.targetSpread)origin+=s.targetSpread*entry.index/Math.max(1,job.targets.length-1);
        if (s.at === 'reveal') origin = (job.summonMs || 0) / job.ms;
        var time = s.time || [0, 1];
        // 再生ごとに出る時刻をずらす（2026-10-21 利用者指摘：スキュラのしずくにランダム性がない）。乱数は再生の種から。
        if (s.timeJitter) { var tj = (random(7, job.seed + (s.seedOffset == null ? layerIndex * 29 : s.seedOffset) + entry.index * 37) - .5) * 2 * s.timeJitter; time = [clamp(time[0] + tj), clamp(time[1] + tj)]; if (time[1] - time[0] < .02) time = s.time; }
        var delay = s.playbackDelay ? Math.min(s.playbackDelay.maxMs / job.ms, s.playbackDelay.maxRatio) : 0;
        var clock = t - origin - time[0] - delay, length = time[1] - time[0];
        if (clock < 0&&!s.prewarmTransform || s.startExclusive&&clock===0 || !job.def.loop && t > origin + time[1]) return;
        if(s.endExclusive&&!job.def.loop&&t>=origin+time[1])return;
        if (s.playbackDuration) length = Math.max(.000001, Math.min(s.playbackDuration.maxMs / job.ms, s.playbackDuration.maxRatio, s.endAtEffectEnd?1-origin:1));
        if(s.playbackDurationMode==='remaining')length=Math.max(1/job.ms,(s.remainingRatio||1)-delay);
        if(!job.def.loop && s.playbackDuration && clock>length && !s.holdEnd)return;
        var life = job.def.loop ? (clock / (s.cycle || length)) % 1 : clamp(clock / length);
        var r = entry.rect, unit = (s.basis === 'bounds' ? Math.max(r.width, r.height) : s.basis==='unit'?job.source.width:job.source.height) * job.size;
        var f = { job: job, spec: s, layer: layerIndex, index: entry.index, copy: 0, copies: 1, r: r, unit: Math.max(.1, unit), clock: clock, life: life, effect: effect, absoluteEffect:t,intro:intro, seed: job.seed + layerIndex * 113 + entry.index * 37 };
        var copies = value(f, 'copies', 1);
        for (var i = 0; i < copies; i++) {
          var copyClock = clock - i * value(f, 'copyDelay', 0); if (copyClock < 0 && !(s.type === 'card' && s.prewarmTransform)) continue;
          f.copy = i; f.copies = copies; f.clock = copyClock;
          f.life = job.def.loop ? (copyClock / (s.cycle || length)) % 1 : clamp(copyClock / length);
          if(hasParameter(s,'cycles')){var cycles=value(f,'cycles',1);f.life=copyClock>=length?1:(Math.max(0,copyClock)*cycles/length)%1;}
          f.seed = s.seedOffset==null?job.seed + layerIndex * 113 + entry.index * 37 + i * 101:job.seed+s.seedOffset+entry.index*(s.targetSeedStride||0);
          if(s.continuous||s.curveTime==='continuous') f.life=copyClock/length;
          if(s.curveTime==='effect') f.life=effect;
          f.clock=(s.clockSpace==='life'?copyClock/length:copyClock)*(s.clockRate==null?1:s.clockRate)+(s.clockOffset||0);
          var center = point(r), off = s.offset || [0, 0], dx = off[0]*(s.offsetSpace==='bounds'?r.width:f.unit),dy=off[1]*(s.offsetSpace==='bounds'?r.height:f.unit);
          if(s.location==='source')center=job.from;
          if(s.location==='path'){
            var progress0=value(f,'pathProgress',f.life),sign0=(entry.index*(s.pathIndexStride==null?1:s.pathIndexStride)+(s.pathIndexOffset||0))%2?1:-1;
            var pathStart=job.from,fo=s.pathFromOffset||[0,0],fc=s.pathFromClamp||[32,32];
            if(s.pathFrom==='screen-top')pathStart={x:center.x+Math.sign(fo[0])*Math.min(Math.abs(fo[0])*f.unit,width*fc[0]),y:Math.sign(fo[1])*Math.min(Math.abs(fo[1])*f.unit,height*fc[1])};
            var bend0=(s.pathBend||0)*f.unit,previous0=curvedPoint(pathStart,center,clamp(progress0-(s.pathSampleStep||.015)),bend0,sign0*job.dir),pathEnd0=center;
            center=curvedPoint(pathStart,center,progress0,bend0,sign0*job.dir);f.angle=s.pathAngle==='chord'?Math.atan2(pathEnd0.y-pathStart.y,pathEnd0.x-pathStart.x):Math.atan2(center.y-previous0.y,center.x-previous0.x);
          }
          var followScale = 1;
          if (s.followMove && r.element && job.moves.has(r.element)) { var move = job.moves.get(r.element); dx += move.x; dy += move.y; followScale = move.scale || 1; }
          if (s.layout === 'orbit') { var angle = i / copies * TAU + value(f, 'rotation', 0) * (s.directedOrbit===false?1:job.dir); dx += Math.cos(angle) * value(f, 'orbit', .5) * dimension(f,s.orbitSpace); dy += Math.sin(angle) * value(f, 'orbit', .5) * dimension(f,s.orbitSpace); }
          if (s.layout === 'line') { var spread = s.spread || [.1, 0]; dx += (i - (copies - 1) / 2) * spread[0] * f.unit; dy += (i - (copies - 1) / 2) * spread[1] * f.unit; }
          var jitter = value(f, 'jitter', 0);
          if (jitter) { dx += (random(i * 3, f.seed) - .5) * jitter * f.unit; dy += (random(i * 3 + 1, f.seed) - .5) * jitter * f.unit; }
          f.copyOffset = { x: dx - off[0] * f.unit, y: dy - off[1] * f.unit };
          f.p = { x: center.x + dx + value(f, 'shiftX', 0) * f.unit, y: center.y + dy + value(f, 'shiftY', 0) * f.unit }; f.pathEnd = center;
          if(hasParameter(s,'forwardOffset')){f.p.x+=Math.cos(job.angle)*value(f,'forwardOffset',0)*f.unit;f.p.y+=Math.sin(job.angle)*value(f,'forwardOffset',0)*f.unit;}
          f.r = { left: r.left + dx, top: r.top + dy, width: r.width, height: r.height, right: r.left + dx + r.width, bottom: r.top + dy + r.height, element: r.element };
          if (followScale !== 1) { var fw = r.width * followScale, fh = r.height * followScale, fcx = f.r.left + r.width / 2, fcy = f.r.top + r.height / 2;
            f.r = { left: fcx - fw / 2, top: fcy - fh / 2, width: fw, height: fh, right: fcx + fw / 2, bottom: fcy + fh / 2, element: r.element }; }
          // 2026-10-12指定: 色付きの対象光が、座標更新後も元カードの色を読む。
          if (r.color) f.r.color = r.color;
          f.opacity = (s.intrinsicAlpha?1:intro) * (i ? value(f, 'copyAlpha', 1) : 1);
          ctx.save(); ctx.globalAlpha *= f.opacity;
          var defaultBlend = s.type === 'fog' || s.type === 'shape' || s.texture === 'smoke' || s.texture === 'stone' ? 'normal' : 'add';
          ctx.globalCompositeOperation = BLENDS[s.blend || defaultBlend];
          if(s.clip==='card'){
            var clipRect=s.clipFollowOffset===false?r:f.r;
            if(s.clipGeometry==='rect'){ctx.beginPath();ctx.rect(clipRect.left,clipRect.top,clipRect.width,clipRect.height);ctx.clip();}
            else if(s.clipRadius!=null){framePath(clipRect,(s.clipPad||0)*f.unit);ctx.clip();}
            else if(roundedPath(clipRect,0))ctx.clip();
          }
          var softness = value(f, 'softness', 0);
          if (softness && ['ring','beam'].indexOf(s.type)<0) {var blur0=softness*f.unit;ctx.filter='blur('+(s.blurPrecision==null?blur0:blur0.toFixed(s.blurPrecision))+'px)';}
          if (s.mirror && ['card','shake','sprite'].indexOf(s.type)<0) {ctx.translate(f.p.x,f.p.y);ctx.scale(-1,1);ctx.translate(-f.p.x,-f.p.y);}
          try { painters[s.type](f); } finally { ctx.restore(); }
        }
    }
    for(var itemIndex=0;itemIndex<ordered.length;){
      var current=ordered[itemIndex],composite=(job.def.composites||[]).find(function(c){return c.batch===current.spec.batch;});
      if(!composite){renderItem(current);itemIndex++;continue;}
      var segment=[],ref=current.entry;while(itemIndex<ordered.length&&ordered[itemIndex].spec.batch===current.spec.batch&&ordered[itemIndex].entry===ref)segment.push(ordered[itemIndex++]);
      if(!segment.some(function(item){var sp=item.spec,at=sp.at==='impact'?job.hitAt[Math.min(item.entry.index,job.hitAt.length-1)]||0:sp.at==='reveal'?(job.summonMs||0)/job.ms:0,time1=sp.time||[0,1],delay1=sp.playbackDelay?Math.min(sp.playbackDelay.maxMs/job.ms,sp.playbackDelay.maxRatio):0;
        var clock1=t-at-time1[0]-delay1,length1=time1[1]-time1[0];if(clock1<0||!job.def.loop&&(t>at+time1[1]||sp.endExclusive&&t>=at+time1[1]))return false;
        if(sp.playbackDuration)length1=Math.min(sp.playbackDuration.maxMs/job.ms,sp.playbackDuration.maxRatio,sp.endAtEffectEnd?1-at:1);
        return job.def.loop||!sp.playbackDuration||sp.holdEnd||clock1<=length1;}))continue;
      var rr=ref.rect,cp=point(rr),firstSpec=current.spec,origin0=firstSpec.at==='impact'?job.hitAt[Math.min(ref.index,job.hitAt.length-1)]||0:0;
      var time0=firstSpec.time||[0,1],length0=time0[1]-time0[0];
      if(firstSpec.playbackDuration)length0=Math.max(.000001,Math.min(firstSpec.playbackDuration.maxMs/job.ms,firstSpec.playbackDuration.maxRatio,firstSpec.endAtEffectEnd?1-origin0:1));
      var cf={job:job,spec:Object.assign({type:'glow'},composite),unit:job.unit,r:rr,p:cp,seed:job.seed,clock:t-origin0,life:clamp((t-origin0-time0[0])/length0),effect:effect,absoluteEffect:t,intro:intro};
      var repeat=value(cf,'copies',1);
      for(var ci=0;ci<repeat;ci++){
        ctx.save();if(ci)ctx.globalAlpha=value(cf,'copyAlpha',1);
        var renderSegment=function(){segment.forEach(renderItem);};
        if(composite.mode==='radial')softLayer(cp.x,cp.y,Math.max(composite.minRadiusPx||0,value(cf,'radius',1)*dimension(cf,composite.radiusSpace)+value(cf,'radiusBounds',0)*dimension(cf,composite.radiusBoundsSpace||'diagonal')),composite.forward||composite.angleForward?job.angle:composite.angle||0,composite.forward?job.spread:composite.halfArc||0,renderSegment,BLENDS[composite.blend||'add']);
        else if(composite.mode==='blur')blurLayer((composite.blur||0)*job.unit,renderSegment,BLENDS[composite.blend||'normal']);
        else renderSegment();
        ctx.restore();
      }
    }
  }
  function play(name, options) {
    return new Promise(function (resolve, reject) {
      var def = lookup[name], job;
      try {
        if (!def) throw new Error('VbFx: 未知の演出 ' + name);
        options = options || {};
        if (options.durationMs != null && (!Number.isFinite(options.durationMs) || options.durationMs <= 0 || options.durationMs > 30000)) throw new TypeError('VbFx: durationMs は0超〜30000msの有限数');
        if (options.endRatio != null && (!Number.isFinite(options.endRatio) || options.endRatio <= 0 || options.endRatio > 1)) throw new TypeError('VbFx: endRatio は0超〜1の有限数');
        ensureLayer();
        if (options.repeat) def = Object.assign({}, def, { loop: true });
        var allies = (options.allies || []).filter(Boolean).map(normalize), enemies = (options.enemies || []).filter(Boolean).map(normalize);
        var targets = (options.targets || []).filter(Boolean).map(normalize), side = options.side === 'enemy' ? 'enemy' : 'ally';
        var source = normalize(options.source) || targets[0] || (side === 'ally' ? allies[0] : enemies[0]);
        if (!source) source = { left: width / 2 - 40, top: side === 'ally' ? height * .8 : height * .2, width: 80, height: 120 };
        if (options.followGeometry && source.element) {
          var pose = hostGeometry(source.element);
          source = Object.assign({}, source, { left: pose.cx - pose.w / 2, top: pose.cy - pose.h / 2,
            width: pose.w, height: pose.h, right: pose.cx + pose.w / 2, bottom: pose.cy + pose.h / 2 });
        }
        if(!targets.length){
          if(def.defaultTargets==='opponents')targets=(side==='ally'?enemies:allies).slice();
          else if(def.defaultTargets==='allies')targets=(side==='ally'?allies:enemies).slice();
          else if(def.defaultTargets==='source')targets=[source];
        }
        // 同じカードに同じ状態が出ていれば、新しく重ねない（2026-10-06 利用者指定）。
        // 結界・毒は値（options.value）で重ね数・濃さが決まるので、出ている表示の値だけを更新する。
        var sameState = def.loop && targets[0] && targets[0].element && jobs.find(function (other) {
          return !other.done && other.def.name === def.name && other.targets[0] && other.targets[0].element === targets[0].element; });
        if (sameState) {
          if (def.stackable && options && options.value != null) sameState.value = Math.max(1, Number(options.value) || 1);
          resolve({ name: def.name, cancelled: false, impacts: 0, assetErrors: [], looping: true, skipped: true, updated: !!def.stackable }); return;
        }
        if (options.impactTimesMs != null && (!Array.isArray(options.impactTimesMs) || options.impactTimesMs.length !== targets.length
          || options.impactTimesMs.some(function (ms) { return !Number.isFinite(ms) || ms < 0; }))) throw new TypeError('VbFx: impactTimesMs は対象数ぶんの0以上の有限数');
        if(options.cueTimesMs!=null&&(!Array.isArray(options.cueTimesMs)||options.cueTimesMs.length>128||options.cueTimesMs.some(function(ms){return !Number.isFinite(ms)||ms<0;})))throw new TypeError('VbFx: cueTimesMs は0以上の有限数配列（最大128）');
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
        var speed = clamp(Number(options.speed) || settings.speed, def.playback.speedMin, def.playback.speedMax);
        job = { id: ++sequence, def: def, options: options, source: source, targets: targets, allies: allies, enemies: enemies,
          targetsBox: options.targetsBox ? normalize(options.targetsBox) : null,
          from: from, angle: angle, spread: Math.min(Math.PI * .98, spread), reach: reach, start: null,
          ms: options.durationMs == null ? duration(name, speed) : options.durationMs,
          endRatio: options.endRatio == null || def.loop ? 1 : options.endRatio,
          seed: Number.isFinite(options.seed) ? options.seed : Number.isFinite(settings.seed) ? settings.seed : sequence,
          unit: source.width * (Number(options.size) || def.playback.baseSize || settings.size), size: Number(options.size) || def.playback.baseSize || settings.size,
          particles: clamp(settings.particles, .2, 2), hit: new Set(), cues:new Set(), hitAt: [], styles: [], nodes: [], sprites: {}, assetErrors: [],
          baseTransforms: targets.map(function (r) { var v = r.element && getComputedStyle(r.element).transform; return v && v !== 'none' ? v : ''; }),
          baseFilters: targets.map(function (r) { var v = r.element && getComputedStyle(r.element).filter; return v && v !== 'none' ? v : ''; }),
          domScales: targets.map(function (r) { return r.element && r.element.offsetWidth ? r.width / r.element.offsetWidth : 1; }),
          board: options.board || (source.element && source.element.closest('[data-vb-fx-board], #stage, #battle-field')),
          value: Math.max(1, Number(options.value) || def.value || 1), summonMs: 0, dir: options.dir === -1 || options.dir === 1 ? options.dir : ((Number.isFinite(options.seed)||Number.isFinite(settings.seed) ? random(5101,Number.isFinite(options.seed)?options.seed:settings.seed) : Math.random()) < .5 ? -1 : 1),
          resolve: resolve, reject: reject, done: false, cancelled: false };
        var reveal=def.impact.addPlaybackMs;
        job.summonMs = reveal?Math.min(reveal.maxMs,job.ms*reveal.maxRatio):0;
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
        job.moves = new Map(); job.baselines = new Map();
        [source].concat(targets, allies, enemies).forEach(function (r) {
          if (!r.element || job.baselines.has(r.element)) return;
          var style = getComputedStyle(r.element);
          job.baselines.set(r.element, { transform: style.transform && style.transform !== 'none' ? style.transform : '', filter: style.filter && style.filter !== 'none' ? style.filter : '', scale: r.element.offsetWidth ? r.width / r.element.offsetWidth : 1 });
        });
        // 手続きテクスチャは層で宣言されたものだけを計測開始前に用意する。
        def.layers.forEach(function (layer) {
          if (layer.texture && VbFxDefs.textures.indexOf(layer.texture) >= 0) texture(layer.texture, layer.color || def.color, 0);
        });
        targets.forEach(function(r,i){job.hitAt.push(impactAt(def,job,r,i));});
        jobs.push(job);
        // 非表示タブでも Promise と後片付けが終わる番人。描画開始時に実尺で掛け直す。
        job.watchdog = setTimeout(function () { finish(job, false); }, job.ms * job.endRatio + 200);
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
  // 演出の中で「当たる」瞬間。SEの山合わせ用の既存cueと、対象への実際の到達時刻は両方データで保持する。
  // 演出の中で「当たる」瞬間（全尺に対する割合）。SEの一番大きい所をここへ合わせる（2026-10-05 利用者指定）。
  function impactMs(name,speed){var d=lookup[name];return d?duration(name,speed)*d.impact.cueMs/d.ms:0;}
  function impactAt(def,job,r,index){
    if (job.options.impactTimesMs) return Math.min(1,job.options.impactTimesMs[index]/job.ms);
    var spec=def.impact,at=spec.atMs/def.ms;
    if(spec.distance){var p=point(r),range=spec.distance.range==='ray'?rayReach(job,Math.atan2(p.y-job.from.y,p.x-job.from.x)):job.reach;
      at=VbFxCurves.inverse(spec.distance.curve,clamp(Math.hypot(p.x-job.from.x,p.y-job.from.y)/Math.max(1,range)),spec.distance.inverseIterations);}
    if(spec.targetMs)at=spec.targetMs[Math.min(index,spec.targetMs.length-1)]/def.ms;
    if(spec.addPlaybackMs){var delay=spec.addPlaybackMs;at=delay.ratio+Math.min(delay.maxMs,job.ms*delay.maxRatio)/job.ms;}
    return at;
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
  VbFxDefs.validate();
  return { play: play, rect: rect, cardGeometry: cardGeometry, duration: duration, impactMs: impactMs, pulseTimes:pulseTimes,stop: stop, retarget: retarget, prepareClone: prepareClone, stopAll: stopAll, effects: definitions, settings: settings,
    activeCount: function () { return jobs.length; },
    snapshot: function () { return jobs.map(function (job) { return { name: job.def.name, durationMs: job.ms,
      elapsedMs: job.start == null ? null : Math.max(0, performance.now() - job.start),
      frameMs: job.start == null || job.lastFrame == null ? null : job.lastFrame - job.start,
      // 2026-10-12指定・撮影第2回: 反復の命中時刻も撮影記録へ渡す（描画には介入しない）。
      impactsMs: job.hitAt.map(function (at) { return at * job.ms; }), cueTimesMs: (job.options.cueTimesMs || []).slice(), dpr: pixelRatio }; }); },
    assetBase: assetBase };
})();
