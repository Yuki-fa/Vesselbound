// ═══════════════════════════════════════
// online/playback.js — イベント列の再生（層3）
//
// サーバーが確定させたイベント列を、順番どおりに演出へ流すだけの層。
// ここで決めてよいものは何もない。特に以下は絶対に計算しないこと。
//   - ダメージ値 / 死亡の有無 / 勝敗
// すべてイベントに書かれた値をそのまま使う。勝敗は result.outcome を見る。
//
// 同期ズレを起こさないため、演出の待ち時間はイベント種別ごとに固定にする。
// （盤面の状態から待ち時間を決めると、環境差で再生時間が変わる）
// ═══════════════════════════════════════

// イベント種別ごとの再生ウェイト（ms）。演出調整はここだけを触ること。
// 攻撃モーション・カットインの尺は board.js 側（演出）が待つ。ここはイベント間の間合い。
const ONLINE_PLAYBACK_WAIT_MS = {
  battle_start: 200,
  turn_begin: 0,
  attack: 0,
  // 命中から結果（負傷効果など）を見せ始めるまでの間。PvEの負傷効果発火前の間と同じ値にする。
  // 値は battle/present.js の PRESENT_HIT_BEAT_MS が唯一の定義。
  // **固定待ちは「その演出を待っていない場合」だけに置くこと。**
  // 再生側（board.js）が既に await している種別へ足すと、PvEには無い分だけ
  // 一手ごとに間延びし、オンラインだけ動きがもっさりする。
  //   damage        … _damageGate.reserve() で対象ごとに待つ（PvEと同じ規則）
  //   death         … _awaitMotion() で演出の完了を待つ
  //   sacrifice     … 特殊演出を await 済み
  //   seal_release  … 特殊演出を await 済み
  // 上記はいずれも待ち済みなので0にする。await していない種別だけ値を持つ。
  damage: 0,
  death: 0,
  sacrifice: 0,
  seal_release: 0,
  stat_change: 0,
  keyword_effect: 0,
  life_drain: 0,
  mana_threshold: 180,
  // 召喚はイベントを受けた瞬間に盤面へ追加する。待機を置くと、
  // リッチの連鎖召喚が次の攻撃後に見えるため、演出待ちは召喚VFX側へ委ねる。
  summon: 0,
  transform: 420,
  mana_set: 0,
  gold_gain: 0,
  gold_spend: 0,
  seal_apply: 260,
  shield_lost: 0,
  revive: 520,
  shield_set: 0,
  ring_effect: 0,
  life_set: 0,
  battle_end: 0,
};

function _onlineSleep(ms) {
  const wait = Math.max(0, Number(ms) || 0);
  return wait ? new Promise(r => setTimeout(r, wait)) : Promise.resolve();
}

// ダメージ／死亡の直後にコアが確定した召喚が続く場合、固定待機を挟むと
// リッチ等の召喚が「次の攻撃後」に見えてしまう。召喚イベントまでの待機
// だけを省略し、通常のダメージ・死亡演出の待機は変更しない。
function _hasImmediateSummon(events, index) {
  for (let i = index + 1; i < events.length; i++) {
    const next = events[i];
    if (!next) continue;
    if (next.type === 'summon') return true;
    if (next.type === ONLINE_EVENT.ATTACK || next.type === ONLINE_EVENT.TURN_BEGIN
      || next.type === ONLINE_EVENT.BATTLE_END) return false;
    if (next.type === ONLINE_EVENT.DAMAGE || next.type === ONLINE_EVENT.DEATH
      || next.type === 'instant_death' || next.type === 'curse_death') continue;
    if (next.type === 'stat_change' || next.type === 'keyword_effect') continue;
    return false;
  }
  return false;
}

function _hasImmediateDamageFollowup(events, index) {
  for (let i = index + 1; i < events.length; i++) {
    const type = events[i] && events[i].type;
    if (type === ONLINE_EVENT.ATTACK || type === ONLINE_EVENT.TURN_BEGIN
      || type === ONLINE_EVENT.BATTLE_END || type === ONLINE_EVENT.DEATH) return false;
    if (type === 'stat_change' || type === 'keyword_effect' || type === 'mana_gain'
      || type === 'life_gain' || type === 'summon' || type === 'transform') return true;
  }
  return false;
}

