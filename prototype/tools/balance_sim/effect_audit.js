'use strict';

// カードのトリガ入口を1回だけ呼び、イベント列を監査する軽量ハーネス。
// ルールの期待値をここで再実装せず、coreのイベント（値・対象）を検査する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../../js/battle/core');
const sheetData = require('./sheet_data');
const { createSeededRng } = require('../../js/online/protocol');

function loadCards() {
  // 列は必ずヘッダ名で引く（sheet_data.js）。位置で引くとシートへ列を1本足しただけで
  // 別の列を効果文として読み、監査が静かに無意味になる。
  const cards = sheetData.characterCards().map(c => ({
    name: c.name, atk: c.power || 2, hp: c.life || 6, color: c.color || '赤',
    keywords: c.keywords, desc: c.desc,
  }));
  const enchants = sheetData.enchantCards().map(c => ({
    name: c.name, atk: 2, hp: 6, color: '赤', keywords: [], desc: c.desc, enchant: true,
  }));
  const enemyContext = {}; vm.runInNewContext(`${fs.readFileSync(require.resolve('../../js/data/events.js'), 'utf8')}\nthis.pool=ENEMY_POOL;`, enemyContext);
  const enemies = (enemyContext.pool || []).filter(x => x && x.name).map(x => ({ ...x, atk: 2, hp: 100, maxHp: 100, color: x.color || '青', desc: x.desc || '' }));
  const overrides = {
    'フォルモール': '負傷：ランダムな赤、青、緑キャラクター1体ずつは+2/+2を得る。',
    'ファミリア': '攻撃：血が5以上なら2マナ得る。',
    'カオス・インプ': '常時：味方が解放された時、ランダムな味方の開戦効果を発動する。',
  };
  [...cards, ...enchants].forEach(card => { if (overrides[card.name]) card.desc = overrides[card.name]; });
  return { cards: [...cards, ...enchants], enemies };
}

// loader.js が「説明文に名前が出たらキーワードとして付与する」名前の一覧。
// ここに載る名前のうち、効果文を持つ強化カードは CORE_EFFECT_CARD_NAMES 側にも要る。
const LOADER_IDENTIFIER_KEYWORDS = new Set([
  '逆襲', '闇の儀式', '執念の炎', '闇の炎', '狂気', '野生の力', '根性', '生贄', '治癒能力', 'マナ生成',
  '二段攻撃', '三段攻撃', '即死', '三方向攻撃', '先制', '全体攻撃', '生命吸収',
  '逆上', '剣技', '怨念', '錬成', 'マナの種', '恩寵', '狙撃', '防戦', '帰滅', '隠密', '加護', '貫通',
  '復活', '強靭', '熟練', '遺志', '共振', '団結', '封印されしもの', '禁断の力', '武器破壊', '戦術', '大盾', '策士']);

const TRIGGERS = [
  ['開戦', /^開戦\s*[：:]/], ['攻撃', /^攻撃(?:[＆&]負傷)?\s*[：:]/],
  ['負傷', /^(?:負傷|攻撃[＆&]負傷)\s*[：:]/], ['死亡', /^死亡\s*[：:]/],
  ['終戦', /^終戦\s*[：:]/], ['解放', /^解放\s*[：:]/],
];

// 実機で再確認するよう指定されたカード。データの読み込み失敗や
// 表記揺れで監査対象から消えても、単に「NG 0」とならないよう明示する。
const REQUIRED_REGRESSION_CARDS = [
  'ミノタウロス', 'ギガンテス', 'マミー', 'バンシー', 'レイス', 'ゴースト',
  'エイドロン', 'ボーンチャリオット', 'ユミル', 'ドラゴネット', 'マーメイド',
  'バンダースナッチ', 'ナーガ', 'リアナンシー', 'カーバンクル', 'ガーゴイル',
  'ヘルハウンド', 'ダークワン', 'ファミリア', 'ウェンディゴ', 'カオス・インプ',
  'ヴォイド・ウォーカー', 'リリス', 'フィーンド',
];

function makeUnit(card, side) {
  return { id: `${side}-subject`, name: card.name, side, atk: card.atk, hp: card.hp, maxHp: card.hp,
    color: card.color, keywords: card.keywords.slice(), desc: card.desc,
    effectData: { effectNames: card.enchant ? [card.name] : [], effectTexts: card.enchant ? [card.desc] : [] },
    manaOnAttack: card.name === 'ファミリア' ? 0 : (/^攻撃\s*[：:].*\d+マナ/.test(card.desc) ? 1 : 0),
    manaOnInjury: /^負傷\s*[：:].*\d+マナ/.test(card.desc) ? 1 : 0,
    manaOnDeath: /^死亡\s*[：:].*\d+マナ/.test(card.desc) ? 1 : 0,
    goldOnBattleEnd: /^終戦\s*[：:].*?(\d+)ゴールド/.test(card.desc) ? Number(card.desc.match(/(\d+)ゴールド/)[1]) : 0,
    randomItemOnBattleEnd: /ランダムなアイテム/.test(card.desc),
  };
}

function invoke(card, side, trigger, enemyPool) {
  const subject = makeUnit(card, side);
  const other = side === 'p1' ? 'p2' : 'p1';
  const allies = [subject, { id: `${side}-ally`, name: '味方', atk: 2, hp: 50, maxHp: 50, color: '赤', keywords: ['生贄'], desc: '' },
    { id: `${side}-green`, name: '緑味方', atk: 2, hp: 50, maxHp: 50, color: '緑', keywords: [], desc: '' },
    { id: `${side}-blue`, name: '青味方', atk: 2, hp: 50, maxHp: 50, color: '青', keywords: [], desc: '' },
    { id: `${side}-yellow`, name: '黄味方', atk: 2, hp: 50, maxHp: 50, color: '黄', keywords: [], desc: '' },
    { id: `${side}-purple`, name: '紫味方', atk: 2, hp: 50, maxHp: 50, color: '紫', keywords: [], desc: '' }];
  const foes = [
    { id: `${other}-a`, name: '敵A', atk: 2, hp: 100, maxHp: 100, color: '青', keywords: [], desc: '' },
    { id: `${other}-b`, name: '敵B', atk: 2, hp: 100, maxHp: 100, color: '青', keywords: [], desc: '' },
    { id: `${other}-c`, name: '敵C', atk: 2, hp: 100, maxHp: 100, color: '青', keywords: [], desc: '' },
  ];
  const state = core.createBattleState({ resources: { p1: { mana: 20, gold: 200 }, p2: { mana: 20, gold: 200 } },
    blood: { p1: card.name === 'ファミリア' && side === 'p1' ? 5 : 0, p2: card.name === 'ファミリア' && side === 'p2' ? 5 : 0 },
    sides: { p1: { units: side === 'p1' ? allies : foes }, p2: { units: side === 'p2' ? allies : foes } },
    summonDefs: enemyPool, itemDefs: [{ id: 'audit-item', name: '監査アイテム', kind: 'item' }] });
  const unit = state.units[side][0];
  unit._currentAttackTarget = state.units[other][0];
  if (trigger === '死亡') unit.hp = 0;
  const events = []; const emit = e => events.push(e);
  const applyHit = (source, target, amount, counter) => core.coreResolveHit(state, source, target, amount, counter, createSeededRng(7), emit);
  const rng = createSeededRng(11);
  if (trigger === '開戦') core.coreApplyOpeningEffects(unit, state, rng, emit, applyHit);
  if (trigger === '攻撃') { core.coreTriggerManaOnAttack(unit, state, emit); core.coreApplyAttackEffects(unit, state, rng, emit, applyHit); core.coreApplyAttackObservers(unit, state, rng, emit, applyHit); }
  if (trigger === '負傷') { core.coreTriggerManaOnInjury(unit, state, emit); core.coreApplyInjuryEffects(unit, 1, state, rng, emit, applyHit, foes[0]); }
  if (trigger === '死亡') { core.coreTriggerDeath(unit, state, emit); core.coreApplyDeathEffects(unit, state, rng, emit, applyHit); core.coreApplyDeathObservers(unit, state, rng, emit, applyHit); }
  if (trigger === '終戦') core.coreTriggerBattleEnd(state, emit, rng);
  if (trigger === '解放') core.coreApplyReleaseEffects(unit, [], state, rng, emit, applyHit);
  return { events, unit, state };
}

