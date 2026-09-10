'use strict';

// シートの効果文に**書かれている数**と、コアが実際に出す数が合っているかを監査する。
//
// effect_audit.js は「発動したか」までしか見ない。値を見ていなかったため、
// 効果名でコード側に数を直書きしたもの（野生の力＝2マナ固定）が、
// シートを1マナへ変えても誰にも気づかれないまま残っていた。
//
// **判定できる形の文だけを見る。** 条件付き（「〜なら」「確率で」「X は〜に等しい」）や
// 盤面依存のものは対象外にして、誤検出でこの監査そのものが無視されるのを防ぐ。
// 対象外にした文は SKIP として件数だけ出す（増減で気づけるように）。
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../../js/battle/core');
const sheetData = require('./sheet_data');
const { createSeededRng } = require('../../js/online/protocol');

const TRIGGERS = [
  ['開戦', /^開戦\s*[：:]\s*/],
  ['攻撃', /^攻撃(?:[＆&]負傷)?\s*[：:]\s*/],
  ['負傷', /^(?:負傷|攻撃[＆&]負傷)\s*[：:]\s*/],
  ['死亡', /^死亡\s*[：:]\s*/],
  ['終戦', /^終戦\s*[：:]\s*/],
  ['解放', /^解放\s*[：:]\s*/],
];

// 値を読み切れない文の印。ひとつでも含んでいたら対象外にする。
const UNCHECKABLE = /[Xｘ]は|確率で|なら|たび|につき|ごと|数だけ|等しい|倍|接続|マナ効果|変身|召喚|%/;

function readCards() {
  const out = [];
  const push = (kind, name, variant, desc) => {
    if (String(desc || '').trim()) out.push({ kind, name, variant, desc: String(desc).trim() });
  };
  sheetData.sheetRows('card').forEach(r => {
    push('キャラクター', r['名前'], '基本', r['効果']);
    push('キャラクター', r['名前'], '合体', r['合体効果']);
  });
  sheetData.sheetRows('enchant').forEach(r => {
    push('強化', r['名前'], '基本', r['効果']);
    push('強化', r['名前'], '合体', r['合体効果']);
  });
  return out;
}

// 文から読み取れる期待値。読めなければ null（対象外）。
function expectationOf(body) {
  if (UNCHECKABLE.test(body)) return null;
  let m;
  if ((m = /^(\d+)マナを得る。?$/.exec(body))) return { kind: 'mana', value: Number(m[1]) };
  if ((m = /^(\d+)ゴールドを得る。?$/.exec(body))) return { kind: 'gold', value: Number(m[1]) };
  if ((m = /^このキャラクターは\+(\d+)\/\+(\d+)を得る。?$/.exec(body))) {
    return { kind: 'selfStat', atk: Number(m[1]), hp: Number(m[2]) };
  }
  if ((m = /^このキャラクターはHP\+(\d+)を得る。?$/.exec(body))) return { kind: 'selfStat', atk: 0, hp: Number(m[1]) };
  if ((m = /^このキャラクターはATK\+(\d+)を得る。?$/.exec(body))) return { kind: 'selfStat', atk: Number(m[1]), hp: 0 };
  if ((m = /^(全ての敵(?:キャラクター)?|ランダムな敵(?:\d+体)?)に(\d+)ダメージを与える。?$/.exec(body))) {
    return { kind: 'damage', value: Number(m[2]) };
  }
  if ((m = /^ランダムな味方(?:\d+体)?は\+(\d+)\/\+(\d+)を得る。?$/.exec(body))) {
    return { kind: 'allyStat', atk: Number(m[1]), hp: Number(m[2]) };
  }
  // 「全ての味方は+X/+Yを得る」「全ての赤キャラクターは+X/+Yを得る」など、
  // 対象が誰であっても**1件あたりの加算値**は文の数どおりであるべき。
  if ((m = /^(?:全ての(?:味方|[赤青緑黄紫茶](?:の)?キャラクター))(?:は|に)\+(\d+)\/\+(\d+)を(?:得る|与える)。?$/.exec(body))) {
    return { kind: 'eachStat', atk: Number(m[1]), hp: Number(m[2]) };
  }
  if ((m = /^全ての味方はHP\+(\d+)を得る。?$/.exec(body))) return { kind: 'eachStat', atk: 0, hp: Number(m[1]) };
  return null;
}

