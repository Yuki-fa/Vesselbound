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

// 通常攻撃のモーションの尺。**PvEとオンラインで同じ値を使うこと。**
// stopRatio：踏み込みで止める位置（攻撃効果はこの時点で見せる）。
// firstDuration：踏み込み、secondDuration：残りの間合い、returnDuration：戻り。
const PRESENT_ATTACK_MOTION = {
  stopRatio: .25, firstDuration: 260, secondDuration: 360, returnDuration: 420,
};

// キャラクターが1体行動し終えてから、次のキャラクターが動き出すまでの間（ms）。
// 0にすると攻撃が途切れなく続き、何が起きているか追えない。
// **PvEとオンラインで同じ値を使うこと。**
const PRESENT_TURN_GAP_MS = 240;

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

// ── ダメージの「束」 ────────────────────────────────
// **ダメージは種類ごとに1束ずつ片付ける。他の束が出ている間は別の束を出さない。**
//   攻撃効果（アラッサス）→ 攻撃効果で誘発（ペガサス／マナ生成からの炎の矢）
//   → 戦闘ダメージ（攻撃と反撃）→ 負傷効果（メデューサ）→ 死亡効果（闇の炎）
// どれが同じ束かはコアが damageKind と batch で決める（present側で推測しない）。
// 束の中の数値は全員同時に出す。ずらしてよいのは、VFXがそう見せる時だけ。
const PRESENT_DAMAGE_GROUP_GAP_MS = 260;  // 種類が変わる時の間
const PRESENT_DAMAGE_RUN_GAP_MS = 170;    // 同じ種類が続く時（ダメージ量が違っても畳みかける）
// 連続再生では**数値の表示時間をこの間隔より短くする**（＝出て、消えて、間が空く）。
// 前の数値を残したまま次を重ねると、同じ位置に同じ「-1」が出続けるため、
// 何回発動しても「-1が1つ出ているだけ」に見える（闇の炎×6で2回に見えた）。
// 尺を間隔いっぱい（＝100%）にすると、消え際と次の出始めが重なって同じことが起きる。
// 必ず一度完全に消えてから次を出すため、間隔より短い尺を返す。
// 数値の長さは playHitVfx の labelDuration へ渡す（present_events.js）。
const PRESENT_DAMAGE_RUN_LABEL_RATIO = .6;
function presentDamageRunLabelMs(gapMs) {
  const gap = Number(gapMs) || 0;
  if (!(gap > 0)) return 0;
  return Math.max(80, Math.round(gap * PRESENT_DAMAGE_RUN_LABEL_RATIO));
}

// ── マナ効果の「同じ効果」と「同じ瞬間」────────────────────
// **全く同じ効果なら、複数のキャラクターぶんを同時に見せる。**
// 活性化を2体が持つとき、1体ずつ順に上げると「片方が先に強くなる」ように見える。
// 効果が違えば従来どおり順に見せる（発動順＝優先順位）。
// どれが同じ効果・同じ瞬間かはコアが決める（effectNo と wave）。
// **present側でイベントの並びから推測しない。**
function presentManaEffectKey(ev) {
  if (!ev) return '';
  return `${String(ev.effectNo || '')}|${Number(ev.cost) || 0}|${String(ev.desc || '')}`;
}
function presentManaWaveKey(ev) {
  if (!ev) return '';
  return `${presentManaEffectKey(ev)}|w${Number(ev.wave) || 0}`;
}
// 同じ瞬間に発動するマナ効果イベントを、イベント列から拾う（先読み）。
// 間に挟まる stat_change などは読み飛ばし、別の発動回に当たったら止める。
function presentManaWaveEvents(events, index) {
  const list = Array.isArray(events) ? events : [];
  const start = list[index];
  if (!start || start.type !== 'mana_threshold') return [];
  const key = presentManaWaveKey(start);
  const wave = Number(start.wave) || 0;
  const out = [];
  for (let i = index; i < list.length; i++) {
    const e = list[i];
    if (!e) break;
    if (e.type === 'turn_begin' || e.type === 'attack' || e.type === 'death') break;
    if (e.type !== 'mana_threshold') continue;
    // **別の効果が間に挟まっても、同じ発動回のあいだは拾い続ける。**
    // 最初に違う効果へ当たった時点で打ち切っていた頃は、順位で間に別の効果が
    // 入ると2体目が拾えず、片方だけVFXが出てもう片方は素通りしていた。
    if ((Number(e.wave) || 0) !== wave) break;
    if (presentManaWaveKey(e) === key) out.push(e);
  }
  return out;
}

// ── 復活（キーワード「復活」で再召喚された）時の演出（K020）──────────
// **SEと同時にVFXをフェードイン → VFXだけを見せる間（HOLD）→ その上にカードを
// フェードイン → VFXをフェードアウト。**
// **HOLDを素材の見せ場に合わせること。** K020は119コマ・約3.9秒で、最初の10コマ弱は
// ほぼ透明、光が最も強くなるのは再生開始から約0.7秒。以前はHOLDが無く、
// 0.26秒でカードを重ね始めて0.58秒から消し始めていたため、
// **一番明るい瞬間がカードの裏で、しかも消えかけの状態**になり、何も出ていないように見えた。
const PRESENT_REVIVE_VFX_FADE_IN_MS = 200;
// フェードイン後、カードを出し始めるまでVFXだけを見せる時間。
// フェードイン＋HOLD＝素材の光が最も強くなる時刻（約700ms）に合わせる。
const PRESENT_REVIVE_VFX_HOLD_MS = 500;
const PRESENT_REVIVE_CARD_FADE_MS = 320;
const PRESENT_REVIVE_VFX_FADE_OUT_MS = 380;
// 素材（K020）の絵がフレームの中で右寄りなので、その分だけ左へ寄せて中心に合わせる。
// **カード幅に対する比**（負で左）。ここが大きさ・位置のつまみの唯一の置き場。
const PRESENT_REVIVE_VFX_OFFSET_X = -.06;
const PRESENT_REVIVE_VFX_OFFSET_Y = 0;

// ── マナを得た時の演出（S004）────────────────────────────
// 発生させたキャラクターの**カード中央より少し上**に出し、
// **上へ動きながらフェードアウト**する（浮かび上がって消える）。
// 出しっぱなしにはしない。
const PRESENT_MANA_GAIN_VFX_SIZE = 64;      // 方向アイコン（.panel-dir）と同じ64px（ゲーム内座標）
// カード幅に対する下限。盤面のカードが大きい戦闘画面で、
// 64pxのままだと点にしか見えないため、カード幅のこの比を下回らないようにする。
const PRESENT_MANA_GAIN_VFX_MIN_CARD_RATIO = .55;
const PRESENT_MANA_GAIN_VFX_FADE_IN_MS = 140;
// **マナの数字を動かす時刻。** VFXが見え始めてから動かす（フェードインぶん待つ）。
// 先に数字だけ動くと「VFXより先にマナを得た」ように見える（ヘカトンケイルで発覚）。
const PRESENT_MANA_GAIN_VALUE_DELAY_MS = PRESENT_MANA_GAIN_VFX_FADE_IN_MS;
const PRESENT_MANA_GAIN_VFX_HOLD_MS = 260;
const PRESENT_MANA_GAIN_VFX_FADE_OUT_MS = 260;
// 出し始める位置。**カードの中央からどれだけ上か**（カード高さに対する比。0で中央）。
const PRESENT_MANA_GAIN_VFX_START_Y = .18;
// 消えるまでに上へ動く距離（カード高さに対する比）。
const PRESENT_MANA_GAIN_VFX_RISE = .35;

