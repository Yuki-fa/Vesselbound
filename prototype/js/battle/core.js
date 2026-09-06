// ═══════════════════════════════════════
// battle/core.js — 共通戦闘コア（PvE / PvP で唯一の戦闘ルール）
//
// ここが「戦闘ルール・キーワード・カード効果処理」の単一の置き場になる。
// PvE（battle.js）と PvP（online/sim.js）は、どちらもこのコアを呼ぶこと。
// 同じルールを2箇所で管理してはいけない。
//
// 絶対の制約（サーバーでもそのまま動かすため）
//   - DOM を触らない
//   - G（グローバルなゲーム状態）を触らない
//   - Math.random / Date.now を使わない（乱数は引数の rng だけ）
//   - 同期のみ（await しない）。演出の待ちは呼び出し側がイベントを見て行う
//
// ── 移行方針（段階的分離）─────────────────────────────
// 現状このコアが持つのは、攻撃順・レーン・相互ダメージ・先制・死亡・決着判定まで。
// battle.js に残っているキーワード／カード効果は、以下の順でここへ移していく。
//   1. ダメージ計算に関わるもの（結界・加護・強靭・貫通・毒牙 など）
//   2. トリガ効果（開戦・攻撃・負傷・死亡・解放・マナ効果）
//   3. 召喚・変身など盤面を変えるもの
// 移す時は「battle.js 側の実装を削除してコア呼び出しに置き換える」までを1セットとし、
// 両方に同じルールが残っている状態を作らないこと。
// ═══════════════════════════════════════

// ── 乱数 ──────────────────────────────────────────────
// コアは Math.random を直接呼ばない。呼び出し側が rng を渡す。
// PvEも同じコア結果を再現できるよう、呼び出し側がseedを設定できる決定論的RNGを使う。
let _coreMathRngState = 0x12345678;
const coreMathRng = {
  seed(value) { _coreMathRngState = (Number(value) >>> 0) || 0x12345678; },
  next() {
    _coreMathRngState = (_coreMathRngState + 0x6D2B79F5) >>> 0;
    let t = _coreMathRngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); },
  pick(arr) { return arr.length ? arr[Math.floor(this.next() * arr.length)] : null; },
};

// ══════════════════════════════════════════
// キーワード判定
// カードのキーワードは「キーワード列」と効果文の両方から決まる。
// PvE（battle.js）もPvP（sim.js）もここだけを見ること。
// ══════════════════════════════════════════

// キーワードとしてではなく強化カード名として書かれているものは、キーワード扱いしない。
// この一覧の名前は unit.keywords からも取り除かれる（_applyAdjacentPanelEnhancements）。
const CORE_KEYWORD_CARD_NAMES = new Set(
  ['封印されしもの', '禁断の力', '武器破壊', '団結', '共振', '遺志', '熟練', '戦術', '大盾', '策士', '攻防一体']);

// 効果文（desc）を持つ強化カードの名前は「効果の識別子」であってキーワードではない。
// キーワード数を数える側（策士）とキーワード表示だけがこれを見る。
// CORE_KEYWORD_CARD_NAMES と違い unit.keywords からは取り除かない：
// 逆襲・恩寵・錬成などは keywords の個数で発動回数を数えているため、消すと効果が消える。
// descが空の強化カード（即死・貫通・先制・毒の刃など）は本物のキーワードなので、ここには入れない。
// 新しい強化カードを足した時の追随漏れは tools/balance_sim/effect_audit.js が検出する。
const CORE_EFFECT_CARD_NAMES = new Set([...CORE_KEYWORD_CARD_NAMES,
  '逆襲', '闇の儀式', '執念の炎', '闇の炎', '狂気', '野生の力', '治癒能力', 'マナ生成',
  '逆上', '剣技', '怨念', '錬成', 'マナの種', '恩寵', '狙撃']);
// 効果文に書かれていれば自身が持つものとして扱うキーワード。
const CORE_TEXT_KEYWORDS = ['復活', '根性', 'ヘイト', '二段攻撃', '三段攻撃', '三方向攻撃', '全体攻撃', '先制', '隠密'];
const CORE_REMOVED_KEYWORDS = new Set(['生贄', '狩人', '狙撃', '強靭', 'エリート', 'ボス']);

// ウォーグ：常時：味方がN体を超えて召喚されるたび、すべての味方は+X/+Yを得る。
// **人数も加算値も本文から読む**（合体後は+10/+10）。カード名で数を書かない。
//
// **数えるのは「効果1回」。** 1回の効果で複数体が召喚されて7体以上になっても発動は1回、
// 既に7体以上の時にさらに召喚されても、その効果につき1回だけ全員へ乗る。
//   例）6体の時に3体召喚＝1回／9体の時に1体召喚＝1回／9体の時に3体召喚＝1回
// 召喚は1体ずつ解決されるため、コア側で「効果のまとまり」を作る必要がある。
// 効果の入口（開戦・攻撃・負傷・死亡・マナ効果など）で coreBeginSummonBatch()／
// coreEndSummonBatch() を掛け、その間の増加はまとめて1回として扱う。
function coreBeginSummonBatch(state) {
  if (!state) return;
  state._wargBatchDepth = (Number(state._wargBatchDepth) || 0) + 1;
}
function coreEndSummonBatch(state, emit) {
  if (!state) return;
  state._wargBatchDepth = Math.max(0, (Number(state._wargBatchDepth) || 1) - 1);
  if (state._wargBatchDepth > 0) return;
  const pending = state._wargPending;
  state._wargPending = null;
  if (!pending) return;
  ['p1', 'p2'].forEach(side => { if (pending[side]) coreFireWargThreshold(state, side, emit); });
}
function coreApplyWargThreshold(state, side, emit) {
  const count = ((state.units && state.units[side]) || [])
    .filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul).length;
  state._wargLiveCount = state._wargLiveCount || { p1: 0, p2: 0 };
  const previous = Number(state._wargLiveCount[side]) || 0;
  state._wargLiveCount[side] = count;
  if (count <= previous) return;   // 減った・変わらない（開戦の走査や死亡）＝何も起きない
  if (Number(state._wargBatchDepth) > 0) {
    // 効果の終わりにまとめて1回だけ判定する。
    state._wargPending = state._wargPending || {};
    state._wargPending[side] = true;
    return;
  }
  coreFireWargThreshold(state, side, emit);
}
// 本文：「味方がN体を超えて召喚されるたび、すべての味方は+X/+Yを得る。」
// 旧本文の「N体以上になるたび」も同じ形で読む（超える＝N+1体、以上＝N体）。
function coreWargSpecOf(unit) {
  const m = coreUnitEffectText(unit)
    .match(/味方が(\d+)体(を超えて召喚される|以上になる)たび、すべての味方は\+(\d+)\/\+(\d+)を得る/);
  if (!m) return null;
  const need = Math.max(1, Number(m[1]) || 7) + (m[2] === 'を超えて召喚される' ? 1 : 0);
  return { need, atk: Number(m[3]) || 0, hp: Number(m[4]) || 0 };
}
function coreFireWargThreshold(state, side, emit) {
  const units = ((state.units && state.units[side]) || [])
    .filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul);
  units.filter(x => coreHasEffect(x, 'ウォーグ') && !coreIsSealed(x)).forEach(source => {
    const spec = coreWargSpecOf(source) || { need: 8, atk: 5, hp: 5 };
    if (units.length < spec.need) return;
    units.filter(x => !coreIsSealed(x)).forEach(target => {
      // **加算した値をそのままイベントへ載せる。** 固定値で載せていた頃は、
      // 紫修正などの補正が乗る編成で表示上のATK/HPと実際の値がずれていた。
      const atk = coreStatBonus(target, spec.atk, source);
      const hp = coreStatBonus(target, spec.hp, source);
      if (!atk && !hp) return;
      target.atk += atk;
      target.maxHp += hp;
      target.hp += hp;
      emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason: 'warg_count_buff', sourceId: source.id });
    });
  });
}

function coreUnitKeywords(unit) {
  const kws = [...(unit && unit.keywords || [])].filter(k => !CORE_KEYWORD_CARD_NAMES.has(String(k || '').trim())
    && !CORE_REMOVED_KEYWORDS.has(String(k || '').trim()));
  const unitText = coreUnitEffectText(unit);
  const passiveText = unitText.replace(/(^|\n)\s*\d+マナ(?:毎)?[:：][^\n。]*(?:。|$)/g, ' ');
  const ownPassiveText = passiveText.replace(/(?:ランダムな)?(?:味方|敵|キャラクター|.+?キャラクター)(?:に|が)[^。]*(?:結界|生贄|復活|封印\d*)を(?:付与する|得る)。?/g, ' ');
  CORE_TEXT_KEYWORDS.forEach(k => {
    // 「復活を付与する」は自身ではなく他者に付与する効果文のため、自身の復活キーワードとしては扱わない
    // （レイス等：これを除外しないと、死亡時に自分自身が誤って復活してしまう）
    if (ownPassiveText.includes(k)) kws.push(k);
  });
  const shieldText = ownPassiveText.match(/(?:^|\n)\s*結界\s*(\d*)/);
  if (shieldText) kws.push('結界' + (shieldText[1] || '1'));
  const sealText = ownPassiveText.match(/封印\s*(\d+)/);
  if (sealText) kws.push('封印' + (sealText[1] || '1'));
  // 注：unit.equipment（接続強化パネルの複製）は再スキャンしない。既に unit.keywords へ
  // 反映済みで、再スキャンすると同じキーワードが二重・三重に数えられる。
  if (kws.includes('三段攻撃')) {
    for (let i = kws.length - 1; i >= 0; i--) if (kws[i] === '二段攻撃') kws.splice(i, 1);
  }
  if (kws.includes('全体攻撃')) {
    for (let i = kws.length - 1; i >= 0; i--) if (kws[i] === '三方向攻撃') kws.splice(i, 1);
  }
  return kws;
}

// 本体カードと魔導板の隣接強化カードが持つ効果文を、戦闘判定の入力として統合する。
function coreUnitEffectText(unit) {
  const texts = [unit && unit.desc, unit && unit.effectText, unit && unit.effect,
    ...(unit && unit._adjacentPanelEffectTexts || []),
    ...(unit && unit.effectData && unit.effectData.effectTexts || [])]
    .filter(Boolean).map(String);
  return [...new Set(texts)].join(' ');
}

function coreUnitTriggerText(unit, trigger) {
  const texts = [unit && unit.desc, unit && unit.effectText, unit && unit.effect,
    ...(unit && unit._adjacentPanelEffectTexts || []),
    ...(unit && unit.effectData && unit.effectData.effectTexts || [])]
    .filter(Boolean).map(String);
  const triggerPattern = trigger === '負傷' ? '(?:負傷|攻撃[＆&]負傷)' : trigger;
  const prefix = new RegExp('^\\s*' + triggerPattern + '(?:[＆&](?:攻撃|負傷))?\\s*[：:]');
  const matched = texts.filter(text => prefix.test(text));
  return matched.join(' ');
}

function coreUnitIsSilenced(unit) {
  return !!(unit && (unit._silenced || unit._scrollSilencedUntilAttack));
}

function coreShieldValueFromKeyword(k) {
  const m = String(k || '').trim().match(/^結界\s*(\d*)$/);
  if (!m) return 0;
  return Math.max(1, parseInt(m[1] || '1', 10) || 1);
}

function coreUnitShieldValue(unit) {
  return coreUnitKeywords(unit).reduce((sum, k) => sum + coreShieldValueFromKeyword(k), 0);
}

function coreUnitHasKeyword(unit, kw) {
  if (kw === '結界') return coreUnitShieldValue(unit) > 0;
  if (kw === '加護') return (coreUnitKeywords(unit) || []).some(k => /^加護\d*$/.test(String(k || '')));
  return coreUnitKeywords(unit).includes(kw) || ((unit && unit._adjacentPanelAbilities) || []).includes(kw);
}

function coreUnitKeywordCount(unit, kw) {
  if (!kw) return 0;
  if (kw === '結界') return coreUnitShieldValue(unit) > 0 ? 1 : 0;
  return coreUnitKeywords(unit).filter(k => k === kw).length
    + (((unit && unit._adjacentPanelAbilities) || []).filter(k => k === kw).length);
}

// ══════════════════════════════════════════
// 生存・行動可否・攻撃力
// ══════════════════════════════════════════
function coreIsSealed(unit) { return !!(unit && unit._sealed); }
// 戦闘に参加できるか（生存し、オブジェクトでもソウルでもなく、封印されていない）。
function coreCanAct(unit) {
  return !!(unit && unit.hp > 0 && !unit._isObject && !unit._isSoul && !coreIsSealed(unit));
}
function coreAttackDamage(unit) {
  if (unit && coreHasEffect(unit, '攻防一体')) return Math.max(0, Number(unit.hp) || 0);
  return Math.max(0, unit && unit.atk || 0);
}
function coreCounterDamage(attacker, defender) {
  if (!defender || defender.hp <= 0 || coreIsSealed(defender)) return 0;
  const noCounter = /自分よりATKが低いキャラクターからの反撃ダメージを受けない/.test(coreUnitTriggerText(attacker, '攻撃'))
    && (Number(defender.atk) || 0) < (Number(attacker && attacker.atk) || 0);
  return noCounter ? 0 : coreAttackDamage(defender);
}

// ══════════════════════════════════════════
// 数値付きキーワードの合算と攻撃回数
// 「毒牙3」「邪眼2」のように数値が付くキーワードは、同名を複数持つ場合に合算する。
// 合算の仕方をここ以外に書かないこと。
// ══════════════════════════════════════════

// name の数値付き（「毒牙3」等）を合算する。
// fromKeywordsOnly=true の時は unit.keywords の生の値だけを見る（効果文からは拾わない）。
function coreKeywordSum(unit, name, fromKeywordsOnly) {
  const list = fromKeywordsOnly ? (unit && unit.keywords || []) : coreUnitKeywords(unit);
  const re = new RegExp('^' + name + '(\\d+)$');
  return list.reduce((sum, k) => {
    const m = re.exec(String(k || ''));
    return sum + (m ? (parseInt(m[1], 10) || 0) : 0);
  }, 0);
}

// 追加攻撃回数。三段攻撃=+2、二段攻撃=+1。
// coreUnitKeywords が三段/二段の併存を排他化しているので、ここでは優先順だけを見る。
// 「常時：味方の攻撃回数は1回追加される。」を持つもの（疾風の指輪 R028 / タイタニア C073）を
// まとめて数える。タイタニアは「味方の」効果なので、**盤面に生きているタイタニアの体数ぶん**加算する
// （攻撃者自身が持っているかどうかではない）。PvEとコアで別々に数えていたため、
// PvEは疾風の指輪を数え忘れ、コアはタイタニアを0/1で数えていた。ここ1箇所で数えること。
//   allies         … 攻撃側の陣営配列
//   hasteRingCount … その陣営の疾風の指輪の数（PvEの敵側は0）
function coreExtraAttackTotal(attacker, allies, hasteRingCount, opts) {
  const titania = (allies || []).filter(u => u && u.hp > 0 && !coreIsSealed(u)
    && coreEffectCount(u, 'タイタニア') > 0).length;
  return coreExtraAttackCount(attacker, opts)
    + Math.max(0, Number(hasteRingCount) || 0)
    + titania;
}

function coreExtraAttackCount(unit, opts) {
  const raw = !!(opts && opts.fromKeywordsOnly);
  const has = kw => raw ? (unit && unit.keywords || []).includes(kw) : coreUnitHasKeyword(unit, kw);
  if (has('三段攻撃')) return 2;
  if (has('二段攻撃')) return 1;
  return 0;
}

// 攻撃の広がり。'all'＝全体攻撃／'tri'＝三方向攻撃／''＝単体。
function coreAttackSpread(unit, opts) {
  const raw = !!(opts && opts.fromKeywordsOnly);
  const has = kw => raw ? (unit && unit.keywords || []).includes(kw) : coreUnitHasKeyword(unit, kw);
  if (has('全体攻撃')) return 'all';
  // 三方向攻撃と貫通を同時に持つ場合は、三方向攻撃を優先し、貫通を無効にする。
  if (has('三方向攻撃')) return 'tri';
  return '';
}

// 三方向攻撃の対象は、対象と同じ前後列の左右隣接スロットだけ。
// 固定長の盤面配列を使うため、空きスロットや後衛を詰めて隣扱いしない。
function coreTriDirectionTargets(target, list) {
  if (!target) return [];
  const arr = Array.isArray(list) ? list : [];
  const lane = target.lane || 'front';
  const sameRow = arr.filter(u => u && (u.lane || 'front') === lane);
  const idx = sameRow.indexOf(target);
  if (idx < 0) return [];
  return [idx - 1, idx, idx + 1].map(i => sameRow[i]).filter(u =>
    u && u.hp > 0 && !coreIsSealed(u) && !u._isObject && !u._isSoul);
}

// ══════════════════════════════════════════
// 受けるダメージの確定（結界・弱体・強靭）
// 「いくつ受けるか」「無効化されるか」の判定はここだけ。
// 実際の減算・結界の消費・ログ・演出は呼び出し側が行う。
// ══════════════════════════════════════════

// 強靭X：このキャラクターが受けるダメージはX減少する（複数所持時は合算）。
function coreToughValue(unit) { return 0; }

/**
 * 受けるダメージを確定する。
 * @returns {{blocked:boolean, reason:''|'dead'|'sealed'|'shield', amount:number, consumesShield:boolean}}
 *   consumesShield が true の時、呼び出し側が結界を1つ減らすこと。
 */
function coreResolveIncomingDamage(unit, dmg, opts) {
  const skipTough = !!(opts && opts.skipTough);
  // skipWeaken：弱体を加算しない経路（既存の dealDmgToEnemy がこの挙動）。
  const skipWeaken = !!(opts && opts.skipWeaken);
  if (!unit || unit.hp <= 0 || !(dmg > 0)) return { blocked: false, reason: 'dead', amount: 0, consumesShield: false };
  if (coreIsSealed(unit)) return { blocked: true, reason: 'sealed', amount: 0, consumesShield: false };
  // 結界：ダメージを1回無効化して1つ減る。
  if (unit.shield > 0) return { blocked: true, reason: 'shield', amount: 0, consumesShield: true };
  let v = dmg;
  // 弱体X：受ける1以上のダメージはX増加する（複数付与時は加算値で保持）。
  if (!skipWeaken && unit.weaken > 0) v += unit.weaken;
  if (!skipTough) v -= coreToughValue(unit);
  return { blocked: false, reason: '', amount: Math.max(0, v), consumesShield: false };
}

// 加護X：敵から与えられる状態異常をX回無効化する。1回使うと残り回数が減る。
// 指輪など陣営側の無条件保護は呼び出し側で判定すること（Gに依存するため）。
function coreConsumeWardCharge(unit) {
  const kw = (coreUnitKeywords(unit) || []).find(k => /^加護\d*$/.test(String(k || '')));
  if (!kw) return false;
  const max = Math.max(1, parseInt(String(kw).replace('加護', ''), 10) || 1);
  if (unit._wardCharges == null || unit._wardCharges > max) unit._wardCharges = max;
  if (unit._wardCharges <= 0) return false;
  unit._wardCharges--;
  return true;
}

// ══════════════════════════════════════════
// 封印と生贄
// 封印X：戦闘開始時は場に出ておらず、生贄をX体捧げると解放される。
// 生贄：封印の解放に使われて破棄されるキャラクター。
// 「誰が封印されるか」「何体必要か」「誰が生贄になるか」の判定はここだけ。
// 破棄の演出・死亡効果の発火は呼び出し側が行う。
// ══════════════════════════════════════════

function coreUnitHasSacrifice(unit) { return false; }

// 封印X。∞なら Infinity（解放されない）。0なら封印されていない。
function coreSealValue(unit) {
  if (unit && unit._sealInfinity) return Infinity;
  const kw = (coreUnitKeywords(unit) || []).find(k => /^封印(?:\d+|∞)$/.test(k));
  if (kw && /∞/.test(kw)) return Infinity;
  return kw ? Math.max(1, parseInt(String(kw).replace('封印', ''), 10) || 1) : 0;
}

// 戦闘開始時の封印状態を決める。units は盤面順（味方→敵）に並んだ全キャラクター。
// fieldOrder は「盤面上の並び順」を返す関数（同時解放の優先順に使う）。
function coreInitSealStates(units, fieldOrder) {
  const order = typeof fieldOrder === 'function' ? fieldOrder : (() => 0);
  (units || []).forEach((u, idx) => {
    if (!u) return;
    const seal = coreSealValue(u);
    if (seal > 0) {
      u._sealed = true;
      u._sealValue = seal;
      u._sealOrder = order(u) + idx / 1000;
    } else {
      delete u._sealed;
      delete u._sealValue;
      delete u._sealInfinity;
    }
  });
}

// 旧API互換。封印解放は血カウンターだけを参照し、生贄キャラは参照しない。
function coreSacrificeUnits(units) {
  return [];
}
function coreSacrificeCount(units) { return coreSacrificeUnits(units).length; }

// 封印Xの解放に必要な血が揃っているか。解放しても血は消費しない。
function coreSealRelease(unit, allUnits, blood) {
  const required = Math.max(1, Number(coreSealValue(unit) || unit._sealValue) || 1);
  if (!Number.isFinite(required)) return { ready: false, required, sacrificed: [] };
  const available = Math.max(0, Number(blood && blood[unit.side]) || 0);
  if (available < required) return { ready: false, required, sacrificed: [], blood: available };
  return { ready: true, required, sacrificed: [], blood: available };
}

// ══════════════════════════════════════════
// 攻撃対象の決定
// opts.defendersAreEnemies：守護（guardian）が常時有効かどうか。
//   敵側の盤面、または魔導板から召喚された味方だけが常時守護を持つ。
// ══════════════════════════════════════════
function coreSelectAttackTarget(attacker, defenders, rng, opts) {
  const r = rng || coreMathRng;
  const asEnemies = !!(opts && opts.defendersAreEnemies);
  const live = (defenders || []).filter(u => u && u.hp > 0 && !u._isObject && !coreIsSealed(u));
  if (!live.length) return null;
  const isFront = u => (u.lane || 'front') === 'front';
  const isGuard = u => {
    const canUseStaticGuard = asEnemies || u._panelSummoned;
    return (u.hate && u.hateTurns > 0) || (canUseStaticGuard && u.guardian);
  };
  const isStealth = u => !!u.stealth || coreUnitHasKeyword(u, '隠密');
  const laneLocked = live.some(isFront) ? live.filter(isFront) : live;
  const hasNonStealth = live.some(u => !isStealth(u));
  // 前衛が隠密だけの場合は、非隠密の後衛を対象にする。前衛配列へ
  // フォールバックすると、非隠密の味方がいるのに隠密を攻撃してしまう。
  const visibleLane = hasNonStealth ? laneLocked.filter(u => !isStealth(u)) : laneLocked;
  const visible = hasNonStealth ? live.filter(u => !isStealth(u)) : live;
  const guardLine = visibleLane.filter(isGuard);
  if (guardLine.length) return r.pick(guardLine);
  // E047：カード本文で指定された最小HP対象。旧「狙撃」キーワードではない。
  if (/最もHPの低い敵を対象にする/.test(coreUnitEffectText(attacker))) {
    const visibleAll = visible;
    return visibleAll.reduce((a, b) => a.hp < b.hp ? a : b);
  }
  // 1. 前衛が存在する場合は前衛のみを対象にする
  const pool = visibleLane.length > 0 ? visibleLane : (visible.length > 0 ? visible : laneLocked);
  const finalPool = pool.length > 0 ? pool : live;
  // 2. ランダム
  return r.pick(finalPool);
}

// 貫通：前衛キャラクターへの攻撃時、その後ろに位置する後衛キャラクター（最大3人）にも同じダメージを与える。
// 前衛F人・後衛R人の場合、後衛R人をF分割し、front側の位置indexに対応する区画を「真後ろ」とみなす。
// 貫通で巻き込む後衛＝**その前衛カードの真後ろに重なって見える後衛**（最大3体）。
// 前衛・後衛はどちらも同じ幅のカードを中央寄せで並べるので、
// 「中央からの位置（カード何枚分か）」の差が1枚未満なら重なって見える。
// 以前は後衛を前衛の人数で等分する近似だったため、
// **画面では貫通の線上にいない後衛にダメージが入っていた**（利用者報告）。
const CORE_PIERCE_MAX_REAR = 3;
function corePierceRearTargets(target, list) {
  if (!target || (target.lane || 'front') === 'rear') return [];
  const live = (list || []).filter(u => u && u.hp > 0 && !u._isObject && !coreIsSealed(u));
  const front = live.filter(u => (u.lane || 'front') !== 'rear');
  const rear = live.filter(u => (u.lane || 'front') === 'rear');
  const idx = front.indexOf(target);
  if (idx < 0 || !rear.length) return [];
  const F = front.length, R = rear.length;
  // 中央を0としたカード枚数単位の位置。
  const frontPos = idx - (F - 1) / 2;
  return rear
    .map((u, j) => ({ u, gap: Math.abs((j - (R - 1) / 2) - frontPos) }))
    .filter(x => x.gap < 1)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, CORE_PIERCE_MAX_REAR)
    .map(x => x.u);
}

// 決着がつかない場合の打ち切り。到達したら引き分け扱い。
// 戦闘の打ち切りターン数。PvE（battle.js の battlePhase）は 500 で打ち切っていたため、
// PvEを正としてここへ揃える。**両方が同じ値を使うこと**（片方だけ変えると、
// 決着が付かない盤面でPvEとオンラインの引き分け成立タイミングが食い違う）。
const BATTLE_CORE_TURN_LIMIT = 500;

const BATTLE_CORE_SIDES = ['p1', 'p2'];

// 「熟練」は戦闘中に得る正のATK/HP修正へ一律に+1する魔導板効果。
// 個別効果側で加算すると、将来追加される効果だけ漏れるため、コアの変更入口で処理する。
// ヴォイド・ウォーカーの紫修正（`_voidWalkerBonus`）を盤面から作り直す。
// **キャッシュを1箇所で作り直すこと。** 召喚・死亡・仲間化で盤面が変わるたびに
// ずれるため、状態を作った時・召喚した時・手番の頭で必ず通す。
// （初期化を忘れた経路があると、その体だけ紫修正が乗らない＝ツインデビルの
//   本体とコピーで +1/+1 と +2/+2 が食い違っていた。）
function coreRefreshVoidWalkerBonus(state) {
  if (!state || !state.units) return;
  ['p1', 'p2'].forEach(side => {
    const list = (state.units[side] || []).filter(Boolean);
    const hasVoidWalker = list.some(u => u.hp > 0 && coreHasEffect(u, 'ヴォイド・ウォーカー'));
    list.forEach(u => { u._voidWalkerBonus = hasVoidWalker && u.color === '紫' ? 1 : 0; });
  });
}

// target：値を**得る**キャラクター（熟練＝「このキャラクターが得る値は+1される」）。
// source：値を**与える**キャラクター（ヴォイド・ウォーカー＝「紫のキャラクターが
//         与える戦闘修正の値は1大きくなる」）。**与え手の色で決まる。**
//         渡せない場所（誰が与えたか特定できない盤面補正など）は対象を与え手とみなす。
function coreStatBonus(target, value, source) {
  const n = Number(value) || 0;
  if (n <= 0) return n;
  // 熟練は接続枚数ぶん重複する。存在判定だけでは複数枚を1枚としてしまう。
  const skillBonus = coreEffectCount(target, '熟練');
  const giver = source || target;
  const modifierBonus = giver && giver.color === '紫' ? Math.max(0, Number(giver._voidWalkerBonus) || 0) : 0;
  return n + skillBonus + modifierBonus;
}

// 呼び出し側のオブジェクトを一切書き換えないよう、コア内部用に写した可変ユニットを作る。
function createCoreUnit(raw, side, index) {
  const atk = Math.max(0, Math.round(Number(raw && raw.atk) || 0));
  const hp = Math.max(1, Math.round(Number(raw && raw.hp) || 1));
  const baseAtk = Math.max(0, Number(raw && (raw.baseAtk ?? raw.atk)) || 0);
  const baseMaxHp = Math.max(1, Number(raw && (raw.baseMaxHp ?? raw.maxHp ?? raw.hp)) || 1);
  return {
    id: String((raw && raw.id) || `${side}-${index}`),
    name: String((raw && raw.name) || ''),
    side,
    atk,
    hp,
    maxHp: Math.max(hp, Math.round(Number(raw && raw.maxHp) || hp)),
    lane: String((raw && raw.lane) || 'front') === 'rear' ? 'rear' : 'front',
    color: String((raw && raw.color) || ''),
    race: String((raw && raw.race) || ''),
    sfxType: String((raw && raw.sfxType) || ''),
    no: String((raw && (raw.no || raw.artCode)) || ''),
    art: String((raw && raw.art) || ''),
    imageNo: String((raw && (raw.imageNo || raw.artCode || raw.no)) || ''),
    keywords: Array.isArray(raw && raw.keywords) ? raw.keywords.map(String) : [],
    // 効果文もキーワード判定の入力になる（coreUnitKeywords が本文からも拾う）。
    desc: String((raw && raw.desc) || ''),
    // 盤面上の性質。攻撃対象の決定に使う。
    guardian: !!(raw && raw.guardian),
    hate: !!(raw && raw.hate),
    hateTurns: Number(raw && raw.hateTurns) || 0,
    stealth: !!(raw && raw.stealth) || coreUnitHasKeyword(raw, '隠密'),
    shield: Math.max(0, Number(raw && raw.shield) || 0) || coreUnitShieldValue(raw),
    weaken: Math.max(0, Number(raw && raw.weaken) || 0),
    _sealed: !!(raw && raw._sealed),
    _panelSummoned: raw && raw._panelSummoned !== undefined ? !!raw._panelSummoned : true,
    summonCount: Math.max(1, Number(raw && raw.summonCount) || 1),
    _mapPanelPower: String((raw && raw._mapPanelPower) || ''),
    _openingDuplicate: !!(raw && raw._openingDuplicate),
    poison: Math.max(0, Number(raw && raw.poison) || 0),
    manaOnAttack: Math.max(0, Number(raw && raw.manaOnAttack) || 0),
    manaOnInjury: Math.max(0, Number(raw && raw.manaOnInjury) || 0),
    manaOnDeath: Math.max(0, Number(raw && raw.manaOnDeath) || 0),
    goldOnBattleEnd: Math.max(0, Number(raw && raw.goldOnBattleEnd) || 0),
    goldOnDeath: Math.max(0, Number(raw && raw.goldOnDeath) || 0),
    randomItemOnBattleEnd: !!(raw && raw.randomItemOnBattleEnd),
    randomItemCost: Math.max(0, Number(raw && raw.randomItemCost) || 0),
    manaCost: Math.max(0, Number(raw && (raw.manaCost
      || (raw.effectData && raw.effectData.manaCost))) || 0),
    manaRepeat: !!(raw && (raw.manaRepeat || (raw.effectData && raw.effectData.manaRepeat))),
    // **effectData も見ること。** 強化カード（活性化など）由来のマナ効果は、
    // オンラインでは effectData.manaThresholdDesc に入って届く。ここを見ないと
    // 効果文が空のまま閾値だけ発火し、「発動しているのに何も起きない」状態になる。
    manaThresholdDesc: String(raw && (raw.manaThresholdDesc || raw._manaThresholdDesc
      || (raw.effectData && raw.effectData.manaThresholdDesc)) || ''),
    // その効果の固有VFXを引くためのカードNo.（活性化＝E045等）。
    // 効果文と同じ経路で運ぶ。落とすと演出側が「どの効果か」を知れない。
    manaThresholdNo: String(raw && (raw.manaThresholdNo || raw._manaThresholdNo
      || (raw.effectData && raw.effectData.manaThresholdNo)) || ''),
    // シートの「VFX/SE」列。そのカードの効果で使う演出の番号（No.とは別に指定できる）。
    fxCode: String(raw && raw.fxCode || ''),
    // シートの「マナ順位」。小さいほど先に処理する。空欄なら未設定のまま。
    manaOrder: Number(raw && raw.manaOrder),
    manaThresholdOrder: Number(raw && (raw.manaThresholdOrder != null ? raw.manaThresholdOrder
      : (raw._manaThresholdOrder != null ? raw._manaThresholdOrder
        : (raw.effectData && raw.effectData.manaThresholdOrder)))),
    extraManaThresholds: Array.isArray(raw && raw.extraManaThresholds)
      ? raw.extraManaThresholds.map(x => ({ ...x }))
      : (Array.isArray(raw && raw._extraManaThresholds) ? raw._extraManaThresholds.map(x => ({ ...x })) : []),
    weakenOnHit: Math.max(0, Number(raw && raw.weakenOnHit) || 0),
    ringInjuryHp: Math.max(0, Number(raw && raw.ringInjuryHp) || 0),
    equipment: Array.isArray(raw && raw.equipment) ? raw.equipment.map(x => ({ ...x })) : [],
    effectData: raw && raw.effectData && typeof raw.effectData === 'object' ? {
      ...raw.effectData,
      extraManaThresholds: Array.isArray(raw.effectData.extraManaThresholds)
        ? raw.effectData.extraManaThresholds.map(x => ({ ...x })) : [],
      adjacentAbilities: Array.isArray(raw.effectData.adjacentAbilities) ? raw.effectData.adjacentAbilities.slice() : [],
      effectNames: Array.isArray(raw.effectData.effectNames) ? raw.effectData.effectNames.slice() : [],
      effectTexts: Array.isArray(raw.effectData.effectTexts) ? raw.effectData.effectTexts.map(String) : [],
      effectScales: { ...(raw.effectData.effectScales || {}) },
      releaseAtkBonus: Number(raw._releaseAtkBonus) || Number(raw.effectData.releaseAtkBonus) || 0,
      releaseHpBonus: Number(raw._releaseHpBonus) || Number(raw.effectData.releaseHpBonus) || 0,
    } : {},
    // 編成時に算出された魔導板効果は、表示用equipmentだけでなく
    // 戦闘判定用の補助フィールドにも保持する。PvE/PvPで同じ判定入力にする。
    _adjacentPanelAbilities: Array.isArray(raw && raw._adjacentPanelAbilities)
      ? raw._adjacentPanelAbilities.slice()
      : (Array.isArray(raw && raw.effectData && raw.effectData.adjacentAbilities)
        ? raw.effectData.adjacentAbilities.slice() : []),
    _adjacentPanelEffectTexts: Array.isArray(raw && raw._adjacentPanelEffectTexts)
      ? raw._adjacentPanelEffectTexts.map(String)
      : (Array.isArray(raw && raw.effectData && raw.effectData.effectTexts)
        ? raw.effectData.effectTexts.map(String) : []),
    _adjacentPanelStrategyCount: Number(raw && raw._adjacentPanelStrategyCount)
      || Number(raw && raw.effectData && raw.effectData.strategyCount) || 0,
    _uniteGroups: Array.isArray(raw && raw._uniteGroups) ? raw._uniteGroups.slice() : [],
    _resonanceEffectNames: Array.isArray(raw && raw._resonanceEffectNames)
      ? raw._resonanceEffectNames.slice()
      : (Array.isArray(raw && raw.effectData && raw.effectData.effectNames)
        ? raw.effectData.effectNames.slice() : []),
    _resonanceEffectScales: { ...(raw && raw._resonanceEffectScales || raw && raw.effectData && raw.effectData.effectScales || {}) },
    _releaseAtkBonus: Number(raw && raw._releaseAtkBonus) || Number(raw && raw.effectData && raw.effectData.releaseAtkBonus) || 0,
    _releaseHpBonus: Number(raw && raw._releaseHpBonus) || Number(raw && raw.effectData && raw.effectData.releaseHpBonus) || 0,
    _effectRepeatBonus: Number(raw && (raw._effectRepeatBonus ?? raw.effectRepeatBonus)) ||
      Number(raw && raw.effectData && raw.effectData.effectRepeatBonus) || 0,
    _tripleMerged: !!(raw && raw._tripleMerged),
    _merged: !!(raw && raw._merged),
    _releaseConvertedToOpening: !!(raw && raw._releaseConvertedToOpening),
    boss: !!(raw && raw.boss),
    _useEnemyVisualFrame: !!(raw && raw._useEnemyVisualFrame),
    _summonedBySuccubus: !!(raw && raw._summonedBySuccubus),
    _voidWalkerBonus: Math.max(0, Number(raw && raw._voidWalkerBonus) || 0),
    _lichShadowSummon: !!(raw && raw._lichShadowSummon),
    slot: index,
    // 復活は開戦時のバフ適用前の値を使う。召喚体もここで生成時の基礎値を固定する。
    _baseAtk: baseAtk,
    _baseMaxHp: baseMaxHp,
  };
}

