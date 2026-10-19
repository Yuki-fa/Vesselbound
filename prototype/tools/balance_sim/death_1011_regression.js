'use strict';
// 2026-10-11: ケットシー＋E006＋E067、EN011、指輪なし。コアの発動と表示の発動を別々に数える。
const assert = require('node:assert/strict');
const h = require('./presentation_1011_harness');
const { sheetRows, damageRepetitions } = require('./sheet_data');
const plain = (id, extra = {}) => ({ id, name: id, atk: 1, hp: 100, maxHp: 100, lane: 'front', keywords: [], ...extra });
const panel = no => makePanel(PANEL_POOL.find(c => c.no === no).id);
function formation(no, effectNo, merged = false) {
  initState(); G._wave = 1; G.rings = []; G.mainBoard.fill(null);
  const character = panel(no); character.directions = ['left', 'right']; G.mainBoard[1] = character;
  const death = panel(effectNo); if (merged) applyMergedPanelForm(death);
  death.directions = ['right']; G.mainBoard[0] = death;
  const cover = panel('E067'); cover.directions = ['left']; G.mainBoard[2] = cover;
  return buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => {
    entry.unit.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
    return { ...entry.unit, id: 'cat' };
  });
}
function kill(units, shield, side = 'p1') {
  const other = side === 'p1' ? 'p2' : 'p1';
  const ainsel = ENEMY_POOL.find(c => c.no === 'EN011');
  const ward = bit => ({ shield: shield & bit ? 1 : 0, keywords: shield & bit ? ['結界1'] : [] });
  const foes = [plain('ainsel', { ...ainsel, atk: 9, hp: 100, maxHp: 100, ...ward(1) }), plain('foe1', ward(2)), plain('foe2', ward(4))];
  const state = createBattleState({ sides: { [side]: { units, rings: [] }, [other]: { units: foes, rings: [] } },
    summonDefs: [...PANEL_POOL, ...ENEMY_POOL] });
  const before = h.copy(state), events = [], emit = e => events.push(e), rng = createSeededRng(7);
  const hit = (source, target, amount, counter, skipSourceEffects, skipTough, options) =>
    coreResolveHit(state, source, target, amount, counter, rng, emit, { skipSourceEffects, skipTough, ...options });
  hit(state.units[other][0], state.units[side][0], 100, false);
  return { state, before, events, emit, rng, hit, side, other };
}
(async () => {
  await h.ready;
  let checked = 0;
  // mask=5は「防ぐ→通る→防ぐ」。修正前は通常1発のVFXが3発へ分裂する。
  for (const side of ['p1', 'p2']) for (const shield of [5, 7, 1, 0]) for (const merged of [false, true]) {
    const run = kill(formation('C074', 'E006', merged), shield, side);
    const dead = run.events.filter(e => e.type === 'death' && e.unitId === 'cat');
    const damages = run.events.filter(e => e.type === 'damage' && e.sourceId === 'cat' && e.damageKind === 'death_effect');
    // 2026-10-12: 合体反復の期待値はシート本文から読む。
    const row = sheetRows('enchant').find(r => r['No.'] === 'E006');
    const text = merged ? row['合体効果'] : row['効果'];
    const expected = damageRepetitions(text);
    assert.equal(dead.length, 1, 'ケットシーの死亡は1件');
    assert.equal(damages.length, expected * 3, '敵3体×本文の反復回数');
    assert.equal(run.events.filter(e => e.type === 'effect_flash' && e.unitId === 'cat' && e.trigger === 'death').length, 1);
    const after = run.events.length;
    coreApplyDeathEffects(run.state.units[side][0], run.state, run.rng, run.emit, run.hit);
    assert.equal(run.events.length, after, '同じ死亡の再入で効果を重複しない');
    for (const online of [false, true]) {
      const state = online ? h.copy(run.before) : run.state;
      h.setup(state); await h.replay(state, run.events, online);
      const fires = h.calls.filter(c => c.code === 'E006');
      assert.equal(fires.length, expected, `${side} 結界${shield} ${merged ? '合体' : '通常'} ${online ? 'オンライン' : 'PvE'} 闇の炎のVFXは${expected}回: ${JSON.stringify(h.calls)}`);
      assert.ok(fires.every(c => new Set(c.targets).size === 3), '同時対象は1つの波');
      checked++;
    }
  }
  // ケットシーが負傷して黄ナイトキャットを召喚した後に死亡する、利用者構成の戦闘全体。
  const units = formation('C074', 'E006');
  const run = kill(units, 1); // EN011の結界1を含む開始状態を使い、即死させず複数の手番を解決する。
  const state = run.before; state.units.p2[0].atk = 1;
  const events = [];
  runBattleCore(state, createSeededRng(7), { onEvent: e => events.push(e), turnLimit: 40 });
  assert.ok(events.some(e => e.type === 'summon' && /ナイトキャット/.test(e.unit.name)), '負傷召喚を含む');
  assert.equal(events.filter(e => e.type === 'death' && e.unitId === 'cat').length, 1);
  assert.equal(events.filter(e => e.type === 'damage' && e.sourceId === 'cat' && e.damageKind === 'death_effect').length,3);
  assert.ok(events.some(e=>e.type==='shield_lost'),'エインセルの結界消失を含む');
  // 全ての死亡本文（キャラ・強化）で、同一死亡への再入は追加イベントを出さない。
  for (const key of ['card', 'enchant']) for (const row of sheetRows(key).filter(r => /(?:死亡|攻撃[＆&]死亡)\s*[：:；]/.test(r['効果'] || ''))) {
    const definition = PANEL_POOL.find(c => c.no === row['No.']); if (!definition) throw new Error('定義なし: ' + row['No.']);
    const unit = key === 'card' ? { ...definition, ...plain('subject'), name: definition.name, desc: definition.desc, keywords: definition.keywords || [] }
      : { ...plain('subject'), boardCards:[definition], _adjacentPanelEffectTexts: [definition.desc], _resonanceEffectNames: [definition.name] };
    const r = kill([unit, plain('friend')], 5); const count = r.events.length;
    // 復活した体は別の生存期間へ移っている。次の死亡を伴わない再呼び出しは検査対象にしない。
    if (r.state.units.p1[0].hp <= 0) coreApplyDeathEffects(r.state.units.p1[0], r.state, r.rng, r.emit, r.hit);
    assert.equal(r.events.length, count, definition.name + ' 同じ死亡で二重発動しない'); checked++;
    const damages=r.events.filter(e=>e.type==='damage'&&e.sourceId==='subject'&&e.damageKind==='death_effect');
    if(damages.length&&presentLabFx(definition.no)) for(const online of [false,true]) {
      const expected=new Set(damages.map(e=>presentDamageGroupKey(e))).size;
      h.setup(online?h.copy(r.before):r.state);await h.replay(online?h.copy(r.before):r.state,r.events,online);
      assert.equal(h.calls.filter(c=>c.code===definition.no).length,expected,definition.name+' 死亡ダメージのVFXを結界ごとに分裂させない');checked++;
    }
  }
  console.log(`2026-10-11 死亡効果: ${checked}件OK（コア・PvE・オンライン）`);
})().catch(e => { console.error(e); process.exitCode = 1; });
