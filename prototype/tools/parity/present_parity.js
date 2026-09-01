'use strict';
// ═══════════════════════════════════════
// tools/parity/present_parity.js — 演出（再生層）がPvEとオンラインで一致するかを見る。
//
// これまでの検査は core.js の中身と、オンラインへ渡すデータだけを比べていた。
// **見え方そのもの**は誰も比べておらず、実際に
//   ・オンラインだけキャラクター固有VFXが一つも出ない
//   ・とどめの数値が出ない／倒れたカードが残る／数値が何もない場所へ出る
//   ・肩代わり前の数値が出てからHPはその半分しか減らない
// といった片側だけの不具合が出た。ここでは同じ盤面・同じ乱数種で両方の経路を
// 実際に再生し、画面に出たものを突き合わせる。
//
//   1. ローカルサーバーを立てる（既定 http://127.0.0.1:5500）
//   2. node tools/parity/present_parity.js
//
// 突き合わせる内容（どちらの経路でも同じであること）
//   ・コアのイベント列（ここが違えばルールの問題。演出の話ではない）
//   ・演出の呼び出し（対象・量・順番。固有VFXが片側だけ出ない状態を検出する）
//   ・盤面の並びの変化（召喚の位置・順番・詰め直しの食い違いを検出する）
//   ・ダメージ数値が必ず対象カードの上に出ること
//   ・再生が終わった後にカードの複製が残らないこと
// ═══════════════════════════════════════
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

// ── 検査する盤面 ────────────────────────────────
// 演出の種類ごとに、それを必ず通るカードを選ぶ。
// なぜそのカードなのかを必ず一行で書いておくこと。
const SCENARIOS = [
  {
    name: '固有VFXと肩代わり',
    // C003ゴーレム（負傷で+2/+2）とC002マータ（ダメージの半分を肩代わり）。
    // 個別VFXを持つ4枚のうちの2枚。発生元の決め方が食い違うと即座に出なくなる。
    seed: 4242,
    p1: [['ゴーレム', 'A0', { atk: 40, hp: 60, maxHp: 60 }], ['マータ', 'A1', { atk: 2, hp: 40, maxHp: 40 }]],
    p2: [['ゴブリン', 'E0', { atk: 6, hp: 30, maxHp: 30 }], ['オーク', 'E1', { atk: 6, hp: 30, maxHp: 30 }]],
  },
  {
    name: '戦闘中の召喚',
    // スケルトンキングは攻撃時に召喚する＝戦闘中の召喚。
    // 配置（前衛の右端）と、召喚体が割り込んで攻撃する順番を見る。
    seed: 777,
    p1: [['スケルトンキング', 'A0', { hp: 40, maxHp: 40 }]],
    p2: [['ゴブリン', 'E0', { atk: 5, hp: 40, maxHp: 40 }]],
  },
  {
    name: 'マナ効果',
    // ダイアウルフは「Nマナ毎」の効果を持つ。マナ効果VFXの間引き規則が
    // 食い違うと、片側だけVFXが出ない／出過ぎる。
    seed: 31337,
    mana: { p1: 6, p2: 0 },
    p1: [['ダイアウルフ', 'A0', { hp: 30, maxHp: 30 }]],
    p2: [['ゴブリン', 'E0', { atk: 5, hp: 40, maxHp: 40 }]],
  },
  {
    name: '薙ぎ払い',
    // アラッサス（C043）は全体攻撃で、炎が通過した瞬間に対象ごとの数値を出す。
    // 通常の被弾演出とは別経路なので、片側だけ数値が重なる／出ないが起きやすい。
    seed: 909,
    p1: [['アラッサス', 'A0', { hp: 40, maxHp: 40 }]],
    p2: [['ゴブリン', 'E0', { atk: 2, hp: 8, maxHp: 8 }],
         ['オーク', 'E1', { atk: 2, hp: 8, maxHp: 8 }],
         ['ゴブリン', 'E2', { atk: 2, hp: 8, maxHp: 8 }]],
  },
];