// 変身・コピーで引き継ぐ、効果判定用の状態。新しい効果フィールドを追加する時に
// 召喚経路ごとの引き継ぎ漏れを作らないよう、両経路でこの一覧を共有する。
const CORE_UNIT_EFFECT_STATE_FIELDS = [
  'manaOnAttack', 'manaOnInjury', 'manaOnDeath', 'goldOnBattleEnd', 'goldOnDeath',
  'randomItemOnBattleEnd', 'randomItemCost', 'manaCost', 'manaRepeat', 'manaThresholdDesc', 'manaThresholdNo', 'manaOrder', 'manaThresholdOrder', 'fxCode',
  'extraManaThresholds', 'weakenOnHit', 'effectRepeatBonus', '_effectRepeatBonus',
  '_adjacentPanelEffectTexts', '_resonanceEffectNames', '_resonanceEffectScales',
  '_adjacentPanelAbilities', '_adjacentPanelStrategyCount', '_uniteGroups',
  '_manaThresholdDesc', '_manaThresholdNo', '_manaThresholdOrder', '_extraManaThresholds',
];

function coreCopyUnitEffectState(target, source, { resetMissing = false } = {}) {
  if (!target || !source) return target;
  CORE_UNIT_EFFECT_STATE_FIELDS.forEach(key => {
    let value = source[key];
    if (value === undefined && key === '_adjacentPanelEffectTexts') value = source.effectData && source.effectData.effectTexts;
    if (value === undefined && key === '_adjacentPanelAbilities') value = source.effectData && source.effectData.adjacentAbilities;
    if (value === undefined && key === '_resonanceEffectNames') value = source.effectData && source.effectData.effectNames;
    if (value === undefined && key === '_resonanceEffectScales') value = source.effectData && source.effectData.effectScales;
    if (value === undefined && key === 'manaThresholdDesc') value = source._manaThresholdDesc;
    if (value === undefined && key === 'manaThresholdNo') value = source._manaThresholdNo;
    if (value === undefined && key === 'manaThresholdOrder') value = source._manaThresholdOrder;
    if (value === undefined && key === 'extraManaThresholds') value = source._extraManaThresholds;
    if (value === undefined && key === 'effectRepeatBonus') value = source._effectRepeatBonus;
    if (value === undefined && key === '_effectRepeatBonus') value = source.effectRepeatBonus;
    if (value !== undefined) {
      target[key] = Array.isArray(value)
        ? value.map(x => (x && typeof x === 'object' ? { ...x } : x))
        : (value && typeof value === 'object' ? { ...value } : value);
    } else if (resetMissing) {
      target[key] = key === 'randomItemOnBattleEnd' || key === 'manaRepeat' ? false
        : key === '_resonanceEffectScales' ? {}
          : Array.isArray(target[key]) || key.includes('Thresholds') || key.includes('Abilities')
            || key.includes('EffectNames') || key.includes('EffectTexts') || key === '_uniteGroups' ? [] : 0;
    }
  });
  return target;
}

function coreIsAlive(u) { return !!u && u.hp > 0; }
// 行動できるユニット（封印中は行動しない）。判定は coreCanAct が唯一の実装。
function coreLivingUnits(units) { return (units || []).filter(coreCanAct); }

// 外へ出すユニット情報。演出側・保存側はこの形だけを見る。
function coreUnitSnapshot(u) {
  return {
    id: u.id, name: u.name, side: u.side, lane: u.lane,
    atk: u.atk, hp: Math.max(0, u.hp), maxHp: u.maxHp,
    color: u.color, race: u.race, sfxType: u.sfxType || '', no: u.no || '', art: u.art || '', keywords: u.keywords.slice(),
    desc: u.desc, guardian: u.guardian, hate: u.hate, hateTurns: u.hateTurns,
    stealth: u.stealth, _sealed: u._sealed, _panelSummoned: u._panelSummoned,
    shield: u.shield, weaken: u.weaken,
    artCode: u.artCode || u._artCode || u.no || '',
    imageNo: u.imageNo || u.artCode || u._artCode || u.no || '',
    poison: Math.max(0, Number(u.poison) || 0),
    manaOnAttack: Math.max(0, Number(u.manaOnAttack) || 0),
    manaOnInjury: Math.max(0, Number(u.manaOnInjury) || 0),
    manaOnDeath: Math.max(0, Number(u.manaOnDeath) || 0),
    goldOnBattleEnd: Math.max(0, Number(u.goldOnBattleEnd) || 0),
    goldOnDeath: Math.max(0, Number(u.goldOnDeath) || 0),
    randomItemOnBattleEnd: !!u.randomItemOnBattleEnd,
    randomItemCost: Math.max(0, Number(u.randomItemCost) || 0),
    manaCost: Math.max(0, Number(u.manaCost) || 0),
    manaRepeat: !!u.manaRepeat,
    manaThresholdDesc: String(u.manaThresholdDesc || u._manaThresholdDesc || ''),
    manaThresholdNo: String(u.manaThresholdNo || u._manaThresholdNo || ''),
    fxCode: String(u.fxCode || ''),
    manaOrder: Number(u.manaOrder),
    manaThresholdOrder: Number(u.manaThresholdOrder != null ? u.manaThresholdOrder : u._manaThresholdOrder),
    extraManaThresholds: Array.isArray(u.extraManaThresholds) ? u.extraManaThresholds.map(x => ({ ...x })) : [],
    weakenOnHit: Math.max(0, Number(u.weakenOnHit) || 0),
    ringInjuryHp: Math.max(0, Number(u.ringInjuryHp) || 0),
    equipment: Array.isArray(u.equipment) ? u.equipment.map(x => ({ ...x })) : [],
    effectData: u.effectData ? {
      ...u.effectData,
      extraManaThresholds: Array.isArray(u.effectData.extraManaThresholds)
        ? u.effectData.extraManaThresholds.map(x => ({ ...x })) : [],
      adjacentAbilities: Array.isArray(u.effectData.adjacentAbilities) ? u.effectData.adjacentAbilities.slice() : [],
      effectNames: Array.isArray(u.effectData.effectNames) ? u.effectData.effectNames.slice() : [],
      effectTexts: Array.isArray(u.effectData.effectTexts) ? u.effectData.effectTexts.map(String) : [],
      effectScales: { ...(u.effectData.effectScales || {}) },
    } : {},
    _adjacentPanelAbilities: Array.isArray(u._adjacentPanelAbilities)
      ? u._adjacentPanelAbilities.slice() : [],
    _adjacentPanelEffectTexts: Array.isArray(u._adjacentPanelEffectTexts)
      ? u._adjacentPanelEffectTexts.slice() : [],
    _uniteGroups: Array.isArray(u._uniteGroups) ? u._uniteGroups.slice() : [],
    _adjacentPanelStrategyCount: Number(u._adjacentPanelStrategyCount) || 0,
    _resonanceEffectNames: Array.isArray(u._resonanceEffectNames)
      ? u._resonanceEffectNames.slice() : [],
    _resonanceEffectScales: { ...(u._resonanceEffectScales || {}) },
    releaseAtkBonus: Number(u._releaseAtkBonus) || Number(u.effectData && u.effectData.releaseAtkBonus) || 0,
    releaseHpBonus: Number(u._releaseHpBonus) || Number(u.effectData && u.effectData.releaseHpBonus) || 0,
    _effectRepeatBonus: Number(u._effectRepeatBonus) || 0,
    _tripleMerged: !!u._tripleMerged,
    _merged: !!u._merged,
    _releaseConvertedToOpening: !!u._releaseConvertedToOpening,
    _mapPanelPower: String(u._mapPanelPower || ''),
    _openingDuplicate: !!u._openingDuplicate,
    summonCount: Math.max(1, Number(u.summonCount) || 1),
    boss: !!u.boss,
    _terrainMapNo: Number(u._terrainMapNo) || 0,
    _useEnemyVisualFrame: !!u._useEnemyVisualFrame,
    _sealInfinity: !!u._sealInfinity,
    _summonedBySuccubus: !!u._summonedBySuccubus,
    _lichShadowSummon: !!u._lichShadowSummon,
    no: u.no || '',
    art: u.art || '',
  };
}

// 初期状態を作る。PvEもPvPもこの形に揃えてからコアへ渡す。
function createBattleState(setup) {
  const src = (setup && setup.sides) || {};
  const units = {};
  BATTLE_CORE_SIDES.forEach(side => {
    const list = Array.isArray(src[side] && src[side].units) ? src[side].units : [];
    // PvEの盤面配列は未使用スロットをnullで保持する。コア内部では
    // nullをユニットとして扱わず、元のスロット番号だけを維持する。
    units[side] = list.map((u, i) => {
      if (!u) return null;
      return createCoreUnit(u, side, i);
    }).filter(Boolean);
  });
  coreRefreshVoidWalkerBonus({ units });
  return {
    units,
    summonDefs: Array.isArray(setup && setup.summonDefs) ? setup.summonDefs.map(x => ({ ...x })) : [],
    itemDefs: Array.isArray(setup && setup.itemDefs) ? setup.itemDefs.map(x => ({ ...x })) : [],
    rings: {
      p1: Array.isArray(setup && setup.rings && setup.rings.p1) ? setup.rings.p1.map(x => ({ ...x })) : [],
      p2: Array.isArray(setup && setup.rings && setup.rings.p2) ? setup.rings.p2.map(x => ({ ...x })) : [],
    },
    items: {
      p1: Array.isArray(setup && setup.items && setup.items.p1) ? setup.items.p1.map(x => ({ ...x })) : [],
      p2: Array.isArray(setup && setup.items && setup.items.p2) ? setup.items.p2.map(x => ({ ...x })) : [],
    },
    resources: {
      p1: { mana: Math.max(0, Number(setup && setup.resources && setup.resources.p1 && setup.resources.p1.mana) || 0), gold: Math.max(0, Number(setup && setup.resources && setup.resources.p1 && setup.resources.p1.gold) || 0) },
      p2: { mana: Math.max(0, Number(setup && setup.resources && setup.resources.p2 && setup.resources.p2.mana) || 0), gold: Math.max(0, Number(setup && setup.resources && setup.resources.p2 && setup.resources.p2.gold) || 0) },
    },
    mapIndex: Math.max(1, Number(setup && setup.mapIndex) || 1),
    turn: 0,
    lane: { p1: { lane: 'front', attacked: new Set() }, p2: { lane: 'front', attacked: new Set() } },
    blood: {
      p1: Math.max(0, Number(setup && setup.blood && setup.blood.p1) || 0),
      p2: Math.max(0, Number(setup && setup.blood && setup.blood.p2) || 0),
    },
    deadUnits: [],
    // UI側の実際の盤面上限と一致させる。固定値14のままだと、盤面が10枠の
    // 実機ではコアが余分な召喚を先に生成し、描画フラッシュ時に左端へ現れる。
    maxUnits: {
      p1: typeof MAX_ALLIES === 'number' ? MAX_ALLIES : 14,
      p2: typeof MAX_ENEMIES === 'number' ? MAX_ENEMIES : 14,
    },
  };
}

// そのレーンでまだ攻撃していないユニットを左から1体。両レーン一巡したら前衛から再開。
// そのレーンで「手番を得られる」ユニットの配列インデックス一覧。
// PvE（battle.js の _laneAttackCandidates）が唯一の正。ATK0は手番を飛ばすが、
// 毒を持つキャラクターは毒ダメージ処理のために手番を得る、という規則を含む。
// isEnemySide は PvE の敵側判定と同じ意味（PvPでは p2 を指す）。
function coreLaneAttackCandidates(units, lane, isEnemySide) {
  const list = units || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const u = list[i];
    if (!u || u.hp <= 0) continue;
    if (coreIsSealed(u)) continue;
    if (isEnemySide && u._isObject) continue;
    if (!isEnemySide && (u._isSoul || u._isObject)) continue;
    if (coreUnitHasKeyword(u, '防戦')) continue;
    if ((u.lane || 'front') !== lane) continue;
    const atkVal = isEnemySide
      ? ((Number(u.nullified) || 0) > 0 ? 0 : (Number(u.atk) || 0))
      : coreAttackDamage(u);
    if ((atkVal || 0) <= 0 && !((Number(u.poison) || 0) > 0)) continue;
    out.push(i);
  }
  return out;
}

// 次に行動するユニットを選ぶ。PvE の _pickLaneAttacker と同じ手順にすること。
//   ① 今のレーンでまだ攻撃していない先頭
//   ② いなければ反対レーンの先頭（attacked を引き継がず、レーンを切り替えて巡回を作り直す）
//   ③ 反対レーンにも居なければ、同じレーンを新しい巡回として再開する
// ②で attacked を無視するのがPvEの規則。ここをコア独自の実装に戻すと攻撃順が食い違う。
function corePickAttacker(units, laneState, isEnemySide) {
  const list = units || [];
  const cand = lane => coreLaneAttackCandidates(list, lane, isEnemySide);
  const current = cand(laneState.lane).filter(i => !laneState.attacked.has(list[i].id));
  if (current.length) return list[current[0]];
  const otherLane = laneState.lane === 'front' ? 'rear' : 'front';
  const other = cand(otherLane);
  if (other.length) {
    laneState.lane = otherLane;
    laneState.attacked = new Set();
    return list[other[0]];
  }
  const resetCurrent = cand(laneState.lane);
  if (resetCurrent.length) {
    laneState.attacked = new Set();
    return list[resetCurrent[0]];
  }
  return null;
}

// ダメージ適用。結果の量と死亡を返す。イベントは emit で外へ流す。
// 受ける量と無効化の判定は coreResolveIncomingDamage が唯一の実装。
function coreApplyDamage(target, amount, emit, opts) {
  const raw = Math.max(0, Math.round(Number(amount) || 0));
  const res = coreResolveIncomingDamage(target, raw, opts);
  if (res.blocked) {
    if (res.consumesShield) target.shield = Math.max(0, (target.shield || 0) - 1);
    emit({ type: 'damage', side: target.side, unitId: target.id, amount: 0, hpAfter: target.hp,
      blockedBy: res.reason, sourceId: opts && opts.sourceId, counter: !!(opts && opts.counter),
      keywordEffect: opts && opts.keywordEffect || null,
      suppressAttackHitSfx: !!(opts && opts.suppressAttackHitSfx),
      damageKind: (opts && opts.damageKind) || 'other',
      redirectedFrom: opts && opts.redirectedFrom || null });
    // **残った結界の数をイベントに載せる。** オンラインの受け口はコアの実体を持たず
    // イベントの値だけで盤面を作るため、これが無いと結界が減ったことが伝わらず、
    // キャラクター上の shield.png と結界バッジが消えなかった。
    if (res.reason === 'shield') emit({ type: 'shield_lost', side: target.side, unitId: target.id, shield: Math.max(0, Number(target.shield) || 0) });
    return { blocked: true, amount: 0, died: false, reason: res.reason };
  }
  const dmg = res.amount;
  if (!coreIsAlive(target) || !dmg) return { blocked: false, amount: 0, died: false };
  target.hp = Math.max(0, target.hp - dmg);
  emit({ type: 'damage', side: target.side, unitId: target.id, amount: dmg, hpAfter: target.hp,
    sourceId: opts && opts.sourceId, counter: !!(opts && opts.counter),
    keywordEffect: opts && opts.keywordEffect || null,
    redirectedFrom: opts && opts.redirectedFrom || null,
    // ダメージの種別。再生側はこれが変わったら別の束として順に見せる。
    damageKind: (opts && opts.damageKind) || 'other',
    // このダメージを起こした効果のカードNo.（炎の矢＝E058）。専用の命中演出に使う。
    effectNo: (opts && opts.effectNo) || null,
    // 同じ効果で同時に入ったダメージの印。再生側はこれが同じものを**同時に**見せる。
    // 1体ずつ順に解決していても、見せ方は「一度に起きたこと」に揃えるため。
    batch: (opts && opts.batch) || null,
    // 通常攻撃は runBattleCore が _coreAttackContact を立てる。その他の命中は
    // キャラクター効果由来として、再生側が専用VFX/SEを選べるように明示する。
    // **呼び出し側が明示した値を上書きしないこと。** 以前はここで
    // 「発生元があって反撃でない＝効果」と決め打ちしていたため、
    // coreResolveHit が false を渡していても通常攻撃が効果扱いになり、
    // 攻撃するたびに攻撃者の固有VFX・固有SEが出ていた（アラッサス／ゴーレム）。
    effect: (opts && opts.effect !== undefined) ? !!opts.effect
      : !!(opts && opts.sourceId && !opts.counter),
    suppressAttackHitSfx: !!(opts && opts.suppressAttackHitSfx),
  });
  if (target.hp <= 0) {
    emit({ type: 'death', side: target.side, unitId: target.id });
    return { blocked: false, amount: dmg, died: true };
  }
  return { blocked: false, amount: dmg, died: false };
}

// ── データ駆動トリガ／命中キーワード／毒（PvE・オンライン共通） ─────────────
function coreManaEffectRepeat(unit) {
  return 1 + Math.max(0, coreEffectCount(unit, 'マナの種'));
}
function coreGainResource(state, side, kind, amount, unit, emit, reason, options) {
  let value = Math.max(0, Number(amount) || 0);
  // **元の量が0なら何も起きない。** 攻撃・負傷のたびに「0マナ得る」で呼ばれるため、
  // ここで抜けないと下の加算（マーメイドの+1）が0を1に変え、
  // マナ効果を持たないキャラクターが攻撃・負傷するたびにマナが増えていた。
  if (!value) return 0;
  if (kind === 'mana' && unit && !(options && options.skipManaRepeat)) value *= coreManaEffectRepeat(unit);
  // マーメイドの効果文と名前／強化データは同じ効果を別表現で保持する。
  // 表現ごとに加算すると、緑キャラクターからのマナだけが二重になる。
  if (kind === 'mana' && unit && String(unit.color || '') === '緑') {
    const holders = (state && state.units && state.units[side]) || [];
    value += holders.filter(x => x && x.hp > 0 && !coreIsSealed(x)
      && (coreHasEffect(x, 'マーメイド')
        || /緑のキャラクターから得るマナは\+1される/.test(coreUnitEffectText(x)))).length;
  }
  if (kind === 'gold' && coreRingCount(state, side, '強欲の指輪')) value *= 1.2;
  if (!state || !state.resources || !state.resources[side] || !value) return 0;
  state.resources[side][kind] = Math.max(0, Number(state.resources[side][kind]) || 0) + value;
  emit({ type: kind === 'mana' ? 'mana_gain' : 'gold_gain', side, unitId: unit && unit.id, amount: value, reason: reason || '',
    // 死亡トリガでは、表示側の詰め処理が先に走っても効果元を解決できるよう
    // イベントにカード状態のスナップショットを保持する（ルール計算は変更しない）。
    unit: unit ? coreUnitSnapshot(unit) : null,
    // 閾値イベントは演出の逆再生開始時に deferredAfter を復元するため、
    // その中で追加されたマナを再生側がもう一度加算してはいけない。
    deferredAppliedByThreshold: !!(options && options.deferredAppliedByThreshold) });
  if (kind === 'mana') {
    (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && coreHasEffect(x, '蝕の翼"スコル・ハティ"')).forEach(x => {
      const target = value * 4 + (Number(x._manaScaleApplied) || 0);
      const delta = target - (Number(x._manaScaleApplied) || 0);
      if (delta > 0) {
        x.atk += delta; x.maxHp += delta; x.hp += delta; x._manaScaleApplied = target;
        emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: delta, hp: delta, reason: 'skoll_hati' });
      }
    });
    const opposingMana = Number(state.resources[side === 'p1' ? 'p2' : 'p1'].mana) || 0;
    (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && /このキャラクターは\+X\/\+Xを得る。Xは敵が持つマナの4倍に等しい/.test(coreUnitEffectText(x))).forEach(x => {
      const target = opposingMana * 4;
      const previous = Number(x._genericEnemyManaBuff) || 0;
      const delta = target - previous;
      if (delta > 0) {
        x.atk += delta; x.maxHp += delta; x.hp += delta; x._genericEnemyManaBuff = target;
        emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: delta, hp: delta, reason: 'enemy_mana_passive' });
      }
    });
  }
  return value;
}

// 編成データに manaOnAttack が残らない経路でも、攻撃効果の本文から同じ値を
// 解決する。呼び出し側で別実装を持たず、オンラインとPvEで共通の値にする。
function coreManaOnAttackValue(unit) {
  const explicit = Math.max(0, Number(unit && unit.manaOnAttack) || 0);
  if (explicit) return explicit;
  const text = coreUnitTriggerText(unit, '攻撃');
  const match = String(text || '').match(/(?:^|[：:]\s*)(\d+)マナを得る/);
  return match ? Math.max(0, Number(match[1]) || 0) : 0;
}

// 幸運の指輪：ダメージ確定後の対象HPが7/77/777になった時、同じゴールドイベントを出す。
function coreApplyLuckyRing(target, damageDone, state, emit) {
  const hp = Number(target && target.hp) || 0;
  if (!(Number(damageDone) > 0) || !target || ![7, 77, 777].includes(hp)
    || !coreRingCount(state, 'p1', '幸運の指輪')) return 0;
  return coreGainResource(state, 'p1', 'gold', hp, null, emit, 'lucky_ring');
}

// 1ヒット分の状態遷移を即時に解決する共通入口。
// PvEはこの結果を演出へ接続し、オンラインはそのままイベント列へ流す。
// applyHitは二次効果から再帰的に呼ばれるため、反撃・死亡効果・召喚も同じ順序で処理される。
// options.deferTriggers=true の場合は、ダメージの確定と分散だけを行い、
// 負傷・死亡・命中キーワード・マナ等のトリガは一切発火しない。
// 同じ効果で同時に入るダメージへ、ひとまとまりの印を付ける。
// **これはルールを変えない。** 解決の順番・結果はそのままで、再生側が
// 「同時に起きたこと」として見せられるようにするための目印だけを足す。
// 入れ子になっても最初の印を保つ（誘発の中の別効果まで同じ束にしない）。
// ダメージの種別。**処理も表示も、この順で1種類ずつ片付ける。**
// 戦闘ダメージの最中に死亡効果のダメージを出す、といった混在をしないための印。
// 数字が並ぶ順は再生側が決めるが、「どれが同じ種類か」はここが唯一の正。
const CORE_DAMAGE_KIND_ORDER = [
  'attack_effect',           // 攻撃効果で発生するダメージ（アラッサス等）
  'attack_effect_triggered', // 攻撃効果で誘発するダメージ（ペガサス／マナ生成からの炎の矢等）
  'combat',                  // 戦闘ダメージ（攻撃と反撃）
  'injury_effect',           // 負傷効果で発生するダメージ（メデューサ等）
  'death_effect',            // 死亡効果で発生するダメージ（闇の炎等）
  'other',                   // 上のどれでもないもの（毒・開戦効果・アイテム等）
];

// 種別を切り替えて中身を実行する。**内側が勝つ**（戦闘ダメージの誘発で起きた
// 死亡効果は death_effect）。入れ子から抜けたら必ず元へ戻す。
function coreWithDamageKind(state, kind, fn) {
  if (!state) return fn();
  const prev = state._coreDamageKind;
  state._coreDamageKind = kind;
  try { return fn(); } finally { state._coreDamageKind = prev; }
}
function coreDamageKind(state) {
  const kind = state && state._coreDamageKind;
  return CORE_DAMAGE_KIND_ORDER.includes(kind) ? kind : 'other';
}

// 同時に見せるダメージの束。**種別が変わったら必ず別の束にする。**
// 入れ子（戦闘ダメージの束の中で死亡効果が起きる等）があるので積んで持つ。
// 種別を見ずに「既に束があるなら使い回す」とすると、闇の炎のダメージが
// 戦闘ダメージと同じ束になり、再生側が同時に出してしまう。
function coreBeginDamageBatch(state) {
  if (!state) return false;
  const kind = coreDamageKind(state);
  if (state._coreDamageBatch && state._coreDamageBatchKind === kind) return false;
  const stack = state._coreDamageBatchStack || (state._coreDamageBatchStack = []);
  stack.push({ id: state._coreDamageBatch || null, kind: state._coreDamageBatchKind || null });
  state._coreDamageBatchSeq = (Number(state._coreDamageBatchSeq) || 0) + 1;
  state._coreDamageBatch = 'b' + state._coreDamageBatchSeq;
  state._coreDamageBatchKind = kind;
  return true;
}
function coreEndDamageBatch(state) {
  if (!state) return;
  const stack = state._coreDamageBatchStack || [];
  const prev = stack.pop() || { id: null, kind: null };
  state._coreDamageBatch = prev.id;
  state._coreDamageBatchKind = prev.kind;
}

// 複数の対象へ同時に作用するダメージ。**全員に入れてから、対象の並び順で誘発する。**
// 1体ずつ「ダメージ→その体の誘発」を解決すると、割り込み攻撃（ミノタウロス）や
// 負傷効果（ギガンテス）が残りの対象へのダメージより先に起き、
// 並び順によって結果が変わってしまう。
function coreHitAll(state, rng, emit, applyHit, source, targets, amount) {
  const list = (targets || []).filter(Boolean);
  if (!list.length || !(amount > 0)) return;
  const batched = coreBeginDamageBatch(state);
  const pending = [];
  try {
    list.forEach(t => applyHit(source, t, amount, false, false, false,
      { deferTriggers: true, collect: pending }));
  } finally { if (batched) coreEndDamageBatch(state); }
  pending.forEach(h => coreApplyHitTriggers(state, h.source, h.target, h.result, h.before,
    h.counter, rng, emit, applyHit, h.damageKind ? { ...h.opt, damageKind: h.damageKind } : h.opt));
}

function coreResolveHit(state, source, target, amount, counter, rng, emit, options) {
  if (!state || !target || target.hp <= 0 || !(amount > 0)) return { amount: 0, died: false };
  const opt = options || {};
  const units = state.units || { p1: [], p2: [] };
  const applyHit = (nextSource, nextTarget, nextAmount, nextCounter, skipSourceEffects, skipTough) =>
    coreResolveHit(state, nextSource, nextTarget, nextAmount, nextCounter, rng, emit, {
      skipSourceEffects: !!skipSourceEffects, skipTough: !!skipTough,
      deferTriggers: !!opt.deferTriggers, collect: opt.collect,
    });
  if (source) target._lastDamageSource = source;
  target._lastDamageWasCounter = !!counter;
  if (!opt.skipSourceEffects && Array.isArray(target._uniteGroups) && target._uniteGroups.length) {
    const members = (units[target.side] || []).filter(x => x && x.hp > 0 && !coreIsSealed(x)
      && Array.isArray(x._uniteGroups) && x._uniteGroups.some(g => target._uniteGroups.includes(g)));
    if (members.length >= 2 && !target._uniteSplit) {
      const distributable = Math.max(0, Number(amount) - coreToughValue(target));
      const share = Math.floor(distributable / members.length);
      let remainder = distributable - share * members.length;
      if (share > 0 || remainder > 0) {
        let result = { amount: 0, died: false };
        members.forEach(member => {
          const part = share + (remainder-- > 0 ? 1 : 0);
          if (part > 0) {
            const r = coreResolveHit(state, source, member, part, counter, rng, emit, {
              skipSourceEffects: true, skipTough: member === target,
              deferTriggers: !!opt.deferTriggers,
            });
            result.amount += r.amount || 0;
            result.died = result.died || !!r.died;
          }
        });
        return result;
      }
    }
  }
  if (!opt.skipSourceEffects && amount >= 2 && !coreHasEffect(target, 'マータ')) {
    const mata = (units[target.side] || []).find(x => x && x !== target && x.hp > 0
      && !coreIsSealed(x) && coreHasEffect(x, 'マータ') && (Number(x.shield) || 0) <= 0);
    if (mata) {
      const split = coreMataSplit(mata, amount);
      const primary = coreResolveHit(state, source, target, split.target, counter, rng, emit,
        { skipSourceEffects: true, deferTriggers: !!opt.deferTriggers, collect: opt.collect });
      const shared = split.redirected > 0
        ? coreResolveHit(state, source, mata, split.redirected, counter, rng, emit,
          { deferTriggers: !!opt.deferTriggers, collect: opt.collect, redirectedFrom: target.id })
        : { amount: 0, died: false };
      return { amount: primary.amount || 0, died: !!(primary.died || shared.died) };
    }
  }
  if (source && source._coreAttackContact && !counter
    && /攻撃はHPではなくATKにダメージを与える/.test(coreUnitTriggerText(source, '攻撃'))) {
    const damage = Math.min(Math.max(0, Number(target.atk) || 0), Math.max(0, Math.round(Number(amount) || 0)));
    target.atk = Math.max(0, (Number(target.atk) || 0) - damage);
    const fled = target.atk <= 0;
    if (fled) { target.hp = 0; target._fled = true; }
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk: -damage, hp: 0, reason: 'attack_to_atk' });
    emit({ type: 'damage', side: target.side, unitId: target.id, amount: damage, hpAfter: target.hp,
      sourceId: source.id, counter: false, damageTo: 'atk', effect: false,
      damageKind: coreDamageKind(state), batch: state._coreDamageBatch || null,
      redirectedFrom: opt.redirectedFrom || null });
    // **逃走はダメージの後に出す。** 先に出すと再生側が先に盤面から外してしまい、
    // 「-X／ATK」の数値が出る場所が無くなって飛ばされる（実機で飛んでいた）。
    if (fled) emit({ type: 'fled', side: target.side, unitId: target.id, sourceId: source.id });
    return { blocked: false, amount: damage, died: false, fled: !!target._fled };
  }
  const before = target.hp;
  const result = coreApplyDamage(target, amount, emit, {
    sourceId: source && source.id, counter: !!counter, skipTough: !!opt.skipTough,
    redirectedFrom: opt.redirectedFrom || null,
    batch: state._coreDamageBatch || null,
    damageKind: coreDamageKind(state),
    // effectNo：このダメージを起こした効果のカードNo.（炎の矢＝E058）。
    // 再生側が「対象に当たった瞬間」の専用演出を選ぶために使う。
    effectNo: coreDamageEffectNo(state, source),
    effect: !!opt.effect || !!(source && !source._coreAttackContact && !counter),
    suppressAttackHitSfx: !!opt.suppressAttackHitSfx,
  });
  if (result.amount > 0) {
    // 「常時：キャラクターがダメージを受けるたび、このキャラクターは+N/+Nを得る。」
    // **カード名ではなく本文で判定し、加算値も本文から読む**（合体後は+2/+2）。
    // 陣営を問わず、誰かがダメージを受けるたびに発動する。
    [...(state.units.p1 || []), ...(state.units.p2 || [])].filter(x => x && x.hp > 0).forEach(x => {
      const m = coreUnitEffectText(x)
        .match(/キャラクターがダメージを受けるたび、このキャラクターは\+(\d+)\/\+(\d+)を得る/);
      if (!m) return;
      const atk = Number(m[1]) || 0, hp = Number(m[2]) || 0;
      if (!atk && !hp) return;
      x.atk = Math.max(0, x.atk + atk); x.maxHp = Math.max(1, x.maxHp + hp); x.hp += hp;
      coreEmitPassiveFlash(emit, x);
      // sourceId＝その常時効果の持ち主。演出側が「誰の効果か」を決めるのに要る。
      emit({ type: 'stat_change', side: x.side, unitId: x.id, atk, hp, reason: 'shana_damage', sourceId: x.id });
    });
  }
  // 誘発（結界喪失・命中キーワード・負傷・死亡）はここから。
  // deferTriggers が立っている場合は今は発火させず、collect に積んで
  // 呼び出し側が「全員にダメージを入れ終えてから」まとめて解決する。
  if (opt.deferTriggers) {
    // 誘発を後でまとめて解決する時、**原因が戦闘ダメージだったか効果ダメージだったか**は
    // その場でしか分からない（解決時は既に別の種別に切り替わっている）。ここで控える。
    if (Array.isArray(opt.collect)) opt.collect.push({ source, target, result, before, counter: !!counter, opt,
      damageKind: coreDamageKind(state) });
    return result;
  }
  coreApplyHitTriggers(state, source, target, result, before, counter, rng, emit, applyHit, opt);
  return result;
}

// 1回の命中の後に起きること。coreResolveHit から切り出したもの。
// 「全員にダメージを入れてから、まとめて誘発」を実現するために、
// ダメージの確定（coreResolveHit）と誘発（ここ）を分けられるようにしている。
function coreApplyHitTriggers(state, source, target, result, before, counter, rng, emit, applyHit, options) {
  const opt = options || {};
  if (!state || !target || !result) return;
  // 負傷（ダメージを受けて生き残った）時の処理。**根性で耐えた時もここを通す。**
  const runInjuryTriggers = () => {
    coreTriggerManaOnInjury(target, state, emit);
  const repeats = 1 + coreRingCount(state, target.side, '激怒の指輪')
      + coreEffectCount(target, '執念の炎')
    // 反復ボーナスは createCoreUnit() が _effectRepeatBonus へ正規化するため、
    // effectData だけを見ると絆・3枚合体の分がオンラインで落ちる。
      + Math.max(0, Number(target._effectRepeatBonus) || Number(target.effectData && target.effectData.effectRepeatBonus) || 0);
    for (let i = 0; i < repeats && target.hp > 0; i++) {
    const injuryEventSeq = state._coreInjuryEventSeq = (Number(state._coreInjuryEventSeq) || 0) + 1;
      coreApplyInjuryEffects(target, result.amount, state, rng, emit, applyHit, source, `${injuryEventSeq}:${i}`,
        opt.damageKind || coreDamageKind(state));
    }
  };
  if (result.blocked && result.reason === 'shield') {
    coreApplyShieldLostEffects(target, state, rng, emit, applyHit);
  }
  if (result.amount > 0) {
    coreApplyLuckyRing(target, result.amount, state, emit);
    if (source && !opt.skipSourceEffects) {
      const keywordResult = coreApplyKeywordOnHit(source, target, result.amount, before, state, emit);
      if (keywordResult && keywordResult.killed) emit({ type: 'death', side: target.side, unitId: target.id });
      if (keywordResult && keywordResult.cursed && source.hp <= 0) {
        coreTriggerDeath(source, state, emit);
        coreApplyDeathEffects(source, state, rng, emit, applyHit);
        coreTryRevive(source, state, emit);
      }
    }
    if (target.hp > 0) {
      runInjuryTriggers();
      if (source && coreHasEffect(source, 'バジリスク')
        && rng && typeof rng.next === 'function' && rng.next() < 0.01 && target.hp > 0) {
        target.hp = 0;
        emit({ type: 'instant_death', side: target.side, unitId: target.id, sourceId: source.id, reason: 'basilisk' });
        coreTriggerDeath(target, state, emit);
        coreApplyDeathEffects(target, state, rng, emit, applyHit);
        coreApplyDeathObservers(target, state, rng, emit, applyHit);
        coreTryRevive(target, state, emit);
      }
    }
  }
  if (target.hp <= 0) {
    // 根性は「死亡ダメージを受ける時、一度だけHP1で生き残る」＝**死亡ではない**。
    // 死亡効果・死亡観測へ進める前にHP1へ戻し、代わりに負傷効果を発動する。
    const gutsSaved = coreTryGuts(target, state, emit);
    if (gutsSaved) {
      if (result.amount > 0) runInjuryTriggers();
    } else {
      coreTriggerDeath(target, state, emit);
      coreApplyDeathEffects(target, state, rng, emit, applyHit);
      coreApplyDeathObservers(target, state, rng, emit, applyHit);
      coreTryRevive(target, state, emit);
    }
  }
}

// 根性で耐えられるならHP1で生き残らせる（消費は一度だけ）。耐えた時は true。
// **死亡扱いにしないこと。** 死亡効果・血・死亡観測はどれも発動しない。
function coreTryGuts(unit, state, emit) {
  if (!unit || unit.hp > 0 || unit._starterRegenUsed) return false;
  // **coreTryRevive と同じ優先順で判定する。** ここで先に呼ぶと、復活や復活の指輪を
  // 「根性のつもり」で使い切ってしまう。
  if (unit.side === 'p1' && !state._revivalRingUsed && coreRingCount(state, 'p1', '復活の指輪') > 0) return false;
  const keyword = coreUnitKeywords(unit).find(x => x === '復活' || x === '根性');
  if (keyword !== '根性') return false;
  return coreTryRevive(unit, state, emit) === '根性';
}