function loadEnemyPool() {
  const ctx = {};
  vm.runInNewContext(`${fs.readFileSync(require.resolve('../../js/data/events.js'), 'utf8')}\nthis.pool=ENEMY_POOL;`, ctx);
  return (ctx.pool || []).filter(x => x && x.name);
}

// 監査対象だけを乗せた最小の盤面で、そのトリガを1回だけ発火させる。
function fire(card, trigger, summonDefs) {
  const isEnchant = card.kind === '強化';
  // loader.js が効果文から作るデータ駆動値（マナ・ゴールド）は、本体と同じ引き方で持たせる。
  // 持たせないと「終戦：Nゴールド」等が丸ごと0になり、実装の有無を判定できない。
  const num = (re, fallback) => { const m = re.exec(card.desc); return m ? (parseInt(m[1], 10) || fallback) : 0; };
  const subject = {
    id: 'subject', name: isEnchant ? '被験体' : card.name, atk: 20, hp: 40, maxHp: 40, color: '赤',
    keywords: isEnchant ? [card.name] : [],
    desc: isEnchant ? '' : card.desc,
    effectData: isEnchant ? { effectNames: [card.name], effectTexts: [card.desc] } : {},
    manaOnAttack: num(/攻撃：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/, 1),
    manaOnInjury: /%の確率/.test(card.desc) ? 0 : num(/負傷：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/, 1),
    manaOnDeath: num(/死亡：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/, 1),
    goldOnBattleEnd: num(/終戦：\s*(\d+)\s*ゴールドを?得る/, 0),
    goldOnDeath: num(/死亡：\s*(\d+)\s*ゴールドを?得る/, 0),
  };
  // 色指定の効果（全ての黄キャラクターは…）が空振りしないよう、各色を1体ずつ置く。
  // 色つきの味方は**後衛**に置く。前衛を埋めると召喚が上限で失敗し、
  // 「2体召喚」と「1体召喚」の差が出なくなる。
  const allies = [subject, ...['赤', '青', '緑', '黄', '紫'].map(color => ({
    id: `ally-${color}`, name: `味方${color}`, atk: 2, hp: 50, maxHp: 50, color, keywords: [], desc: '',
    lane: 'rear' }))];
  const foes = ['a', 'b', 'c'].map(k => ({ id: `foe-${k}`, name: `敵${k}`, atk: 2, hp: 100, maxHp: 100,
    color: '青', keywords: [], desc: '', poison: 2 }));
  // 盤面依存の効果（血・マナ・毒・失ったライフ・HP/ATKのしきい値）が0で空振りしないよう、
  // どれも「発動する側」の値を入れておく。**空振りだと合体前後の差も出ない。**
  const state = core.createBattleState({
    resources: { p1: { mana: 10, gold: 200 }, p2: { mana: 10, gold: 200 } },
    blood: { p1: 10, p2: 10 },
    life: { p1: 1, p2: 1 }, maxLife: { p1: 3, p2: 3 },
    sides: { p1: { units: allies }, p2: { units: foes } },
    summonDefs, itemDefs: [{ id: 'audit-item', name: '監査アイテム', kind: 'item' }],
  });
  const unit = state.units.p1[0];
  unit._currentAttackTarget = state.units.p2[0];
  const events = [];
  const emit = e => events.push(e);
  const rng = createSeededRng(11);
  const applyHit = (s, t, a, c) => core.coreResolveHit(state, s, t, a, c, rng, emit);
  if (trigger === '開戦') core.coreApplyOpeningEffects(unit, state, rng, emit, applyHit);
  if (trigger === '攻撃') { core.coreTriggerManaOnAttack(unit, state, emit); core.coreApplyAttackEffects(unit, state, rng, emit, applyHit); }
  if (trigger === '負傷') { core.coreTriggerManaOnInjury(unit, state, emit); core.coreApplyInjuryEffects(unit, 3, state, rng, emit, applyHit, state.units.p2[0]); }
  if (trigger === '死亡') { unit.hp = 0; core.coreTriggerDeath(unit, state, emit); core.coreApplyDeathEffects(unit, state, rng, emit, applyHit); }
  if (trigger === '終戦') core.coreTriggerBattleEnd(state, emit, rng);
  if (trigger === '解放') core.coreApplyReleaseEffects(unit, [], state, rng, emit, applyHit);
  return { events, unit, state };
}

