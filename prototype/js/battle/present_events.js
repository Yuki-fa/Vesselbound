// ═══════════════════════════════════════
// battle/present_events.js — コアのイベント1件をどう見せるかの**唯一の実装**。
//
// PvE（js/engine/battle.js）とオンライン（js/online/board.js）は、
//   ・ルール       → js/battle/core.js（唯一の実装）
//   ・見せ方の規則 → js/battle/present.js（唯一の実装）
//   ・描画そのもの → js/engine/render.js（唯一の実装）
// を既に共有している。最後まで二重実装で残っていたのが**イベントの受け口**で、
// 片方を直しても、もう片方には反映されなかった。
// （オンラインだけ固有VFXが一つも出ない／とどめの数値が出ない／召喚が反対側へ出る、
//   といった片側だけの不具合は、すべてここの二重実装から出ている。）
//
// ここには「1件のイベントをどう見せるか」を1回だけ書く。両者の違い
// （ユニットの引き方・HPの反映のしかた・先読みできるイベント列）は
// **アダプタ（api）** で吸収する。
//
//   ・DOMを触る関数（playHitVfx 等）は render.js のものをそのまま呼ぶ。
//   ・規則（誰の効果として出すか・待ち時間）は present.js のものを呼ぶ。
//   ・**ここへルール（数値の計算・勝敗）を書かない。** それはコアの仕事。
// ═══════════════════════════════════════

