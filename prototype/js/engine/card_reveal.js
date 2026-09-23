// ═══════════════════════════════════════
// engine/card_reveal.js — 報酬カードのめくり・登場演出（レア度別）
//
// **プレビュー（tools/card_spin_entrance_preview.html）と本編（reward.js）が同じものを使う唯一の実装。**
// 見た目（CSS）もここで一度だけ注入するので、演出の調整はこのファイルだけで済む。
//
// 寸法はすべてカード幅に比例させる（1em＝カード幅の1%）。プレビューの174px幅でも、
// 本編の480px幅でも同じ見え方になる。
//
// レア度ごとの考え方（下のレア度ほど静か、上ほど派手。4と5は性質を変えて被らせない）：
//   1 通常   … めくるだけ。
//   2 青の縁光 … 縁の全周が同時に青く灯る。
//   3 黄金の掃光… 金の縁が一瞬で灯り、斜めの光がカード面を走り、金の粒が立ち昇る。
//   4 秘術   … カードの背後に魔法陣が開いて回り、青紫の縁と虹色の走光、光の粒が周回する。
//   5 炸裂   … 伏せたまま光が溜まって震え、表になった瞬間に閃光・衝撃波・火花が弾け、
//              カード面に箔押しのような虹彩が残る。集中線（放射状の線）は使わない。
// ═══════════════════════════════════════

const CARD_REVEAL_ASPECT = 395.61 / 261; // c_board.svg の縦横比（高さ÷幅）

// charge：伏せたまま溜める時間（ms）。flip：めくり自体の時間（ms）。
// land：めくりの中で正面に着地する位置（0〜1）。**キーフレームの位置（進み）であって時刻ではない。**
//   速度曲線（強い減速）を通すので、実際に角度0になる時刻はこれよりずっと早い。時刻は cardRevealLandMs で求める。
//   以前はこれをそのまま時刻として使っていて、着地の演出がカードが表になってから0.3〜0.5秒遅れていた。
// impactDelay：着地から着地の演出（発光など）を出すまでの間（ms）。レア度5だけは溜めた後の「間」として残す。
// frames：[位置, 角度, 拡大, 手前への浮き(em)]。角度 -180＝裏、0＝表。
const CARD_REVEAL_TIERS = {
  1: { label: '通常', charge: 0, flip: 760, land: .88,
    frames: [[0, -180, 1, 0], [.14, -176, 1, 2], [.62, -58, 1.02, 6], [.88, 0, 1, 0], [1, 0, 1, 0]] },
  2: { label: '青の縁光', charge: 0, flip: 860, land: .84,
    frames: [[0, -180, 1, 0], [.12, -176, 1, 3], [.58, -60, 1.03, 9], [.84, 0, 1.005, 0], [.93, 1.5, 1, 0], [1, 0, 1, 0]] },
  3: { label: '黄金の掃光', charge: 0, flip: 960, land: .8,
    frames: [[0, -180, 1, 0], [.12, -177, 1, 3], [.54, -64, 1.04, 12], [.8, 0, 1.01, 0], [.9, 2.5, 1, 0], [1, 0, 1, 0]] },
  4: { label: '秘術', charge: 260, flip: 1100, land: .76,
    frames: [[0, -180, 1, 0], [.12, -178, 1.01, 4], [.5, -70, 1.06, 16], [.76, 0, 1.015, 0], [.87, 4, 1, 0], [.95, -1, 1, 0], [1, 0, 1, 0]] },
  5: { label: '炸裂', charge: 620, flip: 1000, land: .7, impactDelay: 440,
    frames: [[0, -180, 1.02, 0], [.1, -179, 1.04, 6], [.44, -76, 1.1, 22], [.7, 0, 1.03, 0], [.8, 6, .99, 0], [.9, -2, 1, 0], [1, 0, 1, 0]] },
};

// 縁の光を着地より何ms早く灯し始めるか（レア度ごと）。2と3は早めに光らせる（利用者指定）。
// 大きくしすぎると、まだ斜めのカードより縁の光が一回り大きく見える（着地の直前は角度の変化が小さい）。
const CARD_REVEAL_EARLY_MS = { 2: 40, 3: 40 };

// 縁の光が灯り始めてから最も明るくなるまで（ms）。効果と、音を合わせる計算の両方で使う。
// 短いほど「パッと灯る」。長いと灯った瞬間がぼやけ、音の山が先に聞こえる（R3・R4で指摘）。
const CARD_REVEAL_RIM_RAMP_MS = 80;

// めくりの速度曲線（cubic-bezier）。アニメーションと、音を合わせる時刻の計算の両方で使う。
const CARD_REVEAL_FLIP_EASE = [.2, .62, .22, 1];

// 同じ段のカードを表にした後、次の段を表にするまでの間（ms）。利用者指定。
const CARD_REVEAL_GROUP_GAP_MS = 500;

