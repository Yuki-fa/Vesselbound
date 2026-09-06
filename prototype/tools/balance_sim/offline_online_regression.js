'use strict';

// オフライン実戦ループとオンライン計算が共有するコアの回帰テスト。
// DOMを必要とするbattle.jsの演出は対象外にし、ルール結果とイベント列の一致を検証する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createSeededRng} = require('../../js/online/protocol');
const core = require('../../js/battle/core');
const sheetData = require('./sheet_data');
global.createSeededRng = createSeededRng;
global.createBattleState = core.createBattleState;
global.runBattleCore = core.runBattleCore;
global.battleCoreFinalState = core.battleCoreFinalState;
global.ONLINE_PROTOCOL_VERSION = 1;
const {simulateOnlineBattle} = require('../../js/online/sim');

function loadCharacterDefs() {
  // 列は必ずヘッダ名で引く（sheet_data.js）。位置で引くとシートへ列を1本足しただけで
  // 別の列を効果文として読み、一致検査が静かに無意味になる。
  return sheetData.characterCards().map(card => {
    const desc = card.desc || '';
    const mana = desc.match(/^(\d+)マナ(毎)?[:：]\s*(.+)$/);
    return {
      name: card.name, power: card.power || 1, life: card.life || 3,
      color: card.color || '赤', keywords: card.keywords.slice(),
      desc, manaCost: mana ? Number(mana[1]) : 0, manaRepeat: !!(mana && mana[2]),
      manaThresholdDesc: mana ? mana[3] : '',
    };
  });
}

function makeSetup() {
  return {
    seed: 0x51a7,
    resources: {p1: {mana: 0, gold: 10}, p2: {mana: 0, gold: 10}},
    sides: {
      p1: {units: [
        {id: 'p1-a', name: '共振役', atk: 3, hp: 6, maxHp: 6, color: '赤', _mapPanelPower: 'resonance', manaOnAttack: 1},
        {id: 'p1-b', name: '受け役', atk: 2, hp: 5, maxHp: 5, color: '赤', poison: 1},
      ]},
      p2: {units: [
        {id: 'p2-a', name: '相手', atk: 2, hp: 8, maxHp: 8, color: '青'},
      ]},
    },
  };
}

function runDirect(setup) {
  const state = core.createBattleState(setup);
  const events = [];
  const result = core.runBattleCore(state, createSeededRng(setup.seed), {
    onEvent: event => events.push(event),
    turnLimit: setup.turnLimit,
  });
  return {
    events,
    outcome: result.outcome,
    endReason: result.endReason,
    turns: result.turns,
    finalState: core.battleCoreFinalState(state),
  };
}