// ── ダメージ ────────────────────────────────
// api:
//   findUnit(side, id)      … 盤面からユニットを引く
//   findAnyUnit(id)         … 陣営を問わずユニットを引く（発生元用）
//   applyHp(unit, hpAfter)  … 画面に出すHPをここまで進める
//   gate                    … presentCreateDamageGate() の予約表
//   sleep(ms)               … 待ち
//   ownEffectText(unit)     … そのカード自身の効果文（固有VFXの判定に使う）
//   sfxDone                 … 命中音を鳴らし終えたイベントの記録（Set）
//   sfxBatch(ev)            … ev と同時に鳴らすダメージイベントの並び
//   alreadyShown(ev)        … 別経路（薙ぎ払い等）で数値を出し済みか
//   noteEffectSource(unit)  … 固有SEを鳴らす発生元として記録する
//   onEffectDamage(ev)      … 効果ダメージの共通音を鳴らす契機
async function presentDamageEvent(ev, api) {
  if (!ev || !api) return false;
  const amount = Math.max(0, Number(ev.amount) || 0);
  const target = api.findUnit(ev.side, ev.unitId);
  if (!target) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  // 同じキャラクターへ続けて数値が出ると重なって読めない。対象ごとに順番待ちする。
  // 対象が違えば待たない（別のカードの上なので重ならない）。規則は present.js。
  // 別経路（薙ぎ払い）が数値を出す分は、その経路が自分の間合いで見せる。
  // ここで束の順番待ちに並ばせると、数値を出さないのに待ち時間だけ増える。
  const shownElsewhere = typeof api.alreadyShown === 'function' && api.alreadyShown(ev);
  if (amount > 0 && api.gate && !shownElsewhere) {
    // 束（同じ種類・同じ瞬間のダメージ）の規則は present.js が唯一の実装。
    // イベントを渡すと「他の束が出ている間は出さない」「束の中は同時」を守る。
    const waitMs = api.gate.reserve(`u:${target.id}`, ev);
    if (waitMs > 0 && typeof api.sleep === 'function') await api.sleep(waitMs);
  }
  const source = ev.sourceId != null && typeof api.findAnyUnit === 'function'
    ? api.findAnyUnit(ev.sourceId) : null;
  // 固有VFXを誰の効果として出すかは present.js が唯一の実装。
  const vfxSource = typeof presentDamageVfxSource === 'function'
    ? presentDamageVfxSource(ev, target, source, api.ownEffectText) : null;
  // **発生元から対象へ飛ばす効果**（炎の矢・ケンタウロス）。どの効果を飛ばすかは
  // present.js の `PRESENT_PROJECTILE_EFFECTS` が唯一の実装。
  // 数値・HP・命中VFXは**着弾の瞬間**に出すので、通常の被弾演出はここで打ち切る。
  const projectileCode = (!shownElsewhere && amount > 0 && vfxSource
    && typeof _effectPresentationCode === 'function' && typeof presentIsProjectileEffect === 'function'
    && typeof playProjectileEffectVfx === 'function')
    ? (presentIsProjectileEffect(_effectPresentationCode(vfxSource)) ? String(_effectPresentationCode(vfxSource)) : '')
    : '';
  if (projectileCode) {
    const srcSide = vfxSource.side === 'p2' ? 'enemy' : 'ally';
    if (typeof getEffectSfxKey === 'function' && typeof playSfx === 'function') {
      const key = getEffectSfxKey(projectileCode);
      if (key) playSfx(key, { group: 'magic', guardKey: `projectile:${key}:${Date.now()}`, guardMs: 0 });
    }
    // 投げっぱなし。戦闘の進行を矢の飛行時間で止めない。
    Promise.resolve(playProjectileEffectVfx(vfxSource, srcSide, target, fxSide, projectileCode, {
      amount,
      onImpact: () => {
        if (typeof api.applyHp === 'function') api.applyHp(target, ev.hpAfter);
        if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
      },
    })).catch(err => console.error('[projectile damage vfx]', err));
    return true;
  }
  // 数値を出す瞬間に、画面に出すHPもここまで進める。
  if (typeof api.applyHp === 'function') api.applyHp(target, ev.hpAfter);
  if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
  if (ev.effect && source && typeof api.onEffectDamage === 'function') api.onEffectDamage(ev, source);
  // 固有SEもVFXと同じ規則で選ぶ。カード自身の効果文がダメージに触れていない場合は
  // 鳴らさない（強化カードで得た効果で本人のSEが鳴るのを防ぐ）。
  if (vfxSource && typeof api.noteEffectSource === 'function') api.noteEffectSource(vfxSource);
  // 別経路（薙ぎ払い）で数値を出し済みなら、ここでは出し直さない。
  if (shownElsewhere) return true;
  if (amount <= 0) return true;
  // **ひとまとまりの命中音は同時に鳴らす。** 攻撃と反撃のように続けて起きる命中を
  // 1件ずつ鳴らすと、間に挟まるVFXの画像デコードで音がずれて聞こえる。
  if (!ev.suppressAttackHitSfx && api.sfxDone && !api.sfxDone.has(ev) && typeof playAttackDamageSfx === 'function') {
    const batch = typeof api.sfxBatch === 'function' ? (api.sfxBatch(ev) || []) : [ev];
    // **同じ音は同じ瞬間に1本しか鳴らさない。**
    // 同じ命中音を人数分だけ重ねると、play()の鳴り始めが1本ごとにばらつくうえ、
    // 暖機済みの複製を使い切った分は読み込みからやり直しになり、確実にずれて聞こえる。
    // （全体攻撃・攻撃と反撃・薙ぎ払いなど、同種の命中が重なる場面はどれもこれに当たる）
    const playedKeys = new Set();
    batch.forEach(d => {
      if (!d || api.sfxDone.has(d)) return;
      api.sfxDone.add(d);
      const src = d.sourceId != null && typeof api.findAnyUnit === 'function'
        ? api.findAnyUnit(d.sourceId) : null;
      const amt = Math.max(0, Number(d.amount) || 0);
      if (typeof _attackDamageSfxKey === 'function') {
        const key = _attackDamageSfxKey(src, amt);
        if (key) {
          if (playedKeys.has(key)) return;
          playedKeys.add(key);
        }
      }
      playAttackDamageSfx(src, amt);
    });
  }
  if (typeof playHitVfx === 'function') {
    // 同じ種類のダメージが続いている間は、次の数値が出るまでに「出て消える」が
    // 1回収まる長さにする。既定の長さのままだと、同じ位置に同じ数値が出続けて
    // 何回発動したか分からない（闇の炎が4回続いた時に -1 が1つに見えた）。
    const runMs = Math.max(
      api.gate && typeof api.gate.runMs === 'function' ? Number(api.gate.runMs()) || 0 : 0,
      typeof api.runAheadMs === 'function' ? Number(api.runAheadMs(ev)) || 0 : 0);
    // 数値は**次が出るまでに完全に消えている**必要がある。間隔いっぱいの尺にすると
    // 消え際と次の出始めが重なり、同じ「-1」が出続けているように見える。
    // 尺の決め方は present.js が唯一の実装。
    const labelMs = typeof presentDamageRunLabelMs === 'function' ? presentDamageRunLabelMs(runMs) : 0;
    playHitVfx(fxSide, target, amount, {
      ...(vfxSource ? { effectSource: vfxSource } : {}),
      ...(labelMs > 0 ? { labelDuration: labelMs, labelDurationMin: 0 } : {}),
      keywordEffect: ev.keywordEffect || undefined,
      // 状態異常を付けたダメージは、そのキーワードの絵で見せる（音は変えない）。
      vfxKeyword: (typeof api.vfxKeyword === 'function' ? api.vfxKeyword(ev) : '') || undefined,
      // 効果が当たった瞬間の専用演出（炎の矢＝E058_2）。素材が無ければ通常の被弾VFX。
      // 素材はシートの「VFX/SE」列で引く（指定が無ければ効果のカードNo.のまま）。
      effectHitCode: (typeof api.effectFxCode === 'function'
        ? api.effectFxCode(ev.effectNo) : ev.effectNo) || undefined,
    });
  }
  return true;
}

// ── 同じ瞬間に鳴らす命中音の並び ──────────────────────────
// 「どこまでが同じ瞬間か」は present.js の束（damageKind＋batch）で決める。
// イベント列の並びだけで判定すると、全体攻撃のように命中ごとに attack イベントが
// 挟まる場合に束が途中で切れ、人数分の命中音が数値のずれた分だけ遅れて鳴る。
function presentDamageSfxBatch(events, index) {
  const list = Array.isArray(events) ? events : [];
  const start = list[index];
  if (!start) return [];
  const key = presentDamageGroupKey(start);
  const out = [];
  for (let i = index; i < list.length; i++) {
    const d = list[i];
    if (!d) break;
    if (d.type === 'turn_begin') break;
    if (d.type !== 'damage') continue;   // 束の途中に挟まる attack 等は読み飛ばす
    if (!(Number(d.amount) > 0)) continue;
    if (presentDamageGroupKey(d) !== key) break;
    out.push(d);
  }
  return out;
}