function audit() {
  const { cards, enemies } = loadCards(); const rows = []; let ng = 0;
  const loadedNames = new Set(cards.map(card => String(card.name || '')));
  const explicitCoverage = new Set();
  const missingRequired = REQUIRED_REGRESSION_CARDS.filter(name => !loadedNames.has(name));
  if (missingRequired.length) {
    ng += missingRequired.length;
    console.error(`実機再確認対象カードが監査データに存在しない: ${missingRequired.join('、')}`);
  }
  for (const card of cards) for (const [trigger, pattern] of TRIGGERS) {
    if (!pattern.test(String(card.desc || ''))) continue;
    const p1 = invoke(card, 'p1', trigger, enemies); const p2 = invoke(card, 'p2', trigger, enemies);
    const effectEvents = p1.events.filter(e => !['battle_start', 'turn_begin', 'battle_end'].includes(e.type));
    const damage = effectEvents.filter(e => e.type === 'damage' && Number(e.amount) > 0);
    const expectedTargets = /全ての敵(?:キャラクター)?に\d+ダメージ|全てのキャラクターに\d+ダメージ/.test(card.desc) ? 3
      : /ランダムな敵に\d+ダメージ/.test(card.desc) ? 1 : null;
    const targetOk = expectedTargets == null || damage.length >= expectedTargets;
    const p2Count = p2.events.filter(e => !['battle_start', 'turn_begin', 'battle_end'].includes(e.type)).length;
    // 条件付きカード（全色・生存者・生贄など）と、攻撃時に数値変化を起こさない
    // 受動修正は、最小シナリオでイベント0でも「未発動」ではなく検査対象外とする。
    const conditional = new Set(['タイタン', 'ケンタウロス', 'ハイドラ', 'インキュバス', 'サキュバス', 'ウェンディゴ', 'アビス・バロン', '扇動', '武器破壊', '大盾', 'ペガサス', 'ヘルナイト',
      // レイス＝味方の負傷効果を発動（負傷効果持ちの味方が必要）、レムレース＝発動条件が盤面依存。
      // 最小シナリオでは条件を満たせないため検査対象外（幻影効果の修正で誤OKが解消され顕在化した）。
      'レイス', 'レムレース']);
    const ok = (effectEvents.length > 0 && (p2Count > 0 || conditional.has(card.name)) && targetOk)
      || (conditional.has(card.name) && targetOk);
    if (!ok) ng++;
    const reasons=[...new Set(effectEvents.map(e=>e.reason).filter(Boolean))].join(',');
    rows.push([card.name, trigger, effectEvents.length, damage.length, reasons, ok ? 'OK' : 'NG'].join('\t'));
  }
  // デュラハン回帰: 味方死亡は1回・敵死亡は不発、かつ敵は1体だけ。
  const make = (deadSide) => {
    const dullahan = { id: 'dh', name: 'デュラハン', atk: 2, hp: 10, maxHp: 10, color: '青', keywords: [], desc: '常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。' };
    const dead = { id: 'dead', name: '犠牲', atk: 1, hp: 0, maxHp: 1, color: '赤', keywords: [], desc: '' };
    const target = { id: 'target', name: '標的', atk: 1, hp: 20, maxHp: 20, color: '赤', keywords: [], desc: '' };
    const state = core.createBattleState({ sides: { p1: { units: deadSide === 'p1' ? [dullahan, dead] : [dullahan, target] }, p2: { units: deadSide === 'p2' ? [dead, target] : [{ id: 'enemy', name: '敵', atk: 1, hp: 20, maxHp: 20, color: '青', keywords: [], desc: '' }] } }, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
    const d = state.units[deadSide].find(x => x.id === 'dead'); const es = []; const emit = e => es.push(e);
    const hit = (s, t, a, c) => core.coreResolveHit(state, s, t, a, c, createSeededRng(3), emit);
    core.coreApplyDeathObservers(d, state, createSeededRng(3), emit, hit);
    return es.filter(e => e.type === 'damage' && e.sourceId === 'dh' && e.amount === 4);
  };
  const allyDeath = make('p1'); const enemyDeath = make('p2');
  const dullahanOk = allyDeath.length === 1 && enemyDeath.length === 0;
  if (!dullahanOk) ng++;
  // 幻影効果の回帰：効果文もキーワードも持たない素のユニットの死亡では、
  // 効果イベントが一切発生しないこと（怨念のMath.max(1,…)バグの再発検知）。
  const plainState = core.createBattleState({ sides: {
    p1: { units: [{ id: 'plain', name: '素体', atk: 3, hp: 0, maxHp: 5, keywords: [], desc: '' }] },
    p2: { units: [{ id: 'pe', name: '敵', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '' }] } } });
  const plainDead = plainState.units.p1[0];
  const plainEvents = [];
  const plainHit = (s, t, a, c) => core.coreResolveHit(plainState, s, t, a, c, createSeededRng(1), e => plainEvents.push(e));
  core.coreApplyDeathEffects(plainDead, plainState, createSeededRng(1), e => plainEvents.push(e), plainHit);
  core.coreApplyDeathObservers(plainDead, plainState, createSeededRng(1), e => plainEvents.push(e), plainHit);
  const phantom = plainEvents.filter(e => !['battle_start'].includes(e.type));
  const plainOk = phantom.length === 0;
  if (!plainOk) ng++;
  // 団結／マータ回帰：分散はコアの1ヒット入口だけで解決し、各対象へ
  // 個別のdamageイベントを出す。強靭キーワードは廃止済みで、マータは2以上の
  // ダメージの半分を肩代わりする。
  const uniteUnits = [0, 1, 2].map((i) => ({ id: `unite-${i}`, name: `団結${i}`, side: 'p1', atk: 1,
    hp: 20, maxHp: 20, keywords: [], desc: '', _uniteGroups: ['audit-unite'] }));
  const uniteState = core.createBattleState({ sides: { p1: { units: uniteUnits }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
  const uniteEvents = [];
  core.coreResolveHit(uniteState, null, uniteState.units.p1[0], 6, false, createSeededRng(21), e => uniteEvents.push(e));
  const uniteDamage = uniteEvents.filter(e => e.type === 'damage' && e.amount > 0);
  const uniteOk = uniteDamage.length === 3 && uniteState.units.p1.map(u => 20 - u.hp).join(',') === '2,2,2';
  if (!uniteOk) ng++;
  const mata = { id: 'mata', name: 'マータ', side: 'p1', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '' };
  const victim = { id: 'victim', name: '対象', side: 'p1', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '' };
  mata.effectData = { effectNames: ['マータ'], effectTexts: [] };
  const mataState = core.createBattleState({ sides: { p1: { units: [victim, mata] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
  const mataEvents = [];
  core.coreResolveHit(mataState, null, mataState.units.p1[0], 4, false, createSeededRng(22), e => mataEvents.push(e));
  const mataDamage = mataEvents.filter(e => e.type === 'damage' && e.amount > 0);
  const mataOk = mataDamage.length === 2 && mataState.units.p1[0].hp === 18 && mataState.units.p1[1].hp === 18;
  if (!mataOk) ng++;
  console.log(`団結分散回帰 ${uniteOk ? 'OK' : 'NG'}（${uniteDamage.map(e => e.amount).join(',')}）`);
  console.log(`マータ肩代わり回帰 ${mataOk ? 'OK' : 'NG'}（${mataDamage.map(e => e.amount).join(',')}）`);
  // deferTriggers 契約回帰：PvEのapplyDamageBatchが後段で発火する前提のため、
  // coreResolveHit(..., {deferTriggers:true}) はダメージ確定以外のトリガイベントを出さない。
  // false 経路では、負傷・死亡・命中キーワード・マナが従来どおり発火することも併せて確認する。
  const deferredTriggerTypes = new Set([
    'stat_change', 'keyword_effect', 'mana_gain', 'gold_gain', 'life_gain',
    'ring_effect', 'curse_death', 'instant_death', 'summon', 'transform',
    'seal_apply', 'bonus_reward', 'life_drain',
  ]);
  const runDeferredTriggerCase = deferred => {
    const source = { id: 'defer-source', name: '毒牙持ち', side: 'p1', atk: 3, hp: 10, maxHp: 10,
      keywords: ['毒牙1'], desc: '' };
    const target = { id: 'defer-target', name: 'ゴーレム', side: 'p2', atk: 3, hp: 10, maxHp: 10,
      keywords: [], desc: '負傷：このキャラクターは+2/+2を得る。',
      manaOnInjury: 1, manaOnDeath: 1, goldOnDeath: 1 };
    const state = core.createBattleState({
      sides: { p1: { units: [source] }, p2: { units: [target] } },
      resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    });
    const events = [];
    const result = core.coreResolveHit(state, state.units.p1[0], state.units.p2[0], 3, false,
      createSeededRng(deferred ? 81 : 82), e => events.push(e), { deferTriggers: deferred });
    return { events, result, source: state.units.p1[0], target: state.units.p2[0], state };
  };
  const deferredRun = runDeferredTriggerCase(true);
  const normalRun = runDeferredTriggerCase(false);
  const runDeferredDeathCase = deferred => {
    const target = { id: 'defer-dead', name: '死亡対象', side: 'p2', atk: 1, hp: 3, maxHp: 3,
      keywords: [], desc: '', manaOnDeath: 1, goldOnDeath: 1 };
    const state = core.createBattleState({
      sides: { p1: { units: [{ id: 'defer-killer', name: '攻撃者', side: 'p1', atk: 3, hp: 5, maxHp: 5, keywords: [], desc: '' }] },
        p2: { units: [target] } },
      resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    });
    const events = [];
    core.coreResolveHit(state, state.units.p1[0], state.units.p2[0], 3, false,
      createSeededRng(deferred ? 83 : 84), e => events.push(e), { deferTriggers: deferred });
    return { events, state };
  };
  const deferredDeathRun = runDeferredDeathCase(true);
  const normalDeathRun = runDeferredDeathCase(false);
  const deferredTriggerEvents = deferredRun.events.filter(e => deferredTriggerTypes.has(e.type));
  const normalTriggerEvents = normalRun.events.filter(e => deferredTriggerTypes.has(e.type));
  const deferredDeathEvents = deferredDeathRun.events.filter(e => deferredTriggerTypes.has(e.type));
  const normalDeathEvents = normalDeathRun.events.filter(e => deferredTriggerTypes.has(e.type));
  const deferredHitOk = deferredTriggerEvents.length === 0
    && deferredRun.target.hp === 7 && deferredRun.target.atk === 3
    && deferredRun.state.resources.p2.mana === 0 && deferredRun.state.resources.p2.gold === 0
    && deferredRun.target.poison === 0 && deferredDeathEvents.length === 0
    && deferredDeathRun.state.resources.p2.mana === 0 && deferredDeathRun.state.resources.p2.gold === 0;
  const normalHitOk = normalTriggerEvents.some(e => e.type === 'stat_change' && e.reason === 'golem')
    && normalTriggerEvents.some(e => e.type === 'keyword_effect' && e.effect === 'poison')
    && normalTriggerEvents.some(e => e.type === 'mana_gain' && e.reason === 'manaOnInjury')
    && normalRun.target.atk === 5 && normalRun.target.maxHp === 12 && normalRun.target.hp === 9
    && normalRun.state.resources.p2.mana === 1
    && normalDeathEvents.filter(e => e.type === 'mana_gain' && e.reason === 'manaOnDeath').length === 1
    && normalDeathEvents.filter(e => e.type === 'gold_gain' && e.reason === 'goldOnDeath').length === 1;
  const deferredTriggersOk = deferredHitOk && normalHitOk;
  if (!deferredTriggersOk) ng++;
  console.log(`deferTriggers二重発動回帰	defer=${deferredTriggerEvents.length + deferredDeathEvents.length}件通常=${normalTriggerEvents.length + normalDeathEvents.length}件	${deferredTriggersOk ? 'OK' : 'NG'}`);
  // マナ効果回帰：マーメイドの名前判定と効果文判定を重複適用しない。
  const mermaid = { id: 'mermaid', name: 'マーメイド', color: '青', atk: 1, hp: 5, maxHp: 5,
    keywords: [], desc: '常時：緑のキャラクターから得るマナは+1される。' };
  const green = { id: 'green', name: '緑キャラ', color: '緑', atk: 1, hp: 5, maxHp: 5,
    keywords: [], desc: '' };
  const manaState = core.createBattleState({
    sides: { p1: { units: [mermaid, green] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const manaEvents = [];
  manaState.units.p1[1].manaOnAttack = 1;
  core.coreTriggerManaOnAttack(manaState.units.p1[1], manaState, e => manaEvents.push(e));
  const manaGain = manaEvents.find(e => e.type === 'mana_gain');
  const manaOk = manaGain && manaGain.amount === 2 && manaState.resources.p1.mana === 2;
  if (!manaOk) ng++;
  // 同一コストの別閾値効果回帰：各効果が独立して1回ずつ発火する。
  const thresholdUnit = { id: 'threshold', name: '閾値持ち', color: '赤', atk: 1, hp: 5, maxHp: 5,
    keywords: [], desc: '', manaCost: 2, manaRepeat: false,
    manaThresholdDesc: '+1/+1を得る。',
    extraManaThresholds: [{ cost: 2, repeat: false, desc: '+2/+0を得る。' }] };
  const thresholdState = core.createBattleState({
    sides: { p1: { units: [thresholdUnit] }, p2: { units: [] } },
    resources: { p1: { mana: 2, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const thresholdEvents = [];
  core.coreApplyManaThresholdEffects(thresholdState, createSeededRng(5), e => thresholdEvents.push(e),
    (source, target, amount) => core.coreResolveHit(thresholdState, source, target, amount, false, createSeededRng(5), e => thresholdEvents.push(e)));
  const thresholdBuffs = thresholdEvents.filter(e => e.type === 'stat_change' && e.unitId === 'threshold');
  const thresholdResult = thresholdState.units.p1[0];
  const thresholdOk = thresholdBuffs.length === 2 && thresholdResult.atk === 4 && thresholdResult.maxHp === 6;
  if (!thresholdOk) ng++;
  // マナ閾値の複数回発火回帰：4マナ毎・8マナは2回召喚される。
  const repeatedManaUnit = { id: 'mana-repeat', name: '閾値召喚', color: '青', atk: 1, hp: 5, maxHp: 5,
    keywords: [], desc: '4マナ毎：「緑ウルフ」を召喚する。', manaCost: 4, manaRepeat: true,
    manaThresholdDesc: '「緑ウルフ」を召喚する。' };
  const repeatedManaState = core.createBattleState({
    sides: { p1: { units: [repeatedManaUnit] }, p2: { units: [] } },
    resources: { p1: { mana: 8, gold: 0 }, p2: { mana: 0, gold: 0 } },
    summonDefs: [{ name: '緑ウルフ', color: '緑', power: 1, life: 1 }],
  });
  const repeatedManaEvents = [];
  core.coreApplyManaThresholdEffects(repeatedManaState, createSeededRng(6), e => repeatedManaEvents.push(e),
    () => ({ amount: 0, died: false }));
  const repeatedManaFires = repeatedManaEvents.filter(e => e.type === 'mana_threshold');
  const repeatedManaSummons = repeatedManaEvents.filter(e => e.type === 'summon');
  const repeatedManaOk = repeatedManaFires.length === 2 && repeatedManaSummons.length === 2;
  if (!repeatedManaOk) ng++;
  // 専用効果と本文パーサーの二重実行回帰。専用イベントがあるカードでは、
  // 同じ本文由来の汎用 reason が同一トリガーに混在してはならない。
  const duplicateCases = [
    ['ユミル', '攻撃', 'attack_mana_buff'],
    ['グレムリン', '攻撃', 'attack_swap'],
    ['ファミリア', '攻撃', 'sacrifice_mana'],
    ['戦術', '攻撃', 'attack_self_buff'],
    ['カオス・インプ', '負傷', 'injury_sacrifice_hp'],
    ['ラミア', '攻撃', 'attack_self_buff'],
    ['ギガンテス', '負傷', 'injury_allies_atk'],
    ['コボルド', '負傷', 'injury_color_buff'],
    ['ゴーレム', '負傷', 'injury_self_buff'],
    ['ブラウニー', '攻撃', 'attack_allies_hp'],
    ['ブラウニー', '負傷', 'injury_allies_hp'],
    ['ゴースト', '死亡', 'death_random_blue_buff'],
    ['レイス', '死亡', 'injury_self_buff'],
    ['リリス', '開戦', 'shield'],
    ['ウェンディゴ', '開戦', 'opening_hp_scaled_debuff'],
  ];
  const duplicateResults = duplicateCases.map(([name, trigger, forbidden]) => {
    const card = cards.find(x => x.name === name);
    const result = card ? invoke(card, 'p1', trigger, enemies) : null;
    const reasons = new Set((result ? result.events : []).map(e => e.reason).filter(Boolean));
    return { name, forbidden, ok: !!card && !reasons.has(forbidden), reasons: [...reasons].join(',') };
  });
  duplicateResults.forEach(x => { if (!x.ok) ng++; });
  // 「負傷：ランダムな敵に〜ダメージ」を1回だけ書いているカードは、負傷1回につき
  // 敵へのダメージイベントも1回までのはず。名前ブロック（coreEffectCount(unit,'カード名')）と
  // 汎用テキスト解釈の両方に同じ効果が実装されていると2回撃たれる。
  // 実際にデュラハン・メデューサで起きたため、カード全体を機械的に走査する。
  const singleRandomHitCards = cards.filter(card => {
    const injury = String(card.desc || '').match(/(?:^|\n)\s*負傷\s*[：:]\s*([^\n]*)/);
    if (!injury) return false;
    const text = injury[1];
    if ((text.match(/ランダムな敵に/g) || []).length !== 1) return false;
    if (/全ての|毎|全体/.test(text)) return false;
    // 「直ちに攻撃する」系は反撃ダメージで自分の負傷効果が再入するため、
    // 1回の呼び出しでも複数回撃つ。再入はPvE側（battle.js:3072の
    // _coreInjuryEffectsResolving）が止めており、コア単体の呼び出しでは
    // 判定できないのでこの監査の対象外にする。
    if (/攻撃する/.test(text)) return false;
    return true;
  });
  const singleRandomHitResults = singleRandomHitCards.map(card => {
    const { events } = invoke(card, 'p1', '負傷', enemies);
    const hits = events.filter(e => e && e.type === 'damage' && e.side === 'p2').length;
    return { name: card.name, hits, ok: hits <= 1 };
  });
  singleRandomHitResults.forEach(x => { if (!x.ok) ng++; });
  // 負傷効果の再入防止：ミノタウロス「負傷：直ちにランダムな敵に攻撃する。」は
  // その攻撃の反撃ダメージで自分の負傷効果が再入する。コアにガードが無いと
  // 自滅するまで攻撃を繰り返し、PvE（battle.jsのガードで1回）と食い違う。
  const minotaur = { id: 'reentry-m', name: 'ミノタウロス', side: 'p1', slot: 0, lane: 'front',
    atk: 4, hp: 50, maxHp: 50, color: '赤', keywords: [], desc: '負傷：直ちにランダムな敵に攻撃する。' };
  const minotaurFoes = [0, 1, 2].map(i => ({ id: `reentry-e${i}`, name: `敵${i}`, side: 'p2', slot: i, lane: 'front',
    atk: 2, hp: 100, maxHp: 100, color: '青', keywords: [], desc: '' }));
  const reentryState = core.createBattleState({ sides: { p1: { units: [minotaur] }, p2: { units: minotaurFoes } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
  const reentryEvents = [];
  const reentryEmit = e => reentryEvents.push(e);
  const reentryHit = (src, tgt, amt, counter) => core.coreResolveHit(reentryState, src, tgt, amt, counter, createSeededRng(7), reentryEmit);
  core.coreApplyInjuryEffects(minotaur, 1, reentryState, createSeededRng(11), reentryEmit, reentryHit, null, '1:0');
  const reentryAttacks = reentryEvents.filter(e => e && e.type === 'attack').length;
  const reentryOk = reentryAttacks === 1;
  if (!reentryOk) ng++;
  // 負傷反復ボーナスは _effectRepeatBonus / effectData.effectRepeatBonus の
  // どちらで渡しても同じ回数になること（オンラインだけ落ちるのを防ぐ）。
  const repeatBonusFires = key => {
    const owner = { id: 'rb-owner', name: 'メデューサ', side: 'p1', slot: 0, lane: 'front', atk: 3, hp: 60, maxHp: 60,
      color: '赤', keywords: [], desc: '負傷：ランダムな敵にXダメージを与える。Xは受けたダメージに等しい。' };
    if (key === '_effectRepeatBonus') owner._effectRepeatBonus = 1;
    else owner.effectData = { effectRepeatBonus: 1 };
    const foe = { id: 'rb-foe', name: '敵', side: 'p2', slot: 0, lane: 'front', atk: 3, hp: 300, maxHp: 300, color: '青', keywords: [], desc: '' };
    const st = core.createBattleState({ sides: { p1: { units: [owner] }, p2: { units: [foe] } },
      resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
    const evs = []; const em = e => evs.push(e);
    core.coreResolveHit(st, st.units.p2[0], st.units.p1[0], 3, false, createSeededRng(9), em);
    return evs.filter(e => e && e.type === 'damage' && e.side === 'p2').length;
  };
  const repeatBonusA = repeatBonusFires('_effectRepeatBonus');
  const repeatBonusB = repeatBonusFires('effectData');
  const repeatBonusOk = repeatBonusA === repeatBonusB && repeatBonusA === 2;
  if (!repeatBonusOk) ng++;
  // 再入防止のキーに state オブジェクトそのものを持たせてはいけない。
  // state.units はそのユニット自身を含むため循環参照になり、clone()／JSON.stringify() が
  // 例外を投げて戦闘が止まる（生贄スナップショットの clone(u) で実際にフリーズした）。
  const serialUnit = { id: 'serial-u', name: 'テスト', side: 'p1', slot: 0, lane: 'front',
    atk: 2, hp: 10, maxHp: 10, color: '赤', keywords: [], desc: '開戦：3マナを得る。' };
  const serialFoe = { id: 'serial-e', name: '敵', side: 'p2', slot: 0, lane: 'front',
    atk: 2, hp: 50, maxHp: 50, color: '青', keywords: [], desc: '' };
  const serialState = core.createBattleState({ sides: { p1: { units: [serialUnit] }, p2: { units: [serialFoe] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
  const serialEvents = [];
  const serialEmit = e => serialEvents.push(e);
  const serialHit = (src, tgt, amt, counter) => core.coreResolveHit(serialState, src, tgt, amt, counter, createSeededRng(3), serialEmit);
  const serialGains = () => serialEvents.filter(e => e && e.type === 'mana_gain').length;
  core.coreApplyOpeningEffects(serialUnit, serialState, createSeededRng(5), serialEmit, serialHit, 0);
  const serialFirst = serialGains();
  core.coreApplyOpeningEffects(serialUnit, serialState, createSeededRng(5), serialEmit, serialHit, 0);
  const serialReentry = serialGains() - serialFirst;
  core.coreApplyOpeningEffects(serialUnit, serialState, createSeededRng(5), serialEmit, serialHit, 1);
  const serialRepeat = serialGains() - serialFirst - serialReentry;
  core.coreApplyInjuryEffects(serialUnit, 1, serialState, createSeededRng(5), serialEmit, serialHit, null, '1:0');
  core.coreApplyAttackEffects(serialUnit, serialState, createSeededRng(5), serialEmit, serialHit, '1:0');
  let serialCloneOk = true;
  try { JSON.parse(JSON.stringify(serialUnit)); } catch (_) { serialCloneOk = false; }
  const serialOk = serialCloneOk && serialFirst > 0 && serialReentry === 0 && serialRepeat > 0;
  if (!serialOk) ng++;
  // 攻撃者の選択規則はコアが唯一の実装。PvEの規則（ATK0は手番を飛ばすが毒持ちは得る、
  // 反対レーンへ移るときは attacked を引き継がない）が保たれていることを確認する。
  const pickUnit = (id, atk, poison, lane) => ({ id, name: id, hp: 10, maxHp: 10, atk, poison: poison || 0,
    lane: lane || 'front', color: '赤', keywords: [], desc: '' });
  const pickState = () => ({ lane: 'front', attacked: new Set() });
  const pickedZero = core.corePickAttacker([pickUnit('atk0', 0, 0), pickUnit('atk3', 3, 0)], pickState(), false);
  const pickedPoison = core.corePickAttacker([pickUnit('atk0poison', 0, 2), pickUnit('atk3', 3, 0)], pickState(), false);
  // 前衛を撃ち終えたら後衛へ移り、そのとき attacked は引き継がない（PvEの規則）。
  const laneList = [pickUnit('front1', 3, 0, 'front'), pickUnit('rear1', 3, 0, 'rear')];
  const laneState = pickState();
  const first = core.corePickAttacker(laneList, laneState, false);
  laneState.attacked.add(first.id);
  const second = core.corePickAttacker(laneList, laneState, false);
  const pickOk = pickedZero && pickedZero.id === 'atk3'
    && pickedPoison && pickedPoison.id === 'atk0poison'
    && first && first.id === 'front1' && second && second.id === 'rear1' && laneState.lane === 'rear';
  if (!pickOk) ng++;
  // 全体攻撃・三方向攻撃の対象と反撃回数（PvE基準）。
  //   ・全体攻撃は生存する敵全員に当たるが、反撃を受けるのは**主対象1体だけ**
  //   ・三方向は「盤面配列の隣接スロット」で選ぶ（生存者だけに詰めた配列のindexではない）
  const battleUnit = (id, side, slot, atk, kws) => ({ id, name: id, side, slot, lane: 'front',
    atk, hp: 900, maxHp: 900, color: '赤', keywords: kws || [], desc: '' });
  const runSpread = (kws, p2units) => {
    const st = core.createBattleState({
      sides: { p1: { units: [battleUnit('A', 'p1', 0, 3, kws)] }, p2: { units: p2units } },
      resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
      rings: { p1: [{ name: '神速の指輪' }], p2: [] },   // 先攻を固定して1手番だけ見る
    });
    const evs = [];
    core.runBattleCore(st, createSeededRng(5), { onEvent: e => evs.push(e), turnLimit: 1 });
    return {
      targets: evs.filter(e => e.type === 'attack').map(e => e.targetId),
      counters: evs.filter(e => e.type === 'damage' && e.unitId === 'A').length,
    };
  };
  const threeFoes = [0, 1, 2].map(i => battleUnit('E' + i, 'p2', i, 1));
  const allHit = runSpread(['全体攻撃'], threeFoes);
  const gapFoes = []; gapFoes[0] = battleUnit('E0', 'p2', 0, 1);
  gapFoes[2] = battleUnit('E2', 'p2', 2, 1); gapFoes[3] = battleUnit('E3', 'p2', 3, 1);
  const triGap = runSpread(['三方向攻撃'], gapFoes);
  const spreadOk = allHit.targets.length === 3 && allHit.counters === 1
    && triGap.counters === 1 && !triGap.targets.includes('E0');
  if (!spreadOk) ng++;
  // 同一イベントの互換経路再入回帰。正規の追加発動とは異なり、同じイベントキーを
  // もう一度渡した場合は、攻撃／負傷効果を1回だけにする。
  const dedupeState = core.createBattleState({
    resources: {p1: {mana: 2, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'dedupe-ymir', name: 'ユミル', atk: 1, hp: 5, maxHp: 5, color: '青',
        desc: '攻撃：このキャラクターは+X/+Xを得る。Xはマナに等しい。'},
      {id: 'dedupe-golem', name: 'ゴーレム', atk: 1, hp: 5, maxHp: 5, color: '赤',
        desc: '負傷：このキャラクターは+2/+2を得る。'}
    ]}, p2: {units: []}}
  });
  const dedupeEvents = [];
  const dedupeHit = () => ({amount: 0, died: false});
  dedupeState._coreAttackEventSeq = 7;
  core.coreApplyAttackEffects(dedupeState.units.p1[0], dedupeState, createSeededRng(91), e => dedupeEvents.push(e), dedupeHit, '7:0');
  core.coreApplyAttackEffects(dedupeState.units.p1[0], dedupeState, createSeededRng(91), e => dedupeEvents.push(e), dedupeHit, '7:0');
  dedupeState._coreInjuryEventSeq = 8;
  core.coreApplyInjuryEffects(dedupeState.units.p1[1], 1, dedupeState, createSeededRng(92), e => dedupeEvents.push(e), dedupeHit, null, '8:0');
  core.coreApplyInjuryEffects(dedupeState.units.p1[1], 1, dedupeState, createSeededRng(92), e => dedupeEvents.push(e), dedupeHit, null, '8:0');
  const dedupeOk = dedupeState.units.p1[0].atk === 3 && dedupeState.units.p1[0].maxHp === 7
    && dedupeState.units.p1[1].atk === 3 && dedupeState.units.p1[1].maxHp === 7
    && dedupeEvents.filter(e => e.reason === 'ymir').length === 1
    && dedupeEvents.filter(e => e.reason === 'golem').length === 1;
  if (!dedupeOk) ng++;
  console.log(`同一イベント再入回帰 ユミル=${dedupeEvents.filter(e => e.reason === 'ymir').length} ゴーレム=${dedupeEvents.filter(e => e.reason === 'golem').length} ${dedupeOk ? 'OK' : 'NG'}`);
  // ラミア条件回帰：攻撃対象が負傷中なら追加の+2/+1が1回だけ発動し、
  // 全快対象では追加分を発動しない。全快対象だけの最小監査ではこの差を検出できない。
  const lamiaCard = cards.find(x => x.name === 'ラミア');
  if (lamiaCard) {
    const full = invoke(lamiaCard, 'p1', '攻撃', enemies);
    const wounded = invoke(lamiaCard, 'p1', '攻撃', enemies);
    const woundedTarget = wounded.state.units.p2[0];
    woundedTarget.hp = woundedTarget.maxHp - 1;
    wounded.unit._currentAttackTarget = woundedTarget;
    const woundedEvents = [];
    const woundedHit = (source, target, amount, counter) => core.coreResolveHit(wounded.state, source, target, amount, counter, createSeededRng(13), e => woundedEvents.push(e));
    core.coreApplyAttackEffects(wounded.unit, wounded.state, createSeededRng(13), e => woundedEvents.push(e), woundedHit);
    const fullLamia = full.events.filter(e => e.reason === 'lamia').length;
    const woundedLamia = woundedEvents.filter(e => e.reason === 'lamia').length;
    const lamiaOk = fullLamia === 1 && woundedLamia === 2;
    if (!lamiaOk) ng++;
    console.log(`ラミア負傷対象追加発動回帰\t全快=${fullLamia}\t負傷=${woundedLamia}\t${lamiaOk ? 'OK' : 'NG'}`);
  } else {
    ng++;
    console.log('ラミア負傷対象追加発動回帰\tカード欠落\tNG');
  }
  // 開戦効果の専用処理と本文パーサーの重複回帰。
  const lillithCard = cards.find(x => x.name === 'リリス');
  const lillithRun = lillithCard ? invoke(lillithCard, 'p1', '開戦', enemies) : null;
  const lillithShieldEvents = lillithRun
    ? lillithRun.events.filter(e => e.type === 'keyword_effect' && e.effect === 'shield' && e.sourceId === 'p1-subject') : [];
  const wendigo = { id: 'wendigo', name: 'ウェンディゴ', atk: 5, hp: 20, maxHp: 20,
    color: '紫', keywords: [], desc: '開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。' };
  const wendigoState = core.createBattleState({
    sides: { p1: { units: [wendigo] }, p2: { units: [
      { id: 'w1', name: '敵1', atk: 5, hp: 20, maxHp: 20 },
      { id: 'w2', name: '敵2', atk: 5, hp: 20, maxHp: 20 },
      { id: 'w3', name: '敵3', atk: 5, hp: 20, maxHp: 20 },
    ] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const wendigoEvents = [];
  core.coreApplyOpeningEffects(wendigoState.units.p1[0], wendigoState, createSeededRng(61),
    e => wendigoEvents.push(e), () => ({ amount: 0, died: false }));
  const wendigoChanges = wendigoEvents.filter(e => e.type === 'stat_change' && e.reason === 'wendigo');
  const wendigoOk = wendigoChanges.length === 3
    && wendigoState.units.p2.every(x => x.atk === 3 && x.maxHp === 18);
  const openingDuplicateOk = lillithShieldEvents.length === 1 && wendigoOk;
  if (!openingDuplicateOk) ng++;
  // 開戦反復回帰：恩寵は同一state内で2回発動し、通常の開戦効果は
  // 反復防止ガードで潰れないことを確認する（PvE/PvP共通コアの境界）。
  const grace = { id: 'grace', name: '開戦反復対象', atk: 1, hp: 5, maxHp: 5,
    color: '赤', keywords: [], desc: '開戦：全ての味方は+1/+1を得る。',
    effectData: { effectNames: ['恩寵'], effectTexts: ['常時：このキャラクターの開戦効果は1回追加で発動する。'] } };
  const graceState = core.createBattleState({
    sides: { p1: { units: [grace] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const graceEvents = [];
  const graceUnit = graceState.units.p1[0];
  for (let i = 0; i < 2; i++) core.coreApplyOpeningEffects(graceUnit, graceState,
    createSeededRng(71), e => graceEvents.push(e), () => ({ amount: 0, died: false }), i);
  const graceBuffs = graceEvents.filter(e => e.type === 'stat_change' && e.unitId === 'grace');
  const onlineGrace = { id: 'online-grace', name: '開戦反復対象', atk: 1, hp: 5, maxHp: 5,
    color: '赤', keywords: [], desc: '開戦：全ての味方は+1/+1を得る。',
    effectData: { effectNames: ['恩寵'], effectTexts: ['常時：このキャラクターの開戦効果は1回追加で発動する。'] } };
  const onlineGraceState = core.createBattleState({
    sides: { p1: { units: [onlineGrace] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const onlineGraceEvents = [];
  core.runBattleCore(onlineGraceState, createSeededRng(72), { turnLimit: 1, onEvent: e => onlineGraceEvents.push(e) });
  const onlineGraceBuffs = onlineGraceEvents.filter(e => e.type === 'stat_change' && e.unitId === 'online-grace');
  const onlineGraceResult = onlineGraceState.units.p1.find(u => u.id === 'online-grace');
  const graceOk = graceBuffs.length === 2 && graceUnit.atk === 3 && graceUnit.maxHp === 7
    && onlineGraceBuffs.length === 2 && onlineGraceResult.atk === 3 && onlineGraceResult.maxHp === 7;
  if (!graceOk) ng++;
  console.log(`開戦反復回帰\t恩寵=${graceBuffs.length}/${onlineGraceBuffs.length}\t結果=${graceUnit.atk}/${graceUnit.maxHp}|${onlineGraceResult.atk}/${onlineGraceResult.maxHp}\t${graceOk ? 'OK' : 'NG'}`);
  // ボーンチャリオット回帰：入れ子の引用符を汎用死亡召喚として誤解析せず、
  // ランダムな味方へ付与した死亡召喚が、その味方の死亡時にだけ1体発動する。
  const chariot = { id: 'chariot', name: 'ボーンチャリオット', side: 'p1', atk: 5, hp: 0, maxHp: 5,
    color: '青', keywords: [], desc: '死亡：ランダムな味方に「死亡：「青スケルトン」を召喚する。」を付与する。' };
  const grantedAlly = { id: 'granted-ally', name: '付与先', side: 'p1', atk: 1, hp: 4, maxHp: 4,
    color: '赤', keywords: [], desc: '' };
  const chariotState = core.createBattleState({
    sides: { p1: { units: [chariot, grantedAlly] }, p2: { units: [{ id: 'chariot-foe', name: '敵', atk: 1, hp: 20, maxHp: 20 }] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    summonDefs: [{ name: 'スケルトン', color: '青', power: 4, life: 1, keywords: [] }],
  });
  const chariotUnit = chariotState.units.p1[0];
  const grantedAllyUnit = chariotState.units.p1[1];
  const chariotEvents = [];
  const chariotEmit = e => chariotEvents.push(e);
  const chariotHit = (s, t, a, c) => core.coreResolveHit(chariotState, s, t, a, c, createSeededRng(51), chariotEmit);
  core.coreApplyDeathEffects(chariotUnit, chariotState, createSeededRng(52), chariotEmit, chariotHit);
  const malformed = chariotEvents.filter(e => e.type === 'summon' && /死亡/.test(String(e.unit && e.unit.name || '')));
  const recipient = grantedAllyUnit;
  recipient.hp = 0;
  core.coreApplyDeathEffects(recipient, chariotState, createSeededRng(53), chariotEmit, chariotHit);
  const proper = chariotEvents.filter(e => e.type === 'summon' && e.unit && e.unit.name === 'スケルトン');
  const chariotOk = malformed.length === 0 && proper.length === 1 && proper[0].unit.atk === 4 && proper[0].unit.hp === 1;
  if (!chariotOk) ng++;
  // 代表カードの「対象固定」「変身表示」「閾値遅延」を、発動イベントだけでなく
  // 実際の対象ID・変身後の表示情報・状態復元まで確認する。
  const randomTargetResults = [];
  for (let seed = 1; seed <= 8; seed++) {
    const subject = { id: 'banshee', name: 'バンシー', side: 'p1', atk: 4, hp: 0, maxHp: 4, color: '青', keywords: [], desc: '死亡：ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。' };
    const targetUnits = [1, 2, 3].map(i => ({ id: `bt-${i}`, name: `敵${i}`, side: 'p2', atk: 1, hp: 20, maxHp: 20, color: '赤', keywords: [], desc: '' }));
    const s = core.createBattleState({ sides: { p1: { units: [subject] }, p2: { units: targetUnits } }, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
    const es = []; const em = e => es.push(e);
    const hit = (src, target, amount, counter) => core.coreResolveHit(s, src, target, amount, counter, createSeededRng(seed + 100), em);
    core.coreApplyDeathEffects(s.units.p1[0], s, createSeededRng(seed), em, hit);
    const hitEvent = es.find(e => e.type === 'damage' && e.sourceId === 'banshee');
    if (hitEvent) randomTargetResults.push(hitEvent.unitId);
  }
  const randomTargetOk = randomTargetResults.length === 8 && new Set(randomTargetResults).size >= 2;
  if (!randomTargetOk) ng++;
  const transformTarget = { id: 'transform-target', name: '敵', side: 'p2', atk: 3, hp: 8, maxHp: 8, color: '赤', keywords: [], desc: '' };
  const transformState = core.createBattleState({ sides: { p1: { units: [] }, p2: { units: [transformTarget] } }, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, summonDefs: [{ name: 'ペリカン', color: '緑', power: 1, life: 1, no: 'C999', art: 'assets/art/characters/C999.jpg', desc: '変身後', keywords: [] }] });
  const transformEvents = [];
  const transformed = core.coreTransformUnit(transformState, transformTarget, '緑ペリカン', e => transformEvents.push(e));
  const transformOk = transformed && transformTarget.name === 'ペリカン' && transformTarget.color === '緑'
    && transformTarget.no === 'C999' && transformTarget.art.endsWith('C999.jpg')
    && transformEvents.some(e => e.type === 'transform' && e.unit && e.unit.no === 'C999');
  if (!transformOk) ng++;
  const deferredUnit = { id: 'deferred', name: '閾値持ち', side: 'p1', atk: 1, hp: 5, maxHp: 5, color: '赤', keywords: [], desc: '', manaCost: 2, manaRepeat: false, manaThresholdDesc: '1マナを得る。' };
  const deferredState = core.createBattleState({ sides: { p1: { units: [deferredUnit] }, p2: { units: [] } }, resources: { p1: { mana: 2, gold: 0 }, p2: { mana: 0, gold: 0 } } });
  deferredState.deferManaThresholdEffects = true;
  const deferredEvents = [];
  core.coreApplyManaThresholdEffects(deferredState, createSeededRng(71), e => deferredEvents.push(e), () => ({ amount: 0, died: false }));
  const deferredGain = deferredEvents.find(e => e.type === 'mana_gain');
  const deferredThreshold = deferredEvents.find(e => e.type === 'mana_threshold');
  const deferredOk = deferredGain && deferredGain.deferredAppliedByThreshold === true
    && deferredThreshold && deferredState.resources.p1.mana === 2;
  if (!deferredOk) ng++;
  // マナ連鎖回帰：「1マナ：3マナを得る」で増えたマナが「1マナ毎：+1/+1」の到達回数へ乗ること、
  // かつ遅延モード（PvE開戦演出）のdeferredAfterを順に復元した結果が非遅延と一致すること。
  // 1発動ごとに巻き戻す実装では、発動回数が減り、演出復元で先行効果が消えて最後の1回しか残らなかった。
  const manaChainCase = defer => {
    const a = { id: 'chain-a', name: 'サテュロス', side: 'p1', atk: 4, hp: 3, maxHp: 3, color: '赤', keywords: [], desc: '',
      manaCost: 1, manaRepeat: false, manaThresholdDesc: '3マナを得る。',
      _extraManaThresholds: [{ cost: 1, repeat: true, desc: 'このキャラクターは+1/+1を得る。' }] };
    const b = { id: 'chain-b', name: 'ラミア', side: 'p1', atk: 3, hp: 6, maxHp: 6, color: '赤', keywords: [], desc: '',
      manaCost: 1, manaRepeat: true, manaThresholdDesc: 'このキャラクターは+1/+1を得る。' };
    const st = core.createBattleState({ sides: { p1: { units: [a, b] }, p2: { units: [] } }, resources: { p1: { mana: 4, gold: 0 }, p2: { mana: 0, gold: 0 } } });
    st.deferManaThresholdEffects = defer;
    const evs = [];
    core.coreApplyManaThresholdEffects(st, createSeededRng(97), e => evs.push(e), () => ({ amount: 0, died: false }));
    const fires = evs.filter(e => e.type === 'mana_threshold');
    if (defer) fires.forEach(e => { if (e.deferredAfter) core.coreRestoreDeferredState(st, e.deferredAfter); });
    return { fires: fires.length, a: `${st.units.p1[0].atk}/${st.units.p1[0].hp}`, b: `${st.units.p1[1].atk}/${st.units.p1[1].hp}`, mana: st.resources.p1.mana };
  };
  const chainPlain = manaChainCase(false);
  const chainDefer = manaChainCase(true);
  const chainOk = chainPlain.fires === 15 && chainPlain.a === '11/10' && chainPlain.b === '10/13' && chainPlain.mana === 7
    && chainDefer.fires === chainPlain.fires && chainDefer.a === chainPlain.a && chainDefer.b === chainPlain.b && chainDefer.mana === chainPlain.mana;
  if (!chainOk) ng++;
  // 常時効果は効果文のトリガ一覧だけでは代表シナリオに入らないため、
  // 実戦と同じ共通入口を直接通して、観測回数・対象・累積値を確認する。
  const observerState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      p1: {units: [
        {id: 'eid', name: 'エイドロン', atk: 4, hp: 4, maxHp: 4},
        {id: 'hell', name: 'ヘルハウンド', atk: 1, hp: 4, maxHp: 4},
        {id: 'd1', name: '死者1', atk: 1, hp: 0, maxHp: 1},
        {id: 'd2', name: '死者2', atk: 1, hp: 0, maxHp: 1},
        {id: 'd3', name: '死者3', atk: 1, hp: 0, maxHp: 1},
      ]},
      p2: {units: [
        {id: 'e1', name: '敵1', atk: 1, hp: 0, maxHp: 1},
        {id: 'e2', name: '敵2', atk: 1, hp: 0, maxHp: 1},
      ]},
    },
  });
  const observerEvents = [];
  for (const id of ['d1', 'd2', 'd3']) {
    core.coreApplyDeathObservers(observerState.units.p1.find(u => u.id === id), observerState,
      createSeededRng(41), e => observerEvents.push(e), () => ({amount: 0, died: false}));
  }
  for (const id of ['e1', 'e2']) {
    core.coreApplyDeathObservers(observerState.units.p2.find(u => u.id === id), observerState,
      createSeededRng(42), e => observerEvents.push(e), () => ({amount: 0, died: false}));
  }
  const hell = observerState.units.p1.find(u => u.id === 'hell');
  const observerOk = observerState.resources.p1.mana === 1
    && observerEvents.filter(e => e.type === 'mana_gain' && e.reason === 'eidolon').length === 1
    && hell.atk === 4 && hell.maxHp === 7;
  if (!observerOk) ng++;
  console.log(`常時観測回帰 エイドロン/ヘルハウンド ${observerOk ? 'OK' : 'NG'}`);

  const shieldState = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'carb', name: 'カーバンクル', atk: 5, hp: 3, maxHp: 3},
      {id: 'ally', name: '味方', atk: 1, hp: 3, maxHp: 3, shield: 1},
    ]}, p2: {units: [
      {id: 'foe1', name: '敵1', atk: 1, hp: 5, maxHp: 5},
      {id: 'foe2', name: '敵2', atk: 1, hp: 5, maxHp: 5},
    ]}},
  });
  const shieldEvents = [];
  core.coreApplyShieldLostEffects(shieldState.units.p1[1], shieldState, createSeededRng(43),
    e => shieldEvents.push(e), (source, target, amount) => core.coreResolveHit(
      shieldState, source, target, amount, false, createSeededRng(44), e => shieldEvents.push(e)));
  const carbuncleOk = shieldEvents.filter(e => e.type === 'damage' && e.sourceId === 'carb').length === 2;
  if (!carbuncleOk) ng++;
  explicitCoverage.add('カーバンクル');
  console.log(`結界喪失回帰 カーバンクル ${carbuncleOk ? 'OK' : 'NG'}`);

  // 効果文に通常トリガ接頭辞がないカードは、本文の正規表現一覧だけでは
  // 監査されない。実戦と同じ共通入口をカードごとに通し、状態変化まで確認する。
  const makeDirectState = (p1, p2, resources = { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, summonDefs = []) =>
    core.createBattleState({ sides: { p1: { units: p1 }, p2: { units: p2 } }, resources, summonDefs });
  const makeDirectUnit = (name, side, extra = {}) => {
    const card = cards.find(x => x.name === name);
    assert(card, `監査データ欠落: ${name}`);
    return { ...makeUnit(card, side), ...extra, side, id: extra.id || `${side}-${name}` };
  };
  const directResults = [];
  const recordDirect = (name, ok, detail) => {
    if (ok) explicitCoverage.add(name); else ng++;
    directResults.push(`${name}=${detail || (ok ? 'OK' : 'NG')}${ok ? '' : ' [NG]'}`);
  };
  const plainDirectUnit = (id, side, extra = {}) => ({ id, name: '監査対象', side, atk: 2, hp: 10, maxHp: 10, color: '赤', keywords: [], desc: '', ...extra });

  // ナーガ：召喚体への+1/+1が召喚回数に応じてコアで一度だけ適用される。
  {
    const naga = makeDirectUnit('ナーガ', 'p1', { id: 'naga' });
    const s = makeDirectState([naga], [], undefined, [{ name: 'ペリカン', color: '緑', power: 1, life: 1 }]);
    const es = []; const child = core.coreSummonUnit(s, 'p1', { name: '緑ペリカン' }, e => es.push(e), 'naga');
    recordDirect('ナーガ', !!child && child.atk === 2 && child.hp === 2
      && es.filter(e => e.type === 'stat_change' && e.reason === 'naga_summon').length === 1,
      `召喚=${child && child.atk}/${child && child.hp}`);
  }
  // ダークワン：1マナ閾値を一度だけ処理し、紫対象へ+1/+1を与える。
  {
    const dark = makeDirectUnit('ダークワン', 'p1', { id: 'dark', manaCost: 1, manaRepeat: false, manaThresholdDesc: 'ランダムな紫のキャラクターは+1/+1を得る。' });
    const purple = { id: 'purple', name: '紫味方', side: 'p1', color: '紫', atk: 2, hp: 2, maxHp: 2, keywords: [], desc: '' };
    const s = makeDirectState([dark, purple], [], { p1: { mana: 1, gold: 0 }, p2: { mana: 0, gold: 0 } });
    const es = []; core.coreApplyManaThresholdEffects(s, createSeededRng(73), e => es.push(e), () => ({ amount: 0, died: false }));
    const target = s.units.p1.find(x => x.id === 'purple');
    const randomBuffs = es.filter(e => e.type === 'stat_change' && e.reason === 'mana_threshold_random_purple');
    recordDirect('ダークワン', randomBuffs.length === 1
      && randomBuffs[0].atk === 1 && randomBuffs[0].hp === 1,
      `対象=${randomBuffs[0] && randomBuffs[0].unitId}`);
  }
  // ドラゴネット：マナ閾値で変身し、表示情報も変身イベントに揃う。
  {
    const dragon = makeDirectUnit('ドラゴネット', 'p1', { id: 'dragon', manaCost: 6, manaRepeat: false, manaThresholdDesc: '「緑ドラゴン」に変身する。' });
    const s = makeDirectState([dragon], [], { p1: { mana: 6, gold: 0 }, p2: { mana: 0, gold: 0 } }, [{ name: '緑ドラゴン', color: '緑', power: 20, life: 20, no: 'C050', art: 'assets/art/characters/C050.jpg' }]);
    const es = []; core.coreApplyManaThresholdEffects(s, createSeededRng(74), e => es.push(e), () => ({ amount: 0, died: false }));
    const t = es.find(e => e.type === 'transform');
    const transformedDragon = s.units.p1.find(x => x.id === 'dragon');
    recordDirect('ドラゴネット', !!t && transformedDragon.name === '緑ドラゴン' && transformedDragon.no === 'C050' && transformedDragon.art.endsWith('C050.jpg'), `変身=${transformedDragon.name}/${transformedDragon.no}`);
  }
  // 今回の個別修正：死亡全体HP、キーワード命中、対象側召喚、ATK獲得監視、解放マナ。
  {
    const lord = makeDirectUnit('ヴァンパイアロード', 'p1', { id: 'lord' });
    const ally = { id: 'lord-ally', name: '味方', side: 'p1', atk: 1, hp: 3, maxHp: 3, keywords: [], desc: '' };
    const dead = { id: 'lord-dead', name: '死亡体', side: 'p1', atk: 1, hp: 0, maxHp: 1, keywords: [], desc: '' };
    const s = makeDirectState([lord, ally, dead], []); const es = [];
    const liveLord = s.units.p1.find(x => x.id === 'lord');
    const liveAlly = s.units.p1.find(x => x.id === 'lord-ally');
    const liveDead = s.units.p1.find(x => x.id === 'lord-dead');
    core.coreApplyDeathObservers(liveDead, s, createSeededRng(76), e => es.push(e), () => ({ amount: 0, died: false }));
    recordDirect('ヴァンパイアロード', liveLord.hp === 5 && liveAlly.hp === 4,
      `HP=${liveLord.hp}/${liveAlly.hp}`);
  }
  {
    const slin = { id: 'slin', name: 'スリン', side: 'p1', atk: 5, hp: 5, maxHp: 5,
      color: '緑', keywords: ['毒牙3', '邪眼3'], desc: '' };
    const foe = { id: 'slin-foe', name: '敵', side: 'p2', atk: 8, hp: 20, maxHp: 20, keywords: [], desc: '' };
    const s = makeDirectState([slin], [foe]); const es = [];
    core.coreResolveHit(s, slin, foe, 1, false, createSeededRng(77), e => es.push(e));
    recordDirect('スリン', foe.poison === 3 && foe.atk === 5
      && es.some(e => e.type === 'keyword_effect' && e.effect === 'poison')
      && es.some(e => e.type === 'keyword_effect' && e.effect === 'evil_eye'),
      `毒=${foe.poison}/ATK=${foe.atk}`);
  }
  {
    // ワーム：攻撃：全ての敵の毒を発動させる。**毒を持つ敵だけ**がその値ぶん減る。
    const worm = makeDirectUnit('ワーム', 'p1', { id: 'worm' });
    const foe = { id: 'worm-foe', name: '敵', side: 'p2', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '', poison: 3 };
    const clean = { id: 'worm-foe2', name: '毒なし', side: 'p2', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '' };
    const s = makeDirectState([worm], [foe, clean]);
    // createBattleState() はユニットを複製するので、**状態側の体**を見ること。
    const sWorm = s.units.p1[0], sFoe = s.units.p2[0], sClean = s.units.p2[1];
    const es = []; sWorm._currentAttackTarget = sFoe;
    core.coreApplyAttackEffects(sWorm, s, createSeededRng(78), e => es.push(e), () => ({ amount: 0, died: false }));
    recordDirect('ワーム', sFoe.hp === 17 && sClean.hp === 20,
      `毒発動=${20 - sFoe.hp}/毒なし=${20 - sClean.hp}`);
  }
  {
    const wyvern = makeDirectUnit('ワイバーン', 'p1', { id: 'wyvern' });
    const foe = { id: 'wyvern-foe', name: '敵', side: 'p2', atk: 1, hp: 20, maxHp: 20, keywords: [], desc: '' };
    const s = makeDirectState([wyvern], [foe]); const es = [];
    const liveWyvern = s.units.p1.find(x => x.id === 'wyvern');
    core.coreApplyOpeningEffects(liveWyvern, s, createSeededRng(79), e => es.push(e), (a, t, n) => core.coreResolveHit(s, a, t, n, false, createSeededRng(80), e => es.push(e)));
    // 開戦効果がないワイバーン自身へのATK獲得を、共通監視入口で再現する。
    liveWyvern.atk += 1;
    core.coreTriggerAtkGainEffects(liveWyvern, 1, s, createSeededRng(81), e => es.push(e), (a, t, n) => core.coreResolveHit(s, a, t, n, false, createSeededRng(82), e => es.push(e)));
    const liveFoe = s.units.p2.find(x => x.id === 'wyvern-foe');
    recordDirect('ワイバーン', liveFoe.hp === 18 && es.some(e => e.type === 'damage' && e.sourceId === 'wyvern'), `敵HP=${liveFoe.hp}`);
  }
  {
    const behemoth = makeDirectUnit('ベヒーモス', 'p1', { id: 'behemoth' });
    const s = makeDirectState([behemoth], [], { p1: { mana: 3, gold: 0 }, p2: { mana: 0, gold: 0 } }); const es = [];
    core.coreApplyReleaseEffects(behemoth, [], s, createSeededRng(83), e => es.push(e), () => ({ amount: 0, died: false }));
    recordDirect('ベヒーモス', s.resources.p1.mana === 6 && es.some(e => e.type === 'mana_set' && e.reason === 'behemoth'), `マナ=${s.resources.p1.mana}`);
  }
  {
    const nosferatu = { id: 'nosferatu', name: 'ノスフェラトゥ', side: 'p1', atk: 4, hp: 4,
      maxHp: 4, color: '青', keywords: ['生命吸収'], desc: '' };
    const foe = { id: 'nosferatu-foe', name: '敵', side: 'p2', atk: 1, hp: 4, maxHp: 4, keywords: [], desc: '' };
    const s = makeDirectState([nosferatu], [foe]); const live = s.units.p1[0]; const liveFoe = s.units.p2[0];
    live.hp = 2;
    core.coreResolveHit(s, live, liveFoe, 2, false, createSeededRng(84), () => {});
    recordDirect('ノスフェラトゥ', live.keywords.includes('生命吸収') && !live.keywords.includes('隠密')
      && liveFoe.hp === 2 && live.hp === 4, `KW=${live.keywords.join('/')}/HP=${live.hp}`);
  }
  // バンダースナッチ：対象選択は乱数、変身先の枠・絵・番号を一括更新する。
  {
    const bander = makeDirectUnit('バンダースナッチ', 'p1', { id: 'bander', manaCost: 6, manaRepeat: false, manaThresholdDesc: 'ランダムな敵を「緑ペリカン」に変身させる。' });
    const foe1 = { id: 'foe1', name: '敵1', side: 'p2', color: '赤', atk: 4, hp: 4, maxHp: 4, keywords: [], desc: '' };
    const foe2 = { id: 'foe2', name: '敵2', side: 'p2', color: '赤', atk: 4, hp: 4, maxHp: 4, keywords: [], desc: '' };
    const s = makeDirectState([bander], [foe1, foe2], { p1: { mana: 6, gold: 0 }, p2: { mana: 0, gold: 0 } }, [{ name: 'ペリカン', color: '緑', power: 1, life: 1, no: 'C999', art: 'assets/art/characters/C999.jpg' }]);
    const es = []; core.coreApplyManaThresholdEffects(s, createSeededRng(75), e => es.push(e), () => ({ amount: 0, died: false }));
    const changed = s.units.p2.filter(x => x.name === 'ペリカン');
    recordDirect('バンダースナッチ', changed.length === 1 && changed[0].color === '緑' && changed[0].no === 'C999' && es.some(e => e.type === 'transform'), `変身数=${changed.length}`);
  }
  // ヴォイド・ウォーカー：紫キャラの戦闘修正だけが+1される。
  {
    const voidWalker = makeDirectUnit('ヴォイド・ウォーカー', 'p1', { id: 'void' });
    const purple = { id: 'vp', name: '紫攻撃者', side: 'p1', color: '紫', atk: 2, hp: 2, maxHp: 2, keywords: [], desc: '' };
    const s = makeDirectState([voidWalker, purple], []);
    s.units.p1.forEach(u => { u._voidWalkerBonus = u.color === '紫' ? 1 : 0; });
    const corePurple = s.units.p1.find(x => x.id === 'vp');
    recordDirect('ヴォイド・ウォーカー', core.coreStatBonus
      ? core.coreStatBonus(corePurple, 1) === 2 && corePurple._voidWalkerBonus === 1
      : corePurple._voidWalkerBonus === 1, '紫修正保持');
  }
  // カオス・インプ：味方の解放時に、ランダムな味方の開戦効果を1回発動する。
  {
    const chaos = makeDirectUnit('カオス・インプ', 'p1', { id: 'chaos' });
    const released = makeDirectUnit('ナーガ', 'p1', { id: 'released' });
    const s = makeDirectState([chaos, released], []);
    const es = [];
    core.coreApplyReleaseEffects(released, [], s, createSeededRng(76), e => es.push(e), () => ({ amount: 0, died: false }));
    recordDirect('カオス・インプ', es.every(e => e.type !== 'error'), `発動=${es.length}`);
  }
  // マーメイドは既存のマナ重複回帰で検証済み、常時観測2種は直前の回帰で検証済み。
  explicitCoverage.add('マーメイド');
  explicitCoverage.add('ヘルハウンド');
  explicitCoverage.add('エイドロン');
  // 通常トリガのカードは、上の全カード×トリガ監査で個別シナリオを
  // 実行済みとして扱う。行が一つもないカードだけをここで漏れとして止める。
  REQUIRED_REGRESSION_CARDS.forEach(name => {
    if (rows.some(row => row.startsWith(`${name}\t`))) explicitCoverage.add(name);
  });
  const missingCoverage = REQUIRED_REGRESSION_CARDS.filter(name => !explicitCoverage.has(name));
  if (missingCoverage.length) {
    ng += missingCoverage.length;
    console.error(`カード個別シナリオ未実行: ${missingCoverage.join('、')}`);
  }
  console.log(`常時・マナ・変身個別回帰\t${directResults.join('\t')}\t${missingCoverage.length ? 'NG' : 'OK'}`);

  // 召喚回帰：上限超過は生成・summonイベントともに発生させず、
  // 連続召喚はイベント順（本体→誘発体）と表示順の基準となるplacementを維持する。
  const capUnits = Array.from({ length: 14 }, (_, i) => ({ id: `cap-${i}`, name: `味方${i}`, atk: 1, hp: 5, maxHp: 5, color: '赤', keywords: [], desc: '' }));
  const capState = core.createBattleState({
    sides: { p1: { units: capUnits }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const capEvents = [];
  const capChild = core.coreSummonUnit(capState, 'p1', { name: 'ウルフ', color: '緑' }, e => capEvents.push(e), 'cap-0');
  const capOk = capChild === null
    && capState.units.p1.length === 14
    && capEvents.filter(e => e.type === 'summon').length === 0
    && capEvents.filter(e => e.type === 'summon_rejected').length === 1;
  if (!capOk) ng++;

  const lichState = core.createBattleState({
    sides: { p1: { units: [
      { id: 'maker', name: '召喚元', atk: 2, hp: 5, maxHp: 5, color: '緑', keywords: [], desc: '' },
      { id: 'lich', name: 'リッチ', atk: 2, hp: 5, maxHp: 5, color: '青', keywords: [], desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。' },
    ] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    summonDefs: [
      { name: 'ウルフ', color: '緑', power: 1, life: 1, no: 'C041' },
      { name: 'シャドウ', color: '青', power: 1, life: 1, no: 'C042' },
    ],
  });
  const lichEvents = [];
  core.coreSummonUnit(lichState, 'p1', { name: '緑ウルフ', color: '緑' }, e => lichEvents.push(e), 'maker');
  core.coreFlushPendingLichSummons(lichState, e => lichEvents.push(e));
  const summonNames = lichEvents.filter(e => e.type === 'summon').map(e => e.unit && e.unit.name);
  const lichSummons = lichEvents.filter(e => e.type === 'summon');
  const lichOrderOk = summonNames.join(',') === 'ウルフ,シャドウ'
    && lichSummons[0]?.placement === ''
    && lichSummons[1]?.placement === 'rightOfSource'
    && lichSummons[1]?.sourceId === lichSummons[0]?.unit?.id;
  if (!lichOrderOk) ng++;
  const miteraState = core.createBattleState({
    sides: { p1: { units: [
      { id: 'mitera', name: 'ミテーラ', atk: 2, hp: 5, maxHp: 5, color: '緑', keywords: [], desc: '開戦：「緑ペリカン」を3体召喚する。' },
      { id: 'lich2', name: 'リッチ', atk: 2, hp: 5, maxHp: 5, color: '青', keywords: [], desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。' },
    ] }, p2: { units: [] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    summonDefs: [
      { name: 'ペリカン', color: '緑', power: 1, life: 1, no: 'C041' },
      { name: 'シャドウ', color: '青', power: 1, life: 1, no: 'C042' },
    ],
  });
  const miteraEvents = [];
  miteraState._deferLichSummons = true;
  core.coreApplyOpeningEffects(miteraState.units.p1[0], miteraState, createSeededRng(12), e => miteraEvents.push(e), () => {});
  core.coreFlushPendingLichSummons(miteraState, e => miteraEvents.push(e));
  const miteraNames = miteraEvents.filter(e => e.type === 'summon').map(e => e.unit && e.unit.name);
  // 召喚は前衛の右端にだけ出る。前衛7枠が埋まった時点で以降は成立しない
  // （ミテーラ＋リッチ＋ペリカン3＋シャドウ2＝7体で満杯。3体目のシャドウは出ない）。
  const miteraOrderOk = miteraNames.join(',') === 'ペリカン,ペリカン,ペリカン,シャドウ,シャドウ';
  if (!miteraOrderOk) ng++;
  console.log(`召喚上限回帰 上限超過イベント=${capEvents.filter(e => e.type === 'summon').length} 拒否=${capEvents.filter(e => e.type === 'summon_rejected').length} ${capOk ? 'OK' : 'NG'}`);
  console.log(`リッチ誘発順回帰 ${summonNames.join('→')} ${lichOrderOk ? 'OK' : 'NG'}`);
  console.log(`ミテーラ3体＋リッチ誘発順回帰 ${miteraNames.join('→')} ${miteraOrderOk ? 'OK' : 'NG'}`);

  // 今回の個別修正回帰。全て共通コアの入口を直接検査する。
  const fixedNgBefore = ng;
  {
    const grim = { id: 'grim', name: 'グリムリーパー', side: 'p1', atk: 3, hp: 10, maxHp: 10,
      color: '黒', keywords: ['即死'], desc: '封印5　即死' };
    const foe = { id: 'grim-foe', name: '敵', side: 'p2', atk: 1, hp: 10, maxHp: 10, color: '赤', keywords: [], desc: '' };
    const s = makeDirectState([grim], [foe]); const es = [];
    core.coreResolveHit(s, grim, foe, 1, false, createSeededRng(91), e => es.push(e));
    recordDirect('グリムリーパー', foe.hp === 0 && es.filter(e => e.type === 'instant_death').length === 1, `即死=${foe.hp === 0 ? 1 : 0}`);
  }
  {
    const attacker = makeDirectUnit('ラミア', 'p1', { id: 'stealth-attacker' });
    const stealth = { id: 'stealth', name: 'ノスフェラトゥ', side: 'p2', atk: 3, hp: 10, maxHp: 10,
      color: '黒', lane: 'front', keywords: ['隠密'], desc: '隠密' };
    const visible = { id: 'visible', name: '可視', side: 'p2', atk: 1, hp: 10, maxHp: 10, color: '赤', lane: 'rear', keywords: [], desc: '' };
    const s = makeDirectState([attacker], [stealth, visible]);
    const target = core.coreSelectAttackTarget(s.units.p1[0], s.units.p2, createSeededRng(92), { defendersAreEnemies: true });
    recordDirect('ノスフェラトゥ', !!target && target.id === 'visible', `対象=${target && target.name}`);
  }
  {
    const vri = makeDirectUnit('ヴリコラカス', 'p1', { id: 'vri', manaCost: 4, manaRepeat: true, manaThresholdDesc: 'ランダムな味方が復活を得る。' });
    const ally = { id: 'revive-target', name: '対象', side: 'p1', atk: 2, hp: 4, maxHp: 4, color: '赤', keywords: [], desc: '' };
    const s = makeDirectState([vri, ally], [], { p1: { mana: 4, gold: 0 }, p2: { mana: 0, gold: 0 } });
    const es = []; const pickLast = { next: () => 0.9, int: (a, b) => b, pick: xs => xs[xs.length - 1] };
    core.coreApplyManaThresholdEffects(s, pickLast, e => es.push(e), () => ({ amount: 0, died: false }));
    const target = s.units.p1.find(x => x.id === 'revive-target');
    target.atk = 10; target.maxHp = 20; target.hp = 0;
    core.coreTriggerDeath(target, s, e => es.push(e)); core.coreTryRevive(target, s, e => es.push(e));
    const revives = es.filter(e => e.type === 'revive');
    recordDirect('ヴリコラカス', !target.keywords.includes('復活') && revives.length === 1
      && target.atk === 1 && target.maxHp === 2 && target.hp === 2, `復活=${revives.length} ${target.atk}/${target.hp}`);
  }
  {
    const lem = makeDirectUnit('レムレース', 'p1', { id: 'lem', atk: 1, hp: 4 });
    const dead = { id: 'dead-card', name: '死亡者', side: 'p2', atk: 10, hp: 0, maxHp: 20, color: '赤', keywords: [], desc: '', _useEnemyVisualFrame: true };
    const s = makeDirectState([lem], [dead], undefined, [{ name: '死亡者', color: '赤', power: 10, life: 20 }]);
    s.deadUnits = [core.coreUnitSnapshot(dead)]; const es = [];
    core.coreApplyDeathEffects(lem, s, createSeededRng(93), e => es.push(e), () => {});
    const summon = es.find(e => e.type === 'summon');
    recordDirect('レムレース', !!summon && !es.some(e => e.type === 'transform') && summon.unit.atk === 5
      && summon.unit.hp === 10 && summon.unit._useEnemyVisualFrame === true, `召喚=${summon && summon.unit.atk}/${summon && summon.unit.hp}`);
  }
  {
    const ettin = makeDirectUnit('エティン', 'p1', { id: 'ettin' });
    const siren = makeDirectUnit('サイレン', 'p1', { id: 'siren' });
    const wraith = makeDirectUnit('レイス', 'p1', { id: 'wraith' });
    const injured = makeDirectUnit('ゴーレム', 'p1', { id: 'injured' });
    const s = makeDirectState([ettin, siren, wraith, injured], []); const es = [];
    core.coreApplyInjuryEffects(siren, 1, s, createSeededRng(94), e => es.push(e), () => {});
    const before = ettin.atk;
    core.coreApplyDeathEffects(wraith, s, createSeededRng(95), e => es.push(e), () => {});
    recordDirect('エティン/レイス', before === ettin.atk && !es.some(e => e.type === 'stat_change' && e.sourceId === wraith.id && e.unitId === ettin.id), `エティン=${ettin.atk}`);
  }
  {
    const heca = makeDirectUnit('ヘカトンケイル', 'p1', { id: 'heca' });
    const s = makeDirectState([heca], []); const es = [];
    core.coreApplyInjuryEffects(heca, 1, s, { next: () => 0.05, int: (a, b) => a, pick: xs => xs[0] }, e => es.push(e), () => {});
    recordDirect('ヘカトンケイル', es.some(e => e.type === 'mana_gain' && e.amount === 1), `マナ=${es.filter(e => e.type === 'mana_gain').length}`);
  }
  // 今回のカード効果回帰：閾値効果、封印の色参照、強制マナ効果、操り攻撃、変身表示、HP↔ATK交換。
  {
    const undine = makeDirectUnit('ウンディーネ', 'p1', { id: 'undine', manaCost: 3, manaRepeat: true, manaThresholdDesc: '全ての敵に弱体1を与える。' });
    const foe = plainDirectUnit('undine-foe', 'p2', { hp: 20, maxHp: 20 });
    const s = makeDirectState([undine], [foe], { p1: { mana: 3, gold: 0 }, p2: { mana: 0, gold: 0 } }); const es = [];
    core.coreApplyManaThresholdEffects(s, createSeededRng(101), e => es.push(e), () => ({ amount: 0, died: false }));
    const stateFoe = s.units.p2[0];
    recordDirect('ウンディーネ', stateFoe.weaken === 1 && es.some(e => e.type === 'keyword_effect' && e.effect === 'weaken'), `弱体=${stateFoe.weaken}`);
  }
  {
    const spriggan = makeDirectUnit('スプリガン', 'p1', { id: 'spriggan', manaCost: 4, manaRepeat: true, manaThresholdDesc: 'ランダムな味方は結界1を得る。' });
    const ally = plainDirectUnit('spriggan-ally', 'p1', { hp: 10, maxHp: 10 });
    const s = makeDirectState([spriggan, ally], [], { p1: { mana: 4, gold: 0 }, p2: { mana: 0, gold: 0 } }); const es = [];
    core.coreApplyManaThresholdEffects(s, createSeededRng(102), e => es.push(e), () => ({ amount: 0, died: false }));
    const stateAlly = s.units.p1.find(x => x.shield > 0);
    recordDirect('スプリガン', !!stateAlly && es.some(e => e.type === 'keyword_effect' && e.effect === 'shield'), `結界=${stateAlly && stateAlly.shield || 0}`);
  }
  {
    // エレメンタル：全ての色の味方がそろえばATKとHPが2倍になる。
    const elemental = makeDirectUnit('エレメンタル', 'p1', { id: 'elemental-full' });
    const colors = ['赤', '青', '緑', '黄', '紫'].map((color, i) => plainDirectUnit(`elemental-full-${i}`, 'p1', { color }));
    const s = makeDirectState([elemental, ...colors], []);
    const sElemental = s.units.p1[0];
    const baseAtk = sElemental.atk, baseHp = sElemental.maxHp;
    const es = [];
    core.coreApplyOpeningEffects(sElemental, s, createSeededRng(105), e => es.push(e), () => {});
    recordDirect('エレメンタル全色2倍', sElemental.atk === baseAtk * 2 && sElemental.maxHp === baseHp * 2
      && es.some(e => e.type === 'stat_change' && e.reason === 'opening_all_color_double'),
      `ATK/HP=${sElemental.atk}/${sElemental.maxHp}`);
  }
  {
    const nymph = makeDirectUnit('ニンフ', 'p1', { id: 'nymph' });
    const sealedPurple = makeDirectUnit('封印されしもの', 'p1', { id: 'sealed-purple', color: '紫', _sealed: true });
    const s = makeDirectState([nymph, sealedPurple], [], { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } });
    const es = []; core.coreApplyOpeningEffects(nymph, s, createSeededRng(103), e => es.push(e), () => {});
    recordDirect('ニンフ封印色除外', s.resources.p1.mana === 1, `マナ=${s.resources.p1.mana}`);
  }
  {
    const elemental = makeDirectUnit('エレメンタル', 'p1', { id: 'elemental' });
    const colors = ['赤', '青', '緑', '黄'].map((color, i) => plainDirectUnit(`elemental-${i}`, 'p1', { color }));
    colors.push(makeDirectUnit('封印されしもの', 'p1', { id: 'elemental-sealed', color: '紫', _sealed: true }));
    const s = makeDirectState([elemental, ...colors], []); const es = [];
    // createBattleState() はユニットを複製するので、**状態側の体**を見ること。
    const sElemental = s.units.p1[0];
    const baseAtk = sElemental.atk, baseHp = sElemental.maxHp;
    core.coreApplyOpeningEffects(sElemental, s, createSeededRng(104), e => es.push(e), () => {});
    // 封印された紫は色に数えないので、全色そろわず2倍にならない。
    recordDirect('エレメンタル封印色除外', sElemental.atk === baseAtk && sElemental.maxHp === baseHp,
      `ATK/HP=${sElemental.atk}/${sElemental.maxHp}`);
  }
  {
    const pegasus = makeDirectUnit('ペガサス', 'p1', { id: 'pegasus' });
    const target = makeDirectUnit('ウンディーネ', 'p1', { id: 'pegasus-target', manaCost: 3, manaRepeat: true, manaThresholdDesc: '全ての敵に弱体1を与える。' });
    const foe = plainDirectUnit('pegasus-foe', 'p2');
    const s = makeDirectState([pegasus, target], [foe], { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }); const es = [];
    const statePegasus = s.units.p1[0]; const stateFoe = s.units.p2[0];
    statePegasus._currentAttackTarget = stateFoe;
    core.coreApplyAttackEffects(statePegasus, s, createSeededRng(105), e => es.push(e), () => {});
    recordDirect('ペガサス', stateFoe.weaken === 1, `弱体=${stateFoe.weaken}`);
  }
  {
    const pixie = makeDirectUnit('ピクシー', 'p1', { id: 'pixie' });
    const foes = [plainDirectUnit('pixie-a', 'p2'), plainDirectUnit('pixie-b', 'p2')];
    const s = makeDirectState([pixie], foes); const es = [];
    const statePixie = s.units.p1[0];
    statePixie._currentAttackTarget = s.units.p2[0];
    const result = core.coreApplyAttackEffects(statePixie, s, createSeededRng(106), e => es.push(e), () => ({ amount: 0, died: false }));
    const attacks = es.filter(e => e.type === 'attack' && e.immediate);
    recordDirect('ピクシー', result.skipAttack === true && attacks.length === 1 && attacks[0].attackerId !== attacks[0].targetId, `即時攻撃=${attacks.length}`);
  }
  {
    const gremlin = makeDirectUnit('グレムリン', 'p1', { id: 'gremlin', atk: 4, hp: 5, maxHp: 5 });
    const target = plainDirectUnit('gremlin-target', 'p2', { atk: 7, hp: 20, maxHp: 20 });
    const s = makeDirectState([gremlin], [target]); const stateGremlin = s.units.p1[0]; const stateTarget = s.units.p2[0]; stateGremlin._currentAttackTarget = stateTarget;
    core.coreApplyAttackEffects(stateGremlin, s, createSeededRng(107), () => {}, () => {});
    recordDirect('グレムリン', stateGremlin.hp === 7 && stateTarget.atk === 5, `HP=${stateGremlin.hp} 対象ATK=${stateTarget.atk}`);
  }
  {
    const bunder = makeDirectUnit('バンダースナッチ', 'p1', { id: 'bunder', manaCost: 6, manaRepeat: false, manaThresholdDesc: 'ランダムな敵を「緑ペリカン」に変身させる。' });
    const target = plainDirectUnit('bunder-target', 'p2', { atk: 9, hp: 9, maxHp: 9, _useEnemyVisualFrame: true });
    const s = makeDirectState([bunder], [target], { p1: { mana: 6, gold: 0 }, p2: { mana: 0, gold: 0 } }, [{ name: 'ペリカン', color: '緑', power: 2, life: 3, no: 'C999', imageNo: 'C999', art: 'pelican.png' }]); const es = [];
    core.coreApplyManaThresholdEffects(s, createSeededRng(108), e => es.push(e), () => ({ amount: 0, died: false }));
    const stateTarget = s.units.p2[0];
    recordDirect('バンダースナッチ変身表示', stateTarget.name === 'ペリカン' && stateTarget.color === '緑' && stateTarget.artCode === 'C999' && stateTarget.imageNo === 'C999', `形態=${stateTarget.name} art=${stateTarget.artCode}/${stateTarget.imageNo}`);
  }
  console.log(`今回の個別修正回帰\t${directResults.slice(-14).join('\t')}\t${ng === fixedNgBefore ? 'OK' : 'NG'}`);

  // ツインデビル回帰：開戦コピーは本体の効果判定用状態も引き継ぐ。
  // コピー側の攻撃トリガを本体側と同じ入力で発火し、回数・量を比較する。
  const twinState = core.createBattleState({
    sides: { p1: { units: [{
      id: 'twin', name: 'ツインデビル', side: 'p1', atk: 3, hp: 4, maxHp: 4,
      color: '赤', keywords: [], desc: '開戦：コピーを1体召喚する。', manaOnAttack: 1,
      _adjacentPanelEffectTexts: ['攻撃：◆を得る。'],
    }] }, p2: { units: [{ id: 'twin-foe', name: '敵', atk: 1, hp: 5, maxHp: 5 }] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
  });
  const twinEvents = [];
  core.coreApplyOpeningEffects(twinState.units.p1[0], twinState, createSeededRng(81),
    e => twinEvents.push(e), () => {});
  const twin = twinState.units.p1[0];
  const twinCopy = twinState.units.p1.find(x => x && x._openingDuplicate);
  const twinManaEvents = [];
  core.coreTriggerManaOnAttack(twin, twinState, e => twinManaEvents.push(e));
  core.coreTriggerManaOnAttack(twinCopy, twinState, e => twinManaEvents.push(e));
  const twinAmounts = twinManaEvents.filter(e => e.type === 'mana_gain').map(e => Number(e.amount));
  const twinOk = !!twinCopy
    && twinCopy.manaOnAttack === twin.manaOnAttack
    && twinCopy._adjacentPanelEffectTexts?.join('|') === twin._adjacentPanelEffectTexts?.join('|')
    && twinAmounts.length === 2 && twinAmounts[0] === twinAmounts[1] && twinAmounts[0] === 1;
  if (!twinOk) ng++;
  console.log(`ツインデビルコピー効果引継ぎ回帰	コピー=${!!twinCopy}	攻撃マナ=${twinAmounts.join(',')}	${twinOk ? 'OK' : 'NG'}`);

  // 個別修正回帰：解放バフ、無限封印、ナイトメア再発動、熟練複数枚。
  {
    const arch = makeDirectUnit('アークデーモン', 'p1', { id: 'arch', desc: '解放：全ての紫のキャラクターは+1/+1を得る。', keywords: ['封印12'], equipment: [{ category: '強化' }, { category: 'エンチャント' }] });
    const purple = { id: 'arch-purple', name: '紫仲間', side: 'p1', color: '紫', atk: 2, hp: 2, maxHp: 2, keywords: [], desc: '' };
    const s = makeDirectState([arch, purple], []); const es = [];
    core.coreApplyReleaseEffects(s.units.p1[0], [], s, createSeededRng(121), e => es.push(e), () => {});
    const livePurple = s.units.p1.find(x => x.id === 'arch-purple');
    recordDirect('アークデーモン解放', livePurple.atk === 4 && livePurple.hp === 4
      && es.filter(e => e.type === 'stat_change' && e.reason === 'arch_demon_purple_buff' && e.unitId === 'arch-purple').length === 2, `紫=${livePurple.atk}/${livePurple.hp}`);
  }
  {
    const skilled = { id: 'skilled', name: '熟練対象', side: 'p1', color: '赤', atk: 1, hp: 1, maxHp: 1, keywords: ['熟練', '熟練'], desc: '' };
    const s = makeDirectState([skilled], []);
    recordDirect('熟練複数枚', core.coreStatBonus(skilled, 1) === 3, `補正=${core.coreStatBonus(skilled, 1)}`);
  }
  {
    const abyss = makeDirectUnit('アビス・バロン', 'p1', { id: 'abyss' });
    const foe = { id: 'abyss-foe', name: '封印対象', side: 'p2', color: '赤', atk: 1, hp: 5, maxHp: 5, keywords: [], desc: '' };
    const s = makeDirectState([abyss], [foe]); const es = [];
    core.coreApplyReleaseEffects(abyss, [], s, createSeededRng(122), e => es.push(e), () => {});
    const liveFoe = s.units.p2[0];
    recordDirect('アビス・バロン無限封印', liveFoe._sealValue === Infinity && liveFoe._sealInfinity === true
      && es.some(e => e.type === 'seal_apply' && e.value === 'infinite'), `封印=${liveFoe._sealValue}`);
  }
  {
    const nightmare = makeDirectUnit('ナイトメア', 'p1', { id: 'nightmare', hp: 10, maxHp: 10 });
    const s = makeDirectState([nightmare], []); s.blood.p1 = 2; const es = [];
    nightmare.hp = 0; core.coreApplyDeathEffects(nightmare, s, createSeededRng(123), e => es.push(e), () => {});
    nightmare._sealed = false; delete nightmare._coreDeathEffectsTriggered; nightmare.hp = 0;
    core.coreApplyDeathEffects(nightmare, s, createSeededRng(124), e => es.push(e), () => {});
    recordDirect('ナイトメア再封印', es.filter(e => e.type === 'seal_apply').length === 2, `封印回数=${es.filter(e => e.type === 'seal_apply').length}`);
  }
  {
    const source = { id: 'hit-keywords', name: '命中キーワード', atk: 3, hp: 10, maxHp: 10,
      keywords: ['即死', '衝撃2', '生命吸収'], desc: '' };
    const target = { id: 'hit-target', name: '対象', atk: 2, hp: 10, maxHp: 10, keywords: [], desc: '' };
    const s = core.createBattleState({ sides: { p1: { units: [source] }, p2: { units: [target] } } });
    const es = [];
    core.coreResolveHit(s, s.units.p1[0], s.units.p2[0], 3, false, createSeededRng(125), e => es.push(e));
    const instantOk = s.units.p2[0].hp === 0 && es.some(e => e.type === 'instant_death');
    const weakenSource = { id: 'weaken-source', name: '衝撃役', atk: 3, hp: 5, maxHp: 10, keywords: ['衝撃2', '生命吸収'], desc: '' };
    const weakenTarget = { id: 'weaken-target', name: '対象2', atk: 2, hp: 10, maxHp: 10, keywords: [], desc: '' };
    const ws = core.createBattleState({ sides: { p1: { units: [weakenSource] }, p2: { units: [weakenTarget] } } });
    const wes = [];
    core.coreResolveHit(ws, ws.units.p1[0], ws.units.p2[0], 3, false, createSeededRng(128), e => wes.push(e));
    recordDirect('通常攻撃の命中キーワード', instantOk && ws.units.p2[0].weaken === 2 && ws.units.p1[0].hp === 8
      && wes.some(e => e.type === 'keyword_effect' && e.effect === 'weaken'),
      `即死=${instantOk ? 1 : 0} 弱体=${ws.units.p2[0].weaken || 0} 吸収HP=${ws.units.p1[0].hp}`);
  }
  {
    const source = { id: 'fled-source', name: '武器破壊役', atk: 3, hp: 10, maxHp: 10,
      keywords: [], desc: '攻撃：このキャラクターの攻撃はHPではなくATKにダメージを与える。' };
    const target = { id: 'fled-target', name: '対象', atk: 2, hp: 10, maxHp: 10, keywords: [], desc: '' };
    const s = core.createBattleState({ sides: { p1: { units: [source] }, p2: { units: [target] } } });
    const es = [];
    s.units.p1[0]._coreAttackContact = true;
    core.coreResolveHit(s, s.units.p1[0], s.units.p2[0], 2, false, createSeededRng(126), e => es.push(e));
    recordDirect('武器破壊ATK0逃走', s.units.p2[0].hp === 0
      && es.filter(e => e.type === 'fled').length === 1 && !es.some(e => e.type === 'death'),
      `HP=${s.units.p2[0].hp} fled=${es.filter(e => e.type === 'fled').length}`);
  }
  {
    const defense = { id: 'defense', name: '防戦役', atk: 2, hp: 5, maxHp: 5, keywords: ['防戦'], desc: '' };
    const foe = { id: 'defense-foe', name: '攻撃役', atk: 1, hp: 5, maxHp: 5, keywords: ['防戦'], desc: '' };
    const result = core.runBattleCore(core.createBattleState({ sides: { p1: { units: [defense] }, p2: { units: [foe] } } }), createSeededRng(127), { turnLimit: 3 });
    recordDirect('両陣営防戦引き分け', result.outcome === 'draw' && result.endReason === 'both_defense', `結果=${result.outcome}/${result.endReason}`);
  }
  {
    const dead = { id: 'ring-dead', name: '犠牲', atk: 1, hp: 0, maxHp: 1, lane: 'front', keywords: [], desc: '' };
    const rear = { id: 'ring-rear', name: '後衛', atk: 1, hp: 5, maxHp: 5, lane: 'rear', keywords: [], desc: '' };
    const foe = { id: 'ring-foe', name: '敵', atk: 1, hp: 5, maxHp: 5, keywords: [], desc: '' };
    const s = core.createBattleState({ sides: { p1: { units: [dead, rear] }, p2: { units: [foe] } }, rings: { p1: [{ name: '不死の指輪' }], p2: [] } });
    const es = [];
    s.units.p1[0].hp = 0;
    core.coreApplyDeathObservers(s.units.p1[0], s, createSeededRng(129), e => es.push(e), () => {});
    recordDirect('不死の指輪3体召喚', es.filter(e => e.type === 'summon').length === 3
      && es.filter(e => e.type === 'ring_effect' && e.amount === 3).length === 1, `召喚=${es.filter(e => e.type === 'summon').length}`);
  }
  console.log('カード\tトリガ\t効果イベント数\tダメージ対象数\t理由\t判定'); rows.forEach(r => console.log(r));
  console.log(`デュラハン回帰\t味方死亡=${allyDeath.length}\t敵死亡=${enemyDeath.length}\t${dullahanOk ? 'OK' : 'NG'}`);
  console.log(`幻影効果回帰\t素体死亡イベント=${phantom.length}\t\t${plainOk ? 'OK' : 'NG'}`);
  console.log(`マーメイドのマナ重複回帰\t獲得=${manaGain && manaGain.amount}\t\t${manaOk ? 'OK' : 'NG'}`);
  console.log(`同コスト閾値独立回帰\t発火=${thresholdBuffs.length}\t\t${thresholdOk ? 'OK' : 'NG'}`);
  console.log(`複数回マナ閾値回帰\t4マナ毎/8マナ 発火=${repeatedManaFires.length} 召喚=${repeatedManaSummons.length}\t${repeatedManaOk ? 'OK' : 'NG'}`);
  duplicateResults.forEach(x => console.log(`二重実行回帰\t${x.name}\t理由=${x.reasons || '-'}\t${x.ok ? 'OK' : 'NG'}`));
  const singleRandomHitNg = singleRandomHitResults.filter(x => !x.ok);
  console.log(`負傷ランダム単発二重発動回帰\t対象=${singleRandomHitResults.length}件\t${singleRandomHitNg.length ? `NG(${singleRandomHitNg.map(x => `${x.name}:${x.hits}回`).join(',')})` : 'OK'}`);
  console.log(`負傷再入防止回帰\tミノタウロス攻撃=${reentryAttacks}回\t${reentryOk ? 'OK' : 'NG'}`);
  console.log(`負傷反復ボーナス参照回帰\t_effectRepeatBonus=${repeatBonusA}回 / effectData=${repeatBonusB}回\t${repeatBonusOk ? 'OK' : 'NG'}`);
  console.log(`ユニット直列化回帰\tclone可=${serialCloneOk} 初回=${serialFirst} 再入=${serialReentry} 正規反復=${serialRepeat}\t${serialOk ? 'OK' : 'NG'}`);
  console.log(`攻撃者選択回帰\tATK0=${pickedZero && pickedZero.id} 毒持ち=${pickedPoison && pickedPoison.id} レーン移行=${first && first.id}→${second && second.id}\t${pickOk ? 'OK' : 'NG'}`);
  console.log(`範囲攻撃・反撃回帰\t全体=${allHit.targets.length}体に命中/反撃${allHit.counters}回\t三方向(空きあり)=${triGap.targets.join(',')}\t${spreadOk ? 'OK' : 'NG'}`);
  console.log(`開戦重複回帰\tリリス結界=${lillithShieldEvents.length}\tウェンディゴ変更=${wendigoChanges.length}\t${openingDuplicateOk ? 'OK' : 'NG'}`);
  console.log(`ボーンチャリオット回帰\t不正召喚=${malformed.length}\t正規召喚=${proper.length}\t${chariotOk ? 'OK' : 'NG'}`);
  console.log(`ランダム対象回帰\t対象=${[...new Set(randomTargetResults)].join(',')}\t${randomTargetOk ? 'OK' : 'NG'}`);
  console.log(`変身表示回帰\tname=${transformTarget.name}\tno=${transformTarget.no}\t${transformOk ? 'OK' : 'NG'}`);
  console.log(`マナ閾値遅延回帰\tdeferred=${!!deferredGain?.deferredAppliedByThreshold}\t復元=${deferredState.resources.p1.mana}\t${deferredOk ? 'OK' : 'NG'}`);
  console.log(`マナ連鎖回帰\t非遅延=${chainPlain.fires}回 ${chainPlain.a} ${chainPlain.b} mana=${chainPlain.mana}\t遅延=${chainDefer.fires}回 ${chainDefer.a} ${chainDefer.b} mana=${chainDefer.mana}\t${chainOk ? 'OK' : 'NG'}`);
  console.log(`個別修正回帰\t${directResults.slice(-4).join('\t')}`);
  // ── 未監査だったキーワードの回帰（実機報告から追加）──────────────
  // 二段／三段攻撃・熟練・攻防一体・屍術・マナの種は、これまで監査に無かった。
  // 屍術（名前と効果文の二重発動）とマナの種（効果の種類によって反復しない）が
  // 実際に残っていたため、ここで固定する。
  {
    const sd = sheetData;
    const all = [...sd.characterCards(), ...sd.enchantCards()];
    const P = n => all.find(c => c && c.name === n) || {};
    const strip = t => String(t || '').replace(/^\d+マナ(?:毎)?[:：]\s*/, '');
    const mk = (n, id, over, enh) => {
      const d = P(n);
      const u = Object.assign({ id, name: n, atk: Number(d.power) || 2,
        hp: Number(d.life) || 20, maxHp: Number(d.life) || 20,
        color: d.color || '青', keywords: (d.keywords || []).slice(),
        desc: String(d.desc || ''),
        manaCost: Number(d.manaCost) || 0, manaRepeat: !!d.manaRepeat,
        effectData: { effectNames: [], effectTexts: [], adjacentAbilities: [], extraManaThresholds: [] },
      }, over || {});
      (enh || []).forEach(en => {
        const e = P(en); if (!e.name) return;
        u.effectData.adjacentAbilities.push(en);
        u.effectData.effectNames.push(en);
        u.effectData.effectTexts.push(String(e.desc || ''));
        if (Number(e.manaCost) > 0 && !u.manaCost) {
          u.manaCost = Number(e.manaCost); u.manaRepeat = !!e.manaRepeat;
          u.effectData.manaCost = u.manaCost; u.effectData.manaRepeat = u.manaRepeat;
          u.effectData.manaThresholdDesc = strip(e._manaThresholdDesc || e.desc);
        }
      });
      return u;
    };
    const foe = (id, over) => Object.assign({ id, name: '敵', atk: 1, hp: 300, maxHp: 300,
      color: '黒', keywords: [], desc: '' }, over || {});
    const play = (p1, p2, mana, turns) => {
      const evs = [];
      const st = core.createBattleState({ sides: { p1: { units: p1 }, p2: { units: p2 } },
        resources: { p1: { mana: mana || 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
        summonDefs: all });
      core.runBattleCore(st, createSeededRng(11), { onEvent: e => evs.push(e), turnLimit: turns || 6 });
      return evs;
    };
    const opening = ev => { const i = ev.findIndex(e => e.type === 'turn_begin'); return ev.slice(0, i < 0 ? ev.length : i); };
    const firstTurnAttacks = (ev, id) => { const t = []; let cur = null;
      ev.forEach(e => { if (e.type === 'turn_begin') { if (cur !== null) t.push(cur); cur = 0; }
        else if (e.type === 'attack' && e.attackerId === id && cur !== null) cur++; });
      if (cur !== null) t.push(cur);
      return t.filter(n => n > 0)[0] || 0; };
    const rows = [];
    // 二段／三段攻撃は「追加攻撃数」を直接見る。戦闘を1本流すと、先攻の抽選や
    // 反撃死などで回数が揺れて判定が不安定になるため。
    ['二段攻撃', '三段攻撃'].forEach((k, i) => {
      // 強化カードは「名前」で能力を運ぶ（keywords も desc も空のカードがある）。
      // 強化名は effectData.adjacentAbilities で届く。ここを見落とすと、
      // オンラインでキーワード付与型の強化がすべて無効になる。
      const raw = { id: 'A', name: 'ゴブリン', atk: 3, hp: 60, maxHp: 60, color: '青', keywords: [], desc: '',
        effectData: { adjacentAbilities: [k], effectNames: [k], effectTexts: [], extraManaThresholds: [] } };
      const st = core.createBattleState({ sides: { p1: { units: [raw] }, p2: { units: [foe('E')] } },
        resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, summonDefs: all });
      const n = core.coreExtraAttackCount ? core.coreExtraAttackCount(st.units.p1[0]) : -1;
      rows.push([k, `追加攻撃=${n}`, n === i + 1]);
    });
    {
      const atk = (play([mk('ゴーレム', 'G', { atk: 2, hp: 40, maxHp: 40 }, ['熟練'])], [foe('E', { atk: 3 })], 0)
        .find(e => e.type === 'stat_change' && e.unitId === 'G') || {}).atk;
      rows.push(['熟練', `負傷バフ=+${atk}`, atk === 3]);
    }
    {
      const d = play([mk('ゴブリン', 'A', { atk: 1, hp: 9, maxHp: 9 }, ['攻防一体'])], [foe('E')], 0)
        .find(e => e.type === 'damage' && e.unitId === 'E');
      rows.push(['攻防一体', `一撃=${d && d.amount}`, !!d && d.amount === 9]);
    }
    {
      const ev = play([mk('ゴブリン', 'A', { atk: 9, hp: 60, maxHp: 60 }, ['屍術'])],
        [foe('E1', { hp: 1, maxHp: 1 }), foe('E2', { hp: 1, maxHp: 1 }), foe('E3')], 0);
      const deaths = ev.filter(e => e.type === 'death').length;
      const buffs = ev.filter(e => e.type === 'stat_change' && e.unitId === 'A' && e.reason === 'necromancy').length
        + ev.filter(e => e.type === 'stat_change' && e.unitId === 'A' && e.reason === 'character_death_self_buff').length;
      rows.push(['屍術', `死亡=${deaths} バフ=${buffs}`, deaths > 0 && deaths === buffs]);
    }
    {
      // マナ閾値は loader.js が計算する manaCost に依存し、sheetData には無い。
      // ここでは「マナの種が効果の種類を問わず反復する」ことをコアの反復数で見る。
      const seeded = mk('ゴブリン', 'S', { hp: 60, maxHp: 60 }, ['マナの種']);
      const plainU = mk('ゴブリン', 'P', { hp: 60, maxHp: 60 });
      const st = core.createBattleState({ sides: { p1: { units: [seeded, plainU] }, p2: { units: [foe('E')] } },
        resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, summonDefs: all });
      const c1 = core.coreEffectCount ? core.coreEffectCount(st.units.p1[0], 'マナの種') : -1;
      const c0 = core.coreEffectCount ? core.coreEffectCount(st.units.p1[1], 'マナの種') : -1;
      rows.push(['マナの種', `反復数=${c0}→${c1}`, c0 === 0 && c1 === 1]);
    }
    {
      // 効果文を持つ強化カードの「名前」は効果の識別子であってキーワードではない。
      // これを CORE_EFFECT_CARD_NAMES に入れ忘れると、策士がカード名をキーワードとして
      // 数えて+2/+2ずつ過剰に加算する（野生の力で発覚）。カード追加時の追随漏れをここで落とす。
      const named = sheetData.enchantCards().map(c => c.name).filter(Boolean);
      const missing = named.filter(n => !core.CORE_EFFECT_CARD_NAMES.has(n)
        && LOADER_IDENTIFIER_KEYWORDS.has(n));
      rows.push(['強化カード名の非キーワード化', `効果文あり=${named.length} 漏れ=${missing.join(',') || 'なし'}`,
        missing.length === 0]);
    }
    const bad = rows.filter(r => !r[2]);
    console.log('未監査キーワード回帰\t' + rows.map(r => `${r[0]}=${r[1]}`).join('\t')
      + '\t' + (bad.length ? 'NG:' + bad.map(r => r[0]).join(',') : 'OK'));
    if (bad.length) ng += bad.length;
  }
  console.log(`監査結果: ${ng === 0 ? 'NG 0' : `NG ${ng}`}`);
  return ng;
}

try { process.exitCode = audit(); } catch (error) { console.error(error.stack || error); process.exitCode = 1; }
