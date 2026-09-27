// ═══════════════════════════════════════
// online/matching.js — マッチング待機オーバーレイ（UI）
//
// 表示するのはサーバーが返した参加者リストだけ。
// 誰が何番目かも、何人揃ったかも、成立したかもサーバーが決める。
// 待機中の動きはCSSの光る弧が担当し、JSは参加者と成立状態の表示だけを行う。
// ═══════════════════════════════════════

(function () {
  const OVERLAY_ID = 'online-matching-overlay';
  const STATE_POLL_MS = 300;
  // runBoardTutorial の introText と同じ1700ms表示してから閉じる。
  const MATCHED_HOLD_MS = 1700;
  const FADE_MS = 450;

  let _pollTimer = null;
  let _matchedTimer = null;
  let _hideTimer = null;
  let _matched = false;

  function _onlineText(key, fallback) {
    return typeof textMessage === 'function' ? textMessage(key, fallback) : fallback;
  }

  function _el() {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        '<div class="omo-inner">' +
        '<div class="omo-wait-arc" aria-hidden="true">' +
        '<svg viewBox="0 0 1020 210" preserveAspectRatio="none">' +
        '<path class="omo-wait-arc-track" d="M80 185 Q510 -45 940 185" pathLength="100"></path>' +
        '<path class="omo-wait-arc-glow" d="M80 185 Q510 -45 940 185" pathLength="100"></path>' +
        '</svg></div>' +
        '<section class="omo-frame" role="status" aria-live="polite" aria-labelledby="online-matching-title">' +
        '<h2 class="omo-title" id="online-matching-title" data-role="title"></h2>' +
        '<div class="omo-body"><div class="omo-players" data-role="players"></div></div>' +
        '</section>' +
        '<div class="omo-actions"><button type="button" class="omo-back" data-role="back"></button></div>' +
        '<div class="omo-match-start" data-role="match-start" aria-hidden="true">' +
        '<div class="omo-match-start-title" data-role="match-start-title"></div>' +
        '</div>' +
        '</div>';
      // .screen と同じスケール枠（CSS側で --game-scale を適用）にして body 直下へ置く。
      // 特定の画面の中に入れると、その画面が隠れた時に一緒に消えてしまう。
      document.body.appendChild(el);
      const back = el.querySelector('[data-role="back"]');
      if (back) {
        back.onclick = () => {
          if (typeof playSfx === 'function') playSfx('uiConfirm', { group: 'ui', guardKey: 'ui:matching-back' });
          hideOnlineMatching();
          // 後片付けは exitOnlineMode()（online/flow.js）が唯一の実装。
          if (typeof exitOnlineMode === 'function') exitOnlineMode();
          // マッチングはタイトルメニューから始めているので、起動直後の
          // TAP TO STARTではなく、項目が開いた同じメニュー状態へ戻す。
          if (typeof _returnToTitleMenu === 'function') _returnToTitleMenu();
          else if (typeof showScreen === 'function') showScreen('title');
        };
      }
    }
    return el;
  }

  function _syncText() {
    const el = _el();
    const title = el.querySelector('[data-role="title"]');
    const back = el.querySelector('[data-role="back"]');
    const start = el.querySelector('[data-role="match-start-title"]');
    if (title) title.textContent = _onlineText('オンライン対戦「マッチング」見出し', 'マッチング');
    if (back) back.textContent = _onlineText('「キャンセル」ボタン', 'キャンセル');
    if (start) start.textContent = _onlineText('オンライン対戦「対戦開始」表示', '対戦開始！');
  }

  function _renderPlayers(st) {
    const el = _el();
    const box = el.querySelector('[data-role="players"]');
    if (!box) return;
    // 並び順はサーバーが決めた players の順そのまま（自分が下になることもある）。
    const list = (st && Array.isArray(st.players)) ? st.players : [];
    const fragment = document.createDocumentFragment();
    list.forEach(p => {
      const player = document.createElement('div');
      player.className = `omo-player${p && p.self ? ' is-self' : ''}`;
      player.textContent = String(p && p.id || '');
      fragment.appendChild(player);
    });
    box.replaceChildren(fragment);
  }

  function _stop() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_matchedTimer) { clearTimeout(_matchedTimer); _matchedTimer = null; }
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
  }

  // 成立したら待機画面の上へ大見出しを重ね、その後に全体を閉じる。
  // 編成画面への遷移は flow.js がサーバー状態から従来どおり行う。
  function _onMatched(st) {
    if (_matched) return;
    _matched = true;
    _stop();
    const el = _el();
    _renderPlayers(st);
    _syncText();
    el.classList.add('is-matched');
    const start = el.querySelector('[data-role="match-start"]');
    const back = el.querySelector('[data-role="back"]');
    if (start) start.setAttribute('aria-hidden', 'false');
    if (back) { back.disabled = true; back.blur(); }
    _matchedTimer = setTimeout(() => {
      _matchedTimer = null;
      el.classList.add('is-fading');
      _hideTimer = setTimeout(() => {
        _hideTimer = null;
        el.classList.remove('is-visible', 'is-fading', 'is-matched');
        el.setAttribute('aria-hidden', 'true');
        if (start) start.setAttribute('aria-hidden', 'true');
      }, FADE_MS);
    }, MATCHED_HOLD_MS);
  }

  function _readState() {
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return;
    const st = OnlineMatch.getState();
    if (!st) return;
    _renderPlayers(st);
    if (!st.matching) _onMatched(st);
  }

  function showOnlineMatching() {
    const el = _el();
    _stop();
    _matched = false;
    el.classList.remove('is-fading', 'is-matched');
    el.classList.add('is-visible');
    el.setAttribute('aria-hidden', 'false');
    const start = el.querySelector('[data-role="match-start"]');
    const back = el.querySelector('[data-role="back"]');
    if (start) start.setAttribute('aria-hidden', 'true');
    if (back) back.disabled = false;
    _syncText();
    // 参加者の増加もサーバーに聞く（クライアントで増やさない）。
    _pollTimer = setInterval(_readState, STATE_POLL_MS);
    const st0 = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.getState() : null;
    _renderPlayers(st0);
    if (st0 && !st0.matching) _onMatched(st0);
  }

  function hideOnlineMatching() {
    _stop();
    _matched = false;
    const el = document.getElementById(OVERLAY_ID);
    if (el) {
      el.classList.remove('is-visible', 'is-fading', 'is-matched');
      el.setAttribute('aria-hidden', 'true');
      const start = el.querySelector('[data-role="match-start"]');
      if (start) start.setAttribute('aria-hidden', 'true');
    }
  }

  if (typeof window !== 'undefined') {
    window.showOnlineMatching = showOnlineMatching;
    window.hideOnlineMatching = hideOnlineMatching;
  }
})();
