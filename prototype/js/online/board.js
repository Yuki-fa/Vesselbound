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
  // 前衛は 0〜6、後衛は 7〜13。PvEの実盤面（14体上限）と同じ並びに合わせる。
  const FRONT_SLOTS = 7;
  const MAX_SLOTS = 14;

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
      no: snap.no || info.no || '',
      art: snap.art || info.art || '',
      // 攻撃SEの種別（剣・斧など）。無いとヒット音が鳴らない。
      sfxType: snap.sfxType || info.sfxType || '',
      name: snap.name || info.name || '',
      atk: snap.atk,
      hp: Math.max(0, snap.hp),
      maxHp: Math.max(1, snap.maxHp || snap.hp || 1),
      lane: snap.lane === 'rear' ? 'rear' : 'front',
      color: snap.color || info.color || '',
      race: snap.race || info.race || '',
      grade: Number(info.grade) || 1,
      desc: snap.desc || info.desc || '',
      keywords: Array.isArray(snap.keywords) ? snap.keywords.slice() : [],
      effectData: snap.effectData ? { ...snap.effectData } : (info.effectData ? { ...info.effectData } : {}),
      equipment: Array.isArray(snap.equipment) ? snap.equipment : (Array.isArray(info.equipment) ? info.equipment : []),
      poison: Math.max(0, Number(snap.poison) || 0),
      weakenOnHit: Math.max(0, Number(snap.weakenOnHit) || 0),
      manaOnAttack: Math.max(0, Number(snap.manaOnAttack) || 0),
      manaOnInjury: Math.max(0, Number(snap.manaOnInjury) || 0),
      manaOnDeath: Math.max(0, Number(snap.manaOnDeath) || 0),
      goldOnBattleEnd: Math.max(0, Number(snap.goldOnBattleEnd) || 0),
      goldOnDeath: Math.max(0, Number(snap.goldOnDeath) || 0),
      manaCost: Math.max(0, Number(snap.manaCost) || 0),
      manaRepeat: !!snap.manaRepeat,
      manaThresholdDesc: String(snap.manaThresholdDesc || ''),
      _adjacentPanelAbilities: Array.isArray(snap._adjacentPanelAbilities) ? snap._adjacentPanelAbilities.slice() : [],
      _adjacentPanelEffectTexts: Array.isArray(snap._adjacentPanelEffectTexts) ? snap._adjacentPanelEffectTexts.slice() : [],
      _resonanceEffectNames: Array.isArray(snap._resonanceEffectNames) ? snap._resonanceEffectNames.slice() : [],
      _resonanceEffectScales: { ...(snap._resonanceEffectScales || {}) },
      _mapPanelPower: String(snap._mapPanelPower || ''),
      _uniteGroups: Array.isArray(snap._uniteGroups) ? snap._uniteGroups.slice() : [],
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
  // 盤面配列の持ち方は**PvE（コア）と同じ**にする。
  // すなわち「生きている体を左詰めで並べ、前衛／後衛は lane で区別する」。
  // 以前は前衛=0..6／後衛=7..13 の固定枠にしていたため、召喚の挿入位置も
  // 詰め直しもPvEと別の実装になり、戦闘中の召喚がA0の左へ出るなどの
  // 食い違いが出ていた。
  function _toField(units, side) {
    const front = [], rear = [];
    (units || []).forEach(u => {
      const cell = _fieldUnit(u, side);
      (cell.lane === 'rear' ? rear : front).push(cell);
    });
    const arr = front.slice(0, FRONT_SLOTS).concat(rear).slice(0, MAX_SLOTS);
    while (arr.length < MAX_SLOTS) arr.push(null);
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
  function _effectSourceName(ev, ctx) {
    const source = ctx && ctx.unitById ? ctx.unitById(ev.sourceId) : null;
    return (source && source.name) || (ev.sourceId ? String(ev.sourceId) : '効果');
  }
  // 演出側の陣営名。p1（自分）が味方、p2（相手）が敵。
  const _fxSide = side => (side === 'p1' ? 'ally' : 'enemy');
  const _sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

  // マナ閾値効果だけは、後続の stat_change / summon を
  // 専用VFXの逆再生開始まで進めない。単純な mana_gain には使わず、
  // 旧オフラインの演出境界だけをオンライン再生へ対応させる。
  async function _awaitManaReverseStart(unit, isEnemy) {
    if (!unit || typeof _captureUnitDamageRect !== 'function'
      || typeof playHitVfxAtRect !== 'function') {
      await _sleep(200);
      return;
    }
    let rect = null;
    for (let i = 0; i < 12 && !rect; i++) {
      rect = _captureUnitDamageRect(unit, isEnemy ? 'enemy' : 'ally');
      if (rect && rect.width > 0 && rect.height > 0) break;
      rect = null;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    if (!rect) { await _sleep(200); return; }
    let resolveReverse;
    const reverse = new Promise(resolve => { resolveReverse = resolve; });
    try {
      Promise.resolve(playHitVfxAtRect(rect, 0, {
        keywordEffect: 'マナ効果', gateMs: 0, hitDuration: 900,
        fadeDuration: 700, vfxScale: .5, spin: true,
        onFadeStart: resolveReverse,
      })).catch(resolveReverse);
      await Promise.race([reverse, _sleep(1100)]);
    } catch (_) {
      await _sleep(200);
    }
  }

  // 「どういう規則で見せるか」は battle/present.js が唯一の実装。ここへ書き戻さないこと。
  //   ・マナ効果VFXはキャラクターごとに1回だけ（別キャラの同時発動はそれぞれ再生する）
  //   ・同じキャラへの連続ダメージは数値が重ならないよう順番待ちにする
  let _manaCueGate = presentCreateOnceGate();
  // 能力変化の固有SE・固有VFXの重複単位。PvEの _flushCorePveHitEvents と同じ持ち方にする。
  //   ・SEは「発生元＋効果」につき1回
  //   ・VFXは「発生元＋効果＋対象」につき1回
  // PvEは1手ぶんの再生ごとに作り直すので、こちらもターンの頭で作り直す。
  // 命中音を二重に鳴らさないための印（まとめ鳴らし用）。
  let _damageSfxDone = new Set();
  // 同じ死亡を二重に演出しないための記録（PvEの deaths と同じ役目）。
  let _deathsDone = new Set();
  // 攻撃効果より前に始めておく攻撃モーション（25%地点で停止して待つ）。
  let _preAttack = null;
  // 手番の間を置くのは2手番目以降（戦闘の頭では待たない）。
  let _turnPlayed = false;
  let _effectStatCueKeys = new Set();
  let _effectStatVfxGate = presentCreateOnceGate();
  // 既定の間隔（PRESENT_DAMAGE_STAGGER_MS）で連続表示する。PvEと同じ規則。
  const _damageGate = presentCreateDamageGate();

  // G.allies/G.enemies は renderField が index 0..MAX_SLOTS-1 しか描画しない固定長の
  // スロット配列（_toField が new Array(MAX_SLOTS).fill(null) で作る）。ここで push すると
  // 末尾（14番目以降）へ入り、DOMスロットが作られない。するとそのユニットは
  // playAttackMotion() が fromEl を取れずに即returnするため、内部では攻撃しているのに
  // 画面上は何も起きず、「ずっと相手だけが攻撃している」ように見える。
  // 必ずレーン範囲内の空きスロットへ入れる（PvEの_summonPanelUnitToFrontと同じ考え方）。
  // 召喚体をどこへ入れるかは coreInsertSummonedUnit() が唯一の実装（PvEと同じ）。
  // 戦闘中の召喚は前衛の右端。対象指定がある場合だけその左右へ入れる。
  function _placeSummonedUnit(list, summoned, spec) {
    const live = list.filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul).length;
    if (live >= MAX_SLOTS) return false;
    coreInsertSummonedUnit(list, summoned, spec || {}, FRONT_SLOTS);
    // 配列は固定長で扱う（renderField が index 0..MAX_SLOTS-1 を描く）。
    while (list.length > MAX_SLOTS) list.pop();
    while (list.length < MAX_SLOTS) list.push(null);
    return true;
  }

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
    if (outcome !== 'p1' && outcome !== 'p2' && outcome !== 'draw') return;
    // オンラインの引き分け（相打ち）は、PvEの引き分け勝利ルートと同じ勝利演出を出す。
    const win = outcome !== 'p2';
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
    // 盤面の詰め直し・召喚の配置をPvEと同じコアの実装へ通すための印。
    // オンラインはサーバー（コア）が全て確定済みなので、再生側の旧経路は使わない。
    G._coreDrivenBattle = true;
    if (typeof showScreen === 'function') showScreen('battle');
    // オンライン対戦は通常の startBattle() を通らないため、戦闘用カウンターを
    // 画面へ入った直後に初期描画する（所持金・ライフ・マナ・生贄）。
    if (typeof updateHUD === 'function') updateHUD();
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
    G._coreDrivenBattle = false;
    G.allies = _saved.allies;
    G.enemies = _saved.enemies;
    G.phase = _saved.phase;
    // reward-screen-active はここでは戻さない。戻すと次のマス（街・塔）へ移る直前に
    // 編成画面が一瞬見える。次の遷移側（goToReward / _openWaveVillage）が必ず設定する。
    document.body.classList.toggle('battle-turn-active', _saved.turnActive);
    _saved = null;
  }

  // 攻撃モーションを開始する。paused=true なら25%地点で止め、release() で接触まで進める。
  // 攻撃効果を「少し動き出した時点」で見せるための仕組み（PvEと同じ扱い）。
  function _startAttackMotion(ev, ctx, paused) {
    const attacker = _find(ev.side, ev.attackerId);
    const target = _find(ev.side === 'p1' ? 'p2' : 'p1', ev.targetId);
    _lastAttacker = attacker;
    if (!attacker || !target || typeof playAttackMotion !== 'function') return null;
    const dmg = Math.max(0, Number(ev.damage) || 0);
    // attack.wav は従来どおり攻撃開始時に鳴らす。オンライン固有のタイミング変更はしない。
    if (dmg > 0 && typeof playSfx === 'function') {
      playSfx('attack', { group: 'combat', guardKey: 'combat:attack' });
    }
    let release = () => {};
    const held = paused ? new Promise(resolve => { release = resolve; }) : null;
    const motionDepthStarted = typeof beginBattleMotion === 'function';
    if (motionDepthStarted) beginBattleMotion();
    // PvEの通常攻撃と同じ尺・同じ接触揺れ。
    _motion = playAttackMotion(attacker, target, ev.side === 'p2', paused ? (() => held) : null, {
      ...PRESENT_ATTACK_MOTION,
      onHit: () => {
        // 接触の揺れだけをここで出す。
        // **数値・VFX・HPの反映は、モーションが終わってから後続イベントの順番どおりに出す。**
        // ここで先取りして出すと、間に挟まる能力変化（負傷など）の演出だけがあとへ回り、
        // 同じ盤面でも演出の並びがPvEと食い違う。
        if (typeof _shakeOnAttackContact === 'function') _shakeOnAttackContact(target, dmg);
      },
    });
    // PvEは攻撃モーションが完全に終わってからヒットSE・ダメージVFX・数値表示を出す。
    // 同じ契機にするため、呼び出し側はこの Promise を待つ。
    const motion = (async () => {
      try { await _awaitMotion(); }
      finally { if (motionDepthStarted) endBattleMotion(); }
    })();
    return { ev, motion, release };
  }

  // playback.js から呼ばれる。ctx.board は再生用の表示盤面（イベントで更新済み）。
  // 演出（モーション・VFX・SE・カットイン）はPvEと同じ関数を呼ぶ。
  // ダメージ値・死亡・勝敗はイベントに書かれた値をそのまま使い、ここでは判定しない。
  async function renderOnlineVersusBoard(ev, ctx) {
    if (typeof G === 'undefined' || !G) return;
    // 演出の再生中は盤面を詰めない・倒れたカードを消さない。
    // 規則も、そのフラグ自体も present.js が唯一の実装（PvEと同じものを使う）。
    presentBeginPlayback();
    try {
      await _renderOnlineVersusEvent(ev, ctx);
    } finally {
      presentEndPlayback();
    }
  }

  async function _renderOnlineVersusEvent(ev, ctx) {
    const board = (ctx && ctx.board) || { p1: [], p2: [] };
    if (presentBreaksManaRun(ev)) _manaCueGate = presentCreateOnceGate();
    if (ev.type === ONLINE_EVENT.TURN_BEGIN || ev.type === ONLINE_EVENT.BATTLE_START) {
      _effectStatCueKeys = new Set();
      _effectStatVfxGate = presentCreateOnceGate();
      _damageSfxDone = new Set();
      _deathsDone = new Set();
      if (ev.type === ONLINE_EVENT.BATTLE_START) _turnPlayed = false;
    }

    switch (ev.type) {
      case ONLINE_EVENT.BATTLE_START: {
        G.allies = _toField(board.p1, 'p1');
        G.enemies = _toField(board.p2, 'p2');
        // 血・マナは戦闘ごとに0から始まる。ここで戻さないと前の戦闘
        //（オフラインの旅を含む）の値が残り、開戦時にいきなり血が8あるように見える。
        G._blood = 0;
        G._enemyBlood = 0;
        if (typeof renderBattleCounters === 'function') renderBattleCounters();
        // 数値の順番待ちも戦闘をまたいで持ち越さない。
        if (_damageGate && typeof _damageGate.reset === 'function') _damageGate.reset();
        // 例外で抜けた回数が残ると、以後ずっと盤面が詰まらない。戦闘の頭で必ず戻す。
        presentResetPlayback();
        presentBeginPlayback();
        // 命中音の鳴り始めを揃える（PvEの startBattle と同じ）。
        if (typeof _warmBattleHitSfx === 'function') _warmBattleHitSfx();
        _render();
        // 開戦カットイン → 登場演出。PvEの startBattle() と同じ順番。
        if (typeof _playBattleStartIntro === 'function') {
          await _playBattleStartIntro({ title: '戦 闘 開 始', subtitle: _opponentLabel(), kind: 'normal' });
        }
        if (typeof playBattleOpeningSequence === 'function') await playBattleOpeningSequence();
        break;
      }
      case ONLINE_EVENT.TURN_BEGIN: {
        // 前の手番で保留していた盤面の詰めを、ここでまとめて流す。
        // これをしないと倒れた体が次の手番まで居座り、PvE（手番の終わりに詰める）と
        // 盤面の見え方が食い違う。手番の頭なので、出したばかりの数値を奪うこともない。
        if (G._pendingBattleCompact && typeof requestBattleCompact === 'function') {
          requestBattleCompact({ forceRender: true, forceDuringMotion: true });
        }
        // 1体の行動が終わってから次が動き出すまで、少し間を置く（PvEと同じ定数）。
        if (_turnPlayed) await _sleep(PRESENT_TURN_GAP_MS);
        _turnPlayed = true;
        // ── 攻撃効果は「少し動き出した時点」で見せる（PvEと同じ扱い）──
        // コアは攻撃効果を接触より先に解決するため、イベント列では
        //   [攻撃効果…] → attack → 接触ダメージ の順に並ぶ。
        // そのまま順に再生すると攻撃者が動く前に効果だけが出る
        // （アラッサスの薙ぎ払い、サイレンの全体ダメージ）。
        const evs = (ctx && ctx.events) || [];
        const from = Number(ctx && ctx.eventIndex);
        // 効果の発生元＝この手番で動いているキャラクター。
        // **最初のATTACKを掴んではいけない。** ミノタウロスの「負傷：直ちに攻撃する」の
        // ように効果の途中で別のキャラクターが割り込んで攻撃することがあり、それを
        // 先出しすると、動いていないキャラクターの効果が割り込み側の動きの上に出る。
        let atkEv = null, hasEffects = false, actorId = null;
        if (Number.isInteger(from)) {
          for (let i = from + 1; i < evs.length; i++) {
            const n = evs[i];
            if (!n) continue;
            if (n.type === ONLINE_EVENT.TURN_BEGIN || n.type === ONLINE_EVENT.BATTLE_END) break;
            if (n.type === ONLINE_EVENT.ATTACK) {
              if (actorId != null && String(n.attackerId) === actorId) { atkEv = n; break; }
              continue;
            }
            const src = n.type === 'sweep_vfx' ? n.unitId : n.sourceId;
            if (src == null) continue;
            if (n.type === ONLINE_EVENT.DAMAGE || n.type === 'sweep_vfx'
              || n.type === 'stat_change' || n.type === 'summon') {
              if (actorId == null) actorId = String(src);
              if (String(src) === actorId) hasEffects = true;
            }
          }
        }
        if (atkEv && hasEffects) _preAttack = _startAttackMotion(atkEv, ctx, true);
        break;
      }
      case ONLINE_EVENT.ATTACK: {
        if (_preAttack && _preAttack.ev === ev) {
          // 効果より前に始めておいたモーション。ここで接触まで進める。
          const held = _preAttack; _preAttack = null;
          held.release();
          await held.motion;
          break;
        }
        const started = _startAttackMotion(ev, ctx, false);
        if (started) await started.motion;
        break;
      }
      case ONLINE_EVENT.DAMAGE: {
        // 1件のダメージをどう見せるかは present_events.js が唯一の実装（PvEと同じ）。
        // ここでの違い（ユニットの引き方・HPの反映・先読みするイベント列）だけを渡す。
        // 表示はイベントの hpAfter をそのまま反映する（自前で引き算しない）。
        const shown = await presentDamageEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          findAnyUnit: id => _find('p1', id) || _find('p2', id),
          applyHp: (unit, hpAfter) => { unit.hp = Math.max(0, Number(hpAfter) || 0); },
          gate: _damageGate,
          sleep: _sleep,
          ownEffectText: typeof _ownCardEffectText === 'function' ? _ownCardEffectText : null,
          sfxDone: _damageSfxDone,
          // 連続するDAMAGEイベントが「同じ瞬間の命中」。ここまでをまとめて鳴らす。
          sfxBatch: e0 => {
            const evs = (ctx && ctx.events) || [];
            const from = Number(ctx && ctx.eventIndex);
            const out = [];
            for (let i = Number.isInteger(from) ? from : evs.indexOf(e0); i >= 0 && i < evs.length; i++) {
              const d = evs[i];
              if (!d || d.type !== ONLINE_EVENT.DAMAGE || !(Number(d.amount) > 0)) break;
              out.push(d);
            }
            return out;
          },
          alreadyShown: e0 => !!(ctx.visualizedDamageEvents && ctx.visualizedDamageEvents.has(e0)),
        });
        if (shown && ev.effect && typeof log === 'function') {
          const u = _find(ev.side, ev.unitId);
          log(`${_effectSourceName(ev, ctx)}の効果で${(u && u.name) || '対象'}に${Number(ev.amount) || 0}ダメージ。`,
            ev.side === 'p1' ? 'bad' : 'good');
        }
        break;
      }
      case 'mana_gain': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          // PvEのマナは色別ではない共有スカラー値。オンラインだけ別形状にすると
          // 戦闘中HUDとマナ閾値処理がずれるため、既存の更新経路を使う。
          const amount = Math.max(0, Number(ev.amount) || 0);
          G.mana = (typeof _ensureMana === 'function' ? Number(_ensureMana()) : Number(G.mana)) || 0;
          G.mana += amount;
          if (typeof renderManaHud === 'function') renderManaHud();
        }
        if (typeof updateHUD === 'function') updateHUD();
        break;
      }
      case 'gold_gain': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.gold = Math.max(0, Number(G.gold) || 0) + Math.max(0, Number(ev.amount) || 0);
        }
        if (typeof updateHUD === 'function') updateHUD();
        break;
      }
      case 'gold_spend': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.gold = Math.max(0, Number(G.gold) || 0) - Math.max(0, Number(ev.amount) || 0);
        }
        if (typeof updateHUD === 'function') updateHUD();
        break;
      }
      case 'stat_change': {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        // オンラインは実体の値がそのまま画面の値なので、ここで直接進める。
        await presentStatChangeEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          findAnyUnit: id => _find('p1', id) || _find('p2', id),
          applyStats: (unit, e0) => {
            unit.atk = Math.max(0, (Number(unit.atk) || 0) + (Number(e0.atk) || 0));
            unit.maxHp = Math.max(1, (Number(unit.maxHp || unit.hp) || 1) + (Number(e0.hp) || 0));
            unit.hp = Math.max(0, (Number(unit.hp) || 0) + (Number(e0.hp) || 0));
          },
          cueKeys: _effectStatCueKeys,
          vfxGate: _effectStatVfxGate,
          logLine: (unit) => {
            const detail = (Number(ev.atk) || 0) || (Number(ev.hp) || 0);
            return `${_effectSourceName(ev, ctx)}の効果で${unit.name || '対象'}が${detail >= 0 ? '+' : ''}${detail}変化。`;
          },
          render: _render,
        });
        break;
      }
      case 'keyword_effect': {
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        if (ev.effect === 'poison') u.poison = (Number(u.poison) || 0) + (Number(ev.amount) || 0);
        if (ev.effect === 'shield') u.shield = (Number(u.shield) || 0) + (Number(ev.amount) || 0);
        if (ev.effect === 'weaken') u.weaken = (Number(u.weaken) || 0) + (Number(ev.amount) || 0);
        if (ev.effect === 'evil_eye') {
          u.atk = Math.max(0, (Number(u.atk) || 0) - (Number(ev.amount) || 0));
        }
        if (ev.effect === 'keyword_gain' && ev.keyword && !(u.keywords || []).includes(ev.keyword)) {
          u.keywords = [...(u.keywords || []), ev.keyword];
        }
        if (ev.sourceId && typeof log === 'function') {
          log(`${_effectSourceName(ev, ctx)}の効果で${u.name || '対象'}に${ev.keyword || ev.effect}${ev.amount != null ? ` ${ev.amount}` : ''}。`, ev.side === 'p1' ? 'good' : 'bad');
        }
        _render();
        break;
      }
      case 'life_drain': {
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        u.hp = Math.min(Number(u.maxHp) || u.hp, (Number(u.hp) || 0) + (Number(ev.amount) || 0));
        updateUnitDamageUi(u, _fxSide(ev.side));
        break;
      }
      case 'mana_threshold': {
        // 間引きの規則は present_events.js が唯一の実装（PvEと同じ）。
        // オンラインはVFXの逆再生開始まで待ってから次のイベントへ進む。
        await presentManaThresholdEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          gate: _manaCueGate,
          playCue: (unit, isEnemySide) => _awaitManaReverseStart(unit, isEnemySide),
          onSkipped: () => _sleep(60),
        });
        _render();
        break;
      }
      case 'mana_set': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.mana = Math.max(0, Number(ev.amount) || 0);
          if (typeof renderManaHud === 'function') renderManaHud();
        }
        if (typeof updateHUD === 'function') updateHUD();
        break;
      }
      case 'seal_apply': {
        const u = _find(ev.side, ev.unitId);
        if (u) {
          u._sealed = true;
          // Infinity は Number(undefined) のフォールバックで1にせず、
          // 無限封印として表示・判定へ引き継ぐ。
          if (ev.value === 'infinite' || ev.value === '∞' || ev.value === Infinity) {
            u._sealValue = Infinity;
            u._sealInfinity = true;
          } else if (ev.value != null) {
            u._sealValue = Number(ev.value) || 1;
          }
          _render();
        }
        break;
      }
      case 'blood_set': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G._blood = Math.max(0, Number(ev.amount) || 0);
          if (typeof renderBattleCounters === 'function') renderBattleCounters();
        }
        break;
      }
      case 'revive': {
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        u.atk = Number(ev.atk) || u.atk; u.maxHp = Number(ev.maxHp) || u.maxHp; u.hp = Number(ev.hp) || u.hp;
        u._sealed = false; _render();
        break;
      }
      case 'shield_set': {
        const u = _find(ev.side, ev.unitId);
        if (u) { u.shield = Number(ev.amount) || 0; _render(); }
        break;
      }
      case 'shield_lost': {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        // 以前はここで再描画するだけで、SEもログも出ていなかった。
        presentShieldLostEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          logLine: u => `${u.name || '対象'}の結界がダメージを防いだ。`,
          render: _render,
        });
        break;
      }
      case 'ring_effect': {
        // 指輪効果の数値・対象はイベント列で確定済み。HUDだけ同期する。
        if (typeof updateHUD === 'function') updateHUD();
        break;
      }
      case 'death_summon_grant': {
        const u = _find(ev.side, ev.unitId);
        if (u) {
          u.effectData = { ...(u.effectData || {}), grantedDeathSummon: ev.summon || null };
          _render();
        }
        break;
      }
      case 'life_set': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.life = Math.max(0, Number(ev.amount) || 0);
          if (typeof updateHUD === 'function') updateHUD();
        }
        break;
      }
      case 'life_gain': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.life = Math.max(0, Number(G.life) || 0) + Math.max(0, Number(ev.amount) || 0);
          if (typeof updateHUD === 'function') updateHUD();
        }
        break;
      }
      case 'instant_death':
      case 'curse_death': {
        const u = _find(ev.side, ev.unitId);
        if (u) { u.hp = 0; _render(); }
        break;
      }
      case 'item_reward': {
        if (ev.side === 'p1' && ev.item && typeof G !== 'undefined' && G) {
          G.spellSlots = Array.isArray(G.spellSlots) ? G.spellSlots : new Array(4).fill(null);
          const index = G.spellSlots.findIndex(x => !x);
          if (index >= 0) G.spellSlots[index] = { ...ev.item };
          if (typeof updateHUD === 'function') updateHUD();
        }
        break;
      }
      case 'bonus_reward': {
        if (ev.side === 'p1' && ev.unit && typeof _queueBonusRewardPanel === 'function') {
          _queueBonusRewardPanel(ev.unit);
        }
        break;
      }
      case 'summon': {
        // 配置と描画の契機は present_events.js が唯一の実装（PvEと同じ規則）。
        presentSummonPlacement(ev, {
          list: side => (side === 'p1' ? G.allies : G.enemies),
          hasUnit: (list, id) => list.some(x => x && String(x.id) === String(id)),
          place: (list, unit, spec) => _placeSummonedUnit(list, unit, spec),
          hasDom: (unit, side) => !!(unit && unit.id != null && document.querySelector(
            `#${side === 'p2' ? 'f-enemy' : 'f-ally'} .slot[data-unit-id="${String(unit.id).replace(/"/g, '\\"')}"]`)),
          compact: force => {
            if (typeof requestBattleCompact !== 'function') { _render(); return; }
            requestBattleCompact(force ? { forceRender: true, forceDuringMotion: true } : { forceRender: true });
          },
          render: _render,
          logLine: unit => `${_effectSourceName(ev, ctx)}の効果で${(unit && unit.name) || 'ユニット'}を召喚。`,
        });
        break;
      }
      case 'sweep_vfx': {
        // 薙ぎ払い（アラッサス）。見せ方は presentSweepAttack() が唯一の実装（PvEと同じ）。
        // このイベントの直後に、対象ごとのDAMAGEが並ぶ。炎が当たった瞬間に
        // その対象の数値を出し、通常の被弾演出では出し直さない。
        const source = _find(ev.side, ev.unitId);
        const targetSide = ev.side === 'p1' ? 'p2' : 'p1';
        const targets = (ev.targetIds || []).map(id => _find(targetSide, id)).filter(Boolean);
        if (!source || !targets.length || typeof presentSweepAttack !== 'function') break;
        const events = (ctx && ctx.events) || [];
        const start = Number(ctx && ctx.eventIndex);
        const byTarget = new Map();
        if (Number.isInteger(start)) {
          for (let i = start + 1; i < events.length; i++) {
            const next = events[i];
            if (!next || next.type === ONLINE_EVENT.ATTACK || next.type === ONLINE_EVENT.TURN_BEGIN
              || next.type === ONLINE_EVENT.BATTLE_END) break;
            if (next.type !== ONLINE_EVENT.DAMAGE) continue;
            const key = `${next.side}:${next.unitId}`;
            if (!byTarget.has(key)) byTarget.set(key, next);
          }
        }
        await presentSweepAttack(source, ev.side === 'p2', targets,
          target => byTarget.get(`${targetSide}:${target.id}`),
          (target, d) => {
            if (!d) return;
            const hurt = _find(d.side, d.unitId);
            if (hurt) hurt.hp = Math.max(0, Number(d.hpAfter) || 0);
            if (ctx.visualizedDamageEvents) ctx.visualizedDamageEvents.add(d);
          });
        break;
      }
      case 'transform': {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        presentTransformEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          setForm: (unit, e0) => {
            unit.name = e0.name || unit.name;
            unit.atk = Number(e0.atk) || unit.atk;
            unit.maxHp = Number(e0.maxHp) || unit.maxHp;
            unit.hp = Number(e0.hp) || unit.hp;
          },
          render: _render,
        });
        break;
      }
      case ONLINE_EVENT.SACRIFICE: {
        // 生贄で破棄される。PvEと同じ破棄演出を使う。
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        await _awaitMotion();
        if (typeof playSacrificeDestroyVfx === 'function') {
          let removedAtReverse=false;
          await playSacrificeDestroyVfx(u, _fxSide(ev.side), () => {
            u.hp=0;
            removedAtReverse=true;
            if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true});
          });
          if(!removedAtReverse) u.hp=0;
        } else {
          u.hp=0;
        }
        if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true});
        else _render();
        break;
      }
      case ONLINE_EVENT.SEAL_RELEASE: {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        await _awaitMotion();
        await presentSealReleaseEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          logLine: u => `${u.name || '対象'}の封印が解放された。`,
          compact: () => {
            if (typeof requestBattleCompact === 'function') requestBattleCompact({ forceRender: true });
            else _render();
          },
        });
        break;
      }
      case ONLINE_EVENT.FLED: {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        await presentFledEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          removeFromBoard: (unit, side) => {
            const list = side === 'p1' ? G.allies : G.enemies;
            const index = (list || []).indexOf(unit);
            if (index >= 0) list[index] = null;
          },
          compact: () => {
            if (typeof requestBattleCompact === 'function') requestBattleCompact({ forceRender: true });
            else _render();
          },
        });
        break;
      }
      case ONLINE_EVENT.DEATH: {
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        // 焼失演出は renderField が死亡ユニットに対して自分で流す。
        await _awaitMotion();
        await presentDeathEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          isDone: e0 => _deathsDone.has(`${e0.side}:${e0.unitId}`),
          markDone: e0 => _deathsDone.add(`${e0.side}:${e0.unitId}`),
          beat: () => _sleep(PRESENT_HIT_BEAT_MS),
          // 陣営ごとの後始末はサーバーが確定済み。オンラインでは何もしない。
          compact: () => {
            if (typeof requestBattleCompact === 'function') requestBattleCompact({ forceRender: true });
            else _render();
          },
        });
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
