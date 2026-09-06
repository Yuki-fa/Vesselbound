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
      manaThresholdNo: String(snap.manaThresholdNo || ''),
      manaThresholdOrder: snap.manaThresholdOrder,
      manaOrder: snap.manaOrder,
      fxCode: String(snap.fxCode || ''),
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
  // 逆再生開始からは、その効果自身のVFX（活性化＝E045）へ引き継ぐ。
  // ひと続きのマナ効果で走っている演出。**同時に1組だけ**（PvEの持ち方と同じ）。
  let _manaEffectVfx = [];
  let _manaEffectCueDone = null;
  // いま演出を出している効果の番号。**別の効果はこれが終わるまで始めない。**
  let _manaEffectCurrentCode = '';
  const _manaEffectRunning = () => _manaEffectVfx.length > 0 || !!_manaEffectCueDone;
  const _manaCueVfxMs = () => (typeof MANA_CUE_VFX_MS === 'number' && MANA_CUE_VFX_MS) || 900;
  const _manaRunGap = () => (typeof PRESENT_MANA_RUN_GAP_MS === 'number' && PRESENT_MANA_RUN_GAP_MS) || 150;
  // ひと続きのマナ効果の演出を終わらせる。**次の効果はこれを終えてから始める。**
  async function _endManaEffectRun() {
    const vfx = _manaEffectVfx; _manaEffectVfx = [];
    const cueDone = _manaEffectCueDone; _manaEffectCueDone = null;
    _manaEffectCurrentCode = '';
    if (vfx.length) await Promise.all(vfx.map(v => v.stop()));
    if (cueDone) await Promise.race([cueDone, _sleep(_manaCueVfxMs() + 700)]);
  }
  // 効果1回ぶんの合図（PvEと同じ規則）。**SEは発動回数ぶん**、
  // **VFXはひと続きの処理が終わるまで**出し続ける（最初の1回でだけ始める）。
  // 固有の素材が無い効果では何も鳴らさない・出さない。
  function _playManaEffectPulse(list, effectNo) {
    // バフの演出（S005〜S009）は**能力変化を受けた対象の上**に出す（PvEと同じ規則）。
    if (typeof presentIsBuffVfxCode === 'function' && presentIsBuffVfxCode(effectNo)) return;
    const sfxKey = (typeof getEffectSfxKey === 'function' && getEffectSfxKey(effectNo)) || '';
    if (sfxKey && typeof playSfx === 'function') {
      playSfx(sfxKey, { group: 'magic', guardKey: `mana-effect:${typeof uid === 'function' ? uid() : Math.random()}`, guardMs: 0 });
    }
    if (_manaEffectVfx.length || !effectNo || typeof playEffectVfxOnUnit !== 'function') return;
    list.forEach(({ unit, isEnemySide, rect }) => {
      // **合図（K023）と同じ位置から出す**（PvEと同じ）。掴み直すと、
      // 攻撃モーションの複製カードが既に消えていて盤面の定位置へ戻ってしまう。
      const v = playEffectVfxOnUnit(unit, isEnemySide ? 'enemy' : 'ally', effectNo,
        { rect, minDurationMs: (typeof PRESENT_EFFECT_VFX_MIN_MS === 'number' && PRESENT_EFFECT_VFX_MIN_MS) || 900 });
      if (v) _manaEffectVfx.push(v);
    });
  }
  // 発生元から対象へ飛ぶ効果（炎の矢）の1回ぶん。**発射は少しずつずらす。**
  // 着弾した矢から順に、着弾VFX・着弾SE・ダメージ数値を出す（PvEと同じ規則）。
  async function _playManaEffectProjectiles(list, effectNo, opt) {
    const stagger = (typeof PRESENT_PROJECTILE_STAGGER_MS === 'number' && PRESENT_PROJECTILE_STAGGER_MS) || 90;
    const sfxKey = (typeof getEffectSfxKey === 'function' && getEffectSfxKey(effectNo)) || '';
    const shots = [];
    list.forEach(({ unit, isEnemySide, targets }) => {
      (targets || []).forEach(t => shots.push({
        from: unit, fromSide: isEnemySide ? 'enemy' : 'ally',
        to: t.unit, toSide: t.isEnemySide ? 'enemy' : 'ally', ev: t.ev,
        keywordEvents: t.keywordEvents || [],
      }));
    });
    if (!shots.length) { _playManaEffectPulse(list, effectNo); return; }
    await Promise.all(shots.map(async (shot, i) => {
      if (i) await _sleep(stagger * i);
      if (sfxKey && typeof playSfx === 'function') {
        playSfx(sfxKey, { group: 'magic', guardKey: `mana-effect:${typeof uid === 'function' ? uid() : Math.random()}`, guardMs: 0 });
      }
      if (opt && typeof opt.markShown === 'function') opt.markShown(shot.ev);
      // 毒牙などのキーワード演出も、この矢の着弾で1回ずつ出す（PvEと同じ規則）。
      (shot.keywordEvents || []).forEach(kw => {
        if (opt && typeof opt.markKeywordShown === 'function') opt.markKeywordShown(kw);
      });
      await playProjectileEffectVfx(shot.from, shot.fromSide, shot.to, shot.toSide, effectNo, {
        amount: Math.max(0, Number(shot.ev && shot.ev.amount) || 0),
        onImpact: () => {
          if (opt && typeof opt.onImpact === 'function') opt.onImpact(shot.to, shot.ev);
          (shot.keywordEvents || []).forEach(kw => {
            if (opt && typeof opt.playKeyword === 'function') opt.playKeyword(kw);
          });
        },
      });
    }));
  }
  // units：同じ瞬間に同じ効果が発動する全員（[{unit,isEnemySide}]）。**1体ずつ順に見せない。**
  // opt.repeat：同じ効果の2回目以降。**間引かず高速で繰り返す。**
  // マナ効果VFX（K023）とSE（K023）はその効果につき最初の1回だけ。その逆再生開始から先は
  // 効果固有のVFXを処理が終わるまで出し続け、SEを発動回数ぶん鳴らす（PvEと同じ規則）。
  async function _awaitManaReverseStart(units, opt) {
    const list = (Array.isArray(units) ? units : []).filter(x => x && x.unit);
    if (!list.length) return;
    const repeat = !!(opt && opt.repeat);
    const effectNo = String((opt && opt.effectNo) || '');
    // **素材はシートの「VFX/SE」列で引く**（PvEと同じ）。effectNo は演出の区切り用。
    const fxCode = typeof _effectFxCodeByNo === 'function' ? _effectFxCodeByNo(effectNo) : effectNo;
    const gap = _manaRunGap();
    // 発生元から対象へ飛ぶ効果は、飛ばして着弾まで見せる（発射はずらす）。
    const projectile = typeof presentIsProjectileEffect === 'function' && presentIsProjectileEffect(effectNo);
    // **別の効果の演出が出ている間は、VFXもSEも始めない**（PvEと同じ）。
    if (_manaEffectRunning() && _manaEffectCurrentCode !== effectNo) await _endManaEffectRun();
    if (repeat) {
      _manaEffectCurrentCode = effectNo;
      if (projectile) await _playManaEffectProjectiles(list, fxCode, opt);
      else _playManaEffectPulse(list, fxCode);
      await _sleep(gap);
      return;
    }
    // 直前の効果の演出を終わらせてから始める。異なる効果を同じ画面に重ねない。
    await _endManaEffectRun();
    // **`_endManaEffectRun()` は「今出している効果」の印を消す。** 印を付けるのはこの後。
    _manaEffectCurrentCode = effectNo;
    // マナ効果SEはひと続きにつき1回だけ。
    if (typeof playSfx === 'function') {
      playSfx('K023', { group: 'magic', guardKey: `mana-effect:${typeof uid === 'function' ? uid() : Math.random()}`, guardMs: 0 });
    }
    let pulsed = false;
    let pulsedAt = 0;
    let projectileDone = null;
    // 合図（K023）を出した位置。**効果固有のVFXも同じ位置から出す**（PvEと同じ）。
    let cueTargets = null;
    const startPulse = () => {
      if (pulsed) return; pulsed = true;
      pulsedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const pulseList = cueTargets && cueTargets.length ? cueTargets : list;
      if (projectile) projectileDone = _playManaEffectProjectiles(pulseList, fxCode, opt);
      else _playManaEffectPulse(pulseList, fxCode);
    };
    if (typeof _captureUnitDamageRect !== 'function' || typeof playHitVfxAtRect !== 'function') {
      await _sleep(200);
      startPulse();
      return;
    }
    // マナ効果の合図も「今そのキャラクターが見えている位置」から出す（PvEと同じ）。
    const rectOf = ({ unit, isEnemySide }) => (typeof _captureUnitEffectRect === 'function'
      ? _captureUnitEffectRect(unit, isEnemySide ? 'enemy' : 'ally')
      : _captureUnitDamageRect(unit, isEnemySide ? 'enemy' : 'ally'));
    let lead = null;
    for (let i = 0; i < 12 && !lead; i++) {
      const r = rectOf(list[0]);
      if (r && r.width > 0 && r.height > 0) { lead = r; break; }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const targets = list.map(x => ({ ...x, rect: x === list[0] ? lead : rectOf(x) }))
      .filter(x => x.rect && x.rect.width > 0 && x.rect.height > 0);
    cueTargets = targets;
    if (!targets.length) { await _sleep(200); startPulse(); return; }
    const vfxMs = _manaCueVfxMs();
    let resolveReverse;
    const reverse = new Promise(resolve => { resolveReverse = resolve; });
    const onReverse = () => { startPulse(); resolveReverse(); };
    try {
      // 完了は保持だけしておく。**待つのは次の効果を始める時**（_endManaEffectRun）。
      _manaEffectCueDone = Promise.all(targets.map(({ unit, isEnemySide, rect }) =>
        Promise.resolve(playHitVfxAtRect(rect, 0, {
          keywordEffect: 'マナ効果', keywordSfx: false, gateMs: 0, hitDuration: vfxMs,
          fadeDuration: 700, vfxScale: .5, spin: true, waitForFinish: true,
          getRect: () => rectOf({ unit, isEnemySide }),
          // 逆再生開始＝ここから効果固有の演出へ引き継ぎ、効果の処理を進める。
          onFadeStart: onReverse,
        })).catch(() => onReverse())));
      await Promise.race([reverse, _sleep(vfxMs)]);
      startPulse();
      // 飛ばす効果は着弾まで待つ（着弾でダメージ数値を出すため）。
      if (projectileDone) await projectileDone;
      // **間隔は「1回目を出した時刻」から測る**（PvEと同じ）。
      const sincePulse = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - pulsedAt;
      await _sleep(Math.max(0, gap - (pulsedAt ? sincePulse : 0)));
    } catch (_) {
      await _sleep(200);
      startPulse();
    }
  }

  // 「どういう規則で見せるか」は battle/present.js が唯一の実装。ここへ書き戻さないこと。
  //   ・マナ効果は発動回数ぶん見せる（同じキャラクターの2回目以降は高速で繰り返す）
  //   ・同じキャラへの連続ダメージは数値が重ならないよう順番待ちにする
  let _manaCueGate = presentCreateOnceGate();
  // 同じ瞬間（同じ発動回）に同じ効果が乗る分は、1体目の演出でまとめて見せる。
  let _manaWaveGate = presentCreateOnceGate();
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
    if (outcome !== 'p1' && outcome !== 'p2' && outcome !== 'draw') return;
    // 「いつ・どのSEで・どの尺で出すか」は present_events.js が唯一の実装（PvEと同じ）。
    // オンラインの引き分け（相打ち）は、PvEの引き分け勝利ルートと同じ勝利演出を出す。
    await presentBattleResultCutin({
      win: outcome !== 'p2',
      // ボス撃破の概念はオンラインには無い。
      bossWin: false,
      // オンラインに撤退は無い。負けは「敗北」と出す。
      withdraw: false,
      defeatLabel: '敗北',
      // 「進む」ボタンは出さず、本来ボタンが出る時刻の1秒後に、
      // **ボタンを押したのと同じ経路**で自動的に進む（フェードも尺も同一）。
      afterShown: overlay => new Promise(resolve => {
        if (typeof _armBattleContinue !== 'function') { resolve(); return; }
        // 暗転はこちらで保つ。進行処理側で外すと、画面が切り替わる前に
        // 盤面が一瞬明るく見える。切り替えが済んでから外す。
        G._battleFadeHeldByCaller = true;
        _armBattleContinue(overlay, () => {
          document.body.classList.remove('battle-victory-pending');
          resolve();
        }, { withButton: false, autoMs: PRESENT_RESULT_AUTO_CONTINUE_MS });
      }),
    });
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
    // 暗転は「画面が切り替わった後」に外す。ここで即座に外すと、盤面が
    // まだ見えている状態で明るくなってしまう（決着後に一瞬明るくなる原因）。
    const _clearFades = () => {
      ['battle-end-fade', 'battle-transition-fade'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('is-visible', 'is-final');
        el.removeAttribute('style');
      });
      if (typeof G !== 'undefined' && G) G._battleFadeHeldByCaller = false;
    };
    const host = document.getElementById('scr-battle');
    if (host) host.classList.remove('battle-opening-pending', 'battle-opening-active', 'battle-start-playing', 'battle-start-no-effect');
    // 盤面を戻し終えてから暗転を外す。次のマスの入場演出が暗転を引き継ぐ場合は
    // そちらに任せる（村・祭壇へ入る時）。**どの経路で抜けても必ず外す。**
    const _scheduleClear = () => requestAnimationFrame(() => {
      if (typeof G !== 'undefined' && G && G._villageIntroPlaying) return;
      _clearFades();
    });
    if (typeof G === 'undefined' || !G || !_saved) { _scheduleClear(); return; }
    G._coreDrivenBattle = false;
    G.allies = _saved.allies;
    G.enemies = _saved.enemies;
    G.phase = _saved.phase;
    // reward-screen-active はここでは戻さない。戻すと次のマス（街・塔）へ移る直前に
    // 編成画面が一瞬見える。次の遷移側（goToReward / _openWaveVillage）が必ず設定する。
    document.body.classList.toggle('battle-turn-active', _saved.turnActive);
    _saved = null;
    _scheduleClear();
  }

  // 接触の瞬間に出す攻撃範囲の演出（貫通・三方向攻撃・全体攻撃）。
  // コアは attack_contact_vfx を attack より前に出す。ここで持っておき、
  // 攻撃モーションが対象へ接触した瞬間（onContact）に鳴らす。**PvEと同じ規則。**
  // 矢の着弾で出したキーワード演出（毒牙など）。イベント順では出し直さない。
  const _keywordShownEvents = new Set();
  let _pendingContactVfx = null;
  // 貫通だけは「絵が通り過ぎた瞬間」に数値を出す（PvEと同じ規則）。
  const _contactHolds = new Map();
  function _releaseContactHold(unit) {
    if (!unit) return;
    const key = `${unit.side || ''}:${unit.id}`;
    const hold = _contactHolds.get(key);
    if (hold) { _contactHolds.delete(key); hold.release(); }
  }
  async function _awaitContactHold(ev) {
    const key = `${(ev && ev.side) || ''}:${ev && ev.unitId}`;
    const hold = _contactHolds.get(key);
    if (!hold) return;
    await Promise.race([hold.promise, _sleep(900)]);
    _contactHolds.delete(key);
  }
  function _releaseAllContactHolds() {
    _contactHolds.forEach(h => h.release());
    _contactHolds.clear();
  }
  function _firePendingContactVfx() {
    const ev = _pendingContactVfx;
    if (!ev) return;
    _pendingContactVfx = null;
    // **待たない。** 待つと複数対象のダメージ数値の出る時刻がずれる。
    try {
      presentAttackContactVfxEvent(ev, {
        findUnit: (side, id) => _find(side, id),
        playVfx: playAttackContactVfx,
        holdForContact: units => (units || []).forEach(u => {
          if (!u) return;
          let release = () => {};
          const promise = new Promise(resolve => { release = resolve; });
          _contactHolds.set(`${u.side || ''}:${u.id}`, { promise, release });
        }),
        onContactPass: unit => _releaseContactHold(unit),
      });
    } catch (err) { console.error('[attack contact vfx]', err); }
  }

  // 攻撃モーションを開始する。paused=true なら25%地点で止め、release() で接触まで進める。
  // 攻撃効果を「少し動き出した時点」で見せるための仕組み（PvEと同じ扱い）。
  function _startAttackMotion(ev, ctx, paused) {
    const attacker = _find(ev.side, ev.attackerId);
    // **対象は相手陣営とは限らない**（ピクシーで操られた敵は同じ陣営を殴る。PvEと同じ）。
    const target = _find(ev.side === 'p1' ? 'p2' : 'p1', ev.targetId) || _find(ev.side, ev.targetId);
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
      onContact: _firePendingContactVfx,
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
    // マナ解決のひと続きが途切れたら、続けて出していた効果固有VFXも止めて数え直す。
    if (presentBreaksManaRun(ev)) {
      _manaCueGate = presentCreateOnceGate();
      _manaWaveGate = presentCreateOnceGate();
      // 何も走っていない時は await しない（毎イベントの待ちが描画に割り込む）。
      if (_manaEffectRunning()) await _endManaEffectRun();
    }
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
        // **マナも同じ。** サーバーへ送る初期マナは0なので、戻さないと表示だけが
        // 前の対戦の値のまま残り、盤面の実際のマナと食い違う。
        G._blood = 0;
        G._enemyBlood = 0;
        G.mana = 0;
        // マナ増加SEの基準もここで0に揃える（PvEの startBattle と同じ）。
        if (typeof _refreshManaDisplays === 'function') _refreshManaDisplays();
        if (typeof renderBattleCounters === 'function') renderBattleCounters();
        // 数値の順番待ちも戦闘をまたいで持ち越さない。
        if (_damageGate && typeof _damageGate.reset === 'function') _damageGate.reset();
        // 例外で抜けた回数が残ると、以後ずっと盤面が詰まらない。戦闘の頭で必ず戻す。
        presentResetPlayback();
        // 保留していた発光も捨てる（持ち越すと次の戦闘の頭で無関係のカードが光る）。
        if(typeof presentResetEffectFlashes==='function') presentResetEffectFlashes();
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
        // 貫通の待ちが残ったまま手番をまたがないようにする。
        _releaseAllContactHolds();
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
              // **モーションを出すイベントだけを掴む。** 全体攻撃・三方向攻撃は対象ごとに
              // attack を出し、主対象が先頭とは限らない。先頭を掴むと主対象ぶんの
              // モーションがもう一度再生され、2回攻撃したように見える。
              if (n.attackVisual === false) continue;
              if (actorId != null && String(n.attackerId) === actorId) { atkEv = n; break; }
              continue;
            }
            // **マナ獲得（マナ生成）とマナ効果もここに入れる（PvEと同じ）。**
            // 入れないと、マナが増えるのも他キャラクターのマナ効果も
            // 「攻撃者が全く動く前」に起きる。
            // ただし**動いている本人を決めてよいのは mana_gain まで**。
            // マナ効果は別のキャラクターが持っていることがあり、そちらを本人に
            // してしまうと動いていないキャラクターのモーションが先出しされる。
            // 発生元の見分けは present.js が唯一の実装（PvEと同じ）。
            if (n.type === 'mana_threshold') { if (actorId != null) hasEffects = true; continue; }
            const src = typeof presentPreAttackEffectOwnerId === 'function'
              ? presentPreAttackEffectOwnerId(n) : null;
            if (src == null) continue;
            if (actorId == null) actorId = src;
            if (src === actorId) hasEffects = true;
          }
        }
        if (atkEv && hasEffects) _preAttack = _startAttackMotion(atkEv, ctx, true);
        break;
      }
      case ONLINE_EVENT.ATTACK: {
        if (ev.attackVisual === false) break;
        if (_preAttack && _preAttack.ev === ev) {
          // 効果より前に始めておいたモーション。ここで接触まで進める。
          const held = _preAttack; _preAttack = null;
          held.release();
          await held.motion;
          break;
        }
        const started = _startAttackMotion(ev, ctx, false);
        if (started) await started.motion;
        // モーションが出せなかった時（攻撃者・対象が盤面に無い等）の保険。
        // 出ないまま消すと「攻撃範囲の演出が時々出ない」になる。
        else _firePendingContactVfx();
        break;
      }
      case ONLINE_EVENT.DAMAGE: {
        // 貫通で貫かれた体は、**絵がその位置を通り過ぎるまで**数値を出さない（PvEと同じ）。
        await _awaitContactHold(ev);
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
          // 同じ瞬間の命中はどれか＝present_events.js の束が唯一の実装（PvEと同じ）。
          sfxBatch: e0 => {
            const evs = (ctx && ctx.events) || [];
            const from = Number(ctx && ctx.eventIndex);
            return presentDamageSfxBatch(evs, Number.isInteger(from) ? from : evs.indexOf(e0));
          },
          // 次も同じ種類のダメージなら、数値をその間隔で出し切る（判定は present.js）。
          runAheadMs: e0 => {
            const evs = (ctx && ctx.events) || [];
            const from = Number(ctx && ctx.eventIndex);
            return presentDamageRunAheadMs(evs, Number.isInteger(from) ? from : evs.indexOf(e0));
          },
          alreadyShown: e0 => !!(ctx.visualizedDamageEvents && ctx.visualizedDamageEvents.has(e0)),
          // 状態異常を付けたダメージの絵（弱体＝K004）。判定は present.js（PvEと同じ）。
          vfxKeyword: e0 => (typeof presentDamageVfxKeyword === 'function'
            ? presentDamageVfxKeyword((ctx && ctx.events) || [], e0) : ''),
          // 効果の素材はシートの「VFX/SE」列で引く（PvEと同じ）。
          effectFxCode: no => (no && typeof _effectFxCodeByNo === 'function' ? _effectFxCodeByNo(no) : no),
        });
        break;
      }
      case 'mana_gain': {
        // マナを得た合図（S004）は**発生させたキャラクターの上**に出す（PvEと同じ）。
        {
          const gainer = ev.unitId != null ? _find(ev.side, ev.unitId) : null;
          const shown = !!(gainer && Number(ev.amount) > 0 && typeof playManaGainVfx === 'function'
            && playManaGainVfx(gainer, ev.side === 'p2' ? 'enemy' : 'ally'));
          // **数字はVFXが見え始めてから動かす**（PvEと同じ。尺は present.js）。
          if (shown) {
            await _sleep((typeof PRESENT_MANA_GAIN_VALUE_DELAY_MS === 'number'
              && PRESENT_MANA_GAIN_VALUE_DELAY_MS) || 140);
          }
        }
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          // PvEのマナは色別ではない共有スカラー値。オンラインだけ別形状にすると
          // 戦闘中HUDとマナ閾値処理がずれるため、既存の更新経路を使う。
          const amount = Math.max(0, Number(ev.amount) || 0);
          G.mana = (typeof _ensureMana === 'function' ? Number(_ensureMana()) : Number(G.mana)) || 0;
          G.mana += amount;
          // マナ表示の更新とマナ増加SEは _refreshManaDisplays() が唯一の実装（PvEと同じ）。
          if (typeof _refreshManaDisplays === 'function') _refreshManaDisplays();
          else if (typeof renderManaHud === 'function') renderManaHud();
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
      case 'effect_flash': {
        // 発光の色・回数は共通プレゼンテーション層で解釈する（PvEと同じ）。
        await presentEffectFlashEvent(ev, {
          findUnit: (side, id) => _find(side, id),
        });
        break;
      }
      case 'attack_contact_vfx': {
        // **ここでは鳴らさない。** 攻撃モーションの接触フックで鳴らす（PvEと同じ）。
        _pendingContactVfx = ev;
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
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。状態の反映は上で済ませている。
        // 矢の着弾で出し済みなら、ここでは出さない（二重に出る）。
        if (!_keywordShownEvents.has(ev)) presentKeywordEffectEvent(ev, { findUnit: (side, id) => _find(side, id) });
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
          waveGate: _manaWaveGate,
          // 同じ瞬間に同じ効果が発動する全員を先読みする（判定は present.js）。
          waveEvents: e0 => {
            const evs = (ctx && ctx.events) || [];
            const from = Number(ctx && ctx.eventIndex);
            return presentManaWaveEvents(evs, Number.isInteger(from) ? from : evs.indexOf(e0));
          },
          // 飛ばす効果（炎の矢）用。その効果が起こしたダメージ＝対象（判定は present.js）。
          effectDamage: e0 => {
            const evs = (ctx && ctx.events) || [];
            const from = Number(ctx && ctx.eventIndex);
            return presentEffectDamageEvents(evs, Number.isInteger(from) ? from : evs.indexOf(e0));
          },
          // 着弾の瞬間に見せるキーワード演出（毒牙など。判定は present.js）。
          effectKeywords: dmg => (typeof presentEffectKeywordEvents === 'function'
            ? presentEffectKeywordEvents((ctx && ctx.events) || [], dmg) : []),
          playCue: (cueUnits, cueOpt) => _awaitManaReverseStart(cueUnits, {
            ...cueOpt,
            markShown: dmg => { if (dmg && ctx.visualizedDamageEvents) ctx.visualizedDamageEvents.add(dmg); },
            markKeywordShown: kw => { if (kw) _keywordShownEvents.add(kw); },
            playKeyword: kw => { if (kw) presentKeywordEffectEvent(kw, { findUnit: (side, id) => _find(side, id) }); },
            onImpact: (target, dmg) => {
              if (target && dmg) target.hp = Math.max(0, Number(dmg.hpAfter) || 0);
              if (target && typeof updateUnitDamageUi === 'function') {
                updateUnitDamageUi(target, target.side === 'p2' ? 'enemy' : 'ally');
              }
            },
          }),
        });
        _render();
        break;
      }
      case 'mana_set': {
        if (ev.side === 'p1' && typeof G !== 'undefined' && G) {
          G.mana = Math.max(0, Number(ev.amount) || 0);
          if (typeof _refreshManaDisplays === 'function') _refreshManaDisplays();
          else if (typeof renderManaHud === 'function') renderManaHud();
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
      case 'summon_buff': {
        // 「この戦闘中、召喚された味方は+X/+Yを得る」の記録。
        // 実際の加算はコアが召喚時に行い、summonイベントの中身に載っている（PvEと同じ）。
        break;
      }
      case 'unit_stolen': {
        // 奪われた体は元の陣営から取り除く。味方側への出現は直後の summon が見せる。
        const list = (ctx && ctx.board && ctx.board[ev.side]) || null;
        const u = _find(ev.side, ev.unitId);
        if (u) {
          u.hp = 0;
          if (Array.isArray(list)) {
            const idx = list.indexOf(u);
            if (idx >= 0) list[idx] = null;
          }
        }
        _render();
        break;
      }
      case 'revive': {
        const u = _find(ev.side, ev.unitId);
        if (!u) break;
        u.atk = Number(ev.atk) || u.atk; u.maxHp = Number(ev.maxHp) || u.maxHp; u.hp = Number(ev.hp) || u.hp;
        u._sealed = false; _render();
        // 見せ方は present_events.js が唯一の実装（PvEと同じ）。
        await presentReviveEvent(ev, {
          findUnit: (side, id) => _find(side, id),
          // 蘇生後の値まで表示を進める（PvEと同じ）。
          applyStats: (u2, e2) => {
            if (typeof presentAdvanceShown !== 'function') return;
            presentAdvanceShown(u2, {
              atk: Math.max(0, Number(e2.atk) || 0),
              hp: Math.max(0, Number(e2.hp) || 0),
              maxHp: Math.max(1, Number(e2.maxHp) || Number(e2.hp) || 1),
            });
          },
          render: _render,
        });
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
          // オンラインはイベントの値が唯一の出どころ。残りの結界をここで実体へ写す
          // （写さないと shield.png と結界バッジが消えなかった）。
          applyShield: (u, next) => { u.shield = Math.max(0, Number(next) || 0); },
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
        // 即死の演出は present_events.js が唯一の実装（PvEと同じ）。
        if (u && ev.type === 'instant_death' && typeof presentInstantDeathEvent === 'function') {
          presentInstantDeathEvent(ev, { findUnit: (side, id) => _find(side, id) });
        }
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
        // 登場演出（S001）。**逆再生開始でカードが出る**まで待つ（PvEと同じ）。
        if (typeof playSummonAppearVfx === 'function' && ev.unit) {
          const summoned = _find(ev.side, ev.unit.id);
          if (summoned) {
            try { await playSummonAppearVfx(summoned, ev.side === 'p2' ? 'enemy' : 'ally'); }
            catch (err) { console.error('[summon vfx]', err); }
          }
        }
        break;
      }
      case 'sweep_vfx': {
        // 薙ぎ払い（アラッサス）。見せ方は presentSweepAttack() が唯一の実装（PvEと同じ）。
        // このイベントの直後に、対象ごとのDAMAGEが並ぶ。炎が当たった瞬間に
        // その対象の数値を出し、通常の被弾演出では出し直さない。
        const source = _find(ev.side, ev.unitId);
        const targetSide = ev.side === 'p1' ? 'p2' : 'p1';
        // **対象は敵とは限らない**（サイレンは自分以外の全キャラクターに当たる。PvEと同じ）。
        const sideByTarget = new Map();
        const targets = (ev.targetIds || []).map(id => {
          const foe = _find(targetSide, id);
          if (foe) { sideByTarget.set(foe, targetSide); return foe; }
          const own = _find(ev.side, id);
          if (own) { sideByTarget.set(own, ev.side); return own; }
          return null;
        }).filter(Boolean);
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
          target => byTarget.get(`${sideByTarget.get(target) || targetSide}:${target.id}`),
          (target, d) => {
            if (!d) return;
            const hurt = _find(d.side, d.unitId);
            if (hurt) hurt.hp = Math.max(0, Number(d.hpAfter) || 0);
            if (ctx.visualizedDamageEvents) ctx.visualizedDamageEvents.add(d);
          },
          { sideOf: target => (sideByTarget.get(target) === 'p2' ? 'enemy' : 'ally') });
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