function cardRevealTier(rarity) {
  const r = Math.max(1, Math.min(5, Number(rarity) || 1));
  return CARD_REVEAL_TIERS[r];
}
// めくりの「進み」p（キーフレームの位置）に達する時刻（ms・開始から）。速度曲線を逆算する。
function cardRevealTimeAtProgress(tier, p) {
  const ease = cardRevealBezier(...CARD_REVEAL_FLIP_EASE);
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (ease(m) < p) lo = m; else hi = m; }
  return tier.charge + tier.flip * ((lo + hi) / 2);
}
// 着地（実際に正面で止まる＝角度0）までの時間。段ごとの間隔はここから測る。
function cardRevealLandMs(rarity) {
  const t = cardRevealTier(rarity);
  return cardRevealTimeAtProgress(t, t.land);
}
// 着地の演出（発光など）を出す時刻。レア度5以外は着地と同じ。
function cardRevealImpactMs(rarity) {
  const t = cardRevealTier(rarity);
  return cardRevealLandMs(rarity) + (t.impactDelay || 0);
}
// cubic-bezier(x1,y1,x2,y2) の「時刻→進み」を返す（CSSと同じ曲線）。
function cardRevealBezier(x1, y1, x2, y2) {
  const bx = s => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = s => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return t => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bx(m) < t) lo = m; else hi = m; }
    return by((lo + hi) / 2);
  };
}
// カードが真横（見かけの幅が0）になる時刻。めくりの角度が -90 度を通る瞬間（ms・開始から）。
function cardRevealEdgeMs(rarity) {
  const t = cardRevealTier(rarity);
  const f = t.frames;
  let p = null;
  for (let i = 1; i < f.length && p == null; i++) {
    const [o0, a0] = f[i - 1], [o1, a1] = f[i];
    if ((a0 <= -90 && a1 >= -90) && a1 !== a0) p = o0 + (o1 - o0) * ((-90 - a0) / (a1 - a0));
  }
  if (p == null) return t.charge;
  return cardRevealTimeAtProgress(t, p);
}

// 演出が完全に消えるまでの時間。最後の段の後、手前のカードを消す前に待つ。
function cardRevealSettleMs(rarity) {
  const r = Math.max(1, Math.min(5, Number(rarity) || 1));
  return cardRevealImpactMs(r) + [0, 180, 520, 900, 1250, 1500][r];
}

// ── 見た目（一度だけ注入） ──────────────────────────
function cardRevealEnsureStyles() {
  if (typeof document === 'undefined' || document.getElementById('card-reveal-styles')) return;
  const style = document.createElement('style');
  style.id = 'card-reveal-styles';
  style.textContent = `
.cr-rig{position:absolute;width:var(--cr-w,174px);height:calc(var(--cr-w,174px) * ${CARD_REVEAL_ASPECT});
  font-size:calc(var(--cr-w,174px) / 100);perspective:640em;perspective-origin:50% 50%;pointer-events:none}
.cr-rig *{pointer-events:none}
.cr-layer{position:absolute;left:50%;top:50%;width:0;height:0}
.cr-spinner{position:absolute;inset:0;transform-style:preserve-3d}
.cr-face{position:absolute;inset:0;overflow:hidden;border-radius:5.65% / 3.721%;
  backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 1.6em 3.8em rgba(0,0,0,.62)}
.cr-face *{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.cr-front{transform:rotateY(-180deg) translateZ(.1px)}
.cr-back{transform:rotateY(0deg) translateZ(.1px);background:#100805 url("assets/cards/c_board.svg") center/100% 100% no-repeat}
.cr-front-content{position:absolute;inset:0}
.cr-front-content>*{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  margin:0!important;transform:none!important}
.cr-back-glow{position:absolute;inset:0;opacity:0;border-radius:inherit;
  box-shadow:inset 0 0 3em rgba(255,236,176,.95),inset 0 0 9em rgba(255,176,52,.6);
  background:radial-gradient(ellipse at 50% 50%,rgba(255,226,150,.35),transparent 62%)}
.cr-sheen,.cr-foil,.cr-flash{position:absolute;inset:0;opacity:0;border-radius:inherit}
.cr-sheen{mix-blend-mode:screen}
.cr-beam{position:absolute;top:-30%;bottom:-30%;left:-60%;width:46%;filter:blur(.5em)}
.cr-foil{mix-blend-mode:screen;background:linear-gradient(115deg,
  transparent 0%,transparent 34%,rgba(255,120,150,.55) 40%,rgba(255,220,120,.7) 44%,rgba(140,255,180,.6) 48%,
  rgba(120,210,255,.7) 52%,rgba(190,140,255,.6) 56%,transparent 62%,transparent 100%);
  background-size:300% 300%}
.cr-flash{background:radial-gradient(ellipse at 50% 46%,#fffdf2 0%,rgba(255,244,205,.96) 40%,rgba(255,214,120,.7) 100%)}
.cr-halo{position:absolute;left:50%;top:50%;border-radius:50%;opacity:0;transform:translate(-50%,-50%)}
.cr-rim{position:absolute;left:-6em;top:-6em;width:calc(100% + 12em);height:calc(100% + 12em);overflow:visible;opacity:0}
.cr-rim path{fill:none}
.cr-sigil{position:absolute;left:50%;top:50%;width:180em;height:180em;margin:-90em;opacity:0;overflow:visible}
.cr-mote{position:absolute;left:0;top:0;border-radius:50%;opacity:0}
.cr-ring{position:absolute;left:0;top:0;border-radius:50%;opacity:0}
.cr-glint{position:absolute;left:0;top:0;width:0;height:0;opacity:0}
.cr-glint::before,.cr-glint::after{content:"";position:absolute;left:0;top:0;transform:translate(-50%,-50%);
  border-radius:50%;background:radial-gradient(ellipse at center,#fff 0%,rgba(255,244,196,.9) 22%,rgba(255,206,110,.35) 55%,transparent 72%)}
.cr-glint::before{width:44em;height:2.6em}
.cr-glint::after{width:2.6em;height:44em}
`;
  document.head.appendChild(style);
}