// 命中時キーワードの数値部分。加護・指輪・ログ・死亡処理は呼び出し側に残し、
// PvEとオンラインが同じ加算値を使うための純粋な共通計算にする。
function coreKeywordHitAmounts(attacker, damageDone) {
  const keywords = coreUnitKeywords(attacker);
  return {
    instantDeath: keywords.includes('即死'),
    poisonFang: coreKeywordSum({ keywords }, '毒牙', true),
    poison: coreKeywordSum({ keywords }, '毒', true),
    evilEye: coreKeywordSum({ keywords }, '邪眼', true),
    shock: Math.max(0, Number(attacker && attacker.weakenOnHit) || 0)
      + coreKeywordSum({ keywords }, '衝撃', true),
    lifeDrain: keywords.includes('生命吸収')
      ? Math.max(0, Number(damageDone) || 0) : 0,
  };
}

// ATK獲得を監視する常時効果。数値変更の発生元に依存せず、PvE/PvPで同じ
// イベント列を出す。効果ダメージ自身で再入しても、実際のATK獲得だけを起点にする。
// 「ランダムな敵2体に…」のように**重複しない対象をN体**選ぶ。
// 候補がN体に満たない場合はいる分だけ。合体後の効果文は体数だけが違うことが多いので、
// **体数は必ず本文から読むこと**（カード名で分岐して数を書かない）。
function corePickDistinct(rng, list, count) {
  const pool = (list || []).filter(Boolean);
  const need = Math.max(0, Math.floor(Number(count) || 0));
  const out = [];
  while (out.length < need && pool.length) {
    const i = rng && typeof rng.int === 'function' ? rng.int(0, pool.length - 1) : 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
// 本文の「N体」。書かれていなければ1体。
function coreTextTargetCount(text) {
  const m = String(text || '').match(/(\d+)体/);
  return Math.max(1, Number(m && m[1]) || 1);
}

// マータ：味方が受けるダメージの肩代わり。**分け方は本文で決まる。**
//   本文（現行）：ダメージを1にし、1を超えた分をこのキャラクターが代わりに受ける
//   合体後　　　：1を超えた分の**半分**だけを代わりに受ける（残りは消える）
//   旧本文　　　：2以上のダメージの半分を代わりに受ける
function coreMataSplit(mata, amount) {
  const total = Math.max(0, Math.floor(Number(amount) || 0));
  const text = coreUnitEffectText(mata);
  if (/ダメージを1にし/.test(text)) {
    const excess = Math.max(0, total - 1);
    const redirected = /1を超えた分の半分/.test(text) ? Math.floor(excess / 2) : excess;
    return { target: Math.min(1, total), redirected };
  }
  const redirected = Math.floor(total / 2);
  return { target: total - redirected, redirected };
}

function coreTriggerAtkGainEffects(target, amount, state, rng, emit, applyHit) {
  if (!target || target.hp <= 0 || Number(amount) <= 0 || !coreHasEffect(target, 'ワイバーン')
    || !state || !rng || typeof rng.pick !== 'function' || typeof applyHit !== 'function') return;
  if (target._coreAtkGainEffectDepth) return;
  // 対象の体数もダメージ量も**本文から読む**（合体後は体数だけが増える）。
  const wyvernText = coreUnitEffectText(target);
  const hit = wyvernText.match(/ATKを得るたび、ランダムな敵(?:(\d+)体)?に(\d+)ダメージ/);
  const count = Math.max(1, Number(hit && hit[1]) || 1);
  const damage = Math.max(0, Number(hit && hit[2]) || 2);
  const foes = (state.units[target.side === 'p1' ? 'p2' : 'p1'] || [])
    .filter(x => x && x.hp > 0 && !coreIsSealed(x));
  const picked = corePickDistinct(rng, foes, count);
  if (!picked.length || damage <= 0) return;
  target._coreAtkGainEffectDepth = true;
  try {
    coreEmitPassiveFlash(emit, target);
    picked.forEach(foe => { if (foe.hp > 0) applyHit(target, foe, damage); });
  } finally {
    delete target._coreAtkGainEffectDepth;
  }
}

function coreEffectKey(value) {
  return String(value || '').replace(/[“”＂]/g, '"').replace(/[‘’]/g, "'").trim();
}
function coreUnitEffectNames(unit) {
  const out = new Set([coreEffectKey(unit && unit.name)]);
  (unit && unit.keywords || []).forEach(k => out.add(coreEffectKey(k)));
  (unit && unit.effectData && unit.effectData.effectNames || []).forEach(k => out.add(coreEffectKey(k)));
  (unit && unit.effectData && unit.effectData.adjacentAbilities || []).forEach(k => out.add(coreEffectKey(k)));
  (unit && unit._resonanceEffectNames || []).forEach(k => out.add(coreEffectKey(k)));
  (unit && unit._adjacentPanelAbilities || []).forEach(k => out.add(coreEffectKey(k)));
  return out;
}

function coreHasEffect(unit, name) { return coreUnitEffectNames(unit).has(coreEffectKey(name)); }
function coreEffectCount(unit, name) {
  const wanted = coreEffectKey(name);
  // 強化カードは同じ効果名を keywords と effectNames の両方へ保持するため、
  // 表現形式を足し合わせると1枚の強化が2回分として発動する。
  const isSelf = coreEffectKey(unit && unit.name) === wanted;
  const keywordCount = (unit && unit.keywords || []).filter(x => coreEffectKey(x) === wanted).length;
  const data = unit && unit.effectData || {};
  const effectNameCount = (data.effectNames || []).filter(x => coreEffectKey(x) === wanted).length;
  const adjacentCount = (data.adjacentAbilities || []).filter(x => coreEffectKey(x) === wanted).length;
  const resonanceCount = (unit && unit._resonanceEffectNames || []).filter(x => coreEffectKey(x) === wanted).length;
  const panelCount = (unit && unit._adjacentPanelAbilities || []).filter(x => coreEffectKey(x) === wanted).length;
  const extra = Math.max(keywordCount, effectNameCount, adjacentCount, resonanceCount, panelCount);
  return isSelf ? Math.max(1, extra) : extra;
}
function coreConnectedEnhancementCount(unit) {
  const textCount = Array.isArray(unit && unit._adjacentPanelEffectTexts)
    ? unit._adjacentPanelEffectTexts.length : 0;
  const equipmentCount = Array.isArray(unit && unit.equipment)
    ? unit.equipment.filter(x => x && String(x.category || '') !== 'キャラクター').length : 0;
  // 効果文は1枚の強化カードから複数件になることがあるため、接続枚数の
  // 代替値として優先してはいけない。実カード配列を正とし、旧データで
  // equipmentだけ欠落している場合に限って効果文数へフォールバックする。
  return equipmentCount || textCount;
}
function coreRingCount(state, side, name) {
  return (state && state.rings && state.rings[side] || []).filter(x => x && String(x.name || x) === String(name || '')).length;
}
// 召喚体を盤面配列のどこへ入れるかを決める。**位置の決定はここが唯一の実装。**
// 末尾へ push すると、表示のために前衛右端へ並べ替えるPvEと配列の順序が食い違い、
// 前衛優先・隣接（三方向）・ランダム対象の結果がオンラインとずれる。
// 規則：効果元の右隣が指定されていればその直後、無ければ前衛ブロックの右端。
function coreInsertSummonedUnit(list, child, spec, frontSlots) {
  const limit = Math.max(1, Number(frontSlots) || 7);
  const occupied = u => u && u.hp > 0 && !u._isObject && !u._isSoul;
  const frontIndexes = [];
  for (let i = 0; i < list.length && frontIndexes.length < limit; i++) {
    const u = list[i];
    if (occupied(u) && (u.lane || 'front') !== 'rear') frontIndexes.push(i);
  }
  child.lane = 'front';
  let at = frontIndexes.length ? frontIndexes[frontIndexes.length - 1] + 1 : 0;
  // 位置指定がある場合は基準ユニットの左右へ入れる。
  // 「両隣へ2体」（ワーム）は leftOfTarget と rightOfTarget で区別する。
  // どちらも右隣として扱うと、2体目が1体目を押し出して並びが入れ替わり、
  // 以後の対象選択がPvEとオンラインで食い違う。
  const place = spec && spec.placement;
  const targetId = spec && spec.placementTargetId != null ? String(spec.placementTargetId) : null;
  if (place === 'leftOfSource' || place === 'leftOfTarget'
    || place === 'rightOfSource' || place === 'rightOfTarget' || targetId != null) {
    const si = targetId != null ? list.findIndex(u => u && String(u.id) === targetId) : -1;
    if (si >= 0) at = (place === 'leftOfSource' || place === 'leftOfTarget') ? si : si + 1;
  }
  list.splice(at, 0, child);
  return at;
}

// 「この戦闘中、召喚された味方は+X/+Yを得る」（ファントム／エイドロン）。
// **陣営ごとに戦闘中ずっと積み上がる。** 以後に召喚された体へ、召喚時に加算する。
function coreAddSummonBuff(state, side, atk, hp, emit, sourceId) {
  if (!state || !side || (!atk && !hp)) return;
  state._summonBuff = state._summonBuff || { p1: { atk: 0, hp: 0 }, p2: { atk: 0, hp: 0 } };
  const cur = state._summonBuff[side] || (state._summonBuff[side] = { atk: 0, hp: 0 });
  cur.atk = Math.max(0, (Number(cur.atk) || 0) + (Number(atk) || 0));
  cur.hp = Math.max(0, (Number(cur.hp) || 0) + (Number(hp) || 0));
  if (typeof emit === 'function') {
    emit({ type: 'summon_buff', side, atk: Number(atk) || 0, hp: Number(hp) || 0,
      totalAtk: cur.atk, totalHp: cur.hp, sourceId: sourceId || null });
  }
}
function coreSummonBuffOf(state, side) {
  const b = state && state._summonBuff && state._summonBuff[side];
  return { atk: Math.max(0, Number(b && b.atk) || 0), hp: Math.max(0, Number(b && b.hp) || 0) };
}

function coreSummonUnit(state, side, spec, emit, sourceId) {
  const list = state.units[side] || (state.units[side] = []);
  // 召喚上限は配列長ではなく、生存中の実ユニット数で判定する。
  // 上限到達後にイベントだけ生成すると、PvE側の配置失敗時フォールバックで
  // 配列末尾へ押し込まれ、前衛外や画面外へ表示される。
  const summonLimit = Math.max(1, Number(state.maxUnits && state.maxUnits[side]) || Number(state.maxUnits) || 14);
  const liveCount = list.filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul).length;
  // 召喚されたキャラクターは前衛の右端にだけ出る。前衛が埋まっていたら召喚しない。
  // 後衛へ逃がすと陣営の上限を超え、編成していない後衛枠に現れたり、
  // 画面に出ない体ができたりする。開戦の召喚（ミテーラ等）も同じ扱い。
  // 後衛に並ぶのは編成で配置したカードだけ。
  const frontSlots = Math.max(1, Number(state.frontSlots) || 7);
  const liveFront = list.filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul
    && (x.lane || 'front') !== 'rear').length;
  const frontFull = liveFront >= frontSlots;
  if (liveCount >= summonLimit || frontFull) {
    // 上限超過は召喚イベント／盤面変更を発生させない。ただし、実機の
    // 回帰検証で「試行されたが拒否された」ことを追跡できるよう記録イベントだけ出す。
    if (typeof emit === 'function') emit({
      type: 'summon_rejected', side, sourceId: sourceId || null,
      name: String(spec && spec.name || ''), liveCount: liveCount, max: summonLimit,
      reason: 'summon_limit'
    });
    return null;
  }
  const sourceUnit = [...(state.units.p1 || []), ...(state.units.p2 || [])].find(x => x && x.id === sourceId);
  const wanted = String(spec && spec.name || '').replace(/[“”＂]/g, '"');
  const defs = Array.isArray(state.summonDefs) ? state.summonDefs : [];
  const def = defs.find(x => {
    if (!x) return false;
    const name = String(x.name || '').replace(/[“”＂]/g, '"');
    return name === wanted || `${x.color || ''}${name}` === wanted;
  }) || {};
  const source = { ...def, ...spec,
    atk: spec && spec.atk != null ? spec.atk : (def.power ?? def.atk),
    hp: spec && spec.hp != null ? spec.hp : (def.life ?? def.hp),
    maxHp: spec && spec.maxHp != null ? spec.maxHp : (def.life ?? def.maxHp ?? def.hp),
    desc: spec && spec.desc ? spec.desc : (def.desc || ''),
    keywords: spec && Array.isArray(spec.keywords) && spec.keywords.length ? spec.keywords : (def.keywords || []),
    effectData: { ...(def.effectData || {}), ...(spec && spec.effectData || {}) },
  };
  // 敵側の戦闘中召喚は、通常モードと同じく召喚元の現在戦力の80%にする。
  // 召喚元をIDで解決できない指輪由来などは、明示された値をそのまま使う。
  if (side === 'p2' && sourceUnit) {
    source.atk = Math.max(0, Math.round((Number(sourceUnit.atk) || 0) * 0.8));
    source.hp = Math.max(1, Math.round((Number(sourceUnit.maxHp || sourceUnit.hp) || 1) * 0.8));
    source.maxHp = source.hp;
  }
  // PvEの負傷・マナ効果は呼び出しごとに薄いコアstateを作り直すため、
  // state内の連番だけでは同じ召喚元から常に同じIDが再生成される。表示側が
  // 同一IDを既存ユニットとして再利用してしまうと、召喚数が増えず、召喚体の
  // 遅延・位置ずれ・攻撃対象との不一致が同時に起きる。盤面全体の既存IDと
  // 衝突しない番号を採用し、stateをまたぐPvEでも一意性を保証する。
  const idBase = `${sourceId || side}-summon-`;
  const usedIds = new Set([...((state.units && state.units.p1) || []), ...((state.units && state.units.p2) || [])]
    .filter(Boolean).map(x => String(x.id || '')));
  let summonSeq = Math.max(0, Number(state._summonSeq) || 0);
  let summonId = '';
  do { summonSeq += 1; summonId = `${idBase}${summonSeq}`; } while (usedIds.has(summonId));
  state._summonSeq = summonSeq;
  const child = createCoreUnit({
    id: summonId,
    // 色は戦闘データとして保持するが、表示名には付けない（「青スケルトン」ではなく「スケルトン」）。
    name: String(source.name || '').replace(/^[赤青緑黄紫黒]/, ''), atk: Number(source.atk) || 0, hp: Number(source.hp) || 1, maxHp: Number(source.maxHp) || 1,
    color: source.color || '', lane: source.lane || 'front', race: source.race || '', keywords: source.keywords || [],
    no: source.no || source.artCode || '', art: source.art || '', sfxType: source.sfxType || source.attackSfx || '',
    desc: source.desc || '', effectData: source.effectData, _panelSummoned: true,
    manaOnAttack: source.manaOnAttack, manaOnInjury: source.manaOnInjury, manaOnDeath: source.manaOnDeath,
    goldOnBattleEnd: source.goldOnBattleEnd, goldOnDeath: source.goldOnDeath,
    manaCost: source.manaCost, manaRepeat: source.manaRepeat, manaThresholdDesc: source.manaThresholdDesc || source._manaThresholdDesc,
    manaThresholdNo: source.manaThresholdNo || source._manaThresholdNo,
    fxCode: source.fxCode,
    manaOrder: source.manaOrder,
    manaThresholdOrder: source.manaThresholdOrder != null ? source.manaThresholdOrder : source._manaThresholdOrder,
    extraManaThresholds: source.extraManaThresholds, weakenOnHit: source.weakenOnHit,
    equipment: source.equipment, _adjacentPanelAbilities: source._adjacentPanelAbilities,
    _resonanceEffectNames: source._resonanceEffectNames,
    _openingDuplicate: !!source._openingDuplicate,
    boss: !!source.boss,
    // サキュバスで敵カードを味方化した場合は、名前・数値だけでなく
    // 敵側カード枠の表示指定も召喚イベントへ引き継ぐ。
    _useEnemyVisualFrame: spec && Object.prototype.hasOwnProperty.call(spec, '_useEnemyVisualFrame')
      ? !!spec._useEnemyVisualFrame : !!source._useEnemyVisualFrame,
    _summonedBySuccubus: !!source._summonedBySuccubus,
  }, side, list.length);
  coreCopyUnitEffectState(child, source);
  // コアは同一同期処理中の後続効果から召喚体を参照できる必要がある一方、
  // PvE描画側がイベントを再生するまでは盤面スロットを占有させてはいけない。
  // フラッシュ側でイベント順に退避・再配置するための内部印。
  child._corePendingSummon = true;
  // **戦闘中に召喚された体のマナ効果は、召喚されてから得たマナだけで発動する。**
  // 印を付けないと、その時点で溜まっているマナぶん（「3マナ毎」なら現在マナ÷3回）を
  // いきなり撃ち切る。開戦の召喚は盤面の初期配置と同じ扱いなので印を付けない。
  if (!state._openingPhase) {
    child._manaThresholdBaseline = Math.max(0, Number(state.resources
      && state.resources[side] && state.resources[side].mana) || 0);
  }
  // 紫修正は盤面ぜんぶを作り直す（召喚された体にも、既にいる体にも同じ値が乗る）。
  child._voidWalkerBonus = (state.units[side] || []).some(x => x && coreHasEffect(x, 'ヴォイド・ウォーカー'))
    && child.color === '紫' ? 1 : 0;
  // 召喚時の共通受動効果。カード名ではなく、現在の戦闘状態に存在する効果を参照する。
  const summonCount = (state._summonCount = state._summonCount || {})[side] || 0;
  const addStats = (target, atk, hp, reason) => {
    atk = coreStatBonus(target, atk, sourceUnit); hp = coreStatBonus(target, hp, sourceUnit);
    target.atk += atk; target.maxHp += hp; target.hp += hp;
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason, sourceId: sourceId || null });
  };
  const sideUnits = list.filter(x => x && x.hp > 0);
  const activeItems = state.items && state.items[side] || [];
  const colorRingMap = { '赤い瞳の指輪': '赤', '青い瞳の指輪': '青', '緑の瞳の指輪': '緑', '黄い瞳の指輪': '黄', '黄の瞳の指輪': '黄', '紫の瞳の指輪': '紫' };
  const matchingColorRings = (state.rings && state.rings[side] || [])
    .filter(r => colorRingMap[String(r && r.name || r || '')] === String(child.color || '')).length;
  if (!state._openingPhase && matchingColorRings) addStats(child, matchingColorRings * 10, matchingColorRings * 10, 'color_ring_summon');
  const bondCount = activeItems.filter(item => String(item && item.itemEffectKey || item && item.key || '') === 'bond_scroll').length;
  if (!state._openingPhase && bondCount) addStats(child, bondCount * 5, bondCount * 5, 'bond_scroll_summon');
  // 「戦闘中に召喚される」は開戦時の召喚も含む（街・編成画面ではない、という意味）。
  // 以前は開戦を除外していたため、ミテーラ等の開戦召喚に
  // ナーガのバフも光の指輪の結界も付かなかった。
  if (sideUnits.some(x => coreHasEffect(x, 'ナーガ'))) addStats(child, summonCount + 1, summonCount + 1, 'naga_summon');
  sideUnits.filter(x => !coreHasEffect(x, 'ナーガ')
    && /戦闘中に召喚される味方は\+1\/\+1を得る/.test(coreUnitEffectText(x)))
    .forEach(() => addStats(child, summonCount + 1, summonCount + 1, 'summon_scaling_buff'));
  // 「この戦闘中、召喚された味方は+X/+Yを得る」（ファントム／エイドロン）。
  // **効果が発動した後に召喚された体だけ**が受け取る（積み上がった合計を1回で足す）。
  const summonBuff = coreSummonBuffOf(state, side);
  if (summonBuff.atk || summonBuff.hp) addStats(child, summonBuff.atk, summonBuff.hp, 'summon_buff');
  if (coreRingCount(state, side, '光の指輪')) {
    child.shield = (Number(child.shield) || 0) + 1;
    emit({ type: 'keyword_effect', effect: 'shield', side, unitId: child.id, amount: 1, reason: 'light_ring' });
  }
  // 召喚師の指輪：常時：戦闘中に召喚された味方は+5/+5を得る。
  const summonerRings = coreRingCount(state, side, '召喚師の指輪');
  if (summonerRings) addStats(child, summonerRings * 5, summonerRings * 5, 'summoner_ring');
  if (!child._openingDuplicate) {
    const wild = coreEffectCount(child, '野生の力');
    if (wild) coreGainResource(state, side, 'mana', wild * 2, child, emit, 'wild_power_summon');
  }
  coreInsertSummonedUnit(list, child, spec, frontSlots);
  // 召喚でヴォイド・ウォーカー自身が現れることもあるので、盤面全体を作り直す。
  coreRefreshVoidWalkerBonus(state);
  state._summonCount[side] = summonCount + 1;
  coreApplyWargThreshold(state, side, emit);
  emit({ type: 'summon', side, sourceId, placement: spec && spec.placement || '',
    placementTargetId: spec && spec.placementTargetId || null, unit: coreUnitSnapshot(child) });
  // リッチの召喚反応は、生成したシャドウ自身には再帰させない。
  // リッチは名前・強化データ・効果文のいずれの形でも同じ効果として扱う。
  // 魔導板からの写し取りでは名前が別名になることがあるため、効果文だけの
  // 保持も許容する。シャドウ自身には再帰させない。
  const hasLichSummonEffect = sideUnits.some(x => x && (
    coreHasEffect(x, 'リッチ')
    || /味方が召喚された時[、,]?「青シャドウ」を1体召喚する/.test(coreUnitEffectText(x))
  ));
  if (wanted !== '青シャドウ' && child.name !== 'シャドウ' && hasLichSummonEffect) {
    // 誘発元は「召喚を起こしたキャラクター」ではなく、今生成した子キャラ。
    // これを sourceId にすると、複数召喚時に全シャドウが元キャラの左隣へ
    // 挿入され、召喚単位の [本体→シャドウ] 順が崩れる。
    if (state._deferLichSummons) {
      (state._pendingLichSummons || (state._pendingLichSummons = [])).push({ side, sourceId: child.id });
    } else {
      coreSummonUnit(state, side, {
        name: '青シャドウ', atk: 1, hp: 1, color: '青', placement: 'rightOfSource',
      }, emit, child.id);
    }
  }
  return child;
}

// 複数体召喚を1つの効果として扱う場合、リッチの誘発は本体列の後ろへまとめる。
function coreFlushPendingLichSummons(state, emit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!state || !Array.isArray(state._pendingLichSummons) || state._flushingLichSummons) return;
  state._flushingLichSummons = true;
  try {
    const pending = state._pendingLichSummons.splice(0);
    // 開戦など、1つの効果が複数体をまとめて召喚した場合は、本体列の後ろへ
    // シャドウ列をまとめて置く。通常の閾値・負傷効果は1回ごとにここへ来るため、
    // その場合は従来どおり本体の直後へ置き、表示順をイベント順と一致させる。
    const batched = pending.length > 1;
    pending.forEach(({ side, sourceId }) => coreSummonUnit(state, side, {
      name: '青シャドウ', atk: 1, hp: 1, color: '青', placement: batched ? 'rightEdge' : 'rightOfSource',
    }, emit, sourceId));
  } finally {
    state._flushingLichSummons = false;
  }
  } finally { coreEndSummonBatch(state, emit); }
}
// 変身は表示名だけでなく、変身先カードの戦闘データ全体を置き換える。
function coreTransformUnit(state, target, name, emit, overrides) {
  if (!target || target.hp <= 0) return false;
  const wanted = String(name || '').replace(/[“”＂]/g, '"');
  const defs = Array.isArray(state && state.summonDefs) ? state.summonDefs : [];
  const def = defs.find(x => x && (String(x.name || '').replace(/[“”＂]/g, '"') === wanted
    || `${x.color || ''}${String(x.name || '').replace(/[“”＂]/g, '"')}` === wanted)) || {};
  const old = coreUnitSnapshot(target);
  const oldName = target.name;
  const atk = Number(overrides && overrides.atk != null ? overrides.atk : def.power ?? def.atk ?? target.atk) || 0;
  const maxHp = Number(overrides && overrides.maxHp != null ? overrides.maxHp : def.life ?? def.maxHp ?? def.hp ?? target.maxHp) || 1;
  target.name = String(def.name || wanted);
  target.atk = Math.max(0, atk);
  target.maxHp = Math.max(1, maxHp);
  target.hp = Math.max(1, Number(overrides && overrides.hp != null ? overrides.hp : target.maxHp) || target.maxHp);
  if (def.color || overrides && overrides.color) target.color = String(overrides && overrides.color || def.color);
  if (def.race || overrides && overrides.race) target.race = String(overrides && overrides.race || def.race);
  // 変身は戦闘値だけでなく、表示アセットも変身先カードへ置換する。
  // これを省くとドラゴネット／バンダースナッチ等が旧カード絵・旧枠のまま残る。
  if (def.art || overrides && overrides.art) target.art = String(overrides && overrides.art || def.art);
  if (def.no || def.artCode || overrides && (overrides.no || overrides.artCode)) {
    const artCode = String(overrides && (overrides.artCode || overrides.no) || def.no || def.artCode);
    target.artCode = artCode;
    target._artCode = artCode;
    target.no = artCode;
  }
  if (def.imageNo || overrides && overrides.imageNo) {
    target.imageNo = String(overrides && overrides.imageNo || def.imageNo);
  } else if (target.artCode) {
    target.imageNo = target.artCode;
  }
  if (Array.isArray(def.keywords)) target.keywords = def.keywords.map(String);
  if (def.desc != null) target.desc = String(def.desc || '');
  target.effectData = (def.effectData && typeof def.effectData === 'object') ? { ...def.effectData } : {};
  // 変身先のデータ駆動効果も同時に置換する。旧形態の効果を残さない。
  coreCopyUnitEffectState(target, def, { resetMissing: true });
  target.poison = 0; target.weaken = 0; target.shield = coreUnitShieldValue(target);
  emit({ type: 'transform', side: target.side, unitId: target.id, name: target.name,
    atk: target.atk, hp: target.hp, maxHp: target.maxHp, from: oldName, unit: coreUnitSnapshot(target) });
  return true;
}
function coreApplyOpeningItems(state, rng, emit, applyHit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  ['p1', 'p2'].forEach(side => (state.items && state.items[side] || []).forEach(item => {
    const key = String(item && (item.itemEffectKey || item.key || '') || '');
    const allies = (state.units[side] || []).filter(Boolean);
    const foes = (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
    const live = xs => xs.filter(x => x && x.hp > 0 && !coreIsSealed(x));
    // 絆の巻物は封印解放より前の常時効果。オフライン旧経路と同じく、
    // 生存している味方なら封印中でも適用する。
    if (key === 'bond_scroll') allies.filter(x => x && x.hp > 0).forEach(x => {
      x.atk += 5; x.maxHp += 5; x.hp += 5;
      emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: 5, hp: 5, reason: 'bond_scroll' });
    });
    if (key === 'shield_scroll') live(allies).filter(x => x.lane !== 'rear').forEach(x => {
      x.shield = (Number(x.shield) || 0) + 1;
      emit({ type: 'keyword_effect', effect: 'shield', side: x.side, unitId: x.id, amount: 1, sourceId: item.id });
    });
    if (key === 'giant_scroll') {
      const target = live(allies).sort((a, b) => b.maxHp - a.maxHp)[0];
      if (target) {
        const atk = target.atk, hp = target.maxHp;
        target.atk *= 2; target.maxHp *= 2; target.hp *= 2;
        emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason: 'giant_scroll' });
      }
    }
    if (key === 'meteor_scroll') live(foes).forEach(target => applyHit(null, target, Math.max(1, Math.ceil(target.hp / 2))));
    if (key === 'weakening_scroll') live(foes).forEach(target => {
      target.weaken = (Number(target.weaken) || 0) + 2;
      emit({ type: 'keyword_effect', effect: 'weaken', side: target.side, unitId: target.id, amount: 2, sourceId: item.id });
    });
    if (key === 'mana_scroll') coreGainResource(state, side, 'mana', 3, null, emit, 'mana_scroll');
    if (key === 'inspire_flag') live(allies).filter(x => x.lane !== 'rear').forEach(x => {
      x.keywords = coreUnitKeywords(x).concat(['根性']);
      emit({ type: 'keyword_effect', effect: 'keyword_gain', side: x.side, unitId: x.id, keyword: '根性', sourceId: item.id });
    });
    if (key === 'silence_scroll') live(foes).forEach(x => { x._silenced = true; });
    if (key === 'underworld_scroll') live(allies).filter(x => x.lane !== 'rear').forEach(x => {
      coreApplyDeathEffects(x, state, rng, emit, applyHit);
      coreApplyDeathObservers(x, state, rng, emit, applyHit);
      // これは死亡ではなく事前発動なので、実際の死亡時のために一回性フラグを戻す。
      delete x._coreDeathEffectsTriggered;
      delete x._coreDeathObserved;
    });
    if (key === 'sacrifice_doll') {
      const sealed = (allies || []).filter(x => x && x.hp > 0 && coreIsSealed(x));
      const target = rng && typeof rng.pick === 'function' ? rng.pick(sealed) : sealed[0];
      if (target) { target._sealed = false; delete target._sealValue; emit({ type: 'seal_release', side, unitId: target.id, required: 0, fromItem: true }); }
    }
    if (key === 'illusion_scroll') for (let i = 0; i < 3; i++) {
      // 直接pushすると召喚上限・リッチの召喚誘発・召喚イベントの配置情報を
      // すべて迂回し、上限超過体が一時的に画面へ出る原因になる。開戦アイテム
      // 由来でも通常召喚と同じコア入口を使う。
      coreSummonUnit(state, side, {
        name: '青ワイルドハント', atk: 20, hp: 20, maxHp: 20, color: '青', lane: 'front'
      }, emit, item.id);
    }
  }));
  } finally { coreEndSummonBatch(state, emit); }
}
function coreApplyOpeningRings(state, emit, applyHit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  const rings = state.rings || {};
  const colors = { '赤い瞳の指輪': '赤', '青い瞳の指輪': '青', '緑の瞳の指輪': '緑', '黄の瞳の指輪': '黄', '紫の瞳の指輪': '紫' };
  ['p1', 'p2'].forEach(side => (rings[side] || []).forEach(ring => {
    const name = String(ring && ring.name || ring || '');
    const color = colors[name];
    if (color) (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === color).forEach(x => {
      x.atk += 10; x.maxHp += 10; x.hp += 10;
      emit({ type: 'stat_change', side, unitId: x.id, atk: 10, hp: 10, reason: 'color_ring' });
    });
  }));
  const p1 = (state.units.p1 || []).filter(Boolean), p2 = (state.units.p2 || []).filter(Boolean);
  if (coreRingCount(state, 'p1', '虹の瞳の指輪')) {
    const unique = new Set(p1.filter(x => x.hp > 0 && !coreIsSealed(x)).map(x => x.color).filter(Boolean));
    const n = Math.min(5, unique.size) * 3;
    p1.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
      x.atk += n; x.maxHp += n; x.hp += n;
      emit({ type: 'stat_change', side: 'p1', unitId: x.id, atk: n, hp: n, reason: 'rainbow_ring' });
    });
  }
  const pain = coreRingCount(state, 'p1', '苦行の指輪');
  for (let i = 0; i < pain; i++) coreHitAll(state, rng, emit, applyHit, null, p1.filter(x => x.hp > 0 && !coreIsSealed(x)), 1);
  if (coreRingCount(state, 'p1', '強靭の指輪')) p1.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.ringInjuryHp = (Number(x.ringInjuryHp) || 0) + 1;
    emit({ type: 'keyword_effect', effect: 'injury_grant', side: 'p1', unitId: x.id, keyword: '負傷：全ての味方はHP+1を得る。' });
  });
  if (coreRingCount(state, 'p1', '威圧の指輪')) p2.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.weaken = (Number(x.weaken) || 0) + 2;
    emit({ type: 'keyword_effect', effect: 'weaken', side: 'p2', unitId: x.id, amount: 2 });
  });
  if (coreRingCount(state, 'p1', '神速の指輪')) {
    const left = p1.find(x => x.hp > 0);
    if (left) { left.atk *= 2; emit({ type: 'stat_change', side: 'p1', unitId: left.id, atk: left.atk / 2, hp: 0, reason: 'speed_ring' }); }
  }
  if (coreRingCount(state, 'p1', '聖騎士の指輪')) p1.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    const hp = x.maxHp; x.maxHp *= 2; x.hp *= 2;
    emit({ type: 'stat_change', side: 'p1', unitId: x.id, atk: 0, hp, reason: 'paladin_ring' });
  });
  } finally { coreEndSummonBatch(state, emit); }
}

// 開戦時のデータ駆動効果。カード名分岐ではなく、キーワード／効果文／強化データを入力にする。
// コア状態の識別子。**stateオブジェクトそのものをユニットへ持たせてはいけない。**
// state.units.p1 はそのユニット自身を含むため循環参照になり、clone()／JSON.stringify() が
// 「Converting circular structure to JSON」で例外を投げる。実際に生贄の
// スナップショット（_sacrificeUnitsForSeal の clone(u)）で戦闘が止まった。
// 再入判定には、この軽い文字列トークンだけを使うこと。
let _coreStateTokenSeq = 0;
function coreStateToken(state) {
  if (!state) return '';
  if (!state._coreStateToken) state._coreStateToken = `cs${++_coreStateTokenSeq}`;
  return state._coreStateToken;
}

// 効果発動時の発光を再生側へ伝える。色・尺は共通プレゼンテーション層が決める。
// 「常時：〜たび」のように**誘発する**常時効果が発動した合図（白く光る）。
// 「常時：緑のキャラクターから得るマナは+1される」のような受動的な補正は
// そもそもイベントを出さないので光らない（呼ばない）。
// このダメージへ載せる「効果のカードNo.」。**その効果の持ち主が与えたダメージにだけ載せる。**
// 効果の解決中に誘発で割り込んだ別のキャラクターのダメージ（メデューサの負傷＝
// 「受けたダメージぶんをランダムな敵へ」）まで同じ番号を載せると、再生側が
// 「その効果の演出で見せるダメージ」と判断し、**そのキャラクター自身の
// 固有VFX/SEが一切出なくなる**（presentDamageVfxSource）。
// 「Xマナ毎」の到達回数。**戦闘中に召喚された体は、召喚されてから得たマナだけを数える**
// （`_manaThresholdBaseline`＝召喚された瞬間のマナ）。印が無い体は従来どおり全マナで数える。
// unit：その効果を持つキャラクター。強化カード由来の効果は owner が効果そのものなので、
// 印はキャラクター側にしか無い（両方を見る）。
function coreManaThresholdProgress(state, side, t, unit) {
  const mana = Math.max(0, Number(state && state.resources && state.resources[side]
    && state.resources[side].mana) || 0);
  const baseline = Math.max(
    Number(t && t.owner && t.owner._manaThresholdBaseline) || 0,
    Number(unit && unit._manaThresholdBaseline) || 0, 0);
  const cost = Math.max(1, Number(t && t.cost) || 1);
  return Math.floor(Math.max(0, mana - baseline) / cost);
}

function coreDamageEffectNo(state, source) {
  if (!state || !state._coreEffectNo) return null;
  const owner = state._coreEffectOwnerId;
  if (owner != null && (!source || source.id !== owner)) return null;
  return state._coreEffectNo;
}

function coreEmitPassiveFlash(emit, unit) {
  coreEmitEffectFlash(emit, unit, 'passive');
}

function coreEmitEffectFlash(emit, unit, trigger, count) {
  if (typeof emit !== 'function' || !unit || !unit.id) return;
  emit({ type: 'effect_flash', side: unit.side, unitId: unit.id, trigger,
    count: Math.max(1, Number(count) || 1) });
}

