// ═══════════════════════════════════════
// battle/present.js — 再生層の「方針」を1箇所に集める層。
//
// PvE（js/engine/battle.js）とオンライン（js/online/board.js）は、DOMの触り方も
// ユニットの引き方も違うため、描画そのものを1つの関数に統合するのは現実的でない。
// しかし**「どういう規則で見せるか」**は両方で同じでなければならない。実際に食い違って
// バグになったのは毎回この「規則」の側だった（召喚のスロット選択・ダメージ数値の重なり・
// マナ効果VFXの間引き・固有VFXの重複）。
//
// そこで、DOMを一切触らない「方針」だけをここへ集め、両方から呼ぶ。
//   ・ここでは **G を参照しない／DOMを触らない／数値や勝敗を計算しない**。
//   ・規則を変えるときは必ずここを直す。呼び出し側へ書き戻した時点で二重実装に逆戻りする。
// ═══════════════════════════════════════

// 盤面スロットの既定値。renderField が描画する範囲と一致させること。
const PRESENT_FRONT_SLOTS = 7;
const PRESENT_MAX_SLOTS = 14;

// 命中してから、その結果（負傷効果など）を見せ始めるまでの間（ms）。
// 0にするとダメージ数値より先に負傷効果が動いて見える（ミノタウロスの「直ちに攻撃する」等）。
// PvEは負傷効果の発火前に、オンラインは damage イベントの後にこの間を取る。**同じ値を使うこと。**
// 長くすると戦闘全体が間延びするので、数値が視認できる最小限にとどめる。
const PRESENT_HIT_BEAT_MS = 260;

// マナ解決の「ひと続き」とみなすイベント種別。
// ここに無い種別（attack / death など）が来たら、別の発動機会として数え直す。
// damage はマナ閾値効果自身（アラクネ等）も出すため継続扱いにする。
const PRESENT_MANA_RUN_TYPES = new Set([
  'mana_threshold', 'mana_gain', 'gold_gain', 'mana_set',
  'stat_change', 'keyword_effect', 'item_reward', 'summon', 'transform', 'seal_apply', 'damage',
]);

// ── 召喚のスロット選択 ────────────────────────────────
// 盤面配列は renderField が index 0..MAX-1 しか描画しない固定長のスロット配列。
// 末尾へ push すると描画対象外へ入り、DOMスロットが作られないため
// 「内部では攻撃しているのに画面上は何も起きない」状態になる（オンラインで実際に発生）。
// 必ずレーン範囲内の空きスロット番号を返すこと。空きが無ければ -1。
function presentChooseSummonSlot(list, unit, placement, sourceIndex, opts) {
  if (!Array.isArray(list)) return -1;
  const maxSlots = (opts && opts.maxSlots) || PRESENT_MAX_SLOTS;
  const frontSlots = (opts && opts.frontSlots) || PRESENT_FRONT_SLOTS;
  while (list.length < maxSlots) list[list.length] = null;
  const rear = !!(unit && unit.lane === 'rear');
  const from = rear ? frontSlots : 0;
  const to = rear ? maxSlots : frontSlots;
  const relative = (placement === 'leftOfSource' || placement === 'rightOfSource')
    && sourceIndex >= from && sourceIndex < to;
  if (relative) {
    const start = placement === 'leftOfSource' ? sourceIndex : sourceIndex + 1;
    for (let i = start; i < to; i++) if (!list[i]) return i;
  }
  for (let i = from; i < to; i++) if (!list[i]) return i;
  return -1;
}

// ── ダメージ数値の順番待ち ──────────────────────────────
// 同じキャラクターが1回の解決で複数回ダメージを受けると、数値が同じ位置に重なって読めない。
// 対象ごとに「前の数値が消える時刻」を覚えておき、次はそれまで待ってから出す。
// 対象が違う場合は待たない（別のカードの上なので重ならない）。
// 同じキャラクターへ数値が続けて出る時の間隔（ms）。
// 前の数値が消えるまで待つ（＝ラベルの表示時間ぶん待つ）と、闇の炎やラミアで
// 効果ダメージが大量に出る場面が極端に間延びする。読める最小限だけずらして
// 「-1 -1 -1」とパパパッと連続表示する。
// 連続する数値は同じ値であることが多く、一つ一つ読ませる必要はない。
const PRESENT_DAMAGE_STAGGER_MS = 75;