// 実際に出た値。期待値と同じ形にそろえる。
function actualOf(exp, res) {
  const { events, unit } = res;
  if (exp.kind === 'mana') {
    return events.filter(e => e.type === 'mana_gain' && e.side === 'p1')
      .reduce((n, e) => n + (Number(e.amount) || 0), 0);
  }
  if (exp.kind === 'gold') {
    return events.filter(e => e.type === 'gold_gain' && e.side === 'p1')
      .reduce((n, e) => n + (Number(e.amount) || 0), 0);
  }
  if (exp.kind === 'selfStat') {
    const own = events.filter(e => e.type === 'stat_change' && e.unitId === unit.id);
    return { atk: own.reduce((n, e) => n + (Number(e.atk) || 0), 0),
      hp: own.reduce((n, e) => n + (Number(e.hp) || 0), 0) };
  }
  if (exp.kind === 'allyStat') {
    const other = events.filter(e => e.type === 'stat_change' && e.side === 'p1' && e.unitId !== unit.id);
    return { atk: other.reduce((n, e) => n + (Number(e.atk) || 0), 0),
      hp: other.reduce((n, e) => n + (Number(e.hp) || 0), 0) };
  }
  if (exp.kind === 'eachStat') {
    // 1件ごとの加算値がすべて同じ値であること。
    const list = events.filter(e => e.type === 'stat_change');
    if (!list.length) return { atk: 0, hp: 0 };
    const bad = list.find(e => (Number(e.atk) || 0) !== exp.atk || (Number(e.hp) || 0) !== exp.hp);
    return bad ? { atk: Number(bad.atk) || 0, hp: Number(bad.hp) || 0 } : { atk: exp.atk, hp: exp.hp };
  }
  if (exp.kind === 'damage') {
    const dmg = events.filter(e => e.type === 'damage' && e.side === 'p2' && Number(e.amount) > 0);
    return dmg.length ? Math.max(...dmg.map(e => Number(e.amount))) : 0;
  }
  return null;
}

// ── 合体で数が変わる効果は、実際に結果も変わること ───────────────
// シートの「効果」と「合体効果」で数字が違うのに、同じ盤面・同じ乱数で発火させた
// 結果が1文字も変わらないなら、その値はどこかでカード名に直書きされている
// （＝合体しても基本の値のまま動く）。**上の数値監査で形を読めない文もこれで拾える。**
// 検査盤面の作りでは差が出ないもの。**実装漏れではない**理由を必ず書くこと。
// ここへ足す時は、コード側を読んで「本文から読んでいる」ことを確認してから足す。
const MERGE_DIFF_KNOWN = new Map([
  ['ヘカトンケイル|負傷', '確率だけが変わる（10%→20%）。同じ乱数では結果が変わらない'],
  ['レイス|死亡', '負傷効果を持つ味方が要る。検査盤面の味方は効果を持たない'],
  ['ペガサス|攻撃', 'マナ効果を持つ味方が要る。検査盤面の味方は効果を持たない'],
  ['メリュジーヌ|攻撃', '毒の倍率はイベントに値が載らない（stat_changeは0/0）'],
  ['アークデーモン|解放', '接続しているエンチャントの数だけ繰り返す。検査盤面は接続0'],
  ['フィーンド|解放', '同上（接続0では繰り返し回数が0）'],
  ['錬成|終戦', '引き換えのGは js/engine/battle.js が本文から読む（コアは item_reward を出すだけ）'],
  ['援護射撃|攻撃', 'この効果を持つ味方が撃つ。検査盤面の味方は持っていないので0発（基本・合体とも）'],
  ['血の結束|死亡', 'この効果を持つ味方だけが強化される。検査盤面の味方は持っていないので0体（基本・合体とも）'],
]);

