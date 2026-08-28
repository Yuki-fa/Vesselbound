// ═══════════════════════════════════════
// online/versus.js — オンライン対戦マスの戦闘（UI側の入口）
//
// 流れ
//   1. 自分の編成を「初期状態」としてサーバーへ渡す
//   2. サーバーが seed を決め、共通戦闘コアで最後まで計算してイベント列を返す
//   3. playback.js がイベント列を再生する
//   4. 勝敗はサーバーが返した outcome をそのまま表示する
//
// ここで乱数を引いたり、ダメージ・勝敗を計算してはいけない。
// ═══════════════════════════════════════

(function () {
  // 魔導板の編成を、共通戦闘コアが受け取れる形へ写す。
  // ここは「初期状態を誰が用意するか」の担当。ルールには一切触れない。
  function buildSelfFormation() {
    const units = [];
    const board = (typeof _getPartyBoardUnit === 'function') ? _getPartyBoardUnit() : null;
    const eq = board && Array.isArray(board.equipment) ? board.equipment : [];
    eq.forEach((panel, idx) => {
      if (!panel || String(panel.category || '') !== 'キャラクター') return;
      // 開戦時に場に出るマス（召喚の力系）に置かれたキャラクターだけが戦列に並ぶ。
      const powerId = (typeof mapPanelPowerIdAt === 'function') ? mapPanelPowerIdAt(idx) : '';
      if (!powerId) return;
      const stats = (typeof _panelCharacterPreviewStats === 'function')
        ? _panelCharacterPreviewStats(board, idx, panel) : null;
      const atk = Number(stats && stats.atk != null ? stats.atk : panel.power) || 0;
      const hp = Number(stats && stats.hp != null ? stats.hp : panel.life) || 1;
      // 魔導板のパネルから戦闘ユニットを作る写し取りは、PvEの開戦召喚と同じ
      // _panelSummonSpec() を使う。ここで独自に組み立てると効果音・絵・説明が抜ける。
      const spec = (typeof _panelSummonSpec === 'function') ? _panelSummonSpec(panel) : null;
      units.push({
        id: `self-${idx}`,
        // no / art / desc / grade / sfxType は戦闘ルールには使わないが、
        // 盤面の絵・説明と攻撃SEに必要なので持たせる。
        // art は渡さない。渡すと applyCharacterArtVars がそのパスを優先し、
        // 魔導板タイル用の絵を掴んでキャラクターの絵が出なくなる。no から引かせる。
        no: String((spec && spec.no) || panel.no || ''),
        name: String((spec && spec.name) || panel.name || ''),
        atk, hp,
        // 上段（0〜4）と下段（10〜14）を前衛、中段を後衛として扱う。
        lane: (idx >= 5 && idx <= 9) ? 'rear' : 'front',
        color: String((spec && spec.color) || panel.color || ''),
        race: String((spec && spec.race) || panel.race || ''),
        grade: Number(panel.grade) || 1,
        desc: String((spec && spec.desc) || panel.desc || ''),
        sfxType: String((spec && spec.sfxType) || panel.sfxType || ''),
        keywords: Array.isArray(spec && spec.keywords) ? spec.keywords.slice()
          : (Array.isArray(panel.keywords) ? panel.keywords.slice() : []),
      });
    });
    return { units };
  }

  // オンライン対戦マスの戦闘を実行して再生する。
  async function startOnlineVersusBattle() {
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch || !OnlineMatch.isActive()) return null;
    const formation = buildSelfFormation();

    // 再生が終わるまで進行の追従を止める。サーバーは戦闘を確定させた時点で次のマスへ
    // 進めるので、止めないと再生の途中で次のマス（街など）へ切り替わる。
    if (typeof setOnlineFlowPaused === 'function') setOnlineFlowPaused(true);
    // 対戦中は編成画面のボタンを押せないようにする（表示は「戦闘待機中」のまま）。
    if (typeof G !== 'undefined' && G) G._onlineWaiting = true;
    document.body.classList.add('online-waiting');

    // ── サーバーが確定させた結果を受け取る（乱数も勝敗もサーバー側）──
    const result = await OnlineMatch.resolveVersus(formation);
    if (!result) {
      if (typeof resumeOnlineFlow === 'function') resumeOnlineFlow();
      return null;
    }

    // 通常の戦闘画面へ入る（PvE側の盤面状態はここで退避される）。
    if (typeof beginOnlineVersusField === 'function') beginOnlineVersusField(result);

    // ── 再生。値も勝敗もイベント／resultの内容をそのまま使う ──
    try {
      await playOnlineBattleEvents(result, {
        // 返り値（Promise）を返すこと。返さないと playback 側が演出の完了を待てず、
        // 開戦カットインとダメージ演出が同時に走ってしまう。
        onEvent: (ev, ctx) => (typeof renderOnlineVersusBoard === 'function'
          ? renderOnlineVersusBoard(ev, ctx) : undefined),
      });
    } finally {
      // 再生が途中で失敗しても、退避したPvE側の状態は必ず戻す。
      if (typeof hideOnlineVersusBoard === 'function') hideOnlineVersusBoard();
    }

    // 勝敗表示はサーバーの outcome をそのまま使う（再生結果から判定しない）。
    if (typeof log === 'function') {
      if (result.outcome === 'p1') log('オンライン対戦に勝利した。', 'good');
      else if (result.outcome === 'p2') log('オンライン対戦に敗北した。ライフを1失った。', 'bad');
      else log('オンライン対戦は引き分けだった。ライフは減らない。', 'sys');
    }
    // 対戦マスの報酬ゴールド。金額を決めるのはサーバー側で、ここは受け取って加算するだけ。
    const gold = Math.max(0, Number(result.goldReward) || 0);
    if (gold > 0 && typeof onGoldGained === 'function') {
      const gained = onGoldGained(gold);
      if (typeof log === 'function') log(`対戦を終えて${gained}ゴールドを得た。`, 'gold');
      if (typeof refreshRewardGoldUi === 'function') refreshRewardGoldUi();
    }
    // ライフの反映も含め、以降の進行はサーバー状態（OnlineMatch）に追従する。
    if (typeof updateHUD === 'function') updateHUD();
    // 再生が終わったことを伝える。次のマスへ進めるか（＝その持ち時間を張るか）はサーバーが決める。
    // 対戦マス自体に制限時間は無いので、これを送るまで次の残り時間は減らない。
    if (OnlineMatch.reportVersusDone) await OnlineMatch.reportVersusDone();
    // その時点のサーバー状態（＝次のマス）へ追従を再開する。
    if (typeof resumeOnlineFlow === 'function') resumeOnlineFlow();
    return result;
  }

  // 敗北したプレイヤーが他プレイヤーの枠を押した時。
  // 本番では対象プレイヤーの画面をサーバーから取得して表示する。
  // 現状は観戦対象の記録のみで、画面の再現は未実装。
  function onOnlineRivalClicked(playerId) {
    if (typeof G === 'undefined' || !G || !G._onlineMode) return;
    const st = (typeof OnlineMatch !== 'undefined' && OnlineMatch) ? OnlineMatch.getState() : null;
    const selfP = st && Array.isArray(st.players) ? st.players.find(p => p.self) : null;
    if (!selfP || selfP.alive !== false) return;   // 敗北していない間は観戦できない
    G._onlineSpectateId = String(playerId || '');
    if (typeof log === 'function') log(`${G._onlineSpectateId} の画面を観戦する。`, 'sys');
  }

  if (typeof window !== 'undefined') {
    window.onOnlineRivalClicked = onOnlineRivalClicked;
    window.startOnlineVersusBattle = startOnlineVersusBattle;
    window.buildOnlineSelfFormation = buildSelfFormation;
  }
})();