// 数値の重なりを防ぐ順番待ち。
// **待ち時刻は呼び出しをまたいで共有する。** 1回のダメージ処理ごとに別の表で
// 管理すると、同じキャラクターへ別経路（applyDamageBatch とイベント再生など）から
// 同時にダメージが入った時に互いを知らず、数値が重なって読めなくなる。
const _presentDamageReadyAt = new Map();
function presentDamageNow() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
function presentCreateDamageGate(labelDurationMs) {
  const stagger = () => {
    const v = (typeof labelDurationMs === 'function' ? labelDurationMs() : labelDurationMs);
    // 明示的に間隔を渡された場合だけそれに従う（既定は共通のスタッガー）。
    return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : PRESENT_DAMAGE_STAGGER_MS;
  };
  return {
    // 次にこの対象へ数値を出すまで待つべきms（0以下なら待たない）
    waitMsFor(key) { return (Number(_presentDamageReadyAt.get(key)) || 0) - presentDamageNow(); },
    // 数値を出した直後に呼ぶ
    noteShown(key) { _presentDamageReadyAt.set(key, presentDamageNow() + stagger()); },
    // 表示枠を1つ予約し、この数値を出すまでの待ちmsを返す。
    // waitMsFor＋noteShown を別々に呼ぶと、待っている間に別経路が同じ時刻を
    // 取ってしまい数値が重なる。連続表示はこちらを使うこと。
    reserve(key) {
      const now = presentDamageNow();
      const at = Math.max(now, Number(_presentDamageReadyAt.get(key)) || 0);
      _presentDamageReadyAt.set(key, at + stagger());
      return at - now;
    },
    // 戦闘や処理の切れ目で待ち時刻を捨てる。共有表なのでキー単位では消さない。
    reset() { _presentDamageReadyAt.clear(); },
  };
}

// ── キャラクター固有VFXを「誰の効果として」出すか ──────────────────
// 実際に食い違った箇所。PvEは攻撃者を発生元にしていたため肩代わり側の固有VFXが出ず、
// オンラインは発生元を一切渡していなかったため固有VFXが皆無だった。
//
// 規則：
//   ・肩代わり（マータ等）で受けたぶんは、攻撃した側ではなく**肩代わりした本人**の効果。
//   ・固有VFXを出してよいのは、そのカード自身の効果文がダメージに言及している時だけ。
//     （強化カードで得た効果で他キャラに影響を与えた時、自分のVFXを相手に出さないため）
// ownEffectText には「そのカード自身の効果文」を返す関数を渡す（マスタ参照は呼び出し側の役目）。
function presentDamageVfxSource(ev, target, source, ownEffectText) {
  if (!ev) return null;
  const redirected = !!ev.redirectedFrom;
  const unit = redirected ? target : source;
  if (!unit) return null;
  if (!ev.effect && !redirected) return null;
  const text = String((typeof ownEffectText === 'function' ? ownEffectText(unit) : '') || '');
  return /ダメージ/.test(text) ? unit : null;
}

// ── 能力変化（stat_change）で固有VFXを出す効果 ────────────────────
// 盤面の初期化や指輪の常時補正まで演出すると、戦闘中ずっとVFXが出続ける。
// 「カードの効果が発動した」と言える理由だけをここに列挙する。
const PRESENT_STAT_CHANGE_VFX_REASONS = new Set([
  'golem', 'gigantes', 'kobold', 'incubus', 'chaos_imp', 'healing', 'fornjot', 'umbra',
  'lamia', 'ymir', 'elven_mage', 'imp_steal', 'imp_gain', 'brownie', 'brownie_attack',
  'tactics', 'resonance', 'sword_skill', 'attack_self_buff', 'attack_self_atk_buff',
  'attack_allies_buff', 'attack_color_buff', 'attack_same_color_buff', 'attack_mana_buff',
  'injury_self_buff', 'injury_allies_atk', 'injury_color_buff', 'injury_sacrifice_hp',
  'injury_allies_hp', 'injury_enemy_atk_down', 'injury_allies_fixed_buff',
  'gargoyle', 'hellhound', 'opening_team_buff', 'opening_color_buff', 'opening_hp_scaled_debuff',
  'attack_swap', 'different_color_attack', 'sacrifice_atk_steal', 'sacrifice_atk_gain',
  'death_color_buff', 'will', 'inherit', 'ally_death_buff', 'ally_death_self_buff',
  'character_death_self_buff', 'vampire_lord', 'character_death_team_hp', 'revenant',
  'necromancy', 'naglfar', 'gellmir', 'arch_demon', 'release_sacrifice_power', 'release_power_double',
  'release_enemy_damage', 'overload', 'opening_atk_double', 'opening_hp_double',
  'mana_threshold', 'mana_threshold_arachne_buff', 'mana_threshold_random_color',
  'mana_threshold_random_color_count', 'mana_threshold_random_ally', 'mana_threshold_color',
  'mana_threshold_color_all', 'mana_threshold_color_atk', 'mana_threshold_random_purple',
  'mana_threshold_hp_double', 'release_bonus',
  'release_self_buff', 'death_random_blue_buff', 'death_random_ally_buff', 'ghost',
]);