function mergeDiffAudit(summonDefs) {
  const rows = [];
  const digits = t => (String(t).match(/\d+/g) || []).join(',');
  // 値の入る欄はできるだけ拾う。拾い漏らすと「差が無い」と誤検出する。
  const sign = res => res.events
    .filter(e => e && e.type !== 'effect_flash' && e.type !== 'battle_start')
    .map(e => [e.type, e.unitId || e.targetId || '', e.amount, e.atk, e.hp, e.value,
      e.shield, e.count, e.effect, e.keyword, e.unit && e.unit.name, e.name].join(':')).join('|');
  const pairs = [];
  sheetData.sheetRows('card').forEach(r => pairs.push(['キャラクター', r['名前'], r['効果'], r['合体効果']]));
  sheetData.sheetRows('enchant').forEach(r => pairs.push(['強化', r['名前'], r['効果'], r['合体効果']]));
  let checked = 0;
  for (const [kind, name, base, merged] of pairs) {
    if (!String(base || '').trim() || !String(merged || '').trim()) continue;
    if (digits(base) === digits(merged)) continue;   // 数が同じなら比べる意味がない
    for (const [trigger, pattern] of TRIGGERS) {
      if (!pattern.test(base) || !pattern.test(merged)) continue;
      checked++;
      const a = fire({ kind, name, variant: '基本', desc: String(base).trim() }, trigger, summonDefs);
      const b = fire({ kind, name, variant: '合体', desc: String(merged).trim() }, trigger, summonDefs);
      if (sign(a) === sign(b) && !MERGE_DIFF_KNOWN.has(`${name}|${trigger}`)) {
        rows.push(`NG ${kind} ${name} ${trigger}：合体しても結果が変わらない 〔${String(base).trim()} → ${String(merged).trim()}〕`);
      }
    }
  }
  rows.forEach(r => console.log(r));
  return { checked, ng: rows.length };
}

// ── マナ効果（Nマナ／Nマナ毎）は「効果」と「合体効果」で結果が変わるか ────────
// 上の TRIGGERS（開戦・攻撃・負傷・死亡・終戦・解放）にマナは入らないため、
// マナ効果の追随漏れだけが検出されずに残っていた（ダークワンの合体効果が
// 「+2+2」とスラッシュ抜けで書かれていて、丸ごと不発になっていた）。
function manaDiffAudit() {
  const rows = [];
  const digits = t => (String(t).match(/\d+/g) || []).join(',');
  const run = desc => {
    const m = /^(\d+)マナ(毎)?\s*[：:]/.exec(String(desc || ''));
    if (!m) return null;
    const unit = { id: 'A', name: '主', atk: 2, hp: 50, maxHp: 50, color: '紫', desc,
      manaCost: Number(m[1]) || 1, manaRepeat: !!m[2],
      manaThresholdDesc: core.coreManaThresholdDescFromText(desc) };
    const state = core.createBattleState({
      resources: { p1: { mana: 6, gold: 0 }, p2: { mana: 6, gold: 0 } },
      sides: { p1: { units: [unit,
        ...['赤', '青', '緑', '黄', '紫'].map(c => ({ id: `a-${c}`, name: `味方${c}`, atk: 1, hp: 60,
          maxHp: 60, color: c, lane: 'rear' }))] },
        p2: { units: [{ id: 'e1', name: '敵', atk: 1, hp: 200, maxHp: 200, color: '青' },
          { id: 'e2', name: '敵2', atk: 1, hp: 200, maxHp: 200, color: '青' }] } } });
    const events = [];
    const rng = createSeededRng(17);
    const emit = e => events.push(e);
    core.coreApplyManaThresholdEffects(state, rng, emit,
      (src, tgt, amt, ctr) => core.coreResolveHit(state, src, tgt, amt, ctr, rng, emit));
    // 盤面の最終値もそのまま比べる（イベントに値が載らない効果を拾うため）。
    const board = [...state.units.p1, ...state.units.p2]
      .map(u => `${u.id}:${u.atk}/${u.hp}/${u.maxHp}/${u.shield || 0}`).join('|');
    return events.filter(e => e && e.type !== 'effect_flash' && e.type !== 'battle_start')
      .map(e => [e.type, e.unitId || e.targetId || '', e.amount, e.atk, e.hp].join(':')).join('|')
      + '#' + board;
  };
  let checked = 0;
  sheetData.sheetRows('card').forEach(r => {
    const name = String(r['名前'] || '').trim();
    const base = String(r['効果'] || '').trim();
    const merged = String(r['合体効果'] || '').trim();
    if (!base || !merged) return;
    if (!/^\d+マナ/.test(base) || !/^\d+マナ/.test(merged)) return;
    if (digits(base) === digits(merged)) return;
    checked++;
    const a = run(base); const b = run(merged);
    if (a === null || b === null) return;
    if (a === b) rows.push(`NG キャラクター ${name} マナ：合体しても結果が変わらない 〔${base} → ${merged}〕`);
  });
  rows.forEach(r => console.log(r));
  return { checked, ng: rows.length };
}