// ── 部品 ──────────────────────────────────────────
// 角丸の四角を「上辺中央から時計回り」に一周するパス。pathLength=100 で使う。
function cardRevealRimPath(w, h) {
  const rx = w * .0565, ry = h * .03721;
  return `M${w / 2},0 H${w - rx} A${rx},${ry} 0 0 1 ${w},${ry} V${h - ry} A${rx},${ry} 0 0 1 ${w - rx},${h}`
    + ` H${rx} A${rx},${ry} 0 0 1 0,${h - ry} V${ry} A${rx},${ry} 0 0 1 ${rx},0 Z`;
}

function cardRevealEl(tag, cls, parent) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (parent) parent.appendChild(el);
  return el;
}
function cardRevealSvg(tag, attrs, parent) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  if (parent) parent.appendChild(el);
  return el;
}
function cardRevealAnimate(el, keyframes, timing) {
  if (!el || typeof el.animate !== 'function') return null;
  return el.animate(keyframes, Object.assign({ fill: 'forwards' }, timing));
}
// 一度きりの部品は、動き終わったら取り除く。
function cardRevealOnce(el, keyframes, timing) {
  const a = cardRevealAnimate(el, keyframes, timing);
  if (a) a.finished.then(() => el.remove()).catch(() => el.remove());
  else el.remove();
  return a;
}

// めくる台（裏＝c_board、表＝渡された要素）を作る。
// front：表面に置く要素（本編では報酬カードの複製）。width：カード幅（px）。
function cardRevealCreateRig(front, width) {
  cardRevealEnsureStyles();
  const rig = cardRevealEl('div', 'cr-rig');
  rig.style.setProperty('--cr-w', `${Math.max(1, Number(width) || 174)}px`);
  const halo = cardRevealEl('div', 'cr-halo', rig);
  const back = cardRevealEl('div', 'cr-layer cr-fx-back', rig);
  const spinner = cardRevealEl('div', 'cr-spinner', rig);
  const faceFront = cardRevealEl('div', 'cr-face cr-front', spinner);
  const content = cardRevealEl('div', 'cr-front-content', faceFront);
  if (front) content.appendChild(front);
  const sheen = cardRevealEl('div', 'cr-sheen', faceFront);
  const foil = cardRevealEl('div', 'cr-foil', faceFront);
  const flash = cardRevealEl('div', 'cr-flash', faceFront);
  const faceBack = cardRevealEl('div', 'cr-face cr-back', spinner);
  const backGlow = cardRevealEl('div', 'cr-back-glow', faceBack);
  const rim = cardRevealSvg('svg', { class: 'cr-rim', viewBox: '0 0 112 175.7', preserveAspectRatio: 'none' }, rig);
  const fx = cardRevealEl('div', 'cr-layer cr-fx-front', rig);
  rig._cr = { halo, back, spinner, faceFront, faceBack, sheen, foil, flash, backGlow, rim, fx, anims: [], timers: [] };
  // 始めは裏向き。
  cardRevealReset(rig);
  return rig;
}

function cardRevealReset(rig) {
  const p = rig && rig._cr;
  if (!p) return;
  p.anims.forEach(a => { try { a.cancel(); } catch (_) {} });
  p.anims = [];
  (p.timers || []).forEach(t => clearTimeout(t));
  p.timers = [];
  [...p.fx.children, ...p.back.children, ...p.sheen.children].forEach(el => el.remove());
  p.rim.innerHTML = '';
  p.faceFront.style.transform = 'rotateY(-180deg) translateZ(.1px)';
  p.faceBack.style.transform = 'rotateY(0deg) translateZ(.1px)';
  [p.halo, p.sheen, p.foil, p.flash, p.backGlow, p.rim].forEach(el => { el.style.opacity = '0'; });
  rig.style.transform = '';
}
// 表向きのまま止める（途中から画面を開き直した時など、演出を飛ばす場合）。
function cardRevealShowFace(rig) {
  cardRevealReset(rig);
  const p = rig && rig._cr;
  if (!p) return;
  p.faceFront.style.transform = 'rotateY(0deg) translateZ(.1px)';
  p.faceBack.style.transform = 'rotateY(180deg) translateZ(.1px)';
}

// ── 演出の部品 ────────────────────────────────────
function cardRevealTrack(rig, anim) { if (anim && rig && rig._cr) rig._cr.anims.push(anim); return anim; }

// 背後の柔らかい光。
function cardRevealHalo(rig, color, size, delay, dur, peak, frames) {
  const h = rig._cr.halo;
  h.style.width = `${size}em`; h.style.height = `${size * 1.18}em`;
  h.style.background = `radial-gradient(ellipse at center,${color} 0%,transparent 64%)`;
  const at = (op, sc, offset) => Object.assign({ opacity: op, transform: `translate(-50%,-50%) scale(${sc})` }, offset == null ? {} : { offset });
  cardRevealTrack(rig, cardRevealAnimate(h, frames ? frames.map(([o, op, sc]) => at(op * peak, sc, o)) : [
    at(0, .6), at(peak, 1, .22), at(peak * .55, 1.06, .6), at(0, 1.14),
  ], { duration: dur, delay, easing: 'ease-out' }));
}

