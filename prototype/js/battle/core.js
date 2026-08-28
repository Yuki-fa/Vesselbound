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
// PvEは決定論を必要としないので coreMathRng を、PvPは protocol.js の
// createSeededRng(seed) を渡す。これが「seedを誰が決めるか」の違いそのもの。
const coreMathRng = {
  next() { return Math.random(); },
  int(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
};

// ══════════════════════════════════════════
// キーワード判定
// カードのキーワードは「キーワード列」と効果文の両方から決まる。
// PvE（battle.js）もPvP（sim.js）もここだけを見ること。
// ══════════════════════════════════════════

// キーワードとしてではなく強化カード名として書かれているものは、キーワード扱いしない。
const CORE_KEYWORD_CARD_NAMES = new Set(
  ['封印されしもの', '禁断の力', '武器破壊', '団結', '共振', '遺志', '熟練', '戦術', '大盾', '策士']);
// 効果文に書かれていれば自身が持つものとして扱うキーワード。
const CORE_TEXT_KEYWORDS = ['復活', '根性', 'ヘイト', '二段攻撃', '三段攻撃', '三方向攻撃', '全体攻撃', '先制'];

function coreUnitKeywords(unit) {
  const kws = [...(unit && unit.keywords || [])].filter(k => !CORE_KEYWORD_CARD_NAMES.has(String(k || '').trim()));
  const unitText = [unit && unit.desc, unit && unit.effectText, unit && unit.effect].filter(Boolean).join(' ');
  const passiveText = unitText.replace(/(^|\n)\s*\d+マナ(?:毎)?[:：][^\n。]*(?:。|$)/g, ' ');
  const ownPassiveText = passiveText.replace(/(?:ランダムな)?(?:味方|敵|キャラクター|.+?キャラクター)(?:に|が)[^。]*(?:結界|生贄|復活|封印\d*)を(?:付与する|得る)。?/g, ' ');
  CORE_TEXT_KEYWORDS.forEach(k => {
    // 「復活を付与する」は自身ではなく他者に付与する効果文のため、自身の復活キーワードとしては扱わない
    // （レイス等：これを除外しないと、死亡時に自分自身が誤って復活してしまう）
    if (ownPassiveText.includes(k)) kws.push(k);
  });
  const shieldText = ownPassiveText.match(/(?:^|\n)\s*結界\s*(\d*)/);
  if (shieldText) kws.push('結界' + (shieldText[1] || '1'));
  if (/(?:^|\n|\s)生贄(?:\s|。|\n|$)/.test(ownPassiveText)) kws.push('生贄');
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
function coreAttackDamage(unit) { return Math.max(0, unit && unit.atk || 0); }

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
  if (has('三方向攻撃')) return 'tri';
  return '';
}

// ══════════════════════════════════════════
// 受けるダメージの確定（結界・弱体・強靭）
// 「いくつ受けるか」「無効化されるか」の判定はここだけ。
// 実際の減算・結界の消費・ログ・演出は呼び出し側が行う。
// ══════════════════════════════════════════

// 強靭X：このキャラクターが受けるダメージはX減少する（複数所持時は合算）。
function coreToughValue(unit) {
  // 強靭は「キーワード列に書かれた値」だけを見る（既存の挙動を維持）。
  return coreKeywordSum(unit, '強靭', true);
}

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

function coreUnitHasSacrifice(unit) { return coreUnitHasKeyword(unit, '生贄'); }

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

// いま盤面にいる生贄持ち（封印されていないもの）。
function coreSacrificeUnits(units) {
  return (units || []).filter(u => u && u.hp > 0 && !u._isObject && !u._isSoul
    && !coreIsSealed(u) && coreUnitHasSacrifice(u));
}
function coreSacrificeCount(units) { return coreSacrificeUnits(units).length; }

// 封印Xの解放に必要な生贄が揃っているか。
// 揃っている場合、捧げられるのは「盤面上の生贄持ち全員」（必要数ちょうどではない）。
function coreSealRelease(unit, allUnits) {
  const required = Math.max(1, Number(coreSealValue(unit) || unit._sealValue) || 1);
  if (!Number.isFinite(required)) return { ready: false, required, sacrificed: [] };
  const available = coreSacrificeUnits(allUnits);
  if (available.length < required) return { ready: false, required, sacrificed: [] };
  return { ready: true, required, sacrificed: available };
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
  const isStealth = u => !!u.stealth;
  const laneLocked = live.some(isFront) ? live.filter(isFront) : live;
  const visibleLane = laneLocked.filter(u => !isStealth(u));
  const guardLine = visibleLane.filter(isGuard);
  if (guardLine.length) return r.pick(guardLine);
  // 狩人：前衛か後衛かを問わず、生存する全キャラクターの中から最もライフの低い相手を狙う
  if (coreUnitHasKeyword(attacker, '狩人')) {
    const visibleAll = live.filter(u => !isStealth(u));
    const hunterPool = visibleAll.length ? visibleAll : live;
    return hunterPool.reduce((a, b) => a.hp < b.hp ? a : b);
  }
  // 1. 前衛が存在する場合は前衛のみを対象にする
  const pool = visibleLane.length > 0 ? visibleLane : laneLocked;
  const finalPool = pool.length > 0 ? pool : live;
  // 2. ランダム
  return r.pick(finalPool);
}

// 貫通：前衛キャラクターへの攻撃時、その後ろに位置する後衛キャラクター（最大3人）にも同じダメージを与える。
// 前衛F人・後衛R人の場合、後衛R人をF分割し、front側の位置indexに対応する区画を「真後ろ」とみなす。
function corePierceRearTargets(target, list) {
  if (!target || (target.lane || 'front') === 'rear') return [];
  const live = (list || []).filter(u => u && u.hp > 0 && !u._isObject && !coreIsSealed(u));
  const front = live.filter(u => (u.lane || 'front') !== 'rear');
  const rear = live.filter(u => (u.lane || 'front') === 'rear');
  const idx = front.indexOf(target);
  if (idx < 0 || !rear.length) return [];
  const F = front.length, R = rear.length;
  const start = Math.round(idx * R / F);
  const end = Math.round((idx + 1) * R / F) - 1;
  if (end < start) return [];
  return rear.slice(start, end + 1);
}

// 決着がつかない場合の打ち切り。到達したら引き分け扱い。
const BATTLE_CORE_TURN_LIMIT = 200;

const BATTLE_CORE_SIDES = ['p1', 'p2'];

// 呼び出し側のオブジェクトを一切書き換えないよう、コア内部用に写した可変ユニットを作る。
function createCoreUnit(raw, side, index) {
  const atk = Math.max(0, Math.round(Number(raw && raw.atk) || 0));
  const hp = Math.max(1, Math.round(Number(raw && raw.hp) || 1));
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
    keywords: Array.isArray(raw && raw.keywords) ? raw.keywords.map(String) : [],
    // 効果文もキーワード判定の入力になる（coreUnitKeywords が本文からも拾う）。
    desc: String((raw && raw.desc) || ''),
    // 盤面上の性質。攻撃対象の決定に使う。
    guardian: !!(raw && raw.guardian),
    hate: !!(raw && raw.hate),
    hateTurns: Number(raw && raw.hateTurns) || 0,
    stealth: !!(raw && raw.stealth),
    shield: Math.max(0, Number(raw && raw.shield) || 0) || coreUnitShieldValue(raw),
    weaken: Math.max(0, Number(raw && raw.weaken) || 0),
    _sealed: !!(raw && raw._sealed),
    _panelSummoned: raw && raw._panelSummoned !== undefined ? !!raw._panelSummoned : true,
    slot: index,
  };
}

