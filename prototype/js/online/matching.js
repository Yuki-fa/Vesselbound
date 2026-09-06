// ═══════════════════════════════════════
// online/matching.js — マッチング待機オーバーレイ（UI）
//
// 表示するのはサーバーが返した参加者リストだけ。
// 誰が何番目かも、何人揃ったかも、成立したかもサーバーが決める。
// ここでは「点の数を1秒ごとに増やす」表示アニメーションだけを持つ。
// ═══════════════════════════════════════

(function () {
  const OVERLAY_ID = 'online-matching-overlay';
  const DOT_MAX = 6;              // 点は6個になったら消えて1個から
  const DOT_INTERVAL_MS = 1000;

  let _dots = 1;
  let _dotTimer = null;
  let _pollTimer = null;
  let _matched = false;

  function _el() {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      el.innerHTML =
        '<div class="omo-inner">' +
        '<div class="omo-title" data-role="title">マッチング待機中です</div>' +
        '<div class="omo-players" data-role="players"></div>' +
        '<button type="button" class="omo-back" data-role="back">キャンセル</button>' +
        '</div>';
      // .screen と同じスケール枠（CSS側で --game-scale を適用）にして body 直下へ置く。
      // 特定の画面の中に入れると、その画面が隠れた時に一緒に消えてしまう。
      document.body.appendChild(el);
      const back = el.querySelector('[data-role="back"]');
      if (back) back.onclick = () => {
        if (typeof playSfx === 'function') playSfx('uiConfirm', { group: 'ui', guardKey: 'ui:matching-back' });
        hideOnlineMatching();
        // 後片付けは exitOnlineMode()（online/flow.js）が唯一の実装。
        if (typeof exitOnlineMode === 'function') exitOnlineMode();
        if (typeof returnToTapStart === 'function') { showScreen('title'); returnToTapStart(); }
      };
    }
    return el;
  }

  function _renderPlayers(st) {
    const el = _el();
    const box = el.querySelector('[data-role="players"]');
    if (!box) return;
    // 並び順はサーバーが決めた players の順そのまま（自分が下になることもある）。
    const list = (st && Array.isArray(st.players)) ? st.players : [];
    box.innerHTML = list.map(p =>
      `<div class="omo-player${p.self ? ' is-self' : ''}">${String(p.id || '')}</div>`).join('');
  }

  function _renderTitle(st) {
    const el = _el();
    const t = el.querySelector('[data-role="title"]');
    if (!t) return;
    const done = !!(st && !st.matching);
    if (done) {
      t.textContent = '対戦開始！';
      return;
    }
    t.textContent = 'マッチング待機中です' + '・'.repeat(_dots);
  }

  function _tickDots() {
    _dots = _dots >= DOT_MAX ? 1 : _dots + 1;
    const st = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.getState() : null;
    _renderTitle(st);
  }

  function _stop() {
    if (_dotTimer) { clearInterval(_dotTimer); _dotTimer = null; }
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  // 成立したら「対戦開始！」を見せてからフェードアウトで解除する。
  function _onMatched() {
    if (_matched) return;
    _matched = true;
    _stop();
    _renderTitle({ matching: false });
    const el = _el();
    setTimeout(() => {
      el.classList.add('is-fading');
      setTimeout(() => { el.classList.remove('is-visible', 'is-fading'); }, 900);
    }, 900);
  }

  function showOnlineMatching() {
    const el = _el();
    _matched = false;
    _dots = 1;
    el.classList.remove('is-fading');
    el.classList.add('is-visible');
    _stop();
    _dotTimer = setInterval(_tickDots, DOT_INTERVAL_MS);
    // 参加者の増加もサーバーに聞く（クライアントで増やさない）。
    _pollTimer = setInterval(() => {
      if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return;
      const st = OnlineMatch.getState();
      if (!st) return;
      _renderPlayers(st);
      _renderTitle(st);
      if (!st.matching) _onMatched();
    }, 300);
    const st0 = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.getState() : null;
    _renderPlayers(st0);
    _renderTitle(st0);
  }

  function hideOnlineMatching() {
    _stop();
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.classList.remove('is-visible', 'is-fading');
  }

  if (typeof window !== 'undefined') {
    window.showOnlineMatching = showOnlineMatching;
    window.hideOnlineMatching = hideOnlineMatching;
  }
})();
