'use strict';

// 本文の照合箇所の有無では判定しない。シート→本番loader→共通コアで、
// 一つの誘発を実際に解決し、独立に本文から求めた対象・量・回数と照合する。
// Xの定義・反復・引用された付与効果は、それを使う文から切り離さない。
// 実行: node tools/balance_sim/card_text_audit_1026.js [--out /tmp/card-text-1026]
// 出力先は指定時だけ作る（JSON / Markdown）。生成物はリポジトリへ残さない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sheet = require('./sheet_data');
require('./load');
const copy = value => JSON.parse(JSON.stringify(value));
const colors = ['赤', '青', '緑', '黄', '紫'];
const plain = (id, extra = {}) => ({ id, name: id, atk: 17, hp: 80, maxHp: 80,
  color: '赤', lane: 'front', race: '魔獣', keywords: [], desc: '', effectData: {}, ...extra });
let initialized = false;
async function initialize() {
  if (initialized) return;
  const table = console.table;
  try { console.table = () => {}; await loadGameData(); } finally { console.table = table; }
  initialized = true;
}
function sentences(text) {
  const out = []; let depth = 0, start = 0;
  const source = String(text || '').trim();
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '「') depth++;
    if (source[i] === '」') depth--;
    if (!depth && i > start && /[。\n]\s*$/.test(source.slice(0, i)) && /^(?:開戦|攻撃(?:[＆&]負傷)?|負傷(?:[＆&]死亡)?|死亡|解放|終戦|常時|起動|\d+マナ(?:毎)?)\s*[：:]/.test(source.slice(i))) {
      out.push(source.slice(start, i).trim()); start = i;
    }
  }
  if (source.slice(start).trim()) out.push(source.slice(start).trim());
  return out;
}
function catalog() {
  return ['card', 'enchant'].flatMap(kind => sheet.sheetRows(kind).map(row => {
    const definition = PANEL_POOL.find(c => c.no === row['No.']);
    const forms = [false, true].map(enhanced => {
      const base = copy(definition || { no: row['No.'], name: row['名前'], category: kind === 'card' ? 'キャラクター' : 'エンチャント' });
      const card = enhanced ? enhancedPanelCopy(base) || base : base;
      const expectedText = String(enhanced && entryClearsText(row) ? ''
        : enhanced && String(row['強化効果'] || '').trim() || row['効果'] || '').trim();
      return { enhanced, card, text: String(card.desc || ''), expectedText, sentences: sentences(card.desc) };
    });
    return { kind, no: row['No.'], name: row['名前'], loaded: !!definition,
      implemented: String(row['実装']).trim().toLowerCase() === 'true', row, forms };
  }));
}
// シートの強化欄が空で効果自体が消える正規仕様はE010のみ（loaderと別に期待値を定義）。
function entryClearsText(row) { return row['No.'] === 'E010'; }
function subject(entry, form, text = form.text) {
  const c = { ...copy(form.card), desc: text };
  if (entry.kind === 'card') {
    // 一文の検査では独立したキーワード修正を外す。全カードの実際の組合せは
    // integrationInputs() / card_core_smoke と、下のキーワード検査で別途通す。
    const spec = _panelSummonSpec(c);
    return plain('subject', { ..._makePanelSummonUnit(spec, []), id: 'subject', atk: 17, hp: 80, maxHp: 80,
      baseAtk: 17, baseMaxHp: 80, _baseAtk: 17, _baseMaxHp: 80, keywords: [], _mainBoardSlot: 7, boardCards: [c] });
  }
  const mana = text.match(/^(\d+)マナ(毎)?[：:]\s*(.*)$/);
  return plain('subject', { _mainBoardSlot: 7, boardCards: [c],
    ...(mana ? { manaCost: Number(mana[1]), manaRepeat: !!mana[2], manaThresholdDesc: mana[3] } : {}),
    _adjacentPanelAbilities: [c.name], _resonanceEffectNames: [c.name], _adjacentPanelEffectTexts: [text] });
}
function context(entry, form, text, configure = () => {}) {
  const input = { sides: { p1: { units: [subject(entry, form, text), ...colors.map((color, i) =>
    plain('ally' + i, { color, lane: 'rear', _mainBoardSlot: i }))] },
    p2: { units: [plain('foe0'), plain('foe1'), plain('foe2')] } },
    resources: { p1: { mana: 0, gold: 800 }, p2: { mana: 0, gold: 800 } },
    blood: { p1: 9, p2: 9 }, life: { p1: 1, p2: 1 }, maxLife: { p1: 3, p2: 3 },
    stageNumber: 2, itemFreeSlots: { p1: 3, p2: 3 }, itemDefs: ITEM_POOL,
    summonDefs: [...PANEL_POOL, ...ENEMY_POOL] };
  // 色条件は架空の5色の体を直接置くだけでは監査しない。実際の魔導板→共通出撃を通す。
  if (entry.no === 'C100') input.sides.p1.units = formedElemental(form, text);
  configure(input);
  const state = createBattleState(input), events = [], rng = createSeededRng(1026);
  state.life = copy(input.life); state.maxLife = copy(input.maxLife);
  const emit = event => events.push(copy(event));
  const hit = (s, t, n, counter = false, skipSourceEffects = false, skipTough = false, options = {}) =>
    coreResolveHit(state, s, t, n, counter, rng, emit, { skipSourceEffects, skipTough, ...options });
  return { input, state, events, rng, emit, hit, u: state.units.p1[0], own: state.units.p1, foes: state.units.p2 };
}
function formedElemental(form, text = form.text) {
  initState(); G.phase = 'reward'; G._wave = 2; G.mainBoard.fill(null);
  const slots = [1, 3, 10, 12, 14], nos = ['C100', 'C006', 'C026', 'C051', 'C101'];
  slots.forEach((slot, i) => {
    const c = i ? copy(PANEL_POOL.find(c => c.no === nos[i])) : { ...copy(form.card), desc: text };
    // 他の開戦・死亡は隔離する。色・スロット・出撃変換は本物のカードを使う。
    if (i) { c.desc = ''; c.keywords = []; }
    c.power = 17; c.life = 80; G.mainBoard[slot] = c;
  });
  const formation = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false });
  assert.equal(formation.ordered.length, 5, '魔導板の5体が出撃する');
  return formation.ordered.map((e, i) => ({ ...e.unit, id: i ? 'ally' + i : 'subject',
    effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 } }));
}
function fire(h, trigger) {
  const { state, u, rng, emit, hit } = h;
  h.beforeTrigger = SaveRun.copy(state); h.trigger = trigger;
  if (/^\d+マナ/.test(trigger)) {
    state.resources.p1.mana = Number(trigger.match(/\d+/)[0]);
    coreApplyManaThresholdEffects(state, rng, emit, hit);
  } else if (trigger === '開戦') coreApplyOpeningEffects(u, state, rng, emit, hit);
  else if (trigger === '攻撃') {
    u._currentAttackTarget = h.foes[0];
    coreTriggerManaOnAttack(u, state, emit, rng, hit);
    coreApplyAttackEffects(u, state, rng, emit, hit);
    delete u._currentAttackTarget;
  } else if (trigger === '負傷') coreWithDamageKind(state, 'other', () => hit(h.foes[0], u, 7, false, true));
  else if (trigger === '死亡') hit(h.foes[0], u, 10000, false, true);
  else if (trigger === '解放') coreApplyReleaseEffects(u, [], state, rng, emit, hit);
  else if (trigger === '終戦') coreTriggerBattleEnd(state, emit, rng, hit);
  else throw Error('未登録のトリガ: ' + trigger);
}
const bySource = (h, type) => h.events.filter(e => e.type === type && (e.sourceId === h.u.id || e.unitId === h.u.id));
const stats = h => bySource(h, 'stat_change');
const hits = h => h.events.filter(e => e.type === 'damage' && e.sourceId === h.u.id && e.amount > 0);
const summons = h => bySource(h, 'summon');
const repeats = text => sheet.effectRepetitions(text);
const number = (text, pattern, fallback = 1) => Number((text.match(pattern) || [])[1] ?? fallback);
const pair = text => text.match(/([+-]\d+)\/([+-]\d+)/)?.slice(1).map(Number);
function equalStats(h, expected) {
  // 対象ごとの総量と回数を確認。余計な旧効果が出た場合も落とす。
  const actual = stats(h).map(e => [e.unitId, Number(e.atk) || 0, Number(e.hp) || 0]).sort();
  assert.deepEqual(actual, expected.sort(), '能力値イベントの対象・量・回数');
}
function equalHits(h, amount, count, targetIds) {
  assert.deepEqual(hits(h).map(e => e.amount), Array(count).fill(amount), 'ダメージの量・回数');
  if (targetIds) assert.deepEqual(hits(h).map(e => e.unitId).sort(), targetIds.sort(), 'ダメージ対象');
}
function evidence(h, label) {
  const useful = h.events.filter(e => !['effect_flash', 'damage_batch_begin', 'damage_batch_end'].includes(e.type));
  return { scenario: label, events: useful.map(e => ({ type: e.type, unitId: e.unitId || e.unit?.id,
    effect: e.effect || e.kind, amount: e.amount, atk: e.atk, hp: e.hp, reason: e.reason })),
    resources: copy(h.state.resources), blood: copy(h.state.blood),
    own: h.own.map(u => ({ id: u.id, atk: u.atk, hp: u.hp, maxHp: u.maxHp, shield: u.shield })),
    foes: h.foes.map(u => ({ id: u.id, atk: u.atk, hp: u.hp, poison: u.poison, weaken: u.weaken })) };
}
function verifyBattle(h) {
  if (!h.beforeTrigger) return null; // 観測系・編成系は各ケースの実際の命中・召喚・編成で検査する。
  const state = copy(h.beforeTrigger), u = state.units.p1.find(u => u.id === 'subject'), events = [];
  const deadUnits = state.deadUnits;
  coreInitializeBattleState(state);
  state.deadUnits = deadUnits; // 既に死亡が起きた戦闘途中の状況（レムレース）も保つ。
  if (h.trigger === '死亡') u.hp = 1;
  if (h.trigger === '負傷') state.units.p2[0].desc = '攻撃：全ての敵に7ダメージを与える。';
  if (h.trigger === '解放') { u.keywords = ['封印1']; state.blood.p1 = 99; }
  if (/^\d+マナ/.test(h.trigger)) state.resources.p1.mana = Number(h.trigger.match(/\d+/)[0]);
  const result = runBattleCore(state, createSeededRng(1026), { turnLimit: 4, onEvent: e => events.push(copy(e)) });
  const relevant = e => (e.sourceId === 'subject' || e.unitId === 'subject')
    && ['damage', 'stat_change', 'mana_gain', 'gold_gain', 'keyword_effect', 'summon', 'transform', 'unit_stolen', 'run_effect', 'mana_set', 'seal_apply', 'item_reward', 'gold_spend'].includes(e.type);
  const witnesses = h.events.filter(relevant).filter(e => e.type !== 'damage' || e.sourceId === 'subject');
  // 通常の戦闘は先攻判定でも乱数を使うので、ランダムな対象のIDは変わり得る。
  // 対象範囲・数は一誘発の検査、ここでは同じ発生元・量・種類の発動を確認する。
  const same = (a, b) => a.type === b.type && a.sourceId === b.sourceId && a.side === b.side
    && ['effect', 'kind', 'amount', 'atk', 'hp', 'keyword'].every(k => a[k] === b[k])
    && (a.type !== 'summon' || a.unit.name === b.unit?.name);
  if (witnesses.length) assert.ok(witnesses.some(w => events.some(e => relevant(e) && same(w, e))), 'runBattleCoreの戦闘進行からも本文の効果・数値が出る');
  return { turns: result.turns, outcome: result.outcome, events: events.length,
    matchedWitnesses: witnesses.filter(w => events.some(e => relevant(e) && same(w, e))).length };
}
const unable = reason => ({ status: '判定できない', reason });