// 縁の光。
//   mode='glow'：全周が同時に灯り、しばらくして消える（レア度2）。
//   mode='run' ：まず全周を控えめに灯し、その上を強い光が一周する（レア度3〜5）。
//               線を引き伸ばして繋ぐ描き方はしない（線が繋がって見えるのが気になるという指摘）。
function cardRevealRim(rig, opts) {
  const svg = rig._cr.rim;
  svg.innerHTML = '';
  // 余白6emずつを含めた viewBox。パスはカードの縁（0〜100 × 0〜151.575）に置く。
  const W = 100, H = 100 * CARD_REVEAL_ASPECT;
  svg.setAttribute('viewBox', `-6 -6 ${W + 12} ${H + 12}`);
  const d = cardRevealRimPath(W, H);
  const defs = cardRevealSvg('defs', {}, svg);
  const fid = `cr-blur-${Math.random().toString(36).slice(2, 8)}`;
  const filter = cardRevealSvg('filter', { id: fid, x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
  cardRevealSvg('feGaussianBlur', { stdDeviation: String(opts.blur || 1.6) }, filter);
  const path = (stroke, width, extra) => cardRevealSvg('path', Object.assign({
    d, pathLength: '100', stroke, 'stroke-width': String(width), 'stroke-linecap': 'round', opacity: '0',
  }, extra || {}), svg);
  svg.style.opacity = '1';
  const t0 = opts.delay || 0;
  const glowW = opts.glowWidth || 9, coreW = opts.coreWidth || 2.2;
  const hold = opts.hold || 1000;
  const base = opts.mode === 'run' ? (opts.base || .55) : (opts.peak || 1);

  // 全周の常時光（同時に灯る）。
  const steadyGlow = path(opts.glow, glowW, { filter: `url(#${fid})` });
  const steadyCore = path(opts.core, coreW * .7);
  [[steadyGlow, base], [steadyCore, base * .9]].forEach(([el, peak]) => cardRevealTrack(rig, cardRevealAnimate(el, [
    { opacity: 0 }, { opacity: peak, offset: Math.min(.5, CARD_REVEAL_RIM_RAMP_MS / hold) }, { opacity: peak * .8, offset: .6 }, { opacity: 0 },
  ], { duration: hold, delay: t0, easing: 'ease-out' })));
  if (opts.mode !== 'run') return;

  // 一周する強い光。尾（長く淡い）と頭（短く強い）を重ねて同じ速さで回す。
  // 始めと終わりは透明から入って透明へ抜けるので、止まった線が見える瞬間は無い。
  const lap = opts.lap || 640, at = t0 + (opts.runAt != null ? opts.runAt : 110);
  const comet = [
    { len: 20, stroke: opts.glow, width: glowW * .85, blur: true, peak: .9 },
    { len: 11, stroke: opts.core, width: coreW * 1.05, blur: false, peak: .95 },
    { len: 4, stroke: opts.head || '#ffffff', width: coreW * 1.45, blur: false, peak: 1 },
  ];
  comet.forEach(c => {
    // 頭が上辺中央（パスの始点）に来る位置から始め、ちょうど一周して同じ場所へ戻る。
    const el = path(c.stroke, c.width, Object.assign({ 'stroke-dasharray': `${c.len} ${100 - c.len}` },
      c.blur ? { filter: `url(#${fid})` } : {}));
    const off0 = c.len;
    cardRevealTrack(rig, cardRevealAnimate(el, [
      { strokeDashoffset: off0, opacity: 0 },
      { strokeDashoffset: off0 - 12, opacity: c.peak, offset: .12 },
      { strokeDashoffset: off0 - 88, opacity: c.peak, offset: .88 },
      { strokeDashoffset: off0 - 100, opacity: 0 },
    ], { duration: lap, delay: at, easing: 'linear' }));
  });
}

// カード面を斜めに走る光（左上から右下へ）。カードの形で切り抜かれる。
function cardRevealSheen(rig, gradient, delay, dur, peak) {
  const s = rig._cr.sheen;
  cardRevealTrack(rig, cardRevealAnimate(s, [{ opacity: 0 }, { opacity: peak, offset: .15 }, { opacity: peak, offset: .75 }, { opacity: 0 }],
    { duration: dur, delay, easing: 'linear' }));
  const beam = cardRevealEl('div', 'cr-beam', s);
  beam.style.background = gradient;
  cardRevealOnce(beam, [{ transform: 'rotate(18deg) translateX(0)' }, { transform: 'rotate(18deg) translateX(560%)' }],
    { duration: dur, delay, easing: 'cubic-bezier(.3,.1,.2,1)' });
}

// 粒。mode='rise'：立ち昇る。'orbit'：カードの周りを回ってから散る。'burst'：四方へ弾ける。
function cardRevealMotes(rig, opts) {
  const layer = opts.front === false ? rig._cr.back : rig._cr.fx;
  const n = opts.count || 10;
  const H = 100 * CARD_REVEAL_ASPECT;
  for (let i = 0; i < n; i++) {
    const m = cardRevealEl('span', 'cr-mote', layer);
    // 大小を混ぜる。たまに大きな「熱い」粒を混ぜると奥行きが出る。
    const hot = opts.mode === 'burst' && Math.random() < .22;
    const size = (opts.size || 1.4) * (hot ? 1.6 + Math.random() * .6 : .55 + Math.random() * .7);
    const col = opts.colors[i % opts.colors.length];
    m.style.width = m.style.height = `${size}em`;
    m.style.background = `radial-gradient(circle,#fff 0%,#fff 18%,${col} 46%,transparent 74%)`;
    m.style.boxShadow = `0 0 ${size * 1.2}em ${size * .25}em ${col}`;
    const delay = (opts.delay || 0) + (opts.spread || 0) * Math.random();
    let frames;
    if (opts.mode === 'rise') {
      const x0 = (Math.random() - .5) * 96, y0 = (Math.random() - .3) * H * .7;
      const drift = (Math.random() - .5) * 14, rise = 34 + Math.random() * 40;
      frames = [
        { opacity: 0, transform: `translate(${x0}em,${y0}em) scale(.4)` },
        { opacity: 1, transform: `translate(${x0 + drift * .3}em,${y0 - rise * .25}em) scale(1)`, offset: .2 },
        { opacity: .8, transform: `translate(${x0 + drift * .7}em,${y0 - rise * .7}em) scale(.85)`, offset: .7 },
        { opacity: 0, transform: `translate(${x0 + drift}em,${y0 - rise}em) scale(.5)` },
      ];
    } else if (opts.mode === 'orbit') {
      const a0 = (i / n) * Math.PI * 2, turns = .55 + Math.random() * .2, rx = 70, ry = 96;
      const steps = 7;
      frames = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, a = a0 + t * turns * Math.PI * 2, grow = 1 + t * .5;
        frames.push({ opacity: s === 0 ? 0 : (s === steps ? 0 : (s < 2 ? .9 : 1 - t * .5)),
          transform: `translate(${Math.cos(a) * rx * grow}em,${Math.sin(a) * ry * grow}em) scale(${1 - t * .4})`, offset: t });
      }
    } else {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 110;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v * .85, g = 24 + Math.random() * 30;
      frames = [
        { opacity: 0, transform: 'translate(0,0) scale(.3)' },
        { opacity: 1, transform: `translate(${dx * .35}em,${dy * .35}em) scale(1.2)`, offset: .12 },
        { opacity: .9, transform: `translate(${dx * .78}em,${dy * .78 + g * .4}em) scale(.9)`, offset: .55 },
        { opacity: 0, transform: `translate(${dx}em,${dy + g}em) scale(.3)` },
      ];
    }
    cardRevealOnce(m, frames, { duration: (opts.dur || 1100) * (.8 + Math.random() * .4), delay, easing: opts.mode === 'burst' ? 'cubic-bezier(.12,.72,.3,1)' : 'ease-out' });
  }
}

// 衝撃波の輪（1本）。
function cardRevealRing(rig, opts) {
  const r = cardRevealEl('span', 'cr-ring', opts.behind ? rig._cr.back : rig._cr.fx);
  const s = opts.size || 150;
  r.style.width = r.style.height = `${s}em`;
  r.style.margin = `-${s / 2}em 0 0 -${s / 2}em`;
  r.style.border = `${opts.width || .9}em solid ${opts.color}`;
  r.style.boxShadow = `0 0 ${opts.glow || 3}em ${opts.color},inset 0 0 ${(opts.glow || 3) * .7}em ${opts.color}`;
  cardRevealOnce(r, [
    { opacity: 0, transform: `scale(${opts.from || .35})` },
    { opacity: opts.peak || 1, transform: `scale(${(opts.from || .35) + ((opts.to || 1.6) - (opts.from || .35)) * .18})`, offset: .12 },
    { opacity: 0, transform: `scale(${opts.to || 1.6})`, borderWidth: '.1em' },
  ], { duration: opts.dur || 700, delay: opts.delay || 0, easing: 'cubic-bezier(.08,.75,.2,1)' });
}

// 魔法陣（秘術）。円2本・目盛り・六芒星・小円。カードの背後で開いて回る。
function cardRevealSigil(rig, delay) {
  const svg = cardRevealSvg('svg', { class: 'cr-sigil', viewBox: '-100 -100 200 200' }, rig._cr.back);
  const g = cardRevealSvg('g', { fill: 'none', 'stroke-linecap': 'round' }, svg);
  const stroke = (el, col, w, op) => { el.setAttribute('stroke', col); el.setAttribute('stroke-width', w); if (op != null) el.setAttribute('opacity', op); return el; };
  const defs = cardRevealSvg('defs', {}, svg);
  const fid = `cr-sg-${Math.random().toString(36).slice(2, 8)}`;
  const f = cardRevealSvg('filter', { id: fid, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  cardRevealSvg('feGaussianBlur', { stdDeviation: '2.6', result: 'b' }, f);
  const merge = cardRevealSvg('feMerge', {}, f);
  cardRevealSvg('feMergeNode', { in: 'b' }, merge); cardRevealSvg('feMergeNode', { in: 'SourceGraphic' }, merge);
  g.setAttribute('filter', `url(#${fid})`);
  stroke(cardRevealSvg('circle', { r: '92' }, g), '#c7b8ff', '1.6');
  stroke(cardRevealSvg('circle', { r: '84' }, g), '#7fd2ff', '.6', '.85');
  stroke(cardRevealSvg('circle', { r: '58' }, g), '#c9b8ff', '.8', '.9');
  // 外周の目盛り（ルーン代わり）：長短を交互に。
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, long = i % 4 === 0;
    const r1 = 84, r2 = long ? 92 : 88;
    stroke(cardRevealSvg('line', { x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * r2, y2: Math.sin(a) * r2 }, g),
      long ? '#e6ddff' : '#9fc9ff', long ? '1' : '.5', long ? '1' : '.7');
  }
  // 六芒星（三角形2つ）。
  const tri = rot => Array.from({ length: 3 }, (_, k) => {
    const a = rot + k * Math.PI * 2 / 3 - Math.PI / 2;
    return `${Math.cos(a) * 58},${Math.sin(a) * 58}`;
  }).join(' ');
  stroke(cardRevealSvg('polygon', { points: tri(0) }, g), '#d6c8ff', '.9', '.95');
  stroke(cardRevealSvg('polygon', { points: tri(Math.PI) }, g), '#8fd6ff', '.9', '.95');
  // 頂点の小円。
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 - Math.PI / 2;
    stroke(cardRevealSvg('circle', { cx: Math.cos(a) * 71, cy: Math.sin(a) * 71, r: '5.5' }, g), '#e9e2ff', '.7', '.9');
  }
  // 開いて（拡大）、回り、薄れる。外と内で回る向きを変えたいので、全体を回しつつ内側は別に逆回転させる。
  cardRevealOnce(svg, [
    { opacity: 0, transform: 'rotate(-40deg) scale(.45)' },
    { opacity: 1, transform: 'rotate(-8deg) scale(1.02)', offset: .22 },
    { opacity: .85, transform: 'rotate(22deg) scale(1.06)', offset: .62 },
    { opacity: 0, transform: 'rotate(46deg) scale(1.16)' },
  ], { duration: 1500, delay, easing: 'cubic-bezier(.16,.7,.24,1)' });
}

// 四芒の閃き（カード右上の角に一瞬）。画面全体の十字線ではなく、角に置く小さな星。
function cardRevealGlint(rig, x, y, delay, size) {
  const g = cardRevealEl('span', 'cr-glint', rig._cr.fx);
  g.style.left = `${x}em`; g.style.top = `${y}em`;
  cardRevealOnce(g, [
    { opacity: 0, transform: `rotate(0deg) scale(.2)` },
    { opacity: 1, transform: `rotate(35deg) scale(${size || 1})`, offset: .28 },
    { opacity: 0, transform: `rotate(80deg) scale(${(size || 1) * .5})` },
  ], { duration: 720, delay, easing: 'cubic-bezier(.2,.7,.3,1)' });
}

// 効果音。**音の「当たり」（peakMs：ファイル先頭から、耳が「鳴った」と感じる所までの時間）を、演出の瞬間に合わせる。**
// 当たり＝10ms窓の実効値が、その音の最大から6dB下まで初めて上がった所。一番大きい所（最大値）ではない。
//   R3・R4 は立ち上がった後、ほぼ同じ大きさで0.5〜1秒鳴り続けるので、最大値は続きの途中の偶然の山になる。
//   最大値に合わせると、耳が感じる当たりが光より0.6秒以上先に来ていた（「ピークが速く感じる」の原因）。
// ファイルを差し替えたら測り直すこと。lagMs は当たりを光より少し後ろへずらす聴感の調整つまみ（既定0）。
// 本編は音量を一元管理している playSfx を使う。プレビュー（playSfx が無いページ）だけは Audio で直接鳴らす。
// volume はプレビュー用（本編は audio.js の値を使う。同じ値にしてある）。
const CARD_REVEAL_SOUNDS = {
  cardFlip: { src: 'assets/sfx/card_flip.wav', volume: 1, peakMs: 570 }, // 頭0.54秒ほどは無音。短い音なので当たり＝最大
  R3: { src: 'assets/sfx/R3.wav', volume: .35, peakMs: 250, lagMs: 0 },
  R4: { src: 'assets/sfx/R4.wav', volume: .34, peakMs: 280, lagMs: 0 },
  // R5 は最大（1190ms）に合わせたまま。当たりで測ると710msあたり（現状で違和感の指摘が無いので据え置き）。
  R5: { src: 'assets/sfx/R5.wav', volume: .37, peakMs: 1190 },
};
function cardRevealSoundNow(key, offsetMs) {
  if (typeof playSfx === 'function') {
    // 同じ段で複数枚が同時に開いても、音は1回だけ。
    playSfx(key, { group: 'reward', guardKey: `reveal:${key}`, guardMs: 400, offsetMs });
    return;
  }
  const def = CARD_REVEAL_SOUNDS[key];
  if (!def || typeof Audio === 'undefined') return;
  const now = Date.now();
  if (cardRevealSoundNow._last && cardRevealSoundNow._last[key] > now - 400) return;
  cardRevealSoundNow._last = Object.assign(cardRevealSoundNow._last || {}, { [key]: now });
  try {
    const a = new Audio(def.src); a.volume = def.volume;
    if (offsetMs > 0) a.currentTime = offsetMs / 1000;
    a.play().catch(() => {});
  } catch (_) {}
}
// 音の山が、演出開始から syncMs の時点に来るように鳴らす。
// 山が遅すぎて間に合わない音は、その分だけファイルの頭を詰めて（途中から）鳴らす。
function cardRevealSoundAt(rig, key, syncMs) {
  const def = CARD_REVEAL_SOUNDS[key];
  if (!def) return;
  const startIn = syncMs + (def.lagMs || 0) - def.peakMs;
  if (startIn <= 0) { cardRevealSoundNow(key, -startIn); return; }
  const timer = setTimeout(() => cardRevealSoundNow(key, 0), startIn);
  if (rig && rig._cr) rig._cr.timers.push(timer);
}

// 画面の揺れ（炸裂のみ）。target を短く小さく揺らす。
function cardRevealShake(target, delay) {
  if (!target || typeof target.animate !== 'function') return;
  const k = [];
  const amp = [0, 7, 5, 3.5, 2, 1, 0];
  amp.forEach((a, i) => {
    const ang = i * 2.3;
    k.push({ transform: `translate(${Math.cos(ang) * a}px,${Math.sin(ang * 1.7) * a * .7}px)`, offset: i / (amp.length - 1) });
  });
  target.animate(k, { duration: 300, delay, easing: 'linear' });
}

// ── 本体：1枚を表にする ────────────────────────────
// 戻り値の Promise は「正面に着地した時点」で解決する（演出の尾はその後も続く）。
// opts.shakeTarget：炸裂で揺らす要素（本編は報酬画面、プレビューは枠）。
function cardRevealPlay(rig, rarity, opts) {
  const p = rig && rig._cr;
  if (!p) return Promise.resolve();
  cardRevealReset(rig);
  const r = Math.max(1, Math.min(5, Number(rarity) || 1));
  const tier = CARD_REVEAL_TIERS[r];
  const o = opts || {};
  const H = 100 * CARD_REVEAL_ASPECT;
  // landed：実際に表で止まる時刻。land：着地の演出（発光など）を出す時刻（レア度5だけ「間」をおく）。
  const landed = cardRevealLandMs(r);
  const land = cardRevealImpactMs(r);

  // レア度1・2：カードが真横（幅0）になる瞬間に card_flip.wav の山を合わせる。
  if (r <= 2) cardRevealSoundAt(rig, 'cardFlip', cardRevealEdgeMs(r));

  // 溜め（伏せたまま）。4は短く光が滲み、5は震えながら縁から光が漏れる。
  if (tier.charge) {
    const heavy = r >= 5;
    cardRevealTrack(rig, cardRevealAnimate(p.backGlow, [
      { opacity: 0 }, { opacity: heavy ? .95 : .5, offset: .85 }, { opacity: heavy ? 1 : .6 },
    ], { duration: tier.charge + tier.flip * .3, easing: 'ease-in' }));
    if (r === 4) p.backGlow.style.filter = 'hue-rotate(185deg) saturate(1.4)';
    else p.backGlow.style.filter = '';
    if (heavy) {
      const jitter = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * 1.6;
        jitter.push({ transform: `translate(${Math.sin(i * 7.3) * a}em,${Math.cos(i * 5.1) * a * .6}em)`, offset: i / 14 });
      }
      cardRevealTrack(rig, cardRevealAnimate(p.spinner, jitter, { duration: tier.charge, easing: 'ease-in' }));
      // 背後の光は溜めから着地後まで1本で通す（途中で重ねると着地の瞬間に一度暗くなる）。
      const total = land + 1700, c = tier.charge / total, l = land / total;
      cardRevealHalo(rig, 'rgba(255,196,82,.7)', 230, 0, total, 1,
        [[0, 0, .5], [c * .9, .55, .78], [l, 1, 1.08], [l + (1 - l) * .35, .7, 1.12], [1, 0, 1.2]]);
      cardRevealMotes(rig, { mode: 'rise', count: 14, colors: ['#ffe29a', '#ffb347'], size: 2.2, dur: tier.charge + 300, delay: 0, spread: tier.charge * .7 });
    } else {
      cardRevealHalo(rig, 'rgba(130,110,255,.45)', 150, 0, tier.charge + 600, .7);
    }
  }

  // めくり。表と裏を同じ中心で回す（裏は表から常に180度ずれている）。
  const keyframes = off => tier.frames.map(([offset, angle, scale, lift]) => ({
    offset, transform: `rotateY(${angle + off}deg) translateZ(${lift}em) scale(${scale})`,
  }));
  const timing = { duration: tier.flip, delay: tier.charge, easing: `cubic-bezier(${CARD_REVEAL_FLIP_EASE.join(',')})`, fill: 'forwards' };
  const flipFront = cardRevealTrack(rig, p.faceFront.animate(keyframes(0), timing));
  cardRevealTrack(rig, p.faceBack.animate(keyframes(180), timing));
  if (r === 5 || r === 4) {
    // 溜めていた光は、めくり始めで裏面ごと消える。
    cardRevealTrack(rig, cardRevealAnimate(p.backGlow, [{ opacity: 1 }, { opacity: 0 }], { duration: tier.flip * .35, delay: tier.charge }));
  }

  // 着地の演出。
  if (r === 2) {
    // 全周が同時に灯るだけ。控えめに。着地の少し手前（ほぼ正面を向いた時点）から灯す。
    cardRevealRim(rig, { mode: 'glow', delay: land - CARD_REVEAL_EARLY_MS[2], hold: 900, glow: 'rgba(70,170,255,.9)', core: '#aee6ff', glowWidth: 6, coreWidth: 1.5, blur: 1.6, peak: .6 });
    cardRevealHalo(rig, 'rgba(70,160,255,.22)', 145, land - CARD_REVEAL_EARLY_MS[2], 850, .5);
  } else if (r === 3) {
    const e3 = CARD_REVEAL_EARLY_MS[3], rimHold3 = 1150;
    cardRevealRim(rig, { mode: 'run', delay: land - e3, hold: rimHold3, lap: 620, runAt: e3 + 60, base: .6, glow: 'rgba(255,190,70,1)', core: '#fff0bf', head: '#fffbea', glowWidth: 9, coreWidth: 2, blur: 2 });
    // 縁の光が最も明るくなる瞬間（灯り始め＋立ち上がり）に R3 の山を合わせる。
    cardRevealSoundAt(rig, 'R3', land - e3 + CARD_REVEAL_RIM_RAMP_MS);
    cardRevealHalo(rig, 'rgba(255,190,80,.4)', 165, land - e3, 1150, .85);
    cardRevealSheen(rig, 'linear-gradient(90deg,transparent,rgba(255,214,120,.14) 22%,rgba(255,252,236,.98) 50%,rgba(255,214,120,.14) 78%,transparent)', land - e3 + 60, 620, 1);
    cardRevealMotes(rig, { mode: 'rise', count: 14, colors: ['#ffe7a6', '#ffc55c', '#fff6d6'], size: 2.8, dur: 1400, delay: land, spread: 460 });
    cardRevealGlint(rig, 38, -H / 2 + 6, land + 160, .7);
  } else if (r === 4) {
    cardRevealSigil(rig, land - 180);
    cardRevealHalo(rig, 'rgba(120,100,255,.42)', 190, land - 100, 1400, .9);
    const rimHold4 = 1300;
    cardRevealRim(rig, { mode: 'run', delay: land, hold: rimHold4, lap: 720, base: .6, glow: 'rgba(150,110,255,1)', core: '#d9f3ff', head: '#f5f2ff', glowWidth: 10, coreWidth: 2.1, blur: 2.2 });
    cardRevealSoundAt(rig, 'R4', land + CARD_REVEAL_RIM_RAMP_MS);
    cardRevealSheen(rig, 'linear-gradient(90deg,transparent,rgba(110,200,255,.2) 18%,rgba(236,232,255,.98) 46%,rgba(186,140,255,.4) 62%,rgba(110,200,255,.18) 80%,transparent)', land + 60, 700, 1);
    cardRevealMotes(rig, { mode: 'orbit', count: 14, colors: ['#bfaeff', '#8fd8ff', '#f0e8ff'], size: 3, dur: 1450, delay: land - 60, spread: 140 });
    cardRevealRing(rig, { behind: true, size: 150, color: 'rgba(160,130,255,.85)', width: .6, glow: 3, from: .5, to: 1.45, dur: 900, delay: land, peak: .85 });
  } else if (r === 5) {
    if (o.shakeTarget) cardRevealShake(o.shakeTarget, land);
    // 閃光：カードそのものが白く燃え上がってから、元の絵に戻る。
    const flashAt = land - 40, flashDur = 560, flashPeak = .1;
    cardRevealTrack(rig, cardRevealAnimate(p.flash, [
      { opacity: 0 }, { opacity: .96, offset: flashPeak }, { opacity: .45, offset: .35 }, { opacity: 0 },
    ], { duration: flashDur, delay: flashAt, easing: 'ease-out' }));
    // 閃光が最も白くなる瞬間に R5 の山を合わせる。
    cardRevealSoundAt(rig, 'R5', flashAt + flashDur * flashPeak);
    cardRevealRing(rig, { size: 160, color: 'rgba(255,238,190,.95)', width: 1.1, glow: 4, from: .3, to: 2.4, dur: 760, delay: land });
    cardRevealRing(rig, { size: 150, color: 'rgba(255,170,60,.8)', width: .6, glow: 3, from: .25, to: 1.9, dur: 900, delay: land + 110, peak: .8 });
    cardRevealMotes(rig, { mode: 'burst', count: 40, colors: ['#fff4cc', '#ffcf5e', '#ff9e3d', '#ffe9a8'], size: 3.2, dur: 1350, delay: land, spread: 90 });
    cardRevealRim(rig, { mode: 'run', delay: land, hold: 1500, lap: 600, base: .7, glow: 'rgba(255,200,90,1)', core: '#fffbe8', head: '#ffffff', glowWidth: 11, coreWidth: 2.3, blur: 2.4 });
    cardRevealGlint(rig, 42, -H / 2 + 5, land + 60, 1.25);
    cardRevealGlint(rig, -40, H / 2 - 7, land + 260, .8);
    // 箔押しのような虹彩が、しばらくカード面を流れて残る。
    cardRevealTrack(rig, cardRevealAnimate(p.foil, [
      { opacity: 0, backgroundPosition: '100% 50%' },
      { opacity: .42, backgroundPosition: '70% 50%', offset: .15 },
      { opacity: .32, backgroundPosition: '20% 50%', offset: .7 },
      { opacity: 0, backgroundPosition: '0% 50%' },
    ], { duration: 1600, delay: land + 160, easing: 'cubic-bezier(.4,.1,.3,1)' }));
  }

  // 次の段までの0.5秒は、実際に表になった時点から数える。
  return new Promise(resolve => setTimeout(resolve, flipFront ? landed : 0));
}