function coreApplyOpeningEffects(unit, state, rng, emit, applyHit, triggerIndex) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!unit || unit.hp <= 0 || coreIsSealed(unit)) return;
  // 同一コア状態・同一トリガ番号の再入だけを拒否する。恩寵などの正規の
  // 反復発動は triggerIndex が変わるため維持し、PvE/PvP接続側の同一処理
  // 再走査による召喚・マナ・結界・バフの重複だけを止める。
  const openingIndex = Number.isInteger(triggerIndex) ? triggerIndex : 0;
  const openingToken = coreStateToken(state);
  if (unit._coreOpeningEffectsState === openingToken && unit._coreOpeningEffectsIndex === openingIndex) return;
  unit._coreOpeningEffectsState = openingToken;
  unit._coreOpeningEffectsIndex = openingIndex;
  const allies = (state.units[unit.side] || []).filter(Boolean);
  const foes = (state.units[unit.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const desc = coreUnitTriggerText(unit, '開戦');
  if (String(desc || '').trim()) coreEmitEffectFlash(emit, unit, 'opening');
  if (unit._releaseConvertedToOpening && !unit._openingReleaseFired) {
    unit._openingReleaseFired = true;
    coreApplyReleaseEffects(unit, [], state, rng, emit, applyHit);
  }
  const addStats = (target, atk, hp, reason) => {
    if (!target || target.hp <= 0 || coreIsSealed(target)) return;
    atk = coreStatBonus(target, atk, unit); hp = coreStatBonus(target, hp, unit);
    target.atk = Math.max(0, target.atk + atk);
    target.maxHp = Math.max(1, target.maxHp + hp);
    target.hp = Math.max(0, target.hp + hp);
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason, sourceId: unit.id });
    coreTriggerAtkGainEffects(target, atk, state, rng, emit, applyHit);
  };
  if (coreHasEffect(unit, 'ジャック・オ・ランタン')) {
    const maxLife = Math.max(1, Number(state.maxLife && state.maxLife[unit.side]) || 3);
    const lost = Math.max(0, maxLife - (Number(state.life && state.life[unit.side]) || 0));
    if (lost) allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, lost * 5, lost * 5, 'jack_o_lantern'));
  }
  if (coreHasEffect(unit, 'ニンフ')) {
    const colors = new Set(allies.filter(x => x.hp > 0 && !coreIsSealed(x) && x.color).map(x => x.color));
    if (colors.size) coreGainResource(state, unit.side, 'mana', colors.size, unit, emit, 'nymph_colors');
  }
  if (!unit._corePassiveOpeningApplied) {
    const passiveMana = coreUnitEffectText(unit).match(/このキャラクターは\+X\/\+Xを得る。Xは敵が持つマナの4倍に等しい/);
    if (passiveMana) {
      const enemyMana = Number(state.resources[unit.side === 'p1' ? 'p2' : 'p1'].mana) || 0;
      if (enemyMana) addStats(unit, enemyMana * 4, enemyMana * 4, 'enemy_mana_passive');
    }
    const mapBuff = coreUnitEffectText(unit).match(/全ての味方は\+X\/\+Xを得る。?（?Xは現在のマップの2倍に等しい/);
    if (mapBuff) {
      const mapNo = Math.max(1, Number(unit._terrainMapNo) || Number(state.mapIndex) || 1);
      addStats(unit, mapNo * 2, mapNo * 2, 'map_passive_team_buff');
      allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x))
        .forEach(x => {
          x.atk += mapNo * 2; x.maxHp += mapNo * 2; x.hp += mapNo * 2;
          emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: mapNo * 2, hp: mapNo * 2, reason: 'map_passive_team_buff' });
        });
    }
    unit._corePassiveOpeningApplied = true;
  }
  const wild = coreEffectCount(unit, '野生の力');
  if (wild) coreGainResource(state, unit.side, 'mana', wild * 2, unit, emit, 'wild_power');
  if (coreHasEffect(unit, '奇妙な絆')) {
    const count = allies.filter(x => x.hp > 0 && coreHasEffect(x, '奇妙な絆')).length;
    if (count) addStats(unit, count, count, 'strange_bond');
  }
  const roar = coreEffectCount(unit, '咆哮');
  for (let i = 0; i < roar; i++) addStats(unit, unit.atk, 0, 'roar');
  const majesty = coreEffectCount(unit, '威光');
  for (let i = 0; i < majesty; i++) addStats(unit, 0, unit.maxHp, 'majesty');
  const weakenAll = /開戦：全ての敵に弱体(\d+)/.exec(desc)
    || (coreHasEffect(unit, 'タイタン') ? ['', '', '1'] : null);
  if (weakenAll) foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.weaken = Math.max(0, Number(x.weaken) || 0) + Number(weakenAll[1]);
    emit({ type: 'keyword_effect', effect: 'weaken', side: x.side, unitId: x.id, sourceId: unit.id, amount: Number(weakenAll[1]) });
  });
  const poisonAll = /開戦：全ての敵に毒(\d+)/.exec(desc);
  if (poisonAll && !coreHasEffect(unit, '原初の大蛇"エイトルヴォルム"')) foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.poison = Math.max(0, Number(x.poison) || 0) + Number(poisonAll[1]);
    emit({ type: 'keyword_effect', effect: 'poison', side: x.side, unitId: x.id, sourceId: unit.id, amount: Number(poisonAll[1]) });
  });
  if (coreHasEffect(unit, 'ウェンディゴ')) {
    const baseHp = Number(unit.maxHp || unit.hp || 0);
    if (baseHp >= 10) {
      const count = Math.floor(baseHp / 10);
      foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, -count, -count, 'wendigo'));
    }
  }
  if (coreHasEffect(unit, 'リリス')) {
    const count = Math.floor((Number(unit.atk) || 0) / 10);
    for (let i = 0; i < count; i++) {
      const target = rng.pick(allies.filter(x => x.hp > 0 && !coreIsSealed(x)));
      if (target) { target.shield = (Number(target.shield) || 0) + 1; emit({ type: 'keyword_effect', effect: 'shield', side: target.side, unitId: target.id, amount: 1, sourceId: unit.id }); }
    }
  }
  // ミテーラの「「緑ペリカン」をN体召喚する」は下の共通処理（本文の体数）で解決する。
  // 名前で体数を書くと、合体後（4体）に付いていけない。
  if (coreHasEffect(unit, 'ジャッカロープ')) {
    const count = allies.filter(x => x.hp > 0 && x.color === '緑').length;
    coreGainResource(state, unit.side, 'mana', count, unit, emit, 'jackalope');
  }
  if (coreHasEffect(unit, '緑域の隠者"ヴィーザル"')) allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 4, 4, 'green_hermit'));
  if (coreHasEffect(unit, '金床の賢者"シンドリ"')) allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.keywords = coreUnitKeywords(x).concat(['貫通']);
    emit({ type: 'keyword_effect', effect: 'keyword_gain', side: x.side, unitId: x.id, keyword: '貫通', sourceId: unit.id });
  });
  if (coreHasEffect(unit, '原初の大蛇"エイトルヴォルム"')) foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.poison = (Number(x.poison) || 0) + 12;
    emit({ type: 'keyword_effect', effect: 'poison', side: x.side, unitId: x.id, amount: 12, sourceId: unit.id });
  });
  if (coreHasEffect(unit, '古王"フォルセティ"')) allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
    x.shield = (Number(x.shield) || 0) + 1;
    emit({ type: 'keyword_effect', effect: 'shield', side: x.side, unitId: x.id, amount: 1, sourceId: unit.id });
  });
  const openingText = desc.replace(/^開戦\s*[：:]/, '');
  // 開戦：ランダムなA、B、Cキャラクター1体ずつは+X/+Yを得る（ガーゴイル）。
  // **色も加算値も本文から読む**（合体後は+6/+6）。負傷側（フォルモール）と同じ形。
  const openingRandomColors = openingText.match(/ランダムな([赤青緑黄紫茶])、([赤青緑黄紫茶])、([赤青緑黄紫茶])キャラクター1体ずつは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (openingRandomColors) {
    [openingRandomColors[1], openingRandomColors[2], openingRandomColors[3]].forEach(rawColor => {
      const color = rawColor === '茶' ? '黄' : rawColor;
      const target = rng.pick(allies.filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x)));
      if (target) addStats(target, Number(openingRandomColors[4]) || 0, Number(openingRandomColors[5]) || 0, 'gargoyle');
    });
  }
  const openingColor = openingText.match(/全ての([赤青緑黄紫茶])(?:の)?キャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (openingColor) {
    const color = openingColor[1] === '茶' ? '黄' : openingColor[1];
    allies.filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x))
      .forEach(x => addStats(x, Number(openingColor[2]), Number(openingColor[3]), 'opening_color_buff'));
  }
  const teamBuff = openingText.match(/全ての味方(?:は|に)\+([0-9]+)\/\+([0-9]+)を得る/);
  if (teamBuff && !coreHasEffect(unit, '緑域の隠者"ヴィーザル"')) {
    const atk = Number(teamBuff[1]) || 0, hp = Number(teamBuff[2]) || 0;
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, atk, hp, 'opening_team_buff'));
  }
  const teamShield = openingText.match(/全ての味方に結界(\d*)を(?:付与|与え)/);
  if (teamShield && !coreHasEffect(unit, '古王"フォルセティ"')) {
    const amount = Number(teamShield[1]) || 1;
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
      x.shield = (Number(x.shield) || 0) + amount;
      emit({ type: 'keyword_effect', effect: 'shield', side: x.side, unitId: x.id, amount, sourceId: unit.id });
    });
  }
  const openingMana = openingText.match(/^(\d+)マナを得る/);
  if (openingMana && !coreHasEffect(unit, '野生の力')) coreGainResource(state, unit.side, 'mana', Number(openingMana[1]), unit, emit, 'opening_mana');
  const openingAtkDouble = /^このキャラクターのATKを2倍にする/.test(openingText);
  if (openingAtkDouble && !coreHasEffect(unit, '咆哮')) {
    const atk = Math.max(0, Number(unit.atk) || 0);
    unit.atk += atk;
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk, hp: 0, reason: 'opening_atk_double', sourceId: unit.id });
  }
  const openingHpDouble = /^このキャラクターのHPを2倍にする/.test(openingText);
  if (openingHpDouble && !coreHasEffect(unit, '威光')) {
    const hp = Math.max(0, Number(unit.maxHp) || 0);
    unit.maxHp += hp; unit.hp += hp;
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk: 0, hp, reason: 'opening_hp_double', sourceId: unit.id });
  }
  const openingEnemyDebuff = openingText.match(/^全ての敵は-([0-9]+)\/-([0-9]+)を得る。この効果は、このキャラクターのHP(\d+)につき1回発生する/);
  if (openingEnemyDebuff && !coreHasEffect(unit, 'ウェンディゴ')) {
    const repeats = Math.max(1, Math.floor((Number(unit.maxHp) || 0) / Number(openingEnemyDebuff[3])));
    for (let i = 0; i < repeats; i++) foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, -Number(openingEnemyDebuff[1]), -Number(openingEnemyDebuff[2]), 'opening_hp_scaled_debuff'));
  }
  const openingRandomShield = openingText.match(/^ランダムな味方に結界(\d*)を付与する。この効果は、このキャラクターのATK(\d+)につき1回発生する/);
  if (openingRandomShield && !coreHasEffect(unit, 'リリス')) {
    const repeats = Math.max(1, Math.floor((Number(unit.atk) || 0) / Number(openingRandomShield[2])));
    for (let i = 0; i < repeats; i++) {
      const target = rng.pick(allies.filter(x => x.hp > 0 && !coreIsSealed(x)));
      if (target) {
        const amount = Number(openingRandomShield[1]) || 1;
        target.shield = (Number(target.shield) || 0) + amount;
        emit({ type: 'keyword_effect', effect: 'shield', side: target.side, unitId: target.id, amount, sourceId: unit.id });
      }
    }
  }
  const openingSummon = openingText.match(/「(.+?)」を(\d+)体?召喚する/);
  if (openingSummon) {
    const count = Math.max(1, Number(openingSummon[2]) || 1);
    // 色は名前の頭文字（「緑ペリカン」）を優先し、無ければ召喚元の色を継ぐ。
    const named = String(openingSummon[1] || '');
    const namedColor = /^[赤青緑黄紫茶黒]/.test(named) ? named.slice(0, 1) : '';
    for (let i = 0; i < count; i++) {
      coreSummonUnit(state, unit.side,
        { name: named, color: namedColor || unit.color, placement: 'rightEdge' }, emit, unit.id);
    }
  }
  // 開戦コピーは初期配置数とは別の効果。コピー自身だけは再度この効果を持たない。
  if (/^コピーを1体召喚する/.test(openingText) && !unit._openingDuplicate) {
    const copySpec = {
      name: unit.name, atk: unit.atk, hp: unit.hp, maxHp: unit.maxHp, color: unit.color,
      race: unit.race, keywords: [...(unit.keywords || [])], desc: unit.desc,
      effectData: { ...(unit.effectData || {}) }, _copyOf: unit.id, _openingDuplicate: true,
    };
    coreCopyUnitEffectState(copySpec, unit);
    coreSummonUnit(state, unit.side, copySpec, emit, unit.id);
  }
  // 開戦：全ての色の味方がいる場合、〜（エレメンタル）
  // 本文が「生命吸収を得る」か「ATKとHPを2倍にする」かで分かれる。
  const openingAllColors = () => {
    const colors = new Set(allies.filter(x => x.hp > 0 && !coreIsSealed(x)).map(x => x.color).filter(Boolean));
    return ['赤', '青', '緑', '黄', '紫'].every(c => colors.has(c));
  };
  // ※ desc は「開戦：」の接頭辞を含んだまま返る（coreUnitTriggerText）。
  if (/開戦\s*[：:]\s*全ての色の味方がいる場合、生命吸収を得る/.test(desc)
    || (coreHasEffect(unit, 'エレメンタル') && !/ATKとHPを2倍/.test(desc))) {
    if (openingAllColors()) {
      unit.keywords = coreUnitKeywords(unit).concat(['生命吸収']);
      emit({ type: 'keyword_effect', effect: 'keyword_gain', side: unit.side, unitId: unit.id, keyword: '生命吸収', sourceId: unit.id });
    }
  }
  if (/開戦\s*[：:]\s*全ての色の味方がいる場合、このキャラクターのATKとHPを2倍にする/.test(desc) && openingAllColors()) {
    const addAtk = Math.max(0, Number(unit.atk) || 0);
    const addHp = Math.max(0, Number(unit.maxHp) || 0);
    unit.atk = Math.max(0, unit.atk + addAtk);
    unit.maxHp = Math.max(1, unit.maxHp + addHp);
    unit.hp = Math.max(0, unit.hp + addHp);
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk: addAtk, hp: addHp,
      reason: 'opening_all_color_double', sourceId: unit.id });
  }
  coreApplyWargThreshold(state, unit.side, emit);
  if (coreHasEffect(unit, '刻を織る者"ウルズ・ラグナ"')) {
    state.life = state.life || { p1: null, p2: null };
    state.life.p1 = 1;
    emit({ type: 'life_set', side: 'p1', amount: 1, sourceId: unit.id });
  }
  if (/敵のライフを1にする/.test(openingText)) {
    state.life = state.life || { p1: null, p2: null };
    state.life.p1 = 1;
    emit({ type: 'life_set', side: 'p1', amount: 1, sourceId: unit.id });
  }
  if (coreHasEffect(unit, '生命吸収') && desc.includes('全ての色')) {
    if (!coreUnitHasKeyword(unit, '生命吸収')) unit.keywords.push('生命吸収');
    emit({ type: 'keyword_effect', effect: 'life_drain', side: unit.side, unitId: unit.id, sourceId: unit.id, amount: 1 });
  }
  const alchemyCount = coreEffectCount(unit, '錬成');
  if (alchemyCount > 0) {
    const pool = Array.isArray(state.itemDefs)
      ? state.itemDefs.filter(x => x && (x.itemEffectKey || x.kind === 'item' || x.type === 'consumable')) : [];
    for (let i = 0; i < alchemyCount; i++) {
      const item = pool.length && rng && typeof rng.pick === 'function' ? rng.pick(pool) : null;
      emit({ type: 'item_reward', side: unit.side, unitId: unit.id, reason: 'alchemy', item: item ? { ...item } : null });
    }
  }
  } finally { coreEndSummonBatch(state, emit); }
}

// 魔導板パワー由来の開戦処理。PvEはrunBattleCoreを通らず個別APIを呼ぶため、
// runBattleCore内へ直書きせず、両経路から同じ関数を呼ぶ。
function coreApplyMapPanelOpeningEffects(state, emit) {
  if (!state || state._mapPanelOpeningApplied) return;
  state._mapPanelOpeningApplied = true;
  ['p1', 'p2'].forEach(sideKey => {
    const units = state.units && state.units[sideKey] || [];
    const colors = new Set(units.filter(u => u && u.hp > 0 && !coreIsSealed(u) && u._mapPanelPower === 'resonance')
      .map(u => u.color).filter(Boolean));
    units.filter(u => u && u.hp > 0 && !coreIsSealed(u) && colors.has(u.color)).forEach(u => {
      u.atk += 3; u.maxHp += 3; u.hp += 3;
      emit({ type: 'stat_change', side: u.side, unitId: u.id, atk: 3, hp: 3, reason: 'resonance_panel' });
    });
  });
}

// データ／強化カード由来の攻撃時効果。演出・ログはイベント再生側、数値変更はここで共通化する。
// ダメージ種別を attack_effect に固定して実行する（再生側が種類ごとにまとめて見せるため）。
function coreApplyAttackEffects(unit, state, rng, emit, applyHit, triggerIndex) {
  return coreWithDamageKind(state, 'attack_effect', () => coreApplyAttackEffectsInner(unit, state, rng, emit, applyHit, triggerIndex));
}

function coreApplyAttackEffectsInner(unit, state, rng, emit, applyHit, triggerIndex) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!unit || unit.hp <= 0 || coreIsSealed(unit)) return { skipAttack: false };
  // 同じ攻撃イベントが接触コールバックとフォールバック経路から二度届いても、
  // 正規の追加発動（triggerIndexが異なる）だけは維持して一度だけ解決する。
  if (triggerIndex != null) {
    const key = `${state._coreAttackEventSeq || 0}:${triggerIndex}`;
    const attackToken = coreStateToken(state);
    if (unit._coreAttackEffectsState === attackToken && unit._coreAttackEffectsKey === key) return { skipAttack: false };
    unit._coreAttackEffectsState = attackToken;
    unit._coreAttackEffectsKey = key;
  }
  const allies = (state.units[unit.side] || []).filter(Boolean);
  const foes = (state.units[unit.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const desc = coreUnitTriggerText(unit, '攻撃');
  const attackText = desc.replace(/^攻撃(?:[＆&]負傷)?\s*[：:]\s*/, '');
  if (String(desc || '').trim()) coreEmitEffectFlash(emit, unit, 'attack');
  const addStats = (target, atk, hp, reason) => {
    if (!target || target.hp <= 0 || coreIsSealed(target)) return;
    atk = coreStatBonus(target, atk, unit); hp = coreStatBonus(target, hp, unit);
    target.atk = Math.max(0, target.atk + atk);
    target.maxHp = Math.max(1, target.maxHp + hp);
    target.hp = Math.max(0, target.hp + hp);
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason, sourceId: unit.id });
    coreTriggerAtkGainEffects(target, atk, state, rng, emit, applyHit);
  };
  const coreBloodOf = side => Math.max(0, Number(state.blood && state.blood[side]) || 0);
  // 攻撃：血がN以上なら全ての味方は+X/+Yを得る（シャドウ）
  const attackBloodTeamBuff = attackText.match(/^血が(\d+)以上なら全ての味方は\+(\d+)\/\+(\d+)を得る/);
  if (attackBloodTeamBuff && coreBloodOf(unit.side) >= Number(attackBloodTeamBuff[1])) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x))
      .forEach(x => addStats(x, Number(attackBloodTeamBuff[2]), Number(attackBloodTeamBuff[3]), 'attack_blood_team_buff'));
  }
  // 攻撃：ランダムな敵N体にXダメージを与える。Xは血に等しい（デュラハン。合体後は2体）
  const bloodDamage = attackText.match(/^ランダムな敵(?:(\d+)体)?にXダメージを与える。\s*Xは血に等しい/);
  if (bloodDamage) {
    const amount = coreBloodOf(unit.side);
    if (amount > 0) {
      corePickDistinct(rng, foes.filter(x => x.hp > 0 && !coreIsSealed(x)),
        Math.max(1, Number(bloodDamage[1]) || 1))
        .forEach(target => { if (target.hp > 0) applyHit(unit, target, amount); });
    }
  }
  // 攻撃：全ての敵の毒を発動させる（ワーム）
  if (/^全ての敵の毒を発動させる/.test(attackText)) {
    // 「毒のターン処理」と同じ入口を使う。ここで独自にHPを削らないこと。
    foes.filter(x => x.hp > 0 && !coreIsSealed(x) && Number(x.poison) > 0)
      .forEach(x => coreApplyPoisonBeforeTurn(x, emit));
  }
  // グレムリン：攻撃前に自身のHPと対象のATKを入れ替える。
  // 旧PvE側の接触フックではなく、オンライン／オフライン共通の攻撃効果として解決する。
  const gremlinTarget = unit._currentAttackTarget;
  if (coreHasEffect(unit, 'グレムリン') && gremlinTarget && gremlinTarget.hp > 0) {
    const nextHp = Math.max(1, Number(gremlinTarget.atk) || 0);
    const nextAtk = Math.max(0, Number(unit.hp) || 0);
    const oldTargetAtk = Math.max(0, Number(gremlinTarget.atk) || 0);
    const oldUnitHp = Math.max(0, Number(unit.hp) || 0);
    unit.hp = nextHp;
    unit.maxHp = Math.max(Number(unit.maxHp) || 1, unit.hp);
    gremlinTarget.atk = nextAtk;
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk: 0,
      hp: unit.hp - oldUnitHp, reason: 'gremlin_swap', sourceId: unit.id });
    emit({ type: 'stat_change', side: gremlinTarget.side, unitId: gremlinTarget.id,
      atk: nextAtk - oldTargetAtk, hp: 0, reason: 'gremlin_swap', sourceId: unit.id });
  }
  for (let i = 0; i < coreEffectCount(unit, '戦術'); i++) addStats(unit, 1, 2, 'tactics');
  if (coreEffectCount(unit, '共振')) {
    allies.filter(x => x.hp > 0 && x.color === unit.color).forEach(x => addStats(x, 1, 1, 'resonance'));
  }
  for (let i = 0; i < coreEffectCount(unit, '剣技'); i++) addStats(unit, 3, 0, 'sword_skill');
  for (let p = 0; p < coreEffectCount(unit, '懺悔'); p++) {
    for (let i = 0; i < 2 && unit.hp > 0; i++) {
      const result = applyHit(unit, unit, 1);
      if (result.died) break;
    }
  }
  // 攻撃：血がN以上ならXマナを得る（ファミリア）。**数値は本文から読む**（合体後は4マナ）。
  const familiarBlood = coreUnitTriggerText(unit, '攻撃')
    .match(/血が(\d+)以上なら(\d+)マナを?得る/);
  if (familiarBlood && Number(state.blood && state.blood[unit.side]) >= (Number(familiarBlood[1]) || 0)) {
    coreGainResource(state, unit.side, 'mana', Number(familiarBlood[2]) || 0, unit, emit, 'familiar_blood');
  }
  if (coreHasEffect(unit, 'メリュジーヌ')) {
    foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
      x.poison = Math.max(0, Number(x.poison) || 0) * 2;
      emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: 0, hp: 0, reason: 'melusine_poison_double', sourceId: unit.id });
    });
  }
  if (coreHasEffect(unit, 'ヘルナイト')) {
    const blood = Math.max(0, Number(state.blood && state.blood[unit.side]) || 0);
    if (blood) addStats(unit, blood, blood, 'hell_knight_blood');
  }
  if (coreHasEffect(unit, 'インプ')) {
    let stolen = 0;
    [...allies, ...foes].filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)).forEach(x => {
      const amount = Math.min(1, Math.max(0, Number(x.atk) || 0));
      if (amount) { x.atk -= amount; stolen += amount; emit({ type: 'stat_change', side: x.side, unitId: x.id, atk: -amount, hp: 0, reason: 'imp_steal', sourceId: unit.id }); }
    });
    if (stolen) addStats(unit, stolen, 0, 'imp_gain');
  }
  if (coreHasEffect(unit, 'ユミル')) {
    const mana = state.resources[unit.side].mana || 0;
    if (mana) addStats(unit, mana, mana, 'ymir');
  }
  const attackTargetWasWounded = !!(unit._attackTargetWasWounded
    || (unit._currentAttackTarget && unit._currentAttackTarget.hp > 0
      && unit._currentAttackTarget.hp < unit._currentAttackTarget.maxHp));
  if (coreHasEffect(unit, 'ラミア')) {
    const target = unit._currentAttackTarget;
    const repeats = attackTargetWasWounded ? 2 : 1;
    for (let i = 0; i < repeats; i++) addStats(unit, 2, 1, 'lamia');
  }
  if (coreHasEffect(unit, 'エルヴンメイジ')) {
    allies.filter(x => x.hp > 0 && x.color === '黄').forEach(x => addStats(x, 1, 1, 'elven_mage'));
  }
  if (coreHasEffect(unit, 'インプ')) {
    let stolen = 0;
    allies.filter(x => x !== unit && x.hp > 0 && coreUnitHasSacrifice(x) && x.atk > 0).forEach(x => {
      addStats(x, -1, 0, 'imp_steal'); stolen++;
    });
    if (stolen) addStats(unit, stolen, 0, 'imp_gain');
  }
  if (coreHasEffect(unit, 'ブラウニー') || /攻撃：全ての仲間のHPが\+2/.test(desc)) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 0, 2, 'brownie_attack'));
  }
  const frontDamage = desc.match(/^攻撃：全ての前衛の味方に(\d+)ダメージ/);
  if (frontDamage) coreHitAll(state, rng, emit, applyHit, unit, allies.filter(x => x.hp > 0 && x.lane !== 'rear' && !coreIsSealed(x)), Number(frontDamage[1]));
  const allDamage = desc.match(/^攻撃：全てのキャラクターに(\d+)ダメージを与える。/);
  if (coreHasEffect(unit, 'サイレン') || allDamage) {
    const amount = Math.max(1, Number(allDamage && allDamage[1]) || 1);
    // 「全てのキャラクター」に**自分自身は含めない**。
    // 含めると、攻撃するたびに自分を削って想定より早く倒れる（サイレン）。
    // 解決は1体ずつだが、**見せ方は一度に起きたこととして揃える**ため印を付ける。
    // **全員にダメージを入れてから、まとめて誘発する。**
    // 1体ずつ「ダメージ→その体の誘発」を解決すると、誘発（ミノタウロスの
    // 割り込み攻撃など）が残りの対象へのダメージより先に起き、順番が実際の
    // ルール（同時に受ける）と食い違う。誘発の順番は対象の並び順のまま。
    const victims = [...allies, ...foes].filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x));
    // 発生源から広がる演出（サイレン）。**どう見せるかは決めない。**
    // 誰に・どの順で当たるかだけを渡し、絵の選び方は present.js が決める。
    if (victims.length) {
      emit({ type: 'sweep_vfx', side: unit.side, unitId: unit.id, targetIds: victims.map(x => x.id) });
    }
    coreHitAll(state, rng, emit, applyHit, unit, victims, amount);
  }
  const enemyDamage = attackText.match(/全ての敵に(\d+)ダメージ/);
  if (enemyDamage && !coreHasEffect(unit, 'サイレン')) {
    const amount = Math.max(1, Number(enemyDamage[1]) || 1);
    // アラッサスは対象ごとの通常VFXではなく、攻撃者起点の薙ぎ払いVFXを使う。
    // DOMには触れず、再生側が同じ対象順で表示できるイベントだけを出す。
    if (String(unit.no || unit.artCode || '').toUpperCase() === 'C043') {
      emit({ type: 'sweep_vfx', side: unit.side, unitId: unit.id,
        targetIds: foes.filter(x => x.hp > 0 && !coreIsSealed(x)).map(x => x.id) });
    }
    coreHitAll(state, rng, emit, applyHit, unit, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), amount);
  }
  const attackAlliesBuff = attackText.match(/全ての味方(?:は|に)\+([0-9]+)\/\+([0-9]+)を(?:得る|与える)/);
  // 「血がN以上なら」の条件付きは上で解決済み。ここで無条件に足すと二重になる。
  if (attackAlliesBuff && !attackBloodTeamBuff) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, Number(attackAlliesBuff[1]), Number(attackAlliesBuff[2]), 'attack_allies_buff'));
  }
  const attackColorBuff = attackText.match(/全ての([赤青緑黄紫茶])(?:の)?キャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (attackColorBuff && !coreHasEffect(unit, 'エルヴンメイジ')) {
    const color = attackColorBuff[1] === '茶' ? '黄' : attackColorBuff[1];
    [...allies, ...foes].filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x))
      .forEach(x => addStats(x, Number(attackColorBuff[2]), Number(attackColorBuff[3]), 'attack_color_buff'));
  }
  const selfBuff = attackText.match(/このキャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (selfBuff && !/Xはマナ/.test(attackText)
    && !coreHasEffect(unit, 'ラミア') && !coreHasEffect(unit, 'ユミル')
    && !coreHasEffect(unit, '戦術')) {
    const target = unit._currentAttackTarget;
    const repeats = /対象が負傷している場合、もう一度繰り返す/.test(attackText)
      && target && target.hp > 0 && target.hp < target.maxHp ? 2 : 1;
    for (let i = 0; i < repeats; i++) addStats(unit, Number(selfBuff[1]), Number(selfBuff[2]), 'attack_self_buff');
  }
  const selfAtkBuff = attackText.match(/このキャラクターはATK\+([0-9]+)を得る/);
  if (selfAtkBuff && !coreHasEffect(unit, '剣技')) addStats(unit, Number(selfAtkBuff[1]), 0, 'attack_self_atk_buff');
  const sacrificeMana = attackText.match(/マナをX得る。Xは場の生贄の数に等しい/);
  if (sacrificeMana && !coreHasEffect(unit, 'ファミリア')) {
    const count = allies.filter(x => x.hp > 0 && coreUnitHasSacrifice(x)).length;
    if (count) coreGainResource(state, unit.side, 'mana', count, unit, emit, 'sacrifice_mana');
  }
  const fixedMana = attackText.match(/^(\d+)マナを得る/);
  // loader の manaOnAttack と同じ効果を効果文からも拾うため、データ駆動値がある場合は二重加算しない。
  if (fixedMana && !coreManaOnAttackValue(unit)) coreGainResource(state, unit.side, 'mana', Number(fixedMana[1]), unit, emit, 'attack_mana');
  const manaBuff = attackText.match(/このキャラクターは\+X\/\+Xを得る。Xはマナに等しい/);
  // ユミルの固有処理が同じ「Xはマナに等しい」本文をすでに解決する。
  // 固有分岐と汎用本文パーサーを両方通すと、攻撃1回で+X/+Xが二重になる。
  if (manaBuff && !coreHasEffect(unit, 'ユミル')) {
    const amount = Math.max(0, Number(state.resources[unit.side].mana) || 0);
    if (amount) addStats(unit, amount, amount, 'attack_mana_buff');
  }
  const randomAllyHp = attackText.match(/「[^」]+」以外のランダムな味方はHP\+Xを得る。XはこのキャラクターのHPに等しい/);
  if (randomAllyHp && !coreHasEffect(unit, 'センチネル')) {
    const candidates = allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x));
    const target = rng.pick(candidates);
    if (target) addStats(target, 0, Math.max(0, Number(unit.hp) || 0), 'attack_random_ally_hp');
  }
  const sameColorBuff = attackText.match(/全ての同じ色の味方に\+([0-9]+)\/\+([0-9]+)を与える/);
  if (sameColorBuff && !coreHasEffect(unit, '共振')) allies.filter(x => x.hp > 0 && x.color === unit.color && !coreIsSealed(x))
    .forEach(x => addStats(x, Number(sameColorBuff[1]), Number(sameColorBuff[2]), 'attack_same_color_buff'));
  const randomDamage = attackText.match(/ランダムな敵に(\d+)ダメージ/);
  if (randomDamage && !coreHasEffect(unit, '竜の契約') && !coreHasEffect(unit, '逆上')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, Number(randomDamage[1]) || 0);
  }
  if (/ランダムなボスを召喚する/.test(attackText)) {
    const excluded = ['万象の揺り籠', '刻を織る者', '日刻の巫女', '夜刻の巫女'];
    const bossPool = (state.summonDefs || []).filter(x => x && (x.bossOnly === true || x.boss === true || x.isBoss === true)
      && !excluded.some(name => String(x.name || '').includes(name)));
    const boss = rng.pick(bossPool);
    if (boss) coreSummonUnit(state, unit.side, { name: boss.name, color: boss.color, boss: true }, emit, unit.id);
  }
  if (coreHasEffect(unit, '竜の契約')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, 5);
  }
  const manaStrike = desc.match(/^攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。/);
  if (manaStrike) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    const amount = Math.max(0, Number(state.resources[unit.side].mana) || 0);
    if (target && amount) applyHit(unit, target, amount);
  }
  if (coreHasEffect(unit, 'センチネル')) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
    if (target) addStats(target, 0, Math.max(0, Number(unit.hp) || 0), 'sentinel');
  }
  const result = { skipAttack: false };
  if (coreHasEffect(unit, 'スケルトンキング') || /「青スケルトン」を召喚し、代わりに攻撃させる/.test(attackText)) {
    const skeleton = coreSummonUnit(state, unit.side, { name: '青スケルトン', color: '青' }, emit, unit.id);
    const target = unit._currentAttackTarget && unit._currentAttackTarget.hp > 0
      ? unit._currentAttackTarget
      : rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (skeleton && target) {
      const damage = coreAttackDamage(skeleton);
      const counter = coreCounterDamage(skeleton, target);
      emit({ type: 'attack', side: unit.side, attackerId: skeleton.id, targetId: target.id, damage, counterDamage: counter, immediate: true });
      applyHit(skeleton, target, damage);
      if (target.hp > 0 && counter > 0) applyHit(target, skeleton, counter, true);
    }
    result.skipAttack = true;
  }
  if (coreHasEffect(unit, '黄金の瞳"フレイ"')) {
    coreSummonUnit(state, unit.side, { name: '黒マッドキャット', atk: 1, hp: 2 }, emit, unit.id);
  }
  const randomTransform = attackText.match(/ランダムな敵を「([^」]+)」に変身させる/);
  if (randomTransform) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) coreTransformUnit(state, target, randomTransform[1], emit);
  }
  // **変身先は本文の名前をそのまま使う。** カード名で分岐したり、変身後の数値を
  // ここへ書いたりしない（数値は変身先カードのシート値）。
  const selfTransform = attackText.match(/^「([^」]+)」に変身する/);
  if (selfTransform) coreTransformUnit(state, unit, selfTransform[1], emit);
  // カード名を知らない追加カードでも、標準的な攻撃効果は本文から実行する。
  // 既存の固有処理と同じ本文を持つものは二重発動しないよう除外する。
  if (/このキャラクターのHPと対象のATKを入れ替える/.test(attackText)
    && !coreHasEffect(unit, 'グレムリン')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      const oldHp = unit.hp, oldAtk = target.atk;
      unit.hp = Math.max(0, oldHp - oldHp + oldAtk);
      target.atk = Math.max(0, oldAtk - oldAtk + oldHp);
      emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk: 0, hp: oldAtk - oldHp, reason: 'attack_swap', sourceId: unit.id });
      emit({ type: 'stat_change', side: target.side, unitId: target.id, atk: oldHp - oldAtk, hp: 0, reason: 'attack_swap', sourceId: unit.id });
    }
  }
  const steal = attackText.match(/全ての生贄を持つキャラクターからATKを(\d+)奪う/);
  if (steal && !coreHasEffect(unit, 'インプ')) {
    const amount = Math.max(1, Number(steal[1]) || 1);
    let stolen = 0;
    [...allies, ...foes].filter(x => x !== unit && x.hp > 0 && coreUnitHasSacrifice(x)).forEach(x => {
      const delta = Math.min(amount, Math.max(0, x.atk));
      if (delta) { addStats(x, -delta, 0, 'sacrifice_atk_steal'); stolen += delta; }
    });
    if (stolen) addStats(unit, stolen, 0, 'sacrifice_atk_gain');
  }
  const colorBuff = attackText.match(/ランダムな異なる色の(?:味方|キャラクター)(\d+)体ずつは\+(\d+)\/\+(\d+)を得る/)
    || (coreHasEffect(unit, 'リアナンシー') ? ['','1','2','2'] : null);
  if (colorBuff) {
    const count = Math.max(1, Number(colorBuff[1]) || 1), atk = Number(colorBuff[2]) || 0, hp = Number(colorBuff[3]) || 0;
    const colors = [...new Set(allies.filter(x => x.hp > 0 && !coreIsSealed(x) && x.color).map(x => x.color))];
    for (let i = 0; i < count; i++) colors.forEach(color => {
      const candidates = allies.filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x));
      const target = rng.pick(candidates); if (target) addStats(target, atk, hp, 'different_color_attack');
    });
  }
  if (coreHasEffect(unit, 'ペガサス')) {
    const candidates = allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)
      && (Number(x.manaOnAttack) > 0 || Number(x.manaCost) > 0
        || (x.extraManaThresholds || []).some(t => Number(t && t.cost) > 0)
        || /攻撃\s*[：:].*マナ/.test(coreUnitEffectText(x))));
    const target = rng.pick(candidates);
    if (target) {
      coreTriggerManaOnAttack(target, state, emit);
      coreApplyManaThresholdEffects(state, rng, emit, applyHit, { onlyUnitId: target.id, force: true });
    }
  }
  if (coreHasEffect(unit, 'ピクシー')) {
    // 操るのは**前衛の敵だけ**（攻撃：ランダムな前衛の敵を操り、代わりに攻撃させる）。
    const controlled = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x) && (x.lane || 'front') !== 'rear'));
    const target = rng.pick(foes.filter(x => x !== controlled && x.hp > 0 && !coreIsSealed(x)));
    if (controlled && target) {
      const damage = coreAttackDamage(controlled);
      const counter = coreCounterDamage(controlled, target);
      emit({ type: 'attack', side: controlled.side, attackerId: controlled.id, targetId: target.id,
        damage, counterDamage: counter, immediate: true, controlled: true, sourceId: unit.id });
      applyHit(controlled, target, damage);
      if (target.hp > 0 && counter > 0) applyHit(target, controlled, counter, true);
      result.skipAttack = true;
    }
  }
  // 新しい本文（攻撃：全ての敵の毒を発動させる）へ差し替わったら、この旧効果は動かさない。
  if (coreHasEffect(unit, 'ワーム') && !/全ての敵の毒を発動させる/.test(attackText)) {
    const target = unit._currentAttackTarget && unit._currentAttackTarget.hp > 0
      ? unit._currentAttackTarget : rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      // 「対象の両隣」は攻撃者ではなく、命中対象の陣営・位置を基準にする。
      const placement = { placementTargetId: target.id };
      coreSummonUnit(state, target.side, { name: '黒ナイト', color: '黒', placement: 'leftOfTarget', ...placement }, emit, unit.id);
      coreSummonUnit(state, target.side, { name: '黒ナイト', color: '黒', placement: 'rightOfTarget', ...placement }, emit, unit.id);
    }
  }
  const summon = attackText.match(/「(.+?)」(?:を|が)召喚/);
  if (summon && !coreHasEffect(unit, 'スケルトンキング') && !coreHasEffect(unit, '黄金の瞳"フレイ"')
    && !/「青スケルトン」を召喚し、代わりに攻撃させる/.test(attackText)
    && !coreHasEffect(unit, 'ワーム')) {
    coreSummonUnit(state, unit.side, { name: summon[1], atk: 1, hp: 1, color: summon[1].startsWith('黒') ? '黒' : unit.color }, emit, unit.id);
  }
  return result;
  } finally { coreEndSummonBatch(state, emit); }
}