function main() {
  const pveBattle = fs.readFileSync(require.resolve('../../js/engine/battle.js'), 'utf8');
  assert.match(pveBattle, /coreResolveHit\(state,source,target,amount,counter/,
    'PvEアダプターが共通命中解決を呼び出していない');
  assert.match(pveBattle, /_flushCorePveHitEvents\(state,localEvents/,
    'PvEアダプターが共通命中イベントを演出へ接続していない');
  assert.doesNotMatch(pveBattle, /const pending=\[\]/,
    'PvEの共通効果経路に命中キューが残っている');
  const startBattle = pveBattle.slice(pveBattle.indexOf('async function startBattle'), pveBattle.indexOf('\n}', pveBattle.indexOf('async function startBattle')));
  assert.doesNotMatch(startBattle, /await _checkManaThresholdUnitEffects\(\)/,
    '開戦時マナ閾値が共通コア後に旧経路で二重発動する');
  const damageState = pveBattle.slice(pveBattle.indexOf('function _applyDamageState'), pveBattle.indexOf('// 団結：', pveBattle.indexOf('function _applyDamageState')));
  assert.doesNotMatch(damageState, /\n\s*applyKeywordOnHit\(/,
    'PvEのダメージ確定処理が旧キーワード経路を直接呼び出している');
  assert.match(pveBattle, /applyDamageBatch[\s\S]*coreResolveHit\(state,e\.source\|\|opt\.source,e\.unit,e\.amount/,
    'PvEのバッチダメージが共通命中解決へ接続されていない');
  assert.match(pveBattle, /_coreConsumedItemEvents[\s\S]*item_reward[\s\S]*clone\(e\.item\)/,
    'PvEのアイテム報酬がコアイベントを一度だけ消費していない');
  assert.match(pveBattle, /function _applyCoreShieldLostEffectsLive[\s\S]*const before=new Set[\s\S]*_flushCorePveHitEvents\(state,localEvents,before\)/,
    '結界破壊後のPvEイベント接続に基準集合がない');
  // 段階2：1ターン分の進行は coreBattleStep() が唯一の実装。
  // runBattleCore はその繰り返しであること（ターン順・攻撃者選択・毒・封印・終了条件を二重実装しない）。
  const coreSrc = fs.readFileSync(require.resolve('../../js/battle/core.js'), 'utf8');
  assert.match(coreSrc, /^function coreBattleStep\(ctx\) \{/m,
    '1ターン進行が coreBattleStep() として切り出されていない');
  // 進め方は runBattleCore の中の runner が唯一の実装。
  // PvEも createBattleRunner() 経由で同じ step() を呼ぶ。
  assert.match(coreSrc, /const next = coreBattleStep\(\{ units, state, rng, emit, applyHit, resolveSeals, decided, side, result \}\);/,
    'runBattleCore が coreBattleStep() を呼んでいない');
  assert.match(coreSrc, /function createBattleRunner\(state, rng, emit, opts\) \{/,
    'PvEが1手ずつ進めるための入口が無い');
  assert.equal(typeof core.coreBattleStep, 'function',
    'coreBattleStep が公開されていない（PvEから呼べない）');
  // 攻撃者の選択規則もコアが唯一の実装。PvEは写し取るだけであること。
  assert.match(coreSrc, /^function coreLaneAttackCandidates\(units, lane, isEnemySide\) \{/m,
    '手番を得られるユニットの列挙がコアに無い');
  assert.match(coreSrc, /^function corePickAttacker\(units, laneState, isEnemySide\) \{/m,
    '攻撃者選択がコアに無い');
  assert.match(pveBattle, /return coreLaneAttackCandidates\(arr,lane,isEnemy\);/,
    'PvEの_laneAttackCandidatesがコアへ委譲していない');
  assert.match(pveBattle, /const unit=corePickAttacker\(arr,state,isEnemy\);/,
    'PvEの_pickLaneAttackerがコアへ委譲していない');
  assert.doesNotMatch(pveBattle, /const max=isEnemy\?\(MAX_ENEMIES\|\|14\):\(MAX_ALLIES\|\|14\);/,
    'PvEに旧_laneAttackCandidatesの実装が残っている（コアとの二重実装）');
  // 挑発（hate）の残りターンは、行動した側についてコアが減らす。
  assert.match(coreSrc, /u\.hateTurns--;/,
    'コアが挑発の残りターンを減らしていない（オンラインで挑発が切れない）');

  const versus = fs.readFileSync(require.resolve('../../js/online/versus.js'), 'utf8');
  assert.doesNotMatch(versus, /\bpanel\.(?:power|life|atk|hp)\s*=/,
    'オンライン編成生成が元の魔導板カードを直接変更している');
  // 出撃体数（複製・恩寵）とレーン・出撃順は共通ビルダー（battle/formation.js）が唯一の実装。
  // オンライン側で作り直すと、以前のように出撃順とレーンがPvEと食い違う。
  const formation = fs.readFileSync(require.resolve('../../js/battle/formation.js'), 'utf8');
  assert.match(formation, /const baseCount = openingCopy \? 1 : rawCount \+ \(panelPower === 'duplicate' \? 1 : 0\)/,
    '共通ビルダーに複製の出撃数計算がない');
  assert.match(formation, /openingCopyExtra/, '共通ビルダーに恩寵の追加出撃数計算がない');
  assert.match(versus, /buildBoardFormation\(board, \{ persistEternal: !!\(opts && opts\.persistEternal\) \}\)/,
    'オンライン編成生成が共通ビルダーを使っていない');
  // 永劫の力の恒久加算は「実際に戦闘を行う呼び出し」1回だけ。両方で加算すると1戦で+2/+2になる。
  assert.match(versus, /buildSelfFormation\(\{ persistEternal: true \}\)/,
    'オンラインの戦闘実行時に永劫の力の恒久加算を行っていない');
  assert.equal((versus.match(/persistEternal: true/g) || []).length, 1,
    'オンラインで永劫の力の恒久加算が複数箇所にある（1戦で二重加算になる）');
  assert.doesNotMatch(versus, /openingCopyExtra|_collectAdjacentEnhancements|_makePanelSummonUnit/,
    'オンライン編成生成が出撃数・強化適用を独自に作り直している');
  assert.doesNotMatch(versus, /lane:\s*\(?idx/, 'オンライン編成生成が独自にレーンを決めている');
  const pveFormationUse = /buildBoardFormation\(board,\{persistEternal:true\}\)/;
  assert.match(pveBattle, pveFormationUse, 'PvEの開戦出撃が共通ビルダーを使っていない');
  assert.doesNotMatch(pveBattle, /const deploySlotGroup=async/,
    'PvEに旧deploySlotGroupが残っている（共通ビルダーとの二重実装）');
  const board = fs.readFileSync(require.resolve('../../js/online/board.js'), 'utf8');
  const playback = fs.readFileSync(require.resolve('../../js/online/playback.js'), 'utf8');
  assert.doesNotMatch(board, /ev\.effect === 'evil_eye'[\s\S]{0,240}u\.weaken\s*=/,
    'オンライン盤面の邪眼再生が弱体まで加算している');
  assert.match(board, /poison:\s*Math\.max\(0, Number\(snap\.poison\)/,
    'オンライン表示盤面へ毒状態が引き継がれていない');
  assert.match(playback, /ev\.effect === 'evil_eye'[\s\S]{0,180}u\.atk\s*=\s*Math\.max/,
    'オンライン再生に邪眼のATK減少がない');
  assert.doesNotThrow(() => core.coreInitSealStates([null, {id: 'seal-check', keywords: []}], () => 0),
    'オフラインの空スロットで封印初期化が停止している');

  const setup = makeSetup();
  const online = simulateOnlineBattle(setup);
  const direct = runDirect(setup);
  assert.deepEqual(online.events, direct.events, '共有コアのイベント列がオンラインと不一致');
  assert.equal(online.outcome, direct.outcome, '共有コアの勝敗がオンラインと不一致');
  assert.equal(online.endReason, direct.endReason, '共有コアの終了理由がオンラインと不一致');
  assert.deepEqual(online.finalState, direct.finalState, '共有コアの最終状態がオンラインと不一致');

  // 実データの全キャラクターを同じ初期配置で両経路へ投入する。
  // これは「コアを呼んだ」だけでなく、召喚・変身・各トリガのイベント列と
  // 最終状態がオンライン側で欠落していないことをカード単位で検出する。
  const allCards = loadCharacterDefs();
  const cardMismatches = [];
  for (const [index, card] of allCards.entries()) {
    const cardSetup = {
      seed: 0x7000 + index,
      resources: {p1: {mana: 20, gold: 200}, p2: {mana: 20, gold: 0}},
      sides: {
        p1: {units: [{...card, id: `card-${index}`, atk: card.power, hp: card.life, maxHp: card.life}]},
        p2: {units: [{id: `foe-${index}`, name: '敵', atk: 2, hp: 30, maxHp: 30, color: '青'}]},
      },
      summonDefs: allCards,
      turnLimit: 8,
    };
    const cardOnline = simulateOnlineBattle(cardSetup);
    const cardDirect = runDirect(cardSetup);
    try {
      assert.deepEqual(cardOnline.events, cardDirect.events);
      assert.equal(cardOnline.outcome, cardDirect.outcome);
      assert.equal(cardOnline.endReason, cardDirect.endReason);
      assert.deepEqual(cardOnline.finalState, cardDirect.finalState);
    } catch (error) {
      cardMismatches.push(`${card.name}: ${error.message}`);
    }
  }
  assert.equal(cardMismatches.length, 0,
    `カード別オフライン／オンライン不一致 (${cardMismatches.length}件)\n${cardMismatches.slice(0, 5).join('\n')}`);
  console.log(`カード別オフライン／オンライン一致 ${allCards.length}件 OK`);

  const resonance = online.events.filter(event => event.reason === 'resonance_panel');
  assert.equal(resonance.length, 2, '共振の開戦効果が同色2体へ適用されていない');
  assert.equal(online.finalState.p1.units[0].atk >= 6, true, '共振後のATKが維持されていない');

  const transformState = core.createBattleState({
    resources: {p1: {mana: 6, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'dragonnet', name: 'ドラゴネット', atk: 3, hp: 4, maxHp: 4,
      manaCost: 6, manaThresholdDesc: '「緑ドラゴン」に変身する。'}]},
      p2: {units: [{id: 'target', name: '敵', atk: 1, hp: 10, maxHp: 10}]}},
    summonDefs: [{name: '緑ドラゴン', power: 20, life: 25, color: '緑', keywords: ['全体攻撃']}],
  });
  core.coreApplyManaThresholdEffects(transformState, createSeededRng(7), () => {}, () => ({amount: 0, died: false}));
  assert.equal(transformState.units.p1[0].name, '緑ドラゴン', 'マナ閾値変身が発生していない');
  assert.equal(transformState.units.p1[0].maxHp, 25, '変身先のHPが反映されていない');

  const manaState = core.createBattleState({
    resources: {p1: {mana: 1, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'satyr', name: 'サテュロス', atk: 1, hp: 4, maxHp: 4,
      manaCost: 1, manaRepeat: false, manaThresholdDesc: '3マナを得る。',
      effectData: {effectNames: ['マナの種']}}]}, p2: {units: []}},
  });
  core.coreApplyManaThresholdEffects(manaState, createSeededRng(8), () => {}, () => ({amount: 0, died: false}));
  assert.equal(manaState.resources.p1.mana, 7, 'マナの種が閾値効果に二重適用されている');

  const sealedBondState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      p1: {units: [{id: 'sealed-bond', name: '封印対象', atk: 2, hp: 3, maxHp: 3, _sealed: true}]},
      p2: {units: []},
    },
    items: {p1: [{id: 'bond', itemEffectKey: 'bond_scroll'}], p2: []},
  });
  core.coreApplyOpeningItems(sealedBondState, createSeededRng(11), () => {}, () => ({amount: 0, died: false}));
  assert.equal(sealedBondState.units.p1[0].atk, 7, '絆の巻物が封印中の味方へ適用されていない');
  assert.equal(sealedBondState.units.p1[0].maxHp, 8, '絆の巻物の封印中HP強化が適用されていない');

  const simultaneous = {
    seed: 0x77,
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      p1: {units: [{id: 'a', name: '攻撃者', atk: 4, hp: 4, maxHp: 4}]},
      p2: {units: [{id: 'd', name: '防御者', atk: 4, hp: 4, maxHp: 4}]},
    },
  };
  const simultaneousResult = runDirect(simultaneous);
  assert.equal(simultaneousResult.outcome, 'draw', '相互撃破が引き分けになっていない');
  assert.ok(simultaneousResult.events.some(e => e.type === 'death' && e.side === 'p1'), '攻撃者の死亡イベントがない');
  assert.ok(simultaneousResult.events.some(e => e.type === 'death' && e.side === 'p2'), '防御者の死亡イベントがない');
  const attackIndex = simultaneousResult.events.findIndex(e => e.type === 'attack');
  const firstDeathIndex = simultaneousResult.events.findIndex(e => e.type === 'death');
  const battleOrderEvents = simultaneousResult.events.filter(e => e.type !== 'blood_set');
  const battleOrderAttackIndex = battleOrderEvents.findIndex(e => e.type === 'attack');
  const battleOrderFirstDeathIndex = battleOrderEvents.findIndex(e => e.type === 'death');
  const battleOrderDamageIndexes = battleOrderEvents
    .map((e, i) => e.type === 'damage' ? i : -1).filter(i => i >= 0);
  assert.ok(attackIndex >= 0 && firstDeathIndex > attackIndex, '攻撃イベントより先に死亡イベントが発行されている');
  assert.ok(battleOrderAttackIndex >= 0 && battleOrderFirstDeathIndex > battleOrderAttackIndex && battleOrderDamageIndexes.length >= 2 && battleOrderDamageIndexes.every(i => i > battleOrderAttackIndex && i < battleOrderFirstDeathIndex + 2),
    '相打ち時の両側ダメージイベントが攻撃・死亡イベントの間に揃っていない');

  const shieldState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      // カーバンクルは**本文で判定する**（カード名では判定しない）。
      p1: {units: [{id: 'c', name: 'カーバンクル', atk: 1, hp: 5, maxHp: 5,
        desc: '常時：味方が結界を失うたび、ランダムな敵3体に1ダメージを与える。',
        effectData: {effectNames: ['カーバンクル']}}, {id: 's', name: '盾役', atk: 1, hp: 5, maxHp: 5, shield: 1}]},
      p2: {units: [{id: 'e', name: '敵', atk: 1, hp: 5, maxHp: 5}]},
    },
  });
  const shieldEvents = [];
  const shieldHit = (source, target, amount, counter) => core.coreResolveHit(
    shieldState, source, target, amount, counter, createSeededRng(9), e => shieldEvents.push(e));
  core.coreApplyShieldLostEffects(shieldState.units.p1[1], shieldState, createSeededRng(9), e => shieldEvents.push(e), shieldHit);
  assert.ok(shieldEvents.some(e => e.type === 'damage'), '結界破壊時の追加ダメージイベントがない');

  const eyeState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'eye', name: '邪眼役', atk: 2, hp: 5, maxHp: 5, keywords: ['邪眼2']}]},
      p2: {units: [{id: 'eye-target', name: '敵', atk: 5, hp: 5, maxHp: 5}]}},
  });
  core.coreResolveHit(eyeState, eyeState.units.p1[0], eyeState.units.p2[0], 1, false,
    createSeededRng(10), () => {});
  assert.equal(eyeState.units.p2[0].atk, 3, '邪眼のATK減少量が不正');
  assert.equal(eyeState.units.p2[0].weaken, 0, '邪眼が弱体まで付与している');

  const namedEffectState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'golem', name: 'ゴーレム', atk: 1, hp: 3, maxHp: 3,
      desc: '負傷：このキャラクターは+2/+2を得る。'}]}, p2: {units: [{id: 'enemy', name: '敵', atk: 1, hp: 5, maxHp: 5}]}},
  });
  core.coreApplyInjuryEffects(namedEffectState.units.p1[0], 1, namedEffectState, createSeededRng(16), () => {},
    () => ({amount: 0, died: false}), namedEffectState.units.p2[0]);
  assert.equal(namedEffectState.units.p1[0].atk, 3, 'カード名で発動する負傷効果がコアで発動していない');
  assert.equal(namedEffectState.units.p1[0].maxHp, 5, 'カード名で発動する負傷HP効果がコアで発動していない');

  const gremlinState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'gremlin', name: 'グレムリン', atk: 2, hp: 5, maxHp: 5}]},
      p2: {units: [{id: 'gremlin-target', name: '敵', atk: 3, hp: 8, maxHp: 8}]}},
  });
  gremlinState.units.p1[0]._currentAttackTarget = gremlinState.units.p2[0];
  core.coreApplyAttackEffects(gremlinState.units.p1[0], gremlinState, createSeededRng(18), () => {},
    () => ({amount: 0, died: false}));
  assert.equal(gremlinState.units.p1[0].hp, 3, 'グレムリンのHP入れ替えが共通コアで発動していない');
  assert.equal(gremlinState.units.p2[0].atk, 5, 'グレムリンの対象ATK入れ替えが共通コアで発動していない');

  const modifierState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'void', name: 'ヴォイド・ウォーカー', atk: 1, hp: 3, maxHp: 3, color: '紫'},
      {id: 'purple', name: '紫役', atk: 1, hp: 3, maxHp: 3, color: '紫'},
    ]}, p2: {units: []}},
  });
  const modifierEvents = [];
  core.coreApplyOpeningEffects(modifierState.units.p1[1], modifierState, createSeededRng(19),
    event => modifierEvents.push(event), () => ({amount: 0, died: false}));
  // 汎用的な本文強化を使い、ヴォイド・ウォーカーの+1が攻撃修正にも乗ることを検証する。
  modifierState.units.p1[1].desc = '攻撃：このキャラクターは+1/+1を得る。';
  core.coreApplyAttackEffects(modifierState.units.p1[1], modifierState, createSeededRng(20),
    event => modifierEvents.push(event), () => ({amount: 0, died: false}));
  assert.equal(modifierState.units.p1[1].atk, 3, 'ヴォイド・ウォーカーの戦闘修正+1が攻撃強化に適用されていない');
  assert.equal(modifierState.units.p1[1].maxHp, 5, 'ヴォイド・ウォーカーの戦闘修正+1がHP強化に適用されていない');

  const cocatriceState = core.createBattleState({
    resources: {p1: {mana: 2, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'cocatrice', name: 'コカトリス', atk: 1, hp: 3, maxHp: 3,
      manaCost: 2, manaRepeat: true, manaThresholdDesc: 'ランダムな敵に防戦を与える。'}]},
      p2: {units: [{id: 'cocatrice-target', name: '敵', atk: 1, hp: 3, maxHp: 3}]}},
  });
  core.coreApplyManaThresholdEffects(cocatriceState, createSeededRng(21), () => {}, () => ({amount: 0, died: false}));
  assert.ok(cocatriceState.units.p2[0].keywords.includes('防戦'), 'コカトリスの防戦付与が共通コアで発動していない');

  const epitomeState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'epitome', name: '万象の揺り籠“エピトメ”', atk: 5, hp: 8, maxHp: 8,
      desc: '攻撃：ランダムなボスを召喚する。'}]}, p2: {units: [{id: 'target', name: '敵', atk: 1, hp: 20, maxHp: 20}]}},
    summonDefs: [{name: '試験ボス', atk: 10, hp: 10, maxHp: 10, boss: true}],
  });
  const epitomeEvents = [];
  core.coreApplyAttackEffects(epitomeState.units.p1[0], epitomeState, createSeededRng(11),
    event => epitomeEvents.push(event), () => ({amount: 0, died: false}));
  assert.ok(epitomeEvents.some(e => e.type === 'summon' && e.unit && e.unit.name === '試験ボス'),
    'ランダムなボス召喚が共通コアで発生していない');

  const oniState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    rings: {p1: [{name: '鬼神の指輪'}], p2: []},
    sides: {p1: {units: [{id: 'oni-source', name: '攻撃役', atk: 1, hp: 5, maxHp: 5}]},
      p2: {units: [{id: 'oni-target', name: '敵', atk: 1, hp: 10, maxHp: 10}]}},
    summonDefs: [],
  });
  oniState._oniRingAttackCount = 11;
  const oniEvents = [];
  core.coreApplyAttackRing(oniState, 'p1', createSeededRng(17), event => oniEvents.push(event),
    (source, target, amount) => { target.hp = Math.max(0, target.hp - amount); return {amount, died: target.hp <= 0}; });
  const oniSummon = oniEvents.find(e => e.type === 'summon' && e.unit && e.unit.name === 'イフリート');
  assert.equal(oniSummon && oniSummon.unit.atk, 1, '鬼神の指輪の未登録時フォールバックATKがPvEと不一致');

  // PvEアダプターはGの疎な配列をそのままコアへ渡すため、ライブ接続も直接検証する。
  const sparseUnit = {id: 'sparse-a', side: 'p1', atk: 1, hp: 4, maxHp: 4, keywords: []};
  const sparseState = {
    units: {p1: [sparseUnit, null], p2: [{id: 'sparse-d', side: 'p2', atk: 1, hp: 4, maxHp: 4, keywords: []}, null]},
    rings: {p1: [], p2: []}, items: {p1: [], p2: []},
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
  };
  assert.doesNotThrow(() => core.coreApplyAttackObservers(
    sparseUnit, sparseState, createSeededRng(12), () => {}, () => ({amount: 0, died: false})),
    'オフラインの疎配列で攻撃監視が停止している');
  assert.doesNotThrow(() => core.coreTriggerBattleEnd(sparseState, () => {}, createSeededRng(13)),
    'オフラインの疎配列で戦闘終了処理が停止している');

  const liveShape = {
    units: {p1: [{id: 'live-release', side: 'p1', atk: 2, hp: 3, maxHp: 3, keywords: [],
      _releaseAtkBonus: 4, _releaseHpBonus: 2, manaCost: 1,
      _extraManaThresholds: [{cost: 1, desc: '2マナを得る。'}],
      _manaThresholdDesc: '1マナを得る。'}], p2: []},
    rings: {p1: [], p2: []}, items: {p1: [], p2: []},
    resources: {p1: {mana: 1, gold: 0}, p2: {mana: 0, gold: 0}},
  };
  const liveUnit = liveShape.units.p1[0];
  core.coreApplyReleaseEffects(liveUnit, [], liveShape, createSeededRng(14), () => {}, () => ({amount: 0, died: false}));
  assert.equal(liveUnit.atk, 6, 'PvEライブ形式の解放強化がコアへ渡っていない');
  assert.equal(liveUnit.maxHp, 5, 'PvEライブ形式の解放HP強化がコアへ渡っていない');
  core.coreApplyManaThresholdEffects(liveShape, createSeededRng(15), () => {}, () => ({amount: 0, died: false}));
  assert.equal(liveShape.resources.p1.mana, 4, 'PvEライブ形式のマナ閾値がコアへ渡っていない');

  // 実機報告の再現：ドワーフの「2マナ毎」は1回、コボルドの負傷は
  // 本文解析とカード名分岐を重ねず1回だけ解決されることを確認する。
  const dwarf = {id: 'dwarf', name: 'ドワーフ', atk: 3, hp: 5, maxHp: 5, color: '赤',
    desc: '2マナ毎：ランダムな赤キャラクター2体は+3/+2を得る。', manaCost: 2,
    manaRepeat: true, manaThresholdDesc: 'ランダムな赤キャラクター2体は+3/+2を得る。'};
  const kobold = {id: 'kobold', name: 'コボルド', atk: 2, hp: 4, maxHp: 4, color: '赤',
    desc: '負傷：全ての赤キャラクターは+1/+1を得る。'};
  const reportState = core.createBattleState({resources: {p1: {mana: 2, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [dwarf, kobold]}, p2: {units: []}}});
  core.coreApplyManaThresholdEffects(reportState, createSeededRng(16), () => {}, () => ({amount: 0, died: false}));
  assert.equal(reportState.units.p1[0].atk, 6, 'ドワーフのマナ効果が複数回解決されている');
  assert.equal(reportState.units.p1[0].maxHp, 7, 'ドワーフのマナ効果HPが複数回解決されている');
  core.coreApplyInjuryEffects(reportState.units.p1[1], 1, reportState, createSeededRng(17), () => {}, () => ({amount: 0, died: false}), null);
  assert.equal(reportState.units.p1[0].atk, 7, 'コボルドの負傷効果ATKが複数回解決されている');
  assert.equal(reportState.units.p1[0].maxHp, 8, 'コボルドの負傷効果HPが複数回解決されている');

  const alassusState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'c043', name: 'アラッサス', no: 'C043', atk: 3, hp: 5, maxHp: 5,
      desc: '攻撃：全ての敵に1ダメージを与える。'}]},
      p2: {units: [{id: 'enemy-a', name: '敵A', atk: 1, hp: 5, maxHp: 5}, {id: 'enemy-b', name: '敵B', atk: 1, hp: 5, maxHp: 5}]}},
  });
  const alassusEvents = [];
  core.coreApplyAttackEffects(alassusState.units.p1[0], alassusState, createSeededRng(18),
    event => alassusEvents.push(event), (source, target, amount) => core.coreResolveHit(alassusState, source, target, amount, false, createSeededRng(19), () => {}));
  assert.deepEqual(alassusEvents.find(e => e.type === 'sweep_vfx')?.targetIds, ['enemy-a', 'enemy-b'],
    'アラッサスの従来薙ぎ払いVFXイベントが失われている');

  const splitState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'damage-target', name: '対象', atk: 1, hp: 10, maxHp: 10},
      {id: 'unite-member', name: '団結役', atk: 1, hp: 10, maxHp: 10},
      {id: 'mata', name: '別名のマータ', atk: 1, hp: 10, maxHp: 10, effectData: {effectNames: ['マータ']}},
    ]}, p2: {units: [{id: 'attacker', name: '攻撃役', atk: 6, hp: 10, maxHp: 10}]}}});
  const splitEvents = [];
  core.coreResolveHit(splitState, splitState.units.p2[0], splitState.units.p1[0], 4, false,
    createSeededRng(20), event => splitEvents.push(event));
  assert.equal(splitState.units.p1[0].hp, 8, 'マータ分散後の本体ダメージが不正');
  assert.equal(splitState.units.p1[2].hp, 8, 'マータ分散先のダメージが不正');
  const uniteState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'unite-a', name: '団結A', atk: 1, hp: 10, maxHp: 10, _uniteGroups: ['g1']},
      {id: 'unite-b', name: '団結B', atk: 1, hp: 10, maxHp: 10, _uniteGroups: ['g1']},
    ]}, p2: {units: [{id: 'unite-attacker', name: '攻撃役', atk: 6, hp: 10, maxHp: 10}]}}});
  core.coreResolveHit(uniteState, uniteState.units.p2[0], uniteState.units.p1[0], 4, false,
    createSeededRng(21), () => {});
  assert.equal(uniteState.units.p1[0].hp, 8, '団結分散の本体ダメージが不正');
  assert.equal(uniteState.units.p1[1].hp, 8, '団結分散先のダメージが不正');

  const lichState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'lich', name: 'リッチ', atk: 7, hp: 3, maxHp: 3, color: '青',
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      {id: 'summoner', name: '召喚役', atk: 1, hp: 3, maxHp: 3, color: '青',
        desc: '攻撃：「青ウルフ」を召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '青ウルフ', power: 1, life: 2, color: '青'}, {name: 'シャドウ', power: 1, life: 1, color: '青'}],
  });
  const lichEvents = [];
  core.coreApplyAttackEffects(lichState.units.p1[1], lichState, createSeededRng(22),
    event => lichEvents.push(event), () => ({amount: 0, died: false}));
  assert.deepEqual(lichEvents.filter(e => e.type === 'summon').map(e => e.unit.name), ['ウルフ', 'シャドウ'],
    'リッチの召喚反応が戦闘コアで発生していない');
  const copiedLichState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'copied-lich', name: '強化枠', atk: 1, hp: 5, maxHp: 5, color: '青', keywords: [],
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '青ウルフ', power: 1, life: 2, color: '青'}, {name: 'シャドウ', power: 1, life: 1, color: '青'}],
  });
  const copiedLichEvents = [];
  core.coreSummonUnit(copiedLichState, 'p1', {name: '青ウルフ', atk: 1, hp: 1},
    event => copiedLichEvents.push(event), 'copied-source');
  assert.equal(copiedLichEvents.filter(e => e.type === 'summon' && e.unit && e.unit.name === 'シャドウ').length, 1,
    '効果文だけを持つリッチの召喚反応が発生していない');
  console.log('offline/online core regression ok');
}

main();