// 各検査は本番パーサーを期待値に使わない。未登録の本文は成功扱いにしない。
function exercise(entry, form, sentence, trigger) {
  const text = sentence, body = text.replace(/^[^：:]+[：:]\s*/, ''), r = repeats(text);
  const h = context(entry, form, text), { u, own, foes, state } = h;
  let m, label = trigger + 'を共通コアで一度解決';
  const run = () => fire(h, trigger);
  const expectedStats = (targets, a, p, times = r) => targets.flatMap(t => Array.from({ length: times }, () => [t.id, a, p]));

  if (trigger === '起動') return unable('編成・報酬画面で使う起動効果。戦闘コアの戦闘進行からは発動しない（activation_1025_regressionで別検査）。');
  if (/還魂すると/.test(body)) return unable('還魂は魔導板の操作。戦闘中には発動せず、coreAscensionSpecと還魂処理の別検査が必要。');
  if (/報酬に青キャラクターが出るたび/.test(body)) return unable('報酬の生成時に発動するラン効果。戦闘中に報酬は生成しない（sheet_1022a_regressionで別検査）。');
  if (!trigger && text === '封印X') {
    const formed = formedEnchant(form); assert.equal(coreSealValue(formed.u), 10);
    return { status: '動く', reason: '取得ステージ2の刻印を接続し、出撃時の封印10を検査' };
  }
  if (!trigger) return unable(/荷物/.test(String(form.card.keywords)) || /^E10[12]$/.test(entry.no)
    ? 'クエストの荷物の説明。戦闘効果を定義していない。'
    : /動かせない/.test(text) ? '魔導板の移動制限。戦闘中にはカードを動かさない。' : 'トリガのない本文の検証シナリオ未登録。');

  if (trigger !== '常時') {
    if (trigger === '解放' && /接続しているエンチャントの数/.test(body))
      u.boardCards.push(...[0, 1].map(i => ({ name: '接続検査' + i, category: 'エンチャント' })));
    if ((m = body.match(/^(\d+)(マナ|ゴールド)を得る/))) {
      const kind = m[2] === 'マナ' ? 'mana' : 'gold', before = /^\d+マナ/.test(trigger) && kind === 'mana' ? Number(trigger.match(/\d+/)[0]) : state.resources.p1[kind]; run();
      assert.equal(state.resources.p1[kind] - before, Number(m[1]) * r);
      assert.equal(bySource(h, kind + '_gain').reduce((s, e) => s + e.amount, 0), Number(m[1]) * r);
    } else if ((m = body.match(/^全ての敵に毒(\d+)(?:と弱体(\d+))?を与える/))) {
      run(); foes.forEach(t => { assert.equal(t.poison, Number(m[1]) * r); assert.equal(t.weaken, Number(m[2] || 0) * r); });
      assert.equal(hits(h).length, 0, '状態異常に旧ダメージ効果を混ぜない');
    } else if ((m = body.match(/^全ての(敵|キャラクター)に弱体(\d+)を与える/))) {
      run(); const targets = m[1] === '敵' ? foes : [...own.slice(trigger === '死亡' ? 1 : 0), ...foes];
      targets.forEach(t => assert.equal(t.weaken, Number(m[2]) * r));
    } else if ((m = body.match(/^味方の色が(\d+)色以上の場合、全ての敵に弱体(\d+)を与える/))) {
      run(); foes.forEach(t => assert.equal(t.weaken, Number(m[2]) * r));
    } else if ((m = body.match(/^味方の色が(\d+)種類なら、全ての味方は(毒牙\d+)を得る/))) {
      own.forEach((t, i) => { t.color = colors[i % Number(m[1])]; }); run();
      own.forEach(t => assert.ok(t.keywords.includes(m[2])));
    } else if ((m = body.match(/^ランダムな味方は\+(\d+)\/\+(\d+)を得る。味方の色の数(?:だけ|の(\d+)倍)繰り返す/))) {
      run(); assert.equal(stats(h).length, new Set(own.map(t => t.color)).size * Number(m[3] || 1) * r);
      stats(h).forEach(e => assert.deepEqual([e.atk, e.hp], m.slice(1, 3).map(Number)));
    } else if ((m = body.match(/^(?:Xマナ|マナをX)を?得る。Xは味方の(?:緑の味方の数|色の数)(?:の(\d+)倍)?に等しい/))) {
      const count = /緑/.test(body) ? own.filter(t => t.color === '緑').length : new Set(own.map(t => t.color)).size; run();
      assert.equal(state.resources.p1.mana, count * Number(m[1] || 1) * r);
    } else if ((m = body.match(/^全ての味方は\+X\/\+Xを得る。Xは失っているライフの(\d+)倍/))) {
      run(); equalStats(h, expectedStats(own, 2 * Number(m[1]), 2 * Number(m[1])));
    } else if ((m = body.match(/^全ての敵にXダメージを与える。Xはそれぞれの敵のHPの(\d+)%/))) {
      run(); equalHits(h, Math.ceil(80 * Number(m[1]) / 100), foes.length * r, foes.map(t => t.id));
    } else if ((m = body.match(/^全ての敵は-(\d+)\/-(\d+)を得る。この効果は、このキャラクターのHP(\d+)につき(\d+)回/))) {
      run(); foes.forEach(t => { assert.equal(t.atk, Math.max(0, 17 - Math.floor(80 / Number(m[3])) * Number(m[4]) * Number(m[1]))); assert.equal(t.maxHp, Math.max(1, 80 - Math.floor(80 / Number(m[3])) * Number(m[4]) * Number(m[2]))); });
    } else if ((m = body.match(/^ランダムな味方に\+(\d+)\/\+(\d+)を付与する。この効果は、このキャラクターのATK(\d+)につき(\d+)回/))) {
      run(); assert.equal(stats(h).length, Math.floor(17 / Number(m[3])) * Number(m[4]) * r);
      stats(h).forEach(e => assert.deepEqual([e.atk, e.hp], m.slice(1, 3).map(Number)));
    } else if ((m = body.match(/^全ての([赤青緑黄紫])の味方は(熟練\d+)を得る/))) {
      run(); own.forEach(t => assert.equal(t.keywords.includes(m[2]), t.color === m[1]));
    } else if ((m = body.match(/^このキャラクターの(ATK|HP)を(\d+)倍にする/))) {
      run(); assert.equal(m[1] === 'ATK' ? u.atk : u.maxHp, (m[1] === 'ATK' ? 17 : 80) * Number(m[2]));
    } else if (/^このキャラクターの死亡効果を/.test(body)) {
      u.desc = '死亡：7ゴールドを得る。'; const n = number(body, /死亡効果を(\d+)回/); run();
      assert.equal(state.resources.p1.gold, 800 + 7 * n * r);
    } else if ((m = body.match(/^このキャラクターのコピーを(?:(\d+)体)?召喚する/))) {
      run(); assert.equal(summons(h).length, Number(m[1] || 1) * r);
      summons(h).forEach(e => assert.deepEqual([e.unit.atk, e.unit.hp], [17, 80]));
    } else if ((m = body.match(/^「([^」]+)」を(?:(\d+)体)?召喚(?:する|し、)/))) {
      run(); assert.equal(summons(h).length, Number(m[2] || 1) * r);
      summons(h).forEach(e => assert.equal(e.unit.name, m[1].replace(/^[赤青緑黄紫]/, '')));
      if (/攻撃させる/.test(body)) assert.equal(h.events.filter(e => e.type === 'attack' && e.immediate).length, Number(m[2] || 1) * r);
    } else if ((m = body.match(/^このキャラクター以外の全てのキャラクターに(\d+)ダメージを(?:(\d+)回)?与える/))) {
      // 2026-10-26：本人除外は新本文どおり。サイレンの動作は利用者指定で変更しない。
      // 強化の回数に残る不一致を成功扱いせず、未登録とは区別して観測値を残す。
      const before = [u.atk, u.hp, u.maxHp]; run();
      const targets = [...own.slice(1), ...foes], damage = hits(h), count = Number(m[2] || 1) * r;
      assert.deepEqual([u.atk, u.hp, u.maxHp], before, '本人へ当てない');
      assert.ok(damage.every(e => e.unitId !== u.id && e.amount === Number(m[1])));
      assert.deepEqual([...new Set(damage.map(e => e.unitId))].sort(), targets.map(t => t.id).sort());
      if (damage.length !== targets.length * count) return {
        ...unable('本人除外は本文どおり。各対象への回数は本文' + count + '回に対し実装'
          + damage.length / targets.length + '回。既存の不一致は利用者の「確認のみ・変えない」指定に従い未修正（kenzoku_1026_regressionでも本人除外を検査）。'),
        evidence: evidence(h, '本人除外・ダメージ量・実際の回数を実行確認'),
      };
      equalHits(h, Number(m[1]), targets.length * count, targets.flatMap(t => Array(count).fill(t.id)));
    } else if ((m = body.match(/^全ての(敵|キャラクター)に(\d+)ダメージを(?:(\d+)回)?与える/))) {
      if (entry.no === 'C016') {
        run(); const targets = [...own.slice(1), ...foes], count = Number(m[3] || 1) * r;
        equalHits(h, Number(m[2]), targets.length * count, targets.flatMap(t => Array(count).fill(t.id)));
        return { ...unable('「全てのキャラクター」に本人を含めるかが本文と既存規則で相違。本人以外への本文量・回数は実行確認済み。既存コアは明示的に本人を除外しており、本文未改訂カードの挙動保持の指示に従い変更しない。'), evidence: evidence(h, '本人除外の既存挙動を実行確認') };
      }
      run(); const targets = m[1] === '敵' ? foes : [...own, ...foes];
      const initial = Number(m[2]), count = Number(m[3] || 1) * r;
      if (/永久に.*減少/.test(body)) {
        equalHits(h, initial, targets.length * count);
        h.events.length = 0; run(); equalHits(h, initial - number(body, /永久に(\d+)減少/), targets.length * count);
      } else equalHits(h, initial, targets.length * count, targets.flatMap(t => Array(count).fill(t.id)));
    } else if ((m = body.match(/^ランダムな敵(?:(\d+)体)?に(\d+)ダメージを(?:(\d+)回)?与える/))) {
      run(); const times = /エンチャントの数/.test(body) ? 2 * number(body, /数の(\d+)倍/) : Number(m[3] || 1);
      equalHits(h, Number(m[2]), Number(m[1] || 1) * times * r);
    } else if ((m = body.match(/^ランダムな敵(?:(\d+)体)?に毒(\d+)を与える/))) {
      run(); assert.equal(foes.reduce((s, t) => s + t.poison, 0), Math.min(foes.length, Number(m[1] || 1)) * Number(m[2]) * r);
    } else if (/^ランダムな敵にXダメージを与える/.test(body)) {
      if (/マナに等しい/.test(body)) state.resources.p1.mana = 9;
      run(); equalHits(h, /ATK/.test(body) ? 17 : /ダメージに等しい/.test(body) ? 7 : 9, r);
    } else if (/^ランダムな毒を持つ敵/.test(body)) {
      foes.forEach(t => { t.poison = 3; }); run(); equalHits(h, 3, r);
    } else if ((m = body.match(/^全ての敵の毒を(\d+)倍にする/))) {
      foes.forEach(t => { t.poison = 3; }); run(); foes.forEach(t => assert.equal(t.poison, 3 * Number(m[1])));
    } else if ((m = body.match(/^全ての敵の毒を(?:(\d+)回)?発動させる/))) {
      foes.forEach(t => { t.poison = 3; }); run(); foes.forEach(t => assert.equal(t.hp, 80 - 3 * Number(m[1] || 1)));
    } else if ((m = body.match(/^このキャラクターは(\d+)ダメージを(\d+)回受ける/))) {
      run(); equalHits(h, Number(m[1]), Number(m[2]) * r, Array(Number(m[2]) * r).fill(u.id));
    } else if ((m = body.match(/^全てのキャラクターからATKを(\d+)奪う/))) {
      run(); [...own.slice(1), ...foes].forEach(t => assert.equal(t.atk, 17 - Number(m[1]) * r));
      assert.equal(u.atk, 17 + Number(m[1]) * (own.length - 1 + foes.length) * r);
    } else if ((m = body.match(/^ランダムな敵はATK-(\d+)を得る/))) {
      run(); equalStats(h, stats(h).map(e => [e.unitId, -Number(m[1]), 0])); assert.equal(stats(h).length, r);
    } else if ((m = body.match(/^全ての敵はATK-(\d+)を得る/))) {
      run(); equalStats(h, expectedStats(foes, -Number(m[1]), 0));
    } else if ((m = body.match(/^全ての味方に\+(\d+)\/\+(\d+)を与えた後、(\d+)ダメージを(?:(\d+)回)?与える/))) {
      run(); equalStats(h, expectedStats(own, Number(m[1]), Number(m[2])));
      equalHits(h, Number(m[3]), own.length * Number(m[4] || 1) * r);
      assert.ok(h.events.findIndex(e => e.type === 'damage') > h.events.findLastIndex(e => e.type === 'stat_change'), '全体の強化の後にダメージ');
    } else if ((m = body.match(/^(?:血を(\d+)消費し、)?全ての味方は\+(\d+)\/\+(\d+)を得る/))) {
      run(); equalStats(h, expectedStats(own, Number(m[2]), Number(m[3])));
      if (m[1]) assert.equal(state.blood.p1, 9 - Number(m[1]) * r);
    } else if ((m = body.match(/^全ての(?:同じ色|([赤青緑黄紫]))の味方(?:は|に)\+(\d+)\/\+(\d+)を(?:得る|与える)/))) {
      const chosen = own.filter(t => t.color === (m[1] || u.color)); run(); equalStats(h, expectedStats(chosen, Number(m[2]), Number(m[3]), /エンチャントの数/.test(body) ? 2 * r : r));
    } else if ((m = body.match(/^全ての([赤青緑黄紫])の味方はATK\+(\d+)を得る/))) {
      run(); equalStats(h, expectedStats(own.filter(t => t.color === m[1]), Number(m[2]), 0));
    } else if ((m = body.match(/^全ての仲間のHPが\+(\d+)される/))) {
      run(); equalStats(h, expectedStats(own, 0, Number(m[1])));
    } else if ((m = body.match(/^全ての味方はATK\+(\d+)を得る/))) {
      run(); equalStats(h, expectedStats(own.filter(t => t.hp > 0), Number(m[1]), 0));
    } else if ((m = body.match(/^全ての味方はATK\+Xを得る。Xは([赤青緑黄紫])の味方の数(?:の(\d+)倍)?/))) {
      const n = own.filter(t => t.color === m[1]).length * Number(m[2] || 1); run(); equalStats(h, expectedStats(own, n, 0));
    } else if ((m = body.match(/^ランダムな([赤青緑黄紫])、([赤青緑黄紫])、([赤青緑黄紫])の味方1体ずつは\+(\d+)\/\+(\d+)を得る/))) {
      run(); assert.equal(stats(h).length, 3 * r); stats(h).forEach(e => { assert.ok(m.slice(1, 4).includes(own.find(t => t.id === e.unitId).color)); assert.deepEqual([e.atk, e.hp], m.slice(4).map(Number)); });
    } else if ((m = body.match(/^ランダムな異なる色の味方1体ずつは\+(\d+)\/\+(\d+)を得る/))) {
      run(); assert.equal(stats(h).length, 5 * r); stats(h).forEach(e => assert.deepEqual([e.atk, e.hp], m.slice(1).map(Number)));
    } else if ((m = body.match(/^ランダムな([赤青緑黄紫])の味方(?:(\d+)体)?は\+(\d+)\/\+(\d+)を得る/))) {
      run(); assert.equal(stats(h).length, Number(m[2] || 1) * r); stats(h).forEach(e => { assert.equal(own.find(t => t.id === e.unitId).color, m[1]); assert.deepEqual([e.atk, e.hp], m.slice(3).map(Number)); });
    } else if ((m = body.match(/^ランダムな味方は\+(\d+)\/\+(\d+)を得る/))) {
      run(); assert.equal(stats(h).length, r); stats(h).forEach(e => { assert.ok(own.some(t => t.id === e.unitId && t !== u)); assert.deepEqual([e.atk, e.hp], m.slice(1).map(Number)); });
    } else if ((m = body.match(/^このキャラクターは(?:HP)?\+(\d+)\/\+(\d+)を得る/))) {
      let times = r;
      if (/負傷しているキャラクター/.test(body)) { own[1].hp -= 1; foes[0].hp -= 1; times *= 2 * number(body, /キャラクターの(\d+)倍/); }
      run(); equalStats(h, expectedStats([u], Number(m[1]), Number(m[2]), times));
    } else if ((m = body.match(/^このキャラクターは(ATK|HP)\+(\d+)を得る/))) {
      run(); equalStats(h, expectedStats([u], m[1] === 'ATK' ? Number(m[2]) : 0, m[1] === 'HP' ? Number(m[2]) : 0));
    } else if ((m = body.match(/^(全ての味方|このキャラクター)は\+X\/\+Xを得る。Xは(血|マナ)(?:の(\d+)倍)?/))) {
      state.resources.p1.mana = 9; run(); const n = 9 * Number(m[3] || 1); equalStats(h, expectedStats(m[1] === '全ての味方' ? own : [u], n, n));
    } else if ((m = body.match(/^(?:「([^」]+)」|このキャラクター)以外のランダムな味方は(ATK|HP)\+Xを得る。Xは(このキャラクターのHP|血)/))) {
      run(); assert.equal(stats(h).length, r); stats(h).forEach(e => { assert.notEqual(e.unitId, u.id); assert.deepEqual([e.atk, e.hp], m[2] === 'ATK' ? [80, 0] : [0, m[3] === '血' ? state.blood.p1 : 80]); });
    } else if (/^このキャラクターのATKをランダムな味方に与える/.test(body)) {
      run(); assert.equal(stats(h).length, r); stats(h).forEach(e => assert.deepEqual([e.atk, e.hp], [17, 0]));
    } else if ((m = body.match(/^ランダムな味方(?:\d+体)?(?:は|に)(?:\+(\d+)\/\+(\d+)と)?結界/))) {
      run(); assert.equal(h.events.filter(e => e.effect === 'shield').length, number(body, /味方(\d+)体/) * r);
      if (m[1]) { assert.equal(stats(h).length, r); stats(h).forEach(e => assert.deepEqual([e.atk, e.hp], m.slice(1).map(Number))); }
    } else if (/ランダムな味方(?:\d+体)?(?:に|が)復活を(?:与える|得る)/.test(body)) {
      run(); const gains = h.events.filter(e => e.effect === 'keyword_gain' && e.keyword === '復活');
      assert.equal(gains.length, number(body, /味方(\d+)体/) * r); if (/以外/.test(body)) gains.forEach(e => assert.notEqual(e.unitId, u.id));
    } else if (/^全体攻撃を得る/.test(body)) { run(); assert.ok(u.keywords.includes('全体攻撃'));
    } else if (/^「[^」]+」に変身する/.test(body)) { run(); assert.equal(u.name, body.match(/「([^」]+)」/)[1].replace(/^[赤青緑黄紫]/, '')); assert.equal(bySource(h, 'transform').length, r);
    } else if (/^ランダムな敵を「/.test(body)) { run(); assert.equal(h.events.filter(e => e.type === 'transform').length, r);
    } else if ((m = body.match(/^ランダムな敵を、(\d+)%の確率で即死させる/))) {
      h.rng.next = () => 0; run(); assert.equal(h.events.filter(e => e.type === 'instant_death').length, r);
    } else if (/^ランダムな(?:前衛の)?敵を(?:\d+体)?奪う/.test(body)) {
      run(); assert.equal(h.events.filter(e => e.type === 'unit_stolen').length, number(body, /敵を(\d+)体/) * r);
      const attack = context(entry, form, text);
      attack.u._coreAttackContact = true; attack.hit(attack.u, attack.foes[0], 10000);
      assert.equal(attack.events.filter(e => e.type === 'unit_stolen').length, 0, '死亡本文のカードに旧攻撃時捕獲を残さない');
    } else if (/^ランダムな(?:前衛の)?敵を操り/.test(body)) {
      run(); assert.equal(h.events.filter(e => e.type === 'attack' && e.controlled && e.sourceId === u.id).length, r);
    } else if (/^このキャラクターは効果ダメージを受けた場合、ランダムな敵に攻撃する/.test(body)) {
      run(); assert.equal(h.events.filter(e => e.type === 'attack' && e.immediate).length, r);
    } else if (/^ランダムな味方の(?:負傷|マナ)効果を発動する/.test(body)) {
      own.slice(2).forEach(t => { t.hp = 0; }); own[1].desc = /負傷/.test(body) ? '負傷：このキャラクターは+2/+3を得る。' : '1マナ：このキャラクターは+2/+3を得る。';
      if (/マナ/.test(body)) { own[1].manaCost = 1; own[1].manaThresholdDesc = 'このキャラクターは+2/+3を得る。'; }
      run(); assert.equal(own[1].atk, 17 + 2 * r); assert.equal(own[1].maxHp, 80 + 3 * r);
    } else if (/^このゲーム中に倒したことがある/.test(body)) {
      state.defeatedEnemies = { p1: [plain('prior', { no: 'CF001', name: '検査敵' })], p2: [] }; run();
      assert.equal(summons(h).length, number(body, /敵(\d+)体/) * r); summons(h).forEach(e => assert.deepEqual([e.unit.atk, e.unit.hp], [17, 80]));
    } else if (/この戦闘で死亡したランダムなキャラクター/.test(body)) {
      state.deadUnits = [plain('prior', { _baseAtk: 11, _baseMaxHp: 21, hp: 0 })]; run();
      assert.equal(summons(h).length, number(body, /にして(\d+)体/) * r); summons(h).forEach(e => assert.deepEqual([e.unit.atk, e.unit.hp], [11, number(body, /HPを(\d+)にして/)]));
    } else if ((m = body.match(/^このキャラクターにエンチャントが接続していなければ、全ての味方は\+(\d+)\/\+(\d+)/))) {
      run(); equalStats(h, expectedStats(own, Number(m[1]), Number(m[2])));
    } else if (/^このキャラクター以外の、この効果を持つ全ての味方は\+/.test(body)) {
      own[1]._adjacentPanelEffectTexts = [text]; own[1]._adjacentPanelAbilities = [form.card.name]; run(); equalStats(h, expectedStats([own[1]], ...pair(body)));
    } else if (/^このキャラクター以外の、この効果を持つ全ての味方がランダムな敵に/.test(body)) {
      own[1]._adjacentPanelEffectTexts = [text]; own[1]._adjacentPanelAbilities = [form.card.name]; run(); const es = h.events.filter(e => e.type === 'damage' && e.sourceId === own[1].id); assert.deepEqual(es.map(e => e.amount), Array(r).fill(number(body, /敵に(\d+)ダメージ/)));
    } else if (/^ランダムな味方に「死亡：/.test(body)) {
      run(); const grants = h.events.filter(e => e.type === 'death_summon_grant'); assert.equal(grants.length, r);
      for (const id of new Set(grants.map(e => e.unitId))) h.hit(foes[0], own.find(t => t.id === id), 10000, false, true);
      assert.equal(h.events.filter(e => e.type === 'summon').length, r);
    } else if (/^ランダムな味方に「負傷：/.test(body)) {
      run(); const grants = h.events.filter(e => e.effect === 'trigger_grant'); assert.equal(grants.length, r);
      const target = own.find(t => t.id === grants[0].unitId); h.events.length = 0; h.hit(foes[0], target, 3, false, true);
      const es = h.events.filter(e => e.type === 'damage' && e.sourceId === target.id); assert.deepEqual(es.map(e => e.amount), Array(number(body, /ダメージを(\d+)回/)).fill(number(body, /敵に(\d+)ダメージ/)));
    } else if (/^血を\d+得る/.test(body)) { run(); assert.equal(state.blood.p1, 9 + (trigger === '死亡' ? 1 : 0) + number(body, /血を(\d+)得る/) * r);
    } else if (/報酬とトレーダーのキャラクター/.test(body)) {
      run(); const p = pair(body) || [0, number(body, /HP\+(\d+)/)];
      assert.deepEqual(state.runEffects.p1.rewardBuff, { atk: p[0] * r, hp: p[1] * r });
      if (/血を/.test(body)) assert.equal(state.blood.p1, 9 - number(body, /血を(\d+)消費/) * r);
    } else if (/^このゲーム中、味方の眷属は/.test(body)) {
      run(); const child = coreSummonUnit(state, 'p1', { name: '検査眷属', atk: 2, hp: 4, _fixedSummonStats: true }, h.emit, own[1].id, false, h.rng, h.hit);
      if (/衝撃/.test(body)) assert.ok(child.keywords.includes('衝撃' + number(body, /衝撃(\d+)/)));
      else { const p = pair(body) || [number(body, /ATK\+(\d+)/, 0), number(body, /HP\+(\d+)/, 0)]; assert.deepEqual([child.atk, child.maxHp], [2 + p[0] * r, 4 + p[1] * r]); }
    } else if (/^リロール\d+を得る/.test(body)) { run(); assert.equal(state.runEffects.p1.rerolls, number(body, /リロール(\d+)/) * r);
    } else if (/^全ての味方は永久に\+/.test(body) || /^このキャラクターは永久に\+/.test(body)) {
      run(); equalStats(h, expectedStats(/^全て/.test(body) ? own : [u], ...pair(body))); assert.ok(stats(h).every(e => e.persistent));
    } else if (/^\d+回目の終戦ごとに/.test(body)) {
      u._battleEndCount = number(body, /^(\d+)回/) - 1; u.boardCards = ['E001', 'E002', 'E003'].map((no, i) => ({ ...copy(PANEL_POOL.find(c => c.no === no)), _mainBoardSlot: i })); run();
      assert.equal(h.events.find(e => e.kind === 'enchant_upgrade').targetSlots.length, number(body, /エンチャント(\d+)枚/));
    } else if (/^このキャラクター以外の、生存した味方/.test(body)) {
      run(); const e = h.events.find(e => e.kind === 'board_transform'); assert.ok(e); assert.notEqual(e.fromUnitId, u.id); assert.equal(e.mode, /本来/.test(body) ? 'base' : 'copy');
    } else if (/^アイテム欄に空きがある場合/.test(body)) {
      run(); assert.equal(state.resources.p1.gold, 800 - number(body, /(\d+)G/) * r); assert.equal(bySource(h, 'item_reward').length, r); assert.ok(bySource(h, 'item_reward')[0].item);
    } else if (/^マナを\d+倍にする/.test(body)) { state.resources.p1.mana = 7; run(); assert.equal(state.resources.p1.mana, 7 * number(body, /マナを(\d+)倍/));
    } else if (/^このキャラクターのATKとHPを\d+倍/.test(body)) { run(); const n = number(body, /HPを(\d+)倍/); assert.deepEqual([u.atk, u.maxHp], [17 * n, 80 * n]);
    } else if (/^ランダムな敵(?:\d+体)?に封印∞/.test(body)) { run(); assert.equal(h.events.filter(e => e.type === 'seal_apply').length, number(body, /敵(\d+)体/) * r);
    } else if (/^全ての紫の味方は\+/.test(body)) {
      u.boardCards.push({ name: '接続検査', category: 'エンチャント' }); run(); equalStats(h, expectedStats(own.filter(t => t.color === '紫'), ...pair(body), 2 * r));
    } else if (['E077', 'E078', 'E079'].includes(entry.no)) {
      run(); if (entry.no === 'E077') equalHits(h, 10, own.length - 1);
      if (entry.no === 'E078') assert.equal(state.resources.p1.gold, 760);
      if (entry.no === 'E079') own.forEach(t => assert.equal(t.atk, 7));
    } else if (/この攻撃終了まで|反撃ダメージを受けない/.test(body)) return exercisePassive(entry, form, text, body, h);
    else return unable('この本文を検証する戦闘状況・期待値が未登録。');
  } else return exercisePassive(entry, form, text, body, h);
  return { status: '動く', reason: label, evidence: evidence(h, label), battle: verifyBattle(h) };
}