// ── 報酬の並び：レア度の低い段から順に表にする ────────
// rigs：左から順のめくり台。rarities：同じ並びのレア度。
// 同じレア度の札は同時に表にし、段と段の間は CARD_REVEAL_GROUP_GAP_MS あける（着地から数える）。
// 戻り値の Promise は、最後の段の演出が落ち着いた時点で解決する。
async function cardRevealPlaySequence(rigs, rarities, opts) {
  const levels = [...new Set(rarities.map(r => Math.max(1, Math.min(5, Number(r) || 1))))].sort((a, b) => a - b);
  const wait = ms => new Promise(res => setTimeout(res, Math.max(0, ms)));
  let lastLevel = 1;
  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    lastLevel = level;
    const group = rigs.filter((_, i) => Math.max(1, Math.min(5, Number(rarities[i]) || 1)) === level);
    await Promise.all(group.map(rig => cardRevealPlay(rig, level, opts)));
    if (li < levels.length - 1) await wait(CARD_REVEAL_GROUP_GAP_MS);
  }
  await wait(cardRevealSettleMs(lastLevel) - cardRevealLandMs(lastLevel));
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    CARD_REVEAL_TIERS, CARD_REVEAL_GROUP_GAP_MS, cardRevealTier, cardRevealLandMs, cardRevealImpactMs, cardRevealSettleMs, cardRevealEdgeMs,
    cardRevealEnsureStyles, cardRevealCreateRig, cardRevealReset, cardRevealShowFace, cardRevealPlay, cardRevealPlaySequence,
  });
}
