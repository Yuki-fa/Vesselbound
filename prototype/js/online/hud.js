// ═══════════════════════════════════════
// online/hud.js — 対戦相手の枠（画面上部）
//
// サーバーが返した players をそのまま表示するだけ。
// 誰が次の相手か（nextOpponentId）も、生死も、ライフもサーバーが決める。
// ここで判定・計算を行ってはいけない。
// ═══════════════════════════════════════

(function () {
  const HUD_ID = 'online-rival-hud';
  // 枠の配置（設計座標）。幅269・高さ100はマナ枠と同じ。
  const SLOT_X = [2750, 3054, 3358];
  const SLOT_Y = 70;

  let _tickTimer = null;
  let _wired = false;

  function _el() {
    let el = document.getElementById(HUD_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = HUD_ID;
      el.innerHTML = SLOT_X.map((x, i) =>
        `<div class="orh-slot" data-slot="${i}" style="left:${x}px;top:${SLOT_Y}px">` +
        '<span class="orh-id" data-role="id"></span>' +
        '<span class="orh-life" data-role="life"></span></div>').join('') +
        // 残り時間。所持金枠（.battle-status-counter）の中身ごと同じ構造にして、
        // 「所持金」→「残り時間」、金額→残り時間に置き換えたもの。見た目の定義は共有クラス側。
        '<div class="orh-timer battle-status-counter">' +
        '<img src="assets/ui/counter.svg?v=back50" alt="">' +
        '<span class="battle-status-label">残り時間</span>' +
        '<strong data-role="timer-value">--:--</strong></div>';
      // .screen と同じスケール枠（CSS側で --game-scale を適用）にして body 直下へ置く。
      // 特定の画面の中に入れると、その画面が隠れた時に一緒に消えてしまう。
      document.body.appendChild(el);
      el.addEventListener('click', e => {
        const slot = e.target && e.target.closest ? e.target.closest('.orh-slot') : null;
        if (!slot) return;
        const id = slot.getAttribute('data-player-id');
        if (id && typeof onOnlineRivalClicked === 'function') onOnlineRivalClicked(id);
      });
    }
    return el;
  }

  function _render() {
    const el = _el();
    const st = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.getState() : null;
    // マッチング中はまだ対戦相手も制限時間も無いので出さない
    // （タイトル画面で待機している間に残り時間が見えてしまうため）。
    const active = !!(typeof G !== 'undefined' && G && G._onlineMode && st && !st.matching);
    el.classList.toggle('is-visible', active);
    if (!active) return;

    // 残り時間。締め切り超過の判定はサーバー側なので、ここは表示のみ。
    const tv = el.querySelector('[data-role="timer-value"]');
    if (tv) {
      const label = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.remainingLabel() : null;
      tv.textContent = label == null ? '--:--' : label;
    }
    // 自分以外の3人を、サーバーが返した並び順のまま左から表示する。
    const rivals = st && Array.isArray(st.players) ? st.players.filter(p => !p.self) : [];
    // 自分が敗北していると、他プレイヤーの画面を見に行けるようにする（クリック可）。
    const selfP = st && Array.isArray(st.players) ? st.players.find(p => p.self) : null;
    const canSpectate = !!(selfP && selfP.alive === false);
    el.classList.toggle('can-spectate', canSpectate);

    [...el.querySelectorAll('.orh-slot')].forEach((slot, i) => {
      const p = rivals[i] || null;
      const idEl = slot.querySelector('[data-role="id"]');
      const lifeEl = slot.querySelector('[data-role="life"]');
      if (!p) {
        slot.classList.remove('is-next', 'is-defeated');
        slot.removeAttribute('data-player-id');
        if (idEl) idEl.textContent = '';
        if (lifeEl) lifeEl.textContent = '';
        return;
      }
      slot.setAttribute('data-player-id', p.id);
      if (idEl) idEl.textContent = p.id;
      // ホバー時だけライフを出す（CSSで切り替え）。値はサーバーのものをそのまま。
      // 自分のライフ表示と同じく、失った分を♡で残す（♥の本数だけだと減ったのが分かりにくい）。
      if (lifeEl) {
        const max = (typeof waveLifeMax === 'function') ? waveLifeMax() : 5;
        const life = Math.max(0, Math.min(max, Number(p.life) || 0));
        // ハートの絵は main.js の lifeHeartHtml() が唯一の実装（life.svg）。
        lifeEl.innerHTML = Array.from({ length: max },
          (_, i) => (typeof lifeHeartHtml === 'function' ? lifeHeartHtml(i >= max - life) : '')).join('');
      }
      slot.classList.toggle('is-defeated', p.alive === false);
      slot.classList.toggle('is-next', !!st && st.nextOpponentId === p.id && p.alive !== false);
    });
  }

  function initOnlineRivalHud() {
    _el();
    if (!_wired && typeof OnlineMatch !== 'undefined' && OnlineMatch) {
      _wired = true;
      OnlineMatch.subscribe(_render);
    }
    if (!_tickTimer) _tickTimer = setInterval(_render, 500);
    _render();
  }

  if (typeof window !== 'undefined') {
    window.initOnlineRivalHud = initOnlineRivalHud;
    window.renderOnlineHud = _render;
    // 旧APIの互換（呼び出し元が残っていても落ちないように）
    window.initOnlineHud = initOnlineRivalHud;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOnlineRivalHud);
    else initOnlineRivalHud();
  }
})();