// ── 召喚の登場演出（S001）の速さ ───────────────────────────
// 1で既定（順再生750ms・逆再生750ms）。大きいほど速い。
// 順再生は素材の再生速度そのものは変えられないので、**折り返しを早める**形になる。
const PRESENT_SUMMON_VFX_SPEED = 1.5;

// ── 状態異常を付けた時のVFX（毒牙＝K003 等）───────────────────
// **同じキャラクターへ続けて付与しても出し直さない。** 1つの再生を延ばして出し続ける
// （バフVFXと同じ見せ方）。連続付与のたびに作り直していた頃は、絵が何度も頭から
// 再生されてちらついて見えた。最後の付与からこの時間だけ出し続けてから消す。
const PRESENT_KEYWORD_VFX_HOLD_MS = 800;
// 出し始め・消え際のフェード。
const PRESENT_KEYWORD_VFX_FADE_IN_MS = 120;
const PRESENT_KEYWORD_VFX_FADE_OUT_MS = 220;

// ── 発生源から広がる範囲効果の見せ方 ───────────────────────
// 既定は薙ぎ払い（アラッサス＝炎が対象を順になぎ払う）。
// 'expand' は「発生源の周りにフェードインして高速で巨大化し、画面外へ抜ける」波
// （サイレン＝C011）。**どちらも「見た目上当たった相手から数値を出す」。**
// 鍵はカードの演出番号（シートの「VFX/SE」列＝fxCode、無ければカードのNo.）。
const PRESENT_AREA_VFX_STYLE = {
  C011: 'expand',   // サイレン
};
function presentAreaVfxStyle(code) {
  return PRESENT_AREA_VFX_STYLE[String(code || '').toUpperCase()] || 'sweep';
}
// 広がる波の尺（ms）。フェードイン→巨大化。
const PRESENT_EXPAND_VFX_FADE_MS = 180;
const PRESENT_EXPAND_VFX_GROW_MS = 620;
// 開始の大きさ（発生源カードの幅に対する比）と、
// 終わりの大きさ（画面の対角線に対する比。1を超えると完全に画面外へ出る）。
const PRESENT_EXPAND_VFX_START = .6;
const PRESENT_EXPAND_VFX_END = 2.4;
// 「届いた」とみなす半径（絵の半径に対する比）。素材の透明な余白ぶん内側にする。
const PRESENT_EXPAND_VFX_HIT_RATIO = .8;

// ── 発生元から対象へ飛ぶ効果（炎の矢）──────────────────────
// **この効果は「発生元の上に出す」のではなく、対象へ向かって飛ばす。**
// 飛び終わった（＝対象の上で消えた）瞬間に、着弾の演出とダメージ数値を出す。
// 発射のタイミングをずらすので、ダメージ数値もその矢ごとの着弾時刻に出る。
// 発生元から対象へ飛ばす効果。**マナ効果でも攻撃効果でも同じ見せ方にする。**
// 鍵はカードの演出番号（シートの「VFX/SE」列＝fxCode、無ければカードのNo.）。
const PRESENT_PROJECTILE_EFFECTS = new Set([
  'E058',   // 炎の矢（マナ効果）
  'C019',   // ケンタウロス（攻撃：ランダムな敵にXダメージ）
]);
// **速度の唯一のつまみ。** 大きくすると遅くなる（224→448＝速度50%）。
const PRESENT_PROJECTILE_FLIGHT_MS = 448;               // 炎の矢の飛行時間
// 同時に撃つ時の発射ずらし。賢者の指輪・マナの種の反復で2本以上になる時、
// 短いと「2発同時に出た」ように見える。1本ずつ続けて撃つ間隔にする。
const PRESENT_PROJECTILE_STAGGER_MS = 260;
// 着弾位置の縦のずらし（対象カードの高さに対する比）。
// 素材の中で絵が上寄りだと、枠の中心を合わせても見た目は上に当たる。
// 見た目上カードの中央で当たるように下げる。
const PRESENT_PROJECTILE_IMPACT_OFFSET_Y = .18;
// 曲線軌道（ミサイル）の見せ方。**素材を歪めない。** 位置と回転だけで見せる。
// 膨らみは始点→終点の垂線方向へ。距離に比例させ、画面外へ出ない範囲で頭打ちにする。
// 着弾VFXを出す高さ（対象カードの高さに対する比。マイナスで上へ）。
// 素材の中で絵が下寄りだと、枠の中心に合わせても見た目は下に出る。
const PRESENT_EFFECT_HIT_OFFSET_Y = -.14;
const PRESENT_MISSILE_BULGE_RATIO = .26;   // 距離に対する膨らみの比
const PRESENT_MISSILE_BULGE_MIN = 40;      // 近距離でも最低これだけ弧を描く（px）
const PRESENT_MISSILE_BULGE_MAX = 190;     // 遠距離でも迂回しすぎない上限（px）
const PRESENT_MISSILE_BULGE_JITTER = .12;  // 毎回わずかに変える幅（±この比。完全ランダムにはしない）
// 飛行時間は距離で少し変えるが、遠いほど極端に遅くならないよう上下限で挟む。
const PRESENT_MISSILE_FLIGHT_MIN_MS = 700;
const PRESENT_MISSILE_FLIGHT_MAX_MS = 1000;
// 素材の先端が向いている方向の補正（度）。E058_1は**上向き**なので +90。
// atan2 は「右向き=0度」を返すため、そのまま使うと先端が進行方向を向かない。
const PRESENT_MISSILE_NOSE_OFFSET_DEG = 90;
// 発射直後はやや緩やか → 中盤で加速 → 最後に素早く吸い込まれる。
// ベジェの t に時間をそのまま入れず、ここを通す。
function presentMissileEase(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  return .15 * x + .85 * x * x;
}
// 始点・終点から三次ベジェの制御点を出す。**座標の直書きをしない。**
// 1本目は「少し外側へ膨らむ」、2本目は「対象へ収束する」ように弱める。
function presentMissileControlPoints(from, to, jitter) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  // 垂線は「画面の上側へ膨らむ方」を選ぶ（下へ膨らむと盤面へ潜って見える）。
  let nx = -uy, ny = ux;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const j = 1 + (Number(jitter) || 0) * PRESENT_MISSILE_BULGE_JITTER;
  const bulge = Math.max(PRESENT_MISSILE_BULGE_MIN,
    Math.min(PRESENT_MISSILE_BULGE_MAX, dist * PRESENT_MISSILE_BULGE_RATIO)) * j;
  return {
    c1: { x: from.x + ux * dist * .25 + nx * bulge, y: from.y + uy * dist * .25 + ny * bulge },
    c2: { x: from.x + ux * dist * .70 + nx * bulge * .45, y: from.y + uy * dist * .70 + ny * bulge * .45 },
    dist,
  };
}
function presentMissileFlightMs(dist) {
  const d = Math.max(0, Number(dist) || 0);
  return Math.max(PRESENT_MISSILE_FLIGHT_MIN_MS,
    Math.min(PRESENT_MISSILE_FLIGHT_MAX_MS, PRESENT_MISSILE_FLIGHT_MIN_MS + d * .4));
}
// ── 与えたダメージが状態異常を付けた時、被弾VFXをそのキーワードの絵に差し替える ──
// **絵だけを差し替える。SEは通常のダメージ音のまま。**
// どのキーワードの絵にするかはここが唯一の定義。
// 判定は「そのダメージの直後に、同じ体へ出ているキーワードイベント」で行う
// （コアのイベントを見るだけ。演出側でカード名や効果文から推測しない）。
const PRESENT_DAMAGE_VFX_KEYWORD_BY_EFFECT = {
  weaken: '衝撃',   // 弱体を付与した＝K004.webp
};
function presentDamageVfxKeyword(events, damageEvent) {
  const list = Array.isArray(events) ? events : [];
  const index = list.indexOf(damageEvent);
  if (index < 0 || !damageEvent) return '';
  for (let i = index + 1; i < list.length; i++) {
    const e = list[i];
    if (!e) break;
    if (e.type === 'damage' || e.type === 'attack' || e.type === 'turn_begin') break;
    if (e.type !== 'keyword_effect') continue;
    if (String(e.side) !== String(damageEvent.side) || String(e.unitId) !== String(damageEvent.unitId)) continue;
    const name = PRESENT_DAMAGE_VFX_KEYWORD_BY_EFFECT[String(e.effect || '')];
    if (name) return name;
  }
  return '';
}

