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
  if (amount > 0 && api.gate) {
    const waitMs = api.gate.reserve(`u:${target.id}`);
    if (waitMs > 0 && typeof api.sleep === 'function') await api.sleep(waitMs);
  }
  // 数値を出す瞬間に、画面に出すHPもここまで進める。
  if (typeof api.applyHp === 'function') api.applyHp(target, ev.hpAfter);
  if (typeof updateUnitDamageUi === 'function') updateUnitDamageUi(target, fxSide);
  const source = ev.sourceId != null && typeof api.findAnyUnit === 'function'
    ? api.findAnyUnit(ev.sourceId) : null;
  // 固有VFXを誰の効果として出すかは present.js が唯一の実装。
  const vfxSource = typeof presentDamageVfxSource === 'function'
    ? presentDamageVfxSource(ev, target, source, api.ownEffectText) : null;
  if (ev.effect && source && typeof api.onEffectDamage === 'function') api.onEffectDamage(ev, source);
  // 固有SEもVFXと同じ規則で選ぶ。カード自身の効果文がダメージに触れていない場合は
  // 鳴らさない（強化カードで得た効果で本人のSEが鳴るのを防ぐ）。
  if (vfxSource && typeof api.noteEffectSource === 'function') api.noteEffectSource(vfxSource);
  // 別経路（薙ぎ払い）で数値を出し済みなら、ここでは出し直さない。
  if (typeof api.alreadyShown === 'function' && api.alreadyShown(ev)) return true;
  if (amount <= 0) return true;
  // **ひとまとまりの命中音は同時に鳴らす。** 攻撃と反撃のように続けて起きる命中を
  // 1件ずつ鳴らすと、間に挟まるVFXの画像デコードで音がずれて聞こえる。
  if (api.sfxDone && !api.sfxDone.has(ev) && typeof playAttackDamageSfx === 'function') {
    const batch = typeof api.sfxBatch === 'function' ? (api.sfxBatch(ev) || []) : [ev];
    batch.forEach(d => {
      if (!d || api.sfxDone.has(d)) return;
      api.sfxDone.add(d);
      const src = d.sourceId != null && typeof api.findAnyUnit === 'function'
        ? api.findAnyUnit(d.sourceId) : null;
      playAttackDamageSfx(src, Math.max(0, Number(d.amount) || 0));
    });
  }
  if (typeof playHitVfx === 'function') {
    playHitVfx(fxSide, target, amount, {
      ...(vfxSource ? { effectSource: vfxSource } : {}),
      keywordEffect: ev.keywordEffect || undefined,
    });
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.presentDamageEvent = presentDamageEvent;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { presentDamageEvent };
}