// ── 結界が割れた ────────────────────────────────
// api: findUnit(side,id) / render() / logLine(unit) … ログ文（不要なら省略）
function presentShieldLostEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  if (unit) {
    if (typeof api.logLine === 'function' && typeof log === 'function') {
      const line = api.logLine(unit);
      if (line) log(line, 'sys');
    }
    if (typeof playSfx === 'function') playSfx('shield', { group: 'combat' });
    // 結界がダメージを防いだ瞬間の専用VFX（キーワード「結界」＝K018）。
    // 数値は出ないので amount は0。SEは上の shield を使うので keywordSfx は切る。
    if (typeof playHitVfx === 'function') {
      playHitVfx(fxSide, unit, 0, { keywordEffect: '結界', keywordSfx: false });
    }
    if (typeof updateUnitShieldUi === 'function') updateUnitShieldUi(unit, fxSide);
  }
  // 結界のエフェクトを消すため、盤面も描き直す。
  if (typeof api.render === 'function') api.render();
  return !!unit;
}

// ── 能力変化（バフ・負傷効果など）────────────────────
// api:
//   findUnit(side,id) / findAnyUnit(id)
//   applyStats(unit, ev)  … 画面に出すATK/HPをここまで進める（PvEは据え置き値、
//                            オンラインは実体そのもの。hpの増減はmaxHpにも効く）
//   cueKeys               … 固有SEを鳴らし終えた「発生元＋効果」の記録（Set）
//   vfxGate               … 固有VFXを出し終えた「発生元＋効果＋対象」のゲート
//   logLine(unit, source) … ログ文（不要なら省略）
//   render()              … 盤面の描き直し（不要なら省略）
//   trace(info)           … 記録（不要なら省略）
async function presentStatChangeEvent(ev, api) {
  if (!ev || !api) return false;
  const target = api.findUnit(ev.side, ev.unitId);
  if (!target) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  // 変化を見せる瞬間に、画面に出すATK/HPもここまで進める。
  if (typeof api.applyStats === 'function') api.applyStats(target, ev);
  if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
  const source = ev.sourceId != null && typeof api.findAnyUnit === 'function'
    ? api.findAnyUnit(ev.sourceId) : null;
  if (source && typeof api.logLine === 'function' && typeof log === 'function') {
    const line = api.logLine(target, source);
    if (line) log(line, ev.side === 'p1' ? 'good' : 'bad');
  }
  // どの理由で固有VFXを出すかは present.js が唯一の実装。
  if (source && typeof presentStatChangeVfxAllowed === 'function' && presentStatChangeVfxAllowed(ev)
    && typeof _playCardEffectVfx === 'function' && typeof _effectPresentationCode === 'function') {
    // 攻撃時のバフは一律の演出（S005）。それ以外は発生元カードの番号。規則は present.js。
    const ownCode = String(_effectPresentationCode(source) || '');
    // シートの「VFX/SE」列は複数書けるので、全部渡してトリガで選ばせる。
    // 強化カードの効果は、その強化カードのVFX/SE列を優先する。
    const codes = typeof _effectPresentationCodes === 'function' ? _effectPresentationCodes(source) : [ownCode];
    const enchantName = typeof presentStatChangeEnchantName === 'function'
      ? presentStatChangeEnchantName(ev.reason) : '';
    const enchantCode = enchantName && typeof _enchantFxCode === 'function' ? _enchantFxCode(enchantName) : '';
    const code = typeof presentStatChangeVfxCode === 'function'
      ? presentStatChangeVfxCode(ev, ownCode, { codes, enchantCode }) : ownCode;
    if (/^[A-Z]\d{3}$/i.test(code)) {
      const cueKey = `${source.id}:${String(ev.reason || '')}`;
      // 固有SEは効果1回につき1回。VFXは対象ごとに1回。重複の単位を分ける。
      if (api.cueKeys && !api.cueKeys.has(cueKey)) {
        api.cueKeys.add(cueKey);
        if (typeof api.trace === 'function') {
          api.trace({ sourceId: source.id, targetId: target.id, reason: String(ev.reason || ''), code: code.toUpperCase() });
        }
        if (typeof _playCardEffectSfx === 'function') _playCardEffectSfx(code.toUpperCase());
      }
      // 開始しただけで次のイベントへ進むと、連続効果中に再描画・召喚・攻撃モーションが
      // 重なってVFXが欠ける。同じ効果の表示完了を待ってから次へ進める。
      if (api.vfxGate && api.vfxGate.shouldPlay(`${cueKey}:${target.id}`)) {
        // 尺は present.js が唯一の定義（ゴーレムの負傷エフェクトと同じ長さ）。
        await _playCardEffectVfx(code, [target], { gateMs: 0,
          hitDuration: (typeof PRESENT_CARD_EFFECT_VFX_MS === 'number' ? PRESENT_CARD_EFFECT_VFX_MS : 700) });
      }
    }
  }
  if (typeof api.render === 'function') api.render();
  return true;
}