function coreApplyInjuryEffects(unit, actualDamage, state, rng, emit, applyHit, source, triggerIndex, causeKind) {
  if (!unit || unit.hp <= 0 || coreIsSealed(unit)) return;
  // 負傷イベントの再入を共通コアで遮断する。執念の炎・激怒の指輪などの
  // 正規の反復はtriggerIndexを変えて呼び出すため、必要な回数は失わない。
  if (triggerIndex != null) {
    const key = `${state._coreInjuryEventSeq || 0}:${triggerIndex}`;
    const injuryToken = coreStateToken(state);
    if (unit._coreInjuryEffectsState === injuryToken && unit._coreInjuryEffectsKey === key) return;
    unit._coreInjuryEffectsState = injuryToken;
    unit._coreInjuryEffectsKey = key;
  }
  // 負傷効果の中で自分が再び負傷した場合（ミノタウロス「直ちに攻撃する」→反撃ダメージ等）、
  // 自分の負傷効果が入れ子で再入すると自滅するまで無限に繰り返す。PvEは
  // battle.js の _coreInjuryEffectsResolving で止めているが、オンラインは
  // runBattleCore が直接ここを呼ぶためガードが無かった。両者を揃えるためコア側で遮断する。
  // ※PvE側のフラグとは必ず別名にすること。同名にするとPvEの正規反復
  //   （執念の炎・激怒の指輪）が1回目で弾かれる。
  if (unit._coreInjuryReentry) return;
  unit._coreInjuryReentry = true;
  try {
    // **確率つきの効果は、成功したときだけ光らせる**（ヘカトンケイルの「10%の確率で」）。
    // 失敗しても光ると「発動したのに何も起きない」ように見える。
    // 成功時の発光は効果を解決する側（coreApplyInjuryEffectsBody）が出す。
    const _injuryText = String(coreUnitTriggerText(unit, '負傷') || '').trim();
    if (_injuryText && !/^\d+%の確率で/.test(_injuryText)) coreEmitEffectFlash(emit, unit, 'injury');
    coreWithDamageKind(state, 'injury_effect',
      () => coreApplyInjuryEffectsBody(unit, actualDamage, state, rng, emit, applyHit, source,
        causeKind || 'other'));
  } finally {
    delete unit._coreInjuryReentry;
  }
}

function coreApplyInjuryEffectsBody(unit, actualDamage, state, rng, emit, applyHit, source, causeKind) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  const allies = (state.units[unit.side] || []).filter(Boolean);
  const foes = (state.units[unit.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const addStats = (target, atk, hp, reason) => {
    if (!target || target.hp <= 0 || coreIsSealed(target)) return;
    atk = coreStatBonus(target, atk, unit); hp = coreStatBonus(target, hp, unit);
    target.atk = Math.max(0, target.atk + atk);
    target.maxHp = Math.max(1, target.maxHp + hp);
    target.hp = Math.max(0, target.hp + hp);
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason, sourceId: unit.id });
  };
  // エティン：味方の負傷効果が発動するたび、このキャラクターは+2/+1。
  // 通常の被ダメージと、レイス等による負傷効果の手動発動を同じ入口で扱う。
  const hasInjuryEffect = x => !!coreUnitTriggerText(x, '負傷');
  allies.filter(x => x && x.hp > 0 && !coreIsSealed(x)
    && hasInjuryEffect(unit)
    && (coreHasEffect(x, 'エティン')
      || /味方の負傷効果が発動するたび、このキャラクターは\+2\/\+1を得る/.test(coreUnitEffectText(x))))
    .forEach(x => { coreEmitPassiveFlash(emit, x); addStats(x, 2, 1, 'ettin'); });
  if (unit.side === 'p1' && coreRingCount(state, 'p1', '我慢の指輪') && actualDamage > 0) {
    state.life = state.life || { p1: 0, p2: 0 };
    state.life.p1 = (Number(state.life.p1) || 0) + 2;
    emit({ type: 'life_gain', side: 'p1', amount: 2, reason: 'patience_ring' });
  }
  if (coreRingCount(state, unit.side, '逆鱗の指輪') && actualDamage > 0 && !state._scalesRingResolving) {
    state._scalesRingResolving = true;
    try {
      coreHitAll(state, rng, emit, applyHit, unit, [...allies, ...foes].filter(x => x.hp > 0 && !coreIsSealed(x)), 1);
    } finally { state._scalesRingResolving = false; }
    emit({ type: 'ring_effect', ring: '逆鱗の指輪', side: unit.side, amount: 1 });
  }
  for (let i = 0; i < coreEffectCount(unit, '治癒能力'); i++) addStats(unit, 0, 2, 'healing');
  for (let i = 0; i < coreEffectCount(unit, 'ゴーレム'); i++) addStats(unit, 2, 2, 'golem');
  for (let i = 0; i < coreEffectCount(unit, 'ギガンテス'); i++) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, actualDamage, 0, 'gigantes'));
  }
  for (let i = 0; i < coreEffectCount(unit, 'ブラウニー'); i++) allies.filter(x => x.hp > 0).forEach(x => addStats(x, 0, 2, 'brownie'));
  for (let i = 0; i < coreEffectCount(unit, 'エルフ'); i++) {
    unit.shield = (Number(unit.shield) || 0) + 1;
    emit({ type: 'keyword_effect', effect: 'shield', side: unit.side, unitId: unit.id, amount: 1 });
  }
  const redBonus = coreEffectCount(unit, 'コボルド');
  for (let i = 0; i < redBonus; i++) allies.filter(x => x.hp > 0 && x.color === '赤').forEach(x => addStats(x, 1, 1, 'kobold'));
  // 旧本文（負傷：全ての敵はATK-1）の時だけ。本文が変われば下の汎用処理へ移る。
  // **`injuryText` はこの下で宣言されるので、ここでは触らない**（TDZで参照エラーになる）。
  // 新しい本文（常時：敵を倒した時に血）へ差し替わったら、この旧効果は動かさない。
  if (!/敵を倒した時、血を/.test(coreUnitEffectText(unit))) {
    for (let i = 0; i < coreEffectCount(unit, 'インキュバス'); i++) foes.filter(x => x.hp > 0).forEach(x => addStats(x, -1, 0, 'incubus'));
  }
  for (let i = 0; i < coreEffectCount(unit, 'カオス・インプ'); i++) allies.filter(x => x.hp > 0 && coreUnitHasSacrifice(x)).forEach(x => addStats(x, 0, 1, 'chaos_imp'));
  for (let i = 0; i < coreEffectCount(unit, '逆上'); i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, unit._tripleMerged ? 6 : 3);
  }
  for (let i = 0; i < coreEffectCount(unit, 'メデューサ') && actualDamage > 0; i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, actualDamage);
  }
  for (let i = 0; i < coreEffectCount(unit, 'ケットシー'); i++) {
    // ナイトキャットはケットシーの右隣へ出る。召喚イベントの発生順と
    // 画面上の並び順を一致させ、連続召喚時に左側へ巻き戻らないようにする。
    coreSummonUnit(state, unit.side, { name: '黄ナイトキャット', color: '黄', placement: 'rightOfSource' }, emit, unit.id);
  }
  for (let i = 0; i < coreEffectCount(unit, '波の娘"ラン・ドーター"'); i++) {
    coreSummonUnit(state, unit.side, { name: '黒ケルピー', atk: 1, hp: 3 }, emit, unit.id);
    coreSummonUnit(state, unit.side, { name: '黒ケルピー', atk: 1, hp: 3 }, emit, unit.id);
  }
  for (let i = 0; i < coreEffectCount(unit, '鉄の拳"フォルニョート"'); i++) addStats(unit, 3, 1, 'fornjot');
  for (let i = 0; i < coreEffectCount(unit, '残響の魔導師"アバドン"'); i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, 3);
  }
  for (let i = 0; i < coreEffectCount(unit, '夜刻の巫女"ウムブラ"'); i++) allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 8, 8, 'umbra'));
  // ミノタウロス：負傷：**効果ダメージを受けた場合**、ランダムな敵に攻撃する。
  // 戦闘ダメージ（攻撃・反撃）では発動しない。毒やカード効果のダメージでは発動する。
  const injuredByEffectDamage = (causeKind || 'other') !== 'combat';
  for (let i = 0; injuredByEffectDamage && i < coreEffectCount(unit, 'ミノタウロス'); i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      unit._currentAttackTarget = target;
      coreApplyAttackEffects(unit, state, rng, emit, applyHit);
      emit({ type: 'attack', side: unit.side, attackerId: unit.id, targetId: target.id, damage: unit.atk, counterDamage: target.atk, immediate: true });
      applyHit(unit, target, unit.atk);
      if (target.hp > 0) applyHit(target, unit, target.atk, true);
      delete unit._currentAttackTarget;
    }
  }
  if (coreHasEffect(unit, '咬竜"グレイプニル"')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      unit._currentAttackTarget = target;
      coreApplyAttackEffects(unit, state, rng, emit, applyHit);
      emit({ type: 'attack', side: unit.side, attackerId: unit.id, targetId: target.id, damage: unit.atk, counterDamage: target.atk, immediate: true });
      applyHit(unit, target, unit.atk);
      if (target.hp > 0) applyHit(target, unit, target.atk, true);
      delete unit._currentAttackTarget;
    }
  }
  const injuryText = coreUnitTriggerText(unit, '負傷').replace(/^(?:負傷|攻撃[＆&]負傷)\s*[：:]/, '');
  const injurySelfBuff = injuryText.match(/このキャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (Number(unit.ringInjuryHp) > 0) allies.filter(x => x.hp > 0 && !coreIsSealed(x))
    .forEach(x => addStats(x, 0, Number(unit.ringInjuryHp), 'ring_injury_hp'));
  // ゴーレムは同じ文面を持つが、名前固有処理で既に一度だけ適用する。
  if (injurySelfBuff && !coreHasEffect(unit, 'ゴーレム')) addStats(unit, Number(injurySelfBuff[1]), Number(injurySelfBuff[2]), 'injury_self_buff');
  const hpLoss = injuryText.match(/このキャラクターにダメージを与えた敵はHP-Xを得る/);
  if (hpLoss && source && source.side !== unit.side) {
    const amount = Math.max(0, Number(actualDamage) || 0);
    const before = Math.max(0, Number(source.maxHp || source.hp) || 0);
    source.maxHp = Math.max(1, before - amount);
    source.hp = Math.min(Math.max(0, Number(source.hp) || 0), source.maxHp);
    emit({ type: 'stat_change', side: source.side, unitId: source.id, atk: 0, hp: source.maxHp - before, reason: 'injury_hp_loss' });
  }
  const injuryAlliesAtk = injuryText.match(/全ての味方はATK\+Xを得る/);
  if (injuryAlliesAtk && !coreHasEffect(unit, 'ギガンテス')) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, actualDamage, 0, 'injury_allies_atk'));
  }
  const injuryColorBuff = injuryText.match(/全ての([赤青緑黄紫茶])キャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  // コボルドは旧来のカード名効果で同じ本文を既に解決している。
  // 本文解析も通すと、コボルド自身の負傷効果だけが二重になる。
  if (injuryColorBuff && !coreHasEffect(unit, 'コボルド')) {
    const color = injuryColorBuff[1] === '茶' ? '黄' : injuryColorBuff[1];
    allies.filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x))
      .forEach(x => addStats(x, Number(injuryColorBuff[2]), Number(injuryColorBuff[3]), 'injury_color_buff'));
  }
  const injuryRandomColors = injuryText.match(/ランダムな([赤青緑黄紫茶])、([赤青緑黄紫茶])、([赤青緑黄紫茶])キャラクター1体ずつは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (injuryRandomColors) {
    [injuryRandomColors[1], injuryRandomColors[2], injuryRandomColors[3]].forEach(color => {
      const target = rng.pick(allies.filter(x => x.hp > 0 && x.color === color && !coreIsSealed(x)));
      if (target) addStats(target, Number(injuryRandomColors[4]), Number(injuryRandomColors[5]), 'injury_random_color_buff');
    });
  }
  const injurySacrificeHp = injuryText.match(/全ての生贄を持つキャラクターはHP\+([0-9]+)を得る/);
  if (injurySacrificeHp && !coreHasEffect(unit, 'カオス・インプ')) allies.filter(x => x.hp > 0 && coreUnitHasSacrifice(x) && !coreIsSealed(x))
    .forEach(x => addStats(x, 0, Number(injurySacrificeHp[1]), 'injury_sacrifice_hp'));
  const injuryAlliesHp = injuryText.match(/全ての仲間のHPが\+([0-9]+)される/);
  if (injuryAlliesHp && !coreHasEffect(unit, 'ブラウニー')) allies.filter(x => x.hp > 0 && !coreIsSealed(x))
    .forEach(x => addStats(x, 0, Number(injuryAlliesHp[1]), 'injury_allies_hp'));
  if (/直ちにランダムな敵に攻撃する/.test(injuryText)
    && !coreHasEffect(unit, 'ミノタウロス') && !coreHasEffect(unit, '咬竜"グレイプニル"')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      const damage = Math.max(0, Number(unit.atk) || 0);
      emit({ type: 'attack', side: unit.side, attackerId: unit.id, targetId: target.id,
        damage, counterDamage: Math.max(0, Number(target.atk) || 0), immediate: true, injury: true });
      if (damage) applyHit(unit, target, damage);
      if (target.hp > 0) applyHit(target, unit, target.atk, true);
    }
  }
  const injuryRandomDamage = injuryText.match(/ランダムな敵に(\d+)ダメージ/);
  if (injuryRandomDamage && unit.name !== '逆上' && !coreHasEffect(unit, '残響の魔導師"アバドン"') && !coreHasEffect(unit, '逆上')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, Number(injuryRandomDamage[1]) || 0);
  }
  const injuryDamageByTaken = injuryText.match(/ランダムな敵にXダメージを与える。Xは受けたダメージに等しい/);
  // 「メデューサ」効果として上の名前ブロックが既に解決している場合はここで撃たない。
  // 両方が走ると反射ダメージが2回出る（＝負傷効果が2回発動して見える）。
  // 名前ブロックは共振・複製による複数所持も coreEffectCount で数えるため、そちらを正とする。
  if (injuryDamageByTaken && actualDamage > 0 && !coreHasEffect(unit, 'メデューサ')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, actualDamage);
  }
  // 負傷：この戦闘中、召喚された味方はATK+Xを得る（エイドロン）
  const injurySummonAtk = injuryText.match(/^この戦闘中、召喚された味方はATK\+(\d+)を得る/);
  if (injurySummonAtk) coreAddSummonBuff(state, unit.side, Number(injurySummonAtk[1]) || 0, 0, emit, unit.id);
  // 負傷：ランダムな味方に「死亡：「X」を召喚する。」を付与する（ボーンチャリオット）
  const injuryGrantDeathSummon = injuryText.match(/^ランダムな味方に「死亡：「(.+?)」を召喚する。」を付与する/);
  if (injuryGrantDeathSummon) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      const name = String(injuryGrantDeathSummon[1] || '');
      const color = (name.match(/^([赤青緑黄紫茶黒白])/) || [])[1] || '';
      target.effectData = { ...(target.effectData || {}), grantedDeathSummon: { name, color } };
      emit({ type: 'death_summon_grant', side: target.side, unitId: target.id, sourceId: unit.id,
        summon: target.effectData.grantedDeathSummon });
    }
  }
  const injuryMana = injuryText.match(/^(\d+)マナを得る/);
  if (injuryMana && !Number(unit.manaOnInjury)) coreGainResource(state, unit.side, 'mana', Number(injuryMana[1]), unit, emit, 'injury_mana');
  const injuryChanceMana = injuryText.match(/^(\d+)%の確率で(\d+)マナを得る/);
  if (injuryChanceMana && rng && typeof rng.next === 'function' && rng.next() < Number(injuryChanceMana[1]) / 100) {
    // 確率に当たった時だけ光らせる（外れた時は何も出さない）。
    coreEmitEffectFlash(emit, unit, 'injury');
    coreGainResource(state, unit.side, 'mana', Number(injuryChanceMana[2]), unit, emit, 'injury_chance_mana');
  }
  const injuryEnemyAtkDown = injuryText.match(/全ての敵はATK-([0-9]+)を得る/);
  if (injuryEnemyAtkDown && !coreHasEffect(unit, 'インキュバス')) foes.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, -Number(injuryEnemyAtkDown[1]), 0, 'injury_enemy_atk_down'));
  const injuryAlliesFixedHp = injuryText.match(/全ての味方は\+([0-9]+)\/\+([0-9]+)を得る/);
  if (injuryAlliesFixedHp && !coreHasEffect(unit, '夜刻の巫女"ウムブラ"')) allies.filter(x => x.hp > 0 && !coreIsSealed(x))
    .forEach(x => addStats(x, Number(injuryAlliesFixedHp[1]), Number(injuryAlliesFixedHp[2]), 'injury_allies_fixed_buff'));
  const injuryLife = injuryText.match(/ライフが\+([0-9]+)される/);
  if (injuryLife) {
    state.life = state.life || { p1: 0, p2: 0 };
    state.life[unit.side] = (Number(state.life[unit.side]) || 0) + Number(injuryLife[1]);
    emit({ type: 'life_gain', side: unit.side, amount: Number(injuryLife[1]), sourceId: unit.id, reason: 'injury' });
  }
  const injuryAllDamage = injuryText.match(/全てのキャラクターに(\d+)ダメージ/);
  if (injuryAllDamage && !/^全てのキャラクターに\d+ダメージ/.test(injuryText)) [...allies, ...foes].filter(x => x.hp > 0 && !coreIsSealed(x))
    .forEach(x => applyHit(unit, x, Number(injuryAllDamage[1]) || 0));
  const allInjury = injuryText.match(/全てのキャラクターに(\d+)ダメージ/);
  if (allInjury) {
    const amount = Math.max(1, Number(allInjury[1]) || 1);
    coreHitAll(state, rng, emit, applyHit, unit, [...allies, ...foes].filter(x => x.hp > 0 && !coreIsSealed(x)), amount);
  }
  } finally { coreEndSummonBatch(state, emit); }
}

function coreApplyReleaseEffects(unit, sacrificed, state, rng, emit, applyHit) {
  if (!unit || unit.hp <= 0) return;
  // 解放効果が発動した合図（紫）。効果文を持つ時だけ光らせる。
  if (String(coreUnitTriggerText(unit, '解放') || '').trim()) coreEmitEffectFlash(emit, unit, 'release');
  const foes = (state.units[unit.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const addStats = (atk, hp, reason) => {
    atk = coreStatBonus(unit, atk, unit); hp = coreStatBonus(unit, hp, unit);
    unit.atk = Math.max(0, unit.atk + atk);
    unit.maxHp = Math.max(1, unit.maxHp + hp);
    unit.hp = Math.max(0, unit.hp + hp);
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk, hp, reason, sourceId: unit.id });
    coreTriggerAtkGainEffects(unit, atk, state, rng, emit, applyHit);
  };
  const data = unit.effectData || {};
  const releaseText = coreUnitTriggerText(unit, '解放').replace(/^解放\s*[：:]\s*/, '');
  const releaseAtk = Number(unit._releaseAtkBonus) || Number(data.releaseAtkBonus) || 0;
  const releaseHp = Number(unit._releaseHpBonus) || Number(data.releaseHpBonus) || 0;
  if (releaseAtk || releaseHp) addStats(releaseAtk, releaseHp, 'release_bonus');
  const selfBuff = releaseText.match(/このキャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  if (selfBuff && !releaseAtk && !releaseHp) addStats(Number(selfBuff[1]), Number(selfBuff[2]), 'release_self_buff');
  (state.units[unit.side] || []).filter(x => x && x.hp > 0 && coreHasEffect(x, 'カオス・インプ') && !coreIsSealed(x)).forEach(chaos => {
    const target = rng.pick((state.units[unit.side] || []).filter(x => x && x !== chaos && x.hp > 0 && !coreIsSealed(x)));
    if (target) coreApplyOpeningEffects(target, state, rng, emit, applyHit, `release:${unit.id}:${chaos.id}`);
  });
  (state.units[unit.side] || []).filter(x => x && x.hp > 0 && coreHasEffect(x, 'ファナティック') && !coreIsSealed(x)).forEach(x => {
    const blood = Math.max(0, Number(state.blood && state.blood[unit.side]) || 0);
    if (!blood) return;
    const atk = coreStatBonus(x, blood, unit), hp = coreStatBonus(x, blood, unit);
    x.atk += atk; x.maxHp += hp; x.hp += hp; x.shield = (Number(x.shield) || 0) + 1;
    emit({ type: 'stat_change', side: x.side, unitId: x.id, atk, hp, reason: 'fanatic_blood', sourceId: unit.id });
    emit({ type: 'keyword_effect', effect: 'shield', side: x.side, unitId: x.id, amount: 1, sourceId: unit.id });
  });
  if (coreHasEffect(unit, 'アークデーモン')) {
    const purple = (state.units[unit.side] || []).filter(x => x && x.hp > 0 && x.color === '紫' && !coreIsSealed(x));
    const repeats = coreConnectedEnhancementCount(unit);
    for (let i = 0; i < repeats; i++) purple.forEach(x => {
      const atk = coreStatBonus(x, 1, unit), hp = coreStatBonus(x, 1, unit);
      x.atk += atk; x.maxHp += hp; x.hp += hp;
      emit({ type: 'stat_change', side: x.side, unitId: x.id, atk, hp, reason: 'arch_demon_purple_buff', sourceId: unit.id });
    });
  }
  if (/生贄にしたキャラクター全ての戦闘力を得る/.test(releaseText) && !coreHasEffect(unit, 'アークデーモン')) {
    addStats((sacrificed || []).reduce((n, x) => n + Math.max(0, Number(x.atk) || 0), 0),
      (sacrificed || []).reduce((n, x) => n + Math.max(0, Number(x.maxHp || x.hp) || 0), 0), 'release_sacrifice_power');
  }
  // 解放：ランダムな敵にXダメージ。接続しているエンチャントの数だけ繰り返す（フィーンド）。
  // 合体後は「2倍の数だけ」。**回数も倍率も本文から読む。**
  const releaseRandomRepeat = releaseText
    .match(/ランダムな敵に(\d+)ダメージを与える。このキャラクターに接続しているエンチャントの(2倍の)?数だけ繰り返す/);
  if (releaseRandomRepeat) {
    const times = coreConnectedEnhancementCount(unit) * (releaseRandomRepeat[2] ? 2 : 1);
    for (let i = 0; i < times; i++) {
      const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
      if (!target) break;
      applyHit(unit, target, Number(releaseRandomRepeat[1]) || 0);
    }
  }
  const releaseEnemyDamage = releaseText.match(/全ての敵に(\d+)ダメージ/);
  if (releaseEnemyDamage) {
    const repeats = Math.max(1, Number(unit._adjacentPanelEffectTexts && unit._adjacentPanelEffectTexts.length) || 1);
    for (let i = 0; i < repeats; i++) coreHitAll(state, rng, emit, applyHit, unit, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), Number(releaseEnemyDamage[1]) || 0);
  }
  if (coreHasEffect(unit, 'アークデーモン')) {
    addStats((sacrificed || []).reduce((n, x) => n + Math.max(0, Number(x.atk) || 0), 0),
      (sacrificed || []).reduce((n, x) => n + Math.max(0, Number(x.maxHp || x.hp) || 0), 0), 'arch_demon');
  }
  if (coreHasEffect(unit, 'オーバーロード')) addStats(unit.atk, unit.maxHp, 'overload');
  if (coreHasEffect(unit, 'ベヒーモス')) {
    const before = Number(state.resources[unit.side].mana) || 0;
    state.resources[unit.side].mana = before * 2;
    emit({ type: 'mana_set', side: unit.side, amount: state.resources[unit.side].mana, reason: 'behemoth' });
  }
  if (/マナを2倍にする/.test(releaseText) && !coreHasEffect(unit, 'ベヒーモス')) {
    const before = Number(state.resources[unit.side].mana) || 0;
    state.resources[unit.side].mana = before * 2;
    emit({ type: 'mana_set', side: unit.side, amount: state.resources[unit.side].mana, reason: 'release_mana_double' });
  }

  if (/このキャラクターの戦闘力を2倍にする/.test(releaseText) && !coreHasEffect(unit, 'オーバーロード')) {
    const atk = unit.atk, hp = unit.maxHp;
    addStats(atk, hp, 'release_power_double');
  }
  // 解放：ランダムな敵N体に封印∞を付与する（アビス・バロン。合体後は2体）。
  // **名前では分岐しない。** 体数は本文から読む。
  const releaseSeal = releaseText.match(/ランダムな敵(?:(\d+)体)?に封印∞を付与する/);
  if (releaseSeal || coreHasEffect(unit, 'アビス・バロン')) {
    const sealPool = foes.filter(x => x.hp > 0 && !coreIsSealed(x));
    corePickDistinct(rng, sealPool, Math.max(1, Number(releaseSeal && releaseSeal[1]) || 1)).forEach(target => {
      target._sealed = true; target._sealValue = Infinity; target._sealInfinity = true;
      emit({ type: 'seal_apply', side: target.side, unitId: target.id, value: 'infinite', sourceId: unit.id });
    });
  }
}

function coreApplyKeywordOnHit(attacker, target, damageDone, targetPreHp, state, emit, options) {
  const damage = Math.max(0, Number(damageDone) || 0);
  if (!attacker || !target || damage <= 0) return { protected: false, killed: false, healed: 0 };
  const keywords = coreUnitKeywords(attacker);
  const amounts = coreKeywordHitAmounts(attacker, damage);
  // 加護は状態異常のまとまりを1回無効化する。指輪などG依存の保護は呼び出し側で追加する。
  const hasAilment = keywords.includes('即死') || keywords.some(k => /^(?:毒牙|毒|邪眼|衝撃)\d*$/.test(String(k || '')))
    || Math.max(0, Number(attacker.weakenOnHit) || 0) > 0;
  const protectedByWard = hasAilment ? coreConsumeWardCharge(target) : false;
  const protectedByRing = hasAilment && target.side === 'p1' && coreRingCount(state, 'p1', '加護の指輪') > 0;
  const result = { protected: protectedByWard, killed: false, healed: 0 };
  const bonus = Math.max(0, Number(options && options.bonus) || 0);
  if (protectedByWard || protectedByRing) { result.protected = true; return result; }
  if (coreUnitHasKeyword(target, '呪詛') && attacker.hp > 0) {
    attacker.hp = 0;
    result.cursed = true;
    emit({ type: 'curse_death', side: attacker.side, unitId: attacker.id, sourceId: target.id });
  }
  if (amounts.instantDeath && target.hp > 0) {
    target.hp = 0;
    result.killed = true;
    emit({ type: 'instant_death', side: target.side, unitId: target.id, sourceId: attacker.id });
  }
  if (target.hp <= 0) return result;
  const poisonAmount = amounts.poisonFang + amounts.poison;
  if (poisonAmount > 0) {
    const multiplier = target.side === 'p2' && coreRingCount(state, 'p2', '毒沼の指輪') ? 2 : 1;
    const applied = (poisonAmount + bonus) * multiplier;
    target.poison = Math.max(0, Number(target.poison) || 0) + applied;
    emit({ type: 'keyword_effect', effect: 'poison', side: target.side, unitId: target.id, sourceId: attacker.id, amount: applied });
  }
  const eye = amounts.evilEye;
  if (eye > 0) {
    const combatBonus = bonus + ((state.units[attacker.side] || []).some(x => x && x.hp > 0 && coreHasEffect(x, 'ヴォイド・ウォーカー') && x.color === '紫') ? 1 : 0);
    target.atk = Math.max(0, target.atk - eye - combatBonus);
    emit({ type: 'keyword_effect', effect: 'evil_eye', side: target.side, unitId: target.id, sourceId: attacker.id, amount: eye + combatBonus });
  }
  const shock = amounts.shock;
  if (shock > 0) {
    const combatBonus = bonus + ((state.units[attacker.side] || []).some(x => x && x.hp > 0 && coreHasEffect(x, 'ヴォイド・ウォーカー') && x.color === '紫') ? 1 : 0);
    target.weaken = Math.max(0, Number(target.weaken) || 0) + shock + combatBonus;
    emit({ type: 'keyword_effect', effect: 'weaken', side: target.side, unitId: target.id, sourceId: attacker.id, amount: shock + combatBonus });
  }
  if (amounts.lifeDrain > 0 && !(options && options.skipLifeDrain)) {
    const heal = Math.min(amounts.lifeDrain, Math.max(0, Number(targetPreHp) || 0));
    if (heal > 0 && attacker.hp > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      result.healed = heal;
      emit({ type: 'life_drain', side: attacker.side, unitId: attacker.id, amount: heal, sourceId: target.id });
    }
  }
  return result;
}

function coreApplyPoisonBeforeTurn(unit, emit) {
  const damage = Math.max(0, Number(unit && unit.poison) || 0);
  if (!unit || unit.hp <= 0 || coreIsSealed(unit) || !damage) return { amount: 0, died: false };
  const result = coreApplyDamage(unit, damage, emit, { keywordEffect: '毒', effect: true });
  return { amount: result.amount, died: result.died };
}

function coreTriggerManaOnAttack(unit, state, emit) {
  return coreGainResource(state, unit && unit.side, 'mana', coreManaOnAttackValue(unit), unit, emit, 'manaOnAttack');
}
function coreTriggerManaOnInjury(unit, state, emit) {
  return coreGainResource(state, unit && unit.side, 'mana', unit && unit.manaOnInjury, unit, emit, 'manaOnInjury');
}
function coreTriggerDeath(unit, state, emit) {
  if (!unit || unit._coreDeathTriggered) return;
  unit._coreDeathTriggered = true;
  state.blood = state.blood || { p1: 0, p2: 0 };
  state.blood[unit.side] = Math.max(0, Number(state.blood[unit.side]) || 0) + 1;
  emit({ type: 'blood_set', side: unit.side, amount: state.blood[unit.side], gained: 1 });
  // 血の指輪：常時：キャラクターが死亡するたび、追加で血を得る。
  // 「キャラクターが」なので陣営を問わない（敵が死んでも指輪の持ち主が得る）。
  const bloodRings = coreRingCount(state, 'p1', '血の指輪');
  if (bloodRings) {
    state.blood.p1 = Math.max(0, Number(state.blood.p1) || 0) + bloodRings;
    emit({ type: 'blood_set', side: 'p1', amount: state.blood.p1, gained: bloodRings });
  }
  state.deadUnits = Array.isArray(state.deadUnits) ? state.deadUnits : [];
  state.deadUnits.push(coreUnitSnapshot(unit));
  coreGainResource(state, unit.side, 'mana', unit.manaOnDeath, unit, emit, 'manaOnDeath');
  coreGainResource(state, unit.side, 'gold', unit.goldOnDeath, unit, emit, 'goldOnDeath');
  // 人数が減ったことを記録しておく（減った時は何も起きない）。記録を減らさないと、
  // 後から召喚し直しても「増えて7体以上になった」と判定できず、ウォーグが発動しない。
  coreApplyWargThreshold(state, unit.side, emit);
}
// ダメージ種別を death_effect に固定して実行する（再生側が種類ごとにまとめて見せるため）。
function coreApplyDeathEffects(unit, state, rng, emit, applyHit) {
  return coreWithDamageKind(state, 'death_effect', () => coreApplyDeathEffectsInner(unit, state, rng, emit, applyHit));
}

