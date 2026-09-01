'use strict';
// ═══════════════════════════════════════
// tools/parity/present_parity.js — 演出（再生層）がPvEとオンラインで一致するかを見る。
//
// これまでの検査は core.js の中身と、オンラインへ渡すデータだけを比べていた。
// **見え方そのもの**は誰も比べておらず、実際に
//   ・オンラインだけキャラクター固有VFXが一つも出ない
//   ・倒れたカードが残る／数値が何もない場所へ出る
// といった片側だけの不具合が出た。ここでは同じ盤面を両方の経路で実際に再生し、
// 画面に出たものを比べる。
//
//   1. ローカルサーバーを立てる（既定 http://127.0.0.1:5500）
//   2. node tools/parity/present_parity.js
//
// 検査する内容（どちらの経路でも同じであること）
//   ・使われたVFX素材の種類（固有VFXが片側だけ出ない状態を検出する）
//   ・ダメージ数値が必ず対象カードの上に出ること
//   ・再生が終わった後にカードの複製が残らないこと
// ═══════════════════════════════════════
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

// 画面を見張る仕掛け。PvE・オンラインの双方で同じものを使う。
const WATCHER = `
  window.__watch = { vfx: [], seq: [], seen: new Set(), onCard: [], offCard: [], calls: [] };
  // 「呼ばれたのに消された」のか「そもそも呼ばれていない」のかを分けて見る。
  if (!window.__hitVfxHooked) {
    window.__hitVfxHooked = true;
    const origEffect = window._playCardEffectVfx;
    if (typeof origEffect === 'function') {
      window._playCardEffectVfx = function (code, targets, opt) {
        try {
          window.__watch.calls.push(String(code) + '→' +
            (targets || []).map(t => t && t.id).join('/'));
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
      if (!src) return;
      if (!window.__watch.vfx.includes(src)) window.__watch.vfx.push(src);
      // 同じ<img>を何度も数えないよう、要素ごとに1回だけ順番へ記録する。
      if (!window.__watch.seen.has(m)) { window.__watch.seen.add(m); window.__watch.seq.push(src); }
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
    requestAnimationFrame(w);
  })();
`;

// 見張りを止めて、残留物とあわせて結果を返す。
const COLLECT = `
  ({
    vfx: window.__watch.vfx.slice().sort(),
    seq: window.__watch.seq.slice(),
    calls: window.__watch.calls.slice(),
    onCard: window.__watch.onCard.length,
    // 一度でもカードの上に出た数値は、対象が消えた後の残り姿を数えない。
    offCard: window.__watch.offCard.filter(k => !window.__watch.onCard.includes(k)),
    events: (window.__coreEvents || []).map(e => e.type + ':' + (e.unitId || e.attackerId || '') + ':' + (e.amount != null ? e.amount : '')),
    leftovers: {
      attackClone: document.querySelectorAll('.attack-motion-clone').length,
      motionHidden: document.querySelectorAll('.slot.motion-hidden').length,
    },
  })
`;

// 両経路で使う盤面。固有VFXを持つカード（C003ゴーレム／C002マータ）を必ず含める。
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
    }, over || {});
  };