// ── キーワードの付与（毒・弱体など）──────────────────────
// **状態異常を受けた瞬間**の見せ方。キーワード専用のVFXとSEを対象の上に出す
// （毒牙で毒を受けた＝K003）。番号はキーワードシートのNo.（`KW_NO_MAP`）で引くので、
// **ここにカード名や番号を直接書かないこと。**
// 素材が登録されていないキーワードでは何も出さない
// （通常の被弾VFXへ落とすと「殴られた」ように見える）。
// api: findUnit(side,id)
function presentKeywordEffectEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  const keyword = String(ev.keyword || PRESENT_KEYWORD_EFFECT_NAMES[String(ev.effect || '')] || '');
  if (!keyword) return false;
  if (typeof getKeywordEffectVfxPath !== 'function' || !getKeywordEffectVfxPath(keyword)) return false;
  const fxSide = ev.side === 'p1' ? 'ally' : 'enemy';
  // **同じキャラクターへ続けて付与される間は出し直さない**（バフVFXと同じ見せ方）。
  // 1つの再生を延ばして出し続ける。実装は render.js が唯一の置き場。
  if (typeof playKeywordEffectVfxSustained === 'function'
    && playKeywordEffectVfxSustained(unit, fxSide, keyword)) return true;
  if (typeof playHitVfx === 'function') playHitVfx(fxSide, unit, 0, { keywordEffect: keyword });
  return true;
}
// コアのイベントの `effect` からキーワード名へ。名前はキーワードシートに合わせる。
const PRESENT_KEYWORD_EFFECT_NAMES = {
  poison: '毒牙', weaken: '衝撃', evil_eye: '邪眼',
};

// ── 召喚 ────────────────────────────────────
// 盤面のどこへ入れるか（前衛の右端／対象の左右）は coreInsertSummonedUnit が
// 唯一の実装。ここはその共通の入口と「いつ描くか」を1回だけ書く。
//
// 描画の契機：**まだDOMに姿が無い召喚体だけ、攻撃モーション中でも描画を進める。**
// 保留したままだと次の死亡イベントまで画面に現れず、逆に常に割り込むと
// 飛行中の複製の戻り先が動いてカードが二重に見える。
// api:
//   list(side)                … その陣営の盤面配列
//   hasUnit(list, id)         … 既に盤面にいるか
//   place(list, unit, spec)   … coreInsertSummonedUnit を通した配置（成否を返す）
//   hasDom(unit, side)        … その召喚体のDOMが既にあるか
//   compact(force)            … 盤面の詰め直し
//   render()                  … 単純な描き直し
//   logLine(unit)             … ログ文（不要なら省略）
function presentSummonPlacement(ev, api) {
  if (!ev || !api || !ev.unit) return false;
  const list = typeof api.list === 'function' ? api.list(ev.side) : null;
  let layoutChanged = false;
  if (list && !(typeof api.hasUnit === 'function' && api.hasUnit(list, ev.unit.id))) {
    const live = list.filter(x => x && x.hp > 0 && !x._isObject && !x._isSoul).length;
    // 上限超過のイベントが混ざっても、余分な体をDOMへ入れて左端へ出さない。
    if (live < (PRESENT_MAX_SLOTS || 14)) {
      const summoned = { ...ev.unit };
      const front = list.filter(x => x && x.hp > 0 && x.lane !== 'rear' && !x._isObject && !x._isSoul).length;
      // 前衛が埋まっても陣営上限までは後衛へ送る。
      if (front >= (PRESENT_FRONT_SLOTS || 7)) summoned.lane = 'rear';
      // 位置指定はイベントの値を**そのまま**渡す。左右の解釈はコアが持つ。
      // 発生元IDで補ってはいけない（同時召喚の並びが逆になる）。
      const spec = {
        placement: ev.placement || '',
        placementTargetId: ev.placementTargetId != null ? ev.placementTargetId : null,
      };
      if (typeof api.place === 'function' && api.place(list, summoned, spec)) layoutChanged = true;
    }
  }
  if (ev.sourceId != null && typeof api.logLine === 'function' && typeof log === 'function') {
    const line = api.logLine(ev.unit);
    if (line) log(line, ev.side === 'p1' ? 'good' : 'bad');
  }
  const hasDom = typeof api.hasDom === 'function' ? api.hasDom(ev.unit, ev.side) : true;
  if (layoutChanged && typeof api.compact === 'function') api.compact(!hasDom);
  else if (typeof api.render === 'function') api.render();
  return layoutChanged;
}