// 画面を見張る仕掛け。PvE・オンラインの双方で同じものを使う。
const WATCHER = `
  window.__watch = { vfx: [], onCard: [], offCard: [], calls: [], board: [] };
  // 画面上の要素の並びは、位置の取り直し等で増減して当てにならない。
  // 「どの演出関数を、どの対象へ、どの順で呼んだか」を記録して比べる。
  if (!window.__hitVfxHooked) {
    window.__hitVfxHooked = true;
    const origEffect = window._playCardEffectVfx;
    if (typeof origEffect === 'function') {
      window._playCardEffectVfx = function (code, targets) {
        try {
          window.__watch.calls.push(String(code) + '→' + (targets || []).map(t => t && t.id).join('/'));
        } catch (e) { window.__watch.calls.push('?'); }
        return origEffect.apply(this, arguments);
      };
    }
    const orig = window.playHitVfx;
    window.playHitVfx = function (side, unit, amount, opt) {
      try {
        const src = opt && opt.effectSource && typeof getCharacterEffectVfxPath === 'function'
          ? (getCharacterEffectVfxPath(opt.effectSource) || '') : '';
        window.__watch.calls.push((src.split('/').pop() || 'hit.webp') + '(' + (amount || 0) + ')→'
          + (unit && unit.id));
      } catch (e) { window.__watch.calls.push('?'); }
      return orig.apply(this, arguments);
    };
  }
  window.__watching = true;
  (function w() {
    if (!window.__watching) return;
    document.querySelectorAll('.damage-vfx-host img,.damage-vfx-host video').forEach(m => {
      const src = String(m.src || m.currentSrc || '').split('/').pop().split('?')[0];
      if (src && !window.__watch.vfx.includes(src)) window.__watch.vfx.push(src);
    });
    document.querySelectorAll('.damage-label-host').forEach(h => {
      const hr = h.getBoundingClientRect();
      if (hr.width <= 0) return;
      const cx = hr.left + hr.width / 2, cy = hr.top + hr.height / 2;
      const on = [...document.querySelectorAll('#f-ally .slot[data-unit-id],#f-enemy .slot[data-unit-id]')]
        .some(s => { const r = s.getBoundingClientRect();
          return cx >= r.left - 6 && cx <= r.right + 6 && cy >= r.top - 6 && cy <= r.bottom + 6; });
      const key = (h.textContent || '').trim() + '@' + Math.round(cx) + ',' + Math.round(cy);
      const list = on ? window.__watch.onCard : window.__watch.offCard;
      if (!list.includes(key)) list.push(key);
    });
    // 盤面の並び（左から順のID）。変わった時だけ記録する。
    // 召喚の位置・順番・詰め直しが食い違うと、この列が食い違う。
    const ids = f => [...document.querySelectorAll('#' + f + ' .slot[data-unit-id]')]
      .map(s => ({ x: s.getBoundingClientRect().left, id: s.dataset.unitId }))
      .sort((a, b) => a.x - b.x).map(o => o.id).join(',');
    const line = ids('f-ally') + ' / ' + ids('f-enemy');
    if (window.__watch.board[window.__watch.board.length - 1] !== line) window.__watch.board.push(line);
    requestAnimationFrame(w);
  })();
`;

// 集めた結果を返す式。**return の直後に改行を置かないこと**（ASIで undefined が返る）。
const COLLECT = `
  ({
    vfx: window.__watch.vfx.slice().sort(),
    calls: window.__watch.calls.slice(),
    board: window.__watch.board.slice(),
    onCard: window.__watch.onCard.length,
    // 一度でもカードの上に出た数値は、対象が消えた後の残り姿を数えない。
    offCard: window.__watch.offCard.filter(k => !window.__watch.onCard.includes(k)),
    events: (window.__coreEvents || []).map(e => e.type + ':' + (e.unitId || e.attackerId || '')
      + ':' + (e.amount != null ? e.amount : '')),
    ended: !!window.__playbackEnded,
    leftovers: {
      attackClone: document.querySelectorAll('.attack-motion-clone').length,
      motionHidden: document.querySelectorAll('.slot.motion-hidden').length,
    },
  })
`;

