// ═══════════════════════════════════════
// online/protocol.js — オンライン対戦の共通契約（層をまたぐ唯一の取り決め）
//
// 将来この一式をそのままサーバーへ移設できるよう、ここには
// 「型・定数・決定論的な乱数」しか置かない。DOM・G・Math.random には触れない。
//
// 層の責務（AGENTS.md「影響範囲の把握と回帰確認」に従い、境界を跨がないこと）
//   sim.js       … seedと初期状態だけを見て戦闘を最後まで計算する純関数
//   match.js     … サーバーが返した権威状態を保持・中継するだけ（自分では決めない）
//   playback.js  … イベント列を既存の演出関数で再生するだけ（勝敗も数値も決めない）
// ═══════════════════════════════════════

// プロトコル版。sim.jsの計算結果の互換性が壊れる変更をしたら上げる。
// サーバーとクライアントで一致しない場合は再生を拒否する（結果の食い違いを隠さないため）。
const ONLINE_PROTOCOL_VERSION = 1;

// 対戦の陣営ID。UI上の「自分／相手」とは切り離し、常にこの2値で扱う。
const ONLINE_SIDE_P1 = 'p1';
const ONLINE_SIDE_P2 = 'p2';

// 勝敗。sim.jsが明示的に返す唯一の正。イベント列から推測してはいけない。
const ONLINE_OUTCOME_P1 = 'p1';     // p1の勝ち
const ONLINE_OUTCOME_P2 = 'p2';     // p2の勝ち
const ONLINE_OUTCOME_DRAW = 'draw'; // 引き分け（ライフを失わない）

// イベント種別。playback.jsはこの列をそのまま順に再生する。
const ONLINE_EVENT = {
  BATTLE_START: 'battle_start', // {sides:{p1:[unitSnapshot],p2:[...]}}
  TURN_BEGIN:   'turn_begin',   // {turn}
  ATTACK:       'attack',       // {side,attackerId,targetId,damage,counterDamage}
  DAMAGE:       'damage',       // {side,unitId,amount,hpAfter}
  FLED: 'fled',
  DEATH:        'death',        // {side,unitId}
  SACRIFICE:    'sacrifice',    // {side,unitId} 封印の解放で捧げられて破棄された
  SEAL_RELEASE: 'seal_release', // {side,unitId,required} 封印が解放されて場に出た
  BATTLE_END:   'battle_end',   // {outcome,reason}
};

// 戦闘が終わった理由。UIの文言分岐用で、勝敗そのものはoutcomeを見ること。
const ONLINE_END_REASON = {
  WIPED: 'wiped',           // 片側が全滅した
  BOTH_WIPED: 'both_wiped', // 相打ちで両方全滅
  TURN_LIMIT: 'turn_limit', // ターン上限に達した
};

// 決定論的な擬似乱数（mulberry32）。
// sim.jsはこれ以外の乱数源を使わない。同じseedなら必ず同じ戦闘になる。
function createSeededRng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    // [0,1) の乱数
    next,
    // [min,max] の整数
    int(min, max) {
      const lo = Math.ceil(min), hi = Math.floor(max);
      if (!(hi > lo)) return lo;
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    // 配列から1つ選ぶ（空配列はnull）
    pick(arr) {
      const list = Array.isArray(arr) ? arr : [];
      return list.length ? list[Math.floor(next() * list.length)] : null;
    },
  };
}

// 文字列からseedを作る（マッチIDなどからの再現用）。サーバー移行後も同じ値になるよう固定実装。
function onlineSeedFromString(str) {
  const s = String(str == null ? '' : str);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

if (typeof window !== 'undefined') {
  window.ONLINE_PROTOCOL_VERSION = ONLINE_PROTOCOL_VERSION;
  window.ONLINE_EVENT = ONLINE_EVENT;
  window.ONLINE_END_REASON = ONLINE_END_REASON;
  window.createSeededRng = createSeededRng;
  window.onlineSeedFromString = onlineSeedFromString;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ONLINE_PROTOCOL_VERSION, ONLINE_SIDE_P1, ONLINE_SIDE_P2,
    ONLINE_OUTCOME_P1, ONLINE_OUTCOME_P2, ONLINE_OUTCOME_DRAW,
    ONLINE_EVENT, ONLINE_END_REASON, createSeededRng, onlineSeedFromString,
  };
}
