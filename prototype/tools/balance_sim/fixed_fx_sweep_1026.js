// FIX 済みの演出が実際の戦闘（PvE・オンライン）で出るかを一括で確かめる（2026-10-26）。
// PRESENT_LAB_FX の各カード番号について、そのカードを含む盤面で戦闘を最後まで回し、演出（VbFx.play／_playCardEffectVfx の名前）を数える。
// PvE は本体と同じく1手ずつ（コアを1手進め、その手のイベントを再生してから詰める）。オンラインは全イベントを再生する。
// 盤面の型：通常／発生元がすぐ倒れる（死亡効果）／敵が毒を持つ（毒の倍化・発動）。
// 実行：node tools/balance_sim/fixed_fx_sweep_1026.js（ONLY=C001,C005 で絞る。OUT=ファイル で一覧をJSONで書き出す）。検査ではなく報告用（条件の揃わない効果は「未発動」と出る）。
const path = require('path'), root = path.resolve(__dirname, '../..');
process.chdir(__dirname);
const h = require(root + '/tools/balance_sim/presentation_1020b_harness');
const fs = require('fs'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + '/tools/vfx_preview/lab_fixed.js', 'utf8') + ';this.F=VbFxLabFixed;', ctx);
const FIXED = ctx.F;

function makeOwner(code, scenario) {
  let owner;
  if (code.startsWith('EN')) {
    const row = h.sheetRows('enemy').find(r => r['No.'] === code);
    if (!row) throw new Error('シートにない敵: ' + code);
    owner = h.unit('owner', null, { no: code, artCode: code, name: row['名前'], desc: row['効果'],
      keywords: String(row['キーワード'] || '').split(/\s+/).filter(Boolean), atk: 6, hp: 20, maxHp: 20 });
  } else if (code.startsWith('E')) owner = h.enchantUnit('owner', code, { atk: 4, hp: 12, maxHp: 12 });
  else owner = h.unit('owner', code);
  if (scenario.fragile) Object.assign(owner, { hp: 1, maxHp: 1 });
  return owner;
}
function board(code, scenario) {
  const foe = (id, o) => h.unit(id, null, { ...o, ...(scenario.poison ? { poison: 4 } : {}) });
  return h.setup({ sides: {
    p1: { units: [makeOwner(code, scenario), h.unit('a1', null, { atk: 3, hp: 9, maxHp: 9, manaOnAttack: 2 }),
      h.unit('a2', null, { atk: 2, hp: 7, maxHp: 7, keywords: ['眷属'], manaOnAttack: 2 })] },
    p2: { units: [foe('f0', { atk: 3, hp: 8, maxHp: 8 }), foe('f1', { atk: 2, hp: 10, maxHp: 10 }), foe('f2', { atk: 4, hp: 6, maxHp: 6 })] } } });
}
const sound = r => presentLabSoundCode(r.code);
const firedBy = all => all.some(e => e.sourceId === 'owner' && !['attack', 'damage', 'death'].includes(e.type)
  || e.type === 'effect_flash' && e.unitId === 'owner' || e.type === 'mana_threshold' && e.unitId === 'owner');

(async () => {
  await h.ready;
  const only = (process.env.ONLY || '').split(',').filter(Boolean), rows = [];
  for (const [code, spec] of Object.entries(PRESENT_LAB_FX)) {
    if (!/^(C|E|EN)\d{3}$/.test(code) || only.length && !only.includes(code)) continue;
    const shared = typeof PRESENT_ASSIGNED_SHARED_FX !== 'undefined' && PRESENT_ASSIGNED_SHARED_FX.has(code);
    // 共有の入口（対象バフ・キーワード）で描く割り当ては、その番号（S009 等）で数える。
    const want = c => c.name === spec[0] || shared && c.name === spec[3];
    const sound = presentLabSoundCode(code), heard = () => h.sounds.filter(v => v.code === sound).length;
    const res = { code, name: spec[0], fixed: !!FIXED[spec[0]], pve: 0, online: 0, fired: false, pveSnd: 0, onlineSnd: 0 };
    try { makeOwner(code, {}); } catch (e) { res.err = e.message; rows.push(res); continue; }
    for (const scenario of [{}, { fragile: true }, { poison: true }]) {
      try {
        let x = board(code, scenario); const runner = createBattleRunner(x.state, x.rng, x.emit), all = [];
        const flush = async () => { all.push(...x.events); await x.pve(); res.pve += h.calls.filter(want).length; res.pveSnd += heard(); h.calls.length = 0; h.sounds.length = 0; x.events.length = 0; };
        await flush(); // 開戦（runner を作った時点で出る）
        for (let i = 0; i < 120 && !runner.result; i++) { const stop = runner.step({ deferCompact: true }); await flush(); runner.compact(); if (stop) break; }
        runner.finish(); await flush();
        res.fired = res.fired || firedBy(all);
        x = board(code, scenario); runBattleCore(x.state, x.rng, { onEvent: x.emit }); await x.online();
        res.online += h.calls.filter(want).length; res.onlineSnd += heard();
      } catch (e) { res.err = String(e.message).slice(0, 100); }
    }
    rows.push(res);
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(rows, null, 1));
  const F = rows.filter(r => r.fixed);
  console.log('cards', rows.length, 'fixed', F.length, 'shown both', F.filter(r => r.pve > 0 && r.online > 0).length);
  console.log('one side only', F.filter(r => (r.pve > 0) !== (r.online > 0)).map(r => `${r.code}:${r.name}(pve${r.pve}/online${r.online})`).join(' '));
  console.log('fired but not shown', F.filter(r => r.fired && !r.pve && !r.online).map(r => r.code + ':' + r.name).join(' '));
  console.log('not triggered', F.filter(r => !r.fired && !r.pve && !r.online).map(r => r.code + ':' + r.name).join(' '));
  console.log('shown without sound', F.filter(r => (r.pve > 0 && !r.pveSnd) || (r.online > 0 && !r.onlineSnd)).map(r => `${r.code}:${r.name}(${sound(r)})`).join(' '));
  console.log('errors', rows.filter(r => r.err).map(r => r.code + ' ' + r.err).join(' / '));
})().catch(e => { console.error(e); process.exit(1); });