function formedEnchant(form, { allies = false, mixed = false } = {}) {
  initState(); G.phase = 'reward'; G._wave = 2; G.mapPanelPowers = { 1: 'summon', 3: 'summon' };
  const base = () => ({ ...copy(PANEL_POOL.find(c => c.no === 'C006')), power: 60, life: 80,
    desc: '', keywords: [], color: '赤', directions: ['left', 'right'] });
  G.mainBoard.fill(null);
  G.mainBoard[1] = base();
  const c = copy(form.card); c.directions = ['right']; c._engravingStage = 2;
  G.mainBoard[0] = c;
  if (allies) {
    G.mainBoard[0] = null; c.directions = ['left', 'right']; G.mainBoard[2] = c;
    G.mainBoard[3] = base(); if (mixed) G.mainBoard[3].color = '青';
  }
  const result = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false });
  const u = result.ordered.find(e => e.slotIdx === 1)?.unit;
  assert.ok(u, '魔導板から出撃する');
  return { u, units: result.ordered.map(e => e.unit) };
}
function exercisePassive(entry, form, text, body, h) {
  const { u, own, foes, state, rng, emit, hit } = h, r = repeats(text);
  let m;
  const good = scenario => ({ status: '動く', reason: scenario, evidence: evidence(h, scenario) });
  if ((m = body.match(/^このキャラクターは(?:HP)?([+-]\d+)(?:\/([+-]\d+))?を得る/))) {
    const formed = formedEnchant(form), p = m[2] ? [Number(m[1]), Number(m[2])] : [0, Number(m[1])];
    assert.deepEqual([formed.u.atk, formed.u.maxHp], [60 + p[0], 80 + p[1]], 'シート→loader→編成の常時修正');
    return good('実際の魔導板から出撃し、常時修正のATK/HPを検査');
  }
  if (/^このキャラクターは-X\/-X/.test(body)) {
    const formed = formedEnchant(form); assert.deepEqual([formed.u.atk, formed.u.maxHp], [50, 70]);
    return good('取得ステージ2の刻印を接続して出撃し、-10/-10を確認');
  }
  if (/Xはこの効果を持つ味方の数/.test(body)) {
    own[1]._adjacentPanelEffectTexts = [text]; coreApplyFormationPassives(own);
    const n = 2 * number(body, /数の(\d+)倍/); assert.deepEqual([u.atk, u.maxHp, own[1].atk], [17 + n, 80 + n, 17 + n]);
  } else if (/によって同じ色の味方とだけ接続/.test(body)) {
    const formed = formedEnchant(form, { allies: true }), n = number(body, /数の(\d+)倍/);
    assert.deepEqual([formed.u.atk, formed.u.maxHp], [60 + n, 80 + n], '同色1体と血盟で接続');
    const mixed = formedEnchant(form, { allies: true, mixed: true }); assert.deepEqual([mixed.u.atk, mixed.u.maxHp], [60, 80], '異色が混じる場合は不発');
  } else if ((m = body.match(/^このキャラクターが敵から受けたダメージ(の半分)?は、他の全ての味方に割り振られる/))) {
    hit(foes[0], u, 17); const shared = m[1] ? 8 : 17;
    assert.equal(80 - u.hp, 17 - shared); assert.equal(own.slice(1).reduce((s, t) => s + 80 - t.hp, 0), shared);
  } else if (/^このキャラクターが受けたダメージ/.test(body)) {
    for (const t of own.slice(0, 3)) { t._uniteGroups = ['test']; t._adjacentPanelEffectTexts = [text]; }
    hit(foes[0], u, 17); const shared = /半分/.test(body) ? 9 : 17;
    assert.equal(own.slice(0, 3).reduce((s, t) => s + 80 - t.hp, 0), 17);
    assert.ok(80 - own[1].hp >= Math.floor(shared / 3)); assert.ok(80 - own[2].hp >= Math.floor(shared / 3));
  } else if ((m = body.match(/このキャラクターが与える効果ダメージの威力は\+(\d+)/))) {
    u.desc = '攻撃：ランダムな敵に2ダメージを与える。'; fire(h, '攻撃'); equalHits(h, 2 + Number(m[1]), 1);
  } else if ((m = body.match(/このキャラクターが与える戦闘修正の値は(\d+)/))) {
    u.desc = '攻撃：このキャラクターは+2/+3を得る。'; fire(h, '攻撃'); equalStats(h, [[u.id, 2 + Number(m[1]), 3 + Number(m[1])]]);
  } else if (/持つ邪眼、毒牙、衝撃/.test(body)) {
    u.keywords = ['毒牙2', '邪眼3', '衝撃4']; u._coreAttackContact = true; hit(u, foes[0], 1);
    const add = number(body, /\+(\d+)/); assert.deepEqual([foes[0].poison, foes[0].atk, foes[0].weaken], [2 + add, 17 - 3 - add, 4 + add]);
  } else if (/ランダムな味方、または敵を選ぶ場合/.test(body)) {
    u.desc = '攻撃：ランダムな敵に2ダメージを与える。'; fire(h, '攻撃');
    const count = 1 + number(body, /対象は(\d+)体/); equalHits(h, 2, count); assert.equal(new Set(hits(h).map(e => e.unitId)).size, count);
  } else if (/このキャラクターからダメージを受けた敵は/.test(body)) {
    rng.next = () => 0; hit(u, foes[0], 1); assert.equal(h.events.filter(e => e.type === 'instant_death').length, 1);
    const miss = context(entry, form, text); miss.rng.next = () => 0.99; miss.hit(miss.u, miss.foes[0], 1);
    assert.equal(miss.events.filter(e => e.type === 'instant_death').length, 0);
  } else if (/このキャラクターが敵を倒した(?:場合|時)/.test(body)) {
    hit(u, foes[0], 10000);
    if (/永久に/.test(body)) { equalStats(h, [[u.id, ...pair(body)]]); assert.ok(stats(h)[0].persistent); }
    else assert.equal(state.blood.p1, 9 + number(body, /血を(\d+)得る/) * r);
  } else if (/^あなたが得る血は/.test(body)) {
    hit(foes[0], own[1], 10000, false, true); assert.equal(state.blood.p1, 10 + number(body, /\+(\d+)/));
  } else if (/^あなたが血を得る場合/.test(body)) {
    hit(foes[0], own[1], 10000, false, true); assert.equal(state.blood.p1, 9); assert.equal(state.resources.p1.mana, number(body, /代わりに(\d+)倍/));
  } else if ((m = body.match(/^緑の味方から得るマナは\+(\d+)/))) {
    own[3].desc = '攻撃：2マナを得る。'; own[3].manaOnAttack = 2; coreTriggerManaOnAttack(own[3], state, emit, rng, hit);
    assert.equal(state.resources.p1.mana, 2 + Number(m[1]));
  } else if (/^血が\d+の倍数/.test(body)) {
    state.blood.p1 = number(body, /^血が(\d+)/) - 1; hit(foes[0], own[1], 10000, false, true);
    equalHits(h, number(body, /敵に(\d+)ダメージ/), foes.length);
  } else if (/^敵が状態異常を得るたび/.test(body)) {
    own[1].keywords = ['毒牙1']; hit(own[1], foes[0], 1); equalStats(h, own.map(t => [t.id, 0, number(body, /HP\+(\d+)/)]));
  } else if (/^赤の味方が負傷するたび/.test(body)) {
    hit(foes[0], own[1], 1); equalHits(h, number(body, /敵に(\d+)ダメージ/), r);
  } else if (/^味方が攻撃するたび/.test(body)) {
    coreApplyAttackObservers(own[1], state, rng, emit, hit); equalStats(h, Array.from({ length: r }, () => [u.id, ...pair(body)]));
  } else if (/^味方の攻撃効果が発動するたび、ランダムな敵/.test(body)) {
    own[1].desc = '攻撃：このキャラクターは+1/+1を得る。'; coreApplyAttackObservers(own[1], state, rng, emit, hit);
    equalHits(h, number(body, /体に(\d+)ダメージ/), Math.min(3, number(body, /敵(\d+)体/)) * r);
  } else if ((m = body.match(/^味方の(負傷|攻撃|解放)効果が発動するたび、このキャラクターは永久に/))) {
    const kind = m[1]; own[1].desc = kind + '：このキャラクターは+1/+1を得る。';
    if (kind === '負傷') hit(foes[0], own[1], 1);
    if (kind === '攻撃') coreApplyAttackEffects(own[1], state, rng, emit, hit);
    if (kind === '解放') coreApplyReleaseEffects(own[1], [], state, rng, emit, hit);
    equalStats(h, [[u.id, ...pair(body)]]); assert.ok(stats(h)[0].persistent);
  } else if (/^味方が解放された時/.test(body)) {
    own.slice(1).forEach(t => { t.desc = '開戦：1マナを得る。'; });
    coreApplyReleaseEffects(own[1], [], state, rng, emit, hit); assert.equal(state.resources.p1.mana, r);
  } else if ((m = body.match(/^味方の攻撃回数は(\d+)回追加/))) {
    state._coreFirstSide = 'p1'; const runner = createBattleRunner(state, rng, emit, { skipOpening: true }); runner.step();
    assert.equal(h.events.filter(e => e.type === 'attack' && e.attackerId === u.id).length, 1 + Number(m[1]));
  } else if ((m = body.match(/^(?:このキャラクターの|味方の)(負傷|攻撃|開戦|死亡|解放|マナ)効果は(\d+)回追加/))) {
    const kind = m[1], self = /^この/.test(body), actor = self ? u : own[1], n = Number(m[2]);
    if (self) u._adjacentPanelEffectTexts = [text];
    if (kind === 'マナ') { Object.assign(actor, { desc: '1マナ：このキャラクターは+2/+3を得る。', manaCost: 1, manaThresholdDesc: 'このキャラクターは+2/+3を得る。' }); state.resources.p1.mana = 1; coreApplyManaThresholdEffects(state, rng, emit, hit); }
    else {
      actor.desc = kind + '：このキャラクターは+2/+3を得る。';
      if (kind === '負傷') hit(foes[0], actor, 1);
      else if (kind === '死亡') { actor.desc = '死亡：7ゴールドを得る。'; hit(foes[0], actor, 10000, false, true); assert.equal(state.resources.p1.gold, 800 + 7 * (1 + n)); return good('実際に死亡させ、追加発動の回数と獲得ゴールドを検査'); }
      else if (kind === '開戦') { actor.desc = '開戦：2マナを得る。'; runBattleCore(state, rng, { turnLimit: 0, onEvent: emit }); assert.equal(bySource(h, 'mana_gain').filter(e => e.unitId === actor.id).reduce((s, e) => s + e.amount, 0), 2 * (1 + n)); return good('runBattleCoreの開戦で追加発動回数を検査'); }
      else if (kind === '攻撃') { u.lane = 'rear'; actor.lane = 'front'; state._coreFirstSide = 'p1'; createBattleRunner(state, rng, emit, { skipOpening: true }).step(); }
      else { actor.keywords = ['封印1']; state.blood.p1 = 99; runBattleCore(state, rng, { turnLimit: 1, onEvent: emit }); }
    }
    assert.equal(h.events.filter(e => e.type === 'stat_change' && e.unitId === actor.id && e.atk === 2 && e.hp === 3).length, 1 + n);
  } else if (/^(?:味方の)?眷属が召喚され/.test(body) || /^このキャラクターが召喚した/.test(body)) {
    u.keywords = ['毒牙2', '先制', '貫通'];
    const child = coreSummonUnit(state, 'p1', { name: '検査眷属', atk: 2, hp: 4, _fixedSummonStats: true }, emit, u.id, false, rng, hit);
    assert.ok(child);
    if (/永久に|このキャラクターは\+\d/.test(body)) { equalStats(h, [[u.id, ...pair(body)]]); if (/永久に/.test(body)) assert.ok(stats(h)[0].persistent); }
    else if (/このゲーム中/.test(body)) assert.equal(child.maxHp, 4 + number(body, /HP\+(\d+)/));
    else if (/キーワードをランダムに/.test(body)) assert.equal(child.keywords.filter(k => k !== '眷属').length, number(body, /に(\d+)つ/));
    else if (/「死亡：/.test(body)) {
      hit(foes[0], child, 10000, false, true); const es = h.events.filter(e => e.type === 'damage' && e.sourceId === child.id);
      assert.deepEqual(es.map(e => e.amount), Array(/もう一度/.test(body) ? 2 : 1).fill(number(body, /敵に(\d+)ダメージ/)));
    } else { assert.deepEqual([child.atk, child.maxHp], [2 + pair(body)[0], 4 + pair(body)[1]]); }
  } else if (/^味方が結界を失うたび/.test(body)) {
    own[1].shield = 1; hit(foes[0], own[1], 1);
    if (/ダメージ/.test(body)) equalHits(h, number(body, /体に(\d+)ダメージ/), number(body, /敵(\d+)体/) * r);
    else equalStats(h, [[u.id, ...pair(body)]]);
  } else if (/^このキャラクターがATKを得るたび/.test(body)) {
    u.effectData = { ...u.effectData, effectTexts: ['攻撃：このキャラクターは+1/+1を得る。'] }; fire(h, '攻撃');
    equalHits(h, number(body, /体に(\d+)ダメージ/), number(body, /敵(\d+)体/) * r);
  } else if (/^(?:味方|キャラクター)が(?:死亡するたび|死んだ時)/.test(body)) {
    hit(foes[0], own[1], 10000, false, true);
    if (/ダメージ/.test(body)) equalHits(h, number(body, /敵に(\d+)ダメージ/), r);
    else if (/全ての味方はHP/.test(body)) equalStats(h, own.filter(t => t.hp > 0).map(t => [t.id, 0, number(body, /HP\+(\d+)/)]));
    else equalStats(h, Array.from({ length: r }, () => [u.id, ...pair(body)]));
  } else if (/この攻撃終了まで|反撃ダメージを受けない/.test(body)) {
    // 実際の攻撃手番で結界・負傷効果・反撃を観測する。
    state._coreFirstSide = 'p1'; foes[0].atk = 10; foes[0].shield = 1; foes[0].keywords = ['結界'];
    foes[0].desc = '負傷：このキャラクターは+2/+2を得る。';
    createBattleRunner(state, rng, emit, { skipOpening: true }).step();
    if (/無効/.test(body)) { assert.ok(hits(h).some(e => e.unitId === 'foe0')); assert.equal(h.events.some(e => e.type === 'stat_change' && e.unitId === 'foe0'), !form.enhanced); }
    else assert.equal(u.hp, 80);
  } else return unable('この常時効果の発動状況・期待値が未登録。');
  return good('共通コアで条件を作り、対象・数値・回数を検査');
}