function coreIsAlive(u) { return !!u && u.hp > 0; }
// 行動できるユニット（封印中は行動しない）。判定は coreCanAct が唯一の実装。
function coreLivingUnits(units) { return (units || []).filter(coreCanAct); }

// 外へ出すユニット情報。演出側・保存側はこの形だけを見る。
function coreUnitSnapshot(u) {
  return {
    id: u.id, name: u.name, side: u.side, lane: u.lane,
    atk: u.atk, hp: Math.max(0, u.hp), maxHp: u.maxHp,
    color: u.color, race: u.race, keywords: u.keywords.slice(),
    desc: u.desc, guardian: u.guardian, hate: u.hate, hateTurns: u.hateTurns,
    stealth: u.stealth, _sealed: u._sealed, _panelSummoned: u._panelSummoned,
    shield: u.shield, weaken: u.weaken,
  };
}

// 初期状態を作る。PvEもPvPもこの形に揃えてからコアへ渡す。
function createBattleState(setup) {
  const src = (setup && setup.sides) || {};
  const units = {};
  BATTLE_CORE_SIDES.forEach(side => {
    const list = Array.isArray(src[side] && src[side].units) ? src[side].units : [];
    units[side] = list.map((u, i) => createCoreUnit(u, side, i));
  });
  return {
    units,
    turn: 0,
    lane: { p1: { lane: 'front', attacked: new Set() }, p2: { lane: 'front', attacked: new Set() } },
  };
}