// あるダメージイベントの直後に続く、その体へのキーワード演出（毒牙など）。
// **飛ばす効果（炎の矢）では、着弾の瞬間に見せるためにここで拾う。**
// 拾わずにイベント順で出すと、矢がまだ飛んでいる間に毒付与の演出だけが
// まとめて出て、「4発撃って毒の演出は1回」に見える。
function presentEffectKeywordEvents(events, damageEvent) {
  const list = Array.isArray(events) ? events : [];
  const index = list.indexOf(damageEvent);
  if (index < 0 || !damageEvent) return [];
  const out = [];
  for (let i = index + 1; i < list.length; i++) {
    const e = list[i];
    if (!e) break;
    if (e.type === 'damage' || e.type === 'mana_threshold' || e.type === 'attack' || e.type === 'turn_begin') break;
    if (e.type !== 'keyword_effect') continue;
    if (String(e.side) !== String(damageEvent.side) || String(e.unitId) !== String(damageEvent.unitId)) continue;
    out.push(e);
  }
  return out;
}
function presentIsProjectileEffect(code) {
  return PRESENT_PROJECTILE_EFFECTS.has(String(code || '').toUpperCase());
}
// あるマナ効果イベントが起こしたダメージ（＝その効果の対象）をイベント列から拾う。
// 次のマナ効果／手番の切れ目までを見る。**並びから推測せず、コアが載せた effectNo で判定する。**
function presentEffectDamageEvents(events, index) {
  const list = Array.isArray(events) ? events : [];
  const start = list[index];
  if (!start || start.type !== 'mana_threshold') return [];
  const code = String(start.effectNo || '');
  if (!code) return [];
  const out = [];
  for (let i = index + 1; i < list.length; i++) {
    const e = list[i];
    if (!e) break;
    if (e.type === 'mana_threshold' || e.type === 'turn_begin' || e.type === 'attack') break;
    if (e.type !== 'damage') continue;
    if (String(e.effectNo || '') !== code) continue;
    out.push(e);
  }
  return out;
}

// 効果そのもののVFXの最低再生時間（ms）。
// 1回しか発動しない効果でも、カード固有VFX（`_playCardEffectVfx` の既定＝ゴーレムのC003）と
// 同じ尺だけは必ず映す。これが無いと、発動1回のときに一瞬で消えて見えない。
const PRESENT_EFFECT_VFX_MIN_MS = 720;                  // 活性化などの固有VFXも80%の尺

// ── マナ効果が同じ効果で続けて発動した時 ──────────────────
// 「Xマナ毎」は到達回数ぶん発動する。以前は2回目以降を丸ごと間引いていたため、
// 5回発動しても演出・SEは1回きりで、ATK/HPも一息に+5/+5されたように見えた。
// **間引かず、回数ぶん高速で繰り返す。** 1回目はVFXを含む通常の尺、
// 2回目以降はSEと能力変化の刻みだけをこの間隔で並べる（VFXは重ねない）。
const PRESENT_MANA_RUN_GAP_MS = 150;
let _presentDamageSoloSeq = 0;
const _presentDamageSoloKeys = new WeakMap();
function presentDamageKind(ev) {
  const kind = ev && ev.damageKind;
  return kind ? String(kind) : 'other';
}
// 同時に見せるダメージの束の名前。batch はコアが「同じ瞬間に入ったダメージ」に付ける印。
// 印が無いダメージ（単体への効果ダメージ等）は1件ずつ別の束として順に見せる。
function presentDamageGroupKey(ev) {
  if (!ev) return null;
  const kind = presentDamageKind(ev);
  if (ev.batch) return `${kind}|${ev.batch}`;
  let solo = _presentDamageSoloKeys.get(ev);
  if (!solo) { solo = 's' + (++_presentDamageSoloSeq); _presentDamageSoloKeys.set(ev, solo); }
  return `${kind}|${solo}`;
}

// この数値の**次に同じ種類のダメージが続くか**。続くなら、その間隔（ms）を返す。
// 束の1つ目は「これから連続再生になる」ことを予約時には知れないため、
// イベント列を1つ先まで見る。これを見ないと1つ目だけ数値が長く出っぱなしになり、
// 2つ目が重なって「1回しか出ていない」ように見える。
function presentDamageRunAheadMs(events, index) {
  const list = Array.isArray(events) ? events : [];
  const cur = list[index];
  if (!cur) return 0;
  const key = presentDamageGroupKey(cur);
  const kind = presentDamageKind(cur);
  for (let i = index + 1; i < list.length; i++) {
    const d = list[i];
    if (!d || d.type === 'turn_begin') break;
    if (d.type !== 'damage' || !(Number(d.amount) > 0)) continue;
    if (presentDamageGroupKey(d) === key) continue;   // 同じ束（同時に出る分）
    if (presentDamageKind(d) !== kind) return 0;
    // **短くするのは「同じ体へ続けて数値が出る」時だけ。**
    // 別の体へ移るだけなら数値は重ならないので、短くすると読めなくなる
    // （アラクネの全体ダメージが一瞬で消えていた）。
    for (let j = i; j < list.length; j++) {
      const n = list[j];
      if (!n || n.type === 'turn_begin') break;
      if (n.type !== 'damage' || !(Number(n.amount) > 0)) continue;
      if (presentDamageGroupKey(n) !== presentDamageGroupKey(d)) break;
      if (String(n.side) === String(cur.side) && String(n.unitId) === String(cur.unitId)) {
        return PRESENT_DAMAGE_RUN_GAP_MS;
      }
    }
    return 0;
  }
  return 0;
}