// ── 効果発動元の発光 ────────────────────────────────
// 色の対応だけを共通化し、実際のDOM発光はrender.jsへ委譲する。
//
// **発光はVFXと同時に始める。** コアは効果を解決した順にイベントを出すため、
// 発光のイベントは、その効果のVFX（マナ効果VFX・バフVFXなど）より前に届く。
// 届いた瞬間に光らせると、光ってから遅れて絵が出る。特にマナ効果は、前の効果の
// 演出が終わるのを待ってから始まるので、その待ち時間ぶんまるごと先行して見えた。
// そこで**発光は保留し、次にVFXが出る瞬間に合わせて再生する**（受け口は
// render.js の各VFXの入口＝presentFlushEffectFlashes）。VFXを出さない効果の
// ぶんは、安全弁として一定時間後に自動で再生する。
const PRESENT_EFFECT_FLASH_MAX_WAIT_MS = 700;
let _presentPendingFlashes = [];
let _presentPendingFlashTimer = null;
function presentQueueEffectFlash(entry) {
  if (!entry || !entry.unit) return false;
  _presentPendingFlashes.push(entry);
  if (_presentPendingFlashTimer == null && typeof setTimeout === 'function') {
    _presentPendingFlashTimer = setTimeout(() => {
      _presentPendingFlashTimer = null;
      presentFlushEffectFlashes();
    }, PRESENT_EFFECT_FLASH_MAX_WAIT_MS);
  }
  return true;
}
// 保留していた発光をまとめて始める。**完了は待たない**（待つと人数ぶん直列化して明滅がずれる）。
function presentFlushEffectFlashes() {
  if (!_presentPendingFlashes.length) return false;
  const list = _presentPendingFlashes;
  _presentPendingFlashes = [];
  if (_presentPendingFlashTimer != null && typeof clearTimeout === 'function') {
    clearTimeout(_presentPendingFlashTimer);
    _presentPendingFlashTimer = null;
  }
  if (typeof playEffectFlash !== 'function') return false;
  list.forEach(f => { void playEffectFlash(f.unit, f.side, f.color, f.count); });
  return true;
}
// 戦闘の切れ目で捨てる。持ち越すと次の戦闘の頭で関係のないカードが光る。
function presentResetEffectFlashes() {
  // 状態異常の継続VFXも一緒に片付ける（戦闘の切れ目で呼ばれる）。
  if (typeof stopAllKeywordEffectVfx === 'function') stopAllKeywordEffectVfx();
  _presentPendingFlashes = [];
  if (_presentPendingFlashTimer != null && typeof clearTimeout === 'function') {
    clearTimeout(_presentPendingFlashTimer);
    _presentPendingFlashTimer = null;
  }
}
async function presentEffectFlashEvent(ev, api) {
  if (!ev || !api || typeof api.findUnit !== 'function') return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit || typeof playEffectFlash !== 'function') return false;
  // 発光の色。**ここが唯一の定義。**
  //   解放（release）＝紫／開戦・終戦・常時の誘発（passive）＝白
  // 「常時：緑のキャラクターから得るマナは+1される」のような**受動的な補正**は
  // コアがイベントを出さないので、そもそも光らない。
  const colors = { attack: 'yellow', injury: 'red', death: 'blue', mana: 'green',
    opening: 'white', battle_end: 'white', passive: 'white', release: 'purple' };
  const color = colors[String(ev.trigger || '')];
  if (!color) return false;
  // 発光は同じタイミングの複数イベントを同時に開始する。ここをawaitすると、
  // キャラクター数ぶん直列化されて明滅がずれる。
  presentQueueEffectFlash({ unit, side: ev.side === 'p2' ? 'enemy' : 'ally', color, count: ev.count });
  return true;
}

// ── 攻撃範囲の接触演出（貫通・三方向攻撃・全体攻撃）────────────────
// **鳴らすのは「対象へ接触した瞬間」。** 受け口は攻撃モーションの onContact から呼ぶ。
// **完了を待たないこと。** 待つと、同時に入るはずの複数対象のダメージ数値が
// VFXの尺のぶんだけずれる（貫通・三方向攻撃・全体攻撃はどれも複数対象）。
// 貫通と範囲攻撃は併用できるので、modes（配列）のぶんだけ同時に出す。
function presentAttackContactVfxEvent(ev, api) {
  if (!ev || !api || typeof api.findUnit !== 'function' || typeof api.playVfx !== 'function') return false;
  const attacker=api.findUnit(ev.side,ev.attackerId);
  const foeSide=ev.side==='p1'?'p2':'p1';
  const find=ids=>(Array.isArray(ids)?ids:[]).map(id=>api.findUnit(foeSide,id)).filter(Boolean);
  const spreadTargets=find(ev.targetIds);
  // 貫通は「貫く順（手前から奥へ）」の別の配列。範囲攻撃の対象と混ぜると
  // 三方向攻撃のVFXが後衛にまで出る。
  const pierceTargets=Array.isArray(ev.pierceTargetIds)&&ev.pierceTargetIds.length
    ? find(ev.pierceTargetIds)
    : (ev.primaryTargetId!=null?find([ev.primaryTargetId]):spreadTargets.slice(0,1));
  if (!attacker || !(spreadTargets.length||pierceTargets.length)) return false;
  const modes=typeof presentAttackContactModes==='function'
    ? presentAttackContactModes(ev) : [String(ev.mode||'').toLowerCase()].filter(Boolean);
  let fired=false;
  // 貫通で待たせる対象を、演出を始める前に呼び出し側へ渡す。
  if (modes.includes('pierce') && typeof api.holdForContact === 'function') {
    api.holdForContact(pierceTargets);
  }
  modes.forEach(mode=>{
    const path=typeof getAttackContactVfxPath==='function'?getAttackContactVfxPath(mode):'';
    if (!path) return;
    const sfx=typeof getAttackContactSfxKey==='function'?getAttackContactSfxKey(mode):'';
    if (sfx && typeof playSfx==='function') playSfx(sfx,{group:'combat',guardKey:`contact:${sfx}:${Date.now()}:${mode}`,guardMs:0});
    // 貫通は貫く順の全対象。範囲攻撃は当たった全員の範囲に出す。
    const targets=mode==='pierce'?pierceTargets:spreadTargets;
    if (!targets.length) return;
    fired=true;
    // **貫通だけはダメージの表示をVFXに合わせる**（絵が通り過ぎた瞬間に出す）。
    // 範囲攻撃（三方向・全体）は同時に当たるので、VFXに依存させない。
    const onPass=mode==='pierce'&&typeof api.onContactPass==='function'
      ? unit=>api.onContactPass(unit) : null;
    // 投げっぱなし。ダメージ表示をこの演出に依存させない。
    Promise.resolve(api.playVfx({ attacker, targets, targetSide: ev.side === 'p1' ? 'enemy' : 'ally', mode, path,
      onPass,
      duration: typeof PRESENT_ATTACK_CONTACT_VFX_MS==='number'?PRESENT_ATTACK_CONTACT_VFX_MS:420,
      fadeDuration: typeof PRESENT_ATTACK_CONTACT_FADE_MS==='number'?PRESENT_ATTACK_CONTACT_FADE_MS:150 }))
      .catch(err=>console.error('[attack contact vfx]',err));
  });
  return fired;
}