// そのレーンでまだ攻撃していないユニットを左から1体。両レーン一巡したら前衛から再開。
function corePickAttacker(units, laneState) {
  const tryLane = lane => coreLivingUnits(units)
    .filter(u => u.lane === lane && !laneState.attacked.has(u.id))
    .sort((a, b) => a.slot - b.slot)[0] || null;
  let pick = tryLane(laneState.lane);
  if (pick) return pick;
  const other = laneState.lane === 'front' ? 'rear' : 'front';
  pick = tryLane(other);
  if (pick) { laneState.lane = other; return pick; }
  laneState.attacked.clear();
  laneState.lane = 'front';
  return tryLane('front') || tryLane('rear');
}

// ダメージ適用。死亡したら true。イベントは emit で外へ流す。
// 受ける量と無効化の判定は coreResolveIncomingDamage が唯一の実装。
function coreApplyDamage(target, amount, emit, opts) {
  const raw = Math.max(0, Math.round(Number(amount) || 0));
  const res = coreResolveIncomingDamage(target, raw, opts);
  if (res.blocked) {
    if (res.consumesShield) target.shield = Math.max(0, (target.shield || 0) - 1);
    emit({ type: 'damage', side: target.side, unitId: target.id, amount: 0, hpAfter: target.hp, blockedBy: res.reason });
    return false;
  }
  const dmg = res.amount;
  if (!coreIsAlive(target) || !dmg) return false;
  target.hp = Math.max(0, target.hp - dmg);
  emit({ type: 'damage', side: target.side, unitId: target.id, amount: dmg, hpAfter: target.hp });
  if (target.hp <= 0) {
    emit({ type: 'death', side: target.side, unitId: target.id });
    return true;
  }
  return false;
}

/**
 * 戦闘を最後まで進める。勝敗は戻り値で明示的に返す（イベント列から推測させない）。
 * @param {object} state createBattleState() が返した状態
 * @param {{next:Function,int:Function,pick:Function}} rng 決定論的な乱数（必須）
 * @param {{onEvent?:Function, turnLimit?:number}} [opts]
 * @returns {{outcome:'p1'|'p2'|'draw', endReason:string, turns:number}}
 */
