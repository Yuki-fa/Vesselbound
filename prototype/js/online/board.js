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
  // 攻撃効果より前に始めておく攻撃モーション（25%地点で停止して待つ）。
  let _preAttack = null;
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
      stopRatio: .25, firstDuration: 260, secondDuration: 360, returnDuration: 420,
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
        // ── 攻撃効果は「少し動き出した時点」で見せる（PvEと同じ扱い）──
        // コアは攻撃効果を接触より先に解決するため、イベント列では
        //   [攻撃効果…] → attack → 接触ダメージ の順に並ぶ。
        // そのまま順に再生すると攻撃者が動く前に効果だけが出る
        // （アラッサスの薙ぎ払い、サイレンの全体ダメージ）。
        const evs = (ctx && ctx.events) || [];
        const from = Number(ctx && ctx.eventIndex);
        let atkEv = null, hasEffects = false;
        if (Number.isInteger(from)) {
          for (let i = from + 1; i < evs.length; i++) {
            const n = evs[i];
            if (!n) continue;
            if (n.type === ONLINE_EVENT.TURN_BEGIN || n.type === ONLINE_EVENT.BATTLE_END) break;
            if (n.type === ONLINE_EVENT.ATTACK) { atkEv = n; break; }
            if (n.type === ONLINE_EVENT.DAMAGE || n.type === 'sweep_vfx'
              || n.type === 'stat_change' || n.type === 'summon') hasEffects = true;
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
        // 表示はイベントの hpAfter をそのまま反映（自前で引き算しない）
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        const side = _fxSide(ev.side);
        // 同じキャラへ続けてダメージが来たときは、前の数値が消えてから次を出す。
        // 規則は present.js が唯一の実装（PvEと同じ）。対象が違えば待たない。
        if (Number(ev.amount) > 0) {
          // 予約はPvEと同じ表（present.js が共有）。鍵はユニットIDで揃える。
          const waitMs = _damageGate.reserve(`u:${u.id}`);
          if (waitMs > 0) await _sleep(waitMs);
        }
        u.hp = Math.max(0, Number(ev.hpAfter) || 0);
        // 通常攻撃の対象側はATTACKの接触時に演出を開始済み。反撃は独立したDAMAGE
        // イベントなので、攻撃した側にも同じ命中SE・VFX・ダメージ値を出す。
        // 固有VFXを誰の効果として出すかは present.js が唯一の実装（PvEと同じ規則）。
        const _dmgSourceSide = ev.side === 'p1' ? 'p2' : 'p1';
        const _dmgSource = ev.sourceId ? (_find(_dmgSourceSide, ev.sourceId) || _find(ev.side, ev.sourceId)) : null;
        const _vfxSource = presentDamageVfxSource(ev, u, _dmgSource,
          typeof _ownCardEffectText === 'function' ? _ownCardEffectText : null);
        const _vfxOpt = {
          keywordEffect: ev.keywordEffect || undefined,
          ...(_vfxSource ? { effectSource: _vfxSource } : {}),
        };
        // **ひとまとまりの命中音は同時に鳴らす（PvEと同じ）。**
        // 攻撃と反撃のように続けて起きる命中を1件ずつ鳴らすと、間に挟まるVFXの
        // 画像デコード（数百ms主スレッドが止まる）で音がずれて聞こえる。
        // 連続するDAMAGEの音は、最初の1件を出す時にまとめて鳴らす。
        if (Number(ev.amount) > 0 && !_damageSfxDone.has(ev) && typeof playAttackDamageSfx === 'function') {
          const evs = (ctx && ctx.events) || [];
          const from = Number(ctx && ctx.eventIndex);
          for (let i = Number.isInteger(from) ? from : evs.indexOf(ev); i >= 0 && i < evs.length; i++) {
            const d = evs[i];
            if (!d || d.type !== ONLINE_EVENT.DAMAGE || !(Number(d.amount) > 0)) break;
            if (_damageSfxDone.has(d)) continue;
            _damageSfxDone.add(d);
            const src = d.sourceId
              ? (_find(d.side === 'p1' ? 'p2' : 'p1', d.sourceId) || _find(d.side, d.sourceId)) : null;
            playAttackDamageSfx(src, d.amount);
          }
        }
        if (Number(ev.amount) > 0
          && !(ctx.visualizedDamageEvents && ctx.visualizedDamageEvents.has(ev))
          && typeof playHitVfx === 'function') {
          playHitVfx(side, u, ev.amount, _vfxOpt);
        }
        if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(u, side);
        if (ev.effect && typeof log === 'function') {
          log(`${_effectSourceName(ev, ctx)}の効果で${u.name || '対象'}に${Number(ev.amount) || 0}ダメージ。`, ev.side === 'p1' ? 'bad' : 'good');
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
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        u.atk = Math.max(0, (Number(u.atk) || 0) + (Number(ev.atk) || 0));
        u.maxHp = Math.max(1, (Number(u.maxHp || u.hp) || 1) + (Number(ev.hp) || 0));
        u.hp = Math.max(0, (Number(u.hp) || 0) + (Number(ev.hp) || 0));
        if (ev.sourceId && typeof log === 'function') {
          const detail = (Number(ev.atk) || 0) || (Number(ev.hp) || 0);
          log(`${_effectSourceName(ev, ctx)}の効果で${u.name || '対象'}が${detail >= 0 ? '+' : ''}${detail}変化。`, ev.side === 'p1' ? 'good' : 'bad');
        }
        // 負傷などの能力変化にも、発生元カードの固有VFXを出す。
        // どの理由で出すか・何回出すかは present.js が唯一の実装（PvEと同じ規則）。
        if (presentStatChangeVfxAllowed(ev)
          && typeof _playCardEffectVfx === 'function' && typeof _effectPresentationCode === 'function') {
          const src = _find('p1', ev.sourceId) || _find('p2', ev.sourceId);
          const code = src ? String(_effectPresentationCode(src) || '') : '';
          if (/^C\d{3}$/i.test(code)) {
            const cueKey = `${src.id}:${String(ev.reason || '')}`;
            if (!_effectStatCueKeys.has(cueKey)) {
              _effectStatCueKeys.add(cueKey);
              if (typeof _playCardEffectSfx === 'function') _playCardEffectSfx(code.toUpperCase());
            }
            if (_effectStatVfxGate.shouldPlay(`${cueKey}:${u.id}`)) {
              await _playCardEffectVfx(code, [u], { gateMs: 0, hitDuration: 700 });
            }
          }
        }
        _render();
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
        const source = _find(ev.side, ev.unitId);
        if (!_manaCueGate.shouldPlay(`${ev.side}:${ev.unitId}`)) { await _sleep(60); _render(); break; }
        await _awaitManaReverseStart(source, ev.side === 'p2');
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
        // 結界消失後の追加効果はコアが既に解決済み。ここではPvEと同じ最新盤面を描く。
        _render();
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
        let layoutChanged=false;
        if (ev.unit) {
          const list = ev.side === 'p1' ? G.allies : G.enemies;
          if (list && !list.some(x => x && String(x.id) === String(ev.unit.id))) {
            const liveCount = list.filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul).length;
            // サーバーイベントに誤って上限超過が含まれても、表示アダプタが
            // 余分なユニットをDOMへ入れて一時的に左端へ出さない。
            if (liveCount < MAX_SLOTS) {
              const summoned = { ...ev.unit };
              const frontCount = list.filter(x => x && x.hp > 0 && x.lane !== 'rear' && !x._isObject && !x._isSoul).length;
              // 前衛7枠が埋まっても陣営上限14体までは後衛へ送る。
              if (frontCount >= FRONT_SLOTS) summoned.lane = 'rear';
              // 位置指定はイベントの値を**そのまま**渡す。左右の解釈はコアが持つ。
              // 発生元IDで補ってはいけない。コアは placementTargetId が無ければ
              // 前衛の右端へ入れる規則で、補うと同時召喚の並びが逆になる。
              const spec = { placement: ev.placement || '',
                placementTargetId: ev.placementTargetId != null ? ev.placementTargetId : null };
              if (_placeSummonedUnit(list, summoned, spec)) layoutChanged = true;
            }
          }
        }
        if (ev.sourceId && typeof log === 'function') log(`${_effectSourceName(ev, ctx)}の効果で${ev.unit.name || 'ユニット'}を召喚。`, ev.side === 'p1' ? 'good' : 'bad');
        // 人数変化はPvEと同じ共通FLIP経路へ通す。単純なrenderField()では
        // 新しい中央寄せ位置へ瞬間移動し、オンラインだけ詰め移動が失われる。
        // 召喚体にまだDOMが無い場合だけ、攻撃モーション中でも描画を進める（PvEと同じ規則）。
        // 保留したままだと、次に死亡イベントが来るまで召喚体が画面に現れない。
        // 逆に常に割り込むと、飛行中の複製の戻り先が動いてカードが二重に見える。
        const _summonHasDom = !!(ev.unit && ev.unit.id != null && document.querySelector(
          `#${ev.side === 'p2' ? 'f-enemy' : 'f-ally'} .slot[data-unit-id="${String(ev.unit.id).replace(/"/g, '\\"')}"]`));
        if(layoutChanged&&typeof requestBattleCompact==='function') requestBattleCompact(
          _summonHasDom?{forceRender:true}:{forceRender:true,forceDuringMotion:true});
        else _render();
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
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        if (ev.unit) Object.assign(u, ev.unit);
        else {
          u.name = ev.name || u.name; u.atk = Number(ev.atk) || u.atk;
          u.maxHp = Number(ev.maxHp) || u.maxHp; u.hp = Number(ev.hp) || u.hp;
        }
        _render();
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
        // 封印の解放。PvEと同じ解放演出を使う。
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        await _awaitMotion();
        u._sealed = false;
        if (typeof playSealReleaseVfx === 'function') {
          await playSealReleaseVfx(u, _fxSide(ev.side));
        }
        if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true});
        else _render();
        break;
      }
      case ONLINE_EVENT.FLED: {
        // ATKが0になったキャラクターの逃走。死亡ではないので死亡効果は出ない。
        // 演出はPvEと同じ playFledVfx()（FLEDを1文字ずつ落として消えてから退場）。
        const unit = _find(ev.side, ev.unitId);
        if (unit) {
          unit._fled = true;
          if (typeof playFledVfx === 'function') {
            try { await playFledVfx(ev.side === 'p1' ? 'ally' : 'enemy', unit); }
            catch (err) { console.error('[online fled vfx]', err); }
          }
          const list = ev.side === 'p1' ? G.allies : G.enemies;
          const index = (list || []).indexOf(unit);
          if (index >= 0) list[index] = null;
          if (typeof requestBattleCompact === 'function') requestBattleCompact({ forceRender: true });
          else _render();
        }
        break;
      }
      case ONLINE_EVENT.DEATH: {
        // 同じ接触で発生した死亡イベントは、次の攻撃／ターンへ進む前にまとめて
        // HP0へしてから一度だけ再描画する。これで相打ち時も両者の死亡演出が同時に始まる。
        const deaths = [ev];
        const events = (ctx && ctx.events) || [];
        const start = Number(ctx && ctx.eventIndex);
        if (Number.isInteger(start)) {
          for (let i = start + 1; i < events.length; i++) {
            const next = events[i];
            if (next.type === ONLINE_EVENT.ATTACK || next.type === ONLINE_EVENT.TURN_BEGIN
              || next.type === ONLINE_EVENT.BATTLE_END) break;
            if (next.type !== ONLINE_EVENT.DAMAGE && next.type !== ONLINE_EVENT.DEATH) break;
            if (next.type === ONLINE_EVENT.DEATH) deaths.push(next);
          }
        }
        // ここまでで数値・VFXは出し終えている。カードを残す理由がないので、
        // 再生中でも焼き落としを始めてよい印を付ける（PvEの死亡ループと同じ）。
        deaths.forEach(d => {
          const unit = _find(d.side, d.unitId);
          if (unit) { unit.hp = 0; unit._deathFxReady = true; }
        });
        // 焼失演出は renderField が死亡ユニットに対して自分で流す。
        await _awaitMotion();
        // 直前に出した数値が読める間だけ待つ（PvEと同じ定数・同じ意図）。
        await _sleep(PRESENT_HIT_BEAT_MS);

        // 死亡で人数が変わった場合も、単純再描画ではなくPvEと同じ
        // compactBattleUnits + FLIP経路を通して残存キャラを詰める。
        // 数値を出し終えているので詰めてよいが、**攻撃モーションの完了は待つ**。
        // 飛行中に盤面を詰めると、複製の戻り先が動いて元のカードが二重に見える。
        if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true});
        else _render();
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