`;

(async () => {
  const b = await launch();
  try {
    await b.call('Emulation.setDeviceMetricsOverride',
      { width: 1860, height: 1180, deviceScaleFactor: 1, mobile: false });
    await b.goto(BASE, 1500);
    await b.waitFor("typeof G!=='undefined' && typeof battlePhase==='function' && typeof PANEL_POOL!=='undefined' && PANEL_POOL.length>0");

    // ── PvE ──────────────────────────────────
    const pve = await b.eval(`
      ${SETUP}
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('scr-battle').classList.add('active');
      G.allies = new Array(14).fill(null); G.enemies = new Array(14).fill(null);
      G.allies[0] = unit('ゴーレム', 'A0', 'p1', 0, { atk: 40, hp: 60, maxHp: 60 });
      G.allies[1] = unit('マータ', 'A1', 'p1', 1, { atk: 2, hp: 40, maxHp: 40 });
      G.enemies[0] = unit('ゴブリン', 'E0', 'p2', 0, { atk: 6, hp: 30, maxHp: 30 });
      G.enemies[1] = unit('オーク', 'E1', 'p2', 1, { atk: 6, hp: 30, maxHp: 30 });
      G.phase = 'battle'; G.life = 3; G._waveLife = 3; G.mana = 0; G.gold = 0;
      G.rings = []; G.activeBattleItems = [];
      G.battleCounters = { damage: 0, deaths: 0 }; G._battleRunId = 1; G._battleMotionDepth = 0;
      G._debugFormationAbort = false; G._testBattleAbort = false; G._battleVictoryPending = false;
      G._battleCoreEvents = []; G._blood = 0;
      // オンライン側と同じ乱数種にする。同じ盤面・同じ種なら、
      // 出るVFXの順番と回数まで一致していなければならない。
      // battlePhase() を直接呼ぶため、startBattle() を通らない。乱数はここで揃える。
      G._battleCoreSeed = 4242;
      if (typeof coreMathRng !== 'undefined' && coreMathRng && typeof coreMathRng.seed === 'function') {
        coreMathRng.seed(4242);
      }
      if (typeof presentResetPlayback === 'function') presentResetPlayback();
      renderAll();
      await new Promise(r => requestAnimationFrame(r));
      ${WATCHER}
      try {
        await Promise.race([battlePhase(), new Promise(r => setTimeout(() => r(0), 25000))]);
      } catch (e) { window.__watching = false; return { エラー: String(e && e.message || e) }; }
      await new Promise(r => setTimeout(r, 400));
      window.__watching = false;
      window.__coreEvents = G._battleCoreEvents || [];
      return (${COLLECT});
    `, 40000);

    // ── オンライン ────────────────────────────
    const online = await b.eval(`
      ${SETUP}
      if (typeof simulateOnlineBattle !== 'function') return { エラー: 'simが無い' };
      const mk = (n, id, over) => {
        const u = unit(n, id, 'p1', 0, over);
        const c = pick(n);
        return { id, name: n, atk: u.atk, hp: u.hp, maxHp: u.maxHp, color: u.color,
          keywords: u.keywords, desc: u.desc, no: c && c.no, art: c && c.artCode,
          manaCost: Number(c && c.manaCost) || 0,
          effectData: { manaCost: Number(c && c.manaCost) || 0, effectNames: [], effectTexts: [] } };
      };
      const p1 = [mk('ゴーレム', 'A0', { atk: 40, hp: 60, maxHp: 60 }),
                  mk('マータ', 'A1', { atk: 2, hp: 40, maxHp: 40 })];
      const p2 = [mk('ゴブリン', 'E0', { atk: 6, hp: 30, maxHp: 30 }),
                  mk('オーク', 'E1', { atk: 6, hp: 30, maxHp: 30 })];
      const out = simulateOnlineBattle({
        seed: 4242,
        sides: { p1: { units: p1 }, p2: { units: p2 } },
        resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
        rings: { p1: [], p2: [] }, items: { p1: [], p2: [] },
        summonDefs: PANEL_POOL,
      });
      out.formations = { p1: { units: p1 }, p2: { units: p2 } };
      if (typeof presentResetPlayback === 'function') presentResetPlayback();
      beginOnlineVersusField(out);
      await new Promise(r => requestAnimationFrame(r));
      ${WATCHER}
      try {
        await Promise.race([
          playOnlineBattleEvents(out, { onEvent: (ev, ctx) => renderOnlineVersusBoard(ev, ctx) }),
          new Promise(r => setTimeout(() => r(0), 25000)),
        ]);
      } finally {
        await new Promise(r => setTimeout(r, 400));
      }
      window.__watching = false;
      const got = ${COLLECT};
      hideOnlineVersusBoard();
      return got;
    `, 45000);

    if (!pve || pve.エラー) {
      check('PvEの再生が動く', false, (pve && pve.エラー) || '結果が返らない');
    } else if (!online || online.エラー) {
      check('オンラインの再生が動く', false, (online && online.エラー) || '結果が返らない');
    } else {
      const pveVfx = (pve.vfx || []).join(',');
      const onVfx = (online.vfx || []).join(',');
      check('数値が出ている（PvE）', Number(pve.onCard) > 0, `カード上=${pve.onCard}件`);
      check('数値が出ている（オンライン）', Number(online.onCard) > 0, `カード上=${online.onCard}件`);
      check('使われたVFX素材が一致する', pveVfx === onVfx,
        `PvE=[${pveVfx || 'なし'}] オンライン=[${onVfx || 'なし'}]`);
      const pveEv = (pve.events || []).join('|');
      const onEv = (online.events || []).join('|');
      check('コアのイベント列が一致する', pveEv === onEv,
        pveEv === onEv ? `${(pve.events || []).length}件`
          : `PvE=${(pve.events || []).length}件 オンライン=${(online.events || []).length}件`
            + ` 最初の相違=${(pve.events || []).findIndex((x, i) => x !== (online.events || [])[i])}`);
      const pveCalls = (pve.calls || []).join('→');
      const onCalls = (online.calls || []).join('→');
      check('演出の呼び出し（対象と順番）が一致する', pveCalls === onCalls,
        `PvE=${pveCalls || 'なし'}\n\tオンライン=${onCalls || 'なし'}`);
      check('固有VFXが両方で出ている',
        (pve.vfx || []).some(v => /^C\d{3}\./.test(v)) && (online.vfx || []).some(v => /^C\d{3}\./.test(v)),
        `PvE=[${pveVfx || 'なし'}] オンライン=[${onVfx || 'なし'}]`);
      check('数値がカード外に出ない（PvE）', (pve.offCard || []).length === 0,
        (pve.offCard || []).join(' / ') || 'なし');
      check('数値がカード外に出ない（オンライン）', (online.offCard || []).length === 0,
        (online.offCard || []).join(' / ') || 'なし');
      check('カードの複製が残らない（PvE）',
        pve.leftovers.attackClone === 0 && pve.leftovers.motionHidden === 0,
        `攻撃複製=${pve.leftovers.attackClone} 非表示=${pve.leftovers.motionHidden}`);
      check('カードの複製が残らない（オンライン）',
        online.leftovers.attackClone === 0 && online.leftovers.motionHidden === 0,
        `攻撃複製=${online.leftovers.attackClone} 非表示=${online.leftovers.motionHidden}`);
    }

    const errs = (await b.consoleErrors()).filter(e => !/404|Failed to load resource/.test(e));
    check('コンソールに例外が無い', errs.length === 0, errs[0] || 'なし');
  } finally { await b.close(); }

  let ng = 0;
  results.forEach(x => { if (!x.ok) ng++; console.log(`${x.ok ? 'OK ' : 'NG '}\t${x.name}\t${x.detail || ''}`); });
  console.log(`演出一致検証: NG ${ng}`);
  process.exitCode = ng ? 1 : 0;
})();