function coreApplyDeathEffectsInner(unit, state, rng, emit, applyHit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!unit || unit._coreDeathEffectsTriggered) return;
  unit._coreDeathEffectsTriggered = true;
  if (coreUnitIsSilenced(unit)) return;
  // 死亡：このキャラクターは封印Xを得て封印される。Xは現在の血のN倍に等しい（ナイトメア）。
  // **倍率は本文から読む**（合体後は2倍）。
  const nightmareSeal = coreUnitEffectText(unit)
    .match(/封印Xを得て封印される。Xは現在の血の(\d+)倍に等しい/);
  if (nightmareSeal || coreHasEffect(unit, 'ナイトメア')) {
    const blood = Math.max(0, Number(state.blood && state.blood[unit.side]) || 0);
    const scale = Math.max(1, Number(nightmareSeal && nightmareSeal[1]) || 2);
    unit.hp = Math.max(1, Number(unit.maxHp) || 1);
    unit._sealed = true;
    unit._sealValue = blood * scale;
    emit({ type: 'seal_apply', side: unit.side, unitId: unit.id, value: unit._sealValue, sourceId: unit.id, fromDeath: true });
  }
  const allies = (state.units[unit.side] || []).filter(Boolean);
  const foes = (state.units[unit.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const repeats = 1 + coreUnitKeywordCount(unit, '逆襲') + coreRingCount(state, unit.side, '屍術師の指輪')
    + Math.max(0, Number(unit._effectRepeatBonus) || Number(unit.effectData && unit.effectData.effectRepeatBonus) || 0);
  if (String(coreUnitTriggerText(unit, '死亡') || '').trim()) coreEmitEffectFlash(emit, unit, 'death', repeats);
  // 基本の死亡トリガは coreTriggerDeath() が1回処理済み。追加発動分だけここで加算する。
  const extraTriggerCount = Math.max(0, repeats - 1);
  if (extraTriggerCount) {
    coreGainResource(state, unit.side, 'mana', unit.manaOnDeath * extraTriggerCount, unit, emit, 'manaOnDeath_repeat');
    coreGainResource(state, unit.side, 'gold', unit.goldOnDeath * extraTriggerCount, unit, emit, 'goldOnDeath_repeat');
  }
  const addStats = (target, atk, hp, reason) => {
    if (!target || target.hp <= 0 || coreIsSealed(target)) return;
    target.atk = Math.max(0, target.atk + atk);
    target.maxHp = Math.max(1, target.maxHp + hp);
    target.hp = Math.max(0, target.hp + hp);
    emit({ type: 'stat_change', side: target.side, unitId: target.id, atk, hp, reason, sourceId: unit.id });
    coreTriggerAtkGainEffects(target, atk, state, rng, emit, applyHit);
  };
  for (let i = 0; i < repeats && coreHasEffect(unit, '闇の炎'); i++) {
    coreHitAll(state, rng, emit, applyHit, unit, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), 1);
  }
  for (let i = 0; i < repeats; i++) {
    coreUnitKeywords(unit).forEach(keyword => {
      const m = /^([赤青緑黄紫])全体強化(\d+)_(\d+)$/.exec(String(keyword));
      if (!m) return;
      allies.filter(x => x.hp > 0 && x.color === m[1]).forEach(x => addStats(x, Number(m[2]), Number(m[3]), 'death_color_buff'));
    });
  }
  if (coreHasEffect(unit, '遺志')) {
    for (let i = 0; i < coreEffectCount(unit, '遺志'); i++) {
      const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
      if (target) addStats(target, 3, 2, 'will');
    }
  }
  if (coreHasEffect(unit, '継承')) {
    for (let i = 0; i < coreEffectCount(unit, '継承'); i++) {
      const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
      if (target) addStats(target, unit.atk, 0, 'inherit');
    }
  }
  if (coreHasEffect(unit, 'ゴースト')) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && x.color === '青' && !coreIsSealed(x)));
    if (target) addStats(target, 2, 1, 'ghost');
  }
  if (coreHasEffect(unit, 'レムレース')) {
    const candidates = (state.deadUnits || []).filter(x => x && x.id !== unit.id && x.name !== '青レムレース');
    const dead = rng.pick(candidates);
    if (dead) {
      const atk = Math.max(1, Math.floor((Number(dead.atk) || 0) / 2));
      const maxHp = Math.max(1, Math.floor((Number(dead.maxHp || dead.hp) || 1) / 2));
      coreSummonUnit(state, unit.side, { name: dead.name, atk, hp: maxHp, maxHp, color: dead.color,
        keywords: dead.keywords || [], _useEnemyVisualFrame: true }, emit, unit.id);
    }
  }
  if (unit.side === 'p1' && coreHasEffect(unit, 'レムレース')) {
    const killer = unit._lastDamageSource;
    if (killer && killer !== unit) {
      emit({ type: 'bonus_reward', side: 'p1', unitId: killer.id, reason: 'lemures', unit: coreUnitSnapshot(killer) });
    }
  }
  if (coreHasEffect(unit, 'バンシー')) {
    for (let i = 0; i < repeats; i++) {
      const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
      if (!target) break;
      applyHit(unit, target, Math.max(0, Number(unit.atk) || 0));
    }
  }
  // 怨念：持っているユニットだけが発動する。Math.max(1,…)でループ回数を作ると
  // 怨念を持たない全ユニットの死亡時にATK分のダメージが1回飛んでしまう。
  for (let i = 0; i < repeats * coreEffectCount(unit, '怨念'); i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (!target) break;
    applyHit(unit, target, Math.max(0, Number(unit.atk) || 0));
  }
  for (let i = 0; i < repeats && coreHasEffect(unit, 'レイス'); i++) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)
      && !!coreUnitTriggerText(x, '負傷')));
    if (target) coreApplyInjuryEffects(target, 0, state, rng, emit, applyHit);
  }
  // 常時：このキャラクターが敵を倒した時、血をN得る（インキュバス）。
  // **倒した側の常時効果**なので、倒された体ではなくダメージ源を見る。
  {
    const killer = unit._lastDamageSource;
    const killText = killer ? coreUnitEffectText(killer) : '';
    const killBlood = killText && killText.match(/このキャラクターが敵を倒した時、血を(\d+)得る/);
    if (killer && killer.hp > 0 && killer.side && killer.side !== unit.side && killBlood) {
      state.blood = state.blood || { p1: 0, p2: 0 };
      const gain = Number(killBlood[1]) || 0;
      state.blood[killer.side] = Math.max(0, Number(state.blood[killer.side]) || 0) + gain;
      coreEmitPassiveFlash(emit, killer);
      emit({ type: 'blood_set', side: killer.side, amount: state.blood[killer.side], gained: gain, sourceId: killer.id });
    }
  }
  // サキュバス：この攻撃で倒した敵の状態を味方として召喚する。
  const lastSource = unit._lastDamageSource;
  // サキュバスは「通常攻撃で倒した敵」だけを仲間にする。最後のダメージ源
  // だけを参照すると、反撃・負傷効果・毒などで後から死亡した敵まで捕獲し、
  // 反撃時の誤発動や同じ敵の二重捕獲につながる。
  if (unit.side === 'p2' && !unit._lastDamageWasCounter && lastSource && lastSource !== unit
    && lastSource._coreAttackContact === true
    && lastSource.side === 'p1' && coreHasEffect(lastSource, 'サキュバス')
    && !/ランダムな前衛の敵を奪う/.test(coreUnitEffectText(lastSource))) {
    coreSummonUnit(state, 'p1', {
      name: unit.name,
      atk: Math.max(0, Number(unit.atk) || 0),
      hp: Math.max(1, Number(unit.maxHp) || 1),
      maxHp: Math.max(1, Number(unit.maxHp) || 1),
      color: unit.color, race: unit.race, keywords: [...(unit.keywords || [])], desc: unit.desc,
      art: unit.art, no: unit.no,
      // 仲間化後は味方盤面のユニット。敵側カードの絵・ステータスは引き継ぐが、
      // 敵枠を強制すると味方側で枠だけ敵用に変わる。
      _useEnemyVisualFrame: true, _summonedBySuccubus: true,
    }, emit, lastSource.id);
  }
  // 新しい本文では負傷トリガへ移る。負傷側に書かれていたら死亡側では動かさない。
  if (coreHasEffect(unit, 'ボーンチャリオット')
    && !/ランダムな味方に「死亡：/.test(coreUnitTriggerText(unit, '負傷'))) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      target.effectData = { ...(target.effectData || {}), grantedDeathSummon: { name: '青スケルトン', color: '青' } };
      emit({ type: 'death_summon_grant', side: target.side, unitId: target.id, sourceId: unit.id, summon: target.effectData.grantedDeathSummon });
    }
  }
  const granted = unit.effectData && unit.effectData.grantedDeathSummon;
  if (granted) coreSummonUnit(state, unit.side, granted, emit, unit.id);
  if (coreHasEffect(unit, '深藍の魔女"ティアマリス"')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      target.hp = 0;
      emit({ type: 'instant_death', side: target.side, unitId: target.id, sourceId: unit.id });
      coreTriggerDeath(target, state, emit);
      coreApplyDeathEffects(target, state, rng, emit, applyHit);
      coreApplyDeathObservers(target, state, rng, emit, applyHit);
      coreTryRevive(target, state, emit);
    }
  }
  // 旧本文の時だけ。**`deathText` はこの下で宣言されるので触らない**（TDZ）。
  // 新しい本文（死亡：召喚された味方は+X/+Y）へ差し替わったら、この旧効果は動かさない。
  const _phantomOldText = !/召喚された味方は\+/.test(coreUnitTriggerText(unit, '死亡'));
  for (let i = 0; i < repeats && _phantomOldText && coreHasEffect(unit, 'ファントム'); i++) {
    for (let j = 0; j < 3; j++) coreSummonUnit(state, unit.side, { name: '青シャドウ', atk: 1, hp: 1 }, emit, unit.id);
  }
  for (let i = 0; i < repeats && coreHasEffect(unit, 'デスナイト'); i++) {
    coreSummonUnit(state, unit.side, { name: '青スケルトン', color: '青' }, emit, unit.id);
  }
  const deathText = coreUnitTriggerText(unit, '死亡').replace(/^死亡\s*[：:]/, '');
  // 死亡：この戦闘中、召喚された味方は+X/+Yを得る（ファントム）
  const deathSummonBuff = deathText.match(/^この戦闘中、召喚された味方は\+(\d+)\/\+(\d+)を得る/);
  if (deathSummonBuff) {
    coreAddSummonBuff(state, unit.side, Number(deathSummonBuff[1]) || 0, Number(deathSummonBuff[2]) || 0, emit, unit.id);
  }
  // 死亡：血をN得る（スリープシープ）
  const deathBlood = deathText.match(/^血を(\d+)得る/);
  if (deathBlood) {
    state.blood = state.blood || { p1: 0, p2: 0 };
    const gain = Number(deathBlood[1]) || 0;
    state.blood[unit.side] = Math.max(0, Number(state.blood[unit.side]) || 0) + gain;
    emit({ type: 'blood_set', side: unit.side, amount: state.blood[unit.side], gained: gain, sourceId: unit.id });
  }
  // 死亡：ランダムな前衛の敵をN体奪う（サキュバス。合体後は2体）
  const deathSteal = deathText.match(/^ランダムな前衛の敵(?:(\d+)体)?を奪う/);
  if (deathSteal) {
    const stealPool = foes.filter(x => x.hp > 0 && !coreIsSealed(x)
      && (x.lane || 'front') !== 'rear' && !x._isObject && !x._isSoul);
    corePickDistinct(rng, stealPool, Math.max(1, Number(deathSteal[1]) || 1)).forEach(stolen => {
      // 奪った体は元の盤面から居なくなり、味方として召喚し直す（サキュバスの捕獲と同じ形）。
      // **配列から null で抜かないこと。** 盤面配列は「生きている体を左詰め」で持つ決まりで、
      // 穴を開けると最終盤面の書き出し（battleCoreFinalState）が null を踏む。
      // 死亡と同じくHPを0にして、詰め直しに任せる（死亡効果は発動させない）。
      stolen.hp = 0;
      stolen._stolen = true;
      emit({ type: 'unit_stolen', side: stolen.side, unitId: stolen.id, sourceId: unit.id, toSide: unit.side });
      coreSummonUnit(state, unit.side, {
        name: stolen.name,
        atk: Math.max(0, Number(stolen.atk) || 0),
        hp: Math.max(1, Number(stolen.maxHp) || 1),
        maxHp: Math.max(1, Number(stolen.maxHp) || 1),
        color: stolen.color, race: stolen.race, keywords: [...(stolen.keywords || [])],
        desc: stolen.desc, art: stolen.art, no: stolen.no,
        _useEnemyVisualFrame: true, _summonedBySuccubus: true,
      }, emit, unit.id);
    });
  }
  const deathMana = deathText.match(/^(\d+)マナを得る/);
  if (deathMana && !unit.manaOnDeath) coreGainResource(state, unit.side, 'mana', Number(deathMana[1]) * repeats, unit, emit, 'death_text_mana');
  const deathGold = deathText.match(/^(\d+)ゴールドを得る/);
  if (deathGold && !unit.goldOnDeath) coreGainResource(state, unit.side, 'gold', Number(deathGold[1]) * repeats, unit, emit, 'death_text_gold');
  const deathRandomDamage = deathText.match(/ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい/);
  if (deathRandomDamage && !coreHasEffect(unit, 'バンシー') && !coreHasEffect(unit, '怨念')) for (let i = 0; i < repeats; i++) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(unit, target, Math.max(0, Number(unit.atk) || 0));
  }
  const deathBlueBuff = deathText.match(/ランダムな青キャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
  // ゴーストは上の固有処理を正とし、本文解析を重ねない。
  if (deathBlueBuff && !coreHasEffect(unit, 'ゴースト')) for (let i = 0; i < repeats; i++) {
    const target = rng.pick(allies.filter(x => x.hp > 0 && x.color === '青' && !coreIsSealed(x)));
    if (target) addStats(target, Number(deathBlueBuff[1]), Number(deathBlueBuff[2]), 'death_random_blue_buff');
  }
  const deathRandomAllyBuff = deathText.match(/ランダムな味方に\+([0-9]+)\/\+([0-9]+)を(?:与える|得る)/);
  if (deathRandomAllyBuff && !coreHasEffect(unit, '遺志')) for (let i = 0; i < repeats; i++) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
    if (target) addStats(target, Number(deathRandomAllyBuff[1]), Number(deathRandomAllyBuff[2]), 'death_random_ally_buff');
  }
  if (/このキャラクターのATKをランダムな味方に与える/.test(deathText) && !coreHasEffect(unit, '継承')) {
    for (let i = 0; i < repeats; i++) {
      const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
      if (target) addStats(target, Math.max(0, Number(unit.atk) || 0), 0, 'death_atk_transfer');
    }
  }
  // レイスは固有処理を正とし、本文解析を重ねない。
  if (/ランダムな味方の負傷効果を発動する/.test(deathText) && !coreHasEffect(unit, 'レイス')) for (let i = 0; i < repeats; i++) {
    const target = rng.pick(allies.filter(x => x !== unit && x.hp > 0 && !coreIsSealed(x)));
    if (target) coreApplyInjuryEffects(target, 0, state, rng, emit, applyHit, null);
  }
  if (/このキャラクターを倒したキャラクターが報酬に出現する/.test(deathText) && unit._lastDamageSource) {
    emit({ type: 'bonus_reward', side: unit._lastDamageSource.side, unitId: unit._lastDamageSource.id,
      reason: 'death_killer_reward', unit: coreUnitSnapshot(unit._lastDamageSource) });
  }
  const deathAlliesBuff = deathText.match(/全ての味方(?:は|に)\+([0-9]+)\/\+([0-9]+)を(?:得る|与える)/);
  if (deathAlliesBuff) {
    for (let i = 0; i < repeats; i++) allies.filter(x => x.hp > 0 && !coreIsSealed(x))
      .forEach(x => addStats(x, Number(deathAlliesBuff[1]), Number(deathAlliesBuff[2]), 'death_allies_buff'));
  }
  const deathAll = deathText.match(/全ての敵キャラクターに(\d+)ダメージ/);
  if (deathAll && unit.name !== '闇の炎' && !coreHasEffect(unit, '闇の炎')) {
    const amount = Math.max(1, Number(deathAll[1]) || 1);
    for (let i = 0; i < repeats; i++) coreHitAll(state, rng, emit, applyHit, unit, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), amount);
  }
  const deathInstant = /ランダムな敵を即死させる/.test(deathText);
  if (deathInstant && !coreHasEffect(unit, '深藍の魔女"ティアマリス"')) {
    const target = rng.pick(foes.filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) {
      target.hp = 0;
      emit({ type: 'instant_death', side: target.side, unitId: target.id, sourceId: unit.id });
      coreTriggerDeath(target, state, emit);
      coreApplyDeathEffects(target, state, rng, emit, applyHit);
      coreApplyDeathObservers(target, state, rng, emit, applyHit);
      coreTryRevive(target, state, emit);
    }
  }
  // ボーンチャリオットの効果文には、付与する効果として
  // 「死亡：「青スケルトン」を召喚する。」という入れ子の引用符が含まれる。
  // これを汎用召喚として読むと「死亡：「青スケルトン」という不正名を
  // その場で召喚してしまうため、付与処理だけを正とする。
  const deathSummon = deathText.match(/「(.+?)」を召喚/);
  if (deathSummon && !coreHasEffect(unit, 'デスナイト') && !coreHasEffect(unit, 'ファントム')
    && !coreHasEffect(unit, 'ボーンチャリオット')) {
    for (let i = 0; i < repeats; i++) coreSummonUnit(state, unit.side, { name: deathSummon[1], color: unit.color }, emit, unit.id);
  }
  } finally { coreEndSummonBatch(state, emit); }
}
// ダメージ種別を death_effect に固定して実行する（再生側が種類ごとにまとめて見せるため）。
function coreApplyDeathObservers(dead, state, rng, emit, applyHit) {
  return coreWithDamageKind(state, 'death_effect', () => coreApplyDeathObserversInner(dead, state, rng, emit, applyHit));
}

function coreApplyDeathObserversInner(dead, state, rng, emit, applyHit) {
  if (!dead || dead._coreDeathObserved) return;
  dead._coreDeathObserved = true;
  const allies = (state.units[dead.side] || []).filter(Boolean);
  const foes = (state.units[dead.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const all = [...(state.units.p1 || []), ...(state.units.p2 || [])].filter(Boolean);
  if (dead.side === 'p2' && coreRingCount(state, 'p1', '魔力の指輪')) {
    coreGainResource(state, 'p1', 'mana', 2 * coreRingCount(state, 'p1', '魔力の指輪'), null, emit, 'magic_ring');
  }
  const addStats = (u, atk, hp, reason) => {
    if (!u || u.hp <= 0 || coreIsSealed(u)) return;
    atk = coreStatBonus(u, atk); hp = coreStatBonus(u, hp);
    u.atk = Math.max(0, u.atk + atk); u.maxHp = Math.max(1, u.maxHp + hp); u.hp += hp;
    // 「味方が死亡するたび」等の常時効果が発動した合図（白）。
    coreEmitPassiveFlash(emit, u);
    emit({ type: 'stat_change', side: u.side, unitId: u.id, atk, hp, reason, sourceId: u.id });
    coreTriggerAtkGainEffects(u, atk, state, rng, emit, applyHit);
  };
  // 「仲間が死亡するたび、このキャラクターは+2/+1を得る」系のデータ効果。
  all.filter(u => u && u.hp > 0 && u.side === dead.side && /仲間が死亡するたび/.test(String(u.desc || u.effectText || '')))
    .forEach(u => addStats(u, 2, 1, 'ally_death_buff'));
  if (dead.side === 'p1') {
    all.filter(u => u && u.hp > 0 && u.side === 'p1' && /味方が死亡するたび、このキャラクターは\+1\/\+1を得る/.test(coreUnitEffectText(u)))
      .forEach(u => addStats(u, 1, 1, 'ally_death_self_buff'));
  }
  if (dead.side === 'p2') {
    state._enemyDeaths = (state._enemyDeaths || 0) + 1;
    // カード文面どおり、その戦闘で死んだ敵の累積数だけ今回の効果を繰り返す。
    // 固有処理と汎用本文処理の両方を通さないことが重要。
    state.units.p1.filter(Boolean).filter(u => u.hp > 0 && coreHasEffect(u, 'ヘルハウンド')).forEach(u => {
      for (let i = 0; i < state._enemyDeaths; i++) addStats(u, 1, 1, 'hellhound');
    });
    all.filter(u => u && u.hp > 0 && u.side === 'p1' && /敵が死亡するたび、全ての味方は\+4\/\+3を得る/.test(coreUnitEffectText(u)))
      .forEach(u => state.units.p1.filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 4, 3, 'enemy_death_team_buff')));
    all.filter(u => u && u.hp > 0 && u.side === 'p1'
      && !coreHasEffect(u, 'ヘルハウンド')
      && /敵が死んだ時、\+1\/\+1を得る/.test(coreUnitEffectText(u)))
      .forEach(u => addStats(u, 1, 1, 'enemy_death_self_buff'));
  }
  all.filter(u => u && u.hp > 0 && /キャラクターが死亡するたび、\+1\/\+1を得る/.test(coreUnitEffectText(u)))
    .forEach(u => addStats(u, 1, 1, 'character_death_self_buff'));
  all.filter(u => u.hp > 0 && (coreHasEffect(u, 'ヴァンパイアロード')
    || /キャラクターが死亡するたび、全ての味方はHP\+1を得る/.test(coreUnitEffectText(u)))).forEach(u => {
    (state.units[u.side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 0, 1, 'character_death_team_hp'));
  });
  all.filter(u => u.hp > 0 && u.side === dead.side && coreHasEffect(u, 'レヴナント')
    && !/味方が死亡するたび、このキャラクターは\+1\/\+1を得る/.test(coreUnitEffectText(u)))
    .forEach(u => addStats(u, 1, 1, 'revenant'));
  // 屍術の効果文は「キャラクターが死亡するたび、+1/+1を得る」。すぐ上の
  // 効果文による判定と**同じ条件**なので、名前でも数えると2回乗る。
  // レヴナントと同じく、効果文で既に処理された体はここでは数えない。
  all.filter(u => u.hp > 0 && coreHasEffect(u, '屍術')
    && !/キャラクターが死亡するたび、\+1\/\+1を得る/.test(coreUnitEffectText(u)))
    .forEach(u => addStats(u, 1, 1, 'necromancy'));
  all.filter(u => u.hp > 0 && u.side === 'p2' && coreHasEffect(u, '虚空の渡し守"ナグルファル"')).forEach(u => addStats(u, 3, 1, 'naglfar'));
  if (dead.side === 'p1') all.filter(u => u.hp > 0 && u.side === 'p2' && coreHasEffect(u, '忘却の骸"ゲルミール"')).forEach(u => {
    (state.units.p2 || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 4, 3, 'gellmir'));
  });
  // 死亡観測は観測者と同じ陣営の死亡だけを数える。p1固定の共有カウンタでは
  // p2側のエイドロンが不発し、観測者が複数いると発動回数を奪い合っていた。
  const deadSide = dead.side === 'p2' ? 'p2' : 'p1';
  const observers = (state.units[deadSide] || []).filter(u => u && u.hp > 0 && !coreIsSealed(u));
  // 旧本文（味方が3体死亡するたび1マナ）の時だけ。本文が変われば新しい効果へ移る。
  // 新しい本文（負傷：召喚された味方はATK+X）へ差し替わったら、この旧効果は動かさない。
  observers.filter(u => coreHasEffect(u, 'エイドロン')
    && !/召喚された味方はATK\+/.test(coreUnitEffectText(u))).forEach(u => {
    u._coreObservedAllyDeaths = (Number(u._coreObservedAllyDeaths) || 0) + 1;
    if (u._coreObservedAllyDeaths >= 3) {
      u._coreObservedAllyDeaths = 0;
      coreGainResource(state, deadSide, 'mana', 1, null, emit, 'eidolon');
    }
  });
  observers.filter(u => !coreHasEffect(u, 'エイドロン')
    && /味方が3体死亡するたび、1マナを得る/.test(coreUnitEffectText(u))).forEach(u => {
      u._coreObservedAllyDeaths = (Number(u._coreObservedAllyDeaths) || 0) + 1;
      if (u._coreObservedAllyDeaths >= 3) {
        u._coreObservedAllyDeaths = 0;
        coreGainResource(state, deadSide, 'mana', 1, null, emit, 'generic_death_mana');
      }
    });
  observers.filter(u => !coreHasEffect(u, 'デュラハン')
    && /味方が死亡するたび、ランダムな敵に4ダメージを与える/.test(coreUnitEffectText(u))).forEach(u => {
      const target = rng.pick((state.units[deadSide === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)));
      if (target) applyHit(u, target, 4);
    });
  // デュラハンは「観測者と同じ陣営のキャラクター死亡」のみを観測する。
  // named処理を正とし、上の汎用本文処理とは相互排他にする。
  // 旧本文（味方が死亡するたび4ダメージ）の時だけ。本文が変われば汎用処理／新効果へ移る。
  // 新しい本文（攻撃：Xは血に等しい）へ差し替わったら、この旧効果は動かさない。
  const dullahan = all.find(u => u.hp > 0 && coreHasEffect(u, 'デュラハン') && u.side === dead.side
    && !/Xは血に等しい/.test(coreUnitEffectText(u)));
  if (dullahan) {
    const target = rng.pick((state.units[dullahan.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)));
    if (target) applyHit(dullahan, target, 4);
  }
  // 不死の指輪：ここでは「味方が倒れた」ことだけ控える。判定は手番の終わり。
  if (dead.side === 'p1' && !state._undyingRingFired && coreRingCount(state, 'p1', '不死の指輪')) {
    state._undyingRingPending = true;
  }
}

// ── 不死の指輪：味方前衛が全滅した時、一度だけ青スケルトンを3体召喚する ──────
// **一時的に前衛がいなくなっただけでは発動しない。** 死亡の直後に判定すると、
// 同時に倒れた仲間の復活・根性・復活の指輪がまだ解決されておらず、
// 前衛が戻ってくる場面でも先に発動してしまう。
// そのため、手番（および開戦）の解決が終わってから一度だけ判定する。
// 発動した場合は true を返す。呼び出し側は勝敗を判定し直すこと
// （全滅からの召喚なので、判定し直さないと戦闘が終わってしまう）。
function coreCheckUndyingRing(state, emit) {
  if (!state || !state._undyingRingPending || state._undyingRingFired) return false;
  state._undyingRingPending = false;
  if (!coreRingCount(state, 'p1', '不死の指輪')) return false;
  const frontAlive = (state.units.p1 || []).some(x => x && x.hp > 0 && x.lane !== 'rear' && !coreIsSealed(x));
  if (frontAlive) return false;
  state._undyingRingFired = true;
  for (let i = 0; i < 3; i++) {
    coreSummonUnit(state, 'p1', { name: '青スケルトン', color: '青' }, emit, 'undying-ring');
  }
  emit({ type: 'ring_effect', ring: '不死の指輪', side: 'p1', amount: 3 });
  return true;
}
function coreApplyAttackObservers(attacker, state, rng, emit, applyHit) {
  if (!attacker || attacker.hp <= 0 || coreIsSealed(attacker)) return;
  const allies = (state.units[attacker.side] || []).filter(Boolean);
  const foes = (state.units[attacker.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const all = [...(state.units.p1 || []), ...(state.units.p2 || [])].filter(Boolean);
  const addStats = (u, atk, hp, reason) => {
    if (!u || u.hp <= 0 || coreIsSealed(u)) return;
    u.atk = Math.max(0, u.atk + atk); u.maxHp = Math.max(1, u.maxHp + hp); u.hp += hp;
    coreEmitPassiveFlash(emit, u);
    // sourceId が無いと演出側が「効果による変化」と判断できず、VFXが出ない。
    emit({ type: 'stat_change', side: u.side, unitId: u.id, atk, hp, reason, sourceId: u.id });
  };
  all.filter(u => u.hp > 0 && u.side === attacker.side && coreHasEffect(u, '隻眼の魔狼"ガルム・グリーム"')).forEach(u => {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 1, 1, 'garm'));
  });
  all.filter(u => u.hp > 0 && u.side === attacker.side && coreHasEffect(u, '極光の女王"グンダ"')).forEach(u => {
    coreHitAll(state, rng, emit, applyHit, u, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), 1);
  });
  all.filter(u => u.hp > 0 && u.side === attacker.side && coreHasEffect(u, '日刻の巫女"ルミア"')).forEach(u => {
    coreHitAll(state, rng, emit, applyHit, u, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), 8);
  });
  all.filter(u => u.hp > 0 && u.side === attacker.side).forEach(u => {
    const text = coreUnitEffectText(u);
    if (!coreHasEffect(u, '隻眼の魔狼"ガルム・グリーム"') && /味方が攻撃するたび、全ての味方は\+1\/\+1を得る/.test(text)) {
      allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 1, 1, 'attack_observer_team_buff'));
    }
    // 「味方が攻撃するたび、このキャラクターは+N/+Nを得る。」（シャナ）。
    // 全体バフ（ガルム・グリーム）とは別物。**自分だけが強くなる。**
    const selfBuff = text.match(/味方が攻撃するたび、このキャラクターは\+(\d+)\/\+(\d+)を得る/);
    if (selfBuff) addStats(u, Number(selfBuff[1]) || 0, Number(selfBuff[2]) || 0, 'attack_observer_self_buff');
    const damage = text.match(/味方が攻撃するたび、全ての敵に(\d+)ダメージを与える/);
    if (damage && !coreHasEffect(u, '極光の女王"グンダ"') && !coreHasEffect(u, '日刻の巫女"ルミア"')) coreHitAll(state, rng, emit, applyHit, u, foes.filter(x => x.hp > 0 && !coreIsSealed(x)), Number(damage[1]) || 0);
    if (coreHasEffect(u, 'フロスト・スプライト')) {
      const pool = foes.filter(x => x.hp > 0 && !coreIsSealed(x));
      const targets = [];
      while (targets.length < 3 && pool.length) targets.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
      coreHitAll(state, rng, emit, applyHit, u, targets, 1);
    }
  });
}
function coreApplyAttackRing(state, side, rng, emit, applyHit) {
  if (!coreRingCount(state, side, '鬼神の指輪')) return null;
  state._oniRingAttackCount = (Number(state._oniRingAttackCount) || 0) + 1;
  if (state._oniRingAttackCount < 12) return null;
  state._oniRingAttackCount = 0;
  const foeSide = side === 'p1' ? 'p2' : 'p1';
  // 旧PvEのデータ未登録時フォールバック（実データがあればcoreSummonUnit側で上書き）。
  const efreet = coreSummonUnit(state, side, { name: '赤イフリート', atk: 1, hp: 1, color: '赤' }, emit, 'oni-ring');
  const target = coreSelectAttackTarget(efreet, state.units[foeSide] || [], rng, { defendersAreEnemies: foeSide === 'p2' });
  if (target) {
    emit({ type: 'attack', side, attackerId: efreet.id, targetId: target.id, damage: efreet.atk, counterDamage: 0, immediate: true });
    applyHit(efreet, target, efreet.atk);
    if (target.hp > 0) applyHit(target, efreet, target.atk, true);
  }
  emit({ type: 'ring_effect', ring: '鬼神の指輪', side, amount: 1 });
  return efreet;
}
function coreApplyShieldLostEffects(target, state, rng, emit, applyHit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!target) return;
  const allies = (state.units[target.side] || []).filter(Boolean);
  const foes = (state.units[target.side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean);
  const addStats = (u, atk, hp, reason) => {
    if (!u || u.hp <= 0 || coreIsSealed(u)) return;
    atk = coreStatBonus(u, atk); hp = coreStatBonus(u, hp);
    u.atk += atk; u.maxHp += hp; u.hp += hp;
    coreEmitPassiveFlash(emit, u);
    emit({ type: 'stat_change', side: u.side, unitId: u.id, atk, hp, reason, sourceId: u.id });
  };
  if (target.side === 'p2') allies.filter(u => u.hp > 0 && coreHasEffect(u, '惑わしの妖精"エインセル"')).forEach(u => {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => addStats(x, 2, 2, 'ainsel'));
  });
  // 絶魔の指輪：常時：味方が結界を失うたび、全ての味方は+1/+1を得る。
  const sealBreakerRings = target.side === 'p1' ? coreRingCount(state, 'p1', '絶魔の指輪') : 0;
  if (sealBreakerRings) {
    allies.filter(x => x.hp > 0 && !coreIsSealed(x))
      .forEach(x => addStats(x, sealBreakerRings, sealBreakerRings, 'seal_breaker_ring'));
  }
  // 味方が結界を失った時の常時効果（カーバンクル）。**人数もダメージも本文から読む。**
  // 「ランダムな敵N体にXダメージを与える。」／旧本文「全ての敵にXダメージを与える。」
  allies.filter(u => u.hp > 0 && !coreIsSealed(u)).forEach(u => {
    const text = coreUnitEffectText(u);
    const live = () => foes.filter(x => x.hp > 0 && !coreIsSealed(x));
    const random = text.match(/味方が結界を失うたび、ランダムな敵(\d+)体に(\d+)ダメージを与える/);
    if (random) {
      const list = corePickDistinct(rng, live(), Math.max(1, Number(random[1]) || 1));
      if (list.length) coreHitAll(state, rng, emit, applyHit, u, list, Number(random[2]) || 1);
      return;
    }
    const all = text.match(/味方が結界を失うたび、全ての敵に(\d+)ダメージを与える/);
    if (all) {
      const repeat = /ダメージを2回/.test(text) ? 2 : 1;
      for (let i = 0; i < repeat; i++) coreHitAll(state, rng, emit, applyHit, u, live(), Number(all[1]) || 1);
    }
  });
  allies.filter(u => u.hp > 0 && coreHasEffect(u, 'グリマルキン')).forEach(u => addStats(u, 3, 2, 'grimalkin'));
  } finally { coreEndSummonBatch(state, emit); }
}
function coreApplyRingManaEffects(state, rng, emit, applyHit) {
  const count = coreRingCount(state, 'p1', '嵐の指輪');
  if (!count) return;
  const progress = Math.floor((Number(state.resources.p1.mana) || 0) / 10);
  while ((state._stormRingFireCount || 0) < progress) {
    state._stormRingFireCount = (state._stormRingFireCount || 0) + 1;
    const amount = (Number(state.resources.p1.mana) || 0) * 5;
    coreHitAll(state, rng, emit, applyHit, null, (state.units.p2 || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)), amount);
    emit({ type: 'ring_effect', ring: '嵐の指輪', side: 'p1', amount });
  }
}
function coreTryRevive(unit, state, emit) {
  // ウォーグは「効果1回」で数える。この効果で複数召喚されても発動は1回。
  coreBeginSummonBatch(state);
  try {
  if (!unit || unit.hp > 0 || unit._starterRegenUsed) return false;
  const ring = unit.side === 'p1' && !state._revivalRingUsed && coreRingCount(state, 'p1', '復活の指輪') > 0;
  const keyword = coreUnitKeywords(unit).find(x => x === '復活' || x === '根性');
  if (!ring && !keyword) return false;
  unit._starterRegenUsed = true;
  if (ring) {
    state._revivalRingUsed = true;
    unit.hp = Math.max(1, Number(unit.maxHp) || 1);
    unit.lane = 'front';
  } else if (keyword === '復活') {
    const baseAtk = Number.isFinite(Number(unit._baseAtk)) ? Number(unit._baseAtk) : Number(unit.atk) || 0;
    const baseMaxHp = Number.isFinite(Number(unit._baseMaxHp)) ? Number(unit._baseMaxHp) : Number(unit.maxHp) || 1;
    unit.atk = Math.max(0, Math.floor(baseAtk / 2));
    unit.maxHp = Math.max(1, Math.floor(baseMaxHp / 2));
    unit.hp = unit.maxHp;
    unit.lane = 'front';
  } else {
    unit.hp = 1;
  }
  unit.keywords = (unit.keywords || []).filter(x => x !== keyword);
  // **復活＝再召喚。** 「この戦闘中、召喚された味方は+X/+Yを得る」（ファントム／エイドロン）は
  // 効果が発動した後に**召喚された**体へ乗るので、復活した体にも乗せる。
  // revive イベントより先に乗せて、イベントに載る値も加算後にする
  // （受け口はイベントの値で表示を進めるため、後から足すと表示だけずれる）。
  const reviveSummonBuff = coreSummonBuffOf(state, unit.side);
  if (reviveSummonBuff.atk || reviveSummonBuff.hp) {
    const atk = coreStatBonus(unit, reviveSummonBuff.atk, unit);
    const hp = coreStatBonus(unit, reviveSummonBuff.hp, unit);
    unit.atk += atk;
    unit.maxHp += hp;
    unit.hp += hp;
    emit({ type: 'stat_change', side: unit.side, unitId: unit.id, atk, hp, reason: 'summon_buff', sourceId: unit.id });
  }
  emit({ type: 'revive', side: unit.side, unitId: unit.id, hp: unit.hp, maxHp: unit.maxHp, atk: unit.atk, reason: ring ? 'revival_ring' : keyword });
  // 復活後は次の死亡を新しい1回として扱う。
  delete unit._coreDeathTriggered;
  delete unit._coreDeathEffectsTriggered;
  delete unit._coreDeathObserved;
  // **どの手段で生き残ったかを返す**（呼び出し側は真偽値としても使える）。
  // 根性だけは「死亡ではない」ため、呼び出し側が負傷効果へ振り分ける。
  return ring ? 'revival_ring' : keyword;
  } finally { coreEndSummonBatch(state, emit); }
}
function coreTriggerBattleEnd(state, emit, rng) {
  ['p1', 'p2'].forEach(side => (state.units[side] || []).filter(Boolean).forEach(unit => {
    if (unit.hp > 0 && !coreIsSealed(unit)) {
      const repeats = 1 + Math.max(0, Number(unit._effectRepeatBonus) || 0);
      if ((Number(unit.goldOnBattleEnd) || 0) > 0 || unit.randomItemOnBattleEnd) {
        coreEmitEffectFlash(emit, unit, 'battle_end', repeats);
      }
      coreGainResource(state, side, 'gold', unit.goldOnBattleEnd * repeats, unit, emit, 'goldOnBattleEnd');
      // 終戦：「アイテム名」を（N個）得る（レプラコーン）。**名前も個数も本文から読む。**
      // ランダムなアイテムではなく、指定した1種類を配る。
      const namedItem = coreUnitTriggerText(unit, '終戦').match(/「([^」]+)」を(\d+)?個?得る/);
      if (namedItem) {
        const wanted = String(namedItem[1] || '');
        const count = Math.max(1, Number(namedItem[2]) || 1) * repeats;
        const item = (Array.isArray(state.itemDefs) ? state.itemDefs : [])
          .find(x => x && String(x.name || '') === wanted) || null;
        coreEmitEffectFlash(emit, unit, 'battle_end', repeats);
        for (let i = 0; i < count; i++) {
          emit({ type: 'item_reward', side, unitId: unit.id, reason: 'itemOnBattleEnd', item: item ? { ...item } : null });
        }
      }
      if (unit.randomItemOnBattleEnd) {
        for (let i = 0; i < repeats; i++) {
          const cost = Math.max(0, Number(unit.randomItemCost) || 0);
          if (cost > 0 && (Number(state.resources[side].gold) || 0) < cost) continue;
          if (cost > 0) {
            state.resources[side].gold -= cost;
            emit({ type: 'gold_spend', side, unitId: unit.id, amount: cost, reason: 'randomItemOnBattleEnd' });
          }
          const pool = Array.isArray(state.itemDefs) ? state.itemDefs.filter(x => x && (x.itemEffectKey || x.type === 'consumable' || x.kind === 'item')) : [];
          const item = pool.length && rng && typeof rng.pick === 'function' ? rng.pick(pool) : null;
          emit({ type: 'item_reward', side, unitId: unit.id, reason: 'randomItemOnBattleEnd', item: item ? { ...item } : null });
        }
      }
      if (side === 'p1' && coreHasEffect(unit, 'ハイドラ')) {
        const candidates = (state.units.p1 || []).filter(x => x && x.hp > 0 && x !== unit && !coreIsSealed(x));
        const target = candidates.length && rng && typeof rng.pick === 'function' ? rng.pick(candidates) : null;
        if (target) emit({ type: 'bonus_reward', side: 'p1', unitId: target.id, reason: 'hydra', unit: coreUnitSnapshot(target) });
      }
    }
  }));
}