function runBattleCore(state, rng, opts) {
  const emit = (opts && typeof opts.onEvent === 'function') ? opts.onEvent : () => {};
  const turnLimit = Math.max(1, Number(opts && opts.turnLimit) || BATTLE_CORE_TURN_LIMIT);
  const units = state.units;

  // 盤面上の全キャラクターと、その並び順（味方→敵）。封印の解放順に使う。
  const allUnits = () => [...units.p1, ...units.p2];
  const fieldOrder = u => (u.side === 'p1' ? 0 : 100) + u.slot;

  // 封印X：戦闘開始時は場に出ていない。判定・順序はコアの共通ルール。
  coreInitSealStates(allUnits(), fieldOrder);

  // 生贄が揃っている封印を、盤面順に1体ずつ解放する。
  // 解放のたびに生贄が減るため、後続はその時点の残数で再判定する（PvEと同じ）。
  const resolveSeals = () => {
    const sealed = allUnits().filter(u => u.hp > 0 && coreIsSealed(u))
      .sort((a, b) => (Number(a._sealOrder) || 0) - (Number(b._sealOrder) || 0));
    for (const unit of sealed) {
      if (!coreIsSealed(unit) || unit.hp <= 0) continue;
      const rel = coreSealRelease(unit, allUnits());
      if (!rel.ready) continue;
      rel.sacrificed.forEach(sac => {
        sac.hp = 0;
        emit({ type: 'sacrifice', side: sac.side, unitId: sac.id });
      });
      unit._sealed = false;
      delete unit._sealValue;
      emit({ type: 'seal_release', side: unit.side, unitId: unit.id, required: rel.required });
    }
  };
  // 開始時の盤面（封印されたまま）を先に見せてから、解放を演出として流す。
  emit({ type: 'battle_start', sides: { p1: units.p1.map(coreUnitSnapshot), p2: units.p2.map(coreUnitSnapshot) } });
  resolveSeals();

  // 先攻：生存数が多い側。同数なら rng で決める（呼び出し側では決めない）。
  const n1 = coreLivingUnits(units.p1).length, n2 = coreLivingUnits(units.p2).length;
  let side = n1 === n2 ? (rng.next() < 0.5 ? 'p1' : 'p2') : (n1 > n2 ? 'p1' : 'p2');

  const decided = () => {
    const a1 = coreLivingUnits(units.p1).length, a2 = coreLivingUnits(units.p2).length;
    if (a1 > 0 && a2 > 0) return null;
    if (a1 === 0 && a2 === 0) return { outcome: 'draw', reason: 'both_wiped' };
    return { outcome: a1 > 0 ? 'p1' : 'p2', reason: 'wiped' };
  };

  let result = decided();
  while (!result && state.turn < turnLimit) {
    state.turn++;
    emit({ type: 'turn_begin', turn: state.turn });

    const foeSide = side === 'p1' ? 'p2' : 'p1';
    const attacker = corePickAttacker(units[side], state.lane[side]);
    if (!attacker) { side = foeSide; result = decided(); continue; }
    state.lane[side].attacked.add(attacker.id);

    // 対象の決め方はPvEと同じ（守護・隠密・狩人・前衛優先）。
    const target = coreSelectAttackTarget(attacker, units[foeSide], rng, { defendersAreEnemies: foeSide === 'p2' });
    if (!target) { result = decided(); break; }

    // 接触＝相互ダメージ。先制は、相手を倒しきった場合だけ反撃を受けない。
    const attackerFirst = coreUnitHasKeyword(attacker, '先制') && !coreUnitHasKeyword(target, '先制');
    const counter = coreAttackDamage(target);
    const damage = coreAttackDamage(attacker);
    emit({
      type: 'attack', side, attackerId: attacker.id, targetId: target.id,
      damage, counterDamage: counter,
    });
    const targetDied = coreApplyDamage(target, damage, emit);
    if (!(attackerFirst && targetDied)) coreApplyDamage(attacker, counter, emit);
    // 死亡で生贄が減る／増えることがあるので、毎接触の後に封印を再判定する（PvEと同じ）。
    resolveSeals();

    side = foeSide;
    result = decided();
  }

  if (!result) result = { outcome: 'draw', reason: 'turn_limit' };
  emit({ type: 'battle_end', outcome: result.outcome, reason: result.reason });
  return { outcome: result.outcome, endReason: result.reason, turns: state.turn };
}

// 最終状態の書き出し（保存・照合用）
function battleCoreFinalState(state) {
  return {
    p1: { units: state.units.p1.map(coreUnitSnapshot) },
    p2: { units: state.units.p2.map(coreUnitSnapshot) },
  };
}

if (typeof window !== 'undefined') {
  window.BATTLE_CORE_TURN_LIMIT = BATTLE_CORE_TURN_LIMIT;
  window.createBattleState = createBattleState;
  window.runBattleCore = runBattleCore;
  window.battleCoreFinalState = battleCoreFinalState;
  window.coreUnitSnapshot = coreUnitSnapshot;
  window.coreMathRng = coreMathRng;
  window.CORE_KEYWORD_CARD_NAMES = CORE_KEYWORD_CARD_NAMES;
  window.coreUnitKeywords = coreUnitKeywords;
  window.coreShieldValueFromKeyword = coreShieldValueFromKeyword;
  window.coreUnitShieldValue = coreUnitShieldValue;
  window.coreUnitHasKeyword = coreUnitHasKeyword;
  window.coreUnitKeywordCount = coreUnitKeywordCount;
  window.coreIsSealed = coreIsSealed;
  window.coreCanAct = coreCanAct;
  window.coreAttackDamage = coreAttackDamage;
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
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BATTLE_CORE_TURN_LIMIT, createBattleState, runBattleCore,
    battleCoreFinalState, coreUnitSnapshot, createCoreUnit,
    coreMathRng, CORE_KEYWORD_CARD_NAMES, coreUnitKeywords,
    coreShieldValueFromKeyword, coreUnitShieldValue, coreUnitHasKeyword,
    coreUnitKeywordCount, coreIsSealed, coreCanAct, coreAttackDamage,
    coreSelectAttackTarget, corePierceRearTargets,
    coreToughValue, coreResolveIncomingDamage, coreConsumeWardCharge,
    coreUnitHasSacrifice, coreSealValue, coreInitSealStates,
    coreSacrificeUnits, coreSacrificeCount, coreSealRelease,
    coreKeywordSum, coreExtraAttackCount, coreAttackSpread,
  };
}
