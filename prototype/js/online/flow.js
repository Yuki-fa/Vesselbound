// ═══════════════════════════════════════
// online/flow.js — サーバー状態に追従する進行ドライバ
//
// 「いつ次のマスへ進むか」はサーバーが決める。このファイルはその結果を見て
// 対応する画面へ切り替えるだけ。ここで進行条件・ライフ・勝敗を判定してはいけない。
//
// 2人が常に同じタイミングで進むのは、サーバー側が
//   「双方が準備完了」または「締め切り到達」
// のどちらかでしか step を進めないため。クライアントは追いかけるだけでよい。
// ═══════════════════════════════════════

(function () {
  let _lastKey = null;      // 直前に画面を作った (stage,step) の識別子
  let _navigating = false;
  let _wired = false;
  // 対戦の再生中は進行に追従しない。サーバーは戦闘を確定させた時点で次のマスへ進むので、
  // これが無いと再生の途中で次のマス（街など）へ切り替わってしまう。
  let _paused = false;
  // 「編成完了 n/3」の描き直しは表示が変わる時だけ。毎回のポーリングで作り直すと、
  // ボタンのDOMが差し替わるたびにホバーが入り直し、ホバーSEが鳴り続ける。
  let _lastBtnKey = null;

  const _stateKey = st => (st ? `${st.stage}:${st.step}:${st.nodeType}` : null);

  // サーバーの stage/step を、既存のウェーブ進行の値へ写す。
  // クライアントはこの値を自分で進めない（常にサーバー値の写し）。
  function _applyServerPosition(st) {
    if (typeof G === 'undefined' || !G) return;
    G._wave = Number(st.stage) || 1;
    G._waveStage = (Number(st.step) || 0) + 1;
  }

  // マスの種別ごとに、既存の画面遷移をそのまま使う。
  function _navigate(st) {
    const stage = (Number(st.step) || 0) + 1;
    // 店に入ったまま時間切れになると、施設の背景が次のマスへ残る。
    // 画面を切り替える前に必ず施設の背景を落とす。
    if (typeof _applyFacilityBackground === 'function') _applyFacilityBackground(null);
    document.body.classList.remove('facility-bg-active', 'shop-screen-active', 'forge-screen-active', 'item-shop-active');
    if (typeof G !== 'undefined' && G) {
      G._isShop = false; G._isForge = false; G._isTavern = false;
      G._isItemShop = false; G._isRingExchange = false; G._isVillageMenu = false;
      G._facilityLabel = '';
    }
    switch (st.nodeType) {
      case 'city':
        if (typeof _openWaveVillage === 'function') _openWaveVillage(stage, false);
        break;
      case 'tower':
        if (typeof _openWaveAltar === 'function') _openWaveAltar(stage);
        else if (typeof _openWaveVillage === 'function') _openWaveVillage(stage, false);
        break;
      case 'versus':
        if (typeof startOnlineVersusBattle === 'function') startOnlineVersusBattle();
        break;
      case 'formation':
        // 通常戦闘は行わず、編成画面だけを挟む（仕様）。
        // _openWaveFormation() は報酬カードを消す「編成だけ」の画面なので使わない。
        // 通常の戦闘後と同じ報酬画面（カードあり）を開く。
        if (typeof G !== 'undefined' && G) {
          G.phase = 'reward';
          G._isShop = false; G._isForge = false; G._isTavern = false;
          G._isVillageMenu = false; G._isWaveAltar = false; G._isItemShop = false;
          G._isRingExchange = false; G._isLibrary = false; G._isTreasureMapReward = false;
          G._facilityLabel = '';
        }
        document.body.classList.remove('village-screen-active', 'world-map-active');
        if (typeof showScreen === 'function') showScreen('battle');
        if (typeof goToReward === 'function') goToReward();
        break;
      case 'battle':
      default:
        if (typeof _startWaveBattle === 'function') _startWaveBattle(stage);
        break;
    }
  }

  // 決着はサーバーが決める。ここは result を画面に流すだけ。
  function _finish(st) {
    if (typeof gameOver !== 'function') return;
    if (st.result === 'clear') {
      // 相手のライフを0にした＝完全勝利。文言の差し替えは gameOver 側が見る。
      G._onlinePerfectWin = true;
      gameOver({ clear: true });
    } else {
      G._onlinePerfectWin = false;
      gameOver({ clear: false });
    }
  }

  function onOnlineStateChanged(st) {
    if (typeof G === 'undefined' || !G || !G._onlineMode) return;
    if (!st || _navigating || _paused) return;
    // マッチング中は待機オーバーレイを出しているだけなので、画面を切り替えない。
    // （切り替えると街へ入ってしまう）
    if (st.matching) { _applyServerPosition(st); return; }

    if (st.finished) {
      const key = 'finished';
      if (_lastKey === key) return;
      _lastKey = key;
      _applyServerPosition(st);
      _finish(st);
      return;
    }

    // ライフはサーバーが持つ。表示用の値をここで写すだけで、増減の判定はしない。
    const _self = Array.isArray(st.players) ? st.players.find(p => p && p.self) : null;
    const _life = _self ? Number(_self.life) : (st.life ? Number(st.life.self) : null);
    if (_life != null && !Number.isNaN(_life) && Number(G._waveLife) !== _life) {
      G._waveLife = _life;
      if (typeof updateHUD === 'function') updateHUD();
    }

    // 「編成完了 n/3」等はサーバー値から作るので、表示が変わる時だけボタンを描き直す。
    const btnKey = `${st.nodeType}:${st.formationIndex}:${G._onlineWaiting ? 1 : 0}`;
    if (typeof renderMoveSlotsInEnemy === 'function' && G.phase === 'reward' && btnKey !== _lastBtnKey) {
      _lastBtnKey = btnKey;
      try { renderMoveSlotsInEnemy(); } catch (e) { /* 表示のみ。失敗しても進行は止めない */ }
    }
    const key = _stateKey(st);
    if (!key || key === _lastKey) return;
    _lastKey = key;
    _applyServerPosition(st);

    // 次のマスへ進めたので「戦闘待機中」のロックを解除する。
    if (typeof G !== 'undefined' && G) G._onlineWaiting = false;
    document.body.classList.remove('online-waiting');
    // 街・塔のBGMは、編成画面や対戦へ移る時に必ず止める（そのまま鳴り続けるため）。
    if ((st.nodeType === 'formation' || st.nodeType === 'versus') && typeof stopBgm === 'function') {
      G._villageBgmActive = false;
      stopBgm(600);
      if (typeof stopEveryBgmLayer === 'function') stopEveryBgmLayer(600);
    }
    _navigating = true;
    try { _navigate(st); }
    catch (e) { console.error('[online:flow]', e); }
    finally { _navigating = false; }
  }

  function initOnlineFlow() {
    if (_wired) return;
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return;
    _wired = true;
    OnlineMatch.subscribe(onOnlineStateChanged);
  }

  // 画面側の「戦闘開始」「出発する」からサーバーへ準備完了を伝えるための入口。
  // 進むかどうかはサーバーが決めるので、ここでは通知するだけ。
  function onlineNotifyReady(formation) {
    if (typeof G === 'undefined' || !G || !G._onlineMode) return Promise.resolve(null);
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch || !OnlineMatch.isActive()) return Promise.resolve(null);
    return OnlineMatch.setReady(formation || null);
  }

  // 現在のマスがオンライン対戦マスか（UIの分岐用）。
  function isOnlineVersusNode() {
    if (typeof G === 'undefined' || !G || !G._onlineMode) return false;
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return false;
    const st = OnlineMatch.getState();
    return !!(st && st.nodeType === 'versus');
  }

  // 対戦の再生中だけ追従を止める。再生が終わったら、その時点のサーバー状態から再開する。
  function setOnlineFlowPaused(v) { _paused = !!v; }
  function resumeOnlineFlow() {
    _paused = false;
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return;
    onOnlineStateChanged(OnlineMatch.getState());
  }

  // 進行位置の追従をリセットする（新しいマッチを始める時）。
  function resetOnlineFlow() { _lastKey = null; _paused = false; _lastBtnKey = null; }

  // ── オンライン対戦から抜ける時の後片付け（唯一の実装）────────────────
  // **タイトルへ戻る・新しいゲームを始める時は必ずここを通すこと。**
  // 片付け漏れがあると、
  //   ・他プレイヤーの名前枠と「残り時間」がタイトル画面に残る
  //   ・body.online-versus-active が残り、編成画面のボタンが丸ごと隠れて何も押せない
  // という形で次のプレイに持ち越される。
  function exitOnlineMode() {
    if (typeof OnlineMatch !== 'undefined' && OnlineMatch && typeof OnlineMatch.reset === 'function') OnlineMatch.reset();
    resetOnlineFlow();
    if (typeof hideOnlineMatching === 'function') hideOnlineMatching();
    if (typeof G !== 'undefined' && G) {
      G._onlineMode = false;
      G._onlineWaiting = false;
      G._onlinePerfectWin = false;
      G._onlineSpectateId = '';
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('online-mode-active', 'online-versus-active', 'online-waiting');
    }
    // 相手の枠と残り時間は「オンライン中か」を見て出しているので、すぐ描き直して消す。
    if (typeof renderOnlineHud === 'function') renderOnlineHud();
  }

  // いま表示している場所を「追従済み」として記録する。
  // マッチング直後は既にリーゼを表示しているので、これを呼ばないと
  // サーバーの初期状態（step0=city）に反応してリーゼを開き直してしまう。
  function primeOnlineFlow() {
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return;
    const st = OnlineMatch.getState();
    if (st) { _lastKey = _stateKey(st); _applyServerPosition(st); }
  }

  if (typeof window !== 'undefined') {
    window.initOnlineFlow = initOnlineFlow;
    window.onlineNotifyReady = onlineNotifyReady;
    window.isOnlineVersusNode = isOnlineVersusNode;
    window.resetOnlineFlow = resetOnlineFlow;
    window.exitOnlineMode = exitOnlineMode;
    window.setOnlineFlowPaused = setOnlineFlowPaused;
    window.resumeOnlineFlow = resumeOnlineFlow;
    window.primeOnlineFlow = primeOnlineFlow;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOnlineFlow);
    else initOnlineFlow();
  }
})();