// PvE演出だけが使う、マナ閾値効果の遅延適用用スナップショット。
// コアの判定自体は同期のままにし、イベント生成前後の状態を保持して
// 「逆再生開始時に適用」するアダプタへ渡す。オンラインでは使用しない。
// 「もう画面に出したか」を表すフラグは、マナ効果の巻き戻しで戻してはいけない。
// 巻き戻すと、既に表示・配置した召喚体が未表示扱いへ逆戻りし、
// renderField() が描画対象から外すため盤面から消える。
// （ミテーラのペリカンが、サテュロスのマナ効果の発動で消えていた）
// ここはゲームの状態ではなく再生の進み具合なので、スナップショットの対象外にする。
const CORE_PRESENTATION_ONLY_KEYS = new Set(['_corePendingSummon']);

function coreSnapshotDeferredState(state) {
  const units = {};
  ['p1', 'p2'].forEach(side => {
    units[side] = (state.units[side] || []).map(unit => {
      if (!unit) return null;
      const props = {};
      Object.keys(unit).forEach(key => {
        if (CORE_PRESENTATION_ONLY_KEYS.has(key)) return;
        try { props[key] = JSON.parse(JSON.stringify(unit[key])); } catch (_) { props[key] = unit[key]; }
      });
      return { unit, props };
    });
  });
  return {
    units,
    resources: JSON.parse(JSON.stringify(state.resources || {})),
  };
}

function coreRestoreDeferredState(state, snapshot) {
  if (!state || !snapshot) return;
  ['p1', 'p2'].forEach(side => {
    const entries = snapshot.units[side] || [];
    const restored = entries.map(entry => {
      if (!entry) return null;
      const unit = entry.unit;
      Object.keys(unit).forEach(key => {
        if (CORE_PRESENTATION_ONLY_KEYS.has(key)) return;
        if (!Object.prototype.hasOwnProperty.call(entry.props, key)) delete unit[key];
      });
      Object.keys(entry.props).forEach(key => {
        if (CORE_PRESENTATION_ONLY_KEYS.has(key)) return;
        unit[key] = entry.props[key];
      });
      return unit;
    });
    // 巻き戻すのは「値」であって「並び」ではない。
    // 召喚体は配置処理で表示用の位置へ動かされているため、並びまで戻すと
    // スナップショット時点の位置（＝配置前なので空欄）へ引き戻され、盤面から一瞬消える。
    // （ミテーラのペリカンが、サテュロスのマナ効果の直後に消えていた）
    // ここでは現在の並びを保ったまま、スナップショットに載っているユニットだけ
    // 値を戻す（値の復元は上の restored 生成で実施済み）。
    const snapshotUnits = new Set(entries.filter(Boolean).map(entry => entry.unit));
    const current = Array.isArray(state.units[side]) ? state.units[side] : [];
    const merged = current.slice();
    // 巻き戻しの間に配列から外れたユニットは、スナップショット時点の位置へ戻す。
    // 既に誰かが入っている枠は奪わない。
    restored.forEach((unit, i) => {
      if (!unit || merged.includes(unit)) return;
      if (!merged[i]) merged[i] = unit;
      else merged.push(unit);
    });
    // スナップショットに無いユニット（巻き戻し後に召喚された体など）はそのまま残る。
    void snapshotUnits;
    // state.units[side] と G.allies/G.enemies は同じ配列を共有するため、
    // 配列自体を差し替えず内容だけを戻す。
    if (Array.isArray(state.units[side])) {
      state.units[side].splice(0, state.units[side].length, ...merged);
    } else state.units[side] = merged;
  });
  state.resources = JSON.parse(JSON.stringify(snapshot.resources || {}));
}

// マナ閾値効果の共通処理。マナ自体は消費せず、到達回数だけを状態に記録する。
// 召喚・変身は盤面イベントを導入する段階でこの関数へ追加する。
// 「3マナ毎：ランダムな敵に…」から効果の中身だけを取り出す。
// 接頭辞の書き方（毎の有無・全角半角コロン）はカードによって揺れる。
function coreManaThresholdDescFromText(text) {
  return String(text || '').replace(/^\s*\d+マナ(?:毎)?\s*[:：]\s*/, '').trim();
}

// マナ効果。攻撃効果の中から誘発した場合（ペガサス・マナ生成→炎の矢など）は、
// 攻撃効果そのもののダメージとは別の束として見せるため種別を分ける。
function coreApplyManaThresholdEffects(state, rng, emit, applyHit, options) {
  const cur = coreDamageKind(state);
  const kind = (cur === 'attack_effect' || cur === 'attack_effect_triggered')
    ? 'attack_effect_triggered' : cur;
  return coreWithDamageKind(state, kind,
    () => coreApplyManaThresholdEffectsInner(state, rng, emit, applyHit, options));
}

// シートの「マナ順位」が空欄のマナ効果を最後に回すための値。
const CORE_MANA_ORDER_LAST = 9999;

function coreApplyManaThresholdEffectsInner(state, rng, emit, applyHit, options) {
  // 遅延モード（PvEの開戦演出）では、走査中は状態を進めたまま各発動の
  // before/afterスナップショットを累積で記録し、走査の最後に一度だけ
  // 走査前の盤面へ戻す。1発動ごとに巻き戻すと、
  //   ・各deferredAfterが「基準+その1発だけ」の絶対スナップショットになり、
  //     演出側（battle.js）が順に復元した時点で先行する発動が消える
  //   ・「1マナ：3マナを得る」で増えたマナが消え、後続の「Xマナ毎」の
  //     到達回数が伸びない（マナ連鎖が途切れる）
  //   ・_extraManaThresholdsがディープコピーで作り直され、効果ごとの
  //     発動回数カウンタ（_manaFireCounts）が別オブジェクトへ逃げて過剰発動する
  // という3つの不具合が同時に起きる。
  const deferAll = !!state.deferManaThresholdEffects;
  const forcedUnitId = options && options.force ? String(options.onlyUnitId || '') : '';
  let forcedTriggered = false;
  // **どちらかの陣営が全滅していたら、もう何も発動させない。**
  // 勝敗が付いた後もマナ効果が走ると、開戦で敵が全滅したのに炎の矢が飛び続け、
  // 誰もいない所へ向かった演出が画面に残る（利用者報告）。
  // 「そもそも居ない」（最小シナリオ・片側だけの検証）と「全滅した」は別物。
  // 全滅＝体はあるのに生きているものが1つも無い時だけ止める。
  const coreSideWipedOut = side => {
    const arr = (state.units[side] || []).filter(u => u && !u._isObject && !u._isSoul);
    return arr.length > 0 && !arr.some(u => u.hp > 0);
  };
  if (coreSideWipedOut('p1') || coreSideWipedOut('p2')) return;
  const scanBaseline = deferAll ? coreSnapshotDeferredState(state) : null;
  let changed = true;
  // 1パスで発動するのは (ユニット×閾値) ごとに1回のため、
  // 「1マナ毎」に高マナで到達している場合は到達回数分のパスが要る。
  // 上限を大きめに取る。**1パスで撃つのは「一番上の順位の効果」だけ**なので、
  // 効果の数×発動回数ぶんパスが要る（以前は1パスで全効果を1回ずつ撃っていた）。
  for (let pass = 0; pass < 400 && changed; pass++) {
    changed = false;
    // 発動回（wave）。**同じ発動回＝同じ瞬間**。再生側はこれを見て、
    // 同じ効果を持つ複数のキャラクターを1体ずつ順にではなく同時に見せる。
    // 通し番号は戦闘全体で増やす。パス番号のままだと、攻撃・負傷など別の機会に
    // 起きた発動が同じ番号になり、再生側が「同じ瞬間」と誤認する。
    state._coreManaWaveSeq = (Number(state._coreManaWaveSeq) || 0) + 1;
    const wave = state._coreManaWaveSeq;
    // ── 発動順 ──────────────────────────────────────
    // **シートの「マナ順位」が小さいものから処理する。**
    // 同率なら前衛の左から右、続いて後衛の左から右（＝盤面配列の並び）。
    // 陣営はp1→p2の順に見る（マナは陣営ごとの資源なので、跨いで混ぜない）。
    // ここで並べてから発動させること。ユニットの並び順のまま撃つと、
    // 順位を付けても効かない。
    const fireQueue = [];
    ['p1', 'p2'].forEach(side => (state.units[side] || []).forEach((unit, slotIndex) => {
      if (!unit) return;
      if (forcedUnitId && String(unit.id) !== forcedUnitId) return;
      if (unit.hp <= 0 || coreIsSealed(unit)) return;
      const thresholds = [];
      const addThreshold = (owner, cost, repeat, desc, no, order) => {
        const normalizedDesc = String(desc || '').trim();
        const key = `${Number(cost) || 0}|${repeat ? 1 : 0}|${normalizedDesc}`;
        if (!Number(cost)) return;
        // no：その効果の固有VFXを引くカードNo.（活性化＝E045等）。演出側が使う。
        // order：シートの「マナ順位」。空欄は最後に回す。
        const n = Number(order);
        thresholds.push({ owner, cost: Number(cost), repeat: !!repeat, desc: normalizedDesc, key,
          no: String(no || '').toUpperCase(),
          order: Number.isFinite(n) ? n : CORE_MANA_ORDER_LAST });
      };
      // マナ効果の効果文は、専用フィールドが無ければカード本文から導出する。
      // 「Nマナ毎：」「Nマナ：」の接頭辞を外した残りが効果の中身。
      // これをPvE側（battle.js）だけに持たせていたため、専用フィールドを持たない
      // ユニット（オンラインの対戦相手はカードプールから直接組まれる）は
      // 効果文が空になり、マナ効果が何も起こさなかった。導出はここが唯一の実装。
      if (unit.manaCost > 0) {
        addThreshold(unit, unit.manaCost, unit.manaRepeat,
          unit.manaThresholdDesc || unit._manaThresholdDesc
          || (unit.effectData && unit.effectData.manaThresholdDesc)
          || coreManaThresholdDescFromText(unit.desc),
          // 強化カード由来なら _manaThresholdNo が入る。無ければカード自身のNo.。
          unit.manaThresholdNo || unit._manaThresholdNo
          || (unit.effectData && unit.effectData.manaThresholdNo)
          || unit.no || unit.artCode,
          // 強化カード由来なら _manaThresholdOrder が入る。無ければカード自身のマナ順位。
          unit.manaThresholdOrder != null ? unit.manaThresholdOrder
            : (unit._manaThresholdOrder != null ? unit._manaThresholdOrder
              : (unit.effectData && unit.effectData.manaThresholdOrder != null
                ? unit.effectData.manaThresholdOrder : unit.manaOrder)));
      }
      // **同じ効果を複数枚持っていたら、枚数ぶん発動する。**（炎の矢×2 など）
      // ただし本体のextra配列・別名フィールド・effectDataは**同じ配列を別の保持先へ
      // 複製している**ことがある。足し合わせると1枚が2回撃つので、
      // **保持先ごとに数えて、一番多い保持先だけを採る。**
      const extraSources = [unit.extraManaThresholds, unit._extraManaThresholds,
        unit.effectData && unit.effectData.extraManaThresholds];
      const extraByKey = new Map();
      extraSources.forEach(list => {
        const perSource = new Map();
        (Array.isArray(list) ? list : []).forEach(t => {
          if (!(Number(t && t.cost) > 0)) return;
          const k = `${Number(t.cost) || 0}|${t.repeat ? 1 : 0}|${String(t.desc || '').trim()}`;
          if (!perSource.has(k)) perSource.set(k, []);
          perSource.get(k).push(t);
        });
        perSource.forEach((entries, k) => {
          const cur = extraByKey.get(k);
          if (!cur || entries.length > cur.length) extraByKey.set(k, entries);
        });
      });
      extraByKey.forEach(entries => entries.forEach(t => {
        addThreshold(t, t.cost, t.repeat, t.desc, t.no, t.order);
      }));
      // 前衛が先、後衛が後。同じレーンの中は盤面配列の並び（左から右）。
      const laneRank = unit.lane === 'rear' ? 1 : 0;
      thresholds.forEach(t => {
        // **撃ち切った効果は列から外す。** 外さないと「一番上の順位」が
        // 撃ち切った効果のまま居座り、次の効果へ進めない（changedが立たず走査が終わる）。
        const forcedHere = !!(forcedUnitId && String(unit.id) === forcedUnitId);
        if (!forcedHere) {
          const progress = coreManaThresholdProgress(state, side, t, unit);
          const limit = t.repeat ? progress : Math.min(1, progress);
          const counts = t.owner._manaFireCounts;
          if ((Number(counts && counts[t.key]) || 0) >= limit) return;
        }
        fireQueue.push({ side, unit, t, laneRank, slotIndex });
      });
    }));
    // **全く同じ効果は、順位に関係なく必ずひとかたまりにする。**
    // 効果ごとに「一番小さい順位」を代表値にして並べる。キャラクターごとの
    // 順位で散らすと、同じ活性化でも1体ずつ順に発動して見える。
    const orderByEffect = new Map();
    fireQueue.forEach(({ t }) => {
      const cur = orderByEffect.get(t.key);
      if (cur == null || t.order < cur) orderByEffect.set(t.key, t.order);
    });
    fireQueue.sort((a, b) => (orderByEffect.get(a.t.key) - orderByEffect.get(b.t.key))
      || (a.t.key < b.t.key ? -1 : a.t.key > b.t.key ? 1 : 0)
      || (a.laneRank - b.laneRank) || (a.slotIndex - b.slotIndex));
    // **順位が上の効果を、発動回数ぶん全部片付けてから次の効果へ移る。**
    // 1パスで全効果を1回ずつ撃つと、活性化と炎の矢が交互に発動し、
    // 演出も交互に出て重なって見える（「上位の演出が全部終わるまで下位を出さない」が守れない）。
    const topKey = fireQueue.length ? fireQueue[0].t.key : null;
    fireQueue.filter(x => x.t.key === topKey).forEach(({ side, unit, t }) => {
      if (unit.hp <= 0 || coreIsSealed(unit)) return;
      {
        const progress = coreManaThresholdProgress(state, side, t, unit);
        const limit = t.repeat ? progress : Math.min(1, progress);
        // ユニット本体に単一のカウンタを置くと、同じコストで異なる
        // マナ効果を2つ持つ場合に片方が抑制される。効果ごとに独立して
        // 進捗を記録する。
        const fireCounts = t.owner._manaFireCounts || (t.owner._manaFireCounts = Object.create(null));
        const fired = Number(fireCounts[t.key]) || 0;
        const forced = forcedUnitId && String(unit.id) === forcedUnitId;
        if (forced && forcedTriggered) return;
        if (fired >= limit && !forced) return;
        if (forced) forcedTriggered = true;
        fireCounts[t.key] = fired + 1;
        // 閾値到達回数が残っている間は、次のパスでも同じ効果を発火する。
        changed = true;
        const text = t.desc;
        const deferred = !!state.deferManaThresholdEffects;
        const deferredBefore = deferred ? coreSnapshotDeferredState(state) : null;
        // このマナ効果の解決中に出るダメージへ、効果のカードNo.を載せる。
        // 対象に当たった瞬間の演出（炎の矢＝E058_2）を再生側が選ぶために要る。
        state._coreEffectNo = t.no || null;
        // **その効果の持ち主。** 誘発で割り込んだ別のキャラクターのダメージへ
        // 同じ番号を載せないための印（下の coreDamageEffectNo）。
        state._coreEffectOwnerId = t.no ? unit.id : null;
        const thresholdEvent = { type: 'mana_threshold', side, unitId: unit.id, cost: t.cost, desc: text, deferred,
          // effectNo：その効果の固有VFXを引くカードNo.（活性化＝E045）。
          // 演出側はこれを見て「どの効果が発動したか」を決める。
          effectNo: t.no || '',
          // wave：同じ番号なら同じ瞬間の発動。再生側が同時に見せるための印。
          wave };
        // PvEではこのイベントを先に出し、演出アダプタが逆再生開始時に
        // deferredAfterを復元する。コア内の計算順は維持する。
        emit(thresholdEvent);
        const repeatCount = 1 + coreEffectCount(unit, 'マナの種')
          + (side === 'p1' ? coreRingCount(state, 'p1', '賢者の指輪') : 0);
        const addStatsForManaThreshold = (target, atk, hp, reason) => {
          if (!target || target.hp <= 0 || coreIsSealed(target)) return;
          atk = coreStatBonus(target, atk, unit); hp = coreStatBonus(target, hp, unit);
          target.atk += atk; target.maxHp += hp; target.hp += hp;
          emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason });
        };
        const buff = text.match(/^(?:このキャラクターは\s*)?\+(\d+)\s*\/\s*\+(\d+)を得る/);
        if (buff) {
          for (let repeat = 0; repeat < repeatCount; repeat++) {
            let atk = Number(buff[1]), hp = Number(buff[2]);
            atk = coreStatBonus(unit, atk, unit); hp = coreStatBonus(unit, hp, unit);
            unit.atk += atk; unit.maxHp += hp; unit.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side, unitId: unit.id, atk, hp, reason: 'mana_threshold' });
          }
        }
        const arachne = text.match(/^全ての味方に\+(\d+)\s*\/\s*\+(\d+)を与えた後、(\d+)ダメージを与える/);
        if (arachne) {
          const allies = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          for (let repeat = 0; repeat < repeatCount; repeat++) {
            allies.forEach(target => {
              const atk = coreStatBonus(target, Number(arachne[1]) || 0, unit);
              const hp = coreStatBonus(target, Number(arachne[2]) || 0, unit);
              target.atk += atk; target.maxHp += hp; target.hp += hp;
              emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_arachne_buff' });
            });
            coreHitAll(state, rng, emit, applyHit, unit, allies, Number(arachne[3]) || 0);
          }
        }
        const damage = text.match(/^ランダムな敵に(\d+)ダメージを与える/);
        if (damage) {
          // 賢者の指輪・マナの種などで同じ効果が複数回発動する時は、対象を発動ごとに
          // 再抽選するだけでなく、**この一続きで既に狙った敵を除いて**選ぶ。
          // 除かないと2本とも同じ敵へ飛び、片方が無駄撃ちに見える。
          // 残りがいなくなったら、また全員から選び直す。
          const aimed = new Set();
          for (let i = 0; i < repeatCount; i++) {
            const alive = (state.units[side === 'p1' ? 'p2' : 'p1'] || [])
              .filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
            let foes = alive.filter(x => !aimed.has(x.id));
            if (!foes.length) { aimed.clear(); foes = alive; }
            const target = rng.pick(foes);
            if (!target) break;
            aimed.add(target.id);
            applyHit(unit, target, Number(damage[1]));
          }
        }
        const mana = text.match(/^(\d+)マナを?得る/);
          if (mana) coreGainResource(state, side, 'mana', Number(mana[1]) * repeatCount, unit, emit, 'mana_threshold', {
            skipManaRepeat: true, deferredAppliedByThreshold: deferred
          });
        const poison = text.match(/^全ての敵に毒(\d+)を与える/);
        if (poison) (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(x => {
          x.poison = (Number(x.poison) || 0) + Number(poison[1]);
          emit({ type: 'keyword_effect', effect: 'poison', side: x.side, unitId: x.id, sourceId: unit.id, amount: Number(poison[1]) });
        });
        const randomColor = text.match(/^ランダムな([赤青緑黄紫茶])の?キャラクター(?:(\d+)体)?は\+([0-9]+)\/\+([0-9]+)を得る/);
        if (randomColor && !/^ランダムな紫のキャラクターは\+/.test(text)) for (let repeat = 0; repeat < repeatCount; repeat++) {
          const color = randomColor[1] === '茶' ? '黄' : randomColor[1];
          const pool = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === color);
          const count = Math.max(1, Number(randomColor[2]) || 1);
          for (let i = 0; i < count && pool.length; i++) {
            const target = pool.splice(rng.int(0, pool.length - 1), 1)[0];
            const atk = coreStatBonus(target, Number(randomColor[3]) || 0, unit);
            const hp = coreStatBonus(target, Number(randomColor[4]) || 0, unit);
            target.atk += atk; target.maxHp += hp; target.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_random_color' });
          }
        }
        const randomAlly = text.match(/^ランダムな味方に\+([0-9]+)\/(?:\+)?([0-9]+)を(?:与える|得る)/);
        if (randomAlly) {
          const pool = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          const target = pool.length ? rng.pick(pool) : null;
          if (target) {
            const atk = coreStatBonus(target, Number(randomAlly[1]) || 0, unit);
            const hp = coreStatBonus(target, Number(randomAlly[2]) || 0, unit);
            target.atk += atk; target.maxHp += hp; target.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_random_ally' });
          }
        }
        // 「「X」に変身する。」（ドラゴネット）。**変身先は本文の名前をそのまま使う。**
        const manaTransform = text.match(/^「([^」]+)」に変身する/);
        if (manaTransform) coreTransformUnit(state, unit, manaTransform[1], emit);
        // **結界の数は本文から読む。** 1で固定していたため、合体後のスプリガン
        // （「結界2を得る」）は数が合わないどころか、文にも当たらず何も起きなかった。
        const manaShield = text.match(/^ランダムな味方(?:は|に)結界(\d*)を(?:付与|与える|得る)/);
        if (manaShield) {
          const pool = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          const target = pool.length ? rng.pick(pool) : null;
          if (target) {
            const amount = Number(manaShield[1]) || 1;
            target.shield = (Number(target.shield) || 0) + amount;
            emit({ type: 'keyword_effect', effect: 'shield', side: target.side, unitId: target.id, amount, sourceId: unit.id });
          }
        }
        const weaken = text.match(/^全ての敵に弱体(\d+)を(?:付与|与える|得る)/);
        if (weaken) {
          const amount = Number(weaken[1]) || 0;
          (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean)
            .filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(target => {
              target.weaken = (Number(target.weaken) || 0) + amount;
              emit({ type: 'keyword_effect', effect: 'weaken', side: target.side, unitId: target.id, amount, sourceId: unit.id });
            });
        }
        if (/^ランダムな敵に封印∞を付与する/.test(text)) {
          const foes = state.units[side === 'p1' ? 'p2' : 'p1'] || [];
          const target = rng.pick(foes.filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)));
          if (target) {
            target._sealed = true; target._sealValue = Infinity; target._sealInfinity = true;
            emit({ type: 'seal_apply', side: target.side, unitId: target.id, value: 'infinite', sourceId: unit.id });
          }
        }
        const allHpDouble = /^全ての味方のHPを2倍にする/.test(text);
        if (allHpDouble) (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(target => {
          const hp = target.maxHp;
          target.maxHp *= 2; target.hp *= 2;
          emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk: 0, hp, reason: 'mana_threshold_hp_double' });
        });
        if (/^ランダムな味方の負傷効果を発動する/.test(text)) {
          const pool = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          const target = pool.length ? rng.pick(pool) : null;
          if (target) coreApplyInjuryEffects(target, 0, state, rng, emit, applyHit, null);
        }
        if (/^ランダムなアイテムを得る/.test(text)) {
          const pool = Array.isArray(state.itemDefs) ? state.itemDefs.filter(x => x && (x.itemEffectKey || x.kind === 'item' || x.type === 'consumable')) : [];
          const item = pool.length ? rng.pick(pool) : null;
          emit({ type: 'item_reward', side, unitId: unit.id, reason: 'mana_threshold_item', item: item ? { ...item } : null });
        }
        const colorBuff = text.match(/^ランダムな([赤青緑黄紫])の?キャラクター(?:(\d+)体)?は\+(\d+)\/(\+?\d+)を得る/);
        // randomColorが同じ「ランダムな赤キャラクター2体」表記を処理済み。
        if (colorBuff && !randomColor) {
          const count = Math.max(1, Number(colorBuff[2]) || 1);
          const targets = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === colorBuff[1]);
          for (let i = 0; i < count && targets.length; i++) {
            const target = rng.pick(targets);
            let atk = Number(colorBuff[3]) || 0, hp = Number(colorBuff[4]) || 0;
            atk = coreStatBonus(target, atk, unit); hp = coreStatBonus(target, hp, unit);
            target.atk += atk; target.maxHp += hp; target.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_color' });
          }
        }
        const allColorBuff = text.match(/^全ての([赤青緑黄紫茶])(?:の)?キャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
        if (allColorBuff) {
          const color = allColorBuff[1] === '茶' ? '黄' : allColorBuff[1];
          (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === color).forEach(target => {
            const atk = coreStatBonus(target, Number(allColorBuff[2]) || 0, unit);
            const hp = coreStatBonus(target, Number(allColorBuff[3]) || 0, unit);
            target.atk += atk; target.maxHp += hp; target.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_color_all' });
          });
        }
        const randomColorCountBuff = text.match(/^ランダムな([赤青緑黄紫茶])キャラクター(\d+)体は\+([0-9]+)\/(?:\+)?([0-9]+)を得る/);
        // 上のrandomColor（「2体」表記を含む）と同じ文面を再度処理しない。
        if (randomColorCountBuff && !randomColor) {
          const color = randomColorCountBuff[1] === '茶' ? '黄' : randomColorCountBuff[1];
          const pool = (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === color);
          for (let i = 0; i < Number(randomColorCountBuff[2]) && pool.length; i++) {
            const target = pool.splice(rng.int(0, pool.length - 1), 1)[0];
            const atk = coreStatBonus(target, Number(randomColorCountBuff[3]) || 0, unit);
            const hp = coreStatBonus(target, Number(randomColorCountBuff[4]) || 0, unit);
            target.atk += atk; target.maxHp += hp; target.hp += hp;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp, reason: 'mana_threshold_random_color_count' });
          }
        }
        const allColorAtk = text.match(/^全ての([赤青緑黄紫茶])キャラクターはATK\+([0-9]+)を得る/);
        if (allColorAtk) {
          const color = allColorAtk[1] === '茶' ? '黄' : allColorAtk[1];
          (state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === color).forEach(target => {
            const atk = coreStatBonus(target, Number(allColorAtk[2]) || 0, unit);
            target.atk += atk;
            emit({ type: 'stat_change', sourceId: unit.id, side: target.side, unitId: target.id, atk, hp: 0, reason: 'mana_threshold_color_atk' });
          });
        }
        const randomEnemyWeaken = text.match(/^ランダムな敵(?:(\d+)体)?(?:を|に)防戦(?:にする|を与える)/);
        if (randomEnemyWeaken) {
          const foePool = (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          corePickDistinct(rng, foePool, Math.max(1, Number(randomEnemyWeaken[1]) || 1)).forEach(target => {
            target.keywords = coreUnitKeywords(target).concat(['防戦']);
            emit({ type: 'keyword_effect', effect: 'keyword_gain', side: target.side, unitId: target.id, keyword: '防戦', sourceId: unit.id });
          });
        }
        const allEnemyPoison = text.match(/^全ての敵に毒([0-9]+)を与える/);
        if (allEnemyPoison && !poison) (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)).forEach(target => {
          const amount = Number(allEnemyPoison[1]) || 0;
          target.poison = (Number(target.poison) || 0) + amount;
          emit({ type: 'keyword_effect', effect: 'poison', side: target.side, unitId: target.id, amount, sourceId: unit.id });
        });
        const randomPurpleBuff = text.match(/^ランダムな紫のキャラクターは\+([0-9]+)\/\+([0-9]+)を得る/);
        // マナの種・賢者の指輪の反復は**効果の種類を問わず**効かせる。
        // 自己バフ型だけ反復していたため、対象がランダムな効果や召喚では
        // マナの種が何も足していなかった。
        if (randomPurpleBuff) for (let repeat = 0; repeat < repeatCount; repeat++) {
          const target = rng.pick((state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x) && x.color === '紫'));
          if (target) addStatsForManaThreshold(target, Number(randomPurpleBuff[1]), Number(randomPurpleBuff[2]), 'mana_threshold_random_purple');
        }
        const reviveGain = text.match(/^ランダムな味方が復活を得る/);
        if (reviveGain) {
          const target = rng.pick((state.units[side] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)));
          if (target) {
            target.keywords = coreUnitKeywords(target).concat(['復活']);
            emit({ type: 'keyword_effect', effect: 'keyword_gain', side: target.side, unitId: target.id, keyword: '復活', sourceId: unit.id });
          }
        }
        const summonWolf = text.match(/^「緑ウルフ」を召喚する/);
        if (summonWolf) for (let repeat = 0; repeat < repeatCount; repeat++) coreSummonUnit(state, side, {
          name: '緑ウルフ', color: '緑', placement: 'rightEdge'
        }, emit, unit.id);
        const randomTransform = text.match(/^ランダムな敵(?:(\d+)体)?を「([^」]+)」に変身させる/);
        if (randomTransform) {
          const foePool = (state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x));
          corePickDistinct(rng, foePool, Math.max(1, Number(randomTransform[1]) || 1))
            .forEach(target => coreTransformUnit(state, target, randomTransform[2], emit));
        }
        if (/^ランダムな敵に生贄を付与する/.test(text)) {
          const target = rng.pick((state.units[side === 'p1' ? 'p2' : 'p1'] || []).filter(Boolean).filter(x => x.hp > 0 && !coreIsSealed(x)));
          if (target) {
            target.keywords = coreUnitKeywords(target).concat(['生贄']);
            emit({ type: 'keyword_effect', effect: 'keyword_gain', side: target.side, unitId: target.id, keyword: '生贄', sourceId: unit.id });
          }
        }
        const summon = text.match(/^「(.+?)」（(\d+)\/(\d+)）を召喚する/);
        if (summon) {
          coreSummonUnit(state, side, {
            name: summon[1], atk: Number(summon[2]), hp: Number(summon[3]), maxHp: Number(summon[3]),
            color: unit.color, lane: 'front', placement: 'rightEdge'
          }, emit, unit.id);
        }
        const selfTransform = text.match(/^「(.+?)」に変身する/);
        if (selfTransform) coreTransformUnit(state, unit, selfTransform[1], emit);
        const gain = text.match(/^([^\s、。]+)を得る/);
        if (gain && !/マナ$/.test(gain[1])) {
          unit.keywords = coreUnitKeywords(unit).concat(unit.keywords.includes(gain[1]) ? [] : [gain[1]]);
          emit({ type: 'keyword_effect', effect: 'keyword_gain', side, unitId: unit.id, sourceId: unit.id, keyword: gain[1] });
        }
        if (deferred) {
          // 巻き戻しはここでは行わない（走査終了後にまとめて1回だけ戻す）。
          thresholdEvent.deferredBefore = deferredBefore;
          thresholdEvent.deferredAfter = coreSnapshotDeferredState(state);
        }
        changed = true;
        // 開戦中は、1つの開戦効果が生成した召喚本体を先にまとめてから
        // リッチ誘発を排出する。通常のマナ閾値では、閾値1回ごとに
        // 「本体→シャドウ」を確定し、複数回分が後ろへまとまらないようにする。
        if (!state._openingPhase && typeof coreFlushPendingLichSummons === 'function') {
          coreFlushPendingLichSummons(state, emit);
        }
        state._coreEffectNo = null;
        state._coreEffectOwnerId = null;
      }
    });
  }
  // 演出側が deferredAfter を順に復元して盤面を進めるため、コアは走査前の状態へ戻す。
  if (deferAll && scanBaseline) coreRestoreDeferredState(state, scanBaseline);
}

/**
 * 戦闘を最後まで進める。勝敗は戻り値で明示的に返す（イベント列から推測させない）。
 * @param {object} state createBattleState() が返した状態
 * @param {{next:Function,int:Function,pick:Function}} rng 決定論的な乱数（必須）
 * @param {{onEvent?:Function, turnLimit?:number}} [opts]
 * @returns {{outcome:'p1'|'p2'|'draw', endReason:string, turns:number}}
 */