// ガーゴイル／剣技は「正のステータス変化だけを見せる」効果。被弾VFXの経路へ流すと、
// 強化された本人が攻撃を受けたように見えるため、固有VFXは出さない。
const PRESENT_STAT_CHANGE_VFX_EXCLUDED = new Set(['gargoyle', 'sword_skill']);

// 能力変化イベントで固有VFXを出してよいか。
// 負傷（golem / kobold）もここで出す。コアが負傷を解決するようになり、
// 攻撃時の負傷ディスパッチは通らなくなったため、ここで抑制すると一度も出ない。
function presentStatChangeVfxAllowed(ev) {
  if (!ev || !ev.sourceId) return false;
  const reason = String(ev.reason || '');
  if (!PRESENT_STAT_CHANGE_VFX_REASONS.has(reason)) return false;
  return !PRESENT_STAT_CHANGE_VFX_EXCLUDED.has(reason);
}

// ── 演出の再生中フラグ ──────────────────────────────────
// 「コアが確定した結果を、これから順に見せている最中」であることを表す。
// 再生中は盤面を詰め直さない・倒れたカードを消さない。ここで先に盤面を動かすと、
// まだ出していないダメージ数値や個別VFXが移動前の位置（＝何もない場所）へ出る。
//
// **PvEとオンラインで同じフラグを使うこと。** 片側だけが立てると、同じ不具合が
// もう片方だけで再発する（実際にPvEだけ直してオンラインが取り残された）。
let _presentPlaybackDepth = 0;
function presentBeginPlayback() { _presentPlaybackDepth++; }
function presentEndPlayback() { _presentPlaybackDepth = Math.max(0, _presentPlaybackDepth - 1); }
function presentIsPlaying() { return _presentPlaybackDepth > 0; }
// 戦闘の切れ目で必ず0へ戻す。例外で抜けた回数が残ると、以後ずっと盤面が詰まらない。
function presentResetPlayback() { _presentPlaybackDepth = 0; }

// ── キャラクター固有VFXの大きさ ────────────────────────
// 素材によって絵の占める割合が違うため、「この番号は半分で出す」という対応を
// ここに集約する。効果としての再生（_playCardEffectVfx）と、被弾演出としての
// 再生（playHitVfx）で別々に持つと、片方だけ巨大に出る（実際にマータで起きた）。
const PRESENT_HALF_SCALE_VFX = new Set(['C001', 'C002', 'C003']);
function presentCharacterVfxScale(code) {
  return PRESENT_HALF_SCALE_VFX.has(String(code || '').toUpperCase()) ? 0.5 : 1;
}

// ── 画面に出すATK/HP ────────────────────────────────
// コアは1手番ぶんを先に解決してから演出を渡すため、演出を再生し始めた時点で
// 実体のATK/HPは**もう変わっている**。そのまま描くと、ダメージ数値が出るより先に
// HPが減って見える（フィーンドの解放効果などで顕著）。
// そこで「まだ見せていない変化」を反映しない表示専用の値を持ち、
// 数値・VFXを出す瞬間に進める。**規則はここが唯一の実装。**
function presentShownAtk(unit) {
  if (!unit) return 0;
  return unit._displayAtk != null ? unit._displayAtk : (Number(unit.atk) || 0);
}
function presentShownHp(unit) {
  if (!unit) return 0;
  return unit._displayHp != null ? unit._displayHp : (Number(unit.hp) || 0);
}
function presentShownMaxHp(unit) {
  if (!unit) return 1;
  return Math.max(1, unit._displayMaxHp != null ? unit._displayMaxHp : (Number(unit.maxHp) || Number(unit.hp) || 1));
}
// 表示値を「この手番が始まる前」に戻す（再生の頭で呼ぶ）。
function presentHoldShown(unit, atk, hp, maxHp) {
  if (!unit) return;
  unit._displayAtk = Number(atk) || 0;
  unit._displayHp = Number(hp) || 0;
  unit._displayMaxHp = Math.max(1, Number(maxHp) || Number(hp) || 1);
}
// 表示値を進める（数値・VFXを出す瞬間に呼ぶ）。
function presentAdvanceShown(unit, next) {
  if (!unit || !next) return;
  if (next.atk != null) unit._displayAtk = Math.max(0, Number(next.atk) || 0);
  if (next.hp != null) unit._displayHp = Math.max(0, Number(next.hp) || 0);
  if (next.maxHp != null) unit._displayMaxHp = Math.max(1, Number(next.maxHp) || 1);
}
// 表示値の据え置きをやめて実体へ戻す（再生の終わりで呼ぶ）。
function presentReleaseShown(unit) {
  if (!unit) return;
  delete unit._displayAtk;
  delete unit._displayHp;
  delete unit._displayMaxHp;
}