// カードのマスタから戦闘用の体を作る補助。PvE・オンラインで同じ値になるようにする。
const SETUP = `
  const pick = n => PANEL_POOL.find(x => x && x.name === n);
  const unit = (n, id, side, slot, over) => {
    const c = pick(n);
    return Object.assign({
      id, name: n, lane: 'front', slot, side,
      no: c && c.no, artCode: c && c.artCode,
      atk: Number(c && c.power) || 3, hp: Number(c && c.life) || 6,
      maxHp: Number(c && c.life) || 6,
      color: (c && c.color) || '赤', keywords: ((c && c.keywords) || []).slice(),
      desc: String((c && c.desc) || ''),
      manaCost: Number(c && c.manaCost) || 0, manaRepeat: !!(c && c.manaRepeat),
      _manaThresholdDesc: String((c && c._manaThresholdDesc) || ''),
    }, over || {});
  };
  // オンラインへ渡す形（versus.js が送るのと同じ項目だけ）。
  const wire = (n, id, over) => {
    const u = unit(n, id, 'p1', 0, over);
    const c = pick(n);
    return { id, name: n, atk: u.atk, hp: u.hp, maxHp: u.maxHp, color: u.color,
      keywords: u.keywords, desc: u.desc, no: c && c.no, art: c && c.artCode,
      manaCost: u.manaCost, manaRepeat: u.manaRepeat,
      effectData: { manaCost: u.manaCost, manaRepeat: u.manaRepeat,
        manaThresholdDesc: u._manaThresholdDesc, extraManaThresholds: [],
        effectNames: [], effectTexts: [] } };
  };
`;

const pveScript = sc => `
  ${SETUP}
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('scr-battle').classList.add('active');
  G.allies = new Array(14).fill(null); G.enemies = new Array(14).fill(null);
  ${sc.p1.map(([n, id, o], i) => `G.allies[${i}] = unit(${JSON.stringify(n)}, ${JSON.stringify(id)}, 'p1', ${i}, ${JSON.stringify(o || {})});`).join('\n  ')}
  ${sc.p2.map(([n, id, o], i) => `G.enemies[${i}] = unit(${JSON.stringify(n)}, ${JSON.stringify(id)}, 'p2', ${i}, ${JSON.stringify(o || {})});`).join('\n  ')}
  G.phase = 'battle'; G.life = 3; G._waveLife = 3; G.gold = 0;
  G.mana = ${(sc.mana && sc.mana.p1) || 0}; G._enemyMana = ${(sc.mana && sc.mana.p2) || 0};
  G.rings = []; G.activeBattleItems = [];
  G.battleCounters = { damage: 0, deaths: 0 }; G._battleRunId = 1; G._battleMotionDepth = 0;
  G._debugFormationAbort = false; G._testBattleAbort = false; G._battleVictoryPending = false;
  G._battleCoreEvents = []; G._blood = 0;
  // オンライン側と同じ乱数種にする。battlePhase() を直接呼ぶため startBattle() を
  // 通らないので、乱数はここで揃える。同じ盤面・同じ種なら演出まで一致するはず。
  G._battleCoreSeed = ${sc.seed};
  if (typeof coreMathRng !== 'undefined' && coreMathRng && typeof coreMathRng.seed === 'function') {
    coreMathRng.seed(${sc.seed});
  }
  window.__playbackEnded = false;
  if (typeof presentResetPlayback === 'function') presentResetPlayback();
  renderAll();
  await new Promise(r => requestAnimationFrame(r));
  // 開戦処理はオンライン側（sim）も必ず通る。ここで通しておかないと、
  // 開戦で解決されるはずのマナ閾値などが戦闘ループへずれ込み、比較にならない。
  if (typeof _finishNewPanelBattleStartEffects === 'function') {
    try { await _finishNewPanelBattleStartEffects(); } catch (e) { /* 開戦効果が無い盤面 */ }
  }
  await new Promise(r => requestAnimationFrame(r));
  // 見張りは開戦が済んでから始める（登場演出は比較の対象外）。
  ${WATCHER}
  try {
    await Promise.race([
      battlePhase().then(() => { window.__playbackEnded = true; }),
      new Promise(r => setTimeout(() => r(0), 90000)),
    ]);
  } catch (e) { window.__watching = false; return { エラー: String(e && e.message || e) }; }
  await new Promise(r => setTimeout(r, 400));
  window.__watching = false;
  window.__coreEvents = G._battleCoreEvents || [];
  return (${COLLECT});
`;