// ── 「常時：この◯◯効果はN回追加で発動する」は本文のNどおりか ──────────
// 発火経路が反復回数そのものなので、上の2つでは形を作れない。回数を直接確かめる。
function repeatAudit() {
  const KIND_BY_NAME = { '逆襲': '死亡', '闇の儀式': '攻撃', '執念の炎': '負傷', '恩寵': '開戦',
    'マナの種': 'マナ', '禁断の力': '解放' };
  const rows = [];
  let checked = 0;
  sheetData.sheetRows('enchant').forEach(r => {
    const name = String(r['名前'] || '').trim();
    const kind = KIND_BY_NAME[name];
    if (!kind) return;
    [['基本', r['効果']], ['合体', r['合体効果']]].forEach(([variant, desc]) => {
      const text = String(desc || '').trim();
      const m = /(\d+)回追加で発動する/.exec(text);
      if (!m) return;
      checked++;
      const unit = { id: 'u', name: '被験体', atk: 3, hp: 10, maxHp: 10, keywords: [name], desc: '',
        effectData: { effectNames: [name], effectTexts: [text] } };
      const got = core.coreExtraTriggerTimes(unit, kind, 1);
      if (got !== Number(m[1])) {
        rows.push(`NG 強化 ${name}（${variant}）追加発動：文=${m[1]}回 実際=${got}回 〔${text}〕`);
      }
    });
  });
  rows.forEach(r => console.log(r));
  return { checked, ng: rows.length };
}

function audit() {
  const summonDefs = loadEnemyPool();
  const rows = [];
  let checked = 0, skipped = 0, ng = 0;
  for (const card of readCards()) {
    for (const [trigger, pattern] of TRIGGERS) {
      if (!pattern.test(card.desc)) continue;
      // 1文だけの効果に限る（複合文は読み違えるので対象外）。
      const body = card.desc.replace(pattern, '').trim();
      const exp = expectationOf(body);
      if (!exp) { skipped++; continue; }
      checked++;
      const res = fire(card, trigger, summonDefs);
      const actual = actualOf(exp, res);
      const ok = exp.kind === 'selfStat' || exp.kind === 'allyStat' || exp.kind === 'eachStat'
        ? (actual.atk === exp.atk && actual.hp === exp.hp)
        : actual === exp.value;
      if (!ok) {
        ng++;
        const stat = exp.kind === 'selfStat' || exp.kind === 'allyStat' || exp.kind === 'eachStat';
        const want = stat ? `+${exp.atk}/+${exp.hp}` : String(exp.value);
        const got = stat ? `+${actual.atk}/+${actual.hp}` : String(actual);
        rows.push(`NG ${card.kind} ${card.name}（${card.variant}）${trigger}：文=${want} 実際=${got} 〔${card.desc}〕`);
      }
    }
  }
  rows.forEach(r => console.log(r));
  console.log(`効果文の数値監査: 検査${checked}件 / 対象外${skipped}件 / NG${ng}件`);
  const merge = mergeDiffAudit(summonDefs);
  console.log(`合体で値が変わる監査: 検査${merge.checked}件 / NG${merge.ng}件`);
  const mana = manaDiffAudit();
  console.log(`マナ効果の合体差分監査: 検査${mana.checked}件 / NG${mana.ng}件`);
  const repeat = repeatAudit();
  console.log(`追加発動回数の監査: 検査${repeat.checked}件 / NG${repeat.ng}件`);
  return ng + merge.ng + mana.ng + repeat.ng;
}

if (require.main === module) process.exit(audit() ? 1 : 0);
module.exports = { audit };
