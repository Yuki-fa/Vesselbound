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
  damage: 260,
  death: 220,
  sacrifice: 320,
  seal_release: 520,
  battle_end: 0,
};

function _onlineSleep(ms) {
  const wait = Math.max(0, Number(ms) || 0);
  return wait ? new Promise(r => setTimeout(r, wait)) : Promise.resolve();
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
    unitById(id) {
      return board.p1.find(u => u.id === id) || board.p2.find(u => u.id === id) || null;
    },
  };

  for (const ev of events) {
    if (typeof opts.shouldAbort === 'function' && opts.shouldAbort()) {
      return { outcome: result.outcome, endReason: result.endReason, aborted: true };
    }

    // 表示用盤面の更新。判定は一切しない。
    if (ev.type === ONLINE_EVENT.BATTLE_START) {
      board.p1 = (ev.sides && ev.sides.p1 ? ev.sides.p1 : []).map(u => ({ ...u }));
      board.p2 = (ev.sides && ev.sides.p2 ? ev.sides.p2 : []).map(u => ({ ...u }));
    } else if (ev.type === ONLINE_EVENT.DAMAGE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = ev.hpAfter;              // ← イベントの値をそのまま使う
    } else if (ev.type === ONLINE_EVENT.DEATH) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = 0;
    } else if (ev.type === ONLINE_EVENT.SACRIFICE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u.hp = 0;                       // 生贄は破棄される
    } else if (ev.type === ONLINE_EVENT.SEAL_RELEASE) {
      const u = ctx.unitById(ev.unitId);
      if (u) u._sealed = false;              // 封印が解けて場に出る
    }

    if (typeof opts.onEvent === 'function') await opts.onEvent(ev, ctx);
    await _onlineSleep((ONLINE_PLAYBACK_WAIT_MS[ev.type] || 0) / speed);
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