const onlineScript = sc => `
  ${SETUP}
  if (typeof simulateOnlineBattle !== 'function') return { エラー: 'simが無い' };
  const p1 = [${sc.p1.map(([n, id, o]) => `wire(${JSON.stringify(n)}, ${JSON.stringify(id)}, ${JSON.stringify(o || {})})`).join(', ')}];
  const p2 = [${sc.p2.map(([n, id, o]) => `wire(${JSON.stringify(n)}, ${JSON.stringify(id)}, ${JSON.stringify(o || {})})`).join(', ')}];
  const out = simulateOnlineBattle({
    seed: ${sc.seed},
    sides: { p1: { units: p1 }, p2: { units: p2 } },
    resources: { p1: { mana: ${(sc.mana && sc.mana.p1) || 0}, gold: 0 },
                 p2: { mana: ${(sc.mana && sc.mana.p2) || 0}, gold: 0 } },
    rings: { p1: [], p2: [] }, items: { p1: [], p2: [] },
    summonDefs: PANEL_POOL,
  });
  out.formations = { p1: { units: p1 }, p2: { units: p2 } };
  window.__playbackEnded = false;
  if (typeof presentResetPlayback === 'function') presentResetPlayback();
  beginOnlineVersusField(out);
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  ${WATCHER}
  // PvE側は開戦を済ませてから見張りを始める。オンラインも同じ土俵にするため、
  // 最初のturn_beginが来た時点で記録をやり直す（登場演出は比較の対象外）。
  let __started = false;
  const __resetWatch = () => {
    window.__watch.vfx.length = 0; window.__watch.calls.length = 0;
    window.__watch.board.length = 0;
    window.__watch.onCard.length = 0; window.__watch.offCard.length = 0;
  };
  try {
    await Promise.race([
      playOnlineBattleEvents(out, { onEvent: (ev, ctx) => {
        if (!__started && ev && ev.type === ONLINE_EVENT.TURN_BEGIN) { __started = true; __resetWatch(); }
        return renderOnlineVersusBoard(ev, ctx);
      } }).then(() => { window.__playbackEnded = true; }),
      new Promise(r => setTimeout(() => r(0), 90000)),
    ]);
  } finally {
    await new Promise(r => setTimeout(r, 400));
  }
  window.__watching = false;
  window.__coreEvents = out.events || [];
  const got = ${COLLECT};
  hideOnlineVersusBoard();
  return got;
`;