function presentCreateDamageGate(labelDurationMs) {
  const stagger = () => {
    const v = (typeof labelDurationMs === 'function' ? labelDurationMs() : labelDurationMs);
    // 明示的に間隔を渡された場合だけそれに従う（既定は共通のスタッガー）。
    return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : PRESENT_DAMAGE_STAGGER_MS;
  };
  let groupKey = null;      // いま出している束
  let groupKind = null;     // その束の種類
  let groupRunMs = 0;       // 同じ種類が続いている時、次の束までの間隔（0＝連続でない）
  let prevGroupKeys = new Set();  // 直前の束に入っていた対象
  let groupStartAt = 0;     // 束の数値を出し始める時刻
  let groupEndAt = 0;       // 束の最後の数値を出す時刻
  const shownInGroup = new Map();  // 束の中で同じ対象へ2回出す時だけずらす
  return {
    // 次にこの対象へ数値を出すまで待つべきms（0以下なら待たない）
    waitMsFor(key) { return (Number(_presentDamageReadyAt.get(key)) || 0) - presentDamageNow(); },
    // 数値を出した直後に呼ぶ
    noteShown(key) { _presentDamageReadyAt.set(key, presentDamageNow() + stagger()); },
    // 表示枠を1つ予約し、この数値を出すまでの待ちmsを返す。
    // waitMsFor＋noteShown を別々に呼ぶと、待っている間に別経路が同じ時刻を
    // 取ってしまい数値が重なる。連続表示はこちらを使うこと。
    // ev（ダメージイベント）を渡すと、上の「束」の規則で待ち時刻を決める。
    reserve(key, ev) {
      const now = presentDamageNow();
      if (!ev) {
        // 旧経路（イベント列を持たない applyDamageBatch 等）は対象ごとの順番待ちだけ。
        const at = Math.max(now, Number(_presentDamageReadyAt.get(key)) || 0);
        _presentDamageReadyAt.set(key, at + stagger());
        return at - now;
      }
      const gk = presentDamageGroupKey(ev);
      if (gk !== groupKey) {
        const kind = presentDamageKind(ev);
        // 前の束を出し終えるまで次の束は出さない。
        // 同じ種類が続く場合だけ短い間隔で畳みかける（闇の炎が2体続く等）。
        const isRun = groupKind !== null && kind === groupKind;
        const gap = groupKind === null ? 0
          : (isRun ? PRESENT_DAMAGE_RUN_GAP_MS : PRESENT_DAMAGE_GROUP_GAP_MS);
        // **数値を短くするのは「同じ体へ続けて数値が出る」時だけ。**
        // 別の体へ移るだけなら重ならないので、短くすると読めなくなる
        // （全体ダメージの数値が一瞬で消えていた）。
        groupRunMs = isRun && prevGroupKeys.has(key) ? PRESENT_DAMAGE_RUN_GAP_MS : 0;
        groupStartAt = Math.max(now, groupEndAt + gap);
        groupEndAt = groupStartAt;
        groupKey = gk;
        groupKind = kind;
        prevGroupKeys = new Set(shownInGroup.keys());
        shownInGroup.clear();
      }
      // 束の中は全員同時。同じ対象へ2回出る時だけ重ならないようずらす。
      const at = Math.max(groupStartAt, Number(shownInGroup.get(key)) || 0);
      shownInGroup.set(key, at + stagger());
      groupEndAt = Math.max(groupEndAt, at);
      _presentDamageReadyAt.set(key, at + stagger());
      return at - now;
    },
    // 直前に予約した束が「同じ種類の連続」なら、その間隔（ms）。連続でなければ0。
    // 数値の表示時間をこの間隔に収めると、回数分の「出て消える」が見える。
    runMs() { return groupRunMs; },
    // 戦闘や処理の切れ目で待ち時刻を捨てる。共有表なのでキー単位では消さない。
    reset() {
      _presentDamageReadyAt.clear();
      groupKey = null; groupKind = null; groupStartAt = 0; groupEndAt = 0; groupRunMs = 0;
      prevGroupKeys = new Set();
      shownInGroup.clear();
    },
  };
}

// ── 攻撃モーションの先出し（攻撃効果は「少し動き出してから」見せる）──────────
// コアは攻撃効果を接触より先に解決するため、イベント列は
//   [攻撃効果…] → attack → 接触ダメージ
// の順になる。そのまま順に再生すると攻撃者が動く前に効果だけが出るので、
// 先にモーションを始めて途中で止め、効果を見せてから接触まで進める。
//
// **先出しの合図にしてよいのは「これから攻撃する本人が起こした効果」だけ。**
// 受けたダメージ（毒・カード効果）は本人の効果ではない。PvE側はここを見ておらず、
// **ミノタウロス（負傷：効果ダメージを受けたら直ちに攻撃）が、ダメージを受けるより
// 先に動き出していた**。オンライン側は最初から発生元を見ていた（片側だけの実装だった）。
const PRESENT_PRE_ATTACK_EFFECT_TYPES = new Set(['damage', 'sweep_vfx', 'stat_change', 'summon',
  'mana_gain', 'mana_threshold']);
function presentPreAttackEffectOwnerId(ev) {
  const type = String((ev && ev.type) || '');
  if (!PRESENT_PRE_ATTACK_EFFECT_TYPES.has(type)) return null;
  const owner = (type === 'sweep_vfx' || type === 'mana_gain' || type === 'mana_threshold')
    ? ev.unitId : ev.sourceId;
  return owner == null ? null : String(owner);
}
// **動いている本人を決めてよいのは mana_gain まで。**
// マナ効果（mana_threshold）は別のキャラクターが持っていることがあり、
// そちらを本人にすると動いていないキャラクターのモーションが先出しされる。
function presentPreAttackActorId(ev) {
  if (String((ev && ev.type) || '') === 'mana_threshold') return null;
  return presentPreAttackEffectOwnerId(ev);
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
  // **効果のカードNo.が載っているダメージは、その効果の演出で見せる。**
  // 発生元カード本人の固有VFX/SEを重ねてはいけない。付けている強化カード
  // （炎の矢など）で起きたダメージまで本人の効果として鳴り、
  // 「関係ない場面でそのキャラクターのSEが鳴る」ことになる（アラクネで発覚）。
  if (ev.effectNo) return null;
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
  'opening_all_color_double',
  'attack_swap', 'different_color_attack', 'sacrifice_atk_steal', 'sacrifice_atk_gain',
  'death_color_buff', 'will', 'inherit', 'ally_death_buff', 'ally_death_self_buff',
  'character_death_self_buff', 'vampire_lord', 'character_death_team_hp', 'revenant',
  'necromancy', 'naglfar', 'gellmir', 'arch_demon', 'release_sacrifice_power', 'release_power_double',
  // 常時の誘発（「〜たび」）でバフが生じるもの。演出は S009（バフ（常時））。
  'ettin', 'shana_damage', 'eidolon', 'enemy_death_self_buff', 'enemy_death_team_buff',
  'garm', 'attack_observer_team_buff', 'ainsel', 'grimalkin',
  'release_enemy_damage', 'overload', 'opening_atk_double', 'opening_hp_double',
  'mana_threshold', 'mana_threshold_arachne_buff', 'mana_threshold_random_color',
  'mana_threshold_random_color_count', 'mana_threshold_random_ally', 'mana_threshold_color',
  'mana_threshold_color_all', 'mana_threshold_color_atk', 'mana_threshold_random_purple',
  'mana_threshold_hp_double', 'release_bonus',
  'release_self_buff', 'death_random_blue_buff', 'death_random_ally_buff', 'ghost',
]);

// カード固有の効果VFXの尺（ms）。**ゴーレムの負傷エフェクトと同じ長さに揃える。**
// シートの「VFX/SE」列で指定した演出（S005/S007等）もこの尺で出す。
const PRESENT_CARD_EFFECT_VFX_MS = 700;
const PRESENT_ATTACK_CONTACT_VFX_MS = 420;
const PRESENT_ATTACK_CONTACT_FADE_MS = 150;