function auditSentence(entry, form, sentence) {
  const match = sentence.match(/^([^：:]+)[：:]/), label = match ? match[1] : '';
  const triggers = /[＆&]/.test(label) ? label.split(/[＆&]/) : [label];
  return triggers.map(trigger => {
    try {
      assert.ok(entry.loaded, '本番loaderのカード定義が存在する');
      assert.equal(form.card.name, entry.name, 'カード名をシートの旧名へ戻さない');
      assert.equal(form.text, form.expectedText, 'シートの本文・強化本文をそのまま検査する');
      if (!sentence) return { trigger: '', status: '動く', reason: '効果本文なし。キーワード列は既存のキーワード回帰検査・全カード戦闘でも検査。' };
      return { trigger, ...exercise(entry, form, sentence, trigger) };
    }
    catch (error) { return { trigger, status: '動かない', reason: error.message }; }
  });
}
async function audit() {
  await initialize(); const entries = catalog();
  const cards = entries.map(entry => ({ kind: entry.kind, no: entry.no, name: entry.name, implemented: entry.implemented,
    forms: entry.implemented ? entry.forms.map(form => ({ enhanced: form.enhanced, text: form.text,
      sentences: (form.sentences.length ? form.sentences : [form.expectedText]).map(text => ({ text, checks: auditSentence(entry, form, text) })) })) : [],
    ...(entry.implemented ? {} : { status: '実装 false' }) }));
  const checks = cards.flatMap(c => c.forms.flatMap(f => f.sentences.flatMap(s => s.checks)));
  return { baseline: 'de191a0c8ad21080fa7de184db15c94c3203a63b', source: 'js/data/local_xlsx_data.js（読取専用）',
    summary: { cards: cards.length, implemented: cards.filter(c => c.implemented).length, unimplemented: cards.filter(c => !c.implemented).length,
      checks: checks.length, working: checks.filter(c => c.status === '動く').length,
      broken: checks.filter(c => c.status === '動かない').length, unable: checks.filter(c => c.status === '判定できない').length }, cards };
}
function markdown(report) {
  const lines = ['# 2026-10-26 全カード本文監査', '', '内蔵CSVを本番loaderで読み、通常・強化の文ごとに共通コアで条件を作り、本文から独立に求めた対象・数値・回数と照合。',
    '', '```json', JSON.stringify(report.summary, null, 2), '```', '', '| 番号 | カード | 形態 | トリガ | 本文 | 判定 | 理由 |', '| --- | --- | --- | --- | --- | --- | --- |'];
  const esc = s => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  for (const c of report.cards) {
    if (!c.implemented) { lines.push(`| ${c.no} | ${c.name} | — | — | — | 実装 false | シートの実装列 |`); continue; }
    for (const f of c.forms) for (const s of f.sentences) for (const check of s.checks)
      lines.push([c.no, c.name, f.enhanced ? '強化' : '通常', check.trigger || '—', s.text || '（本文なし）', check.status, check.reason].map(esc).map(s => ' ' + s + ' ').join('|').replace(/^/, '|').replace(/$/, '|'));
  }
  return lines.join('\n') + '\n';
}
async function main() {
  const report = await audit(), outIndex = process.argv.indexOf('--out');
  if (outIndex >= 0) {
    const prefix = path.resolve(process.argv[outIndex + 1]); fs.mkdirSync(path.dirname(prefix), { recursive: true });
    fs.writeFileSync(prefix + '.json', JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(prefix + '.md', markdown(report));
    console.log('監査一覧: ' + prefix + '.{json,md}');
  }
  console.log(JSON.stringify(report.summary));
  for (const c of report.cards) for (const f of c.forms) for (const s of f.sentences) for (const ch of s.checks)
    if (ch.status !== '動く') console.log([c.no, c.name, f.enhanced ? '強化' : '通常', ch.trigger, ch.status, s.text, ch.reason].join('\t'));
  if (outIndex < 0) console.log(markdown(report));
  process.exitCode = report.summary.broken ? 1 : 0;
}
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { initialize, catalog, sentences, subject, context, fire, exercise, auditSentence, audit, markdown, formedEnchant, copy, plain };
