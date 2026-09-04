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
  // opts.persistEternal … 永劫の力の+1/+1をカード本体へ永久加算するか。
  //
  // この関数は1回の対戦で2回呼ばれる：
  //   ① main.js の _startWaveFlowNext()（準備完了を押した時。サーバーへ送る編成）
  //   ② versus.js の startOnlineVersusBattle()（実際に戦闘を実行する時）
  // 恒久加算を両方で行うと1戦で+2/+2になる。実際に戦闘が行われる②だけで加算し、
  // ①は加算せずに「加算後と同じ値」を返す（どちらも base+1 になり編成は一致する）。
  // ①→②の順で呼ばれることが前提。順序を変える場合はここを見直すこと。
  function buildSelfFormation(opts) {
    const board = (typeof _getPartyBoardUnit === 'function') ? _getPartyBoardUnit() : null;
    // 「どのスロットが出撃するか・レーン・体数・並び順」は共通ビルダーが決める。
    // ここで独自に組み立て直さないこと（以前はレーン判定と出撃順がPvEと食い違っていた）。
    const formation = (typeof buildBoardFormation === 'function')
      ? buildBoardFormation(board, { persistEternal: !!(opts && opts.persistEternal) }) : { ordered: [] };
    const units = formation.ordered.map(entry => {
      const u = entry.unit;
      const panel = entry.panel;
      return {
        id: `self-${entry.slotIdx}${entry.copyIndex ? `-copy-${entry.copyIndex}` : ''}`,
        // no / art / desc / grade / sfxType は戦闘ルールには使わないが、
        // 盤面の絵・説明と攻撃SEに必要なので持たせる。
        // art は渡さない。渡すと applyCharacterArtVars がそのパスを優先し、
        // 魔導板タイル用の絵を掴んでキャラクターの絵が出なくなる。no から引かせる。
        no: String(u.no || panel.no || ''),
        name: String(u.name || panel.name || ''),
        atk: Number(u.atk) || 0,
        hp: Number(u.hp) || 1,
        lane: entry.lane,
        color: String(u.color || panel.color || ''),
        race: String(u.race || panel.race || ''),
        grade: Number(panel.grade) || 1,
        desc: String(u.desc || ''),
        sfxType: String(u.sfxType || panel.sfxType || ''),
        keywords: Array.isArray(u.keywords) ? u.keywords.slice() : [],
        poison: Number(u.poison) || 0,
        weakenOnHit: Number(u.weakenOnHit) || 0,
        manaOnAttack: Number(u.manaOnAttack) || 0,
        manaOnInjury: Number(u.manaOnInjury) || 0,
        manaOnDeath: Number(u.manaOnDeath) || 0,
        goldOnBattleEnd: Number(u.goldOnBattleEnd) || 0,
        goldOnDeath: Number(u.goldOnDeath) || 0,
        randomItemOnBattleEnd: !!u.randomItemOnBattleEnd,
        randomItemCost: Number(u.randomItemCost) || 0,
        _adjacentPanelAbilities: Array.isArray(u._adjacentPanelAbilities) ? u._adjacentPanelAbilities.slice() : [],
        _adjacentPanelStrategyCount: Number(u._adjacentPanelStrategyCount) || 0,
        _adjacentPanelEffectTexts: Array.isArray(u._adjacentPanelEffectTexts) ? u._adjacentPanelEffectTexts.slice() : [],
        _uniteGroups: Array.isArray(u._uniteGroups) ? u._uniteGroups.slice() : [],
        _resonanceEffectNames: Array.isArray(u._resonanceEffectNames) ? u._resonanceEffectNames.slice() : [],
        _resonanceEffectScales: { ...(u._resonanceEffectScales || {}) },
        _mapPanelPower: entry.panelPower,
        _openingDuplicate: !!u._openingDuplicate,
        // 3枚合体の印。これを送らないと合体カードの強化分が丸ごと落ちる
        // （ファントムが6体ではなく3体しか召喚しない等）。
        _tripleMerged: !!u._tripleMerged,
        _merged: !!u._merged,
        // 盤面から出撃した体かどうか。守護の常時判定と攻撃対象の選び方が変わる。
        _panelSummoned: u._panelSummoned !== undefined ? !!u._panelSummoned : true,
        // 開戦のバフを受ける前の素のステータス。復活（ヴリコラカス等）が
        // 「開戦バフ前の半分」で戻すために必要。送らないと復活後の数値が狂う。
        baseAtk: Number(u._baseAtk ?? u.baseAtk ?? u.atk) || 0,
        baseMaxHp: Number(u._baseMaxHp ?? u.baseMaxHp ?? u.maxHp) || 1,
        // ヴォイド・ウォーカーの戦闘修正の上乗せ分。
        _voidWalkerBonus: Number(u._voidWalkerBonus) || 0,
        // 解放が開戦効果へ変換済みかどうか。二重発動の抑止に使う。
        _releaseConvertedToOpening: !!u._releaseConvertedToOpening,
        // 指輪による負傷時HP付与の残量。
        ringInjuryHp: Number(u.ringInjuryHp) || 0,
        summonCount: Number(u.summonCount) || 1,
        equipment: (entry.contributingPanels.length && typeof _panelSummonDisplayEquipment === 'function')
          ? _panelSummonDisplayEquipment(panel, entry.contributingPanels) : [],
        // 効果移行用の完全な戦闘データ。表示用のdescだけでなく、強化で追加された
        // 効果名・倍率・マナ閾値も共通コアへ渡す。
        effectData: {
          effectRepeatBonus: Number(u._effectRepeatBonus) || 0,
          manaCost: Number(u.manaCost) || 0,
          manaRepeat: !!u.manaRepeat,
          manaThresholdDesc: String(u._manaThresholdDesc || ''),
          // 効果固有VFXを引くカードNo.（活性化＝E045）。演出の引き当てに要る。
          manaThresholdNo: String(u._manaThresholdNo || ''),
          // マナ順位（発動順）。落とすとオンラインだけ順序が変わる。
          manaThresholdOrder: u._manaThresholdOrder,
          manaOrder: u.manaOrder,
          // シートの「VFX/SE」列。落とすとオンラインだけ演出が別素材になる。
          fxCode: String(u.fxCode || ''),
          extraManaThresholds: Array.isArray(u._extraManaThresholds)
            ? u._extraManaThresholds.map(x => ({ ...x })) : [],
          adjacentAbilities: Array.isArray(u._adjacentPanelAbilities) ? u._adjacentPanelAbilities.slice() : [],
          effectTexts: Array.isArray(u._adjacentPanelEffectTexts) ? u._adjacentPanelEffectTexts.slice() : [],
          effectNames: Array.isArray(u._resonanceEffectNames) ? u._resonanceEffectNames.slice() : [],
          effectScales: { ...(u._resonanceEffectScales || {}) },
          releaseAtkBonus: Number(u._releaseAtkBonus) || 0,
          releaseHpBonus: Number(u._releaseHpBonus) || 0,
        },
      };
    });
    return {
      units,
      rings: {
        p1: (typeof _effectiveRings === 'function')
          ? _effectiveRings().map(r => ({ name: String(r.name || ''), unique: String(r.unique || '') })) : [],
        p2: [],
      },
      items: {
        p1: (typeof G !== 'undefined' && G && Array.isArray(G.activeBattleItems))
          ? G.activeBattleItems.filter(Boolean).map(item => ({
            id: String(item.id || item.name || ''),
            itemEffectKey: String(item.itemEffectKey || ''),
          })) : [],
        p2: [],
      },
      resources: {
        p1: {
          // マナは戦闘ごとの資源で、開戦時は必ず0から始まる。
          // オフラインは startBattle() が開戦時に G.mana=0 へ戻すため、ここで G.mana を
          // 読むと「リセット前の持ち越しマナ」を初期値として送ってしまい、開戦した瞬間に
          // 大量のマナがある状態になる（活性化などの「Nマナ毎」が一気に何度も発動する）。
          mana: 0,
          gold: typeof G !== 'undefined' && G ? Number(G.gold) || 0 : 0,
        },
        // 相手側も同じく0から。片側だけ初期マナを持つと開幕から有利不利がつく。
        p2: { mana: 0, gold: 0 },
      },
    };
  }

  // オンライン対戦マスの戦闘を実行して再生する。
  async function startOnlineVersusBattle() {
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch || !OnlineMatch.isActive()) return null;
    // 実際に戦闘を行うのはこちら。永劫の力の恒久加算はここだけで行う。
    const formation = buildSelfFormation({ persistEternal: true });

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