// ── 攻撃範囲の接触演出（貫通＝K007／三方向攻撃＝K008／全体攻撃＝K009）──────
// **出すのは「攻撃者が対象にぶつかった瞬間」。** 戻りモーションを待ってはいけない。
// そのためコアは attack_contact_vfx を**attackイベントより前に**出し、再生側は
// 攻撃モーションの接触フック（onContact）で鳴らす。
//
// **ダメージの表示をこの演出に依存させないこと。** 貫通・三方向・全体は複数の敵へ
// 同時に入るので、VFXの完了を待つと対象ごとに数値の出る時刻がずれる。
// 受け口は待たずに投げる（fire-and-forget）。
//
// 貫通と三方向攻撃・全体攻撃は**併用できる**。どれを出すかは modes（配列）で決まる。
function presentAttackContactModes(ev) {
  const list = ev && Array.isArray(ev.modes) ? ev.modes : (ev && ev.mode ? [ev.mode] : []);
  const seen = new Set();
  return list.map(x => String(x || '').toLowerCase())
    .filter(x => x && !seen.has(x) && (seen.add(x), true));
}
// **大きさは「画面に出る絵の幅」で決める。** VFXの入れ物（host）は位置を決めるだけの
// 見えない箱で、絵は CSS で host幅の460%に描かれる（`.effect-sustain-host .vfx-hit-video`）。
// 入れ物の大きさを対象の数で変えると絵の大きさまで変わり、倍率のつまみが効かなくなる。
// 高さは素材の縦横比のまま伸びる（K007は137x1086＝縦に約8倍）。**幅を決めれば高さも決まる。**
const PRESENT_VFX_CSS_WIDTH_RATIO = 4.6;   // CSSの width:460%
// 三方向攻撃（K008＝958x162の横薙ぎ）。対象3体の横幅に対する絵の幅の比。
const PRESENT_CONTACT_TRI_WIDTH = 3;
// 絵の中で炎が右寄りにあるぶんの補正。**単位は「絵の幅」に対する比。**
// マイナスで左へ。**三方向攻撃の横位置のつまみはここだけ。**
const PRESENT_CONTACT_TRI_OFFSET_X = -.2;
const PRESENT_CONTACT_ALL_SCALE = .2875;   // 全体攻撃VFXの倍率（従来どおり）
// 貫通（K007＝137x1086の縦長ビーム）。対象カードの幅に対する絵の幅の比。
// **高さはこの約8倍になる。** 大きくすると画面の上下いっぱいに伸びて
// 「画面の下から現れた」ように見えるので、幅で抑えること。
const PRESENT_CONTACT_PIERCE_WIDTH = 1.1;
// 出現位置の横方向のずらし（対象カードの幅に対する比。マイナスで左）。
const PRESENT_CONTACT_PIERCE_OFFSET_X = 0;
const PRESENT_CONTACT_PIERCE_FLIGHT_MS = 420;
// 出現位置＝対象カードの外側の辺から、カード高さのこの比だけ更に外側。
const PRESENT_CONTACT_PIERCE_START_OFFSET = .5;
// 画面外へ抜けきる距離（画面高さに対する比）。
const PRESENT_CONTACT_PIERCE_OVERSHOOT = 1.2;

// 画面固定VFXの登録。C008を含むキャラクター固有VFXは、対象カードのサイズで表示する。
const PRESENT_SCREEN_BOTTOM_VFX = new Set();
function presentIsScreenBottomVfx(code) {
  return PRESENT_SCREEN_BOTTOM_VFX.has(String(code || '').toUpperCase());
}

// 攻撃時のバフ効果は、**カードを問わず一律で同じ演出**にする（特殊演出 S005）。
// カードごとの固有VFXにすると、攻撃のたびに別々の絵が出て何の効果か読み取れない。
const PRESENT_ATTACK_BUFF_REASONS = new Set([
  'attack_self_buff', 'attack_self_atk_buff', 'attack_allies_buff',
  'attack_color_buff', 'attack_same_color_buff', 'attack_mana_buff',
  'attack_blood_team_buff',
]);
// ── バフ演出の種類（特殊演出シート）────────────────────────
// S005＝バフ（攻撃）／S006＝バフ（負傷）／S007＝バフ（死亡）／S008＝バフ（マナ）。
// シートの「VFX/SE」列に複数書かれているカード（ブラウニー＝攻撃と負傷の両方を持つ）は、
// **その能力変化がどのトリガで起きたか**でどちらを使うか決める。
// **どのトリガで起きた能力変化か。** 特殊演出シートの並びに対応させる。
//   S005＝攻撃／S006＝負傷／S007＝死亡／S008＝マナ／S009＝常時（開戦・誘発）
// 死亡は「**倒れた本人の死亡効果**」だけ。「味方が死亡するたび」のような
// **観測（常時）** は、発動しているのは観測者の常時効果なので `passive` に入れる。
const PRESENT_STAT_CHANGE_TRIGGER_REASONS = {
  attack: new Set([...PRESENT_ATTACK_BUFF_REASONS, 'brownie_attack', 'imp_gain', 'imp_steal',
    'attack_swap', 'different_color_attack', 'sentinel', 'arch_demon_purple_buff']),
  injury: new Set(['golem', 'gigantes', 'kobold', 'healing', 'brownie',
    'injury_self_buff', 'injury_allies_atk', 'injury_color_buff', 'injury_sacrifice_hp',
    'injury_allies_hp', 'injury_enemy_atk_down', 'injury_allies_fixed_buff']),
  death: new Set(['will', 'inherit', 'death_color_buff', 'ghost',
    'death_random_blue_buff', 'death_random_ally_buff']),
  // 常時の誘発（「〜たび」）。開戦（opening_*）もここと同じ S009。
  passive: new Set(['ettin', 'shana_damage', 'gargoyle',
    'ally_death_buff', 'ally_death_self_buff', 'character_death_self_buff',
    'character_death_team_hp', 'vampire_lord', 'revenant', 'necromancy',
    'eidolon', 'enemy_death_self_buff', 'enemy_death_team_buff', 'hellhound',
    'gellmir', 'naglfar', 'garm', 'attack_observer_team_buff', 'ainsel', 'grimalkin',
    // 開戦（一律S009。名前で書かれていて opening_ で始まらないもの）
    'strange_bond', 'roar', 'majesty', 'green_hermit',
    // 常時（「〜たび」／召喚された味方への上乗せ）
    'warg_count_buff', 'summon_scaling_buff', 'naga_summon', 'jack_o_lantern']),
};
const PRESENT_BUFF_VFX_BY_TRIGGER = {
  attack: 'S005', injury: 'S006', death: 'S007', mana: 'S008', opening: 'S009', passive: 'S009',
};
// **バフの演出（S005〜S009）は「能力変化を受けた対象の上」に出すもの。**
// 発生元へ出す演出（マナ効果の合図に続く固有VFX）としては使わない。
// シートの「VFX/SE」列にバフの番号を書いたカード（ドワーフ＝S008）で、
// 対象に選ばれていない本人の上にだけ出ていた。
const PRESENT_BUFF_VFX_CODES = new Set(Object.values(PRESENT_BUFF_VFX_BY_TRIGGER));
// 列にバフの番号が無くても**一律でバフの演出にする**トリガ。
// 攻撃＝カードごとの絵にすると攻撃のたびに別の絵が出て何の効果か読めない。
// 開戦・常時＝利用者指定（S009）。マナ＝発生元の固有VFXと重ねないため。
const PRESENT_BUFF_VFX_ALWAYS_TRIGGERS = new Set(['attack', 'mana', 'opening', 'passive']);
function presentIsBuffVfxCode(code) {
  return PRESENT_BUFF_VFX_CODES.has(String(code || '').trim().toUpperCase());
}
function presentStatChangeTrigger(reason) {
  const name = String(reason || '');
  if (/^mana_threshold/.test(name)) return 'mana';
  if (/^opening_/.test(name)) return 'opening';
  for (const key of ['attack', 'injury', 'death', 'passive']) {
    if (PRESENT_STAT_CHANGE_TRIGGER_REASONS[key].has(name)) return key;
  }
  // **効果文から起こす新しい能力変化は、名前を並べ忘れても演出が出るようにする。**
  // コアは `attack_` / `injury_` / `death_` で始まる reason を付けているので、
  // 一覧に無くてもそのトリガとして扱う（フォルモール＝injury_random_color_buff は
  // 一覧に無く、バフVFXが1つも出ていなかった）。
  if (/^attack_/.test(name)) return 'attack';
  if (/^injury_/.test(name)) return 'injury';
  if (/^death_/.test(name)) return 'death';
  return '';
}
// その能力変化で出す演出の番号。
// opt.codes：シートの「VFX/SE」列に書かれた番号（複数可）。
// opt.enchantCode：その効果を持つ強化カードのVFX/SE列の番号（あればこれが最優先）。
function presentStatChangeVfxCode(ev, ownCode, opt) {
  const reason = String((ev && ev.reason) || '');
  // 強化カードの効果は、**その強化カードのVFX/SE列**で決める（剣技＝S005 等）。
  const enchantCode = String((opt && opt.enchantCode) || '').trim();
  if (enchantCode) return enchantCode;
  const trigger = presentStatChangeTrigger(reason);
  // そのトリガの既定（攻撃S005／負傷S006／死亡S007／マナS008／開戦・常時S009）。
  const wanted = PRESENT_BUFF_VFX_BY_TRIGGER[trigger] || '';
  const codes = (opt && Array.isArray(opt.codes) ? opt.codes : [])
    .map(x => String(x || '').trim().toUpperCase()).filter(Boolean);
  const own = String(ownCode || '').trim().toUpperCase();
  // **シートの「VFX/SE」列の指定を最優先で反映する。**
  // ここでトリガの番号へ固定すると、シートを直しても演出が変わらなくなる。
  // 複数書かれているカード（ブラウニー＝攻撃S005／負傷S006）だけ、そのトリガで選ぶ。
  if (codes.length > 1 && wanted && codes.includes(wanted)) return wanted;
  const sheetBuff = codes.find(presentIsBuffVfxCode) || (presentIsBuffVfxCode(own) ? own : '');
  if (sheetBuff) return sheetBuff;
  // 列にバフの番号が無いカードの扱い。
  //   攻撃・マナ・開戦・常時＝**一律でバフの番号**（利用者指定の規則）。
  //     マナはカード固有の絵を発生元のマナ効果VFXで既に出しているため、
  //     対象へ同じ絵を重ねない意味もある（アラクネ＝C008）。
  //   負傷・死亡＝カード固有の絵をそのまま使う（回復＝C012 等）。
  if (wanted && PRESENT_BUFF_VFX_ALWAYS_TRIGGERS.has(trigger)) return wanted;
  return String(ownCode || '') || wanted;
}
// その能力変化を起こした強化カード（VFX/SE列を引くための名前）。
// **カード名から推測せず、コアが出した reason で引く。**
const PRESENT_STAT_CHANGE_ENCHANT_BY_REASON = {
  sword_skill: '剣技',
  inherit: '継承',
  will: '遺志',
  resonance: '共振',
  tactics: '戦術',
};
function presentStatChangeEnchantName(reason) {
  return PRESENT_STAT_CHANGE_ENCHANT_BY_REASON[String(reason || '')] || '';
}