(async () => {
  const b = await launch();
  try {
    await b.call('Emulation.setDeviceMetricsOverride',
      { width: 1860, height: 1180, deviceScaleFactor: 1, mobile: false });
    await b.goto(BASE, 1500);
    await b.waitFor("typeof G!=='undefined' && typeof battlePhase==='function' && typeof PANEL_POOL!=='undefined' && PANEL_POOL.length>0");

    // ── 比べる前の正規化 ────────────────────────
    // 召喚体のIDは実行ごとに通し番号が進むため、そのままでは必ず食い違う。
    // 「その実行の中で何番目に出てきた召喚体か」へ置き換えて比べる。
    // 同じ実行の中では**同じ番号**を使う（イベント列・演出・盤面で対応が取れるように）。
    const makeNormalizer = () => {
      const map = new Map();
      const fix = s => String(s).replace(/-summon-\d+/g, m => {
        if (!map.has(m)) map.set(m, '-召喚' + (map.size + 1));
        return map.get(m);
      });
      return list => (list || []).map(fix);
    };
    // PvEの検査は戦闘ループだけを回す（開戦はstartBattle側で済ませる前提の関数のため）。
    // オンラインは開戦から流れてくるので、最初のturn_beginより前と決着後を落として揃える。
    const battleLoopOnly = list => {
      const arr = (list || []);
      const from = arr.findIndex(e => String(e).startsWith('turn_begin'));
      const sliced = from >= 0 ? arr.slice(from) : arr;
      const end = sliced.findIndex(e => String(e).startsWith('battle_end'));
      return end >= 0 ? sliced.slice(0, end) : sliced;
    };

    for (const sc of SCENARIOS) {
      const pve = await b.eval(pveScript(sc));
      const online = await b.eval(onlineScript(sc));
      [pve, online].forEach(r => {
        if (!r || r.エラー) return;
        // 番号はイベント列に現れた順で決める。演出・盤面もその対応で読み替える。
        const norm = makeNormalizer();
        r.events = battleLoopOnly(norm(r.events));
        r.calls = norm(r.calls);
        r.board = norm(r.board).filter(x => String(x).replace(/[\s/]/g, '') !== '');
      });
      const tag = `【${sc.name}】`;
      if (!pve || pve.エラー) { check(`${tag}PvEの再生が動く`, false, (pve && pve.エラー) || '結果が返らない'); continue; }
      if (!online || online.エラー) { check(`${tag}オンラインの再生が動く`, false, (online && online.エラー) || '結果が返らない'); continue; }

      check(`${tag}最後まで再生できた`, pve.ended && online.ended,
        `PvE=${pve.ended ? '完走' : '打ち切り'} オンライン=${online.ended ? '完走' : '打ち切り'}`);
      const pveEv = (pve.events || []).join('|');
      const onEv = (online.events || []).join('|');
      const firstDiff = (pve.events || []).findIndex((x, i) => x !== (online.events || [])[i]);
      check(`${tag}コアのイベント列が一致する`, pveEv === onEv,
        pveEv === onEv ? `${(pve.events || []).length}件`
          : `PvE=${(pve.events || []).length}件 オンライン=${(online.events || []).length}件`
            + ` 最初の相違=${firstDiff}（${(pve.events || [])[firstDiff]} / ${(online.events || [])[firstDiff]}）`);

      const pveCalls = (pve.calls || []).join('→');
      const onCalls = (online.calls || []).join('→');
      check(`${tag}演出の呼び出し（対象と順番）が一致する`, pveCalls === onCalls,
        pveCalls === onCalls ? `${(pve.calls || []).length}回`
          : `PvE=${pveCalls || 'なし'}\n\tオンライン=${onCalls || 'なし'}`);

      const pveBoard = (pve.board || []).join(' ⇒ ');
      const onBoard = (online.board || []).join(' ⇒ ');
      check(`${tag}盤面の並びの変化が一致する`, pveBoard === onBoard,
        pveBoard === onBoard ? `${(pve.board || []).length}段階`
          : `PvE=${pveBoard || 'なし'}\n\tオンライン=${onBoard || 'なし'}`);

      check(`${tag}数値がカード外に出ない`,
        (pve.offCard || []).length === 0 && (online.offCard || []).length === 0,
        `PvE=${(pve.offCard || []).join(' / ') || 'なし'} オンライン=${(online.offCard || []).join(' / ') || 'なし'}`);
      check(`${tag}カードの複製が残らない`,
        pve.leftovers.attackClone === 0 && pve.leftovers.motionHidden === 0
        && online.leftovers.attackClone === 0 && online.leftovers.motionHidden === 0,
        `PvE=複製${pve.leftovers.attackClone}/非表示${pve.leftovers.motionHidden}`
        + ` オンライン=複製${online.leftovers.attackClone}/非表示${online.leftovers.motionHidden}`);
    }

    const errs = (await b.consoleErrors()).filter(e => !/404|Failed to load resource/.test(e));
    check('コンソールに例外が無い', errs.length === 0, errs[0] || 'なし');
  } finally { await b.close(); }

  let ng = 0;
  results.forEach(x => { if (!x.ok) ng++; console.log(`${x.ok ? 'OK ' : 'NG '}\t${x.name}\t${x.detail || ''}`); });
  console.log(`演出一致検証: NG ${ng}`);
  process.exitCode = ng ? 1 : 0;
})();