/**
 * サーバーの戦闘結果を再生する。
 * @param {object} result server_local.js / OnlineMatch.resolveVersus() の戻り値
 * @param {{
 *   onEvent?:(ev:object, ctx:object)=>void|Promise<void>,
 *   speed?:number,          // 1=等倍。演出を速くしたい時だけ変える
 *   shouldAbort?:()=>boolean
 * }} [handlers]
 * @returns {Promise<{outcome:string, endReason:string, aborted:boolean}>}
 *          ※ outcome は result のものをそのまま返す。再生結果から判定はしない。
 */
async function playOnlineBattleEvents(result, handlers) {
  const opts = handlers || {};
  const speed = Math.max(0.1, Number(opts.speed) || 1);
  const events = Array.isArray(result && result.events) ? result.events : [];

  // プロトコル版が食い違う場合は、勝手に再生して結果の食い違いを隠さない。
  if (result && result.protocolVersion != null && result.protocolVersion !== ONLINE_PROTOCOL_VERSION) {
    console.error('[online:playback] protocol version mismatch',
      result.protocolVersion, '!=', ONLINE_PROTOCOL_VERSION);
    return { outcome: result.outcome, endReason: result.endReason, aborted: true };
  }

  // 再生中だけ使う表示用の盤面。battle_start のスナップショットから作り、
  // 以後はイベントに書かれた hpAfter をそのまま反映する（自前で引き算しない）。
  const board = { p1: [], p2: [] };
  const ctx = {
    board,
    events,
    eventIndex: -1,
    attackDamageEvents: [],
    visualizedDamageEvents: new Set(),
    itemRewards: [],
    bonusRewards: [],
    unitById(id) {
      return board.p1.find(u => u.id === id) || board.p2.find(u => u.id === id) || null;
    },
  };

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    ctx.eventIndex = i;
    if (typeof opts.shouldAbort === 'function' && opts.shouldAbort()) {
      return { outcome: result.outcome, endReason: result.endReason, aborted: true };
    }

    // 表示用盤面の更新。判定は一切しない。
    if (ev.type === ONLINE_EVENT.ATTACK) {
      // 反撃のDAMAGEはATTACKの直後に続く。演出側が攻撃対象と反撃対象を同じ接触時刻に
      // 開始できるよう、次の攻撃／ターンまでの確定ダメージ列を先に参照可能にする。
      ctx.attackDamageEvents = [];
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j];
        if (next.type === ONLINE_EVENT.ATTACK || next.type === ONLINE_EVENT.TURN_BEGIN
          || next.type === ONLINE_EVENT.BATTLE_END) break;
        if (next.type === ONLINE_EVENT.DAMAGE) ctx.attackDamageEvents.push(next);
      }
    } else if (ev.type === ONLINE_EVENT.BATTLE_START) {
      board.p1 = (ev.sides && ev.sides.p1 ? ev.sides.p1 : []).map(u => ({ ...u }));
      board.p2 = (ev.sides && ev.sides.p2 ? ev.sides.p2 : []).map(u => ({ ...u }));
    } else if (ev.type === 'mana_gain' || ev.type === 'mana_set') {
      ctx.mana = ctx.mana || { p1: 0, p2: 0 };
      ctx.mana[ev.side] = ev.type === 'mana_set'
        ? Math.max(0, Number(ev.amount) || 0)
        : Math.max(0, Number(ctx.mana[ev.side]) || 0) + Math.max(0, Number(ev.amount) || 0);
    } else if (ev.type === 'gold_gain' || ev.type === 'gold_spend') {
      ctx.gold = ctx.gold || { p1: 0, p2: 0 };
      const amount = Math.max(0, Number(ev.amount) || 0);
      ctx.gold[ev.side] = Math.max(0, Number(ctx.gold[ev.side]) || 0)
        + (ev.type === 'gold_gain' ? amount : -amount);
    } else if (ev.type === ONLINE_EVENT.DAMAGE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = ev.hpAfter;              // ← イベントの値をそのまま使う
    } else if (ev.type === ONLINE_EVENT.DEATH) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = 0;
    } else if (ev.type === 'instant_death' || ev.type === 'curse_death') {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = 0;
    } else if (ev.type === ONLINE_EVENT.SACRIFICE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = 0;                       // 生贄は破棄される
    } else if (ev.type === ONLINE_EVENT.SEAL_RELEASE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u._sealed = false;              // 封印が解けて場に出る
    } else if (ev.type === 'stat_change') {
      const u = ctx.unitById(ev.unitId);
      if (u) {
        u.atk = Math.max(0, (Number(u.atk) || 0) + (Number(ev.atk) || 0));
        u.maxHp = Math.max(1, (Number(u.maxHp || u.hp) || 1) + (Number(ev.hp) || 0));
        u.hp = Math.max(0, (Number(u.hp) || 0) + (Number(ev.hp) || 0));
      }
    } else if (ev.type === 'keyword_effect') {
      const u = ctx.unitById(ev.unitId);
      if (u) {
        if (ev.effect === 'poison') u.poison = (Number(u.poison) || 0) + (Number(ev.amount) || 0);
        if (ev.effect === 'shield') u.shield = (Number(u.shield) || 0) + (Number(ev.amount) || 0);
        if (ev.effect === 'weaken') {
          u.weaken = (Number(u.weaken) || 0) + (Number(ev.amount) || 0);
        } else if (ev.effect === 'evil_eye') {
          u.atk = Math.max(0, (Number(u.atk) || 0) - (Number(ev.amount) || 0));
        }
        if (ev.effect === 'keyword_gain' && ev.keyword && !(u.keywords || []).includes(ev.keyword)) {
          u.keywords = [...(u.keywords || []), ev.keyword];
        }
      }
    } else if (ev.type === 'life_drain') {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = Math.min(Number(u.maxHp) || u.hp, (Number(u.hp) || 0) + (Number(ev.amount) || 0));
    } else if (ev.type === 'seal_apply') {
      const u = ctx.unitById(ev.unitId);
      if (u) u._sealed = true;
    } else if (ev.type === 'blood_set') {
      ctx.blood = ctx.blood || {};
      ctx.blood[ev.side] = Math.max(0, Number(ev.amount) || 0);
    } else if (ev.type === 'revive') {
      const u = ctx.unitById(ev.unitId);
      if (u) { u.atk = ev.atk; u.maxHp = ev.maxHp; u.hp = ev.hp; u._sealed = false; }
    } else if (ev.type === 'shield_set') {
      const u = ctx.unitById(ev.unitId);
      if (u) u.shield = Number(ev.amount) || 0;
    } else if (ev.type === 'death_summon_grant') {
      const u = ctx.unitById(ev.unitId);
      if (u) u.effectData = { ...(u.effectData || {}), grantedDeathSummon: ev.summon || null };
    } else if (ev.type === 'life_set') {
      ctx.life = ctx.life || {};
      ctx.life[ev.side] = Number(ev.amount) || 0;
    } else if (ev.type === 'item_reward') {
      if (ev.side === 'p1' && ev.item) ctx.itemRewards.push({ ...ev.item });
    } else if (ev.type === 'bonus_reward') {
      if (ev.side === 'p1' && ev.unit) ctx.bonusRewards.push({ ...ev.unit });
    } else if (ev.type === 'summon' && ev.unit) {
      const list = ev.side === 'p1' ? board.p1 : board.p2;
      list.push({ ...ev.unit });
    } else if (ev.type === 'transform') {
      const u = ctx.unitById(ev.unitId);
      if (u) {
        if (ev.unit) Object.assign(u, ev.unit);
        else {
          u.name = ev.name || u.name; u.atk = Number(ev.atk) || u.atk;
          u.maxHp = Number(ev.maxHp) || u.maxHp; u.hp = Number(ev.hp) || u.hp;
        }
      }
    }

    if (typeof opts.onEvent === 'function') await opts.onEvent(ev, ctx);
    const waitMs = (ev.type === ONLINE_EVENT.DAMAGE && _hasImmediateDamageFollowup(events, i))
      || ((ev.type === ONLINE_EVENT.DAMAGE || ev.type === ONLINE_EVENT.DEATH
      || ev.type === 'instant_death' || ev.type === 'curse_death')
      && _hasImmediateSummon(events, i))
      ? 0 : (ONLINE_PLAYBACK_WAIT_MS[ev.type] || 0);
    await _onlineSleep(waitMs / speed);
  }

  // 勝敗はサーバーの値をそのまま返す。
  return { outcome: result.outcome, endReason: result.endReason, aborted: false };
}

if (typeof window !== 'undefined') {
  window.playOnlineBattleEvents = playOnlineBattleEvents;
  window.ONLINE_PLAYBACK_WAIT_MS = ONLINE_PLAYBACK_WAIT_MS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { playOnlineBattleEvents, ONLINE_PLAYBACK_WAIT_MS };
}