// ── 復活（キーワード「復活」で再召喚された）──────────────────
// **見せ方は render.js の playReviveVfx() が唯一の実装**（PvE・オンライン共通）。
// 指輪や根性による蘇生は対象外（キーワード「復活」だけ）。
async function presentReviveEvent(ev, api) {
  if (!ev || !api || typeof api.findUnit !== 'function') return false;
  const unit0 = api.findUnit(ev.side, ev.unitId);
  // **画面に出すATK/HPを、蘇生後の値まで進める。**（復活・根性・指輪すべて）
  // ダメージで0まで進めた表示をそのままにすると、根性で耐えたのに
  // 戦闘終了時のHPが0のまま残る。
  if (unit0 && typeof api.applyStats === 'function') api.applyStats(unit0, ev);
  // 専用の演出があるのはキーワード「復活」だけ（指輪・根性は演出なし）。
  if (String(ev.reason || '') !== '復活') return false;
  const unit = unit0;
  if (!unit || typeof playReviveVfx !== 'function') return false;
  if (typeof api.render === 'function') api.render();
  await playReviveVfx(unit, ev.side === 'p2' ? 'enemy' : 'ally');
  return true;
}

// ── マナ効果（Nマナ毎の発動）────────────────────────
// **発動回数ぶん見せる。間引かない。** 「Xマナ毎」が到達回数ぶん発動したとき、
// 2回目以降を捨てていたため、5回発動しても演出・SEは1回きりで、
// ATK/HPも一息に+5/+5されたように見えた（活性化×5で発覚）。
// マナ効果VFX（K023）は**ひと続きにつき、その効果の最初の1回だけ**。
// 2回目以降はSEと能力変化の刻みだけを高速で並べる。
// 効果そのもののVFX（`ev.effectNo`＝活性化ならE045）は、
// **マナ効果VFXの逆再生開始から、その処理が終わるまで**出し続ける。
//
// **同じ効果が複数のキャラクターへ同時に乗るときは、まとめて1回で見せる。**
// 1体ずつ順に演出すると「片方が先に強くなる」ように見える（活性化を2体が持つ場合）。
// 効果が違えば従来どおり順に見せる（発動順＝優先順位）。
// 何が同じ効果・同じ瞬間かはコアの `effectNo` / `wave` で決める（present.js）。
//
// 区切りの単位は両方で同じでなければならない。
//   gate     … 効果ごと（`presentManaEffectKey`）。マナ効果VFXを出す回の判定
//   waveGate … 発動回ごと（`presentManaWaveKey`）。同時に見せる1回の判定
// api: findUnit(side,id) / gate / waveGate / waveEvents(ev) / effectDamage(ev) /
//      playCue(units[{unit,isEnemySide,targets}], { repeat, effectNo })
async function presentManaThresholdEvent(ev, api) {
  if (!ev || !api) return false;
  const source = api.findUnit(ev.side, ev.unitId);
  // 発光はマナ効果VFXが出る瞬間に合わせる（ここで光らせると、前の効果の演出を
  // 待っている間ずっと光ったままになり、絵より大きく先行して見える）。
  if (source) {
    presentQueueEffectFlash({ unit: source, side: ev.side === 'p2' ? 'enemy' : 'ally', color: 'green', count: 1 });
  }
  // 同じ発動回の2体目以降は、1体目の演出でまとめて見せている。ここでは待たない。
  if (api.waveGate && typeof presentManaWaveKey === 'function'
    && !api.waveGate.shouldPlay(presentManaWaveKey(ev))) return true;
  // shouldPlay は「この効果がこのひと続きで初めてか」を返す。初回だけマナ効果VFXを出す。
  const effectKey = typeof presentManaEffectKey === 'function'
    ? presentManaEffectKey(ev) : `${ev.side}:${ev.unitId}`;
  const repeat = !!(api.gate && !api.gate.shouldPlay(effectKey));
  // 同じ瞬間に発動する全員。先読みできない場合はこのイベントだけ。
  const wave = typeof api.waveEvents === 'function' ? (api.waveEvents(ev) || [ev]) : [ev];
  // **同じ体は1つにまとめる。** VFXは1体につき1つだが、**対象は足し合わせる。**
  // 同じカードを複数枚持つと、同じ発動回に同じキャラクターの発動が並ぶ
  // （炎の矢×2）。ここで2件目を捨てていた頃は、
  // **矢が1本しか飛ばないのにダメージだけ2体に入っていた。**
  const byUnit = new Map();
  wave.forEach(e => {
    const key = `${e.side}:${e.unitId}`;
    const unit = api.findUnit(e.side, e.unitId);
    if (!unit) return;
    if (!byUnit.has(key)) byUnit.set(key, { unit, isEnemySide: e.side === 'p2', targets: [] });
    const entry = byUnit.get(key);
    // 発生元から対象へ飛ぶ効果（炎の矢）用。その効果が起こしたダメージ＝対象。
    // 対象ごとに「着弾したら数値を出す」ので、ダメージイベントも一緒に持たせる。
    (typeof api.effectDamage === 'function' ? (api.effectDamage(e) || []) : []).forEach(d => {
      const target = api.findUnit(d.side, d.unitId);
      if (!target || entry.targets.some(t => t.ev === d)) return;
      entry.targets.push({ unit: target, isEnemySide: d.side === 'p2', ev: d,
        // 着弾の瞬間に見せるキーワード演出（毒牙など）。矢ごとに1回出す。
        keywordEvents: typeof api.effectKeywords === 'function' ? (api.effectKeywords(d) || []) : [] });
    });
  });
  const units = [...byUnit.values()];
  if (!units.length && source) units.push({ unit: source, isEnemySide: ev.side === 'p2', targets: [] });
  if (typeof api.playCue === 'function') {
    await api.playCue(units, { repeat, effectNo: String(ev.effectNo || '') });
  }
  return true;
}

