// ═══════════════════════════════════════
// online/board.js — オンライン対戦の盤面描画（層3の一部）
//
// playback.js が流すイベントを受けて、**通常の戦闘画面**（#f-ally / #f-enemy）へ
// 盤面を描く。描画そのものは PvE と同じ renderField() を使う。
// ダメージ値・死亡・勝敗は**イベントに書かれた値をそのまま**表示する。
// ここで計算・判定を行ってはいけない。
//
// PvEの状態（G.allies / G.enemies / G.phase）は開始時に退避し、終了時に必ず戻す。
// オンライン対戦は編成画面から呼ばれるため、戻し忘れると編成の盤面が壊れる。
// ═══════════════════════════════════════

(function () {
  // 前衛は 0〜6、後衛は 7〜9。PvEのフィールドと同じ並びに合わせる。
  const FRONT_SLOTS = 7;
  const MAX_SLOTS = 10;

  // カードの絵・説明はサーバーが結果に添えてくれた編成から引く（戦闘コアは持たない）。
  let _cardInfo = { p1: new Map(), p2: new Map() };
  // 退避したPvE側の状態。
  let _saved = null;

  // カットインの小見出しに出す相手の名前。値はサーバー状態のものをそのまま使う。
  function _opponentLabel() {
    if (typeof OnlineMatch === 'undefined' || !OnlineMatch) return '\u00a0';
    const st = OnlineMatch.getState();
    return (st && st.nextOpponentId) ? String(st.nextOpponentId) : '\u00a0';
  }

  function _setCardInfo(formations) {
    _cardInfo = { p1: new Map(), p2: new Map() };
    ['p1', 'p2'].forEach(side => {
      const list = (formations && formations[side] && formations[side].units) || [];
      list.forEach(u => { if (u && u.id != null) _cardInfo[side].set(String(u.id), u); });
    });
  }

  // 戦闘コアのユニット（ルールに要る値だけ）＋カード情報を、盤面描画が読む形へまとめる。
  function _fieldUnit(snap, side) {
    const info = _cardInfo[side].get(String(snap.id)) || {};
    return {
      id: snap.id,
      no: info.no || '',
      // 攻撃SEの種別（剣・斧など）。無いとヒット音が鳴らない。
      sfxType: info.sfxType || '',
      name: snap.name || info.name || '',
      atk: snap.atk,
      hp: Math.max(0, snap.hp),
      maxHp: Math.max(1, snap.maxHp || snap.hp || 1),
      lane: snap.lane === 'rear' ? 'rear' : 'front',
      color: snap.color || info.color || '',
      race: snap.race || info.race || '',
      grade: Number(info.grade) || 1,
      desc: info.desc || '',
      keywords: Array.isArray(snap.keywords) ? snap.keywords.slice() : [],
      // 封印中のカードはPvEと同じ .sealed-unit 表示になる（renderFieldが見る）。
      _sealed: !!snap._sealed,
      shield: Number(snap.shield) || 0,
      weaken: Number(snap.weaken) || 0,
      guardian: !!snap.guardian,
      // 魔導板から場に出たキャラクターなので、色ごとの召喚枠で描く（PvEの召喚ユニットと同じ）。
      _panelSummoned: true,
    };
  }

  // 前衛・後衛をPvEと同じスロット位置へ並べる。
  function _toField(units, side) {
    const arr = new Array(MAX_SLOTS).fill(null);
    let f = 0, r = FRONT_SLOTS;
    (units || []).forEach(u => {
      const cell = _fieldUnit(u, side);
      if (cell.lane === 'rear') { if (r < MAX_SLOTS) arr[r++] = cell; }
      else if (f < FRONT_SLOTS) arr[f++] = cell;
    });
    return arr;
  }

  function _render() {
    if (typeof renderField !== 'function') return;
    renderField('f-ally', G.allies, false);
    renderField('f-enemy', G.enemies, true);
  }

  // 盤面上の同一ユニットを id で引く（イベントに書かれた id をそのまま使う）。
  function _find(side, unitId) {
    const list = side === 'p1' ? G.allies : G.enemies;
    return (list || []).find(u => u && String(u.id) === String(unitId)) || null;
  }
  // 演出側の陣営名。p1（自分）が味方、p2（相手）が敵。
  const _fxSide = side => (side === 'p1' ? 'ally' : 'enemy');
  const _sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

  // 実行中の攻撃モーション。ダメージ・死亡・決着はこれを待ってから盤面を作り直す
  // （モーション中に renderField で作り直すと、動かしている複製が取り残される）。
  let _motion = null;
  let _lastAttacker = null;
  const _awaitMotion = async () => {
    if (!_motion) return;
    const m = _motion; _motion = null;
    try { await m; } catch (e) { /* 演出の失敗で再生を止めない */ }
  };

  // 勝利・撤退のカットイン。PvEと同じ showBattleCutin を使う。
  // 「進む」ボタンは付けない（次のマスへ進む時刻はサーバーが持つため）。
  async function _playResultCutin(outcome) {
    if (typeof showBattleCutin !== 'function') return;
    if (outcome !== 'p1' && outcome !== 'p2') return;   // 引き分けは結果表示なし
    const win = outcome === 'p1';
    if (win && typeof playSfx === 'function') playSfx('victory', { group: 'ui' });
    const overlay = await showBattleCutin(win ? 'victory' : 'retreat', { durationMs: 1800 });
    await _sleep(1500);
    if (overlay && overlay.remove) overlay.remove();
    document.body.classList.remove('battle-victory-pending');
    const fade = document.getElementById('battle-end-fade');
    if (fade) { fade.classList.remove('is-visible', 'is-final'); fade.removeAttribute('style'); }
  }

  // ── 通常の戦闘画面へ入る／戻る ────────────────────────
  function beginOnlineVersusField(result) {
    _setCardInfo(result && result.formations);
    if (typeof G === 'undefined' || !G) return;
    _saved = {
      allies: G.allies, enemies: G.enemies, phase: G.phase,
      turnActive: document.body.classList.contains('battle-turn-active'),
    };
    G.allies = new Array(MAX_SLOTS).fill(null);
    G.enemies = new Array(MAX_SLOTS).fill(null);
    // 通常の戦闘画面と同じ状態にする。編成画面用の表示は body.online-versus-active 側の
    // CSSでまとめて隠すので、ここで個々の要素の display は触らない
    // （触ると編成画面へ戻った時に元へ戻す責任がこちらに移ってしまう）。
    G.phase = 'battle';
    document.body.classList.remove('reward-screen-active');
    document.body.classList.add('online-versus-active');
    const host = document.getElementById('scr-battle');
    if (host) {
      host.classList.remove('battle-bg-reveal', 'battle-bg-scroll-ready', 'battle-bg-scrolling');
      host.classList.add('battle-bg-normal');
    }
    if (typeof showScreen === 'function') showScreen('battle');
  }

  function endOnlineVersusField() {
    _motion = null;
    _lastAttacker = null;
    document.body.classList.remove('online-versus-active', 'battle-victory-pending');
    const introEl = document.getElementById('battle-start-intro');
    if (introEl) introEl.remove();
    const fade = document.getElementById('battle-end-fade');
    if (fade) { fade.classList.remove('is-visible', 'is-final'); fade.removeAttribute('style'); }
    const host = document.getElementById('scr-battle');
    if (host) host.classList.remove('battle-opening-pending', 'battle-opening-active', 'battle-start-playing', 'battle-start-no-effect');
    if (typeof G === 'undefined' || !G || !_saved) return;
    G.allies = _saved.allies;
    G.enemies = _saved.enemies;
    G.phase = _saved.phase;
    // reward-screen-active はここでは戻さない。戻すと次のマス（街・塔）へ移る直前に
    // 編成画面が一瞬見える。次の遷移側（goToReward / _openWaveVillage）が必ず設定する。
    document.body.classList.toggle('battle-turn-active', _saved.turnActive);
    _saved = null;
  }

  // playback.js から呼ばれる。ctx.board は再生用の表示盤面（イベントで更新済み）。
  // 演出（モーション・VFX・SE・カットイン）はPvEと同じ関数を呼ぶ。
  // ダメージ値・死亡・勝敗はイベントに書かれた値をそのまま使い、ここでは判定しない。
  async function renderOnlineVersusBoard(ev, ctx) {
    if (typeof G === 'undefined' || !G) return;
    const board = (ctx && ctx.board) || { p1: [], p2: [] };

    switch (ev.type) {
      case ONLINE_EVENT.BATTLE_START: {
        G.allies = _toField(board.p1, 'p1');
        G.enemies = _toField(board.p2, 'p2');
        _render();
        // 開戦カットイン → 登場演出。PvEの startBattle() と同じ順番。
        if (typeof _playBattleStartIntro === 'function') {
          await _playBattleStartIntro({ title: '戦 闘 開 始', subtitle: _opponentLabel(), kind: 'normal' });
        }
        if (typeof playBattleOpeningSequence === 'function') await playBattleOpeningSequence();
        break;
      }
      case ONLINE_EVENT.ATTACK: {
        const attacker = _find(ev.side, ev.attackerId);
        const target = _find(ev.side === 'p1' ? 'p2' : 'p1', ev.targetId);
        _lastAttacker = attacker;
        if (!attacker || !target || typeof playAttackMotion !== 'function') break;
        const dmg = Math.max(0, Number(ev.damage) || 0);
        if (dmg > 0 && typeof playSfx === 'function') {
          playSfx('attack', { group: 'combat', guardKey: 'combat:attack' });
        }
        // PvEの通常攻撃と同じ尺・同じ接触揺れ。
        _motion = playAttackMotion(attacker, target, ev.side === 'p2', null, {
          stopRatio: .25, firstDuration: 260, secondDuration: 360, returnDuration: 420,
          onHit: () => { if (typeof _shakeOnAttackContact === 'function') _shakeOnAttackContact(target, dmg); },
        });
        // PvEは攻撃モーションが完全に終わってから applyDamageBatch()＝ヒットSE・
        // ダメージVFX・数値表示を出す。同じ契機にするため、ここでモーションの完了を待つ。
        // （接触の瞬間に出すと、PvEより約440ms早く鳴って音がずれる）
        await _awaitMotion();
        break;
      }
      case ONLINE_EVENT.DAMAGE: {
        // 表示はイベントの hpAfter をそのまま反映（自前で引き算しない）
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        u.hp = Math.max(0, Number(ev.hpAfter) || 0);
        const side = _fxSide(ev.side);
        // 盤面は作り直さず、数値とライフバーだけを更新する（モーション中のため）。
        if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(u, side);
        if (typeof playAttackDamageSfx === 'function') playAttackDamageSfx(_lastAttacker, ev.amount);
        if (typeof playHitVfx === 'function') playHitVfx(side, u, ev.amount);
        break;
      }
      case ONLINE_EVENT.SACRIFICE: {
        // 生贄で破棄される。PvEと同じ破棄演出を使う。
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        await _awaitMotion();
        if (typeof playSacrificeDestroyVfx === 'function') {
          await playSacrificeDestroyVfx(u, _fxSide(ev.side));
        }
        u.hp = 0;
        _render();
        break;
      }
      case ONLINE_EVENT.SEAL_RELEASE: {
        // 封印の解放。PvEと同じ解放演出を使う。
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        await _awaitMotion();
        u._sealed = false;
        if (typeof playSealReleaseVfx === 'function') {
          await playSealReleaseVfx(u, _fxSide(ev.side));
        }
        _render();
        break;
      }
      case ONLINE_EVENT.DEATH: {
        const u = _find(ev.side, ev.unitId);
        if (u) u.hp = 0;
        // 焼失演出は renderField が死亡ユニットに対して自分で流す。
        await _awaitMotion();
        _render();
        break;
      }
      case ONLINE_EVENT.BATTLE_END:
        await _awaitMotion();
        _render();
        if (typeof _forceStopAllVfx === 'function') _forceStopAllVfx();
        // 勝敗はイベントに書かれた outcome をそのまま出す
        if (typeof log === 'function') {
          log(ev.outcome === 'p1' ? '勝利' : (ev.outcome === 'p2' ? '敗北' : '引き分け'),
            ev.outcome === 'p1' ? 'good' : (ev.outcome === 'p2' ? 'bad' : 'sys'));
        }
        await _playResultCutin(ev.outcome);
        break;
      default:
        break;
    }
  }

  function hideOnlineVersusBoard() { endOnlineVersusField(); }

  if (typeof window !== 'undefined') {
    window.beginOnlineVersusField = beginOnlineVersusField;
    window.renderOnlineVersusBoard = renderOnlineVersusBoard;
    window.hideOnlineVersusBoard = hideOnlineVersusBoard;
  }
})();