// 能力変化イベントで固有VFXを出してよいか。
// 負傷（golem / kobold）もここで出す。コアが負傷を解決するようになり、
// 攻撃時の負傷ディスパッチは通らなくなったため、ここで抑制すると一度も出ない。
//
// **バフの演出（S005〜S009）は、どのトリガで起きた能力変化かだけで決まる。**
// 効果ごとの一覧（PRESENT_STAT_CHANGE_VFX_REASONS）に載っていなくても、
// トリガが決まる能力変化は必ず出す。**出すのは能力変化を受けた対象全員の上**で、
// 発生元だけではない（イベントは対象ごとに来るので、ここは1件ずつ通せばよい）。
// マナ効果（mana_threshold*）はカード本人の固有VFXを出すと、発生元に出ている
// マナ効果の合図（_playManaEffectCue）と2重になるため、番号は一律 S008 へ
// 寄せてある（presentStatChangeVfxCode）。
function presentStatChangeVfxAllowed(ev) {
  if (!ev || !ev.sourceId) return false;
  const reason = String(ev.reason || '');
  if (presentStatChangeTrigger(reason)) return true;
  return PRESENT_STAT_CHANGE_VFX_REASONS.has(reason);
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

// ── 固有VFXの大きさ ──────────────────────────────────
// **素材ごとに、絵がフレームの中で占める割合が違う。** 同じ倍率で出すと、
// 余白の多い素材だけ小さく見え、フレームいっぱいの素材だけ巨大に見える。
// 「この番号はこの倍率で出す」という対応をここに集約する。
// 効果としての再生（_playCardEffectVfx / playEffectVfxOnUnit）と、被弾演出としての
// 再生（playHitVfx）で別々に持つと、片方だけ巨大に出る（実際にマータで起きた）。
// 既定は1（＝CSSの width:460% がそのまま効く）。
// **鍵は「素材の番号」**。命中VFXの経路は**ファイル名から**番号を取り出すため、
// 素材名を変えたら（C003.webp→S006.webp）両方の番号を登録しておくこと。
const PRESENT_VFX_SCALE = {
  C001: .5, C002: .5,             // フレームいっぱいの素材（約500x500）。半分で出す
  C003: .5, S006: .5,             // ゴーレム。キャラ枠内で見える大きさに揃える
  C008: 2,                        // アラクネ（365x409）。効果の規模に合わせて大きく出す
  E045: .5, S008: .5,             // 活性化。S006と同じ大きさの素材（約500x500）
  S005: .5, S007: .5,             // 特殊演出（約550x550/605x603）。S006と同じ扱い
  S009: .5,                       // 特殊演出：バフ（常時。516x516）
  E058: .125,                     // 炎の矢。切り詰めた縦長素材（210x388）なので小さく出す
  C019: .125, C019_1: .125,       // ケンタウロス（120x560）。炎の矢と同じ大きさで飛ばす
  C017: .5, C018: .5,             // メデューサ／サイクロプス（約450x450）。S006と同じ扱い
  E058_2: 1.2,                    // 炎の矢の着弾（983x552）。矢とは別素材なので別の倍率
  C019_2: 1.2,                    // ケンタウロスの着弾（1436x824）。炎の矢の着弾と同じ扱い
  K003: .5,                       // 毒牙（毒のデバフを受けた瞬間。389x398）
  K017: .5,                       // 毒（毒でダメージを受けた瞬間。370x575）
  K004: .4,                       // 衝撃（弱体を付与した瞬間）
  K020: .5,                       // 復活（644x1073の縦長）
  S003: .5,                       // 金貨（旧C001）
};
function presentCharacterVfxScale(code) {
  const n = Number(PRESENT_VFX_SCALE[String(code || '').toUpperCase()]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ── 画面に出すATK/HP ────────────────────────────────
// コアは1手番ぶんを先に解決してから演出を渡すため、演出を再生し始めた時点で
// 実体のATK/HPは**もう変わっている**。そのまま描くと、ダメージ数値が出るより先に
// HPが減って見える（フィーンドの解放効果などで顕著）。
// そこで「まだ見せていない変化」を反映しない表示専用の値を持ち、
// 数値・VFXを出す瞬間に進める。**規則はここが唯一の実装。**
function presentShownAtk(unit) {
  if (!unit) return 0;
  // 「攻防一体」は**ATKが常にHPに等しい**。実際の攻撃力は coreAttackDamage() が
  // HPから決めるので、数字だけATKのままだと「効いていない」ように見える。
  if (typeof coreHasEffect === 'function' && coreHasEffect(unit, '攻防一体')) return presentShownHp(unit);
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
// 画面に出す結界の数。ATK/HPと同じ理由で据え置く：コアは1手番ぶんを先に解決するため、
// そのまま描くと**結界を割った演出（K018）より先に shield.png が消える**。
function presentShownShield(unit) {
  if (!unit) return 0;
  return Math.max(0, unit._displayShield != null ? unit._displayShield : (Number(unit.shield) || 0));
}
// 表示値を「この手番が始まる前」に戻す（再生の頭で呼ぶ）。
function presentHoldShown(unit, atk, hp, maxHp, shield) {
  if (!unit) return;
  unit._displayAtk = Number(atk) || 0;
  unit._displayHp = Number(hp) || 0;
  unit._displayMaxHp = Math.max(1, Number(maxHp) || Number(hp) || 1);
  unit._displayShield = Math.max(0, Number(shield) || 0);
}
// 表示値を進める（数値・VFXを出す瞬間に呼ぶ）。
// **据え置いていない時は何もしない。** 据え置いていなければ実体の値がそのまま
// 画面の値なので、ここで差分を足すと二重に効く（開戦の効果でATKが1多く見えた）。
function presentAdvanceShown(unit, next) {
  if (!unit || !next) return;
  if (unit._displayAtk == null && unit._displayHp == null) return;
  if (next.atk != null) unit._displayAtk = Math.max(0, Number(next.atk) || 0);
  if (next.hp != null) unit._displayHp = Math.max(0, Number(next.hp) || 0);
  if (next.maxHp != null) unit._displayMaxHp = Math.max(1, Number(next.maxHp) || 1);
  if (next.shield != null) unit._displayShield = Math.max(0, Number(next.shield) || 0);
}
// 表示値の据え置きをやめて実体へ戻す（再生の終わりで呼ぶ）。
function presentReleaseShown(unit) {
  if (!unit) return;
  delete unit._displayAtk;
  delete unit._displayHp;
  delete unit._displayMaxHp;
  delete unit._displayShield;
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
  window.PRESENT_TURN_GAP_MS = PRESENT_TURN_GAP_MS;
  window.PRESENT_ATTACK_MOTION = PRESENT_ATTACK_MOTION;
  window.PRESENT_FRONT_SLOTS = PRESENT_FRONT_SLOTS;
  window.PRESENT_MAX_SLOTS = PRESENT_MAX_SLOTS;
  window.PRESENT_MANA_RUN_TYPES = PRESENT_MANA_RUN_TYPES;
  window.presentChooseSummonSlot = presentChooseSummonSlot;
  window.presentCreateDamageGate = presentCreateDamageGate;
  window.PRESENT_DAMAGE_STAGGER_MS = PRESENT_DAMAGE_STAGGER_MS;
  window.PRESENT_DAMAGE_GROUP_GAP_MS = PRESENT_DAMAGE_GROUP_GAP_MS;
  window.PRESENT_DAMAGE_RUN_GAP_MS = PRESENT_DAMAGE_RUN_GAP_MS;
  window.presentDamageKind = presentDamageKind;
  window.presentDamageGroupKey = presentDamageGroupKey;
  window.presentDamageRunAheadMs = presentDamageRunAheadMs;
  window.presentDamageRunLabelMs = presentDamageRunLabelMs;
  window.PRESENT_MANA_RUN_GAP_MS = PRESENT_MANA_RUN_GAP_MS;
  window.PRESENT_EFFECT_VFX_MIN_MS = PRESENT_EFFECT_VFX_MIN_MS;
  window.presentDamageVfxKeyword = presentDamageVfxKeyword;
  window.presentAreaVfxStyle = presentAreaVfxStyle;
  window.PRESENT_REVIVE_VFX_FADE_IN_MS = PRESENT_REVIVE_VFX_FADE_IN_MS;
  window.PRESENT_REVIVE_VFX_HOLD_MS = PRESENT_REVIVE_VFX_HOLD_MS;
  window.PRESENT_REVIVE_CARD_FADE_MS = PRESENT_REVIVE_CARD_FADE_MS;
  window.PRESENT_REVIVE_VFX_FADE_OUT_MS = PRESENT_REVIVE_VFX_FADE_OUT_MS;
  window.PRESENT_REVIVE_VFX_OFFSET_X = PRESENT_REVIVE_VFX_OFFSET_X;
  window.PRESENT_REVIVE_VFX_OFFSET_Y = PRESENT_REVIVE_VFX_OFFSET_Y;
  window.PRESENT_MANA_GAIN_VFX_SIZE = PRESENT_MANA_GAIN_VFX_SIZE;
  window.PRESENT_MANA_GAIN_VFX_MIN_CARD_RATIO = PRESENT_MANA_GAIN_VFX_MIN_CARD_RATIO;
  window.PRESENT_MANA_GAIN_VFX_FADE_IN_MS = PRESENT_MANA_GAIN_VFX_FADE_IN_MS;
  window.PRESENT_MANA_GAIN_VALUE_DELAY_MS = PRESENT_MANA_GAIN_VALUE_DELAY_MS;
  window.PRESENT_SUMMON_VFX_SPEED = PRESENT_SUMMON_VFX_SPEED;
  window.PRESENT_KEYWORD_VFX_HOLD_MS = PRESENT_KEYWORD_VFX_HOLD_MS;
  window.PRESENT_KEYWORD_VFX_FADE_IN_MS = PRESENT_KEYWORD_VFX_FADE_IN_MS;
  window.PRESENT_KEYWORD_VFX_FADE_OUT_MS = PRESENT_KEYWORD_VFX_FADE_OUT_MS;
  window.PRESENT_MANA_GAIN_VFX_HOLD_MS = PRESENT_MANA_GAIN_VFX_HOLD_MS;
  window.PRESENT_MANA_GAIN_VFX_FADE_OUT_MS = PRESENT_MANA_GAIN_VFX_FADE_OUT_MS;
  window.PRESENT_MANA_GAIN_VFX_START_Y = PRESENT_MANA_GAIN_VFX_START_Y;
  window.PRESENT_MANA_GAIN_VFX_RISE = PRESENT_MANA_GAIN_VFX_RISE;
  window.presentStatChangeEnchantName = presentStatChangeEnchantName;
  window.PRESENT_EXPAND_VFX_FADE_MS = PRESENT_EXPAND_VFX_FADE_MS;
  window.PRESENT_EXPAND_VFX_GROW_MS = PRESENT_EXPAND_VFX_GROW_MS;
  window.PRESENT_EXPAND_VFX_START = PRESENT_EXPAND_VFX_START;
  window.PRESENT_EXPAND_VFX_END = PRESENT_EXPAND_VFX_END;
  window.PRESENT_EXPAND_VFX_HIT_RATIO = PRESENT_EXPAND_VFX_HIT_RATIO;
  window.presentEffectKeywordEvents = presentEffectKeywordEvents;
  window.presentAttackContactModes = presentAttackContactModes;
  window.PRESENT_CONTACT_TRI_OFFSET_X = PRESENT_CONTACT_TRI_OFFSET_X;
  window.PRESENT_VFX_CSS_WIDTH_RATIO = PRESENT_VFX_CSS_WIDTH_RATIO;
  window.PRESENT_CONTACT_TRI_WIDTH = PRESENT_CONTACT_TRI_WIDTH;
  window.PRESENT_CONTACT_ALL_SCALE = PRESENT_CONTACT_ALL_SCALE;
  window.PRESENT_CONTACT_PIERCE_WIDTH = PRESENT_CONTACT_PIERCE_WIDTH;
  window.PRESENT_CONTACT_PIERCE_OFFSET_X = PRESENT_CONTACT_PIERCE_OFFSET_X;
  window.PRESENT_CONTACT_PIERCE_FLIGHT_MS = PRESENT_CONTACT_PIERCE_FLIGHT_MS;
  window.PRESENT_CONTACT_PIERCE_START_OFFSET = PRESENT_CONTACT_PIERCE_START_OFFSET;
  window.PRESENT_CONTACT_PIERCE_OVERSHOOT = PRESENT_CONTACT_PIERCE_OVERSHOOT;
  window.PRESENT_PROJECTILE_FLIGHT_MS = PRESENT_PROJECTILE_FLIGHT_MS;
  window.PRESENT_PROJECTILE_STAGGER_MS = PRESENT_PROJECTILE_STAGGER_MS;
  window.PRESENT_PROJECTILE_IMPACT_OFFSET_Y = PRESENT_PROJECTILE_IMPACT_OFFSET_Y;
  window.PRESENT_MISSILE_NOSE_OFFSET_DEG = PRESENT_MISSILE_NOSE_OFFSET_DEG;
  window.PRESENT_EFFECT_HIT_OFFSET_Y = PRESENT_EFFECT_HIT_OFFSET_Y;
  window.presentMissileEase = presentMissileEase;
  window.presentMissileControlPoints = presentMissileControlPoints;
  window.presentMissileFlightMs = presentMissileFlightMs;
  window.presentIsProjectileEffect = presentIsProjectileEffect;
  window.presentEffectDamageEvents = presentEffectDamageEvents;
  window.presentCreateOnceGate = presentCreateOnceGate;
  window.presentManaEffectKey = presentManaEffectKey;
  window.presentManaWaveKey = presentManaWaveKey;
  window.presentManaWaveEvents = presentManaWaveEvents;
  window.presentBreaksManaRun = presentBreaksManaRun;
  window.presentBeginPlayback = presentBeginPlayback;
  window.presentEndPlayback = presentEndPlayback;
  window.presentIsPlaying = presentIsPlaying;
  window.presentKeepsOnBoard = presentKeepsOnBoard;
  window.presentShownAtk = presentShownAtk;
  window.presentShownHp = presentShownHp;
  window.presentShownShield = presentShownShield;
  window.presentShownMaxHp = presentShownMaxHp;
  window.presentHoldShown = presentHoldShown;
  window.presentAdvanceShown = presentAdvanceShown;
  window.presentReleaseShown = presentReleaseShown;
  window.presentCharacterVfxScale = presentCharacterVfxScale;
  window.presentResetPlayback = presentResetPlayback;
  window.presentDamageVfxSource = presentDamageVfxSource;
  window.presentPreAttackEffectOwnerId = presentPreAttackEffectOwnerId;
  window.presentPreAttackActorId = presentPreAttackActorId;
  window.presentStatChangeVfxAllowed = presentStatChangeVfxAllowed;
  window.presentStatChangeVfxCode = presentStatChangeVfxCode;
  window.presentIsBuffVfxCode = presentIsBuffVfxCode;
  window.PRESENT_CARD_EFFECT_VFX_MS = PRESENT_CARD_EFFECT_VFX_MS;
  window.presentIsScreenBottomVfx = presentIsScreenBottomVfx;
  window.PRESENT_STAT_CHANGE_VFX_REASONS = PRESENT_STAT_CHANGE_VFX_REASONS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRESENT_HIT_BEAT_MS, PRESENT_TURN_GAP_MS, PRESENT_ATTACK_MOTION, PRESENT_FRONT_SLOTS, PRESENT_MAX_SLOTS, PRESENT_MANA_RUN_TYPES,
    presentChooseSummonSlot, presentCreateDamageGate, presentCreateOnceGate, presentBreaksManaRun,
    PRESENT_DAMAGE_STAGGER_MS, PRESENT_DAMAGE_GROUP_GAP_MS, PRESENT_DAMAGE_RUN_GAP_MS,
    presentDamageKind, presentDamageGroupKey, presentDamageRunAheadMs, presentDamageRunLabelMs,
    PRESENT_MANA_RUN_GAP_MS, PRESENT_EFFECT_VFX_MIN_MS,
    PRESENT_PROJECTILE_FLIGHT_MS, PRESENT_PROJECTILE_STAGGER_MS, PRESENT_PROJECTILE_IMPACT_OFFSET_Y,
    presentEffectKeywordEvents, presentDamageVfxKeyword, presentAreaVfxStyle,
    presentStatChangeEnchantName, presentIsBuffVfxCode,
    presentPreAttackEffectOwnerId, presentPreAttackActorId,
    PRESENT_EXPAND_VFX_FADE_MS, PRESENT_EXPAND_VFX_GROW_MS,
    PRESENT_EXPAND_VFX_START, PRESENT_EXPAND_VFX_END, PRESENT_EXPAND_VFX_HIT_RATIO,
    presentAttackContactModes, PRESENT_CONTACT_TRI_OFFSET_X, PRESENT_CONTACT_TRI_WIDTH,
    PRESENT_VFX_CSS_WIDTH_RATIO,
    PRESENT_CONTACT_ALL_SCALE, PRESENT_CONTACT_PIERCE_WIDTH, PRESENT_CONTACT_PIERCE_OFFSET_X,
    PRESENT_CONTACT_PIERCE_FLIGHT_MS,
    PRESENT_CONTACT_PIERCE_START_OFFSET, PRESENT_CONTACT_PIERCE_OVERSHOOT,
    PRESENT_MISSILE_NOSE_OFFSET_DEG, PRESENT_EFFECT_HIT_OFFSET_Y, presentMissileEase, presentMissileControlPoints, presentMissileFlightMs,
    presentIsProjectileEffect, presentEffectDamageEvents,
    presentDamageVfxSource, presentStatChangeVfxAllowed, presentStatChangeVfxCode,
    PRESENT_CARD_EFFECT_VFX_MS, presentIsScreenBottomVfx,
    presentManaEffectKey, presentManaWaveKey, presentManaWaveEvents,
    presentBeginPlayback, presentEndPlayback, presentIsPlaying, presentResetPlayback,
    presentKeepsOnBoard, presentCharacterVfxScale, PRESENT_VFX_SCALE,
    presentShownAtk, presentShownHp, presentShownMaxHp, presentShownShield,
    presentHoldShown, presentAdvanceShown, presentReleaseShown,
    PRESENT_STAT_CHANGE_VFX_REASONS,
  };
}