// ── 死亡 ────────────────────────────────────
// 数値・VFXを出し終えてから、カードを焼き落として盤面から外す。
// api:
//   findUnit(side,id)
//   isDone(ev) / markDone(ev) … 同じ死亡を二重に演出しないための記録
//   beat()                    … 直前の数値が読める間だけ待つ
//   processDeath(unit, side)  … 陣営ごとの後始末（ログ・報酬・カウンタ）。PvEのみ
//   compact()                 … 盤面の詰め直し（攻撃モーションの完了を待つ）
async function presentDeathEvent(ev, api) {
  if (!ev || !api || !ev.unitId) return false;
  if (typeof api.isDone === 'function' && api.isDone(ev)) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  // 既に生き返っている（復活）場合はここでは演出しない。
  if (Number(unit.hp) > 0) return false;
  if (typeof api.markDone === 'function') api.markDone(ev);
  // 直前に出した数値が読める間だけ待ってから消す。
  // この間、カードは**暗くせず**生きている見た目のまま残す（renderField 側）。
  // 暗くすると「死体が場に残っている」ように見え、待たないと数値が空白の上に残る。
  if (typeof api.beat === 'function') await api.beat();
  // ここまでで数値・VFXは出し終えている。再生中でも焼き落としを始めてよい印。
  unit._deathFxReady = true;
  if (typeof api.processDeath === 'function') await api.processDeath(unit, ev.side);
  // 詰めてよいが、**攻撃モーションの完了は待つ**。飛行中に盤面を詰めると、
  // 複製の戻り先が動いて元のカードが二重に見える。
  if (typeof api.compact === 'function') api.compact();
  return true;
}

// ── 変身 ────────────────────────────────────
// その場で姿と数値が入れ替わる演出。据え置いている表示値もここで進める。
// api: findUnit(side,id) / setForm(unit, ev) / advanceShown(unit) / render()
function presentTransformEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  if (ev.unit) Object.assign(unit, ev.unit);
  else if (typeof api.setForm === 'function') api.setForm(unit, ev);
  if (typeof api.advanceShown === 'function') api.advanceShown(unit);
  if (typeof api.render === 'function') api.render();
  return true;
}

// ── 封印の解放 ────────────────────────────────
// api: findUnit(side,id) / compact() / logLine(unit)
async function presentSealReleaseEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  unit._sealed = false;
  delete unit._sealValue;
  if (typeof playSealReleaseVfx === 'function') {
    await playSealReleaseVfx(unit, ev.side === 'p2' ? 'enemy' : 'ally');
  }
  delete unit._sealReady;
  if (typeof api.logLine === 'function' && typeof log === 'function') {
    const line = api.logLine(unit);
    if (line) log(line, 'gold');
  }
  if (typeof api.compact === 'function') api.compact();
  return true;
}