// 倒れた体を盤面に残しておくか。
// 再生中で、まだ死亡演出を始めていない体は残す。ここで先に配列から外すと、
// あとから来るダメージイベントが「対象が見つからない」で読み飛ばされ、
// とどめの数値が一度も出ない（PvEで実際に起きていた）。
function presentKeepsOnBoard(unit) {
  return !!unit && presentIsPlaying() && !unit._deathFxReady;
}

// ── 「1回だけ見せる」ゲート ─────────────────────────────
// マナ効果VFX（キャラクターごとに1回）と、固有VFXの重複（発生元・効果・対象ごとに1回）に使う。
function presentCreateOnceGate() {
  const seen = new Set();
  return {
    shouldPlay(key) { if (seen.has(key)) return false; seen.add(key); return true; },
    has(key) { return seen.has(key); },
    reset() { seen.clear(); },
  };
}

// マナ解決のひと続きが途切れたか（＝間引きを数え直すか）
function presentBreaksManaRun(ev) {
  return !ev || !PRESENT_MANA_RUN_TYPES.has(ev.type);
}

if (typeof window !== 'undefined') {
  window.PRESENT_HIT_BEAT_MS = PRESENT_HIT_BEAT_MS;
  window.PRESENT_FRONT_SLOTS = PRESENT_FRONT_SLOTS;
  window.PRESENT_MAX_SLOTS = PRESENT_MAX_SLOTS;
  window.PRESENT_MANA_RUN_TYPES = PRESENT_MANA_RUN_TYPES;
  window.presentChooseSummonSlot = presentChooseSummonSlot;
  window.presentCreateDamageGate = presentCreateDamageGate;
  window.PRESENT_DAMAGE_STAGGER_MS = PRESENT_DAMAGE_STAGGER_MS;
  window.presentCreateOnceGate = presentCreateOnceGate;
  window.presentBreaksManaRun = presentBreaksManaRun;
  window.presentBeginPlayback = presentBeginPlayback;
  window.presentEndPlayback = presentEndPlayback;
  window.presentIsPlaying = presentIsPlaying;
  window.presentKeepsOnBoard = presentKeepsOnBoard;
  window.presentShownAtk = presentShownAtk;
  window.presentShownHp = presentShownHp;
  window.presentShownMaxHp = presentShownMaxHp;
  window.presentHoldShown = presentHoldShown;
  window.presentAdvanceShown = presentAdvanceShown;
  window.presentReleaseShown = presentReleaseShown;
  window.presentCharacterVfxScale = presentCharacterVfxScale;
  window.presentResetPlayback = presentResetPlayback;
  window.presentDamageVfxSource = presentDamageVfxSource;
  window.presentStatChangeVfxAllowed = presentStatChangeVfxAllowed;
  window.PRESENT_STAT_CHANGE_VFX_REASONS = PRESENT_STAT_CHANGE_VFX_REASONS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRESENT_HIT_BEAT_MS, PRESENT_FRONT_SLOTS, PRESENT_MAX_SLOTS, PRESENT_MANA_RUN_TYPES,
    presentChooseSummonSlot, presentCreateDamageGate, presentCreateOnceGate, presentBreaksManaRun,
    PRESENT_DAMAGE_STAGGER_MS, presentDamageVfxSource, presentStatChangeVfxAllowed,
    presentBeginPlayback, presentEndPlayback, presentIsPlaying, presentResetPlayback,
    presentKeepsOnBoard, presentCharacterVfxScale,
    presentShownAtk, presentShownHp, presentShownMaxHp,
    presentHoldShown, presentAdvanceShown, presentReleaseShown,
    PRESENT_STAT_CHANGE_VFX_REASONS,
  };
}
