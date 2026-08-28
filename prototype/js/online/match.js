// ═══════════════════════════════════════
// online/match.js — 対戦セッション（層2）
//
// 役割は「サーバーが返した権威状態を保持して中継する」ことだけ。
// ここで決めてよいものは何もない。特に以下は絶対に計算しないこと。
//   - ライフの増減 / ステージ進行 / 制限時間の締め切り / 勝敗
// これらは全て server_local.js（将来は本番サーバー）が持つ。
// このファイルは state をそのまま抱え、UIへ配るだけ。
//
// 制限時間は「サーバーが渡した deadlineAt を表示用に引き算する」だけで、
// 締め切り超過の判定・進行はサーバー側（getState）が行う。
// ═══════════════════════════════════════

(function () {
  const POLL_INTERVAL_MS = 500;

  let _state = null;          // サーバーが返した権威状態（読み取り専用として扱う）
  let _matchId = null;
  let _opponentName = '';
  let _pollTimer = null;
  const _listeners = new Set();

  function _notify() {
    _listeners.forEach(fn => { try { fn(_state); } catch (e) { console.error('[online:match]', e); } });
  }

  // サーバー応答を受け取る唯一の入口。ここ以外で _state を書き換えないこと。
  function _accept(state) {
    if (!state) return _state;
    _state = state;
    _matchId = state.matchId || _matchId;
    _notify();
    return _state;
  }

  function _stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  function _startPolling() {
    _stopPolling();
    // 締め切り超過の進行判定はサーバー側にあるため、定期的に取りに行くだけ。
    _pollTimer = setInterval(() => {
      if (!_matchId || (_state && _state.finished)) { _stopPolling(); return; }
      OnlineServer.getState(_matchId).then(_accept).catch(e => console.error('[online:match]', e));
    }, POLL_INTERVAL_MS);
  }

  const OnlineMatch = {
    // 現在の権威状態（コピーを返す。呼び出し側が書き換えても本体に影響しない）
    getState() { return _state ? JSON.parse(JSON.stringify(_state)) : null; },
    isActive() { return !!_matchId && !!_state && !_state.finished; },
    opponentName() { return _opponentName; },

    // 状態変化の購読（UI用）
    subscribe(fn) { if (typeof fn === 'function') _listeners.add(fn); return () => _listeners.delete(fn); },

    // マッチングを要求する。リーゼで「出発する」を押した時点で呼ぶ。
    async start(opts) {
      const res = await OnlineServer.requestMatch(opts || {});
      _opponentName = res && res.opponentName ? String(res.opponentName) : '';
      _accept(res);
      _startPolling();
      return this.getState();
    },

    // 自分の準備完了（戦闘開始／出発する）をサーバーへ伝える。
    // 進むかどうかを決めるのはサーバー。ここでは結果を受け取るだけ。
    async setReady(formation) {
      if (!_matchId) return null;
      const res = await OnlineServer.setReady(_matchId, formation || null);
      return _accept(res) && this.getState();
    },

    // オンライン対戦マスの戦闘結果を取得する。
    // 戻り値の outcome / state をそのまま使うこと（イベント列から勝敗を推測しない）。
    async resolveVersus(formation) {
      if (!_matchId) return null;
      const res = await OnlineServer.resolveVersusBattle(_matchId, formation || { units: [] });
      if (res && res.state) _accept(res.state);
      return res;
    },

    // 対戦の再生が終わったことを伝える。次のマスへ進めるかどうかはサーバーが決める。
    async reportVersusDone() {
      if (!_matchId) return null;
      const res = await OnlineServer.reportVersusPlaybackDone(_matchId);
      return _accept(res) && this.getState();
    },

    // 通常戦闘（CPU）で自分がゲームオーバーになったことを伝える。
    async reportGameOver() {
      if (!_matchId) return null;
      const res = await OnlineServer.reportSelfGameOver(_matchId);
      return _accept(res) && this.getState();
    },

    // 制限時間の残り（ミリ秒）。表示専用。ここで超過処理をしてはいけない。
    remainingMs() {
      const at = _state && _state.deadlineAt;
      if (!at) return null;
      return Math.max(0, at - Date.now());
    },
    // 「1:23」形式。残り時間が無い画面では null。
    remainingLabel() {
      const ms = this.remainingMs();
      if (ms == null) return null;
      const sec = Math.ceil(ms / 1000);
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    },

    // セッションを終了して後片付けする（タイトルへ戻る時など）。
    reset() {
      _stopPolling();
      _state = null; _matchId = null; _opponentName = '';
      _notify();
    },
  };

  if (typeof window !== 'undefined') window.OnlineMatch = OnlineMatch;
  if (typeof module !== 'undefined' && module.exports) module.exports = { OnlineMatch };
})();