// ── 逃走（ATKが0になって場を去る）────────────────────
// 死亡ではないので死亡効果は出ない。演出を見せてから盤面から外す。
// 先に外すとカードが一瞬で消え、何が起きたのか分からない。
// api: findUnit(side,id) / removeFromBoard(unit, side) / compact()
async function presentFledEvent(ev, api) {
  if (!ev || !api) return false;
  const unit = api.findUnit(ev.side, ev.unitId);
  if (!unit) return false;
  unit._fled = true;
  if (typeof playFledVfx === 'function') {
    try { await playFledVfx(ev.side === 'p1' ? 'ally' : 'enemy', unit); }
    catch (err) { console.error('[fled vfx]', err); }
  }
  if (typeof api.removeFromBoard === 'function') api.removeFromBoard(unit, ev.side);
  if (typeof api.compact === 'function') api.compact();
  return true;
}

// ── 決着のカットイン ────────────────────────────
// カットインの**描画**（showBattleCutin）は元から共通。ここで揃えるのは
// 「いつ・どのSEで・どの尺で出すか」。以前はPvEとオンラインで別々に書かれており、
// 片方の調整がもう片方に反映されなかった。
//
// **片側だけの演出を足したい時は、共通部分を書き換えず `extra()` に足す。**
// そうすれば、あとから共通部分を調整したときも必ず両方に効く。
//
// api:
//   win        … 勝ち（引き分けも勝ち扱い）
//   defeatLabel … 負けたときの文字。'敗北' でオンラインの敗北表示になる（既定は撤退）
//   bossWin    … ボス撃破（勝利音を変える）
//   withdraw   … 撤退（SEを鳴らさない）
//   durationMs … カットインの尺（省略時は既定）
//   extra(overlay) … その側だけの追加演出。**共通部分の置き換えには使わない。**
//   afterShown(overlay) … 表示後の扱い（PvEは入力待ち、オンラインは自動で閉じる）
const PRESENT_RESULT_CUTIN_MS = 1800;
// 「進む」ボタンを出さない側で、本来ボタンが出る時刻から自動的に進むまでの間（ms）。
const PRESENT_RESULT_AUTO_CONTINUE_MS = 1000;
async function presentBattleResultCutin(api) {
  if (!api || typeof showBattleCutin !== 'function') return null;
  const win = !!api.win;
  const withdraw = !!api.withdraw;
  if (win && !withdraw && typeof playSfx === 'function') {
    playSfx(api.bossWin ? 'bossVictory' : 'victory', { group: 'ui' });
  }
  const durationMs = Math.max(1500, Number(api.durationMs) || PRESENT_RESULT_CUTIN_MS);
  // 負けの見せ方：PvEは「撤退」、オンラインは「敗北」。文字だけの違いなので
  // 分岐は増やさず、呼び出し側が defeatLabel で選ぶ。
  const loseMode = api.defeatLabel === '敗北' ? 'defeat' : 'retreat';
  const overlay = await showBattleCutin(withdraw || !win ? loseMode : 'victory', { durationMs });
  if (typeof api.extra === 'function') await api.extra(overlay);
  if (typeof api.afterShown === 'function') await api.afterShown(overlay);
  return overlay;
}

if (typeof window !== 'undefined') {
  window.presentDamageEvent = presentDamageEvent;
  window.presentDamageSfxBatch = presentDamageSfxBatch;
  window.presentShieldLostEvent = presentShieldLostEvent;
  window.presentKeywordEffectEvent = presentKeywordEffectEvent;
  window.presentFledEvent = presentFledEvent;
  window.presentStatChangeEvent = presentStatChangeEvent;
  window.presentSealReleaseEvent = presentSealReleaseEvent;
  window.presentTransformEvent = presentTransformEvent;
  window.presentDeathEvent = presentDeathEvent;
  window.presentManaThresholdEvent = presentManaThresholdEvent;
window.presentEffectFlashEvent = presentEffectFlashEvent;
  window.presentQueueEffectFlash = presentQueueEffectFlash;
  window.presentFlushEffectFlashes = presentFlushEffectFlashes;
  window.presentResetEffectFlashes = presentResetEffectFlashes;
window.presentReviveEvent = presentReviveEvent;
  window.presentAttackContactVfxEvent = presentAttackContactVfxEvent;
  window.presentSummonPlacement = presentSummonPlacement;
  window.presentBattleResultCutin = presentBattleResultCutin;
  window.PRESENT_RESULT_CUTIN_MS = PRESENT_RESULT_CUTIN_MS;
  window.PRESENT_RESULT_AUTO_CONTINUE_MS = PRESENT_RESULT_AUTO_CONTINUE_MS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    presentDamageEvent, presentDamageSfxBatch, presentShieldLostEvent, presentFledEvent,
    presentKeywordEffectEvent,
    presentStatChangeEvent, presentSealReleaseEvent, presentTransformEvent,
    presentDeathEvent, presentManaThresholdEvent, presentSummonPlacement, presentReviveEvent,
    presentEffectFlashEvent, presentQueueEffectFlash, presentFlushEffectFlashes, presentResetEffectFlashes,
    presentBattleResultCutin, PRESENT_RESULT_CUTIN_MS, PRESENT_RESULT_AUTO_CONTINUE_MS,
  };
}