// 1ターン分だけ戦闘を進める。PvE・オンラインとも「戦闘ループ」はこの1手の繰り返しであること。
// ここを片方だけ書き換えないこと（ターン順・攻撃者選択・毒・封印・終了条件の二重実装を防ぐ）。
// ctx: { units, state, rng, emit, applyHit, resolveSeals, decided, side, result }
// 戻り値: { side, result, stop }。stop=true はループを打ち切る（従来の break 相当）。
// 1手番。**不死の指輪の判定は解決が全部終わってから**行うため、
// 中身は coreBattleStepInner に置き、ここで最後に一度だけ判定する。
function coreBattleStep(ctx) {
  const next = coreBattleStepInner(ctx);
  if (coreCheckUndyingRing(ctx.state, ctx.emit) && typeof ctx.decided === 'function') {
    // 前衛全滅から3体召喚した直後なので、勝敗を判定し直さないと
    // 「味方全滅で敗北」のまま戦闘が終わる。
    next.result = ctx.decided();
  }
  return next;
}
function coreBattleStepInner(ctx) {
  const { units, state, rng, emit, applyHit, resolveSeals, decided } = ctx;
  let side = ctx.side;
  let result = ctx.result;
    state.turn++;
    // 盤面が変わっているかもしれないので、紫修正を作り直してから手番を始める。
    coreRefreshVoidWalkerBonus(state);
    emit({ type: 'turn_begin', turn: state.turn });

    const foeSide = side === 'p1' ? 'p2' : 'p1';
    const attacker = corePickAttacker(units[side], state.lane[side], side === 'p2');
    if (!attacker) {
      const opponentCanAct = coreLaneAttackCandidates(units[foeSide], 'front', foeSide === 'p2').length > 0
        || coreLaneAttackCandidates(units[foeSide], 'rear', foeSide === 'p2').length > 0;
      if (!opponentCanAct) {
        result = { outcome: 'draw', reason: 'both_defense' };
        return { side, result, stop: false };
      }
      side = foeSide;
      result = decided();
      return { side, result, stop: false };
    }
    state.lane[side].attacked.add(attacker.id);
    state._attackCount = (state._attackCount || 0) + 1;
    coreApplyAttackRing(state, side, rng, emit, applyHit);

    // 毒は攻撃開始ではなく、そのユニットの手番に先に解決する。
    const poisonResult = coreApplyPoisonBeforeTurn(attacker, emit);
    if (poisonResult.amount > 0 && attacker.hp > 0) {
      coreTriggerManaOnInjury(attacker, state, emit);
      const injuryRepeats = 1 + coreRingCount(state, attacker.side, '激怒の指輪')
        + coreEffectCount(attacker, '執念の炎')
        + Math.max(0, Number(attacker._effectRepeatBonus) || 0);
      for (let i = 0; i < injuryRepeats && attacker.hp > 0; i++) {
        const injuryEventSeq = state._coreInjuryEventSeq = (Number(state._coreInjuryEventSeq) || 0) + 1;
        coreApplyInjuryEffects(attacker, poisonResult.amount, state, rng, emit, applyHit, null, `${injuryEventSeq}:${i}`);
        coreFlushPendingLichSummons(state, emit);
      }
    }
    if (attacker.hp <= 0) {
      coreTriggerDeath(attacker, state, emit);
      coreApplyDeathEffects(attacker, state, rng, emit, applyHit);
      coreApplyDeathObservers(attacker, state, rng, emit, applyHit);
      coreTryRevive(attacker, state, emit);
      result = decided();
      side = foeSide;
      return { side, result, stop: false };
    }
    if (!coreCanAct(attacker)) { side = foeSide; result = decided(); return { side, result, stop: false }; }
    coreApplyAttackObservers(attacker, state, rng, emit, applyHit);
    const plannedTarget = coreSelectAttackTarget(attacker, units[foeSide], rng, { defendersAreEnemies: foeSide === 'p2' });
    if (!plannedTarget) { result = decided(); return { side, result, stop: true }; }
    attacker._currentAttackTarget = plannedTarget;
    attacker._attackTargetWasWounded = !!(plannedTarget.hp > 0 && plannedTarget.hp < plannedTarget.maxHp);
    const silenced = !!attacker._silenced;
    // 反復ボーナス（絆の巻物で合体したカード等）は**他のトリガと同じ引き方**にする。
    // ここだけ effectData しか見ていなかったため、合体したカードの
    // **攻撃効果だけ2回目が発動しなかった**（効果の数値が増えないように見える）。
    const attackEffectRepeats = 1 + coreRingCount(state, side, '狂戦士の指輪')
      + coreEffectCount(attacker, '闇の儀式')
      + Math.max(0, Number(attacker._effectRepeatBonus)
        || Number(attacker.effectData && attacker.effectData.effectRepeatBonus) || 0);
    let attackEffectResult = { skipAttack: false };
    if (!silenced) for (let i = 0; i < attackEffectRepeats && attacker.hp > 0; i++) {
      coreTriggerManaOnAttack(attacker, state, emit);
      const attackEventSeq = state._coreAttackEventSeq = (Number(state._coreAttackEventSeq) || 0) + 1;
      attackEffectResult = coreApplyAttackEffects(attacker, state, rng, emit, applyHit, `${attackEventSeq}:${i}`) || attackEffectResult;
      coreFlushPendingLichSummons(state, emit);
    }
    if (silenced) delete attacker._silenced;
    delete attacker._currentAttackTarget;
    delete attacker._attackTargetWasWounded;
    // 身代わり攻撃（スケルトンキングの召喚体・操作した敵）で本人が攻撃しない場合も、
    // **その手番は消費されている**。ここで手番を渡さないと同じ側が延々と行動し続け、
    // 相手の攻撃ターンが一度も来ない（味方がスケルトンキングだけの時に無限化した）。
    if (attackEffectResult.skipAttack) {
      result = decided();
      side = foeSide;
      return { side, result, stop: false };
    }
    coreApplyManaThresholdEffects(state, rng, emit, applyHit);
    coreApplyRingManaEffects(state, rng, emit, applyHit);
    // マナ閾値効果で召喚された本体に対するリッチ誘発は、同じ閾値処理の
    // イベント列へ直ちに続ける。ここを次の攻撃／次のトリガまで保留すると、
    // ダイアウルフ等の召喚自体は成立しても、シャドウだけが後のイベントへ
    // 流れ、表示順・攻撃順が旧オフライン経路からずれる。
    coreFlushPendingLichSummons(state, emit);
    if (attacker.hp <= 0) {
      coreTriggerDeath(attacker, state, emit);
      coreApplyDeathEffects(attacker, state, rng, emit, applyHit);
      coreApplyDeathObservers(attacker, state, rng, emit, applyHit);
      coreTryRevive(attacker, state, emit);
      result = decided();
      side = foeSide;
      return { side, result, stop: false };
    }

    // 対象の決め方はPvEと同じ（守護・隠密・狩人・前衛優先）。
    const target = plannedTarget.hp > 0 && !coreIsSealed(plannedTarget)
      ? plannedTarget
      : coreSelectAttackTarget(attacker, units[foeSide], rng, { defendersAreEnemies: foeSide === 'p2' });
    if (!target) { result = decided(); return { side, result, stop: true }; }

    // 接触＝相互ダメージ。全体／三方向／貫通は対象ごとに同じ攻撃イベントを出し、
    // 二段／三段は単体攻撃を追加する。PvEの攻撃対象の並びと同じ順序で処理する。
    const damage = coreAttackDamage(attacker);
    const attackTargets = () => {
      const spread = coreAttackSpread(attacker);
      const arr = units[foeSide] || [];
      // オブジェクト・魂は攻撃対象にしない（PvEの _canReceiveBattleEffect と同じ）。
      const alive = u => u && u.hp > 0 && !coreIsSealed(u) && !u._isObject && !u._isSoul;
      const live = arr.filter(alive);
      if (spread === 'all') return live;
      if (spread === 'tri') {
        // 三方向は「盤面配列の隣接スロット」で左右を選ぶ。PvEは空きスロットを含む
        // 固定長配列のindexで [idx-1, idx, idx+1] を取るため、生存者だけに詰めた
        // 配列のindexで取ると対象が変わる。PvEに合わせる。
        return coreTriDirectionTargets(target, arr);
      }
      // **貫通の巻き込みはここで足さない。** withPierce() が唯一の実装
      // （ここでも足していた頃は、withPierce 側が「もう入っている」と判断して
      //   巻き込んだ相手を控えず、貫通の演出が出なくなった）。
      return [target].filter(u => u && u.hp > 0);
    };
    // 貫通は範囲攻撃と**併用できる**。三方向攻撃・全体攻撃で当たった前衛それぞれの
    // 真後ろも巻き込む（貫通の効果文どおり）。片方だけを見て切り替えていた頃は、
    // 三方向攻撃を持つキャラクターの貫通が効果もVFXも丸ごと消えていた。
    // 貫通で巻き込む後衛。**範囲攻撃の対象とは別に持つ**（三方向攻撃のVFXが
    // 後衛にまで出てしまうため、演出へ同じ配列を渡してはいけない）。
    const pierceVictimIds = new Set();
    const withPierce = (victims) => {
      if (!coreUnitHasKeyword(attacker, '貫通')) return victims;
      const alive = u => u && u.hp > 0 && !coreIsSealed(u) && !u._isObject && !u._isSoul;
      const live = (units[foeSide] || []).filter(alive);
      const out = victims.slice();
      victims.filter(u => u && (u.lane || 'front') !== 'rear')
        .forEach(u => corePierceRearTargets(u, live).forEach(rear => {
          if (!rear) return;
          // **控えるのは「もう対象に入っているか」と関係なく行う。**
          // 演出はこの控えを見て貫通を出すか決める。
          pierceVictimIds.add(rear.id);
          if (!out.includes(rear)) out.push(rear);
        }));
      return out.filter((u, i, a) => u && a.indexOf(u) === i && u.hp > 0);
    };
    // allowCounter：反撃を受けるかどうか。全体／三方向／貫通の1回の攻撃で反撃を受けるのは
    // **主対象の1体だけ**（PvEの _dealAttackDamage は entries に反撃を1件しか積まない）。
    // 対象ごとに反撃させると、全体攻撃で対象3体なら反撃も3回になりPvEと食い違う。
    // 二段／三段の追加攻撃は1回ずつ別の攻撃なので、そちらは毎回反撃を受ける。
    // **一撃（1回の攻撃）＝ひとまとまり。** 全体攻撃・三方向攻撃・貫通で複数体へ当たる場合も、
    // 当たるのは同じ瞬間なので、全員へダメージを入れてから誘発（負傷・死亡効果）をまとめて解決する。
    // 攻撃と反撃も同じひと続きの打ち合いとして先に両方を確定させる。1発ずつ誘発まで解決すると、
    // 倒れた側の死亡効果（闇の炎の1ダメージ等）が反撃や他の対象へのダメージより先に起きる。
    // primary：この一撃の主対象（反撃を受ける相手・モーションを出す相手）。
    // **追加攻撃（二段・三段・疾風の指輪）では対象が変わる。** 省略して外側の target を
    // 見ていた頃は、2回目以降の attack イベントが attackVisual:false になり、
    // 再生側が攻撃モーションを飛ばしていた。
    const strike = (victims, primaryTarget) => {
      const strikeTarget = primaryTarget || target;
      const pending = [];
      const spread = coreAttackSpread(attacker);
      // 接触演出は複数同時に出る（三方向攻撃＋貫通など）。**片方で上書きしないこと。**
      const contactModes = [];
      if (spread) contactModes.push(spread);
      // **貫く相手がいない時は、貫通の演出も出さない**（利用者指定）。
      if (coreUnitHasKeyword(attacker, '貫通') && pierceVictimIds.size) contactModes.push('pierce');
      const hitOpts = { deferTriggers: true, collect: pending,
        suppressAttackHitSfx: contactModes.length > 0 };
      coreWithDamageKind(state, 'combat', () => {
        const batched = coreBeginDamageBatch(state);
        try {
          const targetIds = victims.map(x => x && x.victim && x.victim.id).filter(Boolean);
          const primary = victims.find(x => x && x.victim === strikeTarget);
          // **接触VFXは attack イベントより先に出す。** 再生側はこれを持っておき、
          // 攻撃モーションが対象へ接触した瞬間に鳴らす。あとに置いていた頃は、
          // 攻撃モーションを再生し終えた（＝キャラクターが戻った）後に出ていた。
          if (contactModes.length && primary) {
            // targetIds＝範囲攻撃（三方向・全体）の対象。pierceTargetIds＝貫通が
            // 貫く順（手前から奥へ）。混ぜると三方向攻撃のVFXが後衛に出る。
            emit({ type: 'attack_contact_vfx', side, attackerId: attacker.id,
              mode: contactModes[0], modes: contactModes.slice(),
              primaryTargetId: strikeTarget.id,
              targetIds: targetIds.filter(id => !pierceVictimIds.has(id)),
              pierceTargetIds: [strikeTarget.id, ...targetIds.filter(id => pierceVictimIds.has(id))] });
          }
          victims.forEach(({ victim, allowCounter }) => {
            if (!victim || victim.hp <= 0) return;
            const counter = coreCounterDamage(attacker, victim);
            emit({ type: 'attack', side, attackerId: attacker.id, targetId: victim.id, damage, counterDamage: counter,
              attackVisual: victim === strikeTarget });
          });
          victims.forEach(({ victim, allowCounter }) => {
            if (!victim || victim.hp <= 0) return;
            const attackerFirst = coreUnitHasKeyword(attacker, '先制') && !coreUnitHasKeyword(victim, '先制');
            const counter = coreCounterDamage(attacker, victim);
            attacker._coreAttackContact = true;
            const targetResult = applyHit(attacker, victim, damage, false, false, false, hitOpts);
            delete attacker._coreAttackContact;
            if (allowCounter && !(attackerFirst && targetResult.died)) {
              applyHit(victim, attacker, counter, true, false, false, hitOpts);
            }
          });
        } finally { if (batched) coreEndDamageBatch(state); }
      });
      // 誘発は戦闘ダメージの束の外で解決する（負傷効果・死亡効果はそれぞれ別の種別になる）。
      pending.forEach(h => coreApplyHitTriggers(state, h.source, h.target, h.result, h.before,
        h.counter, rng, emit, applyHit, h.damageKind ? { ...h.opt, damageKind: h.damageKind } : h.opt));
    };
    strike(withPierce(attackTargets()).map(victim => ({ victim, allowCounter: victim === target })));
    const extra = coreAttackSpread(attacker) ? 0
      : coreExtraAttackTotal(attacker, units[side], coreRingCount(state, side, '疾風の指輪'));
    for (let i = 0; i < extra && attacker.hp > 0; i++) {
      const nextTarget = coreSelectAttackTarget(attacker, units[foeSide], rng, { defendersAreEnemies: foeSide === 'p2' });
      if (!nextTarget) break;
      // **追加攻撃も「攻撃」。** 「味方が攻撃するたび」の効果（シャナ等）は
      // 二段・三段攻撃の2回目以降でも発動する。
      coreApplyAttackObservers(attacker, state, rng, emit, applyHit);
      // 二段攻撃等の追加攻撃は「別の一撃」。前の一撃と同じ束にはしない。
      strike([{ victim: nextTarget, allowCounter: true }], nextTarget);
    }
    // 死亡で生贄が減る／増えることがあるので、毎接触の後に封印を再判定する（PvEと同じ）。
    resolveSeals();

    // 挑発（hate）の残りターンを、行動した側のユニットについて1減らす。
    // PvE（battle.js の battlePhase）は味方が行動するたびにこれを行っていたが、
    // コアには無く、オンラインでは挑発が永久に切れなかった。PvEの規則をそのまま
    // 「行動した側」へ一般化して、両者を揃える。
    (units[side] || []).forEach(u => {
      if (u && u.hate && u.hateTurns > 0) {
        u.hateTurns--;
        if (u.hateTurns <= 0) u.hate = false;
      }
    });

    side = foeSide;
    result = decided();
  return { side, result, stop: false };
}

// 死亡ユニットを盤面配列から外す。復活・死亡効果はこれより前に解決しておくこと。
// 位置の詰め方はPvEの compactBattleUnits() と同じ「生存を左詰め」。
// keepOnBoard：再生側だけが渡す「この体はまだ盤面から外さない」判定。
// ルール上は死んでいても、ダメージ数値や個別VFXを出し終えるまでは枠を残したい。
// コア自身は演出を知らないので、判定そのものは呼び出し側（present.js）が持つ。
function coreCompactUnits(state, keepOnBoard) {
  ['p1', 'p2'].forEach(side => {
    const list = state.units[side];
    if (!Array.isArray(list)) return;
    // 生存している体だけを残す。_corePendingSummon は「PvEがまだ描画していない」
    // という再生側の印であり、盤面の存在とは無関係。ここで残すと
    // オンラインでは誰も外さないため、死んだ召喚体が配列に残り続けて位置がずれる。
    const kept = list.filter(u => u && (u.hp > 0
      || (typeof keepOnBoard === 'function' && keepOnBoard(u))));
    if (kept.length !== list.filter(Boolean).length) {
      list.splice(0, list.length, ...kept);
    }
  });
}

// 先攻の決定。生存数が多い側が先攻。**同数なら乱数で決める。**
// PvEとオンラインで唯一意図的に食い違っていた箇所だが、
// 2026-09-01のユーザー指示でPvEも乱数へ揃えた。両方がここだけを呼ぶこと。
function corePickFirstSide(state, rng) {
  const units = state.units || { p1: [], p2: [] };
  // **先攻になるのは神速の指輪だけ**（開戦：左端のATKを2倍にし、先攻になる）。
  // 疾風の指輪は「常時：味方の攻撃回数は1回追加される」で、先攻とは関係がない。
  // 一緒に扱っていた頃は、疾風の指輪を持っているだけで敵の方が多くても先攻になっていた。
  if (coreRingCount(state, 'p1', '神速の指輪')) return 'p1';
  const n1 = coreLivingUnits(units.p1).length, n2 = coreLivingUnits(units.p2).length;
  if (n1 !== n2) return n1 > n2 ? 'p1' : 'p2';
  return (rng && typeof rng.next === 'function' ? rng.next() : Math.random()) < 0.5 ? 'p1' : 'p2';
}

// 開戦処理。**PvEもオンラインもここだけを通すこと。**
// 以前はPvE（_finishNewPanelBattleStartEffects）とオンライン（runBattleCore）で
// 同じ手順が別々に書かれており、「生命の力」のHP2倍のように片方にしか無い工程があった。
function coreRunOpening(state, rng, emit, applyHit, resolveSeals) {
  const units = state.units;
  const allUnits = () => [...(units.p1 || []), ...(units.p2 || [])].filter(Boolean);
  // 開始時の盤面（封印されたまま）を先に見せてから、解放を演出として流す。
  emit({ type: 'battle_start', sides: { p1: (units.p1 || []).filter(Boolean).map(coreUnitSnapshot), p2: (units.p2 || []).filter(Boolean).map(coreUnitSnapshot) } });
  coreInitSealStates(allUnits(), u => (u.side === 'p1' ? u.slot : 100 + u.slot));
  resolveSeals();
  state._openingPhase = true;
  try {
    coreApplyMapPanelOpeningEffects(state, emit);
    coreApplyOpeningRings(state, emit, applyHit);
    coreApplyOpeningItems(state, rng, emit, applyHit);
    allUnits().filter(u => u.hp > 0 && !coreIsSealed(u)).forEach(u => {
      const shield = coreUnitShieldValue(u);
      if (shield > 0) { u.shield = Math.max(Number(u.shield) || 0, shield); emit({ type: 'shield_set', side: u.side, unitId: u.id, amount: shield }); }
      const repeats = 1 + coreEffectCount(u, '恩寵') + Math.max(0, Number(u._effectRepeatBonus) || 0);
      for (let i = 0; i < repeats && u.hp > 0 && !coreIsSealed(u); i++) {
        // 同一state内の再入防止用インデックスを反復ごとに変える。
        coreApplyOpeningEffects(u, state, rng, emit, applyHit, i);
      }
    });
    // 生命の力：開戦効果・魔導板強化の足し引きが済んだ後にHPを2倍にする。
    // _mapPanelPower は編成側（formation.js）が入れる値。
    allUnits().filter(u => u.hp > 0 && !coreIsSealed(u) && u._mapPanelPower === 'life').forEach(u => {
      if (u._lifePanelDoubled) return;
      const hp = Math.max(0, Number(u.maxHp) || 0);
      u.maxHp += hp; u.hp += hp; u._lifePanelDoubled = true;
      emit({ type: 'stat_change', side: u.side, unitId: u.id, atk: 0, hp, reason: 'life_panel_double' });
    });
    coreApplyManaThresholdEffects(state, rng, emit, applyHit);
    coreApplyRingManaEffects(state, rng, emit, applyHit);
    // 開戦時のマナ閾値召喚も、召喚本体の直後にリッチ誘発を確定する。
    coreFlushPendingLichSummons(state, emit);
    // 開戦で前衛が全滅した場合もここで判定する（判定の実装は1箇所）。
    coreCheckUndyingRing(state, emit);
  } finally {
    state._openingPhase = false;
  }
}

function runBattleCore(state, rng, opts) {
  const emit = (opts && typeof opts.onEvent === 'function') ? opts.onEvent : () => {};
  // 1回の戦闘効果内で複数体を召喚する間、リッチ誘発を本体列の後ろへまとめる。
  state._deferLichSummons = true;
  const turnLimit = Math.max(1, Number(opts && opts.turnLimit) || BATTLE_CORE_TURN_LIMIT);
  const units = state.units;

  // 盤面上の全キャラクターと、その並び順（味方→敵）。封印の解放順に使う。
  const allUnits = () => [...(units.p1 || []), ...(units.p2 || [])].filter(Boolean);
  const fieldOrder = u => (u.side === 'p1' ? 0 : 100) + u.slot;

  // 1回の接触に伴う共通処理。数値・状態変更・トリガ発火をここへ集約する。
  const legacyApplyHit = (source, target, amount, counter, skipSourceEffects, skipTough) => {
    if (source && target) target._lastDamageSource = source;
    // 団結：同じ「団結」強化につながる味方へ、強靭適用後のダメージを分散する。
    // グループは編成側が接続関係から作り、コアはIDの集合だけを参照する。
    if (!skipSourceEffects && target && amount > 0 && !target._uniteSplit && Array.isArray(target._uniteGroups) && target._uniteGroups.length) {
      const members = (units[target.side] || []).filter(x => x && x.hp > 0 && !coreIsSealed(x)
        && Array.isArray(x._uniteGroups) && x._uniteGroups.some(g => target._uniteGroups.includes(g)));
      if (members.length >= 2) {
        const distributable = Math.max(0, Number(amount) - coreToughValue(target));
        const share = Math.floor(distributable / members.length);
        let remainder = distributable - share * members.length;
        if (share > 0 || remainder > 0) {
          let result = { amount: 0, died: false };
          members.forEach(member => {
            const part = share + (remainder-- > 0 ? 1 : 0);
            if (part > 0) {
              const r = applyHit(source, member, part, counter, true, member === target);
              result.amount += r.amount || 0; result.died = result.died || !!r.died;
            }
          });
          return result;
        }
      }
    }
    // マータ：味方が受けるダメージの肩代わり。分け方は coreMataSplit()（本文で決まる）。
    if (!skipSourceEffects && target && amount >= 2 && !coreHasEffect(target, 'マータ')) {
      const mata = (units[target.side] || []).find(x => x && x !== target && x.hp > 0
        && !coreIsSealed(x) && coreHasEffect(x, 'マータ') && (Number(x.shield) || 0) <= 0);
      if (mata) {
        const split = coreMataSplit(mata, amount);
        const primary = applyHit(source, target, split.target, counter, true);
        const shared = split.redirected > 0 ? applyHit(source, mata, split.redirected, counter) : { amount: 0, died: false };
        return { amount: primary.amount || 0, died: !!(primary.died || shared.died) };
      }
    }
    if (source && source._coreAttackContact && !counter
      && /攻撃はHPではなくATKにダメージを与える/.test(coreUnitTriggerText(source, '攻撃'))) {
      const damage = Math.min(Math.max(0, Number(target.atk) || 0), Math.max(0, Math.round(Number(amount) || 0)));
      target.atk = Math.max(0, (Number(target.atk) || 0) - damage);
      const fled = target.atk <= 0;
      if (fled) { target.hp = 0; target._fled = true; }
      emit({ type: 'stat_change', side: target.side, unitId: target.id, atk: -damage, hp: 0, reason: 'attack_to_atk' });
      emit({ type: 'damage', side: target.side, unitId: target.id, amount: damage, hpAfter: target.hp,
        sourceId: source.id, counter: false, damageTo: 'atk' });
      // 逃走はダメージの後（上の実装と同じ順）。
      if (fled) emit({ type: 'fled', side: target.side, unitId: target.id, sourceId: source.id });
      return { blocked: false, amount: damage, died: false, fled: !!target._fled };
    }
    const before = target && target.hp;
    const result = coreApplyDamage(target, amount, emit, {
      sourceId: source && source.id,
      counter: !!counter,
      skipTough: !!skipTough,
    });
    if (result.blocked && result.reason === 'shield') coreApplyShieldLostEffects(target, state, rng, emit, applyHit);
    if (result.amount > 0) {
      coreApplyLuckyRing(target, result.amount, state, emit);
      if (source && !skipSourceEffects) {
        const keywordResult = coreApplyKeywordOnHit(source, target, result.amount, before, state, emit);
        // 即死は通常ダメージイベントを伴わずHPだけが0になるため、再生側にも
        // 通常の死亡イベントを流して、PvEと同じ死亡確定タイミングに揃える。
        if (keywordResult && keywordResult.killed) {
          emit({ type: 'death', side: target.side, unitId: target.id });
        }
        if (keywordResult && keywordResult.cursed && source.hp <= 0) {
          coreTriggerDeath(source, state, emit);
          coreApplyDeathEffects(source, state, rng, emit, applyHit);
          coreTryRevive(source, state, emit);
        }
      }
      if (target.hp > 0) coreTriggerManaOnInjury(target, state, emit);
      if (target.hp > 0) {
        const repeats = 1 + coreRingCount(state, target.side, '激怒の指輪')
          + coreEffectCount(target, '執念の炎')
          // 反復ボーナスは createCoreUnit() が _effectRepeatBonus へ正規化するため、
        // effectData だけを見ると絆・3枚合体の分がオンラインで落ちる。
        + Math.max(0, Number(target._effectRepeatBonus) || Number(target.effectData && target.effectData.effectRepeatBonus) || 0);
        for (let i = 0; i < repeats && target.hp > 0; i++) {
          coreApplyInjuryEffects(target, result.amount, state, rng, emit, applyHit, source);
        }
      }
    }
    if (target.hp <= 0) {
      coreTriggerDeath(target, state, emit);
      coreApplyDeathEffects(target, state, rng, emit, applyHit);
      coreApplyDeathObservers(target, state, rng, emit, applyHit);
      coreTryRevive(target, state, emit);
    }
    return result;
  };
  // 実際の戦闘ループは共通の即時解決入口を使用する。
  // extra：deferTriggers / collect を渡すための追加指定。
  // 「全員にダメージを入れてから、まとめて誘発」する効果がこれを使う。
  const applyHit = (source, target, amount, counter, skipSourceEffects, skipTough, extra) =>
    coreResolveHit(state, source, target, amount, counter, rng, emit, {
      skipSourceEffects: !!skipSourceEffects, skipTough: !!skipTough,
      ...(extra || {}),
    });

  // 封印X：戦闘開始時は場に出ていない。判定・順序はコアの共通ルール。
  coreInitSealStates(allUnits(), fieldOrder);

  // 必要な血が揃っている封印を、盤面順に1体ずつ解放する。血は消費しない。
  const resolveSeals = () => {
    const sealed = allUnits().filter(u => u.hp > 0 && coreIsSealed(u))
      .sort((a, b) => (Number(a._sealOrder) || 0) - (Number(b._sealOrder) || 0));
    for (const unit of sealed) {
      if (!coreIsSealed(unit) || unit.hp <= 0) continue;
      const rel = coreSealRelease(unit, allUnits(), state.blood);
      if (!rel.ready) continue;
      unit._sealed = false;
      delete unit._sealValue;
      delete unit._sealInfinity;
      // ナイトメア等の死亡効果は、解放後の次の死亡で再び発動できる。
      delete unit._coreDeathEffectsTriggered;
      emit({ type: 'seal_release', side: unit.side, unitId: unit.id, required: rel.required });
      // 秘紋の指輪：常時：味方の解放効果は1回追加で発動する。
      // PvE（battle.js の _releaseRepeatCount）は数えていたがコアが数えておらず、
      // オンラインではこの指輪が何もしていなかった。coreRingCount は自陣営の指輪だけを数えるため、
      // PvEの「敵側には適用しない」という条件もそのまま満たす。
      const releaseRepeats = 1 + coreEffectCount(unit, '禁断の力')
        + coreRingCount(state, unit.side, '秘紋の指輪')
        + Math.max(0, Number(unit._effectRepeatBonus) || 0);
      for (let i = 0; i < releaseRepeats && unit.hp > 0; i++) {
        coreApplyReleaseEffects(unit, [], state, rng, emit, applyHit);
      }
    }
  };
  // PvEは startBattle() の中で既に開戦処理を済ませてから1手ずつ進める。
  // ここで二度目を走らせると開戦効果が二重に乗るため、その場合は飛ばす。
  const skipOpening = !!(opts && opts.skipOpening);
  if (!skipOpening) coreRunOpening(state, rng, emit, applyHit, resolveSeals);

  // 先攻：生存数が多い側。同数なら rng で決める（呼び出し側では決めない）。
  let side = state._coreFirstSide || corePickFirstSide(state, rng);

  const decided = () => {
    const a1 = coreLivingUnits(units.p1).length, a2 = coreLivingUnits(units.p2).length;
    if (a1 > 0 && a2 > 0) return null;
    if (a1 === 0 && a2 === 0) return { outcome: 'draw', reason: 'both_wiped' };
    return { outcome: a1 > 0 ? 'p1' : 'p2', reason: 'wiped' };
  };

  let result = decided();
  // 1ターン分の進行は coreBattleStep() が唯一の実装。
  // PvEも同じ足場（下の runner）を使って1手ずつ呼ぶ。
  const runner = {
    get side() { return side; },
    get result() { return result; },
    applyHit, resolveSeals, decided,
    // 1手進める。戻り値 true なら打ち切り。
    // **詰め処理（死亡ユニットの除去）は演出の後に回せるようにする。**
    // 先に詰めると、PvEが演出を再生する時に攻撃対象が盤面から消えており、
    // 攻撃モーションが対象を見つけられずに全て飛ぶ。
    step(stepOpts) {
      const next = coreBattleStep({ units, state, rng, emit, applyHit, resolveSeals, decided, side, result });
      side = next.side;
      result = next.result;
      if (!(stepOpts && stepOpts.deferCompact)) coreCompactUnits(state);
      return !!next.stop;
    },
    // 演出を再生し終えてから詰める時に呼ぶ。
    compact() { coreCompactUnits(state); },
    // 決着を確定して battle_end を出す。PvEもこれを通す。
    finish() {
      if (!result) result = { outcome: 'draw', reason: 'turn_limit' };
      coreTriggerBattleEnd(state, emit, rng);
      emit({ type: 'battle_end', outcome: result.outcome, reason: result.reason });
      return { outcome: result.outcome, endReason: result.reason, turns: state.turn };
    },
  };
  state._coreRunner = runner;
  if (opts && opts.stepwise) return runner;

  while (!runner.result && state.turn < turnLimit) {
    if (runner.step()) break;
  }
  return runner.finish();
}

// PvEが1手ずつ進めるための入口。開戦処理まで済ませた足場を返す。
// **戦闘の進め方は runBattleCore() の中の runner が唯一の実装。**
// PvEはこれを使い、step() の合間に演出を挟む。
function createBattleRunner(state, rng, emit, opts) {
  return runBattleCore(state, rng, { ...(opts || {}), onEvent: emit, stepwise: true });
}

// 最終状態の書き出し（保存・照合用）
function battleCoreFinalState(state) {
  return {
    p1: { units: state.units.p1.map(coreUnitSnapshot) },
    p2: { units: state.units.p2.map(coreUnitSnapshot) },
    resources: state.resources,
    blood: state.blood || { p1: 0, p2: 0 },
  };
}

if (typeof window !== 'undefined') {
  window.BATTLE_CORE_TURN_LIMIT = BATTLE_CORE_TURN_LIMIT;
  window.createBattleState = createBattleState;
  window.runBattleCore = runBattleCore;
  window.coreBattleStep = coreBattleStep;
  window.coreCheckUndyingRing = coreCheckUndyingRing;
  window.createBattleRunner = createBattleRunner;
  window.coreRunOpening = coreRunOpening;
  window.coreLaneAttackCandidates = coreLaneAttackCandidates;
  window.coreExtraAttackTotal = coreExtraAttackTotal;
  window.corePickAttacker = corePickAttacker;
  window.battleCoreFinalState = battleCoreFinalState;
  window.coreUnitSnapshot = coreUnitSnapshot;
  window.coreMathRng = coreMathRng;
  window.CORE_KEYWORD_CARD_NAMES = CORE_KEYWORD_CARD_NAMES;
  window.CORE_EFFECT_CARD_NAMES = CORE_EFFECT_CARD_NAMES;
  window.coreUnitKeywords = coreUnitKeywords;
  window.coreUnitEffectText = coreUnitEffectText;
  window.coreUnitTriggerText = coreUnitTriggerText;
  window.coreUnitIsSilenced = coreUnitIsSilenced;
  window.coreShieldValueFromKeyword = coreShieldValueFromKeyword;
  window.coreUnitShieldValue = coreUnitShieldValue;
  window.coreUnitHasKeyword = coreUnitHasKeyword;
  window.coreUnitKeywordCount = coreUnitKeywordCount;
  window.coreIsSealed = coreIsSealed;
  window.coreCanAct = coreCanAct;
  window.coreAttackDamage = coreAttackDamage;
  window.coreCounterDamage = coreCounterDamage;
  window.coreSelectAttackTarget = coreSelectAttackTarget;
  window.corePierceRearTargets = corePierceRearTargets;
  window.coreToughValue = coreToughValue;
  window.coreResolveIncomingDamage = coreResolveIncomingDamage;
  window.coreConsumeWardCharge = coreConsumeWardCharge;
  window.coreUnitHasSacrifice = coreUnitHasSacrifice;
  window.coreSealValue = coreSealValue;
  window.coreInitSealStates = coreInitSealStates;
  window.coreSacrificeUnits = coreSacrificeUnits;
  window.coreSacrificeCount = coreSacrificeCount;
  window.coreSealRelease = coreSealRelease;
  window.coreKeywordSum = coreKeywordSum;
  window.coreExtraAttackCount = coreExtraAttackCount;
  window.coreAttackSpread = coreAttackSpread;
  window.coreApplyKeywordOnHit = coreApplyKeywordOnHit;
  window.coreKeywordHitAmounts = coreKeywordHitAmounts;
  window.coreTriggerAtkGainEffects = coreTriggerAtkGainEffects;
  window.coreUnitEffectNames = coreUnitEffectNames;
  window.coreHasEffect = coreHasEffect;
  window.coreEffectCount = coreEffectCount;
  window.coreRingCount = coreRingCount;
  window.coreSummonUnit = coreSummonUnit;
  window.coreFlushPendingLichSummons = coreFlushPendingLichSummons;
  window.coreTransformUnit = coreTransformUnit;
  window.coreRestoreDeferredState = coreRestoreDeferredState;
  window.corePickFirstSide = corePickFirstSide;
  window.coreApplyAttackEffects = coreApplyAttackEffects;
  window.coreApplyOpeningEffects = coreApplyOpeningEffects;
  window.coreApplyMapPanelOpeningEffects = coreApplyMapPanelOpeningEffects;
  window.coreApplyManaThresholdEffects = coreApplyManaThresholdEffects;
  window.coreApplyDeathEffects = coreApplyDeathEffects;
  window.coreApplyDeathObservers = coreApplyDeathObservers;
  window.coreApplyAttackObservers = coreApplyAttackObservers;
  window.coreApplyAttackRing = coreApplyAttackRing;
  window.coreApplyShieldLostEffects = coreApplyShieldLostEffects;
  window.coreApplyRingManaEffects = coreApplyRingManaEffects;
  window.coreApplyInjuryEffects = coreApplyInjuryEffects;
  window.coreApplyReleaseEffects = coreApplyReleaseEffects;
  window.coreApplyOpeningItems = coreApplyOpeningItems;
  window.coreApplyOpeningRings = coreApplyOpeningRings;
  window.coreApplyPoisonBeforeTurn = coreApplyPoisonBeforeTurn;
  window.coreTriggerManaOnAttack = coreTriggerManaOnAttack;
  window.coreTriggerManaOnInjury = coreTriggerManaOnInjury;
  window.coreTriggerDeath = coreTriggerDeath;
  window.coreTryRevive = coreTryRevive;
  window.coreTriggerBattleEnd = coreTriggerBattleEnd;
  window.coreApplyLuckyRing = coreApplyLuckyRing;
  window.coreResolveHit = coreResolveHit;
  window.coreApplyHitTriggers = coreApplyHitTriggers;
  window.coreHitAll = coreHitAll;
  window.coreBeginDamageBatch = coreBeginDamageBatch;
  window.coreEndDamageBatch = coreEndDamageBatch;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BATTLE_CORE_TURN_LIMIT, createBattleState, runBattleCore, coreBattleStep, coreCheckUndyingRing,
    coreLaneAttackCandidates, corePickAttacker, coreExtraAttackTotal,
    battleCoreFinalState, coreUnitSnapshot, createCoreUnit,
    coreMathRng, CORE_KEYWORD_CARD_NAMES, CORE_EFFECT_CARD_NAMES, coreUnitKeywords, coreUnitEffectText, coreUnitTriggerText, coreUnitIsSilenced,
    coreShieldValueFromKeyword, coreUnitShieldValue, coreUnitHasKeyword,
    coreUnitKeywordCount, coreIsSealed, coreCanAct, coreAttackDamage, coreCounterDamage,
    coreSummonUnit, coreFlushPendingLichSummons, coreTransformUnit, coreRestoreDeferredState,
    coreBeginSummonBatch, coreEndSummonBatch, coreApplyWargThreshold,
    corePickFirstSide, coreManaThresholdDescFromText, createBattleRunner, coreInsertSummonedUnit,
    coreRunOpening,
    coreCompactUnits,
    coreSnapshotDeferredState,
    coreSelectAttackTarget, corePierceRearTargets, coreTriDirectionTargets,
    coreToughValue, coreResolveIncomingDamage, coreConsumeWardCharge,
    coreUnitHasSacrifice, coreSealValue, coreInitSealStates,
    coreSacrificeUnits, coreSacrificeCount, coreSealRelease,
    coreKeywordSum, coreExtraAttackCount, coreAttackSpread, coreStatBonus, coreRefreshVoidWalkerBonus,
    coreApplyKeywordOnHit, coreApplyPoisonBeforeTurn,
    coreKeywordHitAmounts,
    coreTriggerAtkGainEffects,
    coreUnitEffectNames, coreHasEffect, coreEffectCount, coreRingCount, coreApplyAttackEffects,
    coreApplyOpeningEffects,
    coreApplyMapPanelOpeningEffects,
    coreApplyManaThresholdEffects,
    coreApplyDeathEffects,
    coreApplyDeathObservers, coreApplyAttackObservers, coreApplyAttackRing,
    coreApplyShieldLostEffects,
    coreApplyRingManaEffects,
    coreApplyInjuryEffects,
    coreApplyReleaseEffects,
    coreApplyOpeningItems,
    coreApplyOpeningRings,
    coreTriggerManaOnAttack, coreTriggerManaOnInjury,
    coreTriggerDeath, coreTriggerBattleEnd, coreTryRevive, coreApplyLuckyRing,
    coreResolveHit, coreApplyHitTriggers, coreHitAll, coreBeginDamageBatch, coreEndDamageBatch,
  };
}
